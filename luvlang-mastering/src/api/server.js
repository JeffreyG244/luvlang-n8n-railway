/**
 * LUVLANG API SERVER
 * Express-based REST API server for developer integrations
 * With real audio DSP, proper authentication, and security hardening
 */

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import multer from 'multer';
import crypto from 'crypto';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import {
    parseWav, encodeWav,
    calculateIntegratedLUFS, calculateShortTermLUFS, calculateMomentaryLUFS,
    calculateTruePeak, calculateDynamicRange, calculateCrestFactor,
    analyzeSpectrum, masterAudio, autoMaster, exportAudio
} from './audio-engine.js';
import config, { validateConfig } from './config.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// API Configuration
const API_VERSION = 'v1';
const PORT = config.port;

// Validate configuration on startup
try {
    validateConfig();
} catch (err) {
    if (config.isProd) {
        console.error('[FATAL]', err.message);
        process.exit(1);
    } else {
        console.warn('[Config]', err.message);
    }
}

// Initialize Express
const app = express();

// ============================================
// LOGGING UTILITY
// ============================================

const LOG_LEVELS = { error: 0, warn: 1, info: 2, debug: 3 };
const currentLogLevel = config.isDev ? LOG_LEVELS.debug : LOG_LEVELS.info;

const log = {
    error: (...args) => currentLogLevel >= LOG_LEVELS.error && console.error('[ERROR]', new Date().toISOString(), ...args),
    warn: (...args) => currentLogLevel >= LOG_LEVELS.warn && console.warn('[WARN]', new Date().toISOString(), ...args),
    info: (...args) => currentLogLevel >= LOG_LEVELS.info && console.log('[INFO]', new Date().toISOString(), ...args),
    debug: (...args) => currentLogLevel >= LOG_LEVELS.debug && console.log('[DEBUG]', new Date().toISOString(), ...args),
};

// ============================================
// MIDDLEWARE SETUP
// ============================================

// Security headers
app.use(helmet({
    crossOriginResourcePolicy: { policy: "cross-origin" },
    contentSecurityPolicy: config.isProd ? undefined : false,
    hsts: config.isProd ? { maxAge: 31536000, includeSubDomains: true } : false,
}));

// CORS configuration — NO wildcard fallback
const allowedOrigins = config.allowedOrigins.filter(o => o !== '*');
app.use(cors({
    origin: (origin, callback) => {
        // Allow requests with no origin (mobile apps, curl, server-to-server)
        if (!origin) return callback(null, true);

        if (config.isDev) return callback(null, true);

        if (allowedOrigins.length === 0) {
            return callback(new Error('ALLOWED_ORIGINS not configured'), false);
        }

        if (allowedOrigins.includes(origin)) {
            return callback(null, true);
        }
        return callback(new Error('CORS: Origin not allowed'), false);
    },
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-API-Key'],
    credentials: true
}));

// JSON body parsing — reduced limit (was 100MB, now 5MB for JSON)
app.use(express.json({ limit: '5mb' }));

// File upload handling with stricter validation
const upload = multer({
    storage: multer.memoryStorage(),
    limits: {
        fileSize: 500 * 1024 * 1024, // 500MB max per file
        files: 10,
        fields: 20,
        fieldSize: 1024 * 1024 // 1MB max for non-file fields
    },
    fileFilter: (req, file, cb) => {
        const allowedTypes = [
            'audio/wav', 'audio/x-wav', 'audio/wave',
            'audio/mpeg', 'audio/mp3',
            'audio/flac', 'audio/x-flac',
            'audio/aiff', 'audio/x-aiff'
        ];
        if (allowedTypes.includes(file.mimetype)) {
            cb(null, true);
        } else {
            cb(new Error(`Invalid file type: ${file.mimetype}. Allowed: WAV, MP3, FLAC, AIFF`), false);
        }
    }
});

// Global rate limiter
const globalLimiter = rateLimit({
    windowMs: config.rateLimit.windowMs,
    max: config.rateLimit.maxRequests,
    message: { success: false, error: 'Too many requests', retryAfter: '1 hour' },
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: (req) => req.headers['x-api-key'] || req.ip
});

