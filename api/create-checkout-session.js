import Stripe from "stripe";
import { createClient } from "@supabase/supabase-js";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const {
      buyerUserId,
      sellerUserId,
      contentType,
      contentId,
      title,
      amountCents,
      currency = "usd"
    } = req.body || {};

    if (!buyerUserId || !sellerUserId || !contentType || !contentId || !title || !amountCents) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    const { data: creatorAccount, error: creatorError } = await supabase
      .from("creator_accounts")
      .select("stripe_account_id")
      .eq("user_id", sellerUserId)
      .maybeSingle();

    if (creatorError || !creatorAccount?.stripe_account_id) {
      return res.status(400).json({ error: "Seller has no payout account yet" });
    }

    const feeBps = Number(process.env.STRIPE_PLATFORM_FEE_BPS || 1000);
    const platformFeeCents = Math.round((Number(amountCents) * feeBps) / 10000);

    const { data: purchase, error: purchaseError } = await supabase
      .from("purchases")
      .insert([{
        buyer_user_id: buyerUserId,
        seller_user_id: sellerUserId,
        content_type: contentType,
        content_id: Number(contentId),
        title,
        amount_cents: Number(amountCents),
        currency,
        platform_fee_cents: platformFeeCents,
        payment_status: "pending"
      }])
      .select()
      .single();

    if (purchaseError) {
      return res.status(500).json({ error: purchaseError.message });
    }

    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      success_url: `${process.env.SITE_URL}/success.html?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.SITE_URL}/cancel.html`,
      client_reference_id: String(purchase.id),
      line_items: [
        {
          quantity: 1,
          price_data: {
            currency,
            unit_amount: Number(amountCents),
            product_data: { name: title }
          }
        }
      ],
      payment_intent_data: {
        application_fee_amount: platformFeeCents,
        transfer_data: {
          destination: creatorAccount.stripe_account_id
        },
        metadata: {
          purchase_id: String(purchase.id),
          buyer_user_id: buyerUserId,
          seller_user_id: sellerUserId,
          content_type: contentType,
          content_id: String(contentId)
        }
      },
      metadata: {
        purchase_id: String(purchase.id)
      }
    });

    await supabase
      .from("purchases")
      .update({ stripe_checkout_session_id: session.id })
      .eq("id", purchase.id);

    return res.status(200).json({ url: session.url });
  } catch (error) {
    return res.status(500).json({ error: error.message || "Failed to create checkout session" });
  }
}
