/**
 * SUPABASE CLIENT INTEGRATION
 * Handles authentication, database operations, and real-time subscriptions
 */

// Supabase configuration - HARDCODED for reliability
const SUPABASE_URL = 'https://jzclawsctaczhgvfpssx.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp6Y2xhd3NjdGFjemhndmZwc3N4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg1MjE2MDEsImV4cCI6MjA4NDA5NzYwMX0.3c08nfLITB4Z-DUZv4f-35CoZN7TXBHLgktgqB5c0K0';

// Initialize Supabase client instance (not the library - that's window.supabase from CDN)
let supabaseClient = null;
let currentUser = null;

// DEBUG: Log OAuth state immediately on script load
console.log('🔍 SUPABASE-CLIENT LOADING...');
console.log('🔍 Current URL:', window.location.href);
console.log('🔍 Hash:', window.location.hash ? 'HAS HASH' : 'NO HASH');
console.log('🔍 Search:', window.location.search ? 'HAS SEARCH' : 'NO SEARCH');
if (window.location.hash.includes('access_token')) {
    console.log('✅ OAuth access_token DETECTED in URL hash!');
}
if (window.location.search.includes('code=')) {
    console.log('✅ OAuth code DETECTED in URL search!');
}
if (window.location.hash.includes('error')) {
    console.log('❌ OAuth ERROR detected in URL:', window.location.hash);
}

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
                console.warn('⚠️ Supabase library not available. Running in demo mode.');
                isInitializing = false;
                isInitialized = false;
                return false;
            }
        }

        supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

        // Verify client was created successfully
        if (!supabaseClient || !supabaseClient.auth) {
            console.warn('⚠️ Supabase client creation failed. Running in demo mode.');
            isInitializing = false;
            isInitialized = false;
            return false;
        }

        // Make globally available
        window.supabaseClient = supabaseClient;

        console.log('✅ Supabase client initialized');
        isInitialized = true;

        // Check if we're in an OAuth callback and set up timeout
        const isOAuthCallback = window.location.hash.includes('access_token') ||
                                window.location.search.includes('code=');
        if (isOAuthCallback) {
            console.log('🔐 OAuth callback detected - setting up 10s timeout');
            // Safety timeout: if OAuth doesn't complete in 10 seconds, show error
            setTimeout(() => {
                if (!currentUser) {
                    console.error('❌ OAuth timeout - tokens not processed in time');
                    // Clean URL and show landing page
                    window.history.replaceState({}, document.title, window.location.pathname);
                    updateUIForLoggedOutUser();
                }
            }, 10000);
        }

        // Let Supabase handle EVERYTHING - just listen for state changes
        // This handles: initial session, OAuth callbacks, sign in, sign out
        const { data: { subscription } } = supabaseClient.auth.onAuthStateChange(
            async (event, session) => {
                console.log('🔐 Auth event:', event, session ? '(has session)' : '(no session)');

                if (event === 'SIGNED_IN' && session) {
                    currentUser = session.user;
                    window.currentUser = currentUser;
                    console.log('👤 Signed in:', currentUser.email);

                    // Clear OAuth flag and remove loading overlay
                    window.OAUTH_IN_PROGRESS = false;
                    const oauthOverlay = document.getElementById('oauthLoadingOverlay');
                    if (oauthOverlay) oauthOverlay.remove();

                    // Clean up OAuth tokens from URL to prevent issues on refresh
                    if (window.location.hash.includes('access_token') || window.location.search.includes('code=')) {
                        console.log('🧹 Cleaning OAuth tokens from URL');
                        window.history.replaceState({}, document.title, window.location.pathname);
                    }

                    updateUIForLoggedInUser();
                } else if (event === 'SIGNED_OUT') {
                    currentUser = null;
                    window.currentUser = null;
                    console.log('👤 Signed out');
                    updateUIForLoggedOutUser();
                } else if (event === 'INITIAL_SESSION') {
                    if (session) {
                        currentUser = session.user;
                        window.currentUser = currentUser;
                        console.log('👤 Initial session:', currentUser.email);
                        updateUIForLoggedInUser();
                    } else {
                        // Check if OAuth callback is in progress - tokens may still be processing
                        const isOAuthCallback = window.location.hash.includes('access_token') ||
                                                window.location.search.includes('code=');
                        if (isOAuthCallback) {
                            console.log('🔐 No session yet but OAuth callback detected - waiting for SIGNED_IN event...');
                            // Don't show landing page - wait for Supabase to process tokens
                        } else {
                            console.log('👤 No initial session');
                            updateUIForLoggedOutUser();
                        }
                    }
                }
            }
        );

        isInitializing = false;
        return true;

    } catch (error) {
        console.error('❌ Failed to initialize Supabase:', error);
        isInitializing = false;
        isInitialized = false;
        return false;
    }
}

