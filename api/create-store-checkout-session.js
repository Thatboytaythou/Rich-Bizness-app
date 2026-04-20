import Stripe from "stripe";
import { createClient } from "@supabase/supabase-js";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export default async function handler(req, res) {
  try {
    if (req.method !== "POST") {
      return res.status(405).json({ error: "Method not allowed" });
    }

    const { productId, quantity } = req.body;

    if (!productId) {
      return res.status(400).json({ error: "Missing productId" });
    }

    // 🔥 Get product from DB
    const { data: product, error } = await supabase
      .from("products")
      .select("*")
      .eq("id", productId)
      .single();

    if (error || !product) {
      return res.status(404).json({ error: "Product not found" });
    }

    // 🔥 Create Stripe Checkout Session
    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      payment_method_types: ["card"],

      line_items: [
        {
          price_data: {
            currency: product.currency || "usd",
            product_data: {
              name: product.title || "Product",
              description: product.description || ""
            },
            unit_amount: product.price_cents
          },
          quantity: quantity || 1
        }
      ],

      success_url: `${process.env.APP_URL}/store.html?checkout=success`,
      cancel_url: `${process.env.APP_URL}/store.html?checkout=cancel`
    });

    // ✅ THIS IS WHAT YOUR FRONTEND NEEDS
    return res.status(200).json({
      url: session.url
    });

  } catch (err) {
    console.error("Stripe Checkout Error:", err);
    return res.status(500).json({
      error: "Checkout failed"
    });
  }
}
