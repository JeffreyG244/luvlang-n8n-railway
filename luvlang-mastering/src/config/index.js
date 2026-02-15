/**
 * LUVLANG MASTERING - CONFIGURATION
 * Central configuration for all application settings
 * Uses shared constants as single source of truth for values
 * also used by the backend and components.
 */

import {
    EQ_BANDS, EQ_LIMITS,
    COMPRESSOR_DEFAULTS, COMPRESSOR_LIMITS,
    LIMITER_DEFAULTS, LIMITER_LIMITS,
    AUDIO_CONFIG,
    PLATFORM_TARGETS, GENRE_LUFS,
    PRESETS as SHARED_PRESETS
} from '../js/shared/constants.js';

// ============================================
// ENVIRONMENT DETECTION
// ============================================

const ENV = {
    isDev: window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1',
    isProd: window.location.hostname.includes('luvlang'),
    isTest: window.location.search.includes('test=true')
};

// ============================================
// API CONFIGURATION
// ============================================

const API = {
    version: 'v1',
    baseUrl: ENV.isProd ? 'https://api.luvlang.studio' : 'http://localhost:3001',
    timeout: 30000,
    retries: 3,
    endpoints: {
        analyze: '/api/v1/analyze',
        master: '/api/v1/master',
        masterAuto: '/api/v1/master/auto',
        presets: '/api/v1/presets',
        export: '/api/v1/export',
        batch: '/api/v1/batch',
        user: '/api/v1/user',
        usage: '/api/v1/usage'
    }
};

// ============================================
// SUPABASE CONFIGURATION
// ============================================

const SUPABASE = {
    // Set via environment or build-time injection
    url: (typeof process !== 'undefined' && process.env?.SUPABASE_URL)
        || (typeof window !== 'undefined' && window.__LUVLANG_ENV__?.SUPABASE_URL)
        || (ENV.isDev ? 'http://localhost:54321' : ''),
    anonKey: (typeof process !== 'undefined' && process.env?.SUPABASE_ANON_KEY)
        || (typeof window !== 'undefined' && window.__LUVLANG_ENV__?.SUPABASE_ANON_KEY)
        || '',
    tables: {
        profiles: 'profiles',
        projects: 'projects',
        projectShares: 'project_shares',
        projectComments: 'project_comments',
        subscriptions: 'subscriptions',
        usage: 'usage',
        aiProfiles: 'ai_profiles',
        presets: 'presets'
    }
};

// ============================================
// STRIPE CONFIGURATION
// ============================================

const STRIPE = {
    publicKey: (typeof process !== 'undefined' && process.env?.STRIPE_PUBLISHABLE_KEY)
        || (typeof window !== 'undefined' && window.__LUVLANG_ENV__?.STRIPE_PUBLISHABLE_KEY)
        || '',
    prices: {
        basic: 'price_basic_per_track',
        professional: 'price_professional_per_track',
        studio: 'price_studio_per_track'
    }
};

// ============================================
// AUDIO CONFIGURATION (from shared constants)
// ============================================

const AUDIO = {
    defaultSampleRate: AUDIO_CONFIG.defaultSampleRate,
    exportSampleRates: AUDIO_CONFIG.supportedSampleRates,
    defaultBitDepth: AUDIO_CONFIG.defaultBitDepth,
    exportBitDepths: AUDIO_CONFIG.supportedBitDepths,
    bufferSize: AUDIO_CONFIG.bufferSize,
    fftSize: AUDIO_CONFIG.fftSize,
    spectrogramFftSize: AUDIO_CONFIG.spectrogramFftSize,
    maxFileSizeMB: AUDIO_CONFIG.maxFileSizeMB,
    supportedFormats: AUDIO_CONFIG.supportedFormats,
    oversampling: AUDIO_CONFIG.oversampling,
    lookAheadMs: AUDIO_CONFIG.lookAheadMs
};

// ============================================
// EQ CONFIGURATION (from shared constants)
// ============================================

const EQ = {
    bands: EQ_BANDS,
    gainRange: EQ_LIMITS.gainRange,
    qRange: EQ_LIMITS.qRange
};

// ============================================
// DYNAMICS CONFIGURATION (from shared constants)
// ============================================

