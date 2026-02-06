/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   TIER SYSTEM - 3-Tier Commercial Hardware States
   Handles: Tier switching, power-on animations, module locking, checkout
   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */

// ═══════════════════════════════════════════════════════════════════════════
// GLOBAL STATE
// ═══════════════════════════════════════════════════════════════════════════

let currentTier = 'basic'; // 'basic', 'advanced', 'premium'
let wasmPrecisionMode = '32bit'; // '32bit', '64bit'

const TIER_CONFIG = {
    basic: {
        price: 12.99,
        label: 'BASIC',
        stripeLink: 'https://buy.stripe.com/test_bJeeVf4vKaqY6vDbYY7EQ03',
        features: [
            'Unlimited MP3 exports (320kbps)',
            '32-bit float processing',
            '7-Band Parametric EQ',
            'Professional Limiter',
            'Broadcast-standard metering'
        ],
        modules: {
            stereoWidth: false,    // Locked
            multiband: false,      // Locked
            ms: false              // Locked
        },
        exportFormats: ['mp3'],
        processing: '32bit'
    },
    advanced: {
        price: 29.99,
        label: 'ADVANCED',
        stripeLink: 'https://buy.stripe.com/test_9B614pd2g42A1bjd327EQ01',
        features: [
            'Unlimited 24-bit WAV exports',
            '32-bit float processing',
            'Stereo Width control',
            '7-Band Parametric EQ',
            'Professional Limiter',
            'Broadcast-standard metering'
        ],
        modules: {
            stereoWidth: true,     // Unlocked
            multiband: false,      // Locked
            ms: false              // Locked
        },
        exportFormats: ['mp3', 'wav'],
        processing: '32bit'
    },
    premium: {
        price: 59.99,
        label: 'PREMIUM',
        stripeLink: 'https://buy.stripe.com/test_5kQ9AVbYceHe6vDe767EQ02',
        features: [
            '64-bit precision engine (4x oversampling)',
            'Full manual control - All modules unlocked',
            'Multiband Compression',
            'M/S Processing (Mid/Side)',
            'Reference Track Matching',
            'DDP Export for CD manufacturing',
            'High-res WAV (24/32-bit)',
            'Unlimited MP3 exports'
        ],
        modules: {
            stereoWidth: true,     // Unlocked
            multiband: true,       // Unlocked
            ms: true               // Unlocked
        },
        exportFormats: ['mp3', 'wav', 'ddp'],
        processing: '64bit'
    }
};

// ═══════════════════════════════════════════════════════════════════════════
// TIER SWITCHING LOGIC
// ═══════════════════════════════════════════════════════════════════════════

function switchTier(newTier) {

    // Remove old tier class from body
    document.body.classList.remove(`tier-${currentTier}`);
    document.getElementById('appContainer').classList.remove(`tier-${currentTier}`);

    // Add new tier class
    document.body.classList.add(`tier-${newTier}`);
    document.getElementById('appContainer').classList.add(`tier-${newTier}`);

    // Update tier buttons
    document.querySelectorAll('.tier-option').forEach(btn => {
        btn.classList.remove('active');
        if (btn.dataset.tier === newTier) {
            btn.classList.add('active');
        }
    });

    // Update module states with power-on animation
    updateModuleStates(newTier);

    // Update WASM precision mode
    const config = TIER_CONFIG[newTier];
    if (config.processing !== wasmPrecisionMode) {
        switchWASMPrecision(config.processing);
    }

    currentTier = newTier;

}

// ═══════════════════════════════════════════════════════════════════════════
// MODULE STATE MANAGEMENT
// ═══════════════════════════════════════════════════════════════════════════

function updateModuleStates(tier) {
    const config = TIER_CONFIG[tier];

    // Stereo Width Module
    updateModule('stereoWidthModule', config.modules.stereoWidth, tier);

    // Multiband Compression Module
    updateModule('multibandModule', config.modules.multiband, tier);

    // M/S Processing Module
    updateModule('msModule', config.modules.ms, tier);
}

