// api/livekit-token.js
// RICH BIZNESS LIVEKIT TOKEN ENGINE — FINAL ADVANCED
// Works with Rich Bizness live.html + watch.html
// Uses live_streams as source of truth.

import crypto from "crypto";
import { createClient } from "@supabase/supabase-js";
import { AccessToken } from "livekit-server-sdk";

const SUPABASE_URL =
  process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;

const SUPABASE_SERVICE_ROLE_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY_NEW;

const LIVEKIT_API_KEY = process.env.LIVEKIT_API_KEY;
const LIVEKIT_API_SECRET = process.env.LIVEKIT_API_SECRET;
const LIVEKIT_URL = process.env.LIVEKIT_URL || process.env.NEXT_PUBLIC_LIVEKIT_URL;

const supabase =
  SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY
    ? createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
        auth: {
          persistSession: false,
          autoRefreshToken: false
        }
      })
    : null;

function send(res, status, data) {
  return res.status(status).json(data);
}

function cors(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader(
    "Access-Control-Allow-Headers",
    "Content-Type, Authorization, x-rich-bizness-client"
  );

  if (req.method === "OPTIONS") {
    res.status(200).end();
    return true;
  }

  return false;
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

  const clean = String(role || "").toLowerCase().trim();

  if (["host", "cohost", "guest", "moderator", "viewer"].includes(clean)) {
    return clean;
  }

  return "viewer";
}

function roleCanPublish(role) {
  return ["host", "cohost", "guest", "moderator"].includes(role);
}

function buildRoomName(stream) {
  return (
    stream?.room_name ||
    stream?.livekit_room_name ||
    stream?.slug ||
    `richbiz-live-${stream?.id || crypto.randomUUID()}`
  );
}

