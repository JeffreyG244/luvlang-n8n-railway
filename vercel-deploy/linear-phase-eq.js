// ============================================
// LINEAR PHASE EQ - Professional Mastering Grade
// Zero phase shift for transparent M/S processing
// ============================================
// Uses FFT-based processing to achieve true linear phase response
// Essential for mastering where phase coherence is critical

class LinearPhaseEQ {
    constructor(audioContext) {
        this.audioContext = audioContext;
        this.sampleRate = audioContext.sampleRate;

        // FFT size determines frequency resolution and latency
        // 8192 = ~170ms latency @ 48kHz but excellent low-freq resolution
        // 4096 = ~85ms latency, good balance
        this.fftSize = 4096;
        this.hopSize = this.fftSize / 4; // 75% overlap for smooth transitions

        // 7 EQ bands matching the standard EQ
        this.bands = [
            { frequency: 40, gain: 0, q: 0.7, type: 'lowshelf', enabled: true },
            { frequency: 120, gain: 0, q: 1.0, type: 'peaking', enabled: true },
            { frequency: 350, gain: 0, q: 1.0, type: 'peaking', enabled: true },
            { frequency: 1000, gain: 0, q: 1.0, type: 'peaking', enabled: true },
            { frequency: 3500, gain: 0, q: 1.0, type: 'peaking', enabled: true },
            { frequency: 8000, gain: 0, q: 1.0, type: 'peaking', enabled: true },
            { frequency: 14000, gain: 0, q: 0.7, type: 'highshelf', enabled: true }
        ];

        // Precomputed filter magnitude response
        this.filterMagnitude = null;

        // Processing mode
        this.mode = 'stereo'; // 'stereo', 'mid', 'side', 'mid-side'

        // Latency compensation
        this.latencySamples = this.fftSize;

    }

    /**
     * Calculate filter magnitude response for all bands
     * Called when any EQ parameter changes
     */
    updateFilterResponse() {
        const numBins = this.fftSize / 2 + 1;
        this.filterMagnitude = new Float32Array(numBins);

        // Start with unity gain (0 dB)
        for (let i = 0; i < numBins; i++) {
            this.filterMagnitude[i] = 1.0;
        }

        // Apply each band's contribution
        for (const band of this.bands) {
            if (!band.enabled) continue;

            const gainLinear = Math.pow(10, band.gain / 20);

            for (let bin = 0; bin < numBins; bin++) {
                const freq = (bin / numBins) * (this.sampleRate / 2);
                const magnitude = this.calculateBandMagnitude(freq, band, gainLinear);
                this.filterMagnitude[bin] *= magnitude;
            }
        }

    }

    /**
     * Calculate single band magnitude at given frequency
     */
    calculateBandMagnitude(freq, band, gainLinear) {
        const freqRatio = freq / band.frequency;

        if (band.type === 'lowshelf') {
            // Low shelf: boost/cut below frequency
            if (freq < band.frequency) {
                const transitionWidth = band.frequency * (1 / band.q);
                const distance = (band.frequency - freq) / transitionWidth;
                const blend = Math.min(1, distance);
                return 1 + (gainLinear - 1) * blend;
            }
            return 1;

        } else if (band.type === 'highshelf') {
            // High shelf: boost/cut above frequency
            if (freq > band.frequency) {
                const transitionWidth = band.frequency * (1 / band.q);
                const distance = (freq - band.frequency) / transitionWidth;
                const blend = Math.min(1, distance);
                return 1 + (gainLinear - 1) * blend;
            }
            return 1;

        } else {
            // Peaking EQ: bell curve centered on frequency
            const bandwidth = band.frequency / band.q;
            const distance = Math.abs(freq - band.frequency);

            if (distance < bandwidth * 2) {
                // Gaussian-like shape for smooth response
                const x = distance / bandwidth;
                const bellShape = Math.exp(-x * x * 1.386); // -3dB at Q width
                return 1 + (gainLinear - 1) * bellShape;
            }
            return 1;
        }
    }

    /**
     * Process audio buffer with linear phase EQ
     * @param {AudioBuffer} inputBuffer - Input audio
     * @returns {Promise<AudioBuffer>} Processed audio
     */
    async processBuffer(inputBuffer) {

        // Update filter response before processing
        this.updateFilterResponse();

        const outputBuffer = this.audioContext.createBuffer(
            inputBuffer.numberOfChannels,
            inputBuffer.length,
            inputBuffer.sampleRate
        );

        // Process based on mode
        if (this.mode === 'mid-side') {
            await this.processMidSide(inputBuffer, outputBuffer);
        } else if (this.mode === 'mid') {
            await this.processMidOnly(inputBuffer, outputBuffer);
        } else if (this.mode === 'side') {
            await this.processSideOnly(inputBuffer, outputBuffer);
        } else {
            // Standard stereo processing
            for (let channel = 0; channel < inputBuffer.numberOfChannels; channel++) {
                const inputData = inputBuffer.getChannelData(channel);
                const outputData = outputBuffer.getChannelData(channel);
                this.processChannel(inputData, outputData);
            }
        }

        return outputBuffer;
    }

