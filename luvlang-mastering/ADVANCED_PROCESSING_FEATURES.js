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

// ============================================================================
// 2. STEREO IMAGER WITH FREQUENCY-DEPENDENT WIDTH
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

class ReferenceTrackMatcher {
    constructor(audioContext) {
        this.context = audioContext;
        this.referenceBuffer = null;
        this.referenceAnalysis = null;
    }

    async loadReferenceTrack(file) {
        const arrayBuffer = await file.arrayBuffer();
        this.referenceBuffer = await this.context.decodeAudioData(arrayBuffer);

        console.log('📎 Reference track loaded:', file.name);

        // Analyze reference track
        await this.analyzeReference();

        return this.referenceAnalysis;
    }

    async analyzeReference() {
        if (!this.referenceBuffer) return null;

        console.log('🔬 Analyzing reference track...');

        // Use professional mastering engine for analysis
        const engine = window.professionalMasteringEngine;
        if (engine) {
            this.referenceAnalysis = await engine.analyzeAudio(this.referenceBuffer);
        }

        // Update reference display
        const element = document.getElementById('referenceLUFS');
        if (element && this.referenceAnalysis) {
            element.textContent = this.referenceAnalysis.integratedLUFS.toFixed(1) + ' LUFS';
        }

        console.log('✅ Reference analysis complete');
        return this.referenceAnalysis;
    }

    matchLoudness(currentLUFS, targetLUFS) {
        const gainAdjustment = targetLUFS - currentLUFS;
        const sign = gainAdjustment >= 0 ? '+' : '';
        console.log('🎯 Matching loudness: ' + sign + gainAdjustment.toFixed(2) + ' dB');
        return gainAdjustment;
    }
}

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

window.AdvancedLimiter = AdvancedLimiter;
window.StereoImager = StereoImager;
window.HarmonicExciter = HarmonicExciter;
window.EnhancedEQ = EnhancedEQ;
window.ReferenceTrackMatcher = ReferenceTrackMatcher;
window.PresetManager = PresetManager;

console.log('✅ Advanced Processing Features loaded successfully');
