import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

function toCents(value) {
  const num = Number(value || 0);
  return Math.round(num);
}

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
    const {
      mode,
      title,
      amountCents,
      description = "",
      artistUserId = "",
      successUrl,
      cancelUrl,
      metadata = {},
      customerEmail = "",
      userId = "",
    } = req.body || {};

    if (!process.env.STRIPE_SECRET_KEY) {
      return res.status(500).json({ error: "Missing STRIPE_SECRET_KEY." });
    }

    if (!mode) {
      return res.status(400).json({ error: "Missing mode." });
    }

    const supportedModes = [
      "direct_support",
      "premium_track_unlock",
      "fan_subscription",
    ];

    if (!supportedModes.includes(mode)) {
      return res.status(400).json({ error: `Unsupported mode: ${mode}` });
    }

    const cents = toCents(amountCents);
    if (!cents || cents < 50) {
      return res.status(400).json({ error: "amountCents must be at least 50." });
    }

    const baseUrl = getBaseUrl(req);
    const finalSuccessUrl =
      successUrl || `${baseUrl}/monetization-success.html?session_id={CHECKOUT_SESSION_ID}`;
    const finalCancelUrl =
      cancelUrl || `${baseUrl}/monetization-cancel.html`;

    const safeTitle = String(title || "Rich Bizness Checkout").slice(0, 200);
    const safeDescription = String(description || "").slice(0, 500);

    const commonMetadata = {
      app_mode: mode,
      artist_user_id: String(artistUserId || ""),
      user_id: String(userId || ""),
      ...Object.fromEntries(
        Object.entries(metadata || {}).map(([k, v]) => [k, String(v ?? "")])
      ),
    };

    let sessionMode = "payment";
    const lineItem = {
      price_data: {
        currency: "usd",
        product_data: {
          name: safeTitle,
          description: safeDescription || undefined,
        },
        unit_amount: cents,
      },
      quantity: 1,
    };

    if (mode === "fan_subscription") {
      sessionMode = "subscription";
      lineItem.price_data = {
        currency: "usd",
        product_data: {
          name: safeTitle || "Artist Supporter Plan",
          description: safeDescription || "Monthly artist support",
        },
        recurring: {
          interval: "month",
        },
        unit_amount: cents,
      };
    }

    const sessionPayload = {
      mode: sessionMode,
      success_url: finalSuccessUrl,
      cancel_url: finalCancelUrl,
      line_items: [lineItem],
      metadata: commonMetadata,
      billing_address_collection: "auto",
      allow_promotion_codes: true,
      client_reference_id: String(userId || artistUserId || ""),
    };

    if (customerEmail) {
      sessionPayload.customer_email = customerEmail;
    }

    const session = await stripe.checkout.sessions.create(sessionPayload);

    return res.status(200).json({
      id: session.id,
      url: session.url,
    });
  } catch (error) {
    console.error("create-checkout-session error", error);
    return res.status(500).json({
      error: error?.message || "Failed to create checkout session.",
    });
  }
}
