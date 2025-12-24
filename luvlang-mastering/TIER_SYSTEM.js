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
        price: 9.00,
        label: 'BASIC TIER',
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
        price: 19.00,
        label: 'ADVANCED TIER',
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
        price: 39.00,
        label: 'PREMIUM TIER',
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
    console.log(`🔄 Switching from ${currentTier} to ${newTier}`);

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
    console.log(`✅ Tier switched to ${newTier.toUpperCase()}`);
}

// ═══════════════════════════════════════════════════════════════════════════
// MODULE STATE MANAGEMENT
// ═══════════════════════════════════════════════════════════════════════════

function updateModuleStates(tier) {
    const config = TIER_CONFIG[tier];
    console.log('🎛️ Updating module states:', config.modules);

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

    console.log(`  ${moduleId}: ${isUnlocked ? 'UNLOCKING' : 'LOCKING'}`);

    // Remove all state classes
    module.classList.remove('module-locked', 'module-cyan', 'module-gold', 'module-powering-on');

    if (!isUnlocked) {
        // LOCK MODULE - Dimmed state
        module.classList.add('module-locked');
        console.log(`    🔒 ${moduleId} is now LOCKED (dimmed, non-interactive)`);
    } else {
        // UNLOCK MODULE - Power-on animation
        module.classList.add('module-powering-on');
        console.log(`    ⚡ ${moduleId} powering on...`);

        // After animation, apply tier color
        setTimeout(() => {
            module.classList.remove('module-powering-on');

            if (tier === 'advanced') {
                module.classList.add('module-cyan');
                console.log(`    🔵 ${moduleId} is now CYAN (Advanced)`);
            } else if (tier === 'premium') {
                module.classList.add('module-gold');
                console.log(`    🟡 ${moduleId} is now GOLD (Premium)`);
            }
        }, 800); // Match animation duration
    }
}

// ═══════════════════════════════════════════════════════════════════════════
// WASM PRECISION MODE SWITCHING
// ═══════════════════════════════════════════════════════════════════════════

function switchWASMPrecision(mode) {
    console.log(`🔧 Switching WASM precision mode: ${wasmPrecisionMode} → ${mode}`);

    wasmPrecisionMode = mode;

    // Global flag for WASM engine (if loaded)
    if (typeof window.masteringEngine !== 'undefined') {
        window.masteringEngine.precisionMode = mode;
        console.log(`   ✅ WASM engine precision mode set to: ${mode}`);
    } else {
        console.log(`   ⚠️ WASM engine not loaded yet, mode will apply on load`);
    }

    // Store in localStorage for persistence
    localStorage.setItem('wasmPrecisionMode', mode);

    if (mode === '64bit') {
        console.log('   🎯 64-bit precision enabled:');
        console.log('      - 4x True-Peak Oversampling');
        console.log('      - 4th-order Linkwitz-Riley filters');
        console.log('      - Double-precision processing');
    } else {
        console.log('   📊 32-bit precision (standard):');
        console.log('      - 2nd-order filters');
        console.log('      - Single-precision processing');
    }
}

// ═══════════════════════════════════════════════════════════════════════════
// CHECKOUT TRAY MANAGEMENT
// ═══════════════════════════════════════════════════════════════════════════

function openCheckout() {
    console.log('💳 Opening checkout tray');

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

    console.log(`   Tier: ${config.label}`);
    console.log(`   Price: $${config.price}`);
    console.log(`   Features: ${config.features.length} items`);
}

function closeCheckout() {
    console.log('❌ Closing checkout tray');
    document.getElementById('checkoutBackdrop').classList.remove('active');
    document.getElementById('checkoutTray').classList.remove('open');
}

// ═══════════════════════════════════════════════════════════════════════════
// STRIPE PAYMENT INTEGRATION
// ═══════════════════════════════════════════════════════════════════════════

