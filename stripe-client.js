/**
 * STRIPE PAYMENT INTEGRATION
 * Handles per-song purchases for LuvLang Mastering
 * Tiers: INSTANT ($9.99), PRECISION ($19.99), LEGENDARY ($29.99)
 */

// Stripe configuration
// ⚠️ REPLACE WITH YOUR ACTUAL STRIPE PUBLISHABLE KEY
// Get this from: https://dashboard.stripe.com/apikeys
const STRIPE_PUBLISHABLE_KEY = 'pk_test_51RXBWQP1VAtK8qeDRotSKHkuZF2UsKG18z4dDtoJM9MTtuR6Eh28ghQIGljfwQCyNN9fXHV8HwdvNJ8TmPizjagQ003L592cFz';

// Initialize Stripe
let stripe = null;
let currentPurchaseData = null;

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

        // Initialize Stripe with publishable key
        stripe = Stripe(STRIPE_PUBLISHABLE_KEY);

        console.log('✅ Stripe client initialized');
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

    try {
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

        // For client-side only implementation (no backend):
        // We'll use Stripe Payment Links or Checkout Sessions

        // OPTION 1: Redirect to Stripe Payment Link (easiest, no backend needed)
        // You create these in Stripe Dashboard → Products → Payment Links
        const paymentLinks = {
            instant: 'https://buy.stripe.com/test_INSTANT_LINK',
            precision: 'https://buy.stripe.com/test_PRECISION_LINK',
            legendary: 'https://buy.stripe.com/test_LEGENDARY_LINK'
        };

        // Store session data in localStorage before redirect
        localStorage.setItem('pendingPurchase', JSON.stringify(currentPurchaseData));

        console.log(`💳 Redirecting to Stripe Checkout for ${tier.name} tier ($${tier.price})`);

        // Redirect to payment link
        // window.location.href = paymentLinks[tierSlug];

        // OPTION 2: Use Stripe Checkout with a backend (recommended for production)
        // This requires a server endpoint to create checkout sessions

        // For now, we'll simulate the checkout for testing
        console.log('🧪 DEMO MODE: Simulating payment for development');
        console.log('Purchase data:', currentPurchaseData);

        // In production, you would call your backend:
        /*
        const response = await fetch('/api/create-checkout-session', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                tierSlug: tierSlug,
                sessionData: sessionData,
                successUrl: window.location.origin + '/success?session_id={CHECKOUT_SESSION_ID}',
                cancelUrl: window.location.origin + '/cancel'
            })
        });

        const session = await response.json();

        // Redirect to Stripe Checkout
        const result = await stripe.redirectToCheckout({
            sessionId: session.id
        });

        if (result.error) {
            throw new Error(result.error.message);
        }
        */

        return {
            success: true,
            message: 'Checkout initiated',
            tier: tier.name,
            price: tier.price
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
        if (!pendingPurchase) {
            throw new Error('No pending purchase found');
        }

        const purchaseData = JSON.parse(pendingPurchase);

        // In production, verify the payment with your backend:
        /*
        const response = await fetch('/api/verify-payment', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ sessionId: sessionId })
        });

        const verification = await response.json();

        if (!verification.success) {
            throw new Error('Payment verification failed');
        }
        */

        // Save purchase to Supabase
        if (typeof supabase !== 'undefined' && supabase) {
            const user = await supabase.auth.getUser();

            if (user.data.user) {
                // Get tier ID from database
                const { data: tier } = await supabase
                    .from('mastering_tiers')
                    .select('id')
                    .eq('tier_slug', purchaseData.tierSlug)
                    .single();

                // Record purchase
                const { data: purchase, error } = await supabase
                    .from('purchases')
                    .insert({
                        user_id: user.data.user.id,
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
                    console.log('✅ Purchase saved to database:', purchase);
                }
            }
        }

        // Clear pending purchase
        localStorage.removeItem('pendingPurchase');

        console.log('✅ Payment successful!');
        return {
            success: true,
            purchase: purchaseData
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

    console.log(`💳 Initiating purchase for ${tier.name} tier ($${tier.price})`);

    // Check if user is logged in
    if (typeof supabase !== 'undefined' && supabase) {
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
            alert('Please sign in to purchase. Your mastering session will be saved.');
            // You could trigger the sign-in modal here
            closePaymentModal();
            return;
        }
    }

    // Create checkout session
    const result = await createCheckoutSession(tierSlug, sessionData);

    if (result.success) {
        // For demo/development: simulate successful purchase
        alert(`🎉 Purchase simulation: ${tier.name} tier for $${tier.price}\n\nIn production, this will redirect to Stripe Checkout.\n\nYour download will be available after payment.`);

        // Simulate successful payment and enable download
        if (typeof enableDownload === 'function') {
            enableDownload(tierSlug);
        }

        closePaymentModal();
    } else {
        alert('Payment failed: ' + result.error);
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
