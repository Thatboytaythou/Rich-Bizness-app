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

    if (stream.creator_id !== userId) {
      return res.status(403).json({ error: 'Only the creator can end this stream' });
    }

    const now = new Date().toISOString();

    const { data: updatedStream, error: updateError } = await supabase
      .from('live_streams')
      .update({
        status: 'ended',
        ended_at: now,
        last_activity_at: now
      })
      .eq('id', stream_id)
      .select()
      .single();

    if (updateError) {
      return res.status(500).json({ error: updateError.message });
    }

    const { error: membersError } = await supabase
      .from('live_stream_members')
      .update({
        is_active: false,
        left_at: now
      })
      .eq('stream_id', stream_id)
      .eq('is_active', true);

    if (membersError) {
      return res.status(500).json({ error: membersError.message });
    }

    return res.status(200).json({
      ok: true,
      stream: updatedStream
    });
  } catch (err) {
    return res.status(500).json({
      error: err.message || 'Failed to end stream'
    });
  }
}
