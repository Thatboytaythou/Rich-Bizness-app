import crypto from "crypto";
import { createClient } from "@supabase/supabase-js";
import { AccessToken } from "livekit-server-sdk";

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const LIVEKIT_API_KEY = process.env.LIVEKIT_API_KEY;
const LIVEKIT_API_SECRET = process.env.LIVEKIT_API_SECRET;
const LIVEKIT_URL =
  process.env.LIVEKIT_URL || process.env.NEXT_PUBLIC_LIVEKIT_URL || "";

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

function send(res, status, data) {
  return res.status(status).json(data);
}

function getBearerToken(req) {
  const header = req.headers.authorization || req.headers.Authorization || "";
  if (header.startsWith("Bearer ")) return header.slice(7).trim();
  if (req.body?.accessToken) return req.body.accessToken;
  if (req.body?.token) return req.body.token;
  return null;
}

function normalizeRole(role, isHost = false) {
  if (isHost) return "host";
  if (!role) return "viewer";

  const clean = String(role).toLowerCase().trim();
  if (["host", "cohost", "guest", "moderator", "viewer"].includes(clean)) {
    return clean;
  }
  return "viewer";
}

function getParticipantPermissions(role) {
  const isBroadcaster =
    role === "host" || role === "cohost" || role === "guest";
  const isModerator =
    role === "host" || role === "cohost" || role === "moderator";

  return {
    role,
    roomJoin: true,
    canSubscribe: true,
    canPublish: isBroadcaster,
    canPublishData: true,
    canUpdateOwnMetadata: true,
    canPublishSources: isBroadcaster
      ? ["camera", "microphone", "screen_share"]
      : [],
    ingressAdmin: role === "host",
    roomAdmin: isModerator,
  };
}

async function getAuthenticatedUser(req) {
  const jwt = getBearerToken(req);
  if (!jwt) {
    return { user: null, jwt: null, error: "Missing auth token" };
  }

  const { data, error } = await supabase.auth.getUser(jwt);
  if (error || !data?.user) {
    return { user: null, jwt: null, error: "Invalid auth token" };
  }

  return { user: data.user, jwt, error: null };
}

async function getStream({ streamId, roomName }) {
  if (!streamId && !roomName) {
    return { stream: null, error: "streamId or roomName is required" };
  }

  let query = supabase.from("live_streams").select("*").limit(1);

  if (streamId) {
    query = query.eq("id", streamId);
  } else {
    query = query.eq("room_name", roomName);
  }

  const { data, error } = await query.maybeSingle();

  if (error) {
    return { stream: null, error: error.message };
  }

  if (!data) {
    return { stream: null, error: "Stream not found" };
  }

  return { stream: data, error: null };
}

async function getProfile(userId) {
  const { data } = await supabase
    .from("profiles")
    .select("id, username, display_name, avatar_url, is_verified")
    .eq("id", userId)
    .maybeSingle();

  return data || null;
}

async function getMembershipRole(streamId, userId, hostId) {
  if (userId === hostId) return "host";

  const { data } = await supabase
    .from("live_stream_members")
    .select("role, is_active")
    .eq("stream_id", streamId)
    .eq("user_id", userId)
    .maybeSingle();

  return normalizeRole(data?.role, false);
}

async function isBanned(streamId, userId) {
  const { data } = await supabase
    .from("live_stream_bans")
    .select("id")
    .eq("stream_id", streamId)
    .eq("user_id", userId)
    .maybeSingle();

  return !!data;
}

async function followsHost(userId, hostId) {
  const { data } = await supabase
    .from("followers")
    .select("id")
    .eq("follower_id", userId)
    .eq("following_id", hostId)
    .maybeSingle();

  return !!data;
}

async function hasVipAccess(userId, hostId) {
  const nowIso = new Date().toISOString();

  const { data } = await supabase
    .from("creator_memberships")
    .select("id, is_active, expires_at")
    .eq("creator_id", hostId)
    .eq("user_id", userId)
    .eq("is_active", true)
    .or(`expires_at.is.null,expires_at.gt.${nowIso}`)
    .limit(1)
    .maybeSingle();

  return !!data;
}

