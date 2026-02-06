/**
 * AI ARTIFACT & DISTORTION DETECTION SYSTEM
 *
 * Detects 8+ types of audio problems:
 * 1. Digital clipping
 * 2. Aliasing (from bad sample rate conversion)
 * 3. Intermodulation distortion (from over-processing)
 * 4. Phase cancellation
 * 5. Over-compression (pumping/breathing)
 * 6. Brick-wall limiting artifacts
 * 7. Sub-bass phase issues (mono compatibility)
 * 8. MP3 compression artifacts in source
 * 9. DC offset
 * 10. Intersample peaks
 *
 * Provides warnings and suggestions for fixes
 */

class ArtifactDetector {
    constructor() {
        this.detectedIssues = [];
        this.analysisResults = null;

        // Detection thresholds
        this.thresholds = {
            clipping: 0.999,          // Sample value threshold
            clippingPercent: 0.01,    // % of samples clipped
            dcOffset: 0.001,          // DC offset threshold
            phaseCorrelation: 0.3,    // Below this = phase issues
            pumpingThreshold: 3.0,    // dB variation for pumping detection
            aliasingThreshold: -60,   // dB - energy above Nyquist/2
            imdThreshold: -70,        // dB - intermodulation products
            mp3Threshold: -50         // dB - pre-echo detection
        };

        // Issue severity levels
        this.severityLevels = {
            CRITICAL: 'critical',
            WARNING: 'warning',
            INFO: 'info'
        };
    }

    /**
     * Run complete artifact detection analysis
     * @param {AudioBuffer} audioBuffer - Audio to analyze
     * @returns {Object} Detection results and suggestions
     */
    async detectArtifacts(audioBuffer) {

        this.detectedIssues = [];

        // Run all detection algorithms
        const results = {
            clipping: this.detectClipping(audioBuffer),
            dcOffset: this.detectDCOffset(audioBuffer),
            phaseIssues: this.detectPhaseIssues(audioBuffer),
            overCompression: this.detectOverCompression(audioBuffer),
            limitingArtifacts: this.detectLimitingArtifacts(audioBuffer),
            aliasing: await this.detectAliasing(audioBuffer),
            intermodulation: await this.detectIntermodulation(audioBuffer),
            mp3Artifacts: await this.detectMP3Artifacts(audioBuffer),
            subBassPhase: this.detectSubBassPhaseIssues(audioBuffer),
            intersamplePeaks: this.detectIntersamplePeaks(audioBuffer)
        };

        this.analysisResults = results;

        // Generate report
        const report = this.generateReport(results);


        return {
            results,
            issues: this.detectedIssues,
            report,
            overallScore: this.calculateQualityScore(results),
            hasProblems: this.detectedIssues.length > 0
        };
    }

    /**
     * DETECTION 1: Digital Clipping
     */
    detectClipping(audioBuffer) {
        let clippedSamples = 0;
        let totalSamples = 0;
        const clippedRegions = [];
        let consecutiveClips = 0;
        let lastClipIndex = -1;

        for (let ch = 0; ch < audioBuffer.numberOfChannels; ch++) {
            const data = audioBuffer.getChannelData(ch);

            for (let i = 0; i < data.length; i++) {
                totalSamples++;
                const abs = Math.abs(data[i]);

                if (abs >= this.thresholds.clipping) {
                    clippedSamples++;

                    // Track consecutive clips (indicates sustained clipping)
                    if (i === lastClipIndex + 1) {
                        consecutiveClips++;
                    } else {
                        if (consecutiveClips > 10) {
                            clippedRegions.push({
                                start: lastClipIndex - consecutiveClips,
                                length: consecutiveClips,
                                channel: ch
                            });
                        }
                        consecutiveClips = 1;
                    }
                    lastClipIndex = i;
                }
            }
        }

        const percentage = (clippedSamples / totalSamples) * 100;
        const detected = percentage > this.thresholds.clippingPercent;

        if (detected) {
            this.detectedIssues.push({
                type: 'Digital Clipping',
                severity: percentage > 1 ? this.severityLevels.CRITICAL : this.severityLevels.WARNING,
                description: `${clippedSamples.toLocaleString()} samples clipped (${percentage.toFixed(2)}%)`,
                suggestion: 'Reduce input gain before mastering. Use soft-clipping or repair tools.',
                autoFixable: true,
                locations: clippedRegions.slice(0, 10) // First 10 regions
            });
        }

        return {
            detected,
            clippedSamples,
            percentage,
            regions: clippedRegions.length
        };
    }

