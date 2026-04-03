import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import Stripe from "stripe";

dotenv.config();

const app = express();

app.use(cors());
app.use(express.json());

const stripeSecretKey = process.env.STRIPE_SECRET_KEY;

if (!stripeSecretKey) {
  throw new Error("Missing STRIPE_SECRET_KEY in .env");
}

const stripe = new Stripe(stripeSecretKey);

app.get("/", (req, res) => {
  res.send("Stripe server is running.");
});

app.post("/create-checkout-session", async (req, res) => {
  try {
    const { title, price, image } = req.body;

    if (!title || !price) {
      return res.status(400).json({
        error: "Missing required fields: title and price"
      });
    }

    const amount = Number(price);

    if (Number.isNaN(amount) || amount <= 0) {
      return res.status(400).json({
        error: "Price must be a valid positive number"
      });
    }

    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      payment_method_types: ["card"],
      line_items: [
        {
          quantity: 1,
          price_data: {
            currency: "usd",
            unit_amount: amount,
            product_data: {
              name: title,
              images: image ? [image] : []
            }
          }
        }
      ],
      success_url: "http://127.0.0.1:5500/success.html",
      cancel_url: "http://127.0.0.1:5500/cancel.html"
    });

    return res.json({ id: session.id });
  } catch (error) {
    console.error("Stripe error:", error);
    return res.status(500).json({
      error: error.message || "Server error"
    });
  }
});

const PORT = 4242;

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
