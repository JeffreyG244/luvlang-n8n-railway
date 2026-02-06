// ============================================
// REFERENCE TRACK MATCHING - Professional Mastering Feature
// Match your master to commercial reference tracks
// ============================================
// Analyzes spectral balance, dynamics, and loudness of reference
// and provides EQ/dynamics adjustments to match

class ReferenceTrackMatcher {
    constructor(audioContext) {
        this.audioContext = audioContext;
        this.sampleRate = audioContext.sampleRate;

        // FFT settings for spectral analysis
        this.fftSize = 8192;
        this.numBins = this.fftSize / 2 + 1;

        // Analysis results storage
        this.referenceAnalysis = null;
        this.targetAnalysis = null;

        // Matching parameters
        this.matchStrength = 0.7; // 0-1, how closely to match (1 = exact match)
        this.smoothing = 0.5;     // Smoothing of EQ curve

        // Band analysis (31-band like graphic EQ for visualization)
        this.analysisBands = this.generateThirdOctaveBands();

        // Matching results
        this.eqCurve = null;
        this.dynamicsMatch = null;
        this.loudnessMatch = null;

    }

    /**
     * Generate ISO 31-band third-octave center frequencies
     */
    generateThirdOctaveBands() {
        const bands = [];
        // Standard third-octave frequencies from 20Hz to 20kHz
        const baseFreqs = [
            20, 25, 31.5, 40, 50, 63, 80, 100, 125, 160,
            200, 250, 315, 400, 500, 630, 800, 1000, 1250, 1600,
            2000, 2500, 3150, 4000, 5000, 6300, 8000, 10000, 12500, 16000, 20000
        ];

        for (const freq of baseFreqs) {
            if (freq <= this.sampleRate / 2) {
                bands.push(freq);
            }
        }

        return bands;
    }

    /**
     * Analyze reference track
     * @param {AudioBuffer} referenceBuffer - Commercial reference track
     */
    async analyzeReference(referenceBuffer) {

        this.referenceAnalysis = await this.analyzeTrack(referenceBuffer);

        return this.referenceAnalysis;
    }

    /**
     * Analyze target track (your master)
     * @param {AudioBuffer} targetBuffer - Your track to be matched
     */
    async analyzeTarget(targetBuffer) {

        this.targetAnalysis = await this.analyzeTrack(targetBuffer);

        return this.targetAnalysis;
    }

    /**
     * Full track analysis
     */
    async analyzeTrack(audioBuffer) {
        const monoData = this.convertToMono(audioBuffer);

        // Spectral analysis
        const spectrum = await this.computeAverageSpectrum(monoData, audioBuffer.sampleRate);
        const bandLevels = this.computeBandLevels(spectrum, audioBuffer.sampleRate);

        // Loudness analysis
        const rmsLevel = this.computeRMS(monoData);
        const peakLevel = this.computePeak(monoData);
        const crestFactor = 20 * Math.log10(peakLevel / (rmsLevel + 1e-12));

        // Approximate LUFS (simplified - use lufs-worker for accurate)
        const integratedLUFS = 20 * Math.log10(rmsLevel + 1e-12) + 3; // Rough approximation

        // Dynamic range (difference between loud and quiet sections)
        const dynamicRange = this.computeDynamicRange(monoData);

        // Spectral centroid (brightness indicator)
        const spectralCentroid = this.computeSpectralCentroid(spectrum, audioBuffer.sampleRate);

        // Low/Mid/High balance
        const frequencyBalance = this.computeFrequencyBalance(bandLevels);

        return {
            spectrum,
            bandLevels,
            integratedLUFS,
            rmsLevel,
            peakLevel,
            crestFactor,
            dynamicRange,
            spectralCentroid,
            frequencyBalance
        };
    }

