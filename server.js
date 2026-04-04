import express from "express";
import cors from "cors";
import { AccessToken } from "livekit-server-sdk";

const app = express();

app.use(cors());
app.use(express.json());

const LIVEKIT_URL = process.env.LIVEKIT_URL || "YOUR_LIVEKIT_URL";
const LIVEKIT_API_KEY = process.env.LIVEKIT_API_KEY || "YOUR_LIVEKIT_API_KEY";
const LIVEKIT_API_SECRET = process.env.LIVEKIT_API_SECRET || "YOUR_LIVEKIT_API_SECRET";

app.post("/getToken", async (req, res) => {
  try {
    const {
      room_name,
      participant_identity,
      participant_name,
      participant_metadata,
      participant_attributes
    } = req.body || {};

    if (!room_name) {
      return res.status(400).json({ error: "room_name is required" });
    }

    if (!participant_identity) {
      return res.status(400).json({ error: "participant_identity is required" });
    }

    const token = new AccessToken(LIVEKIT_API_KEY, LIVEKIT_API_SECRET, {
      identity: participant_identity,
      name: participant_name || participant_identity,
      metadata: participant_metadata || "",
      attributes: participant_attributes || {},
      ttl: "1h"
    });

    token.addGrant({
      roomJoin: true,
      room: room_name,
      canPublish: true,
      canSubscribe: true,
      canPublishData: true
    });

    const jwt = await token.toJwt();

    return res.status(201).json({
      server_url: LIVEKIT_URL,
      participant_token: jwt
    });
  } catch (error) {
    console.error("LiveKit token error:", error);
    return res.status(500).json({
      error: "Failed to generate token"
    });
  }
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`LiveKit token server running on http://localhost:${PORT}`);
});
