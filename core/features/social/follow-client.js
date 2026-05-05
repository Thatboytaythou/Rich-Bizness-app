// =========================
// RICH BIZNESS FOLLOW CLIENT — FINAL
// =========================

import { supabase } from "/core/supabase.js";

// FOLLOW USER
export async function followUser(currentUserId, targetUserId) {
  if (!currentUserId || !targetUserId) return;

  const { error } = await supabase
    .from("followers")
    .insert({
      follower_id: currentUserId,
      following_id: targetUserId
    });

  if (error) {
    console.error("follow error:", error);
  }
}

// UNFOLLOW USER
export async function unfollowUser(currentUserId, targetUserId) {
  if (!currentUserId || !targetUserId) return;

  const { error } = await supabase
    .from("followers")
    .delete()
    .eq("follower_id", currentUserId)
    .eq("following_id", targetUserId);

  if (error) {
    console.error("unfollow error:", error);
  }
}

// CHECK FOLLOW STATUS
export async function isFollowing(currentUserId, targetUserId) {
  if (!currentUserId || !targetUserId) return false;

  const { data } = await supabase
    .from("followers")
    .select("*")
    .eq("follower_id", currentUserId)
    .eq("following_id", targetUserId)
    .single();

  return !!data;
}

// GET COUNTS
export async function getFollowCounts(userId) {
  if (!userId) return { followers: 0, following: 0 };

  const [{ count: followers }, { count: following }] = await Promise.all([
    supabase
      .from("followers")
      .select("*", { count: "exact", head: true })
      .eq("following_id", userId),

    supabase
      .from("followers")
      .select("*", { count: "exact", head: true })
      .eq("follower_id", userId)
  ]);

  return {
    followers: followers || 0,
    following: following || 0
  };
}
