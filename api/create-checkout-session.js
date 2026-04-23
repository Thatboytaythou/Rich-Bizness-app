import Stripe from "stripe";
import { createClient } from "@supabase/supabase-js";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: "2024-06-20"
});

const SUPABASE_URL =
  process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const APP_URL = process.env.APP_URL || process.env.PUBLIC_SITE_URL || "http://localhost:3000";

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  throw new Error("Missing SUPABASE_URL/NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false }
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

  if (
    [
      "stream_ticket",
      "vip_membership",
      "tip",
      "store",
      "music_unlock",
      "artwork",
      "premium_content"
    ].includes(value)
  ) {
    return value;
  }

  return null;
}

function normalizeCurrency(value) {
  return String(value || "usd").toLowerCase();
}

function numOrNull(value) {
  if (value === null || value === undefined || value === "") return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

async function getProfile(userId) {
  const { data, error } = await supabase
    .from("profiles")
    .select("id, username, display_name, email")
    .eq("id", userId)
    .maybeSingle();

  if (error) return null;
  return data || null;
}

async function getCreatorProfile(userId) {
  const { data, error } = await supabase
    .from("profiles")
    .select("id, username, display_name")
    .eq("id", userId)
    .maybeSingle();

  if (error) return null;
  return data || null;
}

async function getLiveStream(streamId) {
  const { data, error } = await supabase
    .from("live_streams")
    .select("*")
    .eq("id", streamId)
    .maybeSingle();

  if (error) return { stream: null, error: error.message };
  if (!data) return { stream: null, error: "Stream not found" };

  return { stream: data, error: null };
}

async function getProduct(productId) {
  const { data, error } = await supabase
    .from("products")
    .select("*")
    .eq("id", productId)
    .maybeSingle();

  if (error) return { product: null, error: error.message };
  if (!data) return { product: null, error: "Product not found" };

  return { product: data, error: null };
}

async function getPremiumContent(contentId) {
  const { data, error } = await supabase
    .from("premium_content")
    .select("*")
    .eq("id", contentId)
    .maybeSingle();

  if (error) return { content: null, error: error.message };
  if (!data) return { content: null, error: "Premium content not found" };

  return { content: data, error: null };
}

async function hasExistingLiveAccess(streamId, userId) {
  const { data, error } = await supabase
    .from("live_stream_purchases")
    .select("id, status")
    .eq("stream_id", streamId)
    .eq("user_id", userId)
    .in("status", ["paid", "complete", "completed", "succeeded", "active"])
    .maybeSingle();

  if (error) return false;
  return !!data;
}

async function hasExistingVipAccess(roomName, userId) {
  if (!roomName || !userId) return false;

  const { data, error } = await supabase
    .from("vip_live_access")
    .select("id, status")
    .eq("user_id", userId)
    .eq("room_name", roomName)
    .in("status", ["active", "paid", "granted"])
    .maybeSingle();

  if (error) return false;
  return !!data;
}

async function hasExistingUniversalUnlock(userId, productId) {
  const { data, error } = await supabase
    .from("user_product_unlocks")
    .select("id")
    .eq("user_id", userId)
    .eq("product_id", productId)
    .maybeSingle();

  if (error) return false;
  return !!data;
}

async function ensureStripeCustomer({ user, profile }) {
  const email = user?.email || profile?.email || undefined;
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
      user_id: user.id
    }
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

async function createPendingLivePurchase({
  stream,
  userId,
  amountCents
}) {
  const payload = {
    stream_id: stream.id,
    user_id: userId,
    stripe_checkout_session_id: null,
    stripe_payment_intent_id: null,
    stripe_customer_id: null,
    amount_cents: amountCents,
    currency: normalizeCurrency(stream.currency || "usd"),
    status: "pending",
    purchased_at: null,
    refunded_at: null,
    metadata: {
      source: "create_checkout_session",
      stream_slug: stream.slug || null
    },
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  };

  const { data: inserted, error } = await supabase
    .from("live_stream_purchases")
    .insert(payload)
    .select("id")
    .single();

  if (error) {
    throw new Error(`Failed to create pending live purchase: ${error.message}`);
  }

  return inserted;
}

async function attachCheckoutSessionToPendingLivePurchase({
  purchaseId,
  sessionId
}) {
  const { error } = await supabase
    .from("live_stream_purchases")
    .update({
      stripe_checkout_session_id: sessionId,
      updated_at: new Date().toISOString()
    })
    .eq("id", purchaseId);

  if (error) {
    throw new Error(`Failed to attach session to live purchase: ${error.message}`);
  }
}

async function createStreamTicketSession({
  user,
  profile,
  streamId,
  successPath,
  cancelPath
}) {
  if (!streamId) {
    throw new Error("streamId is required for stream_ticket");
  }

  const { stream, error } = await getLiveStream(streamId);
  if (error || !stream) {
    throw new Error(error || "Stream not found");
  }

  if (stream.creator_id === user.id) {
    throw new Error("Creator does not need to buy access to own stream");
  }

  if (String(stream.access_type || "").toLowerCase() !== "paid") {
    throw new Error("This stream is not marked as paid");
  }

  if (Number(stream.price_cents || 0) <= 0) {
    throw new Error("This stream does not have a valid ticket price");
  }

  const alreadyPaid = await hasExistingLiveAccess(stream.id, user.id);
  if (alreadyPaid) {
    throw new Error("You already have access to this stream");
  }

  const customer = await ensureStripeCustomer({ user, profile });

  const pendingPurchase = await createPendingLivePurchase({
    stream,
    userId: user.id,
    amountCents: Number(stream.price_cents)
  });

  const successUrl =
    successPath ||
    makeSuccessUrl("stream_ticket", {
      streamId: stream.id,
      slug: stream.slug,
      roomName: stream.livekit_room_name
    });

  const cancelUrl =
    cancelPath ||
    makeCancelUrl("stream_ticket", {
      streamId: stream.id,
      slug: stream.slug,
      roomName: stream.livekit_room_name
    });

  const session = await stripe.checkout.sessions.create({
    mode: "payment",
    customer: customer.id,
    payment_method_types: ["card"],
    line_items: [
      {
        price_data: {
          currency: normalizeCurrency(stream.currency || "usd"),
          product_data: {
            name: `${stream.title} • Live Ticket`,
            description: stream.description || "Rich Bizness paid live stream access"
          },
          unit_amount: Number(stream.price_cents)
        },
        quantity: 1
      }
    ],
    success_url: successUrl,
    cancel_url: cancelUrl,
    allow_promotion_codes: true,
    metadata: {
      kind: "live",
      type: "stream_ticket",
      user_id: user.id,
      creator_id: stream.creator_id,
      product_id: "",
      linked_record_id: String(stream.id),
      live_purchase_id: String(pendingPurchase.id),
      room_name: stream.livekit_room_name || "",
      stream_id: String(stream.id),
      stream_slug: stream.slug || ""
    }
  });

  await attachCheckoutSessionToPendingLivePurchase({
    purchaseId: pendingPurchase.id,
    sessionId: session.id
  });

  return {
    checkoutUrl: session.url,
    sessionId: session.id,
    stream,
    livePurchaseId: pendingPurchase.id
  };
}

async function createVipMembershipSession({
  user,
  profile,
  creatorId,
  roomName,
  vipPriceDollars,
  successPath,
  cancelPath
}) {
  if (!creatorId) {
    throw new Error("creatorId is required for vip_membership");
  }

  if (creatorId === user.id) {
    throw new Error("You do not need to buy your own VIP");
  }

  const creatorProfile = await getCreatorProfile(creatorId);
  if (!creatorProfile) {
    throw new Error("Creator not found");
  }

  const resolvedRoomName = roomName || null;

  if (resolvedRoomName) {
    const alreadyVip = await hasExistingVipAccess(resolvedRoomName, user.id);
    if (alreadyVip) {
      throw new Error("You already have active VIP access");
    }
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
      roomName: resolvedRoomName
    });

  const cancelUrl =
    cancelPath ||
    makeCancelUrl("vip_membership", {
      creatorId,
      roomName: resolvedRoomName
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
            description: "Rich Bizness VIP access"
          },
          unit_amount: amountCents
        },
        quantity: 1
      }
    ],
    success_url: successUrl,
    cancel_url: cancelUrl,
    allow_promotion_codes: true,
    metadata: {
      kind: "live",
      type: "vip_membership",
      user_id: user.id,
      creator_id: creatorId,
      product_id: "",
      linked_record_id: "",
      room_name: resolvedRoomName || ""
    }
  });

  return {
    checkoutUrl: session.url,
    sessionId: session.id,
    creatorProfile
  };
}

