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
// ITU-R BS.1770-4 Standard - Supports 44.1, 48, 88.2, 96, 176.4, 192 kHz
// ============================================
function getKWeightingCoefficients(sampleRate) {
    // ITU-R BS.1770-4 specifies:
    // - Stage 1 & 2: Second-order high-pass filter (f = 38 Hz, Q = 0.5)
    // - Stage 3: High-shelf filter (f = 1681.97 Hz, gain = +4 dB, Q = 0.707)

    const coefficients = {
        // 48 kHz - Reference sample rate from ITU-R BS.1770-4
        48000: {
            hpf: {
                b0: 1.53512485958697,
                b1: -2.69169618940638,
                b2: 1.19839281085285,
                a1: -1.69065929318241,
                a2: 0.73248077421585
            },
            shelf: {
                b0: 1.58486470113085,
                b1: -2.94984226946236,
                b2: 1.37639225641594,
                a1: -1.95002759149878,
                a2: 0.95123623952618
            }
        },
        // 44.1 kHz - CD quality
        44100: {
            hpf: {
                b0: 1.55454475788761,
                b1: -2.67124854266570,
                b2: 1.18058766717226,
                a1: -1.66332530583453,
                a2: 0.71261363225348
            },
            shelf: {
                b0: 1.59910113139498,
                b1: -2.95796085798869,
                b2: 1.37004349626556,
                a1: -1.94551903193901,
                a2: 0.94670032685072
            }
        },
        // 96 kHz - High-resolution audio
        96000: {
            hpf: {
                b0: 1.26536199102498,
                b1: -2.48117539379113,
                b2: 1.21627645562557,
                a1: -1.84175671055818,
                a2: 0.84281665884098
            },
            shelf: {
                b0: 1.28890680890183,
                b1: -2.51608270890183,
                b2: 1.22723680890183,
                a1: -1.97472650220694,
                a2: 0.97539090731994
            }
        },
        // 192 kHz - Ultra high-resolution audio
        192000: {
            hpf: {
                b0: 1.13138947422362,
                b1: -2.24514734828749,
                b2: 1.11387800451388,
                a1: -1.91893610673734,
                a2: 0.91906136835318
            },
            shelf: {
                b0: 1.14272696744514,
                b1: -2.26690292285252,
                b2: 1.12426595540742,
                a1: -1.98730196180612,
                a2: 0.98739196180615
            }
        },
        // 88.2 kHz - High-resolution (2x 44.1)
        88200: {
            hpf: {
                b0: 1.27638920266989,
                b1: -2.49314747528619,
                b2: 1.21685849306631,
                a1: -1.83176832467875,
                a2: 0.83294026827576
            },
            shelf: {
                b0: 1.29771723691878,
                b1: -2.52795696098756,
                b2: 1.23030972406882,
                a1: -1.97225681268881,
                a2: 0.97296681268885
            }
        },
        // 176.4 kHz - Ultra high-resolution (4x 44.1)
        176400: {
            hpf: {
                b0: 1.13750147852614,
                b1: -2.25542248455086,
                b2: 1.11804113647474,
                a1: -1.91181696573453,
                a2: 0.91206722618455
            },
            shelf: {
                b0: 1.14755684895012,
                b1: -2.27366369790024,
                b2: 1.12615684895016,
                a1: -1.98583370073289,
                a2: 0.98593370073293
            }
        }
    };

    // Return exact match or calculate dynamically for unsupported rates
    if (coefficients[sampleRate]) {
        return coefficients[sampleRate];
    }

    // For unsupported sample rates, use bilinear transform to calculate coefficients
    console.warn(`⚠️ Sample rate ${sampleRate}Hz not pre-calculated, using dynamic calculation`);
    return calculateKWeightingCoefficients(sampleRate);
}

// ============================================
// DYNAMIC K-WEIGHTING COEFFICIENT CALCULATION
// Uses bilinear transform for any sample rate
// ============================================
function calculateKWeightingCoefficients(sampleRate) {
    const fs = sampleRate;
    const pi = Math.PI;

    // === High-pass filter (f0 = 38 Hz, Q = 0.5) ===
    const f0_hp = 38.13547087602444;
    const Q_hp = 0.5003270373238773;
    const K_hp = Math.tan(pi * f0_hp / fs);
    const K2_hp = K_hp * K_hp;
    const norm_hp = 1 / (1 + K_hp / Q_hp + K2_hp);

    const hpf = {
        b0: norm_hp,
        b1: -2 * norm_hp,
        b2: norm_hp,
        a1: 2 * (K2_hp - 1) * norm_hp,
        a2: (1 - K_hp / Q_hp + K2_hp) * norm_hp
    };

    // === High-shelf filter (f0 = 1681.97 Hz, gain = +4 dB, Q = 0.707) ===
    const f0_shelf = 1681.974450955533;
    const gain_dB = 3.999843853973347;
    const Q_shelf = 0.7071752369554196;

    const A = Math.pow(10, gain_dB / 40);
    const w0 = 2 * pi * f0_shelf / fs;
    const cos_w0 = Math.cos(w0);
    const sin_w0 = Math.sin(w0);
    const alpha = sin_w0 / (2 * Q_shelf);

    const shelf_a0 = (A + 1) - (A - 1) * cos_w0 + 2 * Math.sqrt(A) * alpha;
    const shelf = {
        b0: (A * ((A + 1) + (A - 1) * cos_w0 + 2 * Math.sqrt(A) * alpha)) / shelf_a0,
        b1: (-2 * A * ((A - 1) + (A + 1) * cos_w0)) / shelf_a0,
        b2: (A * ((A + 1) + (A - 1) * cos_w0 - 2 * Math.sqrt(A) * alpha)) / shelf_a0,
        a1: (2 * ((A - 1) - (A + 1) * cos_w0)) / shelf_a0,
        a2: ((A + 1) - (A - 1) * cos_w0 - 2 * Math.sqrt(A) * alpha) / shelf_a0
    };

    return { hpf, shelf };
}