app.use('/api', globalLimiter);

// ============================================
// API KEY AUTHENTICATION (Real implementation)
// ============================================

// In-memory store for development; use database in production
const apiKeyStore = new Map();

// Seed a dev key if in development
if (config.isDev) {
    const devKeyHash = crypto.createHash('sha256').update('lm_dev_test_key_12345').digest('hex');
    apiKeyStore.set(devKeyHash, {
        id: 'user_dev',
        email: 'developer@localhost',
        tier: 'studio',
        createdAt: new Date().toISOString()
    });
    log.info('Dev API key seeded: lm_dev_test_key_12345');
}

/**
 * Hash an API key for secure comparison
 */
function hashApiKey(key) {
    return crypto.createHash('sha256').update(key).digest('hex');
}

/**
 * Validate API key middleware — real hash-based lookup
 */
const validateApiKey = async (req, res, next) => {
    const apiKey = req.headers['x-api-key'];

    if (!apiKey) {
        return res.status(401).json({
            success: false,
            error: 'Missing API key. Include X-API-Key header.',
            docs: `/api/${API_VERSION}/docs`
        });
    }

    if (!apiKey.startsWith('lm_') || apiKey.length < 10) {
        return res.status(401).json({
            success: false,
            error: 'Invalid API key format. Keys start with lm_ and are at least 10 characters.'
        });
    }

    // Look up hashed key
    const keyHash = hashApiKey(apiKey);
    let user = apiKeyStore.get(keyHash);

    // In production, query Supabase
    if (!user && config.isProd) {
        user = await getUserByApiKeyFromDB(apiKey);
    }

    if (!user) {
        log.warn('Invalid API key attempt:', apiKey.slice(0, 6) + '***');
        return res.status(401).json({
            success: false,
            error: 'Invalid or expired API key'
        });
    }

    req.user = user;
    next();
};

/**
 * Server-side tier enforcement middleware
 */
const requireTier = (minTier) => (req, res, next) => {
    const tiers = ['free', 'pro', 'studio', 'enterprise'];
    const userTierIndex = tiers.indexOf(req.user.tier);
    const requiredTierIndex = tiers.indexOf(minTier);

    if (userTierIndex < 0 || userTierIndex < requiredTierIndex) {
        return res.status(403).json({
            success: false,
            error: `This endpoint requires ${minTier} tier or higher`,
            currentTier: req.user.tier,
            upgradeUrl: '/pricing'
        });
    }

    next();
};

// ============================================
// INPUT VALIDATION
// ============================================

function validateSettings(body) {
    let settings = {};
    if (body.settings) {
        if (typeof body.settings === 'string') {
            try {
                settings = JSON.parse(body.settings);
            } catch {
                return { error: 'Invalid settings JSON' };
            }
        } else if (typeof body.settings === 'object') {
            settings = body.settings;
        }
    }

    // Validate EQ bands if present
    if (settings.eq?.bands) {
        if (!Array.isArray(settings.eq.bands) || settings.eq.bands.length > 12) {
            return { error: 'EQ bands must be an array of up to 12 bands' };
        }
        for (const band of settings.eq.bands) {
            if (band.gain !== undefined && (band.gain < -24 || band.gain > 24)) {
                return { error: 'EQ gain must be between -24 and +24 dB' };
            }
            if (band.frequency !== undefined && (band.frequency < 20 || band.frequency > 20000)) {
                return { error: 'EQ frequency must be between 20 and 20000 Hz' };
            }
        }
    }

    // Validate dynamics
    if (settings.dynamics?.compressor) {
        const c = settings.dynamics.compressor;
        if (c.threshold !== undefined && (c.threshold < -60 || c.threshold > 0)) {
            return { error: 'Compressor threshold must be between -60 and 0 dB' };
        }
        if (c.ratio !== undefined && (c.ratio < 1 || c.ratio > 20)) {
            return { error: 'Compressor ratio must be between 1 and 20' };
        }
    }

    if (settings.dynamics?.limiter) {
        const l = settings.dynamics.limiter;
        if (l.ceiling !== undefined && (l.ceiling < -6 || l.ceiling > 0)) {
            return { error: 'Limiter ceiling must be between -6 and 0 dB' };
        }
    }

    return { settings };
}

