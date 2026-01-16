/**
 * INTELLIGENT PROCESSING CHAIN OPTIMIZER
 *
 * Analyzes audio content and determines the optimal order of processing:
 * - Should EQ come before or after compression?
 * - Should de-essing happen before dynamics?
 * - Should M/S processing be first or last?
 * - Should saturation come before or after limiting?
 *
 * Different material requires different processing orders!
 *
 * Examples:
 * - Harsh vocals: De-ess → EQ → Compress (remove harshness before compression)
 * - Muddy mix: HPF → EQ → Multiband → Limiter (clean low-end first)
 * - Clean mix: EQ → Compress → Saturation → Limiter (standard chain)
 */

class ProcessingChainOptimizer {
    constructor() {
        // Available processing modules
        this.availableModules = [
            'high-pass-filter',
            'spectral-denoiser',
            'de-esser',
            'eq-correction',
            'dynamic-eq',
            'compression',
            'multiband-compression',
            'ms-processing',
            'harmonic-exciter',
            'stereo-widening',
            'limiting',
            'dithering'
        ];

        // Optimized chain will be stored here
        this.optimizedChain = [];

        // Analysis results
        this.audioProfile = null;

        // Chain templates for different scenarios
        this.chainTemplates = {
            'clean-mix': {
                description: 'Well-recorded, balanced mix with no major issues',
                chain: [
                    'high-pass-filter',
                    'eq-correction',
                    'compression',
                    'harmonic-exciter',
                    'stereo-widening',
                    'limiting',
                    'dithering'
                ],
                score: 0
            },
            'harsh-vocals': {
                description: 'Vocals with harshness, sibilance, or brittleness',
                chain: [
                    'high-pass-filter',
                    'de-esser',           // Remove sibilance FIRST
                    'dynamic-eq',         // Tame harshness
                    'eq-correction',
                    'compression',        // Compress after de-essing
                    'harmonic-exciter',
                    'limiting',
                    'dithering'
                ],
                score: 0
            },
            'muddy-mix': {
                description: 'Mix with excessive low-end or frequency masking',
                chain: [
                    'high-pass-filter',   // Clean up sub-bass FIRST
                    'eq-correction',      // Cut mud before compression
                    'dynamic-eq',         // Control problem frequencies
                    'multiband-compression', // Address frequency-specific issues
                    'harmonic-exciter',
                    'limiting',
                    'dithering'
                ],
                score: 0
            },
            'thin-mix': {
                description: 'Mix lacking body, warmth, or low-end',
                chain: [
                    'eq-correction',      // Boost low-end first
                    'harmonic-exciter',   // Add harmonics early
                    'compression',        // Compress to add density
                    'multiband-compression',
                    'stereo-widening',
                    'limiting',
                    'dithering'
                ],
                score: 0
            },
            'noisy-recording': {
                description: 'Recording with noise, hiss, hum, or artifacts',
                chain: [
                    'spectral-denoiser',  // Remove noise FIRST
                    'high-pass-filter',
                    'dynamic-eq',
                    'eq-correction',
                    'compression',
                    'harmonic-exciter',
                    'limiting',
                    'dithering'
                ],
                score: 0
            },
            'bass-heavy': {
                description: 'EDM, Hip-Hop, or other bass-heavy genres',
                chain: [
                    'high-pass-filter',
                    'multiband-compression', // Control bass EARLY
                    'eq-correction',
                    'ms-processing',      // Tighten low-end in M/S
                    'compression',
                    'harmonic-exciter',
                    'limiting',
                    'dithering'
                ],
                score: 0
            },
            'acoustic-natural': {
                description: 'Acoustic, classical, or natural-sounding material',
                chain: [
                    'high-pass-filter',
                    'eq-correction',
                    'dynamic-eq',         // Gentle, adaptive processing
                    'compression',        // Light compression
                    'stereo-widening',    // Preserve spatial image
                    'limiting',
                    'dithering'
                ],
                score: 0
            },
            'broadcast-aggressive': {
                description: 'Aggressive processing for broadcast/streaming',
                chain: [
                    'high-pass-filter',
                    'spectral-denoiser',
                    'de-esser',
                    'multiband-compression', // Heavy multiband first
                    'dynamic-eq',
                    'eq-correction',
                    'compression',
                    'harmonic-exciter',
                    'limiting',
                    'dithering'
                ],
                score: 0
            }
        };
    }

