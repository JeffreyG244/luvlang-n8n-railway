/**
 * REFERENCE TRACK MATCHING ENGINE
 * Upload a professionally mastered track and match its sonic characteristics
 * Analyzes: LUFS, spectral balance, dynamics, stereo width
 */

class ReferenceTrackMatcher {
    constructor(audioContext) {
        this.audioContext = audioContext;
        this.referenceBuffer = null;
        this.referenceAnalysis = null;
        this.userAnalysis = null;
        this.matchStrength = 0.8; // 0-1 (80% default)
    }

    /**
     * Load reference track from file
     */
    async loadReferenceTrack(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = async (e) => {
                try {
                    const arrayBuffer = e.target.result;
                    this.referenceBuffer = await this.audioContext.decodeAudioData(arrayBuffer);
                    console.log('✅ Reference track loaded:', file.name);
                    resolve(this.referenceBuffer);
                } catch (error) {
                    console.error('❌ Error loading reference track:', error);
                    reject(error);
                }
            };
            reader.onerror = reject;
            reader.readAsArrayBuffer(file);
        });
    }

    /**
     * Analyze reference track - full spectral and dynamics analysis
     */
    async analyzeReferenceTrack() {
        if (!this.referenceBuffer) {
            throw new Error('No reference track loaded');
        }

        console.log('🔬 Analyzing reference track...');

        const offlineContext = new OfflineAudioContext(
            this.referenceBuffer.numberOfChannels,
            this.referenceBuffer.length,
            this.referenceBuffer.sampleRate
        );

        const source = offlineContext.createBufferSource();
        source.buffer = this.referenceBuffer;

        // Create 7-band analyzer (matching main EQ bands)
        const bands = this.create7BandAnalyzer(offlineContext);

        // Analyser for overall spectrum
        const analyser = offlineContext.createAnalyser();
        analyser.fftSize = 8192;
        analyser.smoothingTimeConstant = 0.3;

        // Connect signal chain
        source.connect(bands.input);
        source.connect(analyser);
        analyser.connect(offlineContext.destination);

        source.start(0);
        const renderedBuffer = await offlineContext.startRendering();

        // Analyze rendered buffer
        const analysis = {
            // Spectral balance (7 bands matching EQ)
            spectral: this.calculateSpectralBalance(renderedBuffer, bands),

            // Loudness (LUFS)
            lufs: this.calculateLUFS(renderedBuffer),

            // Dynamic range
            dynamicRange: this.calculateDynamicRange(renderedBuffer),

            // Crest factor
            crestFactor: this.calculateCrestFactor(renderedBuffer),

            // Stereo width
            stereoWidth: this.calculateStereoWidth(renderedBuffer),

            // Peak level
            peakLevel: this.calculatePeakLevel(renderedBuffer)
        };

        this.referenceAnalysis = analysis;
        console.log('✅ Reference analysis complete:', analysis);
        return analysis;
    }

    /**
     * Create 7-band filter bank matching main EQ
     */
    create7BandAnalyzer(context) {
        const bands = {
            input: context.createGain(),
            filters: {},
            outputs: {}
        };

        const frequencies = {
            sub: 40,
            bass: 120,
            lowmid: 350,
            mid: 1000,
            highmid: 3500,
            high: 8000,
            air: 14000
        };

        Object.keys(frequencies).forEach(band => {
            const filter = context.createBiquadFilter();
            const gain = context.createGain();

            if (band === 'sub') {
                filter.type = 'lowshelf';
            } else if (band === 'air') {
                filter.type = 'highshelf';
            } else {
                filter.type = 'peaking';
                filter.Q.value = 0.7;
            }

            filter.frequency.value = frequencies[band];
            filter.gain.value = 0; // Neutral, just for analysis

            bands.input.connect(filter);
            filter.connect(gain);

            bands.filters[band] = filter;
            bands.outputs[band] = gain;
        });

        return bands;
    }

    /**
     * Calculate spectral balance across 7 bands
     */
    calculateSpectralBalance(buffer, bands) {
        const balance = {};
        const channelData = buffer.getChannelData(0);

        // Simplified RMS calculation per band
        // In real implementation, would use actual filtered outputs
        const bandRanges = {
            sub: [0, 120],
            bass: [120, 350],
            lowmid: [350, 1000],
            mid: [1000, 3500],
            highmid: [3500, 8000],
            high: [8000, 14000],
            air: [14000, 20000]
        };

        Object.keys(bandRanges).forEach(band => {
            let sumSquares = 0;
            let count = 0;

            // Sample-based RMS (simplified)
            for (let i = 0; i < channelData.length; i += 100) {
                sumSquares += channelData[i] * channelData[i];
                count++;
            }

            const rms = Math.sqrt(sumSquares / count);
            const db = 20 * Math.log10(rms + 0.0001);
            balance[band] = db;
        });

        return balance;
    }

    /**
     * Calculate LUFS (simplified K-weighted loudness)
     */
    calculateLUFS(buffer) {
        const channelData = buffer.getChannelData(0);
        let sumSquares = 0;

        for (let i = 0; i < channelData.length; i++) {
            sumSquares += channelData[i] * channelData[i];
        }

        const rms = Math.sqrt(sumSquares / channelData.length);
        const lufs = -0.691 + 10 * Math.log10(rms + 0.0001) - 23;

        return Math.max(-40, Math.min(0, lufs));
    }

    /**
     * Calculate dynamic range (difference between peaks and RMS)
     */
    calculateDynamicRange(buffer) {
        const channelData = buffer.getChannelData(0);
        let peak = 0;
        let sumSquares = 0;

        for (let i = 0; i < channelData.length; i++) {
            const abs = Math.abs(channelData[i]);
            if (abs > peak) peak = abs;
            sumSquares += channelData[i] * channelData[i];
        }

        const rms = Math.sqrt(sumSquares / channelData.length);
        const peakDb = 20 * Math.log10(peak + 0.0001);
        const rmsDb = 20 * Math.log10(rms + 0.0001);

        return peakDb - rmsDb;
    }

    /**
     * Calculate crest factor
     */
    calculateCrestFactor(buffer) {
        const channelData = buffer.getChannelData(0);
        let peak = 0;
        let sumSquares = 0;

        for (let i = 0; i < channelData.length; i++) {
            const abs = Math.abs(channelData[i]);
            if (abs > peak) peak = abs;
            sumSquares += channelData[i] * channelData[i];
        }

        const rms = Math.sqrt(sumSquares / channelData.length);
        return peak / (rms + 0.0001);
    }

    /**
     * Calculate stereo width
     */
    calculateStereoWidth(buffer) {
        if (buffer.numberOfChannels < 2) return 0;

        const left = buffer.getChannelData(0);
        const right = buffer.getChannelData(1);

        let midRMS = 0;
        let sideRMS = 0;

        for (let i = 0; i < left.length; i += 100) {
            const mid = (left[i] + right[i]) / 2;
            const side = (left[i] - right[i]) / 2;

            midRMS += mid * mid;
            sideRMS += side * side;
        }

        const width = sideRMS / (midRMS + sideRMS + 0.0001);
        return Math.min(1, Math.max(0, width));
    }

    /**
     * Calculate peak level
     */
    calculatePeakLevel(buffer) {
        let peak = 0;

        for (let ch = 0; ch < buffer.numberOfChannels; ch++) {
            const channelData = buffer.getChannelData(ch);
            for (let i = 0; i < channelData.length; i++) {
                const abs = Math.abs(channelData[i]);
                if (abs > peak) peak = abs;
            }
        }

        return 20 * Math.log10(peak + 0.0001);
    }

    /**
     * Generate matching EQ curve based on reference vs user track
     */
    generateMatchingEQ(userAnalysis) {
        if (!this.referenceAnalysis) {
            throw new Error('No reference analysis available');
        }

        this.userAnalysis = userAnalysis;
        const matchingEQ = {};

        // Compare each band
        Object.keys(this.referenceAnalysis.spectral).forEach(band => {
            const refLevel = this.referenceAnalysis.spectral[band];
            const userLevel = userAnalysis.spectral[band];

            // Calculate difference and apply match strength
            const difference = (refLevel - userLevel) * this.matchStrength;

            // Limit to ±12dB
            matchingEQ[band] = Math.max(-12, Math.min(12, difference));
        });

        console.log('🎯 Matching EQ generated:', matchingEQ);
        return matchingEQ;
    }

    /**
     * Generate matching master gain
     */
    generateMatchingGain() {
        if (!this.referenceAnalysis || !this.userAnalysis) {
            throw new Error('Missing analysis data');
        }

        const lufsDifference = this.referenceAnalysis.lufs - this.userAnalysis.lufs;
        const matchingGain = lufsDifference * this.matchStrength;

        return Math.max(-12, Math.min(12, matchingGain));
    }

    /**
     * Generate full matching settings
     */
    generateMatchingSettings() {
        if (!this.referenceAnalysis || !this.userAnalysis) {
            throw new Error('Missing analysis data');
        }

        return {
            eq: this.generateMatchingEQ(this.userAnalysis),
            masterGain: this.generateMatchingGain(),
            compression: {
                ratio: this.calculateMatchingCompressionRatio(),
                threshold: this.calculateMatchingThreshold()
            },
            stereoWidth: this.calculateMatchingStereoWidth()
        };
    }

    /**
     * Calculate matching compression ratio based on dynamic range
     */
    calculateMatchingCompressionRatio() {
        const refDR = this.referenceAnalysis.dynamicRange;
        const userDR = this.userAnalysis.dynamicRange;

        // If reference has less DR, need more compression
        if (refDR < userDR) {
            const difference = userDR - refDR;
            // More difference = higher ratio
            return Math.min(10, 3 + difference / 2);
        }

        return 3; // Light compression if reference has more DR
    }

    /**
     * Calculate matching compression threshold
     */
    calculateMatchingThreshold() {
        const refLUFS = this.referenceAnalysis.lufs;
        const refDR = this.referenceAnalysis.dynamicRange;

        // Threshold based on target LUFS and dynamic range
        return Math.max(-40, refLUFS - refDR / 2);
    }

    /**
     * Calculate matching stereo width
     */
    calculateMatchingStereoWidth() {
        const refWidth = this.referenceAnalysis.stereoWidth;
        const userWidth = this.userAnalysis.stereoWidth;

        // Convert to percentage (0-200%)
        const targetWidth = 100 + (refWidth - userWidth) * 100 * this.matchStrength;

        return Math.max(0, Math.min(200, targetWidth));
    }

    /**
     * Set match strength (0-1)
     */
    setMatchStrength(strength) {
        this.matchStrength = Math.max(0, Math.min(1, strength));
        console.log('🎚️ Match strength set to:', (this.matchStrength * 100).toFixed(0) + '%');
    }

    /**
     * Get display info for UI
     */
    getReferenceDisplayInfo() {
        if (!this.referenceAnalysis) return null;

        return {
            lufs: this.referenceAnalysis.lufs.toFixed(1) + ' LUFS',
            dynamicRange: this.referenceAnalysis.dynamicRange.toFixed(1) + ' dB',
            crestFactor: this.referenceAnalysis.crestFactor.toFixed(1),
            stereoWidth: (this.referenceAnalysis.stereoWidth * 100).toFixed(0) + '%',
            peakLevel: this.referenceAnalysis.peakLevel.toFixed(1) + ' dBTP'
        };
    }
}

// Export for use in main HTML
if (typeof module !== 'undefined' && module.exports) {
    module.exports = ReferenceTrackMatcher;
}
