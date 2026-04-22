import { supabase } from "/core/supabase.js";

let activeStream = null;
let activeUser = null;
let activeProfile = null;

function normalizeProfile(profile) {
  if (Array.isArray(profile)) return profile[0] || null;
  return profile || null;
}

function toLower(value = "") {
  return String(value || "").trim().toLowerCase();
}

function isAdminProfile(profile = {}) {
  return Boolean(
    profile?.is_admin ||
    profile?.is_super_admin ||
    profile?.role === "admin" ||
    profile?.account_role === "admin"
  );
}

function isCreator(stream = {}, user = null) {
  return Boolean(stream?.creator_id && user?.id && stream.creator_id === user.id);
}

function isLive(stream = {}) {
  return toLower(stream?.status) === "live";
}

function isEnded(stream = {}) {
  return toLower(stream?.status) === "ended";
}

function isScheduled(stream = {}) {
  return toLower(stream?.status) === "scheduled";
}

function getAccessType(stream = {}) {
  return toLower(stream?.access_type || "free");
}

export async function fetchViewerAccessRecord(streamId, userId) {
  if (!streamId || !userId) return null;

  const { data, error } = await supabase
    .from("live_room_access")
    .select("*")
    .eq("stream_id", streamId)
    .eq("user_id", userId)
    .maybeSingle();

  if (error) {
    console.error("[live-permissions] fetchViewerAccessRecord error:", error);
    return null;
  }

  return data || null;
}

export async function fetchVipAccessRecord(streamId, userId) {
  if (!streamId || !userId) return null;

  const { data, error } = await supabase
    .from("vip_live_access")
    .select("*")
    .eq("stream_id", streamId)
    .eq("user_id", userId)
    .maybeSingle();

  if (error) {
    console.error("[live-permissions] fetchVipAccessRecord error:", error);
    return null;
  }

  return data || null;
}

export async function fetchPurchaseAccessRecord(streamId, userId) {
  if (!streamId || !userId) return null;

  const { data, error } = await supabase
    .from("live_stream_purchases")
    .select("*")
    .eq("stream_id", streamId)
    .eq("user_id", userId)
    .maybeSingle();

  if (error) {
    console.error("[live-permissions] fetchPurchaseAccessRecord error:", error);
    return null;
  }

  return data || null;
}

export async function fetchBanRecord(streamId, userId) {
  if (!streamId || !userId) return null;

  const { data, error } = await supabase
    .from("live_stream_bans")
    .select("*")
    .eq("stream_id", streamId)
    .eq("user_id", userId)
    .maybeSingle();

  if (error) {
    console.error("[live-permissions] fetchBanRecord error:", error);
    return null;
  }

  return data || null;
}

export async function fetchCreatorMembership(creatorId, userId) {
  if (!creatorId || !userId) return null;

  const { data, error } = await supabase
    .from("creator_memberships")
    .select("*")
    .eq("creator_id", creatorId)
    .eq("user_id", userId)
    .maybeSingle();

  if (error) {
    console.error("[live-permissions] fetchCreatorMembership error:", error);
    return null;
  }

  return data || null;
}

export async function fetchFollowRelationship(creatorId, userId) {
  if (!creatorId || !userId) return null;

  const { data, error } = await supabase
    .from("followers")
    .select("*")
    .eq("following_id", creatorId)
    .eq("follower_id", userId)
    .maybeSingle();

  if (error) {
    console.error("[live-permissions] fetchFollowRelationship error:", error);
    return null;
  }

  return data || null;
}

export async function fetchLivePermissionState({
  stream,
  user,
  profile = null
}) {
  const normalizedProfile = normalizeProfile(profile);
  const result = {
    stream: stream || null,
    user: user || null,
    profile: normalizedProfile,
    isAuthenticated: Boolean(user?.id),
    isCreator: false,
    isAdmin: false,
    isBanned: false,
    hasRoomAccess: false,
    hasVipAccess: false,
    hasPaidAccess: false,
    hasMembership: false,
    isFollower: false,
    canView: false,
    canChat: false,
    canSendReactions: false,
    canManage: false,
    canModerate: false,
    canEndStream: false,
    canGoLive: false,
    needsLogin: false,
    needsPurchase: false,
    needsVip: false,
    reason: "unknown"
  };

  if (!stream?.id) {
    result.reason = "missing_stream";
    return result;
  }

  result.isCreator = isCreator(stream, user);
  result.isAdmin = isAdminProfile(normalizedProfile);
  result.canGoLive = result.isCreator || result.isAdmin;
  result.canManage = result.isCreator || result.isAdmin;
  result.canModerate = result.isCreator || result.isAdmin;
  result.canEndStream = result.isCreator || result.isAdmin;

  if (!user?.id) {
    result.needsLogin = true;

    if (getAccessType(stream) === "free" && isLive(stream)) {
      result.canView = true;
      result.reason = "public_free_guest";
      return result;
    }

    result.reason = "login_required";
    return result;
  }

  const [
    banRecord,
    roomAccess,
    vipAccess,
    purchaseAccess,
    membership,
    followRelationship
  ] = await Promise.all([
    fetchBanRecord(stream.id, user.id),
    fetchViewerAccessRecord(stream.id, user.id),
    fetchVipAccessRecord(stream.id, user.id),
    fetchPurchaseAccessRecord(stream.id, user.id),
    fetchCreatorMembership(stream.creator_id, user.id),
    fetchFollowRelationship(stream.creator_id, user.id)
  ]);

  result.isBanned = !!banRecord;
  result.hasRoomAccess = !!roomAccess;
  result.hasVipAccess = !!vipAccess;
  result.hasPaidAccess = !!purchaseAccess;
  result.hasMembership = !!membership;
  result.isFollower = !!followRelationship;

  if (result.isBanned) {
    result.reason = "banned";
    return result;
  }

  if (result.isCreator || result.isAdmin) {
    result.canView = true;
    result.canChat = !isEnded(stream);
    result.canSendReactions = !isEnded(stream);
    result.reason = "creator_or_admin";
    return result;
  }

  const accessType = getAccessType(stream);

  if (accessType === "free") {
    result.canView = true;
    result.canChat = !!stream.is_chat_enabled && !isEnded(stream);
    result.canSendReactions = !isEnded(stream);
    result.reason = "free_access";
    return result;
  }

  if (accessType === "paid") {
    if (result.hasPaidAccess || result.hasRoomAccess) {
      result.canView = true;
      result.canChat = !!stream.is_chat_enabled && !isEnded(stream);
      result.canSendReactions = !isEnded(stream);
      result.reason = "paid_access_granted";
      return result;
    }

    result.needsPurchase = true;
    result.reason = "paid_access_required";
    return result;
  }

  if (accessType === "vip") {
    if (result.hasVipAccess || result.hasMembership || result.hasRoomAccess) {
      result.canView = true;
      result.canChat = !!stream.is_chat_enabled && !isEnded(stream);
      result.canSendReactions = !isEnded(stream);
      result.reason = "vip_access_granted";
      return result;
    }

    result.needsVip = true;
    result.reason = "vip_access_required";
    return result;
  }

  result.reason = "unknown_access_type";
  return result;
}

