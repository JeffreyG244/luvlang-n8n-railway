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
// STEREO METERS - Clean hardware style
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
let leftPeakHold = -60, rightPeakHold = -60;
let leftPeakTime = 0, rightPeakTime = 0;

window.drawStereoMeters = function(canvas, leftLevel, rightLevel) {
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    const width = canvas.width;
    const height = canvas.height;
    const now = performance.now();

    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, width, height);

    const meterH = (height - 8) / 2;
    const meterW = width - 25;

    // Peak hold
    if (leftLevel > leftPeakHold) { leftPeakHold = leftLevel; leftPeakTime = now; }
    else if (now - leftPeakTime > 1000) leftPeakHold = Math.max(leftLevel, leftPeakHold - 0.5);

    if (rightLevel > rightPeakHold) { rightPeakHold = rightLevel; rightPeakTime = now; }
    else if (now - rightPeakTime > 1000) rightPeakHold = Math.max(rightLevel, rightPeakHold - 0.5);

    [{ l: leftLevel, p: leftPeakHold, y: 2, n: 'L' },
     { l: rightLevel, p: rightPeakHold, y: meterH + 6, n: 'R' }].forEach(m => {
        // Background track
        ctx.fillStyle = '#111';
        ctx.fillRect(18, m.y, meterW, meterH - 2);

        // Level - segmented look
        const lvl = Math.max(0, Math.min(1, (m.l + 60) / 60));
        const segments = 40;
        const segW = meterW / segments;

        for (let s = 0; s < segments * lvl; s++) {
            const t = s / segments;
            let color;
            if (t < 0.6) color = `rgb(0, ${150 + t * 100}, ${180 + t * 50})`;
            else if (t < 0.85) color = `rgb(${(t - 0.6) * 400}, ${200 - (t - 0.6) * 200}, 50)`;
            else color = '#ff3333';

            ctx.fillStyle = color;
            ctx.fillRect(18 + s * segW, m.y + 1, segW - 1, meterH - 4);
        }

        // Peak marker
        const pkX = 18 + Math.max(0, Math.min(1, (m.p + 60) / 60)) * meterW;
        ctx.fillStyle = '#fff';
        ctx.fillRect(pkX - 1, m.y, 2, meterH - 2);

        // Label
        ctx.font = '9px system-ui';
        ctx.fillStyle = '#666';
        ctx.textAlign = 'left';
        ctx.fillText(m.n, 5, m.y + meterH / 2 + 3);
    });
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
