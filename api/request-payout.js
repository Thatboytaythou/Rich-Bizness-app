import Stripe from "stripe";
import { createClient } from "@supabase/supabase-js";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

function json(res, status, payload) {
  return res.status(status).json(payload);
}

function toCents(amount) {
  const n = Number(amount);
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

    const {
      userId,
      amount,
      currency = "usd",
      note = "",
      destinationAccountId = "",
      autoApprove
    } = req.body || {};

    if (!userId) {
      return json(res, 400, {
        ok: false,
        error: "Missing userId."
      });
    }

    const amountCents = toCents(amount);
    if (!amountCents) {
      return json(res, 400, {
        ok: false,
        error: "Amount must be greater than 0."
      });
    }

    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("*")
      .or(`id.eq.${userId},user_id.eq.${userId}`)
      .limit(1)
      .maybeSingle();

    if (profileError) {
      console.error("request-payout profile lookup error:", profileError);
      return json(res, 500, {
        ok: false,
        error: "Failed to load profile."
      });
    }

    if (!profile) {
      return json(res, 404, {
        ok: false,
        error: "Profile not found."
      });
    }

    const stripeAccountId =
      destinationAccountId ||
      profile.stripe_account_id ||
      "";

    if (!stripeAccountId) {
      return json(res, 400, {
        ok: false,
        error: "This user does not have a connected Stripe account yet."
      });
    }

    const normalizedCurrency = String(currency || "usd").toLowerCase();
    const shouldAutoApprove =
      autoApprove === true ||
      String(process.env.AUTO_APPROVE_PAYOUTS || "").toLowerCase() === "true";

    const payoutRequestPayload = {
      user_id: profile.user_id || profile.id,
      profile_id: profile.id,
      stripe_account_id: stripeAccountId,
      amount_cents: amountCents,
      currency: normalizedCurrency,
      status: shouldAutoApprove ? "processing" : "pending",
      note: note || "",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    const { data: payoutRequest, error: payoutInsertError } = await supabase
      .from("payout_requests")
      .insert(payoutRequestPayload)
      .select()
      .single();

    if (payoutInsertError) {
      console.error("request-payout insert error:", payoutInsertError);
      return json(res, 500, {
        ok: false,
        error: "Failed to create payout request record."
      });
    }

    if (!shouldAutoApprove) {
      return json(res, 200, {
        ok: true,
        mode: "manual_review",
        message: "Payout request created and waiting for approval.",
        payoutRequestId: payoutRequest.id,
        status: payoutRequest.status,
        amount_cents: payoutRequest.amount_cents,
        currency: payoutRequest.currency
      });
    }

    let transfer;
    try {
      transfer = await stripe.transfers.create({
        amount: amountCents,
        currency: normalizedCurrency,
        destination: stripeAccountId,
        description: `Rich Bizness payout for ${profile.display_name || profile.username || profile.email || profile.id}`,
        metadata: {
          rich_bizness_user_id: String(profile.user_id || profile.id),
          profile_id: String(profile.id || ""),
          payout_request_id: String(payoutRequest.id || ""),
          username: String(profile.username || "")
        }
      });
    } catch (stripeError) {
      console.error("request-payout stripe transfer error:", stripeError);

      await supabase
        .from("payout_requests")
        .update({
          status: "failed",
          failure_reason: stripeError?.message || "Stripe transfer failed.",
          updated_at: new Date().toISOString()
        })
        .eq("id", payoutRequest.id);

      return json(res, 500, {
        ok: false,
        error: stripeError?.message || "Stripe transfer failed.",
        payoutRequestId: payoutRequest.id
      });
    }

    const { error: payoutUpdateError } = await supabase
      .from("payout_requests")
      .update({
        status: "paid",
        stripe_transfer_id: transfer.id,
        paid_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq("id", payoutRequest.id);

    if (payoutUpdateError) {
      console.error("request-payout update after transfer error:", payoutUpdateError);
      return json(res, 500, {
        ok: false,
        error: "Transfer succeeded but failed to update payout request record.",
        payoutRequestId: payoutRequest.id,
        transferId: transfer.id
      });
    }

    return json(res, 200, {
      ok: true,
      mode: "auto_approved",
      message: "Payout sent to connected account.",
      payoutRequestId: payoutRequest.id,
      transferId: transfer.id,
      amount_cents: amountCents,
      currency: normalizedCurrency,
      destination: stripeAccountId
    });
  } catch (error) {
    console.error("request-payout fatal error:", error);
    return json(res, 500, {
      ok: false,
      error: error?.message || "Failed to request payout."
    });
  }
}
