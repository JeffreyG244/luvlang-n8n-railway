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
// STEREO METER - Professional LED-style vertical meter (iZotope/FabFilter style)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
window.drawStereoMeter = function(canvas, level, peakHoldObj, isLeft) {
    if (!canvas) return peakHoldObj;

    const ctx = canvas.getContext('2d');
    const width = canvas.width;
    const height = canvas.height;
    const now = performance.now();

    // Dark background with subtle gradient
    const bgGrad = ctx.createLinearGradient(0, 0, 0, height);
    bgGrad.addColorStop(0, '#08080c');
    bgGrad.addColorStop(0.5, '#0c0c12');
    bgGrad.addColorStop(1, '#08080c');
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, width, height);

    // Convert linear level to dB
    const levelDB = level > 0 ? 20 * Math.log10(level) : -60;
    const clampedDB = Math.max(-60, Math.min(3, levelDB));

    // Update peak hold with smooth decay
    if (levelDB > peakHoldObj.level) {
        peakHoldObj.level = levelDB;
        peakHoldObj.time = now;
    } else if (now - peakHoldObj.time > 2000) {
        peakHoldObj.level = Math.max(levelDB, peakHoldObj.level - 0.3);
    }

    // Meter dimensions
    const meterX = 2;
    const meterY = 2;
    const meterW = width - 4;
    const meterH = height - 4;

    // Draw meter track with inner shadow effect
    ctx.fillStyle = '#050508';
    ctx.fillRect(meterX, meterY, meterW, meterH);

    // LED-style segments
    const segments = 30;
    const segH = (meterH - 2) / segments;
    const gap = 1;
    const levelNorm = (clampedDB + 60) / 63; // -60 to +3 dB range

    for (let s = 0; s < segments; s++) {
        const t = s / segments;
        const dB = -60 + t * 63;
        const segY = meterY + meterH - (s + 1) * segH;
        const isLit = s < segments * levelNorm;

        // Color based on dB level
        let color, glowColor;
        if (dB < -24) {
            color = isLit ? '#00d4ff' : 'rgba(0, 212, 255, 0.08)';
            glowColor = 'rgba(0, 212, 255, 0.4)';
        } else if (dB < -12) {
            color = isLit ? '#00ff88' : 'rgba(0, 255, 136, 0.08)';
            glowColor = 'rgba(0, 255, 136, 0.5)';
        } else if (dB < -3) {
            color = isLit ? '#ffcc00' : 'rgba(255, 204, 0, 0.08)';
            glowColor = 'rgba(255, 204, 0, 0.5)';
        } else {
            color = isLit ? '#ff3355' : 'rgba(255, 51, 85, 0.1)';
            glowColor = 'rgba(255, 51, 85, 0.6)';
        }

        // Draw segment
        ctx.fillStyle = color;
        ctx.fillRect(meterX + 1, segY + gap, meterW - 2, segH - gap * 2);

        // Add glow effect for lit segments
        if (isLit && s > segments * levelNorm - 5) {
            ctx.shadowColor = glowColor;
            ctx.shadowBlur = 4;
            ctx.fillRect(meterX + 1, segY + gap, meterW - 2, segH - gap * 2);
            ctx.shadowBlur = 0;
        }
    }

    // Peak hold marker with glow
    const peakNorm = (Math.max(-60, Math.min(3, peakHoldObj.level)) + 60) / 63;
    const peakY = meterY + meterH - peakNorm * meterH;
    const peakDB = peakHoldObj.level;

    // Peak color based on level
    let peakColor = '#00ffff';
    if (peakDB > -3) peakColor = '#ff3355';
    else if (peakDB > -12) peakColor = '#ffcc00';
    else if (peakDB > -24) peakColor = '#00ff88';

    ctx.shadowColor = peakColor;
    ctx.shadowBlur = 6;
    ctx.fillStyle = peakColor;
    ctx.fillRect(meterX, peakY - 1, meterW, 2);
    ctx.shadowBlur = 0;

    // Clip indicator at top
    if (peakDB > -0.1) {
        ctx.fillStyle = '#ff0033';
        ctx.shadowColor = '#ff0033';
        ctx.shadowBlur = 8;
        ctx.fillRect(meterX, meterY, meterW, 3);
        ctx.shadowBlur = 0;
    }

    return peakHoldObj;
};

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// GONIOMETER - State-of-the-Art Phase Scope with Glow Effects
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
window.drawGoniometer = function(canvas, leftSamples, rightSamples) {
    if (!canvas || !leftSamples || !rightSamples) return;

    const ctx = canvas.getContext('2d');
    const w = canvas.width, h = canvas.height;
    const cx = w / 2, cy = h / 2;
    const radius = Math.min(w, h) * 0.42;

    // Slow fade for persistence trails
    ctx.fillStyle = 'rgba(5, 5, 12, 0.15)';
    ctx.fillRect(0, 0, w, h);

    // Draw subtle grid circles
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.04)';
    ctx.lineWidth = 1;
    [0.33, 0.66, 1].forEach(r => {
        ctx.beginPath();
        ctx.arc(cx, cy, radius * r, 0, Math.PI * 2);
        ctx.stroke();
    });

    // Crosshairs with glow
    ctx.strokeStyle = 'rgba(0, 212, 255, 0.12)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(cx, 2); ctx.lineTo(cx, h - 2);
    ctx.moveTo(2, cy); ctx.lineTo(w - 2, cy);
    ctx.stroke();

    // Diagonal guides (L-R axis)
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.06)';
    ctx.beginPath();
    ctx.moveTo(cx - radius * 0.7, cy - radius * 0.7);
    ctx.lineTo(cx + radius * 0.7, cy + radius * 0.7);
    ctx.moveTo(cx + radius * 0.7, cy - radius * 0.7);
    ctx.lineTo(cx - radius * 0.7, cy + radius * 0.7);
    ctx.stroke();

    // Calculate correlation for color
    let sumLR = 0, sumL2 = 0, sumR2 = 0;
    const n = Math.min(leftSamples.length, rightSamples.length, 256);
    for (let i = 0; i < n; i++) {
        const l = leftSamples[i], r = rightSamples[i];
        sumLR += l * r;
        sumL2 += l * l;
        sumR2 += r * r;
    }
    const correlation = (sumL2 > 0 && sumR2 > 0) ? sumLR / Math.sqrt(sumL2 * sumR2) : 0;

    // Color based on correlation: green (mono) -> cyan -> magenta (wide) -> red (phase issues)
    let hue, saturation, alpha;
    if (correlation > 0.7) {
        hue = 140; saturation = 80; // Green - mono compatible
    } else if (correlation > 0.3) {
        hue = 180; saturation = 90; // Cyan - good stereo
    } else if (correlation > -0.2) {
        hue = 280; saturation = 85; // Magenta - wide stereo
    } else {
        hue = 0; saturation = 100; // Red - phase issues
    }

    // Draw glowing samples as dots with trails
    const step = Math.max(1, Math.floor(n / 128)); // Limit dots for performance

    for (let i = 0; i < n; i += step) {
        const l = leftSamples[i] || 0;
        const r = rightSamples[i] || 0;

        // M/S decomposition with proper √2 normalization (iZotope/NUGEN standard)
        const S = (r - l) / Math.SQRT2;  // Side (horizontal axis)
        const M = (l + r) / Math.SQRT2;  // Mid (vertical axis)
        const x = cx + S * radius * 0.7;
        const y = cy - M * radius * 0.7;

        // Intensity based on amplitude
        const amp = Math.sqrt(l * l + r * r);
        alpha = Math.min(1, amp * 2 + 0.15);

        // Draw glowing dot
        const dotSize = 1.5 + amp * 2;

        // Outer glow
        ctx.beginPath();
        ctx.arc(x, y, dotSize + 2, 0, Math.PI * 2);
        ctx.fillStyle = `hsla(${hue}, ${saturation}%, 60%, ${alpha * 0.3})`;
        ctx.fill();

        // Core dot
        ctx.beginPath();
        ctx.arc(x, y, dotSize, 0, Math.PI * 2);
        ctx.fillStyle = `hsla(${hue}, ${saturation}%, 70%, ${alpha * 0.8})`;
        ctx.fill();

        // Bright center
        ctx.beginPath();
        ctx.arc(x, y, dotSize * 0.5, 0, Math.PI * 2);
        ctx.fillStyle = `hsla(${hue}, 40%, 90%, ${alpha})`;
        ctx.fill();
    }

    // Center reference dot
    ctx.beginPath();
    ctx.arc(cx, cy, 2, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
    ctx.fill();
};

