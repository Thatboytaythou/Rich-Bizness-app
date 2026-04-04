const { AccessToken } = require("livekit-server-sdk");

module.exports = async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const LIVEKIT_URL = process.env.LIVEKIT_URL;
    const LIVEKIT_API_KEY = process.env.LIVEKIT_API_KEY;
    const LIVEKIT_API_SECRET = process.env.LIVEKIT_API_SECRET;

    if (!LIVEKIT_URL || !LIVEKIT_API_KEY || !LIVEKIT_API_SECRET) {
      return res.status(500).json({
        error: "Missing LiveKit environment variables"
      });
    }

    const {
      room_name,
      participant_identity,
      participant_name
    } = req.body || {};

    if (!room_name) {
      return res.status(400).json({ error: "room_name is required" });
    }

    if (!participant_identity) {
      return res.status(400).json({ error: "participant_identity is required" });
    }

    const at = new AccessToken(
      LIVEKIT_API_KEY,
      LIVEKIT_API_SECRET,
      {
        identity: participant_identity,
        name: participant_name || participant_identity
      }
    );

    at.addGrant({
      roomJoin: true,
      room: room_name,
      canPublish: true,
      canSubscribe: true,
      canPublishData: true
    });

    const participant_token = await at.toJwt();

    return res.status(200).json({
      participant_token,
      server_url: LIVEKIT_URL
    });
  } catch (error) {
    console.error("LiveKit token error:", error);
    return res.status(500).json({
      error: error.message || "Failed to create LiveKit token"
    });
  }
};
