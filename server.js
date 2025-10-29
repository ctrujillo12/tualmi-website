/* server.js - Optimized Express server for Stripe checkout + serving frontend */
import dotenv from 'dotenv';
import express from 'express';
import Stripe from 'stripe';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import bodyParser from 'body-parser'; // ✅ for webhook parsing

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// Stripe initialization
if (!process.env.STRIPE_SECRET_KEY) {
  console.error('❌ STRIPE_SECRET_KEY is not set!');
  process.exit(1);
}
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

// Determine __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const frontendPath = path.join(__dirname, 'frontend', 'dist');

// ✅ Middleware (order matters)
app.use(
  cors({
    origin: process.env.CLIENT_URL || '*',
    methods: ['GET', 'POST'],
    allowedHeaders: ['Content-Type'],
  })
);

// Parse JSON normally for most routes
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ✅ Webhook route needs *raw* body, so we move it ABOVE express.json() for that route
app.post(
  '/api/webhook',
  bodyParser.raw({ type: 'application/json' }),
  async (req, res) => {
    const sig = req.headers['stripe-signature'];
    if (!sig) return res.status(400).send('Missing Stripe signature');

    try {
      const event = stripe.webhooks.constructEvent(
        req.body,
        sig,
        process.env.STRIPE_WEBHOOK_SECRET
      );

      switch (event.type) {
        case 'checkout.session.completed':
          console.log('Payment successful:', event.data.object.id);
          break;
        case 'payment_intent.succeeded':
          console.log('PaymentIntent successful:', event.data.object.id);
          break;
        case 'payment_intent.payment_failed':
          console.log('Payment failed:', event.data.object.id);
          break;
        default:
          console.log(`Unhandled event type: ${event.type}`);
      }

      res.json({ received: true });
    } catch (err) {
      console.error('Webhook signature verification failed:', err.message);
      res.status(400).send(`Webhook Error: ${err.message}`);
    }
  }
);

// ✅ Serve frontend (after middleware)
app.use(express.static(frontendPath));

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'Server is running' });
});

// Create Stripe checkout session
app.post('/api/create-checkout-session', async (req, res) => {
  try {
    const { items } = req.body;

    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: 'Cart is empty' });
    }

    const lineItems = items.map((item) => {
      let imageUrl = null;
      if (item.image) {
        imageUrl = item.image.startsWith('http')
          ? item.image
          : `${process.env.CLIENT_URL}${item.image.startsWith('/') ? '' : '/'}${
              item.image
            }`;
      }

      return {
        price_data: {
          currency: 'usd',
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
      payment_method_types: ['card'],
      line_items: lineItems,
      mode: 'payment',
      success_url: `${process.env.CLIENT_URL}/success.html?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.CLIENT_URL}/cart.html`,
      shipping_address_collection: {
        allowed_countries: ['US', 'CA', 'GB', 'AU'],
      },
      billing_address_collection: 'required',
    });

    res.json({ id: session.id });
  } catch (error) {
    console.error('Error creating checkout session:', error);
    res.status(500).json({ error: error.message });
  }
});

// ✅ Fallback: send index.html for all other routes (after API routes)
app.get('*', (req, res) => {
  res.sendFile(path.join(frontendPath, 'index.html'));
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`Health check: ${process.env.CLIENT_URL || 'http://localhost'}${'/api/health'}`);
});
