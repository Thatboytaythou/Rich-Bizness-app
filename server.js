import express from "express";
import cors from "cors";
import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";
import Stripe from "stripe";
import { AccessToken } from "livekit-server-sdk";
import { createClient } from "@supabase/supabase-js";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const stripe = process.env.STRIPE_SECRET_KEY
  ? new Stripe(process.env.STRIPE_SECRET_KEY)
  : null;

const supabase =
  process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY
    ? createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)
    : null;

app.use(cors());
app.use(express.json());

app.use(express.static(__dirname));

app.get("/api/health", (req, res) => {
  try {
    res.status(200).json({
      status: "ok",
      message: "Server is running 🚀",
      env: {
        hasLivekitKey: !!process.env.LIVEKIT_API_KEY,
        hasLivekitSecret: !!process.env.LIVEKIT_API_SECRET,
        hasLivekitUrl: !!process.env.LIVEKIT_URL,
        hasStripeKey: !!process.env.STRIPE_SECRET_KEY,
        hasStripeWebhookSecret: !!process.env.STRIPE_WEBHOOK_SECRET,
        hasSupabaseUrl: !!process.env.SUPABASE_URL,
        hasSupabaseServiceRoleKey: !!process.env.SUPABASE_SERVICE_ROLE_KEY
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      status: "error",
      message: error.message
    });
  }
});

app.post("/api/livekit-token", async (req, res) => {
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

    token.addGrant({
      room: roomName,
      roomJoin: true,
      canPublish: role === "host",
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
    console.error("livekit-token error:", error);
    return res.status(500).json({
      error: error.message || "Failed to create LiveKit token"
    });
  }
});

app.post("/api/create-checkout-session", async (req, res) => {
  try {
    if (!stripe) {
      return res.status(500).json({
        error: "Stripe is not configured"
      });
    }

    const {
      mode = "content_purchase",
      buyerUserId = null,
      sellerUserId = null,
      contentType = "",
      contentId = null,
      title = "",
      amountCents = 0,
      currency = "usd",
      tipMessage = ""
    } = req.body || {};

    if (!sellerUserId) {
      return res.status(400).json({ error: "sellerUserId is required" });
    }

    if (!title) {
      return res.status(400).json({ error: "title is required" });
    }

    if (!amountCents || Number(amountCents) < 50) {
      return res.status(400).json({ error: "amountCents must be at least 50" });
    }

    const APP_URL = process.env.APP_URL || `http://localhost:${PORT}`;
    const PLATFORM_FEE_BPS = Number(process.env.STRIPE_PLATFORM_FEE_BPS || 1000);
    const applicationFeeAmount = Math.max(
      0,
      Math.round(Number(amountCents) * (PLATFORM_FEE_BPS / 10000))
    );

    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      payment_method_types: ["card"],
      line_items: [
        {
          quantity: 1,
          price_data: {
            currency: currency.toLowerCase(),
            unit_amount: Number(amountCents),
            product_data: {
              name: title,
              description:
                mode === "tip"
                  ? "Tip for creator"
                  : `${contentType || "content"} purchase`
            }
          }
        }
      ],
      success_url: `${APP_URL}/success.html?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${APP_URL}/cancel.html`,
      metadata: {
        mode,
        buyerUserId: buyerUserId || "",
        sellerUserId: sellerUserId || "",
        contentType: contentType || "",
        contentId: contentId ? String(contentId) : "",
        title,
        amountCents: String(amountCents),
        currency: currency.toLowerCase(),
        tipMessage: tipMessage || ""
      },
      payment_intent_data: {
        metadata: {
          mode,
          buyerUserId: buyerUserId || "",
          sellerUserId: sellerUserId || "",
          contentType: contentType || "",
          contentId: contentId ? String(contentId) : "",
          title,
          amountCents: String(amountCents),
          currency: currency.toLowerCase(),
          tipMessage: tipMessage || ""
        },
        application_fee_amount: applicationFeeAmount
      }
    });

    return res.status(200).json({
      id: session.id,
      url: session.url
    });
  } catch (error) {
    console.error("create-checkout-session error:", error);
    return res.status(500).json({
      error: error.message || "Failed to create checkout session"
    });
  }
});

app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "index.html"));
});

app.get("/:page", (req, res, next) => {
  const page = req.params.page;

  if (!page.endsWith(".html")) {
    return next();
  }

  res.sendFile(path.join(__dirname, page), (err) => {
    if (err) next();
  });
});

app.use((req, res) => {
  res.status(404).json({
    error: "Route not found"
  });
});

app.listen(PORT, () => {
  console.log(`Rich Bizness server running on http://localhost:${PORT}`);
});
