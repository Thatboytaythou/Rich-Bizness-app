import { supabase } from "../shared/supabase.js";

function normalizeAccessType(value = "") {
  const clean = String(value || "").trim().toLowerCase();

  if (["paid", "vip", "followers", "free"].includes(clean)) {
    return clean;
  }

  return "free";
}

export function getAccessTypeLabel(accessType = "free") {
  const clean = normalizeAccessType(accessType);

  if (clean === "paid") return "PAID";
  if (clean === "vip") return "VIP";
  if (clean === "followers") return "FOLLOWERS";
  return "FREE";
}

export function getAccessPriceLabel(stream) {
  const accessType = normalizeAccessType(stream?.access_type);
  const priceCents = Number(stream?.price_cents || 0);
  const currency = String(stream?.currency || "usd").toUpperCase();

  if (accessType !== "paid") return "";

  if (priceCents <= 0) {
    return `${currency} 0.00`;
  }

  return `${currency} ${(priceCents / 100).toFixed(2)}`;
}

export function isFreeAccess(stream) {
  return normalizeAccessType(stream?.access_type) === "free";
}

export function isPaidAccess(stream) {
  return normalizeAccessType(stream?.access_type) === "paid";
}

export function isVipAccess(stream) {
  return normalizeAccessType(stream?.access_type) === "vip";
}

export function isFollowersAccess(stream) {
  return normalizeAccessType(stream?.access_type) === "followers";
}

export function buildAccessSummary(stream) {
  const accessType = normalizeAccessType(stream?.access_type);

  if (accessType === "paid") {
    return {
      type: "paid",
      label: getAccessTypeLabel(accessType),
      detail: getAccessPriceLabel(stream) || "Payment required"
    };
  }

  if (accessType === "vip") {
    return {
      type: "vip",
      label: "VIP",
      detail: "VIP access required"
    };
  }

  if (accessType === "followers") {
    return {
      type: "followers",
      label: "FOLLOWERS",
      detail: "Followers only"
    };
  }

  return {
    type: "free",
    label: "FREE",
    detail: "Open to everyone"
  };
}

export async function hasPaidAccess({ streamId, userId }) {
  if (!streamId || !userId) return false;

  const { data, error } = await supabase
    .from("live_stream_purchases")
    .select("id")
    .eq("stream_id", streamId)
    .eq("user_id", userId)
    .maybeSingle();

  if (error) {
    console.error("[live/access] hasPaidAccess error:", error);
    return false;
  }

  return !!data;
}

export async function isFollowingCreator({ creatorId, userId }) {
  if (!creatorId || !userId) return false;
  if (creatorId === userId) return true;

  const { data, error } = await supabase
    .from("followers")
    .select("id")
    .eq("follower_id", userId)
    .eq("following_id", creatorId)
    .maybeSingle();

  if (error) {
    console.error("[live/access] isFollowingCreator error:", error);
    return false;
  }

  return !!data;
}

export async function hasVipAccess({ creatorId, userId }) {
  if (!creatorId || !userId) return false;
  if (creatorId === userId) return true;

  const candidateChecks = [
    {
      table: "creator_memberships",
      filters: (query) =>
        query.eq("creator_id", creatorId).eq("user_id", userId)
    },
    {
      table: "creator_memberships",
      filters: (query) =>
        query.eq("creator_id", creatorId).eq("member_user_id", userId)
    },
    {
      table: "creator_memberships",
      filters: (query) =>
        query.eq("creator_id", creatorId).eq("subscriber_id", userId)
    }
  ];

  for (const candidate of candidateChecks) {
    const { data, error } = await candidate
      .filters(
        supabase
          .from(candidate.table)
          .select("id")
      )
      .maybeSingle();

    if (!error && data) {
      return true;
    }
  }

  return false;
}

export async function canUserAccessStream({ stream, user }) {
  if (!stream) {
    return {
      allowed: false,
      reason: "missing_stream",
      message: "Stream not found."
    };
  }

  const accessType = normalizeAccessType(stream.access_type);
  const userId = user?.id || null;
  const creatorId = stream.creator_id || null;

  if (creatorId && userId && creatorId === userId) {
    return {
      allowed: true,
      reason: "creator",
      message: "Creator has direct access."
    };
  }

  if (accessType === "free") {
    return {
      allowed: true,
      reason: "free",
      message: "This stream is open to everyone."
    };
  }

  if (!userId) {
    if (accessType === "paid") {
      return {
        allowed: false,
        reason: "login_required_paid",
        message: "Log in first to unlock paid access."
      };
    }

    if (accessType === "vip") {
      return {
        allowed: false,
        reason: "login_required_vip",
        message: "Log in first to verify VIP access."
      };
    }

    if (accessType === "followers") {
      return {
        allowed: false,
        reason: "login_required_followers",
        message: "Log in first to verify follower access."
      };
    }
  }

  if (accessType === "paid") {
    const paid = await hasPaidAccess({
      streamId: stream.id,
      userId
    });

    return paid
      ? {
          allowed: true,
          reason: "paid_access",
          message: "Paid access confirmed."
        }
      : {
          allowed: false,
          reason: "purchase_required",
          message: "Purchase required to join this stream."
        };
  }

  if (accessType === "vip") {
    const vip = await hasVipAccess({
      creatorId,
      userId
    });

    return vip
      ? {
          allowed: true,
          reason: "vip_access",
          message: "VIP access confirmed."
        }
      : {
          allowed: false,
          reason: "vip_required",
          message: "This stream is limited to VIP members."
        };
  }

  if (accessType === "followers") {
    const following = await isFollowingCreator({
      creatorId,
      userId
    });

    return following
      ? {
          allowed: true,
          reason: "followers_access",
          message: "Follower access confirmed."
        }
      : {
          allowed: false,
          reason: "follow_required",
          message: "Follow this creator to join the stream."
        };
  }

  return {
    allowed: true,
    reason: "default",
    message: "Access granted."
  };
}

export async function getWatchAccessState({ stream, user }) {
  const result = await canUserAccessStream({ stream, user });
  const summary = buildAccessSummary(stream);

  return {
    ...result,
    accessType: summary.type,
    accessLabel: summary.label,
    accessDetail: summary.detail
  };
}
