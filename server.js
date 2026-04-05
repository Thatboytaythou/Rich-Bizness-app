import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import Stripe from "stripe";
import { AccessToken } from "livekit-server-sdk";
import path from "path";
import { fileURLToPath } from "url";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
const stripeWebhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
const livekitApiKey = process.env.LIVEKIT_API_KEY;
const livekitApiSecret = process.env.LIVEKIT_API_SECRET;
const livekitUrl = process.env.LIVEKIT_URL;
const appUrl = process.env.APP_URL || `http://localhost:${PORT}`;
const stripePlatformFeeBps = Number(process.env.STRIPE_PLATFORM_FEE_BPS || 1000);

const stripe = stripeSecretKey ? new Stripe(stripeSecretKey) : null;

app.use(cors());
app.use("/api/stripe-webhook", express.raw({ type: "application/json" }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(__dirname));

function requireEnv(name, value) {
  if (!value) {
    throw new Error(`Missing environment variable: ${name}`);
  }
}

app.get("/api/health", (_req, res) => {
  res.json({
    ok: true,
    app: "rich-bizness-app",
    timestamp: new Date().toISOString(),
  });
});

app.post("/api/livekit-token", async (req, res) => {
  try {
    requireEnv("LIVEKIT_API_KEY", livekitApiKey);
    requireEnv("LIVEKIT_API_SECRET", livekitApiSecret);
    requireEnv("LIVEKIT_URL", livekitUrl);

    const {
      roomName,
      participantName,
      canPublish = true,
      canSubscribe = true,
      canPublishData = true,
    } = req.body || {};

    if (!roomName || !participantName) {
      return res.status(400).json({
        error: "roomName and participantName are required",
      });
    }

    const token = new AccessToken(livekitApiKey, livekitApiSecret, {
      identity: participantName,
      ttl: "2h",
    });

    token.addGrant({
      room: roomName,
      roomJoin: true,
      canPublish,
      canSubscribe,
      canPublishData,
    });

    const jwt = await token.toJwt();

    return res.json({
      token: jwt,
      url: livekitUrl,
      roomName,
      participantName,
    });
  } catch (error) {
    console.error("LiveKit token error:", error);
    return res.status(500).json({
      error: error.message || "Failed to create LiveKit token",
    });
  }
});

app.post("/api/create-checkout-session", async (req, res) => {
  try {
    requireEnv("STRIPE_SECRET_KEY", stripeSecretKey);

    const {
      buyerUserId,
      sellerUserId,
      contentType,
      contentId,
      title,
      amountCents,
      currency = "usd",
      quantity = 1,
    } = req.body || {};

    if (!buyerUserId || !sellerUserId || !contentType || !contentId || !title) {
      return res.status(400).json({
        error: "buyerUserId, sellerUserId, contentType, contentId, and title are required",
      });
    }

    if (!amountCents || Number(amountCents) <= 0) {
      return res.status(400).json({
        error: "amountCents must be greater than 0",
      });
    }

    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      payment_method_types: ["card"],
      line_items: [
        {
          quantity: Number(quantity) || 1,
          price_data: {
            currency: currency.toLowerCase(),
            unit_amount: Number(amountCents),
            product_data: {
              name: title,
              description: `${contentType} purchase`,
            },
          },
        },
      ],
      success_url: `${appUrl}/success.html?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${appUrl}/cancel.html`,
      metadata: {
        buyerUserId,
        sellerUserId,
        contentType,
        contentId: String(contentId),
        title,
      },
      payment_intent_data: {
        metadata: {
          buyerUserId,
          sellerUserId,
          contentType,
          contentId: String(contentId),
          title,
        },
        application_fee_amount: Math.round(
          Number(amountCents) * (stripePlatformFeeBps / 10000)
        ),
      },
    });

    return res.json({
      id: session.id,
      url: session.url,
    });
  } catch (error) {
    console.error("Stripe checkout error:", error);
    return res.status(500).json({
      error: error.message || "Failed to create checkout session",
    });
  }
});

app.post("/api/stripe-webhook", async (req, res) => {
  try {
    requireEnv("STRIPE_SECRET_KEY", stripeSecretKey);
    requireEnv("STRIPE_WEBHOOK_SECRET", stripeWebhookSecret);

    const signature = req.headers["stripe-signature"];
    if (!signature) {
      return res.status(400).send("Missing Stripe signature");
    }

    const event = stripe.webhooks.constructEvent(
      req.body,
      signature,
      stripeWebhookSecret
    );

    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object;
        console.log("Checkout completed:", {
          id: session.id,
          metadata: session.metadata,
          payment_status: session.payment_status,
        });

        // TODO:
        // 1. Save order in Supabase
        // 2. Mark status paid
        // 3. Unlock premium content if needed
        break;
      }

      case "payment_intent.succeeded": {
        const paymentIntent = event.data.object;
        console.log("Payment succeeded:", {
          id: paymentIntent.id,
          metadata: paymentIntent.metadata,
        });
        break;
      }

      case "checkout.session.expired": {
        const expiredSession = event.data.object;
        console.log("Checkout expired:", expiredSession.id);
        break;
      }

      default:
        console.log(`Unhandled Stripe event: ${event.type}`);
    }

    return res.json({ received: true });
  } catch (error) {
    console.error("Stripe webhook error:", error);
    return res.status(400).send(`Webhook Error: ${error.message}`);
  }
});

app.get("/", (_req, res) => {
  res.sendFile(path.join(__dirname, "index.html"));
});

app.get("*", (req, res) => {
  const requestedFile = path.join(__dirname, req.path);

  if (path.extname(req.path)) {
    return res.sendFile(requestedFile, (err) => {
      if (err) {
        res.status(404).send("Not found");
      }
    });
  }

  return res.status(404).send("Not found");
});

app.listen(PORT, () => {
  console.log(`Rich Bizness server running on port ${PORT}`);
});
