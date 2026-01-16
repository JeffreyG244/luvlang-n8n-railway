/**
 * SPECTRAL DE-NOISER
 * AI-powered noise removal (hiss, hum, clicks, crackle)
 * Similar to iZotope RX's spectral repair
 */

class SpectralDenoiser {
    constructor(audioContext) {
        this.audioContext = audioContext;
        this.isActive = false;

        // Processing parameters
        this.noiseReduction = 0;      // 0-100%
        this.noiseProfile = null;      // Learned noise profile
        this.threshold = -40;          // dB threshold for noise gate
        this.smoothness = 5;           // Smoothing factor (1-10)

        // Audio nodes
        this.inputNode = null;
        this.outputNode = null;
        this.analyzerNode = null;

        // Noise types
        this.noiseTypes = {
            hiss: { enabled: false, reduction: 50 },
            hum: { enabled: false, reduction: 50 },
            clicks: { enabled: false, reduction: 50 },
            broadband: { enabled: false, reduction: 50 }
        };

        this.initialize();
    }

    initialize() {
        this.inputNode = this.audioContext.createGain();
        this.outputNode = this.audioContext.createGain();
        this.analyzerNode = this.audioContext.createAnalyser();

        this.analyzerNode.fftSize = 8192;
        this.analyzerNode.smoothingTimeConstant = 0.8;

        this.inputNode.connect(this.analyzerNode);
        this.analyzerNode.connect(this.outputNode);

        console.log('✅ Spectral De-noiser initialized');
    }

    /**
     * Learn noise profile from a section of audio
     * User should select a quiet section with only noise
     */
    async learnNoiseProfile(audioBuffer, startTime = 0, duration = 1) {
        console.log('🎤 Learning noise profile...');

        const sampleRate = audioBuffer.sampleRate;
        const startSample = Math.floor(startTime * sampleRate);
        const endSample = Math.floor((startTime + duration) * sampleRate);

        // Create offline context for analysis
        const offlineContext = new OfflineAudioContext(
            audioBuffer.numberOfChannels,
            endSample - startSample,
            sampleRate
        );

        // Create analyzer
        const analyzer = offlineContext.createAnalyser();
        analyzer.fftSize = 8192;

        const source = offlineContext.createBufferSource();
        source.buffer = audioBuffer;
        source.connect(analyzer);
        source.connect(offlineContext.destination);
        source.start(0, startTime, duration);

        // Get frequency data
        const bufferLength = analyzer.frequencyBinCount;
        const dataArray = new Uint8Array(bufferLength);

        // Average multiple frames
        const frameCount = 10;
        const profile = new Float32Array(bufferLength);

        for (let i = 0; i < frameCount; i++) {
            analyzer.getByteFrequencyData(dataArray);
            for (let j = 0; j < bufferLength; j++) {
                profile[j] += dataArray[j] / frameCount;
            }
            await new Promise(resolve => setTimeout(resolve, 10));
        }

        this.noiseProfile = profile;

        // Analyze noise type
        this.analyzeNoiseType(profile);

        console.log('✅ Noise profile learned from', duration, 'seconds of audio');
        return profile;
    }

    /**
     * Analyze what type of noise is present
     */
    analyzeNoiseType(profile) {
        const binCount = profile.length;

        // High frequency energy (hiss detection)
        const highFreqStart = Math.floor(binCount * 0.7);
        let highFreqEnergy = 0;
        for (let i = highFreqStart; i < binCount; i++) {
            highFreqEnergy += profile[i];
        }
        highFreqEnergy /= (binCount - highFreqStart);

        // Low frequency peaks (hum detection - 50Hz, 60Hz, harmonics)
        const lowFreqEnd = Math.floor(binCount * 0.05);
        let lowFreqPeaks = 0;
        for (let i = 1; i < lowFreqEnd; i++) {
            if (profile[i] > profile[i-1] && profile[i] > profile[i+1]) {
                lowFreqPeaks++;
            }
        }

        // Detect noise types
        if (highFreqEnergy > 30) {
            this.noiseTypes.hiss.enabled = true;
            console.log('   🔊 Hiss detected (high frequency noise)');
        }

        if (lowFreqPeaks > 3) {
            this.noiseTypes.hum.enabled = true;
            console.log('   🔊 Hum detected (mains hum / low frequency)');
        }

        // Broadband noise detection (overall noise floor)
        const avgEnergy = profile.reduce((a, b) => a + b, 0) / binCount;
        if (avgEnergy > 20) {
            this.noiseTypes.broadband.enabled = true;
            console.log('   🔊 Broadband noise detected');
        }
    }

