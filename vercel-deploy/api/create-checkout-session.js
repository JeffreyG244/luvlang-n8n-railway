/**
 * Vercel Serverless Function: Create Stripe Checkout Session
 * Endpoint: POST /api/create-checkout-session
 */

const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

// Tier pricing (in cents)
const TIER_PRICES = {
    basic: 1299,
    advanced: 2999,
    premium: 5999
};

const TIER_INFO = {
    basic: {
        name: 'BASIC',
        description: 'Essential mastering with MP3 export'
    },
    advanced: {
        name: 'ADVANCED',
        description: 'Professional mastering with WAV export'
    },
    premium: {
        name: 'PREMIUM',
        description: 'Studio-grade mastering suite with all features'
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

        // Validate redirect URLs — only allow our own frontend origin
        const frontendUrl = process.env.FRONTEND_URL || 'https://luvlangmastering.vercel.app';
        function isSafeRedirect(url) {
            if (!url) return false;
            try {
                const parsed = new URL(url);
                return ALLOWED_ORIGINS.includes(parsed.origin);
            } catch { return false; }
        }
        const safeSuccessUrl = isSafeRedirect(successUrl) ? successUrl : `${frontendUrl}/success?session_id={CHECKOUT_SESSION_ID}`;
        const safeCancelUrl = isSafeRedirect(cancelUrl) ? cancelUrl : `${frontendUrl}/cancel`;

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
            success_url: safeSuccessUrl,
            cancel_url: safeCancelUrl,
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
            error: 'Checkout session creation failed'
        });
    }
};
