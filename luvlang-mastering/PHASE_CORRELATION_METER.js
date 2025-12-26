/**
 * PHASE CORRELATION METER - Professional L/R Phase Analysis
 * ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 *
 * Real-time phase relationship meter (-1 to +1 scale)
 *
 * Reading:
 * +1.0 = Perfect mono/in-phase (100% correlation)
 * +0.7 to +1.0 = Good (mono-compatible, safe)
 * +0.3 to +0.7 = Moderate (some mono loss)
 * 0.0 to +0.3 = Weak (significant mono collapse)
 * -1.0 to 0.0 = Out of phase (DANGER - mono cancellation)
 *
 * Professional Use:
 * - Verify mono-bass crossover effectiveness (bass should stay at +1)
 * - Check stereo widening hasn't created phase problems
 * - Ensure club/streaming compatibility
 */

(function() {
    'use strict';

    class PhaseCorrelationMeter {
        constructor(audioContext) {
            this.context = audioContext;
            this.isRunning = false;
            this.correlation = 1.0;
            this.history = new Array(60).fill(1.0); // 1 second at 60fps

            // Create analyser nodes for L/R channels
            this.createAnalysers();

            // Create UI meter
            this.createMeterUI();
        }

        createAnalysers() {
            // Splitter for L/R separation
            this.splitter = this.context.createChannelSplitter(2);

            // Analysers for each channel
            this.leftAnalyser = this.context.createAnalyser();
            this.rightAnalyser = this.context.createAnalyser();

            this.leftAnalyser.fftSize = 2048;
            this.rightAnalyser.fftSize = 2048;
            this.leftAnalyser.smoothingTimeConstant = 0.8;
            this.rightAnalyser.smoothingTimeConstant = 0.8;

            // Connect
            this.splitter.connect(this.leftAnalyser, 0);
            this.splitter.connect(this.rightAnalyser, 1);

            // Data arrays
            this.leftData = new Float32Array(this.leftAnalyser.fftSize);
            this.rightData = new Float32Array(this.rightAnalyser.fftSize);
        }

        createMeterUI() {
            // Find or create meter container in master section
            let meterContainer = document.getElementById('phaseCorrelationMeter');

            if (!meterContainer) {
                // Create meter UI
                meterContainer = document.createElement('div');
                meterContainer.id = 'phaseCorrelationMeter';
                meterContainer.className = 'panel';
                meterContainer.style.marginTop = '15px';

                meterContainer.innerHTML = `
                    <div class="panel-header">
                        <div class="panel-title">🔄 Phase Correlation</div>
                        <div class="meter-value" id="phaseCorrelationValue">+1.00</div>
                    </div>
                    <div class="panel-body">
                        <!-- Meter bar -->
                        <div style="position: relative; height: 80px; background: rgba(0, 0, 0, 0.3); border-radius: 8px; overflow: hidden; margin-bottom: 10px;">
                            <!-- Gradient background -->
                            <div style="position: absolute; top: 0; left: 0; width: 100%; height: 100%; background: linear-gradient(to right, #ff3b30 0%, #ffc107 25%, #34c759 50%, #34c759 100%);"></div>

                            <!-- Center line (zero) -->
                            <div style="position: absolute; left: 50%; top: 0; width: 2px; height: 100%; background: rgba(255, 255, 255, 0.3);"></div>

                            <!-- Needle -->
                            <div id="phaseCorrelationNeedle" style="position: absolute; top: 0; left: 50%; width: 4px; height: 100%; background: #fff; box-shadow: 0 0 10px rgba(255, 255, 255, 0.8); transform: translateX(-50%); transition: left 0.1s ease;"></div>

                            <!-- Scale markers -->
                            <div style="position: absolute; bottom: 5px; left: 0%; font-size: 0.65rem; color: rgba(255, 255, 255, 0.6);">-1</div>
                            <div style="position: absolute; bottom: 5px; left: 50%; transform: translateX(-50%); font-size: 0.65rem; color: rgba(255, 255, 255, 0.6);">0</div>
                            <div style="position: absolute; bottom: 5px; right: 0%; font-size: 0.65rem; color: rgba(255, 255, 255, 0.6);">+1</div>
                        </div>

                        <!-- Status indicator -->
                        <div id="phaseCorrelationStatus" style="text-align: center; font-size: 0.75rem; padding: 8px; border-radius: 4px; background: rgba(52, 199, 89, 0.1); color: #34c759;">
                            ✓ Excellent mono compatibility
                        </div>

                        <div style="font-size: 0.65rem; opacity: 0.5; margin-top: 10px; line-height: 1.4;">
                            <strong>+1.0:</strong> Perfect mono<br>
                            <strong>+0.7 to +1.0:</strong> Good<br>
                            <strong>Below +0.3:</strong> Mono issues<br>
                            <strong>Negative:</strong> Phase problems!
                        </div>
                    </div>
                `;

                // Insert into master section (right sidebar)
                const masterSection = document.querySelector('.right-sidebar');
                if (masterSection) {
                    const exportSection = masterSection.querySelector('.panel:last-child');
                    if (exportSection) {
                        masterSection.insertBefore(meterContainer, exportSection);
                    } else {
                        masterSection.appendChild(meterContainer);
                    }
                }
            }

            this.meterValue = document.getElementById('phaseCorrelationValue');
            this.meterNeedle = document.getElementById('phaseCorrelationNeedle');
            this.meterStatus = document.getElementById('phaseCorrelationStatus');
        }

        /**
         * Get input node for connection
         */
        getInput() {
            return this.splitter;
        }

        /**
         * Start measuring phase correlation
         */
        start() {
            if (this.isRunning) return;

            this.isRunning = true;
            this.updateMeter();

            console.log('🔄 Phase Correlation Meter: Started');
        }

        /**
         * Stop measuring
         */
        stop() {
            this.isRunning = false;
            console.log('🔄 Phase Correlation Meter: Stopped');
        }

        /**
         * Update meter display (called ~60fps)
         */
        updateMeter() {
            if (!this.isRunning) return;

            // Get time-domain data from both channels
            this.leftAnalyser.getFloatTimeDomainData(this.leftData);
            this.rightAnalyser.getFloatTimeDomainData(this.rightData);

            // Calculate correlation coefficient
            this.correlation = this.calculateCorrelation(this.leftData, this.rightData);

            // Update history
            this.history.push(this.correlation);
            if (this.history.length > 60) {
                this.history.shift();
            }

            // Smooth correlation (average over history)
            const smoothedCorrelation = this.history.reduce((a, b) => a + b, 0) / this.history.length;

            // Update UI
            this.updateUI(smoothedCorrelation);

            // Continue loop
            requestAnimationFrame(() => this.updateMeter());
        }

        /**
         * Calculate Pearson correlation coefficient
         * @param {Float32Array} left - Left channel samples
         * @param {Float32Array} right - Right channel samples
         * @returns {number} Correlation (-1 to +1)
         */
        calculateCorrelation(left, right) {
            const n = left.length;
            let sumL = 0, sumR = 0, sumLR = 0, sumL2 = 0, sumR2 = 0;

            for (let i = 0; i < n; i++) {
                sumL += left[i];
                sumR += right[i];
                sumLR += left[i] * right[i];
                sumL2 += left[i] * left[i];
                sumR2 += right[i] * right[i];
            }

            const numerator = n * sumLR - sumL * sumR;
            const denominator = Math.sqrt(
                (n * sumL2 - sumL * sumL) * (n * sumR2 - sumR * sumR)
            );

            if (denominator === 0) return 1.0; // Silence = perfect correlation

            const correlation = numerator / denominator;

            // Clamp to valid range
            return Math.max(-1, Math.min(1, correlation));
        }

        /**
         * Update UI with current correlation value
         * @param {number} correlation - Correlation coefficient
         */
        updateUI(correlation) {
            if (!this.meterValue || !this.meterNeedle || !this.meterStatus) return;

            // Update numeric value
            this.meterValue.textContent = correlation >= 0
                ? `+${correlation.toFixed(2)}`
                : correlation.toFixed(2);

            // Update needle position (map -1..+1 to 0%..100%)
            const needlePosition = ((correlation + 1) / 2) * 100;
            this.meterNeedle.style.left = `${needlePosition}%`;

            // Update status message and color
            let status, color, bgColor;

            if (correlation >= 0.7) {
                status = '✓ Excellent mono compatibility';
                color = '#34c759';
                bgColor = 'rgba(52, 199, 89, 0.1)';
            } else if (correlation >= 0.3) {
                status = '⚠️ Moderate mono compatibility';
                color = '#ffc107';
                bgColor = 'rgba(255, 193, 7, 0.1)';
            } else if (correlation >= 0) {
                status = '⚠️ Poor mono compatibility';
                color = '#ff9500';
                bgColor = 'rgba(255, 149, 0, 0.1)';
            } else {
                status = '❌ PHASE PROBLEMS - Out of phase!';
                color = '#ff3b30';
                bgColor = 'rgba(255, 59, 48, 0.1)';
            }

            this.meterStatus.textContent = status;
            this.meterStatus.style.color = color;
            this.meterStatus.style.background = bgColor;

            // Log warnings for phase problems
            if (correlation < 0.3 && Math.random() < 0.01) { // Log occasionally
                console.warn(`⚠️ Phase Correlation: ${correlation.toFixed(2)} (mono compatibility issue)`);
            }
        }

        /**
         * Get current correlation value
         * @returns {number} Current correlation coefficient
         */
        getCurrentCorrelation() {
            return this.correlation;
        }

        /**
         * Check if mono-compatible
         * @returns {boolean} True if correlation > 0.7
         */
        isMonoCompatible() {
            return this.correlation > 0.7;
        }
    }

    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // GLOBAL EXPORT
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

    window.PhaseCorrelationMeter = PhaseCorrelationMeter;

    console.log('✅ Phase Correlation Meter loaded');

})();

/**
 * USAGE EXAMPLE
 * ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 *
 * // Create meter
 * const phaseMetering = new PhaseCorrelationMeter(audioContext);
 *
 * // Insert in signal chain (after mastering, before output)
 * masteringOutput.connect(phaseMeter.getInput());
 *
 * // Start metering
 * phaseMeter.start();
 *
 * // Check status
 * if (!phaseMeter.isMonoCompatible()) {
 *     console.warn('Mono compatibility issue detected!');
 * }
 *
 * // Stop metering
 * phaseMeter.stop();
 */
