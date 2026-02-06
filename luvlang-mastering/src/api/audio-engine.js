/**
 * LUVLANG MASTERING - AUDIO DSP ENGINE
 * Real audio analysis and processing for server-side operations
 * Operates on raw PCM buffers (WAV format)
 */

// ============================================
// WAV PARSER
// ============================================

/**
 * Parse a WAV file buffer into PCM sample data
 */
export function parseWav(buffer) {
    const view = new DataView(buffer.buffer || buffer);

    // Validate RIFF header
    const riff = String.fromCharCode(view.getUint8(0), view.getUint8(1), view.getUint8(2), view.getUint8(3));
    if (riff !== 'RIFF') {
        throw new Error('Invalid WAV file: missing RIFF header');
    }

    const wave = String.fromCharCode(view.getUint8(8), view.getUint8(9), view.getUint8(10), view.getUint8(11));
    if (wave !== 'WAVE') {
        throw new Error('Invalid WAV file: missing WAVE identifier');
    }

    // Find fmt chunk
    let offset = 12;
    let fmtChunk = null;
    let dataChunk = null;

    while (offset < view.byteLength - 8) {
        const chunkId = String.fromCharCode(
            view.getUint8(offset), view.getUint8(offset + 1),
            view.getUint8(offset + 2), view.getUint8(offset + 3)
        );
        const chunkSize = view.getUint32(offset + 4, true);

        if (chunkId === 'fmt ') {
            fmtChunk = {
                audioFormat: view.getUint16(offset + 8, true),
                numChannels: view.getUint16(offset + 10, true),
                sampleRate: view.getUint32(offset + 12, true),
                byteRate: view.getUint32(offset + 16, true),
                blockAlign: view.getUint16(offset + 20, true),
                bitsPerSample: view.getUint16(offset + 22, true)
            };
        } else if (chunkId === 'data') {
            dataChunk = { offset: offset + 8, size: chunkSize };
        }

        offset += 8 + chunkSize;
        if (chunkSize % 2 !== 0) offset++; // pad byte
    }

    if (!fmtChunk || !dataChunk) {
        throw new Error('Invalid WAV file: missing fmt or data chunk');
    }

    // Extract PCM samples as Float32
    const { numChannels, sampleRate, bitsPerSample } = fmtChunk;
    const bytesPerSample = bitsPerSample / 8;
    const numSamples = dataChunk.size / (numChannels * bytesPerSample);
    const channels = [];

    for (let ch = 0; ch < numChannels; ch++) {
        channels.push(new Float32Array(numSamples));
    }

    for (let i = 0; i < numSamples; i++) {
        for (let ch = 0; ch < numChannels; ch++) {
            const byteOffset = dataChunk.offset + (i * numChannels + ch) * bytesPerSample;
            let sample = 0;

            if (bitsPerSample === 16) {
                sample = view.getInt16(byteOffset, true) / 32768;
            } else if (bitsPerSample === 24) {
                const b0 = view.getUint8(byteOffset);
                const b1 = view.getUint8(byteOffset + 1);
                const b2 = view.getUint8(byteOffset + 2);
                let val = (b2 << 16) | (b1 << 8) | b0;
                if (val & 0x800000) val |= ~0xFFFFFF; // sign extend
                sample = val / 8388608;
            } else if (bitsPerSample === 32) {
                if (fmtChunk.audioFormat === 3) {
                    sample = view.getFloat32(byteOffset, true);
                } else {
                    sample = view.getInt32(byteOffset, true) / 2147483648;
                }
            }

            channels[ch][i] = sample;
        }
    }

    return {
        channels,
        sampleRate,
        numChannels,
        bitsPerSample,
        numSamples,
        duration: numSamples / sampleRate
    };
}

/**
 * Encode PCM channels back to WAV buffer
 */