async function createTipSession({
  user,
  profile,
  creatorId,
  streamId,
  amountDollars,
  successPath,
  cancelPath
}) {
  if (!creatorId) {
    throw new Error("creatorId is required for tip");
  }

  if (creatorId === user.id) {
    throw new Error("You cannot tip yourself");
  }

  const creatorProfile = await getCreatorProfile(creatorId);
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
      streamId
    });

  const cancelUrl =
    cancelPath ||
    makeCancelUrl("tip", {
      creatorId,
      streamId
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
              : "Rich Bizness creator tip"
          },
          unit_amount: amountCents
        },
        quantity: 1
      }
    ],
    success_url: successUrl,
    cancel_url: cancelUrl,
    allow_promotion_codes: false,
    metadata: {
      kind: "tip",
      type: "tip",
      user_id: user.id,
      creator_id: creatorId,
      stream_id: streamId ? String(streamId) : "",
      amount_cents: String(amountCents)
    }
  });

  return {
    checkoutUrl: session.url,
    sessionId: session.id,
    creatorProfile
  };
}

async function createStoreSession({
  user,
  profile,
  productId,
  quantity,
  successPath,
  cancelPath
}) {
  if (!productId) {
    throw new Error("productId is required for store");
  }

  const { product, error } = await getProduct(productId);
  if (error || !product) {
    throw new Error(error || "Product not found");
  }

  const unitAmount =
    numOrNull(product.price_cents) ??
    dollarsToCents(product.price || 0);

  if (!unitAmount || unitAmount <= 0) {
    throw new Error("Product price is invalid");
  }

  const qty = Math.max(1, Number(quantity || 1) || 1);

  const creatorId = product.creator_id || null;
  const customer = await ensureStripeCustomer({ user, profile });

  const successUrl =
    successPath ||
    makeSuccessUrl("store", {
      productId: product.id
    });

  const cancelUrl =
    cancelPath ||
    makeCancelUrl("store", {
      productId: product.id
    });

  const session = await stripe.checkout.sessions.create({
    mode: "payment",
    customer: customer.id,
    payment_method_types: ["card"],
    line_items: [
      {
        price_data: {
          currency: normalizeCurrency(product.currency || "usd"),
          product_data: {
            name: product.name || product.title || "Store Product",
            description: product.description || "Rich Bizness store product"
          },
          unit_amount: unitAmount
        },
        quantity: qty
      }
    ],
    success_url: successUrl,
    cancel_url: cancelUrl,
    allow_promotion_codes: true,
    metadata: {
      kind: "store",
      type: "store",
      user_id: user.id,
      creator_id: creatorId || "",
      seller_user_id: creatorId || "",
      product_id: String(product.id),
      linked_record_id: String(product.id),
      quantity: String(qty),
      product_title: product.name || product.title || "Store Product"
    }
  });

  return {
    checkoutUrl: session.url,
    sessionId: session.id,
    product
  };
}

