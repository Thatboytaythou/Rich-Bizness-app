import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { stripeAccountId } = req.body || {};

    if (!stripeAccountId) {
      return res.status(400).json({ error: "Missing stripeAccountId" });
    }

    const accountLink = await stripe.accountLinks.create({
      account: stripeAccountId,
      refresh_url: `${process.env.SITE_URL}/profile.html`,
      return_url: `${process.env.SITE_URL}/profile.html`,
      type: "account_onboarding"
    });

    return res.status(200).json({ url: accountLink.url });
  } catch (error) {
    return res.status(500).json({ error: error.message || "Failed to create account link" });
  }
}