// Stripe publishable key (REPLACE WITH YOUR KEY)
const STRIPE_PUBLIC_KEY = 'pk_test_YOUR_PUBLISHABLE_KEY_HERE';

let stripe = null;
let cardElement = null;

function initializeStripe() {
    console.log('💳 Initializing Stripe...');

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
        if (event.error) {
            displayError.textContent = event.error.message;
        } else {
            displayError.textContent = '';
        }
    });

    console.log('✅ Stripe initialized successfully');
}

async function handlePaymentSubmit(event) {
    event.preventDefault();
    console.log('💳 Processing payment...');

    const submitBtn = document.getElementById('submitPaymentBtn');
    submitBtn.disabled = true;
    submitBtn.textContent = '⏳ Processing...';

    try {
        // Create payment method
        const {paymentMethod, error} = await stripe.createPaymentMethod({
            type: 'card',
            card: cardElement
        });

        if (error) {
            throw new Error(error.message);
        }

        console.log('✅ Payment method created:', paymentMethod.id);

        // TODO: Send paymentMethod.id to your server to create a charge
        // Example:
        // const response = await fetch('/api/create-payment-intent', {
        //     method: 'POST',
        //     headers: {'Content-Type': 'application/json'},
        //     body: JSON.stringify({
        //         paymentMethodId: paymentMethod.id,
        //         amount: TIER_CONFIG[currentTier].price * 100, // cents
        //         tier: currentTier
        //     })
        // });

        // For now, show success message
        alert(`✅ Payment successful!\n\nTier: ${TIER_CONFIG[currentTier].label}\nAmount: $${TIER_CONFIG[currentTier].price}\n\nYou can now export your mastered audio!`);

        closeCheckout();

        // Enable export functionality
        enableExport();

    } catch (error) {
        console.error('❌ Payment failed:', error);
        document.getElementById('card-errors').textContent = error.message;
    } finally {
        submitBtn.disabled = false;
        submitBtn.textContent = '💳 Complete Payment';
    }
}

function enableExport() {
    console.log('✅ Export enabled for tier:', currentTier);
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
    console.log('🎛️ TIER SYSTEM - Initializing...');

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

    console.log('✅ TIER SYSTEM - Ready!');
    console.log('');
    console.log('═══════════════════════════════════════════════════════════');
    console.log('   TIER OPTIONS');
    console.log('═══════════════════════════════════════════════════════════');
    console.log(`   BASIC ($${TIER_CONFIG.basic.price}) - ${TIER_CONFIG.basic.exportFormats.join(', ')}`);
    console.log(`   ADVANCED ($${TIER_CONFIG.advanced.price}) - ${TIER_CONFIG.advanced.exportFormats.join(', ')} + Stereo Width`);
    console.log(`   PREMIUM ($${TIER_CONFIG.premium.price}) - ${TIER_CONFIG.premium.exportFormats.join(', ')} + Full Control + 64-bit`);
    console.log('═══════════════════════════════════════════════════════════');
});

// ═══════════════════════════════════════════════════════════════════════════
// CONNECT EXPORT BUTTON TO CHECKOUT
// ═══════════════════════════════════════════════════════════════════════════

// Wait for DOM to be ready, then connect export button
window.addEventListener('load', function() {
    // Find all export buttons and connect to checkout
    const exportButtons = [
        document.getElementById('exportBtn'),
        document.getElementById('exportWavBtn'),
        document.getElementById('exportMp3Btn')
    ].filter(btn => btn !== null);

    exportButtons.forEach(btn => {
        // Store original click handler
        const originalHandler = btn.onclick;

        // Replace with checkout handler
        btn.onclick = function(e) {
            e.preventDefault();
            console.log('📤 Export clicked - Opening checkout');
            openCheckout();
        };

        console.log(`✅ Export button connected to checkout:`, btn.id);
    });
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

console.log('🎛️ TIER_SYSTEM.js loaded - Global API available at window.TierSystem');
