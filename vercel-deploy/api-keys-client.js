/**
 * LUVLANG API KEY MANAGEMENT - Client-Side Module
 * Handles API key creation, listing, and management in the developer portal
 */

// ═══════════════════════════════════════════════════════════════════════════
// CONFIGURATION
// ═══════════════════════════════════════════════════════════════════════════

const API_KEY_CONFIG = {
    maxKeys: 5,
    tiers: ['basic', 'advanced', 'premium'],
    defaultRateLimit: 60,
    defaultMonthlyQuota: 100
};

// ═══════════════════════════════════════════════════════════════════════════
// API FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Get the API base URL
 */
function getApiKeyBaseUrl() {
    if (typeof LUVLANG_CONFIG !== 'undefined' && LUVLANG_CONFIG.isProduction) {
        return '';
    }
    return 'http://localhost:3000';
}

/**
 * Get auth token from Supabase
 */
async function getAuthToken() {
    if (typeof supabase === 'undefined') {
        throw new Error('Supabase not initialized');
    }

    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
        throw new Error('Not authenticated');
    }

    return session.access_token;
}

/**
 * List all API keys for the current user
 */
async function listApiKeys() {
    try {
        const token = await getAuthToken();
        const baseUrl = getApiKeyBaseUrl();

        const response = await fetch(`${baseUrl}/api/api-keys`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });

        const result = await response.json();

        if (!result.success) {
            throw new Error(result.error || 'Failed to list API keys');
        }

        return result.keys;

    } catch (error) {
        console.error('List API keys error:', error);
        throw error;
    }
}

/**
 * Create a new API key
 *
 * @param {object} options - Key options
 * @param {string} options.name - Key name
 * @param {string} options.tierAccess - Tier access level (basic, advanced, premium)
 * @param {number} options.rateLimit - Requests per minute
 * @param {number} options.monthlyQuota - Monthly request limit
 * @param {string} options.expiresAt - Expiration date (ISO string)
 * @param {boolean} options.isTest - Create test key instead of live key
 */
async function createApiKey(options = {}) {
    try {
        const token = await getAuthToken();
        const baseUrl = getApiKeyBaseUrl();

        const response = await fetch(`${baseUrl}/api/api-keys`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                name: options.name || 'My API Key',
                tierAccess: options.tierAccess || 'basic',
                rateLimit: options.rateLimit || API_KEY_CONFIG.defaultRateLimit,
                monthlyQuota: options.monthlyQuota || API_KEY_CONFIG.defaultMonthlyQuota,
                expiresAt: options.expiresAt || null,
                isTest: options.isTest || false
            })
        });

        const result = await response.json();

        if (!result.success) {
            throw new Error(result.error || 'Failed to create API key');
        }

        return result.key;

    } catch (error) {
        console.error('Create API key error:', error);
        throw error;
    }
}

/**
 * Delete/revoke an API key
 *
 * @param {string} keyId - The API key ID
 */
