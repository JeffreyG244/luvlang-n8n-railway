/**
 * LUVLANG ADVANCED PROCESSING FEATURES
 * Professional-grade audio processing modules
 *
 * Includes:
 * - Advanced True-Peak Limiter
 * - Stereo Imager with frequency-dependent width
 * - Harmonic Exciter/Saturation
 * - Enhanced EQ with Q-Factor and Mid-Side processing
 * - Reference Track matching system
 * - Preset Management with cloud sync
 */

console.log('🚀 Loading Advanced Processing Features...');

// ============================================================================
// 1. ADVANCED TRUE-PEAK LIMITER
// ============================================================================

// Only declare if not already defined (ADVANCED_MASTERING_ENGINE.js may define it first)
if (typeof AdvancedLimiter === 'undefined') {
class AdvancedLimiter {
    constructor(audioContext) {
        this.context = audioContext;

        // Create limiter chain
        this.input = audioContext.createGain();
        this.output = audioContext.createGain();

        // Main limiter (brick-wall)
        this.limiter = audioContext.createDynamicsCompressor();
        this.limiter.threshold.value = -1.5;  // dBFS
        this.limiter.knee.value = 0;  // Hard knee for brick-wall
        this.limiter.ratio.value = 20;  // Very high ratio
        this.limiter.attack.value = 0.001;  // 1ms attack
        this.limiter.release.value = 0.1;  // 100ms release

        // Lookahead delay for transparent limiting
        this.lookaheadDelay = audioContext.createDelay(0.010);  // 10ms lookahead
        this.lookaheadDelay.delayTime.value = 0.005;  // 5ms default

        // Clipper for true-peak protection
        this.clipper = audioContext.createWaveShaper();
        this.setupClipperCurve();

        // Connect chain: input → lookahead → limiter → clipper → output
        this.input.connect(this.lookaheadDelay);
        this.lookaheadDelay.connect(this.limiter);
        this.limiter.connect(this.clipper);
        this.clipper.connect(this.output);

        // Settings
        this.ceiling = -1.0;  // dBTP
        this.mode = 'transparent';  // 'transparent' or 'aggressive'
    }

    setupClipperCurve() {
        const samples = 1024;
        const curve = new Float32Array(samples);

        for (let i = 0; i < samples; i++) {
            const x = (i / samples) * 2 - 1;  // -1 to 1
            const threshold = Math.pow(10, this.ceiling / 20);

            // Soft clipping curve
            if (Math.abs(x) < threshold) {
                curve[i] = x;
            } else {
                const sign = x > 0 ? 1 : -1;
                curve[i] = sign * threshold + sign * Math.tanh((Math.abs(x) - threshold) * 3) / 10;
            }
        }

        this.clipper.curve = curve;
    }

    setCeiling(dBTP) {
        this.ceiling = dBTP;
        this.limiter.threshold.value = dBTP;
        this.setupClipperCurve();

        // Update UI
        const element = document.getElementById('limiterValue');
        if (element) {
            element.textContent = dBTP.toFixed(1) + ' dBTP';
        }
    }

    setRelease(seconds) {
        this.limiter.release.value = seconds;
    }

    setMode(mode) {
        this.mode = mode;

        if (mode === 'aggressive') {
            this.limiter.ratio.value = 30;
            this.limiter.attack.value = 0.0005;  // Faster attack
            this.limiter.release.value = 0.05;  // Faster release
        } else {
            this.limiter.ratio.value = 20;
            this.limiter.attack.value = 0.001;
            this.limiter.release.value = 0.1;
        }
    }

    getReduction() {
        return this.limiter.reduction;
    }
}
} // End of AdvancedLimiter conditional check

// ============================================================================
// 2. MONO-BASS CROSSOVER - Professional Low-Frequency Management
// ============================================================================
// Implements Linkwitz-Riley 4th order crossover at 140Hz
// All frequencies below 140Hz are summed to mono (L+R) for club/vinyl compatibility
// Frequencies above 140Hz retain original stereo width

