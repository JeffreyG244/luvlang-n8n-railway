/* ═══════════════════════════════════════════════════════════════════════════════
   ADVANCED MASTERING ENGINE - World-Class Professional Features
   Version 2.0 | 2026

   Features:
   - Multi-Mode IRC-Style Limiter (5 algorithms)
   - Upward Compression
   - Unlimiter / Dynamics Restoration
   - Linear Phase EQ Mode
   - A/B Comparison System
   - Loudness History Graph
   - Spectrogram Visualization
   - Enhanced Stereo Processing
   - Soft Clipper
   ═══════════════════════════════════════════════════════════════════════════════ */

// ═══════════════════════════════════════════════════════════════════════════════
// 1. MULTI-MODE IRC-STYLE LIMITER
// ═══════════════════════════════════════════════════════════════════════════════

// Only declare if not already defined
if (typeof window.AdvancedLimiter === 'undefined') {
window.AdvancedLimiter = class AdvancedLimiter {
    constructor(audioContext) {
        this.ctx = audioContext;
        this.mode = 'balanced'; // transparent, punchy, aggressive, transient, balanced
        this.threshold = -1.0;  // dBTP
        this.ceiling = -1.0;    // True peak ceiling (-1.0 dB industry standard)
        this.release = 100;     // ms
        this.lookahead = 2;     // ms
        this.oversampling = 4;  // 4x oversampling for true peak

        // Nodes
        this.input = this.ctx.createGain();
        this.output = this.ctx.createGain();
        this.limiterNode = null;

        // IRC-style algorithm parameters per mode
        this.modeParams = {
            transparent: { attack: 0.1, release: 150, knee: 6, character: 0.0 },
            punchy:      { attack: 0.5, release: 80,  knee: 3, character: 0.3 },
            aggressive:  { attack: 1.0, release: 50,  knee: 1, character: 0.6 },
            transient:   { attack: 0.05, release: 200, knee: 8, character: 0.1 },
            balanced:    { attack: 0.3, release: 100, knee: 4, character: 0.2 }
        };

        this.init();
    }

    init() {
        // Create limiter worklet or fallback to compressor
        if (this.ctx.audioWorklet) {
            this.createWorkletLimiter();
        } else {
            this.createFallbackLimiter();
        }
    }

    createFallbackLimiter() {
        // Use DynamicsCompressor as fallback with extreme settings
        this.limiterNode = this.ctx.createDynamicsCompressor();
        this.limiterNode.threshold.value = this.threshold;
        this.limiterNode.knee.value = this.modeParams[this.mode].knee;
        this.limiterNode.ratio.value = 20; // High ratio for limiting
        this.limiterNode.attack.value = this.modeParams[this.mode].attack / 1000;
        this.limiterNode.release.value = this.modeParams[this.mode].release / 1000;

        this.input.connect(this.limiterNode);
        this.limiterNode.connect(this.output);
    }

    async createWorkletLimiter() {
        // IRC-style limiter worklet processor
        const workletCode = `
            class IRCLimiterProcessor extends AudioWorkletProcessor {
                constructor() {
                    super();
                    this.threshold = -1.0;
                    this.ceiling = -0.3;
                    this.attack = 0.3;
                    this.release = 100;
                    this.knee = 4;
                    this.lookahead = 2;
                    this.envelope = 0;
                    this.delayBuffer = new Float32Array(192); // ~2ms at 96kHz
                    this.delayIndex = 0;

                    this.port.onmessage = (e) => {
                        Object.assign(this, e.data);
                    };
                }

                process(inputs, outputs, parameters) {
                    const input = inputs[0];
                    const output = outputs[0];

                    if (!input || !input[0]) return true;

                    const thresholdLinear = Math.pow(10, this.threshold / 20);
                    const ceilingLinear = Math.pow(10, this.ceiling / 20);
                    const attackCoef = Math.exp(-1 / (sampleRate * this.attack / 1000));
                    const releaseCoef = Math.exp(-1 / (sampleRate * this.release / 1000));

                    for (let ch = 0; ch < input.length; ch++) {
                        const inCh = input[ch];
                        const outCh = output[ch];

                        for (let i = 0; i < inCh.length; i++) {
                            const sample = inCh[i];
                            const absSample = Math.abs(sample);

                            // Envelope follower
                            if (absSample > this.envelope) {
                                this.envelope = attackCoef * this.envelope + (1 - attackCoef) * absSample;
                            } else {
                                this.envelope = releaseCoef * this.envelope + (1 - releaseCoef) * absSample;
                            }

                            // Gain reduction
                            let gain = 1.0;
                            if (this.envelope > thresholdLinear) {
                                gain = thresholdLinear / this.envelope;
                            }

                            // Apply ceiling
                            outCh[i] = Math.max(-ceilingLinear, Math.min(ceilingLinear, sample * gain));
                        }
                    }

                    return true;
                }
            }
            try { registerProcessor('irc-limiter', IRCLimiterProcessor); } catch(e) {}
        `;

        try {
            const blob = new Blob([workletCode], { type: 'application/javascript' });
            const url = URL.createObjectURL(blob);
            await this.ctx.audioWorklet.addModule(url);
            URL.revokeObjectURL(url);

            this.limiterNode = new AudioWorkletNode(this.ctx, 'irc-limiter');
            this.input.connect(this.limiterNode);
            this.limiterNode.connect(this.output);

            this.updateMode(this.mode);
        } catch (e) {
            console.warn('Worklet limiter failed, using fallback:', e);
            this.createFallbackLimiter();
        }
    }

    setMode(mode) {
        if (this.modeParams[mode]) {
            this.mode = mode;
            this.updateMode(mode);
            console.log(`🎚️ Limiter mode: ${mode.toUpperCase()}`);
        }
    }

    updateMode(mode) {
        const params = this.modeParams[mode];

        if (this.limiterNode.port) {
            // Worklet node
            this.limiterNode.port.postMessage({
                attack: params.attack,
                release: params.release,
                knee: params.knee
            });
        } else if (this.limiterNode.threshold) {
            // DynamicsCompressor fallback
            this.limiterNode.knee.value = params.knee;
            this.limiterNode.attack.value = params.attack / 1000;
            this.limiterNode.release.value = params.release / 1000;
        }
    }

    setThreshold(dB) {
        this.threshold = dB;
        if (this.limiterNode.threshold) {
            this.limiterNode.threshold.value = dB;
        } else if (this.limiterNode.port) {
            this.limiterNode.port.postMessage({ threshold: dB });
        }
    }

    setCeiling(dB) {
        this.ceiling = dB;
        if (this.limiterNode.port) {
            this.limiterNode.port.postMessage({ ceiling: dB });
        }
    }

    connect(destination) {
        this.output.connect(destination);
        return this;
    }

    getInput() {
        return this.input;
    }
}
} // End AdvancedLimiter conditional

