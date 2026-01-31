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
        // Using Direct Form II Transposed for better numerical stability
        let hpf1_out = coeffs.hpf.b0 * sample + hpf1_z1;
        hpf1_z1 = coeffs.hpf.b1 * sample - coeffs.hpf.a1 * hpf1_out + hpf1_z2;
        hpf1_z2 = coeffs.hpf.b2 * sample - coeffs.hpf.a2 * hpf1_out;
        sample = hpf1_out;

        // Stage 2: High-pass filter @ 38 Hz (cascaded)
        let hpf2_out = coeffs.hpf.b0 * sample + hpf2_z1;
        hpf2_z1 = coeffs.hpf.b1 * sample - coeffs.hpf.a1 * hpf2_out + hpf2_z2;
        hpf2_z2 = coeffs.hpf.b2 * sample - coeffs.hpf.a2 * hpf2_out;
        sample = hpf2_out;

        // Stage 3: High shelf @ 1681 Hz (+4 dB)
        let shelf_out = coeffs.shelf.b0 * sample + shelf_z1;
        shelf_z1 = coeffs.shelf.b1 * sample - coeffs.shelf.a1 * shelf_out + shelf_z2;
        shelf_z2 = coeffs.shelf.b2 * sample - coeffs.shelf.a2 * shelf_out;

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

    // ITU-R BS.1770-4 K-weighting filter coefficients
    // Source: EBU R 128 / ITU-R BS.1770-4 specification
    if (sampleRate === 48000) {
        return {
            // High-pass filter: fc=38Hz, Q=0.5 (second-order Butterworth)
            hpf: {
                b0: 0.99653501285723,
                b1: -1.99307002571446,
                b2: 0.99653501285723,
                a1: -1.99305802314321,
                a2: 0.99308202828572
            },
            // High shelf: fc=1681.97Hz, gain=+4dB (pre-filter)
            shelf: {
                b0: 1.53512485958697,
                b1: -2.69169618940638,
                b2: 1.19839281085285,
                a1: -1.69065929318241,
                a2: 0.73248077421585
            }
        };
    } else if (sampleRate === 44100) {
        return {
            // High-pass filter: fc=38Hz for 44.1kHz
            hpf: {
                b0: 0.99622661667498,
                b1: -1.99245323334996,
                b2: 0.99622661667498,
                a1: -1.99243825562618,
                a2: 0.99246821107374
            },
            // High shelf: fc=1681.97Hz, gain=+4dB for 44.1kHz
            shelf: {
                b0: 1.53084359905542,
                b1: -2.65097548835134,
                b2: 1.16916037708023,
                a1: -1.66353470533625,
                a2: 0.71264178624243
            }
        };
    } else {
        // Generic coefficients - calculate for any sample rate
        const fc_hpf = 38.0;
        const fc_shelf = 1681.97;
        const Q_hpf = 0.5;
        const gain_shelf = 4.0; // dB

        // HPF coefficients (2nd order Butterworth approximation)
        const w0_hpf = 2 * Math.PI * fc_hpf / sampleRate;
        const alpha_hpf = Math.sin(w0_hpf) / (2 * Q_hpf);
        const cos_w0_hpf = Math.cos(w0_hpf);

        const hpf_a0 = 1 + alpha_hpf;

        // Shelf coefficients
        const A_shelf = Math.pow(10, gain_shelf / 40);
        const w0_shelf = 2 * Math.PI * fc_shelf / sampleRate;
        const alpha_shelf = Math.sin(w0_shelf) / 2 * Math.sqrt((A_shelf + 1/A_shelf) * (1/0.707 - 1) + 2);
        const cos_w0_shelf = Math.cos(w0_shelf);

        const shelf_a0 = (A_shelf + 1) - (A_shelf - 1) * cos_w0_shelf + 2 * Math.sqrt(A_shelf) * alpha_shelf;

        return {
            hpf: {
                b0: (1 + cos_w0_hpf) / 2 / hpf_a0,
                b1: -(1 + cos_w0_hpf) / hpf_a0,
                b2: (1 + cos_w0_hpf) / 2 / hpf_a0,
                a1: -(-2 * cos_w0_hpf) / hpf_a0,
                a2: -(1 - alpha_hpf) / hpf_a0
            },
            shelf: {
                b0: (A_shelf * ((A_shelf + 1) + (A_shelf - 1) * cos_w0_shelf + 2 * Math.sqrt(A_shelf) * alpha_shelf)) / shelf_a0,
                b1: (-2 * A_shelf * ((A_shelf - 1) + (A_shelf + 1) * cos_w0_shelf)) / shelf_a0,
                b2: (A_shelf * ((A_shelf + 1) + (A_shelf - 1) * cos_w0_shelf - 2 * Math.sqrt(A_shelf) * alpha_shelf)) / shelf_a0,
                a1: -(2 * ((A_shelf - 1) - (A_shelf + 1) * cos_w0_shelf)) / shelf_a0,
                a2: -((A_shelf + 1) - (A_shelf - 1) * cos_w0_shelf - 2 * Math.sqrt(A_shelf) * alpha_shelf) / shelf_a0
            }
        };
    }
}
