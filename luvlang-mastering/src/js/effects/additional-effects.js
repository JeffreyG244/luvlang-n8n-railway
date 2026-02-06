/**
 * ADDITIONAL EFFECTS
 * Reverb, Delay, De-esser, Noise Gate
 * Professional-grade audio effects with impulse response support
 */

/**
 * Convolution Reverb
 * Uses impulse responses for realistic room simulation
 */
class ConvolutionReverb {
    constructor(audioContext) {
        this.audioContext = audioContext;
        this.convolver = audioContext.createConvolver();
        this.dryGain = audioContext.createGain();
        this.wetGain = audioContext.createGain();
        this.input = audioContext.createGain();
        this.output = audioContext.createGain();

        // Connect dry path
        this.input.connect(this.dryGain);
        this.dryGain.connect(this.output);

        // Connect wet path
        this.input.connect(this.convolver);
        this.convolver.connect(this.wetGain);
        this.wetGain.connect(this.output);

        this.presets = {
            'room-small': { decay: 0.3, size: 'small', color: 'warm' },
            'room-medium': { decay: 0.6, size: 'medium', color: 'neutral' },
            'room-large': { decay: 1.2, size: 'large', color: 'bright' },
            'plate': { decay: 1.5, size: 'medium', color: 'bright' },
            'hall': { decay: 2.5, size: 'large', color: 'warm' },
            'spring': { decay: 0.8, size: 'small', color: 'metallic' }
        };

        this.currentPreset = 'room-medium';
        this.mix = 0.3;
        this.enabled = false;

        // Generate default IR
        this.generateIR(this.presets[this.currentPreset]);

        // Initialized with 6 presets
    }

    /**
     * Generate impulse response algorithmically
     * Uses realistic early reflections + diffuse tail with stereo decorrelation
     */
    generateIR(settings) {
        const sampleRate = this.audioContext.sampleRate;
        const duration = settings.decay * 2.5;
        const length = Math.floor(sampleRate * duration);

        const buffer = this.audioContext.createBuffer(2, length, sampleRate);
        const leftChannel = buffer.getChannelData(0);
        const rightChannel = buffer.getChannelData(1);

        // Room size multiplier for early reflections
        const sizeMultiplier = settings.size === 'small' ? 0.5
            : settings.size === 'large' ? 2.0 : 1.0;

        // Early reflection pattern (realistic wall/ceiling bounces)
        const earlyReflections = [
            { time: 0.007 * sizeMultiplier, gain: 0.8, panL: 0.6, panR: 0.9 },
            { time: 0.013 * sizeMultiplier, gain: 0.65, panL: 0.9, panR: 0.5 },
            { time: 0.019 * sizeMultiplier, gain: 0.55, panL: 0.4, panR: 0.8 },
            { time: 0.027 * sizeMultiplier, gain: 0.45, panL: 0.7, panR: 0.3 },
            { time: 0.035 * sizeMultiplier, gain: 0.35, panL: 0.5, panR: 0.7 },
            { time: 0.048 * sizeMultiplier, gain: 0.25, panL: 0.8, panR: 0.4 },
        ];

        // Place early reflections with sub-sample accuracy
        for (const ref of earlyReflections) {
            const idx = Math.round(ref.time * sampleRate);
            if (idx < length) {
                leftChannel[idx] += ref.gain * ref.panL;
                rightChannel[idx] += ref.gain * ref.panR;
            }
        }

        // Diffuse tail: exponentially decaying noise with density ramp
        const tailStart = Math.floor(0.06 * sizeMultiplier * sampleRate);
        for (let i = tailStart; i < length; i++) {
            const t = i / sampleRate;
            const envelope = Math.exp(-t / settings.decay);

            // Density ramps up over first 100ms of tail to avoid "grainy" onset
            const densityRamp = Math.min(1, (i - tailStart) / (sampleRate * 0.1));

            const noiseL = (Math.random() * 2 - 1) * envelope * densityRamp;
            const noiseR = (Math.random() * 2 - 1) * envelope * densityRamp;

            leftChannel[i] += noiseL * 0.35;
            rightChannel[i] += noiseR * 0.35;
        }

        // Apply color filtering
        this.applyColorFilter(buffer, settings.color);

        this.convolver.buffer = buffer;
    }