function updateModule(moduleId, isUnlocked, tier) {
    const module = document.getElementById(moduleId);
    if (!module) {
        console.warn(`⚠️ Module ${moduleId} not found`);
        return;
    }

    // Remove all state classes
    module.classList.remove('module-locked', 'module-cyan', 'module-gold', 'module-powering-on');

    if (!isUnlocked) {
        // LOCK MODULE - Dimmed state
        module.classList.add('module-locked');

    } else {
        // UNLOCK MODULE - Power-on animation
        module.classList.add('module-powering-on');

        // After animation, apply tier color
        setTimeout(() => {
            module.classList.remove('module-powering-on');

            if (tier === 'advanced') {
                module.classList.add('module-cyan');

            } else if (tier === 'premium') {
                module.classList.add('module-gold');

            }
        }, 800); // Match animation duration
    }
}

// ═══════════════════════════════════════════════════════════════════════════
// WASM PRECISION MODE SWITCHING
// ═══════════════════════════════════════════════════════════════════════════

function switchWASMPrecision(mode) {

    wasmPrecisionMode = mode;

    // Global flag for WASM engine (if loaded)
    if (typeof window.masteringEngine !== 'undefined') {
        window.masteringEngine.precisionMode = mode;

    } else {

    }

    // Store in localStorage for persistence
    try { localStorage.setItem('wasmPrecisionMode', mode); } catch (_) { /* private browsing */ }

    if (mode === '64bit') {

    } else {

    }
}

// ═══════════════════════════════════════════════════════════════════════════
// CHECKOUT TRAY MANAGEMENT
// ═══════════════════════════════════════════════════════════════════════════

function openCheckout() {

    const config = TIER_CONFIG[currentTier];

    // Update checkout tier info
    document.getElementById('checkoutTierName').textContent = config.label;
    document.getElementById('checkoutTierPrice').textContent = `$${config.price.toFixed(2)}`;

    // Update features list
    const featuresList = document.getElementById('checkoutTierFeatures');
    featuresList.innerHTML = config.features.map(f => `<li>${f}</li>`).join('');

    // Show checkout tray with animation
    document.getElementById('checkoutBackdrop').classList.add('active');
    document.getElementById('checkoutTray').classList.add('open');

}

function closeCheckout() {

    document.getElementById('checkoutBackdrop').classList.remove('active');
    document.getElementById('checkoutTray').classList.remove('open');
}

// ═══════════════════════════════════════════════════════════════════════════
// STRIPE PAYMENT INTEGRATION
// ═══════════════════════════════════════════════════════════════════════════

// Stripe publishable key (REPLACE WITH YOUR KEY)
const STRIPE_PUBLIC_KEY = 'pk_test_51RXBWQP1VAtK8qeDRotSKHkuZF2UsKG18z4dDtoJM9MTtuR6Eh28ghQIGljfwQCyNN9fXHV8HwdvNJ8TmPizjagQ003L592cFz';

// Use stripe from stripe-client.js (avoid duplicate declaration)
// let stripe = null;
let cardElement = null;

function initializeStripe() {

    // Check if valid key is set
    if (!STRIPE_PUBLIC_KEY || STRIPE_PUBLIC_KEY === 'pk_test_YOUR_PUBLISHABLE_KEY_HERE') {
        console.warn('⚠️ Stripe key not configured - payment system disabled');
        console.warn('   To enable payments, update STRIPE_PUBLIC_KEY in TIER_SYSTEM.js');
        console.warn('   See STRIPE_SETUP_GUIDE.md for instructions');
        return;
    }

    // Check if Stripe.js is loaded
    if (typeof Stripe === 'undefined') {
        console.error('❌ Stripe.js not loaded! Add this to <head>:');
        console.error('   <script src="https://js.stripe.com/v3/"></script>');
        return;
    }

    // Initialize Stripe
    try {
        stripe = Stripe(STRIPE_PUBLIC_KEY);
    } catch (error) {
        console.error('❌ Stripe initialization failed:', error.message);
        return;
    }

    // Check if card-element exists before mounting
    const cardContainer = document.getElementById('card-element');
    if (!cardContainer) {

        return;
    }

    // Create card element
    const elements = stripe.elements();
    cardElement = elements.create('card', {
        style: {
            base: {
                fontSize: '16px',
                color: '#ffffff',
                '::placeholder': {
                    color: 'rgba(255, 255, 255, 0.5)'
                }
            },
            invalid: {
                color: '#ff6b6b'
            }
        }
    });

    cardElement.mount('#card-element');

    // Handle real-time validation errors
    cardElement.on('change', function(event) {
        const displayError = document.getElementById('card-errors');
        if (displayError) {
            if (event.error) {
                displayError.textContent = event.error.message;
            } else {
                displayError.textContent = '';
            }
        }
    });

}

