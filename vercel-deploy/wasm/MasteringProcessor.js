/**
 * LuvLang LEGENDARY - WASM Mastering Processor (AudioWorklet)
 * High-performance real-time audio processing using WASM engine
 *
 * Runs in AudioWorkletGlobalScope (separate thread from main UI)
 */

// Import WASM module (will be loaded dynamically)
let MasteringEngineModule = null;
let engineInstance = null;

class MasteringProcessor extends AudioWorkletProcessor {
    constructor(options) {
        super();

        this.sampleRate = sampleRate; // From AudioWorkletGlobalScope
        this.initialized = false;

        // Parameter state (matched to UI controls)
        this.eqGains = new Float32Array(7); // 7-band EQ
        this.limiterThreshold = -1.0;        // dBTP
        this.limiterRelease = 0.05;          // 50ms

        // Metering output
        this.meteringCounter = 0;
        this.meteringInterval = 2048; // Send metering updates every 2048 samples (~43ms @ 48kHz)

        // Handle messages from main thread
        this.port.onmessage = this.handleMessage.bind(this);

        // Request WASM module from main thread
        this.port.postMessage({
            type: 'request_wasm'
        });
    }

    handleMessage(event) {
        const { type, data } = event.data;

        switch (type) {
            case 'init_wasm':
                this.initializeWASM(data.wasmModule);
                break;

            case 'set_eq_gain':
                if (this.initialized && data.band !== undefined && data.gain !== undefined) {
                    this.eqGains[data.band] = data.gain;
                    engineInstance.setEQGain(data.band, data.gain);
                }
                break;

            case 'set_all_eq_gains':
                if (this.initialized && data.gains && data.gains.length === 7) {
                    for (let i = 0; i < 7; i++) {
                        this.eqGains[i] = data.gains[i];
                    }
                    engineInstance.setAllEQGains(data.gains);
                }
                break;

            case 'set_limiter_threshold':
                if (this.initialized && data.threshold !== undefined) {
                    this.limiterThreshold = data.threshold;
                    engineInstance.setLimiterThreshold(data.threshold);
                }
                break;

            case 'set_limiter_release':
                if (this.initialized && data.release !== undefined) {
                    this.limiterRelease = data.release;
                    engineInstance.setLimiterRelease(data.release);
                }
                break;

            case 'reset':
                if (this.initialized) {
                    engineInstance.reset();
                }
                break;

            case 'load_preset':
                this.loadPreset(data.preset);
                break;

            default:
        }
    }

    async initializeWASM(wasmModule) {
        try {

            // Store module reference
            MasteringEngineModule = wasmModule;

            // Create engine instance
            engineInstance = new MasteringEngineModule.MasteringEngine(this.sampleRate);

            // Initialize with default settings
            for (let i = 0; i < 7; i++) {
                engineInstance.setEQGain(i, this.eqGains[i]);
            }
            engineInstance.setLimiterThreshold(this.limiterThreshold);
            engineInstance.setLimiterRelease(this.limiterRelease);

            this.initialized = true;

            this.port.postMessage({
                type: 'wasm_initialized',
                data: { success: true }
            });

        } catch (error) {
            console.error('[MasteringProcessor] ❌ Failed to initialize WASM:', error);
            this.port.postMessage({
                type: 'wasm_initialized',
                data: { success: false, error: error.message }
            });
        }
    }