export function encodeWav(channels, sampleRate, bitDepth = 24) {
    const numChannels = channels.length;
    const numSamples = channels[0].length;
    const bytesPerSample = bitDepth / 8;
    const dataSize = numSamples * numChannels * bytesPerSample;
    const headerSize = 44;
    const buffer = Buffer.alloc(headerSize + dataSize);

    // RIFF header
    buffer.write('RIFF', 0);
    buffer.writeUInt32LE(36 + dataSize, 4);
    buffer.write('WAVE', 8);

    // fmt chunk
    buffer.write('fmt ', 12);
    buffer.writeUInt32LE(16, 16);
    buffer.writeUInt16LE(bitDepth === 32 ? 3 : 1, 20); // PCM or IEEE float
    buffer.writeUInt16LE(numChannels, 22);
    buffer.writeUInt32LE(sampleRate, 24);
    buffer.writeUInt32LE(sampleRate * numChannels * bytesPerSample, 28);
    buffer.writeUInt16LE(numChannels * bytesPerSample, 32);
    buffer.writeUInt16LE(bitDepth, 34);

    // data chunk
    buffer.write('data', 36);
    buffer.writeUInt32LE(dataSize, 40);

    let offset = 44;
    for (let i = 0; i < numSamples; i++) {
        for (let ch = 0; ch < numChannels; ch++) {
            const sample = Math.max(-1, Math.min(1, channels[ch][i]));

            if (bitDepth === 16) {
                buffer.writeInt16LE(Math.round(sample * 32767), offset);
            } else if (bitDepth === 24) {
                const val = Math.round(sample * 8388607);
                buffer.writeUInt8(val & 0xFF, offset);
                buffer.writeUInt8((val >> 8) & 0xFF, offset + 1);
                buffer.writeUInt8((val >> 16) & 0xFF, offset + 2);
            } else if (bitDepth === 32) {
                buffer.writeFloatLE(sample, offset);
            }

            offset += bytesPerSample;
        }
    }

    return buffer;
}

// ============================================
// LUFS MEASUREMENT (EBU R128)
// ============================================

/**
 * Apply K-weighting filter coefficients for LUFS measurement
 * Two-stage biquad filter: shelf + highpass per EBU R128
 */
function applyKWeighting(samples, sampleRate) {
    const output = new Float32Array(samples.length);

    // Stage 1: Pre-filter (shelving) - boost high frequencies
    // Coefficients for 48kHz, adjusted for other rates
    const f0_1 = 1681.974450955533;
    const G = 3.999843853973347;
    const Q_1 = 0.7071752369554196;

    const K1 = Math.tan(Math.PI * f0_1 / sampleRate);
    const Vh = Math.pow(10, G / 20);
    const Vb = Math.pow(Vh, 0.4996667741545416);
    const a0_1 = 1 + K1 / Q_1 + K1 * K1;

    const b0_1 = (Vh + Vb * K1 / Q_1 + K1 * K1) / a0_1;
    const b1_1 = 2 * (K1 * K1 - Vh) / a0_1;
    const b2_1 = (Vh - Vb * K1 / Q_1 + K1 * K1) / a0_1;
    const a1_1 = 2 * (K1 * K1 - 1) / a0_1;
    const a2_1 = (1 - K1 / Q_1 + K1 * K1) / a0_1;

    // Stage 2: High-pass filter (RLB weighting)
    const f0_2 = 38.13547087602444;
    const Q_2 = 0.5003270373238773;
    const K2 = Math.tan(Math.PI * f0_2 / sampleRate);
    const a0_2 = 1 + K2 / Q_2 + K2 * K2;

    const b0_2 = 1 / a0_2;
    const b1_2 = -2 / a0_2;
    const b2_2 = 1 / a0_2;
    const a1_2 = 2 * (K2 * K2 - 1) / a0_2;
    const a2_2 = (1 - K2 / Q_2 + K2 * K2) / a0_2;

    // Apply stage 1
    let x1_1 = 0, x2_1 = 0, y1_1 = 0, y2_1 = 0;
    const stage1 = new Float32Array(samples.length);

    for (let i = 0; i < samples.length; i++) {
        const x = samples[i];
        const y = b0_1 * x + b1_1 * x1_1 + b2_1 * x2_1 - a1_1 * y1_1 - a2_1 * y2_1;
        x2_1 = x1_1; x1_1 = x;
        y2_1 = y1_1; y1_1 = y;
        stage1[i] = y;
    }

    // Apply stage 2
    let x1_2 = 0, x2_2 = 0, y1_2 = 0, y2_2 = 0;

    for (let i = 0; i < stage1.length; i++) {
        const x = stage1[i];
        const y = b0_2 * x + b1_2 * x1_2 + b2_2 * x2_2 - a1_2 * y1_2 - a2_2 * y2_2;
        x2_2 = x1_2; x1_2 = x;
        y2_2 = y1_2; y1_2 = y;
        output[i] = y;
    }

    return output;
}

