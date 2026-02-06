/**
 * STRIPE PAYMENT INTEGRATION
 * Handles per-song purchases for LuvLang Mastering
 * Tiers: INSTANT ($9.99), PRECISION ($19.99), LEGENDARY ($29.99)
 *
 * SECURITY: Keys loaded from config.js - never hardcode in production
 */

// Initialize Stripe
let stripe = null;
let currentPurchaseData = null;

/**
 * Get Stripe publishable key from config
 */
function getStripePublishableKey() {
    if (typeof LUVLANG_CONFIG !== 'undefined' && LUVLANG_CONFIG.stripe) {
        return LUVLANG_CONFIG.stripe.publishableKey;
    }
    console.warn('⚠️ LUVLANG_CONFIG not loaded, using fallback');
    return null;
}

/**
 * Initialize Stripe client
 * Call this once when the app loads
 */
async function initializeStripe() {
    try {
        // Check if Stripe.js is loaded
        if (typeof Stripe === 'undefined') {
            console.error('❌ Stripe.js not loaded. Add <script src="https://js.stripe.com/v3/"></script> to your HTML');
            return false;
        }

        // Get publishable key from config
        const publishableKey = getStripePublishableKey();
        if (!publishableKey) {
            console.error('❌ Stripe publishable key not configured');
            return false;
        }

        // Initialize Stripe with publishable key
        stripe = Stripe(publishableKey);

        // Log mode (test vs live)
        if (typeof LUVLANG_CONFIG !== 'undefined') {

        }

        return true;

    } catch (error) {
        console.error('❌ Failed to initialize Stripe:', error);
        return false;
    }
}

/**
 * Mastering tier definitions
 */
const MASTERING_TIERS = {
    instant: {
        name: 'INSTANT',
        slug: 'instant',
        price: 9.99,
        priceId: 'price_instant_999', // You'll create this in Stripe Dashboard
        features: [
            'AI-powered loudness normalization (99%+ LUFS accuracy)',
            'Platform presets (Spotify, Apple Music, YouTube, Tidal)',
            '7-band professional EQ',
            'Dynamic compression & true peak limiting',
            'Stereo WAV export (24-bit, 44.1kHz)',
            'Instant delivery (60 seconds)'
        ],
        capabilities: {
            transientDetection: false,
            noiseRemoval: false,
            stereoEditor: false,
            stemMastering: false,
            referenceMatching: false,
            masteringReport: false,
            exportFormats: ['WAV']
        }
    },
    precision: {
        name: 'PRECISION',
        slug: 'precision',
        price: 19.99,
        priceId: 'price_precision_1999', // You'll create this in Stripe Dashboard
        features: [
            'Everything in INSTANT, plus:',
            'Real-time transient detection (drum optimization)',
            'AI spectral noise removal (4 noise types)',
            '7-band stereo field editor',
            'Interactive waveform editing',
            'Multi-format export (WAV, MP3, FLAC)',
            '5 custom preset saves',
            'Session history (90 days)'
        ],
        capabilities: {
            transientDetection: true,
            noiseRemoval: true,
            stereoEditor: true,
            stemMastering: false,
            referenceMatching: false,
            masteringReport: false,
            exportFormats: ['WAV', 'MP3', 'FLAC']
        }
    },
    legendary: {
        name: 'LEGENDARY',
        slug: 'legendary',
        price: 29.99,
        priceId: 'price_legendary_2999', // You'll create this in Stripe Dashboard
        features: [
            'Everything in PRECISION, plus:',
            'Stem mastering (up to 5 stems)',
            'Reference track matching',
            'Advanced spectral repair',
            'Offline true peak analysis',
            'Unlimited custom presets',
            'Session history (365 days)',
            'Downloadable mastering report',
            'Priority processing & support'
        ],
        capabilities: {
            transientDetection: true,
            noiseRemoval: true,
            stereoEditor: true,
            stemMastering: true,
            referenceMatching: true,
            masteringReport: true,
            exportFormats: ['WAV', 'MP3', 'FLAC', 'AIFF']
        }
    }
};

/**
 * Get the API base URL from config
 */
