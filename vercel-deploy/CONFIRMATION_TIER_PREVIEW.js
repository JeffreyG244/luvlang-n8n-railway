// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 🎛️ EXPORT CONFIRMATION + TIER PREVIEW SYSTEM
// Shows mastering session summary, renders 15-second tier previews,
// lets users A/B compare Basic / Professional / Studio before checkout
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
(function() {
    'use strict';

    // ═══════════════════════════════════════════════════════════════════════
    // TIER CONFIGURATIONS
    // ═══════════════════════════════════════════════════════════════════════

    // Tier IDs match TIER_SYSTEM.js canonical names: basic, advanced, premium
    const TIERS = {
        basic: {
            id: 'basic',
            name: 'Basic',
            tagline: 'Clean & Competitive',
            price: '$12.99',
            priceId: 'basic',
            color: '#888888',
            glow: 'rgba(136, 136, 136, 0.4)',
            badge: null,
            features: [
                '✓ AI loudness normalization (LUFS)',
                '✓ Platform presets (Spotify, Apple, YouTube)',
                '✓ 7-band genre-tuned EQ',
                '✓ Bus compression + brickwall limiter',
                '✓ 24-bit WAV export',
                '✓ Quality scorecard',
                '✗ Dynamic EQ',
                '✗ Multiband compression',
                '✗ Stereo widening',
                '✗ Harmonic exciter & warmth'
            ]
        },
        advanced: {
            id: 'advanced',
            name: 'Advanced',
            tagline: 'Radio-Ready Sound',
            price: '$29.99',
            priceId: 'advanced',
            color: '#00d4ff',
            glow: 'rgba(0, 212, 255, 0.5)',
            badge: 'MOST POPULAR',
            features: [
                '✓ Everything in Basic, plus:',
                '✓ Dynamic EQ (frequency-dependent)',
                '✓ 4-band multiband compression',
                '✓ Mid/Side stereo widening',
                '✓ Look-ahead limiter (cleaner peaks)',
                '✓ Genre-optimized AI EQ curves',
                '✓ Multi-format (WAV, MP3, FLAC)',
                '✗ Harmonic exciter',
                '✗ Analog tape warmth',
                '✗ Soft clipper & AI stem separation'
            ]
        },
        premium: {
            id: 'premium',
            name: 'Premium',
            tagline: 'World-Class Polish',
            price: '$59.99',
            priceId: 'premium',
            color: '#FFD700',
            glow: 'rgba(255, 215, 0, 0.5)',
            badge: 'BEST QUALITY',
            features: [
                '✓ Full 20-stage mastering chain',
                '✓ Harmonic exciter (presence & air)',
                '✓ Analog tape warmth (richness)',
                '✓ Soft clipper (studio glue)',
                '✓ Enhanced stereo imaging',
                '✓ AI stem separation',
                '✓ Downloadable mastering report',
                '✓ All export formats (WAV, MP3, FLAC, AIFF)',
                '✓ AI persistent learning',
                '✓ Everything in Advanced included'
            ]
        }
    };

    const PREVIEW_DURATION = 15; // seconds
    const FADE_MS = 50; // fade in/out for preview segments
    const CROSSFADE_DURATION = 0.3; // seconds for A/B crossfade

    // ═══════════════════════════════════════════════════════════════════════
    // STATE
    // ═══════════════════════════════════════════════════════════════════════

    let isModalOpen = false;
    let currentlyPlaying = null; // tier id or null
    let playbackContext = null; // live AudioContext for playback
    let playbackSource = null; // current source node
    let playbackGain = null; // gain node for crossfade
    let previewBuffers = {}; // { basic: AudioBuffer, advanced: AudioBuffer, premium: AudioBuffer }
    let previewSegment = null; // the raw 15-second segment before tier processing
    let renderingState = {}; // { basic: 'pending'|'rendering'|'ready', ... }
    let _lastPreviewSourceBuffer = null; // Cache key: identity of source audioBuffer
    let playbackStartTime = 0;
    let playbackOffset = 0;
    let animFrameId = null;

    // Premium effect customization — users can toggle individual effects on/off
    let premiumEffects = {
        exciter: true,
        warmth: true,
        softClipper: true,
        stereoEnhance: true,
        saturationLevel: 'balanced'  // 'low' | 'balanced' | 'high'
    };

    // ═══════════════════════════════════════════════════════════════════════
    // CSS INJECTION
    // ═══════════════════════════════════════════════════════════════════════

    function injectStyles() {
        if (document.getElementById('confirmation-tier-preview-css')) return;
        const style = document.createElement('style');
        style.id = 'confirmation-tier-preview-css';
        style.textContent = `
            /* ── Modal Overlay ── */
            .ctp-overlay {
                position: fixed;
                inset: 0;
                z-index: 100000;
                background: rgba(0, 0, 0, 0.85);
                backdrop-filter: blur(8px);
                display: flex;
                align-items: center;
                justify-content: center;
                opacity: 0;
                transition: opacity 0.3s ease;
                pointer-events: none;
            }
            .ctp-overlay.open {
                opacity: 1;
                pointer-events: auto;
            }

            /* ── Modal Container ── */
            .ctp-modal {
                background: linear-gradient(180deg, #1a1a24 0%, #0f0f16 100%);
                border: 1px solid rgba(255, 255, 255, 0.08);
                border-radius: 16px;
                width: 95vw;
                max-width: 1100px;
                max-height: 92vh;
                overflow-y: auto;
                box-shadow:
                    0 32px 64px rgba(0, 0, 0, 0.8),
                    inset 0 1px 1px rgba(255, 255, 255, 0.05);
                transform: translateY(20px) scale(0.97);
                transition: transform 0.3s ease;
                scrollbar-width: thin;
                scrollbar-color: #2a2a2f #0f0f16;
            }
            .ctp-overlay.open .ctp-modal {
                transform: translateY(0) scale(1);
            }

            /* ── Header ── */
            .ctp-header {
                padding: 28px 32px 20px;
                border-bottom: 1px solid rgba(255, 255, 255, 0.06);
                display: flex;
                align-items: center;
                justify-content: space-between;
            }
            .ctp-header h2 {
                margin: 0;
                font-size: 1.3rem;
                font-weight: 700;
                color: #fff;
                letter-spacing: -0.02em;
            }
            .ctp-header-sub {
                font-size: 0.8rem;
                color: rgba(255, 255, 255, 0.45);
                margin-top: 4px;
            }
            .ctp-close-btn {
                background: rgba(255, 255, 255, 0.06);
                border: 1px solid rgba(255, 255, 255, 0.1);
                border-radius: 8px;
                color: rgba(255, 255, 255, 0.6);
                font-size: 1.2rem;
                width: 36px;
                height: 36px;
                cursor: pointer;
                display: flex;
                align-items: center;
                justify-content: center;
                transition: all 0.15s;
            }
            .ctp-close-btn:hover {
                background: rgba(255, 255, 255, 0.1);
                color: #fff;
            }

            /* ── Session Summary Grid ── */
            .ctp-summary {
                display: grid;
                grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
                gap: 12px;
                padding: 20px 32px;
                border-bottom: 1px solid rgba(255, 255, 255, 0.06);
            }
            .ctp-summary-item {
                background: rgba(255, 255, 255, 0.03);
                border: 1px solid rgba(255, 255, 255, 0.06);
                border-radius: 8px;
                padding: 10px 14px;
            }
            .ctp-summary-label {
                font-size: 0.6rem;
                font-weight: 600;
                color: rgba(255, 255, 255, 0.35);
                letter-spacing: 0.12em;
                text-transform: uppercase;
                margin-bottom: 4px;
            }
            .ctp-summary-value {
                font-size: 0.85rem;
                font-weight: 600;
                color: #fff;
                white-space: nowrap;
                overflow: hidden;
                text-overflow: ellipsis;
            }
            .ctp-summary-value.highlight {
                color: #00d4ff;
                text-shadow: 0 0 12px rgba(0, 212, 255, 0.4);
            }

            /* ── Back / Change Settings Button ── */
            .ctp-back-btn {
                display: flex;
                align-items: center;
                justify-content: center;
                gap: 8px;
                width: 100%;
                padding: 14px;
                margin-top: 16px;
                background: rgba(255, 255, 255, 0.04);
                border: 1px solid rgba(255, 255, 255, 0.1);
                border-radius: 10px;
                color: rgba(255, 255, 255, 0.6);
                font-size: 0.8rem;
                font-weight: 600;
                letter-spacing: 0.06em;
                cursor: pointer;
                transition: all 0.2s;
            }
            .ctp-back-btn:hover {
                background: rgba(255, 255, 255, 0.08);
                border-color: rgba(0, 212, 255, 0.3);
                color: #00d4ff;
            }

            /* ── Section Title ── */
            .ctp-section-title {
                padding: 20px 32px 8px;
                font-size: 0.7rem;
                font-weight: 600;
                color: rgba(255, 255, 255, 0.35);
                letter-spacing: 0.12em;
                text-transform: uppercase;
            }

            /* ── Tier Cards Grid ── */
            .ctp-tiers {
                display: grid;
                grid-template-columns: repeat(3, 1fr);
                gap: 16px;
                padding: 12px 32px 28px;
            }

            /* ── Individual Tier Card ── */
            .ctp-card {
                background: rgba(255, 255, 255, 0.02);
                border: 1px solid rgba(255, 255, 255, 0.08);
                border-radius: 12px;
                padding: 20px;
                display: flex;
                flex-direction: column;
                transition: border-color 0.2s, box-shadow 0.2s;
                position: relative;
                overflow: hidden;
            }
            .ctp-card:hover {
                border-color: rgba(255, 255, 255, 0.15);
            }
            .ctp-card.selected {
                border-color: var(--tier-color);
                box-shadow: 0 0 20px var(--tier-glow), inset 0 0 20px rgba(0, 0, 0, 0.3);
            }
            .ctp-card.playing {
                border-color: var(--tier-color);
            }

            /* Badge */
            .ctp-badge {
                position: absolute;
                top: 12px;
                right: 12px;
                font-size: 0.55rem;
                font-weight: 700;
                letter-spacing: 0.1em;
                padding: 3px 8px;
                border-radius: 4px;
                text-transform: uppercase;
            }

            /* Tier Header */
            .ctp-card-name {
                font-size: 1.1rem;
                font-weight: 700;
                margin-bottom: 2px;
            }
            .ctp-card-tagline {
                font-size: 0.7rem;
                color: rgba(255, 255, 255, 0.4);
                margin-bottom: 12px;
            }
            .ctp-card-price {
                font-size: 1.5rem;
                font-weight: 800;
                margin-bottom: 4px;
            }
            .ctp-card-price-unit {
                font-size: 0.65rem;
                color: rgba(255, 255, 255, 0.4);
                margin-bottom: 16px;
            }

            /* Feature List */
            .ctp-features {
                list-style: none;
                padding: 0;
                margin: 0 0 16px;
                flex: 1;
            }
            .ctp-features li {
                font-size: 0.72rem;
                color: rgba(255, 255, 255, 0.65);
                padding: 3px 0 3px 16px;
                position: relative;
                line-height: 1.4;
            }
            .ctp-features li::before {
                content: '\\2713';
                position: absolute;
                left: 0;
                font-weight: 700;
                font-size: 0.65rem;
            }
            .ctp-features li.header-item {
                color: rgba(255, 255, 255, 0.45);
                font-style: italic;
                padding-left: 0;
            }
            .ctp-features li.header-item::before {
                content: '';
            }

            /* ── Preview Player ── */
            .ctp-player {
                background: rgba(0, 0, 0, 0.3);
                border: 1px solid rgba(255, 255, 255, 0.06);
                border-radius: 8px;
                padding: 12px;
                margin-bottom: 12px;
            }
            .ctp-player-top {
                display: flex;
                align-items: center;
                gap: 10px;
                margin-bottom: 8px;
            }
            .ctp-play-btn {
                width: 36px;
                height: 36px;
                min-width: 36px;
                border-radius: 50%;
                border: none;
                cursor: pointer;
                display: flex;
                align-items: center;
                justify-content: center;
                transition: all 0.15s;
                font-size: 0.85rem;
                color: #fff;
            }
            .ctp-play-btn:disabled {
                opacity: 0.3;
                cursor: not-allowed;
            }
            .ctp-play-btn:not(:disabled):hover {
                transform: scale(1.08);
                filter: brightness(1.15);
            }
            .ctp-player-status {
                font-size: 0.65rem;
                color: rgba(255, 255, 255, 0.4);
                flex: 1;
            }
            .ctp-player-time {
                font-size: 0.7rem;
                font-family: 'SF Mono', 'Fira Code', monospace;
                color: rgba(255, 255, 255, 0.5);
            }

            /* Waveform Canvas */
            .ctp-waveform {
                width: 100%;
                height: 40px;
                border-radius: 4px;
                background: rgba(0, 0, 0, 0.3);
            }

            /* Spinner */
            .ctp-spinner {
                width: 18px;
                height: 18px;
                border: 2px solid rgba(255, 255, 255, 0.15);
                border-top-color: var(--tier-color, #00d4ff);
                border-radius: 50%;
                animation: ctp-spin 0.8s linear infinite;
                margin: 0 auto;
            }
            @keyframes ctp-spin {
                to { transform: rotate(360deg); }
            }

            /* ── Select CTA Button ── */
            .ctp-select-btn {
                width: 100%;
                padding: 12px;
                border-radius: 8px;
                border: none;
                font-size: 0.8rem;
                font-weight: 700;
                letter-spacing: 0.05em;
                cursor: pointer;
                transition: all 0.15s;
                text-transform: uppercase;
                color: #fff;
            }
            .ctp-select-btn:hover {
                transform: translateY(-1px);
                filter: brightness(1.15);
            }
            .ctp-select-btn:active {
                transform: translateY(0);
            }

            /* ── Responsive ── */
            @media (max-width: 900px) {
                .ctp-tiers {
                    grid-template-columns: 1fr;
                    gap: 12px;
                }
                .ctp-summary {
                    grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
                }
                .ctp-modal {
                    max-width: 98vw;
                    border-radius: 12px;
                }
            }
            @media (max-width: 480px) {
                .ctp-overlay {
                    align-items: stretch;
                    padding: 0;
                }
                .ctp-modal {
                    width: 100vw;
                    max-width: 100vw;
                    max-height: 100vh;
                    border-radius: 0;
                }
                .ctp-header, .ctp-summary, .ctp-tiers, .ctp-section-title {
                    padding-left: 16px;
                    padding-right: 16px;
                }
                .ctp-card { padding: 16px; }
                .ctp-play-btn {
                    width: 44px;
                    height: 44px;
                    min-width: 44px;
                }
                .ctp-select-btn {
                    padding: 14px;
                    min-height: 44px;
                }
            }

            /* ── Premium Customize Panel ── */
            .ctp-tiers.ctp-slide-out {
                opacity: 0;
                transform: translateX(-30px);
                pointer-events: none;
                position: absolute;
                visibility: hidden;
                transition: opacity 0.3s ease, transform 0.3s ease;
            }
            .ctp-customize-panel {
                padding: 12px 32px 28px;
                animation: ctpSlideIn 0.35s ease forwards;
            }
            @keyframes ctpSlideIn {
                from { opacity: 0; transform: translateX(30px); }
                to   { opacity: 1; transform: translateX(0); }
            }
            .ctp-customize-header {
                text-align: center;
                margin-bottom: 24px;
            }
            .ctp-customize-header h3 {
                margin: 0 0 6px;
                font-size: 1.2rem;
                font-weight: 700;
                color: #FFD700;
            }
            .ctp-customize-header p {
                margin: 0;
                font-size: 0.78rem;
                color: rgba(255, 255, 255, 0.5);
            }
            .ctp-effects-grid {
                display: grid;
                grid-template-columns: repeat(2, 1fr);
                gap: 14px;
                margin-bottom: 20px;
            }
            .ctp-effect-card {
                background: rgba(255, 255, 255, 0.03);
                border: 1px solid rgba(255, 215, 0, 0.15);
                border-radius: 10px;
                padding: 16px;
                display: flex;
                flex-direction: column;
                gap: 8px;
                transition: border-color 0.2s, box-shadow 0.2s;
            }
            .ctp-effect-card.ctp-effect-on {
                border-color: rgba(255, 215, 0, 0.35);
                box-shadow: 0 0 12px rgba(255, 215, 0, 0.08);
            }
            .ctp-effect-card-top {
                display: flex;
                align-items: center;
                justify-content: space-between;
            }
            .ctp-effect-name {
                font-size: 0.85rem;
                font-weight: 700;
                color: #fff;
                display: flex;
                align-items: center;
                gap: 8px;
            }
            .ctp-effect-icon {
                font-size: 1rem;
            }
            .ctp-effect-desc {
                font-size: 0.7rem;
                color: rgba(255, 255, 255, 0.45);
                line-height: 1.4;
            }

            /* Toggle switch — reuses existing pattern */
            .ctp-toggle {
                position: relative;
                width: 40px;
                height: 22px;
                flex-shrink: 0;
            }
            .ctp-toggle input {
                opacity: 0;
                width: 0;
                height: 0;
                position: absolute;
            }
            .ctp-toggle-slider {
                position: absolute;
                inset: 0;
                background: rgba(255, 255, 255, 0.12);
                border-radius: 11px;
                cursor: pointer;
                transition: background 0.2s;
            }
            .ctp-toggle-slider::before {
                content: '';
                position: absolute;
                width: 16px;
                height: 16px;
                left: 3px;
                bottom: 3px;
                background: #fff;
                border-radius: 50%;
                transition: transform 0.2s;
            }
            .ctp-toggle input:checked + .ctp-toggle-slider {
                background: #FFD700;
            }
            .ctp-toggle input:checked + .ctp-toggle-slider::before {
                transform: translateX(18px);
            }
            .ctp-toggle input:focus-visible + .ctp-toggle-slider {
                outline: 2px solid #FFD700;
                outline-offset: 2px;
            }

            /* Customize panel buttons */
            .ctp-customize-actions {
                display: flex;
                gap: 12px;
                align-items: center;
            }
            .ctp-preview-btn {
                flex: 1;
                padding: 13px 20px;
                border-radius: 10px;
                border: 2px solid #FFD700;
                background: transparent;
                color: #FFD700;
                font-size: 0.82rem;
                font-weight: 700;
                letter-spacing: 0.04em;
                cursor: pointer;
                transition: all 0.15s;
                display: flex;
                align-items: center;
                justify-content: center;
                gap: 8px;
            }
            .ctp-preview-btn:hover {
                background: rgba(255, 215, 0, 0.1);
            }
            .ctp-preview-btn:disabled {
                opacity: 0.5;
                cursor: not-allowed;
            }
            .ctp-checkout-btn {
                flex: 1;
                padding: 13px 20px;
                border-radius: 10px;
                border: none;
                background: linear-gradient(180deg, #FFD700 0%, #c7a600 100%);
                color: #000;
                font-size: 0.82rem;
                font-weight: 700;
                letter-spacing: 0.04em;
                cursor: pointer;
                transition: all 0.15s;
            }
            .ctp-checkout-btn:hover {
                transform: translateY(-1px);
                filter: brightness(1.1);
            }
            .ctp-back-to-tiers {
                display: block;
                text-align: center;
                margin-top: 14px;
                font-size: 0.75rem;
                color: rgba(255, 255, 255, 0.4);
                cursor: pointer;
                transition: color 0.15s;
                background: none;
                border: none;
                padding: 6px;
                width: 100%;
            }
            .ctp-back-to-tiers:hover {
                color: rgba(255, 255, 255, 0.7);
            }

            /* Preview spinner inside button */
            .ctp-preview-btn .ctp-btn-spinner {
                width: 14px;
                height: 14px;
                border: 2px solid rgba(255, 215, 0, 0.3);
                border-top-color: #FFD700;
                border-radius: 50%;
                animation: ctp-spin 0.8s linear infinite;
                display: inline-block;
            }

            /* Waveform in customize panel */
            .ctp-customize-waveform-wrap {
                margin-bottom: 16px;
                background: rgba(0, 0, 0, 0.3);
                border: 1px solid rgba(255, 255, 255, 0.06);
                border-radius: 8px;
                padding: 10px;
            }
            .ctp-customize-waveform-wrap .ctp-player-top {
                display: flex;
                align-items: center;
                gap: 10px;
                margin-bottom: 6px;
            }

            /* ── Saturation 3-Way Toggle ── */
            .ctp-saturation-wrap {
                display: flex;
                align-items: center;
                gap: 6px;
                margin-top: 10px;
                padding: 6px 0 2px;
                transition: opacity 0.2s;
            }
            .ctp-saturation-wrap.disabled {
                opacity: 0.35;
                pointer-events: none;
            }
            .ctp-saturation-title {
                font-size: 0.6rem;
                color: rgba(255, 255, 255, 0.4);
                font-weight: 600;
                letter-spacing: 0.06em;
                text-transform: uppercase;
                margin-right: 4px;
                white-space: nowrap;
            }
            .ctp-sat-btn {
                flex: 1;
                padding: 5px 0;
                background: rgba(255, 255, 255, 0.04);
                border: 1px solid rgba(255, 255, 255, 0.1);
                color: rgba(255, 255, 255, 0.5);
                font-size: 0.6rem;
                font-weight: 600;
                cursor: pointer;
                transition: all 0.15s;
                text-align: center;
            }
            .ctp-sat-btn:first-of-type {
                border-radius: 5px 0 0 5px;
            }
            .ctp-sat-btn:last-of-type {
                border-radius: 0 5px 5px 0;
            }
            .ctp-sat-btn.active {
                background: rgba(255, 215, 0, 0.15);
                border-color: rgba(255, 215, 0, 0.5);
                color: #FFD700;
                box-shadow: 0 0 8px rgba(255, 215, 0, 0.15);
            }
            .ctp-sat-btn:hover:not(.active) {
                background: rgba(255, 255, 255, 0.08);
                border-color: rgba(255, 255, 255, 0.2);
                color: rgba(255, 255, 255, 0.7);
            }
            .ctp-sat-btn:focus-visible {
                outline: 2px solid #FFD700;
                outline-offset: 2px;
            }

            @media (max-width: 600px) {
                .ctp-effects-grid {
                    grid-template-columns: 1fr;
                }
                .ctp-customize-actions {
                    flex-direction: column;
                }
                .ctp-customize-panel {
                    padding-left: 16px;
                    padding-right: 16px;
                }
            }
        `;
        document.head.appendChild(style);
    }

    // ═══════════════════════════════════════════════════════════════════════
    // MODAL HTML
    // ═══════════════════════════════════════════════════════════════════════

    function buildModal() {
        const overlay = document.createElement('div');
        overlay.className = 'ctp-overlay';
        overlay.id = 'ctpOverlay';

        overlay.innerHTML = `
            <div class="ctp-modal" role="dialog" aria-label="Export Confirmation">
                <div class="ctp-header">
                    <div>
                        <h2>Confirm Your Master</h2>
                        <div class="ctp-header-sub">Review your session &amp; preview quality tiers before export</div>
                    </div>
                    <button class="ctp-close-btn" aria-label="Close" id="ctpCloseBtn">&times;</button>
                </div>

                <div class="ctp-summary" id="ctpSummary"></div>

                <div class="ctp-section-title">Choose Your Quality Tier &mdash; Listen &amp; Compare</div>

                <div class="ctp-tiers" id="ctpTiers"></div>

                <div style="padding: 0 32px 24px;">
                    <button class="ctp-back-btn" id="ctpBackBtn">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="15 18 9 12 15 6"></polyline></svg>
                        Back to Change Settings
                    </button>
                </div>
            </div>
        `;

        document.body.appendChild(overlay);

        // Close button
        document.getElementById('ctpCloseBtn').addEventListener('click', closeModal);

        // Back button — closes modal so user can change format/bit depth/platform
        document.getElementById('ctpBackBtn').addEventListener('click', closeModal);

        // Overlay click to close
        overlay.addEventListener('click', function(e) {
            if (e.target === overlay) closeModal();
        });

        // Escape key
        document.addEventListener('keydown', handleEscape);

        return overlay;
    }

    function handleEscape(e) {
        if (e.key === 'Escape' && isModalOpen) {
            closeModal();
        }
    }

    // ═══════════════════════════════════════════════════════════════════════
    // SESSION SUMMARY
    // ═══════════════════════════════════════════════════════════════════════

    function populateSummary() {
        const container = document.getElementById('ctpSummary');
        if (!container) return;

        const intensityLabels = { 1: 'Subtle', 2: 'Light', 3: 'Balanced', 4: 'Heavy', 5: 'Maximum' };
        const intensity = window.selectedIntensity || 3;
        const genre = window.selectedPreMasterGenre || 'General';
        const platform = window.selectedPlatform || 'spotify';
        const format = (window.selectedExportFormat || 'wav').toUpperCase();
        const bitDepth = (document.getElementById('bitDepthSelector')
            ? document.getElementById('bitDepthSelector').value : '24') + '-bit';
        const lufs = typeof window.getCurrentLUFS === 'function'
            ? window.getCurrentLUFS() : (window.lockedLUFS || -14);
        const truePeak = typeof window.getCurrentTruePeak === 'function'
            ? window.getCurrentTruePeak() : (window.lockedPeak || -1.0);
        const filename = window.currentFileName || 'Untitled Track';

        const items = [
            { label: 'Track', value: truncate(filename, 22), highlight: false },
            { label: 'Format', value: format, highlight: true },
            { label: 'Bit Depth', value: bitDepth, highlight: true },
            { label: 'Genre', value: capitalize(genre), highlight: false },
            { label: 'Platform', value: capitalize(platform), highlight: false },
            { label: 'Intensity', value: intensityLabels[intensity] || 'Balanced', highlight: false },
            { label: 'LUFS', value: (typeof lufs === 'number' ? lufs.toFixed(1) : '-14.0') + ' LUFS', highlight: true },
            { label: 'True Peak', value: (typeof truePeak === 'number' ? truePeak.toFixed(1) : '-1.0') + ' dBTP', highlight: false }
        ];

        container.innerHTML = items.map(function(item) {
            var cls = 'ctp-summary-value' + (item.highlight ? ' highlight' : '');
            return '<div class="ctp-summary-item">' +
                '<div class="ctp-summary-label">' + escapeHTML(item.label) + '</div>' +
                '<div class="' + cls + '">' + escapeHTML(item.value) + '</div>' +
                '</div>';
        }).join('');
    }

    // ═══════════════════════════════════════════════════════════════════════
    // TIER CARDS
    // ═══════════════════════════════════════════════════════════════════════

    function populateTierCards() {
        const container = document.getElementById('ctpTiers');
        if (!container) return;

        container.innerHTML = '';

        Object.keys(TIERS).forEach(function(tierId) {
            const tier = TIERS[tierId];

            const card = document.createElement('div');
            card.className = 'ctp-card';
            card.id = 'ctpCard-' + tierId;
            card.style.setProperty('--tier-color', tier.color);
            card.style.setProperty('--tier-glow', tier.glow);

            let badgeHTML = '';
            if (tier.badge) {
                const bgColor = tierId === 'advanced' ? 'rgba(0, 212, 255, 0.2)' : 'rgba(255, 215, 0, 0.2)';
                const textColor = tier.color;
                badgeHTML = '<div class="ctp-badge" style="background:' + bgColor +
                    '; color:' + textColor + '">' + tier.badge + '</div>';
            }

            var featuresHTML = tier.features.map(function(f) {
                var isIncluded = f.startsWith('✓');
                var isHeader = f.endsWith(':');
                var style = '';
                if (isIncluded) {
                    style = 'color:' + tier.color + '; opacity: 1;';
                } else if (f.startsWith('✗')) {
                    style = 'color: rgba(255,255,255,0.25); text-decoration: line-through; opacity: 0.6;';
                } else if (isHeader) {
                    style = 'color: rgba(255,255,255,0.7);';
                }
                return '<li style="' + style + '">' + escapeHTML(f) + '</li>';
            }).join('');

            card.innerHTML = badgeHTML +
                '<div class="ctp-card-name" style="color:' + tier.color + '">' + tier.name + '</div>' +
                '<div class="ctp-card-tagline">' + tier.tagline + '</div>' +
                '<div class="ctp-card-price" style="color:' + tier.color + '">' + tier.price + '</div>' +
                '<div class="ctp-card-price-unit">per track</div>' +
                '<ul class="ctp-features">' + featuresHTML + '</ul>' +
                '<div class="ctp-player" id="ctpPlayer-' + tierId + '">' +
                    '<div class="ctp-player-top">' +
                        '<button class="ctp-play-btn" id="ctpPlayBtn-' + tierId + '" disabled ' +
                            'style="background:' + tier.color + '" ' +
                            'aria-label="Play ' + tier.name + ' preview">' +
                            '<span id="ctpPlayIcon-' + tierId + '">&#9654;</span>' +
                        '</button>' +
                        '<span class="ctp-player-status" id="ctpStatus-' + tierId + '">Waiting...</span>' +
                        '<span class="ctp-player-time" id="ctpTime-' + tierId + '">0:00</span>' +
                    '</div>' +
                    '<canvas class="ctp-waveform" id="ctpWaveform-' + tierId + '" ' +
                        'aria-label="' + tier.name + ' tier waveform preview"></canvas>' +
                '</div>' +
                '<button class="ctp-select-btn" id="ctpSelectBtn-' + tierId + '" ' +
                    'style="background: linear-gradient(180deg, ' + tier.color + ' 0%, ' +
                    adjustColor(tier.color, -40) + ' 100%)">' +
                    'Select ' + tier.name + '</button>';

            container.appendChild(card);

            // Play button handler
            document.getElementById('ctpPlayBtn-' + tierId).addEventListener('click', function() {
                togglePlay(tierId);
            });

            // Select button handler
            document.getElementById('ctpSelectBtn-' + tierId).addEventListener('click', function() {
                selectTier(tierId);
            });
        });
    }

    // ═══════════════════════════════════════════════════════════════════════
    // AUDIO PREVIEW ENGINE — SEGMENT EXTRACTION
    // ═══════════════════════════════════════════════════════════════════════

    /**
     * findBestSegment — finds the most dynamic 15-second window in the buffer.
     * Scans RMS energy in 1-second hops, picks the window with highest average RMS,
     * but skips the first 2 seconds to avoid fade-ins.
     */
    function findBestSegment(buffer) {
        const sampleRate = buffer.sampleRate;
        const totalSamples = buffer.length;
        const segmentSamples = Math.min(PREVIEW_DURATION * sampleRate, totalSamples);
        const hopSamples = sampleRate; // 1-second hops
        const skipSamples = Math.min(2 * sampleRate, totalSamples - segmentSamples); // skip first 2s

        // If track is shorter than preview duration, use the whole thing
        if (totalSamples <= segmentSamples) {
            return 0;
        }

        const channelData = buffer.getChannelData(0);
        let bestOffset = skipSamples;
        let bestRMS = -Infinity;
        const maxOffset = totalSamples - segmentSamples;

        for (let offset = skipSamples; offset <= maxOffset; offset += hopSamples) {
            let sumSq = 0;
            const end = offset + segmentSamples;
            // Sample every 128th sample for speed
            let count = 0;
            for (let i = offset; i < end; i += 128) {
                sumSq += channelData[i] * channelData[i];
                count++;
            }
            const rms = sumSq / count;
            if (rms > bestRMS) {
                bestRMS = rms;
                bestOffset = offset;
            }
        }

        return bestOffset;
    }

    /**
     * extractSegment — copies 15 seconds from the source buffer with 50ms fade in/out.
     */
    function extractSegment(sourceBuffer, startSample) {
        const sampleRate = sourceBuffer.sampleRate;
        const segmentLength = Math.min(PREVIEW_DURATION * sampleRate, sourceBuffer.length - startSample);
        const channels = sourceBuffer.numberOfChannels;
        const fadeSamples = Math.floor((FADE_MS / 1000) * sampleRate);

        const segment = new AudioBuffer({
            length: segmentLength,
            numberOfChannels: channels,
            sampleRate: sampleRate
        });

        for (let ch = 0; ch < channels; ch++) {
            const src = sourceBuffer.getChannelData(ch);
            const dst = segment.getChannelData(ch);

            for (let i = 0; i < segmentLength; i++) {
                let sample = src[startSample + i];

                // Fade in
                if (i < fadeSamples) {
                    sample *= i / fadeSamples;
                }
                // Fade out
                if (i > segmentLength - fadeSamples) {
                    sample *= (segmentLength - i) / fadeSamples;
                }

                dst[i] = sample;
            }
        }

        return segment;
    }

    // ═══════════════════════════════════════════════════════════════════════
    // AUDIO PREVIEW ENGINE — TIER RENDERING (OfflineAudioContext)
    // ═══════════════════════════════════════════════════════════════════════

    /**
     * getGenreEQ — reads the user's selected genre EQ curve from the live mastering engine.
     * Falls back to a neutral mastering curve if not available.
     */
    function getGenreEQ() {
        var genre = window.selectedPreMasterGenre || 'pop';
        var curves = window.eqCurves;
        if (curves && curves[genre]) return curves[genre];
        // Neutral mastering curve — gentle smile EQ
        return { sub: 1.5, bass: 1.0, lowmid: -0.5, mid: 0.3, highmid: 1.0, high: 0.8, air: 1.2 };
    }

    /**
     * measureRMS — measures RMS loudness of a rendered AudioBuffer.
     * Used for LUFS-approximate normalization between tiers.
     */
    function measureRMS(buffer) {
        var sumSq = 0;
        var count = 0;
        for (var ch = 0; ch < buffer.numberOfChannels; ch++) {
            var data = buffer.getChannelData(ch);
            for (var i = 0; i < data.length; i++) {
                sumSq += data[i] * data[i];
                count++;
            }
        }
        return Math.sqrt(sumSq / (count || 1));
    }

    /**
     * normalizeBuffer — normalizes a rendered AudioBuffer to a target RMS.
     * Ensures all three tier previews play at the same perceived loudness
     * so users hear quality differences, not volume differences.
     */
    function normalizeBuffer(buffer, targetRMS) {
        var currentRMS = measureRMS(buffer);
        if (currentRMS < 0.0001) return buffer; // silence guard

        var gainLinear = targetRMS / currentRMS;
        // Clamp gain to prevent extreme correction (±6 dB max)
        gainLinear = Math.max(0.5, Math.min(2.0, gainLinear));

        for (var ch = 0; ch < buffer.numberOfChannels; ch++) {
            var data = buffer.getChannelData(ch);
            for (var i = 0; i < data.length; i++) {
                var s = data[i] * gainLinear;
                // Soft clip at ±0.995 to prevent digital overs (high ceiling = minimal coloration)
                if (s > 0.995) s = 0.995 + 0.005 * Math.tanh((s - 0.995) / 0.005);
                else if (s < -0.995) s = -0.995 - 0.005 * Math.tanh((-s - 0.995) / 0.005);
                data[i] = s;
            }
        }
        return buffer;
    }

    /**
     * renderTierPreview — renders the segment through a tier-specific processing chain.
     * Uses OfflineAudioContext for non-realtime rendering.
     *
     * GOOD (Basic $12.99) — Clean, loud, competitive. Your track mastered to standard.
     * BETTER (Advanced $29.99) — Professional dynamics, balanced frequency control.
     * BEST (Premium $59.99) — World-class polish with harmonic depth and analog character.
     */
    async function renderTierPreview(segment, tierId) {
        var sampleRate = segment.sampleRate;
        var length = segment.length;
        var channels = segment.numberOfChannels;

        var offline = new OfflineAudioContext(channels, length, sampleRate);

        // Source
        var source = offline.createBufferSource();
        source.buffer = segment;
        var currentNode = source;

        // ── Stage 1: Subsonic filter (all tiers) ──
        // Removes sub-20Hz rumble that wastes headroom
        var subsonic = offline.createBiquadFilter();
        subsonic.type = 'highpass';
        subsonic.frequency.value = 30;
        subsonic.Q.value = 0.707;
        currentNode.connect(subsonic);
        currentNode = subsonic;

        // Get genre-aware EQ values
        var genreEQ = getGenreEQ();

        // ═══════════════════════════════════════════════════════════
        // ALL TIERS: 7-band genre-aware parametric EQ (SERIAL)
        // Basic 70% — gentle correction
        // Advanced 100% — full professional sculpting
        // Premium 110% + air shelf — shimmer and openness
        // ═══════════════════════════════════════════════════════════
        var eqIntensity = (tierId === 'basic') ? 0.75 :
                          (tierId === 'advanced') ? 1.0 : 1.05;

        var eqBands = [
            { freq: 60,    type: 'lowshelf',  key: 'sub',     Q: 0.707 },
            { freq: 120,   type: 'peaking',   key: 'bass',    Q: 0.8 },
            { freq: 400,   type: 'peaking',   key: 'lowmid',  Q: 0.9 },
            { freq: 1000,  type: 'peaking',   key: 'mid',     Q: 0.8 },
            { freq: 3200,  type: 'peaking',   key: 'highmid', Q: 1.0 },
            { freq: 8000,  type: 'peaking',   key: 'high',    Q: 0.9 },
            { freq: 12000, type: 'highshelf', key: 'air',     Q: 0.707 }
        ];

        eqBands.forEach(function(b) {
            var filter = offline.createBiquadFilter();
            filter.type = b.type;
            filter.frequency.value = b.freq;
            filter.Q.value = b.Q;
            filter.gain.value = (genreEQ[b.key] || 0) * eqIntensity;
            currentNode.connect(filter);
            currentNode = filter;
        });

        // Basic: subtle air shelf (+0.8 dB above 12kHz for a more mastered feel)
        if (tierId === 'basic') {
            var basicAir = offline.createBiquadFilter();
            basicAir.type = 'highshelf';
            basicAir.frequency.value = 12000;
            basicAir.gain.value = 0.8;
            basicAir.Q.value = 0.707;
            currentNode.connect(basicAir);
            currentNode = basicAir;
        }

        // Premium: extra air shelf (+1.0 dB above 14kHz for shimmer)
        if (tierId === 'premium') {
            var airShelf = offline.createBiquadFilter();
            airShelf.type = 'highshelf';
            airShelf.frequency.value = 14000;
            airShelf.gain.value = 1.0;
            airShelf.Q.value = 0.707;
            currentNode.connect(airShelf);
            currentNode = airShelf;
        }

        // ═══════════════════════════════════════════════════════════
        // ADVANCED + PREMIUM: Surgical EQ (serial — no band splitting)
        // De-mud, de-ess, presence lift — all serial BiquadFilters
        // ═══════════════════════════════════════════════════════════
        if (tierId === 'advanced' || tierId === 'premium') {
            var isPremium = (tierId === 'premium');

            // De-mud: tighten low-mids for clarity
            var deMud = offline.createBiquadFilter();
            deMud.type = 'peaking';
            deMud.frequency.value = 300;
            deMud.Q.value = 1.5;
            deMud.gain.value = -1.5;
            currentNode.connect(deMud);
            currentNode = deMud;

            // Box cut: reduce cardboard-y frequencies
            var boxCut = offline.createBiquadFilter();
            boxCut.type = 'peaking';
            boxCut.frequency.value = 500;
            boxCut.Q.value = 2.0;
            boxCut.gain.value = -1.0;
            currentNode.connect(boxCut);
            currentNode = boxCut;

            // Presence lift: open up the mix (wider Q = more musical)
            var presence = offline.createBiquadFilter();
            presence.type = 'peaking';
            presence.frequency.value = 3000;
            presence.Q.value = isPremium ? 1.0 : 0.9;
            presence.gain.value = isPremium ? 1.2 : 1.0;
            currentNode.connect(presence);
            currentNode = presence;

            // De-ess: tame harsh sibilance (wider Q for more musical correction)
            var deEss = offline.createBiquadFilter();
            deEss.type = 'peaking';
            deEss.frequency.value = 6500;
            deEss.Q.value = 2.5;
            deEss.gain.value = isPremium ? -1.5 : -1.2;
            currentNode.connect(deEss);
            currentNode = deEss;
        }

        // ═══════════════════════════════════════════════════════════
        // ALL TIERS: Glue bus compressor
        // Basic: gentle (high threshold, low ratio)
        // Advanced: tighter musical control
        // Premium: precision bus compression
        // ═══════════════════════════════════════════════════════════
        var busComp = offline.createDynamicsCompressor();
        if (tierId === 'basic') {
            busComp.threshold.value = -15;
            busComp.knee.value = 10;
            busComp.ratio.value = 1.8;
            busComp.attack.value = 0.020;
            busComp.release.value = 0.250; // longer release = smoother, less pumping
        } else if (tierId === 'advanced') {
            busComp.threshold.value = -16;
            busComp.knee.value = 8;
            busComp.ratio.value = 2.2;
            busComp.attack.value = 0.012;
            busComp.release.value = 0.150;
        } else {
            // Premium: transparent precision — wider knee than Advanced for smoother action
            busComp.threshold.value = -16;
            busComp.knee.value = 9;
            busComp.ratio.value = 2.0;
            busComp.attack.value = 0.012;
            busComp.release.value = 0.160;
        }
        currentNode.connect(busComp);
        currentNode = busComp;

        // ═══════════════════════════════════════════════════════════
        // ADVANCED + PREMIUM: Character compressor (serial)
        // Second compressor adds musical punch and density
        // (Industry technique: 2 comps in series = glue + character)
        // ═══════════════════════════════════════════════════════════
        if (tierId === 'advanced' || tierId === 'premium') {
            var charComp = offline.createDynamicsCompressor();
            if (tierId === 'premium') {
                // Premium character — gentle density, preserve transients
                charComp.threshold.value = -12;
                charComp.knee.value = 12;
                charComp.ratio.value = 1.2;
                charComp.attack.value = 0.030;
                charComp.release.value = 0.280;
            } else {
                // Musical density — tighter knee for more character
                charComp.threshold.value = -10;
                charComp.knee.value = 12;
                charComp.ratio.value = 1.3;
                charComp.attack.value = 0.030;
                charComp.release.value = 0.250;
            }
            currentNode.connect(charComp);
            currentNode = charComp;
        }

        // ═══════════════════════════════════════════════════════════
        // ADVANCED + PREMIUM: M/S Stereo widening
        // Proper Mid/Side math — boosts side signal for wider image
        // Mono content preserved perfectly (no phase cancellation)
        // For Premium: uses full width (1.25) when stereoEnhance ON,
        // falls back to Advanced width (1.15) when OFF
        // ═══════════════════════════════════════════════════════════
        if ((tierId === 'advanced' || tierId === 'premium') && channels >= 2) {
            var stereoTier = tierId;
            if (tierId === 'premium' && !premiumEffects.stereoEnhance) {
                stereoTier = 'advanced'; // fall back to Advanced width
            }
            currentNode = applyStereoWidening(offline, currentNode, stereoTier);
        }

        // ═══════════════════════════════════════════════════════════
        // PREMIUM ONLY: Harmonic exciter (subtle upper harmonics)
        // ═══════════════════════════════════════════════════════════
        if (tierId === 'premium' && premiumEffects.exciter) {
            currentNode = applyHarmonicExciter(offline, currentNode);
        }

        // ═══════════════════════════════════════════════════════════
        // PREMIUM ONLY: Analog warmth (gentle tape saturation)
        // ═══════════════════════════════════════════════════════════
        if (tierId === 'premium' && premiumEffects.warmth) {
            currentNode = applyAnalogWarmth(offline, currentNode, premiumEffects.saturationLevel);
        }

        // ═══════════════════════════════════════════════════════════
        // PREMIUM ONLY: Soft clipper (catches peaks before limiter)
        // ═══════════════════════════════════════════════════════════
        if (tierId === 'premium' && premiumEffects.softClipper) {
            currentNode = applySoftClipper(offline, currentNode);
        }

        // ═══════════════════════════════════════════════════════════
        // ADVANCED + PREMIUM: Look-ahead limiter (transparent peaks)
        // ═══════════════════════════════════════════════════════════
        if (tierId === 'advanced' || tierId === 'premium') {
            var laLimiter = offline.createDynamicsCompressor();
            laLimiter.threshold.value = (tierId === 'premium') ? -2.0 : -2.5;
            laLimiter.knee.value = 0;
            laLimiter.ratio.value = 20;
            laLimiter.attack.value = 0.001;
            // Premium: longer release for maximum transparency
            // Advanced: moderate release for clean limiting
            laLimiter.release.value = (tierId === 'premium') ? 0.100 : 0.080;
            currentNode.connect(laLimiter);
            currentNode = laLimiter;
        }

        // ═══════════════════════════════════════════════════════════
        // ALL TIERS: Brickwall limiter (final safety net)
        // Premium: -0.5 dBTP (soft clipper + look-ahead already caught peaks)
        // Advanced: -0.8 dBTP (look-ahead provides clean headroom)
        // Basic: -1.0 dBTP (conservative — single limiter stage)
        // ═══════════════════════════════════════════════════════════
        var brickwall = offline.createDynamicsCompressor();
        brickwall.threshold.value = (tierId === 'premium') ? -0.5 :
                                    (tierId === 'advanced') ? -0.8 : -1.0;
        brickwall.knee.value = 0;
        brickwall.ratio.value = 20;
        brickwall.attack.value = 0.001;
        brickwall.release.value = 0.030;
        currentNode.connect(brickwall);
        currentNode = brickwall;

        // ── Master output ──
        var masterGain = offline.createGain();
        masterGain.gain.value = 1.0;
        currentNode.connect(masterGain);
        masterGain.connect(offline.destination);

        source.start(0);
        return offline.startRendering();
    }

    // ═══════════════════════════════════════════════════════════════════════
    // PROCESSING HELPERS — All serial (no parallel band splitting)
    // ═══════════════════════════════════════════════════════════════════════

    /**
     * applyStereoWidening — proper Mid/Side stereo widening.
     *
     * Math: Given width factor w (1.0 = unity, >1.0 = wider):
     *   newL = L * (1+w)/2 + R * (1-w)/2
     *   newR = R * (1+w)/2 + L * (1-w)/2
     *
     * When w > 1, cross-gain is negative → opposite channel subtracted
     * → side signal (L-R) is boosted, mono (L+R) is preserved perfectly.
     * No phase cancellation, no comb filtering.
     */
    function applyStereoWidening(ctx, input, tierId) {
        var widthFactor = (tierId === 'premium') ? 1.25 : 1.15;

        var splitter = ctx.createChannelSplitter(2);
        var merger = ctx.createChannelMerger(2);

        input.connect(splitter);

        var directGain = (1 + widthFactor) / 2;
        var crossGain = (1 - widthFactor) / 2;

        // Left output = L*direct + R*cross
        var lDirect = ctx.createGain();
        lDirect.gain.value = directGain;
        splitter.connect(lDirect, 0);

        var lCross = ctx.createGain();
        lCross.gain.value = crossGain;
        splitter.connect(lCross, 1);

        var leftSum = ctx.createGain();
        leftSum.gain.value = 1.0;
        lDirect.connect(leftSum);
        lCross.connect(leftSum);

        // Right output = R*direct + L*cross
        var rDirect = ctx.createGain();
        rDirect.gain.value = directGain;
        splitter.connect(rDirect, 1);

        var rCross = ctx.createGain();
        rCross.gain.value = crossGain;
        splitter.connect(rCross, 0);

        var rightSum = ctx.createGain();
        rightSum.gain.value = 1.0;
        rDirect.connect(rightSum);
        rCross.connect(rightSum);

        leftSum.connect(merger, 0, 0);
        rightSum.connect(merger, 0, 1);

        return merger;
    }

    /**
     * applyHarmonicExciter — subtle upper harmonic generation.
     * Premium only. Isolates frequencies above 2kHz, applies gentle
     * saturation to generate musical harmonics, then blends back at
     * low level. Post-LP at 14kHz tames any harsh artifacts.
     */
    function applyHarmonicExciter(ctx, input) {
        // Isolate upper frequencies for harmonic generation (2kHz avoids low-mid coloration)
        var hpFilter = ctx.createBiquadFilter();
        hpFilter.type = 'highpass';
        hpFilter.frequency.value = 2000;
        hpFilter.Q.value = 0.5;
        input.connect(hpFilter);

        // Gentle saturation — generates subtle musical harmonics
        var shaper = ctx.createWaveShaper();
        var curve = new Float32Array(4096);
        for (var i = 0; i < 4096; i++) {
            var x = (i / 4095) * 2 - 1;
            curve[i] = Math.tanh(x * 1.15);
        }
        shaper.curve = curve;
        shaper.oversample = '4x';
        hpFilter.connect(shaper);

        // Tame harsh upper harmonics above 14kHz
        var postLP = ctx.createBiquadFilter();
        postLP.type = 'lowpass';
        postLP.frequency.value = 14000;
        postLP.Q.value = 0.5;
        shaper.connect(postLP);

        // Wet blend — subtle presence and air shimmer (less = more transparent)
        var wetGain = ctx.createGain();
        wetGain.gain.value = 0.06;
        postLP.connect(wetGain);

        // Dry pass-through (unity)
        var dryGain = ctx.createGain();
        dryGain.gain.value = 1.0;
        input.connect(dryGain);

        var sum = ctx.createGain();
        sum.gain.value = 1.0;
        dryGain.connect(sum);
        wetGain.connect(sum);
        return sum;
    }

    /**
     * applyAnalogWarmth — tape-style saturation for richness.
     * Premium only. 3 levels: low (subtle), balanced (default), high (heavy).
     * tanh waveshaping with 4x oversampling for clean harmonic distortion.
     *
     * Gain compensation: tanh(x*drive) amplifies quiet signals by ~drive factor
     * while compressing peaks. Without compensation, the blended signal pushes
     * downstream limiters harder (up to +3 dB at High). The output gain is set
     * to 1/(dryMix + wetMix*drive) to maintain unity RMS — the saturated harmonics
     * add color without adding level, keeping the dynamics chain clean.
     */
    function applyAnalogWarmth(ctx, input, saturationLevel) {
        var levels = {
            low:      { drive: 1.1, wet: 0.10 },  // subtle tape warmth
            balanced: { drive: 1.5, wet: 0.25 },  // present, musical default
            high:     { drive: 2.0, wet: 0.43 }   // heavy harmonic saturation
        };
        var cfg = levels[saturationLevel] || levels.balanced;
        var drive = cfg.drive;
        var wetMix = cfg.wet;
        var dryMix = 1.0 - wetMix;

        var shaper = ctx.createWaveShaper();
        var curve = new Float32Array(4096);
        for (var i = 0; i < 4096; i++) {
            var x = (i / 4095) * 2 - 1;
            curve[i] = Math.tanh(x * drive);
        }
        shaper.curve = curve;
        shaper.oversample = '4x';

        var wetGain = ctx.createGain();
        wetGain.gain.value = wetMix;
        input.connect(shaper);
        shaper.connect(wetGain);

        var dryGain = ctx.createGain();
        dryGain.gain.value = dryMix;
        input.connect(dryGain);

        // Gain compensation: neutralize the RMS increase from saturation
        // Small-signal gain = dryMix + wetMix * drive (Low: 1.01, Balanced: 1.125, High: 1.43)
        // Compensate so downstream limiters see the same level regardless of setting
        var smallSignalGain = dryMix + wetMix * drive;
        var output = ctx.createGain();
        output.gain.value = 1.0 / smallSignalGain;
        wetGain.connect(output);
        dryGain.connect(output);
        return output;
    }

    /**
     * applySoftClipper — catches peaks before the limiter chain.
     * Premium only. Transparent at normal levels (-0.5 dB ceiling),
     * gently saturates peaks above ceiling using tanh knee.
     */
    function applySoftClipper(ctx, input) {
        var shaper = ctx.createWaveShaper();
        var curve = new Float32Array(4096);
        var ceiling = 0.955; // ~-0.4 dB — higher ceiling = less coloration, more transparent
        for (var i = 0; i < 4096; i++) {
            var x = (i / 4095) * 2 - 1;
            if (Math.abs(x) < ceiling) {
                curve[i] = x;
            } else {
                curve[i] = Math.sign(x) * (ceiling + (1 - ceiling) * Math.tanh((Math.abs(x) - ceiling) / (1 - ceiling)));
            }
        }
        shaper.curve = curve;
        shaper.oversample = '4x';

        input.connect(shaper);
        return shaper;
    }

    // ═══════════════════════════════════════════════════════════════════════
    // PREVIEW RENDERING ORCHESTRATION
    // ═══════════════════════════════════════════════════════════════════════

    async function renderAllPreviews(audioBuffer) {
        // Find best 15-second segment (most dynamic section)
        var startSample = findBestSegment(audioBuffer);
        previewSegment = extractSegment(audioBuffer, startSample);

        // Render all tiers first, then LUFS-normalize so users hear quality not volume
        var tierIds = ['basic', 'advanced', 'premium'];
        var renderedBuffers = {};

        // Pass 1: Render each tier through its processing chain
        for (var i = 0; i < tierIds.length; i++) {
            var tierId = tierIds[i];
            renderingState[tierId] = 'rendering';
            updatePlayerUI(tierId);

            try {
                renderedBuffers[tierId] = await renderTierPreview(previewSegment, tierId);
            } catch (err) {
                console.error('Tier render failed (' + tierId + '):', err);
                renderingState[tierId] = 'error';
                updatePlayerUI(tierId);
            }
        }

        // Pass 2: LUFS-normalize all rendered buffers to the same loudness
        // This is CRITICAL — without it, louder tiers are perceived as "better"
        // which isn't a fair quality comparison. Use Advanced as reference.
        var referenceRMS = null;
        if (renderedBuffers['advanced']) {
            referenceRMS = measureRMS(renderedBuffers['advanced']);
        } else if (renderedBuffers['basic']) {
            referenceRMS = measureRMS(renderedBuffers['basic']);
        }

        if (referenceRMS && referenceRMS > 0.0001) {
            for (var j = 0; j < tierIds.length; j++) {
                var tid = tierIds[j];
                if (renderedBuffers[tid]) {
                    normalizeBuffer(renderedBuffers[tid], referenceRMS);
                }
            }
        }

        // Pass 3: Store buffers, update UI, draw waveforms
        for (var k = 0; k < tierIds.length; k++) {
            var id = tierIds[k];
            if (renderedBuffers[id]) {
                previewBuffers[id] = renderedBuffers[id];
                renderingState[id] = 'ready';
                updatePlayerUI(id);
                drawWaveform(id, previewBuffers[id]);
            }
        }
    }

    function updatePlayerUI(tierId) {
        const state = renderingState[tierId];
        const statusEl = document.getElementById('ctpStatus-' + tierId);
        const playBtn = document.getElementById('ctpPlayBtn-' + tierId);
        const iconEl = document.getElementById('ctpPlayIcon-' + tierId);

        if (!statusEl || !playBtn) return;

        if (state === 'rendering') {
            statusEl.innerHTML = '<span class="ctp-spinner" style="display:inline-block;vertical-align:middle;margin-right:6px"></span> Rendering preview...';
            playBtn.disabled = true;
            iconEl.innerHTML = '&#9654;';
        } else if (state === 'ready') {
            statusEl.textContent = 'Preview ready';
            playBtn.disabled = false;
            if (currentlyPlaying === tierId) {
                iconEl.innerHTML = '&#9646;&#9646;'; // pause
            } else {
                iconEl.innerHTML = '&#9654;'; // play
            }
        } else if (state === 'error') {
            statusEl.textContent = 'Render failed';
            playBtn.disabled = true;
        } else {
            statusEl.textContent = 'Waiting...';
            playBtn.disabled = true;
        }
    }

    // ═══════════════════════════════════════════════════════════════════════
    // WAVEFORM VISUALIZATION
    // ═══════════════════════════════════════════════════════════════════════

    function drawWaveform(tierId, buffer) {
        const canvas = document.getElementById('ctpWaveform-' + tierId);
        if (!canvas) return;

        const dpr = window.devicePixelRatio || 1;
        const rect = canvas.getBoundingClientRect();
        canvas.width = rect.width * dpr;
        canvas.height = rect.height * dpr;

        const ctx = canvas.getContext('2d');
        ctx.scale(dpr, dpr);

        const width = rect.width;
        const height = rect.height;
        const data = buffer.getChannelData(0);
        const step = Math.floor(data.length / width);
        // 'Customize' uses Premium color
        const tier = TIERS[tierId] || TIERS.premium;

        ctx.clearRect(0, 0, width, height);

        // Draw waveform
        ctx.beginPath();
        const mid = height / 2;

        for (let x = 0; x < width; x++) {
            const start = x * step;
            let min = 1, max = -1;
            for (let j = 0; j < step; j++) {
                const sample = data[start + j] || 0;
                if (sample < min) min = sample;
                if (sample > max) max = sample;
            }
            const yTop = mid + min * mid * 0.9;
            const yBottom = mid + max * mid * 0.9;
            ctx.moveTo(x, yTop);
            ctx.lineTo(x, yBottom);
        }

        ctx.strokeStyle = tier.color;
        ctx.lineWidth = 1;
        ctx.globalAlpha = 0.6;
        ctx.stroke();
        ctx.globalAlpha = 1.0;
    }

    // ═══════════════════════════════════════════════════════════════════════
    // PLAYBACK CONTROLS
    // ═══════════════════════════════════════════════════════════════════════

    // ── Chloe tier narration — speaks tier features when user plays a preview ──
    var TIER_NARRATIONS = {
        basic: "This is the Basic tier. " +
            "Your track gets a 7-band parametric EQ tuned to your genre, " +
            "bus compression for glue, and a brickwall limiter. " +
            "Clean, loud, and ready to upload.",
        advanced: "This is the Advanced tier, our most popular. " +
            "You get everything in Basic, plus surgical EQ for clarity and punch, " +
            "dual-stage compression for professional density, " +
            "mid-side stereo widening for a wider, more immersive sound, " +
            "and a transparent look-ahead limiter. " +
            "This is radio-ready mastering.",
        premium: "This is the Premium tier. Our full studio mastering chain. " +
            "On top of everything in Advanced, you get a harmonic exciter for air and presence, " +
            "analog tape warmth for richness and depth, " +
            "a soft clipper for studio glue, " +
            "and the widest stereo imaging. " +
            "This is world-class mastering used by professionals."
    };
    var _lastNarratedTier = null;

    function narrateTier(tierId) {
        // Only narrate once per tier (until modal closes)
        if (_lastNarratedTier === tierId) return;
        _lastNarratedTier = tierId;

        var text = TIER_NARRATIONS[tierId];
        if (!text) return;

        // Use Chloe (Azure TTS) if available
        if (typeof window.speakWithDucking === 'function') {
            window.speakWithDucking(text);
        }
    }

    function togglePlay(tierId) {
        if (renderingState[tierId] !== 'ready') return;

        // If this tier is already playing, stop it
        if (currentlyPlaying === tierId) {
            stopPlayback();
            return;
        }

        // Chloe narrates AFTER the sample finishes (moved to onended callbacks)

        // If another tier is playing, crossfade
        if (currentlyPlaying) {
            crossfadeTo(tierId);
        } else {
            startPlayback(tierId);
        }
    }

    function startPlayback(tierId) {
        const buffer = previewBuffers[tierId];
        if (!buffer) return;

        // Create or resume AudioContext (Safari user-gesture requirement handled here)
        if (!playbackContext || playbackContext.state === 'closed') {
            playbackContext = new AudioContext();
        }
        if (playbackContext.state === 'suspended') {
            playbackContext.resume();
        }

        playbackGain = playbackContext.createGain();
        playbackGain.gain.value = 1.0;
        playbackGain.connect(playbackContext.destination);

        playbackSource = playbackContext.createBufferSource();
        playbackSource.buffer = buffer;
        playbackSource.connect(playbackGain);

        playbackSource.onended = function() {
            if (currentlyPlaying === tierId) {
                currentlyPlaying = null;
                playbackOffset = 0;
                updateAllPlayButtons();
                updateTimeDisplay(tierId, 0);
                cancelAnimationFrame(animFrameId);
                // Chloe narrates after sample finishes playing
                narrateTier(tierId);
            }
        };

        playbackStartTime = playbackContext.currentTime;
        playbackSource.start(0, playbackOffset);
        currentlyPlaying = tierId;

        updateAllPlayButtons();
        startTimeUpdater(tierId);

        // Visual: highlight playing card
        document.querySelectorAll('.ctp-card').forEach(function(c) { c.classList.remove('playing'); });
        var card = document.getElementById('ctpCard-' + tierId);
        if (card) card.classList.add('playing');
    }

    function stopPlayback() {
        if (playbackSource) {
            try {
                playbackSource.onended = null;
                playbackSource.stop();
            } catch (e) { /* already stopped */ }
            playbackSource = null;
        }

        // Save offset for resume capability
        if (playbackContext && currentlyPlaying) {
            playbackOffset = (playbackContext.currentTime - playbackStartTime + playbackOffset);
            const bufferDuration = previewBuffers[currentlyPlaying] ? previewBuffers[currentlyPlaying].duration : PREVIEW_DURATION;
            if (playbackOffset >= bufferDuration) playbackOffset = 0;
        }

        cancelAnimationFrame(animFrameId);
        const prevTier = currentlyPlaying;
        currentlyPlaying = null;
        playbackOffset = 0;
        updateAllPlayButtons();
        if (prevTier) updateTimeDisplay(prevTier, 0);

        document.querySelectorAll('.ctp-card').forEach(function(c) { c.classList.remove('playing'); });
    }

    function crossfadeTo(tierId) {
        const buffer = previewBuffers[tierId];
        if (!buffer || !playbackContext) return;

        // Fade out current
        if (playbackGain) {
            playbackGain.gain.linearRampToValueAtTime(0, playbackContext.currentTime + CROSSFADE_DURATION);
        }

        const oldSource = playbackSource;
        setTimeout(function() {
            if (oldSource) {
                try { oldSource.onended = null; oldSource.stop(); } catch (e) {}
            }
        }, CROSSFADE_DURATION * 1000 + 50);

        // Start new tier
        const newGain = playbackContext.createGain();
        newGain.gain.value = 0;
        newGain.gain.linearRampToValueAtTime(1.0, playbackContext.currentTime + CROSSFADE_DURATION);
        newGain.connect(playbackContext.destination);

        const newSource = playbackContext.createBufferSource();
        newSource.buffer = buffer;
        newSource.connect(newGain);

        newSource.onended = function() {
            if (currentlyPlaying === tierId) {
                currentlyPlaying = null;
                playbackOffset = 0;
                updateAllPlayButtons();
                updateTimeDisplay(tierId, 0);
                cancelAnimationFrame(animFrameId);
                // Chloe narrates after sample finishes playing
                narrateTier(tierId);
            }
        };

        playbackSource = newSource;
        playbackGain = newGain;
        playbackStartTime = playbackContext.currentTime;
        playbackOffset = 0;
        newSource.start(0);
        currentlyPlaying = tierId;

        updateAllPlayButtons();
        startTimeUpdater(tierId);

        document.querySelectorAll('.ctp-card').forEach(function(c) { c.classList.remove('playing'); });
        var card = document.getElementById('ctpCard-' + tierId);
        if (card) card.classList.add('playing');
    }

    function updateAllPlayButtons() {
        Object.keys(TIERS).forEach(function(tierId) {
            var iconEl = document.getElementById('ctpPlayIcon-' + tierId);
            var statusEl = document.getElementById('ctpStatus-' + tierId);
            if (!iconEl) return;

            if (currentlyPlaying === tierId) {
                iconEl.innerHTML = '&#9646;&#9646;'; // pause icon
                if (statusEl && renderingState[tierId] === 'ready') statusEl.textContent = 'Playing...';
            } else {
                iconEl.innerHTML = '&#9654;'; // play icon
                if (statusEl && renderingState[tierId] === 'ready') statusEl.textContent = 'Preview ready';
            }
        });

        // Also sync customize panel play button if present
        var custPlayIcon = document.getElementById('ctpCustomizePlayIcon');
        var custStatus = document.getElementById('ctpCustomizeStatus');
        if (custPlayIcon) {
            if (currentlyPlaying === 'premium') {
                custPlayIcon.innerHTML = '&#9646;&#9646;';
                if (custStatus) custStatus.textContent = 'Playing...';
            } else {
                custPlayIcon.innerHTML = '&#9654;';
                if (custStatus && renderingState.premium === 'ready') custStatus.textContent = 'Preview ready';
            }
        }
    }

    function startTimeUpdater(tierId) {
        cancelAnimationFrame(animFrameId);

        function tick() {
            if (!currentlyPlaying || currentlyPlaying !== tierId) return;
            var elapsed = playbackContext.currentTime - playbackStartTime + playbackOffset;
            updateTimeDisplay(tierId, elapsed);
            drawPlayhead(tierId, elapsed);
            animFrameId = requestAnimationFrame(tick);
        }
        animFrameId = requestAnimationFrame(tick);
    }

    function updateTimeDisplay(tierId, seconds) {
        var s = Math.max(0, Math.floor(seconds));
        var mins = Math.floor(s / 60);
        var secs = s % 60;
        var timeStr = mins + ':' + (secs < 10 ? '0' : '') + secs;

        var el = document.getElementById('ctpTime-' + tierId);
        if (el) el.textContent = timeStr;

        // Also update customize panel time if playing premium
        if (tierId === 'premium') {
            var custTime = document.getElementById('ctpCustomizeTime');
            if (custTime) custTime.textContent = timeStr;
        }
    }

    function drawPlayhead(tierId, elapsed) {
        var buffer = previewBuffers[tierId];
        if (!buffer) return;
        var progress = Math.min(elapsed / buffer.duration, 1);

        // Draw on the main tier canvas
        var canvas = document.getElementById('ctpWaveform-' + tierId);
        if (canvas) {
            drawWaveform(tierId, buffer);
            drawPlayheadOnCanvas(canvas, progress, TIERS[tierId].glow);
        }

        // Also draw on customize panel canvas when playing premium
        if (tierId === 'premium') {
            var custCanvas = document.getElementById('ctpCustomizeWaveform');
            if (custCanvas) {
                drawWaveform('Customize', buffer);
                drawPlayheadOnCanvas(custCanvas, progress, 'rgba(255, 215, 0, 0.5)');
            }
        }
    }

    function drawPlayheadOnCanvas(canvas, progress, glowColor) {
        var dpr = window.devicePixelRatio || 1;
        var ctx = canvas.getContext('2d');
        var width = canvas.getBoundingClientRect().width;
        var height = canvas.getBoundingClientRect().height;
        var x = progress * width;

        ctx.fillStyle = glowColor;
        ctx.globalAlpha = 0.15;
        ctx.fillRect(0, 0, x * dpr, height * dpr);
        ctx.globalAlpha = 1.0;

        ctx.beginPath();
        ctx.moveTo(x * dpr, 0);
        ctx.lineTo(x * dpr, height * dpr);
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 1.5 * dpr;
        ctx.stroke();
    }

    // ═══════════════════════════════════════════════════════════════════════
    // PREMIUM EFFECT CUSTOMIZATION PANEL
    // ═══════════════════════════════════════════════════════════════════════

    var PREMIUM_EFFECT_META = [
        { key: 'exciter',       icon: '\u2728', name: 'Harmonic Exciter',  desc: 'Adds brightness, air, and presence to your highs' },
        { key: 'warmth',        icon: '\uD83D\uDD25', name: 'Analog Warmth',     desc: 'Rich, tape-style saturation for depth and body', hasSlider: true },
        { key: 'softClipper',   icon: '\uD83D\uDCC8', name: 'Soft Clipper',      desc: 'Smooths peaks for a polished, glued-together sound' },
        { key: 'stereoEnhance', icon: '\uD83C\uDFA7', name: 'Enhanced Stereo',   desc: 'Wider stereo image for an immersive listening experience' }
    ];

    function showPremiumCustomizePanel() {
        var tiersEl = document.getElementById('ctpTiers');
        if (!tiersEl) return;

        // Slide tier cards out
        tiersEl.classList.add('ctp-slide-out');

        // Update section title
        var sectionTitle = tiersEl.previousElementSibling;
        if (sectionTitle && sectionTitle.classList.contains('ctp-section-title')) {
            sectionTitle.style.display = 'none';
        }

        // Remove any existing customize panel
        var existing = document.getElementById('ctpCustomizePanel');
        if (existing) existing.parentNode.removeChild(existing);

        // Build panel
        var panel = document.createElement('div');
        panel.id = 'ctpCustomizePanel';
        panel.className = 'ctp-customize-panel';

        var effectCardsHTML = PREMIUM_EFFECT_META.map(function(fx) {
            var isOn = premiumEffects[fx.key];
            var sliderHTML = '';
            if (fx.hasSlider) {
                var satLvl = premiumEffects.saturationLevel;
                var disabledClass = isOn ? '' : ' disabled';
                sliderHTML =
                    '<div class="ctp-saturation-wrap' + disabledClass + '">' +
                        '<span class="ctp-saturation-title">Color</span>' +
                        '<button type="button" class="ctp-sat-btn' + (satLvl === 'low' ? ' active' : '') + '" data-sat="low" aria-label="Low saturation">Low</button>' +
                        '<button type="button" class="ctp-sat-btn' + (satLvl === 'balanced' ? ' active' : '') + '" data-sat="balanced" aria-label="Balanced saturation">Balanced</button>' +
                        '<button type="button" class="ctp-sat-btn' + (satLvl === 'high' ? ' active' : '') + '" data-sat="high" aria-label="High saturation">High</button>' +
                    '</div>';
            }
            return '<div class="ctp-effect-card ' + (isOn ? 'ctp-effect-on' : '') + '" data-effect="' + fx.key + '">' +
                '<div class="ctp-effect-card-top">' +
                    '<span class="ctp-effect-name"><span class="ctp-effect-icon">' + fx.icon + '</span> ' + escapeHTML(fx.name) + '</span>' +
                    '<label class="ctp-toggle">' +
                        '<input type="checkbox" ' + (isOn ? 'checked' : '') + ' data-fx="' + fx.key + '" aria-label="Toggle ' + escapeHTML(fx.name) + '">' +
                        '<span class="ctp-toggle-slider"></span>' +
                    '</label>' +
                '</div>' +
                '<div class="ctp-effect-desc">' + escapeHTML(fx.desc) + '</div>' +
                sliderHTML +
            '</div>';
        }).join('');

        panel.innerHTML =
            '<div class="ctp-customize-header">' +
                '<h3>Fine-Tune Your Premium Master</h3>' +
                '<p>Toggle effects on/off &mdash; your track, your choice</p>' +
            '</div>' +
            '<div class="ctp-effects-grid">' + effectCardsHTML + '</div>' +
            '<div class="ctp-customize-waveform-wrap">' +
                '<div class="ctp-player-top">' +
                    '<button class="ctp-play-btn" id="ctpCustomizePlayBtn" ' +
                        'style="background:#FFD700" aria-label="Play Premium preview" ' +
                        (renderingState.premium === 'ready' ? '' : 'disabled') + '>' +
                        '<span id="ctpCustomizePlayIcon">&#9654;</span>' +
                    '</button>' +
                    '<span class="ctp-player-status" id="ctpCustomizeStatus">' +
                        (renderingState.premium === 'ready' ? 'Preview ready' : 'Waiting...') +
                    '</span>' +
                    '<span class="ctp-player-time" id="ctpCustomizeTime">0:00</span>' +
                '</div>' +
                '<canvas class="ctp-waveform" id="ctpCustomizeWaveform" aria-label="Premium tier waveform preview"></canvas>' +
            '</div>' +
            '<div class="ctp-customize-actions">' +
                '<button class="ctp-preview-btn" id="ctpPreviewBtn">&#9654; Preview</button>' +
                '<button class="ctp-checkout-btn" id="ctpCheckoutBtn">Sounds Great &mdash; Checkout</button>' +
            '</div>' +
            '<button class="ctp-back-to-tiers" id="ctpBackToTiers">&larr; Back to Tiers</button>';

        tiersEl.parentNode.insertBefore(panel, tiersEl.nextSibling);

        // Draw existing waveform if available
        if (previewBuffers.premium) {
            drawWaveform('Customize', previewBuffers.premium);
        }

        // Wire toggle switches
        panel.querySelectorAll('input[type="checkbox"][data-fx]').forEach(function(input) {
            input.addEventListener('change', function() {
                var fxKey = this.getAttribute('data-fx');
                premiumEffects[fxKey] = this.checked;
                var card = this.closest('.ctp-effect-card');
                if (card) {
                    if (this.checked) card.classList.add('ctp-effect-on');
                    else card.classList.remove('ctp-effect-on');
                    // Enable/disable saturation slider when warmth is toggled
                    var satWrap = card.querySelector('.ctp-saturation-wrap');
                    if (satWrap) {
                        if (this.checked) satWrap.classList.remove('disabled');
                        else satWrap.classList.add('disabled');
                    }
                }
            });
        });

        // Wire saturation level buttons
        panel.querySelectorAll('.ctp-sat-btn').forEach(function(btn) {
            btn.addEventListener('click', function() {
                premiumEffects.saturationLevel = this.getAttribute('data-sat');
                // Update active state
                var wrap = this.parentNode;
                wrap.querySelectorAll('.ctp-sat-btn').forEach(function(b) { b.classList.remove('active'); });
                this.classList.add('active');
            });
        });

        // Wire play button in customize panel
        document.getElementById('ctpCustomizePlayBtn').addEventListener('click', function() {
            togglePlay('premium');
        });

        // Wire Preview button
        document.getElementById('ctpPreviewBtn').addEventListener('click', function() {
            previewWithCurrentSettings();
        });

        // Wire Checkout button
        document.getElementById('ctpCheckoutBtn').addEventListener('click', function() {
            checkoutFromCustomize();
        });

        // Wire Back to Tiers
        document.getElementById('ctpBackToTiers').addEventListener('click', function() {
            hidePremiumCustomizePanel();
        });
    }

    function hidePremiumCustomizePanel() {
        var tiersEl = document.getElementById('ctpTiers');
        var panel = document.getElementById('ctpCustomizePanel');

        if (tiersEl) {
            tiersEl.classList.remove('ctp-slide-out');
        }

        // Restore section title
        if (tiersEl) {
            var sectionTitle = tiersEl.previousElementSibling;
            if (sectionTitle && sectionTitle.classList.contains('ctp-section-title')) {
                sectionTitle.style.display = '';
            }
        }

        if (panel && panel.parentNode) {
            panel.parentNode.removeChild(panel);
        }
    }

    async function previewWithCurrentSettings() {
        if (!previewSegment) return;

        var previewBtn = document.getElementById('ctpPreviewBtn');
        var statusEl = document.getElementById('ctpCustomizeStatus');

        // Show spinner on button
        if (previewBtn) {
            previewBtn.disabled = true;
            previewBtn.innerHTML = '<span class="ctp-btn-spinner"></span> Rendering...';
        }
        if (statusEl) {
            statusEl.innerHTML = '<span class="ctp-spinner" style="display:inline-block;vertical-align:middle;margin-right:6px;--tier-color:#FFD700"></span> Re-rendering preview...';
        }

        // Stop any current playback
        stopPlayback();

        try {
            // Render premium with current effect toggles
            var rendered = await renderTierPreview(previewSegment, 'premium');

            // Normalize to same reference RMS
            var referenceRMS = null;
            if (previewBuffers.advanced) {
                referenceRMS = measureRMS(previewBuffers.advanced);
            } else if (previewBuffers.basic) {
                referenceRMS = measureRMS(previewBuffers.basic);
            }
            if (referenceRMS && referenceRMS > 0.0001) {
                normalizeBuffer(rendered, referenceRMS);
            }

            // Store and update
            previewBuffers.premium = rendered;
            renderingState.premium = 'ready';

            // Update waveform in customize panel
            drawWaveform('Customize', rendered);

            // Update the main tier card waveform too
            drawWaveform('premium', rendered);

            // Update customize panel UI
            if (statusEl) statusEl.textContent = 'Preview ready';
            var playBtn = document.getElementById('ctpCustomizePlayBtn');
            if (playBtn) playBtn.disabled = false;

            // Also update the main tier card player
            updatePlayerUI('premium');

            // Auto-play the new render
            startPlayback('premium');

        } catch (err) {
            console.error('Premium re-render failed:', err);
            if (statusEl) statusEl.textContent = 'Render failed';
        }

        // Reset preview button
        if (previewBtn) {
            previewBtn.disabled = false;
            previewBtn.innerHTML = '&#9654; Preview';
        }
    }

    function checkoutFromCustomize() {
        // Store effect choices globally for Stripe metadata
        window.premiumEffects = {
            exciter: premiumEffects.exciter,
            warmth: premiumEffects.warmth,
            softClipper: premiumEffects.softClipper,
            stereoEnhance: premiumEffects.stereoEnhance,
            saturationLevel: premiumEffects.saturationLevel
        };

        window.selectedTier = 'premium';

        // Stop playback
        stopPlayback();

        // Close modal
        closeModal();

        // Proceed to checkout
        if (typeof downloadMaster === 'function') {
            downloadMaster();
        } else if (typeof window.downloadMaster === 'function') {
            window.downloadMaster();
        } else {
            console.error('downloadMaster not available');
        }
    }

    // ═══════════════════════════════════════════════════════════════════════
    // TIER SELECTION → STRIPE CHECKOUT
    // ═══════════════════════════════════════════════════════════════════════

    function selectTier(tierId) {
        window.selectedTier = tierId;

        // Visual feedback
        document.querySelectorAll('.ctp-card').forEach(function(c) { c.classList.remove('selected'); });
        var card = document.getElementById('ctpCard-' + tierId);
        if (card) card.classList.add('selected');

        // Premium: show customization panel instead of going directly to checkout
        if (tierId === 'premium') {
            stopPlayback();
            showPremiumCustomizePanel();
            return;
        }

        // Basic & Advanced: proceed directly to checkout
        stopPlayback();
        closeModal();

        if (typeof downloadMaster === 'function') {
            downloadMaster();
        } else if (typeof window.downloadMaster === 'function') {
            window.downloadMaster();
        } else {
            console.error('downloadMaster not available');
        }
    }

    // ═══════════════════════════════════════════════════════════════════════
    // MODAL OPEN / CLOSE
    // ═══════════════════════════════════════════════════════════════════════

    function openModal() {
        if (isModalOpen) return;

        // Check for audio buffer
        var audioBuffer = window.audioBuffer;
        if (!audioBuffer) {
            console.error('Tier preview: No audioBuffer available');
            alert('No audio loaded. Please upload and master a track first.');
            return;
        }

        injectStyles();

        // Build modal if not present
        var overlay = document.getElementById('ctpOverlay');
        if (!overlay) {
            overlay = buildModal();
        }

        // Populate data
        populateSummary();
        populateTierCards();

        // Check if we can reuse cached preview buffers (same source audio)
        var canReuse = (_lastPreviewSourceBuffer === audioBuffer &&
            previewBuffers.basic && previewBuffers.advanced && previewBuffers.premium);

        if (!canReuse) {
            previewBuffers = {};
            renderingState = { basic: 'pending', advanced: 'pending', premium: 'pending' };
        } else {
            // Restore ready state and redraw waveforms for cached buffers
            Object.keys(TIERS).forEach(function(tierId) {
                renderingState[tierId] = 'ready';
                updatePlayerUI(tierId);
                drawWaveform(tierId, previewBuffers[tierId]);
            });
        }

        currentlyPlaying = null;
        playbackOffset = 0;

        // Reset premium effects to all-on for each new session
        premiumEffects = { exciter: true, warmth: true, softClipper: true, stereoEnhance: true };

        // Show modal
        isModalOpen = true;
        requestAnimationFrame(function() {
            overlay.classList.add('open');
        });

        // Chloe voice guidance — explain tier selection and audio previews
        if (typeof window.speakWithDucking === 'function' && !window.tourActive) {
            setTimeout(function() {
                window.speakWithDucking(
                    "Here's your tier preview. Each tier masters your track at a different quality level. " +
                    "Hit the play button on any card to hear a 15-second sample of how your master will sound. " +
                    "When you've found the one you like, tap Select to continue to checkout."
                );
            }, 600);
        }

        // Start rendering previews only if not cached
        if (!canReuse) {
            _lastPreviewSourceBuffer = audioBuffer;
            renderAllPreviews(audioBuffer);
        }
    }

    function closeModal() {
        if (!isModalOpen) return;

        stopPlayback();

        // Clean up customize panel if open
        hidePremiumCustomizePanel();

        var overlay = document.getElementById('ctpOverlay');
        if (overlay) {
            overlay.classList.remove('open');
            setTimeout(function() {
                if (overlay.parentNode) overlay.parentNode.removeChild(overlay);
            }, 350);
        }

        // Cleanup (keep previewBuffers cached for reuse)
        isModalOpen = false;
        _lastNarratedTier = null; // Reset so Chloe narrates again next time
        cancelAnimationFrame(animFrameId);

        if (playbackContext && playbackContext.state !== 'closed') {
            playbackContext.close().catch(function() {});
            playbackContext = null;
        }

        document.removeEventListener('keydown', handleEscape);
    }

    // ═══════════════════════════════════════════════════════════════════════
    // FLOW INTEGRATION — Override proceedToPayment
    // ═══════════════════════════════════════════════════════════════════════

    function installOverride() {
        // Save original proceedToPayment (set in HTML)
        var originalProceedToPayment = window.proceedToPayment;

        window.proceedToPayment = function() {
            if (!window.selectedExportFormat) {
                if (typeof showLuvLangToast === 'function') {
                    showLuvLangToast('Please select a format first');
                }
                return;
            }

            // Store selected format globally
            window.exportFormat = window.selectedExportFormat;

            // Close format overlay
            if (typeof closeExportFormatOverlay === 'function') {
                closeExportFormatOverlay();
            }

            // Always show tier preview modal so users can compare tiers
            openModal();
        };
    }

    // Install override after DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', installOverride);
    } else {
        installOverride();
    }

    // ═══════════════════════════════════════════════════════════════════════
    // UTILITY HELPERS
    // ═══════════════════════════════════════════════════════════════════════

    function escapeHTML(str) {
        var div = document.createElement('div');
        div.appendChild(document.createTextNode(str));
        return div.innerHTML;
    }

    function truncate(str, maxLen) {
        str = String(str);
        if (str.length <= maxLen) return str;
        return str.substring(0, maxLen - 1) + '\u2026';
    }

    function capitalize(str) {
        if (!str) return '';
        str = String(str);
        return str.charAt(0).toUpperCase() + str.slice(1);
    }

    function adjustColor(hex, amount) {
        // Darken/lighten a hex color
        hex = hex.replace('#', '');
        var num = parseInt(hex, 16);
        var r = Math.max(0, Math.min(255, (num >> 16) + amount));
        var g = Math.max(0, Math.min(255, ((num >> 8) & 0x00FF) + amount));
        var b = Math.max(0, Math.min(255, (num & 0x0000FF) + amount));
        return '#' + (0x1000000 + (r << 16) + (g << 8) + b).toString(16).slice(1);
    }

    // ═══════════════════════════════════════════════════════════════════════
    // PUBLIC API
    // ═══════════════════════════════════════════════════════════════════════

    window.ConfirmationTierPreview = {
        open: openModal,
        close: closeModal,
        isOpen: function() { return isModalOpen; }
    };

})();
