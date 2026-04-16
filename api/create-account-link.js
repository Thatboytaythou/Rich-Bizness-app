import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: "2024-06-20",
});

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({
      ok: false,
      error: "Method not allowed. Use POST.",
    });
  }

  try {
    const {
      accountId,
      refreshUrl,
      returnUrl,
      type = "account_onboarding",
    } = req.body || {};

    if (!process.env.STRIPE_SECRET_KEY) {
      return res.status(500).json({
        ok: false,
        error: "Missing STRIPE_SECRET_KEY in environment variables.",
      });
    }

    if (!process.env.APP_URL && (!refreshUrl || !returnUrl)) {
      return res.status(500).json({
        ok: false,
        error: "Missing APP_URL or explicit refreshUrl/returnUrl.",
      });
    }

    if (!accountId) {
      return res.status(400).json({
        ok: false,
        error: "Missing accountId.",
      });
    }

    const baseUrl =
      process.env.APP_URL?.replace(/\/$/, "") || "";

    const safeRefreshUrl =
      refreshUrl ||
      `${baseUrl}/monetization.html?stripe=refresh`;

    const safeReturnUrl =
      returnUrl ||
      `${baseUrl}/monetization.html?stripe=return`;

    const accountLink = await stripe.accountLinks.create({
      account: accountId,
      refresh_url: safeRefreshUrl,
      return_url: safeReturnUrl,
      type,
    });

    return res.status(200).json({
      ok: true,
      url: accountLink.url,
      expires_at: accountLink.expires_at,
    });
  } catch (error) {
    console.error("create-account-link error:", error);

    return res.status(500).json({
      ok: false,
      error: error?.message || "Failed to create Stripe account link.",
    });
  }
}