function getApiBaseUrl() {
    if (typeof LUVLANG_CONFIG !== 'undefined' && LUVLANG_CONFIG.isProduction) {
        // Production: use the Vercel API routes or your server
        return process.env.API_URL || '';
    }
    // Development: use local server
    return 'http://localhost:3000';
}

/**
 * Create a Stripe Checkout session for a tier
 *
 * @param {string} tierSlug - 'instant', 'precision', or 'legendary'
 * @param {object} sessionData - Audio processing data to attach to purchase
 * @returns {Promise<object>} Success/error result
 */
async function createCheckoutSession(tierSlug, sessionData = {}) {
    if (!stripe) {
        console.error('❌ Stripe not initialized. Call initializeStripe() first.');
        return { success: false, error: 'Stripe not initialized' };
    }

    const tier = MASTERING_TIERS[tierSlug];
    if (!tier) {
        console.error('❌ Invalid tier:', tierSlug);
        return { success: false, error: 'Invalid tier' };
    }

    // Store session data for later
    currentPurchaseData = {
        tierSlug: tierSlug,
        tierName: tier.name,
        price: tier.price,
        filename: sessionData.filename || 'untitled',
        targetLUFS: sessionData.targetLUFS || -14.0,
        finalLUFS: sessionData.finalLUFS,
        truePeak: sessionData.truePeak,
        settings: sessionData.settings || {},
        timestamp: new Date().toISOString()
    };

    // Check if we're in demo mode
    const isDemoMode = typeof LUVLANG_CONFIG !== 'undefined' && LUVLANG_CONFIG.features?.demoMode;

    if (isDemoMode) {

        localStorage.setItem('pendingPurchase', JSON.stringify(currentPurchaseData));

        return {
            success: true,
            demoMode: true,
            message: 'Demo checkout initiated',
            tier: tier.name,
            price: tier.price
        };
    }

    try {
        // Get user ID if logged in
        let userId = null;
        if (typeof supabase !== 'undefined' && supabase) {
            const { data: { user } } = await supabase.auth.getUser();
            userId = user?.id || null;
        }

        // Store pending purchase before redirect
        localStorage.setItem('pendingPurchase', JSON.stringify(currentPurchaseData));

        // Call backend to create checkout session
        const apiUrl = getApiBaseUrl();
        const response = await fetch(`${apiUrl}/api/create-checkout-session`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                tier: tierSlug,
                sessionData: {
                    ...sessionData,
                    userId: userId,
                    filename: sessionData.filename || 'untitled',
                    targetLUFS: sessionData.targetLUFS || -14.0,
                    finalLUFS: sessionData.finalLUFS,
                    truePeak: sessionData.truePeak,
                    timestamp: new Date().toISOString()
                },
                successUrl: `${window.location.origin}/success?session_id={CHECKOUT_SESSION_ID}`,
                cancelUrl: `${window.location.origin}/cancel`
            })
        });

        const result = await response.json();

        if (!result.success) {
            throw new Error(result.error || 'Failed to create checkout session');
        }

        // Redirect to Stripe Checkout
        if (result.url) {
            // Direct URL redirect (recommended)
            window.location.href = result.url;
        } else {
            // Fallback to Stripe.js redirect
            const { error } = await stripe.redirectToCheckout({
                sessionId: result.sessionId
            });

            if (error) {
                throw new Error(error.message);
            }
        }

        return {
            success: true,
            message: 'Redirecting to Stripe Checkout',
            tier: tier.name,
            price: tier.price,
            sessionId: result.sessionId
        };

    } catch (error) {
        console.error('❌ Checkout failed:', error.message);
        return { success: false, error: error.message };
    }
}

/**
 * Handle successful payment
 * Called after user returns from Stripe Checkout
 *
 * @param {string} sessionId - Stripe checkout session ID
 * @returns {Promise<object>} Purchase details
 */
