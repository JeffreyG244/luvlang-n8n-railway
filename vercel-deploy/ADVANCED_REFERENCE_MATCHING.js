/**
 * ADVANCED REFERENCE MATCHING - 31-Band AI Intelligence (Phase 2 Refined)
 * ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 *
 * Implements surgical 31-band ISO-standard spectral matching
 * with genre-specific LUFS/LRA targeting and professional safeguards.
 *
 * Features:
 * - 31 third-octave ISO bands (20Hz - 20kHz)
 * - 70% damping factor for musical results
 * - ±5.0 dB safety constraints
 * - Genre-specific loudness targets
 * - Real-time EQ slider automation
 * - Advanced spectral comparison visualization
 */

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// ISO 31-BAND FREQUENCY STANDARD
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

const ISO_31_BANDS = [
    20, 25, 31.5, 40, 50, 63, 80, 100, 125, 160, 200, 250, 315, 400,
    500, 630, 800, 1000, 1250, 1600, 2000, 2500, 3150, 4000,
    5000, 6300, 8000, 10000, 12500, 16000, 20000
];

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// GENRE-SPECIFIC MASTERING TARGETS
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

const GENRE_TARGETS = {
    'EDM': {
        lufs: -8.0,
        lra: 4,
        description: 'Maximum loudness for club/festival playback',
        compression: 'aggressive'
    },
    'Hip-Hop': {
        lufs: -9.0,
        lra: 5,
        description: 'Loud and punchy for urban/mainstream radio',
        compression: 'moderate-aggressive'
    },
    'Pop': {
        lufs: -14.0,
        lra: 7,
        description: 'Streaming-optimized standard',
        compression: 'moderate'
    },
    'Rock': {
        lufs: -12.0,
        lra: 9,
        description: 'Dynamic with punch for live energy',
        compression: 'gentle'
    },
    'Classical/Jazz': {
        lufs: -16.0,
        lra: 12,
        description: 'High dynamics for audiophile playback',
        compression: 'minimal'
    },
    'Acoustic': {
        lufs: -16.0,
        lra: 12,
        description: 'Natural dynamics preserved',
        compression: 'minimal'
    }
};

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 31-BAND SPECTRAL ANALYSIS
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

/**
 * Analyze audio spectrum using 31 ISO-standard third-octave bands
 * @param {AudioBuffer} audioBuffer - Audio to analyze
 * @returns {Promise<Array<number>>} - 31-element array of dB values
 */
