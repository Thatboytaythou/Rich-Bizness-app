import Stripe from "stripe";
import { createClient } from "@supabase/supabase-js";

export const config = {
  api: {
    bodyParser: false
  }
};

function getStripe() {
  const secretKey = process.env.STRIPE_SECRET_KEY;
  if (!secretKey) {
    throw new Error("Missing STRIPE_SECRET_KEY");
  }

  return new Stripe(secretKey, {
    apiVersion: "2024-06-20"
  });
}

function getSupabaseServer() {
  const supabaseUrl =
    process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error(
      "Missing SUPABASE_URL/NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY"
    );
  }

  return createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });
}

async function readRawBody(req) {
  const chunks = [];

  for await (const chunk of req) {
    chunks.push(typeof chunk === "string" ? Buffer.from(chunk) : chunk);
  }

  return Buffer.concat(chunks);
}

function getCheckoutPaymentIntentId(checkoutSession) {
  return typeof checkoutSession?.payment_intent === "string"
    ? checkoutSession.payment_intent
    : checkoutSession?.payment_intent?.id || null;
}

function getChargePaymentIntentId(charge) {
  return typeof charge?.payment_intent === "string"
    ? charge.payment_intent
    : charge?.payment_intent?.id || null;
}

function getCustomerId(checkoutSession) {
  return typeof checkoutSession?.customer === "string"
    ? checkoutSession.customer
    : checkoutSession?.customer?.id || null;
}

function normalizeCurrency(value) {
  return String(value || "usd").toLowerCase();
}

function normalizeStatus(value, fallback = "paid") {
  return String(value || fallback).toLowerCase();
}

function amountCents(value) {
  return Number(value || 0) || 0;
}

function amountDecimalFromCents(value) {
  return Number(((Number(value || 0) / 100) || 0).toFixed(2));
}