export async function ensureLiveRoomAccess({
  stream,
  user,
  grantedBy = "system"
}) {
  if (!stream?.id || !user?.id) return null;

  const existing = await fetchViewerAccessRecord(stream.id, user.id);
  if (existing) return existing;

  const { data, error } = await supabase
    .from("live_room_access")
    .insert({
      stream_id: stream.id,
      user_id: user.id,
      granted_by: grantedBy,
      granted_at: new Date().toISOString()
    })
    .select("*")
    .single();

  if (error) {
    console.error("[live-permissions] ensureLiveRoomAccess error:", error);
    throw new Error(error.message || "Could not grant live room access.");
  }

  return data;
}

export async function banUserFromLiveRoom({
  streamId,
  userId,
  bannedBy,
  reason = null
}) {
  if (!streamId || !userId || !bannedBy) {
    throw new Error("Missing live ban fields.");
  }

  const { data, error } = await supabase
    .from("live_stream_bans")
    .upsert({
      stream_id: streamId,
      user_id: userId,
      banned_by: bannedBy,
      reason,
      created_at: new Date().toISOString()
    })
    .select("*")
    .single();

  if (error) {
    console.error("[live-permissions] banUserFromLiveRoom error:", error);
    throw new Error(error.message || "Could not ban user.");
  }

  return data;
}

export async function unbanUserFromLiveRoom({
  streamId,
  userId
}) {
  if (!streamId || !userId) {
    throw new Error("Missing live unban fields.");
  }

  const { error } = await supabase
    .from("live_stream_bans")
    .delete()
    .eq("stream_id", streamId)
    .eq("user_id", userId);

  if (error) {
    console.error("[live-permissions] unbanUserFromLiveRoom error:", error);
    throw new Error(error.message || "Could not unban user.");
  }

  return true;
}

export async function canUserViewLive({
  stream,
  user,
  profile = null
}) {
  const permission = await fetchLivePermissionState({
    stream,
    user,
    profile
  });

  return permission.canView;
}

export async function canUserChatInLive({
  stream,
  user,
  profile = null
}) {
  const permission = await fetchLivePermissionState({
    stream,
    user,
    profile
  });

  return permission.canChat;
}

export async function canUserModerateLive({
  stream,
  user,
  profile = null
}) {
  const permission = await fetchLivePermissionState({
    stream,
    user,
    profile
  });

  return permission.canModerate;
}

export function setActiveLivePermissionContext({
  stream = null,
  user = null,
  profile = null
} = {}) {
  activeStream = stream || null;
  activeUser = user || null;
  activeProfile = normalizeProfile(profile);
}

export async function getActiveLivePermissionState() {
  return await fetchLivePermissionState({
    stream: activeStream,
    user: activeUser,
    profile: activeProfile
  });
}

export function clearActiveLivePermissionContext() {
  activeStream = null;
  activeUser = null;
  activeProfile = null;
}

export function getPermissionMessage(permission = {}) {
  if (permission.reason === "banned") {
    return "You are banned from this live room.";
  }

  if (permission.reason === "login_required") {
    return "Login is required for this live room.";
  }

  if (permission.reason === "paid_access_required") {
    return "This live room requires paid access.";
  }

  if (permission.reason === "vip_access_required") {
    return "This live room requires VIP access.";
  }

  if (permission.reason === "creator_or_admin") {
    return "Creator or admin access granted.";
  }

  if (permission.reason === "free_access") {
    return "Free live access granted.";
  }

  if (permission.reason === "paid_access_granted") {
    return "Paid live access granted.";
  }

  if (permission.reason === "vip_access_granted") {
    return "VIP live access granted.";
  }

  if (permission.reason === "public_free_guest") {
    return "Guest access granted for free live.";
  }

  return "Live permission state loaded.";
}
