import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';

function getStripe() {
  const secretKey = process.env.STRIPE_SECRET_KEY;
  if (!secretKey) {
    throw new Error('Missing STRIPE_SECRET_KEY');
  }

  return new Stripe(secretKey, {
    apiVersion: '2024-06-20'
  });
}

function getSupabaseServer() {
  const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error('Missing SUPABASE_URL/NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  }

  return createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });
}

async function markLivePurchasePaid({ supabase, checkoutSession }) {
  const livePurchaseId =
    checkoutSession?.metadata?.live_purchase_id ||
    checkoutSession?.client_reference_id ||
    null;

  if (!livePurchaseId) {
    return;
  }

  const paymentIntentId =
    typeof checkoutSession.payment_intent === 'string'
      ? checkoutSession.payment_intent
      : checkoutSession.payment_intent?.id || null;

  const amountTotal =
    typeof checkoutSession.amount_total === 'number'
      ? checkoutSession.amount_total
      : null;

  const currency = checkoutSession.currency || 'usd';

  const purchasedAt = new Date().toISOString();

  const { data: purchase, error: purchaseLookupError } = await supabase
    .from('live_stream_purchases')
    .select('*')
    .eq('id', livePurchaseId)
    .single();

  if (purchaseLookupError || !purchase) {
    throw new Error(
      purchaseLookupError?.message || 'Live purchase record not found'
    );
  }

  const updatePayload = {
    status: 'paid',
    purchased_at: purchasedAt,
    stripe_checkout_session_id: checkoutSession.id,
    stripe_payment_intent_id: paymentIntentId,
    amount_cents: amountTotal ?? purchase.amount_cents,
    currency: currency || purchase.currency || 'usd',
    metadata: {
      ...(purchase.metadata || {}),
      checkout_completed: true,
      stripe_customer: checkoutSession.customer || null,
      stripe_payment_status: checkoutSession.payment_status || null
    }
  };

  const { error: updateError } = await supabase
    .from('live_stream_purchases')
    .update(updatePayload)
    .eq('id', livePurchaseId);

  if (updateError) {
    throw new Error(updateError.message);
  }
}

async function markLivePurchaseFailed({ supabase, checkoutSession, status = 'failed' }) {
  const livePurchaseId =
    checkoutSession?.metadata?.live_purchase_id ||
    checkoutSession?.client_reference_id ||
    null;

  if (!livePurchaseId) return;

  const { data: purchase } = await supabase
    .from('live_stream_purchases')
    .select('*')
    .eq('id', livePurchaseId)
    .single();

  await supabase
    .from('live_stream_purchases')
    .update({
      status,
      stripe_checkout_session_id: checkoutSession.id,
      metadata: {
        ...(purchase?.metadata || {}),
        checkout_completed: false,
        stripe_payment_status: checkoutSession.payment_status || null
      }
    })
    .eq('id', livePurchaseId);
}

async function markLivePurchaseRefunded({ supabase, paymentIntentId }) {
  if (!paymentIntentId) return;

  const { data: purchases, error } = await supabase
    .from('live_stream_purchases')
    .select('*')
    .eq('stripe_payment_intent_id', paymentIntentId)
    .limit(1);

  if (error || !purchases?.length) {
    return;
  }

  const purchase = purchases[0];

  const { error: updateError } = await supabase
    .from('live_stream_purchases')
    .update({
      status: 'refunded',
      refunded_at: new Date().toISOString(),
      metadata: {
        ...(purchase.metadata || {}),
        refunded: true
      }
    })
    .eq('id', purchase.id);

  if (updateError) {
    throw new Error(updateError.message);
  }
}

export const config = {
  api: {
    bodyParser: false
  }
};

async function readRawBody(req) {
  const chunks = [];

  for await (const chunk of req) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }

  return Buffer.concat(chunks);
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).send('Method Not Allowed');
  }

  try {
    const stripe = getStripe();
    const supabase = getSupabaseServer();

    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
    if (!webhookSecret) {
      throw new Error('Missing STRIPE_WEBHOOK_SECRET');
    }

    const rawBody = await readRawBody(req);
    const signature = req.headers['stripe-signature'];

    if (!signature) {
      return res.status(400).send('Missing stripe-signature header');
    }

    let event;

    try {
      event = stripe.webhooks.constructEvent(rawBody, signature, webhookSecret);
    } catch (err) {
      return res.status(400).send(`Webhook Error: ${err.message}`);
    }

    switch (event.type) {
      case 'checkout.session.completed': {
        const checkoutSession = event.data.object;

        if (
          checkoutSession.mode === 'payment' &&
          checkoutSession.metadata?.live_purchase_id
        ) {
          await markLivePurchasePaid({
            supabase,
            checkoutSession
          });
        }

        break;
      }

      case 'checkout.session.async_payment_succeeded': {
        const checkoutSession = event.data.object;

        if (
          checkoutSession.mode === 'payment' &&
          checkoutSession.metadata?.live_purchase_id
        ) {
          await markLivePurchasePaid({
            supabase,
            checkoutSession
          });
        }

        break;
      }

      case 'checkout.session.async_payment_failed': {
        const checkoutSession = event.data.object;

        if (
          checkoutSession.mode === 'payment' &&
          checkoutSession.metadata?.live_purchase_id
        ) {
          await markLivePurchaseFailed({
            supabase,
            checkoutSession,
            status: 'failed'
          });
        }

        break;
      }

      case 'checkout.session.expired': {
        const checkoutSession = event.data.object;

        if (
          checkoutSession.mode === 'payment' &&
          checkoutSession.metadata?.live_purchase_id
        ) {
          await markLivePurchaseFailed({
            supabase,
            checkoutSession,
            status: 'canceled'
          });
        }

        break;
      }

      case 'charge.refunded': {
        const charge = event.data.object;
        const paymentIntentId =
          typeof charge.payment_intent === 'string'
            ? charge.payment_intent
            : charge.payment_intent?.id || null;

        await markLivePurchaseRefunded({
          supabase,
          paymentIntentId
        });

        break;
      }

      default:
        break;
    }

    return res.status(200).json({ received: true });
  } catch (err) {
    console.error('[stripe-webhook] error:', err);
    return res.status(500).json({
      error: err.message || 'Webhook handler failed'
    });
  }
}
