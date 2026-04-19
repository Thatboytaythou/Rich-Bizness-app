import { AccessToken } from "livekit-server-sdk";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const {
      roomName,
      participantName,
      participantMetadata,
      canPublish,
      canSubscribe
    } = req.body || {};

    if (!roomName) {
      return res.status(400).json({ error: "roomName is required" });
    }

    const apiKey = process.env.LIVEKIT_API_KEY;
    const apiSecret = process.env.LIVEKIT_API_SECRET;
    const livekitUrl = process.env.LIVEKIT_URL;

    if (!apiKey || !apiSecret || !livekitUrl) {
      return res.status(500).json({
        error: "Missing LIVEKIT_URL, LIVEKIT_API_KEY, or LIVEKIT_API_SECRET"
      });
    }

    const identity =
      participantName ||
      `rb-${Math.random().toString(36).slice(2, 10)}`;

    const at = new AccessToken(apiKey, apiSecret, {
      identity,
      name: identity,
      metadata: participantMetadata
        ? JSON.stringify(participantMetadata)
        : undefined,
      ttl: "2h"
    });

    at.addGrant({
      roomJoin: true,
      room: roomName,
      canPublish: canPublish !== false,
      canSubscribe: canSubscribe !== false
    });

    const token = await at.toJwt();

    return res.status(200).json({
      token,
      url: livekitUrl,
      roomName,
      identity
    });
  } catch (error) {
    console.error("[api/livekit-token] error:", error);
    return res.status(500).json({
      error: error.message || "Failed to create LiveKit token"
    });
  }
}
