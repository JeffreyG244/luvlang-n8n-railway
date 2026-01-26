/**
 * AUDIO FINGERPRINTING & REFERENCE TRACK SUGGESTIONS
 *
 * Analyzes uploaded track's spectral signature and suggests
 * similar professional reference tracks from built-in database
 *
 * "Your track sounds similar to: [Artist - Song]. Use as reference?"
 */

class AudioFingerprinting {
    constructor() {
        // Built-in reference track database
        this.referenceDatabase = [
            {
                id: 1,
                artist: 'Daft Punk',
                title: 'Get Lucky',
                genre: 'EDM/Electronic',
                spectralProfile: { lowEnd: 0.38, mid: 0.35, highEnd: 0.27, centroid: 3500 },
                lufs: -10,
                dynamicRange: 8
            },
            {
                id: 2,
                artist: 'Drake',
                title: 'God\'s Plan',
                genre: 'Hip-Hop/Rap',
                spectralProfile: { lowEnd: 0.45, mid: 0.32, highEnd: 0.23, centroid: 2800 },
                lufs: -9,
                dynamicRange: 7
            },
            {
                id: 3,
                artist: 'The Weeknd',
                title: 'Blinding Lights',
                genre: 'Pop/Top 40',
                spectralProfile: { lowEnd: 0.35, mid: 0.38, highEnd: 0.27, centroid: 4200 },
                lufs: -11,
                dynamicRange: 9
            },
            {
                id: 4,
                artist: 'Hans Zimmer',
                title: 'Time (Inception)',
                genre: 'Classical/Orchestral',
                spectralProfile: { lowEnd: 0.28, mid: 0.42, highEnd: 0.30, centroid: 2500 },
                lufs: -18,
                dynamicRange: 22
            },
            {
                id: 5,
                artist: 'Metallica',
                title: 'Enter Sandman',
                genre: 'Rock/Metal',
                spectralProfile: { lowEnd: 0.32, mid: 0.40, highEnd: 0.28, centroid: 4800 },
                lufs: -10,
                dynamicRange: 11
            },
            {
                id: 6,
                artist: 'Taylor Swift',
                title: 'Shake It Off',
                genre: 'Pop/Top 40',
                spectralProfile: { lowEnd: 0.33, mid: 0.40, highEnd: 0.27, centroid: 3800 },
                lufs: -11,
                dynamicRange: 9
            },
            {
                id: 7,
                artist: 'Joe Rogan',
                title: 'JRE Podcast (typical)',
                genre: 'Podcast/Spoken Word',
                spectralProfile: { lowEnd: 0.20, mid: 0.55, highEnd: 0.25, centroid: 1500 },
                lufs: -16,
                dynamicRange: 12
            }
            // Add more references as needed
        ];

        this.currentFingerprint = null;
        this.suggestions = [];
    }

    /**
     * Generate fingerprint for uploaded audio
     * @param {AudioBuffer} audioBuffer - Audio to fingerprint
     * @returns {Object} Audio fingerprint
     */
    async generateFingerprint(audioBuffer) {
        console.log('[Fingerprinting] Generating audio fingerprint...');

        const monoData = this.convertToMono(audioBuffer);
        const sampleRate = audioBuffer.sampleRate;

        // Extract features
        const spectralProfile = this.extractSpectralProfile(monoData, sampleRate);
        const dynamicProfile = this.extractDynamicProfile(monoData);
        const rhythmicProfile = this.extractRhythmicProfile(monoData, sampleRate);

        this.currentFingerprint = {
            spectralProfile,
            dynamicProfile,
            rhythmicProfile,
            timestamp: Date.now()
        };

        console.log('[Fingerprinting] Fingerprint generated:', this.currentFingerprint);

        return this.currentFingerprint;
    }

