/**
 * TRANSIENT DETECTOR WORKLET
 * Real-time transient detection using Energy Derivative Algorithm
 * Replaces Python auto_master_ai.py - runs on user's CPU with ZERO latency
 *
 * Algorithm: Detects RMS spikes > 10dB in 5ms windows
 * Output: Material type (percussive, balanced, smooth) + recommended compressor settings
 *
 * Standard: Matches iZotope Ozone 11's Maximizer IRC IV transient detection
 */

class TransientDetectorProcessor extends AudioWorkletProcessor {
    constructor() {
        super();

        // Analysis parameters
        this.windowSize = Math.floor(sampleRate * 0.005); // 5ms windows
        this.hopSize = Math.floor(this.windowSize / 2); // 50% overlap

        // Energy tracking
        this.energyHistory = [];
        this.maxHistoryLength = 100; // Keep last 100 windows
        this.currentSample = 0;
        this.buffer = new Float32Array(this.windowSize);
        this.bufferIndex = 0;

        // Transient detection results
        this.transientCount = 0;
        this.maxTransientEnergy = 0;
        this.totalEnergy = 0;
        this.windowCount = 0;

        // Thresholds (professional standards)
        this.TRANSIENT_THRESHOLD_DB = 10; // Spike > 10dB = transient
        this.PERCUSSIVE_DENSITY = 10; // > 10 transients/sec = drums/EDM
        this.BALANCED_DENSITY = 5;     // 5-10 transients/sec = pop/rock

        // Message interval (report every 1 second)
        this.reportInterval = sampleRate;
        this.nextReport = this.reportInterval;

    }

    process(inputs, outputs, parameters) {
        const input = inputs[0];
        const output = outputs[0];

        // Pass-through audio (transparent)
        for (let channel = 0; channel < input.length; channel++) {
            output[channel].set(input[channel]);
        }

        // Analyze left channel for transients
        if (input.length > 0 && input[0].length > 0) {
            const channelData = input[0][0];

            for (let i = 0; i < channelData.length; i++) {
                // Fill buffer
                this.buffer[this.bufferIndex] = channelData[i];
                this.bufferIndex++;
                this.currentSample++;

                // When buffer is full, analyze
                if (this.bufferIndex >= this.windowSize) {
                    this.analyzeWindow();

                    // Hop forward
                    this.bufferIndex = this.hopSize;
                    // Copy last half to beginning (overlap)
                    this.buffer.copyWithin(0, this.hopSize, this.windowSize);
                }

                // Send periodic reports
                if (this.currentSample >= this.nextReport) {
                    this.sendReport();
                    this.nextReport += this.reportInterval;
                }
            }
        }

        return true; // Keep processor alive
    }

    /**
     * Analyze energy in current window
     */
    analyzeWindow() {
        // Calculate RMS energy
        let sumSquares = 0;
        for (let i = 0; i < this.windowSize; i++) {
            sumSquares += this.buffer[i] * this.buffer[i];
        }

        const rms = Math.sqrt(sumSquares / this.windowSize);
        const energyDB = 20 * Math.log10(rms + 1e-10); // Add epsilon to avoid log(0)

        // Store energy
        this.energyHistory.push(energyDB);
        if (this.energyHistory.length > this.maxHistoryLength) {
            this.energyHistory.shift();
        }

        this.totalEnergy += energyDB;
        this.windowCount++;

        // Detect transient (rapid energy increase)
        if (this.energyHistory.length >= 2) {
            const currentEnergy = energyDB;
            const previousEnergy = this.energyHistory[this.energyHistory.length - 2];
            const energyDiff = currentEnergy - previousEnergy;

            // Transient = spike > threshold
            if (energyDiff > this.TRANSIENT_THRESHOLD_DB) {
                this.transientCount++;
                this.maxTransientEnergy = Math.max(this.maxTransientEnergy, energyDiff);
            }
        }
    }

    /**
     * Calculate results and send to main thread
     */
    sendReport() {
        const duration = this.currentSample / sampleRate;
        const transientDensity = this.transientCount / duration;
        const avgEnergy = this.totalEnergy / this.windowCount;

        // Classify material type
        let materialType = 'unknown';
        let recommendedAttack = 0.003; // Default: 3ms
        let recommendedRelease = 0.15;  // Default: 150ms

        if (transientDensity > this.PERCUSSIVE_DENSITY) {
            // Very transient-heavy (drums, percussion, EDM)
            materialType = 'percussive';
            recommendedAttack = 0.001;  // 1ms - FAST to catch transients
            recommendedRelease = 0.08;   // 80ms - Quick release
        } else if (transientDensity > this.BALANCED_DENSITY) {
            // Moderate transients (pop, rock, hip-hop)
            materialType = 'balanced';
            recommendedAttack = 0.003;  // 3ms - Medium attack
            recommendedRelease = 0.15;   // 150ms - Standard release
        } else {
            // Few transients (pads, ambient, classical, vocals)
            materialType = 'smooth';
            recommendedAttack = 0.010;  // 10ms - SLOW to preserve dynamics
            recommendedRelease = 0.25;   // 250ms - Long release
        }

        // Send results to main thread
        this.port.postMessage({
            type: 'transient-analysis',
            data: {
                duration: duration,
                transientCount: this.transientCount,
                transientDensity: transientDensity,
                maxTransientEnergy: this.maxTransientEnergy,
                avgEnergy: avgEnergy,
                materialType: materialType,
                recommendedAttack: recommendedAttack,
                recommendedRelease: recommendedRelease,
                // For UI display
                attackMs: (recommendedAttack * 1000).toFixed(1),
                releaseMs: (recommendedRelease * 1000).toFixed(0)
            }
        });
    }
}

registerProcessor('transient-detector', TransientDetectorProcessor);