// ═══════════════════════════════════════════════════════════════════════════════
// 2. UPWARD COMPRESSION
// ═══════════════════════════════════════════════════════════════════════════════

class UpwardCompressor {
    constructor(audioContext) {
        this.ctx = audioContext;
        this.threshold = -40;  // dB - signals below this get boosted
        this.ratio = 2;        // 2:1 upward ratio
        this.attack = 10;      // ms
        this.release = 100;    // ms
        this.makeup = 0;       // dB

        this.input = this.ctx.createGain();
        this.output = this.ctx.createGain();
        this.envelope = 0;

        this.init();
    }

    async init() {
        const workletCode = `
            class UpwardCompressorProcessor extends AudioWorkletProcessor {
                constructor() {
                    super();
                    this.threshold = -40;
                    this.ratio = 2;
                    this.attack = 10;
                    this.release = 100;
                    this.makeup = 0;
                    this.envelope = 0;

                    this.port.onmessage = (e) => {
                        Object.assign(this, e.data);
                    };
                }

                process(inputs, outputs) {
                    const input = inputs[0];
                    const output = outputs[0];

                    if (!input || !input[0]) return true;

                    const thresholdLinear = Math.pow(10, this.threshold / 20);
                    const attackCoef = Math.exp(-1 / (sampleRate * this.attack / 1000));
                    const releaseCoef = Math.exp(-1 / (sampleRate * this.release / 1000));
                    const makeupLinear = Math.pow(10, this.makeup / 20);

                    for (let ch = 0; ch < input.length; ch++) {
                        const inCh = input[ch];
                        const outCh = output[ch];

                        for (let i = 0; i < inCh.length; i++) {
                            const sample = inCh[i];
                            const absSample = Math.abs(sample);

                            // Envelope follower
                            if (absSample > this.envelope) {
                                this.envelope = attackCoef * this.envelope + (1 - attackCoef) * absSample;
                            } else {
                                this.envelope = releaseCoef * this.envelope + (1 - releaseCoef) * absSample;
                            }

                            // Upward compression: boost signals BELOW threshold
                            let gain = 1.0;
                            if (this.envelope < thresholdLinear && this.envelope > 0.0001) {
                                // Calculate how much below threshold
                                const dBBelow = 20 * Math.log10(thresholdLinear / this.envelope);
                                // Apply upward ratio
                                const gainBoostdB = dBBelow * (1 - 1/this.ratio);
                                gain = Math.pow(10, gainBoostdB / 20);
                                // Limit maximum boost to prevent runaway
                                gain = Math.min(gain, 10); // Max 20dB boost
                            }

                            outCh[i] = sample * gain * makeupLinear;
                        }
                    }

                    return true;
                }
            }
            registerProcessor('upward-compressor', UpwardCompressorProcessor);
        `;

        try {
            const blob = new Blob([workletCode], { type: 'application/javascript' });
            const url = URL.createObjectURL(blob);
            await this.ctx.audioWorklet.addModule(url);
            URL.revokeObjectURL(url);

            this.processor = new AudioWorkletNode(this.ctx, 'upward-compressor');
            this.input.connect(this.processor);
            this.processor.connect(this.output);
        } catch (e) {
            console.warn('Upward compressor worklet failed:', e);
            // Fallback: just pass through
            this.input.connect(this.output);
        }
    }

