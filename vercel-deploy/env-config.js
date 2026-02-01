// Environment configuration for LuvLang Mastering
// ═══════════════════════════════════════════════════════════════════════════
// REQUIRED: Set these values in Vercel Dashboard -> Settings -> Environment Variables
// ═══════════════════════════════════════════════════════════════════════════

window.__ENV__ = {
    // Supabase Configuration (from https://app.supabase.com/project/_/settings/api)
    SUPABASE_URL: '',           // e.g., 'https://xxxxx.supabase.co'
    SUPABASE_ANON_KEY: '',      // JWT token starting with 'eyJ...'

    // Stripe Configuration (from https://dashboard.stripe.com/apikeys)
    STRIPE_PUBLIC_KEY: '',      // Publishable key: 'pk_test_...' or 'pk_live_...'

    // Stripe Payment Links (from https://dashboard.stripe.com/payment-links)
    STRIPE_LINK_BASIC: '',      // Payment link for Basic tier
    STRIPE_LINK_ADVANCED: '',   // Payment link for Advanced tier
    STRIPE_LINK_PREMIUM: '',    // Payment link for Premium tier

    // Stripe Price IDs (from https://dashboard.stripe.com/products)
    STRIPE_PRICE_INSTANT: '',
    STRIPE_PRICE_PRECISION: '',
    STRIPE_PRICE_LEGENDARY: ''
};

// Validate required configuration
(function validateConfig() {
    const required = ['SUPABASE_URL', 'SUPABASE_ANON_KEY', 'STRIPE_PUBLIC_KEY'];
    const missing = required.filter(key => !window.__ENV__[key]);

    if (missing.length > 0) {
        console.warn(
            '⚠️ LuvLang Mastering: Missing environment variables.\n' +
            'Set these in Vercel Dashboard -> Settings -> Environment Variables:\n' +
            missing.map(k => `  - ${k}`).join('\n')
        );
    }
})();