function validateExportOptions(body) {
    const format = body.format || 'wav';
    const validFormats = ['wav', 'mp3', 'flac', 'aiff'];
    if (!validFormats.includes(format)) {
        return { error: `Invalid format. Must be one of: ${validFormats.join(', ')}` };
    }

    const bitDepth = parseInt(body.bitDepth) || 24;
    if (![16, 24, 32].includes(bitDepth)) {
        return { error: 'Bit depth must be 16, 24, or 32' };
    }

    const sampleRate = parseInt(body.sampleRate) || 48000;
    if (![44100, 48000, 96000, 192000].includes(sampleRate)) {
        return { error: 'Sample rate must be 44100, 48000, 96000, or 192000' };
    }

    return {
        format,
        bitDepth,
        sampleRate,
        normalize: body.normalize !== 'false' && body.normalize !== false,
        dither: body.dither !== 'false' && body.dither !== false
    };
}

// ============================================
// AUDIO HELPER — parse uploaded file
// ============================================

function parseUploadedAudio(fileBuffer) {
    // Currently supports WAV. For MP3/FLAC, a decoder library is needed.
    const uint8 = new Uint8Array(fileBuffer);

    // Check magic bytes
    const header = String.fromCharCode(uint8[0], uint8[1], uint8[2], uint8[3]);
    if (header !== 'RIFF') {
        throw new Error('Currently only WAV files are supported for server-side processing. MP3/FLAC support coming soon.');
    }

    return parseWav(uint8);
}

// ============================================
// API ROUTES
// ============================================

// Health check (no auth required)
app.get('/api/health', (req, res) => {
    res.json({
        status: 'healthy',
        version: API_VERSION,
        timestamp: new Date().toISOString(),
        uptime: Math.round(process.uptime())
    });
});

// HTML Documentation Page
app.get('/docs', (req, res) => {
    res.sendFile(join(__dirname, 'docs.html'));
});

// Developer Portal
app.get('/portal', (req, res) => {
    res.sendFile(join(__dirname, 'portal.html'));
});

// Redirect root to docs
app.get('/', (req, res) => {
    res.redirect('/docs');
});

// API Documentation (JSON)
app.get(`/api/${API_VERSION}/docs`, (req, res) => {
    res.json({
        name: 'LuvLang Mastering API',
        version: API_VERSION,
        baseUrl: `/api/${API_VERSION}`,
        authentication: {
            type: 'API Key',
            header: 'X-API-Key',
            format: 'lm_xxxxxxxxxxxxx'
        },
        endpoints: getEndpointDocs()
    });
});

// ============================================
// ANALYSIS ENDPOINTS
// ============================================

/**
 * POST /api/v1/analyze — Analyze audio file
 */
app.post(`/api/${API_VERSION}/analyze`,
    validateApiKey,
    upload.single('audio'),
    async (req, res) => {
        try {
            if (!req.file) {
                return res.status(400).json({ success: false, error: 'No audio file provided' });
            }

            const startTime = Date.now();
            const parsed = parseUploadedAudio(req.file.buffer);

            const analysis = {
                lufs: {
                    integrated: calculateIntegratedLUFS(parsed),
                    shortTerm: calculateShortTermLUFS(parsed),
                    momentary: calculateMomentaryLUFS(parsed)
                },
                truePeak: calculateTruePeak(parsed),
                dynamicRange: calculateDynamicRange(parsed),
                crestFactor: calculateCrestFactor(parsed),
                duration: parsed.duration,
                sampleRate: parsed.sampleRate,
                channels: parsed.numChannels,
                bitsPerSample: parsed.bitsPerSample,
                numSamples: parsed.numSamples
            };

            res.json({
                success: true,
                data: { filename: req.file.originalname, ...analysis },
                processingTime: Date.now() - startTime
            });

            log.info(`analyze: ${req.user.id} processed ${req.file.originalname} (${(req.file.size / 1024 / 1024).toFixed(1)}MB)`);

        } catch (error) {
            log.error('analyze failed:', error.message);
            res.status(500).json({
                success: false,
                error: config.isDev ? error.message : 'Analysis failed. Check your audio file format.'
            });
        }
    }
);

