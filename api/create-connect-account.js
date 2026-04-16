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

    const {
      userId,
      email,
      country = "US",
      businessType = "individual",
      metadata = {},
    } = req.body || {};

    if (!userId) {
      return res.status(400).json({
        ok: false,
        error: "Missing userId.",
      });
    }

    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("*")
      .or(`id.eq.${userId},user_id.eq.${userId}`)
      .limit(1)
      .maybeSingle();

    if (profileError) {
      console.error("profile lookup error:", profileError);
      return res.status(500).json({
        ok: false,
        error: "Failed to load profile.",
      });
    }

    if (!profile) {
      return res.status(404).json({
        ok: false,
        error: "Profile not found.",
      });
    }

    if (profile.stripe_account_id) {
      const existingAccount = await stripe.accounts.retrieve(profile.stripe_account_id);

      return res.status(200).json({
        ok: true,
        reused: true,
        accountId: existingAccount.id,
        charges_enabled: existingAccount.charges_enabled,
        payouts_enabled: existingAccount.payouts_enabled,
        details_submitted: existingAccount.details_submitted,
      });
    }

    const accountEmail = email || profile.email || null;

    const account = await stripe.accounts.create({
      type: "express",
      country,
      email: accountEmail,
      business_type: businessType,
      capabilities: {
        transfers: { requested: true },
        card_payments: { requested: true },
      },
      metadata: {
        rich_bizness_user_id: String(userId),
        profile_id: String(profile.id || ""),
        username: String(profile.username || ""),
        display_name: String(profile.display_name || ""),
        ...Object.fromEntries(
          Object.entries(metadata || {}).map(([key, value]) => [key, String(value)])
        ),
      },
    });

    const { error: updateError } = await supabase
      .from("profiles")
      .update({
        stripe_account_id: account.id,
        updated_at: new Date().toISOString(),
      })
      .or(`id.eq.${userId},user_id.eq.${userId}`);

    if (updateError) {
      console.error("profile stripe_account_id update error:", updateError);

      return res.status(500).json({
        ok: false,
        error: "Stripe account created but failed to save it to profile.",
        accountId: account.id,
      });
    }

    return res.status(200).json({
      ok: true,
      reused: false,
      accountId: account.id,
      charges_enabled: account.charges_enabled,
      payouts_enabled: account.payouts_enabled,
      details_submitted: account.details_submitted,
    });
  } catch (error) {
    console.error("create-connect-account error:", error);

    return res.status(500).json({
      ok: false,
      error: error?.message || "Failed to create Stripe Connect account.",
    });
  }
}
