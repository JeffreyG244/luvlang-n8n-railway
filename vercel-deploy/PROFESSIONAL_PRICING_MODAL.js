/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   PROFESSIONAL PRICING MODAL
   Clean, interactive tier selection with feature tooltips
   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */

// Feature descriptions for tooltips
const FEATURE_TOOLTIPS = {
    // Basic Features
    'MP3 Export (320kbps)': 'High-quality MP3 format compatible with all platforms and devices. Industry-standard 320kbps bitrate.',
    '32-bit Float Processing': 'Professional audio processing with extended dynamic range. No clipping during internal calculations.',
    '7-Band Parametric EQ': 'Surgical frequency control with 7 fully adjustable bands. Shape your sound with precision.',
    'Professional Limiter': 'Transparent peak limiting to maximize loudness while preventing distortion and clipping.',
    'LUFS Metering': 'Broadcast-standard loudness measurement. Hit exact targets for Spotify, Apple Music, YouTube.',
    'True Peak Detection': 'Catches intersample peaks that standard meters miss. Ensures broadcast-safe masters.',

    // Advanced Features
    'WAV Export (24-bit)': 'Lossless audio format for maximum quality. Required for CD production and professional distribution.',
    'Stereo Width Control': 'Expand or narrow your stereo image. Make mixes wider or ensure mono compatibility.',
    'Reference Matching': 'Analyze a reference track and match its tonal characteristics to your master.',
    'Advanced Metering Suite': 'Correlation meter, phase scope, and spectrum analyzer for complete mix insight.',

    // Premium Features
    '64-bit Precision Engine': 'Double-precision processing with 4x oversampling. The cleanest, most transparent sound possible.',
    'Multiband Compression': 'Independent dynamics control across 4 frequency bands. Tame problem frequencies without affecting others.',
    'M/S Processing': 'Separate control over Mid (center) and Side (stereo) content. Surgical stereo manipulation.',
    'Stem Separation AI': 'AI-powered extraction of vocals, drums, bass, and instruments from mixed audio.',
    'DDP Export': 'Industry-standard format for CD manufacturing. Complete with PQ codes and metadata.',
    'Unlimited Presets': 'Save unlimited custom presets. Build your signature sound library.',
    'Priority Processing': 'Faster export times with dedicated processing resources.',
    'All 24 AI Modules': 'Full access to every processing module including neural models and adaptive learning.'
};

// Read Stripe links from env config (injected at build time by build-env.js)
const _pricingEnv = (typeof window !== 'undefined' && window.__ENV__) || {};

// Tier configurations with detailed features
const PRICING_TIERS = {
    basic: {
        name: 'Basic',
        price: 12.99,
        period: 'one-time',
        tagline: 'Essential Mastering',
        description: 'Everything you need to create release-ready masters',
        color: '#6366f1',
        features: [
            { text: 'MP3 Export (320kbps)', included: true },
            { text: '32-bit Float Processing', included: true },
            { text: '7-Band Parametric EQ', included: true },
            { text: 'Professional Limiter', included: true },
            { text: 'LUFS Metering', included: true },
            { text: 'True Peak Detection', included: true },
            { text: 'WAV Export (24-bit)', included: false },
            { text: 'Stereo Width Control', included: false },
            { text: 'Multiband Compression', included: false }
        ],
        stripeLink: _pricingEnv.STRIPE_LINK_BASIC || ''
    },
    advanced: {
        name: 'Advanced',
        price: 29.99,
        period: 'one-time',
        tagline: 'Professional Tools',
        description: 'For producers who need more control',
        color: '#00d4ff',
        popular: true,
        features: [
            { text: 'MP3 Export (320kbps)', included: true },
            { text: 'WAV Export (24-bit)', included: true, highlight: true },
            { text: '32-bit Float Processing', included: true },
            { text: '7-Band Parametric EQ', included: true },
            { text: 'Professional Limiter', included: true },
            { text: 'Stereo Width Control', included: true, highlight: true },
            { text: 'Reference Matching', included: true, highlight: true },
            { text: 'Advanced Metering Suite', included: true },
            { text: 'Multiband Compression', included: false }
        ],
        stripeLink: _pricingEnv.STRIPE_LINK_ADVANCED || ''
    },
    premium: {
        name: 'Premium',
        price: 59.99,
        period: 'one-time',
        tagline: 'Studio Master Suite',
        description: 'Unlimited power for serious professionals',
        color: '#f59e0b',
        features: [
            { text: 'All 24 AI Modules', included: true, highlight: true },
            { text: '64-bit Precision Engine', included: true, highlight: true },
            { text: 'WAV Export (24-bit)', included: true },
            { text: 'Multiband Compression', included: true, highlight: true },
            { text: 'M/S Processing', included: true, highlight: true },
            { text: 'Stem Separation AI', included: true, highlight: true },
            { text: 'DDP Export', included: true },
            { text: 'Unlimited Presets', included: true },
            { text: 'Priority Processing', included: true }
        ],
        stripeLink: _pricingEnv.STRIPE_LINK_PREMIUM || ''
    }
};