    /**
     * Analyze audio and determine optimal processing chain
     * @param {AudioBuffer} audioBuffer - Audio to analyze
     * @returns {Object} Optimized chain and audio profile
     */
    async optimizeChain(audioBuffer) {
        console.log('[Chain Optimizer] Analyzing audio content...');

        // Step 1: Analyze audio characteristics
        this.audioProfile = await this.analyzeAudio(audioBuffer);

        console.log('[Chain Optimizer] Audio profile:', this.audioProfile);

        // Step 2: Score each chain template based on audio profile
        this.scoreChainTemplates(this.audioProfile);

        // Step 3: Select best chain
        const bestChain = this.selectBestChain();

        console.log('[Chain Optimizer] Optimal chain:', bestChain.name);
        console.log('[Chain Optimizer] Description:', bestChain.description);
        console.log('[Chain Optimizer] Modules:', bestChain.chain.join(' → '));

        this.optimizedChain = bestChain.chain;

        return {
            chain: bestChain.chain,
            chainName: bestChain.name,
            description: bestChain.description,
            score: bestChain.score,
            audioProfile: this.audioProfile,
            reasoning: this.explainChainChoice(bestChain.name)
        };
    }

    /**
     * Analyze audio characteristics
     */
    async analyzeAudio(audioBuffer) {
        const monoData = this.convertToMono(audioBuffer);

        // 1. Spectral analysis
        const spectral = this.analyzeSpectrum(monoData, audioBuffer.sampleRate);

        // 2. Dynamic range analysis
        const dynamics = this.analyzeDynamics(monoData);

        // 3. Noise analysis
        const noise = this.analyzeNoise(monoData, audioBuffer.sampleRate);

        // 4. Transient analysis
        const transients = this.analyzeTransients(monoData, audioBuffer.sampleRate);

        // 5. Stereo analysis (if stereo)
        const stereo = audioBuffer.numberOfChannels > 1 ?
            this.analyzeStereo(audioBuffer) : null;

        // 6. Frequency balance
        const balance = this.analyzeFrequencyBalance(spectral);

        // 7. Clipping/distortion detection
        const clipping = this.detectClipping(monoData);

        return {
            // Spectral characteristics
            lowEndEnergy: spectral.lowEnd,
            midEnergy: spectral.mid,
            highEndEnergy: spectral.highEnd,
            spectralTilt: spectral.tilt,
            spectralCentroid: spectral.centroid,

            // Frequency balance issues
            isMuddy: balance.muddy,
            isThin: balance.thin,
            isHarsh: balance.harsh,
            isBright: balance.bright,
            isDark: balance.dark,

            // Dynamic characteristics
            crestFactor: dynamics.crestFactor,
            peakLevel: dynamics.peak,
            rmsLevel: dynamics.rms,
            dynamicRange: dynamics.range,
            isOverCompressed: dynamics.overCompressed,

            // Noise characteristics
            noiseFloor: noise.floor,
            hasHiss: noise.hiss,
            hasHum: noise.hum,
            hasBroadbandNoise: noise.broadband,
            snr: noise.snr,

            // Transient characteristics
            transientDensity: transients.density,
            isPercussive: transients.percussive,
            avgTransientStrength: transients.strength,

            // Stereo characteristics (if applicable)
            stereoWidth: stereo?.width || 0,
            phaseCoherence: stereo?.phase || 1,
            hasPhaseIssues: stereo?.phaseIssues || false,

            // Quality indicators
            hasClipping: clipping.detected,
            clippingPercentage: clipping.percentage,
            overallQuality: this.calculateOverallQuality({
                dynamics, noise, clipping, balance
            })
        };
    }