async function handlePaymentSuccess(sessionId) {
    try {
        // Retrieve pending purchase data
        const pendingPurchase = localStorage.getItem('pendingPurchase');
        const purchaseData = pendingPurchase ? JSON.parse(pendingPurchase) : null;

        // Check if we're in demo mode
        const isDemoMode = typeof LUVLANG_CONFIG !== 'undefined' && LUVLANG_CONFIG.features?.demoMode;

        if (!isDemoMode && sessionId) {
            // PRODUCTION: Verify payment with backend
            const apiUrl = getApiBaseUrl();
            const response = await fetch(`${apiUrl}/api/verify-payment`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ sessionId: sessionId })
            });

            const verification = await response.json();

            if (!verification.success || !verification.verified) {
                throw new Error('Payment verification failed');
            }

            // Update purchase data with verified info
            if (purchaseData) {
                purchaseData.verified = true;
                purchaseData.customerEmail = verification.customerEmail;
            }
        }

        // Save purchase to Supabase (client-side backup)
        if (typeof supabase !== 'undefined' && supabase && purchaseData) {
            const { data: { user } } = await supabase.auth.getUser();

            if (user) {
                // Get tier ID from database
                const { data: tier } = await supabase
                    .from('mastering_tiers')
                    .select('id')
                    .eq('tier_slug', purchaseData.tierSlug)
                    .single();

                if (tier) {
                    // Check if purchase already exists (webhook may have created it)
                    const { data: existingPurchase } = await supabase
                        .from('purchases')
                        .select('id')
                        .eq('payment_id', sessionId)
                        .single();

                    if (!existingPurchase) {
                        // Record purchase (only if not already recorded by webhook)
                        const { data: purchase, error } = await supabase
                            .from('purchases')
                            .insert({
                                user_id: user.id,
                                tier_id: tier.id,
                                tier_slug: purchaseData.tierSlug,
                                amount_paid: purchaseData.price,
                                currency: 'USD',
                                payment_provider: 'stripe',
                                payment_id: sessionId,
                                payment_status: 'succeeded',
                                original_filename: purchaseData.filename,
                                target_lufs: purchaseData.targetLUFS,
                                final_lufs: purchaseData.finalLUFS,
                                true_peak: purchaseData.truePeak,
                                processing_settings: purchaseData.settings,
                                completed_at: new Date().toISOString()
                            })
                            .select()
                            .single();

                        if (error) {
                            console.error('❌ Failed to save purchase:', error);
                        } else {

                        }
                    } else {

                    }
                }
            }
        }

        // Clear pending purchase
        localStorage.removeItem('pendingPurchase');

        return {
            success: true,
            purchase: purchaseData,
            sessionId: sessionId
        };

    } catch (error) {
        console.error('❌ Payment processing failed:', error.message);
        return { success: false, error: error.message };
    }
}

/**
 * Check if user has purchased a specific tier
 *
 * @param {string} tierSlug - Tier to check
 * @returns {Promise<boolean>} True if user has access
 */
async function hasAccessToTier(tierSlug) {
    try {
        if (typeof supabase === 'undefined' || !supabase) {
            console.warn('⚠️ Supabase not available. Cannot check tier access.');
            return false;
        }

        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
            return false; // Not logged in
        }

        // Check if user has any successful purchases for this tier or higher
        const { data: purchases, error } = await supabase
            .from('purchases')
            .select('tier_slug, amount_paid')
            .eq('user_id', user.id)
            .eq('payment_status', 'succeeded')
            .order('amount_paid', { ascending: false });

        if (error) {
            console.error('❌ Failed to check tier access:', error);
            return false;
        }

        // If user has purchased LEGENDARY, they have access to all tiers
        if (purchases.some(p => p.tier_slug === 'legendary')) {
            return true;
        }

        // If user has purchased PRECISION, they have access to INSTANT and PRECISION
        if (tierSlug === 'instant' || tierSlug === 'precision') {
            if (purchases.some(p => p.tier_slug === 'precision' || p.tier_slug === 'legendary')) {
                return true;
            }
        }

        // Check if user has purchased the specific tier
        return purchases.some(p => p.tier_slug === tierSlug);

    } catch (error) {
        console.error('❌ Error checking tier access:', error);
        return false;
    }
}

