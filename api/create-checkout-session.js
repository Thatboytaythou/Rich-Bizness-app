import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const {
      mode,
      title,
      amountCents,
      metadata = {}
    } = req.body || {};

    if (!mode || !title || !amountCents) {
      return res.status(400).json({ error: "Missing required fields." });
    }

    const baseUrl = process.env.APP_URL;
    if (!baseUrl) {
      return res.status(500).json({ error: "APP_URL is missing." });
    }

    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      payment_method_types: ["card"],
      line_items: [
        {
          price_data: {
            currency: "usd",
            product_data: {
              name: title
            },
            unit_amount: Number(amountCents)
          },
          quantity: 1
        }
      ],
      success_url: `${baseUrl}/monetization-success.html?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${baseUrl}/monetization-cancel.html`,
      metadata: {
        mode,
        ...metadata
      }
    });

    return res.status(200).json({ url: session.url, sessionId: session.id });
  } catch (error) {
    console.error("create-checkout-session error", error);
    return res.status(500).json({ error: error.message || "Server error" });
  }
}