/**
 * POST /api/v1/analyze/spectrum — Frequency spectrum analysis
 */
app.post(`/api/${API_VERSION}/analyze/spectrum`,
    validateApiKey,
    upload.single('audio'),
    async (req, res) => {
        try {
            if (!req.file) {
                return res.status(400).json({ success: false, error: 'No audio file provided' });
            }

            let fftSize = parseInt(req.body.fftSize) || 8192;
            // Ensure power of 2
            fftSize = Math.pow(2, Math.round(Math.log2(Math.max(512, Math.min(32768, fftSize)))));

            const parsed = parseUploadedAudio(req.file.buffer);
            const spectrum = analyzeSpectrum(parsed, fftSize);

            res.json({ success: true, data: spectrum });
        } catch (error) {
            log.error('spectrum analysis failed:', error.message);
            res.status(500).json({
                success: false,
                error: config.isDev ? error.message : 'Spectrum analysis failed.'
            });
        }
    }
);

// ============================================
// MASTERING ENDPOINTS
// ============================================

/**
 * POST /api/v1/master — Apply mastering chain
 */
app.post(`/api/${API_VERSION}/master`,
    validateApiKey,
    upload.single('audio'),
    async (req, res) => {
        try {
            if (!req.file) {
                return res.status(400).json({ success: false, error: 'No audio file provided' });
            }

            const validation = validateSettings(req.body);
            if (validation.error) {
                return res.status(400).json({ success: false, error: validation.error });
            }

            const startTime = Date.now();
            const parsed = parseUploadedAudio(req.file.buffer);
            const result = masterAudio(parsed, validation.settings);

            // Encode processed audio
            const outputWav = encodeWav(result.channels, result.sampleRate, parsed.bitsPerSample);

            res.json({
                success: true,
                data: {
                    processedAudio: outputWav.toString('base64'),
                    analysis: result.analysis,
                    appliedSettings: result.appliedSettings
                },
                processingTime: Date.now() - startTime
            });

            log.info(`master: ${req.user.id} processed ${req.file.originalname}`);

        } catch (error) {
            log.error('mastering failed:', error.message);
            res.status(500).json({
                success: false,
                error: config.isDev ? error.message : 'Mastering failed. Check your audio file and settings.'
            });
        }
    }
);

/**
 * POST /api/v1/master/auto — AI auto-mastering
 */
app.post(`/api/${API_VERSION}/master/auto`,
    validateApiKey,
    requireTier('pro'),
    upload.fields([
        { name: 'audio', maxCount: 1 },
        { name: 'reference', maxCount: 1 }
    ]),
    async (req, res) => {
        try {
            const audioFile = req.files?.audio?.[0];
            if (!audioFile) {
                return res.status(400).json({ success: false, error: 'No audio file provided' });
            }

            const targetPlatform = req.body.targetPlatform || 'spotify';
            const validPlatforms = ['spotify', 'appleMusic', 'youtube', 'tidal', 'podcast', 'broadcast'];
            if (!validPlatforms.includes(targetPlatform)) {
                return res.status(400).json({
                    success: false,
                    error: `Invalid platform. Must be one of: ${validPlatforms.join(', ')}`
                });
            }

            const startTime = Date.now();
            const parsed = parseUploadedAudio(audioFile.buffer);
            const result = autoMaster(parsed, { targetPlatform });

            const outputWav = encodeWav(result.channels, result.sampleRate, parsed.bitsPerSample);

            res.json({
                success: true,
                data: {
                    processedAudio: outputWav.toString('base64'),
                    detectedGenre: result.detectedGenre,
                    targetPlatform: result.targetPlatform,
                    targetLUFS: result.targetLUFS,
                    inputAnalysis: result.inputAnalysis,
                    outputAnalysis: result.analysis,
                    autoSettings: result.autoSettings
                },
                processingTime: Date.now() - startTime
            });

            log.info(`auto-master: ${req.user.id} processed for ${targetPlatform}`);

        } catch (error) {
            log.error('auto-mastering failed:', error.message);
            res.status(500).json({
                success: false,
                error: config.isDev ? error.message : 'Auto-mastering failed.'
            });
        }
    }
);

