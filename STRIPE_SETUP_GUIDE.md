# 💳 STRIPE PAYMENT SETUP GUIDE

## Complete Configuration for LuvLang Tier System

**Date:** 2025-12-23
**Purpose:** Enable per-song payments with Stripe for Basic ($9), Advanced ($19), and Premium ($39) tiers

---

## 🎯 Overview

Your LuvLang mastering engine now has a complete 3-tier commercial system with Stripe payment integration. This guide will help you:

1. Create a Stripe account
2. Get your API keys
3. Configure the frontend (already done!)
4. Set up a backend server for payment processing
5. Test the payment flow
6. Go live with real payments

---

## ✅ Quick Start Checklist

Before you begin:
- [ ] Create Stripe account at https://stripe.com
- [ ] Get publishable key and secret key
- [ ] Update `TIER_SYSTEM.js` with your publishable key
- [ ] Create backend server for payment processing (Node.js example provided)
- [ ] Test with Stripe test cards
- [ ] Switch to live mode when ready

---

## 📋 Step 1: Create Stripe Account

### Sign Up
1. Go to https://stripe.com
2. Click "Start now" or "Sign up"
3. Fill in business details:
   - **Business name:** LuvLang Mastering
   - **Industry:** Music Production / Audio Services
   - **Website:** your-domain.com
4. Complete verification process (may require ID and bank details)

### Navigate to Dashboard
1. Once logged in, go to: https://dashboard.stripe.com
2. You'll see two modes in the top-left:
   - **Test mode** (for development) 🧪
   - **Live mode** (for real payments) 💰

---

## 🔑 Step 2: Get Your API Keys

### Test Mode Keys (For Development)

1. In Stripe Dashboard, click the toggle to **Test mode**
2. Go to: **Developers → API keys**
3. You'll see two keys:

**Publishable key (Frontend):**
```
pk_test_51ABC123...
```
This goes in your JavaScript (safe to expose publicly)

**Secret key (Backend):**
```
sk_test_51ABC123...
```
This goes in your server (NEVER expose publicly!)

### Where to Put Them

**Frontend (TIER_SYSTEM.js):**

Open `/Users/jeffreygraves/luvlang-mastering/TIER_SYSTEM.js` and replace line 209:

```javascript
// REPLACE THIS:
const STRIPE_PUBLIC_KEY = 'pk_test_YOUR_PUBLISHABLE_KEY_HERE';

// WITH YOUR ACTUAL KEY:
const STRIPE_PUBLIC_KEY = 'pk_test_51ABC123def456...';
```

**Backend (server):**
You'll add the secret key to your backend server (see Step 3).

---

## 🖥️ Step 3: Create Backend Payment Server

Stripe requires a backend server to create payment intents (for security). Here's a complete Node.js example:

### Install Dependencies

```bash
cd /Users/jeffreygraves/luvlang-mastering
npm init -y
npm install express stripe cors dotenv
```

### Create `.env` File

Create `/Users/jeffreygraves/luvlang-mastering/.env`:

```bash
# Stripe Secret Key (TEST MODE)
STRIPE_SECRET_KEY=sk_test_YOUR_SECRET_KEY_HERE

# Server Port
PORT=3000
```

**IMPORTANT:** Add `.env` to your `.gitignore` to never commit secrets!

```bash
echo ".env" >> .gitignore
```

### Create Server File

Create `/Users/jeffreygraves/luvlang-mastering/payment-server.js`:

