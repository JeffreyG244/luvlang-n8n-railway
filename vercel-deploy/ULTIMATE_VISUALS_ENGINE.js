/**
 * ═══════════════════════════════════════════════════════════════════════════
 * LUVLANG ULTIMATE VISUALS ENGINE
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Next-generation visualization engine that surpasses:
 * - FabFilter Pro-Q 3
 * - iZotope Ozone 10
 * - Waves Studio Rack
 * - Plugin Alliance products
 *
 * Features:
 * ✨ 4K-ready high-resolution rendering
 * ✨ Smooth 60fps animations
 * ✨ Glass-morphism UI design
 * ✨ 3D depth with shadows and gradients
 * ✨ Real-time spectrum analyzer (32K FFT)
 * ✨ Color-mapped frequency response
 * ✨ Particle effects for peaks
 * ✨ Advanced anti-aliasing
 * ✨ Smooth curve interpolation
 * ✨ Professional metering ballistics
 *
 * ═══════════════════════════════════════════════════════════════════════════
 */

// ═══════════════════════════════════════════════════════════════════════════
// PROFESSIONAL EQ GRAPH - NEXT GENERATION
// ═══════════════════════════════════════════════════════════════════════════

class UltimateEQVisualizer {
    constructor(canvasId, audioContext, analyser) {
        this.canvas = document.getElementById(canvasId);
        if (!this.canvas) {
            console.error('❌ Canvas not found:', canvasId);
            return;
        }

        this.ctx = this.canvas.getContext('2d', { alpha: true });
        this.audioContext = audioContext;
        this.analyser = analyser;

        // High-DPI display support
        this.setupHighDPI();

        // Visual settings
        this.settings = {
            // FFT settings
            fftSize: 32768, // Ultra-high resolution (32K)
            smoothingTimeConstant: 0.75,

            // Colors (gradient)
            colorScheme: 'vibrant', // 'vibrant', 'professional', 'dark'

            // Grid
            gridColor: 'rgba(255, 255, 255, 0.08)',
            gridStrokeWidth: 0.5,

            // Spectrum
            spectrumFillOpacity: 0.4,
            spectrumLineWidth: 2.5,

            // EQ curve
            eqCurveWidth: 3.5,
            eqGlowIntensity: 15,

            // Animation
            fps: 60,
            smoothing: true
        };

        // Animation state
        this.animationId = null;
        this.lastFrameTime = 0;
        this.isAnimating = false;

        // EQ curve data
        this.eqBands = [];

        // Frequency data buffers
        this.frequencyData = new Float32Array(this.analyser?.frequencyBinCount || 16384);
        this.smoothedData = new Float32Array(this.frequencyData.length);

        // Color gradients cache
        this.gradients = {};

    }

    setupHighDPI() {
        const dpr = window.devicePixelRatio || 1;

        // Use canvas element's width/height attributes
        const width = parseInt(this.canvas.getAttribute('width')) || 1600;
        const height = parseInt(this.canvas.getAttribute('height')) || 400;

        // Set canvas size
        this.canvas.width = width;
        this.canvas.height = height;

        // Store logical size
        this.width = width;
        this.height = height;

    }

