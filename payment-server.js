/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   STRIPE PAYMENT SERVER - LuvLang Mastering Premium Tier System
   Handles payment intents for INSTANT ($29), PROFESSIONAL ($79), LEGENDARY ($149)
   Per-Track Pricing Model
   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */

require('dotenv').config();
const express = require('express');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const cors = require('cors');

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Tier pricing - PREMIUM PER-TRACK PRICING
const TIER_PRICES = {
    instant: 2900,        // $29.00 in cents (per track)
    professional: 7900,   // $79.00 in cents (per track)
    legendary: 14900      // $149.00 in cents (per track)
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
            automatic_payment_methods: {
                enabled: true,
                allow_redirects: 'never'
            },
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

    if (!webhookSecret) {
        console.warn('⚠️ STRIPE_WEBHOOK_SECRET not set, skipping webhook verification');
        return res.json({ received: true });
    }

    try {
        const event = stripe.webhooks.constructEvent(req.body, sig, webhookSecret);

        // Handle successful payment
        if (event.type === 'payment_intent.succeeded') {
            const paymentIntent = event.data.object;
            console.log('💰 Payment succeeded:', paymentIntent.id);
            console.log('   Tier:', paymentIntent.metadata.tier);
            console.log('   Amount:', paymentIntent.amount / 100);

            // TODO: Update database, send receipt email, etc.
            // Example:
            // await updateUserTier(paymentIntent.metadata.userId, paymentIntent.metadata.tier);
            // await sendReceiptEmail(paymentIntent.receipt_email);
        }

        // Handle failed payment
        if (event.type === 'payment_intent.payment_failed') {
            const paymentIntent = event.data.object;
            console.error('❌ Payment failed:', paymentIntent.id);
            console.error('   Reason:', paymentIntent.last_payment_error?.message);

            // TODO: Send failure notification
        }

        res.json({ received: true });
    } catch (err) {
        console.error('⚠️ Webhook error:', err.message);
        return res.status(400).send(`Webhook Error: ${err.message}`);
    }
});

// ═══════════════════════════════════════════════════════════════════════════
// HEALTH CHECK
// ═══════════════════════════════════════════════════════════════════════════

app.get('/health', (req, res) => {
    res.json({
        status: 'ok',
        service: 'luvlang-payment-server',
        timestamp: new Date().toISOString()
    });
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
    console.log(`   Health: http://localhost:${PORT}/health`);
    console.log('');
    console.log('   TIER PRICES (Per-Track):');
    console.log(`   - INSTANT:      $${TIER_PRICES.instant / 100}`);
    console.log(`   - PROFESSIONAL: $${TIER_PRICES.professional / 100}`);
    console.log(`   - LEGENDARY:    $${TIER_PRICES.legendary / 100}`);
    console.log('');
    console.log('   ENVIRONMENT:');
    console.log(`   - Stripe key: ${process.env.STRIPE_SECRET_KEY ? '✅ Set' : '❌ Missing'}`);
    console.log(`   - Webhook secret: ${process.env.STRIPE_WEBHOOK_SECRET ? '✅ Set' : '⚠️ Optional'}`);
    console.log('═══════════════════════════════════════════════════════════');
    console.log('');

    if (!process.env.STRIPE_SECRET_KEY) {
        console.error('');
        console.error('❌ ERROR: STRIPE_SECRET_KEY not set!');
        console.error('');
        console.error('Create a .env file with:');
        console.error('STRIPE_SECRET_KEY=sk_test_YOUR_SECRET_KEY_HERE');
        console.error('');
        process.exit(1);
    }
});

// Handle graceful shutdown
process.on('SIGTERM', () => {
    console.log('⏹️ SIGTERM received, shutting down gracefully...');
    process.exit(0);
});

process.on('SIGINT', () => {
    console.log('⏹️ SIGINT received, shutting down gracefully...');
    process.exit(0);
});