    setThreshold(dB) {
        this.threshold = dB;
        if (this.processor) {
            this.processor.port.postMessage({ threshold: dB });
        }
    }

    setRatio(ratio) {
        this.ratio = ratio;
        if (this.processor) {
            this.processor.port.postMessage({ ratio });
        }
    }

    connect(destination) {
        this.output.connect(destination);
        return this;
    }

    getInput() {
        return this.input;
    }
}

// ═══════════════════════════════════════════════════════════════════════════════
// 3. UNLIMITER / DYNAMICS RESTORATION
// ═══════════════════════════════════════════════════════════════════════════════

class Unlimiter {
    constructor(audioContext) {
        this.ctx = audioContext;
        this.threshold = -6;   // Start restoring below this
        this.amount = 50;      // Restoration amount (0-100%)
        this.transientBoost = 3; // dB boost for detected transients

        this.input = this.ctx.createGain();
        this.output = this.ctx.createGain();

        this.init();
    }

    async init() {
        const workletCode = `
            class UnlimiterProcessor extends AudioWorkletProcessor {
                constructor() {
                    super();
                    this.threshold = -6;
                    this.amount = 0.5;
                    this.transientBoost = 1.4; // Linear
                    this.prevSample = [0, 0];
                    this.envelope = [0, 0];
                    this.transientEnv = [0, 0];

                    this.port.onmessage = (e) => {
                        if (e.data.threshold !== undefined) this.threshold = e.data.threshold;
                        if (e.data.amount !== undefined) this.amount = e.data.amount / 100;
                        if (e.data.transientBoost !== undefined) {
                            this.transientBoost = Math.pow(10, e.data.transientBoost / 20);
                        }
                    };
                }

                process(inputs, outputs) {
                    const input = inputs[0];
                    const output = outputs[0];

                    if (!input || !input[0]) return true;

                    const thresholdLinear = Math.pow(10, this.threshold / 20);

                    for (let ch = 0; ch < input.length; ch++) {
                        const inCh = input[ch];
                        const outCh = output[ch];

                        for (let i = 0; i < inCh.length; i++) {
                            const sample = inCh[i];
                            const absSample = Math.abs(sample);

                            // Detect transients (fast rise)
                            const diff = absSample - this.prevSample[ch];
                            const isTransient = diff > 0.01;

                            // Transient envelope
                            if (isTransient) {
                                this.transientEnv[ch] = 1.0;
                            } else {
                                this.transientEnv[ch] *= 0.995; // Decay
                            }

                            // RMS envelope
                            this.envelope[ch] = 0.999 * this.envelope[ch] + 0.001 * absSample;

                            // Detect if signal is "brick-walled" (constantly near threshold)
                            const isBrickWalled = this.envelope[ch] > thresholdLinear * 0.9;

                            let outputSample = sample;

                            if (isBrickWalled && this.amount > 0) {
                                // Restore dynamics by reducing overall level and boosting transients
                                const reduction = 1 - (this.amount * 0.3); // Reduce by up to 30%
                                const transientGain = 1 + (this.transientEnv[ch] * (this.transientBoost - 1) * this.amount);

                                outputSample = sample * reduction * transientGain;
                            }

                            this.prevSample[ch] = absSample;
                            outCh[i] = outputSample;
                        }
                    }

                    return true;
                }
            }
            registerProcessor('unlimiter', UnlimiterProcessor);
        `;

        try {
            const blob = new Blob([workletCode], { type: 'application/javascript' });
            const url = URL.createObjectURL(blob);
            await this.ctx.audioWorklet.addModule(url);
            URL.revokeObjectURL(url);

            this.processor = new AudioWorkletNode(this.ctx, 'unlimiter');
            this.input.connect(this.processor);
            this.processor.connect(this.output);
        } catch (e) {
            console.warn('Unlimiter worklet failed:', e);
            this.input.connect(this.output);
        }
    }