async function handlePaymentSubmit(event) {
    event.preventDefault();

    const config = TIER_CONFIG[currentTier];
    const paymentLink = config.stripeLink;

    if (!paymentLink) {
        (typeof showLuvLangToast==='function'?showLuvLangToast('Payment link not configured for this tier. Please contact support.'):void 0);
        console.error('❌ No Stripe payment link configured for tier:', currentTier);
        return;
    }

    // Redirect to Stripe payment link
    window.location.href = paymentLink;
}

function enableExport() {

    // Enable the export button (if it exists)
    const exportBtn = document.getElementById('exportBtn');
    if (exportBtn) {
        exportBtn.disabled = false;
        exportBtn.classList.remove('disabled');
    }
}

// ═══════════════════════════════════════════════════════════════════════════
// EVENT LISTENERS
// ═══════════════════════════════════════════════════════════════════════════

document.addEventListener('DOMContentLoaded', function() {

    // Tier selector buttons
    document.querySelectorAll('.tier-option').forEach(btn => {
        btn.addEventListener('click', function() {
            const tier = this.dataset.tier;
            switchTier(tier);
        });
    });

    // Checkout close button
    document.getElementById('checkoutCloseBtn').addEventListener('click', closeCheckout);

    // Checkout backdrop click (close on click outside)
    document.getElementById('checkoutBackdrop').addEventListener('click', closeCheckout);

    // Payment form submit
    const paymentForm = document.getElementById('payment-form');
    if (paymentForm) {
        paymentForm.addEventListener('submit', handlePaymentSubmit);
    }

    // Initialize Stripe (with delay to ensure Stripe.js loads)
    setTimeout(() => {
        initializeStripe();
    }, 1000);

    // Set initial tier state
    switchTier('basic');

});

// ═══════════════════════════════════════════════════════════════════════════
// CONNECT EXPORT BUTTON TO ACTUAL EXPORT
// ═══════════════════════════════════════════════════════════════════════════

// Wait for DOM to be ready, then connect export button
window.addEventListener('load', function() {
    // Find all export buttons and connect to PRICING MODAL (not direct export)
    const exportBtn = document.getElementById('exportBtn');

    if (exportBtn) {
        exportBtn.addEventListener('click', async function(e) {
            e.preventDefault();
            e.stopPropagation();

            // Show pricing modal - user must pay before export
            if (typeof window.openPricingModal === 'function') {
                window.openPricingModal();
            } else {
                console.error('❌ Pricing modal not found');
                (typeof showLuvLangToast==='function'?showLuvLangToast('Please wait for the page to fully load, then try again.'):void 0);
            }
        });

    }

    // Export Bar A/B button (if exists)
    const exportBarAbBtn = document.querySelector('.export-bar-btn.secondary');
    if (exportBarAbBtn) {
        exportBarAbBtn.addEventListener('click', function() {
            // Toggle A/B comparison
            if (typeof toggleABComparison === 'function') {
                toggleABComparison();
            }
        });

    }
});

// ═══════════════════════════════════════════════════════════════════════════
// GLOBAL API FOR OTHER SCRIPTS
// ═══════════════════════════════════════════════════════════════════════════

window.TierSystem = {
    getCurrentTier: () => currentTier,
    getTierConfig: (tier) => TIER_CONFIG[tier || currentTier],
    switchTier: switchTier,
    openCheckout: openCheckout,
    closeCheckout: closeCheckout,
    isModuleUnlocked: (moduleName) => {
        return TIER_CONFIG[currentTier].modules[moduleName] === true;
    },
    getPrecisionMode: () => wasmPrecisionMode
};

