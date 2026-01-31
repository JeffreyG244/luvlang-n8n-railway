// ═══════════════════════════════════════════════════════════════════════════
// PRO SPECTRUM - HARDWARE GRADE ANALYZER
// Clean, minimal, professional - like Ozone/SPAN/Pro-Q
// ═══════════════════════════════════════════════════════════════════════════

let profSpectrumDataArray = null;
let profSpectrumLastWidth = 0;
let profSpectrumLastHeight = 0;

// 64 frequency bands - hardware style
const NUM_BARS = 64;
let barValues = new Float32Array(NUM_BARS);
let peakValues = new Float32Array(NUM_BARS);
let peakTimes = new Float32Array(NUM_BARS);

for (let i = 0; i < NUM_BARS; i++) {
    barValues[i] = 0;
    peakValues[i] = 0;
    peakTimes[i] = 0;
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// MAIN SPECTRUM - Hardware bar graph style
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
window.drawProfessionalSpectrum = function(canvas, analyser, audioContext) {
    if (!canvas || !analyser || !audioContext) return;

    const ctx = canvas.getContext('2d');
    const width = canvas.offsetWidth;
    const height = canvas.offsetHeight;
    const now = performance.now();

    const dpr = window.devicePixelRatio || 1;
    if (profSpectrumLastWidth !== width * dpr || profSpectrumLastHeight !== height * dpr) {
        canvas.width = width * dpr;
        canvas.height = height * dpr;
        profSpectrumLastWidth = width * dpr;
        profSpectrumLastHeight = height * dpr;
    }
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    // Pure black background
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, width, height);

    // Get FFT data
    const bufferLength = analyser.frequencyBinCount;
    if (!profSpectrumDataArray || profSpectrumDataArray.length !== bufferLength) {
        profSpectrumDataArray = new Float32Array(bufferLength);
    }
    analyser.getFloatFrequencyData(profSpectrumDataArray);

    const nyquist = audioContext.sampleRate / 2;
    const barWidth = (width - 10) / NUM_BARS - 1;
    const maxHeight = height - 25;

    // Process each bar
    for (let i = 0; i < NUM_BARS; i++) {
        // Logarithmic frequency mapping
        const t = i / NUM_BARS;
        const freq = 20 * Math.pow(1000, t);
        const bin = Math.round((freq / nyquist) * bufferLength);
        const db = profSpectrumDataArray[Math.min(bin, bufferLength - 1)];

        // Normalize -80dB to 0dB
        const normalized = Math.max(0, Math.min(1, (db + 80) / 80));

        // Smooth attack/release
        const target = normalized;
        if (target > barValues[i]) {
            barValues[i] += (target - barValues[i]) * 0.5; // Fast attack
        } else {
            barValues[i] += (target - barValues[i]) * 0.15; // Slow release
        }

        const barHeight = barValues[i] * maxHeight;
        const x = 5 + i * (barWidth + 1);
        const y = height - 20 - barHeight;

        // Peak hold
        if (barHeight > peakValues[i]) {
            peakValues[i] = barHeight;
            peakTimes[i] = now;
        } else if (now - peakTimes[i] > 800) {
            peakValues[i] = Math.max(0, peakValues[i] - 2);
        }

        // Bar color - subtle gradient from dark to bright cyan
        const intensity = barValues[i];
        const r = Math.floor(intensity * 30);
        const g = Math.floor(150 + intensity * 105);
        const b = Math.floor(180 + intensity * 75);

        // Draw bar
        ctx.fillStyle = `rgb(${r}, ${g}, ${b})`;
        ctx.fillRect(x, y, barWidth, barHeight);

        // Subtle top highlight
        if (barHeight > 2) {
            ctx.fillStyle = `rgba(255, 255, 255, ${0.1 + intensity * 0.2})`;
            ctx.fillRect(x, y, barWidth, 1);
        }

        // Peak hold indicator - thin white line
        if (peakValues[i] > 2) {
            const peakY = height - 20 - peakValues[i];
            const age = now - peakTimes[i];
            const alpha = age < 800 ? 1 : Math.max(0.3, 1 - (age - 800) / 1000);
            ctx.fillStyle = `rgba(255, 255, 255, ${alpha})`;
            ctx.fillRect(x, peakY, barWidth, 2);
        }
    }

    // Frequency labels - minimal
    ctx.font = '9px system-ui, -apple-system, sans-serif';
    ctx.fillStyle = 'rgba(255, 255, 255, 0.35)';
    ctx.textAlign = 'center';

    const labels = [
        { f: 50, l: '50' }, { f: 100, l: '100' }, { f: 200, l: '200' },
        { f: 500, l: '500' }, { f: 1000, l: '1k' }, { f: 2000, l: '2k' },
        { f: 5000, l: '5k' }, { f: 10000, l: '10k' }
    ];

    for (const { f, l } of labels) {
        const t = (Math.log10(f) - Math.log10(20)) / (Math.log10(20000) - Math.log10(20));
        const x = 5 + t * (width - 10);
        ctx.fillText(l, x, height - 5);
    }

    // dB scale on left - very subtle
    ctx.textAlign = 'right';
    ctx.fillStyle = 'rgba(255, 255, 255, 0.2)';
    const dbMarks = [0, -20, -40, -60];
    for (const db of dbMarks) {
        const y = 15 + (Math.abs(db) / 80) * maxHeight;
        ctx.fillText(`${db}`, width - 3, y);
    }
};

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// STEREO METER - VERTICAL single channel meter (called separately for L/R)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
window.drawStereoMeter = function(canvas, level, peakHoldObj, isLeft) {
    if (!canvas) return peakHoldObj;

    const ctx = canvas.getContext('2d');
    const width = canvas.width;
    const height = canvas.height;
    const now = performance.now();

    // Clear
    ctx.fillStyle = '#0a0a0a';
    ctx.fillRect(0, 0, width, height);

    // Convert linear level to dB
    const levelDB = level > 0 ? 20 * Math.log10(level) : -60;
    const clampedDB = Math.max(-60, Math.min(0, levelDB));

    // Update peak hold
    if (levelDB > peakHoldObj.level) {
        peakHoldObj.level = levelDB;
        peakHoldObj.time = now;
    } else if (now - peakHoldObj.time > 1500) {
        peakHoldObj.level = Math.max(levelDB, peakHoldObj.level - 0.5);
    }

    // VERTICAL Meter dimensions
    const meterX = 5;
    const meterY = 5;
    const meterW = width - 10;
    const meterH = height - 10;

    // Background track
    ctx.fillStyle = '#151515';
    ctx.fillRect(meterX, meterY, meterW, meterH);

    // Level bar - VERTICAL segmented (bottom to top)
    // Colors match dB scale: -60/-40=dim, -24/-18=green, -12/-6=orange, 0=red
    const levelNorm = (clampedDB + 60) / 60;
    const segments = 40;
    const segH = meterH / segments;

    for (let s = 0; s < segments * levelNorm; s++) {
        const t = s / segments; // 0 = bottom (-60dB), 1 = top (0dB)
        const dB = -60 + t * 60; // Convert to dB

        let color;
        if (dB < -40) {
            // -60 to -40: dim cyan/gray
            color = 'rgba(100, 150, 180, 0.5)';
        } else if (dB < -24) {
            // -40 to -24: brighter cyan transitioning to green
            const p = (dB + 40) / 16;
            color = `rgb(0, ${Math.floor(150 + p * 105)}, ${Math.floor(180 - p * 50)})`;
        } else if (dB < -12) {
            // -24 to -12: green (#00ff88)
            color = '#00ff88';
        } else if (dB < -6) {
            // -12 to -6: orange/yellow (#ffaa00)
            color = '#ffaa00';
        } else {
            // -6 to 0: red (#ff3333)
            color = '#ff3333';
        }

        ctx.fillStyle = color;
        // Draw from bottom up
        const segY = meterY + meterH - (s + 1) * segH;
        ctx.fillRect(meterX + 1, segY + 1, meterW - 2, segH - 2);
    }

    // Peak hold marker - horizontal line
    const peakNorm = (Math.max(-60, peakHoldObj.level) + 60) / 60;
    const peakY = meterY + meterH - peakNorm * meterH;
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(meterX, peakY - 1, meterW, 2);

    return peakHoldObj;
};

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// GONIOMETER - Phase scope
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
window.drawGoniometer = function(canvas, leftSamples, rightSamples) {
    if (!canvas || !leftSamples || !rightSamples) return;

    const ctx = canvas.getContext('2d');
    const w = canvas.width, h = canvas.height;
    const cx = w / 2, cy = h / 2;
    const scale = Math.min(w, h) * 0.4;

    // Fade
    ctx.fillStyle = 'rgba(0, 0, 0, 0.12)';
    ctx.fillRect(0, 0, w, h);

    // Crosshairs
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(cx, 0); ctx.lineTo(cx, h);
    ctx.moveTo(0, cy); ctx.lineTo(w, cy);
    ctx.moveTo(0, 0); ctx.lineTo(w, h);
    ctx.moveTo(w, 0); ctx.lineTo(0, h);
    ctx.stroke();

    // Samples
    const n = Math.min(leftSamples.length, rightSamples.length, 512);
    ctx.beginPath();
    for (let i = 0; i < n; i++) {
        const x = cx + (rightSamples[i] - leftSamples[i]) * scale * 0.7;
        const y = cy - (rightSamples[i] + leftSamples[i]) * scale * 0.5;
        i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
    }
    ctx.strokeStyle = 'rgba(0, 180, 220, 0.5)';
    ctx.stroke();

    // Labels
    ctx.font = '8px system-ui';
    ctx.fillStyle = 'rgba(255,255,255,0.25)';
    ctx.textAlign = 'center';
    ctx.fillText('M', cx, 10);
    ctx.fillText('S', cx, h - 4);
    ctx.textAlign = 'left'; ctx.fillText('L', 3, cy + 3);
    ctx.textAlign = 'right'; ctx.fillText('R', w - 3, cy + 3);
};

console.log('✅ PRO SPECTRUM - Hardware Grade Analyzer loaded');