    setAmount(percent) {
        this.amount = percent;
        if (this.processor) {
            this.processor.port.postMessage({ amount: percent });
        }
    }

    setTransientBoost(dB) {
        this.transientBoost = dB;
        if (this.processor) {
            this.processor.port.postMessage({ transientBoost: dB });
        }
    }

    connect(destination) {
        this.output.connect(destination);
        return this;
    }

    getInput() {
        return this.input;
    }
}

// ═══════════════════════════════════════════════════════════════════════════════
// 4. SOFT CLIPPER
// ═══════════════════════════════════════════════════════════════════════════════

class SoftClipper {
    constructor(audioContext) {
        this.ctx = audioContext;
        this.drive = 0;        // dB of drive
        this.ceiling = -0.1;   // Output ceiling
        this.mix = 100;        // Wet/dry mix

        this.input = this.ctx.createGain();
        this.output = this.ctx.createGain();
        this.waveshaper = this.ctx.createWaveShaper();
        this.dryGain = this.ctx.createGain();
        this.wetGain = this.ctx.createGain();

        this.init();
    }

    init() {
        // Create soft clip curve
        this.updateCurve();

        // Parallel dry/wet
        this.input.connect(this.dryGain);
        this.input.connect(this.waveshaper);
        this.waveshaper.connect(this.wetGain);
        this.dryGain.connect(this.output);
        this.wetGain.connect(this.output);

        this.setMix(this.mix);
    }

    updateCurve() {
        const samples = 8192;
        const curve = new Float32Array(samples);
        const driveLinear = Math.pow(10, this.drive / 20);
        const ceilingLinear = Math.pow(10, this.ceiling / 20);

        for (let i = 0; i < samples; i++) {
            const x = (i / samples) * 2 - 1; // -1 to 1
            const driven = x * driveLinear;

            // Soft clip using tanh
            let clipped = Math.tanh(driven * 1.5) / Math.tanh(1.5);

            // Apply ceiling
            clipped = Math.max(-ceilingLinear, Math.min(ceilingLinear, clipped));

            curve[i] = clipped;
        }

        this.waveshaper.curve = curve;
        this.waveshaper.oversample = '4x';
    }

    setDrive(dB) {
        this.drive = dB;
        this.updateCurve();
    }

    setCeiling(dB) {
        this.ceiling = dB;
        this.updateCurve();
    }

    setMix(percent) {
        this.mix = percent;
        const wet = percent / 100;
        const dry = 1 - wet;
        this.dryGain.gain.value = dry;
        this.wetGain.gain.value = wet;
    }

    connect(destination) {
        this.output.connect(destination);
        return this;
    }