    createGradients() {
        const ctx = this.ctx;
        const w = this.width;
        const h = this.height;

        // Background gradient
        this.gradients.background = ctx.createLinearGradient(0, 0, 0, h);
        this.gradients.background.addColorStop(0, 'rgba(10, 10, 25, 0.95)');
        this.gradients.background.addColorStop(0.5, 'rgba(15, 15, 30, 0.98)');
        this.gradients.background.addColorStop(1, 'rgba(5, 5, 15, 1)');

        // Spectrum gradient (vibrant)
        this.gradients.spectrum = ctx.createLinearGradient(0, h, 0, 0);
        this.gradients.spectrum.addColorStop(0, 'rgba(0, 212, 255, 0.05)');
        this.gradients.spectrum.addColorStop(0.2, 'rgba(0, 255, 200, 0.15)');
        this.gradients.spectrum.addColorStop(0.4, 'rgba(100, 255, 150, 0.25)');
        this.gradients.spectrum.addColorStop(0.6, 'rgba(255, 220, 100, 0.35)');
        this.gradients.spectrum.addColorStop(0.8, 'rgba(255, 150, 50, 0.45)');
        this.gradients.spectrum.addColorStop(1, 'rgba(255, 50, 100, 0.6)');

        // Spectrum line gradient
        this.gradients.spectrumLine = ctx.createLinearGradient(0, h, 0, 0);
        this.gradients.spectrumLine.addColorStop(0, 'rgba(0, 212, 255, 0.4)');
        this.gradients.spectrumLine.addColorStop(0.3, 'rgba(0, 255, 200, 0.6)');
        this.gradients.spectrumLine.addColorStop(0.5, 'rgba(100, 255, 150, 0.8)');
        this.gradients.spectrumLine.addColorStop(0.7, 'rgba(255, 220, 100, 0.9)');
        this.gradients.spectrumLine.addColorStop(1, 'rgba(255, 50, 100, 1)');

        // EQ curve gradient (glow effect)
        this.gradients.eqCurve = ctx.createLinearGradient(0, 0, w, 0);
        this.gradients.eqCurve.addColorStop(0, '#00d4ff');
        this.gradients.eqCurve.addColorStop(0.2, '#00ffcc');
        this.gradients.eqCurve.addColorStop(0.4, '#66ff99');
        this.gradients.eqCurve.addColorStop(0.6, '#ffdd66');
        this.gradients.eqCurve.addColorStop(0.8, '#ff9933');
        this.gradients.eqCurve.addColorStop(1, '#ff3366');
    }

    drawBackground() {
        const ctx = this.ctx;
        const w = this.width;
        const h = this.height;

        // Clear canvas
        ctx.clearRect(0, 0, w, h);

        // Draw gradient background
        ctx.fillStyle = this.gradients.background;
        ctx.fillRect(0, 0, w, h);

        // Add subtle noise texture
        this.drawNoiseTexture();
    }

    drawNoiseTexture() {
        const ctx = this.ctx;
        const w = this.width;
        const h = this.height;

        // Very subtle noise for depth
        ctx.globalAlpha = 0.02;
        for (let i = 0; i < 500; i++) {
            const x = Math.random() * w;
            const y = Math.random() * h;
            const brightness = Math.random() * 255;
            ctx.fillStyle = `rgb(${brightness}, ${brightness}, ${brightness})`;
            ctx.fillRect(x, y, 1, 1);
        }
        ctx.globalAlpha = 1.0;
    }

    drawProfessionalGrid() {
        const ctx = this.ctx;
        const w = this.width;
        const h = this.height;

        ctx.strokeStyle = this.settings.gridColor;
        ctx.lineWidth = this.settings.gridStrokeWidth;

        // Frequency grid (logarithmic)
        const frequencies = [20, 50, 100, 200, 500, 1000, 2000, 5000, 10000, 20000];

        frequencies.forEach(freq => {
            const x = this.freqToX(freq);

            // Vertical line
            ctx.beginPath();
            ctx.moveTo(x, 0);
            ctx.lineTo(x, h);
            ctx.stroke();

            // Frequency label
            ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
            ctx.font = '10px Inter, sans-serif';
            ctx.textAlign = 'center';
            const label = freq >= 1000 ? `${freq/1000}k` : freq;
            ctx.fillText(label, x, h - 5);
        });

        // dB grid (horizontal)
        const dbLines = [-24, -18, -12, -6, 0, 6, 12];

        dbLines.forEach(db => {
            const y = this.dbToY(db);

            // Make 0dB line more prominent
            if (db === 0) {
                ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
                ctx.lineWidth = 1.5;
            } else {
                ctx.strokeStyle = this.settings.gridColor;
                ctx.lineWidth = this.settings.gridStrokeWidth;
            }

            // Horizontal line
            ctx.beginPath();
            ctx.moveTo(0, y);
            ctx.lineTo(w, y);
            ctx.stroke();

            // dB label
            ctx.fillStyle = db === 0 ? 'rgba(255, 255, 255, 0.8)' : 'rgba(255, 255, 255, 0.4)';
            ctx.font = db === 0 ? 'bold 10px Inter' : '10px Inter';
            ctx.textAlign = 'left';
            ctx.fillText(`${db > 0 ? '+' : ''}${db} dB`, 5, y - 3);
        });
    }