// ============================================
// PRESET ENDPOINTS
// ============================================

const presetsStore = new Map([
    ['music-pop', { id: 'music-pop', name: 'Pop/Top 40', category: 'music', description: 'Radio-ready pop mastering', settings: { dynamics: { compressor: { threshold: -15, ratio: 3, attack: 10, release: 100 }, limiter: { ceiling: -0.3 } }, eq: { bands: [{ frequency: 60, type: 'lowshelf', gain: 1, q: 0.7 }, { frequency: 2500, type: 'peaking', gain: 1.5, q: 1.0 }, { frequency: 12000, type: 'highshelf', gain: 2, q: 0.7 }] } } }],
    ['music-rock', { id: 'music-rock', name: 'Rock', category: 'music', description: 'Punchy rock mastering', settings: { dynamics: { compressor: { threshold: -12, ratio: 4, attack: 5, release: 80 }, limiter: { ceiling: -0.3 } }, eq: { bands: [{ frequency: 60, type: 'lowshelf', gain: 2, q: 0.7 }, { frequency: 400, type: 'peaking', gain: -2, q: 1.0 }, { frequency: 2500, type: 'peaking', gain: 2, q: 1.0 }] } } }],
    ['music-edm', { id: 'music-edm', name: 'EDM', category: 'music', description: 'Maximum loudness EDM', settings: { dynamics: { compressor: { threshold: -10, ratio: 6, attack: 2, release: 50 }, limiter: { ceiling: -0.1 } }, eq: { bands: [{ frequency: 60, type: 'lowshelf', gain: 3, q: 0.7 }, { frequency: 6000, type: 'peaking', gain: 2, q: 1.0 }, { frequency: 12000, type: 'highshelf', gain: 3, q: 0.7 }] } } }],
    ['music-hiphop', { id: 'music-hiphop', name: 'Hip-Hop', category: 'music', description: 'Heavy bass, punchy', settings: { dynamics: { compressor: { threshold: -14, ratio: 4, attack: 5, release: 80 }, limiter: { ceiling: -0.3 } }, eq: { bands: [{ frequency: 60, type: 'lowshelf', gain: 4, q: 0.7 }, { frequency: 400, type: 'peaking', gain: -1, q: 1.0 }, { frequency: 2500, type: 'peaking', gain: 1, q: 1.0 }] } } }],
    ['music-jazz', { id: 'music-jazz', name: 'Jazz/Classical', category: 'music', description: 'Dynamic preservation', settings: { dynamics: { compressor: { threshold: -24, ratio: 2, attack: 20, release: 200 }, limiter: { ceiling: -1.0 } }, eq: { bands: [{ frequency: 400, type: 'peaking', gain: -1, q: 1.0 }, { frequency: 2500, type: 'peaking', gain: 0.5, q: 1.0 }] } } }],
    ['podcast-interview', { id: 'podcast-interview', name: 'Interview', category: 'podcast', description: 'Multi-speaker clarity', settings: { dynamics: { compressor: { threshold: -20, ratio: 4, attack: 5, release: 50 }, limiter: { ceiling: -1.0 } }, eq: { bands: [{ frequency: 60, type: 'lowshelf', gain: -6, q: 0.7 }, { frequency: 170, type: 'peaking', gain: -2, q: 1.0 }, { frequency: 2500, type: 'peaking', gain: 3, q: 1.0 }, { frequency: 6000, type: 'peaking', gain: 2, q: 1.0 }] } } }],
    ['podcast-solo', { id: 'podcast-solo', name: 'Solo', category: 'podcast', description: 'Single voice podcast', settings: { dynamics: { compressor: { threshold: -18, ratio: 3, attack: 10, release: 80 }, limiter: { ceiling: -1.0 } }, eq: { bands: [{ frequency: 60, type: 'lowshelf', gain: -8, q: 0.7 }, { frequency: 2500, type: 'peaking', gain: 2, q: 1.0 }, { frequency: 6000, type: 'peaking', gain: 1.5, q: 1.0 }] } } }],
    ['content-youtube', { id: 'content-youtube', name: 'YouTube', category: 'content', description: 'YouTube optimization', settings: { dynamics: { compressor: { threshold: -16, ratio: 3, attack: 10, release: 100 }, limiter: { ceiling: -1.0 } }, eq: { bands: [{ frequency: 60, type: 'lowshelf', gain: -3, q: 0.7 }, { frequency: 2500, type: 'peaking', gain: 2, q: 1.0 }, { frequency: 12000, type: 'highshelf', gain: 1, q: 0.7 }] } } }]
]);