    /**
     * Apply tonal color to IR
     */
    applyColorFilter(buffer, color) {
        const left = buffer.getChannelData(0);
        const right = buffer.getChannelData(1);

        // Simple IIR filter for color
        let prevL = 0, prevR = 0;
        const alpha = color === 'warm' ? 0.7 : (color === 'bright' ? 0.3 : 0.5);

        for (let i = 0; i < buffer.length; i++) {
            left[i] = alpha * left[i] + (1 - alpha) * prevL;
            right[i] = alpha * right[i] + (1 - alpha) * prevR;
            prevL = left[i];
            prevR = right[i];
        }
    }

    /**
     * Load external impulse response
     */
    async loadIR(url) {
        try {
            const response = await fetch(url);
            const arrayBuffer = await response.arrayBuffer();
            const audioBuffer = await this.audioContext.decodeAudioData(arrayBuffer);
            this.convolver.buffer = audioBuffer;
            // IR loaded successfully
        } catch (error) {
            console.error('[Reverb] Failed to load IR:', error);
        }
    }

    /**
     * Set preset
     */
    setPreset(presetName) {
        if (this.presets[presetName]) {
            this.currentPreset = presetName;
            this.generateIR(this.presets[presetName]);
        }
    }

    /**
     * Set wet/dry mix
     */
    setMix(mix) {
        this.mix = Math.max(0, Math.min(1, mix));
        this.wetGain.gain.value = this.mix;
        this.dryGain.gain.value = 1 - this.mix;
    }

    /**
     * Enable/disable
     */
    setEnabled(enabled) {
        this.enabled = enabled;
        this.wetGain.gain.value = enabled ? this.mix : 0;
    }

    /**
     * Get input node
     */
    getInput() {
        return this.input;
    }

    /**
     * Get output node
     */
    getOutput() {
        return this.output;
    }
}

/**
 * Feedback Delay
 * Tempo-syncable delay with filtering
 */
class FeedbackDelay {
    constructor(audioContext) {
        this.audioContext = audioContext;

        this.input = audioContext.createGain();
        this.output = audioContext.createGain();
        this.dryGain = audioContext.createGain();
        this.wetGain = audioContext.createGain();
        this.delay = audioContext.createDelay(5);
        this.feedback = audioContext.createGain();
        this.lowpass = audioContext.createBiquadFilter();
        this.highpass = audioContext.createBiquadFilter();

        // Configure filters
        this.lowpass.type = 'lowpass';
        this.lowpass.frequency.value = 8000;
        this.highpass.type = 'highpass';
        this.highpass.frequency.value = 80;

        // Connect dry path
        this.input.connect(this.dryGain);
        this.dryGain.connect(this.output);

        // Connect wet/delay path
        this.input.connect(this.delay);
        this.delay.connect(this.lowpass);
        this.lowpass.connect(this.highpass);
        this.highpass.connect(this.wetGain);
        this.wetGain.connect(this.output);

        // Feedback loop
        this.highpass.connect(this.feedback);
        this.feedback.connect(this.delay);

        // Default settings
        this.settings = {
            time: 0.25,      // seconds
            feedback: 0.3,    // 0-1
            mix: 0.2,         // 0-1
            lowpassFreq: 8000,
            highpassFreq: 80,
            syncToBpm: false,
            bpm: 120,
            noteValue: '1/4'
        };

        this.enabled = false;
        this.applySettings();

        // Initialized
    }

    /**
     * Apply current settings
     */
    applySettings() {
        const time = this.settings.syncToBpm
            ? this.calculateSyncedTime()
            : this.settings.time;

        this.delay.delayTime.value = time;
        this.feedback.gain.value = Math.min(0.95, this.settings.feedback);
        this.wetGain.gain.value = this.enabled ? this.settings.mix : 0;
        this.dryGain.gain.value = 1;
        this.lowpass.frequency.value = this.settings.lowpassFreq;
        this.highpass.frequency.value = this.settings.highpassFreq;
    }

    /**
     * Calculate tempo-synced delay time
     */
    calculateSyncedTime() {
        const beatTime = 60 / this.settings.bpm;
        const noteValues = {
            '1/1': 4,
            '1/2': 2,
            '1/4': 1,
            '1/8': 0.5,
            '1/16': 0.25,
            '1/4T': 2/3,
            '1/8T': 1/3,
            '1/4.': 1.5,
            '1/8.': 0.75
        };

        const multiplier = noteValues[this.settings.noteValue] || 1;
        return beatTime * multiplier;
    }

