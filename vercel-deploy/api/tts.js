/**
 * Vercel Serverless Function: Azure Speech TTS with Multi-Layer Cache
 * Endpoint: POST /api/tts
 *
 * Cache layers:
 *   L1 — In-memory Map (survives warm serverless instances, ~0ms)
 *   L2 — /tmp filesystem (survives across requests in same instance, ~1ms)
 *   L3 — Azure API call (only on true cache miss, ~300ms)
 *   L4 — Browser Cache-Control header (client never re-requests same phrase)
 *
 * The guided tour repeats identical phrases — this means after the first user,
 * nearly all subsequent requests are served from L1/L2 at zero Azure cost.
 *
 * Environment variables:
 *   AZURE_SPEECH_KEY    - Azure Speech Services subscription key
 *   AZURE_SPEECH_REGION - Azure region (e.g. "eastus")
 */

const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

// ── L1: In-memory cache (persists during warm serverless instance) ──
// Max 50MB to stay safe within Vercel's 256MB function memory
const memCache = new Map();
const MAX_MEM_ENTRIES = 200; // ~200 phrases × ~50KB each ≈ 10MB
let memCacheSize = 0;

// ── L2: /tmp disk cache directory ──
const TMP_CACHE_DIR = '/tmp/tts-cache';
try { fs.mkdirSync(TMP_CACHE_DIR, { recursive: true }); } catch (_) {}

// Voice mapping — Azure's best neural voices
const VOICE_MAP = {
    // Female
    'ava':     'en-US-AvaMultilingualNeural',    // Flagship — modern, confident, polished
    'emma':    'en-US-EmmaMultilingualNeural',    // Clear, warm, articulate
    'jenny':   'en-US-JennyMultilingualV2Neural', // Friendly, approachable
    'sonia':   'en-GB-SoniaNeural',               // British, warm, professional
    'natasha': 'en-AU-NatashaNeural',             // Australian, warm
    // Male
    'steffan': 'en-US-SteffanMultilingualNeural', // Modern, smooth, professional
    'andrew':  'en-US-AndrewMultilingualNeural',  // Confident, clear
    'ryan':    'en-GB-RyanNeural',                // British male, authoritative
};

function cacheKey(text, voice) {
    return crypto.createHash('sha256').update(`${voice}:${text}`).digest('hex');
}

function escapeXml(text) {
    return text
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&apos;');
}

// Allowed origins for CORS
const ALLOWED_ORIGINS = [
    'https://luvlangmastering.vercel.app',
    'https://luvlang-mastering.vercel.app',
    'https://www.luvlang.studio',
    'https://luvlang.studio',
    'https://luvlang.org',
    'https://www.luvlang.org',
    process.env.FRONTEND_URL
].filter(Boolean);

module.exports = async (req, res) => {
    const origin = req.headers.origin;
    if (ALLOWED_ORIGINS.includes(origin)) {
        res.setHeader('Access-Control-Allow-Origin', origin);
    }
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    res.setHeader('Access-Control-Allow-Credentials', 'true');

    if (req.method === 'OPTIONS') return res.status(200).end();
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

    const key = process.env.AZURE_SPEECH_KEY;
    const region = process.env.AZURE_SPEECH_REGION || 'eastus';

    if (!key) return res.status(503).json({ error: 'TTS not configured' });

    const { text, voice } = req.body || {};

    if (!text || typeof text !== 'string') return res.status(400).json({ error: 'Missing "text" field' });
    if (text.length > 500) return res.status(400).json({ error: 'Text too long (max 500 chars)' });

    const selectedVoice = VOICE_MAP[voice] || VOICE_MAP['ava'];
    const hash = cacheKey(text, selectedVoice);

    // ── L1: Check in-memory cache ──
    if (memCache.has(hash)) {
        res.setHeader('Content-Type', 'audio/mpeg');
        res.setHeader('Cache-Control', 'public, max-age=86400'); // Browser: cache 24h
        res.setHeader('X-TTS-Cache', 'L1-memory');
        return res.status(200).send(memCache.get(hash));
    }

    // ── L2: Check /tmp disk cache ──
    const tmpPath = path.join(TMP_CACHE_DIR, hash + '.mp3');
    try {
        if (fs.existsSync(tmpPath)) {
            const audioBuffer = fs.readFileSync(tmpPath);
            // Promote to L1
            if (memCacheSize < MAX_MEM_ENTRIES) {
                memCache.set(hash, audioBuffer);
                memCacheSize++;
            }
            res.setHeader('Content-Type', 'audio/mpeg');
            res.setHeader('Cache-Control', 'public, max-age=86400');
            res.setHeader('X-TTS-Cache', 'L2-disk');
            return res.status(200).send(audioBuffer);
        }
    } catch (_) {}

    // ── L3: Cache miss — call Azure API ──
    // Set SSML lang based on voice region
    const ssmlLang = selectedVoice.startsWith('en-GB') ? 'en-GB' :
                     selectedVoice.startsWith('en-AU') ? 'en-AU' : 'en-US';
    const ssml = `<speak version="1.0" xmlns="http://www.w3.org/2001/10/synthesis" xml:lang="${ssmlLang}">
  <voice name="${selectedVoice}">
    <prosody rate="-3%" pitch="+1%">${escapeXml(text)}</prosody>
  </voice>
</speak>`;

    try {
        const response = await fetch(
            `https://${region}.tts.speech.microsoft.com/cognitiveservices/v1`,
            {
                method: 'POST',
                headers: {
                    'Ocp-Apim-Subscription-Key': key,
                    'Content-Type': 'application/ssml+xml',
                    'X-Microsoft-OutputFormat': 'audio-24khz-96kbitrate-mono-mp3',
                    'User-Agent': 'LuvLangMasteringStudio'
                },
                body: ssml
            }
        );

        if (!response.ok) {
            const errorText = await response.text();
            console.error('Azure TTS error:', response.status, errorText);
            return res.status(502).json({ error: 'TTS generation failed', status: response.status });
        }

        const audioBuffer = Buffer.from(await response.arrayBuffer());

        // Store in L1 (memory)
        if (memCacheSize < MAX_MEM_ENTRIES) {
            memCache.set(hash, audioBuffer);
            memCacheSize++;
        }

        // Store in L2 (/tmp disk)
        try { fs.writeFileSync(tmpPath, audioBuffer); } catch (_) {}

        res.setHeader('Content-Type', 'audio/mpeg');
        res.setHeader('Cache-Control', 'public, max-age=86400'); // Browser: cache 24h
        res.setHeader('X-TTS-Cache', 'L3-azure');
        return res.status(200).send(audioBuffer);

    } catch (error) {
        console.error('Azure TTS fetch error:', error);
        return res.status(500).json({ error: 'TTS service unavailable' });
    }
};