    /**
     * Compute average spectrum across entire track
     */
    async computeAverageSpectrum(monoData, sampleRate) {
        const fftSize = this.fftSize;
        const hopSize = fftSize / 2;
        const numBins = this.numBins;

        const avgSpectrum = new Float32Array(numBins);
        let numFrames = 0;

        // Hann window
        const window = new Float32Array(fftSize);
        for (let i = 0; i < fftSize; i++) {
            window[i] = 0.5 * (1 - Math.cos(2 * Math.PI * i / fftSize));
        }

        // Process frames
        for (let frameStart = 0; frameStart < monoData.length - fftSize; frameStart += hopSize) {
            // Extract and window frame
            const frame = new Float32Array(fftSize);
            for (let i = 0; i < fftSize; i++) {
                frame[i] = monoData[frameStart + i] * window[i];
            }

            // Compute magnitude spectrum (simplified DFT for accuracy)
            for (let bin = 0; bin < numBins; bin++) {
                let real = 0, imag = 0;
                const freq = bin / fftSize;

                for (let n = 0; n < fftSize; n++) {
                    const angle = -2 * Math.PI * freq * n;
                    real += frame[n] * Math.cos(angle);
                    imag += frame[n] * Math.sin(angle);
                }

                const magnitude = Math.sqrt(real * real + imag * imag) / fftSize;
                avgSpectrum[bin] += magnitude;
            }

            numFrames++;

            // Limit processing for very long tracks
            if (numFrames > 500) break;
        }

        // Average
        for (let i = 0; i < numBins; i++) {
            avgSpectrum[i] /= numFrames;
        }

        return avgSpectrum;
    }

    /**
     * Compute third-octave band levels from spectrum
     */
    computeBandLevels(spectrum, sampleRate) {
        const bandLevels = [];
        const binWidth = sampleRate / this.fftSize;

        for (const centerFreq of this.analysisBands) {
            // Third-octave bandwidth
            const lowFreq = centerFreq / Math.pow(2, 1/6);
            const highFreq = centerFreq * Math.pow(2, 1/6);

            const lowBin = Math.max(0, Math.floor(lowFreq / binWidth));
            const highBin = Math.min(this.numBins - 1, Math.ceil(highFreq / binWidth));

            // Sum energy in band
            let energy = 0;
            for (let bin = lowBin; bin <= highBin; bin++) {
                energy += spectrum[bin] * spectrum[bin];
            }

            // Convert to dB
            const levelDB = 10 * Math.log10(energy + 1e-12);
            bandLevels.push({
                frequency: centerFreq,
                level: levelDB
            });
        }

        return bandLevels;
    }

    /**
     * Compute RMS level
     */
    computeRMS(data) {
        let sumSquares = 0;
        for (let i = 0; i < data.length; i++) {
            sumSquares += data[i] * data[i];
        }
        return Math.sqrt(sumSquares / data.length);
    }

    /**
     * Compute peak level
     */
    computePeak(data) {
        let peak = 0;
        for (let i = 0; i < data.length; i++) {
            const abs = Math.abs(data[i]);
            if (abs > peak) peak = abs;
        }
        return peak;
    }

    /**
     * Compute dynamic range (simplified)
     */
    computeDynamicRange(data) {
        // Split into segments and find loudness variation
        const segmentSize = Math.floor(this.sampleRate * 0.4); // 400ms segments
        const numSegments = Math.floor(data.length / segmentSize);

        const segmentLevels = [];
        for (let i = 0; i < numSegments; i++) {
            const start = i * segmentSize;
            const segment = data.slice(start, start + segmentSize);

            let sumSquares = 0;
            for (let j = 0; j < segment.length; j++) {
                sumSquares += segment[j] * segment[j];
            }
            const rms = Math.sqrt(sumSquares / segment.length);
            segmentLevels.push(20 * Math.log10(rms + 1e-12));
        }

        // Dynamic range = difference between loud and quiet (excluding silence)
        const validLevels = segmentLevels.filter(l => l > -60);
        if (validLevels.length < 2) return 0;

        validLevels.sort((a, b) => b - a);
        const top10 = validLevels.slice(0, Math.ceil(validLevels.length * 0.1));
        const bottom10 = validLevels.slice(-Math.ceil(validLevels.length * 0.1));

        const avgTop = top10.reduce((a, b) => a + b, 0) / top10.length;
        const avgBottom = bottom10.reduce((a, b) => a + b, 0) / bottom10.length;

        return avgTop - avgBottom;
    }

