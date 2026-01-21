/**
 * Vercel Serverless Function: API Key Operations by ID
 * Endpoints:
 *   DELETE /api/api-keys/[id] - Delete/revoke an API key
 *   PATCH  /api/api-keys/[id] - Update API key (name, status, limits)
 */

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;

/**
 * Verify JWT token from Supabase
 */
async function verifyAuth(authHeader) {
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return null;
    }

    const token = authHeader.substring(7);

    try {
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
    // CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'DELETE, PATCH, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    // Verify authentication
    const user = await verifyAuth(req.headers.authorization);
    if (!user) {
        return res.status(401).json({ error: 'Unauthorized' });
    }

    // Get key ID from URL
    const { id } = req.query;
    if (!id) {
        return res.status(400).json({ error: 'API key ID required' });
    }

    // DELETE: Revoke/delete API key
    if (req.method === 'DELETE') {
        try {
            // Verify ownership before deleting
            const checkResponse = await fetch(
                `${SUPABASE_URL}/rest/v1/api_keys?id=eq.${id}&user_id=eq.${user.id}&select=id`,
                {
                    headers: {
                        'apikey': SUPABASE_SERVICE_KEY,
                        'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`
                    }
                }
            );

            const existingKeys = await checkResponse.json();
            if (existingKeys.length === 0) {
                return res.status(404).json({ error: 'API key not found' });
            }

            // Delete the key
            const deleteResponse = await fetch(
                `${SUPABASE_URL}/rest/v1/api_keys?id=eq.${id}&user_id=eq.${user.id}`,
                {
                    method: 'DELETE',
                    headers: {
                        'apikey': SUPABASE_SERVICE_KEY,
                        'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`
                    }
                }
            );

            if (!deleteResponse.ok) {
                throw new Error('Failed to delete API key');
            }

            return res.json({
                success: true,
                message: 'API key deleted successfully'
            });

        } catch (error) {
            console.error('Delete key error:', error);
            return res.status(500).json({ success: false, error: error.message });
        }
    }

    // PATCH: Update API key
    if (req.method === 'PATCH') {
        try {
            const { name, isActive, rateLimit, monthlyQuota, expiresAt } = req.body;

            // Build update object
            const updates = {};
            if (name !== undefined) updates.name = name;
            if (isActive !== undefined) updates.is_active = isActive;
            if (rateLimit !== undefined) updates.rate_limit = rateLimit;
            if (monthlyQuota !== undefined) updates.monthly_quota = monthlyQuota;
            if (expiresAt !== undefined) updates.expires_at = expiresAt;

            if (Object.keys(updates).length === 0) {
                return res.status(400).json({ error: 'No updates provided' });
            }

            // Update the key (with ownership check)
            const updateResponse = await fetch(
                `${SUPABASE_URL}/rest/v1/api_keys?id=eq.${id}&user_id=eq.${user.id}`,
                {
                    method: 'PATCH',
                    headers: {
                        'Content-Type': 'application/json',
                        'apikey': SUPABASE_SERVICE_KEY,
                        'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
                        'Prefer': 'return=representation'
                    },
                    body: JSON.stringify(updates)
                }
            );

            if (!updateResponse.ok) {
                throw new Error('Failed to update API key');
            }

            const updatedKeys = await updateResponse.json();
            if (updatedKeys.length === 0) {
                return res.status(404).json({ error: 'API key not found' });
            }

            return res.json({
                success: true,
                message: 'API key updated successfully',
                key: updatedKeys[0]
            });

        } catch (error) {
            console.error('Update key error:', error);
            return res.status(500).json({ success: false, error: error.message });
        }
    }

    // Method not allowed
    return res.status(405).json({ error: 'Method not allowed' });
};