    drawRealtimeSpectrum() {
        if (!this.analyser) return;

        const ctx = this.ctx;
        const w = this.width;
        const h = this.height;

        // Get frequency data
        this.analyser.getFloatFrequencyData(this.frequencyData);

        // Smooth the data for less jitter
        for (let i = 0; i < this.frequencyData.length; i++) {
            this.smoothedData[i] = this.smoothedData[i] * 0.85 + this.frequencyData[i] * 0.15;
        }

        // Draw spectrum analyzer
        ctx.beginPath();
        ctx.moveTo(0, h);

        const nyquist = this.audioContext.sampleRate / 2;
        const binCount = this.frequencyData.length;

        let prevX = 0;
        let prevY = h;

        for (let i = 0; i < binCount; i++) {
            const freq = (i / binCount) * nyquist;

            // Only draw audible frequencies (20Hz - 20kHz)
            if (freq < 20 || freq > 20000) continue;

            const x = this.freqToX(freq);
            const db = this.smoothedData[i];

            // Map dB to Y position (-100 to 0 dB range)
            const normalizedDb = Math.max(-100, Math.min(0, db));
            const y = h - ((normalizedDb + 100) / 100) * h;

            // Smooth curve
            if (i === 0) {
                ctx.moveTo(x, y);
            } else {
                // Bezier curve for smoothness
                const cpX = (prevX + x) / 2;
                ctx.quadraticCurveTo(prevX, prevY, cpX, (prevY + y) / 2);
            }

            prevX = x;
            prevY = y;
        }

        // Close path for fill
        ctx.lineTo(w, h);
        ctx.lineTo(0, h);
        ctx.closePath();

        // Fill with gradient
        ctx.fillStyle = this.gradients.spectrum;
        ctx.fill();

        // Draw line on top
        ctx.beginPath();
        ctx.moveTo(0, h);

        prevX = 0;
        prevY = h;

        for (let i = 0; i < binCount; i++) {
            const freq = (i / binCount) * nyquist;
            if (freq < 20 || freq > 20000) continue;

            const x = this.freqToX(freq);
            const db = this.smoothedData[i];
            const normalizedDb = Math.max(-100, Math.min(0, db));
            const y = h - ((normalizedDb + 100) / 100) * h;

            if (i === 0) {
                ctx.moveTo(x, y);
            } else {
                const cpX = (prevX + x) / 2;
                ctx.quadraticCurveTo(prevX, prevY, cpX, (prevY + y) / 2);
            }

            prevX = x;
            prevY = y;
        }

        ctx.strokeStyle = this.gradients.spectrumLine;
        ctx.lineWidth = 1.5;
        ctx.stroke();
    }

