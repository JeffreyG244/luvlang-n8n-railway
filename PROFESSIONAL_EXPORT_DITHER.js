/**
 * PROFESSIONAL EXPORT DITHER - Triangular Dither for Bit-Depth Reduction
 * ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 *
 * Prevents "Quantization Distortion" when exporting from 32-bit float to 16/24-bit integer.
 *
 * Without Dither:
 * - Fades sound grainy and unnatural
 * - Low-level detail is lost
 * - Quantization errors create correlated distortion
 *
 * With Triangular Dither:
 * - Smooth, natural fades
 * - Preserves depth and detail
 * - Randomizes quantization error (inaudible noise floor)
 *
 * Industry Standard:
 * - Used by Pro Tools, Logic Pro, Cubase, Ableton
 * - Required for "Mastered for iTunes" / Apple Digital Masters
 * - Essential for high-quality digital distribution
 *
 * Implementation:
 * - Triangular PDF (Probability Distribution Function)
 * - 2 random samples (RPDF) for smooth noise
 * - Applied at target bit depth LSB (Least Significant Bit)
 * - Auto-scales for 16-bit or 24-bit export
 */

(function() {
    'use strict';

    /**
     * Triangular Dither Generator
     * Uses TPDF (Triangular Probability Distribution Function)
     * for optimal noise shaping
     */
    class TriangularDither {
        constructor() {
            this.lastRandom = [0, 0]; // Stereo state
        }

        /**
         * Generate dither value for given bit depth
         * @param {number} bitDepth - Target bit depth (16 or 24)
         * @param {number} channel - Channel index (0 = left, 1 = right)
         * @returns {number} Dither value in float range
         */
        generate(bitDepth, channel = 0) {
            // Calculate quantization step for target bit depth
            // 16-bit: 1 / 32768
            // 24-bit: 1 / 8388608
            const quantizationStep = 1.0 / Math.pow(2, bitDepth - 1);

            // Triangular PDF: sum of two uniform random values
            // This creates a smoother, more natural noise than rectangular PDF
            const random1 = (Math.random() * 2.0 - 1.0); // -1.0 to +1.0
            const random2 = (Math.random() * 2.0 - 1.0);

            // Triangular dither = sum of two random values
            // Peak amplitude: ±2 LSB (quantization steps)
            const ditherValue = (random1 + random2) * quantizationStep * 0.5;

            return ditherValue;
        }

        /**
         * Apply dither to audio sample
         * @param {number} sample - Input sample (32-bit float)
         * @param {number} bitDepth - Target bit depth
         * @param {number} channel - Channel index
         * @returns {number} Dithered sample
         */
        applySample(sample, bitDepth, channel = 0) {
            const ditherValue = this.generate(bitDepth, channel);
            return sample + ditherValue;
        }

        /**
         * Apply dither to entire buffer
         * @param {Float32Array} buffer - Audio buffer
         * @param {number} bitDepth - Target bit depth (16 or 24)
         * @returns {Float32Array} Dithered buffer
         */
        applyBuffer(buffer, bitDepth) {
            const dithered = new Float32Array(buffer.length);

            for (let i = 0; i < buffer.length; i++) {
                dithered[i] = this.applySample(buffer[i], bitDepth, 0);
            }

            return dithered;
        }

        /**
         * Apply dither to stereo AudioBuffer
         * @param {AudioBuffer} audioBuffer - Input buffer
         * @param {number} bitDepth - Target bit depth (16 or 24)
         * @returns {AudioBuffer} Dithered buffer
         */
        applyStereoBuffer(audioBuffer, bitDepth) {
            const numChannels = audioBuffer.numberOfChannels;
            const length = audioBuffer.length;
            const sampleRate = audioBuffer.sampleRate;

            // Create output buffer (same specs as input)
            const offlineCtx = new OfflineAudioContext(numChannels, length, sampleRate);
            const ditheredBuffer = offlineCtx.createBuffer(numChannels, length, sampleRate);

            // Process each channel
            for (let ch = 0; ch < numChannels; ch++) {
                const inputData = audioBuffer.getChannelData(ch);
                const outputData = ditheredBuffer.getChannelData(ch);

                for (let i = 0; i < length; i++) {
                    outputData[i] = this.applySample(inputData[i], bitDepth, ch);
                }
            }

            return ditheredBuffer;
        }

        /**
         * Reset internal state (for batch processing)
         */
        reset() {
            this.lastRandom = [0, 0];
        }
    }

    /**
     * Enhanced WAV Encoder with Dither Support
     */
    class ProfessionalWAVEncoder {
        /**
         * Encode AudioBuffer to WAV with dithering
         * @param {AudioBuffer} audioBuffer - Input audio
         * @param {number} bitDepth - Output bit depth (16 or 24)
         * @param {boolean} applyDither - Enable dithering (default: true)
         * @returns {ArrayBuffer} WAV file data
         */
        static encode(audioBuffer, bitDepth = 24, applyDither = true) {
            const numChannels = audioBuffer.numberOfChannels;
            const sampleRate = audioBuffer.sampleRate;
            const length = audioBuffer.length;

            // Apply dither if requested
            let processedBuffer = audioBuffer;
            if (applyDither) {
                console.log(`🎚️ Applying triangular dither for ${bitDepth}-bit export...`);
                const dither = new TriangularDither();
                processedBuffer = dither.applyStereoBuffer(audioBuffer, bitDepth);
            }

            // Calculate sizes
            const bytesPerSample = bitDepth / 8;
            const blockAlign = numChannels * bytesPerSample;
            const dataSize = length * blockAlign;
            const headerSize = 44;
            const fileSize = headerSize + dataSize;

            // Create buffer
            const arrayBuffer = new ArrayBuffer(fileSize);
            const view = new DataView(arrayBuffer);

            // Write WAV header
            this.writeString(view, 0, 'RIFF');
            view.setUint32(4, fileSize - 8, true);
            this.writeString(view, 8, 'WAVE');

            // fmt chunk
            this.writeString(view, 12, 'fmt ');
            view.setUint32(16, 16, true); // Chunk size
            view.setUint16(20, 1, true); // Audio format (PCM)
            view.setUint16(22, numChannels, true);
            view.setUint32(24, sampleRate, true);
            view.setUint32(28, sampleRate * blockAlign, true); // Byte rate
            view.setUint16(32, blockAlign, true);
            view.setUint16(34, bitDepth, true);

            // data chunk
            this.writeString(view, 36, 'data');
            view.setUint32(40, dataSize, true);

            // Write audio data
            let offset = 44;
            const maxValue = Math.pow(2, bitDepth - 1) - 1;

            for (let i = 0; i < length; i++) {
                for (let ch = 0; ch < numChannels; ch++) {
                    const sample = processedBuffer.getChannelData(ch)[i];

                    // Clamp to [-1, 1]
                    const clamped = Math.max(-1, Math.min(1, sample));

                    // Scale to integer range
                    const scaled = Math.round(clamped * maxValue);

                    // Write sample
                    if (bitDepth === 16) {
                        view.setInt16(offset, scaled, true);
                        offset += 2;
                    } else if (bitDepth === 24) {
                        // 24-bit is stored as 3 bytes (little-endian)
                        view.setUint8(offset, scaled & 0xFF);
                        view.setUint8(offset + 1, (scaled >> 8) & 0xFF);
                        view.setUint8(offset + 2, (scaled >> 16) & 0xFF);
                        offset += 3;
                    }
                }
            }

            return arrayBuffer;
        }

        /**
         * Write ASCII string to DataView
         */
        static writeString(view, offset, string) {
            for (let i = 0; i < string.length; i++) {
                view.setUint8(offset + i, string.charCodeAt(i));
            }
        }
    }

    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // GLOBAL EXPORTS
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

    window.TriangularDither = TriangularDither;
    window.ProfessionalWAVEncoder = ProfessionalWAVEncoder;

    console.log('✅ Professional Export Dither loaded');

})();

/**
 * USAGE EXAMPLE
 * ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 *
 * // Export with dither (recommended)
 * const wavData = ProfessionalWAVEncoder.encode(audioBuffer, 24, true);
 *
 * // Export without dither (not recommended for final masters)
 * const wavDataNoDither = ProfessionalWAVEncoder.encode(audioBuffer, 24, false);
 *
 * // Manual dither application
 * const dither = new TriangularDither();
 * const ditheredBuffer = dither.applyStereoBuffer(audioBuffer, 24);
 *
 * // Download file
 * const blob = new Blob([wavData], { type: 'audio/wav' });
 * const url = URL.createObjectURL(blob);
 * const a = document.createElement('a');
 * a.href = url;
 * a.download = 'master_dithered_24bit.wav';
 * a.click();
 */
