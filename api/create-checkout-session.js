import Stripe from "stripe";
import { createClient } from "@supabase/supabase-js";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: "2024-06-20",
});

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const APP_URL = process.env.APP_URL || "http://localhost:3000";

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

function send(res, status, payload) {
  return res.status(status).json(payload);
}

function getBearerToken(req) {
  const header = req.headers.authorization || req.headers.Authorization || "";
  if (header.startsWith("Bearer ")) return header.slice(7).trim();
  if (req.body?.accessToken) return req.body.accessToken;
  if (req.body?.token) return req.body.token;
  return null;
}

async function getAuthenticatedUser(req) {
  const jwt = getBearerToken(req);
  if (!jwt) return { user: null, error: "Missing auth token" };

  const { data, error } = await supabase.auth.getUser(jwt);
  if (error || !data?.user) {
    return { user: null, error: "Invalid auth token" };
  }

  return { user: data.user, error: null };
}

function dollarsToCents(amount) {
  const n = Number(amount);
  if (!Number.isFinite(n) || n <= 0) return 0;
  return Math.round(n * 100);
}

function normalizeMode(mode) {
  const value = String(mode || "").toLowerCase();
  if (["stream_ticket", "vip_membership", "tip"].includes(value)) return value;
  return null;
}

async function getProfile(userId) {
  const { data, error } = await supabase
    .from("profiles")
    .select("id, username, display_name, stripe_account_id")
    .eq("id", userId)
    .maybeSingle();

  if (error) return null;
  return data || null;
}

async function getStream(streamId) {
  const { data, error } = await supabase
    .from("live_streams")
    .select("*")
    .eq("id", streamId)
    .maybeSingle();

  if (error) return { stream: null, error: error.message };
  if (!data) return { stream: null, error: "Stream not found" };

  return { stream: data, error: null };
}

async function hasExistingPaidAccess(streamId, buyerId) {
  const { data, error } = await supabase
    .from("live_stream_purchases")
    .select("id, payment_status")
    .eq("stream_id", streamId)
    .eq("buyer_id", buyerId)
    .in("payment_status", ["paid", "complete", "succeeded"])
    .maybeSingle();

  if (error) return false;
  return !!data;
}

async function hasExistingVipAccess(creatorId, userId) {
  const nowIso = new Date().toISOString();

  const { data, error } = await supabase
    .from("creator_memberships")
    .select("id, is_active, expires_at")
    .eq("creator_id", creatorId)
    .eq("user_id", userId)
    .eq("is_active", true)
    .or(`expires_at.is.null,expires_at.gt.${nowIso}`)
    .maybeSingle();

  if (error) return false;
  return !!data;
}

async function upsertPendingStreamPurchase({
  streamId,
  buyerId,
  amountCents,
  stripeCheckoutSessionId,
}) {
  const payload = {
    stream_id: streamId,
    buyer_id: buyerId,
    amount_cents: amountCents,
    payment_status: "pending",
  };

  const { data: existing } = await supabase
    .from("live_stream_purchases")
    .select("id")
    .eq("stream_id", streamId)
    .eq("buyer_id", buyerId)
    .maybeSingle();

  if (existing?.id) {
    const { error } = await supabase
      .from("live_stream_purchases")
      .update({
        amount_cents: amountCents,
        payment_status: "pending",
      })
      .eq("id", existing.id);

    if (error) console.error("update pending stream purchase error:", error.message);
    return;
  }

  const { error } = await supabase
    .from("live_stream_purchases")
    .insert(payload);

  if (error) console.error("insert pending stream purchase error:", error.message);
}

async function ensureStripeCustomer({ user, profile }) {
  const email = user?.email || undefined;
  const name =
    profile?.display_name ||
    profile?.username ||
    user?.user_metadata?.display_name ||
    user?.user_metadata?.username ||
    undefined;

  const customer = await stripe.customers.create({
    email,
    name,
    metadata: {
      user_id: user.id,
    },
  });

  return customer;
}

function makeSuccessUrl(type, params = {}) {
  const url = new URL(`${APP_URL}/success.html`);
  url.searchParams.set("checkout", type);

  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null && value !== "") {
      url.searchParams.set(key, String(value));
    }
  }

  url.searchParams.set("session_id", "{CHECKOUT_SESSION_ID}");
  return url.toString();
}

function makeCancelUrl(type, params = {}) {
  const url = new URL(`${APP_URL}/cancel.html`);
  url.searchParams.set("checkout", type);

  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null && value !== "") {
      url.searchParams.set(key, String(value));
    }
  }

  return url.toString();
}