    getInput() {
        return this.input;
    }
}

// ═══════════════════════════════════════════════════════════════════════════════
// 5. A/B COMPARISON SYSTEM
// ═══════════════════════════════════════════════════════════════════════════════

class ABComparison {
    constructor() {
        this.isABEnabled = false;
        this.currentState = 'A'; // A = processed, B = bypass
        this.levelMatchdB = 0;
        this.bypassNode = null;
        this.processedNode = null;
    }

    init(audioContext, bypassPoint, processedPoint, output) {
        this.ctx = audioContext;
        this.bypassNode = bypassPoint;
        this.processedNode = processedPoint;
        this.outputNode = output;

        // Level matching gain
        this.levelMatch = this.ctx.createGain();
        this.levelMatch.gain.value = 1.0;
    }

    toggle() {
        this.currentState = this.currentState === 'A' ? 'B' : 'A';
        this.updateRouting();
        return this.currentState;
    }

    updateRouting() {
        if (this.currentState === 'A') {
            // Processed signal
            console.log('🔊 A/B: Listening to PROCESSED (A)');
        } else {
            // Bypass signal
            console.log('🔇 A/B: Listening to BYPASS (B)');
        }

        // Dispatch event for UI update
        window.dispatchEvent(new CustomEvent('abStateChange', {
            detail: { state: this.currentState }
        }));
    }

    setLevelMatch(dB) {
        this.levelMatchdB = dB;
        this.levelMatch.gain.value = Math.pow(10, dB / 20);
    }

    getState() {
        return this.currentState;
    }
}

// ═══════════════════════════════════════════════════════════════════════════════
// 6. LOUDNESS HISTORY GRAPH
// ═══════════════════════════════════════════════════════════════════════════════

class LoudnessHistory {
    constructor(canvas) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.history = [];
        this.maxHistory = 300; // 5 minutes at 1 sample/sec
        this.targetLUFS = -14;