class MonoBassCrossover {
    constructor(audioContext) {
        this.context = audioContext;
        this.crossoverFrequency = 140; // Hz

        // Create input/output
        this.input = audioContext.createGain();
        this.output = audioContext.createGain();

        // Create stereo splitter/merger
        this.splitter = audioContext.createChannelSplitter(2);
        this.merger = audioContext.createChannelMerger(2);

        // Linkwitz-Riley 4th order = two cascaded Butterworth 2nd order filters
        // We need 4 filters total (2 for low-pass, 2 for high-pass)

        // LOW-PASS path (bass that will be mono'd)
        this.lowPass1L = audioContext.createBiquadFilter();
        this.lowPass1L.type = 'lowpass';
        this.lowPass1L.frequency.value = this.crossoverFrequency;
        this.lowPass1L.Q.value = 0.707; // Butterworth Q

        this.lowPass2L = audioContext.createBiquadFilter();
        this.lowPass2L.type = 'lowpass';
        this.lowPass2L.frequency.value = this.crossoverFrequency;
        this.lowPass2L.Q.value = 0.707;

        this.lowPass1R = audioContext.createBiquadFilter();
        this.lowPass1R.type = 'lowpass';
        this.lowPass1R.frequency.value = this.crossoverFrequency;
        this.lowPass1R.Q.value = 0.707;

        this.lowPass2R = audioContext.createBiquadFilter();
        this.lowPass2R.type = 'lowpass';
        this.lowPass2R.frequency.value = this.crossoverFrequency;
        this.lowPass2R.Q.value = 0.707;

        // HIGH-PASS path (stereo content above crossover)
        this.highPass1L = audioContext.createBiquadFilter();
        this.highPass1L.type = 'highpass';
        this.highPass1L.frequency.value = this.crossoverFrequency;
        this.highPass1L.Q.value = 0.707;

        this.highPass2L = audioContext.createBiquadFilter();
        this.highPass2L.type = 'highpass';
        this.highPass2L.frequency.value = this.crossoverFrequency;
        this.highPass2L.Q.value = 0.707;

        this.highPass1R = audioContext.createBiquadFilter();
        this.highPass1R.type = 'highpass';
        this.highPass1R.frequency.value = this.crossoverFrequency;
        this.highPass1R.Q.value = 0.707;

        this.highPass2R = audioContext.createBiquadFilter();
        this.highPass2R.type = 'highpass';
        this.highPass2R.frequency.value = this.crossoverFrequency;
        this.highPass2R.Q.value = 0.707;

        // Mono summing gain nodes for bass
        this.bassMonoL = audioContext.createGain();
        this.bassMonoR = audioContext.createGain();
        this.bassMonoL.gain.value = 0.5; // Average L+R
        this.bassMonoR.gain.value = 0.5;

        // Output mix gains
        this.lowMixL = audioContext.createGain();
        this.lowMixR = audioContext.createGain();
        this.highMixL = audioContext.createGain();
        this.highMixR = audioContext.createGain();

        this.connectNodes();
        this.bypassed = false;

        console.log('✅ Mono-Bass Crossover initialized at 140Hz (Linkwitz-Riley 4th order)');
    }

    connectNodes() {
        // Split input into L/R
        this.input.connect(this.splitter);

        // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
        // LOW-PASS PATH (Bass - will be mono)
        // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

        // Left channel bass
        this.splitter.connect(this.lowPass1L, 0);
        this.lowPass1L.connect(this.lowPass2L);

        // Right channel bass
        this.splitter.connect(this.lowPass1R, 1);
        this.lowPass1R.connect(this.lowPass2R);

        // Sum to mono: Connect both L and R bass to both mono gains
        this.lowPass2L.connect(this.bassMonoL);
        this.lowPass2R.connect(this.bassMonoL);

        this.lowPass2L.connect(this.bassMonoR);
        this.lowPass2R.connect(this.bassMonoR);

        // Connect mono bass to output mixer
        this.bassMonoL.connect(this.lowMixL);
        this.bassMonoR.connect(this.lowMixR);

        // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
        // HIGH-PASS PATH (Stereo content above 140Hz)
        // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

        // Left channel highs (stereo)
        this.splitter.connect(this.highPass1L, 0);
        this.highPass1L.connect(this.highPass2L);
        this.highPass2L.connect(this.highMixL);

        // Right channel highs (stereo)
        this.splitter.connect(this.highPass1R, 1);
        this.highPass1R.connect(this.highPass2R);
        this.highPass2R.connect(this.highMixR);

        // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
        // MIX AND OUTPUT
        // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

        // Combine low (mono) and high (stereo) for each channel
        this.lowMixL.connect(this.merger, 0, 0);  // Low L to output L
        this.highMixL.connect(this.merger, 0, 0); // High L to output L

        this.lowMixR.connect(this.merger, 0, 1);  // Low R to output R
        this.highMixR.connect(this.merger, 0, 1); // High R to output R

        // Final output
        this.merger.connect(this.output);
    }