/**
 * Calculate mean square of a block of samples
 */
function meanSquare(samples, start, length) {
    let sum = 0;
    const end = Math.min(start + length, samples.length);
    for (let i = start; i < end; i++) {
        sum += samples[i] * samples[i];
    }
    return sum / length;
}

/**
 * Calculate integrated LUFS per EBU R128
 */
export function calculateIntegratedLUFS(parsedAudio) {
    const { channels, sampleRate } = parsedAudio;
    const blockSize = Math.round(sampleRate * 0.4); // 400ms blocks
    const stepSize = Math.round(sampleRate * 0.1);  // 75% overlap (100ms step)
    const numSamples = channels[0].length;

    // Channel weights per ITU-R BS.1770
    const channelWeights = [1.0, 1.0, 1.0, 1.41, 1.41]; // L, R, C, Ls, Rs

    // K-weight each channel
    const kWeighted = channels.map(ch => applyKWeighting(ch, sampleRate));

    // Calculate block loudness values
    const blockLoudness = [];

    for (let start = 0; start + blockSize <= numSamples; start += stepSize) {
        let sumOfWeightedMeanSquares = 0;

        for (let ch = 0; ch < kWeighted.length; ch++) {
            const weight = channelWeights[ch] || 1.0;
            sumOfWeightedMeanSquares += weight * meanSquare(kWeighted[ch], start, blockSize);
        }

        const loudness = -0.691 + 10 * Math.log10(sumOfWeightedMeanSquares || 1e-10);
        blockLoudness.push(loudness);
    }

    // Gating: absolute threshold at -70 LUFS
    const ABSOLUTE_GATE = -70;
    const aboveAbsoluteGate = blockLoudness.filter(l => l > ABSOLUTE_GATE);

    if (aboveAbsoluteGate.length === 0) return -70;

    // Relative threshold: mean of blocks above absolute gate - 10 dB
    const meanAboveAbsolute = aboveAbsoluteGate.reduce((a, b) => a + Math.pow(10, b / 10), 0) / aboveAbsoluteGate.length;
    const relativeGate = 10 * Math.log10(meanAboveAbsolute) - 10;

    // Final integration: mean of blocks above relative gate
    const aboveRelativeGate = aboveAbsoluteGate.filter(l => l > relativeGate);

    if (aboveRelativeGate.length === 0) return -70;

    const meanAboveRelative = aboveRelativeGate.reduce((a, b) => a + Math.pow(10, b / 10), 0) / aboveRelativeGate.length;

    return Math.round(10 * Math.log10(meanAboveRelative) * 10) / 10;
}

/**
 * Calculate short-term LUFS (3-second blocks, 1-second step)
 */
export function calculateShortTermLUFS(parsedAudio) {
    const { channels, sampleRate } = parsedAudio;
    const blockSize = sampleRate * 3; // 3-second blocks
    const stepSize = sampleRate;      // 1-second step
    const numSamples = channels[0].length;

    const kWeighted = channels.map(ch => applyKWeighting(ch, sampleRate));
    const values = [];

    for (let start = 0; start + blockSize <= numSamples; start += stepSize) {
        let sum = 0;
        for (let ch = 0; ch < kWeighted.length; ch++) {
            sum += meanSquare(kWeighted[ch], start, blockSize);
        }

        const lufs = -0.691 + 10 * Math.log10(sum || 1e-10);
        values.push({
            time: start / sampleRate,
            lufs: Math.round(lufs * 10) / 10
        });
    }

    return values;
}

/**
 * Calculate momentary LUFS (400ms blocks)
 */
export function calculateMomentaryLUFS(parsedAudio) {
    const { channels, sampleRate } = parsedAudio;
    const blockSize = Math.round(sampleRate * 0.4);
    const stepSize = Math.round(sampleRate * 0.1);
    const numSamples = channels[0].length;

    const kWeighted = channels.map(ch => applyKWeighting(ch, sampleRate));
    let maxLUFS = -Infinity;

    for (let start = 0; start + blockSize <= numSamples; start += stepSize) {
        let sum = 0;
        for (let ch = 0; ch < kWeighted.length; ch++) {
            sum += meanSquare(kWeighted[ch], start, blockSize);
        }
        const lufs = -0.691 + 10 * Math.log10(sum || 1e-10);
        if (lufs > maxLUFS) maxLUFS = lufs;
    }

    return Math.round(maxLUFS * 10) / 10;
}

