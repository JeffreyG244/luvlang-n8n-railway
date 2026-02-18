/**
 * Vercel Serverless Function: Validate API Key
 * Endpoint: POST /api/validate-api-key
 *
 * Used internally to validate API keys for the mastering API
 */

const crypto = require('crypto');

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;

// Allowed origins for CORS
const ALLOWED_ORIGINS = [
    'https://luvlangmastering.vercel.app',
    'https://luvlang-mastering.vercel.app',
    'https://www.luvlang.studio',
    'https://luvlang.studio',
    process.env.FRONTEND_URL
].filter(Boolean);

/**
 * Hash an API key for comparison
 */
function hashApiKey(key) {
    return crypto.createHash('sha256').update(key).digest('hex');
}

module.exports = async (req, res) => {
    // CORS headers - restrict to allowed origins
    const origin = req.headers.origin;
    if (ALLOWED_ORIGINS.includes(origin)) {
        res.setHeader('Access-Control-Allow-Origin', origin);
    }
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-API-Key');
    res.setHeader('Access-Control-Allow-Credentials', 'true');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        // Get API key from header or body
        const apiKey = req.headers['x-api-key'] || req.body?.apiKey;

        if (!apiKey) {
            return res.status(401).json({
                valid: false,
                error: 'API key required'
            });
        }

        // Validate key format
        if (!apiKey.startsWith('lm_live_') && !apiKey.startsWith('lm_test_')) {
            return res.status(401).json({
                valid: false,
                error: 'Invalid API key format'
            });
        }

        // Hash the key for lookup
        const keyHash = hashApiKey(apiKey);

        // Query the database for this key
        const response = await fetch(
            `${SUPABASE_URL}/rest/v1/api_keys?key_hash=eq.${keyHash}&select=id,user_id,name,tier_access,rate_limit,monthly_quota,monthly_usage,is_active,expires_at`,
            {
                headers: {
                    'apikey': SUPABASE_SERVICE_KEY,
                    'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`
                }
            }
        );

        if (!response.ok) {
            throw new Error('Database error');
        }

        const keys = await response.json();

        // Key not found
        if (keys.length === 0) {
            return res.status(401).json({
                valid: false,
                error: 'Invalid API key'
            });
        }

        const keyRecord = keys[0];

        // Key is inactive
        if (!keyRecord.is_active) {
            return res.status(403).json({
                valid: false,
                error: 'API key is inactive'
            });
        }

        // Key has expired
        if (keyRecord.expires_at && new Date(keyRecord.expires_at) < new Date()) {
            return res.status(403).json({
                valid: false,
                error: 'API key has expired'
            });
        }

        // Monthly quota exceeded
        if (keyRecord.monthly_quota && keyRecord.monthly_usage >= keyRecord.monthly_quota) {
            return res.status(429).json({
                valid: false,
                error: 'Monthly quota exceeded',
                quota: keyRecord.monthly_quota,
                usage: keyRecord.monthly_usage
            });
        }

        // Atomic usage increment via Supabase RPC — eliminates race condition
        // where two concurrent requests could both read the same monthly_usage
        // value and lose one increment.
        await fetch(
            `${SUPABASE_URL}/rest/v1/rpc/increment_api_key_usage`,
            {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'apikey': SUPABASE_SERVICE_KEY,
                    'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`
                },
                body: JSON.stringify({ key_id: keyRecord.id })
            }
        );

        // Log the API call
        if (req.body?.endpoint) {
            await fetch(
                `${SUPABASE_URL}/rest/v1/api_key_usage`,
                {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'apikey': SUPABASE_SERVICE_KEY,
                        'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`
                    },
                    body: JSON.stringify({
                        api_key_id: keyRecord.id,
                        user_id: keyRecord.user_id,
                        endpoint: req.body.endpoint,
                        method: req.body.method || 'POST',
                        ip_address: req.headers['x-forwarded-for'] || req.socket?.remoteAddress,
                        user_agent: req.headers['user-agent']
                    })
                }
            );
        }

        // Key is valid!
        return res.json({
            valid: true,
            keyId: keyRecord.id,
            userId: keyRecord.user_id,
            tierAccess: keyRecord.tier_access,
            rateLimit: keyRecord.rate_limit,
            quotaRemaining: keyRecord.monthly_quota
                ? keyRecord.monthly_quota - keyRecord.monthly_usage - 1
                : null
        });

    } catch (error) {
        console.error('Validation error:', error);
        return res.status(500).json({
            valid: false,
            error: 'Internal server error'
        });
    }
};