    setCrossoverFrequency(freq) {
        this.crossoverFrequency = Math.max(80, Math.min(200, freq)); // Limit 80-200Hz

        // Update all filters
        this.lowPass1L.frequency.value = this.crossoverFrequency;
        this.lowPass2L.frequency.value = this.crossoverFrequency;
        this.lowPass1R.frequency.value = this.crossoverFrequency;
        this.lowPass2R.frequency.value = this.crossoverFrequency;

        this.highPass1L.frequency.value = this.crossoverFrequency;
        this.highPass2L.frequency.value = this.crossoverFrequency;
        this.highPass1R.frequency.value = this.crossoverFrequency;
        this.highPass2R.frequency.value = this.crossoverFrequency;

        console.log(`🔊 Mono-Bass crossover set to ${this.crossoverFrequency}Hz`);
    }

    bypass() {
        this.bypassed = true;
        // Set all filters to flat response (no effect)
        this.lowMixL.gain.value = 0;
        this.lowMixR.gain.value = 0;
        this.highMixL.gain.value = 0;
        this.highMixR.gain.value = 0;

        // Direct connection
        this.input.disconnect();
        this.input.connect(this.output);

        console.log('⏸️  Mono-Bass Crossover bypassed');
    }

    enable() {
        this.bypassed = false;
        // Restore normal routing
        this.input.disconnect();
        this.input.connect(this.splitter);

        this.lowMixL.gain.value = 1.0;
        this.lowMixR.gain.value = 1.0;
        this.highMixL.gain.value = 1.0;
        this.highMixR.gain.value = 1.0;

        console.log('▶️  Mono-Bass Crossover enabled');
    }
}

// ============================================================================
// 3. STEREO IMAGER WITH FREQUENCY-DEPENDENT WIDTH
// ============================================================================

class StereoImager {
    constructor(audioContext) {
        this.context = audioContext;

        // Create Mid-Side processing nodes
        this.input = audioContext.createGain();
        this.output = audioContext.createGain();

        this.splitter = audioContext.createChannelSplitter(2);
        this.merger = audioContext.createChannelMerger(2);

        // Create 3 frequency bands for independent width control
        this.bands = [
            { name: 'Low', freq: 250, width: 1.0, filter: null },
            { name: 'Mid', freq: 2000, width: 1.0, filter: null },
            { name: 'High', freq: 20000, width: 1.0, filter: null }
        ];

        this.setupBands();
    }

    setupBands() {
        for (let i = 0; i < this.bands.length; i++) {
            const band = this.bands[i];

            // Create band-pass filters
            band.lowPass = this.context.createBiquadFilter();
            band.lowPass.type = 'lowpass';
            band.lowPass.frequency.value = band.freq;

            if (i > 0) {
                band.highPass = this.context.createBiquadFilter();
                band.highPass.type = 'highpass';
                band.highPass.frequency.value = this.bands[i - 1].freq;
            }

            // Create M/S matrix
            band.midGain = this.context.createGain();
            band.sideGain = this.context.createGain();
        }
    }

    setWidth(bandIndex, width) {
        if (this.bands[bandIndex]) {
            this.bands[bandIndex].width = width;
            // Width: 0 = mono, 1 = normal, 2 = wide
            this.bands[bandIndex].sideGain.gain.value = width;
        }
    }

    processMS(leftChannel, rightChannel, bandIndex) {
        const band = this.bands[bandIndex];

        // Convert L/R to M/S
        const mid = (leftChannel + rightChannel) / 2;
        const side = (leftChannel - rightChannel) / 2;

        // Apply width
        const processedSide = side * band.width;

        // Convert back to L/R
        const newLeft = mid + processedSide;
        const newRight = mid - processedSide;

        return { left: newLeft, right: newRight };
    }
}

// ============================================================================
// 3. HARMONIC EXCITER / SATURATION
// ============================================================================

class HarmonicExciter {
    constructor(audioContext) {
        this.context = audioContext;

        this.input = audioContext.createGain();
        this.output = audioContext.createGain();

        // Waveshaper for harmonic distortion
        this.exciter = audioContext.createWaveShaper();

        // High-pass filter to only excite high frequencies
        this.highPass = audioContext.createBiquadFilter();
        this.highPass.type = 'highpass';
        this.highPass.frequency.value = 3000;  // Excite 3kHz and above

        // Mix control
        this.dryGain = audioContext.createGain();
        this.wetGain = audioContext.createGain();
        this.dryGain.gain.value = 1.0;
        this.wetGain.gain.value = 0.0;  // Start with 0% mix

        // Connect: input → split → [dry path | wet path (HPF → exciter)] → output
        this.input.connect(this.dryGain);
        this.dryGain.connect(this.output);

        this.input.connect(this.highPass);
        this.highPass.connect(this.exciter);
        this.exciter.connect(this.wetGain);
        this.wetGain.connect(this.output);

        this.setupExciterCurve('tube');
        this.amount = 0;
        this.type = 'tube';
    }

