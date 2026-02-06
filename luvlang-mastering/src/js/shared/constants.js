/**
 * LUVLANG MASTERING - SHARED CONSTANTS
 * Single source of truth for all values used across frontend and backend
 */

// ============================================
// BRAND COLORS
// ============================================

export const COLORS = {
    cyan: '#00d4ff',
    purple: '#b84fff',
    orange: '#ff8800',
    green: '#22c55e',
    red: '#ff3c3c',
    yellow: '#ffc800',
    bgDark: '#0a0a0f',
    bgCard: '#1a1a24',
    textPrimary: '#e0e0e0',
    textSecondary: '#a0a0a0',
    border: 'rgba(255,255,255,0.1)'
};

// ============================================
// EQ BAND DEFINITIONS
// ============================================

export const EQ_BANDS = [
    { frequency: 60,    label: 'Sub',        type: 'lowshelf',  q: 0.7 },
    { frequency: 170,   label: 'Bass',       type: 'peaking',   q: 1.0 },
    { frequency: 400,   label: 'Low Mid',    type: 'peaking',   q: 1.0 },
    { frequency: 1000,  label: 'Mid',        type: 'peaking',   q: 1.0 },
    { frequency: 2500,  label: 'Presence',   type: 'peaking',   q: 1.0 },
    { frequency: 6000,  label: 'Brilliance', type: 'peaking',   q: 1.0 },
    { frequency: 12000, label: 'Air',        type: 'highshelf', q: 0.7 }
];

export const EQ_LIMITS = {
    gainRange: { min: -12, max: 12 },
    qRange: { min: 0.3, max: 10 }
};

// ============================================
// DYNAMICS DEFAULTS
// ============================================

export const COMPRESSOR_DEFAULTS = {
    threshold: -18,
    ratio: 3,
    attack: 10,
    release: 100,
    knee: 6,
    makeupGain: 0
};

export const COMPRESSOR_LIMITS = {
    threshold: { min: -60, max: 0 },
    ratio: { min: 1, max: 20 },
    attack: { min: 0.1, max: 200 },
    release: { min: 10, max: 1000 },
    knee: { min: 0, max: 30 }
};

export const LIMITER_DEFAULTS = {
    ceiling: -0.3,
    release: 50,
    lookAhead: 5
};

export const LIMITER_LIMITS = {
    ceiling: { min: -6, max: 0 },
    release: { min: 10, max: 500 },
    lookAhead: { min: 0, max: 50 }
};

// ============================================
// AUDIO CONFIGURATION
// ============================================

export const AUDIO_CONFIG = {
    defaultSampleRate: 44100,
    supportedSampleRates: [44100, 48000, 96000, 192000],
    defaultBitDepth: 24,
    supportedBitDepths: [16, 24, 32],
    supportedFormats: ['wav', 'mp3', 'flac', 'aiff', 'm4a', 'ogg'],
    supportedExportFormats: ['wav', 'mp3', 'flac', 'aiff'],
    maxFileSizeMB: 500,
    bufferSize: 4096,
    fftSize: 8192,
    spectrogramFftSize: 2048,
    oversampling: '4x',
    lookAheadMs: 5
};

// ============================================
// LUFS TARGETS
// ============================================

export const PLATFORM_TARGETS = {
    spotify:     { lufs: -14, truePeak: -1.0, name: 'Spotify' },
    appleMusic:  { lufs: -16, truePeak: -1.0, name: 'Apple Music' },
    youtube:     { lufs: -14, truePeak: -1.0, name: 'YouTube' },
    tidal:       { lufs: -14, truePeak: -1.0, name: 'Tidal' },
    amazonMusic: { lufs: -14, truePeak: -1.0, name: 'Amazon Music' },
    soundcloud:  { lufs: -14, truePeak: -1.0, name: 'SoundCloud' },
    podcast:     { lufs: -16, truePeak: -2.0, name: 'Podcast' },
    broadcast:   { lufs: -24, truePeak: -2.0, name: 'TV Broadcast' }
};

