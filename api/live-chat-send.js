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
    const { stream_id, message } = req.body || {};

    if (!stream_id) {
      return res.status(400).json({ error: 'stream_id is required' });
    }

    if (!message || !String(message).trim()) {
      return res.status(400).json({ error: 'message is required' });
    }

    const cleanMessage = String(message).trim();

    if (cleanMessage.length > 2000) {
      return res.status(400).json({ error: 'message too long' });
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
      return res.status(403).json({ error: 'Chat is only available while stream is live' });
    }

    if (!stream.is_chat_enabled) {
      return res.status(403).json({ error: 'Chat is disabled for this stream' });
    }

    const { data: banned } = await supabase.rpc('is_user_banned_from_live_stream', {
      p_stream_id: stream_id,
      p_user_id: userId
    });

    if (banned) {
      return res.status(403).json({ error: 'You are banned from this stream' });
    }

    if (stream.access_type === 'paid') {
      const { data: hasPaid } = await supabase.rpc('user_has_paid_live_stream_access', {
        p_stream_id: stream_id,
        p_user_id: userId
      });

      if (!hasPaid && stream.creator_id !== userId) {
        return res.status(403).json({ error: 'Purchase required before chatting' });
      }
    }

    if (stream.access_type === 'followers' && stream.creator_id !== userId) {
      const { data: followRow } = await supabase
        .from('followers')
        .select('id')
        .eq('follower_id', userId)
        .eq('following_id', stream.creator_id)
        .maybeSingle();

      if (!followRow) {
        return res.status(403).json({ error: 'Follow required before chatting' });
      }
    }

    if (stream.access_type === 'vip' && stream.creator_id !== userId) {
      const { data: vipRow } = await supabase
        .from('creator_memberships')
        .select('id')
        .eq('creator_id', stream.creator_id)
        .eq('user_id', userId)
        .eq('status', 'active')
        .maybeSingle();

      if (!vipRow) {
        return res.status(403).json({ error: 'VIP membership required before chatting' });
      }
    }

    const { data: insertedMessage, error: insertError } = await supabase
      .from('live_chat_messages')
      .insert({
        stream_id,
        user_id: userId,
        message: cleanMessage,
        message_type: 'text'
      })
      .select()
      .single();

    if (insertError) {
      return res.status(500).json({ error: insertError.message });
    }

    return res.status(200).json({
      ok: true,
      message: insertedMessage
    });
  } catch (err) {
    return res.status(500).json({
      error: err.message || 'Failed to send chat message'
    });
  }
}