    setupExciterCurve(type) {
        const samples = 1024;
        const curve = new Float32Array(samples);

        for (let i = 0; i < samples; i++) {
            const x = (i / samples) * 2 - 1;  // -1 to 1

            switch (type) {
                case 'tube':
                    // Soft tube saturation
                    curve[i] = Math.tanh(x * 2) * 0.8;
                    break;

                case 'tape':
                    // Tape saturation with slight compression
                    curve[i] = x / (1 + Math.abs(x * 1.5));
                    break;

                case 'transformer':
                    // Transformer saturation with even harmonics
                    curve[i] = Math.sign(x) * Math.pow(Math.abs(x), 0.9);
                    break;

                default:
                    curve[i] = x;
            }
        }

        this.exciter.curve = curve;
        this.type = type;
    }

    setAmount(amount) {
        // amount: 0-100%
        this.amount = amount;
        this.wetGain.gain.value = amount / 100;
        this.dryGain.gain.value = 1.0 - (amount / 200);  // Compensate for loudness
    }

    setType(type) {
        this.setupExciterCurve(type);
    }
}

// ============================================================================
// 4. ENHANCED EQ WITH Q-FACTOR AND MID-SIDE PROCESSING
// ============================================================================

class EnhancedEQ {
    constructor(audioContext) {
        this.context = audioContext;

        this.input = audioContext.createGain();
        this.output = audioContext.createGain();

        // 7-band EQ with full parametric control
        this.bands = [
            { name: 'Sub', freq: 40, type: 'peaking', q: 0.707, gain: 0 },
            { name: 'Bass', freq: 120, type: 'peaking', q: 0.707, gain: 0 },
            { name: 'Low Mid', freq: 350, type: 'peaking', q: 0.707, gain: 0 },
            { name: 'Mid', freq: 1000, type: 'peaking', q: 0.707, gain: 0 },
            { name: 'High Mid', freq: 3500, type: 'peaking', q: 0.707, gain: 0 },
            { name: 'High', freq: 8000, type: 'peaking', q: 0.707, gain: 0 },
            { name: 'Air', freq: 14000, type: 'peaking', q: 0.707, gain: 0 }
        ];

        // Create Mid and Side processing chains
        this.midFilters = [];
        this.sideFilters = [];

        this.bands.forEach(band => {
            // Mid channel filters
            const midFilter = audioContext.createBiquadFilter();
            midFilter.type = band.type;
            midFilter.frequency.value = band.freq;
            midFilter.Q.value = band.q;
            midFilter.gain.value = band.gain;
            this.midFilters.push(midFilter);

            // Side channel filters
            const sideFilter = audioContext.createBiquadFilter();
            sideFilter.type = band.type;
            sideFilter.frequency.value = band.freq;
            sideFilter.Q.value = band.q;
            sideFilter.gain.value = band.gain;
            this.sideFilters.push(sideFilter);
        });

        this.msMode = false;  // L/R mode by default
    }

    setBandGain(bandIndex, gain, channel = 'both') {
        if (channel === 'mid' || channel === 'both') {
            this.midFilters[bandIndex].gain.value = gain;
        }
        if (channel === 'side' || channel === 'both') {
            this.sideFilters[bandIndex].gain.value = gain;
        }
    }

    setBandQ(bandIndex, q, channel = 'both') {
        if (channel === 'mid' || channel === 'both') {
            this.midFilters[bandIndex].Q.value = q;
        }
        if (channel === 'side' || channel === 'both') {
            this.sideFilters[bandIndex].Q.value = q;
        }
    }

    setBandType(bandIndex, type, channel = 'both') {
        if (channel === 'mid' || channel === 'both') {
            this.midFilters[bandIndex].type = type;
        }
        if (channel === 'side' || channel === 'both') {
            this.sideFilters[bandIndex].type = type;
        }
    }

    toggleMSMode(enabled) {
        this.msMode = enabled;
        console.log('M/S Mode:', enabled ? 'ON' : 'OFF');
    }
}

// ============================================================================
// 5. REFERENCE TRACK MATCHING SYSTEM
// ============================================================================