async function deleteApiKey(keyId) {
    try {
        const token = await getAuthToken();
        const baseUrl = getApiKeyBaseUrl();

        const response = await fetch(`${baseUrl}/api/api-keys/${keyId}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });

        const result = await response.json();

        if (!result.success) {
            throw new Error(result.error || 'Failed to delete API key');
        }

        return true;

    } catch (error) {
        console.error('Delete API key error:', error);
        throw error;
    }
}

/**
 * Update an API key
 *
 * @param {string} keyId - The API key ID
 * @param {object} updates - Fields to update
 */
async function updateApiKey(keyId, updates) {
    try {
        const token = await getAuthToken();
        const baseUrl = getApiKeyBaseUrl();

        const response = await fetch(`${baseUrl}/api/api-keys/${keyId}`, {
            method: 'PATCH',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(updates)
        });

        const result = await response.json();

        if (!result.success) {
            throw new Error(result.error || 'Failed to update API key');
        }

        return result.key;

    } catch (error) {
        console.error('Update API key error:', error);
        throw error;
    }
}

// ═══════════════════════════════════════════════════════════════════════════
// UI FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Show the API keys management modal
 */
async function showApiKeysModal() {
    // Check if user is logged in
    if (typeof supabase !== 'undefined') {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
            (typeof showLuvLangToast==='function'?showLuvLangToast('Please sign in to manage API keys'):void 0);
            return;
        }
    }

    // Create or get the modal
    let modal = document.getElementById('apiKeysModal');
    if (!modal) {
        modal = createApiKeysModal();
        document.body.appendChild(modal);
    }

    // Show loading state
    modal.style.display = 'flex';
    const content = document.getElementById('apiKeysContent');
    content.innerHTML = '<div style="text-align: center; padding: 40px; color: #a8a8b3;">Loading API keys...</div>';

    // Load API keys
    try {
        const keys = await listApiKeys();
        renderApiKeysList(keys);
    } catch (error) {
        content.textContent = '';
        const errDiv = document.createElement('div');
        errDiv.style.cssText = 'text-align: center; padding: 40px; color: #ff6b6b;';
        errDiv.textContent = 'Error: ' + (error.message || 'Unknown error');
        content.appendChild(errDiv);
    }
}

/**
 * Create the API keys modal HTML
 */
function createApiKeysModal() {
    const modal = document.createElement('div');
    modal.id = 'apiKeysModal';
    modal.style.cssText = `
        display: none;
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0,0,0,0.9);
        z-index: 10000;
        justify-content: center;
        align-items: center;
        overflow-y: auto;
        padding: 20px;
    `;

    modal.innerHTML = `
        <div style="background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%); border-radius: 20px; max-width: 800px; width: 100%; padding: 40px; position: relative; box-shadow: 0 20px 60px rgba(0,0,0,0.5);">
            <button id="closeApiKeysModal" style="position: absolute; top: 20px; right: 20px; background: rgba(255,255,255,0.1); border: none; color: white; font-size: 2rem; width: 40px; height: 40px; border-radius: 50%; cursor: pointer;">&times;</button>

            <h2 style="font-size: 1.8rem; margin-bottom: 10px; color: white;">
                API Keys
            </h2>
            <p style="color: #a8a8b3; margin-bottom: 30px;">
                Manage your API keys for programmatic access to LuvLang Mastering.
            </p>

            <div id="apiKeysContent">
                <!-- Keys will be rendered here -->
            </div>

            <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid rgba(255,255,255,0.1);">
                <button id="createApiKeyBtn" style="
                    padding: 12px 24px;
                    border-radius: 8px;
                    border: none;
                    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                    color: white;
                    font-size: 1rem;
                    font-weight: 600;
                    cursor: pointer;
                ">
                    + Create New API Key
                </button>
            </div>
        </div>
    `;

    // Add event listeners
    modal.querySelector('#closeApiKeysModal').addEventListener('click', closeApiKeysModal);
    modal.querySelector('#createApiKeyBtn').addEventListener('click', showCreateKeyForm);
    modal.addEventListener('click', (e) => {
        if (e.target === modal) closeApiKeysModal();
    });

    return modal;
}

/**
 * Render the list of API keys
 */
function renderApiKeysList(keys) {
    const content = document.getElementById('apiKeysContent');

    if (keys.length === 0) {
        content.innerHTML = `
            <div style="text-align: center; padding: 40px; color: #a8a8b3;">
                <p style="font-size: 1.2rem; margin-bottom: 10px;">No API keys yet</p>
                <p>Create your first API key to start using the LuvLang API.</p>
            </div>
        `;
        return;
    }

    content.innerHTML = `
        <div style="display: flex; flex-direction: column; gap: 15px;">
            ${keys.map(key => `
                <div style="background: rgba(255,255,255,0.05); border-radius: 12px; padding: 20px; border: 1px solid rgba(255,255,255,0.1);">
                    <div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 15px;">
                        <div>
                            <h3 style="color: white; margin: 0 0 5px 0; font-size: 1.1rem;">${escapeHtml(key.name)}</h3>
                            <code style="color: #667eea; font-size: 0.9rem;">${key.key_prefix}...</code>
                        </div>
                        <div style="display: flex; gap: 10px;">
                            <span style="
                                padding: 4px 12px;
                                border-radius: 20px;
                                font-size: 0.75rem;
                                font-weight: 600;
                                background: ${key.is_active ? 'rgba(56, 217, 169, 0.2)' : 'rgba(255, 107, 107, 0.2)'};
                                color: ${key.is_active ? '#38d9a9' : '#ff6b6b'};
                            ">
                                ${key.is_active ? 'Active' : 'Inactive'}
                            </span>
                            <span style="
                                padding: 4px 12px;
                                border-radius: 20px;
                                font-size: 0.75rem;
                                font-weight: 600;
                                background: rgba(102, 126, 234, 0.2);
                                color: #667eea;
                            ">
                                ${key.tier_access.toUpperCase()}
                            </span>
                        </div>
                    </div>

                    <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 15px; margin-bottom: 15px;">
                        <div>
                            <span style="color: #a8a8b3; font-size: 0.8rem;">Rate Limit</span>
                            <div style="color: white;">${key.rate_limit} req/min</div>
                        </div>
                        <div>
                            <span style="color: #a8a8b3; font-size: 0.8rem;">Monthly Usage</span>
                            <div style="color: white;">${key.monthly_usage} / ${key.monthly_quota || '∞'}</div>
                        </div>
                        <div>
                            <span style="color: #a8a8b3; font-size: 0.8rem;">Last Used</span>
                            <div style="color: white;">${key.last_used_at ? formatDate(key.last_used_at) : 'Never'}</div>
                        </div>
                        <div>
                            <span style="color: #a8a8b3; font-size: 0.8rem;">Created</span>
                            <div style="color: white;">${formatDate(key.created_at)}</div>
                        </div>
                    </div>

                    <div style="display: flex; gap: 10px;">
                        <button onclick="toggleApiKey('${key.id}', ${!key.is_active})" style="
                            padding: 8px 16px;
                            border-radius: 6px;
                            border: 1px solid rgba(255,255,255,0.2);
                            background: transparent;
                            color: #a8a8b3;
                            font-size: 0.85rem;
                            cursor: pointer;
                        ">
                            ${key.is_active ? 'Disable' : 'Enable'}
                        </button>
                        <button onclick="confirmDeleteApiKey('${key.id}', '${escapeHtml(key.name)}')" style="
                            padding: 8px 16px;
                            border-radius: 6px;
                            border: 1px solid rgba(255, 107, 107, 0.3);
                            background: transparent;
                            color: #ff6b6b;
                            font-size: 0.85rem;
                            cursor: pointer;
                        ">
                            Delete
                        </button>
                    </div>
                </div>
            `).join('')}
        </div>

        <div style="margin-top: 20px; color: #a8a8b3; font-size: 0.85rem;">
            ${keys.length} of ${API_KEY_CONFIG.maxKeys} API keys used
        </div>
    `;
}

/**
 * Show the create key form
 */
function showCreateKeyForm() {
    const content = document.getElementById('apiKeysContent');

    content.innerHTML = `
        <div style="background: rgba(255,255,255,0.05); border-radius: 12px; padding: 30px; border: 1px solid rgba(255,255,255,0.1);">
            <h3 style="color: white; margin: 0 0 20px 0;">Create New API Key</h3>

            <div style="display: flex; flex-direction: column; gap: 20px;">
                <div>
                    <label style="display: block; color: #a8a8b3; font-size: 0.85rem; margin-bottom: 8px;">Key Name</label>
                    <input type="text" id="newKeyName" placeholder="My Production App" style="
                        width: 100%;
                        padding: 12px;
                        border-radius: 8px;
                        border: 1px solid rgba(255,255,255,0.2);
                        background: rgba(0,0,0,0.3);
                        color: white;
                        font-size: 1rem;
                    " />
                </div>

                <div>
                    <label style="display: block; color: #a8a8b3; font-size: 0.85rem; margin-bottom: 8px;">Tier Access</label>
                    <select id="newKeyTier" style="
                        width: 100%;
                        padding: 12px;
                        border-radius: 8px;
                        border: 1px solid rgba(255,255,255,0.2);
                        background: rgba(0,0,0,0.3);
                        color: white;
                        font-size: 1rem;
                    ">
                        <option value="basic">BASIC ($12.99/track)</option>
                        <option value="advanced">ADVANCED ($29.99/track)</option>
                        <option value="premium">PREMIUM ($59.99/track)</option>
                    </select>
                </div>

                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px;">
                    <div>
                        <label style="display: block; color: #a8a8b3; font-size: 0.85rem; margin-bottom: 8px;">Rate Limit (req/min)</label>
                        <input type="number" id="newKeyRateLimit" value="60" min="1" max="1000" style="
                            width: 100%;
                            padding: 12px;
                            border-radius: 8px;
                            border: 1px solid rgba(255,255,255,0.2);
                            background: rgba(0,0,0,0.3);
                            color: white;
                            font-size: 1rem;
                        " />
                    </div>
                    <div>
                        <label style="display: block; color: #a8a8b3; font-size: 0.85rem; margin-bottom: 8px;">Monthly Quota</label>
                        <input type="number" id="newKeyQuota" value="100" min="1" style="
                            width: 100%;
                            padding: 12px;
                            border-radius: 8px;
                            border: 1px solid rgba(255,255,255,0.2);
                            background: rgba(0,0,0,0.3);
                            color: white;
                            font-size: 1rem;
                        " />
                    </div>
                </div>

                <div style="display: flex; gap: 10px; margin-top: 10px;">
                    <button onclick="submitCreateKey()" style="
                        flex: 1;
                        padding: 14px;
                        border-radius: 8px;
                        border: none;
                        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                        color: white;
                        font-size: 1rem;
                        font-weight: 600;
                        cursor: pointer;
                    ">
                        Create Key
                    </button>
                    <button onclick="showApiKeysModal()" style="
                        padding: 14px 24px;
                        border-radius: 8px;
                        border: 1px solid rgba(255,255,255,0.2);
                        background: transparent;
                        color: #a8a8b3;
                        font-size: 1rem;
                        cursor: pointer;
                    ">
                        Cancel
                    </button>
                </div>
            </div>
        </div>
    `;
}

/**
 * Submit the create key form
 */
async function submitCreateKey() {
    const name = document.getElementById('newKeyName').value.trim();
    const tierAccess = document.getElementById('newKeyTier').value;
    const rateLimit = parseInt(document.getElementById('newKeyRateLimit').value) || 60;
    const monthlyQuota = parseInt(document.getElementById('newKeyQuota').value) || 100;

    if (!name) {
        (typeof showLuvLangToast==='function'?showLuvLangToast('Please enter a name for your API key'):void 0);
        return;
    }

    try {
        const key = await createApiKey({
            name,
            tierAccess,
            rateLimit,
            monthlyQuota
        });

        // Show the new key (only shown once!)
        showNewKeyCreated(key);

    } catch (error) {
        (typeof showLuvLangToast==='function'?showLuvLangToast('Error creating API key: ' + error.message):void 0);
    }
}

/**
 * Show the newly created key
 */
function showNewKeyCreated(key) {
    const content = document.getElementById('apiKeysContent');

    content.innerHTML = `
        <div style="background: rgba(56, 217, 169, 0.1); border-radius: 12px; padding: 30px; border: 1px solid rgba(56, 217, 169, 0.3);">
            <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 20px;">
                <span style="font-size: 2rem;">&#10003;</span>
                <h3 style="color: #38d9a9; margin: 0;">API Key Created!</h3>
            </div>

            <p style="color: #a8a8b3; margin-bottom: 20px;">
                <strong style="color: #ff6b6b;">Important:</strong> Copy your API key now. It will not be shown again!
            </p>

            <div style="background: rgba(0,0,0,0.3); border-radius: 8px; padding: 15px; margin-bottom: 20px;">
                <label style="display: block; color: #a8a8b3; font-size: 0.75rem; margin-bottom: 5px;">Your API Key</label>
                <code id="newApiKeyValue" style="
                    display: block;
                    color: #38d9a9;
                    font-size: 1rem;
                    word-break: break-all;
                    padding: 10px;
                    background: rgba(0,0,0,0.3);
                    border-radius: 4px;
                ">${key.apiKey}</code>
            </div>

            <div style="display: flex; gap: 10px;">
                <button onclick="copyApiKey('${key.apiKey}')" style="
                    flex: 1;
                    padding: 12px;
                    border-radius: 8px;
                    border: none;
                    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                    color: white;
                    font-size: 1rem;
                    font-weight: 600;
                    cursor: pointer;
                ">
                    Copy to Clipboard
                </button>
                <button onclick="showApiKeysModal()" style="
                    padding: 12px 24px;
                    border-radius: 8px;
                    border: 1px solid rgba(255,255,255,0.2);
                    background: transparent;
                    color: #a8a8b3;
                    font-size: 1rem;
                    cursor: pointer;
                ">
                    Done
                </button>
            </div>
        </div>
    `;
}

/**
 * Copy API key to clipboard
 */
async function copyApiKey(key) {
    try {
        await navigator.clipboard.writeText(key);
        (typeof showLuvLangToast==='function'?showLuvLangToast('API key copied to clipboard!'):void 0);
    } catch (err) {
        // Fallback
        const textarea = document.createElement('textarea');
        textarea.value = key;
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);
        (typeof showLuvLangToast==='function'?showLuvLangToast('API key copied to clipboard!'):void 0);
    }
}

/**
 * Toggle API key active status
 */
async function toggleApiKey(keyId, isActive) {
    try {
        await updateApiKey(keyId, { isActive });
        showApiKeysModal(); // Refresh the list
    } catch (error) {
        (typeof showLuvLangToast==='function'?showLuvLangToast('Error updating API key: ' + error.message):void 0);
    }
}

/**
 * Confirm and delete API key
 */
async function confirmDeleteApiKey(keyId, keyName) {
    if (!confirm(`Are you sure you want to delete the API key "${keyName}"?\n\nThis action cannot be undone.`)) {
        return;
    }

    try {
        await deleteApiKey(keyId);
        showApiKeysModal(); // Refresh the list
    } catch (error) {
        (typeof showLuvLangToast==='function'?showLuvLangToast('Error deleting API key: ' + error.message):void 0);
    }
}

/**
 * Close the API keys modal
 */
function closeApiKeysModal() {
    const modal = document.getElementById('apiKeysModal');
    if (modal) {
        modal.style.display = 'none';
    }
}

// ═══════════════════════════════════════════════════════════════════════════
// HELPER FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════

function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
}

function formatDate(dateString) {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;

    return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined
    });
}

// ═══════════════════════════════════════════════════════════════════════════
// EXPORTS
// ═══════════════════════════════════════════════════════════════════════════

if (typeof window !== 'undefined') {
    window.showApiKeysModal = showApiKeysModal;
    window.closeApiKeysModal = closeApiKeysModal;
    window.listApiKeys = listApiKeys;
    window.createApiKey = createApiKey;
    window.deleteApiKey = deleteApiKey;
    window.updateApiKey = updateApiKey;
    window.copyApiKey = copyApiKey;
    window.toggleApiKey = toggleApiKey;
    window.confirmDeleteApiKey = confirmDeleteApiKey;
    window.showCreateKeyForm = showCreateKeyForm;
    window.submitCreateKey = submitCreateKey;
}