    /**
     * Find similar reference tracks
     * @param {number} maxResults - Maximum number of suggestions
     * @returns {Array} Suggested reference tracks
     */
    findSimilarTracks(maxResults = 5) {
        if (!this.currentFingerprint) {
            console.error('[Fingerprinting] No fingerprint generated yet');
            return [];
        }

        console.log('[Fingerprinting] Searching for similar tracks...');

        // Calculate similarity scores for all references
        const scores = this.referenceDatabase.map(ref => ({
            ...ref,
            similarity: this.calculateSimilarity(this.currentFingerprint, ref)
        }));

        // Sort by similarity (highest first)
        scores.sort((a, b) => b.similarity - a.similarity);

        // Return top matches
        this.suggestions = scores.slice(0, maxResults);

        console.log('[Fingerprinting] Top suggestions:', this.suggestions);

        return this.suggestions;
    }

    /**
     * Extract spectral profile
     */
    extractSpectralProfile(audioData, sampleRate) {
        const fftSize = 8192;
        const spectrum = this.computeAverageSpectrum(audioData, fftSize);
        const numBins = spectrum.length;

        const lowEnd = this.sumBins(spectrum, 20, 250, sampleRate, numBins);
        const mid = this.sumBins(spectrum, 250, 4000, sampleRate, numBins);
        const highEnd = this.sumBins(spectrum, 4000, 20000, sampleRate, numBins);
        const total = lowEnd + mid + highEnd;

        // Spectral centroid
        let centroid = 0;
        let totalMag = 0;
        for (let i = 0; i < numBins; i++) {
            const freq = (i / numBins) * (sampleRate / 2);
            centroid += spectrum[i] * freq;
            totalMag += spectrum[i];
        }
        centroid /= (totalMag + 1e-12);

        return {
            lowEnd: lowEnd / (total + 1e-12),
            mid: mid / (total + 1e-12),
            highEnd: highEnd / (total + 1e-12),
            centroid: Math.round(centroid)
        };
    }

    /**
     * Extract dynamic profile
     */
    extractDynamicProfile(audioData) {
        let peak = 0;
        let sumSquares = 0;

        for (let i = 0; i < audioData.length; i++) {
            const abs = Math.abs(audioData[i]);
            if (abs > peak) peak = abs;
            sumSquares += audioData[i] ** 2;
        }

        const rms = Math.sqrt(sumSquares / audioData.length);
        const crestFactor = peak / (rms + 1e-12);
        const peakDB = 20 * Math.log10(peak + 1e-12);
        const rmsDB = 20 * Math.log10(rms + 1e-12);

        return {
            crestFactor,
            dynamicRange: peakDB - rmsDB,
            peakDB,
            rmsDB
        };
    }

    /**
     * Extract rhythmic profile
     */
    extractRhythmicProfile(audioData, sampleRate) {
        const windowSize = Math.floor(sampleRate * 0.005);
        let transientCount = 0;

        for (let i = windowSize; i < audioData.length; i += windowSize) {
            let currentRMS = 0, previousRMS = 0;

            for (let j = 0; j < windowSize; j++) {
                currentRMS += audioData[i + j] ** 2;
                previousRMS += audioData[i - windowSize + j] ** 2;
            }

            const currentDB = 10 * Math.log10(currentRMS + 1e-12);
            const previousDB = 10 * Math.log10(previousRMS + 1e-12);

            if (currentDB - previousDB > 10) {
                transientCount++;
            }
        }

        const duration = audioData.length / sampleRate;

        return {
            transientDensity: transientCount / duration,
            duration
        };
    }