    /**
     * Compute spectral centroid (brightness)
     */
    computeSpectralCentroid(spectrum, sampleRate) {
        let weightedSum = 0;
        let magnitudeSum = 0;

        for (let bin = 0; bin < spectrum.length; bin++) {
            const freq = (bin / spectrum.length) * (sampleRate / 2);
            weightedSum += freq * spectrum[bin];
            magnitudeSum += spectrum[bin];
        }

        return weightedSum / (magnitudeSum + 1e-12);
    }

    /**
     * Compute frequency balance (low/mid/high)
     */
    computeFrequencyBalance(bandLevels) {
        let lowEnergy = 0, midEnergy = 0, highEnergy = 0;

        for (const band of bandLevels) {
            const linearEnergy = Math.pow(10, band.level / 10);

            if (band.frequency < 250) {
                lowEnergy += linearEnergy;
            } else if (band.frequency < 4000) {
                midEnergy += linearEnergy;
            } else {
                highEnergy += linearEnergy;
            }
        }

        const total = lowEnergy + midEnergy + highEnergy;

        return {
            low: lowEnergy / total,
            mid: midEnergy / total,
            high: highEnergy / total
        };
    }

    /**
     * Generate EQ curve to match reference
     */
    generateMatchingEQ() {
        if (!this.referenceAnalysis || !this.targetAnalysis) {
            console.error('[Reference Matcher] Both reference and target must be analyzed first');
            return null;
        }

        const eqCurve = [];
        const refBands = this.referenceAnalysis.bandLevels;
        const targetBands = this.targetAnalysis.bandLevels;

        for (let i = 0; i < refBands.length; i++) {
            const diff = refBands[i].level - targetBands[i].level;

            // Apply match strength (0 = no change, 1 = full match)
            const adjustment = diff * this.matchStrength;

            // Clamp to reasonable range (-12 to +12 dB)
            const clampedAdjustment = Math.max(-12, Math.min(12, adjustment));

            eqCurve.push({
                frequency: refBands[i].frequency,
                gain: clampedAdjustment
            });
        }

        // Apply smoothing to avoid harsh transitions
        this.eqCurve = this.smoothEQCurve(eqCurve);

        return this.eqCurve;
    }

    /**
     * Smooth EQ curve to avoid harsh transitions
     */
    smoothEQCurve(curve) {
        if (this.smoothing === 0) return curve;

        const smoothed = [];
        const windowSize = Math.ceil(curve.length * this.smoothing * 0.2);

        for (let i = 0; i < curve.length; i++) {
            let sum = 0;
            let count = 0;

            for (let j = -windowSize; j <= windowSize; j++) {
                const idx = i + j;
                if (idx >= 0 && idx < curve.length) {
                    // Weight closer bands more heavily
                    const weight = 1 - Math.abs(j) / (windowSize + 1);
                    sum += curve[idx].gain * weight;
                    count += weight;
                }
            }

            smoothed.push({
                frequency: curve[i].frequency,
                gain: sum / count
            });
        }

        return smoothed;
    }

    /**
     * Generate loudness matching recommendation
     */
    generateLoudnessMatch() {
        if (!this.referenceAnalysis || !this.targetAnalysis) {
            return null;
        }

        const lufsDiff = this.referenceAnalysis.integratedLUFS - this.targetAnalysis.integratedLUFS;

        this.loudnessMatch = {
            targetLUFS: this.referenceAnalysis.integratedLUFS,
            currentLUFS: this.targetAnalysis.integratedLUFS,
            adjustment: lufsDiff,
            recommendation: lufsDiff > 0
                ? `Increase loudness by ${lufsDiff.toFixed(1)} dB`
                : `Decrease loudness by ${Math.abs(lufsDiff).toFixed(1)} dB`
        };

        return this.loudnessMatch;
    }

    /**
     * Generate dynamics matching recommendation
     */
    generateDynamicsMatch() {
        if (!this.referenceAnalysis || !this.targetAnalysis) {
            return null;
        }

        const drDiff = this.referenceAnalysis.dynamicRange - this.targetAnalysis.dynamicRange;
        const crestDiff = this.referenceAnalysis.crestFactor - this.targetAnalysis.crestFactor;

        this.dynamicsMatch = {
            referenceDR: this.referenceAnalysis.dynamicRange,
            targetDR: this.targetAnalysis.dynamicRange,
            referenceCrest: this.referenceAnalysis.crestFactor,
            targetCrest: this.targetAnalysis.crestFactor,
            recommendation: this.generateDynamicsRecommendation(drDiff, crestDiff)
        };

        return this.dynamicsMatch;
    }