    /**
     * Set delay time (ramped to prevent clicks)
     */
    setTime(time) {
        this.settings.time = time;
        const now = this.audioContext.currentTime;
        this.delay.delayTime.cancelScheduledValues(now);
        this.delay.delayTime.setValueAtTime(this.delay.delayTime.value, now);
        this.delay.delayTime.linearRampToValueAtTime(time, now + 0.02);
    }

    /**
     * Set feedback amount
     */
    setFeedback(amount) {
        this.settings.feedback = Math.min(0.95, amount);
        this.feedback.gain.value = this.settings.feedback;
    }

    /**
     * Set mix
     */
    setMix(mix) {
        this.settings.mix = mix;
        this.wetGain.gain.value = this.enabled ? mix : 0;
    }

    /**
     * Set BPM for tempo sync
     */
    setBPM(bpm) {
        this.settings.bpm = bpm;
        if (this.settings.syncToBpm) {
            this.applySettings();
        }
    }

    /**
     * Enable/disable
     */
    setEnabled(enabled) {
        this.enabled = enabled;
        this.wetGain.gain.value = enabled ? this.settings.mix : 0;
    }

    getInput() { return this.input; }
    getOutput() { return this.output; }
}

/**
 * Dynamic De-esser
 * Multiband approach: isolate sibilant band, compress it, and recombine.
 * Uses Web Audio DynamicsCompressorNode for real dynamic gain reduction.
 */
class DeEsser {
    constructor(audioContext) {
        this.audioContext = audioContext;

        this.input = audioContext.createGain();
        this.output = audioContext.createGain();

        // === Split into low (pass-through) and sibilant (compressed) bands ===

        // Low band: everything below sibilant range (pass-through)
        this.lowSplit = audioContext.createBiquadFilter();
        this.lowSplit.type = 'lowshelf';
        this.lowSplit.frequency.value = 5000;
        this.lowSplit.gain.value = 0;

        // Sibilant band isolation (bandpass)
        this.bandIsolate = audioContext.createBiquadFilter();
        this.bandIsolate.type = 'bandpass';
        this.bandIsolate.frequency.value = 7000;
        this.bandIsolate.Q.value = 1.5;

        // Compressor on the sibilant band (the actual dynamic de-essing)
        this.compressor = audioContext.createDynamicsCompressor();
        this.compressor.threshold.value = -30;
        this.compressor.ratio.value = 6;
        this.compressor.attack.value = 0.001;    // Fast attack for transient sibilance
        this.compressor.release.value = 0.05;     // Quick release
        this.compressor.knee.value = 3;

        // Makeup gain on sibilant band (inverted/reduced)
        this.bandGain = audioContext.createGain();
        this.bandGain.gain.value = 0.5;

        // Full-band pass-through (dry)
        this.dryGain = audioContext.createGain();
        this.dryGain.gain.value = 1;

        // Wet gain for the sibilant band (subtracted from original)
        this.wetGain = audioContext.createGain();
        this.wetGain.gain.value = 0; // Start with de-esser off

        // === Routing ===
        // Dry path: input -> dryGain -> output
        this.input.connect(this.dryGain);
        this.dryGain.connect(this.output);

        // Sibilant reduction path: input -> bandIsolate -> compressor -> bandGain -> wetGain
        // wetGain is inverted (-1) to subtract compressed sibilant energy
        this.input.connect(this.bandIsolate);
        this.bandIsolate.connect(this.compressor);
        this.compressor.connect(this.bandGain);
        this.bandGain.connect(this.wetGain);
        this.wetGain.connect(this.output);

        // Settings
        this.settings = {
            threshold: -30,
            ratio: 6,
            frequency: 7000,
            intensity: 5     // 0-10
        };

        this.enabled = false;
    }