/**
 * Get user's highest purchased tier
 *
 * @returns {Promise<object>} Tier data or null
 */
async function getUserHighestTier() {
    try {
        if (typeof supabase === 'undefined' || !supabase) {
            return null;
        }

        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
            return null;
        }

        const { data: purchases } = await supabase
            .from('purchases')
            .select('tier_slug, amount_paid')
            .eq('user_id', user.id)
            .eq('payment_status', 'succeeded')
            .order('amount_paid', { ascending: false })
            .limit(1);

        if (!purchases || purchases.length === 0) {
            return null;
        }

        const highestPurchase = purchases[0];
        return MASTERING_TIERS[highestPurchase.tier_slug];

    } catch (error) {
        console.error('❌ Error getting highest tier:', error);
        return null;
    }
}

/**
 * Show payment modal for tier selection
 *
 * @param {object} sessionData - Current mastering session data
 */
function showPaymentModal(sessionData = {}) {
    // Check if modal already exists
    let modal = document.getElementById('paymentModal');

    if (!modal) {
        // Create modal HTML
        const modalHTML = `
            <div id="paymentModal" style="display: none; position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.9); z-index: 10000; justify-content: center; align-items: center; overflow-y: auto; padding: 20px;">
                <div style="background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%); border-radius: 20px; max-width: 1200px; width: 100%; padding: 50px 30px; position: relative; box-shadow: 0 20px 60px rgba(0,0,0,0.5);">
                    <button id="closePaymentModal" style="position: absolute; top: 20px; right: 20px; background: rgba(255,255,255,0.1); border: none; color: white; font-size: 2rem; width: 40px; height: 40px; border-radius: 50%; cursor: pointer; display: flex; align-items: center; justify-content: center;">&times;</button>

                    <h2 style="text-align: center; font-size: 2.5rem; margin-bottom: 15px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text;">
                        Choose Your Mastering Tier
                    </h2>

                    <p style="text-align: center; color: #a8a8b3; margin-bottom: 50px; font-size: 1.1rem;">
                        Your master is ready! Select a tier to download your professionally mastered track.
                    </p>

                    <div id="paymentTiersGrid" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 30px;">
                        <!-- Tiers will be populated here -->
                    </div>
                </div>
            </div>
        `;

        document.body.insertAdjacentHTML('beforeend', modalHTML);
        modal = document.getElementById('paymentModal');

        // Add close handlers
        document.getElementById('closePaymentModal').addEventListener('click', closePaymentModal);
        modal.addEventListener('click', (e) => {
            if (e.target.id === 'paymentModal') {
                closePaymentModal();
            }
        });
    }

    // Populate tiers
    const tiersGrid = document.getElementById('paymentTiersGrid');
    tiersGrid.innerHTML = '';

    Object.entries(MASTERING_TIERS).forEach(([slug, tier]) => {
        const tierCard = document.createElement('div');
        tierCard.style.cssText = `
            background: linear-gradient(135deg, rgba(255,255,255,0.05) 0%, rgba(255,255,255,0.02) 100%);
            border: 1px solid rgba(255,255,255,0.1);
            border-radius: 16px;
            padding: 40px 30px;
            text-align: center;
            transition: transform 0.3s, border-color 0.3s;
        `;

        tierCard.innerHTML = `
            <h3 style="font-size: 1.5rem; margin-bottom: 10px; color: white;">${tier.name}</h3>
            <div style="font-size: 3rem; font-weight: 900; margin: 20px 0; background: linear-gradient(135deg, #ffffff 0%, #a8a8b3 100%); -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text;">
                $${tier.price.toFixed(2)}
            </div>
            <button class="purchase-tier-btn" data-tier="${slug}" style="
                width: 100%;
                padding: 15px;
                border-radius: 12px;
                border: none;
                font-size: 1.1rem;
                font-weight: 700;
                cursor: pointer;
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                color: white;
                margin-bottom: 20px;
                transition: transform 0.2s;
            ">
                Select ${tier.name}
            </button>
            <ul style="list-style: none; padding: 0; text-align: left; font-size: 0.9rem; color: #a8a8b3;">
                ${tier.features.slice(0, 4).map(f => `
                    <li style="padding: 8px 0; border-bottom: 1px solid rgba(255,255,255,0.1);">
                        <span style="color: #38d9a9; margin-right: 8px;">✓</span> ${f}
                    </li>
                `).join('')}
            </ul>
        `;

        tiersGrid.appendChild(tierCard);
    });

    // Add click handlers for purchase buttons
    document.querySelectorAll('.purchase-tier-btn').forEach(btn => {
        btn.addEventListener('click', async (e) => {
            const tierSlug = e.target.dataset.tier;
            await handleTierPurchase(tierSlug, sessionData);
        });

        btn.addEventListener('mouseenter', (e) => {
            e.target.style.transform = 'translateY(-2px)';
        });

        btn.addEventListener('mouseleave', (e) => {
            e.target.style.transform = 'translateY(0)';
        });
    });

    // Show modal
    modal.style.display = 'flex';
}