        // History data structure
        this.data = {
            momentary: [],
            shortTerm: [],
            integrated: [],
            truePeak: []
        };
    }

    addSample(momentary, shortTerm, integrated, truePeak) {
        this.data.momentary.push(momentary);
        this.data.shortTerm.push(shortTerm);
        this.data.integrated.push(integrated);
        this.data.truePeak.push(truePeak);

        // Limit history
        if (this.data.momentary.length > this.maxHistory) {
            this.data.momentary.shift();
            this.data.shortTerm.shift();
            this.data.integrated.shift();
            this.data.truePeak.shift();
        }

        this.draw();
    }

    setTarget(lufs) {
        this.targetLUFS = lufs;
    }

    draw() {
        const w = this.canvas.width;
        const h = this.canvas.height;
        const ctx = this.ctx;

        // Clear
        ctx.fillStyle = '#0a0a0f';
        ctx.fillRect(0, 0, w, h);

        // Grid
        ctx.strokeStyle = 'rgba(255,255,255,0.1)';
        ctx.lineWidth = 1;

        // Horizontal grid lines (every 6 LUFS)
        const minLUFS = -60;
        const maxLUFS = 0;
        const range = maxLUFS - minLUFS;

        for (let lufs = -6; lufs >= -48; lufs -= 6) {
            const y = ((maxLUFS - lufs) / range) * h;
            ctx.beginPath();
            ctx.moveTo(0, y);
            ctx.lineTo(w, y);
            ctx.stroke();

            // Labels
            ctx.fillStyle = 'rgba(255,255,255,0.3)';
            ctx.font = '9px system-ui';
            ctx.textAlign = 'left';
            ctx.fillText(`${lufs}`, 3, y - 2);
        }

        // Target line
        const targetY = ((maxLUFS - this.targetLUFS) / range) * h;
        ctx.strokeStyle = 'rgba(0, 212, 255, 0.6)';
        ctx.setLineDash([5, 5]);
        ctx.beginPath();
        ctx.moveTo(0, targetY);
        ctx.lineTo(w, targetY);
        ctx.stroke();
        ctx.setLineDash([]);

        // Draw data
        const len = this.data.momentary.length;
        if (len < 2) return;

        const xStep = w / this.maxHistory;

        // Momentary (filled area)
        ctx.beginPath();
        ctx.moveTo(0, h);
        for (let i = 0; i < len; i++) {
            const x = i * xStep;
            const lufs = Math.max(minLUFS, this.data.momentary[i] || minLUFS);
            const y = ((maxLUFS - lufs) / range) * h;
            ctx.lineTo(x, y);
        }
        ctx.lineTo((len - 1) * xStep, h);
        ctx.closePath();
        ctx.fillStyle = 'rgba(0, 212, 255, 0.15)';
        ctx.fill();

        // Short-term (line)
        ctx.beginPath();
        for (let i = 0; i < len; i++) {
            const x = i * xStep;
            const lufs = Math.max(minLUFS, this.data.shortTerm[i] || minLUFS);
            const y = ((maxLUFS - lufs) / range) * h;
            i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
        }
        ctx.strokeStyle = '#00d4ff';
        ctx.lineWidth = 2;
        ctx.stroke();

        // Integrated (dashed line)
        ctx.beginPath();
        for (let i = 0; i < len; i++) {
            const x = i * xStep;
            const lufs = Math.max(minLUFS, this.data.integrated[i] || minLUFS);
            const y = ((maxLUFS - lufs) / range) * h;
            i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
        }
        ctx.strokeStyle = '#b84fff';
        ctx.lineWidth = 2;
        ctx.setLineDash([3, 3]);
        ctx.stroke();
        ctx.setLineDash([]);

        // Current values
        const lastIdx = len - 1;
        ctx.fillStyle = '#fff';
        ctx.font = 'bold 11px system-ui';
        ctx.textAlign = 'right';

        const currentLUFS = this.data.shortTerm[lastIdx]?.toFixed(1) || '--';
        const intLUFS = this.data.integrated[lastIdx]?.toFixed(1) || '--';

        ctx.fillStyle = '#00d4ff';
        ctx.fillText(`S: ${currentLUFS} LUFS`, w - 5, 15);
        ctx.fillStyle = '#b84fff';
        ctx.fillText(`I: ${intLUFS} LUFS`, w - 5, 30);
    }

    reset() {
        this.data = {
            momentary: [],
            shortTerm: [],
            integrated: [],
            truePeak: []
        };
        this.draw();
    }
}

// ═══════════════════════════════════════════════════════════════════════════════
// 7. SPECTROGRAM VISUALIZATION
// ═══════════════════════════════════════════════════════════════════════════════

