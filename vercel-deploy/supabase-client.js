/**
 * SUPABASE CLIENT INTEGRATION
 * Handles authentication, database operations, and real-time subscriptions
 */

// Supabase configuration - loaded from environment variables
// Set these in Vercel Dashboard → Settings → Environment Variables:
// - SUPABASE_URL
// - SUPABASE_ANON_KEY
const getEnvConfig = () => {
    // Try to get from build-time injected config
    if (typeof window !== 'undefined' && window.__ENV__) {
        return {
            url: window.__ENV__.SUPABASE_URL,
            anonKey: window.__ENV__.SUPABASE_ANON_KEY
        };
    }
    // Fallback for local development - set these in your local env-config.js
    console.warn('⚠️ Environment config not found. Set SUPABASE_URL and SUPABASE_ANON_KEY in Vercel.');
    return { url: '', anonKey: '' };
};

const envConfig = getEnvConfig();
const SUPABASE_URL = envConfig.url;
const SUPABASE_ANON_KEY = envConfig.anonKey;

// Initialize Supabase client instance (not the library - that's window.supabase from CDN)
let supabaseClient = null;
let currentUser = null;

// Make supabase client available globally for payment integration
if (typeof window !== 'undefined') {
    window.supabaseClient = null;
    window.currentUser = null;
}

// Track initialization state
let isInitialized = false;
let isInitializing = false;

/**
 * Initialize Supabase client
 * Call this once when the app loads
 */
async function initializeSupabase() {
    // Prevent multiple simultaneous initializations
    if (isInitializing) {
        console.log('⏳ Supabase initialization already in progress...');
        // Wait for initialization to complete
        return new Promise((resolve) => {
            const checkInit = setInterval(() => {
                if (isInitialized) {
                    clearInterval(checkInit);
                    resolve(true);
                }
            }, 100);
        });
    }

    if (isInitialized && supabaseClient) {
        console.log('✅ Supabase already initialized');
        return true;
    }

    isInitializing = true;

    try {
        // Check if @supabase/supabase-js is loaded
        if (!window.supabase || !window.supabase.createClient) {
            console.warn('⚠️ Supabase library not loaded yet, waiting...');
            // Wait a moment for CDN to load
            await new Promise(resolve => setTimeout(resolve, 500));

            if (!window.supabase || !window.supabase.createClient) {
                throw new Error('Supabase library not loaded. Add <script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script> to your HTML.');
            }
        }

        supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

        // Make globally available
        window.supabaseClient = supabaseClient;

        console.log('✅ Supabase client initialized');
        isInitialized = true;

        // Try to check auth session, but don't block if it fails
        try {
            const { data: { session }, error } = await supabaseClient.auth.getSession();

            if (error) {
                console.warn('⚠️ Auth session check failed:', error.message);
                updateUIForLoggedOutUser();
            } else if (session) {
                currentUser = session.user;
                window.currentUser = currentUser;
                console.log('👤 User already logged in:', currentUser.email);
                updateUIForLoggedInUser();
            } else {
                console.log('👤 No active session');
                updateUIForLoggedOutUser();
            }
        } catch (authError) {
            console.warn('⚠️ Auth check skipped:', authError.message);
            updateUIForLoggedOutUser();
        }

        // Listen for auth state changes
        try {
            supabaseClient.auth.onAuthStateChange((event, session) => {
                console.log('🔐 Auth state changed:', event);

                if (session) {
                    currentUser = session.user;
                    window.currentUser = currentUser;
                    updateUIForLoggedInUser();
                } else {
                    currentUser = null;
                    window.currentUser = null;
                    updateUIForLoggedOutUser();
                }
            });
        } catch (listenerError) {
            console.warn('⚠️ Auth listener setup skipped:', listenerError.message);
        }

        isInitializing = false;
        return true;

    } catch (error) {
        console.error('❌ Failed to initialize Supabase:', error);
        isInitializing = false;
        isInitialized = false;
        // Still allow app to function without Supabase
        updateUIForLoggedOutUser();
        return false;
    }
}

/**
 * Sign up new user
 */
