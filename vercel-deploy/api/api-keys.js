/**
 * Vercel Serverless Function: API Key Management
 * Endpoints:
 *   GET  /api/api-keys - List user's API keys
 *   POST /api/api-keys - Create new API key
 */

const crypto = require('crypto');

// Supabase config
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;

// Allowed origins for CORS
const ALLOWED_ORIGINS = [
    'https://luvlangmastering.vercel.app',
    'https://luvlang-mastering.vercel.app',
    process.env.FRONTEND_URL
].filter(Boolean);

/**
 * Generate a secure API key
 * Format: lm_live_xxxxxxxxxxxxxxxxxxxxxxxxxxxx
 */
function generateApiKey(isTest = false) {
    const prefix = isTest ? 'lm_test_' : 'lm_live_';
    const randomBytes = crypto.randomBytes(24).toString('base64url');
    return prefix + randomBytes;
}

/**
 * Hash an API key for storage
 */
function hashApiKey(key) {
    return crypto.createHash('sha256').update(key).digest('hex');
}

/**
 * Verify JWT token from Supabase
 */
async function verifyAuth(authHeader) {
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return null;
    }

    const token = authHeader.substring(7);

    try {
        // Verify token with Supabase
        const response = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
            headers: {
                'Authorization': `Bearer ${token}`,
                'apikey': SUPABASE_SERVICE_KEY
            }
        });

        if (response.ok) {
            return await response.json();
        }
        return null;
    } catch (err) {
        console.error('Auth error:', err);
        return null;
    }
}

module.exports = async (req, res) => {
    // CORS headers - restrict to allowed origins
    const origin = req.headers.origin;
    if (ALLOWED_ORIGINS.includes(origin)) {
        res.setHeader('Access-Control-Allow-Origin', origin);
    }
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    res.setHeader('Access-Control-Allow-Credentials', 'true');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    // Verify authentication
    const user = await verifyAuth(req.headers.authorization);
    if (!user) {
        return res.status(401).json({ error: 'Unauthorized' });
    }

    // GET: List API keys
    if (req.method === 'GET') {
        try {
            const response = await fetch(
                `${SUPABASE_URL}/rest/v1/api_keys?user_id=eq.${user.id}&select=id,name,key_prefix,tier_access,rate_limit,monthly_quota,monthly_usage,is_active,last_used_at,expires_at,created_at&order=created_at.desc`,
                {
                    headers: {
                        'apikey': SUPABASE_SERVICE_KEY,
                        'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`
                    }
                }
            );

            if (!response.ok) {
                throw new Error('Failed to fetch API keys');
            }

            const keys = await response.json();

            return res.json({
                success: true,
                keys: keys
            });

        } catch (error) {
            console.error('List keys error:', error);
            return res.status(500).json({ success: false, error: error.message });
        }
    }

    // POST: Create new API key
    if (req.method === 'POST') {
        try {
            const { name, tierAccess, rateLimit, monthlyQuota, expiresAt, isTest } = req.body;

            if (!name || name.length < 1) {
                return res.status(400).json({ error: 'Name is required' });
            }

            // Check key limit (max 5 keys per user)
            const countResponse = await fetch(
                `${SUPABASE_URL}/rest/v1/api_keys?user_id=eq.${user.id}&select=id`,
                {
                    headers: {
                        'apikey': SUPABASE_SERVICE_KEY,
                        'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`
                    }
                }
            );

            const existingKeys = await countResponse.json();
            if (existingKeys.length >= 5) {
                return res.status(400).json({
                    error: 'Maximum 5 API keys allowed per user'
                });
            }

            // Generate the API key
            const apiKey = generateApiKey(isTest);
            const keyHash = hashApiKey(apiKey);
            const keyPrefix = apiKey.substring(0, 12); // "lm_live_xxxx" or "lm_test_xxxx"

            // Insert into database
            const insertResponse = await fetch(
                `${SUPABASE_URL}/rest/v1/api_keys`,
                {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'apikey': SUPABASE_SERVICE_KEY,
                        'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
                        'Prefer': 'return=representation'
                    },
                    body: JSON.stringify({
                        user_id: user.id,
                        name: name,
                        key_prefix: keyPrefix,
                        key_hash: keyHash,
                        tier_access: tierAccess || 'instant',
                        rate_limit: rateLimit || 60,
                        monthly_quota: monthlyQuota || 100,
                        expires_at: expiresAt || null
                    })
                }
            );

            if (!insertResponse.ok) {
                const errorText = await insertResponse.text();
                throw new Error(`Failed to create API key: ${errorText}`);
            }

            const [newKey] = await insertResponse.json();

            // Return the key (only shown once!)
            return res.json({
                success: true,
                message: 'API key created successfully. Save this key - it will not be shown again!',
                key: {
                    id: newKey.id,
                    name: newKey.name,
                    apiKey: apiKey, // Only returned on creation!
                    keyPrefix: keyPrefix,
                    tierAccess: newKey.tier_access,
                    rateLimit: newKey.rate_limit,
                    monthlyQuota: newKey.monthly_quota,
                    createdAt: newKey.created_at
                }
            });

        } catch (error) {
            console.error('Create key error:', error);
            return res.status(500).json({ success: false, error: error.message });
        }
    }

    // Method not allowed
    return res.status(405).json({ error: 'Method not allowed' });
};