    /**
     * Analyze frequency spectrum
     */
    analyzeSpectrum(audioData, sampleRate) {
        const fftSize = 8192;
        const numBins = fftSize / 2 + 1;
        const spectrum = new Float32Array(numBins).fill(0);

        // Compute average spectrum over entire file
        const hopSize = fftSize / 2;
        const numFrames = Math.floor((audioData.length - fftSize) / hopSize);

        for (let frame = 0; frame < numFrames; frame++) {
            const frameStart = frame * hopSize;
            for (let bin = 0; bin < numBins; bin++) {
                // Simplified - use proper FFT in production
                let mag = 0;
                for (let i = 0; i < fftSize && frameStart + i < audioData.length; i++) {
                    mag += Math.abs(audioData[frameStart + i]);
                }
                spectrum[bin] += mag / fftSize;
            }
        }

        // Normalize
        for (let i = 0; i < numBins; i++) {
            spectrum[i] /= numFrames;
        }

        // Calculate spectral features
        const lowEnd = this.sumBins(spectrum, 20, 250, sampleRate, numBins);
        const mid = this.sumBins(spectrum, 250, 4000, sampleRate, numBins);
        const highEnd = this.sumBins(spectrum, 4000, 20000, sampleRate, numBins);
        const total = lowEnd + mid + highEnd;

        // Spectral tilt (bright vs dark)
        const tilt = (highEnd - lowEnd) / (total + 1e-12);

        // Spectral centroid (brightness measure)
        let centroid = 0;
        let totalMag = 0;
        for (let bin = 0; bin < numBins; bin++) {
            const freq = (bin / numBins) * (sampleRate / 2);
            centroid += spectrum[bin] * freq;
            totalMag += spectrum[bin];
        }
        centroid /= (totalMag + 1e-12);

        return {
            lowEnd: lowEnd / (total + 1e-12),
            mid: mid / (total + 1e-12),
            highEnd: highEnd / (total + 1e-12),
            tilt,
            centroid
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
            sumSquares += audioData[i] * audioData[i];
        }

        const rms = Math.sqrt(sumSquares / audioData.length);
        const crestFactor = peak / (rms + 1e-12);
        const peakDB = 20 * Math.log10(peak + 1e-12);
        const rmsDB = 20 * Math.log10(rms + 1e-12);
        const range = peakDB - rmsDB;

        return {
            peak: peakDB,
            rms: rmsDB,
            crestFactor,
            range,
            overCompressed: crestFactor < 3 // Typical over-compression indicator
        };
    }

    /**
     * Analyze noise characteristics
     */
    analyzeNoise(audioData, sampleRate) {
        // Find quietest 10% of audio (likely noise floor)
        const sorted = Array.from(audioData).map(Math.abs).sort((a, b) => a - b);
        const noiseFloorIndex = Math.floor(sorted.length * 0.1);
        const noiseFloor = sorted[noiseFloorIndex];
        const noiseFloorDB = 20 * Math.log10(noiseFloor + 1e-12);

        // Calculate SNR
        const signal = sorted[Math.floor(sorted.length * 0.95)]; // 95th percentile
        const snr = 20 * Math.log10((signal + 1e-12) / (noiseFloor + 1e-12));

        // Detect specific noise types (simplified)
        const hasHiss = noiseFloorDB > -60; // High noise floor suggests hiss
        const hasHum = false; // Would need spectral analysis at 50/60Hz
        const broadband = noiseFloorDB > -50;

        return {
            floor: noiseFloorDB,
            snr,
            hiss: hasHiss,
            hum: hasHum,
            broadband
        };
    }

    /**
     * Analyze transients
     */
    analyzeTransients(audioData, sampleRate) {
        const windowSize = Math.floor(sampleRate * 0.005); // 5ms windows
        let transientCount = 0;
        let totalStrength = 0;

        for (let i = windowSize; i < audioData.length; i += windowSize) {
            // Calculate RMS of current and previous window
            let currentRMS = 0;
            let previousRMS = 0;

            for (let j = 0; j < windowSize; j++) {
                if (i + j < audioData.length) {
                    currentRMS += audioData[i + j] ** 2;
                }
                if (i - windowSize + j >= 0) {
                    previousRMS += audioData[i - windowSize + j] ** 2;
                }
            }

            currentRMS = Math.sqrt(currentRMS / windowSize);
            previousRMS = Math.sqrt(previousRMS / windowSize);

            // Detect transient (sudden energy increase)
            const currentDB = 20 * Math.log10(currentRMS + 1e-12);
            const previousDB = 20 * Math.log10(previousRMS + 1e-12);
            const diff = currentDB - previousDB;

            if (diff > 10) { // 10dB increase = transient
                transientCount++;
                totalStrength += diff;
            }
        }

        const duration = audioData.length / sampleRate;
        const density = transientCount / duration; // transients per second
        const avgStrength = transientCount > 0 ? totalStrength / transientCount : 0;

        return {
            density,
            percussive: density > 10, // More than 10 transients/sec = percussive
            strength: avgStrength
        };
    }

