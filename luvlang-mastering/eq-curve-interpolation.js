// ============================================
// CUBIC SPLINE INTERPOLATION FOR EQ FREQUENCY RESPONSE
// Professional Smooth Curve Drawing
// ============================================

/**
 * Cubic Spline Interpolation
 * Creates smooth curves through a set of points
 * Used for professional EQ frequency response visualization
 */
class CubicSpline {
    constructor(x, y) {
        this.x = x; // Frequency points
        this.y = y; // Magnitude points (dB)
        this.n = x.length;

        // Calculate spline coefficients
        this.calculateCoefficients();
    }

    calculateCoefficients() {
        const n = this.n;

        // Arrays for spline coefficients
        this.a = [...this.y]; // y values
        this.b = new Array(n);
        this.c = new Array(n);
        this.d = new Array(n);

        // Step sizes
        const h = new Array(n - 1);
        for (let i = 0; i < n - 1; i++) {
            h[i] = this.x[i + 1] - this.x[i];
        }

        // Tridiagonal matrix system for natural spline
        const alpha = new Array(n - 1);
        for (let i = 1; i < n - 1; i++) {
            alpha[i] = (3 / h[i]) * (this.a[i + 1] - this.a[i]) -
                       (3 / h[i - 1]) * (this.a[i] - this.a[i - 1]);
        }

        // Solve tridiagonal system
        const l = new Array(n);
        const mu = new Array(n);
        const z = new Array(n);

        l[0] = 1;
        mu[0] = 0;
        z[0] = 0;

        for (let i = 1; i < n - 1; i++) {
            l[i] = 2 * (this.x[i + 1] - this.x[i - 1]) - h[i - 1] * mu[i - 1];
            mu[i] = h[i] / l[i];
            z[i] = (alpha[i] - h[i - 1] * z[i - 1]) / l[i];
        }

        l[n - 1] = 1;
        z[n - 1] = 0;
        this.c[n - 1] = 0;

        // Back substitution
        for (let j = n - 2; j >= 0; j--) {
            this.c[j] = z[j] - mu[j] * this.c[j + 1];
            this.b[j] = (this.a[j + 1] - this.a[j]) / h[j] -
                        h[j] * (this.c[j + 1] + 2 * this.c[j]) / 3;
            this.d[j] = (this.c[j + 1] - this.c[j]) / (3 * h[j]);
        }
    }

    interpolate(xVal) {
        // Find the interval containing xVal
        let i = 0;
        for (i = 0; i < this.n - 1; i++) {
            if (xVal >= this.x[i] && xVal <= this.x[i + 1]) {
                break;
            }
        }

        // Clamp to valid range
        if (i >= this.n - 1) i = this.n - 2;

        // Calculate spline value
        const dx = xVal - this.x[i];
        const result = this.a[i] +
                      this.b[i] * dx +
                      this.c[i] * dx * dx +
                      this.d[i] * dx * dx * dx;

        return result;
    }
}

/**
 * Draw smooth EQ frequency response curve using cubic spline interpolation
 *
 * @param {CanvasRenderingContext2D} ctx - Canvas context
 * @param {Array} eqFilters - Array of BiquadFilterNode objects
 * @param {number} width - Canvas width
 * @param {number} height - Canvas height
 * @param {AudioContext} audioContext - Web Audio context for sample rate
 */