/**
 * Close payment modal
 */
function closePaymentModal() {
    const modal = document.getElementById('paymentModal');
    if (modal) {
        modal.style.display = 'none';
    }
}

/**
 * Handle tier purchase
 */
async function handleTierPurchase(tierSlug, sessionData) {
    const tier = MASTERING_TIERS[tierSlug];

    // Check if user is logged in
    if (typeof supabase !== 'undefined' && supabase) {
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
            (typeof showLuvLangToast==='function'?showLuvLangToast('Please sign in to purchase. Your mastering session will be saved.'):void 0);
            // Trigger sign-in modal if available
            if (typeof showAuthModal === 'function') {
                showAuthModal('signin');
            }
            closePaymentModal();
            return;
        }
    }

    // Show loading state on button
    const btn = document.querySelector(`[data-tier="${tierSlug}"]`);
    if (btn) {
        btn.disabled = true;
        btn.innerHTML = '<span style="display: inline-block; animation: spin 1s linear infinite;">⏳</span> Processing...';
    }

    try {
        // Create checkout session
        const result = await createCheckoutSession(tierSlug, sessionData);

        if (result.success) {
            if (result.demoMode) {
                // Demo mode: simulate successful purchase
                (typeof showLuvLangToast==='function'?showLuvLangToast(`🧪 DEMO MODE\n\n${tier.name} tier for $${tier.price}\n\nIn production, this redirects to Stripe Checkout.\nYour download is now enabled for testing.`):void 0);

                // Simulate successful payment and enable download
                if (typeof enableDownload === 'function') {
                    enableDownload(tierSlug);
                }

                // Trigger success event
                window.dispatchEvent(new CustomEvent('paymentSuccess', {
                    detail: { tier: tierSlug, demo: true }
                }));

                closePaymentModal();
            }
            // If not demo mode, user is being redirected to Stripe
        } else {
            throw new Error(result.error);
        }
    } catch (error) {
        console.error('❌ Purchase failed:', error);
        (typeof showLuvLangToast==='function'?showLuvLangToast('Payment failed: ' + error.message):void 0);

        // Reset button
        if (btn) {
            btn.disabled = false;
            btn.innerHTML = `Select ${tier.name}`;
        }
    }
}

/**
 * Check if feature is available for user's tier
 *
 * @param {string} featureName - Feature to check (e.g., 'transientDetection')
 * @returns {Promise<boolean>} True if feature is available
 */
async function hasFeatureAccess(featureName) {
    const tier = await getUserHighestTier();

    if (!tier) {
        return false; // No tier purchased
    }

    return tier.capabilities[featureName] === true;
}

// Export functions
if (typeof window !== 'undefined') {
    window.initializeStripe = initializeStripe;
    window.createCheckoutSession = createCheckoutSession;
    window.handlePaymentSuccess = handlePaymentSuccess;
    window.hasAccessToTier = hasAccessToTier;
    window.getUserHighestTier = getUserHighestTier;
    window.showPaymentModal = showPaymentModal;
    window.closePaymentModal = closePaymentModal;
    window.hasFeatureAccess = hasFeatureAccess;
    window.MASTERING_TIERS = MASTERING_TIERS;
}