    /**
     * Generate human-readable dynamics recommendation
     */
    generateDynamicsRecommendation(drDiff, crestDiff) {
        const recommendations = [];

        if (drDiff > 3) {
            recommendations.push('Reference has more dynamic range - consider using less compression');
        } else if (drDiff < -3) {
            recommendations.push('Reference is more compressed - consider adding compression');
        }

        if (crestDiff > 3) {
            recommendations.push('Reference has more transient punch - reduce limiting or use transient shaper');
        } else if (crestDiff < -3) {
            recommendations.push('Reference is more limited - increase limiting');
        }

        if (recommendations.length === 0) {
            recommendations.push('Dynamics are well matched to reference');
        }

        return recommendations;
    }

    /**
     * Get full matching report
     */
    getMatchingReport() {
        return {
            eqCurve: this.generateMatchingEQ(),
            loudness: this.generateLoudnessMatch(),
            dynamics: this.generateDynamicsMatch(),
            spectral: {
                referenceCentroid: this.referenceAnalysis?.spectralCentroid,
                targetCentroid: this.targetAnalysis?.spectralCentroid,
                brightnessMatch: this.referenceAnalysis && this.targetAnalysis
                    ? (this.targetAnalysis.spectralCentroid / this.referenceAnalysis.spectralCentroid).toFixed(2)
                    : null
            },
            frequencyBalance: {
                reference: this.referenceAnalysis?.frequencyBalance,
                target: this.targetAnalysis?.frequencyBalance
            }
        };
    }

    /**
     * Convert stereo to mono
     */
    convertToMono(audioBuffer) {
        const leftChannel = audioBuffer.getChannelData(0);
        const rightChannel = audioBuffer.numberOfChannels > 1
            ? audioBuffer.getChannelData(1)
            : leftChannel;

        const monoData = new Float32Array(leftChannel.length);
        for (let i = 0; i < leftChannel.length; i++) {
            monoData[i] = (leftChannel[i] + rightChannel[i]) * 0.5;
        }

        return monoData;
    }

    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // PUBLIC API
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

    /**
     * Load and analyze reference track from File object
     * @param {File} file - Audio file to load as reference
     * @returns {Promise<Object>} Analysis results
     */
    async loadReferenceTrack(file) {

        try {
            // Read file as ArrayBuffer
            const arrayBuffer = await file.arrayBuffer();

            // Decode audio data
            const audioBuffer = await this.audioContext.decodeAudioData(arrayBuffer);

            // Store the reference buffer for later use
            this.referenceBuffer = audioBuffer;
            this.referenceFileName = file.name;

            // Analyze the reference track
            const analysis = await this.analyzeReference(audioBuffer);

            return analysis;
        } catch (error) {
            console.error('[Reference Matcher] Failed to load reference:', error);
            throw error;
        }
    }

    /**
     * Apply reference matching to the current track
     * @param {AudioBuffer} targetBuffer - Your track to match
     * @param {number} strength - Match strength 0-1
     */
    async applyMatch(targetBuffer, strength = 0.7) {
        if (!this.referenceAnalysis) {
            console.error('[Reference Matcher] No reference loaded');
            return null;
        }

        this.setMatchStrength(strength);

        // Analyze target
        await this.analyzeTarget(targetBuffer);

        // Generate matching recommendations
        const report = this.getMatchingReport();

        // Apply EQ adjustments to the live processing chain
        if (report.eqCurve && window.audioContext) {
            this.applyEQToChain(report.eqCurve);
        }

        // Apply loudness recommendation
        if (report.loudness && report.loudness.adjustment !== 0) {
            this.applyLoudnessAdjustment(report.loudness.adjustment);
        }

        return report;
    }

