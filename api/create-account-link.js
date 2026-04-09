import Stripe from "stripe";
import { createClient } from "@supabase/supabase-js";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

function getBaseUrl(req) {
  if (process.env.APP_URL) {
    return process.env.APP_URL.replace(/\/$/, "");
  }

  const proto = req.headers["x-forwarded-proto"] || "https";
  const host = req.headers.host;
  return `${proto}://${host}`;
}

async function syncStripeAccountToSupabase(stripeAccountId) {
  const account = await stripe.accounts.retrieve(stripeAccountId);

  const upsertRes = await supabase
    .from("artist_payout_accounts")
    .update({
      onboarding_complete: Boolean(account.details_submitted),
      details_submitted: Boolean(account.details_submitted),
      charges_enabled: Boolean(account.charges_enabled),
      payouts_enabled: Boolean(account.payouts_enabled),
      country: account.country || null,
      default_currency: account.default_currency || "usd",
      updated_at: new Date().toISOString(),
    })
    .eq("stripe_account_id", stripeAccountId)
    .select()
    .maybeSingle();

  if (upsertRes.error) {
    throw upsertRes.error;
  }

  return {
    account,
    payoutAccount: upsertRes.data || null,
  };
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

    const baseUrl = getBaseUrl(req);

    const payoutAccountRes = await supabase
      .from("artist_payout_accounts")
      .select("*")
      .eq("user_id", userId)
      .maybeSingle();

    if (payoutAccountRes.error) {
      throw payoutAccountRes.error;
    }

    let payoutAccount = payoutAccountRes.data || null;
    let stripeAccountId = payoutAccount?.stripe_account_id || null;

    if (!stripeAccountId) {
      const safeEmail = String(email || "").trim().toLowerCase();

      const newAccount = await stripe.accounts.create({
        type: "express",
        email: safeEmail || undefined,
        business_type: "individual",
        metadata: {
          app_user_id: String(userId),
          app_type: "artist_payout_account",
        },
      });

      stripeAccountId = newAccount.id;

      const insertRes = await supabase
        .from("artist_payout_accounts")
        .upsert(
          {
            user_id: userId,
            stripe_account_id: stripeAccountId,
            onboarding_complete: Boolean(newAccount.details_submitted),
            details_submitted: Boolean(newAccount.details_submitted),
            charges_enabled: Boolean(newAccount.charges_enabled),
            payouts_enabled: Boolean(newAccount.payouts_enabled),
            country: newAccount.country || null,
            default_currency: newAccount.default_currency || "usd",
            updated_at: new Date().toISOString(),
          },
          { onConflict: "user_id" }
        )
        .select()
        .single();

      if (insertRes.error) {
        throw insertRes.error;
      }

      payoutAccount = insertRes.data;
    } else {
      const synced = await syncStripeAccountToSupabase(stripeAccountId);
      payoutAccount = synced.payoutAccount || payoutAccount;
    }

    const refreshUrl =
      `${baseUrl}/api/create-account-link?refresh=1&userId=${encodeURIComponent(userId)}`;
    const returnUrl =
      `${baseUrl}/payouts.html?connect_return=1`;

    const accountLink = await stripe.accountLinks.create({
      account: stripeAccountId,
      refresh_url: refreshUrl,
      return_url: returnUrl,
      type: "account_onboarding",
    });

    return res.status(200).json({
      ok: true,
      url: accountLink.url,
      expires_at: accountLink.expires_at,
      stripe_account_id: stripeAccountId,
      payout_account: payoutAccount,
    });
  } catch (error) {
    console.error("create-account-link error", error);
    return res.status(500).json({
      error: error?.message || "Failed to create account link.",
    });
  }
}