async function signUp(email, password, displayName) {
    try {
        const { data, error } = await supabaseClient.auth.signUp({
            email: email,
            password: password,
            options: {
                data: {
                    display_name: displayName
                }
            }
        });

        if (error) throw error;

        console.log('✅ Sign up successful:', data.user.email);

        // Create user profile in database
        if (data.user) {
            await createUserProfile(data.user.id, email, displayName);
        }

        return { success: true, user: data.user };

    } catch (error) {
        console.error('❌ Sign up failed:', error.message);
        return { success: false, error: error.message };
    }
}

/**
 * Sign in existing user
 */
async function signIn(email, password) {
    try {
        const { data, error } = await supabaseClient.auth.signInWithPassword({
            email: email,
            password: password
        });

        if (error) throw error;

        console.log('✅ Sign in successful:', data.user.email);
        currentUser = data.user;

        return { success: true, user: data.user };

    } catch (error) {
        console.error('❌ Sign in failed:', error.message);
        return { success: false, error: error.message };
    }
}

/**
 * Sign out current user
 */
async function signOut() {
    try {
        const { error } = await supabaseClient.auth.signOut();

        if (error) throw error;

        console.log('✅ Sign out successful');
        currentUser = null;

        return { success: true };

    } catch (error) {
        console.error('❌ Sign out failed:', error.message);
        return { success: false, error: error.message };
    }
}

/**
 * Create user profile in database
 */
async function createUserProfile(userId, email, displayName) {
    try {
        const { data, error } = await supabaseClient
            .from('user_profiles')
            .insert([
                {
                    id: userId,
                    email: email,
                    display_name: displayName,
                    subscription_tier: 'free', // Default to free tier
                    created_at: new Date().toISOString()
                }
            ]);

        if (error) throw error;

        console.log('✅ User profile created');
        return { success: true };

    } catch (error) {
        console.error('❌ Failed to create user profile:', error.message);
        return { success: false, error: error.message };
    }
}

/**
 * Save user preset to database
 */
async function savePreset(presetName, presetData) {
    if (!currentUser) {
        console.error('❌ Must be logged in to save presets');
        return { success: false, error: 'Not authenticated' };
    }

    try {
        const { data, error } = await supabaseClient
            .from('user_presets')
            .insert([
                {
                    user_id: currentUser.id,
                    preset_name: presetName,
                    eq_settings: presetData.eq,
                    compressor_settings: presetData.compressor,
                    limiter_settings: presetData.limiter,
                    target_lufs: presetData.targetLUFS,
                    created_at: new Date().toISOString()
                }
            ]);

        if (error) throw error;

        console.log('✅ Preset saved:', presetName);
        return { success: true };

    } catch (error) {
        console.error('❌ Failed to save preset:', error.message);
        return { success: false, error: error.message };
    }
}

/**
 * Load user presets from database
 */
async function loadPresets() {
    if (!currentUser) {
        console.error('❌ Must be logged in to load presets');
        return { success: false, error: 'Not authenticated' };
    }

    try {
        const { data, error } = await supabaseClient
            .from('user_presets')
            .select('*')
            .eq('user_id', currentUser.id)
            .order('created_at', { ascending: false });

        if (error) throw error;

        console.log(`✅ Loaded ${data.length} presets`);
        return { success: true, presets: data };

    } catch (error) {
        console.error('❌ Failed to load presets:', error.message);
        return { success: false, error: error.message };
    }
}

/**
 * Save mastering session to history
 */
async function saveMasteringHistory(sessionData) {
    if (!currentUser) {
        console.error('❌ Must be logged in to save history');
        return { success: false, error: 'Not authenticated' };
    }

    try {
        const { data, error } = await supabaseClient
            .from('mastering_history')
            .insert([
                {
                    user_id: currentUser.id,
                    original_filename: sessionData.filename,
                    target_platform: sessionData.platform,
                    target_lufs: sessionData.targetLUFS,
                    final_lufs: sessionData.finalLUFS,
                    true_peak: sessionData.truePeak,
                    processing_settings: sessionData.settings,
                    created_at: new Date().toISOString()
                }
            ]);

        if (error) throw error;

        console.log('✅ Mastering session saved to history');
        return { success: true };

    } catch (error) {
        console.error('❌ Failed to save history:', error.message);
        return { success: false, error: error.message };
    }
}