// Inject CSS
function injectPricingStyles() {
    if (document.getElementById('pricing-modal-styles')) return;

    const style = document.createElement('style');
    style.id = 'pricing-modal-styles';
    style.textContent = `
        /* Modal Backdrop */
        .pricing-modal-backdrop {
            position: fixed;
            inset: 0;
            background: rgba(0, 0, 0, 0.85);
            backdrop-filter: blur(8px);
            z-index: 10000;
            opacity: 0;
            visibility: hidden;
            transition: all 0.3s ease;
        }
        .pricing-modal-backdrop.active {
            opacity: 1;
            visibility: visible;
        }

        /* Modal Container */
        .pricing-modal {
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%) scale(0.9);
            background: linear-gradient(180deg, #1a1a2e 0%, #0d0d1a 100%);
            border-radius: 24px;
            border: 1px solid rgba(255, 255, 255, 0.1);
            box-shadow: 0 25px 80px rgba(0, 0, 0, 0.5), 0 0 100px rgba(0, 212, 255, 0.1);
            z-index: 10001;
            width: 95%;
            max-width: 1100px;
            max-height: 90vh;
            overflow-y: auto;
            opacity: 0;
            visibility: hidden;
            transition: all 0.4s cubic-bezier(0.34, 1.56, 0.64, 1);
        }
        .pricing-modal.active {
            opacity: 1;
            visibility: visible;
            transform: translate(-50%, -50%) scale(1);
        }

        /* Modal Header */
        .pricing-modal-header {
            text-align: center;
            padding: 40px 40px 20px;
            border-bottom: 1px solid rgba(255, 255, 255, 0.05);
        }
        .pricing-modal-close {
            position: absolute;
            top: 20px;
            right: 20px;
            width: 40px;
            height: 40px;
            border: none;
            background: rgba(255, 255, 255, 0.05);
            border-radius: 50%;
            color: rgba(255, 255, 255, 0.6);
            font-size: 20px;
            cursor: pointer;
            transition: all 0.2s;
        }
        .pricing-modal-close:hover {
            background: rgba(255, 255, 255, 0.1);
            color: #fff;
            transform: rotate(90deg);
        }
        .pricing-modal-title {
            font-size: 2rem;
            font-weight: 800;
            color: #fff;
            margin-bottom: 8px;
            letter-spacing: -0.5px;
        }
        .pricing-modal-subtitle {
            font-size: 1rem;
            color: rgba(255, 255, 255, 0.5);
        }

        /* Tier Grid */
        .pricing-tiers-grid {
            display: grid;
            grid-template-columns: repeat(3, 1fr);
            gap: 20px;
            padding: 30px;
        }
        @media (max-width: 900px) {
            .pricing-tiers-grid {
                grid-template-columns: 1fr;
                gap: 15px;
            }
        }

        /* Tier Card */
        .pricing-tier-card {
            background: rgba(255, 255, 255, 0.02);
            border: 1px solid rgba(255, 255, 255, 0.08);
            border-radius: 16px;
            padding: 28px;
            position: relative;
            transition: all 0.3s ease;
        }
        .pricing-tier-card:hover {
            background: rgba(255, 255, 255, 0.04);
            border-color: rgba(255, 255, 255, 0.15);
            transform: translateY(-4px);
        }
        .pricing-tier-card.popular {
            border-color: rgba(0, 212, 255, 0.4);
            background: linear-gradient(180deg, rgba(0, 212, 255, 0.08) 0%, rgba(0, 212, 255, 0.02) 100%);
        }
        .pricing-tier-card.popular:hover {
            border-color: rgba(0, 212, 255, 0.6);
            box-shadow: 0 0 40px rgba(0, 212, 255, 0.15);
        }

        /* Popular Badge */
        .popular-badge {
            position: absolute;
            top: -12px;
            left: 50%;
            transform: translateX(-50%);
            background: linear-gradient(135deg, #00d4ff 0%, #0099cc 100%);
            color: #000;
            font-size: 0.7rem;
            font-weight: 700;
            text-transform: uppercase;
            letter-spacing: 1px;
            padding: 6px 16px;
            border-radius: 20px;
            box-shadow: 0 4px 15px rgba(0, 212, 255, 0.4);
        }

        /* Tier Header */
        .tier-header {
            text-align: center;
            margin-bottom: 24px;
            padding-bottom: 20px;
            border-bottom: 1px solid rgba(255, 255, 255, 0.06);
        }
        .tier-name {
            font-size: 1.3rem;
            font-weight: 700;
            color: #fff;
            margin-bottom: 4px;
        }
        .tier-tagline {
            font-size: 0.8rem;
            color: rgba(255, 255, 255, 0.4);
            text-transform: uppercase;
            letter-spacing: 1px;
        }
        .tier-price {
            margin-top: 16px;
        }
        .tier-price-amount {
            font-size: 3rem;
            font-weight: 800;
            color: #fff;
            line-height: 1;
        }
        .tier-price-currency {
            font-size: 1.5rem;
            color: rgba(255, 255, 255, 0.6);
            vertical-align: super;
        }
        .tier-price-period {
            font-size: 0.85rem;
            color: rgba(255, 255, 255, 0.4);
            margin-top: 4px;
        }

        /* Features List */
        .tier-features {
            list-style: none;
            padding: 0;
            margin: 0 0 24px 0;
        }
        .tier-feature {
            display: flex;
            align-items: center;
            gap: 10px;
            padding: 10px 0;
            border-bottom: 1px solid rgba(255, 255, 255, 0.04);
            cursor: help;
            transition: all 0.2s;
            position: relative;
        }
        .tier-feature:hover {
            background: rgba(255, 255, 255, 0.02);
            margin: 0 -12px;
            padding-left: 12px;
            padding-right: 12px;
            border-radius: 6px;
        }
        .tier-feature:last-child {
            border-bottom: none;
        }
        .tier-feature-icon {
            width: 20px;
            height: 20px;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 11px;
            flex-shrink: 0;
        }
        .tier-feature-icon.included {
            background: rgba(34, 197, 94, 0.15);
            color: #22c55e;
        }
        .tier-feature-icon.excluded {
            background: rgba(255, 255, 255, 0.05);
            color: rgba(255, 255, 255, 0.25);
        }
        .tier-feature-text {
            font-size: 0.9rem;
            color: rgba(255, 255, 255, 0.8);
        }
        .tier-feature-text.excluded {
            color: rgba(255, 255, 255, 0.3);
            text-decoration: line-through;
        }
        .tier-feature-text.highlight {
            color: #00d4ff;
            font-weight: 500;
        }
        .tier-feature-info {
            margin-left: auto;
            color: rgba(255, 255, 255, 0.3);
            font-size: 14px;
            opacity: 0;
            transition: opacity 0.2s;
        }
        .tier-feature:hover .tier-feature-info {
            opacity: 1;
        }

        /* Feature Tooltip */
        .feature-tooltip {
            position: absolute;
            left: 100%;
            top: 50%;
            transform: translateY(-50%);
            margin-left: 15px;
            background: #1e1e2e;
            border: 1px solid rgba(255, 255, 255, 0.15);
            border-radius: 10px;
            padding: 12px 16px;
            width: 250px;
            font-size: 0.8rem;
            color: rgba(255, 255, 255, 0.8);
            line-height: 1.5;
            box-shadow: 0 10px 40px rgba(0, 0, 0, 0.4);
            opacity: 0;
            visibility: hidden;
            transition: all 0.2s;
            z-index: 100;
            pointer-events: none;
        }
        .feature-tooltip::before {
            content: '';
            position: absolute;
            right: 100%;
            top: 50%;
            transform: translateY(-50%);
            border: 6px solid transparent;
            border-right-color: rgba(255, 255, 255, 0.15);
        }
        .tier-feature:hover .feature-tooltip {
            opacity: 1;
            visibility: visible;
        }
        @media (max-width: 1200px) {
            .feature-tooltip {
                left: 50%;
                top: 100%;
                transform: translateX(-50%);
                margin-left: 0;
                margin-top: 10px;
            }
            .feature-tooltip::before {
                right: auto;
                left: 50%;
                top: auto;
                bottom: 100%;
                transform: translateX(-50%);
                border-right-color: transparent;
                border-bottom-color: rgba(255, 255, 255, 0.15);
            }
        }

        /* CTA Button */
        .tier-cta {
            width: 100%;
            padding: 14px 24px;
            border: none;
            border-radius: 10px;
            font-size: 1rem;
            font-weight: 600;
            cursor: pointer;
            transition: all 0.3s ease;
            text-transform: uppercase;
            letter-spacing: 0.5px;
        }
        .tier-cta.basic {
            background: rgba(99, 102, 241, 0.15);
            color: #818cf8;
            border: 1px solid rgba(99, 102, 241, 0.3);
        }
        .tier-cta.basic:hover {
            background: rgba(99, 102, 241, 0.25);
            border-color: rgba(99, 102, 241, 0.5);
            transform: translateY(-2px);
        }
        .tier-cta.advanced {
            background: linear-gradient(135deg, #00d4ff 0%, #0099cc 100%);
            color: #000;
            box-shadow: 0 4px 20px rgba(0, 212, 255, 0.3);
        }
        .tier-cta.advanced:hover {
            box-shadow: 0 6px 30px rgba(0, 212, 255, 0.5);
            transform: translateY(-2px);
        }
        .tier-cta.premium {
            background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%);
            color: #000;
            box-shadow: 0 4px 20px rgba(245, 158, 11, 0.3);
        }
        .tier-cta.premium:hover {
            box-shadow: 0 6px 30px rgba(245, 158, 11, 0.5);
            transform: translateY(-2px);
        }

        /* Footer */
        .pricing-modal-footer {
            text-align: center;
            padding: 20px 40px 30px;
            border-top: 1px solid rgba(255, 255, 255, 0.05);
        }
        .pricing-modal-footer p {
            font-size: 0.85rem;
            color: rgba(255, 255, 255, 0.4);
            margin: 0;
        }
        .pricing-modal-footer a {
            color: #00d4ff;
            text-decoration: none;
        }
        .pricing-modal-footer a:hover {
            text-decoration: underline;
        }

        /* Security Badge */
        .security-badges {
            display: flex;
            justify-content: center;
            gap: 20px;
            margin-top: 15px;
        }
        .security-badge {
            display: flex;
            align-items: center;
            gap: 6px;
            font-size: 0.75rem;
            color: rgba(255, 255, 255, 0.4);
        }
        .security-badge svg {
            width: 14px;
            height: 14px;
            fill: currentColor;
        }
    `;
    document.head.appendChild(style);
}