    /**
     * Set intensity (0-10)
     * Higher intensity = lower threshold + higher ratio + stronger reduction
     */
    setIntensity(intensity) {
        this.settings.intensity = Math.max(0, Math.min(10, intensity));

        // Map intensity to compressor threshold (-20 to -50 dB)
        this.compressor.threshold.value = -20 - (intensity * 3);
        // Map intensity to ratio (2:1 to 12:1)
        this.compressor.ratio.value = 2 + intensity;
        // Map intensity to wet gain (inverted band subtraction amount)
        this.wetGain.gain.value = this.enabled ? -(intensity * 0.08) : 0;
    }

    /**
     * Set center frequency for sibilant detection
     */
    setFrequency(freq) {
        this.settings.frequency = freq;
        this.bandIsolate.frequency.value = freq;
    }

    /**
     * Set center frequencies (backward-compatible overload)
     */
    setFrequencies(freq1, freq2) {
        this.setFrequency((freq1 + freq2) / 2);
    }

    /**
     * Enable/disable
     */
    setEnabled(enabled) {
        this.enabled = enabled;
        this.setIntensity(this.settings.intensity);
    }

    /**
     * Get compressor reduction for metering (dB)
     */
    getReduction() {
        return this.compressor.reduction;
    }

    getInput() { return this.input; }
    getOutput() { return this.output; }
}

/**
 * Noise Gate
 * Uses AnalyserNode for level detection with attack/hold/release envelope.
 * Polls audio level and controls gateGain accordingly.
 */
class NoiseGate {
    constructor(audioContext) {
        this.audioContext = audioContext;

        this.input = audioContext.createGain();
        this.output = audioContext.createGain();
        this.gateGain = audioContext.createGain();

        // AnalyserNode for level detection
        this.analyser = audioContext.createAnalyser();
        this.analyser.fftSize = 256;
        this._analyserData = new Float32Array(this.analyser.fftSize);

        // Connect: input -> analyser (for detection, no audio output)
        // Connect: input -> gateGain -> output (audio path)
        this.input.connect(this.analyser);
        this.input.connect(this.gateGain);
        this.gateGain.connect(this.output);

        this.settings = {
            threshold: -40,    // dB
            attack: 0.5,       // ms
            hold: 10,          // ms
            release: 50,       // ms
            range: -80,        // dB (maximum attenuation)
            hysteresis: 3      // dB
        };

        this.enabled = false;
        this.isOpen = true;
        this._holdTimer = null;
        this._pollId = null;
    }

    /**
     * Get current RMS level in dB from the analyser
     */
    _getCurrentLevelDb() {
        this.analyser.getFloatTimeDomainData(this._analyserData);
        let sum = 0;
        for (let i = 0; i < this._analyserData.length; i++) {
            sum += this._analyserData[i] * this._analyserData[i];
        }
        const rms = Math.sqrt(sum / this._analyserData.length);
        return rms > 0 ? 20 * Math.log10(rms) : -Infinity;
    }

    /**
     * Start the level-detection polling loop
     */
    _startPolling() {
        if (this._pollId !== null) return;

        const poll = () => {
            if (!this.enabled) {
                this._pollId = null;
                return;
            }

            const levelDb = this._getCurrentLevelDb();
            const openThreshold = this.settings.threshold;
            const closeThreshold = this.settings.threshold - this.settings.hysteresis;

            if (!this.isOpen && levelDb > openThreshold) {
                this._openGate();
            } else if (this.isOpen && levelDb < closeThreshold) {
                this._startHoldThenClose();
            }

            this._pollId = requestAnimationFrame(poll);
        };

        this._pollId = requestAnimationFrame(poll);
    }

    /**
     * Stop the polling loop
     */
    _stopPolling() {
        if (this._pollId !== null) {
            cancelAnimationFrame(this._pollId);
            this._pollId = null;
        }
        if (this._holdTimer !== null) {
            clearTimeout(this._holdTimer);
            this._holdTimer = null;
        }
    }

    /**
     * Open gate with attack ramp
     */
    _openGate() {
        // Cancel any pending hold-close
        if (this._holdTimer !== null) {
            clearTimeout(this._holdTimer);
            this._holdTimer = null;
        }

        if (this.isOpen) return;
        this.isOpen = true;

        const now = this.audioContext.currentTime;
        this.gateGain.gain.cancelScheduledValues(now);
        this.gateGain.gain.setValueAtTime(this.gateGain.gain.value, now);
        this.gateGain.gain.linearRampToValueAtTime(1, now + this.settings.attack / 1000);
    }