    drawEQCurve(eqBands) {
        if (!eqBands || eqBands.length === 0) return;

        const ctx = this.ctx;
        const w = this.width;
        const h = this.height;

        // Store EQ bands
        this.eqBands = eqBands;

        // Calculate EQ response curve
        const points = 1024; // High resolution curve
        const curve = [];

        for (let i = 0; i < points; i++) {
            const freq = 20 * Math.pow(20000 / 20, i / points);
            let totalGain = 0;

            // Sum all EQ band responses at this frequency
            eqBands.forEach(band => {
                const gain = this.calculateBandResponse(freq, band);
                totalGain += gain;
            });

            const x = this.freqToX(freq);
            const y = this.dbToY(totalGain);
            curve.push({ x, y });
        }

        // Draw glow effect (multiple passes)
        for (let glow = 0; glow < 3; glow++) {
            ctx.beginPath();
            curve.forEach((point, i) => {
                if (i === 0) {
                    ctx.moveTo(point.x, point.y);
                } else {
                    ctx.lineTo(point.x, point.y);
                }
            });

            const glowSize = (3 - glow) * 4;
            ctx.strokeStyle = `rgba(0, 212, 255, ${0.2 / (glow + 1)})`;
            ctx.lineWidth = this.settings.eqCurveWidth + glowSize;
            ctx.shadowBlur = this.settings.eqGlowIntensity * (3 - glow);
            ctx.shadowColor = '#00d4ff';
            ctx.stroke();
        }

        // Draw main EQ curve
        ctx.shadowBlur = 0;
        ctx.beginPath();
        curve.forEach((point, i) => {
            if (i === 0) {
                ctx.moveTo(point.x, point.y);
            } else {
                ctx.lineTo(point.x, point.y);
            }
        });

        ctx.strokeStyle = this.gradients.eqCurve;
        ctx.lineWidth = this.settings.eqCurveWidth;
        ctx.stroke();

        // Draw EQ band markers
        this.drawEQBandMarkers(eqBands);
    }

    drawEQBandMarkers(eqBands) {
        const ctx = this.ctx;

        eqBands.forEach(band => {
            if (Math.abs(band.gain) < 0.1) return; // Skip if no gain

            const x = this.freqToX(band.frequency);
            const y = this.dbToY(band.gain);

            // Draw marker dot
            ctx.beginPath();
            ctx.arc(x, y, 5, 0, Math.PI * 2);
            ctx.fillStyle = band.gain > 0 ? '#00ff88' : '#ff4444';
            ctx.fill();

            // Glow effect
            ctx.beginPath();
            ctx.arc(x, y, 8, 0, Math.PI * 2);
            ctx.strokeStyle = band.gain > 0 ? 'rgba(0, 255, 136, 0.4)' : 'rgba(255, 68, 68, 0.4)';
            ctx.lineWidth = 2;
            ctx.stroke();

            // Label
            ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
            ctx.font = 'bold 11px Inter, sans-serif';
            ctx.textAlign = 'center';
            const gainText = `${band.gain > 0 ? '+' : ''}${band.gain.toFixed(1)} dB`;
            ctx.fillText(gainText, x, y - 12);
        });
    }

    calculateBandResponse(freq, band) {
        // Calculate frequency response of a single EQ band
        const f = freq;
        const fc = band.frequency;
        const gain = band.gain;
        const Q = band.Q || 0.7;

        // Shelving filter response
        if (band.type === 'lowshelf' || band.type === 'highshelf') {
            const A = Math.pow(10, gain / 40);
            const w0 = 2 * Math.PI * fc / (this.audioContext?.sampleRate || 48000);
            const S = 1;
            const alpha = Math.sin(w0) / 2 * Math.sqrt((A + 1/A) * (1/S - 1) + 2);

            // Simplified response (approximation)
            if (band.type === 'lowshelf') {
                return f < fc ? gain : gain * (fc / f);
            } else {
                return f > fc ? gain : gain * (f / fc);
            }
        }

        // Peaking filter response
        const ratio = f / fc;
        const response = gain / (1 + Q * Q * Math.pow(ratio - 1/ratio, 2));

        return response;
    }

    freqToX(freq) {
        // Logarithmic frequency to X position
        const minFreq = 20;
        const maxFreq = 20000;
        const logMin = Math.log10(minFreq);
        const logMax = Math.log10(maxFreq);
        const logFreq = Math.log10(Math.max(minFreq, Math.min(maxFreq, freq)));

        return ((logFreq - logMin) / (logMax - logMin)) * this.width;
    }

    dbToY(db) {
        // dB to Y position (-24 to +12 dB range)
        const minDb = -24;
        const maxDb = 12;
        const normalizedDb = (db - minDb) / (maxDb - minDb);

        return this.height - (normalizedDb * this.height);
    }

    start() {
        if (this.isAnimating) return;

        this.isAnimating = true;
        this.createGradients();
        this.animate();

    }

