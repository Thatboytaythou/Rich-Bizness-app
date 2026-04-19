import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const supabase = createClient(
  window.NEXT_PUBLIC_SUPABASE_URL,
  window.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
);

function getProfileIdFromUrl() {
  const params = new URLSearchParams(window.location.search);
  return params.get("id");
}

export async function getCurrentSessionUser() {
  const { data, error } = await supabase.auth.getSession();
  if (error) throw error;
  return data?.session?.user || null;
}

export async function resolveProfileUserId() {
  const fromUrl = getProfileIdFromUrl();
  if (fromUrl) return fromUrl;

  const currentUser = await getCurrentSessionUser();
  return currentUser?.id || null;
}

export async function getProfileById(userId) {
  if (!userId) throw new Error("Missing profile id");

  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", userId)
    .single();

  if (error) throw error;
  return data;
}

export async function upsertProfile(profile) {
  const { data, error } = await supabase
    .from("profiles")
    .upsert(profile)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function getFollowersCount(userId) {
  if (!userId) return 0;

  const { count, error } = await supabase
    .from("followers")
    .select("*", { count: "exact", head: true })
    .eq("following_id", userId);

  if (error) throw error;
  return count || 0;
}

export async function getFollowingCount(userId) {
  if (!userId) return 0;

  const { count, error } = await supabase
    .from("followers")
    .select("*", { count: "exact", head: true })
    .eq("follower_id", userId);

  if (error) throw error;
  return count || 0;
}

export async function getLivesCount(userId) {
  if (!userId) return 0;

  const { count, error } = await supabase
    .from("live_streams")
    .select("*", { count: "exact", head: true })
    .eq("creator_id", userId);

  if (error) throw error;
  return count || 0;
}

export async function getPostsCount(userId) {
  if (!userId) return 0;

  const candidateTables = [
    { table: "posts", column: "user_id" },
    { table: "feed_posts", column: "user_id" },
    { table: "uploads", column: "user_id" },
    { table: "artwork", column: "user_id" }
  ];

  for (const candidate of candidateTables) {
    const { count, error } = await supabase
      .from(candidate.table)
      .select("*", { count: "exact", head: true })
      .eq(candidate.column, userId);

    if (!error) {
      return count || 0;
    }
  }

  return 0;
}

export async function getLatestLiveByCreator(userId) {
  if (!userId) return null;

  const { data, error } = await supabase
    .from("live_streams")
    .select("*")
    .eq("creator_id", userId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    console.error("[profile-api] getLatestLiveByCreator error:", error);
    return null;
  }

  if (!data) return null;

  return {
    ...data,
    is_live: !!data.started_at && !data.ended_at
  };
}

export async function isFollowingProfile({ viewerId, profileId }) {
  if (!viewerId || !profileId) return false;
  if (viewerId === profileId) return false;

  const { data, error } = await supabase
    .from("followers")
    .select("id")
    .eq("follower_id", viewerId)
    .eq("following_id", profileId)
    .maybeSingle();

  if (error) {
    console.error("[profile-api] isFollowingProfile error:", error);
    return false;
  }

  return !!data;
}

export async function followProfile({ followerId, followingId }) {
  if (!followerId || !followingId) throw new Error("Missing follow ids");
  if (followerId === followingId) throw new Error("You cannot follow yourself");

  const { error } = await supabase
    .from("followers")
    .insert({
      follower_id: followerId,
      following_id: followingId
    });

  if (error) throw error;
  return true;
}

export async function unfollowProfile({ followerId, followingId }) {
  if (!followerId || !followingId) throw new Error("Missing unfollow ids");

  const { error } = await supabase
    .from("followers")
    .delete()
    .eq("follower_id", followerId)
    .eq("following_id", followingId);

  if (error) throw error;
  return true;
}

export async function getProfileStats(userId) {
  const [followers, following, posts, lives] = await Promise.all([
    getFollowersCount(userId),
    getFollowingCount(userId),
    getPostsCount(userId),
    getLivesCount(userId)
  ]);

  return {
    followers,
    following,
    posts,
    lives
  };
}

export async function getFullProfileBundle() {
  const currentUser = await getCurrentSessionUser();
  const profileId = await resolveProfileUserId();

  if (!profileId) {
    throw new Error("No profile found.");
  }

  const [profile, stats, latestLive, isFollowing] = await Promise.all([
    getProfileById(profileId),
    getProfileStats(profileId),
    getLatestLiveByCreator(profileId),
    isFollowingProfile({
      viewerId: currentUser?.id || null,
      profileId
    })
  ]);

  return {
    currentUser,
    profileId,
    profile,
    stats,
    latestLive,
    isOwnProfile: currentUser?.id === profileId,
    isFollowing
  };
}

export { supabase };