// ============================================
// PEAK & DYNAMICS ANALYSIS
// ============================================

/**
 * Calculate true peak using 4x oversampling
 */
export function calculateTruePeak(parsedAudio) {
    const { channels } = parsedAudio;
    let maxPeak = 0;

    for (const channel of channels) {
        // 4x oversampling with linear interpolation
        for (let i = 0; i < channel.length - 1; i++) {
            const s0 = Math.abs(channel[i]);
            const s1 = Math.abs(channel[i + 1]);

            // Check original samples
            if (s0 > maxPeak) maxPeak = s0;

            // Check interpolated samples (simplified 4x oversampling)
            for (let j = 1; j <= 3; j++) {
                const t = j / 4;
                const interp = Math.abs(channel[i] * (1 - t) + channel[i + 1] * t);
                if (interp > maxPeak) maxPeak = interp;
            }
        }

        // Check last sample
        const last = Math.abs(channel[channel.length - 1]);
        if (last > maxPeak) maxPeak = last;
    }

    return Math.round(20 * Math.log10(maxPeak || 1e-10) * 10) / 10;
}

/**
 * Calculate RMS level in dB
 */
function calculateRMS(channel) {
    let sum = 0;
    for (let i = 0; i < channel.length; i++) {
        sum += channel[i] * channel[i];
    }
    return 20 * Math.log10(Math.sqrt(sum / channel.length) || 1e-10);
}

/**
 * Calculate peak level in dB
 */
function calculatePeakdB(channel) {
    let max = 0;
    for (let i = 0; i < channel.length; i++) {
        const abs = Math.abs(channel[i]);
        if (abs > max) max = abs;
    }
    return 20 * Math.log10(max || 1e-10);
}

/**
 * Calculate dynamic range (difference between peak and RMS)
 */
export function calculateDynamicRange(parsedAudio) {
    const { channels } = parsedAudio;
    let totalPeak = -Infinity;
    let totalRMS = -Infinity;

    for (const channel of channels) {
        const peak = calculatePeakdB(channel);
        const rms = calculateRMS(channel);
        if (peak > totalPeak) totalPeak = peak;
        if (rms > totalRMS) totalRMS = rms;
    }

    return Math.round((totalPeak - totalRMS) * 10) / 10;
}

/**
 * Calculate crest factor
 */
export function calculateCrestFactor(parsedAudio) {
    const { channels } = parsedAudio;
    let maxPeak = 0;
    let totalSquared = 0;
    let totalSamples = 0;

    for (const channel of channels) {
        for (let i = 0; i < channel.length; i++) {
            const abs = Math.abs(channel[i]);
            if (abs > maxPeak) maxPeak = abs;
            totalSquared += channel[i] * channel[i];
            totalSamples++;
        }
    }

    const rms = Math.sqrt(totalSquared / totalSamples);
    return Math.round(20 * Math.log10((maxPeak / rms) || 1e-10) * 10) / 10;
}

// ============================================
// FREQUENCY SPECTRUM ANALYSIS
// ============================================

/**
 * Basic DFT for spectrum analysis (for small FFT sizes)
 * For production, this should use FFT (e.g., via WASM)
 */
