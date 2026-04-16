import { AccessToken } from "livekit-server-sdk";

function json(res, status, payload) {
  return res.status(status).json(payload);
}

function normalizeBool(value, fallback = false) {
  if (typeof value === "boolean") return value;
  if (typeof value === "string") {
    const v = value.trim().toLowerCase();
    if (v === "true") return true;
    if (v === "false") return false;
  }
  return fallback;
}

function safeString(value, fallback = "") {
  return typeof value === "string" && value.trim() ? value.trim() : fallback;
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return json(res, 405, {
      ok: false,
      error: "Method not allowed. Use POST."
    });
  }

  try {
    const apiKey = process.env.LIVEKIT_API_KEY;
    const apiSecret = process.env.LIVEKIT_API_SECRET;
    const livekitUrl = process.env.LIVEKIT_URL;

    if (!livekitUrl) {
      return json(res, 500, {
        ok: false,
        error: "Missing LIVEKIT_URL."
      });
    }

    if (!apiKey || !apiSecret) {
      return json(res, 500, {
        ok: false,
        error: "Missing LIVEKIT_API_KEY or LIVEKIT_API_SECRET."
      });
    }

    const {
      roomName,
      participantIdentity,
      participantName,
      participantMetadata,
      participantAttributes,
      roomConfig,

      // optional permission flags
      canPublish = true,
      canPublishData = true,
      canSubscribe = true,
      canUpdateOwnMetadata = true,
      hidden = false,
      roomAdmin = false,
      roomRecord = false,

      // token lifetime override
      ttl = "6h"
    } = req.body || {};

    const finalRoomName = safeString(roomName, "rich-bizness-room");
    const finalIdentity = safeString(
      participantIdentity,
      `user-${Date.now()}`
    );
    const finalName = safeString(participantName, finalIdentity);

    const token = new AccessToken(apiKey, apiSecret, {
      identity: finalIdentity,
      name: finalName,
      metadata:
        typeof participantMetadata === "string"
          ? participantMetadata
          : JSON.stringify(participantMetadata || {}),
      attributes:
        participantAttributes && typeof participantAttributes === "object"
          ? Object.fromEntries(
              Object.entries(participantAttributes).map(([k, v]) => [
                String(k),
                String(v ?? "")
              ])
            )
          : undefined,
      ttl
    });

    token.addGrant({
      roomJoin: true,
      room: finalRoomName,
      canPublish: normalizeBool(canPublish, true),
      canPublishData: normalizeBool(canPublishData, true),
      canSubscribe: normalizeBool(canSubscribe, true),
      canUpdateOwnMetadata: normalizeBool(canUpdateOwnMetadata, true),
      hidden: normalizeBool(hidden, false),
      roomAdmin: normalizeBool(roomAdmin, false),
      roomRecord: normalizeBool(roomRecord, false)
    });

    // Optional room config passthrough for advanced flows / agents
    if (roomConfig && typeof roomConfig === "object") {
      token.roomConfig = roomConfig;
    }

    const jwt = await token.toJwt();

    return json(res, 200, {
      ok: true,
      serverUrl: livekitUrl,
      token: jwt,
      roomName: finalRoomName,
      participantIdentity: finalIdentity,
      participantName: finalName
    });
  } catch (error) {
    console.error("livekit-token error:", error);

    return json(res, 500, {
      ok: false,
      error: error?.message || "Failed to create LiveKit token."
    });
  }
}