```javascript
/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   STRIPE PAYMENT SERVER - LuvLang Mastering Tier System
   Handles payment intents for Basic ($9), Advanced ($19), Premium ($39)
   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */

require('dotenv').config();
const express = require('express');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const cors = require('cors');

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Tier pricing
const TIER_PRICES = {
    basic: 900,      // $9.00 in cents
    advanced: 1900,  // $19.00 in cents
    premium: 3900    // $39.00 in cents
};

// ═══════════════════════════════════════════════════════════════════════════
// CREATE PAYMENT INTENT
// ═══════════════════════════════════════════════════════════════════════════

app.post('/api/create-payment-intent', async (req, res) => {
    try {
        const { tier, paymentMethodId } = req.body;

        // Validate tier
        if (!TIER_PRICES[tier]) {
            return res.status(400).json({ error: 'Invalid tier' });
        }

        const amount = TIER_PRICES[tier];

        console.log(`💳 Creating payment intent for ${tier} tier ($${amount / 100})`);

        // Create payment intent
        const paymentIntent = await stripe.paymentIntents.create({
            amount: amount,
            currency: 'usd',
            payment_method: paymentMethodId,
            confirm: true,
            description: `LuvLang Mastering - ${tier.toUpperCase()} Tier`,
            metadata: {
                tier: tier,
                product: 'mastering-engine',
                version: '1.0'
            }
        });

        console.log('✅ Payment successful:', paymentIntent.id);

        res.json({
            success: true,
            paymentIntentId: paymentIntent.id,
            status: paymentIntent.status
        });

    } catch (error) {
        console.error('❌ Payment failed:', error.message);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// ═══════════════════════════════════════════════════════════════════════════
// WEBHOOK HANDLER (Optional - for production)
// ═══════════════════════════════════════════════════════════════════════════

app.post('/api/stripe-webhook', express.raw({type: 'application/json'}), async (req, res) => {
    const sig = req.headers['stripe-signature'];
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

    try {
        const event = stripe.webhooks.constructEvent(req.body, sig, webhookSecret);

        // Handle successful payment
        if (event.type === 'payment_intent.succeeded') {
            const paymentIntent = event.data.object;
            console.log('💰 Payment succeeded:', paymentIntent.id);

            // TODO: Update database, send receipt email, etc.
        }

        res.json({ received: true });
    } catch (err) {
        console.error('⚠️ Webhook error:', err.message);
        return res.status(400).send(`Webhook Error: ${err.message}`);
    }
});

// ═══════════════════════════════════════════════════════════════════════════
// START SERVER
// ═══════════════════════════════════════════════════════════════════════════

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
    console.log('');
    console.log('═══════════════════════════════════════════════════════════');
    console.log('   💳 STRIPE PAYMENT SERVER - Running');
    console.log('═══════════════════════════════════════════════════════════');
    console.log(`   Port: ${PORT}`);
    console.log(`   Endpoint: http://localhost:${PORT}/api/create-payment-intent`);
    console.log('');
    console.log('   TIER PRICES:');
    console.log(`   - Basic:    $${TIER_PRICES.basic / 100}`);
    console.log(`   - Advanced: $${TIER_PRICES.advanced / 100}`);
    console.log(`   - Premium:  $${TIER_PRICES.premium / 100}`);
    console.log('═══════════════════════════════════════════════════════════');
});
```

### Update Frontend to Call Server

Open `/Users/jeffreygraves/luvlang-mastering/TIER_SYSTEM.js` and update the `handlePaymentSubmit` function (around line 273):

**REPLACE THIS:**
```javascript
// TODO: Send paymentMethod.id to your server to create a charge
// Example:
// const response = await fetch('/api/create-payment-intent', {
```

**WITH THIS:**
```javascript
// Send payment to server
const response = await fetch('http://localhost:3000/api/create-payment-intent', {
    method: 'POST',
    headers: {'Content-Type': 'application/json'},
    body: JSON.stringify({
        paymentMethodId: paymentMethod.id,
        tier: currentTier
    })
});

const result = await response.json();

if (!result.success) {
    throw new Error(result.error || 'Payment failed');
}
```

---

## 🧪 Step 4: Test Payment Flow

### Start the Server

```bash
cd /Users/jeffreygraves/luvlang-mastering
node payment-server.js
```

Expected output:
```
═══════════════════════════════════════════════════════════
   💳 STRIPE PAYMENT SERVER - Running
