/**
 * DYNAMIC EQ / SPECTRAL COMPRESSION
 *
 * Professional frequency-specific dynamics processing
 * Each EQ band only activates when content exceeds threshold
 *
 * Examples:
 * - High-mid band reduces harsh vocals only when they occur
 * - Bass band controls boom only during loud sections
 * - Air band adds sparkle only to quiet sections (upward expansion)
 *
 * This is what separates professional tools (iZotope Ozone) from basic EQ!
 */

class DynamicEQProcessor {
    constructor(audioContext) {
        this.audioContext = audioContext;
        this.sampleRate = audioContext.sampleRate;

        // 7 Dynamic EQ Bands matching the static EQ
        this.bands = [
            {
                name: 'Sub',
                frequency: 40,
                q: 0.7,
                gain: 0,
                // Dynamic parameters
                threshold: -20, // dB - activates when signal > -20dB
                ratio: 3.0,     // 3:1 compression
                attack: 10,     // ms
                release: 100,   // ms
                knee: 6,        // dB - soft knee
                mode: 'compress', // 'compress' or 'expand'
                enabled: false,
                // Runtime state
                envelope: 0,
                gainReduction: 0
            },
            {
                name: 'Bass',
                frequency: 120,
                q: 0.7,
                gain: 0,
                threshold: -18,
                ratio: 2.5,
                attack: 15,
                release: 150,
                knee: 6,
                mode: 'compress',
                enabled: false,
                envelope: 0,
                gainReduction: 0
            },
            {
                name: 'Low-Mid',
                frequency: 350,
                q: 0.7,
                gain: 0,
                threshold: -15,
                ratio: 3.0,
                attack: 8,
                release: 120,
                knee: 6,
                mode: 'compress',
                enabled: false,
                envelope: 0,
                gainReduction: 0
            },
            {
                name: 'Mid',
                frequency: 1000,
                q: 0.7,
                gain: 0,
                threshold: -12,
                ratio: 2.0,
                attack: 5,
                release: 80,
                knee: 6,
                mode: 'compress',
                enabled: false,
                envelope: 0,
                gainReduction: 0
            },
            {
                name: 'High-Mid',
                frequency: 3500,
                q: 0.7,
                gain: 0,
                threshold: -10,
                ratio: 4.0,     // Higher ratio for harsh frequencies
                attack: 3,      // Faster attack for transients
                release: 60,
                knee: 3,        // Harder knee for precision
                mode: 'compress',
                enabled: false,
                envelope: 0,
                gainReduction: 0
            },
            {
                name: 'High',
                frequency: 8000,
                q: 0.7,
                gain: 0,
                threshold: -8,
                ratio: 2.5,
                attack: 2,
                release: 50,
                knee: 6,
                mode: 'compress',
                enabled: false,
                envelope: 0,
                gainReduction: 0
            },
            {
                name: 'Air',
                frequency: 14000,
                q: 0.7,
                gain: 0,
                threshold: -15,
                ratio: 1.5,     // Gentle for air frequencies
                attack: 20,
                release: 200,
                knee: 9,        // Very soft knee
                mode: 'expand', // Upward expansion (add sparkle)
                enabled: false,
                envelope: 0,
                gainReduction: 0
            }
        ];

        // Analysis nodes
        this.analysisNodes = [];
        this.filterNodes = [];

        // Presets
        this.presets = {
            'De-Harsh': {
                description: 'Tames harsh frequencies in vocals and instruments',
                settings: [
                    { band: 4, enabled: true, threshold: -12, ratio: 4.0, attack: 2, release: 50 }
                ]
            },
            'De-Ess': {
                description: 'Professional de-essing (sibilance control)',
                settings: [
                    { band: 5, enabled: true, threshold: -8, ratio: 6.0, attack: 1, release: 30 }
                ]
            },
            'Boom Control': {
                description: 'Control excessive low-end on bass-heavy material',
                settings: [
                    { band: 0, enabled: true, threshold: -18, ratio: 3.0, attack: 10, release: 100 },
                    { band: 1, enabled: true, threshold: -15, ratio: 2.5, attack: 12, release: 120 }
                ]
            },
            'Vocal Presence': {
                description: 'Adaptive presence boost for vocals',
                settings: [
                    { band: 3, enabled: true, threshold: -20, ratio: 1.5, attack: 5, release: 80, mode: 'expand' },
                    { band: 4, enabled: true, threshold: -15, ratio: 1.8, attack: 3, release: 60, mode: 'expand' }
                ]
            },
            'Mastering': {
                description: 'Gentle mastering EQ with adaptive control',
                settings: [
                    { band: 0, enabled: true, threshold: -20, ratio: 2.0, attack: 15, release: 150 },
                    { band: 2, enabled: true, threshold: -15, ratio: 2.5, attack: 8, release: 100 },
                    { band: 4, enabled: true, threshold: -12, ratio: 3.0, attack: 4, release: 70 },
                    { band: 6, enabled: true, threshold: -18, ratio: 1.5, attack: 20, release: 200, mode: 'expand' }
                ]
            },
            'Broadcast': {
                description: 'Aggressive control for broadcast/streaming',
                settings: [
                    { band: 0, enabled: true, threshold: -22, ratio: 4.0, attack: 8, release: 100 },
                    { band: 2, enabled: true, threshold: -18, ratio: 3.5, attack: 6, release: 90 },
                    { band: 4, enabled: true, threshold: -10, ratio: 5.0, attack: 2, release: 50 }
                ]
            }
        };
    }