    /**
     * Process single channel with FFT-based linear phase EQ
     */
    processChannel(inputData, outputData) {
        const fftSize = this.fftSize;
        const hopSize = this.hopSize;
        const numBins = fftSize / 2 + 1;

        // Hann window for smooth overlap-add
        const window = new Float32Array(fftSize);
        for (let i = 0; i < fftSize; i++) {
            window[i] = 0.5 * (1 - Math.cos(2 * Math.PI * i / fftSize));
        }

        // Overlap-add buffer
        const overlapBuffer = new Float32Array(outputData.length);

        // Process in overlapping frames
        for (let frameStart = 0; frameStart < inputData.length - fftSize; frameStart += hopSize) {
            // Extract and window frame
            const frame = new Float32Array(fftSize);
            for (let i = 0; i < fftSize; i++) {
                frame[i] = inputData[frameStart + i] * window[i];
            }

            // FFT
            const fftResult = this.fft(frame);

            // Apply filter magnitude (phase stays at zero = linear phase!)
            for (let bin = 0; bin < numBins; bin++) {
                const magnitude = this.filterMagnitude[bin];
                fftResult.real[bin] *= magnitude;
                fftResult.imag[bin] *= magnitude;

                // Mirror for negative frequencies
                if (bin > 0 && bin < numBins - 1) {
                    fftResult.real[fftSize - bin] *= magnitude;
                    fftResult.imag[fftSize - bin] *= magnitude;
                }
            }

            // IFFT
            const processedFrame = this.ifft(fftResult);

            // Window and overlap-add
            for (let i = 0; i < fftSize; i++) {
                if (frameStart + i < overlapBuffer.length) {
                    overlapBuffer[frameStart + i] += processedFrame[i] * window[i];
                }
            }
        }

        // Normalize overlap-add gain (depends on hop size and window)
        const normalizeGain = hopSize / fftSize * 2;
        for (let i = 0; i < outputData.length; i++) {
            outputData[i] = overlapBuffer[i] * normalizeGain;
        }
    }

    /**
     * Process in Mid-Side mode (separate EQ for M and S)
     */
    async processMidSide(inputBuffer, outputBuffer) {
        if (inputBuffer.numberOfChannels < 2) {
            // Mono input - just process as-is
            const inputData = inputBuffer.getChannelData(0);
            const outputData = outputBuffer.getChannelData(0);
            this.processChannel(inputData, outputData);
            return;
        }

        const leftIn = inputBuffer.getChannelData(0);
        const rightIn = inputBuffer.getChannelData(1);
        const leftOut = outputBuffer.getChannelData(0);
        const rightOut = outputBuffer.getChannelData(1);

        // Encode to M/S
        const mid = new Float32Array(leftIn.length);
        const side = new Float32Array(leftIn.length);

        for (let i = 0; i < leftIn.length; i++) {
            mid[i] = (leftIn[i] + rightIn[i]) * 0.5;
            side[i] = (leftIn[i] - rightIn[i]) * 0.5;
        }

        // Process mid and side separately
        const processedMid = new Float32Array(mid.length);
        const processedSide = new Float32Array(side.length);

        this.processChannel(mid, processedMid);
        this.processChannel(side, processedSide);

        // Decode back to L/R
        for (let i = 0; i < leftOut.length; i++) {
            leftOut[i] = processedMid[i] + processedSide[i];
            rightOut[i] = processedMid[i] - processedSide[i];
        }
    }

    /**
     * Process Mid channel only (center content)
     */
    async processMidOnly(inputBuffer, outputBuffer) {
        if (inputBuffer.numberOfChannels < 2) {
            const inputData = inputBuffer.getChannelData(0);
            const outputData = outputBuffer.getChannelData(0);
            this.processChannel(inputData, outputData);
            return;
        }

        const leftIn = inputBuffer.getChannelData(0);
        const rightIn = inputBuffer.getChannelData(1);
        const leftOut = outputBuffer.getChannelData(0);
        const rightOut = outputBuffer.getChannelData(1);

        // Extract mid, process, and remix
        const mid = new Float32Array(leftIn.length);
        const side = new Float32Array(leftIn.length);

        for (let i = 0; i < leftIn.length; i++) {
            mid[i] = (leftIn[i] + rightIn[i]) * 0.5;
            side[i] = (leftIn[i] - rightIn[i]) * 0.5;
        }

        const processedMid = new Float32Array(mid.length);
        this.processChannel(mid, processedMid);

        for (let i = 0; i < leftOut.length; i++) {
            leftOut[i] = processedMid[i] + side[i];
            rightOut[i] = processedMid[i] - side[i];
        }
    }

