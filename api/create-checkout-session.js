import Stripe from "stripe";
import { createClient } from "@supabase/supabase-js";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

function isPlainObject(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function normalizeType(type) {
  return String(type || "").trim().toLowerCase();
}

function buildCheckoutConfig({ type, amount, title, metadata, appUrl }) {
  const safeAmount = Math.max(50, Math.floor(Number(amount || 0)));
  const safeTitle = String(title || "Rich Bizness Payment").trim() || "Rich Bizness Payment";

  const base = {
    payment_method_types: ["card"],
    mode: "payment",
    line_items: [
      {
        price_data: {
          currency: "usd",
          product_data: {
            name: safeTitle
          },
          unit_amount: safeAmount
        },
        quantity: 1
      }
    ],
    success_url: `${appUrl}/monetization-success.html?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${appUrl}/monetization-cancel.html`,
    metadata: {
      type,
      ...Object.fromEntries(
        Object.entries(metadata || {}).map(([k, v]) => [k, String(v)])
      )
    }
  };

  return base;
}

export default async function handler(req, res) {
  try {
    if (req.method !== "POST") {
      return res.status(405).json({ error: "Method not allowed" });
    }

    const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
    const appUrl = process.env.APP_URL;
    const supabaseUrl = process.env.SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!stripeSecretKey) {
      return res.status(500).json({ error: "Missing STRIPE_SECRET_KEY" });
    }

    if (!appUrl) {
      return res.status(500).json({ error: "Missing APP_URL" });
    }

    if (!supabaseUrl || !serviceRoleKey) {
      return res.status(500).json({
        error: "Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY"
      });
    }

    const authHeader = req.headers.authorization || "";
    const accessToken = authHeader.startsWith("Bearer ")
      ? authHeader.slice(7).trim()
      : null;

    if (!accessToken) {
      return res.status(401).json({ error: "Missing auth token" });
    }

    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    });

    const {
      data: { user },
      error: userError
    } = await supabaseAdmin.auth.getUser(accessToken);

    if (userError || !user) {
      return res.status(401).json({ error: "Invalid user session" });
    }

    const body = req.body || {};
    const type = normalizeType(body.type);
    const amount = Number(body.amount);
    const title = String(body.title || "").trim();
    const metadata = isPlainObject(body.metadata) ? body.metadata : {};

    if (!type) {
      return res.status(400).json({ error: "Missing payment type" });
    }

    if (!Number.isFinite(amount) || amount < 50) {
      return res.status(400).json({
        error: "Invalid amount. Amount must be in cents and at least 50."
      });
    }

    if (!title) {
      return res.status(400).json({ error: "Missing title" });
    }

    const allowedTypes = new Set([
      "tournament_entry",
      "vip_live",
      "music_unlock",
      "general_payment"
    ]);

    if (!allowedTypes.has(type)) {
      return res.status(400).json({ error: "Unsupported payment type" });
    }

    const checkoutConfig = buildCheckoutConfig({
      type,
      amount,
      title,
      metadata,
      appUrl
    });

    checkoutConfig.customer_email = user.email || undefined;

    const session = await stripe.checkout.sessions.create(checkoutConfig);

    const paymentRow = {
      user_id: user.id,
      type,
      status: "pending",
      amount: Math.floor(amount),
      currency: "usd",
      title,
      stripe_session_id: session.id,
      stripe_payment_intent_id:
        typeof session.payment_intent === "string"
          ? session.payment_intent
          : null,
      metadata: {
        ...metadata,
        checkout_url: session.url,
        stripe_mode: session.mode
      }
    };

    const { error: paymentInsertError } = await supabaseAdmin
      .from("payments")
      .insert([paymentRow]);

    if (paymentInsertError) {
      console.error("create-checkout-session payment insert error:", paymentInsertError);
      return res.status(500).json({
        error: paymentInsertError.message || "Failed to save payment session"
      });
    }

    return res.status(200).json({
      ok: true,
      url: session.url,
      session_id: session.id
    });
  } catch (error) {
    console.error("create-checkout-session error:", error);
    return res.status(500).json({
      error: error?.message || "Checkout session creation failed"
    });
  }
}