    /**
     * DETECTION 2: DC Offset
     */
    detectDCOffset(audioBuffer) {
        const offsets = [];

        for (let ch = 0; ch < audioBuffer.numberOfChannels; ch++) {
            const data = audioBuffer.getChannelData(ch);
            let sum = 0;

            for (let i = 0; i < data.length; i++) {
                sum += data[i];
            }

            const offset = sum / data.length;
            offsets.push(offset);

            if (Math.abs(offset) > this.thresholds.dcOffset) {
                this.detectedIssues.push({
                    type: 'DC Offset',
                    severity: this.severityLevels.WARNING,
                    description: `Channel ${ch + 1} has DC offset of ${(offset * 100).toFixed(3)}%`,
                    suggestion: 'Apply DC offset removal filter before processing.',
                    autoFixable: true
                });
            }
        }

        return {
            detected: offsets.some(o => Math.abs(o) > this.thresholds.dcOffset),
            offsets
        };
    }

    /**
     * DETECTION 3: Phase Cancellation Issues
     */
    detectPhaseIssues(audioBuffer) {
        if (audioBuffer.numberOfChannels < 2) {
            return { detected: false, correlation: 1.0 };
        }

        const left = audioBuffer.getChannelData(0);
        const right = audioBuffer.getChannelData(1);

        // Calculate correlation over sliding windows
        const windowSize = Math.floor(audioBuffer.sampleRate * 0.1); // 100ms windows
        const correlations = [];
        let problematicRegions = 0;

        for (let i = 0; i < left.length - windowSize; i += windowSize / 2) {
            let correlation = 0;
            let leftPower = 0;
            let rightPower = 0;

            for (let j = 0; j < windowSize; j++) {
                if (i + j < left.length) {
                    correlation += left[i + j] * right[i + j];
                    leftPower += left[i + j] ** 2;
                    rightPower += right[i + j] ** 2;
                }
            }

            const corr = correlation / Math.sqrt(leftPower * rightPower + 1e-12);
            correlations.push(corr);

            if (corr < this.thresholds.phaseCorrelation) {
                problematicRegions++;
            }
        }

        const avgCorrelation = correlations.reduce((a, b) => a + b, 0) / correlations.length;
        const detected = problematicRegions > correlations.length * 0.1; // More than 10% problematic

        if (detected) {
            this.detectedIssues.push({
                type: 'Phase Cancellation',
                severity: this.severityLevels.WARNING,
                description: `Poor stereo correlation detected (avg: ${avgCorrelation.toFixed(2)})`,
                suggestion: 'Check for out-of-phase signals. Consider M/S processing or phase correction.',
                autoFixable: false,
                details: {
                    averageCorrelation: avgCorrelation,
                    problematicRegions,
                    totalWindows: correlations.length
                }
            });
        }

        return {
            detected,
            avgCorrelation,
            correlations,
            problematicRegions
        };
    }

    /**
     * DETECTION 4: Over-Compression (Pumping/Breathing)
     */
    detectOverCompression(audioBuffer) {
        const monoData = this.convertToMono(audioBuffer);
        const windowSize = Math.floor(audioBuffer.sampleRate * 0.05); // 50ms
        const rmsValues = [];

        // Calculate RMS over windows
        for (let i = 0; i < monoData.length - windowSize; i += windowSize) {
            let sumSq = 0;
            for (let j = 0; j < windowSize; j++) {
                sumSq += monoData[i + j] ** 2;
            }
            const rms = Math.sqrt(sumSq / windowSize);
            const rmsDB = 20 * Math.log10(rms + 1e-12);
            rmsValues.push(rmsDB);
        }

        // Look for pumping (excessive RMS variation)
        let pumpingCount = 0;
        for (let i = 1; i < rmsValues.length; i++) {
            const diff = Math.abs(rmsValues[i] - rmsValues[i - 1]);
            if (diff > this.thresholds.pumpingThreshold) {
                pumpingCount++;
            }
        }

        // Calculate dynamic range
        const maxRMS = Math.max(...rmsValues);
        const minRMS = Math.min(...rmsValues.filter(v => v > -Infinity));
        const dynamicRange = maxRMS - minRMS;

        const detected = pumpingCount > rmsValues.length * 0.2 || dynamicRange < 3;

        if (detected) {
            this.detectedIssues.push({
                type: 'Over-Compression',
                severity: this.severityLevels.WARNING,
                description: `Excessive compression detected (DR: ${dynamicRange.toFixed(1)} dB)`,
                suggestion: 'Reduce compression ratio or increase attack/release times.',
                autoFixable: false,
                details: {
                    dynamicRange,
                    pumpingIncidents: pumpingCount,
                    totalWindows: rmsValues.length
                }
            });
        }

        return {
            detected,
            dynamicRange,
            pumpingCount,
            severity: dynamicRange < 3 ? 'severe' : dynamicRange < 6 ? 'moderate' : 'mild'
        };
    }

