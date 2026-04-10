import { AccessToken } from "livekit-server-sdk";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

function normalize(value) {
  return String(value || "").trim();
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const {
      roomName,
      participantName,
      role = "viewer",
      viewerUserId = ""
    } = req.body || {};

    if (!process.env.LIVEKIT_API_KEY || !process.env.LIVEKIT_API_SECRET) {
      return res.status(500).json({
        error: "Missing LIVEKIT_API_KEY or LIVEKIT_API_SECRET"
      });
    }

    if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
      return res.status(500).json({
        error: "Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY"
      });
    }

    const safeRoom = normalize(roomName);
    const safeName = normalize(participantName);
    const safeRole = normalize(role).toLowerCase();
    const safeViewerUserId = normalize(viewerUserId);

    if (!safeRoom) {
      return res.status(400).json({ error: "Missing roomName" });
    }

    if (!safeName) {
      return res.status(400).json({ error: "Missing participantName" });
    }

    if (!["host", "viewer"].includes(safeRole)) {
      return res.status(400).json({ error: "Invalid role" });
    }

    const roomRes = await supabase
      .from("live_rooms")
      .select("*")
      .eq("room_name", safeRoom)
      .maybeSingle();

    if (roomRes.error) throw roomRes.error;

    const roomRow = roomRes.data;
    if (!roomRow) {
      return res.status(404).json({ error: "Live room not found" });
    }

    if (!roomRow.is_live) {
      return res.status(403).json({ error: "Live room is not active" });
    }

    const hostUserId = normalize(roomRow.host_user_id);
    const isHost = safeRole === "host";

    if (isHost) {
      const expectedHostRoom = `richbizness-live-${hostUserId}`;

      if (safeRoom !== expectedHostRoom) {
        return res.status(403).json({
          error: "Host is not allowed to use this room"
        });
      }

      const token = new AccessToken(
        process.env.LIVEKIT_API_KEY,
        process.env.LIVEKIT_API_SECRET,
        {
          identity: safeName,
          ttl: "6h"
        }
      );

      token.addGrant({
        room: safeRoom,
        roomJoin: true,
        canPublish: true,
        canSubscribe: true,
        canPublishData: true
      });

      const jwt = await token.toJwt();

      return res.status(200).json({
        ok: true,
        token: jwt,
        room: safeRoom,
        identity: safeName,
        role: "host",
        access: roomRow.is_vip ? "vip_host" : "free_host"
      });
    }

    if (!roomRow.is_vip) {
      const token = new AccessToken(
        process.env.LIVEKIT_API_KEY,
        process.env.LIVEKIT_API_SECRET,
        {
          identity: safeName,
          ttl: "6h"
        }
      );

      token.addGrant({
        room: safeRoom,
        roomJoin: true,
        canPublish: false,
        canSubscribe: true,
        canPublishData: true
      });

      const jwt = await token.toJwt();

      return res.status(200).json({
        ok: true,
        token: jwt,
        room: safeRoom,
        identity: safeName,
        role: "viewer",
        access: "free_viewer"
      });
    }

    if (!safeViewerUserId) {
      return res.status(403).json({
        error: "VIP live access requires login"
      });
    }

    if (safeViewerUserId === hostUserId) {
      const token = new AccessToken(
        process.env.LIVEKIT_API_KEY,
        process.env.LIVEKIT_API_SECRET,
        {
          identity: safeName,
          ttl: "6h"
        }
      );

      token.addGrant({
        room: safeRoom,
        roomJoin: true,
        canPublish: false,
        canSubscribe: true,
        canPublishData: true
      });

      const jwt = await token.toJwt();

      return res.status(200).json({
        ok: true,
        token: jwt,
        room: safeRoom,
        identity: safeName,
        role: "viewer",
        access: "vip_host_view"
      });
    }

    const accessRes = await supabase
      .from("live_room_access")
      .select("*")
      .eq("room_name", safeRoom)
      .eq("viewer_user_id", safeViewerUserId)
      .eq("status", "paid")
      .maybeSingle();

    if (accessRes.error) throw accessRes.error;

    const accessRow = accessRes.data;

    if (!accessRow) {
      return res.status(403).json({
        error: "VIP live access required"
      });
    }

    const token = new AccessToken(
      process.env.LIVEKIT_API_KEY,
      process.env.LIVEKIT_API_SECRET,
      {
        identity: safeName,
        ttl: "6h"
      }
    );

    token.addGrant({
      room: safeRoom,
      roomJoin: true,
      canPublish: false,
      canSubscribe: true,
      canPublishData: true
    });

    const jwt = await token.toJwt();

    return res.status(200).json({
      ok: true,
      token: jwt,
      room: safeRoom,
      identity: safeName,
      role: "viewer",
      access: "vip_paid_viewer"
    });
  } catch (error) {
    console.error("livekit-token error", error);

    return res.status(500).json({
      error: error?.message || "Failed to generate LiveKit token"
    });
  }
}