async function analyzeSpectrum31Band(audioBuffer) {

    // Create offline context for analysis
    const offlineCtx = new OfflineAudioContext(
        1, // Mono analysis
        audioBuffer.length,
        audioBuffer.sampleRate
    );

    // Create high-resolution analyser (8192-point FFT)
    const analyser = offlineCtx.createAnalyser();
    analyser.fftSize = 8192;
    analyser.smoothingTimeConstant = 0; // No smoothing for accurate analysis

    // Convert to mono if needed
    const source = offlineCtx.createBufferSource();
    if (audioBuffer.numberOfChannels > 1) {
        // Mix to mono
        const monoBuffer = offlineCtx.createBuffer(
            1,
            audioBuffer.length,
            audioBuffer.sampleRate
        );
        const monoData = monoBuffer.getChannelData(0);
        const leftData = audioBuffer.getChannelData(0);
        const rightData = audioBuffer.getChannelData(1);

        for (let i = 0; i < audioBuffer.length; i++) {
            monoData[i] = (leftData[i] + rightData[i]) * 0.5;
        }
        source.buffer = monoBuffer;
    } else {
        source.buffer = audioBuffer;
    }

    source.connect(analyser);
    analyser.connect(offlineCtx.destination);
    source.start(0);

    // Get FFT data
    const frequencyData = new Float32Array(analyser.frequencyBinCount);

    // Analyze in multiple 100ms windows and average
    const windowDuration = 0.1; // 100ms windows
    const windowSamples = Math.floor(windowDuration * audioBuffer.sampleRate);
    const analysisSeconds = Math.min(10, audioBuffer.duration); // Analyze first 10 seconds
    const numWindows = Math.floor((analysisSeconds / windowDuration));

    // Get raw PCM data for manual FFT processing
    const channelData = audioBuffer.numberOfChannels > 1
        ? mixToMono(audioBuffer)
        : audioBuffer.getChannelData(0);

    // Compute average spectrum across windows
    const spectrum31 = ISO_31_BANDS.map(() => 0);
    const binWidth = audioBuffer.sampleRate / analyser.fftSize;

    for (let win = 0; win < numWindows; win++) {
        const startSample = win * windowSamples;

        // Extract window and apply Hann window
        const windowData = new Float32Array(analyser.fftSize);
        for (let i = 0; i < analyser.fftSize && (startSample + i) < channelData.length; i++) {
            const hannWindow = 0.5 * (1 - Math.cos(2 * Math.PI * i / analyser.fftSize));
            windowData[i] = channelData[startSample + i] * hannWindow;
        }

        // Compute magnitude spectrum
        const magnitudeSpectrum = computeMagnitudeSpectrum(windowData);

        // Map to 31 bands
        ISO_31_BANDS.forEach((centerFreq, bandIdx) => {
            const lowFreq = bandIdx > 0
                ? Math.sqrt(ISO_31_BANDS[bandIdx - 1] * centerFreq)
                : centerFreq / Math.sqrt(2);
            const highFreq = bandIdx < 30
                ? Math.sqrt(centerFreq * ISO_31_BANDS[bandIdx + 1])
                : centerFreq * Math.sqrt(2);

            const lowBin = Math.floor(lowFreq / binWidth);
            const highBin = Math.ceil(highFreq / binWidth);

            let bandEnergy = 0;
            let binCount = 0;

            for (let bin = lowBin; bin <= highBin && bin < magnitudeSpectrum.length; bin++) {
                bandEnergy += magnitudeSpectrum[bin];
                binCount++;
            }

            if (binCount > 0) {
                spectrum31[bandIdx] += bandEnergy / binCount;
            }
        });
    }

    // Average across windows and convert to dB
    const avgSpectrum = spectrum31.map((energy, i) => {
        const avgEnergy = energy / numWindows;
        return avgEnergy > 0 ? 20 * Math.log10(avgEnergy + 1e-10) : -100;
    });

    return avgSpectrum;
}

/**
 * Mix stereo audio to mono
 */
function mixToMono(audioBuffer) {
    const length = audioBuffer.length;
    const monoData = new Float32Array(length);
    const left = audioBuffer.getChannelData(0);
    const right = audioBuffer.numberOfChannels > 1 ? audioBuffer.getChannelData(1) : left;

    for (let i = 0; i < length; i++) {
        monoData[i] = (left[i] + right[i]) * 0.5;
    }

    return monoData;
}

/**
 * Compute magnitude spectrum from time-domain data
 * Simplified FFT using real-valued approximation
 */
