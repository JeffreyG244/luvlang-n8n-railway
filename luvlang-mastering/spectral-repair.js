/**
 * SPECTRAL REPAIR & RESTORATION ENGINE
 * Salvage imperfect recordings with AI-powered noise reduction
 * Click/pop removal, hum removal, spectral noise reduction, breath removal
 */

class SpectralRepairEngine {
    constructor(audioContext) {
        this.audioContext = audioContext;
        this.fftSize = 16384; // High resolution for spectral editing
        this.detectedIssues = [];
        this.repairHistory = [];
    }

    // Auto-detect audio issues
    async detectIssues(audioBuffer) {
        console.log('🔍 Starting comprehensive audio analysis...');

        const channelData = audioBuffer.getChannelData(0);
        const sampleRate = audioBuffer.sampleRate;
        const duration = audioBuffer.duration;

        this.detectedIssues = [];

        // 1. Detect clicks and pops
        const clicks = await this.detectClicks(channelData, sampleRate);
        if (clicks.length > 0) {
            this.detectedIssues.push({
                type: 'clicks',
                severity: clicks.length > 20 ? 'critical' : clicks.length > 10 ? 'high' : 'medium',
                count: clicks.length,
                description: `${clicks.length} clicks/pops detected`,
                icon: '⚡',
                locations: clicks.map(c => c.position.toFixed(2) + 's'),
                solution: `Use Click Removal tool with sensitivity ${Math.min(10, clicks.length / 2).toFixed(0)}`
            });
        }

        // 2. Detect power line hum (50/60Hz)
        const humData = await this.detectHum(channelData, sampleRate);
        if (humData.detected) {
            this.detectedIssues.push({
                type: 'hum',
                severity: humData.level > 0.4 ? 'high' : 'medium',
                level: humData.level,
                frequency: humData.frequency,
                description: `${humData.frequency}Hz power line hum detected (${(humData.level * 100).toFixed(0)}% level)`,
                icon: '🔌',
                solution: `Use Hum Removal tool at ${humData.frequency}Hz with intensity ${Math.min(10, humData.level * 15).toFixed(0)}`
            });
        }

        // 3. Detect broadband noise
        const noiseLevel = await this.detectNoise(channelData, sampleRate);
        if (noiseLevel > 0.05) {
            this.detectedIssues.push({
                type: 'noise',
                severity: noiseLevel > 0.20 ? 'critical' : noiseLevel > 0.10 ? 'high' : 'medium',
                level: noiseLevel,
                description: `Background noise detected (${(noiseLevel * 100).toFixed(0)}% of signal)`,
                icon: '🌊',
                solution: `Use Noise Reduction with amount ${Math.min(10, noiseLevel * 30).toFixed(0)}`
            });
        }

        // 4. Detect breath sounds
        const breaths = await this.detectBreaths(channelData, sampleRate);
        if (breaths.length > 5) {
            this.detectedIssues.push({
                type: 'breaths',
                severity: 'low',
                count: breaths.length,
                description: `${breaths.length} audible breath sounds detected`,
                icon: '💨',
                solution: `Use Breath Removal with threshold ${Math.min(10, breaths.length / 3).toFixed(0)}`
            });
        }

        // 5. Detect clipping/distortion
        const clipping = await this.detectClipping(channelData);
        if (clipping.clipped) {
            this.detectedIssues.push({
                type: 'clipping',
                severity: 'critical',
                count: clipping.count,
                percentage: clipping.percentage,
                description: `Digital clipping detected (${clipping.percentage.toFixed(2)}% of samples)`,
                icon: '🔴',
                solution: 'Audio is clipped - cannot be fully repaired. Reduce input gain at source.'
            });
        }

        // 6. Detect room resonances
        const resonances = await this.detectResonances(channelData, sampleRate);
        if (resonances.length > 0) {
            this.detectedIssues.push({
                type: 'resonances',
                severity: 'medium',
                count: resonances.length,
                frequencies: resonances.map(r => `${r.frequency}Hz`),
                description: `${resonances.length} room resonance(s) detected`,
                icon: '📢',
                solution: `Apply notch filters at: ${resonances.map(r => r.frequency + 'Hz').join(', ')}`
            });
        }

        console.log(`✅ Audio analysis complete: ${this.detectedIssues.length} issue(s) found`);
        return this.detectedIssues;
    }