    /**
     * DETECTION 5: Brick-Wall Limiting Artifacts
     */
    detectLimitingArtifacts(audioBuffer) {
        const monoData = this.convertToMono(audioBuffer);
        let flatTopCount = 0;
        const flatTopThreshold = 0.98;
        const minFlatSamples = 3;

        let consecutiveFlat = 0;
        let lastValue = 0;

        for (let i = 0; i < monoData.length; i++) {
            const abs = Math.abs(monoData[i]);

            if (abs > flatTopThreshold && Math.abs(abs - Math.abs(lastValue)) < 0.001) {
                consecutiveFlat++;
            } else {
                if (consecutiveFlat >= minFlatSamples) {
                    flatTopCount++;
                }
                consecutiveFlat = 0;
            }

            lastValue = monoData[i];
        }

        const detected = flatTopCount > 100;

        if (detected) {
            this.detectedIssues.push({
                type: 'Brick-Wall Limiting Artifacts',
                severity: this.severityLevels.WARNING,
                description: `${flatTopCount} flat-top regions detected from aggressive limiting`,
                suggestion: 'Reduce limiter gain or increase ceiling. Use look-ahead limiting.',
                autoFixable: false
            });
        }

        return {
            detected,
            flatTopCount
        };
    }

    /**
     * DETECTION 6: Aliasing
     */
    async detectAliasing(audioBuffer) {
        // Aliasing detection requires spectral analysis above Nyquist/2
        const fftSize = 8192;
        const monoData = this.convertToMono(audioBuffer);
        const sampleRate = audioBuffer.sampleRate;

        let totalAliasEnergy = 0;
        let totalEnergy = 0;
        const numFrames = Math.floor(monoData.length / fftSize);

        for (let frame = 0; frame < numFrames; frame++) {
            const frameData = monoData.slice(frame * fftSize, (frame + 1) * fftSize);
            const spectrum = this.computeMagnitudeSpectrum(frameData);

            // Check energy above Nyquist/2 (indicates aliasing)
            const nyquistBin = spectrum.length / 2;
            const aliasBin = Math.floor(nyquistBin * 0.7); // Above 70% of Nyquist

            for (let bin = 0; bin < spectrum.length; bin++) {
                totalEnergy += spectrum[bin];
                if (bin > aliasBin) {
                    totalAliasEnergy += spectrum[bin];
                }
            }
        }

        const aliasRatio = totalAliasEnergy / (totalEnergy + 1e-12);
        const aliasDB = 20 * Math.log10(aliasRatio + 1e-12);
        const detected = aliasDB > this.thresholds.aliasingThreshold;

        if (detected) {
            this.detectedIssues.push({
                type: 'Aliasing',
                severity: this.severityLevels.INFO,
                description: `Aliasing detected (${aliasDB.toFixed(1)} dB)`,
                suggestion: 'Enable oversampling in processing plugins. Check sample rate conversion quality.',
                autoFixable: false
            });
        }

        return {
            detected,
            aliasDB,
            ratio: aliasRatio
        };
    }

    /**
     * DETECTION 7: Intermodulation Distortion
     */
    async detectIntermodulation(audioBuffer) {
        // IMD shows up as sum/difference frequencies
        // Simplified detection - look for unexpected spectral components
        const monoData = this.convertToMono(audioBuffer);
        const spectrum = this.computeMagnitudeSpectrum(monoData);

        // Find peaks
        const peaks = this.findSpectralPeaks(spectrum, 20);

        // Check for IMD products (sum/difference of main peaks)
        let imdProducts = 0;
        const imdThreshold = Math.pow(10, this.thresholds.imdThreshold / 20);

        for (let i = 0; i < peaks.length; i++) {
            for (let j = i + 1; j < peaks.length; j++) {
                const sum = peaks[i].bin + peaks[j].bin;
                const diff = Math.abs(peaks[i].bin - peaks[j].bin);

                // Check if these frequencies exist with significant energy
                if (sum < spectrum.length && spectrum[sum] > imdThreshold) {
                    imdProducts++;
                }
                if (spectrum[diff] > imdThreshold) {
                    imdProducts++;
                }
            }
        }

        const detected = imdProducts > 5;

        if (detected) {
            this.detectedIssues.push({
                type: 'Intermodulation Distortion',
                severity: this.severityLevels.WARNING,
                description: `${imdProducts} intermodulation products detected`,
                suggestion: 'Reduce saturation/distortion effects. Check for over-processing.',
                autoFixable: false
            });
        }

        return {
            detected,
            imdProducts
        };
    }

