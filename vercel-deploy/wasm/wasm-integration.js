/**
 * LuvLang LEGENDARY - WASM Integration
 * Loads and connects the WASM mastering engine to the Web Audio API
 */

class WASMMasteringIntegration {
    constructor(audioContext) {
        this.audioContext = audioContext;
        this.workletNode = null;
        this.wasmModule = null;
        this.initialized = false;
        this.meteringCallback = null;

        // AI Presets
        this.availablePresets = ['hip-hop', 'edm', 'pop', 'universal', 'classical', 'podcast'];
    }

    /**
     * Initialize WASM engine and AudioWorklet
     * Call this before processing any audio
     */
    async initialize() {
        console.log('🚀 Initializing WASM Mastering Engine...');

        try {
            // 1. Load WASM module
            console.log('   📦 Loading WASM module...');
            const createMasteringEngine = await import('./wasm/build/mastering-engine.js');
            this.wasmModule = await createMasteringEngine.default();
            console.log('   ✅ WASM module loaded');

            // 2. Add AudioWorklet module
            console.log('   🔊 Registering AudioWorklet...');
            await this.audioContext.audioWorklet.addModule('./wasm/MasteringProcessor.js');
            console.log('   ✅ AudioWorklet registered');

            // 3. Create AudioWorkletNode
            this.workletNode = new AudioWorkletNode(this.audioContext, 'mastering-processor', {
                numberOfInputs: 1,
                numberOfOutputs: 1,
                outputChannelCount: [2], // Stereo
                processorOptions: {}
            });

            // 4. Set up message handling
            this.workletNode.port.onmessage = this.handleWorkletMessage.bind(this);

            // 5. Send WASM module to worklet
            console.log('   💾 Sending WASM to AudioWorklet thread...');
            this.workletNode.port.postMessage({
                type: 'init_wasm',
                data: { wasmModule: this.wasmModule }
            });

            // Wait for initialization confirmation
            await this.waitForInitialization();

            this.initialized = true;
            console.log('🎉 WASM Mastering Engine ready!');

            return this.workletNode;

        } catch (error) {
            console.error('❌ Failed to initialize WASM engine:', error);
            throw error;
        }
    }

    handleWorkletMessage(event) {
        const { type, data } = event.data;

        switch (type) {
            case 'wasm_initialized':
                if (data.success) {
                    console.log('   ✅ WASM engine initialized in AudioWorklet');
                    this.initializationComplete = true;
                } else {
                    console.error('   ❌ WASM initialization failed:', data.error);
                    this.initializationError = data.error;
                }
                break;

            case 'metering_update':
                if (this.meteringCallback) {
                    this.meteringCallback(data);
                }
                break;

            case 'preset_loaded':
                console.log(`✅ Preset loaded: ${data.preset}`);
                // Optionally update UI here
                break;

            case 'request_wasm':
                // Worklet is requesting WASM module
                this.workletNode.port.postMessage({
                    type: 'init_wasm',
                    data: { wasmModule: this.wasmModule }
                });
                break;

            default:
                console.warn('[WASM Integration] Unknown message:', type);
        }
    }

    async waitForInitialization(timeout = 5000) {
        const startTime = Date.now();
        this.initializationComplete = false;
        this.initializationError = null;

        return new Promise((resolve, reject) => {
            const checkInterval = setInterval(() => {
                if (this.initializationComplete) {
                    clearInterval(checkInterval);
                    resolve();
                } else if (this.initializationError) {
                    clearInterval(checkInterval);
                    reject(new Error(this.initializationError));
                } else if (Date.now() - startTime > timeout) {
                    clearInterval(checkInterval);
                    reject(new Error('WASM initialization timeout'));
                }
            }, 50);
        });
    }

    /**
     * Connect WASM processor to audio graph
     * @param {AudioNode} source - Source node (e.g., audio element source)
     * @param {AudioNode} destination - Destination node (e.g., analyser, audio context destination)
     */
    connect(source, destination) {
        if (!this.initialized || !this.workletNode) {
            console.error('❌ WASM engine not initialized. Call initialize() first.');
            return;
        }

        source.connect(this.workletNode);
        this.workletNode.connect(destination);

        console.log('🔗 WASM processor connected to audio graph');
    }

    /**
     * Disconnect WASM processor
     */
    disconnect() {
        if (this.workletNode) {
            this.workletNode.disconnect();
        }
    }

    // ════════════════════════════════════════════════════════════════════
    // PARAMETER CONTROL
    // ════════════════════════════════════════════════════════════════════

