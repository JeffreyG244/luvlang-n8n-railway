/**
 * SMART MASTERING MODE SELECTION
 *
 * Analyzes audio content and automatically determines:
 * - Genre (EDM, Hip-Hop, Rock, Pop, Classical, Podcast, etc.)
 * - Target platform (Spotify, YouTube, Apple Music, etc.)
 * - Dynamic range style (Natural, Modern, Competitive)
 * - Optimal LUFS target
 *
 * No more guessing! AI detects what your track needs.
 */

class SmartModeSelector {
    constructor() {
        // Genre profiles with characteristic features
        this.genreProfiles = {
            'EDM/Electronic': {
                lowEndEnergy: [0.35, 0.50],    // High bass
                transientDensity: [8, 20],     // Many transients
                spectralCentroid: [2000, 5000],
                crestFactor: [3, 8],           // Moderate dynamics
                targetLUFS: -8,
                platform: 'SoundCloud',
                dynamicStyle: 'competitive'
            },
            'Hip-Hop/Rap': {
                lowEndEnergy: [0.40, 0.55],    // Very high bass
                transientDensity: [5, 12],
                spectralCentroid: [1500, 4000],
                crestFactor: [3, 7],
                targetLUFS: -9,
                platform: 'Spotify',
                dynamicStyle: 'competitive'
            },
            'Rock/Metal': {
                lowEndEnergy: [0.25, 0.40],
                transientDensity: [10, 25],    // Lots of drums
                spectralCentroid: [2500, 6000], // Bright
                crestFactor: [4, 10],
                targetLUFS: -10,
                platform: 'Spotify',
                dynamicStyle: 'modern'
            },
            'Pop/Top 40': {
                lowEndEnergy: [0.30, 0.45],
                transientDensity: [6, 15],
                spectralCentroid: [2000, 5000],
                crestFactor: [4, 9],
                targetLUFS: -11,
                platform: 'Apple Music',
                dynamicStyle: 'modern'
            },
            'Classical/Orchestral': {
                lowEndEnergy: [0.20, 0.35],
                transientDensity: [2, 8],      // Fewer transients
                spectralCentroid: [1000, 4000],
                crestFactor: [10, 25],         // High dynamics!
                targetLUFS: -18,
                platform: 'Tidal',
                dynamicStyle: 'natural'
            },
            'Jazz/Blues': {
                lowEndEnergy: [0.25, 0.40],
                transientDensity: [5, 12],
                spectralCentroid: [1500, 4500],
                crestFactor: [8, 18],
                targetLUFS: -16,
                platform: 'Tidal',
                dynamicStyle: 'natural'
            },
            'Acoustic/Folk': {
                lowEndEnergy: [0.20, 0.35],
                transientDensity: [3, 10],
                spectralCentroid: [1200, 4000],
                crestFactor: [8, 16],
                targetLUFS: -16,
                platform: 'Apple Music',
                dynamicStyle: 'natural'
            },
            'Podcast/Spoken Word': {
                lowEndEnergy: [0.15, 0.30],
                transientDensity: [1, 5],      // Low transient activity
                spectralCentroid: [500, 2000], // Voice range
                crestFactor: [6, 12],
                targetLUFS: -16,               // Podcast standard
                platform: 'Podcast',
                dynamicStyle: 'broadcast'
            },
            'Indie/Alternative': {
                lowEndEnergy: [0.25, 0.40],
                transientDensity: [6, 14],
                spectralCentroid: [1800, 5000],
                crestFactor: [6, 14],
                targetLUFS: -13,
                platform: 'Spotify',
                dynamicStyle: 'modern'
            },
            'Country': {
                lowEndEnergy: [0.25, 0.38],
                transientDensity: [6, 13],
                spectralCentroid: [2000, 5500], // Bright vocals
                crestFactor: [6, 12],
                targetLUFS: -12,
                platform: 'Spotify',
                dynamicStyle: 'modern'
            }
        };

        // Platform optimization profiles
        this.platformProfiles = {
            'Spotify': { targetLUFS: -14, maxTruePeak: -1.0, normalization: true },
            'Apple Music': { targetLUFS: -16, maxTruePeak: -1.0, normalization: true },
            'YouTube': { targetLUFS: -13, maxTruePeak: -1.0, normalization: true },
            'SoundCloud': { targetLUFS: -11, maxTruePeak: -0.5, normalization: false },
            'Tidal': { targetLUFS: -14, maxTruePeak: -1.0, normalization: true },
            'Amazon Music': { targetLUFS: -14, maxTruePeak: -1.0, normalization: true },
            'Deezer': { targetLUFS: -15, maxTruePeak: -1.0, normalization: true },
            'Podcast': { targetLUFS: -16, maxTruePeak: -1.0, normalization: false },
            'Radio/Club': { targetLUFS: -9, maxTruePeak: -0.3, normalization: false },
            'Audiophile': { targetLUFS: -18, maxTruePeak: -1.5, normalization: false }
        };

        this.detectedMode = null;
    }