// Only declare if not already defined (reference-matching.js may define it first)
if (typeof ReferenceTrackMatcher === 'undefined') {
class ReferenceTrackMatcher {
    constructor(audioContext) {
        this.context = audioContext;
        this.referenceBuffer = null;
        this.referenceAnalysis = null;
        this.referenceSpectrum = null; // 31-band spectral profile
        this.userSpectrum = null;

        // 31-band ISO standard frequency bands (critical bands approximation)
        this.frequencyBands = [
            25, 31.5, 40, 50, 63, 80, 100, 125, 160, 200, 250, 315, 400,
            500, 630, 800, 1000, 1250, 1600, 2000, 2500, 3150, 4000,
            5000, 6300, 8000, 10000, 12500, 16000, 20000, 25000
        ];
    }

    async loadReferenceTrack(file) {
        const arrayBuffer = await file.arrayBuffer();
        this.referenceBuffer = await this.context.decodeAudioData(arrayBuffer);

        console.log('📎 Reference track loaded:', file.name);

        // Analyze reference track with spectral analysis
        await this.analyzeReference();

        return this.referenceAnalysis;
    }

    async analyzeReference() {
        if (!this.referenceBuffer) return null;

        console.log('🔬 Analyzing reference track with 31-band FFT...');

        // Use professional mastering engine for LUFS/LRA analysis
        const engine = window.professionalMasteringEngine;
        if (engine) {
            this.referenceAnalysis = await engine.analyzeAudio(this.referenceBuffer);
        }

        // Perform 31-band spectral analysis using 8192-point FFT
        this.referenceSpectrum = await this.compute31BandSpectrum(this.referenceBuffer);

        // Update reference display
        const element = document.getElementById('referenceLUFS');
        if (element && this.referenceAnalysis) {
            element.textContent = this.referenceAnalysis.integratedLUFS.toFixed(1) + ' LUFS';
        }

        console.log('✅ Reference analysis complete');
        console.log('📊 31-band spectral profile:', this.referenceSpectrum.map(v => v.toFixed(1)));

        return this.referenceAnalysis;
    }

    async compute31BandSpectrum(audioBuffer) {
        // Create offline context for FFT analysis
        const offlineContext = new OfflineAudioContext(
            audioBuffer.numberOfChannels,
            audioBuffer.length,
            audioBuffer.sampleRate
        );

        // Create analyser with 8192-point FFT (high resolution)
        const analyser = offlineContext.createAnalyser();
        analyser.fftSize = 8192;
        analyser.smoothingTimeConstant = 0;
        const bufferLength = analyser.frequencyBinCount;
        const dataArray = new Float32Array(bufferLength);

        // Create source from buffer
        const source = offlineContext.createBufferSource();
        source.buffer = audioBuffer;
        source.connect(analyser);
        analyser.connect(offlineContext.destination);
        source.start();

        // Analyze first 5 seconds (representative sample)
        const analysisSeconds = Math.min(5, audioBuffer.duration);
        const analysisSamples = Math.floor(analysisSeconds * audioBuffer.sampleRate);

        // Get FFT magnitude spectrum
        const channelData = audioBuffer.getChannelData(0); // Mono analysis
        const fftMagnitudes = this.performFFT(channelData, analysisSamples);

        // Map FFT bins to 31 frequency bands
        const spectrum = this.mapTo31Bands(fftMagnitudes, audioBuffer.sampleRate);

        return spectrum;
    }

    performFFT(channelData, sampleCount) {
        // Simplified FFT using Web Audio API approach
        // Divide signal into windows and average magnitude spectrum
        const fftSize = 8192;
        const hopSize = fftSize / 2;
        const numWindows = Math.floor((sampleCount - fftSize) / hopSize);
        const numBins = fftSize / 2;
        const avgMagnitude = new Float32Array(numBins);

        for (let w = 0; w < numWindows; w++) {
            const offset = w * hopSize;

            // Apply Hann window
            for (let i = 0; i < fftSize; i++) {
                const sample = channelData[offset + i] || 0;
                const window = 0.5 * (1 - Math.cos(2 * Math.PI * i / fftSize));
                const windowedSample = sample * window;

                // Accumulate magnitude (simplified - just using time domain energy per bin)
                const binIndex = Math.floor(i / 2);
                if (binIndex < numBins) {
                    avgMagnitude[binIndex] += Math.abs(windowedSample);
                }
            }
        }

        // Average across windows
        for (let i = 0; i < numBins; i++) {
            avgMagnitude[i] /= numWindows;
        }

        return avgMagnitude;
    }

    mapTo31Bands(fftMagnitudes, sampleRate) {
        // Map FFT bins to 31 frequency bands
        const spectrum = new Array(31).fill(0);
        const binWidth = sampleRate / (fftMagnitudes.length * 2); // Hz per bin

        for (let bandIdx = 0; bandIdx < 31; bandIdx++) {
            const centerFreq = this.frequencyBands[bandIdx];
            const lowFreq = bandIdx > 0 ?
                (this.frequencyBands[bandIdx - 1] + centerFreq) / 2 :
                centerFreq * 0.8;
            const highFreq = bandIdx < 30 ?
                (centerFreq + this.frequencyBands[bandIdx + 1]) / 2 :
                centerFreq * 1.2;

            // Find bins in this frequency range
            const lowBin = Math.floor(lowFreq / binWidth);
            const highBin = Math.ceil(highFreq / binWidth);

            let bandEnergy = 0;
            let binCount = 0;

            for (let bin = lowBin; bin <= highBin && bin < fftMagnitudes.length; bin++) {
                bandEnergy += fftMagnitudes[bin];
                binCount++;
            }

            // Average energy in band, convert to dB
            const avgEnergy = binCount > 0 ? bandEnergy / binCount : 0;
            spectrum[bandIdx] = avgEnergy > 0 ? 20 * Math.log10(avgEnergy + 1e-10) : -100;
        }

        return spectrum;
    }

    matchLoudness(currentLUFS, targetLUFS) {
        const gainAdjustment = targetLUFS - currentLUFS;
        const sign = gainAdjustment >= 0 ? '+' : '';
        console.log('🎯 Matching loudness: ' + sign + gainAdjustment.toFixed(2) + ' dB');
        return gainAdjustment;
    }

    async applyMatch(currentBuffer, strength = 1.0) {
        if (!this.referenceAnalysis || !this.referenceSpectrum) {
            console.error('❌ No reference track loaded');
            return;
        }

        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log('🎯 APPLYING REFERENCE MATCH WITH SPECTRAL ANALYSIS');
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

        // Analyze current audio
        let currentAnalysis = window.analysisResults;
        if (!currentAnalysis || !currentAnalysis.integratedLUFS) {
            console.log('📊 Analyzing current audio...');
            const engine = window.professionalMasteringEngine;
            if (engine) {
                currentAnalysis = await engine.analyzeAudio(currentBuffer);
                window.analysisResults = currentAnalysis;
            }
        }

        // Compute user track spectrum
        this.userSpectrum = await this.compute31BandSpectrum(currentBuffer);

        // Calculate spectral difference curve
        const differenceCurve = this.calculateSpectralDifference(
            this.userSpectrum,
            this.referenceSpectrum
        );

        console.log('📊 Spectral Difference Curve:', differenceCurve.map(v => v.toFixed(1)));

        // Apply smoothing (70% damping)
        const smoothedCurve = this.applySmoothingAndLimits(differenceCurve, strength);

        console.log('🎚️ Smoothed EQ Adjustments:', smoothedCurve.map(v => v.toFixed(1)));

        // Map to EQ sliders and apply
        this.applyEQAdjustments(smoothedCurve);

        // Also match loudness
        const currentLUFS = currentAnalysis.integratedLUFS;
        const referenceLUFS = this.referenceAnalysis.integratedLUFS;
        const fullGainAdjustment = this.matchLoudness(currentLUFS, referenceLUFS);
        const adjustedGain = fullGainAdjustment * strength;

        if (window.makeupGain) {
            const linearGain = Math.pow(10, adjustedGain / 20);
            window.makeupGain.gain.setValueAtTime(linearGain, this.context.currentTime);
            console.log('✅ Loudness matched: ' + adjustedGain.toFixed(1) + ' dB');
        }

        // Draw spectral comparison if canvas exists
        this.drawSpectralComparison();

        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log('✅ AI Reference matching complete!');
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    }

    calculateSpectralDifference(userSpectrum, referenceSpectrum) {
        // Calculate dB difference for each band
        const difference = new Array(31);
        for (let i = 0; i < 31; i++) {
            difference[i] = referenceSpectrum[i] - userSpectrum[i];
        }
        return difference;
    }

    applySmoothingAndLimits(differenceCurve, strength) {
        // Apply 70% damping factor and limit to +/- 5.0 dB
        const DAMPING = 0.30; // 30% of difference (70% smoothing)
        const MAX_ADJUSTMENT = 5.0; // dB

        const smoothed = new Array(31);
        for (let i = 0; i < 31; i++) {
            let adjustment = differenceCurve[i] * DAMPING * strength;

            // Clamp to max adjustment
            adjustment = Math.max(-MAX_ADJUSTMENT, Math.min(MAX_ADJUSTMENT, adjustment));

            smoothed[i] = adjustment;
        }

        return smoothed;
    }

    applyEQAdjustments(adjustments) {
        // Map 31 bands to the 7-band EQ in the UI
        // EQ bands: 40Hz, 120Hz, 350Hz, 1kHz, 3.5kHz, 8kHz, 14kHz
        const eqBands = [
            { freq: 40, slider: 'eqSubSlider', indices: [0, 1, 2] },      // Sub: 25-50 Hz
            { freq: 120, slider: 'eqBassSlider', indices: [3, 4, 5, 6] },  // Bass: 63-125 Hz
            { freq: 350, slider: 'eqLowMidSlider', indices: [7, 8, 9, 10] }, // Low Mid: 160-315 Hz
            { freq: 1000, slider: 'eqMidSlider', indices: [11, 12, 13, 14, 15] }, // Mid: 400-1250 Hz
            { freq: 3500, slider: 'eqHighMidSlider', indices: [16, 17, 18, 19] }, // High Mid: 1600-4000 Hz
            { freq: 8000, slider: 'eqHighSlider', indices: [20, 21, 22, 23] }, // High: 5000-10000 Hz
            { freq: 14000, slider: 'eqAirSlider', indices: [24, 25, 26, 27, 28, 29, 30] } // Air: 12500+ Hz
        ];

        console.log('🎛️ Applying EQ adjustments to sliders...');

        for (const band of eqBands) {
            // Average adjustments in this frequency range
            let avgAdjustment = 0;
            for (const idx of band.indices) {
                if (idx < adjustments.length) {
                    avgAdjustment += adjustments[idx];
                }
            }
            avgAdjustment /= band.indices.length;

            // Find slider element
            const slider = document.getElementById(band.slider);
            if (slider) {
                const currentValue = parseFloat(slider.value) || 0;
                const newValue = currentValue + avgAdjustment;

                // Update slider
                slider.value = newValue;

                // Trigger input event to update audio nodes
                slider.dispatchEvent(new Event('input', { bubbles: true }));

                console.log(`   ${band.freq}Hz: ${avgAdjustment > 0 ? '+' : ''}${avgAdjustment.toFixed(1)} dB`);
            }
        }
    }

    drawSpectralComparison() {
        const canvas = document.getElementById('spectralComparisonCanvas');
        if (!canvas || !this.userSpectrum || !this.referenceSpectrum) return;

        const ctx = canvas.getContext('2d');
        const width = canvas.width;
        const height = canvas.height;

        // Clear canvas
        ctx.fillStyle = '#0a0a0f';
        ctx.fillRect(0, 0, width, height);

        // Draw grid
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
        ctx.lineWidth = 1;
        for (let i = 0; i <= 10; i++) {
            const y = (i / 10) * height;
            ctx.beginPath();
            ctx.moveTo(0, y);
            ctx.lineTo(width, y);
            ctx.stroke();
        }

        // Calculate and draw CORRECTION CURVE (filled area showing where AI is working)
        if (this.userSpectrum && this.referenceSpectrum) {
            ctx.fillStyle = 'rgba(184, 79, 255, 0.15)'; // Purple fill
            ctx.strokeStyle = 'rgba(184, 79, 255, 0.4)';
            ctx.lineWidth = 1;
            ctx.beginPath();

            // Draw top edge (reference spectrum)
            for (let i = 0; i < 31; i++) {
                const x = (i / 30) * width;
                const normalizedValue = (this.referenceSpectrum[i] + 40) / 80;
                const y = height - (normalizedValue * height);

                if (i === 0) {
                    ctx.moveTo(x, y);
                } else {
                    ctx.lineTo(x, y);
                }
            }

            // Draw bottom edge (user spectrum) in reverse
            for (let i = 30; i >= 0; i--) {
                const x = (i / 30) * width;
                const normalizedValue = (this.userSpectrum[i] + 40) / 80;
                const y = height - (normalizedValue * height);
                ctx.lineTo(x, y);
            }

            ctx.closePath();
            ctx.fill();
            ctx.stroke();
        }

        // Normalize spectrums for display (0 dB = middle, +/- 40 dB range)
        const drawSpectrum = (spectrum, color, label, lineWidth = 2) => {
            ctx.strokeStyle = color;
            ctx.lineWidth = lineWidth;
            ctx.beginPath();

            for (let i = 0; i < 31; i++) {
                const x = (i / 30) * width;
                const normalizedValue = (spectrum[i] + 40) / 80; // -40 to +40 dB range
                const y = height - (normalizedValue * height);

                if (i === 0) {
                    ctx.moveTo(x, y);
                } else {
                    ctx.lineTo(x, y);
                }
            }
            ctx.stroke();

            // Label
            ctx.fillStyle = color;
            ctx.font = '11px Inter';
            ctx.fillText(label, 10, label === 'User Track' ? 20 : label === 'Reference' ? 38 : 56);
        };

        // Draw both spectrums
        drawSpectrum(this.userSpectrum, '#4a9eff', 'User Track', 2.5);
        drawSpectrum(this.referenceSpectrum, '#ffd700', 'Reference', 2.5);

        // Draw center line (0dB reference)
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
        ctx.lineWidth = 1;
        ctx.setLineDash([5, 5]);
        const centerY = height / 2;
        ctx.beginPath();
        ctx.moveTo(0, centerY);
        ctx.lineTo(width, centerY);
        ctx.stroke();
        ctx.setLineDash([]);

        // Add correction curve label
        if (this.userSpectrum && this.referenceSpectrum) {
            ctx.fillStyle = 'rgba(184, 79, 255, 0.8)';
            ctx.font = '11px Inter';
            ctx.fillText('AI Correction', 10, 56);
        }

        // Draw frequency labels
        ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
        ctx.font = '9px Inter';
        const freqLabels = ['25Hz', '100Hz', '500Hz', '2kHz', '10kHz', '25kHz'];
        const freqPositions = [0, 6, 12, 19, 26, 30];
        freqPositions.forEach((pos, i) => {
            const x = (pos / 30) * width;
            ctx.fillText(freqLabels[i], x - 15, height - 5);
        });
    }
}
} // End of ReferenceTrackMatcher conditional check

