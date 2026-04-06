import { AccessToken } from "livekit-server-sdk";

export default async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const LIVEKIT_API_KEY = process.env.LIVEKIT_API_KEY;
    const LIVEKIT_API_SECRET = process.env.LIVEKIT_API_SECRET;
    const LIVEKIT_URL = process.env.LIVEKIT_URL;

    if (!LIVEKIT_API_KEY || !LIVEKIT_API_SECRET || !LIVEKIT_URL) {
      return res.status(500).json({
        error: "Missing LiveKit environment variables"
      });
    }

    const {
      roomName,
      participantName,
      role = "viewer"
    } = req.body || {};

    if (!roomName || !participantName) {
      return res.status(400).json({
        error: "roomName and participantName are required"
      });
    }

    const token = new AccessToken(LIVEKIT_API_KEY, LIVEKIT_API_SECRET, {
      identity: participantName,
      ttl: "2h"
    });

    const isHost = role === "host";

    token.addGrant({
      room: roomName,
      roomJoin: true,
      canPublish: isHost,
      canPublishData: true,
      canSubscribe: true
    });

    const jwt = await token.toJwt();

    return res.status(200).json({
      token: jwt,
      url: LIVEKIT_URL,
      roomName,
      participantName,
      role
    });
  } catch (error) {
    console.error("LiveKit token error:", error);
    return res.status(500).json({
      error: error.message || "Failed to create LiveKit token"
    });
  }
}
