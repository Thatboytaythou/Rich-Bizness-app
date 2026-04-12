import Stripe from "stripe";
import { createClient } from "@supabase/supabase-js";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

export const config = {
  api: {
    bodyParser: false
  }
};

function isPlainObject(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

async function readRawBody(req) {
  const chunks = [];
  for await (const chunk of req) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }
  return Buffer.concat(chunks);
}

function normalizeType(value) {
  return String(value || "").trim().toLowerCase();
}

async function unlockTournamentEntry({ supabaseAdmin, userId, paymentId, metadata }) {
  const challengeId = Number(metadata.challenge_id);

  if (!Number.isFinite(challengeId) || challengeId <= 0) {
    return { ok: false, reason: "Missing or invalid challenge_id" };
  }

  const { data: existingEntry, error: existingEntryError } = await supabaseAdmin
    .from("game_challenge_entries")
    .select("id")
    .eq("challenge_id", challengeId)
    .eq("user_id", userId)
    .maybeSingle();

  if (existingEntryError) {
    throw existingEntryError;
  }

  if (existingEntry) {
    return { ok: true, action: "already_exists", challenge_id: challengeId };
  }

  const { error: insertError } = await supabaseAdmin
    .from("game_challenge_entries")
    .insert([
      {
        challenge_id: challengeId,
        user_id: userId,
        best_score: 0
      }
    ]);

  if (insertError) {
    throw insertError;
  }

  return { ok: true, action: "created", challenge_id: challengeId, payment_id: paymentId };
}

async function unlockVipLive({ supabaseAdmin, userId, paymentId, metadata }) {
  const roomName = String(metadata.room_name || metadata.room || "").trim();

  if (!roomName) {
    return { ok: false, reason: "Missing room_name" };
  }

  const { error } = await supabaseAdmin
    .from("vip_live_access")
    .upsert(
      [
        {
          user_id: userId,
          room_name: roomName,
          status: "active",
          source_payment_id: paymentId
        }
      ],
      {
        onConflict: "user_id,room_name"
      }
    );

  if (error) {
    throw error;
  }

  return { ok: true, action: "granted", room_name: roomName };
}

async function unlockMusic({ supabaseAdmin, userId, paymentId, metadata }) {
  const trackSlug = String(metadata.track_slug || "").trim() || null;
  const albumSlug = String(metadata.album_slug || "").trim() || null;

  if (!trackSlug && !albumSlug) {
    return { ok: false, reason: "Missing track_slug or album_slug" };
  }

  const { error } = await supabaseAdmin
    .from("music_unlocks")
    .insert([
      {
        user_id: userId,
        track_slug: trackSlug,
        album_slug: albumSlug,
        status: "active",
        source_payment_id: paymentId
      }
    ]);

  if (error) {
    throw error;
  }

  return {
    ok: true,
    action: "unlocked",
    track_slug: trackSlug,
    album_slug: albumSlug
  };
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).send("Method not allowed");
  }

  try {
    const stripeWebhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
    const supabaseUrl = process.env.SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!process.env.STRIPE_SECRET_KEY) {
      return res.status(500).send("Missing STRIPE_SECRET_KEY");
    }

    if (!stripeWebhookSecret) {
      return res.status(500).send("Missing STRIPE_WEBHOOK_SECRET");
    }

    if (!supabaseUrl || !serviceRoleKey) {
      return res.status(500).send("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
    }

    const signature = req.headers["stripe-signature"];
    if (!signature) {
      return res.status(400).send("Missing Stripe signature");
    }

    const rawBody = await readRawBody(req);

    let event;
    try {
      event = stripe.webhooks.constructEvent(rawBody, signature, stripeWebhookSecret);
    } catch (error) {
      console.error("stripe-webhook signature verification failed:", error);
      return res.status(400).send(`Webhook Error: ${error.message}`);
    }

    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    });

    if (event.type === "checkout.session.completed") {
      const session = event.data.object;

      const sessionId = session.id;
      const paymentIntentId =
        typeof session.payment_intent === "string" ? session.payment_intent : null;

      const { data: paymentRow, error: paymentLookupError } = await supabaseAdmin
        .from("payments")
        .select("*")
        .eq("stripe_session_id", sessionId)
        .maybeSingle();

      if (paymentLookupError) {
        console.error("stripe-webhook payment lookup error:", paymentLookupError);
        return res.status(500).send(paymentLookupError.message);
      }

      if (!paymentRow) {
        console.error("stripe-webhook payment row not found for session:", sessionId);
        return res.status(200).json({
          ok: true,
          warning: "Payment row not found, webhook acknowledged"
        });
      }

      const metadata = isPlainObject(paymentRow.metadata) ? paymentRow.metadata : {};
      const type = normalizeType(paymentRow.type);
      const userId = paymentRow.user_id;

      const { error: paymentUpdateError } = await supabaseAdmin
        .from("payments")
        .update({
          status: "paid",
          stripe_payment_intent_id: paymentIntentId,
          updated_at: new Date().toISOString(),
          metadata: {
            ...metadata,
            stripe_checkout_status: session.payment_status || null,
            stripe_customer_email: session.customer_details?.email || session.customer_email || null
          }
        })
        .eq("id", paymentRow.id);

      if (paymentUpdateError) {
        console.error("stripe-webhook payment update error:", paymentUpdateError);
        return res.status(500).send(paymentUpdateError.message);
      }

      let unlockResult = { ok: true, action: "none" };

      if (type === "tournament_entry") {
        unlockResult = await unlockTournamentEntry({
          supabaseAdmin,
          userId,
          paymentId: paymentRow.id,
          metadata
        });
      } else if (type === "vip_live") {
        unlockResult = await unlockVipLive({
          supabaseAdmin,
          userId,
          paymentId: paymentRow.id,
          metadata
        });
      } else if (type === "music_unlock") {
        unlockResult = await unlockMusic({
          supabaseAdmin,
          userId,
          paymentId: paymentRow.id,
          metadata
        });
      }

      const { error: finalPaymentMetaError } = await supabaseAdmin
        .from("payments")
        .update({
          updated_at: new Date().toISOString(),
          metadata: {
            ...metadata,
            unlock_result: unlockResult
          }
        })
        .eq("id", paymentRow.id);

      if (finalPaymentMetaError) {
        console.error("stripe-webhook final metadata update error:", finalPaymentMetaError);
        return res.status(500).send(finalPaymentMetaError.message);
      }

      return res.status(200).json({
        received: true,
        type,
        unlock_result: unlockResult
      });
    }

    if (event.type === "checkout.session.expired") {
      const session = event.data.object;

      const { error } = await supabaseAdmin
        .from("payments")
        .update({
          status: "expired",
          updated_at: new Date().toISOString()
        })
        .eq("stripe_session_id", session.id);

      if (error) {
        console.error("stripe-webhook expire update error:", error);
        return res.status(500).send(error.message);
      }

      return res.status(200).json({ received: true, status: "expired" });
    }

    return res.status(200).json({
      received: true,
      ignored: true,
      event_type: event.type
    });
  } catch (error) {
    console.error("stripe-webhook fatal error:", error);
    return res.status(500).send(error?.message || "Webhook failure");
  }
}