/**
 * Sign up new user
 * @param {string} email - User email
 * @param {string} password - User password (min 8 chars)
 * @param {string} displayName - Display name
 */
async function signUp(email, password, displayName) {
    // Input validation
    if (!email || !password) {
        return { success: false, error: 'Email and password are required' };
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
        return { success: false, error: 'Please enter a valid email address' };
    }

    // Password strength validation
    if (password.length < 8) {
        return { success: false, error: 'Password must be at least 8 characters' };
    }

    // Sanitize display name (prevent XSS)
    const sanitizedName = displayName ? displayName.replace(/[<>]/g, '').trim().substring(0, 100) : '';

    try {
        const { data, error } = await supabaseClient.auth.signUp({
            email: email.toLowerCase().trim(),
            password: password,
            options: {
                data: {
                    display_name: sanitizedName
                }
            }
        });

        if (error) throw error;

        console.log('✅ Sign up successful:', data.user.email);

        // Create user profile in database
        if (data.user) {
            await createUserProfile(data.user.id, email.toLowerCase().trim(), sanitizedName);
        }

        return { success: true, user: data.user };

    } catch (error) {
        console.error('❌ Sign up failed:', error.message);
        return { success: false, error: error.message };
    }
}

/**
 * Sign in existing user
 * @param {string} email - User email
 * @param {string} password - User password
 */
async function signIn(email, password) {
    // Input validation
    if (!email || !password) {
        return { success: false, error: 'Email and password are required' };
    }

    // Check Supabase client is ready
    if (!supabaseClient || !supabaseClient.auth) {
        return { success: false, error: 'Authentication service not available' };
    }

    try {
        const { data, error } = await supabaseClient.auth.signInWithPassword({
            email: email.toLowerCase().trim(),
            password: password
        });

        if (error) throw error;

        console.log('✅ Sign in successful:', data.user.email);
        currentUser = data.user;
        window.currentUser = currentUser;

        return { success: true, user: data.user };

    } catch (error) {
        console.error('❌ Sign in failed:', error.message);
        // Don't expose detailed error info to prevent enumeration attacks
        return { success: false, error: 'Invalid email or password' };
    }
}

/**
 * Sign out current user - COMPREHENSIVE cleanup
 */
async function signOut() {
    console.log('🔐 Starting sign out...');

    // Clear local state first
    currentUser = null;
    window.currentUser = null;
    window.OAUTH_IN_PROGRESS = false;

    // Clear ALL Supabase-related storage
    const keysToRemove = [];
    for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && (key.startsWith('sb-') || key.includes('supabase') || key.includes('luvlang'))) {
            keysToRemove.push(key);
        }
    }
    keysToRemove.forEach(key => {
        console.log('   Clearing localStorage:', key);
        localStorage.removeItem(key);
    });

    // Clear session storage
    sessionStorage.clear();
    console.log('   Cleared sessionStorage');

    // Call Supabase sign out
    if (supabaseClient && supabaseClient.auth) {
        try {
            const { error } = await supabaseClient.auth.signOut({ scope: 'global' });
            if (error) {
                console.warn('⚠️ Supabase signOut warning:', error.message);
            } else {
                console.log('✅ Supabase sign out successful');
            }
        } catch (error) {
            console.warn('⚠️ Supabase signOut error:', error.message);
        }
    }

    return { success: true };
}

/**
 * Create user profile in database
 */