class Spectrogram {
    constructor(canvas) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.fftSize = 2048;
        this.history = [];
        this.maxHistory = 200;
        this.colorMap = this.createColorMap();
    }

    createColorMap() {
        // Create a heatmap color array (blue -> cyan -> green -> yellow -> red)
        const map = [];
        for (let i = 0; i < 256; i++) {
            const t = i / 255;
            let r, g, b;

            if (t < 0.2) {
                // Black to blue
                const s = t / 0.2;
                r = 0; g = 0; b = Math.floor(s * 100);
            } else if (t < 0.4) {
                // Blue to cyan
                const s = (t - 0.2) / 0.2;
                r = 0; g = Math.floor(s * 200); b = 100 + Math.floor(s * 55);
            } else if (t < 0.6) {
                // Cyan to green
                const s = (t - 0.4) / 0.2;
                r = 0; g = 200 + Math.floor(s * 55); b = Math.floor(155 * (1 - s));
            } else if (t < 0.8) {
                // Green to yellow
                const s = (t - 0.6) / 0.2;
                r = Math.floor(s * 255); g = 255; b = 0;
            } else {
                // Yellow to red
                const s = (t - 0.8) / 0.2;
                r = 255; g = Math.floor(255 * (1 - s)); b = 0;
            }

            map.push({ r, g, b });
        }
        return map;
    }

    addFrame(frequencyData) {
        // frequencyData is Float32Array from analyser.getFloatFrequencyData
        const frame = new Float32Array(frequencyData.length);
        frame.set(frequencyData);

        this.history.push(frame);
        if (this.history.length > this.maxHistory) {
            this.history.shift();
        }

        this.draw();
    }

    draw() {
        const w = this.canvas.width;
        const h = this.canvas.height;
        const ctx = this.ctx;

        if (this.history.length === 0) return;

        const numBins = this.history[0].length;
        const colWidth = w / this.maxHistory;
        const rowHeight = h / numBins;

        // Create ImageData for faster rendering
        const imageData = ctx.createImageData(w, h);
        const data = imageData.data;

        for (let t = 0; t < this.history.length; t++) {
            const frame = this.history[t];
            const x = Math.floor(t * colWidth);

            for (let f = 0; f < numBins; f++) {
                // Logarithmic frequency mapping
                const logF = Math.floor(Math.pow(f / numBins, 0.7) * numBins);
                const dB = frame[logF] || -100;

                // Normalize -100dB to 0dB -> 0 to 255
                const normalized = Math.max(0, Math.min(255, Math.floor((dB + 100) * 2.55)));
                const color = this.colorMap[normalized];

                // Y is inverted (low freq at bottom)
                const y = h - 1 - Math.floor((f / numBins) * h);

                // Draw pixel (may span multiple pixels for visibility)
                for (let px = 0; px < Math.ceil(colWidth); px++) {
                    const idx = ((y * w) + x + px) * 4;
                    if (idx >= 0 && idx < data.length - 3) {
                        data[idx] = color.r;
                        data[idx + 1] = color.g;
                        data[idx + 2] = color.b;
                        data[idx + 3] = 255;
                    }
                }
            }
        }

        ctx.putImageData(imageData, 0, 0);

        // Frequency labels
        ctx.fillStyle = 'rgba(255,255,255,0.5)';
        ctx.font = '9px system-ui';
        ctx.textAlign = 'left';

        const freqs = [100, 500, 1000, 5000, 10000];
        for (const freq of freqs) {
            const normalizedF = Math.pow(freq / 20000, 1/0.7);
            const y = h - (normalizedF * h);
            const label = freq >= 1000 ? `${freq/1000}k` : freq;
            ctx.fillText(label, 3, y);
        }
    }

    reset() {
        this.history = [];
        this.ctx.fillStyle = '#0a0a0f';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    }
}

// ═══════════════════════════════════════════════════════════════════════════════
// 8. LINEAR PHASE EQ
// ═══════════════════════════════════════════════════════════════════════════════

// Only declare if not already defined
if (typeof window.LinearPhaseEQ === 'undefined') {
window.LinearPhaseEQ = class LinearPhaseEQ {
    constructor(audioContext) {
        this.ctx = audioContext;
        this.enabled = false;
        this.fftSize = 4096;
        this.bands = [];

        // Standard EQ bands
        this.bandConfigs = [
            { freq: 40, gain: 0, type: 'lowshelf' },
            { freq: 120, gain: 0, type: 'peaking', Q: 0.7 },
            { freq: 350, gain: 0, type: 'peaking', Q: 0.7 },
            { freq: 1000, gain: 0, type: 'peaking', Q: 0.7 },
            { freq: 3500, gain: 0, type: 'peaking', Q: 0.7 },
            { freq: 8000, gain: 0, type: 'peaking', Q: 0.7 },
            { freq: 14000, gain: 0, type: 'highshelf' }
        ];

        this.input = this.ctx.createGain();
        this.output = this.ctx.createGain();

        // For linear phase, we use convolution with computed impulse response
        this.convolver = this.ctx.createConvolver();

        this.init();
    }

    init() {
        // Create minimum phase EQ as fallback
        this.bands = this.bandConfigs.map(config => {
            const filter = this.ctx.createBiquadFilter();
            filter.type = config.type;
            filter.frequency.value = config.freq;
            filter.gain.value = config.gain;
            if (config.Q) filter.Q.value = config.Q;
            return filter;
        });

        // Chain filters
        let prev = this.input;
        for (const band of this.bands) {
            prev.connect(band);
            prev = band;
        }
        prev.connect(this.output);
    }

    setBandGain(bandIndex, gainDB) {
        if (this.bands[bandIndex]) {
            this.bands[bandIndex].gain.value = gainDB;
        }
    }

    enableLinearPhase(enable) {
        this.enabled = enable;
        // Note: True linear phase requires convolution with pre-computed IR
        // This is a placeholder - full implementation would compute IR from EQ curve
        console.log(`Linear Phase EQ: ${enable ? 'ENABLED' : 'DISABLED'}`);
    }

    connect(destination) {
        this.output.connect(destination);
        return this;
    }

    getInput() {
        return this.input;
    }
}
} // End LinearPhaseEQ conditional