app.get(`/api/${API_VERSION}/presets`,
    validateApiKey,
    async (req, res) => {
        const { category } = req.query;
        let presets = Array.from(presetsStore.values());

        if (category) {
            presets = presets.filter(p => p.category === category);
        }

        res.json({
            success: true,
            data: {
                presets: presets.map(p => ({ id: p.id, name: p.name, category: p.category, description: p.description })),
                count: presets.length,
                categories: ['music', 'podcast', 'content', 'custom']
            }
        });
    }
);

app.get(`/api/${API_VERSION}/presets/:id`,
    validateApiKey,
    async (req, res) => {
        const preset = presetsStore.get(req.params.id);
        if (!preset) {
            return res.status(404).json({ success: false, error: 'Preset not found' });
        }
        res.json({ success: true, data: preset });
    }
);

app.post(`/api/${API_VERSION}/presets`,
    validateApiKey,
    async (req, res) => {
        try {
            const { name, settings, category = 'custom' } = req.body;

            if (!name || typeof name !== 'string' || name.length > 100) {
                return res.status(400).json({ success: false, error: 'Name is required and must be under 100 characters' });
            }

            if (!settings || typeof settings !== 'object') {
                return res.status(400).json({ success: false, error: 'Settings object is required' });
            }

            const validCategories = ['music', 'podcast', 'content', 'custom'];
            if (!validCategories.includes(category)) {
                return res.status(400).json({ success: false, error: `Category must be one of: ${validCategories.join(', ')}` });
            }

            const id = `custom_${crypto.randomBytes(8).toString('hex')}`;
            const preset = { id, name, settings, category, userId: req.user.id, createdAt: new Date().toISOString() };
            presetsStore.set(id, preset);

            res.status(201).json({ success: true, data: preset });
        } catch (error) {
            log.error('create preset failed:', error.message);
            res.status(500).json({ success: false, error: 'Failed to create preset' });
        }
    }
);

// ============================================
// EXPORT ENDPOINTS
// ============================================

app.post(`/api/${API_VERSION}/export`,
    validateApiKey,
    upload.single('audio'),
    async (req, res) => {
        try {
            if (!req.file) {
                return res.status(400).json({ success: false, error: 'No audio file provided' });
            }

            const validation = validateExportOptions(req.body);
            if (validation.error) {
                return res.status(400).json({ success: false, error: validation.error });
            }

            const parsed = parseUploadedAudio(req.file.buffer);
            const exported = exportAudio(parsed, validation);

            res.set({
                'Content-Type': getContentType(validation.format),
                'Content-Disposition': `attachment; filename="mastered.${validation.format}"`,
                'Content-Length': exported.buffer.length,
                'X-Checksum': exported.checksum
            });

            res.send(exported.buffer);
        } catch (error) {
            log.error('export failed:', error.message);
            res.status(500).json({
                success: false,
                error: config.isDev ? error.message : 'Export failed.'
            });
        }
    }
);