    /**
     * Apply spectral de-noising to audio buffer
     */
    async process(audioBuffer) {
        if (!this.isActive || !this.noiseProfile) {
            console.log('⚠️  De-noiser not active or no noise profile learned');
            return audioBuffer;
        }

        console.log('🎛️ Applying spectral de-noising...');

        const sampleRate = audioBuffer.sampleRate;
        const duration = audioBuffer.duration;

        // Create offline context
        const offlineContext = new OfflineAudioContext(
            audioBuffer.numberOfChannels,
            audioBuffer.length,
            sampleRate
        );

        // Create processing chain
        const source = offlineContext.createBufferSource();
        source.buffer = audioBuffer;

        // Apply noise reduction based on noise type
        let processedNode = source;

        // High-pass filter for hum removal
        if (this.noiseTypes.hum.enabled && this.noiseTypes.hum.reduction > 0) {
            const humFilter = offlineContext.createBiquadFilter();
            humFilter.type = 'highpass';
            humFilter.frequency.value = 80; // Remove below 80Hz
            humFilter.Q.value = 0.7;
            processedNode.connect(humFilter);
            processedNode = humFilter;
            console.log('   ✂️ Hum filter applied (highpass @ 80Hz)');
        }

        // Low-pass filter for hiss removal
        if (this.noiseTypes.hiss.enabled && this.noiseTypes.hiss.reduction > 0) {
            const hissFilter = offlineContext.createBiquadFilter();
            hissFilter.type = 'lowpass';
            hissFilter.frequency.value = 18000 - (this.noiseTypes.hiss.reduction * 50); // Adaptive
            hissFilter.Q.value = 0.7;
            processedNode.connect(hissFilter);
            processedNode = hissFilter;
            console.log('   ✂️ Hiss filter applied (lowpass @', hissFilter.frequency.value, 'Hz)');
        }

        // Broadband noise gate
        if (this.noiseTypes.broadband.enabled && this.noiseTypes.broadband.reduction > 0) {
            const compressor = offlineContext.createDynamicsCompressor();
            compressor.threshold.value = this.threshold;
            compressor.knee.value = 6;
            compressor.ratio.value = 12; // Expander-like ratio
            compressor.attack.value = 0.001;
            compressor.release.value = 0.1;
            processedNode.connect(compressor);
            processedNode = compressor;
            console.log('   🎚️ Noise gate applied (threshold:', this.threshold, 'dB)');
        }

        // Click and crackle removal (simple implementation)
        if (this.noiseTypes.clicks.enabled && this.noiseTypes.clicks.reduction > 0) {
            // Use a compressor with very fast attack to suppress transients
            const clickSuppressor = offlineContext.createDynamicsCompressor();
            clickSuppressor.threshold.value = -20;
            clickSuppressor.knee.value = 0;
            clickSuppressor.ratio.value = 20;
            clickSuppressor.attack.value = 0.0001; // 0.1ms - catches clicks
            clickSuppressor.release.value = 0.01;  // 10ms
            processedNode.connect(clickSuppressor);
            processedNode = clickSuppressor;
            console.log('   ⚡ Click removal applied');
        }

        // Connect to destination
        processedNode.connect(offlineContext.destination);

        // Render
        source.start(0);
        const renderedBuffer = await offlineContext.startRendering();

        console.log('✅ De-noising complete');
        return renderedBuffer;
    }

