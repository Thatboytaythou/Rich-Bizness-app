import { createClient } from '@supabase/supabase-js';

function getSupabaseServer() {
  const supabaseUrl =
    process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error(
      'Missing SUPABASE_URL/NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY'
    );
  }

  return createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false }
  });
}

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const supabase = getSupabaseServer();

    const { data, error } = await supabase
      .from('live_stream_cards')
      .select('*')
      .eq('status', 'live')
      .order('is_featured', { ascending: false })
      .order('started_at', { ascending: false })
      .limit(12);

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    return res.status(200).json({
      ok: true,
      streams: data || []
    });
  } catch (err) {
    return res.status(500).json({
      error: err.message || 'Failed to load live rail'
    });
  }
}
