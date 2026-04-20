import Stripe from "stripe";
import { createClient } from "@supabase/supabase-js";

function getBaseUrl(req) {
  const envUrl =
    process.env.APP_URL ||
    process.env.PUBLIC_SITE_URL ||
    process.env.NEXT_PUBLIC_APP_URL;

  if (envUrl) return envUrl.replace(/\/$/, "");

  const proto =
    req.headers["x-forwarded-proto"] ||
    (process.env.NODE_ENV === "development" ? "http" : "https");

  const host = req.headers["x-forwarded-host"] || req.headers.host;
  return `${proto}://${host}`;
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
    const supabaseUrl =
      process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!stripeSecretKey) {
      return res.status(500).json({ error: "Missing STRIPE_SECRET_KEY" });
    }

    if (!supabaseUrl || !serviceRoleKey) {
      return res.status(500).json({
        error: "Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY"
      });
    }

    const { productId, quantity = 1 } = req.body || {};

    if (!productId) {
      return res.status(400).json({ error: "Missing productId" });
    }

    const safeQuantity = Math.max(1, Math.min(10, Number(quantity) || 1));

    const stripe = new Stripe(stripeSecretKey, {
      apiVersion: "2025-02-24.acacia"
    });

    const supabase = createClient(supabaseUrl, serviceRoleKey);

    const { data: product, error: productError } = await supabase
      .from("products")
      .select("*")
      .eq("id", productId)
      .eq("active", true)
      .single();

    if (productError || !product) {
      return res.status(404).json({ error: "Product not found" });
    }

    const unitAmount = Math.round(Number(product.price || 0) * 100);

    if (!unitAmount || unitAmount < 50) {
      return res.status(400).json({
        error: "Product price is invalid. Minimum is $0.50"
      });
    }

    const baseUrl = getBaseUrl(req);
    const successUrl = `${baseUrl}/store.html?checkout=success`;
    const cancelUrl = `${baseUrl}/store.html?checkout=cancel`;

    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      success_url: successUrl,
      cancel_url: cancelUrl,
      payment_method_types: ["card"],
      line_items: [
        {
          quantity: safeQuantity,
          price_data: {
            currency: "usd",
            unit_amount: unitAmount,
            product_data: {
              name: product.name || "Rich Bizness Product",
              description: product.description || "Store product",
              images: product.image_url ? [product.image_url] : []
            }
          }
        }
      ],
      metadata: {
        source: "store",
        product_id: String(product.id),
        product_name: String(product.name || ""),
        creator_id: String(product.creator_id || "")
      }
    });

    return res.status(200).json({
      url: session.url
    });
  } catch (error) {
    console.error("[create-store-checkout-session] error:", error);
    return res.status(500).json({
      error: error.message || "Failed to create checkout session"
    });
  }
}