    /**
     * DETECTION 8: MP3 Compression Artifacts
     */
    async detectMP3Artifacts(audioBuffer) {
        // MP3 artifacts include: pre-echo, quantization noise, time-smearing
        // Simplified detection - look for pre-echo before transients
        const monoData = this.convertToMono(audioBuffer);
        const transients = this.findTransients(monoData, audioBuffer.sampleRate);

        let preEchoCount = 0;

        for (const transient of transients) {
            // Check 10ms before transient
            const preWindowSize = Math.floor(audioBuffer.sampleRate * 0.01);
            const preStart = Math.max(0, transient.index - preWindowSize);

            let preEnergy = 0;
            for (let i = preStart; i < transient.index; i++) {
                preEnergy += monoData[i] ** 2;
            }
            preEnergy /= preWindowSize;

            const preEnergyDB = 20 * Math.log10(Math.sqrt(preEnergy) + 1e-12);

            // If significant energy before transient = pre-echo
            if (preEnergyDB > this.thresholds.mp3Threshold) {
                preEchoCount++;
            }
        }

        const detected = preEchoCount > transients.length * 0.2;

        if (detected) {
            this.detectedIssues.push({
                type: 'MP3 Compression Artifacts',
                severity: this.severityLevels.INFO,
                description: `Pre-echo detected before ${preEchoCount} transients`,
                suggestion: 'Source file may be lossy-compressed. Use lossless source for mastering.',
                autoFixable: false
            });
        }

        return {
            detected,
            preEchoCount,
            transients: transients.length
        };
    }

    /**
     * DETECTION 9: Sub-Bass Phase Issues (Mono Compatibility)
     */
    detectSubBassPhaseIssues(audioBuffer) {
        if (audioBuffer.numberOfChannels < 2) {
            return { detected: false };
        }

        const left = audioBuffer.getChannelData(0);
        const right = audioBuffer.getChannelData(1);

        // High-pass filter to isolate sub-bass (<100Hz)
        const subLeft = this.lowPassFilter(left, 100, audioBuffer.sampleRate);
        const subRight = this.lowPassFilter(right, 100, audioBuffer.sampleRate);

        // Calculate phase correlation for sub-bass
        let correlation = 0;
        let leftPower = 0;
        let rightPower = 0;

        for (let i = 0; i < subLeft.length; i++) {
            correlation += subLeft[i] * subRight[i];
            leftPower += subLeft[i] ** 2;
            rightPower += subRight[i] ** 2;
        }

        const phaseCorr = correlation / Math.sqrt(leftPower * rightPower + 1e-12);
        const detected = phaseCorr < 0.7; // Sub-bass should be mostly mono

        if (detected) {
            this.detectedIssues.push({
                type: 'Sub-Bass Phase Issues',
                severity: this.severityLevels.WARNING,
                description: `Sub-bass (<100Hz) has poor mono compatibility (corr: ${phaseCorr.toFixed(2)})`,
                suggestion: 'Apply M/S processing to make sub-bass mono. Use bass focus plugins.',
                autoFixable: true
            });
        }

        return {
            detected,
            phaseCorrelation: phaseCorr
        };
    }

    /**
     * DETECTION 10: Intersample Peaks
     */
    detectIntersamplePeaks(audioBuffer) {
        // Upsample 4x and check for peaks above 0dBFS
        const oversampleFactor = 4;
        let intersamplePeaks = 0;

        for (let ch = 0; ch < audioBuffer.numberOfChannels; ch++) {
            const data = audioBuffer.getChannelData(ch);
            const upsampled = this.upsample(data, oversampleFactor);

            for (let i = 0; i < upsampled.length; i++) {
                if (Math.abs(upsampled[i]) > 1.0) {
                    intersamplePeaks++;
                }
            }
        }

        const detected = intersamplePeaks > 0;

        if (detected) {
            this.detectedIssues.push({
                type: 'Intersample Peaks',
                severity: this.severityLevels.WARNING,
                description: `${intersamplePeaks} samples exceed 0dBFS when oversampled`,
                suggestion: 'Use true-peak limiting. Reduce ceiling by 1-2dB.',
                autoFixable: false
            });
        }

        return {
            detected,
            count: intersamplePeaks
        };
    }

    // ========== HELPER FUNCTIONS ==========

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

