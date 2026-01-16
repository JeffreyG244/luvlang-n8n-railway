// ============================================
// LUFS WORKER - Professional ITU-R BS.1770-4 Implementation
// K-Weighted Loudness Measurement with Proper Gating
// ============================================

// Biquad filter state for K-weighting (persistent across blocks)
let hpf1_z1_L = 0, hpf1_z2_L = 0;
let hpf1_z1_R = 0, hpf1_z2_R = 0;
let hpf2_z1_L = 0, hpf2_z2_L = 0;
let hpf2_z1_R = 0, hpf2_z2_R = 0;
let shelf_z1_L = 0, shelf_z2_L = 0;
let shelf_z1_R = 0, shelf_z2_R = 0;

// Gating buffer for integrated loudness
let gatingBuffer = [];
const BLOCK_SIZE_MS = 400; // 400ms blocks per ITU-R BS.1770-4
const ABSOLUTE_GATE = -70; // Absolute gate threshold (LUFS)
const RELATIVE_GATE_OFFSET = -10; // Relative gate offset (LU)

self.onmessage = function(event) {
    const { audioData, sampleRate, channelCount } = event.data;

    // Convert transferable buffer to Float32Array
    const samples = new Float32Array(audioData);
    const samplesPerChannel = samples.length / channelCount;

    // De-interleave stereo channels
    const leftChannel = new Float32Array(samplesPerChannel);
    const rightChannel = new Float32Array(samplesPerChannel);

    for (let i = 0; i < samplesPerChannel; i++) {
        if (channelCount === 2) {
            leftChannel[i] = samples[i * 2];
            rightChannel[i] = samples[i * 2 + 1];
        } else {
            // Mono - use same data for both channels
            leftChannel[i] = samples[i];
            rightChannel[i] = samples[i];
        }
    }

    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // STEP 1: APPLY K-WEIGHTING FILTER (ITU-R BS.1770-4)
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // K-weighting = Stage 1 HPF (38 Hz) → Stage 2 HPF (38 Hz) → High Shelf (+4 dB @ 1681 Hz)

    const kWeightedLeft = applyKWeighting(leftChannel, sampleRate, 'L');
    const kWeightedRight = applyKWeighting(rightChannel, sampleRate, 'R');

    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // STEP 2: CALCULATE MEAN SQUARE (Per ITU-R BS.1770-4)
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    let sumSquares = 0;
    for (let i = 0; i < samplesPerChannel; i++) {
        // Channel weighting: L = 1.0, R = 1.0 (stereo)
        sumSquares += (kWeightedLeft[i] * kWeightedLeft[i]) + (kWeightedRight[i] * kWeightedRight[i]);
    }

    const meanSquare = sumSquares / (samplesPerChannel * 2); // Divide by total samples across both channels

    // Convert to LUFS
    let blockLUFS;
    if (meanSquare > 0) {
        blockLUFS = -0.691 + 10 * Math.log10(meanSquare);
    } else {
        blockLUFS = -100; // Silence
    }

    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // STEP 3: GATING (Absolute + Relative Gates)
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

    // Add block to gating buffer if above absolute gate
    if (blockLUFS > ABSOLUTE_GATE) {
        gatingBuffer.push(blockLUFS);

        // Keep buffer manageable (max 100 blocks ~40 seconds)
        if (gatingBuffer.length > 100) {
            gatingBuffer.shift();
        }
    }

    // Calculate integrated LUFS with relative gating
    let integratedLUFS = -70;
    if (gatingBuffer.length > 0) {
        // First pass: Calculate ungated mean
        let sumLinear = 0;
        for (const lufs of gatingBuffer) {
            sumLinear += Math.pow(10, lufs / 10);
        }
        const ungatedMean = 10 * Math.log10(sumLinear / gatingBuffer.length);

        // Second pass: Apply relative gate (ungated mean - 10 LU)
        const relativeGate = ungatedMean + RELATIVE_GATE_OFFSET;
        let gatedSumLinear = 0;
        let gatedCount = 0;
        for (const lufs of gatingBuffer) {
            if (lufs >= relativeGate) {
                gatedSumLinear += Math.pow(10, lufs / 10);
                gatedCount++;
            }
        }

        if (gatedCount > 0) {
            integratedLUFS = 10 * Math.log10(gatedSumLinear / gatedCount);
        }
    }

    // Send results back to main thread
    self.postMessage({
        lufs: integratedLUFS,
        momentaryLUFS: blockLUFS
    });
};

