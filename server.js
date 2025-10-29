// server.js – Express + Stripe backend for Netlify frontend hosting
import dotenv from "dotenv";
import express from "express";
import Stripe from "stripe";
import cors from "cors";
import path from "path";
import { fileURLToPath } from "url";
import bodyParser from "body-parser";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

/* ----------------------- STRIPE INITIALIZATION ----------------------- */
if (!process.env.STRIPE_SECRET_KEY) {
  console.error("❌ STRIPE_SECRET_KEY is not set!");
  process.exit(1);
}
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

/* ----------------------- PATHS ----------------------- */
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// You don’t need to serve the frontend from Render anymore
// since Netlify hosts it. So we skip express.static() entirely.

/* ----------------------- MIDDLEWARE ----------------------- */
app.use(
  cors({
    origin: process.env.CLIENT_URL || "https://your-netlify-site.netlify.app",
    methods: ["GET", "POST"],
    allowedHeaders: ["Content-Type"],
  })
);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

/* ----------------------- WEBHOOK ROUTE (raw body) ----------------------- */
app.post(
  "/api/webhook",
  bodyParser.raw({ type: "application/json" }),
  async (req, res) => {
    const sig = req.headers["stripe-signature"];
    if (!sig) return res.status(400).send("Missing Stripe signature");

    try {
      const event = stripe.webhooks.constructEvent(
        req.body,
        sig,
        process.env.STRIPE_WEBHOOK_SECRET
      );

      switch (event.type) {
        case "checkout.session.completed":
          console.log("✅ Payment successful:", event.data.object.id);
          break;
        case "payment_intent.succeeded":
          console.log("✅ PaymentIntent succeeded:", event.data.object.id);
          break;
        case "payment_intent.payment_failed":
          console.log("❌ Payment failed:", event.data.object.id);
          break;
        default:
          console.log(`Unhandled event type: ${event.type}`);
      }

      res.json({ received: true });
    } catch (err) {
      console.error("Webhook verification failed:", err.message);
      res.status(400).send(`Webhook Error: ${err.message}`);
    }
  }
);

/* ----------------------- HEALTH CHECK ----------------------- */
app.get("/api/health", (req, res) => {
  res.json({ status: "ok", message: "Server is running on Render" });
});

/* ----------------------- CHECKOUT SESSION ----------------------- */
app.post("/api/create-checkout-session", async (req, res) => {
  try {
    const { items } = req.body;
    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: "Cart is empty" });
    }

    const lineItems = items.map((item) => {
      let imageUrl = null;
      if (item.image) {
        imageUrl = item.image.startsWith("http")
          ? item.image
          : `${process.env.CLIENT_URL}${item.image.startsWith("/") ? "" : "/"}${
              item.image
            }`;
      }

      return {
        price_data: {
          currency: "usd",
          product_data: {
            name: item.name,
            description: `Size: ${item.size}, Color: ${item.color}`,
            images: imageUrl ? [imageUrl] : [],
          },
          unit_amount: Math.round(item.price * 100),
        },
        quantity: item.quantity,
      };
    });

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      line_items: lineItems,
      mode: "payment",
      success_url: `${process.env.CLIENT_URL}/success.html?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.CLIENT_URL}/cart.html`,
      shipping_address_collection: {
        allowed_countries: ["US", "CA", "GB", "AU"],
      },
      billing_address_collection: "required",
    });

    res.json({ id: session.id });
  } catch (error) {
    console.error("Error creating checkout session:", error);
    res.status(500).json({ error: error.message });
  }
});

/* ----------------------- SERVER START ----------------------- */
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`🌐 Client URL: ${process.env.CLIENT_URL}`);
});
