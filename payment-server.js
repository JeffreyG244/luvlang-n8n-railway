/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   STRIPE PAYMENT SERVER - LuvLang Mastering Premium Tier System
   Handles Stripe Checkout Sessions for mastering tiers
   Per-Track Pricing: INSTANT ($9.99), PRECISION ($19.99), LEGENDARY ($29.99)
   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */

require('dotenv').config();
const express = require('express');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const cors = require('cors');
const crypto = require('crypto');

const app = express();

// CORS configuration
const corsOptions = {
    origin: process.env.ALLOWED_ORIGINS ? process.env.ALLOWED_ORIGINS.split(',') : [
        'http://localhost:3000',
        'http://localhost:8080',
        'http://127.0.0.1:3000',
        'https://luvlangmastering.vercel.app'
    ],
    credentials: true
};
app.use(cors(corsOptions));

// Tier pricing - PER-TRACK PRICING (in cents)
const TIER_PRICES = {
    instant: 999,         // $9.99 per track
    precision: 1999,      // $19.99 per track
    legendary: 2999       // $29.99 per track
};

// Tier metadata
const TIER_INFO = {
    instant: {
        name: 'INSTANT',
        description: 'AI-powered mastering with platform presets',
        features: ['LUFS normalization', 'Platform presets', '7-band EQ', 'WAV export']
    },
    precision: {
        name: 'PRECISION',
        description: 'Advanced mastering with manual controls',
        features: ['Everything in INSTANT', 'Transient detection', 'Noise removal', 'Multi-format export']
    },
    legendary: {
        name: 'LEGENDARY',
        description: 'Studio-grade mastering suite',
        features: ['Everything in PRECISION', 'Stem mastering', 'Reference matching', 'Mastering report']
    }
};

// ═══════════════════════════════════════════════════════════════════════════
// CREATE STRIPE CHECKOUT SESSION
// ═══════════════════════════════════════════════════════════════════════════

