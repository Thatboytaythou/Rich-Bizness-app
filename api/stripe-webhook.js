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

function amountCentsToNumber(amount) {
  return Number(((Number(amount || 0) / 100) || 0).toFixed(2));
}

async function saveStoreOrder({ supabase, checkoutSession }) {
  const productId = checkoutSession?.metadata?.product_id || null;
  const productTitle =
    checkoutSession?.metadata?.product_title ||
    checkoutSession?.metadata?.product_name ||
    "Store Product";
  const sellerUserId = checkoutSession?.metadata?.seller_user_id || null;
  const quantity = Number(checkoutSession?.metadata?.quantity || 1) || 1;

  const payload = {
    stripe_session_id: checkoutSession.id,
    stripe_payment_intent_id: getCheckoutPaymentIntentId(checkoutSession),
    stripe_customer_id:
      typeof checkoutSession.customer === "string"
        ? checkoutSession.customer
        : checkoutSession?.customer?.id || null,
    product_id: productId ? Number(productId) : null,
    product_name: productTitle,
    amount_total: amountCentsToNumber(checkoutSession.amount_total),
    currency: checkoutSession.currency || "usd",
    quantity,
    payment_status: checkoutSession.payment_status || "paid",
    order_status: "paid",
    customer_email: checkoutSession.customer_details?.email || null,
    creator_id: sellerUserId || null,
    metadata: {
      source: "store",
      product_id: productId,
      seller_user_id: sellerUserId,
      purchaser_user_id: checkoutSession?.metadata?.user_id || null,
      kind: checkoutSession?.metadata?.kind || "store",
      raw_metadata: checkoutSession?.metadata || {}
    }
  };

  const { error } = await supabase
    .from("store_orders")
    .upsert(payload, { onConflict: "stripe_session_id" });

  if (error) {
    throw new Error(`Store order save failed: ${error.message}`);
  }

  console.log("✅ Store order saved:", payload.product_id);
}

async function grantUniversalUnlock({ supabase, checkoutSession }) {
  const userId = checkoutSession?.metadata?.user_id || null;
  const productId = checkoutSession?.metadata?.product_id || null;
  const kind = checkoutSession?.metadata?.kind || null;
  const linkedRecordId = checkoutSession?.metadata?.linked_record_id || null;

  if (!userId || !productId || !kind) {
    console.log("ℹ️ Unlock skipped: missing user_id, product_id, or kind");
    return;
  }

  const unlockPayload = {
    user_id: userId,
    product_id: Number(productId),
    kind,
    access_scope: "standard",
    linked_record_id: linkedRecordId ? Number(linkedRecordId) : null,
    source: "stripe"
  };

  const { error } = await supabase
    .from("user_product_unlocks")
    .upsert(unlockPayload, { onConflict: "user_id,product_id" });

  if (error) {
    throw new Error(`Universal unlock save failed: ${error.message}`);
  }

  console.log("✅ Universal unlock granted:", kind, productId, userId);
}

async function grantKindSpecificUnlock({ supabase, checkoutSession }) {
  const userId = checkoutSession?.metadata?.user_id || null;
  const productId = checkoutSession?.metadata?.product_id || null;
  const kind = checkoutSession?.metadata?.kind || null;
  const linkedRecordId = checkoutSession?.metadata?.linked_record_id || null;

  if (!userId || !productId || !kind) return;

  if (kind === "live") {
    const { error } = await supabase
      .from("vip_live_access")
      .upsert(
        {
          user_id: userId,
          product_id: Number(productId),
          live_stream_id: linkedRecordId ? Number(linkedRecordId) : null,
          status: "active",
          source: "stripe",
          granted_at: new Date().toISOString()
        },
        { onConflict: "user_id,product_id" }
      );

    if (error) {
      console.error("❌ VIP live unlock failed:", error);
    } else {
      console.log("✅ VIP live access granted");
    }
  }

  if (kind === "music") {
    const { error } = await supabase
      .from("music_unlocks")
      .upsert(
        {
          user_id: userId,
          product_id: Number(productId),
          track_id: linkedRecordId ? Number(linkedRecordId) : null,
          unlocked_at: new Date().toISOString(),
          source: "stripe"
        },
        { onConflict: "user_id,product_id" }
      );

    if (error) {
      console.error("❌ Music unlock failed:", error);
    } else {
      console.log("✅ Music unlocked");
    }
  }

  if (kind === "artwork") {
    const { error } = await supabase
      .from("artwork_purchases")
      .upsert(
        {
          buyer_id: userId,
          product_id: Number(productId),
          artwork_id: linkedRecordId ? Number(linkedRecordId) : null,
          status: "paid",
          source: "stripe",
          purchased_at: new Date().toISOString()
        },
        { onConflict: "buyer_id,product_id" }
      );

    if (error) {
      console.error("❌ Artwork unlock failed:", error);
    } else {
      console.log("✅ Artwork unlocked");
    }
  }

  if (kind === "gaming") {
    console.log("✅ Gaming unlock granted through universal table");
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
    console.error("❌ Failed reading store order for revoke:", orderError);
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
    console.error("❌ Universal unlock revoke failed:", error);
  } else {
    console.log("↩️ Universal unlock revoked");
  }
}

async function markLivePurchasePaid({ supabase, checkoutSession }) {
  const livePurchaseId =
    checkoutSession?.metadata?.live_purchase_id ||
    checkoutSession?.client_reference_id ||
    null;

  if (!livePurchaseId) return;

  const payload = {
    payment_status: "paid",
    status: "paid",
    stripe_checkout_session_id: checkoutSession.id,
    stripe_payment_intent_id: getCheckoutPaymentIntentId(checkoutSession),
    amount_total: amountCentsToNumber(checkoutSession.amount_total),
    currency: checkoutSession.currency || "usd"
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
  const livePurchaseId =
    checkoutSession?.metadata?.live_purchase_id ||
    checkoutSession?.client_reference_id ||
    null;

  if (!livePurchaseId) return;

  const { error } = await supabase
    .from("live_stream_purchases")
    .update({
      payment_status: status,
      status
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
      payment_status: "refunded",
      status: "refunded"
    })
    .eq("stripe_payment_intent_id", paymentIntentId);

  if (error) {
    throw new Error(`Live refund update failed: ${error.message}`);
  }

  console.log("↩️ Live purchase refunded:", paymentIntentId);
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

        if (checkoutSession.mode === "payment" && checkoutSession.metadata?.product_id) {
          await saveStoreOrder({ supabase, checkoutSession });
          await grantUniversalUnlock({ supabase, checkoutSession });
          await grantKindSpecificUnlock({ supabase, checkoutSession });
        }

        if (
          checkoutSession.mode === "payment" &&
          checkoutSession.metadata?.live_purchase_id
        ) {
          await markLivePurchasePaid({ supabase, checkoutSession });
        }

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
        const paymentIntentId =
          typeof charge.payment_intent === "string"
            ? charge.payment_intent
            : charge.payment_intent?.id || null;

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
