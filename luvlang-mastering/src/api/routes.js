/**
 * LUVLANG REST API - Route Definitions
 * RESTful endpoints for developer integrations
 * Version: 1.0.0
 *
 * NOTE: These route definitions are used by the client-side API layer.
 * Actual server-side handling is in server.js with the real audio engine.
 */

// API Version
const API_VERSION = 'v1';
const BASE_PATH = `/api/${API_VERSION}`;

/**
 * Route definitions with metadata
 */
const routes = {
    analyze: {
        method: 'POST',
        path: `${BASE_PATH}/analyze`,
        description: 'Analyze audio file for LUFS, true peak, dynamic range',
        auth: 'api_key',
        tier: 'free',
        rateLimit: { requests: 100, window: '1h' },
        accepts: 'multipart/form-data',
        fields: { audio: 'Audio file (WAV)' }
    },

    analyzeSpectrum: {
        method: 'POST',
        path: `${BASE_PATH}/analyze/spectrum`,
        description: 'Get 31-band ISO frequency analysis',
        auth: 'api_key',
        tier: 'free',
        rateLimit: { requests: 50, window: '1h' },
        accepts: 'multipart/form-data',
        fields: { audio: 'Audio file (WAV)', fftSize: 'FFT size (512-32768, default 8192)' }
    },

    master: {
        method: 'POST',
        path: `${BASE_PATH}/master`,
        description: 'Apply full mastering chain to audio',
        auth: 'api_key',
        tier: 'free',
        rateLimit: { requests: 20, window: '1h' },
        accepts: 'multipart/form-data',
        fields: { audio: 'Audio file (WAV)', settings: 'JSON mastering settings' }
    },

    masterAuto: {
        method: 'POST',
        path: `${BASE_PATH}/master/auto`,
        description: 'AI-powered automatic mastering with genre detection',
        auth: 'api_key',
        tier: 'pro',
        rateLimit: { requests: 10, window: '1h' },
        accepts: 'multipart/form-data',
        fields: { audio: 'Audio file (WAV)', reference: 'Reference track (optional)', targetPlatform: 'Platform target' }
    },

    listPresets: {
        method: 'GET',
        path: `${BASE_PATH}/presets`,
        description: 'List all available mastering presets',
        auth: 'api_key',
        tier: 'free',
        rateLimit: { requests: 500, window: '1h' },
        params: { category: 'Filter by category (music, podcast, content, custom)' }
    },

    getPreset: {
        method: 'GET',
        path: `${BASE_PATH}/presets/:id`,
        description: 'Get details of a specific preset',
        auth: 'api_key',
        tier: 'free'
    },

    createPreset: {
        method: 'POST',
        path: `${BASE_PATH}/presets`,
        description: 'Create a custom mastering preset',
        auth: 'api_key',
        tier: 'free',
        rateLimit: { requests: 50, window: '1h' },
        body: { name: 'Preset name (required)', settings: 'Settings object (required)', category: 'Category (default: custom)' }
    },

    export: {
        method: 'POST',
        path: `${BASE_PATH}/export`,
        description: 'Export audio in specified format',
        auth: 'api_key',
        tier: 'free',
        rateLimit: { requests: 20, window: '1h' },
        accepts: 'multipart/form-data',
        fields: {
            audio: 'Audio file (WAV)',
            format: 'wav|mp3|flac|aiff (default: wav)',
            bitDepth: '16|24|32 (default: 24)',
            sampleRate: '44100|48000|96000|192000 (default: 48000)',
            normalize: 'true|false (default: true)',
            dither: 'true|false (default: true)'
        }
    },

    batch: {
        method: 'POST',
        path: `${BASE_PATH}/batch`,
        description: 'Batch process multiple audio files',
        auth: 'api_key',
        tier: 'pro',
        rateLimit: { requests: 5, window: '1h' },
        accepts: 'multipart/form-data',
        fields: { files: 'Multiple audio files', settings: 'JSON mastering settings' }
    },

    getUser: {
        method: 'GET',
        path: `${BASE_PATH}/user`,
        description: 'Get current authenticated user info',
        auth: 'api_key',
        tier: 'free'
    },

    getUsage: {
        method: 'GET',
        path: `${BASE_PATH}/usage`,
        description: 'Get API usage statistics for current billing period',
        auth: 'api_key',
        tier: 'free'
    }
};

/**
 * Tier hierarchy for access control
 */
const TIER_HIERARCHY = ['free', 'pro', 'studio', 'enterprise'];

/**
 * Check if a user tier has access to a required tier
 */
function hasTierAccess(userTier, requiredTier) {
    const userIndex = TIER_HIERARCHY.indexOf(userTier);
    const requiredIndex = TIER_HIERARCHY.indexOf(requiredTier);
    return userIndex >= requiredIndex;
}

/**
 * Get tier limits
 */
function getTierLimits(tier) {
    const limits = {
        free: { requests: 100, audioMB: 500, batchSize: 1 },
        pro: { requests: 1000, audioMB: 5000, batchSize: 10 },
        studio: { requests: 10000, audioMB: 50000, batchSize: 50 },
        enterprise: { requests: -1, audioMB: -1, batchSize: -1 }
    };
    return limits[tier] || limits.free;
}

// Export
export {
    routes,
    API_VERSION,
    BASE_PATH,
    TIER_HIERARCHY,
    hasTierAccess,
    getTierLimits
};

if (typeof window !== 'undefined') {
    window.LuvLangAPI = { routes, API_VERSION, BASE_PATH, hasTierAccess, getTierLimits };
}