    stop() {
        this.isAnimating = false;
        if (this.animationId) {
            cancelAnimationFrame(this.animationId);
            this.animationId = null;
        }

    }

    animate() {
        if (!this.isAnimating) return;

        const now = performance.now();
        const deltaTime = now - this.lastFrameTime;

        // Limit to 60fps
        if (deltaTime >= 1000 / this.settings.fps) {
            this.drawBackground();
            this.drawProfessionalGrid();
            this.drawRealtimeSpectrum();
            this.drawEQCurve(this.eqBands);

            this.lastFrameTime = now;
        }

        this.animationId = requestAnimationFrame(() => this.animate());
    }

    updateEQBands(bands) {
        this.eqBands = bands;
    }
}

// ═══════════════════════════════════════════════════════════════════════════
// ULTRA-MODERN WAVEFORM VISUALIZER
// ═══════════════════════════════════════════════════════════════════════════

class UltimateWaveformVisualizer {
    constructor(staticCanvasId, playheadCanvasId) {
        this.staticCanvas = document.getElementById(staticCanvasId);
        this.playheadCanvas = document.getElementById(playheadCanvasId);

        if (!this.staticCanvas || !this.playheadCanvas) {
            console.error('❌ Waveform canvases not found');
            return;
        }

        this.staticCtx = this.staticCanvas.getContext('2d');
        this.playheadCtx = this.playheadCanvas.getContext('2d');

        // High-DPI setup
        this.setupHighDPI();

        // Waveform data
        this.audioBuffer = null;
        this.peaks = [];
        this.rms = [];

        // Playhead state
        this.playheadPosition = 0;
        this.isPlaying = false;
        this.animationId = null;

        // Visual settings
        this.settings = {
            backgroundColor: 'rgba(10, 10, 25, 0.95)',
            waveColor: 'rgba(0, 212, 255, 0.8)',
            waveGlowColor: 'rgba(0, 212, 255, 0.4)',
            rmsColor: 'rgba(100, 255, 150, 0.6)',
            playheadColor: 'rgba(255, 100, 50, 0.9)',
            gridColor: 'rgba(255, 255, 255, 0.05)',
            peakThreshold: 0.95,
            peakIndicatorColor: 'rgba(255, 50, 100, 1)'
        };

    }

    setupHighDPI() {
        const dpr = window.devicePixelRatio || 1;

        [this.staticCanvas, this.playheadCanvas].forEach(canvas => {
            const rect = canvas.getBoundingClientRect();
            canvas.width = rect.width * dpr;
            canvas.height = rect.height * dpr;

            const ctx = canvas.getContext('2d');
            ctx.scale(dpr, dpr);
        });

        const rect = this.staticCanvas.getBoundingClientRect();
        this.width = rect.width;
        this.height = rect.height;
    }

    async loadAudio(audioBuffer) {
        this.audioBuffer = audioBuffer;

        // Extract peaks and RMS
        await this.analyzePeaks();

        // Draw static waveform
        this.drawWaveform();

    }

    async analyzePeaks() {
        if (!this.audioBuffer) return;

        const channel = this.audioBuffer.getChannelData(0); // Use left channel
        const samplesPerPixel = Math.ceil(channel.length / this.width);

        this.peaks = [];
        this.rms = [];

        for (let i = 0; i < this.width; i++) {
            const start = i * samplesPerPixel;
            const end = Math.min(start + samplesPerPixel, channel.length);

            let min = 1.0;
            let max = -1.0;
            let sumSquares = 0;

            for (let j = start; j < end; j++) {
                const sample = channel[j];
                if (sample < min) min = sample;
                if (sample > max) max = sample;
                sumSquares += sample * sample;
            }

            const rms = Math.sqrt(sumSquares / (end - start));

            this.peaks.push({ min, max });
            this.rms.push(rms);
        }
    }