    // Detect clicks and pops (transient spikes)
    async detectClicks(channelData, sampleRate) {
        const clicks = [];
        const threshold = 0.4; // Amplitude threshold
        const windowSize = Math.floor(sampleRate * 0.002); // 2ms window

        for (let i = windowSize; i < channelData.length - windowSize; i++) {
            const current = Math.abs(channelData[i]);
            const prev = Math.abs(channelData[i - windowSize]);
            const next = Math.abs(channelData[i + windowSize]);
            const avgNeighbor = (prev + next) / 2;

            // Detect sudden spike (3x louder than neighbors)
            if (current > threshold && current > avgNeighbor * 3) {
                clicks.push({
                    position: i / sampleRate,
                    amplitude: current,
                    index: i
                });
                i += windowSize; // Skip ahead
            }
        }

        return clicks;
    }

    // Detect 50/60Hz hum using FFT
    async detectHum(channelData, sampleRate) {
        const fftSize = 8192;
        const chunk = channelData.slice(0, Math.min(fftSize, channelData.length));

        // Perform simple FFT analysis
        const spectrum = await this.performFFT(chunk, sampleRate);

        // Check for 50Hz and 60Hz peaks
        const bin50Hz = Math.floor((50 / sampleRate) * fftSize);
        const bin60Hz = Math.floor((60 / sampleRate) * fftSize);

        const energy50Hz = this.getBinEnergy(spectrum, bin50Hz, 2);
        const energy60Hz = this.getBinEnergy(spectrum, bin60Hz, 2);
        const avgEnergy = spectrum.reduce((sum, val) => sum + val, 0) / spectrum.length;

        const ratio50Hz = energy50Hz / (avgEnergy * 5);
        const ratio60Hz = energy60Hz / (avgEnergy * 5);

        if (ratio50Hz > 0.15 || ratio60Hz > 0.15) {
            return {
                detected: true,
                frequency: ratio60Hz > ratio50Hz ? 60 : 50,
                level: Math.max(ratio50Hz, ratio60Hz)
            };
        }

        return { detected: false };
    }

    // Simplified FFT (for demonstration - real implementation would use proper FFT library)
    async performFFT(samples, sampleRate) {
        // This is a simplified version - in production use WebAssembly FFT
        const spectrum = new Array(samples.length / 2).fill(0);

        for (let k = 0; k < spectrum.length; k++) {
            let real = 0;
            let imag = 0;

            for (let n = 0; n < samples.length; n++) {
                const angle = (2 * Math.PI * k * n) / samples.length;
                real += samples[n] * Math.cos(angle);
                imag += samples[n] * Math.sin(angle);
            }

            spectrum[k] = Math.sqrt(real * real + imag * imag) / samples.length;
        }

        return spectrum;
    }

    // Get energy in frequency bin range
    getBinEnergy(spectrum, centerBin, range) {
        let energy = 0;
        const start = Math.max(0, centerBin - range);
        const end = Math.min(spectrum.length - 1, centerBin + range);

        for (let i = start; i <= end; i++) {
            energy += spectrum[i];
        }

        return energy / (end - start + 1);
    }

    // Detect broadband noise (find noise floor in quiet sections)
    async detectNoise(channelData, sampleRate) {
        const windowSize = Math.floor(sampleRate * 0.1); // 100ms windows
        let minRMS = Infinity;
        const rmsValues = [];

        for (let i = 0; i < channelData.length - windowSize; i += windowSize) {
            let sumSquares = 0;
            for (let j = 0; j < windowSize; j++) {
                sumSquares += channelData[i + j] * channelData[i + j];
            }
            const rms = Math.sqrt(sumSquares / windowSize);
            rmsValues.push(rms);
            minRMS = Math.min(minRMS, rms);
        }

        // Noise floor is the minimum RMS (quietest sections)
        // Good recordings have noise floor < 0.01 (−40dB)
        return minRMS;
    }