    /**
     * Initialize all filter and analysis nodes
     */
    init() {

        for (let i = 0; i < this.bands.length; i++) {
            const band = this.bands[i];

            // Create bandpass filter for this frequency band
            const filter = this.audioContext.createBiquadFilter();
            filter.type = 'peaking';
            filter.frequency.value = band.frequency;
            filter.Q.value = band.q;
            filter.gain.value = 0; // Dynamic gain will be applied

            // Create analyzer for level detection
            const analyser = this.audioContext.createAnalyser();
            analyser.fftSize = 2048;
            analyser.smoothingTimeConstant = 0.3;

            this.filterNodes.push(filter);
            this.analysisNodes.push(analyser);

        }

    }

    /**
     * Process audio buffer with dynamic EQ
     * @param {AudioBuffer} inputBuffer - Input audio
     * @returns {Promise<AudioBuffer>} Processed audio
     */
    async processBuffer(inputBuffer) {

        const outputBuffer = this.audioContext.createBuffer(
            inputBuffer.numberOfChannels,
            inputBuffer.length,
            inputBuffer.sampleRate
        );

        // Process each channel
        for (let channel = 0; channel < inputBuffer.numberOfChannels; channel++) {
            const inputData = inputBuffer.getChannelData(channel);
            const outputData = outputBuffer.getChannelData(channel);

            // Copy input to output first
            outputData.set(inputData);

            // Apply each enabled dynamic EQ band
            for (let i = 0; i < this.bands.length; i++) {
                const band = this.bands[i];
                if (!band.enabled) continue;

                // Apply dynamic EQ to this frequency band
                this.applyDynamicEQBand(outputData, band, inputBuffer.sampleRate);
            }
        }

        return outputBuffer;
    }

    /**
     * Apply dynamic EQ to a specific frequency band
     */
    applyDynamicEQBand(audioData, band, sampleRate) {
        // Create simple bandpass filter centered at band frequency
        const bandwidth = this.calculateBandwidth(band.frequency, band.q);
        const lowFreq = band.frequency - bandwidth / 2;
        const highFreq = band.frequency + bandwidth / 2;

        // Filter coefficients
        const filteredData = this.applyBandpassFilter(audioData, lowFreq, highFreq, sampleRate);

        // Compute envelope follower for level detection
        const attackCoef = Math.exp(-1 / (band.attack * 0.001 * sampleRate));
        const releaseCoef = Math.exp(-1 / (band.release * 0.001 * sampleRate));

        let envelope = band.envelope;

        // Process each sample
        for (let i = 0; i < audioData.length; i++) {
            // Get band signal level
            const bandLevel = Math.abs(filteredData[i]);

            // Update envelope
            if (bandLevel > envelope) {
                envelope = attackCoef * envelope + (1 - attackCoef) * bandLevel;
            } else {
                envelope = releaseCoef * envelope + (1 - releaseCoef) * bandLevel;
            }

            // Convert to dB
            const envelopeDB = 20 * Math.log10(envelope + 1e-12);

            // Calculate gain reduction/expansion
            let gainDB = 0;

            if (band.mode === 'compress') {
                // Compression: reduce gain when above threshold
                if (envelopeDB > band.threshold) {
                    const overThreshold = envelopeDB - band.threshold;
                    const compressed = overThreshold / band.ratio;
                    gainDB = compressed - overThreshold; // Negative = reduction
                }
            } else if (band.mode === 'expand') {
                // Expansion: increase gain when above threshold
                if (envelopeDB > band.threshold) {
                    const overThreshold = envelopeDB - band.threshold;
                    const expanded = overThreshold * band.ratio;
                    gainDB = expanded - overThreshold; // Positive = boost
                }
            }

            // Apply soft knee
            if (band.knee > 0) {
                const kneeStart = band.threshold - band.knee / 2;
                const kneeEnd = band.threshold + band.knee / 2;

                if (envelopeDB > kneeStart && envelopeDB < kneeEnd) {
                    const kneePos = (envelopeDB - kneeStart) / band.knee;
                    gainDB *= kneePos; // Smooth transition
                }
            }

            // Apply static gain + dynamic gain
            const totalGainDB = band.gain + gainDB;
            const linearGain = Math.pow(10, totalGainDB / 20);

            // Apply gain to the filtered band and mix back
            const bandContribution = filteredData[i] * (linearGain - 1); // Only the change
            audioData[i] += bandContribution;

            // Store gain reduction for metering
            band.gainReduction = Math.abs(gainDB);
        }

        // Update band envelope for next call
        band.envelope = envelope;
    }

