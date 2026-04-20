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

    if (productId === undefined || productId === null || productId === "") {
      return res.status(400).json({ error: "Missing productId" });
    }

    const safeProductId = Number(productId);
    const safeQuantity = Math.max(1, Math.min(10, Number(quantity) || 1));

    if (!Number.isFinite(safeProductId)) {
      return res.status(400).json({ error: "Invalid productId" });
    }

    const stripe = new Stripe(stripeSecretKey);
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    const { data: product, error: productError } = await supabase
      .from("products")
      .select("*")
      .eq("id", safeProductId)
      .eq("active", true)
      .single();

    if (productError || !product) {
      return res.status(404).json({
        error: productError?.message || "Product not found"
      });
    }

    const title = product.title || product.description || "Rich Bizness Product";
    const description = product.description || "";
    const currency = (product.currency || "usd").toLowerCase();
    const unitAmount = Number(product.price_cents || 0);

    if (!unitAmount || unitAmount < 50) {
      return res.status(400).json({
        error: "Product price_cents is invalid. Minimum is 50."
      });
    }

    const baseUrl = getBaseUrl(req);

    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      payment_method_types: ["card"],
      success_url: `${baseUrl}/store.html?checkout=success`,
      cancel_url: `${baseUrl}/store.html?checkout=cancel`,
      line_items: [
        {
          quantity: safeQuantity,
          price_data: {
            currency,
            unit_amount: unitAmount,
            product_data: {
              name: title,
              description,
              images: product.image_url ? [`${baseUrl}${product.image_url}`] : []
            }
          }
        }
      ],
      metadata: {
        source: "store",
        product_id: String(product.id),
        product_title: String(title),
        seller_user_id: String(product.seller_user_id || ""),
        kind: String(product.kind || "store")
      }
    });

    if (!session?.url) {
      return res.status(500).json({ error: "Stripe did not return a checkout url" });
    }

    return res.status(200).json({
      ok: true,
      url: session.url
    });
  } catch (error) {
    console.error("[create-store-checkout-session] error:", error);
    return res.status(500).json({
      error: error.message || "Failed to create checkout session"
    });
  }
}