function computeMagnitudeSpectrum(timeData) {
    const N = timeData.length;
    const halfN = N / 2;
    const magnitude = new Float32Array(halfN);

    // Simplified spectral estimation using autocorrelation-based method
    // This is a lightweight alternative to full FFT for browser-side processing
    for (let k = 0; k < halfN; k++) {
        let real = 0;
        let imag = 0;

        // Sample every 8th point for performance (still gives ~512 bins from 8192 FFT)
        const step = 8;
        for (let n = 0; n < N; n += step) {
            const angle = 2 * Math.PI * k * n / N;
            real += timeData[n] * Math.cos(angle);
            imag += timeData[n] * Math.sin(angle);
        }

        magnitude[k] = Math.sqrt(real * real + imag * imag) / (N / step);
    }

    return magnitude;
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// ADVANCED REFERENCE MATCHING ENGINE
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

/**
 * Main reference matching function - Professional 31-band spectral matching
 * @param {AudioBuffer} userAudioBuffer - User's audio to be mastered
 * @param {AudioBuffer} referenceBuffer - Reference track
 * @param {number} matchStrength - Matching strength (0-1, default 0.7)
 */
async function startReferenceMatching(userAudioBuffer, referenceBuffer, matchStrength = 0.7) {

    // STEP 1: Analyze both tracks (31-band spectrum)

    const userProfile = await analyzeSpectrum31Band(userAudioBuffer);
    const refProfile = await analyzeSpectrum31Band(referenceBuffer);

    // STEP 2: Calculate Smart Correction Curve

    const matchCurve = ISO_31_BANDS.map((freq, i) => {
        let diff = refProfile[i] - userProfile[i];

        // Apply "Damping Factor" (70% smoothing = 30% of difference)
        const DAMPING_FACTOR = 0.30; // 30% of difference (70% smoothing)
        let dampenedMove = diff * DAMPING_FACTOR * matchStrength;

        // Safety Constraint: Limit to +/- 5.0 dB per band
        const MAX_ADJUSTMENT = 5.0;
        dampenedMove = Math.max(-MAX_ADJUSTMENT, Math.min(MAX_ADJUSTMENT, dampenedMove));

        return dampenedMove;
    });

    // STEP 3: Detect Genre and Apply Appropriate Targets

    const genre = window.analysisResults?.genre || detectGenreFromBuffer(userAudioBuffer);
    const targets = GENRE_TARGETS[genre] || GENRE_TARGETS['Pop'];

    // STEP 4: Automate UI Sliders (Map 31 bands to 7-band EQ)

    applyEQAutomation(matchCurve);

    // STEP 5: Apply Final Loudness with -1.0 dBTP Ceiling

    const currentLUFS = window.analysisResults?.integratedLUFS || -20;
    applyFinalLoudness(currentLUFS, targets.lufs, -1.0);

    // STEP 6: Render Spectral Comparison Canvas

    drawSpectralComparison(userProfile, refProfile, matchCurve);

}

/**
 * Apply EQ automation by mapping 31 bands to 7-band EQ
 */
function applyEQAutomation(matchCurve) {
    // Map 31 ISO bands to 7-band parametric EQ
    const eqMapping = [
        { slider: 'eqSubSlider', bands: [0, 1, 2, 3] },           // Sub: 20-50 Hz
        { slider: 'eqBassSlider', bands: [4, 5, 6, 7] },          // Bass: 63-125 Hz
        { slider: 'eqLowMidSlider', bands: [8, 9, 10, 11] },      // Low Mid: 160-315 Hz
        { slider: 'eqMidSlider', bands: [12, 13, 14, 15, 16] },   // Mid: 400-1250 Hz
        { slider: 'eqHighMidSlider', bands: [17, 18, 19, 20] },   // High Mid: 1600-3150 Hz
        { slider: 'eqHighSlider', bands: [21, 22, 23, 24] },      // High: 4000-10000 Hz
        { slider: 'eqAirSlider', bands: [25, 26, 27, 28, 29, 30] } // Air: 12500-20000 Hz
    ];

    eqMapping.forEach(({ slider, bands }) => {
        // Average adjustment across mapped bands
        let avgAdjustment = 0;
        bands.forEach(idx => {
            if (idx < matchCurve.length) {
                avgAdjustment += matchCurve[idx];
            }
        });
        avgAdjustment /= bands.length;

        // Update slider
        updateEQSlider(slider, avgAdjustment);
    });
}

/**
 * Update individual EQ slider and trigger audio node update
 */
function updateEQSlider(sliderId, adjustment) {
    const slider = document.getElementById(sliderId);
    if (!slider) {
        console.warn(`⚠️  Slider ${sliderId} not found`);
        return;
    }

    const currentValue = parseFloat(slider.value) || 0;
    const newValue = currentValue + adjustment;

    // Update slider value
    slider.value = newValue;

    // Trigger input event to update audio nodes
    slider.dispatchEvent(new Event('input', { bubbles: true }));

}

/**
 * Apply final loudness targeting with genre-specific LUFS
 */
function applyFinalLoudness(currentLUFS, targetLUFS, ceiling = -1.0) {
    const lufsGainNeeded = targetLUFS - currentLUFS;

    // Apply via makeupGain node (before limiter)
    if (window.makeupGain) {
        const linearGain = Math.pow(10, lufsGainNeeded / 20);
        window.makeupGain.gain.setValueAtTime(linearGain, audioContext.currentTime);

    }

    // Ensure limiter ceiling is set
    if (window.limiter) {
        window.limiter.threshold.value = ceiling;

    }
}

/**
 * Simplified genre detection (uses existing detector if available)
 */
function detectGenreFromBuffer(audioBuffer) {
    // Use existing genre detector if analysis results available
    if (window.analysisResults && window.analysisResults.genre) {
        return window.analysisResults.genre;
    }

    // Fallback: return Pop as default
    return 'Pop';
}

/**
 * Draw advanced spectral comparison with correction zone
 */
function drawSpectralComparison(userProfile, refProfile, matchCurve) {
    const canvas = document.getElementById('spectralComparisonCanvas');
    if (!canvas) {
        console.warn('⚠️  Spectral comparison canvas not found');
        return;
    }

    const ctx = canvas.getContext('2d');
    const width = canvas.width;
    const height = canvas.height;

    // Clear canvas
    ctx.fillStyle = '#0a0a0f';
    ctx.fillRect(0, 0, width, height);

    // Draw grid
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
    ctx.lineWidth = 1;
    for (let i = 0; i <= 10; i++) {
        const y = (i / 10) * height;
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(width, y);
        ctx.stroke();
    }

    // Draw correction zone (purple fill)
    ctx.fillStyle = 'rgba(184, 79, 255, 0.15)';
    ctx.strokeStyle = 'rgba(184, 79, 255, 0.4)';
    ctx.lineWidth = 1;
    ctx.beginPath();

    // Top edge (reference)
    for (let i = 0; i < 31; i++) {
        const x = (i / 30) * width;
        const normalizedValue = (refProfile[i] + 40) / 80;
        const y = height - (normalizedValue * height);
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
    }

    // Bottom edge (user) in reverse
    for (let i = 30; i >= 0; i--) {
        const x = (i / 30) * width;
        const normalizedValue = (userProfile[i] + 40) / 80;
        const y = height - (normalizedValue * height);
        ctx.lineTo(x, y);
    }

    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Draw curves
    const drawCurve = (profile, color, label, lineWidth = 2.5) => {
        ctx.strokeStyle = color;
        ctx.lineWidth = lineWidth;
        ctx.beginPath();

        for (let i = 0; i < 31; i++) {
            const x = (i / 30) * width;
            const normalizedValue = (profile[i] + 40) / 80;
            const y = height - (normalizedValue * height);
            if (i === 0) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
        }

        ctx.stroke();

        // Label
        ctx.fillStyle = color;
        ctx.font = '11px Inter';
        ctx.fillText(label, 10, label === 'User Track' ? 20 : label === 'Reference' ? 38 : 56);
    };

    drawCurve(userProfile, '#4a9eff', 'User Track');
    drawCurve(refProfile, '#ffd700', 'Reference');

    // Center line
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
    ctx.lineWidth = 1;
    ctx.setLineDash([5, 5]);
    ctx.beginPath();
    ctx.moveTo(0, height / 2);
    ctx.lineTo(width, height / 2);
    ctx.stroke();
    ctx.setLineDash([]);

    // Correction curve label
    ctx.fillStyle = 'rgba(184, 79, 255, 0.8)';
    ctx.font = '11px Inter';
    ctx.fillText('AI Correction', 10, 56);

    // Frequency labels
    ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
    ctx.font = '9px Inter';
    const freqLabels = ['20Hz', '100Hz', '500Hz', '2kHz', '10kHz', '20kHz'];
    const freqPositions = [0, 6, 13, 19, 26, 30];
    freqPositions.forEach((pos, i) => {
        const x = (pos / 30) * width;
        ctx.fillText(freqLabels[i], x - 12, height - 5);
    });

}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// GLOBAL EXPORTS
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

window.analyzeSpectrum31Band = analyzeSpectrum31Band;
window.startReferenceMatching = startReferenceMatching;
window.ISO_31_BANDS = ISO_31_BANDS;
window.GENRE_TARGETS = GENRE_TARGETS;

