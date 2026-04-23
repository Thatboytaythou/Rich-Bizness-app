import Stripe from "stripe";
import { createClient } from "@supabase/supabase-js";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: "2024-06-20"
});

const SUPABASE_URL =
  process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;

const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

const AUTO_APPROVE_PAYOUTS =
  String(process.env.AUTO_APPROVE_PAYOUTS || "false").toLowerCase() === "true";

const MIN_PAYOUT_CENTS = 1000;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: {
    persistSession: false,
    autoRefreshToken: false
  }
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

async function getUser(req) {
  const token = getBearerToken(req);

  if (!token) {
    return { user: null, error: "Missing auth token" };
  }

  const { data, error } = await supabase.auth.getUser(token);

  if (error || !data?.user) {
    return { user: null, error: "Invalid auth token" };
  }

  return { user: data.user, error: null };
}

async function getBalance(userId) {
  const { data, error } = await supabase
    .from("creator_available_balances")
    .select("artist_user_id, earned_cents, paid_out_cents, available_cents")
    .eq("artist_user_id", userId)
    .maybeSingle();

  if (error) {
    throw new Error(`Balance lookup failed: ${error.message}`);
  }

  return (
    data || {
      artist_user_id: userId,
      earned_cents: 0,
      paid_out_cents: 0,
      available_cents: 0
    }
  );
}

async function getStripeAccount(userId) {
  const { data, error } = await supabase
    .from("artist_payout_accounts")
    .select(
      "id, user_id, stripe_account_id, onboarding_complete, details_submitted, charges_enabled, payouts_enabled"
    )
    .eq("user_id", userId)
    .maybeSingle();

  if (error) {
    throw new Error(`Stripe account lookup failed: ${error.message}`);
  }

  return data || null;
}

async function createPayoutRequest({
  userId,
  amountCents,
  currency,
  status,
  stripeDestinationAccountId,
  note
}) {
  const payload = {
    artist_user_id: userId,
    amount_cents: amountCents,
    currency,
    status,
    stripe_destination_account_id: stripeDestinationAccountId || null,
    note: note || null,
    created_at: new Date().toISOString(),
    processed_at: status === "paid" ? new Date().toISOString() : null
  };

  const { data, error } = await supabase
    .from("payout_requests")
    .insert(payload)
    .select("*")
    .single();

  if (error) {
    throw new Error(`Payout request save failed: ${error.message}`);
  }

  return data;
}

async function markPayoutPaid(payoutId, stripeTransferId) {
  const { data, error } = await supabase
    .from("payout_requests")
    .update({
      status: "paid",
      stripe_transfer_id: stripeTransferId,
      processed_at: new Date().toISOString()
    })
    .eq("id", payoutId)
    .select("*")
    .single();

  if (error) {
    throw new Error(`Payout update failed: ${error.message}`);
  }

  return data;
}

export default async function handler(req, res) {
  if (req.method === "OPTIONS") {
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
    return res.status(200).end();
  }

  res.setHeader("Access-Control-Allow-Origin", "*");

  if (req.method !== "POST") {
    return send(res, 405, { error: "Method not allowed" });
  }

  try {
    if (!process.env.STRIPE_SECRET_KEY) {
      return send(res, 500, { error: "Missing STRIPE_SECRET_KEY" });
    }

    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      return send(res, 500, {
        error: "Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY"
      });
    }

    const { user, error: authError } = await getUser(req);

    if (authError || !user) {
      return send(res, 401, { error: authError || "Unauthorized" });
    }

    const requestedAmountCents = Number(req.body?.amount_cents || 0);
    const currency = String(req.body?.currency || "usd").toLowerCase();

    const balance = await getBalance(user.id);
    const availableCents = Number(balance.available_cents || 0);

    const amountCents =
      requestedAmountCents > 0 ? requestedAmountCents : availableCents;

    if (amountCents < MIN_PAYOUT_CENTS) {
      return send(res, 400, {
        error: "Minimum payout is $10.00",
        available_cents: availableCents
      });
    }

    if (amountCents > availableCents) {
      return send(res, 400, {
        error: "Requested payout is higher than available balance",
        available_cents: availableCents
      });
    }

    const payoutAccount = await getStripeAccount(user.id);

    if (!payoutAccount?.stripe_account_id) {
      return send(res, 400, {
        error: "No Stripe payout account connected"
      });
    }

    if (!payoutAccount.payouts_enabled && AUTO_APPROVE_PAYOUTS) {
      return send(res, 400, {
        error: "Stripe payouts are not enabled for this creator yet"
      });
    }

    const payoutRequest = await createPayoutRequest({
      userId: user.id,
      amountCents,
      currency,
      status: AUTO_APPROVE_PAYOUTS ? "processing" : "pending",
      stripeDestinationAccountId: payoutAccount.stripe_account_id,
      note: req.body?.note || "Creator payout request"
    });

    if (!AUTO_APPROVE_PAYOUTS) {
      return send(res, 200, {
        ok: true,
        status: "pending",
        payout: payoutRequest,
        available_cents: availableCents
      });
    }

    const transfer = await stripe.transfers.create({
      amount: amountCents,
      currency,
      destination: payoutAccount.stripe_account_id,
      metadata: {
        payout_request_id: String(payoutRequest.id),
        artist_user_id: user.id,
        source: "rich_bizness_request_payout"
      }
    });

    const paidPayout = await markPayoutPaid(payoutRequest.id, transfer.id);

    return send(res, 200, {
      ok: true,
      status: "paid",
      payout: paidPayout,
      stripe_transfer_id: transfer.id,
      available_cents: availableCents
    });
  } catch (error) {
    console.error("request-payout error:", error);

    return send(res, 500, {
      error: error?.message || "Payout request failed"
    });
  }
}