    /**
     * Analyze stereo field
     */
    analyzeStereo(audioBuffer) {
        const left = audioBuffer.getChannelData(0);
        const right = audioBuffer.getChannelData(1);

        let correlation = 0;
        let leftPower = 0;
        let rightPower = 0;
        let sidePower = 0;

        for (let i = 0; i < left.length; i++) {
            correlation += left[i] * right[i];
            leftPower += left[i] ** 2;
            rightPower += right[i] ** 2;

            const side = (left[i] - right[i]) / 2;
            sidePower += side ** 2;
        }

        correlation /= Math.sqrt(leftPower * rightPower + 1e-12);
        const width = (sidePower / (leftPower + rightPower + 1e-12)) * 100;

        return {
            phase: correlation,
            width,
            phaseIssues: correlation < 0.3 // Poor phase correlation
        };
    }

    /**
     * Analyze frequency balance
     */
    analyzeFrequencyBalance(spectral) {
        return {
            muddy: spectral.lowEnd > 0.4 && spectral.mid < 0.3,
            thin: spectral.lowEnd < 0.15 && spectral.mid > 0.4,
            harsh: spectral.highEnd > 0.35,
            bright: spectral.tilt > 0.3,
            dark: spectral.tilt < -0.3
        };
    }

    /**
     * Detect clipping
     */
    detectClipping(audioData) {
        let clippedSamples = 0;
        const threshold = 0.999; // Near digital maximum

        for (let i = 0; i < audioData.length; i++) {
            if (Math.abs(audioData[i]) >= threshold) {
                clippedSamples++;
            }
        }

        const percentage = (clippedSamples / audioData.length) * 100;

        return {
            detected: clippedSamples > 0,
            percentage,
            count: clippedSamples
        };
    }

    /**
     * Calculate overall quality score
     */
    calculateOverallQuality(metrics) {
        let score = 100;

        // Penalize for clipping
        if (metrics.clipping.detected) {
            score -= metrics.clipping.percentage * 10;
        }

        // Penalize for noise
        if (metrics.noise.snr < 40) {
            score -= (40 - metrics.noise.snr) / 2;
        }

        // Penalize for over-compression
        if (metrics.dynamics.overCompressed) {
            score -= 15;
        }

        // Penalize for frequency imbalance
        if (metrics.balance.muddy || metrics.balance.harsh) {
            score -= 10;
        }

        return Math.max(0, Math.min(100, score));
    }

    /**
     * Score each chain template based on audio profile
     */
    scoreChainTemplates(profile) {
        for (const [name, template] of Object.entries(this.chainTemplates)) {
            let score = 0;

            // Score based on detected issues
            switch (name) {
                case 'clean-mix':
                    score = profile.overallQuality;
                    if (!profile.hasClipping && !profile.isMuddy && !profile.isHarsh) score += 20;
                    break;

                case 'harsh-vocals':
                    if (profile.isHarsh) score += 40;
                    if (profile.highEndEnergy > 0.3) score += 30;
                    if (profile.spectralTilt > 0.2) score += 20;
                    break;

                case 'muddy-mix':
                    if (profile.isMuddy) score += 50;
                    if (profile.lowEndEnergy > 0.35) score += 30;
                    if (profile.spectralCentroid < 1500) score += 20;
                    break;

                case 'thin-mix':
                    if (profile.isThin) score += 50;
                    if (profile.lowEndEnergy < 0.2) score += 40;
                    break;

                case 'noisy-recording':
                    if (profile.hasHiss || profile.hasBroadbandNoise) score += 50;
                    if (profile.snr < 40) score += 30;
                    if (profile.noiseFloor > -60) score += 20;
                    break;

                case 'bass-heavy':
                    if (profile.lowEndEnergy > 0.4) score += 40;
                    if (profile.isPercussive) score += 30;
                    break;

                case 'acoustic-natural':
                    if (profile.crestFactor > 8) score += 30; // High dynamic range
                    if (!profile.isPercussive) score += 20;
                    if (profile.phaseCoherence > 0.7) score += 20;
                    break;

                case 'broadcast-aggressive':
                    if (profile.isOverCompressed) score += 20;
                    if (profile.dynamicRange < 10) score += 20;
                    break;
            }

            template.score = score;
        }
    }

