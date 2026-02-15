// ============================================
// PROFESSIONAL UPGRADES INTEGRATION SCRIPT
// Adds Worklet Limiter + Cubic Spline EQ Curve
// ============================================

/**
 * This script integrates two professional improvements:
 * 1. AudioWorklet-based Limiter (sample-accurate)
 * 2. Cubic Spline EQ Curve (smooth visualization)
 *
 * Include this after the main HTML loads:
 * <script src="eq-curve-interpolation.js"></script>
 * <script src="PROFESSIONAL_UPGRADES_INTEGRATION.js"></script>
 */

(async function initProfessionalUpgrades() {

    // Wait for audioContext to be available
    while (!window.audioContext) {
        await new Promise(resolve => setTimeout(resolve, 100));
    }

    const audioContext = window.audioContext;

    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // UPGRADE #1: Replace Native Limiter with AudioWorklet Limiter
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

    try {
        // Load limiter worklet processor
        await audioContext.audioWorklet.addModule('limiter-processor.js');

        // Store reference to old limiter for replacement
        const oldLimiter = window.limiter;

        // Create new AudioWorklet limiter
        const limiterWorklet = new AudioWorkletNode(audioContext, 'limiter-processor');

        // Listen for gain reduction updates
        limiterWorklet.port.onmessage = (event) => {
            if (event.data.type === 'gainReduction') {
                // Update UI with gain reduction meter (if exists)
                const grMeter = document.getElementById('limiterGR');
                if (grMeter) {
                    const grDb = event.data.value;
                    grMeter.textContent = grDb.toFixed(1) + ' dB';

                    // Color code based on amount of gain reduction
                    if (grDb > 6) {
                        grMeter.style.color = '#ff4444'; // Heavy limiting (red)
                    } else if (grDb > 3) {
                        grMeter.style.color = '#ffaa00'; // Moderate (yellow)
                    } else {
                        grMeter.style.color = '#00ff88'; // Light (green)
                    }
                }
            }
        };

        // Skip limiter replacement if 20-stage mastering chain is active
        // (chain already has look-ahead limiter + brickwall limiter)
        if (window.lookAheadLimiter && window.lookAheadLimiter.limiter) {
            // Using built-in look-ahead + brickwall limiters
            window.limiterWorklet = null; // Not needed
        } else if (oldLimiter && window.compressor && window.masterGain) {
            try {
                // Legacy 6-stage chain fallback
                window.compressor.disconnect(oldLimiter);
                oldLimiter.disconnect(window.masterGain);
                window.compressor.connect(limiterWorklet);
                limiterWorklet.connect(window.masterGain);
                window.limiter = limiterWorklet;
                window.limiterWorklet = limiterWorklet;

                // Update limiter slider to control worklet
                const limiterSlider = document.getElementById('limiterSlider');
                if (limiterSlider) {
                    limiterSlider.addEventListener('input', (e) => {
                        const ceilingDb = parseFloat(e.target.value);
                        limiterWorklet.port.postMessage({
                            type: 'setCeiling',
                            value: ceilingDb
                        });

                        const valueDisplay = document.getElementById('limiterValue');
                        if (valueDisplay) {
                            valueDisplay.textContent = ceilingDb.toFixed(1) + ' dB';
                        }
                    });

                    // Set initial value
                    const initialCeiling = parseFloat(limiterSlider.value);
                    limiterWorklet.port.postMessage({
                        type: 'setCeiling',
                        value: initialCeiling
                    });
                }

            } catch (error) {
                console.error('⚠️ Could not replace limiter in audio chain:', error);
            }
        }

    } catch (error) {
        console.warn('⚠️ AudioWorklet Limiter not available, using fallback:', error);
    }

    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // UPGRADE #2: Add Cubic Spline EQ Curve Visualization
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

    // Wait for EQ filters to be available
    while (!window.eqSubFilter || !window.eqGraphCanvas) {
        await new Promise(resolve => setTimeout(resolve, 100));
    }

    // Collect all EQ filters
    const eqFilters = [
        window.eqSubFilter,
        window.eqBassFilter,
        window.eqLowMidFilter,
        window.eqMidFilter,
        window.eqHighMidFilter,
        window.eqHighFilter,
        window.eqAirFilter
    ].filter(f => f !== null && f !== undefined);

    /**
     * Enhanced EQ Graph Drawing with Cubic Spline Interpolation
     */
    function drawProfessionalEQGraph() {
        const canvas = window.eqGraphCanvas;
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        const width = canvas.width;
        const height = canvas.height;

        // Get current spectrum data (if available)
        let spectrumData = null;
        if (window.analyser && window.dataArray) {
            window.analyser.getFloatFrequencyData(window.dataArray);
            spectrumData = window.dataArray;
        }

        // Clear canvas with gradient background
        const bgGradient = ctx.createLinearGradient(0, 0, 0, height);
        bgGradient.addColorStop(0, '#0a0a0a');
        bgGradient.addColorStop(0.5, '#1a1a1a');
        bgGradient.addColorStop(1, '#0f0f0f');
        ctx.fillStyle = bgGradient;
        ctx.fillRect(0, 0, width, height);

        // Draw grid (frequency and dB markings)
        drawGrid(ctx, width, height);

        // Draw spectrum analyzer (if available)
        if (spectrumData) {
            drawSpectrum(ctx, width, height, spectrumData);
        }

        // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
        // CUBIC SPLINE EQ CURVE (Professional smooth visualization)
        // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

        if (typeof drawSmoothEQCurve === 'function') {
            // Use the cubic spline interpolation from eq-curve-interpolation.js
            drawSmoothEQCurve(ctx, eqFilters, width, height, audioContext);
        } else {
            // Fallback: Draw basic EQ curve without interpolation
            drawBasicEQCurve(ctx, width, height, eqFilters);
        }
    }

    /**
     * Draw frequency and dB grid
     */
    function drawGrid(ctx, width, height) {
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
        ctx.lineWidth = 1;

        // Horizontal grid (dB markings: -12dB to +12dB for EQ)
        for (let db = -12; db <= 12; db += 3) {
            const yNorm = 0.5 - (db / 24); // Center at 0 dB
            const y = yNorm * height;

            ctx.beginPath();
            ctx.moveTo(0, y);
            ctx.lineTo(width, y);
            ctx.stroke();

            // dB labels
            ctx.fillStyle = db === 0 ? 'rgba(255, 255, 255, 0.6)' : 'rgba(255, 255, 255, 0.3)';
            ctx.font = '10px JetBrains Mono';
            ctx.textAlign = 'right';
            ctx.fillText((db > 0 ? '+' : '') + db + ' dB', width - 10, y - 3);
        }

        // Vertical grid (frequency markings - logarithmic)
        const freqs = [20, 50, 100, 200, 500, 1000, 2000, 5000, 10000, 20000];
        for (const freq of freqs) {
            const t = Math.log10(freq / 20) / Math.log10(20000 / 20);
            const x = t * width;

            ctx.beginPath();
            ctx.moveTo(x, 0);
            ctx.lineTo(x, height);
            ctx.stroke();

            // Frequency labels
            ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
            ctx.font = '10px JetBrains Mono';
            ctx.textAlign = 'center';
            const label = freq >= 1000 ? (freq / 1000) + 'k' : freq;
            ctx.fillText(label, x, height - 5);
        }
    }

    /**
     * Draw spectrum analyzer background
     */
    function drawSpectrum(ctx, width, height, dataArray) {
        ctx.lineWidth = 1.5;
        ctx.globalAlpha = 0.4;
        ctx.beginPath();

        for (let i = 0; i < dataArray.length; i++) {
            const percent = i / dataArray.length;
            const x = percent * width;
            const db = dataArray[i];
            const clampedDb = Math.max(-60, Math.min(0, db));
            const y = height - ((clampedDb + 60) / 60 * height);

            // Color based on dB level
            let color;
            if (db < -30) color = '#43e97b'; // Green
            else if (db < -10) color = '#fee140'; // Yellow
            else color = '#fa709a'; // Red

            ctx.strokeStyle = color;

            if (i === 0) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
        }

        ctx.stroke();
        ctx.globalAlpha = 1.0;
    }

    /**
     * Fallback: Basic EQ curve without spline interpolation
     */
    function drawBasicEQCurve(ctx, width, height, filters) {
        const numPoints = 256;
        const freqs = new Float32Array(numPoints);
        const magResponse = new Float32Array(numPoints);
        const phaseResponse = new Float32Array(numPoints);
        const combinedMag = new Float32Array(numPoints);
        combinedMag.fill(1.0);

        // Generate frequencies
        for (let i = 0; i < numPoints; i++) {
            const t = i / (numPoints - 1);
            freqs[i] = 20 * Math.pow(20000 / 20, t);
        }

        // Get combined response
        for (const filter of filters) {
            if (filter && filter.getFrequencyResponse) {
                filter.getFrequencyResponse(freqs, magResponse, phaseResponse);
                for (let i = 0; i < numPoints; i++) {
                    combinedMag[i] *= magResponse[i];
                }
            }
        }

        // Draw curve
        ctx.strokeStyle = '#00d4ff';
        ctx.lineWidth = 2;
        ctx.shadowColor = '#00d4ff';
        ctx.shadowBlur = 8;
        ctx.beginPath();

        for (let i = 0; i < numPoints; i++) {
            const freq = freqs[i];
            const t = Math.log10(freq / 20) / Math.log10(20000 / 20);
            const x = t * width;

            const magDb = 20 * Math.log10(Math.max(combinedMag[i], 0.00001));
            const yNorm = 0.5 - (magDb / 24);
            const y = yNorm * height;

            if (i === 0) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
        }

        ctx.stroke();
        ctx.shadowBlur = 0;
    }

    // Replace existing drawEQGraph function
    if (typeof window.drawEQGraph !== 'undefined') {
        window.drawEQGraphOriginal = window.drawEQGraph; // Backup
    }
    window.drawEQGraph = drawProfessionalEQGraph;

    // Trigger initial draw
    if (window.eqGraphCanvas) {
        drawProfessionalEQGraph();
    }

    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // Hook into EQ slider changes to redraw curve
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

    const eqSliders = [
        'eqSubSlider',
        'eqBassSlider',
        'eqLowMidSlider',
        'eqMidSlider',
        'eqHighMidSlider',
        'eqHighSlider',
        'eqAirSlider'
    ];

    for (const sliderId of eqSliders) {
        const slider = document.getElementById(sliderId);
        if (slider) {
            slider.addEventListener('input', () => {
                // Redraw EQ graph on slider change
                if (typeof drawProfessionalEQGraph === 'function') {
                    drawProfessionalEQGraph();
                }
            });
        }
    }

})();
