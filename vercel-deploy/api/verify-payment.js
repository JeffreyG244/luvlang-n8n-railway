/**
 * Vercel Serverless Function: Verify Payment
 * Endpoint: POST /api/verify-payment
 */

const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

// Allowed origins for CORS
const ALLOWED_ORIGINS = [
    'https://luvlangmastering.vercel.app',
    'https://luvlang-mastering.vercel.app',
    'https://www.luvlang.studio',
    'https://luvlang.studio',
    'https://luvlang.org',
    'https://www.luvlang.org',
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
        const { sessionId } = req.body;

        if (!sessionId) {
            return res.status(400).json({ error: 'Session ID required' });
        }

        // Retrieve the checkout session
        const session = await stripe.checkout.sessions.retrieve(sessionId, {
            expand: ['payment_intent']
        });

        if (session.payment_status === 'paid') {
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
        console.error('Verification error:', error);
        res.status(500).json({
            success: false,
            error: 'Payment verification failed'
        });
    }
};