    /**
     * Analyze audio and detect optimal mastering mode
     * @param {AudioBuffer} audioBuffer - Audio to analyze
     * @returns {Object} Detected mode and recommendations
     */
    async detectMode(audioBuffer) {
        console.log('[Smart Mode] Analyzing audio content...');

        // Extract audio features
        const features = await this.extractFeatures(audioBuffer);

        console.log('[Smart Mode] Extracted features:', features);

        // Match against genre profiles
        const genreMatch = this.matchGenre(features);

        // Detect if already mastered
        const masteringStatus = this.detectMasteringStatus(features);

        // Determine optimal platform
        const platform = genreMatch.profile.platform;

        // Determine target LUFS
        const targetLUFS = this.calculateOptimalLUFS(
            genreMatch.genre,
            features,
            masteringStatus
        );

        // Generate recommendations
        const recommendations = this.generateRecommendations(
            genreMatch,
            features,
            masteringStatus,
            platform,
            targetLUFS
        );

        this.detectedMode = {
            genre: genreMatch.genre,
            confidence: genreMatch.confidence,
            platform,
            targetLUFS,
            dynamicStyle: genreMatch.profile.dynamicStyle,
            masteringStatus,
            features,
            recommendations
        };

        console.log('[Smart Mode] Detected:', this.detectedMode.genre,
                    `(${(this.detectedMode.confidence * 100).toFixed(0)}% confidence)`);

        return this.detectedMode;
    }

    /**
     * Extract audio features for genre detection
     */
    async extractFeatures(audioBuffer) {
        const monoData = this.convertToMono(audioBuffer);
        const sampleRate = audioBuffer.sampleRate;

        // 1. Spectral features
        const spectral = this.analyzeSpectrum(monoData, sampleRate);

        // 2. Dynamic features
        const dynamics = this.analyzeDynamics(monoData);

        // 3. Rhythmic features
        const rhythm = this.analyzeRhythm(monoData, sampleRate);

        // 4. Timbral features
        const timbre = this.analyzeTimbr(monoData, sampleRate);

        return {
            // Spectral
            lowEndEnergy: spectral.lowEnd,
            midEnergy: spectral.mid,
            highEndEnergy: spectral.highEnd,
            spectralCentroid: spectral.centroid,
            spectralBrightness: spectral.brightness,
            spectralRolloff: spectral.rolloff,

            // Dynamic
            crestFactor: dynamics.crestFactor,
            dynamicRange: dynamics.range,
            peakLevel: dynamics.peak,
            rmsLevel: dynamics.rms,

            // Rhythmic
            transientDensity: rhythm.transientDensity,
            tempo: rhythm.tempo,
            rhythmicRegularity: rhythm.regularity,

            // Timbral
            harmonicContent: timbre.harmonic,
            noisiness: timbre.noisiness,
            warmth: timbre.warmth
        };
    }