function drawSmoothEQCurve(ctx, eqFilters, width, height, audioContext) {
    const sampleRate = audioContext.sampleRate;

    // Sample points for getFrequencyResponse (logarithmically spaced)
    const numSamplePoints = 64; // More points = smoother curve
    const sampleFreqs = new Float32Array(numSamplePoints);
    const magResponse = new Float32Array(numSamplePoints);
    const phaseResponse = new Float32Array(numSamplePoints);

    // Generate logarithmically spaced frequencies (20Hz to 20kHz)
    const minFreq = 20;
    const maxFreq = 20000;
    for (let i = 0; i < numSamplePoints; i++) {
        const t = i / (numSamplePoints - 1);
        sampleFreqs[i] = minFreq * Math.pow(maxFreq / minFreq, t);
    }

    // Get combined frequency response from all EQ filters
    const combinedMag = new Float32Array(numSamplePoints);
    combinedMag.fill(1.0); // Start with unity gain

    for (const filter of eqFilters) {
        if (filter && filter.getFrequencyResponse) {
            filter.getFrequencyResponse(sampleFreqs, magResponse, phaseResponse);

            // Multiply magnitudes (add in dB domain)
            for (let i = 0; i < numSamplePoints; i++) {
                combinedMag[i] *= magResponse[i];
            }
        }
    }

    // Convert to dB
    const magDB = new Array(numSamplePoints);
    for (let i = 0; i < numSamplePoints; i++) {
        magDB[i] = 20 * Math.log10(Math.max(combinedMag[i], 0.00001));
    }

    // Map frequencies to X coordinates (logarithmic scale)
    const xCoords = new Array(numSamplePoints);
    for (let i = 0; i < numSamplePoints; i++) {
        const freq = sampleFreqs[i];
        const t = Math.log10(freq / minFreq) / Math.log10(maxFreq / minFreq);
        xCoords[i] = t * width;
    }

    // Create cubic spline interpolator
    const spline = new CubicSpline(xCoords, magDB);

    // Draw smooth interpolated curve
    ctx.beginPath();

    const numDrawPoints = width; // One point per pixel for smooth curve
    for (let px = 0; px < numDrawPoints; px++) {
        const magDbInterpolated = spline.interpolate(px);

        // Map dB to Y coordinate
        // Display range: -12 dB to +12 dB
        const yNormalized = 0.5 - (magDbInterpolated / 24); // Center at 0 dB
        const y = yNormalized * height;

        if (px === 0) {
            ctx.moveTo(px, y);
        } else {
            ctx.lineTo(px, y);
        }
    }

    // Style the curve
    ctx.strokeStyle = '#00d4ff';
    ctx.lineWidth = 2;
    ctx.stroke();

    // Draw 0 dB reference line
    ctx.save();
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
    ctx.lineWidth = 1;
    ctx.setLineDash([5, 5]);
    ctx.beginPath();
    ctx.moveTo(0, height / 2);
    ctx.lineTo(width, height / 2);
    ctx.stroke();
    ctx.restore();

    // Draw frequency grid lines
    ctx.save();
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
    ctx.lineWidth = 1;
    ctx.setLineDash([2, 4]);

    const gridFreqs = [50, 100, 200, 500, 1000, 2000, 5000, 10000];
    for (const freq of gridFreqs) {
        const t = Math.log10(freq / minFreq) / Math.log10(maxFreq / minFreq);
        const x = t * width;

        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, height);
        ctx.stroke();
    }
    ctx.restore();
}

/**
 * Simplified version for quick integration
 * Call this from your existing EQ graph drawing code
 */
function updateEQGraph(canvasId, eqFilters, audioContext) {
    const canvas = document.getElementById(canvasId);
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    const width = canvas.width;
    const height = canvas.height;

    // Clear canvas
    ctx.clearRect(0, 0, width, height);

    // Draw smooth EQ curve with cubic spline interpolation
    drawSmoothEQCurve(ctx, eqFilters, width, height, audioContext);
}

// Export for use in main application
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { CubicSpline, drawSmoothEQCurve, updateEQGraph };
}

// ============================================
// USAGE EXAMPLE
// ============================================
// In your main HTML file, after EQ faders change:
//
// const eqFilters = [
//     eqSubFilter,
//     eqBassFilter,
//     eqLowMidFilter,
//     eqMidFilter,
//     eqHighMidFilter,
//     eqHighFilter,
//     eqAirFilter
// ];
//
// updateEQGraph('eqCanvas', eqFilters, audioContext);
//
// This will draw a smooth, professional-looking EQ curve
// with cubic spline interpolation instead of jagged lines.
// ============================================
