/* server.js - Express server for Stripe checkout */
import dotenv from 'dotenv';
import express from 'express';
import Stripe from 'stripe';
import cors from 'cors';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

// Middleware
app.use(cors());
app.use(express.json());

// Create Stripe checkout session
app.post('/api/create-checkout-session', async (req, res) => {
  try {
    const { items } = req.body;

    // Validate items
    if (!items || items.length === 0) {
      return res.status(400).json({ error: 'Cart is empty' });
    }

    // Convert cart items to Stripe line items
    const lineItems = items.map(item => {
      // Build full image URL
      let imageUrl = null;
      if (item.image) {
        if (item.image.startsWith('http')) {
          // Already a full URL
          imageUrl = item.image;
        } else {
          // Relative path - make it absolute
          const cleanPath = item.image.startsWith('/') ? item.image : `/${item.image}`;
          imageUrl = `${process.env.CLIENT_URL}${cleanPath}`;
        }
      }
      
      console.log(`📸 Product: ${item.name}, Image URL: ${imageUrl}`);
      
      return {
        price_data: {
          currency: 'usd',
          product_data: {
            name: item.name,
            description: `Size: ${item.size}, Color: ${item.color}`,
            images: imageUrl ? [imageUrl] : [],
          },
          unit_amount: Math.round(item.price * 100), // Convert to cents
        },
        quantity: item.quantity,
      };
    });

    // Create Checkout Session
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: lineItems,
      mode: 'payment',
      success_url: `${process.env.CLIENT_URL}/success.html?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.CLIENT_URL}/cart.html`,
      shipping_address_collection: {
        allowed_countries: ['US', 'CA', 'GB', 'AU'], // Add countries you ship to
      },
      billing_address_collection: 'required',
    });

    res.json({ id: session.id });
  } catch (error) {
    console.error('Error creating checkout session:', error);
    res.status(500).json({ error: error.message });
  }
});

// Webhook endpoint for Stripe events (optional but recommended)
app.post('/api/webhook', express.raw({ type: 'application/json' }), async (req, res) => {
  const sig = req.headers['stripe-signature'];
  let event;

  try {
    event = stripe.webhooks.constructEvent(
      req.body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET
    );
  } catch (err) {
    console.error('Webhook signature verification failed:', err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  // Handle the event
  switch (event.type) {
    case 'checkout.session.completed':
      const session = event.data.object;
      console.log('Payment successful:', session.id);
      // TODO: Fulfill the order, send confirmation email, etc.
      break;
    
    case 'payment_intent.succeeded':
      const paymentIntent = event.data.object;
      console.log('PaymentIntent was successful:', paymentIntent.id);
      break;
    
    case 'payment_intent.payment_failed':
      const failedPayment = event.data.object;
      console.log('Payment failed:', failedPayment.id);
      break;

    default:
      console.log(`Unhandled event type ${event.type}`);
  }

  res.json({ received: true });
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'Server is running' });
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
  console.log(`Stripe webhook endpoint: http://localhost:${PORT}/api/webhook`);
});