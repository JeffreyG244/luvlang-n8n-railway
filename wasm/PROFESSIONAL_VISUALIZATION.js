// ═══════════════════════════════════════════════════════════════════════════
// PROFESSIONAL VISUALIZATION SYSTEM
// FabFilter Pro-Q 3 / iZotope Ozone / Waves Quality
// ═══════════════════════════════════════════════════════════════════════════

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// GLOBAL STATE FOR METERING
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
let leftPeakHold = -Infinity;
let rightPeakHold = -Infinity;
let leftPeakHoldTime = 0;
let rightPeakHoldTime = 0;
const PEAK_HOLD_DURATION = 1500; // ms
const PEAK_DECAY_RATE = 0.5; // dB per frame

// Goniometer history buffer
const goniometerHistory = [];
const GONIOMETER_HISTORY_LENGTH = 100;

// PRE-ALLOCATED ARRAYS (prevents garbage collection during animation)
let profSpectrumDataArray = null;
let profSpectrumLastWidth = 0;
let profSpectrumLastHeight = 0;

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 1. SPECTRUM ANALYZER + EQ CURVE (Panel 1)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
window.drawProfessionalSpectrum = function(canvas, analyser, audioContext) {
    if (!canvas || !analyser || !audioContext) return;

    const ctx = canvas.getContext('2d');
    const width = canvas.offsetWidth;
    const height = canvas.offsetHeight;

    // Only resize canvas if dimensions changed (prevents expensive recreate every frame)
    const targetWidth = width * window.devicePixelRatio;
    const targetHeight = height * window.devicePixelRatio;
    if (profSpectrumLastWidth !== targetWidth || profSpectrumLastHeight !== targetHeight) {
        canvas.width = targetWidth;
        canvas.height = targetHeight;
        profSpectrumLastWidth = targetWidth;
        profSpectrumLastHeight = targetHeight;
    }
    ctx.setTransform(window.devicePixelRatio, 0, 0, window.devicePixelRatio, 0, 0);

    // Clear with premium dark gradient
    const bgGradient = ctx.createLinearGradient(0, 0, 0, height);
    bgGradient.addColorStop(0, '#000000');
    bgGradient.addColorStop(0.5, '#0a0a0f');
    bgGradient.addColorStop(1, '#000000');
    ctx.fillStyle = bgGradient;
    ctx.fillRect(0, 0, width, height);

    // ═══ FREQUENCY GRID (Logarithmic) ═══
    const frequencies = [20, 50, 100, 200, 500, 1000, 2000, 5000, 10000, 20000];
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.03)';
    ctx.lineWidth = 1;
    ctx.font = '9px -apple-system, sans-serif';
    ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
    ctx.textAlign = 'center';

    for (const freq of frequencies) {
        const x = width * (Math.log10(freq) - Math.log10(20)) / (Math.log10(20000) - Math.log10(20));

        // Vertical grid line
        ctx.beginPath();
        ctx.moveTo(x, 30);
        ctx.lineTo(x, height - 30);
        ctx.stroke();

        // Frequency label
        let label = freq >= 1000 ? (freq / 1000).toFixed(0) + 'k' : freq.toString();
        ctx.fillText(label, x, height - 10);
    }

    // ═══ dB GRID (Horizontal) ═══
    const dbLevels = [0, -12, -24, -36, -48, -60, -72];
    ctx.textAlign = 'right';

    for (const db of dbLevels) {
        const y = 30 + ((Math.abs(db) / 72) * (height - 60));

        ctx.strokeStyle = db === 0 ? 'rgba(255, 100, 100, 0.15)' : 'rgba(255, 255, 255, 0.03)';
        ctx.beginPath();
        ctx.moveTo(40, y);
        ctx.lineTo(width - 20, y);
        ctx.stroke();

        // dB label
        ctx.fillStyle = db === 0 ? 'rgba(255, 100, 100, 0.6)' : 'rgba(255, 255, 255, 0.3)';
        ctx.fillText(db.toString(), 35, y + 3);
    }

    // ═══ SPECTRUM ANALYZER (Filled Area) ═══
    const bufferLength = analyser.frequencyBinCount;
    // Reuse pre-allocated array to prevent GC pressure
    if (!profSpectrumDataArray || profSpectrumDataArray.length !== bufferLength) {
        profSpectrumDataArray = new Float32Array(bufferLength);
    }
    analyser.getFloatFrequencyData(profSpectrumDataArray);

    const nyquist = audioContext.sampleRate / 2;

    // Draw smooth filled spectrum
    ctx.beginPath();
    ctx.moveTo(40, height - 30);

    for (let i = 0; i < 300; i++) {
        const freq = 20 * Math.pow(20000/20, i / 300);
        const binIndex = Math.round((freq / nyquist) * bufferLength);
        const db = profSpectrumDataArray[Math.min(binIndex, bufferLength - 1)];

        const x = 40 + (width - 60) * (Math.log10(freq) - Math.log10(20)) / (Math.log10(20000) - Math.log10(20));
        const normalized = Math.max(0, Math.min(1, (db + 72) / 72));
        const y = 30 + (1 - normalized) * (height - 60);

        if (i === 0) {
            ctx.lineTo(x, y);
        } else {
            ctx.lineTo(x, y);
        }
    }

    ctx.lineTo(width - 20, height - 30);
    ctx.closePath();

    // Gradient fill (blue-cyan) - INCREASED OPACITY FOR VISIBILITY
    const specGradient = ctx.createLinearGradient(0, 30, 0, height);
    specGradient.addColorStop(0, 'rgba(0, 212, 255, 0.7)');  // Bright cyan at peaks
    specGradient.addColorStop(0.5, 'rgba(0, 150, 200, 0.5)'); // Medium blue
    specGradient.addColorStop(1, 'rgba(0, 100, 150, 0.2)');   // Dark blue at bottom
    ctx.fillStyle = specGradient;
    ctx.fill();

    // Top line with glow
    ctx.beginPath();
    for (let i = 0; i < 300; i++) {
        const freq = 20 * Math.pow(20000/20, i / 300);
        const binIndex = Math.round((freq / nyquist) * bufferLength);
        const db = profSpectrumDataArray[Math.min(binIndex, bufferLength - 1)];

        const x = 40 + (width - 60) * (Math.log10(freq) - Math.log10(20)) / (Math.log10(20000) - Math.log10(20));
        const normalized = Math.max(0, Math.min(1, (db + 72) / 72));
        const y = 30 + (1 - normalized) * (height - 60);

        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
    }
    ctx.strokeStyle = 'rgba(0, 212, 255, 0.9)';  // Brighter line
    ctx.lineWidth = 2;  // Thicker for visibility
    ctx.shadowBlur = 10;  // More glow
    ctx.shadowColor = 'rgba(0, 212, 255, 0.8)';  // Brighter glow
    ctx.stroke();
    ctx.shadowBlur = 0;

    // ═══ EQ CURVE OVERLAY (Bright Cyan with Glow) ═══
    if (window.eqBands && window.audioContext) {
        const eqCurve = calculateEQResponse(width);

        ctx.beginPath();
        for (let i = 0; i < eqCurve.length; i++) {
            const x = 40 + (width - 60) * (i / eqCurve.length);
            const gain = eqCurve[i]; // in dB
            const y = (height / 2) - (gain / 12) * (height / 4);

            if (i === 0) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
        }
        ctx.strokeStyle = '#00d4ff';
        ctx.lineWidth = 2.5;
        ctx.shadowBlur = 8;
        ctx.shadowColor = 'rgba(0, 212, 255, 0.6)';
        ctx.stroke();
        ctx.shadowBlur = 0;
    }
};