async function createMusicUnlockSession({
  user,
  profile,
  productId,
  trackSlug,
  albumSlug,
  linkedRecordId,
  amountDollars,
  successPath,
  cancelPath
}) {
  if (!productId) {
    throw new Error("productId is required for music_unlock");
  }

  const alreadyUnlocked = await hasExistingUniversalUnlock(user.id, Number(productId));
  if (alreadyUnlocked) {
    throw new Error("You already unlocked this product");
  }

  const { product, error } = await getProduct(productId);
  if (error || !product) {
    throw new Error(error || "Product not found");
  }

  const amountCents =
    numOrNull(product.price_cents) ??
    dollarsToCents(amountDollars || product.price || 0);

  if (!amountCents || amountCents <= 0) {
    throw new Error("Music unlock price is invalid");
  }

  const customer = await ensureStripeCustomer({ user, profile });

  const successUrl =
    successPath ||
    makeSuccessUrl("music_unlock", {
      productId: product.id,
      trackSlug,
      albumSlug
    });

  const cancelUrl =
    cancelPath ||
    makeCancelUrl("music_unlock", {
      productId: product.id,
      trackSlug,
      albumSlug
    });

  const session = await stripe.checkout.sessions.create({
    mode: "payment",
    customer: customer.id,
    payment_method_types: ["card"],
    line_items: [
      {
        price_data: {
          currency: normalizeCurrency(product.currency || "usd"),
          product_data: {
            name: product.name || product.title || "Music Unlock",
            description: product.description || "Rich Bizness music unlock"
          },
          unit_amount: amountCents
        },
        quantity: 1
      }
    ],
    success_url: successUrl,
    cancel_url: cancelUrl,
    allow_promotion_codes: true,
    metadata: {
      kind: "music",
      type: "music_unlock",
      user_id: user.id,
      creator_id: product.creator_id || "",
      product_id: String(product.id),
      linked_record_id: linkedRecordId ? String(linkedRecordId) : "",
      track_slug: trackSlug || "",
      album_slug: albumSlug || "",
      track_id: linkedRecordId ? String(linkedRecordId) : "",
      source_type: "purchase",
      source_id: linkedRecordId ? String(linkedRecordId) : ""
    }
  });

  return {
    checkoutUrl: session.url,
    sessionId: session.id,
    product
  };
}