app.post('/api/create-checkout-session', async (req, res) => {
    try {
        const { tier, sessionData, successUrl, cancelUrl } = req.body;

        // Validate tier
        if (!TIER_PRICES[tier]) {
            return res.status(400).json({ error: 'Invalid tier' });
        }

        const tierInfo = TIER_INFO[tier];
        const amount = TIER_PRICES[tier];

        // Generate idempotency key from session data
        const idempotencyKey = crypto.createHash('sha256')
            .update(JSON.stringify({
                tier,
                filename: sessionData?.filename,
                timestamp: sessionData?.timestamp || Date.now()
            }))
            .digest('hex')
            .substring(0, 32);

        console.log(`💳 Creating checkout session for ${tierInfo.name} tier ($${amount / 100})`);

        // Create Stripe Checkout Session
        const session = await stripe.checkout.sessions.create({
            payment_method_types: ['card'],
            line_items: [{
                price_data: {
                    currency: 'usd',
                    product_data: {
                        name: `LuvLang ${tierInfo.name} Mastering`,
                        description: tierInfo.description,
                        images: ['https://luvlangmastering.vercel.app/images/logo.png'],
                        metadata: {
                            tier: tier,
                            features: tierInfo.features.join(', ')
                        }
                    },
                    unit_amount: amount
                },
                quantity: 1
            }],
            mode: 'payment',
            success_url: successUrl || `${process.env.FRONTEND_URL || 'http://localhost:8080'}/success?session_id={CHECKOUT_SESSION_ID}`,
            cancel_url: cancelUrl || `${process.env.FRONTEND_URL || 'http://localhost:8080'}/cancel`,
            metadata: {
                tier: tier,
                filename: sessionData?.filename || 'untitled',
                targetLUFS: sessionData?.targetLUFS?.toString() || '-14',
                finalLUFS: sessionData?.finalLUFS?.toString() || '',
                truePeak: sessionData?.truePeak?.toString() || '',
                userId: sessionData?.userId || ''
            },
            allow_promotion_codes: true,
            billing_address_collection: 'auto'
        }, {
            idempotencyKey: idempotencyKey
        });

        console.log('✅ Checkout session created:', session.id);

        res.json({
            success: true,
            sessionId: session.id,
            url: session.url
        });

    } catch (error) {
        console.error('❌ Checkout session failed:', error.message);

        // Handle Stripe-specific errors
        if (error.type === 'StripeCardError') {
            return res.status(400).json({ success: false, error: error.message });
        }

        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// ═══════════════════════════════════════════════════════════════════════════
// VERIFY PAYMENT (after successful checkout)
// ═══════════════════════════════════════════════════════════════════════════

app.post('/api/verify-payment', async (req, res) => {
    try {
        const { sessionId } = req.body;

        if (!sessionId) {
            return res.status(400).json({ error: 'Session ID required' });
        }

        // Retrieve the checkout session
        const session = await stripe.checkout.sessions.retrieve(sessionId, {
            expand: ['payment_intent', 'line_items']
        });

        if (session.payment_status === 'paid') {
            console.log('✅ Payment verified for session:', sessionId);

            res.json({
                success: true,
                verified: true,
                tier: session.metadata.tier,
                amount: session.amount_total / 100,
                customerEmail: session.customer_details?.email,
                metadata: session.metadata
            });
        } else {
            res.json({
                success: false,
                verified: false,
                status: session.payment_status
            });
        }

    } catch (error) {
        console.error('❌ Payment verification failed:', error.message);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// ═══════════════════════════════════════════════════════════════════════════
// LEGACY: CREATE PAYMENT INTENT (for embedded card forms)
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
// WEBHOOK HANDLER (Production-ready with signature verification)
// ═══════════════════════════════════════════════════════════════════════════

// NOTE: Webhook endpoint must use raw body parser, not JSON
app.post('/api/stripe-webhook', express.raw({type: 'application/json'}), async (req, res) => {
    const sig = req.headers['stripe-signature'];
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

    let event;

    // Verify webhook signature
    if (webhookSecret) {
        try {
            event = stripe.webhooks.constructEvent(req.body, sig, webhookSecret);
        } catch (err) {
            console.error('⚠️ Webhook signature verification failed:', err.message);
            return res.status(400).send(`Webhook Error: ${err.message}`);
        }
    } else {
        // For development without webhook secret (NOT recommended for production)
        console.warn('⚠️ STRIPE_WEBHOOK_SECRET not set - running in development mode');
        try {
            event = JSON.parse(req.body.toString());
        } catch (err) {
            return res.status(400).send('Invalid JSON');
        }
    }

    console.log(`📨 Webhook received: ${event.type}`);

    try {
        switch (event.type) {
            case 'checkout.session.completed': {
                const session = event.data.object;
                console.log('💰 Checkout completed:', session.id);
                console.log('   Tier:', session.metadata.tier);
                console.log('   Amount:', session.amount_total / 100);
                console.log('   Customer:', session.customer_details?.email);

                // Record purchase in database (via Supabase)
                await recordPurchase({
                    sessionId: session.id,
                    paymentIntentId: session.payment_intent,
                    tier: session.metadata.tier,
                    amount: session.amount_total / 100,
                    customerEmail: session.customer_details?.email,
                    userId: session.metadata.userId,
                    filename: session.metadata.filename,
                    targetLUFS: parseFloat(session.metadata.targetLUFS) || null,
                    finalLUFS: parseFloat(session.metadata.finalLUFS) || null,
                    truePeak: parseFloat(session.metadata.truePeak) || null
                });
                break;
            }

            case 'checkout.session.expired': {
                const session = event.data.object;
                console.log('⏰ Checkout session expired:', session.id);
                break;
            }

            case 'payment_intent.succeeded': {
                const paymentIntent = event.data.object;
                console.log('✅ Payment intent succeeded:', paymentIntent.id);
                break;
            }

            case 'payment_intent.payment_failed': {
                const paymentIntent = event.data.object;
                console.error('❌ Payment failed:', paymentIntent.id);
                console.error('   Reason:', paymentIntent.last_payment_error?.message);
                break;
            }

            case 'charge.refunded': {
                const charge = event.data.object;
                console.log('💸 Refund processed:', charge.id);
                // Update purchase status in database
                await updatePurchaseStatus(charge.payment_intent, 'refunded');
                break;
            }

            default:
                console.log(`ℹ️ Unhandled event type: ${event.type}`);
        }

        res.json({ received: true });

    } catch (err) {
        console.error('❌ Webhook handler error:', err.message);
        // Return 200 to acknowledge receipt (Stripe will retry on 4xx/5xx)
        res.status(200).json({ received: true, error: err.message });
    }
});

// ═══════════════════════════════════════════════════════════════════════════
// DATABASE HELPERS (Supabase integration)
// ═══════════════════════════════════════════════════════════════════════════

async function recordPurchase(data) {
    // If Supabase is configured, record the purchase
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;

    if (!supabaseUrl || !supabaseServiceKey) {
        console.log('ℹ️ Supabase not configured - skipping database recording');
        console.log('   Purchase data:', JSON.stringify(data, null, 2));
        return;
    }

    try {
        const response = await fetch(`${supabaseUrl}/rest/v1/purchases`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'apikey': supabaseServiceKey,
                'Authorization': `Bearer ${supabaseServiceKey}`,
                'Prefer': 'return=representation'
            },
            body: JSON.stringify({
                user_id: data.userId || null,
                tier_slug: data.tier,
                amount_paid: data.amount,
                currency: 'USD',
                payment_provider: 'stripe',
                payment_id: data.paymentIntentId,
                payment_status: 'succeeded',
                original_filename: data.filename,
                target_lufs: data.targetLUFS,
                final_lufs: data.finalLUFS,
                true_peak: data.truePeak,
                completed_at: new Date().toISOString()
            })
        });

        if (response.ok) {
            console.log('✅ Purchase recorded in database');
        } else {
            const error = await response.text();
            console.error('❌ Failed to record purchase:', error);
        }
    } catch (err) {
        console.error('❌ Database error:', err.message);
    }
}

async function updatePurchaseStatus(paymentIntentId, status) {
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;

    if (!supabaseUrl || !supabaseServiceKey) {
        console.log('ℹ️ Supabase not configured - skipping status update');
        return;
    }

    try {
        const response = await fetch(
            `${supabaseUrl}/rest/v1/purchases?payment_id=eq.${paymentIntentId}`,
            {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                    'apikey': supabaseServiceKey,
                    'Authorization': `Bearer ${supabaseServiceKey}`
                },
                body: JSON.stringify({ payment_status: status })
            }
        );

        if (response.ok) {
            console.log(`✅ Purchase status updated to: ${status}`);
        }
    } catch (err) {
        console.error('❌ Failed to update purchase status:', err.message);
    }
}

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