function computeFFT(samples, fftSize) {
    const real = new Float64Array(fftSize);
    const imag = new Float64Array(fftSize);

    // Copy input with windowing (Hann window)
    const windowedLength = Math.min(samples.length, fftSize);
    for (let i = 0; i < windowedLength; i++) {
        const window = 0.5 * (1 - Math.cos(2 * Math.PI * i / (windowedLength - 1)));
        real[i] = samples[i] * window;
    }

    // Cooley-Tukey FFT (radix-2)
    const n = fftSize;
    const bits = Math.log2(n);

    // Bit reversal
    for (let i = 0; i < n; i++) {
        let j = 0;
        for (let k = 0; k < bits; k++) {
            j = (j << 1) | ((i >> k) & 1);
        }
        if (j > i) {
            [real[i], real[j]] = [real[j], real[i]];
            [imag[i], imag[j]] = [imag[j], imag[i]];
        }
    }

    // FFT butterfly
    for (let size = 2; size <= n; size *= 2) {
        const halfSize = size / 2;
        const angle = -2 * Math.PI / size;

        for (let i = 0; i < n; i += size) {
            for (let j = 0; j < halfSize; j++) {
                const cos = Math.cos(angle * j);
                const sin = Math.sin(angle * j);

                const tReal = real[i + j + halfSize] * cos - imag[i + j + halfSize] * sin;
                const tImag = real[i + j + halfSize] * sin + imag[i + j + halfSize] * cos;

                real[i + j + halfSize] = real[i + j] - tReal;
                imag[i + j + halfSize] = imag[i + j] - tImag;
                real[i + j] += tReal;
                imag[i + j] += tImag;
            }
        }
    }

    // Calculate magnitude spectrum in dB
    const magnitudes = new Float64Array(fftSize / 2);
    for (let i = 0; i < fftSize / 2; i++) {
        const mag = Math.sqrt(real[i] * real[i] + imag[i] * imag[i]) / fftSize;
        magnitudes[i] = 20 * Math.log10(mag || 1e-10);
    }

    return magnitudes;
}

/**
 * Analyze frequency spectrum — returns ISO 31-band analysis
 */
export function analyzeSpectrum(parsedAudio, fftSize = 8192) {
    const { channels, sampleRate } = parsedAudio;

    // Mix to mono for analysis
    const mono = new Float32Array(channels[0].length);
    for (let i = 0; i < mono.length; i++) {
        let sum = 0;
        for (const ch of channels) sum += ch[i];
        mono[i] = sum / channels.length;
    }

    // Use a segment from the middle of the audio for stable spectrum
    const segmentLength = Math.min(fftSize, mono.length);
    const start = Math.max(0, Math.floor((mono.length - segmentLength) / 2));
    const segment = mono.slice(start, start + segmentLength);

    const magnitudes = computeFFT(segment, fftSize);

    // ISO 1/3 octave center frequencies
    const isoFrequencies = [
        20, 25, 31.5, 40, 50, 63, 80, 100, 125, 160,
        200, 250, 315, 400, 500, 630, 800, 1000, 1250, 1600,
        2000, 2500, 3150, 4000, 5000, 6300, 8000, 10000, 12500, 16000, 20000
    ];

    const bandMagnitudes = isoFrequencies.map(freq => {
        const binIndex = Math.round(freq * fftSize / sampleRate);
        const halfBandwidth = Math.max(1, Math.round(binIndex * 0.115)); // ~1/3 octave

        let maxMag = -120;
        for (let i = Math.max(0, binIndex - halfBandwidth); i <= Math.min(magnitudes.length - 1, binIndex + halfBandwidth); i++) {
            if (magnitudes[i] > maxMag) maxMag = magnitudes[i];
        }
        return Math.round(maxMag * 10) / 10;
    });

    return {
        bands: isoFrequencies.length,
        frequencies: isoFrequencies,
        magnitudes: bandMagnitudes,
        fftSize,
        sampleRate
    };
}

// ============================================
// MASTERING PROCESSING CHAIN
// ============================================

/**
 * Apply a biquad filter to samples
 */
