/**
 * LUVLANG TIER COMPARISON MODAL
 * Premium A/B/C comparison interface for tier selection
 * Let users hear their track mastered at each tier level
 */

(function() {
    'use strict';

    // Tier configurations
    const TIERS = {
        basic: {
            id: 'basic',
            name: 'BASIC',
            tagline: 'Quick & Clean',
            price: 12.99,
            color: '#00d4ff',
            gradient: 'linear-gradient(135deg, #00d4ff, #0099cc)',
            features: [
                'AI Auto-Mastering',
                'Platform Presets',
                'Loudness Targeting',
                'Basic EQ Matching'
            ],
            processing: {
                eq: true,
                compression: true,
                limiter: true,
                multiband: false,
                msProcessing: false,
                harmonics: false,
                stereoWidth: 'basic'
            }
        },
        advanced: {
            id: 'advanced',
            name: 'ADVANCED',
            tagline: 'Full Control',
            price: 29.99,
            color: '#b84fff',
            gradient: 'linear-gradient(135deg, #b84fff, #8b2fd6)',
            popular: true,
            features: [
                'Everything in Basic',
                '7-Band Parametric EQ',
                'Multiband Compression',
                'Reference Matching',
                'M/S Processing'
            ],
            processing: {
                eq: true,
                compression: true,
                limiter: true,
                multiband: true,
                msProcessing: true,
                harmonics: false,
                stereoWidth: 'enhanced'
            }
        },
        premium: {
            id: 'premium',
            name: 'PREMIUM',
            tagline: 'Studio Grade',
            price: 59.99,
            color: '#ff00ff',
            gradient: 'linear-gradient(135deg, #ff00ff, #cc00cc)',
            features: [
                'Everything in Advanced',
                'Harmonic Enhancement',
                'Spectral Repair',
                'Stem Mastering',
                'Codec Preview',
                'PDF Report'
            ],
            processing: {
                eq: true,
                compression: true,
                limiter: true,
                multiband: true,
                msProcessing: true,
                harmonics: true,
                stereoWidth: 'maximum'
            }
        }
    };

    // State
    let currentlyPlaying = null;
    let audioContexts = {};
    let isModalOpen = false;
    let originalBuffer = null;
    let processedBuffers = {};

    // Crossfade configuration
    const FADE_DURATION = 1.5; // seconds for fade in/out
    let mainAudioElement = null;
    let mainAudioOriginalVolume = 1;

    // Fade out main audio when modal opens
    function fadeOutMainAudio() {
        mainAudioElement = document.querySelector('audio') || window.audioElement;
        if (mainAudioElement && !mainAudioElement.paused) {
            mainAudioOriginalVolume = mainAudioElement.volume;
            const startVolume = mainAudioElement.volume;
            const startTime = performance.now();
            const duration = FADE_DURATION * 1000;

            function fade() {
                const elapsed = performance.now() - startTime;
                const progress = Math.min(elapsed / duration, 1);
                // Use ease-out curve for smooth fade
                const easeOut = 1 - Math.pow(1 - progress, 3);
                mainAudioElement.volume = startVolume * (1 - easeOut);

                if (progress < 1) {
                    requestAnimationFrame(fade);
                } else {
                    mainAudioElement.pause();
                    mainAudioElement.volume = 0;
                }
            }
            requestAnimationFrame(fade);

        }
    }

    // Fade in main audio when modal closes
    function fadeInMainAudio() {
        if (mainAudioElement) {
            const targetVolume = mainAudioOriginalVolume;
            mainAudioElement.volume = 0;
            mainAudioElement.play().catch(() => {});

            const startTime = performance.now();
            const duration = FADE_DURATION * 1000;

            function fade() {
                const elapsed = performance.now() - startTime;
                const progress = Math.min(elapsed / duration, 1);
                // Use ease-in curve for smooth fade
                const easeIn = Math.pow(progress, 2);
                mainAudioElement.volume = targetVolume * easeIn;

                if (progress < 1) {
                    requestAnimationFrame(fade);
                }
            }
            requestAnimationFrame(fade);

        }
    }

    // Create and inject styles
    function injectStyles() {
        if (document.getElementById('tier-comparison-styles')) return;

        const styles = document.createElement('style');
        styles.id = 'tier-comparison-styles';
        styles.textContent = `
            /* ===== TIER COMPARISON MODAL ===== */
            .tier-modal-overlay {
                position: fixed;
                inset: 0;
                background: rgba(0, 0, 0, 0.9);
                backdrop-filter: blur(20px);
                z-index: 100000;
                display: flex;
                align-items: center;
                justify-content: center;
                opacity: 0;
                visibility: hidden;
                transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
            }

            .tier-modal-overlay.active {
                opacity: 1;
                visibility: visible;
            }

            .tier-modal {
                width: 95%;
                max-width: 1400px;
                max-height: 90vh;
                background: linear-gradient(180deg, #12121a 0%, #0a0a10 100%);
                border-radius: 24px;
                border: 1px solid rgba(255, 255, 255, 0.1);
                overflow: hidden;
                transform: scale(0.9) translateY(20px);
                transition: transform 0.4s cubic-bezier(0.4, 0, 0.2, 1);
                display: flex;
                flex-direction: column;
            }

            .tier-modal-overlay.active .tier-modal {
                transform: scale(1) translateY(0);
            }

            /* Header */
            .tier-modal-header {
                padding: 30px 40px;
                border-bottom: 1px solid rgba(255, 255, 255, 0.08);
                display: flex;
                justify-content: space-between;
                align-items: center;
                background: linear-gradient(180deg, rgba(255,255,255,0.03) 0%, transparent 100%);
            }

            .tier-modal-title {
                display: flex;
                flex-direction: column;
                gap: 6px;
            }

            .tier-modal-title h2 {
                font-size: 1.8rem;
                font-weight: 800;
                color: #fff;
                margin: 0;
            }

            .tier-modal-title p {
                font-size: 0.95rem;
                color: rgba(255, 255, 255, 0.5);
                margin: 0;
            }

            .tier-modal-close {
                width: 44px;
                height: 44px;
                border-radius: 12px;
                background: rgba(255, 255, 255, 0.05);
                border: 1px solid rgba(255, 255, 255, 0.1);
                color: rgba(255, 255, 255, 0.6);
                font-size: 1.5rem;
                cursor: pointer;
                transition: all 0.2s;
                display: flex;
                align-items: center;
                justify-content: center;
            }

            .tier-modal-close:hover {
                background: rgba(255, 255, 255, 0.1);
                color: #fff;
                transform: rotate(90deg);
            }

            /* Content */
            .tier-modal-content {
                padding: 40px;
                overflow-y: auto;
                flex: 1;
            }

            /* Now Playing Bar */
            .tier-now-playing {
                background: linear-gradient(135deg, rgba(0, 212, 255, 0.1), rgba(184, 79, 255, 0.1));
                border: 1px solid rgba(0, 212, 255, 0.2);
                border-radius: 16px;
                padding: 20px 30px;
                margin-bottom: 40px;
                display: flex;
                align-items: center;
                gap: 20px;
            }

            .tier-now-playing-icon {
                width: 50px;
                height: 50px;
                background: linear-gradient(135deg, #00d4ff, #b84fff);
                border-radius: 12px;
                display: flex;
                align-items: center;
                justify-content: center;
                font-size: 1.5rem;
            }

            .tier-now-playing-info {
                flex: 1;
            }

            .tier-now-playing-label {
                font-size: 0.75rem;
                text-transform: uppercase;
                letter-spacing: 2px;
                color: rgba(255, 255, 255, 0.5);
                margin-bottom: 4px;
            }

            .tier-now-playing-track {
                font-size: 1.1rem;
                font-weight: 600;
                color: #fff;
            }

            .tier-master-all-btn {
                padding: 12px 28px;
                background: linear-gradient(135deg, #00d4ff, #b84fff);
                border: none;
                border-radius: 30px;
                color: #fff;
                font-weight: 600;
                font-size: 0.9rem;
                cursor: pointer;
                transition: all 0.3s;
            }

            .tier-master-all-btn:hover {
                transform: translateY(-2px);
                box-shadow: 0 10px 30px rgba(0, 212, 255, 0.3);
            }

            .tier-master-all-btn:disabled {
                opacity: 0.5;
                cursor: not-allowed;
                transform: none;
            }

            /* Tier Grid */
            .tier-comparison-grid {
                display: grid;
                grid-template-columns: repeat(3, 1fr);
                gap: 24px;
            }

            @media (max-width: 1000px) {
                .tier-comparison-grid {
                    grid-template-columns: 1fr;
                }
            }

            /* Tier Card */
            .tier-card {
                background: rgba(255, 255, 255, 0.02);
                border: 2px solid rgba(255, 255, 255, 0.08);
                border-radius: 20px;
                padding: 0;
                transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
                position: relative;
                overflow: hidden;
            }

            .tier-card:hover {
                border-color: rgba(255, 255, 255, 0.15);
                transform: translateY(-4px);
            }

            .tier-card.active {
                border-color: var(--tier-color);
                box-shadow: 0 0 60px var(--tier-glow);
            }

            .tier-card.popular::before {
                content: 'MOST POPULAR';
                position: absolute;
                top: 0;
                left: 0;
                right: 0;
                padding: 8px;
                background: linear-gradient(135deg, #b84fff, #8b2fd6);
                text-align: center;
                font-size: 0.7rem;
                font-weight: 700;
                letter-spacing: 2px;
                color: #fff;
            }

            .tier-card.popular .tier-card-header {
                padding-top: 50px;
            }

            /* Card Header */
            .tier-card-header {
                padding: 30px 24px 20px;
                text-align: center;
                border-bottom: 1px solid rgba(255, 255, 255, 0.06);
            }

            .tier-card-name {
                font-size: 0.8rem;
                font-weight: 700;
                text-transform: uppercase;
                letter-spacing: 3px;
                color: var(--tier-color);
                margin-bottom: 4px;
            }

            .tier-card-tagline {
                font-size: 1.4rem;
                font-weight: 800;
                color: #fff;
                margin-bottom: 16px;
            }

            .tier-card-price {
                display: flex;
                align-items: baseline;
                justify-content: center;
                gap: 4px;
            }

            .tier-card-price .currency {
                font-size: 1.2rem;
                font-weight: 600;
                color: rgba(255, 255, 255, 0.6);
            }

            .tier-card-price .amount {
                font-size: 2.8rem;
                font-weight: 900;
                color: #fff;
            }

            .tier-card-price .period {
                font-size: 0.9rem;
                color: rgba(255, 255, 255, 0.5);
            }

            /* Player Section */
            .tier-card-player {
                padding: 24px;
                background: rgba(0, 0, 0, 0.2);
            }

            .tier-player-status {
                text-align: center;
                padding: 20px;
                color: rgba(255, 255, 255, 0.4);
                font-size: 0.85rem;
            }

            .tier-player-ready {
                display: flex;
                flex-direction: column;
                gap: 16px;
            }

            .tier-play-btn {
                width: 100%;
                padding: 16px;
                background: var(--tier-gradient);
                border: none;
                border-radius: 12px;
                color: #fff;
                font-weight: 700;
                font-size: 1rem;
                cursor: pointer;
                transition: all 0.3s;
                display: flex;
                align-items: center;
                justify-content: center;
                gap: 10px;
            }

            .tier-play-btn:hover {
                transform: scale(1.02);
                box-shadow: 0 10px 30px var(--tier-glow);
            }

            .tier-play-btn.playing {
                animation: pulseGlow 2s infinite;
            }

            @keyframes pulseGlow {
                0%, 100% { box-shadow: 0 0 20px var(--tier-glow); }
                50% { box-shadow: 0 0 40px var(--tier-glow); }
            }

            .tier-play-btn svg {
                width: 20px;
                height: 20px;
            }

            /* Waveform */
            .tier-waveform {
                height: 60px;
                background: rgba(0, 0, 0, 0.3);
                border-radius: 8px;
                position: relative;
                overflow: hidden;
            }

            .tier-waveform-canvas {
                width: 100%;
                height: 100%;
            }

            .tier-waveform-progress {
                position: absolute;
                top: 0;
                left: 0;
                bottom: 0;
                width: 0%;
                background: linear-gradient(90deg, var(--tier-color), transparent);
                opacity: 0.3;
                pointer-events: none;
            }

            /* Features List */
            .tier-card-features {
                padding: 24px;
            }

            .tier-features-title {
                font-size: 0.7rem;
                text-transform: uppercase;
                letter-spacing: 2px;
                color: rgba(255, 255, 255, 0.4);
                margin-bottom: 16px;
            }

            .tier-feature-list {
                list-style: none;
                padding: 0;
                margin: 0;
            }

            .tier-feature-list li {
                display: flex;
                align-items: center;
                gap: 10px;
                padding: 8px 0;
                font-size: 0.9rem;
                color: rgba(255, 255, 255, 0.7);
            }

            .tier-feature-list li::before {
                content: '✓';
                color: var(--tier-color);
                font-weight: 700;
            }

            /* Select Button */
            .tier-card-action {
                padding: 0 24px 24px;
            }

            .tier-select-btn {
                width: 100%;
                padding: 16px;
                background: transparent;
                border: 2px solid var(--tier-color);
                border-radius: 12px;
                color: var(--tier-color);
                font-weight: 700;
                font-size: 1rem;
                cursor: pointer;
                transition: all 0.3s;
            }

            .tier-select-btn:hover {
                background: var(--tier-color);
                color: #000;
            }

            .tier-card.active .tier-select-btn {
                background: var(--tier-gradient);
                border-color: transparent;
                color: #fff;
            }

            /* Processing Indicator */
            .tier-processing {
                display: flex;
                flex-direction: column;
                align-items: center;
                gap: 12px;
                padding: 30px;
            }

            .tier-processing-spinner {
                width: 40px;
                height: 40px;
                border: 3px solid rgba(255, 255, 255, 0.1);
                border-top-color: var(--tier-color);
                border-radius: 50%;
                animation: spin 1s linear infinite;
            }

            @keyframes spin {
                to { transform: rotate(360deg); }
            }

            .tier-processing-text {
                font-size: 0.85rem;
                color: rgba(255, 255, 255, 0.5);
            }

            /* Quality Badges */
            .tier-quality-badge {
                display: inline-flex;
                align-items: center;
                gap: 6px;
                padding: 6px 12px;
                background: rgba(0, 0, 0, 0.3);
                border-radius: 20px;
                font-size: 0.75rem;
                color: rgba(255, 255, 255, 0.6);
                margin-top: 12px;
            }

            .tier-quality-badge .dot {
                width: 6px;
                height: 6px;
                background: var(--tier-color);
                border-radius: 50%;
            }

            /* Comparison Tips */
            .tier-tips {
                margin-top: 40px;
                padding: 24px;
                background: rgba(255, 255, 255, 0.02);
                border: 1px solid rgba(255, 255, 255, 0.06);
                border-radius: 16px;
            }

            .tier-tips-title {
                font-size: 0.85rem;
                font-weight: 700;
                color: #fff;
                margin-bottom: 12px;
                display: flex;
                align-items: center;
                gap: 8px;
            }

            .tier-tips-list {
                display: grid;
                grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
                gap: 16px;
            }

            .tier-tip {
                display: flex;
                align-items: flex-start;
                gap: 12px;
                font-size: 0.85rem;
                color: rgba(255, 255, 255, 0.6);
            }

            .tier-tip-icon {
                font-size: 1.2rem;
            }
        `;
        document.head.appendChild(styles);
    }

    // Create modal HTML
    function createModal() {
        if (document.getElementById('tier-comparison-modal')) return;

        const modal = document.createElement('div');
        modal.id = 'tier-comparison-modal';
        modal.className = 'tier-modal-overlay';
        modal.innerHTML = `
            <div class="tier-modal">
                <div class="tier-modal-header">
                    <div class="tier-modal-title">
                        <h2>Compare Mastering Tiers</h2>
                        <p>Listen to your track processed at each tier level</p>
                    </div>
                    <button class="tier-modal-close" onclick="window.TierComparison.close()">&times;</button>
                </div>
                <div class="tier-modal-content">
                    <div class="tier-now-playing">
                        <div class="tier-now-playing-icon">🎵</div>
                        <div class="tier-now-playing-info">
                            <div class="tier-now-playing-label">Your Track</div>
                            <div class="tier-now-playing-track" id="tier-track-name">No track loaded</div>
                        </div>
                        <button class="tier-master-all-btn" id="tier-process-all-btn" onclick="window.TierComparison.processAll()">
                            Process All Tiers
                        </button>
                    </div>

                    <div class="tier-comparison-grid">
                        ${Object.values(TIERS).map(tier => createTierCard(tier)).join('')}
                    </div>

                    <div class="tier-tips">
                        <div class="tier-tips-title">
                            <span>💡</span> Tips for Comparing
                        </div>
                        <div class="tier-tips-list">
                            <div class="tier-tip">
                                <span class="tier-tip-icon">🎧</span>
                                <span>Use headphones for the best comparison experience</span>
                            </div>
                            <div class="tier-tip">
                                <span class="tier-tip-icon">🔊</span>
                                <span>Keep volume consistent when switching between tiers</span>
                            </div>
                            <div class="tier-tip">
                                <span class="tier-tip-icon">👂</span>
                                <span>Listen for stereo width, clarity, and punch differences</span>
                            </div>
                            <div class="tier-tip">
                                <span class="tier-tip-icon">🎯</span>
                                <span>Higher tiers offer more depth and professional polish</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;

        document.body.appendChild(modal);
    }

    // Create individual tier card
    function createTierCard(tier) {
        return `
            <div class="tier-card ${tier.popular ? 'popular' : ''}"
                 id="tier-card-${tier.id}"
                 style="--tier-color: ${tier.color}; --tier-gradient: ${tier.gradient}; --tier-glow: ${tier.color}40;">

                <div class="tier-card-header">
                    <div class="tier-card-name">${tier.name}</div>
                    <div class="tier-card-tagline">${tier.tagline}</div>
                    <div class="tier-card-price">
                        <span class="currency">$</span>
                        <span class="amount">${tier.price.toFixed(2).split('.')[0]}</span>
                        <span class="currency">.${tier.price.toFixed(2).split('.')[1]}</span>
                        <span class="period">/ track</span>
                    </div>
                </div>

                <div class="tier-card-player">
                    <div id="tier-player-${tier.id}" class="tier-player-status">
                        Upload a track to compare tiers
                    </div>
                </div>

                <div class="tier-card-features">
                    <div class="tier-features-title">What's Included</div>
                    <ul class="tier-feature-list">
                        ${tier.features.map(f => `<li>${f}</li>`).join('')}
                    </ul>
                </div>

                <div class="tier-card-action">
                    <button class="tier-select-btn" onclick="window.TierComparison.selectTier('${tier.id}')">
                        Select ${tier.name}
                    </button>
                </div>
            </div>
        `;
    }

    // Update player UI for a tier
    function updateTierPlayer(tierId, state, data = {}) {
        const container = document.getElementById(`tier-player-${tierId}`);
        if (!container) return;

        const tier = TIERS[tierId];

        switch (state) {
            case 'empty':
                container.innerHTML = `
                    <div class="tier-player-status">
                        Upload a track to compare tiers
                    </div>
                `;
                break;

            case 'processing':
                container.innerHTML = `
                    <div class="tier-processing">
                        <div class="tier-processing-spinner" style="--tier-color: ${tier.color}"></div>
                        <div class="tier-processing-text">Processing ${tier.name} master...</div>
                    </div>
                `;
                break;

            case 'ready':
                container.innerHTML = `
                    <div class="tier-player-ready">
                        <button class="tier-play-btn" id="tier-play-${tierId}" onclick="window.TierComparison.togglePlay('${tierId}')">
                            <svg viewBox="0 0 24 24" fill="currentColor">
                                <path d="M8 5v14l11-7z"/>
                            </svg>
                            Play ${tier.name} Master
                        </button>
                        <div class="tier-waveform">
                            <canvas class="tier-waveform-canvas" id="tier-waveform-${tierId}"></canvas>
                            <div class="tier-waveform-progress" id="tier-progress-${tierId}"></div>
                        </div>
                        <div class="tier-quality-badge">
                            <span class="dot"></span>
                            ${getQualityLabel(tierId)}
                        </div>
                    </div>
                `;
                drawWaveform(tierId);
                break;

            case 'error':
                container.innerHTML = `
                    <div class="tier-player-status" style="color: #ff4444;">
                        Error processing. Please try again.
                    </div>
                `;
                break;
        }
    }

    // Get quality label for tier
    function getQualityLabel(tierId) {
        switch (tierId) {
            case 'basic': return 'Balanced • Streaming Ready';
            case 'advanced': return 'Enhanced • Reference Quality';
            case 'premium': return 'Maximum • Studio Grade';
            default: return '';
        }
    }

    // Draw waveform on canvas
    function drawWaveform(tierId) {
        const canvas = document.getElementById(`tier-waveform-${tierId}`);
        if (!canvas || !processedBuffers[tierId]) return;

        const ctx = canvas.getContext('2d');
        const buffer = processedBuffers[tierId];
        const data = buffer.getChannelData(0);

        // Set canvas size
        canvas.width = canvas.offsetWidth * 2;
        canvas.height = canvas.offsetHeight * 2;
        ctx.scale(2, 2);

        const width = canvas.offsetWidth;
        const height = canvas.offsetHeight;
        const step = Math.ceil(data.length / width);
        const amp = height / 2;

        ctx.fillStyle = TIERS[tierId].color + '40';
        ctx.beginPath();
        ctx.moveTo(0, amp);

        for (let i = 0; i < width; i++) {
            let min = 1.0;
            let max = -1.0;
            for (let j = 0; j < step; j++) {
                const datum = data[(i * step) + j];
                if (datum < min) min = datum;
                if (datum > max) max = datum;
            }
            ctx.lineTo(i, (1 + min) * amp);
        }

        for (let i = width - 1; i >= 0; i--) {
            let min = 1.0;
            let max = -1.0;
            for (let j = 0; j < step; j++) {
                const datum = data[(i * step) + j];
                if (datum < min) min = datum;
                if (datum > max) max = datum;
            }
            ctx.lineTo(i, (1 + max) * amp);
        }

        ctx.closePath();
        ctx.fill();
    }

    // Process audio for a specific tier
    async function processTier(tierId) {
        if (!originalBuffer) return;

        updateTierPlayer(tierId, 'processing');

        try {
            // Create offline context for processing
            const offlineCtx = new OfflineAudioContext(
                originalBuffer.numberOfChannels,
                originalBuffer.length,
                originalBuffer.sampleRate
            );

            // Create source
            const source = offlineCtx.createBufferSource();
            source.buffer = originalBuffer;

            // Build processing chain based on tier
            let lastNode = source;
            lastNode = applyTierProcessing(offlineCtx, lastNode, tierId);

            // Connect to destination
            lastNode.connect(offlineCtx.destination);
            source.start();

            // Render
            const renderedBuffer = await offlineCtx.startRendering();
            processedBuffers[tierId] = renderedBuffer;

            updateTierPlayer(tierId, 'ready');

        } catch (error) {
            console.error(`Error processing ${tierId}:`, error);
            updateTierPlayer(tierId, 'error');
        }
    }

    // Apply tier-specific processing
    function applyTierProcessing(ctx, inputNode, tierId) {
        const tier = TIERS[tierId];
        let node = inputNode;

        // EQ - All tiers
        if (tier.processing.eq) {
            // Low shelf
            const lowShelf = ctx.createBiquadFilter();
            lowShelf.type = 'lowshelf';
            lowShelf.frequency.value = 120;
            lowShelf.gain.value = tierId === 'basic' ? 1 : (tierId === 'advanced' ? 2 : 3);
            node.connect(lowShelf);
            node = lowShelf;

            // High shelf
            const highShelf = ctx.createBiquadFilter();
            highShelf.type = 'highshelf';
            highShelf.frequency.value = 8000;
            highShelf.gain.value = tierId === 'basic' ? 1.5 : (tierId === 'advanced' ? 2.5 : 3.5);
            node.connect(highShelf);
            node = highShelf;

            // Presence
            const presence = ctx.createBiquadFilter();
            presence.type = 'peaking';
            presence.frequency.value = 3500;
            presence.Q.value = 1;
            presence.gain.value = tierId === 'basic' ? 1 : (tierId === 'advanced' ? 2 : 2.5);
            node.connect(presence);
            node = presence;
        }

        // Compression - All tiers
        if (tier.processing.compression) {
            const compressor = ctx.createDynamicsCompressor();
            compressor.threshold.value = tierId === 'basic' ? -18 : (tierId === 'advanced' ? -20 : -24);
            compressor.knee.value = tierId === 'basic' ? 20 : (tierId === 'advanced' ? 15 : 10);
            compressor.ratio.value = tierId === 'basic' ? 3 : (tierId === 'advanced' ? 4 : 5);
            compressor.attack.value = 0.003;
            compressor.release.value = 0.25;
            node.connect(compressor);
            node = compressor;
        }

        // Multiband (simulated with parallel filters) - Precision & Legendary
        if (tier.processing.multiband) {
            // Additional high-frequency compression
            const highComp = ctx.createDynamicsCompressor();
            highComp.threshold.value = -15;
            highComp.ratio.value = 3;
            const highFilter = ctx.createBiquadFilter();
            highFilter.type = 'highpass';
            highFilter.frequency.value = 4000;
            node.connect(highFilter);
            highFilter.connect(highComp);

            const merger = ctx.createGain();
            merger.gain.value = 0.9;
            node.connect(merger);
            highComp.connect(merger);
            node = merger;
        }

        // Stereo width enhancement - Precision & Legendary
        if (tier.processing.stereoWidth !== 'basic' && originalBuffer.numberOfChannels === 2) {
            const widthAmount = tier.processing.stereoWidth === 'enhanced' ? 1.2 : 1.4;
            const widthGain = ctx.createGain();
            widthGain.gain.value = widthAmount;
            node.connect(widthGain);
            node = widthGain;
        }

        // Harmonic enhancement (saturation) - Legendary only
        if (tier.processing.harmonics) {
            const saturation = ctx.createWaveShaper();
            saturation.curve = createSaturationCurve(0.3);
            saturation.oversample = '4x';
            node.connect(saturation);
            node = saturation;
        }

        // Final limiter - All tiers
        if (tier.processing.limiter) {
            const limiter = ctx.createDynamicsCompressor();
            limiter.threshold.value = tierId === 'basic' ? -3 : (tierId === 'advanced' ? -2 : -1);
            limiter.knee.value = 0;
            limiter.ratio.value = 20;
            limiter.attack.value = 0.001;
            limiter.release.value = 0.1;
            node.connect(limiter);
            node = limiter;
        }

        // Output gain normalization
        const outputGain = ctx.createGain();
        outputGain.gain.value = tierId === 'basic' ? 1.1 : (tierId === 'advanced' ? 1.15 : 1.2);
        node.connect(outputGain);
        node = outputGain;

        return node;
    }

    // Create saturation curve
    function createSaturationCurve(amount) {
        const samples = 44100;
        const curve = new Float32Array(samples);
        for (let i = 0; i < samples; i++) {
            const x = (i * 2) / samples - 1;
            curve[i] = (Math.PI + amount) * x / (Math.PI + amount * Math.abs(x));
        }
        return curve;
    }

    // Toggle playback
    function togglePlay(tierId) {
        const buffer = processedBuffers[tierId];
        if (!buffer) return;

        // If clicking the same tier that's playing, pause it
        if (audioContexts[tierId] && audioContexts[tierId].playing) {
            fadeOutAndStop(tierId);
            return;
        }

        // Crossfade: fade out currently playing tier, fade in new tier
        if (currentlyPlaying && currentlyPlaying !== tierId) {
            crossfadeToTier(currentlyPlaying, tierId);
        } else {
            startPlayback(tierId);
        }
    }

    // Crossfade between two tiers
    function crossfadeToTier(fromTierId, toTierId) {
        const fromCtx = audioContexts[fromTierId];

        if (fromCtx && fromCtx.playing && fromCtx.gainNode) {
            // Start fading out the current tier
            const now = fromCtx.context.currentTime;
            fromCtx.gainNode.gain.setValueAtTime(fromCtx.gainNode.gain.value, now);
            fromCtx.gainNode.gain.linearRampToValueAtTime(0, now + FADE_DURATION);

            // Start the new tier with fade in
            startPlayback(toTierId);

            // Stop the old tier after fade completes
            setTimeout(() => {
                if (audioContexts[fromTierId] && audioContexts[fromTierId] !== audioContexts[toTierId]) {
                    try {
                        audioContexts[fromTierId].source.stop();
                        audioContexts[fromTierId].context.close();
                    } catch (e) {}
                    audioContexts[fromTierId].playing = false;

                    // Reset old button
                    const btn = document.getElementById(`tier-play-${fromTierId}`);
                    if (btn) {
                        btn.innerHTML = `
                            <svg viewBox="0 0 24 24" fill="currentColor">
                                <path d="M8 5v14l11-7z"/>
                            </svg>
                            Play ${TIERS[fromTierId].name} Master
                        `;
                        btn.classList.remove('playing');
                    }
                }
            }, FADE_DURATION * 1000);

        } else {
            // No current playback to crossfade from, just start new
            startPlayback(toTierId);
        }
    }

    // Fade out and stop a tier
    function fadeOutAndStop(tierId) {
        const ctx = audioContexts[tierId];
        if (!ctx || !ctx.playing) return;

        if (ctx.gainNode) {
            const now = ctx.context.currentTime;
            ctx.gainNode.gain.setValueAtTime(ctx.gainNode.gain.value, now);
            ctx.gainNode.gain.linearRampToValueAtTime(0, now + FADE_DURATION);
        }

        // Stop after fade completes
        setTimeout(() => {
            stopPlayback(tierId);
        }, FADE_DURATION * 1000);

        // Update button immediately for responsiveness
        const btn = document.getElementById(`tier-play-${tierId}`);
        if (btn) {
            btn.innerHTML = `
                <svg viewBox="0 0 24 24" fill="currentColor">
                    <path d="M8 5v14l11-7z"/>
                </svg>
                Play ${TIERS[tierId].name} Master
            `;
            btn.classList.remove('playing');
        }

        if (currentlyPlaying === tierId) {
            currentlyPlaying = null;
        }
    }

    // Start playback with fade in
    function startPlayback(tierId) {
        const buffer = processedBuffers[tierId];
        if (!buffer) return;

        const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        const source = audioCtx.createBufferSource();
        const gainNode = audioCtx.createGain();

        source.buffer = buffer;
        source.connect(gainNode);
        gainNode.connect(audioCtx.destination);

        // Start with volume at 0 and fade in
        gainNode.gain.setValueAtTime(0, audioCtx.currentTime);
        gainNode.gain.linearRampToValueAtTime(1, audioCtx.currentTime + FADE_DURATION);

        source.start();

        audioContexts[tierId] = {
            context: audioCtx,
            source: source,
            gainNode: gainNode,
            playing: true,
            startTime: audioCtx.currentTime
        };

        currentlyPlaying = tierId;

        // Update button
        const btn = document.getElementById(`tier-play-${tierId}`);
        if (btn) {
            btn.innerHTML = `
                <svg viewBox="0 0 24 24" fill="currentColor">
                    <path d="M6 4h4v16H6zM14 4h4v16h-4z"/>
                </svg>
                Pause
            `;
            btn.classList.add('playing');
        }

        // Highlight card
        document.querySelectorAll('.tier-card').forEach(c => c.classList.remove('active'));
        document.getElementById(`tier-card-${tierId}`)?.classList.add('active');

        // Update progress
        updateProgress(tierId);

        // Handle end
        source.onended = () => {
            stopPlayback(tierId);
        };

    }

    // Stop playback
    function stopPlayback(tierId) {
        if (audioContexts[tierId]) {
            try {
                audioContexts[tierId].source.stop();
                audioContexts[tierId].context.close();
            } catch (e) {}
            audioContexts[tierId].playing = false;
        }

        if (currentlyPlaying === tierId) {
            currentlyPlaying = null;
        }

        // Update button
        const btn = document.getElementById(`tier-play-${tierId}`);
        if (btn) {
            btn.innerHTML = `
                <svg viewBox="0 0 24 24" fill="currentColor">
                    <path d="M8 5v14l11-7z"/>
                </svg>
                Play ${TIERS[tierId].name} Master
            `;
            btn.classList.remove('playing');
        }

        // Reset progress
        const progress = document.getElementById(`tier-progress-${tierId}`);
        if (progress) progress.style.width = '0%';
    }

    // Update progress bar
    function updateProgress(tierId) {
        if (!audioContexts[tierId] || !audioContexts[tierId].playing) return;

        const ctx = audioContexts[tierId];
        const buffer = processedBuffers[tierId];
        const elapsed = ctx.context.currentTime - ctx.startTime;
        const duration = buffer.duration;
        const progress = (elapsed / duration) * 100;

        const progressEl = document.getElementById(`tier-progress-${tierId}`);
        if (progressEl) progressEl.style.width = `${Math.min(progress, 100)}%`;

        if (progress < 100) {
            requestAnimationFrame(() => updateProgress(tierId));
        }
    }

    // Process all tiers
    async function processAll() {
        if (!originalBuffer) {
            (typeof showLuvLangToast==='function'?showLuvLangToast('Please upload a track first'):void 0);
            return;
        }

        const btn = document.getElementById('tier-process-all-btn');
        if (btn) {
            btn.disabled = true;
            btn.textContent = 'Processing...';
        }

        for (const tierId of Object.keys(TIERS)) {
            await processTier(tierId);
        }

        if (btn) {
            btn.disabled = false;
            btn.textContent = 'Process All Tiers';
        }
    }

    // Select tier and proceed to checkout
    function selectTier(tierId) {
        const tier = TIERS[tierId];

        // Close modal
        close();

        // Trigger checkout (integrate with existing payment system)
        if (typeof window.initiatePurchase === 'function') {
            window.initiatePurchase(tierId);
        } else if (typeof window.showPricingModal === 'function') {
            window.showPricingModal(tierId);
        } else {
            // Fallback - set tier and show pricing

            (typeof showLuvLangToast==='function'?showLuvLangToast(`You selected ${tier.name} tier at $${tier.price}/track. Proceeding to checkout...`):void 0);
        }
    }

    // Open modal
    function open(audioBuffer, trackName = 'Untitled Track') {
        injectStyles();
        createModal();

        // Fade out main audio before showing modal
        fadeOutMainAudio();

        originalBuffer = audioBuffer;
        processedBuffers = {};

        // Update track name
        const trackEl = document.getElementById('tier-track-name');
        if (trackEl) trackEl.textContent = trackName;

        // Reset all players
        Object.keys(TIERS).forEach(tierId => {
            updateTierPlayer(tierId, 'empty');
        });

        // Show modal
        const modal = document.getElementById('tier-comparison-modal');
        if (modal) {
            modal.classList.add('active');
            isModalOpen = true;
        }

        // Auto-process if buffer provided
        if (audioBuffer) {
            setTimeout(() => processAll(), 500);
        }
    }

    // Close modal
    function close() {
        // Stop all tier playback with fade out
        Object.keys(TIERS).forEach(tierId => {
            if (audioContexts[tierId]?.playing) {
                fadeOutAndStop(tierId);
            }
        });

        const modal = document.getElementById('tier-comparison-modal');
        if (modal) {
            modal.classList.remove('active');
            isModalOpen = false;
        }

        // Fade main audio back in after modal closes
        setTimeout(() => fadeInMainAudio(), 500);
    }

    // Export API
    window.TierComparison = {
        open,
        close,
        processAll,
        togglePlay,
        selectTier,
        isOpen: () => isModalOpen
    };

    // Add keyboard handler
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && isModalOpen) {
            close();
        }
    });

})();