═══════════════════════════════════════════════════════════
   Port: 3000
   Endpoint: http://localhost:3000/api/create-payment-intent

   TIER PRICES:
   - Basic:    $9
   - Advanced: $19
   - Premium:  $39
═══════════════════════════════════════════════════════════
```

### Open Your App

1. Open `luvlang_LEGENDARY_COMPLETE.html` in browser
2. You should see the tier selector at the top
3. Click "EXPORT" button to open checkout

### Test Cards (Stripe Test Mode)

Use these test card numbers:

**Success:**
- Card: `4242 4242 4242 4242`
- Expiry: Any future date (e.g., `12/34`)
- CVC: Any 3 digits (e.g., `123`)
- ZIP: Any 5 digits (e.g., `12345`)

**Decline:**
- Card: `4000 0000 0000 0002`

**Requires 3D Secure:**
- Card: `4000 0027 6000 3184`

### Verify Payment

After submitting:
1. Check browser console for success message
2. Check server console for payment intent ID
3. Go to Stripe Dashboard → Payments to see the transaction

---

## 🚀 Step 5: Deploy to Production

### Option 1: Deploy Server to Railway

**Fastest deployment:**

```bash
# Install Railway CLI
npm install -g @railway/cli

# Login
railway login

# Deploy
cd /Users/jeffreygraves/luvlang-mastering
railway init
railway up

# Set environment variables
railway variables set STRIPE_SECRET_KEY=sk_live_YOUR_LIVE_KEY
```

Railway will give you a URL like: `https://your-app.railway.app`

Update `TIER_SYSTEM.js` to use this URL:
```javascript
const response = await fetch('https://your-app.railway.app/api/create-payment-intent', {
```

### Option 2: Deploy Server to Vercel

**For serverless:**

1. Install Vercel CLI: `npm install -g vercel`
2. Deploy: `vercel`
3. Set environment variable in Vercel dashboard
4. Update frontend URL

### Option 3: Deploy Server to AWS/DigitalOcean

**For full control:**

1. Create EC2 instance or Droplet
2. SSH in and clone your repo
3. Install Node.js and dependencies
4. Run with PM2: `pm2 start payment-server.js`
5. Configure nginx reverse proxy
6. Get SSL certificate with Let's Encrypt

---

## 🔐 Step 6: Switch to Live Mode

### When You're Ready for Real Payments

1. **Complete Stripe account activation:**
   - Verify identity
   - Add bank account
   - Complete business details

2. **Get live API keys:**
   - In Stripe Dashboard, toggle to **Live mode**
   - Go to **Developers → API keys**
   - Copy your live keys (start with `pk_live_` and `sk_live_`)

3. **Update keys:**
   - **Frontend:** Replace `pk_test_` with `pk_live_` in TIER_SYSTEM.js
   - **Backend:** Update `.env` with `sk_live_` secret key

4. **Test with real card (small amount):**
   - Use your own credit card
   - Test all three tiers
   - Verify charges in Stripe Dashboard

5. **Set up webhooks (recommended):**
   - In Stripe Dashboard → Developers → Webhooks
   - Add endpoint: `https://your-domain.com/api/stripe-webhook`
   - Select events: `payment_intent.succeeded`, `payment_intent.payment_failed`
   - Copy webhook secret to `.env` as `STRIPE_WEBHOOK_SECRET`

---

## 💰 Pricing Summary

| Tier | Price | Features |
|------|-------|----------|
| **BASIC** | $9 | MP3 export, 32-bit processing |
| **ADVANCED** | $19 | 24-bit WAV, Stereo Width control |
| **PREMIUM** | $39 | 64-bit engine, Multiband, M/S, DDP, Reference Match |

**Billing:** Per-song (one-time payment per export)
**Revisions:** Unlimited (same song can be re-exported)

---