function applyBiquad(samples, type, frequency, sampleRate, gain = 0, Q = 1.0) {
    const w0 = 2 * Math.PI * frequency / sampleRate;
    const A = Math.pow(10, gain / 40);
    const cosw0 = Math.cos(w0);
    const sinw0 = Math.sin(w0);
    const alpha = sinw0 / (2 * Q);

    let b0, b1, b2, a0, a1, a2;

    switch (type) {
        case 'lowshelf':
            b0 = A * ((A + 1) - (A - 1) * cosw0 + 2 * Math.sqrt(A) * alpha);
            b1 = 2 * A * ((A - 1) - (A + 1) * cosw0);
            b2 = A * ((A + 1) - (A - 1) * cosw0 - 2 * Math.sqrt(A) * alpha);
            a0 = (A + 1) + (A - 1) * cosw0 + 2 * Math.sqrt(A) * alpha;
            a1 = -2 * ((A - 1) + (A + 1) * cosw0);
            a2 = (A + 1) + (A - 1) * cosw0 - 2 * Math.sqrt(A) * alpha;
            break;
        case 'highshelf':
            b0 = A * ((A + 1) + (A - 1) * cosw0 + 2 * Math.sqrt(A) * alpha);
            b1 = -2 * A * ((A - 1) + (A + 1) * cosw0);
            b2 = A * ((A + 1) + (A - 1) * cosw0 - 2 * Math.sqrt(A) * alpha);
            a0 = (A + 1) - (A - 1) * cosw0 + 2 * Math.sqrt(A) * alpha;
            a1 = 2 * ((A - 1) - (A + 1) * cosw0);
            a2 = (A + 1) - (A - 1) * cosw0 - 2 * Math.sqrt(A) * alpha;
            break;
        case 'peaking':
        default:
            b0 = 1 + alpha * A;
            b1 = -2 * cosw0;
            b2 = 1 - alpha * A;
            a0 = 1 + alpha / A;
            a1 = -2 * cosw0;
            a2 = 1 - alpha / A;
            break;
    }

    // Normalize
    b0 /= a0; b1 /= a0; b2 /= a0;
    a1 /= a0; a2 /= a0;

    // Apply filter
    const output = new Float32Array(samples.length);
    let x1 = 0, x2 = 0, y1 = 0, y2 = 0;

    for (let i = 0; i < samples.length; i++) {
        const x = samples[i];
        const y = b0 * x + b1 * x1 + b2 * x2 - a1 * y1 - a2 * y2;
        x2 = x1; x1 = x;
        y2 = y1; y1 = y;
        output[i] = y;
    }

    return output;
}

/**
 * Apply 7-band parametric EQ
 */
function applyEQ(channels, sampleRate, eqSettings) {
    const defaultBands = [
        { frequency: 60, type: 'lowshelf', gain: 0, q: 0.7 },
        { frequency: 170, type: 'peaking', gain: 0, q: 1.0 },
        { frequency: 400, type: 'peaking', gain: 0, q: 1.0 },
        { frequency: 1000, type: 'peaking', gain: 0, q: 1.0 },
        { frequency: 2500, type: 'peaking', gain: 0, q: 1.0 },
        { frequency: 6000, type: 'peaking', gain: 0, q: 1.0 },
        { frequency: 12000, type: 'highshelf', gain: 0, q: 0.7 }
    ];

    const bands = eqSettings?.bands || defaultBands;

    return channels.map(channel => {
        let processed = channel;
        for (const band of bands) {
            if (band.gain !== 0) {
                processed = applyBiquad(
                    processed, band.type, band.frequency,
                    sampleRate, band.gain, band.q || 1.0
                );
            }
        }
        return processed;
    });
}

/**
 * Apply dynamics compression
 */
function applyCompression(channels, sampleRate, settings) {
    const threshold = settings?.threshold ?? -18;   // dB
    const ratio = settings?.ratio ?? 3;
    const attack = (settings?.attack ?? 10) / 1000; // ms to seconds
    const release = (settings?.release ?? 100) / 1000;
    const knee = settings?.knee ?? 6;                // dB

    const attackCoeff = Math.exp(-1 / (sampleRate * attack));
    const releaseCoeff = Math.exp(-1 / (sampleRate * release));

    return channels.map(channel => {
        const output = new Float32Array(channel.length);
        let envelope = 0;

        for (let i = 0; i < channel.length; i++) {
            const inputDb = 20 * Math.log10(Math.abs(channel[i]) || 1e-10);

            // Soft knee
            let gainReduction = 0;
            if (inputDb > threshold + knee / 2) {
                gainReduction = (inputDb - threshold) * (1 - 1 / ratio);
            } else if (inputDb > threshold - knee / 2) {
                const x = inputDb - threshold + knee / 2;
                gainReduction = (x * x) / (2 * knee) * (1 - 1 / ratio);
            }

            // Envelope follower
            if (gainReduction > envelope) {
                envelope = attackCoeff * envelope + (1 - attackCoeff) * gainReduction;
            } else {
                envelope = releaseCoeff * envelope + (1 - releaseCoeff) * gainReduction;
            }

            // Apply gain reduction
            const linearGain = Math.pow(10, -envelope / 20);
            output[i] = channel[i] * linearGain;
        }

        return output;
    });
}

/**
 * Apply brick-wall limiter with look-ahead
 */