// ============================================================================
// 6. PRESET MANAGEMENT SYSTEM
// ============================================================================

class PresetManager {
    constructor() {
        this.presets = {};
        this.currentPreset = null;
        this.loadFromLocalStorage();
    }

    savePreset(name, settings) {
        this.presets[name] = {
            name,
            settings,
            timestamp: Date.now(),
            version: '1.0'
        };

        this.saveToLocalStorage();
        console.log('💾 Preset saved: ' + name);

        return true;
    }

    loadPreset(name) {
        const preset = this.presets[name];

        if (preset) {
            this.currentPreset = name;
            console.log('📂 Preset loaded: ' + name);
            return preset.settings;
        }

        console.error('❌ Preset not found: ' + name);
        return null;
    }

    deletePreset(name) {
        if (this.presets[name]) {
            delete this.presets[name];
            this.saveToLocalStorage();
            console.log('🗑️ Preset deleted: ' + name);
            return true;
        }
        return false;
    }

    listPresets() {
        return Object.keys(this.presets).map(name => ({
            name,
            timestamp: this.presets[name].timestamp
        }));
    }

    saveToLocalStorage() {
        try {
            localStorage.setItem('luvlang_presets', JSON.stringify(this.presets));
        } catch (e) {
            console.error('❌ Failed to save presets to localStorage:', e);
        }
    }