const DYNAMICS = {
    compressor: {
        threshold: { ...COMPRESSOR_LIMITS.threshold, default: COMPRESSOR_DEFAULTS.threshold },
        ratio: { ...COMPRESSOR_LIMITS.ratio, default: COMPRESSOR_DEFAULTS.ratio },
        attack: { ...COMPRESSOR_LIMITS.attack, default: COMPRESSOR_DEFAULTS.attack },
        release: { ...COMPRESSOR_LIMITS.release, default: COMPRESSOR_DEFAULTS.release },
        knee: { ...COMPRESSOR_LIMITS.knee, default: COMPRESSOR_DEFAULTS.knee }
    },
    limiter: {
        ceiling: { ...LIMITER_LIMITS.ceiling, default: LIMITER_DEFAULTS.ceiling },
        release: { ...LIMITER_LIMITS.release, default: LIMITER_DEFAULTS.release },
        lookAhead: { ...LIMITER_LIMITS.lookAhead, default: LIMITER_DEFAULTS.lookAhead }
    }
};

// ============================================
// LUFS TARGETS (from shared constants)
// ============================================

const LUFS_TARGETS = {
    platforms: PLATFORM_TARGETS,
    genres: GENRE_LUFS
};

// ============================================
// PRESETS CONFIGURATION (from shared constants)
// ============================================

const PRESETS = SHARED_PRESETS;

// ============================================
// AI CONFIGURATION
// ============================================

const AI = {
    learningRate: 0.3,
    minSamplesForPrediction: 5,
    maxHistorySize: 1000,
    genreDetection: {
        enabled: true,
        confidence_threshold: 0.6
    },
    referenceMatching: {
        bands: 31,
        damping: 0.7,
        maxCorrection: 5.0
    }
};

// ============================================
// UI CONFIGURATION
// ============================================

const UI = {
    themes: ['dark-chrome', 'dark', 'light', 'high-contrast'],
    defaultTheme: 'dark-chrome',

    // Animation settings
    animations: {
        enabled: true,
        duration: 200,
        easing: 'cubic-bezier(0.4, 0, 0.2, 1)'
    },

    // Meter update rates (ms)
    metering: {
        lufsUpdateRate: 50,
        peakUpdateRate: 16,
        spectrumUpdateRate: 33
    },

    // Panel defaults
    defaultPanels: ['eq', 'dynamics', 'master'],

    // Keyboard shortcuts
    shortcuts: {
        play: 'Space',
        stop: 'Escape',
        bypass: 'B',
        abCompare: 'A',
        undo: 'Ctrl+Z',
        redo: 'Ctrl+Shift+Z',
        export: 'Ctrl+E'
    }
};

// ============================================
// FEATURE FLAGS
// ============================================

const FEATURES = {
    aiAutoMaster: true,
    referenceMatching: true,
    multitrackMastering: true,
    batchProcessing: true,
    collaboration: true,
    advancedAnalytics: true,
    spectralRepair: false,   // Not yet implemented
    stemMastering: false,    // Not yet implemented
    codecPreview: false,     // Not yet implemented
    podcastSuite: true,

    // Beta features
    beta: {
        wasmAcceleration: false,  // WASM built but not yet integrated into pipeline
        webglVisualization: false,
        aiGenreDetection: true
    }
};

// ============================================
// EXPORT ALL CONFIGURATION
// ============================================

const CONFIG = {
    ENV,
    API,
    SUPABASE,
    STRIPE,
    AUDIO,
    EQ,
    DYNAMICS,
    LUFS_TARGETS,
    PRESETS,
    AI,
    UI,
    FEATURES
};

// Validate critical config in production
if (ENV.isProd) {
    if (!SUPABASE.url) console.warn('[Config] SUPABASE_URL is not set');
    if (!SUPABASE.anonKey) console.warn('[Config] SUPABASE_ANON_KEY is not set');
    if (!STRIPE.publicKey) console.warn('[Config] STRIPE_PUBLISHABLE_KEY is not set');
    Object.freeze(CONFIG);
}

// Export
if (typeof module !== 'undefined' && module.exports) {
    module.exports = CONFIG;
}

if (typeof window !== 'undefined') {
    window.LUVLANG_CONFIG = CONFIG;
}

export default CONFIG;
export {
    ENV,
    API,
    SUPABASE,
    STRIPE,
    AUDIO,
    EQ,
    DYNAMICS,
    LUFS_TARGETS,
    PRESETS,
    AI,
    UI,
    FEATURES
};
