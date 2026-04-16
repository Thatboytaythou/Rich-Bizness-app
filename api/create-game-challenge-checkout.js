import Stripe from "stripe";
import { createClient } from "@supabase/supabase-js";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: "2024-06-20",
});

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

function json(res, status, payload) {
  return res.status(status).json(payload);
}

function toCents(value) {
  const n = Number(value);
  if (!Number.isFinite(n) || n <= 0) return 0;
  return Math.round(n * 100);
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return json(res, 405, {
      ok: false,
      error: "Method not allowed. Use POST."
    });
  }

  try {
    if (!process.env.STRIPE_SECRET_KEY) {
      return json(res, 500, {
        ok: false,
        error: "Missing STRIPE_SECRET_KEY."
      });
    }

    if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
      return json(res, 500, {
        ok: false,
        error: "Missing Supabase server environment variables."
      });
    }

    if (!process.env.APP_URL) {
      return json(res, 500, {
        ok: false,
        error: "Missing APP_URL."
      });
    }

    const {
      amount,
      title = "Game Challenge",
      description = "Rich Bizness game challenge entry",
      gameName = "Money Road Runner",
      challengerUserId = "",
      challengerUsername = "",
      opponentUserId = "",
      opponentUsername = "",
      scoreToBeat = "",
      currency = "usd",
      successPath = "/success.html",
      cancelPath = "/cancel.html",
      imageUrl = ""
    } = req.body || {};

    const unitAmount = toCents(amount);

    if (!unitAmount) {
      return json(res, 400, {
        ok: false,
        error: "Amount must be greater than 0."
      });
    }

    if (!challengerUserId) {
      return json(res, 400, {
        ok: false,
        error: "Missing challengerUserId."
      });
    }

    const { data: challengeRow, error: challengeInsertError } = await supabase
      .from("game_challenges")
      .insert({
        challenger_user_id: challengerUserId,
        challenger_username: challengerUsername || null,
        opponent_user_id: opponentUserId || null,
        opponent_username: opponentUsername || null,
        game_name: gameName,
        score_to_beat: scoreToBeat || null,
        entry_fee_cents: unitAmount,
        currency: String(currency || "usd").toLowerCase(),
        status: "pending_payment",
        created_at: new Date().toISOString()
      })
      .select()
      .single();

    if (challengeInsertError) {
      console.error("game_challenges insert error:", challengeInsertError);
      return json(res, 500, {
        ok: false,
        error: "Failed to create challenge record."
      });
    }

    const baseUrl = process.env.APP_URL.replace(/\/$/, "");
    const normalizedCurrency = String(currency || "usd").toLowerCase();

    const metadata = {
      flow: "game_challenge_checkout",
      challenge_id: String(challengeRow.id || ""),
      game_name: String(gameName || ""),
      challenger_user_id: String(challengerUserId || ""),
      challenger_username: String(challengerUsername || ""),
      opponent_user_id: String(opponentUserId || ""),
      opponent_username: String(opponentUsername || ""),
      score_to_beat: String(scoreToBeat || "")
    };

    const productData = {
      name: String(title || "Game Challenge"),
      description: String(description || "Rich Bizness game challenge entry"),
      metadata
    };

    if (imageUrl && /^https?:\/\//i.test(imageUrl)) {
      productData.images = [imageUrl];
    }

    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      payment_method_types: ["card"],
      success_url: `${baseUrl}${successPath}?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${baseUrl}${cancelPath}`,
      line_items: [
        {
          price_data: {
            currency: normalizedCurrency,
            unit_amount: unitAmount,
            product_data: productData
          },
          quantity: 1
        }
      ],
      metadata,
      allow_promotion_codes: true
    });

    const { error: updateError } = await supabase
      .from("game_challenges")
      .update({
        stripe_checkout_session_id: session.id,
        updated_at: new Date().toISOString()
      })
      .eq("id", challengeRow.id);

    if (updateError) {
      console.error("game_challenges update error:", updateError);
    }

    return json(res, 200, {
      ok: true,
      challengeId: challengeRow.id,
      sessionId: session.id,
      url: session.url
    });
  } catch (error) {
    console.error("create-game-challenge-checkout error:", error);

    return json(res, 500, {
      ok: false,
      error: error?.message || "Failed to create game challenge checkout session."
    });
  }
}
