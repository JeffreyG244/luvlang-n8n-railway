/**
 * INTELLIGENT DITHERING SYSTEM
 *
 * AI-selected dithering for bit-depth reduction:
 * - TPDF (Triangular PDF) - General music
 * - Noise Shaping - Classical/acoustic (psychoacoustic noise shaping)
 * - POW-R - Professional dithering
 * - No Dither - Already 24-bit with high noise floor
 *
 * Auto-selects based on content analysis
 */

class IntelligentDitheringSystem {
    constructor() {
        this.algorithms = {
            'TPDF': {
                name: 'TPDF (Triangular Probability Density Function)',
                description: 'General-purpose dithering for most music',
                noiseShape: false,
                quality: 'standard',
                cpuLoad: 'low'
            },
            'RPDF': {
                name: 'RPDF (Rectangular Probability Density Function)',
                description: 'Simple dithering with white noise',
                noiseShape: false,
                quality: 'basic',
                cpuLoad: 'very low'
            },
            'Noise-Shaped-1': {
                name: 'Noise Shaping (Light)',
                description: 'Psychoacoustic noise shaping for classical/acoustic',
                noiseShape: true,
                shapeOrder: 1,
                quality: 'high',
                cpuLoad: 'medium'
            },
            'Noise-Shaped-2': {
                name: 'Noise Shaping (Moderate)',
                description: 'Professional noise shaping for studio masters',
                noiseShape: true,
                shapeOrder: 2,
                quality: 'very high',
                cpuLoad: 'medium-high'
            },
            'POW-R-1': {
                name: 'POW-R 1 (Professional)',
                description: 'Professional dithering with minimal artifacts',
                noiseShape: true,
                shapeOrder: 1,
                quality: 'professional',
                cpuLoad: 'medium'
            },
            'None': {
                name: 'No Dithering',
                description: 'Skip dithering (not recommended for 16-bit)',
                noiseShape: false,
                quality: 'n/a',
                cpuLoad: 'none'
            }
        };

        this.selectedAlgorithm = null;
        this.ditherState = {
            errorL: [0, 0, 0],  // For noise shaping
            errorR: [0, 0, 0]
        };
    }

    /**
     * Auto-select dithering algorithm based on audio analysis
     * @param {AudioBuffer} audioBuffer - Audio to analyze
     * @param {number} targetBitDepth - Target bit depth (typically 16)
     * @param {number} sourceBitDepth - Source bit depth (typically 24 or 32)
     * @returns {string} Selected algorithm name
     */
    async selectAlgorithm(audioBuffer, targetBitDepth = 16, sourceBitDepth = 24) {
        console.log('[Dithering] Analyzing audio for optimal dithering...');

        // If no bit depth reduction needed, skip dithering
        if (targetBitDepth >= sourceBitDepth) {
            console.log('[Dithering] No bit depth reduction needed - skipping');
            this.selectedAlgorithm = 'None';
            return 'None';
        }

        // Analyze audio characteristics
        const analysis = await this.analyzeAudio(audioBuffer);

        console.log('[Dithering] Analysis:', analysis);

        // Decision logic
        let algorithm = 'TPDF'; // Default

        if (analysis.noiseFloor > -70) {
            // High noise floor - dithering won't help much
            algorithm = 'None';
            console.log('[Dithering] High noise floor detected - skipping dithering');
        } else if (analysis.dynamicRange > 60 && analysis.isAcoustic) {
            // High dynamic range acoustic music - use noise shaping
            algorithm = 'Noise-Shaped-2';
            console.log('[Dithering] Acoustic with high DR - using noise shaping');
        } else if (analysis.dynamicRange > 40) {
            // Moderate dynamic range - light noise shaping
            algorithm = 'Noise-Shaped-1';
            console.log('[Dithering] Moderate DR - using light noise shaping');
        } else if (analysis.isLoudMastered) {
            // Loud mastering - POW-R for minimal artifacts
            algorithm = 'POW-R-1';
            console.log('[Dithering] Loud master - using POW-R');
        } else {
            // General music - TPDF
            algorithm = 'TPDF';
            console.log('[Dithering] General music - using TPDF');
        }

        this.selectedAlgorithm = algorithm;
        console.log('[Dithering] Selected:', this.algorithms[algorithm].name);

        return algorithm;
    }

    /**
     * Analyze audio for dithering decision
     */
    async analyzeAudio(audioBuffer) {
        const monoData = this.convertToMono(audioBuffer);

        // Calculate noise floor
        const sorted = Array.from(monoData).map(Math.abs).sort((a, b) => a - b);
        const noiseFloor = sorted[Math.floor(sorted.length * 0.1)];
        const noiseFloorDB = 20 * Math.log10(noiseFloor + 1e-12);

        // Calculate dynamic range
        const peak = Math.max(...sorted);
        const peakDB = 20 * Math.log10(peak + 1e-12);
        const dynamicRange = peakDB - noiseFloorDB;

        // Detect acoustic content (high dynamic range, low transient density)
        const transientDensity = this.calculateTransientDensity(monoData, audioBuffer.sampleRate);
        const isAcoustic = dynamicRange > 50 && transientDensity < 5;

        // Detect loud mastering (low crest factor)
        let sumSquares = 0;
        for (let i = 0; i < monoData.length; i++) {
            sumSquares += monoData[i] ** 2;
        }
        const rms = Math.sqrt(sumSquares / monoData.length);
        const crestFactor = peak / (rms + 1e-12);
        const isLoudMastered = crestFactor < 5;

        return {
            noiseFloor: noiseFloorDB,
            dynamicRange,
            isAcoustic,
            isLoudMastered,
            crestFactor,
            transientDensity
        };
    }