export const GENRE_LUFS = {
    pop: -14, rock: -12, edm: -8, hiphop: -9,
    jazz: -16, classical: -18, acoustic: -16, metal: -10, podcast: -16
};

// ============================================
// SUBSCRIPTION TIERS (Single source of truth)
// ============================================

export const TIERS = {
    free: {
        name: 'Free',
        requestsPerMonth: 100,
        audioMbPerMonth: 500,
        maxFileSizeMb: 50,
        batchSize: 1,
        tracksPerMonth: 5,
        storageMB: 100,
        features: {
            analyze: true, master: true, autoMaster: false,
            batch: false, priority: false, collaboration: false,
            aiAutoMaster: false
        },
        priceMonthly: 0,
        priceYearly: 0
    },
    pro: {
        name: 'Pro',
        requestsPerMonth: 1000,
        audioMbPerMonth: 5000,
        maxFileSizeMb: 200,
        batchSize: 10,
        tracksPerMonth: 100,
        storageMB: 5000,
        features: {
            analyze: true, master: true, autoMaster: true,
            batch: true, priority: false, collaboration: true,
            aiAutoMaster: true
        },
        priceMonthly: 29,
        priceYearly: 290
    },
    studio: {
        name: 'Studio',
        requestsPerMonth: 10000,
        audioMbPerMonth: 50000,
        maxFileSizeMb: 500,
        batchSize: 50,
        tracksPerMonth: 1000,
        storageMB: 50000,
        features: {
            analyze: true, master: true, autoMaster: true,
            batch: true, priority: true, collaboration: true,
            aiAutoMaster: true
        },
        priceMonthly: 99,
        priceYearly: 990
    },
    enterprise: {
        name: 'Enterprise',
        requestsPerMonth: -1,
        audioMbPerMonth: -1,
        maxFileSizeMb: 500,
        batchSize: -1,
        tracksPerMonth: -1,
        storageMB: -1,
        features: {
            analyze: true, master: true, autoMaster: true,
            batch: true, priority: true, collaboration: true,
            aiAutoMaster: true, dedicated: true
        },
        priceMonthly: 499,
        priceYearly: 4990
    }
};

export const TIER_HIERARCHY = ['free', 'pro', 'studio', 'enterprise'];

export function hasTierAccess(userTier, requiredTier) {
    return TIER_HIERARCHY.indexOf(userTier) >= TIER_HIERARCHY.indexOf(requiredTier);
}

// ============================================
// PRESETS
// ============================================

export const PRESETS = {
    music: [
        { id: 'music-pop',      name: 'Pop/Top 40',  description: 'Radio-ready pop mastering' },
        { id: 'music-rock',     name: 'Rock',         description: 'Punchy rock mastering' },
        { id: 'music-edm',      name: 'EDM',          description: 'Maximum loudness EDM' },
        { id: 'music-hiphop',   name: 'Hip-Hop',      description: 'Heavy bass, punchy' },
        { id: 'music-jazz',     name: 'Jazz',          description: 'Dynamic, natural' },
        { id: 'music-classical',name: 'Classical',     description: 'Maximum dynamic range' },
        { id: 'music-acoustic', name: 'Acoustic',      description: 'Warm, natural' }
    ],
    podcast: [
        { id: 'podcast-interview',   name: 'Interview',    description: 'Multi-speaker clarity' },
        { id: 'podcast-solo',        name: 'Solo',          description: 'Single voice optimization' },
        { id: 'podcast-roundtable',  name: 'Roundtable',    description: '3+ speakers' },
        { id: 'podcast-narrative',   name: 'Narrative',     description: 'Storytelling style' },
        { id: 'podcast-educational', name: 'Educational',   description: 'Clear, focused' }
    ],
    content: [
        { id: 'content-youtube',   name: 'YouTube',    description: 'YouTube optimization' },
        { id: 'content-tiktok',    name: 'TikTok',     description: 'Short-form content' },
        { id: 'content-gaming',    name: 'Gaming',      description: 'Stream audio' },
        { id: 'content-voiceover', name: 'Voiceover',   description: 'Professional VO' }
    ]
};
