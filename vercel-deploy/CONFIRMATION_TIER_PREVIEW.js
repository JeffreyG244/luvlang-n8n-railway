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
                'AI loudness normalization (LUFS targeting)',
                'Platform presets (Spotify, Apple Music, YouTube)',
                '7-band parametric EQ',
                'Bus compression + brick-wall limiter',
                '24-bit / 16-bit WAV export',
                'Quality scorecard'
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
                'Everything in Basic, plus:',
                'Multiband compression (4-band)',
                'Mid/Side stereo processing',
                'Genre-optimized AI EQ curves',
                'Dynamic EQ (frequency-dependent)',
                'HF limiter + look-ahead limiter',
                'Multi-format export (WAV, MP3, FLAC)'
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
                'Everything in Advanced, plus:',
                'Harmonic exciter + analog warmth',
                'Soft clipper for glue',
                'Full 20-stage mastering chain',
                'AI persistent learning',
                'Downloadable mastering report',
                'Export all formats (WAV, MP3, FLAC, AIFF)'
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

            const featuresHTML = tier.features.map(function(f, i) {
                const isHeader = f.endsWith(':');
                return '<li class="' + (isHeader ? 'header-item' : '') + '" style="' +
                    (!isHeader ? 'color:' + tier.color : '') + '">' +
                    escapeHTML(f) + '</li>';
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
                // Soft clip at ±0.98 to prevent digital overs
                if (s > 0.98) s = 0.98 + 0.02 * Math.tanh((s - 0.98) / 0.02);
                else if (s < -0.98) s = -0.98 - 0.02 * Math.tanh((-s - 0.98) / 0.02);
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
        var subsonic = offline.createBiquadFilter();
        subsonic.type = 'highpass';
        subsonic.frequency.value = 25;
        subsonic.Q.value = 0.707;
        currentNode.connect(subsonic);
        currentNode = subsonic;

        // Get genre-aware EQ values
        var genreEQ = getGenreEQ();

        // ════════════════════════════════════════════════════════════════════
        // BASIC — "GOOD" — Clean & Competitive
        // Stages: Subsonic → Genre EQ (70%) → Gentle Glue Comp → Limiter
        // ════════════════════════════════════════════════════════════════════

        // ── Stage 2: Genre-aware parametric EQ ──
        // Basic: 70% intensity for clean tonal shaping
        // Advanced: 100% for full professional sculpting
        // Premium: 110% + air shelf boost for shimmer
        var eqIntensity = (tierId === 'basic') ? 0.70 :
                          (tierId === 'advanced') ? 1.0 : 1.10;

        var eqBands = [
            { freq: 40,    type: 'highshelf', key: 'sub',     Q: 0.707 },
            { freq: 120,   type: 'peaking',   key: 'bass',    Q: 1.2 },
            { freq: 400,   type: 'peaking',   key: 'lowmid',  Q: 1.4 },
            { freq: 1000,  type: 'peaking',   key: 'mid',     Q: 1.4 },
            { freq: 3200,  type: 'peaking',   key: 'highmid', Q: 1.4 },
            { freq: 8000,  type: 'peaking',   key: 'high',    Q: 1.4 },
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

        // Premium: extra air shelf for shimmer (+1.5 dB above 14kHz)
        if (tierId === 'premium') {
            var airShelf = offline.createBiquadFilter();
            airShelf.type = 'highshelf';
            airShelf.frequency.value = 14000;
            airShelf.gain.value = 1.5;
            airShelf.Q.value = 0.707;
            currentNode.connect(airShelf);
            currentNode = airShelf;
        }

        // ════════════════════════════════════════════════════════════════════
        // ADVANCED adds: Dynamic EQ → Better Compression → Multiband → Stereo
        // ════════════════════════════════════════════════════════════════════

        // ── Stage 3: Dynamic EQ — Advanced + Premium ──
        // Frequency-dependent compression catches problem resonances
        if (tierId === 'advanced' || tierId === 'premium') {
            currentNode = applyDynamicEQ(offline, currentNode, tierId);
        }

        // ── Stage 4: Bus compressor ──
        // Basic: gentle glue (high threshold, low ratio)
        // Advanced: tighter control (lower threshold, musical ratio)
        // Premium: precision bus compression
        var busComp = offline.createDynamicsCompressor();
        if (tierId === 'basic') {
            busComp.threshold.value = -14;
            busComp.knee.value = 12;
            busComp.ratio.value = 1.8;
            busComp.attack.value = 0.020;
            busComp.release.value = 0.200;
        } else if (tierId === 'advanced') {
            busComp.threshold.value = -16;
            busComp.knee.value = 8;
            busComp.ratio.value = 2.2;
            busComp.attack.value = 0.012;
            busComp.release.value = 0.150;
        } else {
            busComp.threshold.value = -17;
            busComp.knee.value = 6;
            busComp.ratio.value = 2.5;
            busComp.attack.value = 0.008;
            busComp.release.value = 0.120;
        }
        currentNode.connect(busComp);
        currentNode = busComp;

        // ── Stage 5: Multiband compression — Advanced + Premium ──
        if (tierId === 'advanced' || tierId === 'premium') {
            currentNode = applyMultibandCompression(offline, currentNode, tierId);
        }

        // ── Stage 6: Stereo widening — Advanced + Premium ──
        if ((tierId === 'advanced' || tierId === 'premium') && channels >= 2) {
            currentNode = applyStereoWidening(offline, currentNode, tierId);
        }

        // ════════════════════════════════════════════════════════════════════
        // PREMIUM adds: Harmonic Exciter → Analog Warmth → Soft Clipper
        // ════════════════════════════════════════════════════════════════════

        // ── Stage 7: Harmonic exciter — Premium only ──
        if (tierId === 'premium') {
            currentNode = applyHarmonicExciter(offline, currentNode);
        }

        // ── Stage 8: Analog warmth — Premium only ──
        if (tierId === 'premium') {
            currentNode = applyAnalogWarmth(offline, currentNode);
        }

        // ── Stage 9: Soft clipper — Premium only ──
        if (tierId === 'premium') {
            currentNode = applySoftClipper(offline, currentNode);
        }

        // ── Stage 10: Look-ahead limiter — Advanced + Premium ──
        // Catches peaks before the brickwall for cleaner limiting
        if (tierId === 'advanced' || tierId === 'premium') {
            var laLimiter = offline.createDynamicsCompressor();
            laLimiter.threshold.value = (tierId === 'premium') ? -2.5 : -3.0;
            laLimiter.knee.value = 0;
            laLimiter.ratio.value = 20;
            laLimiter.attack.value = 0.001;
            laLimiter.release.value = 0.050;
            currentNode.connect(laLimiter);
            currentNode = laLimiter;
        }

        // ── Stage 11: Brickwall limiter (all tiers) ──
        var brickwall = offline.createDynamicsCompressor();
        brickwall.threshold.value = -1.5;
        brickwall.knee.value = 0;
        brickwall.ratio.value = 20;
        brickwall.attack.value = 0.001;
        brickwall.release.value = 0.030;
        currentNode.connect(brickwall);
        currentNode = brickwall;

        // ── Stage 12: Master output gain ──
        var masterGain = offline.createGain();
        masterGain.gain.value = 1.0;
        currentNode.connect(masterGain);
        masterGain.connect(offline.destination);

        source.start(0);
        return offline.startRendering();
    }

    // ═══════════════════════════════════════════════════════════════════════
    // PROCESSING HELPERS — Tier-aware parameters
    // ═══════════════════════════════════════════════════════════════════════

    /**
     * applyDynamicEQ — 3-band frequency-dependent compression.
     * Advanced: moderate control. Premium: tighter, more surgical.
     */
    function applyDynamicEQ(ctx, input, tierId) {
        var isPremium = (tierId === 'premium');

        // Low band
        var lpf = ctx.createBiquadFilter();
        lpf.type = 'lowpass';
        lpf.frequency.value = 200;
        lpf.Q.value = 0.5;
        input.connect(lpf);
        var lowComp = ctx.createDynamicsCompressor();
        lowComp.threshold.value = isPremium ? -20 : -18;
        lowComp.ratio.value = isPremium ? 2.0 : 1.5;
        lowComp.attack.value = 0.020;
        lowComp.release.value = 0.150;
        lpf.connect(lowComp);

        // Mid band
        var bpf = ctx.createBiquadFilter();
        bpf.type = 'bandpass';
        bpf.frequency.value = 2000;
        bpf.Q.value = 0.5;
        input.connect(bpf);
        var midComp = ctx.createDynamicsCompressor();
        midComp.threshold.value = isPremium ? -18 : -16;
        midComp.ratio.value = isPremium ? 1.8 : 1.4;
        midComp.attack.value = 0.010;
        midComp.release.value = 0.100;
        bpf.connect(midComp);

        // High band
        var hpf = ctx.createBiquadFilter();
        hpf.type = 'highpass';
        hpf.frequency.value = 6000;
        hpf.Q.value = 0.5;
        input.connect(hpf);
        var hiComp = ctx.createDynamicsCompressor();
        hiComp.threshold.value = isPremium ? -16 : -14;
        hiComp.ratio.value = isPremium ? 2.0 : 1.5;
        hiComp.attack.value = 0.005;
        hiComp.release.value = 0.080;
        hpf.connect(hiComp);

        // Sum bands with compensated gain
        // 3 parallel bands each pass the full signal → sum is ~3x louder
        // Compensate to unity: 1/3 ≈ 0.33, but compressors reduce gain, so use ~0.45
        var merger = ctx.createGain();
        merger.gain.value = 0.45;
        lowComp.connect(merger);
        midComp.connect(merger);
        hiComp.connect(merger);

        // Dry/wet blend for transparency
        var dryGain = ctx.createGain();
        dryGain.gain.value = 0.35;
        input.connect(dryGain);

        var output = ctx.createGain();
        output.gain.value = 1.0;
        merger.connect(output);
        dryGain.connect(output);
        return output;
    }

    /**
     * applyMultibandCompression — 4-band dynamics control.
     * Advanced: gentle leveling. Premium: tighter per-band control.
     */
    function applyMultibandCompression(ctx, input, tierId) {
        var isPremium = (tierId === 'premium');
        var thresholdOffset = isPremium ? -2 : 0; // Premium compresses more

        var bands = [
            { type: 'lowpass',  freq: 200,  Q: 0.707,
              threshold: -18 + thresholdOffset, ratio: 2.0, attack: 0.020, release: 0.150 },
            { type: 'bandpass', freq: 600,  Q: 0.7,
              threshold: -16 + thresholdOffset, ratio: 1.8, attack: 0.012, release: 0.120 },
            { type: 'bandpass', freq: 3500, Q: 0.7,
              threshold: -15 + thresholdOffset, ratio: 1.8, attack: 0.008, release: 0.100 },
            { type: 'highpass', freq: 6000, Q: 0.707,
              threshold: -14 + thresholdOffset, ratio: 2.0, attack: 0.005, release: 0.080 }
        ];

        var bandOutputs = [];
        bands.forEach(function(b) {
            var filter = ctx.createBiquadFilter();
            filter.type = b.type;
            filter.frequency.value = b.freq;
            filter.Q.value = b.Q;
            input.connect(filter);

            var comp = ctx.createDynamicsCompressor();
            comp.threshold.value = b.threshold;
            comp.ratio.value = b.ratio;
            comp.attack.value = b.attack;
            comp.release.value = b.release;
            comp.knee.value = 6;
            filter.connect(comp);

            bandOutputs.push(comp);
        });

        // Sum bands — 4 parallel paths, compensate to avoid volume buildup
        var sum = ctx.createGain();
        sum.gain.value = 0.40; // 4 bands → ~0.25 each, but compressors reduce, so ~0.40
        bandOutputs.forEach(function(b) { b.connect(sum); });

        // Dry/wet blend for musicality
        var dryGain = ctx.createGain();
        dryGain.gain.value = 0.30;
        input.connect(dryGain);

        var output = ctx.createGain();
        output.gain.value = 1.0;
        sum.connect(output);
        dryGain.connect(output);
        return output;
    }

    /**
     * applyStereoWidening — cross-feed technique for wider image.
     * Advanced: subtle widening. Premium: more pronounced.
     */
    function applyStereoWidening(ctx, input, tierId) {
        var crossFeedAmount = (tierId === 'premium') ? -0.10 : -0.07;

        var splitter = ctx.createChannelSplitter(2);
        var merger = ctx.createChannelMerger(2);

        var leftGain = ctx.createGain();
        leftGain.gain.value = 1.0;
        var rightGain = ctx.createGain();
        rightGain.gain.value = 1.0;

        var crossL = ctx.createGain();
        crossL.gain.value = crossFeedAmount;
        var crossR = ctx.createGain();
        crossR.gain.value = crossFeedAmount;

        input.connect(splitter);

        splitter.connect(leftGain, 0);
        splitter.connect(rightGain, 1);
        splitter.connect(crossL, 1);
        splitter.connect(crossR, 0);

        var leftSum = ctx.createGain();
        leftSum.gain.value = 1.0;
        leftGain.connect(leftSum);
        crossL.connect(leftSum);

        var rightSum = ctx.createGain();
        rightSum.gain.value = 1.0;
        rightGain.connect(rightSum);
        crossR.connect(rightSum);

        leftSum.connect(merger, 0, 0);
        rightSum.connect(merger, 0, 1);

        return merger;
    }

    /**
     * applyHarmonicExciter — adds upper harmonics for presence and air.
     * Premium only. Parallel wet/dry blend preserves original clarity.
     */
    function applyHarmonicExciter(ctx, input) {
        var preGain = ctx.createGain();
        preGain.gain.value = 0.4;
        input.connect(preGain);

        var hfBoost = ctx.createBiquadFilter();
        hfBoost.type = 'highshelf';
        hfBoost.frequency.value = 3500;
        hfBoost.gain.value = 5;
        preGain.connect(hfBoost);

        var shaper = ctx.createWaveShaper();
        var curve = new Float32Array(2048);
        for (var i = 0; i < 2048; i++) {
            var x = (i / 2047) * 2 - 1;
            // Gentle saturation — musical even harmonics
            curve[i] = Math.tanh(x * 1.8);
        }
        shaper.curve = curve;
        shaper.oversample = '4x';
        hfBoost.connect(shaper);

        var wetGain = ctx.createGain();
        wetGain.gain.value = 0.12; // subtle harmonic blend
        shaper.connect(wetGain);

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
     * Premium only. Gentle tanh curve with 4x oversampling.
     */
    function applyAnalogWarmth(ctx, input) {
        // Dry/wet parallel processing for control
        var shaper = ctx.createWaveShaper();
        var curve = new Float32Array(2048);
        for (var i = 0; i < 2048; i++) {
            var x = (i / 2047) * 2 - 1;
            // Gentle tape saturation — preserves ~95% of level at peak
            curve[i] = Math.tanh(x * 1.3);
        }
        shaper.curve = curve;
        shaper.oversample = '4x';

        var wetGain = ctx.createGain();
        wetGain.gain.value = 0.60;
        input.connect(shaper);
        shaper.connect(wetGain);

        var dryGain = ctx.createGain();
        dryGain.gain.value = 0.45;
        input.connect(dryGain);

        var output = ctx.createGain();
        output.gain.value = 1.0;
        wetGain.connect(output);
        dryGain.connect(output);

        return output;
    }

    /**
     * applySoftClipper — gentle soft clip for analog glue.
     * Premium only. Catches peaks that escape the limiter chain.
     */
    function applySoftClipper(ctx, input) {
        var shaper = ctx.createWaveShaper();
        var curve = new Float32Array(2048);
        var ceiling = 0.944; // ~-0.5 dB
        for (var i = 0; i < 2048; i++) {
            var x = (i / 2047) * 2 - 1;
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
        const tier = TIERS[tierId];

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

    function togglePlay(tierId) {
        if (renderingState[tierId] !== 'ready') return;

        // If this tier is already playing, stop it
        if (currentlyPlaying === tierId) {
            stopPlayback();
            return;
        }

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
        var el = document.getElementById('ctpTime-' + tierId);
        if (!el) return;
        var s = Math.max(0, Math.floor(seconds));
        var mins = Math.floor(s / 60);
        var secs = s % 60;
        el.textContent = mins + ':' + (secs < 10 ? '0' : '') + secs;
    }

    function drawPlayhead(tierId, elapsed) {
        var canvas = document.getElementById('ctpWaveform-' + tierId);
        if (!canvas || !previewBuffers[tierId]) return;

        var buffer = previewBuffers[tierId];
        var progress = Math.min(elapsed / buffer.duration, 1);

        // Redraw waveform then overlay playhead
        drawWaveform(tierId, buffer);

        var dpr = window.devicePixelRatio || 1;
        var ctx = canvas.getContext('2d');
        var width = canvas.getBoundingClientRect().width;
        var height = canvas.getBoundingClientRect().height;
        var x = progress * width;

        // Played region tint
        ctx.fillStyle = TIERS[tierId].glow;
        ctx.globalAlpha = 0.15;
        ctx.fillRect(0, 0, x * dpr, height * dpr);
        ctx.globalAlpha = 1.0;

        // Playhead line
        ctx.beginPath();
        ctx.moveTo(x * dpr, 0);
        ctx.lineTo(x * dpr, height * dpr);
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 1.5 * dpr;
        ctx.stroke();
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

        // Stop any playback
        stopPlayback();

        // Close modal
        closeModal();

        // Always proceed to Stripe checkout — no free downloads
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

        var overlay = document.getElementById('ctpOverlay');
        if (overlay) {
            overlay.classList.remove('open');
            setTimeout(function() {
                if (overlay.parentNode) overlay.parentNode.removeChild(overlay);
            }, 350);
        }

        // Cleanup (keep previewBuffers cached for reuse)
        isModalOpen = false;
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