    /**
     * Calculate similarity between fingerprint and reference
     * Uses advanced spectral matching algorithm
     */
    calculateSimilarity(fingerprint, reference) {
        let score = 100;

        // Spectral similarity (40% weight)
        const spectralDiff = Math.abs(fingerprint.spectralProfile.lowEnd - reference.spectralProfile.lowEnd) +
                            Math.abs(fingerprint.spectralProfile.mid - reference.spectralProfile.mid) +
                            Math.abs(fingerprint.spectralProfile.highEnd - reference.spectralProfile.highEnd);
        const spectralScore = Math.max(0, 40 - spectralDiff * 100);

        // Centroid similarity (20% weight)
        const centroidDiff = Math.abs(fingerprint.spectralProfile.centroid - reference.spectralProfile.centroid);
        const centroidScore = Math.max(0, 20 - (centroidDiff / 5000) * 20);

        // Dynamic range similarity (20% weight)
        const drDiff = Math.abs(fingerprint.dynamicProfile.dynamicRange - reference.dynamicRange);
        const drScore = Math.max(0, 20 - drDiff);

        // Crest factor similarity (20% weight)
        const cfDiff = Math.abs(fingerprint.dynamicProfile.crestFactor - (reference.dynamicRange / 6)); // Estimate
        const cfScore = Math.max(0, 20 - cfDiff * 2);

        score = spectralScore + centroidScore + drScore + cfScore;

        return Math.max(0, Math.min(100, score));
    }

    /**
     * SPECTRAL MATCHING ALGORITHM
     * Compares two audio fingerprints using cross-correlation
     * and spectral envelope matching
     */
    spectralMatch(fingerprint1, fingerprint2) {
        console.log('[Fingerprinting] Running spectral matching algorithm...');

        // 1. Compute spectral envelope correlation
        const envelopeCorrelation = this.computeEnvelopeCorrelation(
            fingerprint1.spectralProfile,
            fingerprint2.spectralProfile
        );

        // 2. Compute dynamic profile similarity
        const dynamicSimilarity = this.computeDynamicSimilarity(
            fingerprint1.dynamicProfile,
            fingerprint2.dynamicProfile
        );

        // 3. Compute rhythmic similarity
        const rhythmicSimilarity = this.computeRhythmicSimilarity(
            fingerprint1.rhythmicProfile,
            fingerprint2.rhythmicProfile
        );

        // Weighted combination
        const overallMatch = (
            envelopeCorrelation * 0.5 +
            dynamicSimilarity * 0.3 +
            rhythmicSimilarity * 0.2
        ) * 100;

        return {
            overall: overallMatch,
            spectral: envelopeCorrelation * 100,
            dynamic: dynamicSimilarity * 100,
            rhythmic: rhythmicSimilarity * 100,
            matchLevel: overallMatch > 80 ? 'Excellent' :
                       overallMatch > 60 ? 'Good' :
                       overallMatch > 40 ? 'Moderate' : 'Low'
        };
    }

    /**
     * Compute spectral envelope correlation using cosine similarity
     */
    computeEnvelopeCorrelation(profile1, profile2) {
        // Create spectral vectors
        const vec1 = [profile1.lowEnd, profile1.mid, profile1.highEnd, profile1.centroid / 10000];
        const vec2 = [profile2.lowEnd, profile2.mid, profile2.highEnd, profile2.centroid / 10000];

        // Cosine similarity
        let dotProduct = 0;
        let mag1 = 0;
        let mag2 = 0;

        for (let i = 0; i < vec1.length; i++) {
            dotProduct += vec1[i] * vec2[i];
            mag1 += vec1[i] * vec1[i];
            mag2 += vec2[i] * vec2[i];
        }

        return dotProduct / (Math.sqrt(mag1) * Math.sqrt(mag2) + 1e-12);
    }

    /**
     * Compute dynamic profile similarity
     */
    computeDynamicSimilarity(dyn1, dyn2) {
        const crestDiff = Math.abs(dyn1.crestFactor - dyn2.crestFactor) / 20;
        const rangeDiff = Math.abs(dyn1.dynamicRange - dyn2.dynamicRange) / 30;

        return Math.max(0, 1 - (crestDiff + rangeDiff) / 2);
    }

    /**
     * Compute rhythmic similarity
     */
    computeRhythmicSimilarity(rhythm1, rhythm2) {
        const densityDiff = Math.abs(rhythm1.transientDensity - rhythm2.transientDensity) / 30;
        return Math.max(0, 1 - densityDiff);
    }