async function createStreamTicketSession({
  user,
  profile,
  streamId,
  successPath,
  cancelPath,
}) {
  if (!streamId) {
    throw new Error("streamId is required for stream_ticket");
  }

  const { stream, error } = await getStream(streamId);
  if (error || !stream) {
    throw new Error(error || "Stream not found");
  }

  if (stream.host_id === user.id) {
    throw new Error("Host does not need to buy access to own stream");
  }

  if (String(stream.access_type) !== "paid") {
    throw new Error("This stream is not marked as paid");
  }

  if (Number(stream.ticket_price_cents || 0) <= 0) {
    throw new Error("This stream does not have a valid ticket price");
  }

  const alreadyPaid = await hasExistingPaidAccess(stream.id, user.id);
  if (alreadyPaid) {
    throw new Error("You already have access to this stream");
  }

  const customer = await ensureStripeCustomer({ user, profile });

  const successUrl =
    successPath ||
    makeSuccessUrl("stream_ticket", {
      streamId: stream.id,
      roomName: stream.room_name,
    });

  const cancelUrl =
    cancelPath ||
    makeCancelUrl("stream_ticket", {
      streamId: stream.id,
      roomName: stream.room_name,
    });

  const session = await stripe.checkout.sessions.create({
    mode: "payment",
    customer: customer.id,
    payment_method_types: ["card"],
    line_items: [
      {
        price_data: {
          currency: "usd",
          product_data: {
            name: `${stream.title} • Live Ticket`,
            description:
              stream.description || "Rich Bizness paid live stream access",
            metadata: {
              type: "stream_ticket",
              stream_id: stream.id,
            },
          },
          unit_amount: Number(stream.ticket_price_cents),
        },
        quantity: 1,
      },
    ],
    success_url: successUrl,
    cancel_url: cancelUrl,
    metadata: {
      type: "stream_ticket",
      user_id: user.id,
      stream_id: stream.id,
      host_id: stream.host_id,
      room_name: stream.room_name || "",
    },
    allow_promotion_codes: true,
  });

  await upsertPendingStreamPurchase({
    streamId: stream.id,
    buyerId: user.id,
    amountCents: Number(stream.ticket_price_cents),
    stripeCheckoutSessionId: session.id,
  });

  return {
    checkoutUrl: session.url,
    sessionId: session.id,
    stream,
  };
}

async function createVipMembershipSession({
  user,
  profile,
  creatorId,
  vipPriceDollars,
  successPath,
  cancelPath,
}) {
  if (!creatorId) {
    throw new Error("creatorId is required for vip_membership");
  }

  if (creatorId === user.id) {
    throw new Error("You do not need to buy your own VIP");
  }

  const creatorProfile = await getProfile(creatorId);
  if (!creatorProfile) {
    throw new Error("Creator not found");
  }

  const alreadyVip = await hasExistingVipAccess(creatorId, user.id);
  if (alreadyVip) {
    throw new Error("You already have active VIP access");
  }

  const amountCents = dollarsToCents(vipPriceDollars || 9.99);
  if (amountCents <= 0) {
    throw new Error("Invalid VIP price");
  }

  const customer = await ensureStripeCustomer({ user, profile });

  const successUrl =
    successPath ||
    makeSuccessUrl("vip_membership", {
      creatorId,
    });

  const cancelUrl =
    cancelPath ||
    makeCancelUrl("vip_membership", {
      creatorId,
    });

  const session = await stripe.checkout.sessions.create({
    mode: "payment",
    customer: customer.id,
    payment_method_types: ["card"],
    line_items: [
      {
        price_data: {
          currency: "usd",
          product_data: {
            name: `${creatorProfile.display_name || creatorProfile.username || "Creator"} VIP Access`,
            description: "Rich Bizness VIP live room access",
            metadata: {
              type: "vip_membership",
              creator_id: creatorId,
            },
          },
          unit_amount: amountCents,
        },
        quantity: 1,
      },
    ],
    success_url: successUrl,
    cancel_url: cancelUrl,
    metadata: {
      type: "vip_membership",
      user_id: user.id,
      creator_id: creatorId,
    },
    allow_promotion_codes: true,
  });

  return {
    checkoutUrl: session.url,
    sessionId: session.id,
    creatorProfile,
  };
}

