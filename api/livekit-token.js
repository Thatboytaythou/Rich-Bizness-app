import { createClient } from '@supabase/supabase-js';
import { AccessToken } from 'livekit-server-sdk';

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
  return req.headers['x-user-id'] || req.body?.user_id || req.query?.user_id || null;
}

function getEnv(name) {
  const value = process.env[name];
  if (!value) throw new Error(`Missing env ${name}`);
  return value;
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const supabase = getSupabaseServer();
    const userId = getUserIdFromRequest(req);
    const { stream_id, slug, role = 'viewer', display_name = 'Guest' } = req.body || {};

    if (!stream_id && !slug) {
      return res.status(400).json({ error: 'stream_id or slug is required' });
    }

    let query = supabase.from('live_streams').select('*');
    if (stream_id) query = query.eq('id', stream_id);
    if (slug) query = query.eq('slug', slug);

    const { data: stream, error: streamError } = await query.single();

    if (streamError || !stream) {
      return res.status(404).json({ error: 'Stream not found' });
    }

    const isHost = userId && userId === stream.creator_id;
    const participantRole = isHost ? 'host' : role;

    if (!isHost) {
      if (stream.status !== 'live') {
        return res.status(403).json({ error: 'Stream is not live' });
      }

      if (!userId && stream.access_type !== 'free') {
        return res.status(403).json({ error: 'Login required for this stream' });
      }

      if (userId) {
        const { data: banned } = await supabase.rpc('is_user_banned_from_live_stream', {
          p_stream_id: stream.id,
          p_user_id: userId
        });

        if (banned) {
          return res.status(403).json({ error: 'You are banned from this stream' });
        }
      }

      if (stream.access_type === 'paid') {
        const { data: hasPaid } = await supabase.rpc('user_has_paid_live_stream_access', {
          p_stream_id: stream.id,
          p_user_id: userId
        });

        if (!hasPaid) {
          return res.status(403).json({ error: 'Purchase required' });
        }
      }
    }

    const apiKey = getEnv('LIVEKIT_API_KEY');
    const apiSecret = getEnv('LIVEKIT_API_SECRET');
    const livekitUrl = getEnv('LIVEKIT_URL');

    const identity = userId
      ? `user:${userId}`
      : `guest:${Math.random().toString(36).slice(2, 10)}`;

    const token = new AccessToken(apiKey, apiSecret, {
      identity,
      name: display_name || 'Guest',
      ttl: '2h'
    });

    token.addGrant({
      roomJoin: true,
      room: stream.livekit_room_name,
      canPublish: isHost,
      canPublishData: true,
      canSubscribe: true
    });

    const jwt = await token.toJwt();

    if (userId) {
      await supabase
        .from('live_stream_members')
        .upsert(
          {
            stream_id: stream.id,
            user_id: userId,
            role: participantRole,
            is_active: true,
            joined_at: new Date().toISOString(),
            left_at: null,
            livekit_participant_identity: identity
          },
          {
            onConflict: 'stream_id,user_id'
          }
        );
    }

    return res.status(200).json({
      ok: true,
      token: jwt,
      room_name: stream.livekit_room_name,
      livekit_url: livekitUrl,
      participant_identity: identity,
      role: participantRole,
      stream
    });
  } catch (err) {
    return res.status(500).json({
      error: err.message || 'Failed to create LiveKit token'
    });
  }
}
