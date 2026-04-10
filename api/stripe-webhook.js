import Stripe from "stripe";
import { createClient } from "@supabase/supabase-js";

export const config = {
  api: {
    bodyParser: false,
  },
};

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: "2025-03-31.basil",
});

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  }
);

function toInt(value, fallback = 0) {
  const n = Number(value);
  return Number.isFinite(n) ? Math.round(n) : fallback;
}

function getSessionMetadata(session) {
  return session?.metadata || {};
}

async function readRawBody(req) {
  const chunks = [];
  for await (const chunk of req) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }
  return Buffer.concat(chunks);
}

async function recordDirectSupport(session) {
  const metadata = getSessionMetadata(session);
  const artistUserId = metadata.artist_user_id || metadata.artistUserId || "";
  const userId = metadata.user_id || metadata.userId || "";
  const sourceType = metadata.source_type || "direct_support";
  const roomName = metadata.room_name || "";
  const sourceId =
    metadata.source_id ||
    metadata.track_id ||
    metadata.album_id ||
    metadata.playlist_id ||
    null;

  if (!artistUserId) {
    throw new Error("Missing artist_user_id for direct support.");
  }

  const note =
    sourceType === "live_tip"
      ? `Live tip${roomName ? ` • ${roomName}` : ""}${userId ? ` • from ${userId}` : ""}`
      : sourceType === "vip_live_access"
      ? `VIP live access${roomName ? ` • ${roomName}` : ""}${userId ? ` • from ${userId}` : ""}`
      : `Direct support${userId ? ` • from ${userId}` : ""}`;

  const insertEarnRes = await supabase
    .from("music_earnings")
    .insert({
      artist_user_id: artistUserId,
      source_type: sourceType,
      source_id: sourceId,
      gross_cents: toInt(session.amount_total, 0),
      note,
    });

  if (insertEarnRes.error) throw insertEarnRes.error;
}

async function markLiveRoomAccessPaid(session) {
  const metadata = getSessionMetadata(session);
  const accessId = metadata.live_room_access_id || "";

  if (!accessId) {
    throw new Error("Missing live_room_access_id in metadata.");
  }

  const updateRes = await supabase
    .from("live_room_access")
    .update({
      status: "paid",
      stripe_session_id: session.id,
    })
    .eq("id", accessId)
    .select()
    .single();

  if (updateRes.error) throw updateRes.error;
}

async function markPremiumPurchasePaid(session) {
  const metadata = getSessionMetadata(session);
  const buyerUserId = metadata.user_id || "";
  const artistUserId = metadata.artist_user_id || "";
  const trackId = metadata.track_id || null;
  const title = metadata.title || "Premium unlock";

  if (!artistUserId) {
    throw new Error("Missing artist_user_id for premium unlock.");
  }

  const earnRes = await supabase
    .from("music_earnings")
    .insert({
      artist_user_id: artistUserId,
      source_type: "premium_track_unlock",
      source_id: trackId,
      gross_cents: toInt(session.amount_total, 0),
      note: `${title}${buyerUserId ? ` • from ${buyerUserId}` : ""}`,
    });

  if (earnRes.error) throw earnRes.error;

  if (buyerUserId && trackId) {
    const purchaseRes = await supabase
      .from("premium_track_purchases")
      .upsert(
        {
          buyer_user_id: buyerUserId,
          artist_user_id: artistUserId,
          track_id: trackId,
          stripe_session_id: session.id,
          status: "paid",
        },
        { onConflict: "buyer_user_id,track_id" }
      );

    if (purchaseRes.error && purchaseRes.error.code !== "42P01") {
      throw purchaseRes.error;
    }
  }
}

async function activateFanSubscriptionFromCheckout(session) {
  const metadata = getSessionMetadata(session);
  const subscriberUserId = metadata.user_id || "";
  const artistUserId = metadata.artist_user_id || "";
  const planName = metadata.plan_name || "Fan subscription";

  if (!artistUserId) {
    throw new Error("Missing artist_user_id for fan subscription.");
  }

  const subscriptionId = session.subscription || null;

  const subRes = await supabase
    .from("fan_subscriptions")
    .upsert(
      {
        subscriber_user_id: subscriberUserId || null,
        artist_user_id: artistUserId,
        stripe_subscription_id: subscriptionId,
        stripe_session_id: session.id,
        status: "active",
        plan_name: planName,
      },
      { onConflict: "subscriber_user_id,artist_user_id" }
    );

  if (subRes.error && subRes.error.code !== "42P01") {
    throw subRes.error;
  }

  const earnRes = await supabase
    .from("music_earnings")
    .insert({
      artist_user_id: artistUserId,
      source_type: "fan_subscription",
      source_id: subscriptionId,
      gross_cents: toInt(session.amount_total, 0),
      note: `${planName}${subscriberUserId ? ` • from ${subscriberUserId}` : ""}`,
    });

  if (earnRes.error) throw earnRes.error;
}

async function markSubscriptionCanceled(subscription) {
  const subId = subscription?.id;
  if (!subId) return;

  const res = await supabase
    .from("fan_subscriptions")
    .update({
      status: "canceled",
    })
    .eq("stripe_subscription_id", subId);

  if (res.error && res.error.code !== "42P01") {
    throw res.error;
  }
}

async function markSubscriptionUpdated(subscription) {
  const subId = subscription?.id;
  if (!subId) return;

  const status = subscription?.status || "active";

  const res = await supabase
    .from("fan_subscriptions")
    .update({
      status,
    })
    .eq("stripe_subscription_id", subId);

  if (res.error && res.error.code !== "42P01") {
    throw res.error;
  }
}

async function handleCheckoutSessionCompleted(session) {
  const metadata = getSessionMetadata(session);
  const mode = metadata.mode || metadata.checkout_mode || metadata.source_type || "";

  if (mode === "premium_track_unlock") {
    await markPremiumPurchasePaid(session);
    return;
  }

  if (mode === "fan_subscription") {
    await activateFanSubscriptionFromCheckout(session);
    return;
  }

  if (mode === "vip_live_access") {
    await markLiveRoomAccessPaid(session);
    await recordDirectSupport(session);
    return;
  }

  await recordDirectSupport(session);
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).send("Method not allowed");
  }

  if (
    !process.env.STRIPE_SECRET_KEY ||
    !process.env.STRIPE_WEBHOOK_SECRET ||
    !process.env.SUPABASE_URL ||
    !process.env.SUPABASE_SERVICE_ROLE_KEY
  ) {
    return res.status(500).json({
      error:
        "Missing STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET, SUPABASE_URL, or SUPABASE_SERVICE_ROLE_KEY",
    });
  }

  let event;

  try {
    const rawBody = await readRawBody(req);
    const signature = req.headers["stripe-signature"];

    event = stripe.webhooks.constructEvent(
      rawBody,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET
    );
  } catch (err) {
    console.error("Webhook signature verification failed:", err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object;
        await handleCheckoutSessionCompleted(session);
        break;
      }

      case "customer.subscription.updated": {
        const subscription = event.data.object;
        await markSubscriptionUpdated(subscription);
        break;
      }

      case "customer.subscription.deleted": {
        const subscription = event.data.object;
        await markSubscriptionCanceled(subscription);
        break;
      }

      default: {
        break;
      }
    }

    return res.status(200).json({ received: true });
  } catch (err) {
    console.error("Webhook processing error:", err);
    return res.status(500).json({
      error: err?.message || "Webhook processing failed",
    });
  }
}
