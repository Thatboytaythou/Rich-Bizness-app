// core/supabase.js

import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';

// LOCKED PRODUCTION CONFIG
export const SUPABASE_URL = 'https://ksvdequymkceevocgpdj.supabase.co';
export const SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_bRhd0yC-gBTWTPC26IZHlw_sda85zos';

let browserSupabase = null;

function createBrowserClient() {
  return createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
      flowType: 'pkce'
    }
  });
}

export const supabase = browserSupabase || (browserSupabase = createBrowserClient());

export async function getSession() {
  const {
    data: { session },
    error
  } = await supabase.auth.getSession();

  if (error) {
    console.error('[core/supabase] getSession error:', error);
    return null;
  }

  return session || null;
}

export async function getUser() {
  const {
    data: { user },
    error
  } = await supabase.auth.getUser();

  if (error) {
    console.error('[core/supabase] getUser error:', error);
    return null;
  }

  return user || null;
}

export async function signOut(redirectTo = '/auth.html') {
  const { error } = await supabase.auth.signOut();

  if (error) {
    console.error('[core/supabase] signOut error:', error);
    throw error;
  }

  if (redirectTo) {
    window.location.href = redirectTo;
  }

  return true;
}

export async function getProfile(userId) {
  if (!userId) return null;

  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .maybeSingle();

  if (error) {
    console.error('[core/supabase] getProfile error:', error);
    return null;
  }

  return data || null;
}

export async function upsertProfile(profile = {}) {
  if (!profile?.id) {
    throw new Error('Profile id is required.');
  }

  const payload = {
    ...profile,
    updated_at: new Date().toISOString()
  };

  const { data, error } = await supabase
    .from('profiles')
    .upsert(payload, { onConflict: 'id' })
    .select()
    .maybeSingle();

  if (error) {
    console.error('[core/supabase] upsertProfile error:', error);
    throw error;
  }

  return data || null;
}

export async function isFollowing(currentUserId, targetUserId) {
  if (!currentUserId || !targetUserId) return false;

  const { data, error } = await supabase
    .from('followers')
    .select('id')
    .eq('follower_id', currentUserId)
    .eq('following_id', targetUserId)
    .maybeSingle();

  if (error) {
    console.error('[core/supabase] isFollowing error:', error);
    return false;
  }

  return !!data;
}

export async function followUser(followerId, followingId) {
  if (!followerId || !followingId) {
    throw new Error('Both followerId and followingId are required.');
  }

  const { data, error } = await supabase
    .from('followers')
    .insert({
      follower_id: followerId,
      following_id: followingId
    })
    .select()
    .maybeSingle();

  if (error) {
    console.error('[core/supabase] followUser error:', error);
    throw error;
  }

  return data || null;
}

export async function unfollowUser(followerId, followingId) {
  if (!followerId || !followingId) {
    throw new Error('Both followerId and followingId are required.');
  }

  const { error } = await supabase
    .from('followers')
    .delete()
    .eq('follower_id', followerId)
    .eq('following_id', followingId);

  if (error) {
    console.error('[core/supabase] unfollowUser error:', error);
    throw error;
  }

  return true;
}

export async function getCreatorBalance(userId) {
  if (!userId) return null;

  const { data, error } = await supabase
    .from('creator_available_balances')
    .select('*')
    .eq('artist_user_id', userId)
    .maybeSingle();

  if (error) {
    console.error('[core/supabase] getCreatorBalance error:', error);
    return null;
  }

  return data || null;
}

export async function listRows(table, {
  select = '*',
  orderBy = 'created_at',
  ascending = false,
  limit = 50
} = {}) {
  let query = supabase
    .from(table)
    .select(select);

  if (orderBy) {
    query = query.order(orderBy, { ascending });
  }

  if (limit) {
    query = query.limit(limit);
  }

  const { data, error } = await query;

  if (error) {
    console.error(`[core/supabase] listRows(${table}) error:`, error);
    return [];
  }

  return data || [];
}

export async function getRowById(table, id, {
  select = '*',
  idColumn = 'id'
} = {}) {
  if (id == null) return null;

  const { data, error } = await supabase
    .from(table)
    .select(select)
    .eq(idColumn, id)
    .maybeSingle();

  if (error) {
    console.error(`[core/supabase] getRowById(${table}) error:`, error);
    return null;
  }

  return data || null;
}

export async function insertRow(table, payload) {
  const { data, error } = await supabase
    .from(table)
    .insert(payload)
    .select();

  if (error) {
    console.error(`[core/supabase] insertRow(${table}) error:`, error);
    throw error;
  }

  return data || [];
}

export async function updateRows(table, filters = {}, payload = {}) {
  let query = supabase
    .from(table)
    .update(payload);

  Object.entries(filters).forEach(([key, value]) => {
    query = query.eq(key, value);
  });

  const { data, error } = await query.select();

  if (error) {
    console.error(`[core/supabase] updateRows(${table}) error:`, error);
    throw error;
  }

  return data || [];
}

export async function deleteRows(table, filters = {}) {
  let query = supabase
    .from(table)
    .delete();

  Object.entries(filters).forEach(([key, value]) => {
    query = query.eq(key, value);
  });

  const { error } = await query;

  if (error) {
    console.error(`[core/supabase] deleteRows(${table}) error:`, error);
    throw error;
  }

  return true;
}

export function getPublicURL(bucket, path = '') {
  if (!bucket || !path) return '';
  return `${SUPABASE_URL}/storage/v1/object/public/${bucket}/${path}`;
}

export function getStorageObjectUrl(bucket, path = '') {
  return getPublicURL(bucket, path);
}
