import Stripe from "stripe";
import { createClient } from "@supabase/supabase-js";

export const config = {
  api: {
    bodyParser: false,
  },
};

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: "2024-06-20",
});

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const STRIPE_WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
  },
});

function send(res, status, payload) {
  return res.status(status).json(payload);
}

async function getRawBody(req) {
  const chunks = [];

  for await (const chunk of req) {
    chunks.push(typeof chunk === "string" ? Buffer.from(chunk) : chunk);
  }

  return Buffer.concat(chunks);
}

function normalizeType(value) {
  return String(value || "").toLowerCase();
}

function addDaysToNow(days) {
  const now = new Date();
  now.setDate(now.getDate() + Number(days || 30));
  return now.toISOString();
}

async function getCheckoutSessionLineItems(sessionId) {
  try {
    const result = await stripe.checkout.sessions.listLineItems(sessionId, {
      limit: 10,
    });
    return result?.data || [];
  } catch (error) {
    console.error("listLineItems error:", error.message);
    return [];
  }
}

async function updateStreamPurchasePaid({ streamId, buyerId, amountCents }) {
  if (!streamId || !buyerId) return;

  const { data: existing, error: findError } = await supabase
    .from("live_stream_purchases")
    .select("id, payment_status")
    .eq("stream_id", streamId)
    .eq("buyer_id", buyerId)
    .maybeSingle();

  if (findError) {
    console.error("updateStreamPurchasePaid find error:", findError.message);
    return;
  }

  if (existing?.id) {
    const { error } = await supabase
      .from("live_stream_purchases")
      .update({
        amount_cents: Number(amountCents || 0),
        payment_status: "paid",
      })
      .eq("id", existing.id);

    if (error) {
      console.error("updateStreamPurchasePaid update error:", error.message);
    }
    return;
  }

  const { error } = await supabase
    .from("live_stream_purchases")
    .insert({
      stream_id: streamId,
      buyer_id: buyerId,
      amount_cents: Number(amountCents || 0),
      payment_status: "paid",
    });

  if (error) {
    console.error("updateStreamPurchasePaid insert error:", error.message);
  }
}

async function activateVipMembership({ creatorId, userId, tierName = "VIP", expiresAt }) {
  if (!creatorId || !userId) return;

  const { data: existing, error: findError } = await supabase
    .from("creator_memberships")
    .select("id")
    .eq("creator_id", creatorId)
    .eq("user_id", userId)
    .maybeSingle();

  if (findError) {
    console.error("activateVipMembership find error:", findError.message);
    return;
  }

  const payload = {
    creator_id: creatorId,
    user_id: userId,
    tier_name: tierName,
    is_active: true,
    expires_at: expiresAt || addDaysToNow(30),
  };

  if (existing?.id) {
    const { error } = await supabase
      .from("creator_memberships")
      .update({
        tier_name: payload.tier_name,
        is_active: true,
        expires_at: payload.expires_at,
      })
      .eq("id", existing.id);

    if (error) {
      console.error("activateVipMembership update error:", error.message);
    }
    return;
  }

  const { error } = await supabase
    .from("creator_memberships")
    .insert(payload);

  if (error) {
    console.error("activateVipMembership insert error:", error.message);
  }
}

async function insertLiveTipIfAvailable({ streamId, senderId, creatorId, amountCents }) {
  if (!streamId || !senderId || !creatorId || !amountCents) return;

  const { error } = await supabase
    .from("live_tips")
    .insert({
      stream_id: streamId,
      sender_id: senderId,
      creator_id: creatorId,
      amount_cents: Number(amountCents),
      currency: "usd",
      status: "paid",
      paid_at: new Date().toISOString(),
    });

  if (error) {
    console.error("insertLiveTipIfAvailable error:", error.message);
  }
}

async function safeInsertNotification({ userId, actorId, type, title, body, data = {} }) {
  if (!userId || !type || !title) return;

  const { error } = await supabase
    .from("notifications")
    .insert({
      user_id: userId,
      actor_id: actorId || null,
      type,
      title,
      body: body || null,
      data,
    });

  if (error) {
    console.error("safeInsertNotification error:", error.message);
  }
}

