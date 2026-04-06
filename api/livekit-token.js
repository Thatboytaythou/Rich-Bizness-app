import { AccessToken } from "livekit-server-sdk";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({
      error: "Method not allowed. Use POST."
    });
  }

  try {
    const LIVEKIT_API_KEY = process.env.LIVEKIT_API_KEY;
    const LIVEKIT_API_SECRET = process.env.LIVEKIT_API_SECRET;
    const LIVEKIT_URL = process.env.LIVEKIT_URL;

    if (!LIVEKIT_API_KEY || !LIVEKIT_API_SECRET || !LIVEKIT_URL) {
      return res.status(500).json({
        error: "Missing LiveKit environment variables."
      });
    }

    const {
      roomName,
      participantName,
      role = "viewer"
    } = req.body || {};

    const cleanRoomName = String(roomName || "").trim();
    const cleanParticipantName = String(participantName || "").trim();
    const cleanRole = String(role || "viewer").trim().toLowerCase();

    if (!cleanRoomName) {
      return res.status(400).json({
        error: "roomName is required."
      });
    }

    if (!cleanParticipantName) {
      return res.status(400).json({
        error: "participantName is required."
      });
    }

    const isHost = cleanRole === "host";

    const token = new AccessToken(
      LIVEKIT_API_KEY,
      LIVEKIT_API_SECRET,
      {
        identity: cleanParticipantName,
        name: cleanParticipantName,
        ttl: "2h"
      }
    );

    token.addGrant({
      roomJoin: true,
      room: cleanRoomName,
      canPublish: isHost,
      canPublishData: true,
      canSubscribe: true
    });

    const jwt = await token.toJwt();

    return res.status(200).json({
      token: jwt,
      url: LIVEKIT_URL,
      roomName: cleanRoomName,
      participantName: cleanParticipantName,
      role: cleanRole
    });
  } catch (error) {
    console.error("livekit-token error:", error);

    return res.status(500).json({
      error: error.message || "Failed to generate LiveKit token."
    });
  }
}