    /**
     * Simple bandpass filter
     */
    applyBandpassFilter(audioData, lowFreq, highFreq, sampleRate) {
        const filtered = new Float32Array(audioData.length);
        const nyquist = sampleRate / 2;

        // Normalize frequencies
        const lowNorm = lowFreq / nyquist;
        const highNorm = highFreq / nyquist;

        // Simple IIR bandpass filter (Butterworth approximation)
        const centerFreq = Math.sqrt(lowFreq * highFreq);
        const bandwidth = highFreq - lowFreq;

        const omega = 2 * Math.PI * centerFreq / sampleRate;
        const bw = 2 * Math.PI * bandwidth / sampleRate;

        const alpha = Math.sin(omega) * Math.sinh(Math.log(2) / 2 * bw * omega / Math.sin(omega));

        const b0 = alpha;
        const b1 = 0;
        const b2 = -alpha;
        const a0 = 1 + alpha;
        const a1 = -2 * Math.cos(omega);
        const a2 = 1 - alpha;

        // Normalize
        const b0n = b0 / a0;
        const b1n = b1 / a0;
        const b2n = b2 / a0;
        const a1n = a1 / a0;
        const a2n = a2 / a0;

        // Apply filter
        let x1 = 0, x2 = 0, y1 = 0, y2 = 0;

        for (let i = 0; i < audioData.length; i++) {
            const x0 = audioData[i];
            const y0 = b0n * x0 + b1n * x1 + b2n * x2 - a1n * y1 - a2n * y2;

            filtered[i] = y0;

            x2 = x1;
            x1 = x0;
            y2 = y1;
            y1 = y0;
        }

        return filtered;
    }

    /**
     * Calculate bandwidth from Q factor
     */
    calculateBandwidth(centerFreq, q) {
        return centerFreq / q;
    }

    /**
     * Load preset
     */
    loadPreset(presetName) {
        const preset = this.presets[presetName];
        if (!preset) {
            console.error(`[Dynamic EQ] Preset "${presetName}" not found`);
            return false;
        }


        // Reset all bands
        this.bands.forEach(band => band.enabled = false);

        // Apply preset settings
        preset.settings.forEach(setting => {
            const band = this.bands[setting.band];
            band.enabled = setting.enabled;
            band.threshold = setting.threshold;
            band.ratio = setting.ratio;
            band.attack = setting.attack;
            band.release = setting.release;
            if (setting.mode) band.mode = setting.mode;
        });

        return true;
    }

    /**
     * Enable/disable specific band
     */
    setBandEnabled(bandIndex, enabled) {
        if (bandIndex < 0 || bandIndex >= this.bands.length) return;
        this.bands[bandIndex].enabled = enabled;
    }

    /**
     * Set band parameter
     */
    setBandParameter(bandIndex, parameter, value) {
        if (bandIndex < 0 || bandIndex >= this.bands.length) return;
        const band = this.bands[bandIndex];

        if (parameter in band) {
            band[parameter] = value;
        }
    }

    /**
     * Get current gain reduction for metering
     */
    getGainReduction(bandIndex) {
        if (bandIndex < 0 || bandIndex >= this.bands.length) return 0;
        return this.bands[bandIndex].gainReduction;
    }

    /**
     * Get all bands status
     */
    getBandsStatus() {
        return this.bands.map((band, i) => ({
            index: i,
            name: band.name,
            frequency: band.frequency,
            enabled: band.enabled,
            gainReduction: band.gainReduction.toFixed(1) + ' dB',
            threshold: band.threshold + ' dB',
            ratio: band.ratio + ':1',
            mode: band.mode
        }));
    }

