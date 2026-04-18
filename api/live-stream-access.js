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
  return req.headers['x-user-id'] || req.body?.user_id || req.query?.user_id || null;
}

export default async function handler(req, res) {
  if (!['POST', 'GET'].includes(req.method)) {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const supabase = getSupabaseServer();
    const payload = req.method === 'GET' ? req.query : req.body;
    const userId = getUserIdFromRequest(req);

    const streamId = payload?.stream_id || null;
    const slug = payload?.slug || null;

    if (!streamId && !slug) {
      return res.status(400).json({ error: 'stream_id or slug is required' });
    }

    let query = supabase.from('live_streams').select('*');

    if (streamId) query = query.eq('id', streamId);
    if (slug) query = query.eq('slug', slug);

    const { data: stream, error: streamError } = await query.single();

    if (streamError || !stream) {
      return res.status(404).json({
        allowed: false,
        reason: 'stream_not_found'
      });
    }

    if (stream.status !== 'live') {
      return res.status(200).json({
        allowed: false,
        reason: stream.status === 'ended' ? 'stream_ended' : 'stream_not_live',
        requires_login: false,
        requires_purchase: false,
        requires_follow: false,
        requires_vip: false,
        stream
      });
    }

    if (userId) {
      const { data: banCheck } = await supabase.rpc('is_user_banned_from_live_stream', {
        p_stream_id: stream.id,
        p_user_id: userId
      });

      if (banCheck === true) {
        return res.status(200).json({
          allowed: false,
          reason: 'banned',
          requires_login: false,
          requires_purchase: false,
          requires_follow: false,
          requires_vip: false,
          stream
        });
      }
    }

    if (stream.access_type === 'free') {
      return res.status(200).json({
        allowed: true,
        reason: 'ok',
        requires_login: false,
        requires_purchase: false,
        requires_follow: false,
        requires_vip: false,
        stream
      });
    }

    if (!userId) {
      return res.status(200).json({
        allowed: false,
        reason: 'login_required',
        requires_login: true,
        requires_purchase: stream.access_type === 'paid',
        requires_follow: stream.access_type === 'followers',
        requires_vip: stream.access_type === 'vip',
        stream
      });
    }

    if (stream.access_type === 'paid') {
      const { data: hasPaid } = await supabase.rpc('user_has_paid_live_stream_access', {
        p_stream_id: stream.id,
        p_user_id: userId
      });

      if (!hasPaid) {
        return res.status(200).json({
          allowed: false,
          reason: 'purchase_required',
          requires_login: false,
          requires_purchase: true,
          requires_follow: false,
          requires_vip: false,
          stream
        });
      }

      return res.status(200).json({
        allowed: true,
        reason: 'ok',
        requires_login: false,
        requires_purchase: false,
        requires_follow: false,
        requires_vip: false,
        stream
      });
    }

    if (stream.access_type === 'followers') {
      const { data: followRow, error: followError } = await supabase
        .from('followers')
        .select('id')
        .eq('follower_id', userId)
        .eq('following_id', stream.creator_id)
        .maybeSingle();

      if (followError || !followRow) {
        return res.status(200).json({
          allowed: false,
          reason: 'follow_required',
          requires_login: false,
          requires_purchase: false,
          requires_follow: true,
          requires_vip: false,
          stream
        });
      }

      return res.status(200).json({
        allowed: true,
        reason: 'ok',
        requires_login: false,
        requires_purchase: false,
        requires_follow: false,
        requires_vip: false,
        stream
      });
    }

    if (stream.access_type === 'vip') {
      const { data: vipRow, error: vipError } = await supabase
        .from('creator_memberships')
        .select('id,status')
        .eq('creator_id', stream.creator_id)
        .eq('user_id', userId)
        .eq('status', 'active')
        .maybeSingle();

      if (vipError || !vipRow) {
        return res.status(200).json({
          allowed: false,
          reason: 'vip_required',
          requires_login: false,
          requires_purchase: false,
          requires_follow: false,
          requires_vip: true,
          stream
        });
      }

      return res.status(200).json({
        allowed: true,
        reason: 'ok',
        requires_login: false,
        requires_purchase: false,
        requires_follow: false,
        requires_vip: false,
        stream
      });
    }

    return res.status(200).json({
      allowed: false,
      reason: 'unknown_access_state',
      stream
    });
  } catch (err) {
    return res.status(500).json({
      error: err.message || 'Failed to check live stream access'
    });
  }
}