    // Detect breath sounds (low-frequency transients)
    async detectBreaths(channelData, sampleRate) {
        const breaths = [];
        const windowSize = Math.floor(sampleRate * 0.2); // 200ms windows
        const threshold = 0.02; // Minimum breath amplitude

        for (let i = 0; i < channelData.length - windowSize; i += Math.floor(windowSize / 2)) {
            // Calculate low-frequency energy (50-500Hz range simulation)
            let lowFreqEnergy = 0;
            for (let j = 0; j < windowSize; j++) {
                lowFreqEnergy += Math.abs(channelData[i + j]);
            }
            lowFreqEnergy /= windowSize;

            // Breath detection: low frequency, medium amplitude
            if (lowFreqEnergy > threshold && lowFreqEnergy < 0.15) {
                // Check if it's isolated (not part of speech)
                const prevEnergy = this.getWindowEnergy(channelData, Math.max(0, i - windowSize), windowSize);
                const nextEnergy = this.getWindowEnergy(channelData, Math.min(channelData.length - windowSize, i + windowSize), windowSize);

                if (lowFreqEnergy > prevEnergy * 1.5 && lowFreqEnergy > nextEnergy * 1.5) {
                    breaths.push({
                        position: i / sampleRate,
                        energy: lowFreqEnergy,
                        index: i
                    });
                    i += windowSize; // Skip ahead
                }
            }
        }

        return breaths;
    }

    // Helper: get RMS energy of window
    getWindowEnergy(channelData, start, length) {
        let sumSquares = 0;
        const end = Math.min(start + length, channelData.length);
        for (let i = start; i < end; i++) {
            sumSquares += channelData[i] * channelData[i];
        }
        return Math.sqrt(sumSquares / length);
    }

    // Detect clipping
    async detectClipping(channelData) {
        let clippedSamples = 0;
        const clippingThreshold = 0.99;

        for (let i = 0; i < channelData.length; i++) {
            if (Math.abs(channelData[i]) >= clippingThreshold) {
                clippedSamples++;
            }
        }

        const percentage = (clippedSamples / channelData.length) * 100;

        return {
            clipped: percentage > 0.01,
            count: clippedSamples,
            percentage: percentage
        };
    }

    // Detect room resonances
    async detectResonances(channelData, sampleRate) {
        // Simplified resonance detection using FFT
        const fftSize = 8192;
        const chunk = channelData.slice(0, Math.min(fftSize, channelData.length));
        const spectrum = await this.performFFT(chunk, sampleRate);

        const resonances = [];
        const avgEnergy = spectrum.reduce((sum, val) => sum + val, 0) / spectrum.length;

        // Look for peaks > 3x average energy
        for (let i = 10; i < spectrum.length - 10; i++) {
            if (spectrum[i] > avgEnergy * 3) {
                // Check if it's a peak (higher than neighbors)
                if (spectrum[i] > spectrum[i - 1] && spectrum[i] > spectrum[i + 1]) {
                    const frequency = Math.round((i / fftSize) * sampleRate);
                    resonances.push({
                        frequency: frequency,
                        level: spectrum[i] / avgEnergy
                    });
                }
            }
        }

        return resonances.slice(0, 5); // Return top 5
    }

    // CREATE REPAIR FILTERS

    // Click/pop remover (median filter)
    createClickRemover(sensitivity) {
        // Use script processor for median filtering
        const bufferSize = 4096;
        const processor = this.audioContext.createScriptProcessor(bufferSize, 1, 1);

        const medianBuffer = new Float32Array(5);
        let bufferIndex = 0;

        const threshold = 0.3 + (sensitivity / 10) * 0.4; // 0.3 to 0.7

        processor.onaudioprocess = (e) => {
            const input = e.inputBuffer.getChannelData(0);
            const output = e.outputBuffer.getChannelData(0);

            for (let i = 0; i < input.length; i++) {
                medianBuffer[bufferIndex] = input[i];
                bufferIndex = (bufferIndex + 1) % 5;

                // Detect click (sudden spike)
                const current = Math.abs(input[i]);
                const sorted = Array.from(medianBuffer).sort((a, b) => a - b);
                const median = sorted[2];

                if (current > threshold && current > Math.abs(median) * 3) {
                    // Replace click with median
                    output[i] = median;
                } else {
                    output[i] = input[i];
                }
            }
        };

        console.log(`✅ Click remover: sensitivity ${sensitivity}/10`);
        return processor;
    }