async function createArtworkSession({
  user,
  profile,
  productId,
  artworkId,
  amountDollars,
  successPath,
  cancelPath
}) {
  if (!productId) {
    throw new Error("productId is required for artwork");
  }

  const alreadyUnlocked = await hasExistingUniversalUnlock(user.id, Number(productId));
  if (alreadyUnlocked) {
    throw new Error("You already unlocked this artwork product");
  }

  const { product, error } = await getProduct(productId);
  if (error || !product) {
    throw new Error(error || "Product not found");
  }

  const amountCents =
    numOrNull(product.price_cents) ??
    dollarsToCents(amountDollars || product.price || 0);

  if (!amountCents || amountCents <= 0) {
    throw new Error("Artwork price is invalid");
  }

  const customer = await ensureStripeCustomer({ user, profile });

  const successUrl =
    successPath ||
    makeSuccessUrl("artwork", {
      productId: product.id,
      artworkId
    });

  const cancelUrl =
    cancelPath ||
    makeCancelUrl("artwork", {
      productId: product.id,
      artworkId
    });

  const session = await stripe.checkout.sessions.create({
    mode: "payment",
    customer: customer.id,
    payment_method_types: ["card"],
    line_items: [
      {
        price_data: {
          currency: normalizeCurrency(product.currency || "usd"),
          product_data: {
            name: product.name || product.title || "Artwork",
            description: product.description || "Rich Bizness artwork purchase"
          },
          unit_amount: amountCents
        },
        quantity: 1
      }
    ],
    success_url: successUrl,
    cancel_url: cancelUrl,
    allow_promotion_codes: true,
    metadata: {
      kind: "artwork",
      type: "artwork",
      user_id: user.id,
      creator_id: product.creator_id || "",
      product_id: String(product.id),
      linked_record_id: artworkId ? String(artworkId) : "",
      title: product.name || product.title || "Artwork"
    }
  });

  return {
    checkoutUrl: session.url,
    sessionId: session.id,
    product
  };
}