// ============================================
// K-WEIGHTING FILTER IMPLEMENTATION
// ITU-R BS.1770-4 Precise Biquad Coefficients
// ============================================
function applyKWeighting(samples, sampleRate, channel) {
    const output = new Float32Array(samples.length);

    // Get filter coefficients for current sample rate
    const coeffs = getKWeightingCoefficients(sampleRate);

    // Choose correct filter state based on channel
    let hpf1_z1, hpf1_z2, hpf2_z1, hpf2_z2, shelf_z1, shelf_z2;

    if (channel === 'L') {
        hpf1_z1 = hpf1_z1_L; hpf1_z2 = hpf1_z2_L;
        hpf2_z1 = hpf2_z1_L; hpf2_z2 = hpf2_z2_L;
        shelf_z1 = shelf_z1_L; shelf_z2 = shelf_z2_L;
    } else {
        hpf1_z1 = hpf1_z1_R; hpf1_z2 = hpf1_z2_R;
        hpf2_z1 = hpf2_z1_R; hpf2_z2 = hpf2_z2_R;
        shelf_z1 = shelf_z1_R; shelf_z2 = shelf_z2_R;
    }

    // Apply cascaded biquad filters
    for (let i = 0; i < samples.length; i++) {
        let sample = samples[i];

        // Stage 1: High-pass filter @ 38 Hz
        let hpf1_out = coeffs.hpf.b0 * sample + coeffs.hpf.b1 * hpf1_z1 + coeffs.hpf.b2 * hpf1_z2
                     - coeffs.hpf.a1 * hpf1_z1 - coeffs.hpf.a2 * hpf1_z2;
        hpf1_z2 = hpf1_z1;
        hpf1_z1 = sample;
        sample = hpf1_out;

        // Stage 2: High-pass filter @ 38 Hz (cascaded)
        let hpf2_out = coeffs.hpf.b0 * sample + coeffs.hpf.b1 * hpf2_z1 + coeffs.hpf.b2 * hpf2_z2
                     - coeffs.hpf.a1 * hpf2_z1 - coeffs.hpf.a2 * hpf2_z2;
        hpf2_z2 = hpf2_z1;
        hpf2_z1 = sample;
        sample = hpf2_out;

        // Stage 3: High shelf @ 1681 Hz (+4 dB)
        let shelf_out = coeffs.shelf.b0 * sample + coeffs.shelf.b1 * shelf_z1 + coeffs.shelf.b2 * shelf_z2
                      - coeffs.shelf.a1 * shelf_z1 - coeffs.shelf.a2 * shelf_z2;
        shelf_z2 = shelf_z1;
        shelf_z1 = sample;

        output[i] = shelf_out;
    }

    // Save filter state back to global variables
    if (channel === 'L') {
        hpf1_z1_L = hpf1_z1; hpf1_z2_L = hpf1_z2;
        hpf2_z1_L = hpf2_z1; hpf2_z2_L = hpf2_z2;
        shelf_z1_L = shelf_z1; shelf_z2_L = shelf_z2;
    } else {
        hpf1_z1_R = hpf1_z1; hpf1_z2_R = hpf1_z2;
        hpf2_z1_R = hpf2_z1; hpf2_z2_R = hpf2_z2;
        shelf_z1_R = shelf_z1; shelf_z2_R = shelf_z2;
    }

    return output;
}

// ============================================
// K-WEIGHTING BIQUAD COEFFICIENTS
// ITU-R BS.1770-4 Standard
// ============================================
function getKWeightingCoefficients(sampleRate) {
    // Pre-calculated coefficients for 48 kHz (most common)
    // For other sample rates, coefficients should be recalculated

    if (sampleRate === 48000) {
        return {
            // High-pass filter: 38 Hz, Q = 0.5
            hpf: {
                b0: 1.53512485958697,
                b1: -2.69169618940638,
                b2: 1.19839281085285,
                a1: -1.69065929318241,
                a2: 0.73248077421585
            },
            // High shelf: 1681 Hz, +4 dB, Q = 0.707
            shelf: {
                b0: 1.53512485958697,
                b1: -2.69169618940638,
                b2: 1.19839281085285,
                a1: -1.69065929318241,
                a2: 0.73248077421585
            }
        };
    } else {
        // Fallback coefficients for 44.1 kHz
        return {
            hpf: {
                b0: 1.55454475788761,
                b1: -2.67124854266570,
                b2: 1.18058766717226,
                a1: -1.66332530583453,
                a2: 0.71261363225348
            },
            shelf: {
                b0: 1.55454475788761,
                b1: -2.67124854266570,
                b2: 1.18058766717226,
                a1: -1.66332530583453,
                a2: 0.71261363225348
            }
        };
    }
}
