import Stripe from "stripe";
import { createClient } from "@supabase/supabase-js";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function readRawBody(req) {
  const chunks = [];
  for await (const chunk of req) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }
  return Buffer.concat(chunks).toString("utf8");
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  let event;

  try {
    const rawBody = await readRawBody(req);
    const signature = req.headers["stripe-signature"];

    event = stripe.webhooks.constructEvent(
      rawBody,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET
    );
  } catch (error) {
    return res.status(400).send(`Webhook Error: ${error.message}`);
  }

  try {
    if (event.type === "checkout.session.completed") {
      const session = event.data.object;
      const purchaseId = session.metadata?.purchase_id || session.client_reference_id;

      if (purchaseId) {
        await supabase
          .from("purchases")
          .update({
            payment_status: "paid",
            paid_at: new Date().toISOString(),
            stripe_payment_intent_id: session.payment_intent
          })
          .eq("id", Number(purchaseId));
      }
    }

    if (event.type === "account.updated") {
      const account = event.data.object;

      await supabase
        .from("creator_accounts")
        .update({
          onboarding_complete: !!account.details_submitted,
          charges_enabled: !!account.charges_enabled,
          payouts_enabled: !!account.payouts_enabled,
          updated_at: new Date().toISOString()
        })
        .eq("stripe_account_id", account.id);
    }

    return res.status(200).json({ received: true });
  } catch (error) {
    return res.status(500).json({ error: error.message || "Webhook processing failed" });
  }
}