## 🧪 Testing Checklist

Before going live:

### Frontend Tests
- [ ] Tier selector switches correctly (Basic/Advanced/Premium)
- [ ] Locked modules are dimmed and show tooltip on hover
- [ ] Power-on animation plays when unlocking modules
- [ ] Gold vacuum tube glow appears in Premium tier
- [ ] Export button opens checkout tray
- [ ] Checkout shows correct tier price and features

### Payment Tests
- [ ] Stripe card element renders correctly
- [ ] Test card (4242...) processes successfully
- [ ] Decline card (4000 0000 0000 0002) shows error
- [ ] Payment success closes checkout and enables export
- [ ] Server logs show payment intent ID

### Security Tests
- [ ] `.env` file is in `.gitignore`
- [ ] Secret key is NEVER in frontend code
- [ ] HTTPS is enabled on production server
- [ ] CORS is configured correctly

---

## 📊 Stripe Dashboard Guide

### Key Pages

**Payments:**
- https://dashboard.stripe.com/payments
- View all successful and failed transactions
- Filter by tier (search metadata)

**Customers:**
- https://dashboard.stripe.com/customers
- See repeat customers
- View customer lifetime value

**Disputes:**
- https://dashboard.stripe.com/disputes
- Handle chargebacks
- Upload evidence

**Reports:**
- https://dashboard.stripe.com/reports
- Download financial reports
- Track revenue by tier

---

## 🚨 Troubleshooting

### Error: "Stripe is not defined"
**Cause:** Stripe.js didn't load
**Fix:** Check `<script src="https://js.stripe.com/v3/"></script>` is in `<head>`

### Error: "Invalid publishable key"
**Cause:** Wrong key format
**Fix:** Key must start with `pk_test_` (test) or `pk_live_` (live)

### Error: "No such payment_method"
**Cause:** Payment method creation failed
**Fix:** Check card element is mounted and valid

### Payment succeeds but server shows error
**Cause:** CORS issue or wrong URL
**Fix:** Check `fetch()` URL matches server port (3000)

### Error: "Authentication required"
**Cause:** Secret key not set
**Fix:** Check `.env` file has correct `STRIPE_SECRET_KEY`

---

## 📚 Additional Resources

**Official Documentation:**
- Stripe Payments: https://stripe.com/docs/payments
- Stripe Elements: https://stripe.com/docs/stripe-js
- Payment Intents: https://stripe.com/docs/payments/payment-intents

**Video Tutorials:**
- Stripe Checkout Integration: https://www.youtube.com/watch?v=...
- Testing with Stripe: https://www.youtube.com/watch?v=...

**Community:**
- Stripe Discord: https://discord.gg/stripe
- Stack Overflow: https://stackoverflow.com/questions/tagged/stripe-payments

---

## ✅ Final Status

```
╔══════════════════════════════════════════════════════════╗
║                                                          ║
║   💳 STRIPE PAYMENT SYSTEM - READY TO CONFIGURE! 🎉     ║
║                                                          ║
║   ✅ Frontend integration complete                      ║
║   ✅ Tier system with module locking                    ║
║   ✅ Checkout tray with Stripe Elements                 ║
║   ✅ Backend server code provided                       ║
║   ✅ Test mode configuration ready                      ║
║                                                          ║
║   📋 TODO:                                               ║
║   1. Sign up at stripe.com                              ║
║   2. Get API keys                                        ║
║   3. Update TIER_SYSTEM.js with publishable key         ║
║   4. Create .env with secret key                        ║
║   5. Run payment-server.js                              ║
║   6. Test with 4242 4242 4242 4242                      ║
║   7. Deploy server to Railway/Vercel                    ║
║   8. Switch to live mode when ready                     ║
║                                                          ║
╚══════════════════════════════════════════════════════════╝
```

---

**Created:** 2025-12-23
**Your mastering engine is ready to accept payments!** 💰✨
