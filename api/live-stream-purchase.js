import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';

function getSupabaseServer() {
  const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error('Missing SUPABASE_URL/NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  }

  return createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false }
  });
}

function getStripe() {
  const secretKey = process.env.STRIPE_SECRET_KEY;
  if (!secretKey) {
    throw new Error('Missing STRIPE_SECRET_KEY');
  }
  return new Stripe(secretKey, {
    apiVersion: '2024-06-20'
  });
}

function getUserIdFromRequest(req) {
  const userId =
    req.headers['x-user-id'] ||
    req.body?.user_id ||
    req.query?.user_id ||
    null;

  if (!userId) {
    throw new Error('Missing authenticated user id');
  }

  return userId;
}

function getBaseUrl(req) {
  return (
    process.env.PUBLIC_SITE_URL ||
    process.env.APP_URL ||
    `https://${req.headers.host}`
  ).replace(/\/$/, '');
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const supabase = getSupabaseServer();
    const stripe = getStripe();
    const userId = getUserIdFromRequest(req);
    const { stream_id } = req.body || {};

    if (!stream_id) {
      return res.status(400).json({ error: 'stream_id is required' });
    }

    const { data: stream, error: streamError } = await supabase
      .from('live_streams')
      .select('*')
      .eq('id', stream_id)
      .single();

    if (streamError || !stream) {
      return res.status(404).json({ error: 'Stream not found' });
    }

    if (stream.status !== 'live') {
      return res.status(400).json({ error: 'Only live streams can be purchased' });
    }

    if (stream.access_type !== 'paid') {
      return res.status(400).json({ error: 'This stream is not a paid stream' });
    }

    if (stream.creator_id === userId) {
      return res.status(400).json({ error: 'Creator does not need to purchase own stream' });
    }

    const { data: hasPaid } = await supabase.rpc('user_has_paid_live_stream_access', {
      p_stream_id: stream_id,
      p_user_id: userId
    });

    if (hasPaid) {
      return res.status(200).json({
        ok: true,
        already_unlocked: true
      });
    }

    const baseUrl = getBaseUrl(req);
    const successUrl = `${baseUrl}/watch.html?slug=${encodeURIComponent(stream.slug)}&purchase=success`;
    const cancelUrl = `${baseUrl}/watch.html?slug=${encodeURIComponent(stream.slug)}&purchase=cancel`;

    const { data: pendingPurchase, error: pendingInsertError } = await supabase
      .from('live_stream_purchases')
      .insert({
        stream_id,
        user_id: userId,
        amount_cents: Number(stream.price_cents) || 0,
        currency: stream.currency || 'usd',
        status: 'pending'
      })
      .select()
      .single();

    if (pendingInsertError || !pendingPurchase) {
      return res.status(500).json({ error: pendingInsertError?.message || 'Failed to create purchase record' });
    }

    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      success_url: successUrl,
      cancel_url: cancelUrl,
      client_reference_id: pendingPurchase.id,
      metadata: {
        live_purchase_id: pendingPurchase.id,
        stream_id: stream.id,
        user_id: userId,
        creator_id: stream.creator_id
      },
      line_items: [
        {
          quantity: 1,
          price_data: {
            currency: (stream.currency || 'usd').toLowerCase(),
            unit_amount: Number(stream.price_cents) || 0,
            product_data: {
              name: stream.title || 'Live Stream Access',
              description: `Unlock access to ${stream.title || 'this live stream'}`
            }
          }
        }
      ]
    });

    const { error: purchaseUpdateError } = await supabase
      .from('live_stream_purchases')
      .update({
        stripe_checkout_session_id: session.id,
        metadata: {
          checkout_url: session.url
        }
      })
      .eq('id', pendingPurchase.id);

    if (purchaseUpdateError) {
      return res.status(500).json({ error: purchaseUpdateError.message });
    }

    return res.status(200).json({
      ok: true,
      checkout_url: session.url,
      session_id: session.id
    });
  } catch (err) {
    return res.status(500).json({
      error: err.message || 'Failed to create purchase session'
    });
  }
}
