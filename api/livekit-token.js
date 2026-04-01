const { AccessToken } = require("livekit-server-sdk");

module.exports = async function handler(req, res) {
  try {
    const LIVEKIT_URL = process.env.LIVEKIT_URL;
    const LIVEKIT_API_KEY = process.env.LIVEKIT_API_KEY;
    const LIVEKIT_API_SECRET = process.env.LIVEKIT_API_SECRET;

    if (!LIVEKIT_URL || !LIVEKIT_API_KEY || !LIVEKIT_API_SECRET) {
      return res.status(500).json({
        error: "Missing LiveKit environment variables"
      });
    }

    const room = req.query.room || "richbiz-live";
    const username = req.query.username || `guest-${Date.now()}`;
    const canPublish = req.query.canPublish === "true";

    const at = new AccessToken(
      LIVEKIT_API_KEY,
      LIVEKIT_API_SECRET,
      { identity: username }
    );

    at.addGrant({
      roomJoin: true,
      room,
      canPublish,
      canSubscribe: true
    });

    const token = await at.toJwt();

    return res.status(200).json({
      token,
      url: LIVEKIT_URL
    });

  } catch (err) {
    console.error("LIVEKIT ERROR:", err);
    return res.status(500).json({
      error: err.message
    });
  }
};
