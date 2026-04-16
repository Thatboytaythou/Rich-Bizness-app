import Stripe from "stripe";
import { createClient } from "@supabase/supabase-js";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: "2024-06-20",
});

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({
      ok: false,
      error: "Method not allowed. Use POST.",
    });
  }

  try {
    const {
      userId,
      email,
      country = "US",
      businessType = "individual",
      createOnboardingLink = true,
    } = req.body || {};

    if (!userId) {
      return res.status(400).json({
        ok: false,
        error: "Missing userId.",
      });
    }

    if (!process.env.STRIPE_SECRET_KEY) {
      return res.status(500).json({
        ok: false,
        error: "Missing STRIPE_SECRET_KEY.",
      });
    }

    if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
      return res.status(500).json({
        ok: false,
        error: "Missing Supabase server environment variables.",
      });
    }

    if (!process.env.APP_URL) {
      return res.status(500).json({
        ok: false,
        error: "Missing APP_URL.",
      });
    }

    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("*")
      .or(`id.eq.${userId},user_id.eq.${userId}`)
      .limit(1)
      .maybeSingle();

    if (profileError) throw profileError;
    if (!profile) {
      return res.status(404).json({
        ok: false,
        error: "Profile not found.",
      });
    }

    let accountId = profile.stripe_account_id;

    if (!accountId) {
      const account = await stripe.accounts.create({
        type: "express",
        country,
        email: email || profile.email || undefined,
        business_type: businessType,
        capabilities: {
          transfers: { requested: true },
          card_payments: { requested: true },
        },
        metadata: {
          rich_bizness_user_id: String(userId),
          username: String(profile.username || ""),
          display_name: String(profile.display_name || ""),
        },
      });

      accountId = account.id;

      const { error: updateError } = await supabase
        .from("profiles")
        .update({
          stripe_account_id: accountId,
          updated_at: new Date().toISOString(),
        })
        .or(`id.eq.${userId},user_id.eq.${userId}`);

      if (updateError) {
        return res.status(500).json({
          ok: false,
          error: "Created Stripe account but failed to save it to profile.",
          accountId,
        });
      }
    }

    let onboardingUrl = null;

    if (createOnboardingLink) {
      const baseUrl = process.env.APP_URL.replace(/\/$/, "");

      const accountLink = await stripe.accountLinks.create({
        account: accountId,
        refresh_url: `${baseUrl}/monetization.html?stripe=refresh`,
        return_url: `${baseUrl}/monetization.html?stripe=return`,
        type: "account_onboarding",
      });

      onboardingUrl = accountLink.url;
    }

    const freshAccount = await stripe.accounts.retrieve(accountId);

    return res.status(200).json({
      ok: true,
      accountId,
      onboardingUrl,
      charges_enabled: freshAccount.charges_enabled,
      payouts_enabled: freshAccount.payouts_enabled,
      details_submitted: freshAccount.details_submitted,
    });
  } catch (error) {
    console.error("create-connect-account advanced error:", error);

    return res.status(500).json({
      ok: false,
      error: error?.message || "Failed to create Stripe Connect flow.",
    });
  }
}