// Calculate EQ frequency response curve
function calculateEQResponse(resolution) {
    const curve = new Array(resolution).fill(0);

    if (!window.eqBands || !window.audioContext) return curve;

    const sampleRate = window.audioContext.sampleRate;

    for (let i = 0; i < resolution; i++) {
        const freq = 20 * Math.pow(20000/20, i / resolution);
        let totalGain = 0;

        // Sum up all EQ bands
        for (const band of window.eqBands) {
            if (!band.filter) continue;

            const Q = band.filter.Q.value;
            const centerFreq = band.filter.frequency.value;
            const gain = band.filter.gain.value;

            // Peaking EQ response calculation
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

            const phi = Math.sin(w / 2);
            const r = ((b0 + b2) * Math.pow(phi, 2) - (b2 - b0) + 2 * b1 * Math.pow(phi, 2)) /
                      ((a0 + a2) * Math.pow(phi, 2) - (a2 - a0) + 2 * a1 * Math.pow(phi, 2));

            const bandGain = 20 * Math.log10(Math.abs(r));
            totalGain += bandGain;
        }

        curve[i] = totalGain;
    }

    return curve;
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 2. STEREO METERS (L/R Channels with Peak Hold)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
window.drawStereoMeter = function(canvas, level, peakHold, isLeft) {
    if (!canvas) return { level: -Infinity, holdTime: 0 };

    const ctx = canvas.getContext('2d');
    const width = canvas.offsetWidth;
    const height = canvas.offsetHeight;

    canvas.width = width * window.devicePixelRatio;
    canvas.height = height * window.devicePixelRatio;
    ctx.scale(window.devicePixelRatio, window.devicePixelRatio);

    // Dark background
    ctx.fillStyle = '#000000';
    ctx.fillRect(0, 0, width, height);

    // Convert linear to dB
    const dbLevel = level > 0 ? 20 * Math.log10(level) : -Infinity;

    // Update peak hold
    const now = Date.now();
    if (dbLevel > peakHold.level || (now - peakHold.time) > PEAK_HOLD_DURATION) {
        if (dbLevel > peakHold.level) {
            peakHold.level = dbLevel;
            peakHold.time = now;
        } else {
            peakHold.level -= PEAK_DECAY_RATE;
            peakHold.level = Math.max(peakHold.level, -60);
        }
    }

    // Draw meter bar (bottom to top) - PROFESSIONAL LED-STYLE SEGMENTS
    const meterHeight = Math.max(0, Math.min(height, ((dbLevel + 60) / 60) * height));

    // Draw segmented LED-style meter (like professional hardware)
    const segmentHeight = 4;  // Height of each LED segment
    const segmentGap = 1;     // Gap between segments
    const totalSegmentHeight = segmentHeight + segmentGap;
    const numSegments = Math.ceil(height / totalSegmentHeight);
    const activeSegments = Math.floor((meterHeight / height) * numSegments);

    for (let i = 0; i < activeSegments; i++) {
        const y = height - (i + 1) * totalSegmentHeight;
        const segmentLevel = i / numSegments;

        // Color based on level (green → yellow → red)
        let color;
        if (segmentLevel < 0.6) {
            color = '#00ff88';  // Green
        } else if (segmentLevel < 0.75) {
            color = '#88ff00';  // Yellow-green
        } else if (segmentLevel < 0.9) {
            color = '#ffaa00';  // Orange
        } else {
            color = '#ff3333';  // Red
        }

        // Draw segment with glow
        ctx.fillStyle = color;
        ctx.shadowBlur = 3;
        ctx.shadowColor = color;
        ctx.fillRect(3, y, width - 6, segmentHeight);
        ctx.shadowBlur = 0;

        // Add highlight for 3D effect
        ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
        ctx.fillRect(3, y, width - 6, 1);
    }

    // Peak hold indicator (bright glowing line with color based on level)
    if (peakHold.level > -60) {
        const peakY = height - ((peakHold.level + 60) / 60) * height;
        const peakLevel = (peakHold.level + 60) / 60;

        // Color based on peak level
        let peakColor;
        if (peakLevel < 0.6) peakColor = '#00ffaa';
        else if (peakLevel < 0.9) peakColor = '#ffaa00';
        else peakColor = '#ff0000';

        // Draw with glow effect
        ctx.shadowBlur = 6;
        ctx.shadowColor = peakColor;
        ctx.fillStyle = peakColor;
        ctx.fillRect(0, peakY - 2, width, 3);
        ctx.shadowBlur = 0;

        // Bright highlight on top
        ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
        ctx.fillRect(0, peakY - 2, width, 1);
    }

    // Border
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
    ctx.lineWidth = 1;
    ctx.strokeRect(0.5, 0.5, width - 1, height - 1);

    // dB markers
    ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
    ctx.font = '8px monospace';
    ctx.textAlign = 'left';

    const markers = [0, -6, -12, -18, -24, -40, -60];
    for (const db of markers) {
        const y = height - ((db + 60) / 60) * height;

        // Tick mark
        ctx.fillRect(width - 3, y - 0.5, 3, 1);
    }

    return peakHold;
};

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 3. GONIOMETER (Phase Correlation Scope)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
window.drawGoniometer = function(canvas, leftData, rightData) {
    if (!canvas || !leftData || !rightData) return;

    const ctx = canvas.getContext('2d');
    const width = canvas.offsetWidth;
    const height = canvas.offsetHeight;

    canvas.width = width * window.devicePixelRatio;
    canvas.height = height * window.devicePixelRatio;
    ctx.scale(window.devicePixelRatio, window.devicePixelRatio);

    const centerX = width / 2;
    const centerY = height / 2;
    const radius = Math.min(width, height) / 2 - 10;

    // Dark background
    ctx.fillStyle = '#000000';
    ctx.fillRect(0, 0, width, height);

    // Draw circular grid
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
    ctx.lineWidth = 1;
    for (let r = radius / 4; r <= radius; r += radius / 4) {
        ctx.beginPath();
        ctx.arc(centerX, centerY, r, 0, Math.PI * 2);
        ctx.stroke();
    }

    // Draw center cross
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
    ctx.beginPath();
    ctx.moveTo(centerX - radius, centerY);
    ctx.lineTo(centerX + radius, centerY);
    ctx.moveTo(centerX, centerY - radius);
    ctx.lineTo(centerX, centerY + radius);
    ctx.stroke();

    // Draw diagonal lines (L/R correlation indicators)
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
    ctx.beginPath();
    ctx.moveTo(centerX - radius * 0.7, centerY - radius * 0.7);
    ctx.lineTo(centerX + radius * 0.7, centerY + radius * 0.7);
    ctx.moveTo(centerX - radius * 0.7, centerY + radius * 0.7);
    ctx.lineTo(centerX + radius * 0.7, centerY - radius * 0.7);
    ctx.stroke();

    // Calculate and draw L/R correlation points
    const step = Math.max(1, Math.floor(leftData.length / 200));

    ctx.strokeStyle = 'rgba(0, 212, 255, 0.6)';
    ctx.lineWidth = 1.5;
    ctx.shadowBlur = 3;
    ctx.shadowColor = 'rgba(0, 212, 255, 0.5)';

    ctx.beginPath();
    let firstPoint = true;

    for (let i = 0; i < leftData.length; i += step) {
        const L = leftData[i];
        const R = rightData[i];

        // Convert to Mid/Side
        const mid = (L + R) / 2;
        const side = (L - R) / 2;

        const x = centerX + (mid * radius * 0.9);
        const y = centerY - (side * radius * 0.9);

        if (firstPoint) {
            ctx.moveTo(x, y);
            firstPoint = false;
        } else {
            ctx.lineTo(x, y);
        }
    }

    ctx.stroke();
    ctx.shadowBlur = 0;

    // Draw circular border
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
    ctx.stroke();

    // Labels
    ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
    ctx.font = '9px -apple-system, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('M+S', centerX + radius - 15, centerY - radius + 15);
    ctx.fillText('M-S', centerX - radius + 15, centerY - radius + 15);
};

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 4. ENHANCED WAVEFORM (Purple-to-Cyan Gradient with Glow)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
window.drawProfessionalWaveform = function(canvas, audioBuffer) {
    if (!canvas || !audioBuffer) {
        console.log('❌ drawProfessionalWaveform: missing canvas or audioBuffer');
        return;
    }

    const ctx = canvas.getContext('2d');
    const width = canvas.offsetWidth;
    const height = canvas.offsetHeight;

    // Only log detailed info on first draw or if there's an issue
    if (!window.waveformDrawnOnce) {
        console.log(`🎨 Waveform: ${width}x${height}px, ${audioBuffer.duration.toFixed(2)}s, ${audioBuffer.numberOfChannels}ch`);
        window.waveformDrawnOnce = true;
    }

    if (width === 0 || height === 0) {
        console.log('❌ Canvas has zero dimensions! Cannot draw waveform.');
        return;
    }

    canvas.width = width * window.devicePixelRatio;
    canvas.height = height * window.devicePixelRatio;
    ctx.scale(window.devicePixelRatio, window.devicePixelRatio);

    // Premium dark gradient background
    const bgGradient = ctx.createLinearGradient(0, 0, 0, height);
    bgGradient.addColorStop(0, '#000000');
    bgGradient.addColorStop(0.5, '#050508');
    bgGradient.addColorStop(1, '#000000');
    ctx.fillStyle = bgGradient;
    ctx.fillRect(0, 0, width, height);

    // Get stereo channels
    const leftData = audioBuffer.getChannelData(0);
    const rightData = audioBuffer.numberOfChannels > 1 ? audioBuffer.getChannelData(1) : leftData;
    const step = Math.ceil(leftData.length / width);
    const centerY = height / 2;
    const amp = height / 2 * 0.85;

    // Create gradient for waveform (purple to cyan)
    const waveGradient = ctx.createLinearGradient(0, 0, width, 0);
    waveGradient.addColorStop(0, '#b84fff');
    waveGradient.addColorStop(0.3, '#8b5cf6');
    waveGradient.addColorStop(0.6, '#06b6d4');
    waveGradient.addColorStop(1, '#00d4ff');

    // Draw filled waveform
    ctx.shadowBlur = 6;
    ctx.shadowColor = 'rgba(0, 212, 255, 0.4)';

    ctx.beginPath();
    ctx.moveTo(0, centerY);

    // Top half
    for (let i = 0; i < width; i++) {
        let maxL = -1.0, maxR = -1.0;

        for (let j = 0; j < step; j++) {
            const index = (i * step) + j;
            if (index < leftData.length) {
                if (Math.abs(leftData[index]) > maxL) maxL = Math.abs(leftData[index]);
                if (Math.abs(rightData[index]) > maxR) maxR = Math.abs(rightData[index]);
            }
        }

        const max = Math.max(maxL, maxR);
        const y = centerY - (max * amp);
        ctx.lineTo(i, y);
    }

    // Bottom half
    for (let i = width - 1; i >= 0; i--) {
        let maxL = -1.0, maxR = -1.0;

        for (let j = 0; j < step; j++) {
            const index = (i * step) + j;
            if (index < leftData.length) {
                if (Math.abs(leftData[index]) > maxL) maxL = Math.abs(leftData[index]);
                if (Math.abs(rightData[index]) > maxR) maxR = Math.abs(rightData[index]);
            }
        }

        const max = Math.max(maxL, maxR);
        const y = centerY + (max * amp);
        ctx.lineTo(i, y);
    }

    ctx.closePath();

    // Fill with gradient - Professional purple-to-cyan
    const fillGradient = ctx.createLinearGradient(0, 0, width, 0);
    fillGradient.addColorStop(0, 'rgba(184, 79, 255, 0.6)');   // Purple (brighter)
    fillGradient.addColorStop(0.5, 'rgba(139, 92, 246, 0.5)'); // Mid purple (brighter)
    fillGradient.addColorStop(1, 'rgba(0, 212, 255, 0.6)');    // Cyan (brighter)
    ctx.fillStyle = fillGradient;
    ctx.fill();

    // Draw outline with glow
    ctx.strokeStyle = waveGradient;
    ctx.lineWidth = 2;  // Thicker for visibility
    ctx.globalAlpha = 0.9;  // Bright outline
    ctx.stroke();
    ctx.globalAlpha = 1.0;
    ctx.shadowBlur = 0;

    // Center line
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, centerY);
    ctx.lineTo(width, centerY);
    ctx.stroke();
};

console.log('✅ PROFESSIONAL_VISUALIZATION.js loaded');