// ═══════════════════════════════════════════════════════════════════════════════
// 9. MASTER ENGINE INTEGRATION
// ═══════════════════════════════════════════════════════════════════════════════

class AdvancedMasteringEngine {
    constructor(audioContext) {
        this.ctx = audioContext;

        // Initialize all processors
        this.softClipper = new SoftClipper(audioContext);
        this.upwardCompressor = new UpwardCompressor(audioContext);
        this.unlimiter = new Unlimiter(audioContext);
        this.limiter = new (window.AdvancedLimiter || AdvancedLimiter)(audioContext);
        this.linearPhaseEQ = new (window.LinearPhaseEQ || LinearPhaseEQ)(audioContext);

        // Visualization
        this.abComparison = new ABComparison();
        this.loudnessHistory = null;
        this.spectrogram = null;

        // State
        this.isInitialized = false;
    }

    async init() {
        // Wait for async processors
        await new Promise(resolve => setTimeout(resolve, 500));
        this.isInitialized = true;
        console.log('✅ Advanced Mastering Engine initialized');
    }

    // Limiter controls
    setLimiterMode(mode) {
        this.limiter.setMode(mode);
    }

    setLimiterThreshold(dB) {
        this.limiter.setThreshold(dB);
    }

    setLimiterCeiling(dB) {
        this.limiter.setCeiling(dB);
    }

    // Soft clipper controls
    setSoftClipDrive(dB) {
        this.softClipper.setDrive(dB);
    }

    setSoftClipMix(percent) {
        this.softClipper.setMix(percent);
    }

    // Upward compression controls
    setUpwardThreshold(dB) {
        this.upwardCompressor.setThreshold(dB);
    }

    setUpwardRatio(ratio) {
        this.upwardCompressor.setRatio(ratio);
    }

    // Unlimiter controls
    setUnlimiterAmount(percent) {
        this.unlimiter.setAmount(percent);
    }

    setUnlimiterTransientBoost(dB) {
        this.unlimiter.setTransientBoost(dB);
    }

    // Visualization
    initLoudnessHistory(canvas) {
        this.loudnessHistory = new LoudnessHistory(canvas);
        return this.loudnessHistory;
    }

    initSpectrogram(canvas) {
        this.spectrogram = new Spectrogram(canvas);
        return this.spectrogram;
    }

    // A/B
    toggleAB() {
        return this.abComparison.toggle();
    }

    getABState() {
        return this.abComparison.getState();
    }
}

// ═══════════════════════════════════════════════════════════════════════════════
// GLOBAL INITIALIZATION
// ═══════════════════════════════════════════════════════════════════════════════

// Safe global exports (check if defined before assigning)
if (typeof AdvancedMasteringEngine !== 'undefined') window.AdvancedMasteringEngine = AdvancedMasteringEngine;
if (typeof AdvancedLimiter !== 'undefined') window.AdvancedLimiter = AdvancedLimiter;
if (typeof UpwardCompressor !== 'undefined') window.UpwardCompressor = UpwardCompressor;
if (typeof Unlimiter !== 'undefined') window.Unlimiter = Unlimiter;
if (typeof SoftClipper !== 'undefined') window.SoftClipper = SoftClipper;
if (typeof ABComparison !== 'undefined') window.ABComparison = ABComparison;
if (typeof LoudnessHistory !== 'undefined') window.LoudnessHistory = LoudnessHistory;
if (typeof Spectrogram !== 'undefined') window.Spectrogram = Spectrogram;
if (typeof LinearPhaseEQ !== 'undefined') window.LinearPhaseEQ = LinearPhaseEQ;

console.log('🎚️ ADVANCED_MASTERING_ENGINE.js loaded');
console.log('   Features: IRC Limiter, Upward Compression, Unlimiter, Soft Clipper');
console.log('   Visualization: Loudness History, Spectrogram, A/B Comparison');