async function createTipSession({
  user,
  profile,
  creatorId,
  streamId,
  amountDollars,
  successPath,
  cancelPath,
}) {
  if (!creatorId) {
    throw new Error("creatorId is required for tip");
  }

  if (creatorId === user.id) {
    throw new Error("You cannot tip yourself");
  }

  const creatorProfile = await getProfile(creatorId);
  if (!creatorProfile) {
    throw new Error("Creator not found");
  }

  const amountCents = dollarsToCents(amountDollars || 5);
  if (amountCents < 100) {
    throw new Error("Tip must be at least $1");
  }

  const customer = await ensureStripeCustomer({ user, profile });

  const successUrl =
    successPath ||
    makeSuccessUrl("tip", {
      creatorId,
      streamId,
    });

  const cancelUrl =
    cancelPath ||
    makeCancelUrl("tip", {
      creatorId,
      streamId,
    });

  const session = await stripe.checkout.sessions.create({
    mode: "payment",
    customer: customer.id,
    payment_method_types: ["card"],
    line_items: [
      {
        price_data: {
          currency: "usd",
          product_data: {
            name: `Tip for ${creatorProfile.display_name || creatorProfile.username || "Creator"}`,
            description: streamId
              ? "Rich Bizness live stream tip"
              : "Rich Bizness creator tip",
            metadata: {
              type: "tip",
              creator_id: creatorId,
              stream_id: streamId || "",
            },
          },
          unit_amount: amountCents,
        },
        quantity: 1,
      },
    ],
    success_url: successUrl,
    cancel_url: cancelUrl,
    metadata: {
      type: "tip",
      user_id: user.id,
      creator_id: creatorId,
      stream_id: streamId || "",
      amount_cents: String(amountCents),
    },
    allow_promotion_codes: false,
  });

  return {
    checkoutUrl: session.url,
    sessionId: session.id,
    creatorProfile,
  };
}

export default async function handler(req, res) {
  if (req.method === "OPTIONS") {
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
    return res.status(200).end();
  }

  if (req.method !== "POST") {
    return send(res, 405, { error: "Method not allowed" });
  }

  res.setHeader("Access-Control-Allow-Origin", "*");

  try {
    if (!process.env.STRIPE_SECRET_KEY) {
      return send(res, 500, { error: "Missing STRIPE_SECRET_KEY" });
    }

    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      return send(res, 500, {
        error: "Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY",
      });
    }

    const { user, error: authError } = await getAuthenticatedUser(req);
    if (authError || !user) {
      return send(res, 401, { error: authError || "Unauthorized" });
    }

    const profile = await getProfile(user.id);
    const mode = normalizeMode(req.body?.mode);

    if (!mode) {
      return send(res, 400, {
        error: "mode must be one of: stream_ticket, vip_membership, tip",
      });
    }

    if (mode === "stream_ticket") {
      const result = await createStreamTicketSession({
        user,
        profile,
        streamId: req.body?.streamId,
        successPath: req.body?.successUrl,
        cancelPath: req.body?.cancelUrl,
      });

      return send(res, 200, {
        ok: true,
        mode,
        checkoutUrl: result.checkoutUrl,
        sessionId: result.sessionId,
        stream: {
          id: result.stream.id,
          title: result.stream.title,
          roomName: result.stream.room_name,
          accessType: result.stream.access_type,
          ticketPriceCents: result.stream.ticket_price_cents,
        },
      });
    }

    if (mode === "vip_membership") {
      const result = await createVipMembershipSession({
        user,
        profile,
        creatorId: req.body?.creatorId,
        vipPriceDollars: req.body?.amount || 9.99,
        successPath: req.body?.successUrl,
        cancelPath: req.body?.cancelUrl,
      });

      return send(res, 200, {
        ok: true,
        mode,
        checkoutUrl: result.checkoutUrl,
        sessionId: result.sessionId,
        creator: {
          id: result.creatorProfile.id,
          displayName: result.creatorProfile.display_name,
          username: result.creatorProfile.username,
        },
      });
    }

    if (mode === "tip") {
      const result = await createTipSession({
        user,
        profile,
        creatorId: req.body?.creatorId,
        streamId: req.body?.streamId,
        amountDollars: req.body?.amount || 5,
        successPath: req.body?.successUrl,
        cancelPath: req.body?.cancelUrl,
      });

      return send(res, 200, {
        ok: true,
        mode,
        checkoutUrl: result.checkoutUrl,
        sessionId: result.sessionId,
        creator: {
          id: result.creatorProfile.id,
          displayName: result.creatorProfile.display_name,
          username: result.creatorProfile.username,
        },
      });
    }

    return send(res, 400, { error: "Unsupported checkout mode" });
  } catch (error) {
    console.error("create-checkout-session error:", error);
    return send(res, 500, {
      error: error?.message || "Failed to create checkout session",
    });
  }
}