function numOrNull(value) {
  if (value === null || value === undefined || value === "") return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function isoNow() {
  return new Date().toISOString();
}

async function upsertPaymentRecord({ supabase, checkoutSession }) {
  const metadata = checkoutSession?.metadata || {};
  const paymentType =
    metadata.type ||
    metadata.kind ||
    metadata.purchase_type ||
    "checkout";

  const payload = {
    user_id: metadata.user_id || null,
    amount: amountCents(checkoutSession.amount_total),
    type: paymentType,
    status: normalizeStatus(checkoutSession.payment_status, "paid"),
    stripe_session_id: checkoutSession.id,
    created_at: isoNow()
  };

  const { error } = await supabase
    .from("payments")
    .upsert(payload, { onConflict: "stripe_session_id" });

  if (error) {
    throw new Error(`Payment save failed: ${error.message}`);
  }

  console.log("✅ Payment saved:", checkoutSession.id);
}

async function saveStoreOrder({ supabase, checkoutSession }) {
  const metadata = checkoutSession?.metadata || {};

  const productId =
    numOrNull(metadata.product_id) ??
    numOrNull(metadata.linked_record_id);

  const productTitle =
    metadata.product_title ||
    metadata.product_name ||
    metadata.title ||
    "Store Product";

  const sellerUserId =
    metadata.seller_user_id ||
    metadata.creator_id ||
    null;

  const quantity = Number(metadata.quantity || 1) || 1;

  const payload = {
    stripe_session_id: checkoutSession.id,
    stripe_payment_intent_id: getCheckoutPaymentIntentId(checkoutSession),
    stripe_customer_id: getCustomerId(checkoutSession),
    product_id: productId,
    product_name: productTitle,
    amount_total: amountDecimalFromCents(checkoutSession.amount_total),
    currency: normalizeCurrency(checkoutSession.currency),
    quantity,
    payment_status: normalizeStatus(checkoutSession.payment_status, "paid"),
    order_status: "paid",
    customer_email: checkoutSession.customer_details?.email || null,
    creator_id: sellerUserId,
    metadata: {
      source: "store",
      product_id: productId,
      seller_user_id: sellerUserId,
      purchaser_user_id: metadata.user_id || null,
      kind: metadata.kind || "store",
      raw_metadata: metadata
    },
    created_at: isoNow()
  };

  const { error } = await supabase
    .from("store_orders")
    .upsert(payload, { onConflict: "stripe_session_id" });

  if (error) {
    throw new Error(`Store order save failed: ${error.message}`);
  }

  console.log("✅ Store order saved:", payload.product_id);
}

async function createLegacyOrderRecord({ supabase, checkoutSession }) {
  const metadata = checkoutSession?.metadata || {};

  const payload = {
    buyer_user_id: metadata.user_id || null,
    seller_user_id: metadata.creator_id || metadata.seller_user_id || null,
    product_id:
      numOrNull(metadata.product_id) ??
      numOrNull(metadata.linked_record_id),
    stripe_checkout_session_id: checkoutSession.id,
    stripe_payment_intent_id: getCheckoutPaymentIntentId(checkoutSession),
    amount_total_cents: amountCents(checkoutSession.amount_total),
    currency: normalizeCurrency(checkoutSession.currency),
    status: "paid",
    created_at: isoNow(),
    paid_at: isoNow()
  };

  const { error } = await supabase
    .from("orders")
    .upsert(payload, { onConflict: "stripe_checkout_session_id" });

  if (error) {
    console.error("❌ Legacy orders save failed:", error.message);
  } else {
    console.log("✅ Legacy order saved");
  }
}

async function grantUniversalUnlock({ supabase, checkoutSession }) {
  const metadata = checkoutSession?.metadata || {};

  const userId = metadata.user_id || null;
  const productId = numOrNull(metadata.product_id);
  const kind = metadata.kind || null;
  const linkedRecordId = numOrNull(metadata.linked_record_id);

  if (!userId || !productId || !kind) {
    console.log("ℹ️ Unlock skipped: missing user_id, product_id, or kind");
    return;
  }

  const unlockPayload = {
    user_id: userId,
    product_id: productId,
    kind,
    access_scope: metadata.access_scope || "standard",
    linked_record_id: linkedRecordId,
    source: "stripe",
    granted_at: isoNow()
  };

  const { error } = await supabase
    .from("user_product_unlocks")
    .upsert(unlockPayload, { onConflict: "user_id,product_id" });

  if (error) {
    throw new Error(`Universal unlock save failed: ${error.message}`);
  }

  console.log("✅ Universal unlock granted:", kind, productId, userId);
}

async function grantVipLiveAccess({ supabase, checkoutSession }) {
  const metadata = checkoutSession?.metadata || {};

  const userId = metadata.user_id || null;
  if (!userId) return;

  const roomName =
    metadata.room_name ||
    metadata.livekit_room_name ||
    metadata.live_room_name ||
    null;

  if (!roomName) {
    console.log("ℹ️ VIP live access skipped: missing room name");
    return;
  }

  const sourcePaymentId =
    numOrNull(metadata.live_purchase_id) ??
    numOrNull(metadata.source_payment_id) ??
    null;

  const payload = {
    user_id: userId,
    room_name: roomName,
    status: "active",
    source_payment_id: sourcePaymentId,
    created_at: isoNow()
  };

  const { error } = await supabase
    .from("vip_live_access")
    .insert(payload);

  if (error) {
    console.error("❌ VIP live access grant failed:", error.message);
  } else {
    console.log("✅ VIP live access granted");
  }
}

async function createMusicUnlock({ supabase, checkoutSession }) {
  const metadata = checkoutSession?.metadata || {};
  const userId = metadata.user_id || null;

  if (!userId) return;

  const payload = {
    user_id: userId,
    track_slug: metadata.track_slug || null,
    album_slug: metadata.album_slug || null,
    status: "paid",
    source_payment_id:
      numOrNull(metadata.source_payment_id) ??
      numOrNull(metadata.linked_record_id) ??
      null,
    created_at: isoNow()
  };

  const { error } = await supabase
    .from("music_unlocks")
    .insert(payload);

  if (error) {
    console.error("❌ Music unlock failed:", error.message);
  } else {
    console.log("✅ Music unlocked");
  }
}

async function createArtworkPurchase({ supabase, checkoutSession }) {
  const metadata = checkoutSession?.metadata || {};
  const userId = metadata.user_id || null;

  if (!userId) return;

  const payload = {
    user_id: userId,
    artwork_id:
      numOrNull(metadata.artwork_id) ??
      numOrNull(metadata.linked_record_id),
    title: metadata.title || metadata.product_title || "Artwork",
    price: amountDecimalFromCents(checkoutSession.amount_total),
    status: "paid",
    created_at: isoNow()
  };

  const { error } = await supabase
    .from("artwork_purchases")
    .insert(payload);

  if (error) {
    console.error("❌ Artwork purchase save failed:", error.message);
  } else {
    console.log("✅ Artwork purchase saved");
  }
}

async function createPremiumContentPurchase({ supabase, checkoutSession }) {
  const metadata = checkoutSession?.metadata || {};
  const userId = metadata.user_id || null;
  const creatorId = metadata.creator_id || null;
  const premiumContentId =
    numOrNull(metadata.content_id) ??
    numOrNull(metadata.linked_record_id);

  if (!userId || !premiumContentId) {
    console.log("ℹ️ Premium content purchase skipped: missing user/content id");
    return;
  }

  const payload = {
    buyer_id: userId,
    buyer_email: checkoutSession.customer_details?.email || null,
    creator_id: creatorId || null,
    premium_content_id: premiumContentId,
    stripe_session_id: checkoutSession.id,
    amount_cents: amountCents(checkoutSession.amount_total),
    status: "paid",
    created_at: isoNow()
  };

  const { error } = await supabase.from("purchases").insert(payload);

  if (error) {
    console.error("❌ Premium content purchase save failed:", error.message);
  } else {
    console.log("✅ Premium content purchase saved");
  }
}

async function grantKindSpecificUnlock({ supabase, checkoutSession }) {
  const metadata = checkoutSession?.metadata || {};
  const kind = metadata.kind || null;

  if (!kind) return;

  if (kind === "live") {
    await grantVipLiveAccess({ supabase, checkoutSession });
    return;
  }

  if (kind === "music") {
    await createMusicUnlock({ supabase, checkoutSession });
    return;
  }

  if (kind === "artwork") {
    await createArtworkPurchase({ supabase, checkoutSession });
    return;
  }

  if (kind === "premium_content") {
    console.log("✅ Premium content payment received");
    return;
  }

  if (kind === "gaming") {
    console.log("✅ Gaming unlock granted through universal table");
    return;
  }

  if (kind === "store") {
    console.log("✅ Store purchase recorded");
  }
}

async function markStoreOrderRefunded({ supabase, paymentIntentId }) {
  if (!paymentIntentId) return;

  const { error } = await supabase
    .from("store_orders")
    .update({
      payment_status: "refunded",
      order_status: "refunded"
    })
    .eq("stripe_payment_intent_id", paymentIntentId);

  if (error) {
    throw new Error(`Store refund update failed: ${error.message}`);
  }

  console.log("↩️ Store order refunded:", paymentIntentId);
}

async function revokeUniversalUnlockByPaymentIntent({ supabase, paymentIntentId }) {
  if (!paymentIntentId) return;

  const { data: orders, error: orderError } = await supabase
    .from("store_orders")
    .select("metadata, product_id")
    .eq("stripe_payment_intent_id", paymentIntentId)
    .limit(1);

  if (orderError) {
    console.error("❌ Failed reading store order for revoke:", orderError.message);
    return;
  }

  const order = orders?.[0];
  const userId = order?.metadata?.purchaser_user_id || null;
  const productId = order?.product_id || null;

  if (!userId || !productId) return;

  const { error } = await supabase
    .from("user_product_unlocks")
    .delete()
    .eq("user_id", userId)
    .eq("product_id", productId);

  if (error) {
    console.error("❌ Universal unlock revoke failed:", error.message);
  } else {
    console.log("↩️ Universal unlock revoked");
  }
}

async function markLivePurchasePaid({ supabase, checkoutSession }) {
  const metadata = checkoutSession?.metadata || {};

  const livePurchaseId =
    metadata.live_purchase_id ||
    checkoutSession?.client_reference_id ||
    null;

  if (!livePurchaseId) return;

  const payload = {
    status: "paid",
    stripe_checkout_session_id: checkoutSession.id,
    stripe_payment_intent_id: getCheckoutPaymentIntentId(checkoutSession),
    stripe_customer_id: getCustomerId(checkoutSession),
    amount_cents: amountCents(checkoutSession.amount_total),
    currency: normalizeCurrency(checkoutSession.currency),
    purchased_at: isoNow(),
    updated_at: isoNow()
  };

  const { error } = await supabase
    .from("live_stream_purchases")
    .update(payload)
    .eq("id", livePurchaseId);

  if (error) {
    throw new Error(`Live purchase paid update failed: ${error.message}`);
  }

  console.log("✅ Live purchase paid:", livePurchaseId);
}

async function markLivePurchaseFailed({ supabase, checkoutSession, status = "canceled" }) {
  const metadata = checkoutSession?.metadata || {};

  const livePurchaseId =
    metadata.live_purchase_id ||
    checkoutSession?.client_reference_id ||
    null;

  if (!livePurchaseId) return;

  const { error } = await supabase
    .from("live_stream_purchases")
    .update({
      status,
      updated_at: isoNow()
    })
    .eq("id", livePurchaseId);

  if (error) {
    throw new Error(`Live purchase failure update failed: ${error.message}`);
  }

  console.log("⚠️ Live purchase updated:", livePurchaseId, status);
}

async function markLivePurchaseRefunded({ supabase, paymentIntentId }) {
  if (!paymentIntentId) return;

  const { error } = await supabase
    .from("live_stream_purchases")
    .update({
      status: "refunded",
      refunded_at: isoNow(),
      updated_at: isoNow()
    })
    .eq("stripe_payment_intent_id", paymentIntentId);

  if (error) {
    throw new Error(`Live refund update failed: ${error.message}`);
  }

  console.log("↩️ Live purchase refunded:", paymentIntentId);
}

async function createTipRecord({ supabase, checkoutSession }) {
  const metadata = checkoutSession?.metadata || {};
  const fromUserId = metadata.user_id || metadata.from_user_id || null;
  const toUserId = metadata.creator_id || metadata.to_user_id || null;

  if (!fromUserId || !toUserId) {
    console.log("ℹ️ Tip insert skipped: missing from/to user");
    return;
  }

  const payload = {
    from_user_id: fromUserId,
    to_user_id: toUserId,
    stripe_checkout_session_id: checkoutSession.id,
    stripe_payment_intent_id: getCheckoutPaymentIntentId(checkoutSession),
    amount_cents: amountCents(checkoutSession.amount_total),
    currency: normalizeCurrency(checkoutSession.currency),
    status: "paid",
    created_at: isoNow(),
    paid_at: isoNow()
  };

  const { error } = await supabase
    .from("tips")
    .upsert(payload, { onConflict: "stripe_checkout_session_id" });

  if (error) {
    throw new Error(`Tip save failed: ${error.message}`);
  }

  console.log("✅ Tip saved");
}

async function createPayoutRequestRecord({ supabase, checkoutSession }) {
  const metadata = checkoutSession?.metadata || {};
  const artistUserId = metadata.creator_id || metadata.user_id || null;

  if (!artistUserId) return;

  const kind = metadata.kind || metadata.type || null;
  if (kind !== "payout_request") return;

  const payload = {
    artist_user_id: artistUserId,
    amount_cents: amountCents(checkoutSession.amount_total),
    currency: normalizeCurrency(checkoutSession.currency),
    status: "paid",
    note: metadata.note || "Stripe payout-related payment",
    created_at: isoNow()
  };

  const { error } = await supabase.from("payout_requests").insert(payload);

  if (error) {
    console.error("❌ Payout request save failed:", error.message);
  } else {
    console.log("✅ Payout request saved");
  }
}

async function syncCreatorMonetizationRecords({ supabase, checkoutSession }) {
  const metadata = checkoutSession?.metadata || {};
  const kind = metadata.kind || metadata.type || null;
  const creatorId = metadata.creator_id || metadata.seller_user_id || null;
  const userId = metadata.user_id || null;
  const amount = amountCents(checkoutSession.amount_total);

  if (!kind) return;

  if (kind === "tip") {
    await createTipRecord({ supabase, checkoutSession });
    return;
  }

  if (kind === "music_earning" || kind === "music") {
    if (!creatorId && !userId) return;

    const payload = {
      artist_user_id: creatorId || userId,
      track_id:
        numOrNull(metadata.track_id) ??
        numOrNull(metadata.linked_record_id),
      source_type: metadata.source_type || "purchase",
      source_id:
        numOrNull(metadata.source_id) ??
        numOrNull(metadata.linked_record_id),
      gross_cents: amount,
      note: metadata.note || "Stripe music payment",
      created_at: isoNow()
    };

    const { error } = await supabase.from("music_earnings").insert(payload);

    if (error) {
      console.error("❌ Music earnings save failed:", error.message);
    } else {
      console.log("✅ Music earnings saved");
    }

    return;
  }

  if (kind === "premium_content") {
    await createPremiumContentPurchase({ supabase, checkoutSession });
    return;
  }

  if (kind === "creator_earning") {
    if (!creatorId) return;

    const payload = {
      creator_id: creatorId,
      source_type: metadata.source_type || "purchase",
      source_id:
        numOrNull(metadata.source_id) ??
        numOrNull(metadata.linked_record_id),
      gross_cents: amount,
      status: "paid",
      created_at: isoNow()
    };

    const { error } = await supabase.from("creator_earnings").insert(payload);

    if (error) {
      console.error("❌ Creator earnings save failed:", error.message);
    } else {
      console.log("✅ Creator earnings saved");
    }

    return;
  }

  await createPayoutRequestRecord({ supabase, checkoutSession });
}

async function handleCompletedCheckout({ supabase, checkoutSession }) {
  const metadata = checkoutSession?.metadata || {};
  const kind = metadata.kind || metadata.type || null;

  await upsertPaymentRecord({ supabase, checkoutSession });

  if (checkoutSession.mode === "payment" && metadata.product_id) {
    await saveStoreOrder({ supabase, checkoutSession });
    await createLegacyOrderRecord({ supabase, checkoutSession });
  }

  if (checkoutSession.mode === "payment" && metadata.live_purchase_id) {
    await markLivePurchasePaid({ supabase, checkoutSession });
  }

  if (
    checkoutSession.mode === "payment" &&
    metadata.user_id &&
    metadata.product_id &&
    metadata.kind
  ) {
    await grantUniversalUnlock({ supabase, checkoutSession });
  }

  if (checkoutSession.mode === "payment" && kind) {
    await grantKindSpecificUnlock({ supabase, checkoutSession });
    await syncCreatorMonetizationRecords({ supabase, checkoutSession });
  }
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const stripe = getStripe();
    const supabase = getSupabaseServer();
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

    if (!webhookSecret) {
      throw new Error("Missing STRIPE_WEBHOOK_SECRET");
    }

    const signature = req.headers["stripe-signature"];
    if (!signature) {
      return res.status(400).json({ error: "Missing stripe-signature header" });
    }

    const rawBody = await readRawBody(req);

    let event;
    try {
      event = stripe.webhooks.constructEvent(rawBody, signature, webhookSecret);
    } catch (err) {
      console.error("Webhook signature failed:", err.message);
      return res.status(400).json({ error: `Webhook Error: ${err.message}` });
    }

    switch (event.type) {
      case "checkout.session.completed": {
        const checkoutSession = event.data.object;
        await handleCompletedCheckout({ supabase, checkoutSession });
        break;
      }

      case "checkout.session.expired": {
        const checkoutSession = event.data.object;

        if (
          checkoutSession.mode === "payment" &&
          checkoutSession.metadata?.live_purchase_id
        ) {
          await markLivePurchaseFailed({
            supabase,
            checkoutSession,
            status: "canceled"
          });
        }

        break;
      }

      case "charge.refunded": {
        const charge = event.data.object;
        const paymentIntentId = getChargePaymentIntentId(charge);

        await markStoreOrderRefunded({
          supabase,
          paymentIntentId
        });

        await revokeUniversalUnlockByPaymentIntent({
          supabase,
          paymentIntentId
        });

        await markLivePurchaseRefunded({
          supabase,
          paymentIntentId
        });

        break;
      }

      default:
        console.log(`ℹ️ Unhandled Stripe event: ${event.type}`);
        break;
    }

    return res.status(200).json({ received: true });
  } catch (err) {
    console.error("[stripe-webhook] error:", err);
    return res.status(500).json({
      error: err.message || "Webhook handler failed"
    });
  }
}
