/**
 * LUVLANG MASTERING - CONFIGURATION
 * Centralized configuration for API keys and settings
 *
 * SECURITY NOTES:
 * - All sensitive keys are loaded from environment variables
 * - Set environment variables in Vercel Dashboard -> Settings -> Environment Variables
 * - Never commit actual keys to source control
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
    // ENVIRONMENT VARIABLES (from window.__ENV__ set by env-config.js)
    // ═══════════════════════════════════════════════════════════════════════════
    const ENV = (typeof window !== 'undefined' && window.__ENV__) || {};

    // ═══════════════════════════════════════════════════════════════════════════
    // STRIPE CONFIGURATION
    // ═══════════════════════════════════════════════════════════════════════════
    // Set STRIPE_PUBLIC_KEY in Vercel Dashboard -> Settings -> Environment Variables

    const USE_LIVE_STRIPE = isProduction && ENV.STRIPE_PUBLIC_KEY?.startsWith('pk_live_');

    const STRIPE_CONFIG = {
        // Current mode indicator
        isLiveMode: USE_LIVE_STRIPE,

        // Publishable key from environment variable
        publishableKey: ENV.STRIPE_PUBLIC_KEY || '',

        // Payment links - configure in Vercel environment variables
        paymentLinks: {
            basic: ENV.STRIPE_LINK_BASIC || '',
            advanced: ENV.STRIPE_LINK_ADVANCED || '',
            premium: ENV.STRIPE_LINK_PREMIUM || ''
        },

        // Price IDs from environment variables
        priceIds: {
            instant: ENV.STRIPE_PRICE_INSTANT || '',
            precision: ENV.STRIPE_PRICE_PRECISION || '',
            legendary: ENV.STRIPE_PRICE_LEGENDARY || ''
        }
    };

    // ═══════════════════════════════════════════════════════════════════════════
    // SUPABASE CONFIGURATION
    // ═══════════════════════════════════════════════════════════════════════════
    // Set SUPABASE_URL and SUPABASE_ANON_KEY in Vercel Dashboard

    const SUPABASE_CONFIG = {
        url: ENV.SUPABASE_URL || '',
        anonKey: ENV.SUPABASE_ANON_KEY || ''
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