async function hasPaidAccess(streamId, userId) {
  const { data } = await supabase
    .from("live_stream_purchases")
    .select("id, payment_status")
    .eq("stream_id", streamId)
    .eq("buyer_id", userId)
    .in("payment_status", ["paid", "complete", "succeeded"])
    .limit(1)
    .maybeSingle();

  return !!data;
}

async function canUserAccessStream(stream, userId, role) {
  if (!stream || !userId) {
    return { ok: false, reason: "Missing stream or user" };
  }

  if (userId === stream.host_id) {
    return { ok: true, reason: "Host access" };
  }

  if (["cohost", "guest", "moderator"].includes(role)) {
    return { ok: true, reason: "Stream staff access" };
  }

  const accessType = stream.access_type || "free";

  if (accessType === "free") {
    return { ok: true, reason: "Free stream" };
  }

  if (accessType === "followers") {
    const allowed = await followsHost(userId, stream.host_id);
    return {
      ok: allowed,
      reason: allowed ? "Follower access granted" : "Followers only",
    };
  }

  if (accessType === "vip") {
    const allowed = await hasVipAccess(userId, stream.host_id);
    return {
      ok: allowed,
      reason: allowed ? "VIP access granted" : "VIP required",
    };
  }

  if (accessType === "paid") {
    const allowed = await hasPaidAccess(stream.id, userId);
    return {
      ok: allowed,
      reason: allowed ? "Paid access granted" : "Payment required",
    };
  }

  return { ok: false, reason: "Access denied" };
}

async function upsertMember(streamId, userId, role, hostId) {
  const payload = {
    stream_id: streamId,
    user_id: userId,
    role: normalizeRole(role, userId === hostId),
    is_active: true,
    joined_at: new Date().toISOString(),
  };

  const { error } = await supabase
    .from("live_stream_members")
    .upsert(payload, {
      onConflict: "stream_id,user_id",
    });

  if (error) {
    console.error("upsertMember error:", error.message);
  }
}

async function createViewSession(streamId, userId) {
  const sessionToken = crypto.randomUUID();

  const { error } = await supabase.from("live_view_sessions").insert({
    stream_id: streamId,
    user_id: userId,
    session_token: sessionToken,
    joined_at: new Date().toISOString(),
    last_seen_at: new Date().toISOString(),
  });

  if (error) {
    console.error("createViewSession error:", error.message);
  }

  return sessionToken;
}

async function refreshPeakViewers(streamId) {
  const { error } = await supabase.rpc("refresh_stream_peak_viewers", {
    _stream_id: streamId,
  });

  if (error) {
    console.error("refreshPeakViewers error:", error.message);
  }
}

async function refreshTotalViews(streamId) {
  const { error } = await supabase.rpc("refresh_stream_total_views", {
    _stream_id: streamId,
  });

  if (error) {
    console.error("refreshTotalViews error:", error.message);
  }
}

function buildIdentity(profile, user) {
  return (
    profile?.username ||
    profile?.display_name ||
    user?.user_metadata?.username ||
    user?.email ||
    user?.id
  );
}

function buildParticipantName(profile, user) {
  return (
    profile?.display_name ||
    profile?.username ||
    user?.user_metadata?.full_name ||
    user?.email ||
    "Rich Bizness User"
  );
}

function buildMetadata({ user, profile, stream, role }) {
  return JSON.stringify({
    userId: user.id,
    email: user.email,
    username: profile?.username || null,
    displayName: profile?.display_name || null,
    avatarUrl: profile?.avatar_url || null,
    verified: !!profile?.is_verified,
    streamId: stream.id,
    roomName: stream.room_name,
    hostId: stream.host_id,
    role,
    accessType: stream.access_type || "free",
  });
}