// Create modal HTML
function createPricingModal() {
    if (document.getElementById('pricingModal')) return;

    const modal = document.createElement('div');
    modal.innerHTML = `
        <div class="pricing-modal-backdrop" id="pricingBackdrop"></div>
        <div class="pricing-modal" id="pricingModal">
            <div class="pricing-modal-header">
                <button class="pricing-modal-close" id="pricingClose">&times;</button>
                <h2 class="pricing-modal-title">Export Your Master</h2>
                <p class="pricing-modal-subtitle">Choose your mastering tier to unlock export</p>
            </div>

            <div class="pricing-tiers-grid">
                ${Object.entries(PRICING_TIERS).map(([key, tier]) => `
                    <div class="pricing-tier-card ${tier.popular ? 'popular' : ''}" data-tier="${key}">
                        ${tier.popular ? '<div class="popular-badge">Most Popular</div>' : ''}

                        <div class="tier-header">
                            <div class="tier-name">${tier.name}</div>
                            <div class="tier-tagline">${tier.tagline}</div>
                            <div class="tier-price">
                                <span class="tier-price-currency">$</span>
                                <span class="tier-price-amount">${tier.price}</span>
                                <div class="tier-price-period">${tier.period}</div>
                            </div>
                        </div>

                        <ul class="tier-features">
                            ${tier.features.map(f => `
                                <li class="tier-feature">
                                    <span class="tier-feature-icon ${f.included ? 'included' : 'excluded'}">
                                        ${f.included ? '✓' : '−'}
                                    </span>
                                    <span class="tier-feature-text ${f.included ? '' : 'excluded'} ${f.highlight ? 'highlight' : ''}">
                                        ${f.text}
                                    </span>
                                    <span class="tier-feature-info">ⓘ</span>
                                    ${FEATURE_TOOLTIPS[f.text] ? `<div class="feature-tooltip">${FEATURE_TOOLTIPS[f.text]}</div>` : ''}
                                </li>
                            `).join('')}
                        </ul>

                        <button class="tier-cta ${key}" data-tier="${key}">
                            Get ${tier.name}
                        </button>
                    </div>
                `).join('')}
            </div>

            <div class="pricing-modal-footer">
                <p>🔒 Secure payment powered by Stripe. All transactions are encrypted.</p>
                <div class="security-badges">
                    <span class="security-badge">
                        <svg viewBox="0 0 24 24"><path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4z"/></svg>
                        SSL Secure
                    </span>
                    <span class="security-badge">
                        <svg viewBox="0 0 24 24"><path d="M20 4H4c-1.11 0-1.99.89-1.99 2L2 18c0 1.11.89 2 2 2h16c1.11 0 2-.89 2-2V6c0-1.11-.89-2-2-2zm0 14H4v-6h16v6zm0-10H4V6h16v2z"/></svg>
                        Stripe Payments
                    </span>
                    <span class="security-badge">
                        <svg viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/></svg>
                        Money-back Guarantee
                    </span>
                </div>
            </div>
        </div>
    `;
    document.body.appendChild(modal);

    // Bind events
    document.getElementById('pricingBackdrop').addEventListener('click', closePricingModal);
    document.getElementById('pricingClose').addEventListener('click', closePricingModal);

    // Tier CTA buttons
    document.querySelectorAll('.tier-cta').forEach(btn => {
        btn.addEventListener('click', function() {
            const tier = this.dataset.tier;
            closePricingModal();
            window.selectedTier = tier;
            if (typeof window.downloadMaster === 'function') {
                window.downloadMaster();
            } else {
                if (typeof window.showLuvLangToast === 'function') {
                    window.showLuvLangToast('Please upload a track first, then select a tier to master.');
                } else {
                    alert('Please upload a track first, then select a tier to master.');
                }
            }
        });
    });

    // ESC key to close
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape') closePricingModal();
    });
}

// Open modal
function openPricingModal() {
    injectPricingStyles();
    createPricingModal();

    requestAnimationFrame(() => {
        document.getElementById('pricingBackdrop').classList.add('active');
        document.getElementById('pricingModal').classList.add('active');
        document.body.style.overflow = 'hidden';
    });

}

// Close modal
function closePricingModal() {
    const backdrop = document.getElementById('pricingBackdrop');
    const modal = document.getElementById('pricingModal');

    if (backdrop) backdrop.classList.remove('active');
    if (modal) modal.classList.remove('active');
    document.body.style.overflow = '';

}

// Override the old openCheckout function
window.openPricingModal = openPricingModal;
window.closePricingModal = closePricingModal;

// Replace old checkout with new pricing modal
document.addEventListener('DOMContentLoaded', function() {
    // Override export button clicks
    setTimeout(() => {
        const exportButtons = [
            document.getElementById('exportBtn'),
            document.getElementById('exportWavBtn'),
            document.getElementById('exportMp3Btn')
        ].filter(btn => btn !== null);

        exportButtons.forEach(btn => {
            btn.onclick = function(e) {
                e.preventDefault();
                openPricingModal();
            };

        });
    }, 500);
});