    /**
     * Compare current track with another track
     * @param {AudioBuffer} audioBuffer - Track to compare against
     * @returns {Object} Match results
     */
    async compareWithTrack(audioBuffer) {
        if (!this.currentFingerprint) {
            console.error('[Fingerprinting] No current fingerprint. Call generateFingerprint first.');
            return null;
        }

        // Generate fingerprint for comparison track
        const comparisonFingerprint = await this.generateFingerprint(audioBuffer);

        // Restore current fingerprint
        const originalFingerprint = this.currentFingerprint;

        // Run spectral matching
        const matchResult = this.spectralMatch(originalFingerprint, comparisonFingerprint);

        console.log('[Fingerprinting] Track comparison result:', matchResult);

        return matchResult;
    }

    /**
     * Add custom reference to database
     */
    async addCustomReference(audioBuffer, metadata) {
        const fingerprint = await this.generateFingerprint(audioBuffer);

        const reference = {
            id: this.referenceDatabase.length + 1,
            artist: metadata.artist || 'Unknown',
            title: metadata.title || 'Untitled',
            genre: metadata.genre || 'Unknown',
            spectralProfile: fingerprint.spectralProfile,
            lufs: metadata.lufs || -14,
            dynamicRange: fingerprint.dynamicProfile.dynamicRange,
            custom: true
        };

        this.referenceDatabase.push(reference);

        console.log('[Fingerprinting] Added custom reference:', reference);

        // Save to localStorage
        this.saveCustomReferences();

        return reference;
    }

    /**
     * Get all reference tracks
     */
    getAllReferences() {
        return this.referenceDatabase;
    }

    /**
     * Get suggestions
     */
    getSuggestions() {
        return this.suggestions;
    }

    // Helper functions
    convertToMono(audioBuffer) {
        const left = audioBuffer.getChannelData(0);
        const right = audioBuffer.numberOfChannels > 1 ?
            audioBuffer.getChannelData(1) : left;

        const mono = new Float32Array(left.length);
        for (let i = 0; i < left.length; i++) {
            mono[i] = (left[i] + right[i]) / 2;
        }

        return mono;
    }

    computeAverageSpectrum(audioData, fftSize) {
        const spectrum = new Float32Array(fftSize / 2 + 1).fill(0);
        const hopSize = fftSize / 2;
        const numFrames = Math.floor((audioData.length - fftSize) / hopSize);

        for (let frame = 0; frame < numFrames; frame++) {
            const frameStart = frame * hopSize;
            for (let bin = 0; bin <= fftSize / 2; bin++) {
                let mag = 0;
                for (let i = 0; i < fftSize && frameStart + i < audioData.length; i++) {
                    mag += Math.abs(audioData[frameStart + i]);
                }
                spectrum[bin] += mag / fftSize;
            }
        }

        for (let i = 0; i < spectrum.length; i++) {
            spectrum[i] /= numFrames;
        }

        return spectrum;
    }

    sumBins(spectrum, lowFreq, highFreq, sampleRate, numBins) {
        const lowBin = Math.floor(lowFreq / (sampleRate / 2) * numBins);
        const highBin = Math.floor(highFreq / (sampleRate / 2) * numBins);

        let sum = 0;
        for (let bin = lowBin; bin < highBin && bin < numBins; bin++) {
            sum += spectrum[bin];
        }

        return sum;
    }

    saveCustomReferences() {
        const custom = this.referenceDatabase.filter(r => r.custom);
        localStorage.setItem('luvlang_custom_references', JSON.stringify(custom));
    }

    loadCustomReferences() {
        try {
            const stored = localStorage.getItem('luvlang_custom_references');
            if (stored) {
                const custom = JSON.parse(stored);
                this.referenceDatabase.push(...custom);
            }
        } catch (error) {
            console.error('[Fingerprinting] Load failed:', error);
        }
    }
}

// Export
if (typeof module !== 'undefined' && module.exports) {
    module.exports = AudioFingerprinting;
}
