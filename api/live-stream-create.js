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

function getSiteUrl(req) {
  return (
    process.env.PUBLIC_SITE_URL ||
    process.env.APP_URL ||
    `https://${req.headers.host}`
  );
}

function getUserIdFromRequest(req) {
  const userId =
    req.headers['x-user-id'] ||
    req.body?.creator_id ||
    req.query?.creator_id;

  if (!userId) {
    throw new Error('Missing authenticated user id. Pass x-user-id header for now.');
  }

  return userId;
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const supabase = getSupabaseServer();
    const creatorId = getUserIdFromRequest(req);

    const {
      title,
      description = '',
      category = 'general',
      access_type = 'free',
      price_cents = 0,
      thumbnail_url = null,
      cover_url = null,
      scheduled_for = null,
      is_chat_enabled = true,
      is_replay_enabled = false,
      start_now = true
    } = req.body || {};

    if (!title || !String(title).trim()) {
      return res.status(400).json({ error: 'title is required' });
    }

    const cleanTitle = String(title).trim();
    const cleanDescription = String(description || '').trim();

    const validCategories = ['music', 'gaming', 'sports', 'gallery', 'general'];
    const validAccessTypes = ['free', 'followers', 'paid', 'vip'];

    if (!validCategories.includes(category)) {
      return res.status(400).json({ error: 'Invalid category' });
    }

    if (!validAccessTypes.includes(access_type)) {
      return res.status(400).json({ error: 'Invalid access_type' });
    }

    if (access_type === 'paid' && Number(price_cents) <= 0) {
      return res.status(400).json({ error: 'Paid streams must have price_cents > 0' });
    }

    const status = start_now ? 'live' : (scheduled_for ? 'scheduled' : 'draft');
    const startedAt = start_now ? new Date().toISOString() : null;

    const { data: stream, error } = await supabase
      .from('live_streams')
      .insert({
        creator_id: creatorId,
        title: cleanTitle,
        description: cleanDescription,
        category,
        status,
        access_type,
        price_cents: Number(price_cents) || 0,
        currency: 'usd',
        thumbnail_url,
        cover_url,
        scheduled_for,
        started_at: startedAt,
        is_chat_enabled,
        is_replay_enabled,
        last_activity_at: new Date().toISOString()
      })
      .select()
      .single();

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    const siteUrl = getSiteUrl(req);
    const shareUrl = `${siteUrl.replace(/\/$/, '')}/watch.html?slug=${encodeURIComponent(stream.slug)}`;

    return res.status(200).json({
      ok: true,
      stream,
      share_url: shareUrl,
      livekit_room_name: stream.livekit_room_name
    });
  } catch (err) {
    return res.status(500).json({
      error: err.message || 'Failed to create live stream'
    });
  }
}