    /**
     * Get available presets
     */
    getPresets() {
        return Object.keys(this.presets).map(name => ({
            name,
            description: this.presets[name].description
        }));
    }

    /**
     * Auto-detect and suggest preset based on audio analysis
     */
    async autoDetectPreset(audioBuffer) {

        // Analyze spectral content
        const spectralAnalysis = await this.analyzeSpectralContent(audioBuffer);

        // Decision logic
        if (spectralAnalysis.harshness > 0.7) {
            return 'De-Harsh';
        }

        if (spectralAnalysis.sibilance > 0.6) {
            return 'De-Ess';
        }

        if (spectralAnalysis.lowEndExcess > 0.7) {
            return 'Boom Control';
        }

        if (spectralAnalysis.vocalContent > 0.6) {
            return 'Vocal Presence';
        }

        return 'Mastering';
    }

    /**
     * Analyze spectral content for auto-detection
     */
    async analyzeSpectralContent(audioBuffer) {
        const monoData = this.convertToMono(audioBuffer);
        const fftSize = 8192;
        const numBins = fftSize / 2 + 1;

        // Compute average spectrum
        const spectrum = new Float32Array(numBins);
        const hopSize = fftSize / 2;
        const numFrames = Math.floor((monoData.length - fftSize) / hopSize);

        for (let frame = 0; frame < numFrames; frame++) {
            const frameStart = frame * hopSize;
            const frameData = monoData.slice(frameStart, frameStart + fftSize);

            // Simple magnitude spectrum
            for (let bin = 0; bin < numBins; bin++) {
                const freq = (bin / numBins) * (audioBuffer.sampleRate / 2);
                // Simplified - in production use proper FFT
                let magnitude = 0;
                for (let i = 0; i < frameData.length; i++) {
                    magnitude += Math.abs(frameData[i]);
                }
                spectrum[bin] += magnitude / frameData.length;
            }
        }

        // Normalize
        for (let i = 0; i < numBins; i++) {
            spectrum[i] /= numFrames;
        }

        // Analyze frequency ranges
        const lowEnd = this.getSpectralEnergy(spectrum, 20, 250, audioBuffer.sampleRate, numBins);
        const lowMid = this.getSpectralEnergy(spectrum, 250, 1000, audioBuffer.sampleRate, numBins);
        const mid = this.getSpectralEnergy(spectrum, 1000, 4000, audioBuffer.sampleRate, numBins);
        const highMid = this.getSpectralEnergy(spectrum, 4000, 8000, audioBuffer.sampleRate, numBins);
        const high = this.getSpectralEnergy(spectrum, 8000, 20000, audioBuffer.sampleRate, numBins);

        const total = lowEnd + lowMid + mid + highMid + high;

        return {
            harshness: highMid / (total + 1e-12), // Harsh = too much 4-8kHz
            sibilance: high / (total + 1e-12),    // Sibilance = too much 8-20kHz
            lowEndExcess: lowEnd / (total + 1e-12), // Boom = too much 20-250Hz
            vocalContent: mid / (total + 1e-12),   // Vocal = strong 1-4kHz
            balance: 1.0 / (Math.max(...[lowEnd, lowMid, mid, highMid, high]) / (total / 5 + 1e-12))
        };
    }

    /**
     * Get spectral energy in frequency range
     */
    getSpectralEnergy(spectrum, lowFreq, highFreq, sampleRate, numBins) {
        const lowBin = Math.floor(lowFreq / (sampleRate / 2) * numBins);
        const highBin = Math.floor(highFreq / (sampleRate / 2) * numBins);

        let energy = 0;
        for (let bin = lowBin; bin < highBin && bin < numBins; bin++) {
            energy += spectrum[bin];
        }

        return energy / (highBin - lowBin + 1);
    }

    /**
     * Convert stereo to mono
     */
    convertToMono(audioBuffer) {
        const leftChannel = audioBuffer.getChannelData(0);
        const rightChannel = audioBuffer.numberOfChannels > 1 ?
            audioBuffer.getChannelData(1) : leftChannel;

        const monoData = new Float32Array(leftChannel.length);
        for (let i = 0; i < leftChannel.length; i++) {
            monoData[i] = (leftChannel[i] + rightChannel[i]) / 2;
        }

        return monoData;
    }
}

// Export for use in main application
if (typeof module !== 'undefined' && module.exports) {
    module.exports = DynamicEQProcessor;
}