    computeMagnitudeSpectrum(signal) {
        const n = signal.length;
        const magnitude = new Float32Array(n / 2 + 1);

        for (let k = 0; k <= n / 2; k++) {
            let real = 0, imag = 0;
            for (let t = 0; t < n; t++) {
                const angle = -2 * Math.PI * k * t / n;
                real += signal[t] * Math.cos(angle);
                imag += signal[t] * Math.sin(angle);
            }
            magnitude[k] = Math.sqrt(real * real + imag * imag);
        }

        return magnitude;
    }

    findSpectralPeaks(spectrum, numPeaks) {
        const peaks = [];

        for (let i = 1; i < spectrum.length - 1; i++) {
            if (spectrum[i] > spectrum[i - 1] && spectrum[i] > spectrum[i + 1]) {
                peaks.push({ bin: i, magnitude: spectrum[i] });
            }
        }

        peaks.sort((a, b) => b.magnitude - a.magnitude);
        return peaks.slice(0, numPeaks);
    }

    findTransients(audioData, sampleRate) {
        const windowSize = Math.floor(sampleRate * 0.005); // 5ms
        const transients = [];

        for (let i = windowSize; i < audioData.length; i += windowSize) {
            let currentRMS = 0, previousRMS = 0;

            for (let j = 0; j < windowSize; j++) {
                currentRMS += audioData[i + j] ** 2;
                previousRMS += audioData[i - windowSize + j] ** 2;
            }

            const currentDB = 10 * Math.log10(currentRMS + 1e-12);
            const previousDB = 10 * Math.log10(previousRMS + 1e-12);

            if (currentDB - previousDB > 10) {
                transients.push({ index: i, strength: currentDB - previousDB });
            }
        }

        return transients;
    }

    lowPassFilter(signal, cutoff, sampleRate) {
        const omega = 2 * Math.PI * cutoff / sampleRate;
        const alpha = Math.sin(omega) / (2 * 0.707);

        const b0 = (1 - Math.cos(omega)) / 2;
        const b1 = 1 - Math.cos(omega);
        const b2 = (1 - Math.cos(omega)) / 2;
        const a0 = 1 + alpha;
        const a1 = -2 * Math.cos(omega);
        const a2 = 1 - alpha;

        const filtered = new Float32Array(signal.length);
        let x1 = 0, x2 = 0, y1 = 0, y2 = 0;

        for (let i = 0; i < signal.length; i++) {
            const x0 = signal[i];
            const y0 = (b0 / a0) * x0 + (b1 / a0) * x1 + (b2 / a0) * x2 -
                      (a1 / a0) * y1 - (a2 / a0) * y2;

            filtered[i] = y0;
            x2 = x1; x1 = x0;
            y2 = y1; y1 = y0;
        }

        return filtered;
    }

    upsample(signal, factor) {
        const upsampled = new Float32Array(signal.length * factor);

        for (let i = 0; i < signal.length; i++) {
            upsampled[i * factor] = signal[i];

            // Linear interpolation
            if (i < signal.length - 1) {
                const step = (signal[i + 1] - signal[i]) / factor;
                for (let j = 1; j < factor; j++) {
                    upsampled[i * factor + j] = signal[i] + step * j;
                }
            }
        }

        return upsampled;
    }

    generateReport(results) {
        const lines = [];
        lines.push('=== ARTIFACT DETECTION REPORT ===\n');

        for (const issue of this.detectedIssues) {
            lines.push(`[${issue.severity.toUpperCase()}] ${issue.type}`);
            lines.push(`  ${issue.description}`);
            lines.push(`  💡 ${issue.suggestion}`);
            if (issue.autoFixable) {
                lines.push(`  ✓ Auto-fixable`);
            }
            lines.push('');
        }

        if (this.detectedIssues.length === 0) {
            lines.push('✓ No significant artifacts detected!');
        }

        return lines.join('\n');
    }

    calculateQualityScore(results) {
        let score = 100;

        if (results.clipping.detected) score -= 20;
        if (results.dcOffset.detected) score -= 5;
        if (results.phaseIssues.detected) score -= 10;
        if (results.overCompression.detected) score -= 15;
        if (results.limitingArtifacts.detected) score -= 10;
        if (results.aliasing.detected) score -= 5;
        if (results.intermodulation.detected) score -= 10;
        if (results.mp3Artifacts.detected) score -= 5;
        if (results.subBassPhase.detected) score -= 10;
        if (results.intersamplePeaks.detected) score -= 10;

        return Math.max(0, score);
    }

    getIssues() {
        return this.detectedIssues;
    }

    getResults() {
        return this.analysisResults;
    }
}

// Export
if (typeof module !== 'undefined' && module.exports) {
    module.exports = ArtifactDetector;
}
