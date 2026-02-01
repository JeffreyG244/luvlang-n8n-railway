/**
 * LUVLANG MASTERING - CONFIGURATION
 * Centralized configuration for API keys and settings
 *
 * SECURITY NOTES:
 * - Publishable keys (pk_*) are safe for client-side use
 * - Secret keys (sk_*) should NEVER be in client-side code
 * - In production, use environment variables via your hosting platform
 */

// ═══════════════════════════════════════════════════════════════════════════
// ENVIRONMENT DETECTION
// ═══════════════════════════════════════════════════════════════════════════

const LUVLANG_CONFIG = (() => {
    // Detect environment based on hostname
    const hostname = typeof window !== 'undefined' ? window.location.hostname : '';

    const isProduction = hostname.includes('vercel.app') ||
                         hostname.includes('luvlang') ||
                         hostname === 'luvlangmastering.vercel.app';

    const isDevelopment = hostname === 'localhost' ||
                          hostname === '127.0.0.1' ||
                          hostname.includes('192.168.');

    // ═══════════════════════════════════════════════════════════════════════════
    // STRIPE CONFIGURATION
    // ═══════════════════════════════════════════════════════════════════════════
    // Get your keys from: https://dashboard.stripe.com/apikeys
    //
    // PRODUCTION: Replace with your live publishable key (pk_live_...)
    // The key below is a TEST key for development only

    // ═══════════════════════════════════════════════════════════════════════════
    // PRE-LAUNCH MODE FLAG
    // ═══════════════════════════════════════════════════════════════════════════
    // Set to TRUE when you're ready to accept REAL payments
    const USE_LIVE_STRIPE = false;  // ← CHANGE TO true WHEN READY FOR REAL PAYMENTS

    const STRIPE_CONFIG = {
        // Current mode indicator
        isLiveMode: USE_LIVE_STRIPE,

        // Publishable key - uses test key until USE_LIVE_STRIPE is true
        publishableKey: USE_LIVE_STRIPE
            ? 'pk_live_51RXBWQP1VAtK8qeD0mVFhKAXdmduYYboPjx3DTxRkCclCQDS22P6saJHIEy81WmJV13WhDBKtp6ASeE3ItWWpTpz00SqDRVYxJ'
            : 'pk_test_51RXBWQP1VAtK8qeDRotSKHkuZF2UsKG18z4dDtoJM9MTtuR6Eh28ghQIGljfwQCyNN9fXHV8HwdvNJ8TmPizjagQ003L592cFz',

        // Payment links - TEST links for now
        // When USE_LIVE_STRIPE is true, replace these with live_ links
        paymentLinks: {
            basic: 'https://buy.stripe.com/test_bJeeVf4vKaqY6vDbYY7EQ03',      // $29
            advanced: 'https://buy.stripe.com/test_9B614pd2g42A1bjd327EQ01',   // $79
            premium: 'https://buy.stripe.com/test_5kQ9AVbYceHe6vDe767EQ02'     // $149
        },

        // Price IDs from Stripe Dashboard
        priceIds: {
            instant: USE_LIVE_STRIPE ? 'price_instant_live' : 'price_instant_999',
            precision: USE_LIVE_STRIPE ? 'price_precision_live' : 'price_precision_1999',
            legendary: USE_LIVE_STRIPE ? 'price_legendary_live' : 'price_legendary_2999'
        }
    };

    // ═══════════════════════════════════════════════════════════════════════════
    // SUPABASE CONFIGURATION
    // ═══════════════════════════════════════════════════════════════════════════
    // Get your keys from: https://app.supabase.com/project/_/settings/api

    const SUPABASE_CONFIG = {
        url: 'https://jzclawsctaczhgvfpssx.supabase.co',
        anonKey: 'sb_publishable_9Bf4Bt5Y91aGdpFfYs7Zrg_mozxhGDA'
    };

    // ═══════════════════════════════════════════════════════════════════════════
    // API ENDPOINTS
    // ═══════════════════════════════════════════════════════════════════════════

    const API_CONFIG = {
        // Supabase Edge Functions
        createCheckout: `${SUPABASE_CONFIG.url}/functions/v1/create-checkout`,
        verifyPurchase: `${SUPABASE_CONFIG.url}/functions/v1/verify-purchase`,
        stripeWebhook: `${SUPABASE_CONFIG.url}/functions/v1/stripe-webhook`
    };

    // ═══════════════════════════════════════════════════════════════════════════
    // FEATURE FLAGS
    // ═══════════════════════════════════════════════════════════════════════════

    const FEATURES = {
        // Disable demo mode in production - requires real payment
        demoMode: isDevelopment,

        // Enable server-side tier verification
        serverSideTierVerification: true,

        // Enable payment analytics
        paymentAnalytics: isProduction,

        // Debug logging
        debugLogging: isDevelopment
    };

    // ═══════════════════════════════════════════════════════════════════════════
    // RETURN CONFIGURATION OBJECT
    // ═══════════════════════════════════════════════════════════════════════════

    return {
        environment: isProduction ? 'production' : 'development',
        isProduction,
        isDevelopment,
        stripe: STRIPE_CONFIG,
        supabase: SUPABASE_CONFIG,
        api: API_CONFIG,
        features: FEATURES,

        // Helper to check if we're in test mode
        isTestMode: () => !isProduction,

        // Log configuration (only in development)
        logConfig: () => {
            if (isDevelopment) {
                console.log('🔧 LuvLang Config:', {
                    environment: isProduction ? 'production' : 'development',
                    stripeMode: isProduction ? 'live' : 'test',
                    demoMode: FEATURES.demoMode
                });
            }
        }
    };
})();

// Make available globally
if (typeof window !== 'undefined') {
    window.LUVLANG_CONFIG = LUVLANG_CONFIG;
}

// Log on load (development only)
if (typeof document !== 'undefined') {
    document.addEventListener('DOMContentLoaded', () => {
        LUVLANG_CONFIG.logConfig();
    });
}

console.log('✅ LuvLang configuration loaded');