    /**
     * Select best chain based on scores
     */
    selectBestChain() {
        let bestName = null;
        let bestScore = -Infinity;

        for (const [name, template] of Object.entries(this.chainTemplates)) {
            if (template.score > bestScore) {
                bestScore = template.score;
                bestName = name;
            }
        }

        return {
            name: bestName,
            chain: this.chainTemplates[bestName].chain,
            description: this.chainTemplates[bestName].description,
            score: bestScore
        };
    }

    /**
     * Explain why this chain was chosen
     */
    explainChainChoice(chainName) {
        const explanations = {
            'clean-mix': [
                'No major spectral imbalances detected',
                'Good signal-to-noise ratio',
                'Appropriate dynamic range',
                'Using standard mastering chain order'
            ],
            'harsh-vocals': [
                'Detected excessive high-frequency energy',
                'De-esser placed before compression to prevent sibilance boost',
                'Dynamic EQ will tame harsh frequencies adaptively',
                'EQ correction after de-essing for surgical fixes'
            ],
            'muddy-mix': [
                'Detected excessive low-end energy',
                'High-pass filter removes sub-sonic rumble first',
                'EQ cuts mud before compression to prevent pumping',
                'Multiband compression for frequency-specific control'
            ],
            'thin-mix': [
                'Low-end energy below optimal level',
                'EQ boost applied early to add body',
                'Harmonic exciter adds warmth and harmonics',
                'Compression adds density and sustain'
            ],
            'noisy-recording': [
                'Significant noise floor detected',
                'Spectral denoiser placed first to remove noise',
                'Processing applied after noise removal for cleaner result',
                'Dynamic EQ prevents noise modulation'
            ],
            'bass-heavy': [
                'High low-frequency content detected',
                'Multiband compression controls bass early',
                'M/S processing tightens low-end in mono',
                'Prevents bass from overwhelming other frequencies'
            ],
            'acoustic-natural': [
                'High dynamic range preserved',
                'Gentle processing maintains natural sound',
                'Dynamic EQ for transparent control',
                'Minimal compression to preserve dynamics'
            ],
            'broadcast-aggressive': [
                'Multiple stages of control for broadcast loudness',
                'Heavy multiband compression for consistent level',
                'De-esser prevents sibilance overload',
                'Aggressive limiting for maximum loudness'
            ]
        };

        return explanations[chainName] || ['Optimal chain selected based on audio analysis'];
    }

    /**
     * Helper: Sum spectral bins in frequency range
     */
    sumBins(spectrum, lowFreq, highFreq, sampleRate, numBins) {
        const lowBin = Math.floor(lowFreq / (sampleRate / 2) * numBins);
        const highBin = Math.floor(highFreq / (sampleRate / 2) * numBins);

        let sum = 0;
        for (let bin = lowBin; bin < highBin && bin < numBins; bin++) {
            sum += spectrum[bin];
        }

        return sum;
    }

    /**
     * Helper: Convert to mono
     */
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

    /**
     * Get optimized chain
     */
    getOptimizedChain() {
        return this.optimizedChain;
    }

    /**
     * Get audio profile
     */
    getAudioProfile() {
        return this.audioProfile;
    }
}

// Export
if (typeof module !== 'undefined' && module.exports) {
    module.exports = ProcessingChainOptimizer;
}