async function handleCheckoutCompleted(session) {
  const meta = session?.metadata || {};
  const type = normalizeType(meta.type);

  const totalAmount = Number(session.amount_total || 0);

  if (type === "stream_ticket") {
    const streamId = meta.stream_id;
    const buyerId = meta.user_id;
    const hostId = meta.host_id || null;
    const roomName = meta.room_name || "";

    await updateStreamPurchasePaid({
      streamId,
      buyerId,
      amountCents: totalAmount,
    });

    await safeInsertNotification({
      userId: buyerId,
      actorId: hostId,
      type: "vip_joined",
      title: "Stream unlocked",
      body: "Your paid live stream access is now active.",
      data: {
        checkout_type: "stream_ticket",
        stream_id: streamId,
        room_name: roomName,
      },
    });

    if (hostId) {
      await safeInsertNotification({
        userId: hostId,
        actorId: buyerId,
        type: "live_tip",
        title: "New paid viewer",
        body: "A viewer purchased access to your paid stream.",
        data: {
          checkout_type: "stream_ticket",
          stream_id: streamId,
          buyer_id: buyerId,
        },
      });
    }

    return;
  }

  if (type === "vip_membership") {
    const creatorId = meta.creator_id;
    const userId = meta.user_id;

    await activateVipMembership({
      creatorId,
      userId,
      tierName: "VIP",
      expiresAt: addDaysToNow(30),
    });

    await safeInsertNotification({
      userId,
      actorId: creatorId,
      type: "vip_joined",
      title: "VIP unlocked",
      body: "Your VIP access is now active.",
      data: {
        checkout_type: "vip_membership",
        creator_id: creatorId,
      },
    });

    await safeInsertNotification({
      userId: creatorId,
      actorId: userId,
      type: "vip_joined",
      title: "New VIP member",
      body: "A new supporter unlocked your VIP access.",
      data: {
        checkout_type: "vip_membership",
        member_id: userId,
      },
    });

    return;
  }

  if (type === "tip") {
    const creatorId = meta.creator_id;
    const senderId = meta.user_id;
    const streamId = meta.stream_id || "";
    const amountCents = Number(meta.amount_cents || totalAmount || 0);

    await insertLiveTipIfAvailable({
      streamId,
      senderId,
      creatorId,
      amountCents,
    });

    await safeInsertNotification({
      userId: creatorId,
      actorId: senderId,
      type: "live_tip",
      title: "New tip received",
      body: `You received a $${(amountCents / 100).toFixed(2)} tip.`,
      data: {
        checkout_type: "tip",
        stream_id: streamId,
        sender_id: senderId,
        amount_cents: amountCents,
      },
    });

    await safeInsertNotification({
      userId: senderId,
      actorId: creatorId,
      type: "live_tip",
      title: "Tip sent",
      body: "Your tip was sent successfully.",
      data: {
        checkout_type: "tip",
        stream_id: streamId,
        creator_id: creatorId,
        amount_cents: amountCents,
      },
    });

    return;
  }

  console.log("Unhandled checkout type:", type);
}

async function handleCheckoutExpired(session) {
  const meta = session?.metadata || {};
  const type = normalizeType(meta.type);

  if (type === "stream_ticket") {
    const streamId = meta.stream_id;
    const buyerId = meta.user_id;

    if (streamId && buyerId) {
      const { error } = await supabase
        .from("live_stream_purchases")
        .update({
          payment_status: "expired",
        })
        .eq("stream_id", streamId)
        .eq("buyer_id", buyerId);

      if (error) {
        console.error("handleCheckoutExpired stream_ticket error:", error.message);
      }
    }
  }
}

async function handlePaymentIntentFailed(paymentIntent) {
  const meta = paymentIntent?.metadata || {};
  const type = normalizeType(meta.type);

  if (type === "stream_ticket") {
    const streamId = meta.stream_id;
    const buyerId = meta.user_id;

    if (streamId && buyerId) {
      const { error } = await supabase
        .from("live_stream_purchases")
        .update({
          payment_status: "failed",
        })
        .eq("stream_id", streamId)
        .eq("buyer_id", buyerId);

      if (error) {
        console.error("handlePaymentIntentFailed error:", error.message);
      }
    }
  }
}

async function hydrateSessionMetadataIfNeeded(session) {
  if (session?.metadata?.type) return session;

  try {
    const lineItems = await getCheckoutSessionLineItems(session.id);
    const firstItem = lineItems?.[0];
    const productName = firstItem?.description || "";

    if (!productName) return session;

    return session;
  } catch (error) {
    console.error("hydrateSessionMetadataIfNeeded error:", error.message);
    return session;
  }
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return send(res, 405, { error: "Method not allowed" });
  }

  try {
    if (!process.env.STRIPE_SECRET_KEY) {
      return send(res, 500, { error: "Missing STRIPE_SECRET_KEY" });
    }

    if (!STRIPE_WEBHOOK_SECRET) {
      return send(res, 500, { error: "Missing STRIPE_WEBHOOK_SECRET" });
    }

    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      return send(res, 500, {
        error: "Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY",
      });
    }

    const rawBody = await getRawBody(req);
    const signature = req.headers["stripe-signature"];

    if (!signature) {
      return send(res, 400, { error: "Missing Stripe signature" });
    }

    let event;

    try {
      event = stripe.webhooks.constructEvent(
        rawBody,
        signature,
        STRIPE_WEBHOOK_SECRET
      );
    } catch (err) {
      console.error("Webhook signature verification failed:", err.message);
      return send(res, 400, { error: `Webhook Error: ${err.message}` });
    }

    const eventType = event.type;
    const object = event.data.object;

    console.log("Stripe webhook event:", eventType);

    switch (eventType) {
      case "checkout.session.completed": {
        const session = await hydrateSessionMetadataIfNeeded(object);
        await handleCheckoutCompleted(session);
        break;
      }

      case "checkout.session.async_payment_succeeded": {
        const session = await hydrateSessionMetadataIfNeeded(object);
        await handleCheckoutCompleted(session);
        break;
      }

      case "checkout.session.expired": {
        await handleCheckoutExpired(object);
        break;
      }

      case "payment_intent.payment_failed": {
        await handlePaymentIntentFailed(object);
        break;
      }

      default:
        console.log(`Unhandled event type: ${eventType}`);
        break;
    }

    return send(res, 200, { received: true });
  } catch (error) {
    console.error("stripe-webhook fatal error:", error);
    return send(res, 500, {
      error: error?.message || "Webhook processing failed",
    });
  }
}
