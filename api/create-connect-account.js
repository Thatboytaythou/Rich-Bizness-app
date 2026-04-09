import Stripe from "stripe";
import { createClient } from "@supabase/supabase-js";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

function getBaseUrl(req) {
  if (process.env.APP_URL) return process.env.APP_URL.replace(/\/$/, "");
  const proto = req.headers["x-forwarded-proto"] || "https";
  const host = req.headers.host;
  return `${proto}://${host}`;
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { userId, email } = req.body || {};

    if (!process.env.STRIPE_SECRET_KEY) {
      return res.status(500).json({ error: "Missing STRIPE_SECRET_KEY." });
    }

    if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
      return res.status(500).json({ error: "Missing Supabase server env vars." });
    }

    if (!userId) {
      return res.status(400).json({ error: "Missing userId." });
    }

    const safeEmail = String(email || "").trim().toLowerCase();

    // 1) Check whether we already stored a payout account for this user
    const existingRes = await supabase
      .from("artist_payout_accounts")
      .select("*")
      .eq("user_id", userId)
      .maybeSingle();

    if (existingRes.error) throw existingRes.error;

    if (existingRes.data?.stripe_account_id) {
      return res.status(200).json({
        ok: true,
        created: false,
        stripe_account_id: existingRes.data.stripe_account_id,
        payout_account: existingRes.data,
      });
    }

    // 2) Create the connected account in Stripe
    // Using Connect account creation with controller fields for a platform-managed account.
    const account = await stripe.accounts.create({
      type: "express",
      email: safeEmail || undefined,
      business_type: "individual",
      metadata: {
        app_user_id: String(userId),
        app_type: "artist_payout_account",
      },
    });

    // 3) Save it in Supabase
    const now = new Date().toISOString();

    const upsertRes = await supabase
      .from("artist_payout_accounts")
      .upsert(
        {
          user_id: userId,
          stripe_account_id: account.id,
          onboarding_complete: false,
          details_submitted: Boolean(account.details_submitted),
          charges_enabled: Boolean(account.charges_enabled),
          payouts_enabled: Boolean(account.payouts_enabled),
          country: account.country || null,
          default_currency: account.default_currency || "usd",
          updated_at: now,
        },
        { onConflict: "user_id" }
      )
      .select()
      .single();

    if (upsertRes.error) throw upsertRes.error;

    return res.status(200).json({
      ok: true,
      created: true,
      stripe_account_id: account.id,
      payout_account: upsertRes.data,
      next_step: `${getBaseUrl(req)}/api/create-account-link`,
    });
  } catch (error) {
    console.error("create-connect-account error", error);
    return res.status(500).json({
      error: error?.message || "Failed to create connect account.",
    });
  }
}