function makeToken({
  identity,
  participantName,
  metadata,
  roomName,
  permissions,
}) {
  const token = new AccessToken(LIVEKIT_API_KEY, LIVEKIT_API_SECRET, {
    identity,
    name: participantName,
    metadata,
    ttl: "6h",
  });

  token.addGrant({
    room: roomName,
    roomJoin: permissions.roomJoin,
    canSubscribe: permissions.canSubscribe,
    canPublish: permissions.canPublish,
    canPublishData: permissions.canPublishData,
    canUpdateOwnMetadata: permissions.canUpdateOwnMetadata,
    ingressAdmin: permissions.ingressAdmin,
    roomAdmin: permissions.roomAdmin,
  });

  return token.toJwt();
}

export default async function handler(req, res) {
  if (req.method === "OPTIONS") {
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
    res.setHeader(
      "Access-Control-Allow-Headers",
      "Content-Type, Authorization"
    );
    return res.status(200).end();
  }

  if (req.method !== "POST") {
    return send(res, 405, { error: "Method not allowed" });
  }

  res.setHeader("Access-Control-Allow-Origin", "*");

  try {
    if (
      !SUPABASE_URL ||
      !SUPABASE_SERVICE_ROLE_KEY ||
      !LIVEKIT_API_KEY ||
      !LIVEKIT_API_SECRET ||
      !LIVEKIT_URL
    ) {
      return send(res, 500, {
        error: "Missing required server environment variables",
      });
    }

    const { user, error: authError } = await getAuthenticatedUser(req);
    if (authError || !user) {
      return send(res, 401, { error: authError || "Unauthorized" });
    }

    const streamId = req.body?.streamId || null;
    const roomNameInput = req.body?.roomName || null;
    const requestedRole = req.body?.role || null;

    const { stream, error: streamError } = await getStream({
      streamId,
      roomName: roomNameInput,
    });

    if (streamError || !stream) {
      return send(res, 404, { error: streamError || "Stream not found" });
    }

    if (!stream.room_name) {
      return send(res, 400, { error: "Stream missing room_name" });
    }

    const banned = await isBanned(stream.id, user.id);
    if (banned) {
      return send(res, 403, {
        error: "You are banned from this stream",
        accessType: stream.access_type || "free",
      });
    }

    const profile = await getProfile(user.id);

    const dbRole = await getMembershipRole(stream.id, user.id, stream.host_id);
    const role = normalizeRole(
      requestedRole || dbRole,
      user.id === stream.host_id
    );

    const access = await canUserAccessStream(stream, user.id, role);
    if (!access.ok) {
      return send(res, 403, {
        error: access.reason || "Access denied",
        accessType: stream.access_type || "free",
      });
    }

    const permissions = getParticipantPermissions(role);
    const identity = buildIdentity(profile, user);
    const participantName = buildParticipantName(profile, user);
    const metadata = buildMetadata({
      user,
      profile,
      stream,
      role,
    });

    const livekitToken = makeToken({
      roomName: stream.room_name,
      identity,
      participantName,
      metadata,
      permissions,
    });

    await upsertMember(stream.id, user.id, role, stream.host_id);
    const sessionToken = await createViewSession(stream.id, user.id);
    await refreshTotalViews(stream.id);
    await refreshPeakViewers(stream.id);

    return send(res, 200, {
      token: livekitToken,
      wsUrl: LIVEKIT_URL,
      roomName: stream.room_name,
      participant: {
        identity,
        name: participantName,
        role,
      },
      stream: {
        id: stream.id,
        title: stream.title,
        description: stream.description,
        hostId: stream.host_id,
        category: stream.category,
        status: stream.status,
        accessType: stream.access_type,
        ticketPriceCents: stream.ticket_price_cents || 0,
        allowChat: !!stream.allow_chat,
        allowTips: !!stream.allow_tips,
        allowReactions: !!stream.allow_reactions,
        isFeatured: !!stream.is_featured,
      },
      permissions,
      sessionToken,
    });
  } catch (error) {
    console.error("livekit-token fatal error:", error);
    return send(res, 500, {
      error: "Server error creating LiveKit token",
      details: error?.message || "Unknown error",
    });
  }
}