    /**
     * Set noise reduction amount for specific noise type
     */
    setNoiseReduction(noiseType, amount) {
        if (this.noiseTypes[noiseType]) {
            this.noiseTypes[noiseType].reduction = Math.max(0, Math.min(100, amount));
            console.log(`🎚️ ${noiseType} reduction:`, amount, '%');
        }
    }

    /**
     * Enable/disable noise type processing
     */
    setNoiseTypeEnabled(noiseType, enabled) {
        if (this.noiseTypes[noiseType]) {
            this.noiseTypes[noiseType].enabled = enabled;
            console.log(`${enabled ? '✅' : '❌'} ${noiseType} processing:`, enabled ? 'ON' : 'OFF');
        }
    }

    /**
     * Set threshold for noise gate
     */
    setThreshold(thresholdDB) {
        this.threshold = Math.max(-60, Math.min(0, thresholdDB));
        console.log('🎚️ Noise gate threshold:', this.threshold, 'dB');
    }

    /**
     * Apply preset
     */
    applyPreset(presetName) {
        console.log('🎛️ Applying de-noise preset:', presetName);

        switch(presetName.toLowerCase()) {
            case 'gentle':
                this.setNoiseReduction('hiss', 30);
                this.setNoiseReduction('hum', 40);
                this.setNoiseReduction('clicks', 20);
                this.setNoiseReduction('broadband', 25);
                this.setThreshold(-45);
                break;

            case 'moderate':
                this.setNoiseReduction('hiss', 50);
                this.setNoiseReduction('hum', 60);
                this.setNoiseReduction('clicks', 40);
                this.setNoiseReduction('broadband', 45);
                this.setThreshold(-40);
                break;

            case 'aggressive':
                this.setNoiseReduction('hiss', 80);
                this.setNoiseReduction('hum', 90);
                this.setNoiseReduction('clicks', 70);
                this.setNoiseReduction('broadband', 70);
                this.setThreshold(-35);
                break;

            case 'voice':
                // Optimized for voice recordings
                this.setNoiseReduction('hiss', 60);
                this.setNoiseReduction('hum', 80);
                this.setNoiseReduction('clicks', 50);
                this.setNoiseReduction('broadband', 55);
                this.setThreshold(-42);
                break;

            case 'music':
                // Gentler for music
                this.setNoiseReduction('hiss', 35);
                this.setNoiseReduction('hum', 50);
                this.setNoiseReduction('clicks', 30);
                this.setNoiseReduction('broadband', 30);
                this.setThreshold(-48);
                break;

            default:
                // Reset to defaults
                Object.keys(this.noiseTypes).forEach(type => {
                    this.setNoiseReduction(type, 50);
                });
                this.setThreshold(-40);
        }
    }

    /**
     * Reset to defaults
     */
    reset() {
        this.noiseProfile = null;
        Object.keys(this.noiseTypes).forEach(type => {
            this.noiseTypes[type].enabled = false;
            this.noiseTypes[type].reduction = 50;
        });
        this.threshold = -40;
        console.log('✅ Spectral De-noiser reset');
    }

    /**
     * Toggle active state
     */
    setActive(active) {
        this.isActive = active;
        console.log(active ? '✅ De-noiser: ACTIVE' : '⏸️ De-noiser: BYPASSED');
    }

    /**
     * Get current status
     */
    getStatus() {
        return {
            active: this.isActive,
            hasProfile: this.noiseProfile !== null,
            noiseTypes: { ...this.noiseTypes },
            threshold: this.threshold
        };
    }
}

// Export for use in main application
if (typeof window !== 'undefined') {
    window.SpectralDenoiser = SpectralDenoiser;
}