    /**
     * Set EQ gain for a specific band
     * @param {number} band - Band index (0-6)
     * @param {number} gainDB - Gain in dB (-12 to +12)
     */
    setEQGain(band, gainDB) {
        if (!this.initialized) return;

        this.workletNode.port.postMessage({
            type: 'set_eq_gain',
            data: { band, gain: gainDB }
        });
    }

    /**
     * Set all EQ band gains at once
     * @param {Array<number>} gains - Array of 7 gains in dB
     */
    setAllEQGains(gains) {
        if (!this.initialized || gains.length !== 7) return;

        this.workletNode.port.postMessage({
            type: 'set_all_eq_gains',
            data: { gains }
        });
    }

    /**
     * Set limiter threshold
     * @param {number} thresholdDB - Threshold in dBTP (-10 to 0)
     */
    setLimiterThreshold(thresholdDB) {
        if (!this.initialized) return;

        this.workletNode.port.postMessage({
            type: 'set_limiter_threshold',
            data: { threshold: thresholdDB }
        });
    }

    /**
     * Set limiter release time
     * @param {number} releaseSec - Release in seconds (0.01 to 1.0)
     */
    setLimiterRelease(releaseSec) {
        if (!this.initialized) return;

        this.workletNode.port.postMessage({
            type: 'set_limiter_release',
            data: { release: releaseSec }
        });
    }

    /**
     * Load AI preset
     * @param {string} presetName - 'hip-hop', 'edm', 'pop', 'universal', 'classical', 'podcast'
     */
    loadPreset(presetName) {
        if (!this.initialized) return;

        if (!this.availablePresets.includes(presetName.toLowerCase())) {
            console.error(`❌ Unknown preset: ${presetName}`);
            return;
        }

        this.workletNode.port.postMessage({
            type: 'load_preset',
            data: { preset: presetName }
        });

        console.log(`🎛️ Loading ${presetName} preset...`);
    }

    /**
     * Reset all processing (clear buffers, reset metering)
     */
    reset() {
        if (!this.initialized) return;

        this.workletNode.port.postMessage({
            type: 'reset'
        });
    }

    // ════════════════════════════════════════════════════════════════════
    // METERING
    // ════════════════════════════════════════════════════════════════════

    /**
     * Set metering callback to receive updates
     * @param {Function} callback - Called with metering data object
     *
     * Metering data format:
     * {
     *   integratedLUFS: number,
     *   shortTermLUFS: number,
     *   momentaryLUFS: number,
     *   phaseCorrelation: number (-1 to +1),
     *   limiterGainReduction: number (dB)
     * }
     */
    onMetering(callback) {
        this.meteringCallback = callback;
    }

    /**
     * Get list of available AI presets
     */
    getAvailablePresets() {
        return [...this.availablePresets];
    }

    /**
     * Get current initialization status
     */
    isInitialized() {
        return this.initialized;
    }
}

// Export for use in main application
if (typeof module !== 'undefined' && module.exports) {
    module.exports = WASMMasteringIntegration;
}

// ════════════════════════════════════════════════════════════════════════
// USAGE EXAMPLE
// ════════════════════════════════════════════════════════════════════════
/*

// 1. Initialize WASM engine
const wasmMastering = new WASMMasteringIntegration(audioContext);
await wasmMastering.initialize();

// 2. Connect to audio graph
const source = audioContext.createMediaElementSource(audioElement);
wasmMastering.connect(source, audioContext.destination);

// 3. Control EQ
wasmMastering.setEQGain(0, +4.0);  // Boost sub-bass by 4dB
wasmMastering.setEQGain(2, -2.0);  // Cut low-mid by 2dB

// 4. Or load AI preset
wasmMastering.loadPreset('hip-hop');  // Automatic EQ curve for Hip-Hop

// 5. Control limiter
wasmMastering.setLimiterThreshold(-0.5);  // -0.5 dBTP ceiling
wasmMastering.setLimiterRelease(0.1);     // 100ms release

// 6. Get metering data
wasmMastering.onMetering((data) => {
    console.log(`LUFS: ${data.integratedLUFS.toFixed(1)}`);
    console.log(`Phase: ${data.phaseCorrelation.toFixed(2)}`);
    console.log(`Limiter GR: ${data.limiterGainReduction.toFixed(1)} dB`);

    // Update UI meters here
});

// 7. Reset processing
wasmMastering.reset();

*/
