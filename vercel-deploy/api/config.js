/**
 * Public Configuration API Endpoint
 * Returns client-safe environment variables
 *
 * These values are SAFE to expose:
 * - SUPABASE_URL: Public URL for API calls
 * - SUPABASE_ANON_KEY: Public anonymous key (RLS protected)
 * - STRIPE_PUBLIC_KEY: Publishable key (designed to be public)
 */

// Allowed origins for CORS
const ALLOWED_ORIGINS = [
    'https://luvlangmastering.vercel.app',
    'https://luvlang-mastering.vercel.app',
    'https://www.luvlang.studio',
    'https://luvlang.studio',
    process.env.FRONTEND_URL
].filter(Boolean);

module.exports = function handler(req, res) {
    // Handle CORS - restrict to allowed origins
    const origin = req.headers.origin;
    if (ALLOWED_ORIGINS.includes(origin)) {
        res.setHeader('Access-Control-Allow-Origin', origin);
    }
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Cache-Control', 'public, max-age=300'); // Cache for 5 minutes

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    if (req.method !== 'GET') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    // Return only PUBLIC environment variables
    // These are designed to be exposed to the client
    const publicConfig = {
        SUPABASE_URL: process.env.SUPABASE_URL || '',
        SUPABASE_ANON_KEY: process.env.SUPABASE_ANON_KEY || '',
        STRIPE_PUBLIC_KEY: process.env.STRIPE_PUBLIC_KEY || '',
        STRIPE_LINK_BASIC: process.env.STRIPE_LINK_BASIC || '',
        STRIPE_LINK_ADVANCED: process.env.STRIPE_LINK_ADVANCED || '',
        STRIPE_LINK_PREMIUM: process.env.STRIPE_LINK_PREMIUM || '',
        STRIPE_PRICE_INSTANT: process.env.STRIPE_PRICE_INSTANT || '',
        STRIPE_PRICE_PRECISION: process.env.STRIPE_PRICE_PRECISION || '',
        STRIPE_PRICE_LEGENDARY: process.env.STRIPE_PRICE_LEGENDARY || ''
    };

    res.status(200).json(publicConfig);
}