function applyLimiter(channels, sampleRate, settings) {
    const ceiling = Math.pow(10, (settings?.ceiling ?? -0.3) / 20); // dB to linear
    const releaseMs = settings?.release ?? 50;
    const lookAheadMs = settings?.lookAhead ?? 5;

    const lookAheadSamples = Math.round(sampleRate * lookAheadMs / 1000);
    const releaseCoeff = Math.exp(-1 / (sampleRate * releaseMs / 1000));

    return channels.map(channel => {
        const output = new Float32Array(channel.length);
        let gain = 1.0;

        for (let i = 0; i < channel.length; i++) {
            // Look ahead for peaks
            let maxPeak = 0;
            for (let j = i; j < Math.min(i + lookAheadSamples, channel.length); j++) {
                const abs = Math.abs(channel[j]);
                if (abs > maxPeak) maxPeak = abs;
            }

            // Calculate needed gain reduction
            const targetGain = maxPeak > ceiling ? ceiling / maxPeak : 1.0;

            // Smooth gain changes
            if (targetGain < gain) {
                gain = targetGain; // Instant attack
            } else {
                gain = releaseCoeff * gain + (1 - releaseCoeff) * targetGain;
            }

            output[i] = channel[i] * gain;

            // Hard clip as safety net
            if (output[i] > ceiling) output[i] = ceiling;
            if (output[i] < -ceiling) output[i] = -ceiling;
        }

        return output;
    });
}

/**
 * Apply stereo width adjustment
 */
function applyStereoWidth(channels, width = 100) {
    if (channels.length < 2) return channels;

    const widthFactor = width / 100;
    const left = channels[0];
    const right = channels[1];
    const outLeft = new Float32Array(left.length);
    const outRight = new Float32Array(right.length);

    for (let i = 0; i < left.length; i++) {
        const mid = (left[i] + right[i]) / 2;
        const side = (left[i] - right[i]) / 2;
        outLeft[i] = mid + side * widthFactor;
        outRight[i] = mid - side * widthFactor;
    }

    return [outLeft, outRight, ...channels.slice(2)];
}

/**
 * Apply gain (in dB)
 */
function applyGain(channels, gainDb) {
    const linearGain = Math.pow(10, gainDb / 20);
    return channels.map(channel => {
        const output = new Float32Array(channel.length);
        for (let i = 0; i < channel.length; i++) {
            output[i] = channel[i] * linearGain;
        }
        return output;
    });
}

/**
 * Apply TPDF dithering for bit-depth reduction
 */
function applyDither(channels, targetBitDepth) {
    if (targetBitDepth >= 32) return channels; // No dithering needed for float

    const maxVal = Math.pow(2, targetBitDepth - 1);
    const ditherAmp = 1 / maxVal;

    return channels.map(channel => {
        const output = new Float32Array(channel.length);
        for (let i = 0; i < channel.length; i++) {
            // TPDF dither: sum of two uniform random values
            const dither = (Math.random() - 0.5 + Math.random() - 0.5) * ditherAmp;
            output[i] = channel[i] + dither;
        }
        return output;
    });
}

/**
 * Full mastering chain
 */
export function masterAudio(parsedAudio, settings = {}) {
    let { channels, sampleRate } = parsedAudio;

    // 1. EQ
    if (settings.eq?.enabled !== false) {
        channels = applyEQ(channels, sampleRate, settings.eq);
    }

    // 2. Compression
    if (settings.dynamics?.compressor?.enabled !== false) {
        channels = applyCompression(channels, sampleRate, settings.dynamics?.compressor);
    }

    // 3. Stereo width
    if (settings.stereo?.width && settings.stereo.width !== 100) {
        channels = applyStereoWidth(channels, settings.stereo.width);
    }

    // 4. Master gain
    if (settings.masterGain) {
        channels = applyGain(channels, settings.masterGain);
    }

    // 5. Limiter (always on for safety)
    channels = applyLimiter(channels, sampleRate, settings.dynamics?.limiter || {});

    // Analyze result
    const processed = { channels, sampleRate, numChannels: channels.length, numSamples: channels[0].length, duration: channels[0].length / sampleRate };
    const analysis = {
        lufs: calculateIntegratedLUFS(processed),
        truePeak: calculateTruePeak(processed),
        dynamicRange: calculateDynamicRange(processed),
        crestFactor: calculateCrestFactor(processed)
    };

    return {
        channels,
        sampleRate,
        analysis,
        appliedSettings: settings
    };
}

