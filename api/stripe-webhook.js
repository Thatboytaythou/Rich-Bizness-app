import Stripe from "stripe";
import { createClient } from "@supabase/supabase-js";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export const config = {
  api: {
    bodyParser: false
  }
};

async function getRawBody(req) {
  const chunks = [];
  for await (const chunk of req) {
    chunks.push(typeof chunk === "string" ? Buffer.from(chunk) : chunk);
  }
  return Buffer.concat(chunks);
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).send("Method not allowed");
  }

  try {
    const sig = req.headers["stripe-signature"];
    const rawBody = await getRawBody(req);

    const event = stripe.webhooks.constructEvent(
      rawBody,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET
    );

    if (event.type === "checkout.session.completed") {
      const session = event.data.object;
      const metadata = session.metadata || {};
      const mode = metadata.mode;

      if (mode === "tip") {
        await supabase.from("tips").update({
          status: "paid",
          stripe_session_id: session.id
        }).eq("id", metadata.tip_id);

        await supabase.from("creator_earnings").insert({
          creator_id: metadata.creator_id,
          source_type: "tip",
          source_id: Number(metadata.tip_id),
          gross_cents: Number(session.amount_total || 0),
          status: "paid"
        });
      }

      if (mode === "premium_unlock") {
        await supabase.from("purchases").update({
          status: "paid",
          stripe_session_id: session.id
        }).eq("id", metadata.purchase_id);

        await supabase.from("creator_earnings").insert({
          creator_id: metadata.creator_id,
          source_type: "premium_unlock",
          source_id: Number(metadata.purchase_id),
          gross_cents: Number(session.amount_total || 0),
          status: "paid"
        });
      }
    }

    return res.status(200).json({ received: true });
  } catch (error) {
    console.error("stripe webhook error", error);
    return res.status(400).send(`Webhook Error: ${error.message}`);
  }
}
