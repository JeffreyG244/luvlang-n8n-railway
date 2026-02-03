// Environment configuration for LuvLang Mastering
// ═══════════════════════════════════════════════════════════════════════════
// Loads public environment variables from the /api/config endpoint
// ═══════════════════════════════════════════════════════════════════════════

console.log('📦 env-config.js loaded');

// Initialize global config object
try {
    window.__ENV__ = window.__ENV__ || {
        SUPABASE_URL: '',
        SUPABASE_ANON_KEY: '',
        STRIPE_PUBLIC_KEY: '',
        STRIPE_LINK_BASIC: '',
        STRIPE_LINK_ADVANCED: '',
        STRIPE_LINK_PREMIUM: '',
        STRIPE_PRICE_INSTANT: '',
        STRIPE_PRICE_PRECISION: '',
        STRIPE_PRICE_LEGENDARY: '',
        _loaded: false,
        _error: null
    };
    console.log('✅ window.__ENV__ initialized');
} catch (e) {
    console.error('❌ Failed to initialize window.__ENV__:', e);
}

// Load configuration from API
(async function loadConfig() {
    try {
        // Check if we're on localhost (development) or production
        const hostname = window.location.hostname;
        const isLocalhost = hostname === 'localhost' || hostname === '127.0.0.1';

        console.log('🌐 Current hostname:', hostname);
        console.log('🔧 Is localhost:', isLocalhost);

        if (isLocalhost) {
            console.log('🔧 Development mode (localhost) - skipping API config fetch');
            window.__ENV__._loaded = true;
            window.__ENV__._error = 'localhost';
            return;
        }

        // In production, always try to fetch config
        console.log('🔄 Fetching config from /api/config...');

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 second timeout

        const response = await fetch('/api/config', {
            signal: controller.signal,
            headers: {
                'Accept': 'application/json'
            }
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
            throw new Error(`Config API returned ${response.status}: ${response.statusText}`);
        }

        const config = await response.json();
        console.log('📦 Config received:', Object.keys(config).join(', '));

        // Update window.__ENV__ with fetched values
        Object.assign(window.__ENV__, config, { _loaded: true, _error: null });

        console.log('✅ Environment config loaded from API');
        console.log('   SUPABASE_URL:', window.__ENV__.SUPABASE_URL ? '✓ Set (' + window.__ENV__.SUPABASE_URL.substring(0, 30) + '...)' : '✗ Missing');
        console.log('   SUPABASE_ANON_KEY:', window.__ENV__.SUPABASE_ANON_KEY ? '✓ Set (length: ' + window.__ENV__.SUPABASE_ANON_KEY.length + ')' : '✗ Missing');
        console.log('   STRIPE_PUBLIC_KEY:', window.__ENV__.STRIPE_PUBLIC_KEY ? '✓ Set' : '✗ Missing');

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
        console.error('❌ Error loading config from API:', error.message);
        window.__ENV__._loaded = true;
        window.__ENV__._error = error.message;

        if (error.name === 'AbortError') {
            console.error('   Request timed out after 5 seconds');
        }

        // Still dispatch the event so scripts don't hang waiting
        window.dispatchEvent(new CustomEvent('envConfigLoaded', { detail: window.__ENV__, error: error.message }));
    }
})();