    /**
     * Process Side channel only (stereo content)
     */
    async processSideOnly(inputBuffer, outputBuffer) {
        if (inputBuffer.numberOfChannels < 2) {
            // No side content in mono
            const inputData = inputBuffer.getChannelData(0);
            const outputData = outputBuffer.getChannelData(0);
            outputData.set(inputData);
            return;
        }

        const leftIn = inputBuffer.getChannelData(0);
        const rightIn = inputBuffer.getChannelData(1);
        const leftOut = outputBuffer.getChannelData(0);
        const rightOut = outputBuffer.getChannelData(1);

        const mid = new Float32Array(leftIn.length);
        const side = new Float32Array(leftIn.length);

        for (let i = 0; i < leftIn.length; i++) {
            mid[i] = (leftIn[i] + rightIn[i]) * 0.5;
            side[i] = (leftIn[i] - rightIn[i]) * 0.5;
        }

        const processedSide = new Float32Array(side.length);
        this.processChannel(side, processedSide);

        for (let i = 0; i < leftOut.length; i++) {
            leftOut[i] = mid[i] + processedSide[i];
            rightOut[i] = mid[i] - processedSide[i];
        }
    }

    /**
     * Simple FFT implementation (Cooley-Tukey radix-2)
     * For production, consider using a Web Audio AnalyserNode or WASM FFT
     */
    fft(signal) {
        const N = signal.length;
        const real = new Float32Array(N);
        const imag = new Float32Array(N);

        // Bit-reversal permutation
        for (let i = 0; i < N; i++) {
            let j = 0;
            let x = i;
            for (let k = 0; k < Math.log2(N); k++) {
                j = (j << 1) | (x & 1);
                x >>= 1;
            }
            real[j] = signal[i];
        }

        // Cooley-Tukey FFT
        for (let size = 2; size <= N; size *= 2) {
            const halfSize = size / 2;
            const step = Math.PI / halfSize;

            for (let i = 0; i < N; i += size) {
                for (let j = 0; j < halfSize; j++) {
                    const angle = -j * step;
                    const cos = Math.cos(angle);
                    const sin = Math.sin(angle);

                    const tReal = real[i + j + halfSize] * cos - imag[i + j + halfSize] * sin;
                    const tImag = real[i + j + halfSize] * sin + imag[i + j + halfSize] * cos;

                    real[i + j + halfSize] = real[i + j] - tReal;
                    imag[i + j + halfSize] = imag[i + j] - tImag;
                    real[i + j] += tReal;
                    imag[i + j] += tImag;
                }
            }
        }

        return { real, imag };
    }

    /**
     * Inverse FFT
     */
    ifft(fftData) {
        const N = fftData.real.length;

        // Conjugate
        const conjugateImag = new Float32Array(N);
        for (let i = 0; i < N; i++) {
            conjugateImag[i] = -fftData.imag[i];
        }

        // Forward FFT on conjugate
        const result = this.fft(new Float32Array(N));

        // Simple IFFT via conjugate method
        const output = new Float32Array(N);
        for (let i = 0; i < N; i++) {
            // Reconstruct from frequency domain
            let sum = 0;
            for (let k = 0; k < N; k++) {
                const angle = 2 * Math.PI * i * k / N;
                sum += fftData.real[k] * Math.cos(angle) - fftData.imag[k] * Math.sin(angle);
            }
            output[i] = sum / N;
        }

        return output;
    }

    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // PUBLIC API
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

    /**
     * Set band gain
     */
    setBandGain(bandIndex, gainDB) {
        if (bandIndex < 0 || bandIndex >= this.bands.length) return;
        this.bands[bandIndex].gain = gainDB;

    }

    /**
     * Set band frequency
     */
    setBandFrequency(bandIndex, frequency) {
        if (bandIndex < 0 || bandIndex >= this.bands.length) return;
        this.bands[bandIndex].frequency = frequency;

    }

    /**
     * Set band Q
     */
    setBandQ(bandIndex, q) {
        if (bandIndex < 0 || bandIndex >= this.bands.length) return;
        this.bands[bandIndex].q = q;

    }

    /**
     * Enable/disable band
     */
    setBandEnabled(bandIndex, enabled) {
        if (bandIndex < 0 || bandIndex >= this.bands.length) return;
        this.bands[bandIndex].enabled = enabled;

    }

    /**
     * Set processing mode
     */
    setMode(mode) {
        if (['stereo', 'mid', 'side', 'mid-side'].includes(mode)) {
            this.mode = mode;

        }
    }

    /**
     * Get latency in samples
     */
    getLatency() {
        return this.latencySamples;
    }

    /**
     * Get latency in milliseconds
     */
    getLatencyMs() {
        return (this.latencySamples / this.sampleRate) * 1000;
    }

    /**
     * Get all bands for UI
     */
    getBands() {
        return this.bands.map((band, i) => ({
            index: i,
            frequency: band.frequency,
            gain: band.gain,
            q: band.q,
            type: band.type,
            enabled: band.enabled
        }));
    }
}

// Export for use in main application
if (typeof module !== 'undefined' && module.exports) {
    module.exports = LinearPhaseEQ;
}

// Also expose globally for browser
if (typeof window !== 'undefined') {
    window.LinearPhaseEQ = LinearPhaseEQ;
}