    /**
     * Analyze spectrum
     */
    analyzeSpectrum(audioData, sampleRate) {
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

        // Spectral rolloff (95% of energy)
        let cumulativeEnergy = 0;
        const targetEnergy = totalMag * 0.95;
        let rolloff = 0;
        for (let i = 0; i < numBins; i++) {
            cumulativeEnergy += spectrum[i];
            if (cumulativeEnergy >= targetEnergy) {
                rolloff = (i / numBins) * (sampleRate / 2);
                break;
            }
        }

        return {
            lowEnd: lowEnd / (total + 1e-12),
            mid: mid / (total + 1e-12),
            highEnd: highEnd / (total + 1e-12),
            centroid,
            brightness: highEnd / (total + 1e-12),
            rolloff
        };
    }

    /**
     * Analyze dynamics
     */
    analyzeDynamics(audioData) {
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
            peak: peakDB,
            rms: rmsDB,
            crestFactor,
            range: peakDB - rmsDB
        };
    }

    /**
     * Analyze rhythm/tempo
     */
    analyzeRhythm(audioData, sampleRate) {
        // Detect transients
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
        const transientDensity = transientCount / duration;

        // Estimate tempo (simplified - would use autocorrelation in production)
        const tempo = this.estimateTempo(audioData, sampleRate);

        return {
            transientDensity,
            tempo,
            regularity: 0.5 // Placeholder - would analyze beat regularity
        };
    }

    /**
     * Analyze timbre
     */
    analyzeTimbr(audioData, sampleRate) {
        const spectrum = this.computeAverageSpectrum(audioData, 2048);

        // Harmonic content (peaks in spectrum)
        const peaks = this.findPeaks(spectrum);
        const harmonicContent = peaks.length / spectrum.length;

        // Noisiness (spectral flatness)
        const geometricMean = Math.exp(
            spectrum.reduce((sum, val) => sum + Math.log(val + 1e-12), 0) / spectrum.length
        );
        const arithmeticMean = spectrum.reduce((a, b) => a + b, 0) / spectrum.length;
        const noisiness = geometricMean / (arithmeticMean + 1e-12);

        // Warmth (low-mid balance)
        const warmth = this.sumBins(spectrum, 200, 800, sampleRate, spectrum.length) /
                      this.sumBins(spectrum, 0, sampleRate / 2, sampleRate, spectrum.length);

        return {
            harmonic: harmonicContent,
            noisiness,
            warmth
        };
    }

    /**
     * Match features to genre
     */
    matchGenre(features) {
        const scores = {};

        for (const [genre, profile] of Object.entries(this.genreProfiles)) {
            let score = 0;
            let factors = 0;

            // Check low-end energy
            if (features.lowEndEnergy >= profile.lowEndEnergy[0] &&
                features.lowEndEnergy <= profile.lowEndEnergy[1]) {
                score += 25;
            }
            factors++;

            // Check transient density
            if (features.transientDensity >= profile.transientDensity[0] &&
                features.transientDensity <= profile.transientDensity[1]) {
                score += 25;
            }
            factors++;

            // Check spectral centroid
            if (features.spectralCentroid >= profile.spectralCentroid[0] &&
                features.spectralCentroid <= profile.spectralCentroid[1]) {
                score += 25;
            }
            factors++;

            // Check crest factor
            if (features.crestFactor >= profile.crestFactor[0] &&
                features.crestFactor <= profile.crestFactor[1]) {
                score += 25;
            }
            factors++;

            scores[genre] = score;
        }

        // Find best match
        let bestGenre = null;
        let bestScore = 0;

        for (const [genre, score] of Object.entries(scores)) {
            if (score > bestScore) {
                bestScore = score;
                bestGenre = genre;
            }
        }

        return {
            genre: bestGenre,
            confidence: bestScore / 100,
            profile: this.genreProfiles[bestGenre],
            allScores: scores
        };
    }

    /**
     * Detect if audio is already mastered
     */
    detectMasteringStatus(features) {
        const indicators = {
            isLoud: features.rmsLevel > -16,              // Mastered tracks are loud
            isCompressed: features.crestFactor < 6,       // Mastered tracks are compressed
            isLimited: features.peakLevel > -1,           // Mastered tracks hit near 0dBFS
            isProcessed: features.spectralBrightness > 0.25 // Mastered tracks often bright
        };

        const masteredCount = Object.values(indicators).filter(Boolean).length;
        const confidence = masteredCount / Object.keys(indicators).length;

        return {
            isMastered: masteredCount >= 3,
            confidence,
            indicators
        };
    }

    /**
     * Calculate optimal target LUFS
     */
    calculateOptimalLUFS(genre, features, masteringStatus) {
        let targetLUFS = this.genreProfiles[genre].targetLUFS;

        // If already mastered, suggest minimal adjustment
        if (masteringStatus.isMastered) {
            console.log('[Smart Mode] Audio appears already mastered - using conservative target');
            targetLUFS = Math.max(targetLUFS, -13); // Don't over-compress
        }

        // If high dynamic range (classical, jazz), preserve it
        if (features.crestFactor > 12) {
            console.log('[Smart Mode] High dynamic range detected - preserving');
            targetLUFS = Math.min(targetLUFS, -16);
        }

        return targetLUFS;
    }

    /**
     * Generate recommendations
     */
    generateRecommendations(genreMatch, features, masteringStatus, platform, targetLUFS) {
        const recommendations = [];

        // Genre-specific recommendations
        if (genreMatch.genre.includes('EDM')) {
            recommendations.push('Use sidechain compression for pumping effect');
            recommendations.push('Boost sub-bass (30-60Hz) for club systems');
            recommendations.push('Apply multiband compression for energy');
        } else if (genreMatch.genre.includes('Classical')) {
            recommendations.push('Preserve dynamic range - use minimal compression');
            recommendations.push('Light limiting only (ceiling: -1.5 dBTP)');
            recommendations.push('Natural room ambiance - avoid excessive reverb');
        } else if (genreMatch.genre.includes('Podcast')) {
            recommendations.push('Apply noise gate to remove silence');
            recommendations.push('De-ess for sibilance control');
            recommendations.push('Target -16 LUFS for podcast standard');
        }

        // Feature-based recommendations
        if (features.lowEndEnergy < 0.2) {
            recommendations.push('⚠️ Thin low-end - consider bass boost (+2dB @ 80Hz)');
        }

        if (features.crestFactor < 4) {
            recommendations.push('⚠️ Over-compressed - reduce compression ratio');
        }

        if (features.spectralBrightness > 0.4) {
            recommendations.push('⚠️ Harsh highs - apply de-essing or high-shelf cut');
        }

        // Mastering status recommendations
        if (masteringStatus.isMastered) {
            recommendations.push('ℹ️ Audio appears pre-mastered - use gentle settings');
            recommendations.push('ℹ️ Consider using "Mastered Audio" preset');
        }

        // Platform recommendations
        const platformProfile = this.platformProfiles[platform];
        recommendations.push(`📊 Target ${targetLUFS} LUFS for ${platform}`);
        recommendations.push(`🎚️ True peak limit: ${platformProfile.maxTruePeak} dBTP`);

        return recommendations;
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

    findPeaks(spectrum) {
        const peaks = [];
        for (let i = 1; i < spectrum.length - 1; i++) {
            if (spectrum[i] > spectrum[i - 1] && spectrum[i] > spectrum[i + 1]) {
                peaks.push(i);
            }
        }
        return peaks;
    }

    estimateTempo(audioData, sampleRate) {
        // Simplified tempo estimation - would use autocorrelation in production
        return 120; // Placeholder BPM
    }

    getDetectedMode() {
        return this.detectedMode;
    }
}

// Export
if (typeof module !== 'undefined' && module.exports) {
    module.exports = SmartModeSelector;
}