/**
 * Auto-master: analyze input and apply appropriate processing
 */
export function autoMaster(parsedAudio, options = {}) {
    const { targetPlatform = 'spotify' } = options;

    // Platform targets
    const platformTargets = {
        spotify: { lufs: -14, truePeak: -1.0 },
        appleMusic: { lufs: -16, truePeak: -1.0 },
        youtube: { lufs: -14, truePeak: -1.0 },
        tidal: { lufs: -14, truePeak: -1.0 },
        podcast: { lufs: -16, truePeak: -2.0 },
        broadcast: { lufs: -24, truePeak: -2.0 }
    };

    const target = platformTargets[targetPlatform] || platformTargets.spotify;

    // Analyze input
    const inputAnalysis = {
        lufs: calculateIntegratedLUFS(parsedAudio),
        truePeak: calculateTruePeak(parsedAudio),
        dynamicRange: calculateDynamicRange(parsedAudio),
        crestFactor: calculateCrestFactor(parsedAudio)
    };

    // Determine genre-aware settings
    const lufsOffset = target.lufs - inputAnalysis.lufs;
    const needsCompression = inputAnalysis.dynamicRange > 14;

    const settings = {
        eq: { enabled: true, bands: [
            { frequency: 60, type: 'lowshelf', gain: 0, q: 0.7 },
            { frequency: 170, type: 'peaking', gain: 0, q: 1.0 },
            { frequency: 400, type: 'peaking', gain: -1, q: 1.0 },  // Slight mud cut
            { frequency: 1000, type: 'peaking', gain: 0, q: 1.0 },
            { frequency: 2500, type: 'peaking', gain: 0.5, q: 1.0 }, // Presence boost
            { frequency: 6000, type: 'peaking', gain: 0, q: 1.0 },
            { frequency: 12000, type: 'highshelf', gain: 1, q: 0.7 } // Air
        ]},
        dynamics: {
            compressor: {
                enabled: needsCompression,
                threshold: -18,
                ratio: needsCompression ? 3 : 2,
                attack: 10,
                release: 100,
                knee: 6
            },
            limiter: {
                ceiling: target.truePeak,
                release: 50,
                lookAhead: 5
            }
        },
        stereo: { width: 100 },
        masterGain: lufsOffset
    };

    const result = masterAudio(parsedAudio, settings);

    return {
        ...result,
        detectedGenre: 'auto',
        targetPlatform,
        targetLUFS: target.lufs,
        inputAnalysis,
        autoSettings: settings
    };
}

// ============================================
// EXPORT PROCESSING
// ============================================

/**
 * Export audio in specified format with dithering
 */
export function exportAudio(parsedAudio, options = {}) {
    const {
        bitDepth = 24,
        sampleRate = 48000,
        normalize = true,
        dither = true
    } = options;

    let { channels } = parsedAudio;

    // Normalize to target peak
    if (normalize) {
        let maxPeak = 0;
        for (const ch of channels) {
            for (let i = 0; i < ch.length; i++) {
                const abs = Math.abs(ch[i]);
                if (abs > maxPeak) maxPeak = abs;
            }
        }

        if (maxPeak > 0 && maxPeak !== 1.0) {
            const targetPeak = 0.99; // -0.09 dBFS headroom
            const gain = targetPeak / maxPeak;
            channels = channels.map(ch => {
                const out = new Float32Array(ch.length);
                for (let i = 0; i < ch.length; i++) out[i] = ch[i] * gain;
                return out;
            });
        }
    }

    // Apply dithering for bit-depth reduction
    if (dither && bitDepth < 32) {
        channels = applyDither(channels, bitDepth);
    }

    const wavBuffer = encodeWav(channels, parsedAudio.sampleRate, bitDepth);

    return {
        buffer: wavBuffer,
        format: 'wav',
        bitDepth,
        sampleRate: parsedAudio.sampleRate,
        size: wavBuffer.length,
        checksum: createChecksum(wavBuffer)
    };
}

/**
 * Simple checksum for file integrity
 */
function createChecksum(buffer) {
    let hash = 0;
    for (let i = 0; i < buffer.length; i += 1024) {
        hash = ((hash << 5) - hash + buffer[i]) | 0;
    }
    return Math.abs(hash).toString(16).padStart(8, '0');
}