async function createPremiumContentSession({
  user,
  profile,
  contentId,
  successPath,
  cancelPath
}) {
  if (!contentId) {
    throw new Error("contentId is required for premium_content");
  }

  const { content, error } = await getPremiumContent(contentId);
  if (error || !content) {
    throw new Error(error || "Premium content not found");
  }

  const amountCents = numOrNull(content.price_cents);
  if (!amountCents || amountCents <= 0) {
    throw new Error("Premium content price is invalid");
  }

  const customer = await ensureStripeCustomer({ user, profile });

  const successUrl =
    successPath ||
    makeSuccessUrl("premium_content", {
      contentId: content.id
    });

  const cancelUrl =
    cancelPath ||
    makeCancelUrl("premium_content", {
      contentId: content.id
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
            name: content.title || "Premium Content",
            description: content.description || "Rich Bizness premium content"
          },
          unit_amount: amountCents
        },
        quantity: 1
      }
    ],
    success_url: successUrl,
    cancel_url: cancelUrl,
    allow_promotion_codes: true,
    metadata: {
      kind: "store",
      type: "premium_content",
      user_id: user.id,
      creator_id: content.creator_id || "",
      seller_user_id: content.creator_id || "",
      product_id: "",
      linked_record_id: String(content.id),
      product_title: content.title || "Premium Content"
    }
  });

  return {
    checkoutUrl: session.url,
    sessionId: session.id,
    content
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

    const { user, error: authError } = await getAuthenticatedUser(req);
    if (authError || !user) {
      return send(res, 401, { error: authError || "Unauthorized" });
    }

    const profile = await getProfile(user.id);
    const mode = normalizeMode(req.body?.mode);

    if (!mode) {
      return send(res, 400, {
        error:
          "mode must be one of: stream_ticket, vip_membership, tip, store, music_unlock, artwork, premium_content"
      });
    }

    if (mode === "stream_ticket") {
      const result = await createStreamTicketSession({
        user,
        profile,
        streamId: req.body?.streamId,
        successPath: req.body?.successUrl,
        cancelPath: req.body?.cancelUrl
      });

      return send(res, 200, {
        ok: true,
        mode,
        checkoutUrl: result.checkoutUrl,
        sessionId: result.sessionId,
        livePurchaseId: result.livePurchaseId,
        stream: {
          id: result.stream.id,
          title: result.stream.title,
          slug: result.stream.slug,
          roomName: result.stream.livekit_room_name,
          accessType: result.stream.access_type,
          priceCents: result.stream.price_cents
        }
      });
    }

    if (mode === "vip_membership") {
      const result = await createVipMembershipSession({
        user,
        profile,
        creatorId: req.body?.creatorId,
        roomName: req.body?.roomName,
        vipPriceDollars: req.body?.amount || 9.99,
        successPath: req.body?.successUrl,
        cancelPath: req.body?.cancelUrl
      });

      return send(res, 200, {
        ok: true,
        mode,
        checkoutUrl: result.checkoutUrl,
        sessionId: result.sessionId,
        creator: {
          id: result.creatorProfile.id,
          displayName: result.creatorProfile.display_name,
          username: result.creatorProfile.username
        }
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
        cancelPath: req.body?.cancelUrl
      });

      return send(res, 200, {
        ok: true,
        mode,
        checkoutUrl: result.checkoutUrl,
        sessionId: result.sessionId,
        creator: {
          id: result.creatorProfile.id,
          displayName: result.creatorProfile.display_name,
          username: result.creatorProfile.username
        }
      });
    }

    if (mode === "store") {
      const result = await createStoreSession({
        user,
        profile,
        productId: req.body?.productId,
        quantity: req.body?.quantity,
        successPath: req.body?.successUrl,
        cancelPath: req.body?.cancelUrl
      });

      return send(res, 200, {
        ok: true,
        mode,
        checkoutUrl: result.checkoutUrl,
        sessionId: result.sessionId,
        product: result.product
      });
    }

    if (mode === "music_unlock") {
      const result = await createMusicUnlockSession({
        user,
        profile,
        productId: req.body?.productId,
        trackSlug: req.body?.trackSlug,
        albumSlug: req.body?.albumSlug,
        linkedRecordId: req.body?.linkedRecordId || req.body?.trackId,
        amountDollars: req.body?.amount,
        successPath: req.body?.successUrl,
        cancelPath: req.body?.cancelUrl
      });

      return send(res, 200, {
        ok: true,
        mode,
        checkoutUrl: result.checkoutUrl,
        sessionId: result.sessionId,
        product: result.product
      });
    }

    if (mode === "artwork") {
      const result = await createArtworkSession({
        user,
        profile,
        productId: req.body?.productId,
        artworkId: req.body?.artworkId,
        amountDollars: req.body?.amount,
        successPath: req.body?.successUrl,
        cancelPath: req.body?.cancelUrl
      });

      return send(res, 200, {
        ok: true,
        mode,
        checkoutUrl: result.checkoutUrl,
        sessionId: result.sessionId,
        product: result.product
      });
    }

    if (mode === "premium_content") {
      const result = await createPremiumContentSession({
        user,
        profile,
        contentId: req.body?.contentId,
        successPath: req.body?.successUrl,
        cancelPath: req.body?.cancelUrl
      });

      return send(res, 200, {
        ok: true,
        mode,
        checkoutUrl: result.checkoutUrl,
        sessionId: result.sessionId,
        content: result.content
      });
    }

    return send(res, 400, { error: "Unsupported checkout mode" });
  } catch (error) {
    console.error("create-checkout-session error:", error);
    return send(res, 500, {
      error: error?.message || "Failed to create checkout session"
    });
  }
}
