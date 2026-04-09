import Stripe from "stripe";
import { createClient } from "@supabase/supabase-js";

export const config = {
  api: {
    bodyParser: false,
  },
};

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function readRawBody(req) {
  const chunks = [];
  for await (const chunk of req) {
    chunks.push(typeof chunk === "string" ? Buffer.from(chunk) : chunk);
  }
  return Buffer.concat(chunks);
}

function toInt(value, fallback = 0) {
  const num = Number(value);
  return Number.isFinite(num) ? Math.round(num) : fallback;
}

function getSessionMetadata(session) {
  return session?.metadata || {};
}

async function markPremiumPurchasePaid(session) {
  const metadata = getSessionMetadata(session);
  const purchaseId = metadata.premium_track_purchase_id;
  const artistUserId = metadata.artist_user_id || "";
  const trackId = toInt(metadata.track_id, 0);

  if (!purchaseId) {
    throw new Error("Missing premium_track_purchase_id in metadata.");
  }

  const updateRes = await supabase
    .from("premium_track_purchases")
    .update({
      status: "paid",
      stripe_session_id: session.id,
    })
    .eq("id", purchaseId)
    .select()
    .single();

  if (updateRes.error) throw updateRes.error;

  const insertEarnRes = await supabase
    .from("music_earnings")
    .insert({
      artist_user_id: artistUserId || updateRes.data.artist_user_id,
      track_id: trackId || updateRes.data.track_id,
      source_type: "premium_track_unlock",
      source_id: toInt(purchaseId),
      gross_cents: toInt(session.amount_total, 0),
      note: "Premium track unlock",
    });

  if (insertEarnRes.error) throw insertEarnRes.error;
}

async function activateFanSubscriptionFromCheckout(session) {
  const metadata = getSessionMetadata(session);
  const fanSubscriptionId = metadata.fan_subscription_id;
  const artistUserId = metadata.artist_user_id || "";
  const userId = metadata.user_id || "";

  const sessionSubscriptionId =
    typeof session.subscription === "string"
      ? session.subscription
      : session.subscription?.id || "";

  if (fanSubscriptionId) {
    const updateRes = await supabase
      .from("fan_subscriptions")
      .update({
        status: "active",
        stripe_subscription_id: sessionSubscriptionId,
      })
      .eq("id", fanSubscriptionId)
      .select()
      .single();

    if (updateRes.error) throw updateRes.error;

    const insertEarnRes = await supabase
      .from("music_earnings")
      .insert({
        artist_user_id: artistUserId || updateRes.data.artist_user_id,
        source_type: "fan_subscription",
        source_id: toInt(fanSubscriptionId),
        gross_cents: toInt(session.amount_total, 0),
        note: "Fan subscription purchase",
      });

    if (insertEarnRes.error) throw insertEarnRes.error;
    return;
  }

  // Fallback: if no fan_subscription_id was pre-created, create or upsert one now.
  if (!artistUserId || !userId) {
    throw new Error("Missing artist_user_id or user_id for subscription fallback.");
  }

  const upsertRes = await supabase
    .from("fan_subscriptions")
    .upsert(
      {
        fan_user_id: userId,
        artist_user_id: artistUserId,
        stripe_subscription_id: sessionSubscriptionId,
        tier_name: "Supporter",
        amount_cents: toInt(session.amount_total, 0),
        status: "active",
      },
      { onConflict: "fan_user_id,artist_user_id" }
    )
    .select()
    .single();

  if (upsertRes.error) throw upsertRes.error;

  const insertEarnRes = await supabase
    .from("music_earnings")
    .insert({
      artist_user_id: artistUserId,
      source_type: "fan_subscription",
      source_id: toInt(upsertRes.data.id),
      gross_cents: toInt(session.amount_total, 0),
      note: "Fan subscription purchase",
    });

  if (insertEarnRes.error) throw insertEarnRes.error;
}

async function recordDirectSupport(session) {
  const metadata = getSessionMetadata(session);
  const artistUserId = metadata.artist_user_id || "";
  const userId = metadata.user_id || "";

  if (!artistUserId) {
    throw new Error("Missing artist_user_id for direct support.");
  }

  const insertEarnRes = await supabase
    .from("music_earnings")
    .insert({
      artist_user_id: artistUserId,
      source_type: "direct_support",
      source_id: null,
      gross_cents: toInt(session.amount_total, 0),
      note: `Direct support${userId ? ` from ${userId}` : ""}`,
    });

  if (insertEarnRes.error) throw insertEarnRes.error;
}

async function syncSubscriptionStatus(subscription) {
  const stripeSubscriptionId = subscription.id;
  const status = subscription.status || "inactive";

  const updateRes = await supabase
    .from("fan_subscriptions")
    .update({
      status,
    })
    .eq("stripe_subscription_id", stripeSubscriptionId);

  if (updateRes.error) throw updateRes.error;
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).send("Method Not Allowed");
  }

  if (!process.env.STRIPE_SECRET_KEY) {
    return res.status(500).json({ error: "Missing STRIPE_SECRET_KEY." });
  }

  if (!process.env.STRIPE_WEBHOOK_SECRET) {
    return res.status(500).json({ error: "Missing STRIPE_WEBHOOK_SECRET." });
  }

  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return res.status(500).json({ error: "Missing Supabase server env vars." });
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
        const mode = session.metadata?.app_mode || session.metadata?.mode || "";

        if (mode === "premium_track_unlock") {
          await markPremiumPurchasePaid(session);
        } else if (mode === "fan_subscription") {
          await activateFanSubscriptionFromCheckout(session);
        } else if (mode === "direct_support") {
          await recordDirectSupport(session);
        }
        break;
      }

      case "customer.subscription.updated": {
        const subscription = event.data.object;
        await syncSubscriptionStatus(subscription);
        break;
      }

      case "customer.subscription.deleted": {
        const subscription = event.data.object;
        await syncSubscriptionStatus(subscription);
        break;
      }

      default:
        break;
    }

    return res.status(200).json({ received: true });
  } catch (err) {
    console.error("stripe-webhook handler error:", err);
    return res.status(500).json({
      error: err?.message || "Webhook handler failed.",
    });
  }
}
