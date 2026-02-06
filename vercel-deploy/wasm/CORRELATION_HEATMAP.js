/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   PHASE CORRELATION ANALYZER - Professional Grade
   Frequency-domain stereo correlation analysis
   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */

const NUM_BANDS = 24;
const HISTORY_LEN = 150;

// Frequency bands (log scale)
const BANDS = [];
for (let i = 0; i < NUM_BANDS; i++) {
    const lo = 20 * Math.pow(1000, i / NUM_BANDS);
    const hi = 20 * Math.pow(1000, (i + 1) / NUM_BANDS);
    BANDS.push({ lo, hi, center: Math.sqrt(lo * hi) });
}

const history = [];
let leftFreq = null, rightFreq = null;
let leftTime = null, rightTime = null;

// Professional color mapping
function getColor(corr) {
    // corr: -1 to +1
    if (corr >= 0.8) {
        // Bright cyan - excellent
        return { r: 0, g: 220, b: 200 };
    } else if (corr >= 0.5) {
        // Green - good
        const t = (corr - 0.5) / 0.3;
        return { r: 0, g: Math.floor(180 + t * 40), b: Math.floor(100 + t * 100) };
    } else if (corr >= 0.2) {
        // Yellow - caution
        const t = (corr - 0.2) / 0.3;
        return { r: 255, g: Math.floor(200 - t * 20), b: 0 };
    } else if (corr >= 0) {
        // Orange/Red - warning
        const t = corr / 0.2;
        return { r: 255, g: Math.floor(100 * t), b: 0 };
    } else if (corr >= -0.5) {
        // Magenta - phase issues
        const t = (corr + 0.5) / 0.5;
        return { r: Math.floor(200 + t * 55), g: 0, b: Math.floor(100 + t * 55) };
    } else {
        // Blue - severe inversion
        return { r: 80, g: 0, b: 180 };
    }
}

function analyze(leftAn, rightAn, ctx) {
    if (!leftAn || !rightAn) return null;

    const len = leftAn.frequencyBinCount;
    if (!leftFreq || leftFreq.length !== len) {
        leftFreq = new Float32Array(len);
        rightFreq = new Float32Array(len);
    }
    if (!leftTime || leftTime.length !== leftAn.fftSize) {
        leftTime = new Float32Array(leftAn.fftSize);
        rightTime = new Float32Array(rightAn.fftSize);
    }

    leftAn.getFloatFrequencyData(leftFreq);
    rightAn.getFloatFrequencyData(rightFreq);
    leftAn.getFloatTimeDomainData(leftTime);
    rightAn.getFloatTimeDomainData(rightTime);

    const sr = ctx.sampleRate;
    const nyq = sr / 2;
    const result = [];

    for (const band of BANDS) {
        const binLo = Math.floor((band.lo / nyq) * len);
        const binHi = Math.ceil((band.hi / nyq) * len);

        let sumLR = 0, sumLL = 0, sumRR = 0, cnt = 0;
        const winSize = Math.min(leftTime.length, 512);

        for (let i = 0; i < winSize; i++) {
            const L = leftTime[i];
            const R = rightTime[i];
            sumLR += L * R;
            sumLL += L * L;
            sumRR += R * R;
            cnt++;
        }

        let corr = 1.0;
        if (sumLL > 0.00001 && sumRR > 0.00001) {
            corr = sumLR / Math.sqrt(sumLL * sumRR);
            corr = Math.max(-1, Math.min(1, corr));
        }
        result.push(corr);
    }
    return result;
}

window.drawCorrelationHeatmap = function(canvas, leftAn, rightAn, audioCtx) {
    if (!canvas || !leftAn || !rightAn) return;

    const ctx = canvas.getContext('2d');
    const w = canvas.width;
    const h = canvas.height;

    // Analyze
    const data = analyze(leftAn, rightAn, audioCtx);
    if (!data) return;

    history.push(data);
    if (history.length > HISTORY_LEN) history.shift();

    // Clear
    ctx.fillStyle = '#0a0a0a';
    ctx.fillRect(0, 0, w, h);

    // Draw heatmap
    const colW = w / HISTORY_LEN;
    const rowH = h / NUM_BANDS;

    for (let t = 0; t < history.length; t++) {
        const x = t * colW;
        const frame = history[t];

        for (let f = 0; f < NUM_BANDS; f++) {
            const y = h - (f + 1) * rowH;
            const corr = frame[f];
            const c = getColor(corr);

            // Add subtle glow for high correlation
            const alpha = corr > 0.7 ? 1 : 0.85;
            ctx.fillStyle = `rgba(${c.r}, ${c.g}, ${c.b}, ${alpha})`;
            ctx.fillRect(x, y, colW + 0.5, rowH + 0.5);
        }
    }

    // Subtle grid lines
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
    ctx.lineWidth = 0.5;
    for (let f = 0; f < NUM_BANDS; f += 6) {
        const y = h - f * rowH;
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(w, y);
        ctx.stroke();
    }

    // Current time indicator
    const nowX = history.length * colW;
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(nowX, 0);
    ctx.lineTo(nowX, h);
    ctx.stroke();

    // Frequency labels
    ctx.font = '8px system-ui';
    ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';

    const labelFreqs = [100, 500, 1000, 5000, 10000];
    for (const freq of labelFreqs) {
        for (let f = 0; f < NUM_BANDS; f++) {
            if (BANDS[f].center >= freq * 0.9 && BANDS[f].center <= freq * 1.1) {
                const y = h - (f + 0.5) * rowH;
                const lbl = freq >= 1000 ? (freq / 1000) + 'k' : freq + '';
                ctx.fillText(lbl, 3, y);
                break;
            }
        }
    }
};

// Legend
window.drawCorrelationLegend = function(canvas) {
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    const w = canvas.width;
    const h = canvas.height;

    // Gradient bar
    const steps = 80;
    const stepW = w / steps;

    for (let i = 0; i < steps; i++) {
        const corr = -1 + (2 * i / steps);
        const c = getColor(corr);
        ctx.fillStyle = `rgb(${c.r}, ${c.g}, ${c.b})`;
        ctx.fillRect(i * stepW, 0, stepW + 1, h);
    }

    // Labels below
    ctx.font = '8px system-ui';
    ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
    ctx.textBaseline = 'top';

    ctx.textAlign = 'left';
    ctx.fillText('Out of Phase', 2, h + 1);

    ctx.textAlign = 'center';
    ctx.fillText('0', w / 2, h + 1);

    ctx.textAlign = 'right';
    ctx.fillText('Mono Safe', w - 2, h + 1);
};