// ============================================
// BATCH PROCESSING ENDPOINTS
// ============================================

app.post(`/api/${API_VERSION}/batch`,
    validateApiKey,
    requireTier('pro'),
    upload.array('files', 10),
    async (req, res) => {
        try {
            if (!req.files || req.files.length === 0) {
                return res.status(400).json({ success: false, error: 'No files provided' });
            }

            const tierLimits = getTierLimits(req.user.tier);
            if (tierLimits.batchSize !== -1 && req.files.length > tierLimits.batchSize) {
                return res.status(400).json({
                    success: false,
                    error: `Your tier allows up to ${tierLimits.batchSize} files per batch`
                });
            }

            const validation = validateSettings(req.body);
            if (validation.error) {
                return res.status(400).json({ success: false, error: validation.error });
            }

            const startTime = Date.now();
            const jobId = `job_${crypto.randomBytes(6).toString('hex')}`;
            const results = [];

            for (const file of req.files) {
                try {
                    const parsed = parseUploadedAudio(file.buffer);
                    const result = masterAudio(parsed, validation.settings);
                    results.push({
                        filename: file.originalname,
                        status: 'completed',
                        analysis: result.analysis
                    });
                } catch (e) {
                    results.push({
                        filename: file.originalname,
                        status: 'failed',
                        error: e.message
                    });
                }
            }

            res.json({
                success: true,
                data: {
                    jobId,
                    processed: req.files.length,
                    successful: results.filter(r => r.status === 'completed').length,
                    failed: results.filter(r => r.status === 'failed').length,
                    results
                },
                processingTime: Date.now() - startTime
            });

            log.info(`batch: ${req.user.id} processed ${req.files.length} files`);

        } catch (error) {
            log.error('batch processing failed:', error.message);
            res.status(500).json({
                success: false,
                error: config.isDev ? error.message : 'Batch processing failed.'
            });
        }
    }
);

// ============================================
// USER ENDPOINTS
// ============================================

app.get(`/api/${API_VERSION}/user`,
    validateApiKey,
    async (req, res) => {
        res.json({
            success: true,
            data: {
                id: req.user.id,
                email: req.user.email,
                tier: req.user.tier,
                createdAt: req.user.createdAt,
                limits: getTierLimits(req.user.tier)
            }
        });
    }
);

app.get(`/api/${API_VERSION}/usage`,
    validateApiKey,
    async (req, res) => {
        const usage = await getUserUsage(req.user.id);
        const limits = getTierLimits(req.user.tier);

        res.json({
            success: true,
            data: {
                period: usage.period,
                requests: usage.requests,
                audioProcessedMB: usage.audioProcessedMB,
                limits,
                remaining: {
                    requests: limits.requests === -1 ? 'unlimited' : Math.max(0, limits.requests - usage.requests),
                    audioMB: limits.audioMB === -1 ? 'unlimited' : Math.max(0, limits.audioMB - usage.audioProcessedMB)
                }
            }
        });
    }
);

// ============================================
// ERROR HANDLING
// ============================================

// Multer error handler
app.use((error, req, res, next) => {
    if (error instanceof multer.MulterError) {
        const messages = {
            LIMIT_FILE_SIZE: 'File too large. Maximum size is 500MB.',
            LIMIT_FILE_COUNT: 'Too many files. Maximum is 10.',
            LIMIT_UNEXPECTED_FILE: 'Unexpected file field name.'
        };
        return res.status(400).json({
            success: false,
            error: messages[error.code] || `Upload error: ${error.message}`
        });
    }

    // CORS errors
    if (error.message && error.message.includes('CORS')) {
        return res.status(403).json({
            success: false,
            error: 'Origin not allowed by CORS policy'
        });
    }

    // Generic error — never expose internals in production
    log.error('Unhandled error:', error);
    res.status(500).json({
        success: false,
        error: config.isDev ? error.message : 'Internal server error'
    });
});

// 404 handler
app.use((req, res) => {
    res.status(404).json({
        success: false,
        error: 'Endpoint not found',
        docs: `/api/${API_VERSION}/docs`
    });
});

