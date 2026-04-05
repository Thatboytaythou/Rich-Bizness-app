import Stripe from "stripe";
import { createClient } from "@supabase/supabase-js";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { userId, email } = req.body || {};

    if (!userId || !email) {
      return res.status(400).json({ error: "Missing userId or email" });
    }

    const account = await stripe.accounts.create({
      email,
      controller: {
        losses: { payments: "application" },
        fees: { payer: "application" },
        stripe_dashboard: { type: "express" }
      }
    });

    const { error } = await supabase
      .from("creator_accounts")
      .upsert({
        user_id: userId,
        stripe_account_id: account.id,
        updated_at: new Date().toISOString()
      }, { onConflict: "user_id" });

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    return res.status(200).json({ stripeAccountId: account.id });
  } catch (error) {
    return res.status(500).json({ error: error.message || "Failed to create creator account" });
  }
}