    /**
     * Apply dithering to audio buffer
     * @param {AudioBuffer} audioBuffer - Input audio (24/32-bit)
     * @param {number} targetBitDepth - Target bit depth (usually 16)
     * @returns {AudioBuffer} Dithered audio
     */
    async applyDithering(audioBuffer, targetBitDepth = 16) {
        if (!this.selectedAlgorithm || this.selectedAlgorithm === 'None') {
            console.log('[Dithering] Skipping dithering');
            return audioBuffer;
        }

        console.log('[Dithering] Applying', this.algorithms[this.selectedAlgorithm].name);

        const algorithm = this.algorithms[this.selectedAlgorithm];
        const outputBuffer = new AudioContext().createBuffer(
            audioBuffer.numberOfChannels,
            audioBuffer.length,
            audioBuffer.sampleRate
        );

        // Process each channel
        for (let ch = 0; ch < audioBuffer.numberOfChannels; ch++) {
            const inputData = audioBuffer.getChannelData(ch);
            const outputData = outputBuffer.getChannelData(ch);

            if (algorithm.noiseShape) {
                this.applyNoiseShapedDither(inputData, outputData, targetBitDepth,
                                           algorithm.shapeOrder, ch);
            } else if (this.selectedAlgorithm === 'TPDF') {
                this.applyTPDFDither(inputData, outputData, targetBitDepth);
            } else if (this.selectedAlgorithm === 'RPDF') {
                this.applyRPDFDither(inputData, outputData, targetBitDepth);
            } else if (this.selectedAlgorithm.startsWith('POW-R')) {
                this.applyPOWRDither(inputData, outputData, targetBitDepth);
            }
        }

        console.log('[Dithering] Complete');
        return outputBuffer;
    }

    /**
     * Apply TPDF (Triangular PDF) dithering
     */
    applyTPDFDither(inputData, outputData, bitDepth) {
        const quantizationStep = 1 / Math.pow(2, bitDepth - 1);
        const ditherAmplitude = quantizationStep;

        for (let i = 0; i < inputData.length; i++) {
            // Generate TPDF noise (sum of two uniform random variables)
            const rand1 = (Math.random() - 0.5);
            const rand2 = (Math.random() - 0.5);
            const ditherNoise = (rand1 + rand2) * ditherAmplitude;

            // Add dither and quantize
            const dithered = inputData[i] + ditherNoise;
            outputData[i] = this.quantize(dithered, quantizationStep);
        }
    }

    /**
     * Apply RPDF (Rectangular PDF) dithering
     */
    applyRPDFDither(inputData, outputData, bitDepth) {
        const quantizationStep = 1 / Math.pow(2, bitDepth - 1);
        const ditherAmplitude = quantizationStep;

        for (let i = 0; i < inputData.length; i++) {
            // Generate RPDF noise (single uniform random variable)
            const ditherNoise = (Math.random() - 0.5) * ditherAmplitude;

            // Add dither and quantize
            const dithered = inputData[i] + ditherNoise;
            outputData[i] = this.quantize(dithered, quantizationStep);
        }
    }

    /**
     * Apply noise-shaped dithering
     */
    applyNoiseShapedDither(inputData, outputData, bitDepth, order, channel) {
        const quantizationStep = 1 / Math.pow(2, bitDepth - 1);
        const ditherAmplitude = quantizationStep;

        const error = channel === 0 ? this.ditherState.errorL : this.ditherState.errorR;

        // Noise shaping filter coefficients (1st order)
        const a1 = order >= 1 ? 0.5 : 0;
        const a2 = order >= 2 ? 0.25 : 0;

        for (let i = 0; i < inputData.length; i++) {
            // Generate TPDF noise
            const rand1 = (Math.random() - 0.5);
            const rand2 = (Math.random() - 0.5);
            const ditherNoise = (rand1 + rand2) * ditherAmplitude;

            // Apply noise shaping (push quantization error to higher frequencies)
            const shaped = inputData[i] + ditherNoise - (a1 * error[0] + a2 * error[1]);

            // Quantize
            const quantized = this.quantize(shaped, quantizationStep);

            // Calculate quantization error
            const quantError = shaped - quantized;

            // Update error buffer
            error[2] = error[1];
            error[1] = error[0];
            error[0] = quantError;

            outputData[i] = quantized;
        }
    }

    /**
     * Apply POW-R dithering (Professional Optimum Wordlength Reduction)
     */
    applyPOWRDither(inputData, outputData, bitDepth) {
        // POW-R uses shaped noise with psychoacoustic curve
        // Simplified implementation - full POW-R is proprietary
        const quantizationStep = 1 / Math.pow(2, bitDepth - 1);

        for (let i = 0; i < inputData.length; i++) {
            // Generate shaped noise
            const rand1 = (Math.random() - 0.5);
            const rand2 = (Math.random() - 0.5);
            const ditherNoise = (rand1 + rand2) * quantizationStep * 0.8; // Slightly less than TPDF

            const dithered = inputData[i] + ditherNoise;
            outputData[i] = this.quantize(dithered, quantizationStep);
        }
    }

    /**
     * Quantize sample to bit depth
     */
    quantize(sample, quantizationStep) {
        return Math.round(sample / quantizationStep) * quantizationStep;
    }

    /**
     * Calculate transient density
     */
    calculateTransientDensity(audioData, sampleRate) {
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
        return transientCount / duration;
    }

    /**
     * Convert to mono
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
     * Get selected algorithm info
     */
    getSelectedAlgorithm() {
        return this.selectedAlgorithm ?
            this.algorithms[this.selectedAlgorithm] : null;
    }

    /**
     * Get all available algorithms
     */
    getAvailableAlgorithms() {
        return this.algorithms;
    }
}

// Export
if (typeof module !== 'undefined' && module.exports) {
    module.exports = IntelligentDitheringSystem;
}
