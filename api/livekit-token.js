import { AccessToken } from "livekit-server-sdk";

function getBaseUrl(req) {
  if (process.env.APP_URL) {
    return process.env.APP_URL.replace(/\/$/, "");
  }

  const proto = req.headers["x-forwarded-proto"] || "https";
  const host = req.headers.host;
  return `${proto}://${host}`;
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const {
      roomName,
      participantName,
      role = "viewer"
    } = req.body || {};

    // 🔐 ENV CHECK
    if (!process.env.LIVEKIT_API_KEY || !process.env.LIVEKIT_API_SECRET) {
      return res.status(500).json({
        error: "Missing LIVEKIT_API_KEY or LIVEKIT_API_SECRET"
      });
    }

    if (!roomName) {
      return res.status(400).json({ error: "Missing roomName" });
    }

    if (!participantName) {
      return res.status(400).json({ error: "Missing participantName" });
    }

    const safeRoom = String(roomName).trim();
    const safeName = String(participantName).trim();

    // 🎯 ROLE PERMISSIONS
    const isHost = role === "host";

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
      canPublish: isHost,
      canSubscribe: true,
      canPublishData: true
    });

    const jwt = await token.toJwt();

    return res.status(200).json({
      ok: true,
      token: jwt,
      room: safeRoom,
      identity: safeName,
      role: isHost ? "host" : "viewer"
    });

  } catch (error) {
    console.error("livekit-token error", error);

    return res.status(500).json({
      error: error?.message || "Failed to generate LiveKit token"
    });
  }
}