    // Hum remover (notch filters at fundamental + harmonics)
    createHumRemover(frequency, intensity) {
        const filters = [];
        const harmonics = [1, 2, 3, 4, 5]; // Fundamental + 4 harmonics

        for (const harmonic of harmonics) {
            const notch = this.audioContext.createBiquadFilter();
            notch.type = 'notch';
            notch.frequency.value = frequency * harmonic;
            notch.Q.value = 5 + (intensity * 5); // Q: 5 to 55 (narrower = more aggressive)
            filters.push(notch);
        }

        // Chain filters
        for (let i = 0; i < filters.length - 1; i++) {
            filters[i].connect(filters[i + 1]);
        }

        console.log(`✅ Hum remover: ${frequency}Hz + ${harmonics.length - 1} harmonics, Q=${filters[0].Q.value.toFixed(0)}`);
        return {
            input: filters[0],
            output: filters[filters.length - 1],
            filters: filters
        };
    }

    // Spectral noise reducer
    createNoiseReducer(amount) {
        // Multi-stage noise reduction
        const hpFilter = this.audioContext.createBiquadFilter();
        hpFilter.type = 'highpass';
        hpFilter.frequency.value = 60 + (amount * 10); // Adaptive cutoff
        hpFilter.Q.value = 0.7;

        const gate = this.audioContext.createDynamicsCompressor();
        gate.threshold.value = -70 + (amount * 3); // -70 to -40 dB
        gate.ratio.value = 20; // Gate behavior
        gate.attack.value = 0.001;
        gate.release.value = 0.1;
        gate.knee.value = 5;

        const expander = this.audioContext.createDynamicsCompressor();
        expander.threshold.value = -50 + (amount * 2);
        expander.ratio.value = 0.5; // Expansion (< 1)
        expander.attack.value = 0.001;
        expander.release.value = 0.05;

        hpFilter.connect(gate);
        gate.connect(expander);

        console.log(`✅ Noise reducer: HPF @ ${hpFilter.frequency.value.toFixed(0)}Hz, gate @ ${gate.threshold.value.toFixed(0)}dB`);
        return {
            input: hpFilter,
            output: expander
        };
    }

    // Breath remover
    createBreathRemover(threshold) {
        const breathGate = this.audioContext.createDynamicsCompressor();
        breathGate.threshold.value = -75 + (threshold * 4); // -75 to -35 dB
        breathGate.ratio.value = 20;
        breathGate.attack.value = 0.0001; // Ultra-fast
        breathGate.release.value = 0.02; // Very quick for breaths
        breathGate.knee.value = 2; // Hard knee

        // High-pass to target breath frequencies
        const hpFilter = this.audioContext.createBiquadFilter();
        hpFilter.type = 'highpass';
        hpFilter.frequency.value = 150; // Breaths are low frequency
        hpFilter.Q.value = 1.0;

        hpFilter.connect(breathGate);

        console.log(`✅ Breath remover: threshold ${breathGate.threshold.value.toFixed(0)}dB, HPF @ 150Hz`);
        return {
            input: hpFilter,
            output: breathGate
        };
    }

    // De-clicker (declicking using interpolation)
    createDeclipper() {
        // Advanced declipping using soft clipping + expansion
        const softClipper = this.audioContext.createWaveShaper();
        const curve = new Float32Array(65536);

        for (let i = 0; i < 65536; i++) {
            const x = (i - 32768) / 32768;
            // Soft clipping curve (tanh approximation)
            curve[i] = Math.tanh(x * 1.5) / 1.5;
        }
        softClipper.curve = curve;
        softClipper.oversample = '4x';

        console.log('✅ De-clipper: soft clipping curve with 4x oversampling');
        return softClipper;
    }

    // Get detected issues
    getDetectedIssues() {
        return this.detectedIssues;
    }

    // Clear detected issues
    clearDetectedIssues() {
        this.detectedIssues = [];
        console.log('🗑️ Cleared detected issues');
    }
}

// Export for use in main app
if (typeof window !== 'undefined') {
    window.SpectralRepairEngine = SpectralRepairEngine;
}
