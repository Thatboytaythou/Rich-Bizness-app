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

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const supabase = getSupabaseServer();
    const userId = getUserIdFromRequest(req);

    const {
      stream_id,
      title,
      description,
      category,
      access_type,
      price_cents,
      thumbnail_url,
      cover_url,
      scheduled_for,
      is_chat_enabled,
      is_replay_enabled,
      is_featured
    } = req.body || {};

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

    if (stream.creator_id !== userId) {
      return res.status(403).json({ error: 'Only the creator can update this stream' });
    }

    const validCategories = ['music', 'gaming', 'sports', 'gallery', 'general'];
    const validAccessTypes = ['free', 'followers', 'paid', 'vip'];

    if (category && !validCategories.includes(category)) {
      return res.status(400).json({ error: 'Invalid category' });
    }

    if (access_type && !validAccessTypes.includes(access_type)) {
      return res.status(400).json({ error: 'Invalid access_type' });
    }

    const nextAccessType = access_type ?? stream.access_type;
    const nextPriceCents = price_cents ?? stream.price_cents;

    if (nextAccessType === 'paid' && Number(nextPriceCents) <= 0) {
      return res.status(400).json({ error: 'Paid streams must have price_cents > 0' });
    }

    const updates = {
      last_activity_at: new Date().toISOString()
    };

    if (title !== undefined) updates.title = String(title || '').trim();
    if (description !== undefined) updates.description = String(description || '').trim();
    if (category !== undefined) updates.category = category;
    if (access_type !== undefined) updates.access_type = access_type;
    if (price_cents !== undefined) updates.price_cents = Number(price_cents) || 0;
    if (thumbnail_url !== undefined) updates.thumbnail_url = thumbnail_url || null;
    if (cover_url !== undefined) updates.cover_url = cover_url || null;
    if (scheduled_for !== undefined) updates.scheduled_for = scheduled_for || null;
    if (is_chat_enabled !== undefined) updates.is_chat_enabled = !!is_chat_enabled;
    if (is_replay_enabled !== undefined) updates.is_replay_enabled = !!is_replay_enabled;
    if (is_featured !== undefined) updates.is_featured = !!is_featured;

    if (updates.title !== undefined && !updates.title) {
      return res.status(400).json({ error: 'title cannot be empty' });
    }

    const { data: updatedStream, error: updateError } = await supabase
      .from('live_streams')
      .update(updates)
      .eq('id', stream_id)
      .select()
      .single();

    if (updateError) {
      return res.status(500).json({ error: updateError.message });
    }

    return res.status(200).json({
      ok: true,
      stream: updatedStream
    });
  } catch (err) {
    return res.status(500).json({
      error: err.message || 'Failed to update stream'
    });
  }
}