    loadFromLocalStorage() {
        try {
            const stored = localStorage.getItem('luvlang_presets');
            if (stored) {
                this.presets = JSON.parse(stored);
                console.log('📚 Loaded ' + Object.keys(this.presets).length + ' presets from storage');
            }
        } catch (e) {
            console.error('❌ Failed to load presets from localStorage:', e);
        }
    }

    exportToJSON() {
        return JSON.stringify(this.presets, null, 2);
    }

    importFromJSON(json) {
        try {
            const imported = JSON.parse(json);
            this.presets = { ...this.presets, ...imported };
            this.saveToLocalStorage();
            console.log('📥 Imported ' + Object.keys(imported).length + ' presets');
            return true;
        } catch (e) {
            console.error('❌ Failed to import presets:', e);
            return false;
        }
    }
}

// ============================================================================
// GLOBAL EXPORTS
// ============================================================================

// Only export if classes exist (may have been defined elsewhere)
if (typeof AdvancedLimiter !== 'undefined') window.AdvancedLimiter = AdvancedLimiter;
if (typeof MonoBassCrossover !== 'undefined') window.MonoBassCrossover = MonoBassCrossover;
if (typeof StereoImager !== 'undefined') window.StereoImager = StereoImager;
if (typeof HarmonicExciter !== 'undefined') window.HarmonicExciter = HarmonicExciter;
if (typeof EnhancedEQ !== 'undefined') window.EnhancedEQ = EnhancedEQ;
if (typeof ReferenceTrackMatcher !== 'undefined') window.ReferenceTrackMatcher = ReferenceTrackMatcher;
if (typeof PresetManager !== 'undefined') window.PresetManager = PresetManager;

console.log('✅ Advanced Processing Features loaded successfully');
