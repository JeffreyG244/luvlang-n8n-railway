/* ═══════════════════════════════════════════════════════════════════════════
   ULTRA 2026 VISUALIZATION ENGINE
   Next-Generation Mastering Plugin Visuals
   Inspired by: FabFilter Pro-Q 4, iZotope Ozone 12, Eventide Elevate 2
   ═══════════════════════════════════════════════════════════════════════════ */

(function() {
    'use strict';

    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // PERSISTENCE / GHOSTING SYSTEM (Analog Phosphor Effect)
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    const GHOST_FRAMES = 8;
    let ghostHistory = [];
    let lastFrameTime = 0;
    const TARGET_FPS = 60;

    // Pre-allocated arrays for performance
    let spectrumHeights = null;
    let smoothedHeights = null;
    let peakHeights = null;
    let peakDecay = null;

    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // COLOR PALETTE - 2026 Neon Aesthetic
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    const COLORS = {
        // Primary spectrum gradient (low to high frequency)
        spectrumLow: { r: 138, g: 43, b: 226 },    // Purple (bass)
        spectrumMid: { r: 0, g: 191, b: 255 },      // Cyan (mids)
        spectrumHigh: { r: 255, g: 0, b: 128 },     // Pink (highs)

        // EQ curve
        eqCurve: 'rgba(0, 255, 200, 1)',
        eqGlow: 'rgba(0, 255, 200, 0.6)',
        eqNode: '#00ffc8',
        eqNodeActive: '#ff00aa',

        // Peak indicators
        peakLine: 'rgba(255, 255, 255, 0.8)',
        peakGlow: 'rgba(255, 255, 255, 0.4)',

        // Background
        bgTop: '#000000',
        bgMid: '#050508',
        bgBottom: '#0a0a12',

        // Grid
        gridMajor: 'rgba(255, 255, 255, 0.08)',
        gridMinor: 'rgba(255, 255, 255, 0.03)',
        gridZero: 'rgba(255, 100, 100, 0.2)'
    };

    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // MAIN ULTRA SPECTRUM RENDERER
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    window.drawUltra2026Spectrum = function(canvas, analyser, audioContext) {
        if (!canvas || !analyser || !audioContext) return;

        const ctx = canvas.getContext('2d', { alpha: false });
        const dpr = window.devicePixelRatio || 1;
        const width = canvas.offsetWidth;
        const height = canvas.offsetHeight;

        // High-DPI canvas setup
        if (canvas.width !== width * dpr || canvas.height !== height * dpr) {
            canvas.width = width * dpr;
            canvas.height = height * dpr;
            ctx.scale(dpr, dpr);
        }

        // Frame timing for consistent animation
        const now = performance.now();
        const deltaTime = now - lastFrameTime;
        lastFrameTime = now;

        // ═══ BACKGROUND WITH PREMIUM GRADIENT ═══
        const bgGrad = ctx.createLinearGradient(0, 0, 0, height);
        bgGrad.addColorStop(0, COLORS.bgTop);
        bgGrad.addColorStop(0.5, COLORS.bgMid);
        bgGrad.addColorStop(1, COLORS.bgBottom);
        ctx.fillStyle = bgGrad;
        ctx.fillRect(0, 0, width, height);

        // ═══ TECHNICAL GRID ═══
        drawPremiumGrid(ctx, width, height);

        // ═══ GET FREQUENCY DATA ═══
        const bufferLength = analyser.frequencyBinCount;
        const dataArray = new Float32Array(bufferLength);
        analyser.getFloatFrequencyData(dataArray);
        const nyquist = audioContext.sampleRate / 2;

        // Initialize arrays if needed
        const numBins = 512;
        if (!spectrumHeights || spectrumHeights.length !== numBins) {
            spectrumHeights = new Float32Array(numBins);
            smoothedHeights = new Float32Array(numBins);
            peakHeights = new Float32Array(numBins);
            peakDecay = new Float32Array(numBins).fill(0);
        }

        // ═══ CALCULATE SPECTRUM HEIGHTS WITH SMOOTHING ═══
        const padding = { left: 50, right: 20, top: 35, bottom: 35 };
        const graphWidth = width - padding.left - padding.right;
        const graphHeight = height - padding.top - padding.bottom;

        for (let i = 0; i < numBins; i++) {
            const freq = 20 * Math.pow(1000, i / numBins); // 20Hz to 20kHz log scale
            const binIndex = Math.round((freq / nyquist) * bufferLength);
            const db = dataArray[Math.min(binIndex, bufferLength - 1)];

            // Normalize dB to 0-1 range (-90dB to 0dB)
            const normalized = Math.max(0, Math.min(1, (db + 90) / 90));
            const targetHeight = normalized * graphHeight;

            // Smooth attack/release for organic movement
            const attack = 0.7;  // Fast attack
            const release = 0.92; // Slow release

            if (targetHeight > smoothedHeights[i]) {
                smoothedHeights[i] = smoothedHeights[i] + (targetHeight - smoothedHeights[i]) * attack;
            } else {
                smoothedHeights[i] = smoothedHeights[i] * release + targetHeight * (1 - release);
            }

            spectrumHeights[i] = smoothedHeights[i];

            // Peak hold with decay
            if (spectrumHeights[i] > peakHeights[i]) {
                peakHeights[i] = spectrumHeights[i];
                peakDecay[i] = 60; // Hold for 60 frames
            } else if (peakDecay[i] > 0) {
                peakDecay[i]--;
            } else {
                peakHeights[i] *= 0.97; // Slow decay
            }
        }

        // ═══ DRAW GHOST/PERSISTENCE LAYERS (back to front) ═══
        ghostHistory.unshift([...spectrumHeights]);
        if (ghostHistory.length > GHOST_FRAMES) ghostHistory.pop();

        for (let g = ghostHistory.length - 1; g >= 1; g--) {
            const ghostAlpha = 0.15 * (1 - g / GHOST_FRAMES);
            drawSpectrumFill(ctx, ghostHistory[g], padding, graphWidth, graphHeight, ghostAlpha, numBins);
        }

        // ═══ DRAW MAIN SPECTRUM (Gradient Fill) ═══
        drawSpectrumFill(ctx, spectrumHeights, padding, graphWidth, graphHeight, 0.6, numBins);

        // ═══ DRAW PEAK HOLD LINE ═══
        drawPeakLine(ctx, peakHeights, padding, graphWidth, graphHeight, numBins);

        // ═══ DRAW SPECTRUM TOP LINE WITH GLOW ═══
        drawSpectrumLine(ctx, spectrumHeights, padding, graphWidth, graphHeight, numBins);

        // ═══ EQ CURVE OVERLAY ═══
        if (window.eqBands && window.eqBands.length > 0) {
            drawEQCurve2026(ctx, padding, graphWidth, graphHeight, audioContext.sampleRate);
        }

        // ═══ FREQUENCY LABELS ═══
        drawFrequencyLabels(ctx, padding, graphWidth, height);

        // ═══ dB LABELS ═══
        drawDBLabels(ctx, padding, graphHeight, height);
    };

    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // PREMIUM GRID DRAWING
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    function drawPremiumGrid(ctx, width, height) {
        const padding = { left: 50, right: 20, top: 35, bottom: 35 };
        const graphWidth = width - padding.left - padding.right;
        const graphHeight = height - padding.top - padding.bottom;

        // Frequency grid lines (logarithmic)
        const frequencies = [20, 30, 40, 50, 60, 80, 100, 150, 200, 300, 400, 500, 600, 800,
                            1000, 1500, 2000, 3000, 4000, 5000, 6000, 8000, 10000, 15000, 20000];

        ctx.lineWidth = 1;

        for (const freq of frequencies) {
            const x = padding.left + graphWidth * (Math.log10(freq / 20) / Math.log10(1000));
            const isMajor = [20, 100, 1000, 10000].includes(freq);

            ctx.strokeStyle = isMajor ? COLORS.gridMajor : COLORS.gridMinor;
            ctx.beginPath();
            ctx.moveTo(x, padding.top);
            ctx.lineTo(x, height - padding.bottom);
            ctx.stroke();
        }

        // dB grid lines
        const dbLevels = [0, -6, -12, -18, -24, -30, -36, -42, -48, -54, -60, -72, -84];

        for (const db of dbLevels) {
            const y = padding.top + graphHeight * (Math.abs(db) / 90);
            const isMajor = db % 12 === 0;

            ctx.strokeStyle = db === 0 ? COLORS.gridZero : (isMajor ? COLORS.gridMajor : COLORS.gridMinor);
            ctx.beginPath();
            ctx.moveTo(padding.left, y);
            ctx.lineTo(width - padding.right, y);
            ctx.stroke();
        }
    }

    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // SPECTRUM FILL (Gradient based on frequency)
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    function drawSpectrumFill(ctx, heights, padding, graphWidth, graphHeight, alpha, numBins) {
        ctx.beginPath();
        ctx.moveTo(padding.left, padding.top + graphHeight);

        for (let i = 0; i < numBins; i++) {
            const x = padding.left + (i / numBins) * graphWidth;
            const y = padding.top + graphHeight - heights[i];

            if (i === 0) {
                ctx.lineTo(x, y);
            } else {
                // Bezier smoothing for organic curves
                const prevX = padding.left + ((i - 1) / numBins) * graphWidth;
                const prevY = padding.top + graphHeight - heights[i - 1];
                const cpX = (prevX + x) / 2;
                ctx.quadraticCurveTo(prevX, prevY, cpX, (prevY + y) / 2);
            }
        }

        ctx.lineTo(padding.left + graphWidth, padding.top + graphHeight);
        ctx.closePath();

        // Create frequency-based gradient (purple -> cyan -> pink)
        const grad = ctx.createLinearGradient(padding.left, 0, padding.left + graphWidth, 0);
        grad.addColorStop(0, `rgba(${COLORS.spectrumLow.r}, ${COLORS.spectrumLow.g}, ${COLORS.spectrumLow.b}, ${alpha})`);
        grad.addColorStop(0.35, `rgba(${COLORS.spectrumMid.r}, ${COLORS.spectrumMid.g}, ${COLORS.spectrumMid.b}, ${alpha})`);
        grad.addColorStop(1, `rgba(${COLORS.spectrumHigh.r}, ${COLORS.spectrumHigh.g}, ${COLORS.spectrumHigh.b}, ${alpha})`);

        ctx.fillStyle = grad;
        ctx.fill();
    }

    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // SPECTRUM TOP LINE WITH NEON GLOW
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    function drawSpectrumLine(ctx, heights, padding, graphWidth, graphHeight, numBins) {
        ctx.beginPath();

        for (let i = 0; i < numBins; i++) {
            const x = padding.left + (i / numBins) * graphWidth;
            const y = padding.top + graphHeight - heights[i];

            if (i === 0) {
                ctx.moveTo(x, y);
            } else {
                const prevX = padding.left + ((i - 1) / numBins) * graphWidth;
                const prevY = padding.top + graphHeight - heights[i - 1];
                const cpX = (prevX + x) / 2;
                ctx.quadraticCurveTo(prevX, prevY, cpX, (prevY + y) / 2);
            }
        }

        // Outer glow
        ctx.strokeStyle = 'rgba(0, 200, 255, 0.3)';
        ctx.lineWidth = 6;
        ctx.shadowBlur = 20;
        ctx.shadowColor = 'rgba(0, 200, 255, 0.8)';
        ctx.stroke();

        // Inner bright line
        ctx.strokeStyle = 'rgba(150, 230, 255, 0.9)';
        ctx.lineWidth = 2;
        ctx.shadowBlur = 8;
        ctx.shadowColor = 'rgba(150, 230, 255, 1)';
        ctx.stroke();

        ctx.shadowBlur = 0;
    }

    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // PEAK HOLD LINE
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    function drawPeakLine(ctx, peaks, padding, graphWidth, graphHeight, numBins) {
        ctx.beginPath();

        for (let i = 0; i < numBins; i++) {
            const x = padding.left + (i / numBins) * graphWidth;
            const y = padding.top + graphHeight - peaks[i];

            if (i === 0) {
                ctx.moveTo(x, y);
            } else {
                ctx.lineTo(x, y);
            }
        }

        ctx.strokeStyle = COLORS.peakLine;
        ctx.lineWidth = 1;
        ctx.setLineDash([2, 4]);
        ctx.stroke();
        ctx.setLineDash([]);
    }

    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // 2026 EQ CURVE WITH INTERACTIVE NODES
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    function drawEQCurve2026(ctx, padding, graphWidth, graphHeight, sampleRate) {
        const resolution = 512;
        const curve = new Float32Array(resolution);

        // Calculate EQ response
        for (let i = 0; i < resolution; i++) {
            const freq = 20 * Math.pow(1000, i / resolution);
            let totalGain = 0;

            for (const band of window.eqBands) {
                if (!band.filter) continue;

                const Q = band.filter.Q.value;
                const centerFreq = band.filter.frequency.value;
                const gain = band.filter.gain.value;

                // Peaking EQ response
                const w0 = 2 * Math.PI * centerFreq / sampleRate;
                const w = 2 * Math.PI * freq / sampleRate;
                const A = Math.pow(10, gain / 40);
                const alpha = Math.sin(w0) / (2 * Q);

                const b0 = 1 + alpha * A;
                const b1 = -2 * Math.cos(w0);
                const b2 = 1 - alpha * A;
                const a0 = 1 + alpha / A;
                const a1 = -2 * Math.cos(w0);
                const a2 = 1 - alpha / A;

                const phi = Math.pow(Math.sin(w / 2), 2);
                const numerator = Math.pow(b0 + b2, 2) * phi - (b0 * b2 + Math.pow(b1, 2)) * 4 * phi * (1 - phi) + 4 * b0 * b2;
                const denominator = Math.pow(a0 + a2, 2) * phi - (a0 * a2 + Math.pow(a1, 2)) * 4 * phi * (1 - phi) + 4 * a0 * a2;

                if (denominator > 0) {
                    const magnitude = Math.sqrt(numerator / denominator);
                    totalGain += 20 * Math.log10(Math.max(0.0001, magnitude));
                }
            }

            curve[i] = totalGain;
        }

        // Draw filled area under EQ curve
        ctx.beginPath();
        const zeroY = padding.top + graphHeight / 2;
        ctx.moveTo(padding.left, zeroY);

        for (let i = 0; i < resolution; i++) {
            const x = padding.left + (i / resolution) * graphWidth;
            const y = zeroY - (curve[i] / 24) * (graphHeight / 2); // ±24dB range
            ctx.lineTo(x, y);
        }

        ctx.lineTo(padding.left + graphWidth, zeroY);
        ctx.closePath();

        // Subtle fill
        const fillGrad = ctx.createLinearGradient(0, padding.top, 0, padding.top + graphHeight);
        fillGrad.addColorStop(0, 'rgba(0, 255, 200, 0.15)');
        fillGrad.addColorStop(0.5, 'rgba(0, 255, 200, 0.05)');
        fillGrad.addColorStop(1, 'rgba(0, 255, 200, 0.15)');
        ctx.fillStyle = fillGrad;
        ctx.fill();

        // Draw EQ curve line with glow
        ctx.beginPath();
        for (let i = 0; i < resolution; i++) {
            const x = padding.left + (i / resolution) * graphWidth;
            const y = zeroY - (curve[i] / 24) * (graphHeight / 2);

            if (i === 0) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
        }

        ctx.strokeStyle = COLORS.eqCurve;
        ctx.lineWidth = 2.5;
        ctx.shadowBlur = 12;
        ctx.shadowColor = COLORS.eqGlow;
        ctx.stroke();
        ctx.shadowBlur = 0;

        // Draw EQ band nodes
        for (let i = 0; i < window.eqBands.length; i++) {
            const band = window.eqBands[i];
            if (!band.filter) continue;

            const freq = band.filter.frequency.value;
            const gain = band.filter.gain.value;

            const x = padding.left + graphWidth * (Math.log10(freq / 20) / Math.log10(1000));
            const y = zeroY - (gain / 24) * (graphHeight / 2);

            // Node outer glow
            ctx.beginPath();
            ctx.arc(x, y, 12, 0, Math.PI * 2);
            ctx.fillStyle = 'rgba(0, 255, 200, 0.2)';
            ctx.fill();

            // Node inner
            ctx.beginPath();
            ctx.arc(x, y, 6, 0, Math.PI * 2);
            ctx.fillStyle = COLORS.eqNode;
            ctx.shadowBlur = 8;
            ctx.shadowColor = COLORS.eqGlow;
            ctx.fill();
            ctx.shadowBlur = 0;

            // Band number
            ctx.fillStyle = '#000';
            ctx.font = 'bold 9px -apple-system, sans-serif';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText((i + 1).toString(), x, y);
        }
    }

    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // FREQUENCY LABELS
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    function drawFrequencyLabels(ctx, padding, graphWidth, height) {
        const labels = [
            { freq: 20, label: '20' },
            { freq: 50, label: '50' },
            { freq: 100, label: '100' },
            { freq: 200, label: '200' },
            { freq: 500, label: '500' },
            { freq: 1000, label: '1k' },
            { freq: 2000, label: '2k' },
            { freq: 5000, label: '5k' },
            { freq: 10000, label: '10k' },
            { freq: 20000, label: '20k' }
        ];

        ctx.font = '10px -apple-system, BlinkMacSystemFont, sans-serif';
        ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'top';

        for (const { freq, label } of labels) {
            const x = padding.left + graphWidth * (Math.log10(freq / 20) / Math.log10(1000));
            ctx.fillText(label, x, height - padding.bottom + 8);
        }
    }

    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // dB LABELS
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    function drawDBLabels(ctx, padding, graphHeight, height) {
        const labels = [0, -12, -24, -36, -48, -60, -72];

        ctx.font = '9px -apple-system, BlinkMacSystemFont, sans-serif';
        ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
        ctx.textAlign = 'right';
        ctx.textBaseline = 'middle';

        for (const db of labels) {
            const y = padding.top + graphHeight * (Math.abs(db) / 90);
            ctx.fillText(db.toString(), padding.left - 8, y);
        }
    }

    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // EXPORT & INITIALIZATION
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

    // Override the default spectrum renderer
    window.drawProfessionalSpectrum = window.drawUltra2026Spectrum;

    console.log('✅ ULTRA 2026 VISUALS loaded');
    console.log('   ✨ Phosphor persistence/ghosting');
    console.log('   ✨ Frequency-based color gradient (Purple → Cyan → Pink)');
    console.log('   ✨ Neon glow effects');
    console.log('   ✨ Bezier-smoothed curves');
    console.log('   ✨ Peak hold with decay');
    console.log('   ✨ Interactive EQ nodes');

})();
