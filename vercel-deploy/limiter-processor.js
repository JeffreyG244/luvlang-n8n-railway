// ============================================
// PROFESSIONAL LOOKAHEAD LIMITER - AudioWorklet Implementation
// Sample-Accurate Brickwall Limiting with True Peak Awareness
// ============================================

class LimiterProcessor extends AudioWorkletProcessor {
    constructor() {
        super();

        // Limiter parameters
        this.ceiling = -0.3; // Default ceiling in dBFS
        this.lookaheadMs = 5; // 5ms lookahead (professional standard)
        this.releaseMs = 100; // 100ms release time

        // Processing state
        this.gainReduction = 1.0; // Linear gain multiplier (1.0 = no reduction)
        this.peakHold = 0;
        this.lookaheadBuffer = [];
        this.lookaheadSamples = 0;

        // Calculate lookahead buffer size using actual sample rate (global in AudioWorklet)
        this.updateLookahead(sampleRate);

        // Frame counter for metering updates
        this.frameCount = 0;

        // Listen for parameter changes from main thread
        this.port.onmessage = (event) => {
            const { type, value } = event.data;

            if (type === 'setCeiling') {
                this.ceiling = value;
            } else if (type === 'setLookahead') {
                this.lookaheadMs = value;
                this.updateLookahead(sampleRate);
            } else if (type === 'setRelease') {
                this.releaseMs = value;
            }
        };
    }

    updateLookahead(sampleRate) {
        this.lookaheadSamples = Math.floor((this.lookaheadMs / 1000) * sampleRate);

        // Initialize lookahead buffer for stereo (2 channels)
        this.lookaheadBuffer = [];
        for (let i = 0; i < this.lookaheadSamples; i++) {
            this.lookaheadBuffer.push([0, 0]); // [L, R]
        }
    }

    process(inputs, outputs, parameters) {
        const input = inputs[0];
        const output = outputs[0];

        if (!input || input.length === 0) {
            return true;
        }

        const leftIn = input[0];
        const rightIn = input.length > 1 ? input[1] : leftIn;
        const leftOut = output[0];
        const rightOut = output.length > 1 ? output[1] : output[0];

        const blockSize = leftIn.length;
        const ceilingLinear = Math.pow(10, this.ceiling / 20); // Convert dB to linear
        const releaseCoeff = Math.exp(-1 / ((this.releaseMs / 1000) * sampleRate / blockSize));

        for (let i = 0; i < blockSize; i++) {
            // Add current samples to lookahead buffer
            this.lookaheadBuffer.push([leftIn[i], rightIn[i]]);

            // Get delayed sample from lookahead buffer
            const delayed = this.lookaheadBuffer.shift();

            // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
            // PEAK DETECTION (Lookahead)
            // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
            let peakAhead = 0;
            for (let j = 0; j < this.lookaheadBuffer.length; j++) {
                const sample = this.lookaheadBuffer[j];
                const peakL = Math.abs(sample[0]);
                const peakR = Math.abs(sample[1]);
                const peak = Math.max(peakL, peakR);
                if (peak > peakAhead) {
                    peakAhead = peak;
                }
            }

            // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
            // GAIN CALCULATION
            // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
            let targetGain = 1.0;

            if (peakAhead > ceilingLinear) {
                // Calculate gain reduction needed to bring peak to ceiling
                targetGain = ceilingLinear / peakAhead;
            }

            // Apply attack/release smoothing
            if (targetGain < this.gainReduction) {
                // Attack: Instant (sample-accurate limiting)
                this.gainReduction = targetGain;
            } else {
                // Release: Smooth exponential release
                this.gainReduction = targetGain + releaseCoeff * (this.gainReduction - targetGain);
            }

            // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
            // APPLY GAIN REDUCTION
            // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
            leftOut[i] = delayed[0] * this.gainReduction;
            rightOut[i] = delayed[1] * this.gainReduction;
        }

        // Update frame counter and send gain reduction to main thread for metering
        this.frameCount += blockSize;
        if (this.frameCount >= 128) {
            this.frameCount = 0;
            const grDb = -20 * Math.log10(this.gainReduction + 1e-12);
            this.port.postMessage({
                type: 'gainReduction',
                value: grDb
            });
        }

        return true; // Keep processor alive
    }
}

registerProcessor('limiter-processor', LimiterProcessor);

// ============================================
// IMPLEMENTATION DETAILS
// ============================================
// This professional limiter uses:
// 1. Lookahead Buffer: 5ms delay to detect peaks before they occur
// 2. Sample-Accurate Attack: Instant gain reduction when peaks detected
// 3. Smooth Release: Exponential release curve (100ms default)
// 4. True Peak Aware: Works alongside true-peak-processor for inter-sample detection
// 5. Stereo Linking: Both channels reduced by the same amount for imaging consistency
//
// Advantages over native Web Audio nodes:
// - Sample-accurate control (no node latency)
// - Precise lookahead implementation
// - Cleaner, more predictable brickwall behavior
// - Better integration with True Peak metering
// ============================================