// ============================================
// HELPER FUNCTIONS
// ============================================

async function getUserByApiKeyFromDB(apiKey) {
    // Production: query Supabase for API key
    // This requires @supabase/supabase-js to be configured
    try {
        const { createClient } = await import('@supabase/supabase-js');
        if (!config.supabase.url || !config.supabase.serviceKey) return null;

        const supabase = createClient(config.supabase.url, config.supabase.serviceKey);
        const keyHash = hashApiKey(apiKey);

        const { data, error } = await supabase
            .from('api_keys')
            .select('user_id, users(id, email, tier, created_at)')
            .eq('key_hash', keyHash)
            .eq('active', true)
            .single();

        if (error || !data) return null;

        return {
            id: data.users.id,
            email: data.users.email,
            tier: data.users.tier,
            createdAt: data.users.created_at
        };
    } catch (error) {
        log.error('getUserByApiKeyFromDB failed:', error.message);
        return null;
    }
}

function getContentType(format) {
    const types = {
        wav: 'audio/wav',
        mp3: 'audio/mpeg',
        flac: 'audio/flac',
        aiff: 'audio/aiff'
    };
    return types[format] || 'application/octet-stream';
}

function getTierLimits(tier) {
    return config.tiers[tier] || config.tiers.free;
}

async function getUserUsage(userId) {
    // In production, query from database
    const now = new Date();
    return {
        period: `${now.toLocaleString('default', { month: 'long' })} ${now.getFullYear()}`,
        requests: 0,
        audioProcessedMB: 0
    };
}

function getEndpointDocs() {
    return {
        analyze: {
            method: 'POST', path: `/api/${API_VERSION}/analyze`,
            description: 'Analyze audio for LUFS, true peak, dynamic range, crest factor',
            auth: 'X-API-Key', tier: 'free',
            body: 'multipart/form-data with "audio" file field (WAV format)'
        },
        analyzeSpectrum: {
            method: 'POST', path: `/api/${API_VERSION}/analyze/spectrum`,
            description: 'Get 31-band ISO frequency spectrum analysis',
            auth: 'X-API-Key', tier: 'free',
            body: 'multipart/form-data with "audio" file field. Optional: fftSize (512-32768)'
        },
        master: {
            method: 'POST', path: `/api/${API_VERSION}/master`,
            description: 'Apply full mastering chain (EQ, compression, stereo, limiting)',
            auth: 'X-API-Key', tier: 'free',
            body: 'multipart/form-data with "audio" file and optional "settings" JSON'
        },
        masterAuto: {
            method: 'POST', path: `/api/${API_VERSION}/master/auto`,
            description: 'AI-powered automatic mastering with platform targeting',
            auth: 'X-API-Key', tier: 'pro',
            body: 'multipart/form-data with "audio" file, optional "reference" file, and "targetPlatform"'
        },
        presets: {
            method: 'GET', path: `/api/${API_VERSION}/presets`,
            description: 'List available mastering presets. Filter with ?category=music|podcast|content'
        },
        export: {
            method: 'POST', path: `/api/${API_VERSION}/export`,
            description: 'Export audio with format/bitDepth/sampleRate/normalize/dither options'
        },
        batch: {
            method: 'POST', path: `/api/${API_VERSION}/batch`,
            description: 'Batch process multiple audio files', tier: 'pro'
        },
        user: { method: 'GET', path: `/api/${API_VERSION}/user`, description: 'Get current user information' },
        usage: { method: 'GET', path: `/api/${API_VERSION}/usage`, description: 'Get API usage statistics' }
    };
}

// ============================================
// START SERVER
// ============================================

const isMainModule = process.argv[1] === fileURLToPath(import.meta.url);

if (isMainModule) {
    app.listen(PORT, () => {
        log.info(`LuvLang Mastering API v${API_VERSION} running on port ${PORT}`);
        log.info(`Docs: http://localhost:${PORT}/docs`);
        log.info(`Environment: ${config.nodeEnv}`);
    });
}

export default app;