async function getUser(req) {
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

async function getProfile(userId) {
  const { data } = await supabase
    .from("profiles")
    .select("id, username, display_name, avatar_url, is_verified")
    .eq("id", userId)
    .maybeSingle();

  return data || null;
}

async function getStream({ streamId, roomName }) {
  if (!streamId && !roomName) {
    return { stream: null, error: "streamId or roomName is required" };
  }

  let query = supabase.from("live_streams").select("*").limit(1);

  if (streamId) {
    query = query.eq("id", streamId);
  } else {
    query = query.or(
      `room_name.eq.${roomName},livekit_room_name.eq.${roomName},slug.eq.${roomName}`
    );
  }

  const { data, error } = await query.maybeSingle();

  if (error) return { stream: null, error: error.message };
  if (!data) return { stream: null, error: "Stream not found" };

  return { stream: data, error: null };
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

async function getExistingMemberRole(streamId, userId, hostId) {
  if (userId === hostId) return "host";

  const { data } = await supabase
    .from("live_stream_members")
    .select("role, is_active")
    .eq("stream_id", streamId)
    .eq("user_id", userId)
    .maybeSingle();

  return normalizeRole(data?.role, false);
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

async function hasVipAccess(userId, creatorId) {
  const nowIso = new Date().toISOString();

  const { data } = await supabase
    .from("creator_memberships")
    .select("id, is_active, expires_at")
    .eq("creator_id", creatorId)
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
    .select("id, status, payment_status")
    .eq("stream_id", streamId)
    .or(`user_id.eq.${userId},buyer_id.eq.${userId}`)
    .or("status.in.(paid,complete,succeeded),payment_status.in.(paid,complete,succeeded)")
    .limit(1)
    .maybeSingle();

  return !!data;
}

async function canAccessStream(stream, userId, role) {
  if (!stream || !userId) {
    return {
      ok: false,
      accessType: "unknown",
      reason: "Missing stream or user"
    };
  }

  if (await isBanned(stream.id, userId)) {
    return {
      ok: false,
      accessType: "banned",
      reason: "You are banned from this stream"
    };
  }

  if (userId === stream.host_id) {
    return {
      ok: true,
      accessType: "host",
      reason: "Host access granted"
    };
  }

  if (["cohost", "guest", "moderator"].includes(role)) {
    return {
      ok: true,
      accessType: "staff",
      reason: "Room staff access granted"
    };
  }

  const accessType = String(stream.access_type || "free").toLowerCase();

  if (accessType === "free") {
    return {
      ok: true,
      accessType,
      reason: "Free stream"
    };
  }

  if (accessType === "followers") {
    const allowed = await followsHost(userId, stream.host_id);
    return {
      ok: allowed,
      accessType,
      reason: allowed ? "Follower access granted" : "Followers only"
    };
  }

  if (accessType === "vip") {
    const allowed = await hasVipAccess(userId, stream.host_id);
    return {
      ok: allowed,
      accessType,
      reason: allowed ? "VIP access granted" : "VIP access required"
    };
  }

  if (accessType === "paid") {
    const allowed = await hasPaidAccess(stream.id, userId);
    return {
      ok: allowed,
      accessType,
      reason: allowed ? "Paid access granted" : "Payment required"
    };
  }

  return {
    ok: false,
    accessType,
    reason: "Access denied"
  };
}

async function upsertMember(streamId, userId, role, hostId) {
  const payload = {
    stream_id: streamId,
    user_id: userId,
    role: normalizeRole(role, userId === hostId),
    is_active: true,
    joined_at: new Date().toISOString()
  };

  const { error } = await supabase
    .from("live_stream_members")
    .upsert(payload, {
      onConflict: "stream_id,user_id"
    });

  if (error) console.error("upsertMember error:", error.message);
}

async function createViewSession(streamId, userId) {
  const sessionToken = crypto.randomUUID();

  const { error } = await supabase.from("live_view_sessions").insert({
    stream_id: streamId,
    user_id: userId,
    session_token: sessionToken,
    joined_at: new Date().toISOString(),
    last_seen_at: new Date().toISOString()
  });

  if (error) console.error("createViewSession error:", error.message);

  return sessionToken;
}

async function refreshStreamCounts(streamId) {
  try {
    await supabase.rpc("refresh_stream_total_views", {
      _stream_id: streamId
    });
  } catch {}

  try {
    await supabase.rpc("refresh_stream_peak_viewers", {
      _stream_id: streamId
    });
  } catch {}
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

function buildMetadata({ user, profile, stream, role, permissions, sessionToken }) {
  return JSON.stringify({
    app: "rich-bizness",
    engine: "livekit-token-final",
    userId: user.id,
    email: user.email || null,
    username: profile?.username || null,
    displayName: profile?.display_name || null,
    avatarUrl: profile?.avatar_url || null,
    verified: !!profile?.is_verified,
    role,
    streamId: stream.id,
    roomName: buildRoomName(stream),
    hostId: stream.host_id,
    category: stream.category || "general",
    accessType: stream.access_type || "free",
    metaverse: {
      enabled: true,
      avatarReady: true,
      roomLayer: "rich-bizness-live",
      spaceType: "creator-party"
    },
    monetization: {
      stripeReady: true,
      accessType: stream.access_type || "free",
      ticketPriceCents:
        stream.ticket_price_cents || stream.price_cents || 0,
      currency: stream.currency || "usd"
    },
    permissions,
    sessionToken
  });
}

function getPermissions(role) {
  const publisher = roleCanPublish(role);
  const moderator = ["host", "cohost", "moderator"].includes(role);

  return {
    role,
    roomJoin: true,
    canSubscribe: true,
    canPublish: publisher,
    canPublishData: true,
    canUpdateOwnMetadata: true,
    canPublishSources: publisher
      ? ["camera", "microphone", "screen_share"]
      : [],
    ingressAdmin: role === "host",
    roomAdmin: moderator
  };
}

function createLiveKitToken({
  roomName,
  identity,
  participantName,
  metadata,
  permissions
}) {
  const token = new AccessToken(LIVEKIT_API_KEY, LIVEKIT_API_SECRET, {
    identity,
    name: participantName || identity,
    metadata,
    ttl: "2h"
  });

  token.addGrant({
    room: roomName,
    roomJoin: true,
    canSubscribe: permissions.canSubscribe,
    canPublish: permissions.canPublish,
    canPublishData: permissions.canPublishData,
    canUpdateOwnMetadata: permissions.canUpdateOwnMetadata,
    canPublishSources: permissions.canPublishSources,
    ingressAdmin: permissions.ingressAdmin,
    roomAdmin: permissions.roomAdmin
  });

  return token.toJwt();
}

export default async function handler(req, res) {
  if (cors(req, res)) return;

  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return send(res, 405, { error: "Method not allowed" });
  }

  try {
    if (
      !supabase ||
      !SUPABASE_URL ||
      !SUPABASE_SERVICE_ROLE_KEY ||
      !LIVEKIT_API_KEY ||
      !LIVEKIT_API_SECRET ||
      !LIVEKIT_URL
    ) {
      return send(res, 500, {
        error: "Missing required server environment variables",
        required: [
          "SUPABASE_URL",
          "SUPABASE_SERVICE_ROLE_KEY",
          "LIVEKIT_URL",
          "LIVEKIT_API_KEY",
          "LIVEKIT_API_SECRET"
        ]
      });
    }

    const { user, error: authError } = await getUser(req);

    if (authError || !user) {
      return send(res, 401, {
        error: authError || "Unauthorized"
      });
    }

    const {
      streamId = null,
      roomName = null,
      participantName = null,
      requestedRole = null,
      mode = "live",
      metaverse = {},
      client = "rich-bizness-web"
    } = req.body || {};

    const { stream, error: streamError } = await getStream({
      streamId,
      roomName
    });

    if (streamError || !stream) {
      return send(res, 404, {
        error: streamError || "Stream not found"
      });
    }

    const profile = await getProfile(user.id);

    const existingRole = await getExistingMemberRole(
      stream.id,
      user.id,
      stream.host_id
    );

    const finalRole = normalizeRole(
      requestedRole || existingRole,
      user.id === stream.host_id
    );

    const access = await canAccessStream(stream, user.id, finalRole);

    if (!access.ok) {
      return send(res, 403, {
        error: access.reason,
        accessType: access.accessType,
        stream: {
          id: stream.id,
          title: stream.title,
          roomName: buildRoomName(stream),
          accessType: stream.access_type,
          ticketPriceCents:
            stream.ticket_price_cents || stream.price_cents || 0,
          currency: stream.currency || "usd"
        }
      });
    }

    await upsertMember(stream.id, user.id, finalRole, stream.host_id);

    const sessionToken = await createViewSession(stream.id, user.id);

    await refreshStreamCounts(stream.id);

    const permissions = getPermissions(finalRole);
    const livekitRoomName = buildRoomName(stream);
    const identity = `${user.id}:${finalRole}`;
    const displayName = participantName || buildIdentity(profile, user);

    const metadata = buildMetadata({
      user,
      profile,
      stream,
      role: finalRole,
      permissions,
      sessionToken
    });

    const livekitToken = await createLiveKitToken({
      roomName: livekitRoomName,
      identity,
      participantName: displayName,
      metadata,
      permissions
    });

    return send(res, 200, {
      ok: true,

      token: livekitToken,
      livekitToken,

      wsUrl: LIVEKIT_URL,
      url: LIVEKIT_URL,

      roomName: livekitRoomName,
      identity,
      participantName: displayName,

      participant: {
        id: user.id,
        identity,
        name: displayName,
        role: finalRole,
        avatarUrl: profile?.avatar_url || null,
        verified: !!profile?.is_verified
      },

      stream: {
        id: stream.id,
        title: stream.title,
        description: stream.description,
        hostId: stream.host_id,
        category: stream.category,
        status: stream.status,
        roomName: livekitRoomName,
        slug: stream.slug || null,
        accessType: stream.access_type || "free",
        ticketPriceCents:
          stream.ticket_price_cents || stream.price_cents || 0,
        priceCents: stream.price_cents || stream.ticket_price_cents || 0,
        currency: stream.currency || "usd",
        allowChat:
          stream.allow_chat ?? stream.is_chat_enabled ?? true,
        allowTips: stream.allow_tips ?? true,
        allowReactions: stream.allow_reactions ?? true,
        isFeatured: !!stream.is_featured,
        viewerCount: stream.viewer_count || 0,
        peakViewers: stream.peak_viewers || 0,
        totalRevenueCents: stream.total_revenue_cents || 0
      },

      access,
      permissions,
      sessionToken,

      engine: {
        name: "Rich Bizness LiveKit Token Engine",
        version: "final-advanced-v1",
        mode,
        client,
        metaverseReady: true,
        stripeReady: true,
        liveStreamsSourceOfTruth: true
      },

      metaverse: {
        enabled: true,
        ...metaverse
      }
    });
  } catch (error) {
    console.error("[api/livekit-token] fatal error:", error);

    return send(res, 500, {
      error: "Server error creating LiveKit token",
      details: error?.message || "Unknown error"
    });
  }
}
