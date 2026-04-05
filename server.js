import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import { AccessToken } from "livekit-server-sdk";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

app.post("/get-livekit-token", async (req, res) => {
  try {
    const { roomName, identity, name, role } = req.body;

    if (!roomName || !identity) {
      return res.status(400).json({
        error: "roomName and identity are required"
      });
    }

    const apiKey = process.env.LIVEKIT_API_KEY;
    const apiSecret = process.env.LIVEKIT_API_SECRET;
    const livekitUrl = process.env.LIVEKIT_URL;

    if (!apiKey || !apiSecret || !livekitUrl) {
      return res.status(500).json({
        error: "Missing LiveKit environment variables"
      });
    }

    const token = new AccessToken(apiKey, apiSecret, {
      identity,
      name: name || identity
    });

    const isHost = role === "host";

    token.addGrant({
      roomJoin: true,
      room: roomName,
      canPublish: isHost,
      canSubscribe: true,
      canPublishData: true
    });

    const jwt = await token.toJwt();

    return res.json({
      token: jwt,
      url: livekitUrl
    });
  } catch (error) {
    console.error("Token error:", error);
    return res.status(500).json({
      error: "Failed to create LiveKit token"
    });
  }
});

app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