async function createUserProfile(userId, email, displayName) {
    try {
        const { data, error } = await supabaseClient
            .from('profiles')
            .insert([
                {
                    id: userId,
                    email: email,
                    display_name: displayName,
                    tier: 'free', // Default to free tier
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
 * SUBSCRIPTION TIERS CONFIGURATION
 * Defines features and limits for each tier
 */
const SUBSCRIPTION_TIERS = {
    free: {
        name: 'Free',
        price: 0,
        limits: {
            presets: 3,
            historyDays: 7,
            exportsPerMonth: 5,
            maxFileSize: 25 // MB
        },
        features: {
            aiMastering: true,
            basicEQ: true,
            lufsMetering: true,
            basicLimiter: true,
            // Premium features DISABLED
            ircLimiter: false,
            softClipper: false,
            upwardCompression: false,
            unlimiter: false,
            linearPhaseEQ: false,
            loudnessHistory: false,
            spectrogram: false,
            multitrackBatch: false,
            cloudSync: false,
            referenceMatching: false,
            stemSeparation: false,
            advancedAnalytics: false,
            priorityProcessing: false
        }
    },
    pro: {
        name: 'Pro',
        price: 9.99,
        limits: {
            presets: 50,
            historyDays: 90,
            exportsPerMonth: 100,
            maxFileSize: 100 // MB
        },
        features: {
            aiMastering: true,
            basicEQ: true,
            lufsMetering: true,
            basicLimiter: true,
            // PRO features ENABLED
            ircLimiter: true,
            softClipper: true,
            upwardCompression: true,
            unlimiter: true,
            linearPhaseEQ: true,
            loudnessHistory: true,
            spectrogram: true,
            multitrackBatch: false,
            cloudSync: true,
            referenceMatching: false,
            stemSeparation: false,
            advancedAnalytics: true,
            priorityProcessing: false
        }
    },
    legendary: {
        name: 'Legendary',
        price: 29.99,
        limits: {
            presets: -1, // Unlimited
            historyDays: 365,
            exportsPerMonth: -1, // Unlimited
            maxFileSize: 500 // MB
        },
        features: {
            aiMastering: true,
            basicEQ: true,
            lufsMetering: true,
            basicLimiter: true,
            // ALL features ENABLED
            ircLimiter: true,
            softClipper: true,
            upwardCompression: true,
            unlimiter: true,
            linearPhaseEQ: true,
            loudnessHistory: true,
            spectrogram: true,
            multitrackBatch: true,
            cloudSync: true,
            referenceMatching: true,
            stemSeparation: true,
            advancedAnalytics: true,
            priorityProcessing: true
        }
    }
};

// Make tiers globally available
if (typeof window !== 'undefined') {
    window.SUBSCRIPTION_TIERS = SUBSCRIPTION_TIERS;
}

/**
 * Get user subscription tier
 */
async function getUserSubscription() {
    if (!currentUser) {
        return {
            tier: 'free',
            tierData: SUBSCRIPTION_TIERS.free,
            limits: SUBSCRIPTION_TIERS.free.limits,
            features: SUBSCRIPTION_TIERS.free.features
        };
    }

    try {
        const { data, error } = await supabaseClient
            .from('profiles')
            .select('tier')
            .eq('id', currentUser.id)
            .single();

        if (error) throw error;

        const tierName = data.tier || 'free';
        const tierData = SUBSCRIPTION_TIERS[tierName] || SUBSCRIPTION_TIERS.free;

        return {
            tier: tierName,
            tierData: tierData,
            limits: tierData.limits,
            features: tierData.features
        };

    } catch (error) {
        console.error('❌ Failed to get subscription:', error.message);
        return {
            tier: 'free',
            tierData: SUBSCRIPTION_TIERS.free,
            limits: SUBSCRIPTION_TIERS.free.limits,
            features: SUBSCRIPTION_TIERS.free.features
        };
    }
}

/**
 * Check if user has access to a specific feature
 */
async function hasFeature(featureName) {
    const subscription = await getUserSubscription();
    return subscription.features[featureName] || false;
}

/**
 * Get all available features for current user
 */
async function getAvailableFeatures() {
    const subscription = await getUserSubscription();
    return {
        tier: subscription.tier,
        features: subscription.features,
        limits: subscription.limits
    };
}

/**
 * Update UI elements based on subscription tier
 * Locks/unlocks premium features
 */
async function applyTierRestrictions() {
    const subscription = await getUserSubscription();
    const features = subscription.features;

    console.log(`🔐 Applying tier restrictions for: ${subscription.tier.toUpperCase()}`);

    // IRC Limiter
    const ircContainer = document.getElementById('limiterModeContainer');
    if (ircContainer) {
        if (!features.ircLimiter) {
            ircContainer.classList.add('feature-locked');
            ircContainer.setAttribute('data-locked', 'true');
            ircContainer.setAttribute('data-upgrade-tier', 'pro');
        } else {
            ircContainer.classList.remove('feature-locked');
            ircContainer.removeAttribute('data-locked');
        }
    }

    // Soft Clipper
    const softClipContainer = document.getElementById('softClipperContainer');
    if (softClipContainer) {
        if (!features.softClipper) {
            softClipContainer.classList.add('feature-locked');
            softClipContainer.setAttribute('data-locked', 'true');
        } else {
            softClipContainer.classList.remove('feature-locked');
        }
    }

    // Upward Compression
    const upwardContainer = document.getElementById('upwardCompContainer');
    if (upwardContainer) {
        if (!features.upwardCompression) {
            upwardContainer.classList.add('feature-locked');
            upwardContainer.setAttribute('data-locked', 'true');
        } else {
            upwardContainer.classList.remove('feature-locked');
        }
    }

    // Unlimiter
    const unlimiterContainer = document.getElementById('unlimiterContainer');
    if (unlimiterContainer) {
        if (!features.unlimiter) {
            unlimiterContainer.classList.add('feature-locked');
            unlimiterContainer.setAttribute('data-locked', 'true');
        } else {
            unlimiterContainer.classList.remove('feature-locked');
        }
    }

    // Loudness History
    const loudnessContainer = document.getElementById('loudnessHistoryContainer');
    if (loudnessContainer) {
        if (!features.loudnessHistory) {
            loudnessContainer.classList.add('feature-locked');
            loudnessContainer.setAttribute('data-locked', 'true');
        } else {
            loudnessContainer.classList.remove('feature-locked');
        }
    }

    // Spectrogram
    const spectrogramContainer = document.getElementById('spectrogramContainer');
    if (spectrogramContainer) {
        if (!features.spectrogram) {
            spectrogramContainer.classList.add('feature-locked');
            spectrogramContainer.setAttribute('data-locked', 'true');
        } else {
            spectrogramContainer.classList.remove('feature-locked');
        }
    }

    // Store current subscription for quick access
    window.currentSubscription = subscription;

    return subscription;
}

/**
 * Update UI for logged in user
 */
async function updateUIForLoggedInUser() {
    console.log('✅ User logged in, updating UI...');

    // Store auth state
    sessionStorage.setItem('luvlang_authenticated', 'true');

    // Clear old tour flags so language selection shows
    localStorage.removeItem('voiceTourCompleted');
    localStorage.removeItem('tourLanguage');

    // Show loading screen then language selection
    if (window.OnboardingFlow && window.OnboardingFlow.onLoginSuccess) {
        window.OnboardingFlow.onLoginSuccess();
    } else {
        // Fallback: directly hide signup gate
        const signupGate = document.getElementById('signupGateOverlay');
        if (signupGate) {
            signupGate.classList.add('hidden');
            signupGate.style.display = 'none';
        }
    }

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
    // CRITICAL: Check if we're in an OAuth callback - don't show landing page yet!
    // Use both the global flag AND URL check for safety
    const isOAuthCallback = window.OAUTH_IN_PROGRESS ||
                            window.location.hash.includes('access_token') ||
                            window.location.search.includes('code=');

    if (isOAuthCallback) {
        console.log('🔐 OAuth callback in progress - NOT showing landing page, waiting for token processing...');
        // Don't clear state or show landing page during OAuth callback
        // Supabase will fire SIGNED_IN event once tokens are processed
        return;
    }

    console.log('👤 User not logged in, showing landing page...');

    // Clear all auth and tour state
    sessionStorage.removeItem('luvlang_authenticated');
    sessionStorage.removeItem('voiceTourStarted');
    localStorage.removeItem('voiceTourCompleted');
    localStorage.removeItem('tourLanguage');
    localStorage.removeItem('luvlang_language_selected');

    // Show the landing page via OnboardingFlow
    if (typeof window.OnboardingFlow !== 'undefined' && typeof window.OnboardingFlow.showLandingPage === 'function') {
        window.OnboardingFlow.showLandingPage();
    }

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
    window.hasFeature = hasFeature;
    window.getAvailableFeatures = getAvailableFeatures;
    window.applyTierRestrictions = applyTierRestrictions;
    window.SUBSCRIPTION_TIERS = SUBSCRIPTION_TIERS;
    window.currentUser = currentUser;
}

console.log('✅ Supabase client module loaded');
console.log('   Subscription Tiers: Free, Pro ($9.99/mo), Legendary ($29.99/mo)');