    /**
     * Apply EQ curve to the live processing chain
     */
    applyEQToChain(eqCurve) {
        if (!eqCurve) return;

        const ac = window.audioContext;
        if (!ac) return;

        // Map EQ curve bands to our 7-band EQ
        const bandMapping = {
            sub: { freq: 45, bands: eqCurve.filter(b => b.frequency <= 60) },
            bass: { freq: 100, bands: eqCurve.filter(b => b.frequency > 60 && b.frequency <= 150) },
            lowMid: { freq: 400, bands: eqCurve.filter(b => b.frequency > 150 && b.frequency <= 600) },
            mid: { freq: 1000, bands: eqCurve.filter(b => b.frequency > 600 && b.frequency <= 1500) },
            highMid: { freq: 3500, bands: eqCurve.filter(b => b.frequency > 1500 && b.frequency <= 5000) },
            high: { freq: 8000, bands: eqCurve.filter(b => b.frequency > 5000 && b.frequency <= 12000) },
            air: { freq: 14000, bands: eqCurve.filter(b => b.frequency > 12000) }
        };

        // Apply averaged gains to each band
        for (const [band, data] of Object.entries(bandMapping)) {
            if (data.bands.length > 0) {
                const avgGain = data.bands.reduce((sum, b) => sum + b.gain, 0) / data.bands.length;
                const clampedGain = Math.max(-6, Math.min(6, avgGain)); // Limit to ±6dB for safety

                const filterName = `eq${band.charAt(0).toUpperCase() + band.slice(1)}Filter`;
                const filter = window[filterName];

                if (filter && filter.gain) {
                    filter.gain.setTargetAtTime(clampedGain, ac.currentTime, 0.1);

                }
            }
        }

    }

    /**
     * Apply loudness adjustment
     */
    applyLoudnessAdjustment(adjustment) {
        const ac = window.audioContext;
        if (!ac || !window.makeupGain) return;

        // Limit adjustment to reasonable range
        const clampedAdj = Math.max(-6, Math.min(6, adjustment));
        const linearGain = Math.pow(10, clampedAdj / 20);

        // Get current gain and multiply
        const currentGain = window.makeupGain.gain.value;
        const newGain = currentGain * linearGain;

        window.makeupGain.gain.setTargetAtTime(newGain, ac.currentTime, 0.1);

    }

    /**
     * Set match strength (0-1)
     */
    setMatchStrength(strength) {
        this.matchStrength = Math.max(0, Math.min(1, strength));

    }

    /**
     * Set EQ smoothing (0-1)
     */
    setSmoothing(smoothing) {
        this.smoothing = Math.max(0, Math.min(1, smoothing));

    }

    /**
     * Clear reference analysis
     */
    clearReference() {
        this.referenceAnalysis = null;
        this.eqCurve = null;

    }

    /**
     * Clear target analysis
     */
    clearTarget() {
        this.targetAnalysis = null;
        this.eqCurve = null;

    }

    /**
     * Check if ready to match
     */
    isReady() {
        return this.referenceAnalysis !== null && this.targetAnalysis !== null;
    }

    /**
     * Get reference analysis summary
     */
    getReferenceInfo() {
        if (!this.referenceAnalysis) return null;

        return {
            lufs: this.referenceAnalysis.integratedLUFS.toFixed(1) + ' LUFS',
            dynamicRange: this.referenceAnalysis.dynamicRange.toFixed(1) + ' dB',
            crestFactor: this.referenceAnalysis.crestFactor.toFixed(1) + ' dB',
            brightness: this.referenceAnalysis.spectralCentroid.toFixed(0) + ' Hz',
            balance: this.referenceAnalysis.frequencyBalance
        };
    }

    /**
     * Get target analysis summary
     */
    getTargetInfo() {
        if (!this.targetAnalysis) return null;

        return {
            lufs: this.targetAnalysis.integratedLUFS.toFixed(1) + ' LUFS',
            dynamicRange: this.targetAnalysis.dynamicRange.toFixed(1) + ' dB',
            crestFactor: this.targetAnalysis.crestFactor.toFixed(1) + ' dB',
            brightness: this.targetAnalysis.spectralCentroid.toFixed(0) + ' Hz',
            balance: this.targetAnalysis.frequencyBalance
        };
    }
}

// Export for use in main application
if (typeof module !== 'undefined' && module.exports) {
    module.exports = ReferenceTrackMatcher;
}

// Also expose globally for browser
if (typeof window !== 'undefined') {
    window.ReferenceTrackMatcher = ReferenceTrackMatcher;
}