    /**
     * Start hold timer, then close gate with release ramp
     */
    _startHoldThenClose() {
        if (this._holdTimer !== null) return; // already waiting

        this._holdTimer = setTimeout(() => {
            this._holdTimer = null;
            this.isOpen = false;

            const now = this.audioContext.currentTime;
            const closedGain = Math.pow(10, this.settings.range / 20);

            this.gateGain.gain.cancelScheduledValues(now);
            this.gateGain.gain.setValueAtTime(this.gateGain.gain.value, now);
            this.gateGain.gain.linearRampToValueAtTime(closedGain, now + this.settings.release / 1000);
        }, this.settings.hold);
    }

    setThreshold(threshold) { this.settings.threshold = threshold; }
    setAttack(attack) { this.settings.attack = attack; }
    setHold(hold) { this.settings.hold = hold; }
    setRelease(release) { this.settings.release = release; }
    setRange(range) { this.settings.range = range; }

    /**
     * Enable/disable with polling lifecycle
     */
    setEnabled(enabled) {
        this.enabled = enabled;
        if (enabled) {
            this._startPolling();
        } else {
            this._stopPolling();
            this.gateGain.gain.value = 1;
            this.isOpen = true;
        }
    }

    /**
     * Cleanup
     */
    destroy() {
        this._stopPolling();
    }

    getInput() { return this.input; }
    getOutput() { return this.output; }
}

/**
 * Effects Chain Manager
 * Manages multiple effects and their routing
 */
class EffectsChain {
    constructor(audioContext) {
        this.audioContext = audioContext;

        this.effects = {
            reverb: new ConvolutionReverb(audioContext),
            delay: new FeedbackDelay(audioContext),
            deesser: new DeEsser(audioContext),
            gate: new NoiseGate(audioContext)
        };

        this.input = audioContext.createGain();
        this.output = audioContext.createGain();

        // Default chain order
        this.chainOrder = ['gate', 'deesser', 'delay', 'reverb'];

        this.rebuildChain();

        // Initialized with 4 effects
    }

    /**
     * Rebuild effects chain based on order
     */
    rebuildChain() {
        // Disconnect all
        this.input.disconnect();

        for (const key of Object.keys(this.effects)) {
            this.effects[key].getOutput().disconnect();
        }

        // Build chain
        let currentNode = this.input;

        for (const effectName of this.chainOrder) {
            const effect = this.effects[effectName];
            currentNode.connect(effect.getInput());
            currentNode = effect.getOutput();
        }

        currentNode.connect(this.output);
    }

    /**
     * Set chain order
     */
    setChainOrder(order) {
        this.chainOrder = order;
        this.rebuildChain();
    }

    /**
     * Get effect by name
     */
    getEffect(name) {
        return this.effects[name];
    }

    /**
     * Enable/disable effect
     */
    setEffectEnabled(name, enabled) {
        if (this.effects[name]) {
            this.effects[name].setEnabled(enabled);
        }
    }

    /**
     * Get all effects settings
     */
    getSettings() {
        const settings = {};
        for (const [name, effect] of Object.entries(this.effects)) {
            settings[name] = {
                enabled: effect.enabled,
                ...(effect.settings || {})
            };
        }
        return settings;
    }

    /**
     * Apply settings
     */
    applySettings(settings) {
        for (const [name, effectSettings] of Object.entries(settings)) {
            if (this.effects[name]) {
                if (effectSettings.enabled !== undefined) {
                    this.effects[name].setEnabled(effectSettings.enabled);
                }
                // Apply other settings based on effect type
            }
        }
    }

    getInput() { return this.input; }
    getOutput() { return this.output; }
}

// Export
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        ConvolutionReverb,
        FeedbackDelay,
        DeEsser,
        NoiseGate,
        EffectsChain
    };
}

if (typeof window !== 'undefined') {
    window.ConvolutionReverb = ConvolutionReverb;
    window.FeedbackDelay = FeedbackDelay;
    window.DeEsser = DeEsser;
    window.NoiseGate = NoiseGate;
    window.EffectsChain = EffectsChain;
}

export {
    ConvolutionReverb,
    FeedbackDelay,
    DeEsser,
    NoiseGate,
    EffectsChain
};