/**
 * Load mastering history
 */
async function loadMasteringHistory(limit = 10) {
    if (!currentUser) {
        console.error('❌ Must be logged in to load history');
        return { success: false, error: 'Not authenticated' };
    }

    try {
        const { data, error } = await supabaseClient
            .from('mastering_history')
            .select('*')
            .eq('user_id', currentUser.id)
            .order('created_at', { ascending: false })
            .limit(limit);

        if (error) throw error;

        console.log(`✅ Loaded ${data.length} history items`);
        return { success: true, history: data };

    } catch (error) {
        console.error('❌ Failed to load history:', error.message);
        return { success: false, error: error.message };
    }
}

/**
 * Get user subscription tier
 */
async function getUserSubscription() {
    if (!currentUser) {
        return { tier: 'free', limits: { presets: 3, historyDays: 7 } };
    }

    try {
        const { data, error } = await supabaseClient
            .from('user_profiles')
            .select('subscription_tier')
            .eq('id', currentUser.id)
            .single();

        if (error) throw error;

        // Get tier limits from mastering_tiers table
        const { data: tierData, error: tierError } = await supabaseClient
            .from('mastering_tiers')
            .select('*')
            .eq('tier_name', data.subscription_tier)
            .single();

        if (tierError) throw tierError;

        // Extract max_presets from features JSON or use default
        const maxPresets = tierData.features?.max_presets || 999;

        return {
            tier: data.subscription_tier,
            limits: {
                presets: maxPresets,
                historyDays: 365, // Default to 1 year
                features: tierData.features
            }
        };

    } catch (error) {
        console.error('❌ Failed to get subscription:', error.message);
        return { tier: 'free', limits: { presets: 3, historyDays: 7 } };
    }
}

/**
 * Update UI for logged in user
 */
async function updateUIForLoggedInUser() {
    // Hide auth buttons section, show user menu
    const authButtons = document.getElementById('authButtons');
    if (authButtons) {
        authButtons.style.display = 'none';
    }

    const userMenu = document.getElementById('userMenu');
    if (userMenu) {
        userMenu.style.display = 'block';
    }

    // Show user email
    const userEmail = document.getElementById('userEmail');
    if (userEmail && currentUser) {
        userEmail.textContent = currentUser.email;
    }

    // Get and display subscription tier
    const userTier = document.getElementById('userTier');
    if (userTier) {
        const subscription = await getUserSubscription();
        const tierName = subscription.tier.charAt(0).toUpperCase() + subscription.tier.slice(1);
        userTier.textContent = `${tierName} tier`;
    }

    // Enable cloud features
    const savePresetBtn = document.getElementById('savePresetBtn');
    if (savePresetBtn) {
        savePresetBtn.disabled = false;
        savePresetBtn.title = 'Save preset to cloud';
    }
}

/**
 * Update UI for logged out user
 */
function updateUIForLoggedOutUser() {
    // Hide user menu, show auth buttons
    const userMenu = document.getElementById('userMenu');
    if (userMenu) {
        userMenu.style.display = 'none';
    }

    const authButtons = document.getElementById('authButtons');
    if (authButtons) {
        authButtons.style.display = 'flex';
    }

    // Disable cloud features
    const savePresetBtn = document.getElementById('savePresetBtn');
    if (savePresetBtn) {
        savePresetBtn.disabled = true;
        savePresetBtn.title = 'Sign in to save presets to cloud';
    }
}

// Export functions
if (typeof window !== 'undefined') {
    window.initializeSupabase = initializeSupabase;
    window.signUp = signUp;
    window.signIn = signIn;
    window.signOut = signOut;
    window.savePreset = savePreset;
    window.loadPresets = loadPresets;
    window.saveMasteringHistory = saveMasteringHistory;
    window.loadMasteringHistory = loadMasteringHistory;
    window.getUserSubscription = getUserSubscription;
    window.currentUser = currentUser;
}

console.log('✅ Supabase client module loaded');
