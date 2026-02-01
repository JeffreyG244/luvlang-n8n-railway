/**
 * Vercel Serverless Function: Create Stripe Checkout Session
 * Endpoint: POST /api/create-checkout-session
 */

const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

// Tier pricing (in cents)
const TIER_PRICES = {
    instant: 999,
    precision: 1999,
    legendary: 2999
};

const TIER_INFO = {
    instant: {
        name: 'INSTANT',
        description: 'AI-powered mastering with platform presets'
    },
    precision: {
        name: 'PRECISION',
        description: 'Advanced mastering with manual controls'
    },
    legendary: {
        name: 'LEGENDARY',
        description: 'Studio-grade mastering suite'
    }
};

// Allowed origins for CORS
const ALLOWED_ORIGINS = [
    'https://luvlangmastering.vercel.app',
    'https://luvlang-mastering.vercel.app',
    process.env.FRONTEND_URL
].filter(Boolean);

module.exports = async (req, res) => {
    // Handle CORS - restrict to allowed origins
    const origin = req.headers.origin;
    if (ALLOWED_ORIGINS.includes(origin)) {
        res.setHeader('Access-Control-Allow-Origin', origin);
    }
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    res.setHeader('Access-Control-Allow-Credentials', 'true');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        const { tier, sessionData, successUrl, cancelUrl } = req.body;

        // Validate tier
        if (!TIER_PRICES[tier]) {
            return res.status(400).json({ error: 'Invalid tier' });
        }

        const tierInfo = TIER_INFO[tier];
        const amount = TIER_PRICES[tier];

        // Create Stripe Checkout Session
        const session = await stripe.checkout.sessions.create({
            payment_method_types: ['card'],
            line_items: [{
                price_data: {
                    currency: 'usd',
                    product_data: {
                        name: `LuvLang ${tierInfo.name} Mastering`,
                        description: tierInfo.description
                    },
                    unit_amount: amount
                },
                quantity: 1
            }],
            mode: 'payment',
            success_url: successUrl || `${process.env.FRONTEND_URL}/success?session_id={CHECKOUT_SESSION_ID}`,
            cancel_url: cancelUrl || `${process.env.FRONTEND_URL}/cancel`,
            metadata: {
                tier: tier,
                filename: sessionData?.filename || 'untitled',
                targetLUFS: sessionData?.targetLUFS?.toString() || '-14',
                userId: sessionData?.userId || ''
            },
            allow_promotion_codes: true,
            // Disable Stripe Link (phone number collection for faster checkout)
            phone_number_collection: {
                enabled: false
            }
        });

        res.json({
            success: true,
            sessionId: session.id,
            url: session.url
        });

    } catch (error) {
        console.error('Checkout error:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
};