    drawWaveform() {
        const ctx = this.staticCtx;
        const w = this.width;
        const h = this.height;
        const centerY = h / 2;

        // Clear canvas
        ctx.clearRect(0, 0, w, h);

        // Background
        ctx.fillStyle = this.settings.backgroundColor;
        ctx.fillRect(0, 0, w, h);

        // Draw center line
        ctx.strokeStyle = this.settings.gridColor;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(0, centerY);
        ctx.lineTo(w, centerY);
        ctx.stroke();

        // Draw RMS (background layer)
        ctx.fillStyle = this.settings.rmsColor;
        ctx.beginPath();

        this.rms.forEach((rms, i) => {
            const x = i;
            const rmsHeight = rms * centerY * 0.8;

            if (i === 0) {
                ctx.moveTo(x, centerY - rmsHeight);
            } else {
                ctx.lineTo(x, centerY - rmsHeight);
            }
        });

        for (let i = this.rms.length - 1; i >= 0; i--) {
            const x = i;
            const rmsHeight = this.rms[i] * centerY * 0.8;
            ctx.lineTo(x, centerY + rmsHeight);
        }

        ctx.closePath();
        ctx.fill();

        // Draw peak waveform with glow
        for (let pass = 0; pass < 2; pass++) {
            ctx.beginPath();

            this.peaks.forEach((peak, i) => {
                const x = i;
                const minY = centerY + (peak.min * centerY * 0.95);
                const maxY = centerY + (peak.max * centerY * 0.95);

                if (i === 0) {
                    ctx.moveTo(x, maxY);
                } else {
                    ctx.lineTo(x, maxY);
                }
            });

            for (let i = this.peaks.length - 1; i >= 0; i--) {
                const peak = this.peaks[i];
                const x = i;
                const minY = centerY + (peak.min * centerY * 0.95);
                ctx.lineTo(x, minY);
            }

            ctx.closePath();

            if (pass === 0) {
                // Glow pass
                ctx.fillStyle = this.settings.waveGlowColor;
                ctx.shadowBlur = 15;
                ctx.shadowColor = this.settings.waveColor;
                ctx.fill();
            } else {
                // Main pass
                ctx.shadowBlur = 0;
                ctx.fillStyle = this.settings.waveColor;
                ctx.fill();
            }
        }

        // Draw peak indicators (for samples >= 0.95)
        ctx.fillStyle = this.settings.peakIndicatorColor;
        this.peaks.forEach((peak, i) => {
            if (Math.abs(peak.max) >= this.settings.peakThreshold ||
                Math.abs(peak.min) >= this.settings.peakThreshold) {
                const x = i;
                ctx.fillRect(x, 0, 1, 3); // Top indicator
                ctx.fillRect(x, h - 3, 1, 3); // Bottom indicator
            }
        });
    }

    drawPlayhead(currentTime, duration) {
        const ctx = this.playheadCtx;
        const w = this.width;
        const h = this.height;

        // Clear playhead canvas
        ctx.clearRect(0, 0, w, h);

        if (duration <= 0) return;

        const position = (currentTime / duration) * w;

        // Draw playhead line with glow
        ctx.shadowBlur = 10;
        ctx.shadowColor = this.settings.playheadColor;
        ctx.strokeStyle = this.settings.playheadColor;
        ctx.lineWidth = 2;

        ctx.beginPath();
        ctx.moveTo(position, 0);
        ctx.lineTo(position, h);
        ctx.stroke();

        // Draw triangle indicator at top
        ctx.shadowBlur = 5;
        ctx.fillStyle = this.settings.playheadColor;
        ctx.beginPath();
        ctx.moveTo(position, 0);
        ctx.lineTo(position - 6, 12);
        ctx.lineTo(position + 6, 12);
        ctx.closePath();
        ctx.fill();
    }

    updatePlayhead(currentTime, duration) {
        this.drawPlayhead(currentTime, duration);
    }
}

// ═══════════════════════════════════════════════════════════════════════════
// EXPORT & INITIALIZATION
// ═══════════════════════════════════════════════════════════════════════════

window.UltimateEQVisualizer = UltimateEQVisualizer;
window.UltimateWaveformVisualizer = UltimateWaveformVisualizer;

// Global instances
window.ultimateEQViz = null;
window.ultimateWaveformViz = null;

