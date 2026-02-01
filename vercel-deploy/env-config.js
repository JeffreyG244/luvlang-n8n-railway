// Environment configuration for LuvLang Mastering
// ═══════════════════════════════════════════════════════════════════════════
// Loads public environment variables from the /api/config endpoint
// ═══════════════════════════════════════════════════════════════════════════

window.__ENV__ = {
    SUPABASE_URL: '',
    SUPABASE_ANON_KEY: '',
    STRIPE_PUBLIC_KEY: '',
    STRIPE_LINK_BASIC: '',
    STRIPE_LINK_ADVANCED: '',
    STRIPE_LINK_PREMIUM: '',
    STRIPE_PRICE_INSTANT: '',
    STRIPE_PRICE_PRECISION: '',
    STRIPE_PRICE_LEGENDARY: '',
    _loaded: false
};

// Load configuration from API
(async function loadConfig() {
    try {
        // Only fetch from API in production (on Vercel)
        const isProduction = window.location.hostname.includes('vercel.app') ||
                            window.location.hostname.includes('luvlang');

        if (!isProduction) {
            console.log('🔧 Development mode - using local config or defaults');
            return;
        }

        const response = await fetch('/api/config');

        if (!response.ok) {
            throw new Error(`Config API returned ${response.status}`);
        }

        const config = await response.json();

        // Update window.__ENV__ with fetched values
        Object.assign(window.__ENV__, config, { _loaded: true });

        console.log('✅ Environment config loaded from API');

        // Validate required configuration
        const required = ['SUPABASE_URL', 'SUPABASE_ANON_KEY', 'STRIPE_PUBLIC_KEY'];
        const missing = required.filter(key => !window.__ENV__[key]);

        if (missing.length > 0) {
            console.warn(
                '⚠️ LuvLang Mastering: Missing environment variables.\n' +
                'Set these in Vercel Dashboard -> Settings -> Environment Variables:\n' +
                missing.map(k => `  - ${k}`).join('\n')
            );
        } else {
            console.log('✅ All required environment variables configured');
        }

        // Dispatch event so other scripts know config is ready
        window.dispatchEvent(new CustomEvent('envConfigLoaded', { detail: window.__ENV__ }));

    } catch (error) {
        console.warn('⚠️ Could not load config from API:', error.message);
        console.warn('   This is normal during local development.');
    }
})();