    loadPreset(presetName) {
        if (!this.initialized) return;


        let gains;
        let limiterThreshold = -1.0;

        switch (presetName.toLowerCase()) {
            case 'hip-hop':
                // Hip-Hop: Heavy bass, scooped mids, crisp highs
                gains = [
                    +4.0,  // Sub-bass (40Hz)   - BOOST
                    +3.0,  // Bass (120Hz)      - BOOST
                    -2.0,  // Low-mid (350Hz)   - CUT (reduce mud)
                    -1.0,  // Mid (1kHz)        - CUT (scooped)
                    +1.0,  // High-mid (3.5kHz) - BOOST (clarity)
                    +2.5,  // High (8kHz)       - BOOST (crisp)
                    +1.5   // Air (14kHz)       - BOOST (shine)
                ];
                limiterThreshold = -0.5; // Aggressive limiting
                break;

            case 'edm':
                // EDM: Massive sub, tight mids, hyper-bright
                gains = [
                    +6.0,  // Sub-bass (40Hz)   - MASSIVE BOOST
                    +2.0,  // Bass (120Hz)      - BOOST
                    -1.5,  // Low-mid (350Hz)   - CUT (tightness)
                    +0.5,  // Mid (1kHz)        - SLIGHT BOOST
                    +2.0,  // High-mid (3.5kHz) - BOOST (energy)
                    +3.0,  // High (8kHz)       - BOOST (sizzle)
                    +4.0   // Air (14kHz)       - BOOST (ultra-bright)
                ];
                limiterThreshold = -0.3; // Maximum loudness
                break;

            case 'pop':
            case 'universal':
                // Pop/Universal: Balanced, radio-ready
                gains = [
                    +1.0,  // Sub-bass (40Hz)   - GENTLE BOOST
                    +1.5,  // Bass (120Hz)      - BOOST (warmth)
                    -0.5,  // Low-mid (350Hz)   - SLIGHT CUT (clarity)
                    +0.5,  // Mid (1kHz)        - SLIGHT BOOST (presence)
                    +1.5,  // High-mid (3.5kHz) - BOOST (vocal clarity)
                    +2.0,  // High (8kHz)       - BOOST (airiness)
                    +1.0   // Air (14kHz)       - BOOST (sparkle)
                ];
                limiterThreshold = -1.0; // Balanced limiting
                break;

            case 'classical':
                // Classical: Natural, minimal processing
                gains = [
                    +0.0,  // Sub-bass (40Hz)   - FLAT
                    +0.5,  // Bass (120Hz)      - SLIGHT BOOST (warmth)
                    +0.0,  // Low-mid (350Hz)   - FLAT
                    +0.0,  // Mid (1kHz)        - FLAT
                    +0.5,  // High-mid (3.5kHz) - SLIGHT BOOST (detail)
                    +1.0,  // High (8kHz)       - BOOST (air)
                    +0.5   // Air (14kHz)       - SLIGHT BOOST
                ];
                limiterThreshold = -2.0; // Gentle limiting (preserve dynamics)
                break;

            case 'podcast':
                // Podcast: Voice clarity, reduced bass
                gains = [
                    -3.0,  // Sub-bass (40Hz)   - CUT (rumble removal)
                    -2.0,  // Bass (120Hz)      - CUT (reduce boominess)
                    +0.0,  // Low-mid (350Hz)   - FLAT
                    +2.0,  // Mid (1kHz)        - BOOST (voice presence)
                    +3.0,  // High-mid (3.5kHz) - BOOST (intelligibility)
                    +1.5,  // High (8kHz)       - BOOST (clarity)
                    +0.0   // Air (14kHz)       - FLAT
                ];
                limiterThreshold = -1.5; // Moderate limiting
                break;

            default:
                return;
        }

        // Apply preset
        for (let i = 0; i < 7; i++) {
            this.eqGains[i] = gains[i];
        }
        this.limiterThreshold = limiterThreshold;

        engineInstance.setAllEQGains(gains);
        engineInstance.setLimiterThreshold(limiterThreshold);

        // Notify main thread
        this.port.postMessage({
            type: 'preset_loaded',
            data: {
                preset: presetName,
                eqGains: gains,
                limiterThreshold: limiterThreshold
            }
        });

    }

    process(inputs, outputs, parameters) {
        // If WASM not initialized, pass through
        if (!this.initialized || !engineInstance) {
            // Bypass (copy input to output)
            const input = inputs[0];
            const output = outputs[0];

            if (input && output && input.length > 0) {
                for (let channel = 0; channel < Math.min(input.length, output.length); channel++) {
                    output[channel].set(input[channel]);
                }
            }
            return true;
        }

        const input = inputs[0];
        const output = outputs[0];

        // Require stereo input/output
        if (!input || !output || input.length < 2 || output.length < 2) {
            return true;
        }

        const leftIn = input[0];
        const rightIn = input[1];
        const leftOut = output[0];
        const rightOut = output[1];

        const numSamples = leftIn.length;

        // Create interleaved stereo buffer for WASM
        const interleavedInput = new Float32Array(numSamples * 2);
        const interleavedOutput = new Float32Array(numSamples * 2);

        // Interleave input (LRLRLR...)
        for (let i = 0; i < numSamples; i++) {
            interleavedInput[i * 2] = leftIn[i];
            interleavedInput[i * 2 + 1] = rightIn[i];
        }

        // PROCESS THROUGH WASM ENGINE
        try {
            engineInstance.processBuffer(interleavedInput, interleavedOutput, numSamples);
        } catch (error) {
            console.error('[MasteringProcessor] WASM processing error:', error);
            // Fallback: pass through
            leftOut.set(leftIn);
            rightOut.set(rightIn);
            return true;
        }

        // De-interleave output
        for (let i = 0; i < numSamples; i++) {
            leftOut[i] = interleavedOutput[i * 2];
            rightOut[i] = interleavedOutput[i * 2 + 1];
        }

        // Send metering data periodically
        this.meteringCounter += numSamples;
        if (this.meteringCounter >= this.meteringInterval) {
            try {
                const meteringData = {
                    integratedLUFS: engineInstance.getIntegratedLUFS(),
                    shortTermLUFS: engineInstance.getShortTermLUFS(),
                    momentaryLUFS: engineInstance.getMomentaryLUFS(),
                    phaseCorrelation: engineInstance.getPhaseCorrelation(),
                    limiterGainReduction: engineInstance.getLimiterGainReduction()
                };

                this.port.postMessage({
                    type: 'metering_update',
                    data: meteringData
                });
            } catch (error) {
                console.error('[MasteringProcessor] Metering error:', error);
            }

            this.meteringCounter = 0;
        }

        return true; // Keep processor alive
    }
}

registerProcessor('mastering-processor', MasteringProcessor);
