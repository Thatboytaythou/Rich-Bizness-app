import { supabase, getSessionUser } from '../shared/supabase.js';

function getProfileIdFromUrl() {
  const url = new URL(window.location.href);
  return url.searchParams.get('id');
}

export async function getViewerUser() {
  return getSessionUser();
}

export async function resolveProfileUserId() {
  const explicitId = getProfileIdFromUrl();
  if (explicitId) return explicitId;

  const viewer = await getSessionUser();
  return viewer?.id || null;
}

export async function fetchProfileByUserId(userId) {
  if (!userId) throw new Error('Missing profile user id');

  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single();

  if (error) throw error;
  return data;
}

export async function fetchFollowerStats(userId) {
  if (!userId) throw new Error('Missing profile user id');

  const [{ count: followersCount, error: followersError }, { count: followingCount, error: followingError }] =
    await Promise.all([
      supabase
        .from('followers')
        .select('*', { count: 'exact', head: true })
        .eq('following_id', userId),
      supabase
        .from('followers')
        .select('*', { count: 'exact', head: true })
        .eq('follower_id', userId)
    ]);

  if (followersError) throw followersError;
  if (followingError) throw followingError;

  return {
    followers_count: followersCount || 0,
    following_count: followingCount || 0
  };
}

export async function fetchPostsCount(userId) {
  if (!userId) return 0;

  const candidateTables = [
    { table: 'posts', userColumn: 'user_id' },
    { table: 'feed_posts', userColumn: 'user_id' },
    { table: 'artwork', userColumn: 'user_id' },
    { table: 'uploads', userColumn: 'user_id' }
  ];

  for (const candidate of candidateTables) {
    const { count, error } = await supabase
      .from(candidate.table)
      .select('*', { count: 'exact', head: true })
      .eq(candidate.userColumn, userId);

    if (!error) return count || 0;
  }

  return 0;
}

export async function fetchLivesCount(userId) {
  if (!userId) return 0;

  const { count, error } = await supabase
    .from('live_streams')
    .select('*', { count: 'exact', head: true })
    .eq('creator_id', userId);

  if (error) throw error;
  return count || 0;
}

export async function fetchLatestLiveStream(userId) {
  if (!userId) return null;

  const { data, error } = await supabase
    .from('live_streams')
    .select('*')
    .eq('creator_id', userId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) throw error;
  return data || null;
}

export async function fetchIsFollowing({ viewerId, profileUserId }) {
  if (!viewerId || !profileUserId || viewerId === profileUserId) {
    return false;
  }

  const { data, error } = await supabase
    .from('followers')
    .select('id')
    .eq('follower_id', viewerId)
    .eq('following_id', profileUserId)
    .maybeSingle();

  if (error) throw error;
  return !!data;
}

export async function followProfile({ viewerId, profileUserId }) {
  if (!viewerId) throw new Error('You must be logged in to follow');
  if (!profileUserId) throw new Error('Missing target profile');
  if (viewerId === profileUserId) throw new Error('You cannot follow yourself');

  const { error } = await supabase
    .from('followers')
    .insert({
      follower_id: viewerId,
      following_id: profileUserId
    });

  if (error && !String(error.message || '').toLowerCase().includes('duplicate')) {
    throw error;
  }

  return true;
}

export async function unfollowProfile({ viewerId, profileUserId }) {
  if (!viewerId) throw new Error('You must be logged in to unfollow');
  if (!profileUserId) throw new Error('Missing target profile');

  const { error } = await supabase
    .from('followers')
    .delete()
    .eq('follower_id', viewerId)
    .eq('following_id', profileUserId);

  if (error) throw error;
  return true;
}

export async function fetchProfileBundle() {
  const viewer = await getViewerUser();
  const profileUserId = await resolveProfileUserId();

  if (!profileUserId) {
    throw new Error('No profile id found. Sign in or open profile.html?id=USER_ID');
  }

  const [profile, stats, postsCount, livesCount, latestLive, isFollowing] =
    await Promise.all([
      fetchProfileByUserId(profileUserId),
      fetchFollowerStats(profileUserId),
      fetchPostsCount(profileUserId),
      fetchLivesCount(profileUserId),
      fetchLatestLiveStream(profileUserId),
      fetchIsFollowing({
        viewerId: viewer?.id || null,
        profileUserId
      })
    ]);

  return {
    viewer,
    profileUserId,
    profile,
    stats,
    postsCount,
    livesCount,
    latestLive,
    isFollowing
  };
}
