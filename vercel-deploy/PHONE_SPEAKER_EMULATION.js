/**
 * PHONE SPEAKER EMULATION - Mobile Translation Check
 * ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 *
 * Professional mastering engineers ALWAYS check their masters on small speakers.
 * This ensures the mix translates well across all playback systems.
 *
 * What it simulates:
 * - Cheap Bluetooth speakers
 * - Phone speakers (iPhone, Android)
 * - Laptop speakers
 * - Car stereo tweeters
 *
 * How it works:
 * - High-pass filter at 250 Hz (removes deep bass)
 * - Low-pass filter at 8 kHz (removes extreme highs)
 * - Slight mid-range emphasis (1-3 kHz)
 * - Mono summing (most small speakers are mono or near-mono)
 *
 * Professional Use:
 * - iZotope Ozone: "Reference" module includes phone emulation
 * - Waves Abbey Road Studio 3: Built-in NS10/Auratone simulation
 * - UAD Ocean Way Studios: Multiple speaker emulations
 *
 * Quality Check:
 * If your master sounds "big" and vocals are clear in phone mode,
 * it will translate well to ANY playback system.
 */

(function() {
    'use strict';

    class PhoneSpeakerEmulator {
        constructor(audioContext) {
            this.context = audioContext;
            this.enabled = false;

            // Create filter chain
            this.createFilterChain();
        }

        createFilterChain() {
            // High-pass filter (removes sub-bass and bass)
            this.highPass = this.context.createBiquadFilter();
            this.highPass.type = 'highpass';
            this.highPass.frequency.value = 250; // Hz
            this.highPass.Q.value = 0.707; // Butterworth response

            // Low-pass filter (removes extreme highs)
            this.lowPass = this.context.createBiquadFilter();
            this.lowPass.type = 'lowpass';
            this.lowPass.frequency.value = 8000; // Hz
            this.lowPass.Q.value = 0.707;

            // Mid-range boost (presence range - makes vocals clearer)
            this.midBoost = this.context.createBiquadFilter();
            this.midBoost.type = 'peaking';
            this.midBoost.frequency.value = 2000; // Hz (vocal presence)
            this.midBoost.gain.value = 2.0; // +2 dB
            this.midBoost.Q.value = 1.0;

            // Mono summing (convert stereo to mono)
            this.merger = this.context.createChannelMerger(2);
            this.splitter = this.context.createChannelSplitter(2);
            this.monoGain = this.context.createGain();
            this.monoGain.gain.value = 0.5; // -6 dB per channel when summing

            // Connect filter chain
            this.highPass.connect(this.lowPass);
            this.lowPass.connect(this.midBoost);

            // Mono summing: split → sum → duplicate to both channels
            this.midBoost.connect(this.splitter);
            this.splitter.connect(this.monoGain, 0); // Left to mono
            this.splitter.connect(this.monoGain, 1); // Right to mono
            this.monoGain.connect(this.merger, 0, 0); // Mono to left output
            this.monoGain.connect(this.merger, 0, 1); // Mono to right output

            // Input/Output nodes
            this.input = this.highPass;
            this.output = this.merger;
        }

        /**
         * Get input node for connection
         */
        getInput() {
            return this.input;
        }

        /**
         * Get output node for connection
         */
        getOutput() {
            return this.output;
        }

        /**
         * Enable/disable phone emulation
         * @param {boolean} enabled
         */
        setEnabled(enabled) {
            this.enabled = enabled;

        }

        /**
         * Check if emulation is enabled
         */
        isEnabled() {
            return this.enabled;
        }

        /**
         * Bypass phone emulation (pass-through)
         * Creates direct connection when bypassed
         */
        bypass() {
            this.enabled = false;
        }

        /**
         * Activate phone emulation
         */
        activate() {
            this.enabled = true;
        }

        /**
         * Process audio buffer offline (for export/analysis)
         * @param {AudioBuffer} inputBuffer - Input audio
         * @returns {Promise<AudioBuffer>} Processed audio
         */
        async processBuffer(inputBuffer) {
            const sampleRate = inputBuffer.sampleRate;
            const length = inputBuffer.length;
            const numChannels = inputBuffer.numberOfChannels;

            // Create offline context
            const offlineCtx = new OfflineAudioContext(numChannels, length, sampleRate);

            // Create filter chain in offline context
            const highPass = offlineCtx.createBiquadFilter();
            highPass.type = 'highpass';
            highPass.frequency.value = 250;
            highPass.Q.value = 0.707;

            const lowPass = offlineCtx.createBiquadFilter();
            lowPass.type = 'lowpass';
            lowPass.frequency.value = 8000;
            lowPass.Q.value = 0.707;

            const midBoost = offlineCtx.createBiquadFilter();
            midBoost.type = 'peaking';
            midBoost.frequency.value = 2000;
            midBoost.gain.value = 2.0;
            midBoost.Q.value = 1.0;

            // Mono summing
            const splitter = offlineCtx.createChannelSplitter(2);
            const merger = offlineCtx.createChannelMerger(2);
            const monoGain = offlineCtx.createGain();
            monoGain.gain.value = 0.5;

            // Create source from input buffer
            const source = offlineCtx.createBufferSource();
            source.buffer = inputBuffer;

            // Connect chain
            source.connect(highPass);
            highPass.connect(lowPass);
            lowPass.connect(midBoost);
            midBoost.connect(splitter);
            splitter.connect(monoGain, 0);
            splitter.connect(monoGain, 1);
            monoGain.connect(merger, 0, 0);
            monoGain.connect(merger, 0, 1);
            merger.connect(offlineCtx.destination);

            // Process
            source.start(0);
            const renderedBuffer = await offlineCtx.startRendering();

            return renderedBuffer;
        }

        /**
         * Get frequency response (for visualization)
         */
        getFrequencyResponse() {
            const frequencies = new Float32Array([
                20, 50, 100, 200, 250, 500, 1000, 2000, 4000, 8000, 12000, 20000
            ]);
            const magResponse = new Float32Array(frequencies.length);
            const phaseResponse = new Float32Array(frequencies.length);

            // Combine response of all filters
            this.highPass.getFrequencyResponse(frequencies, magResponse, phaseResponse);

            return {
                frequencies: Array.from(frequencies),
                magnitude: Array.from(magResponse),
                phase: Array.from(phaseResponse)
            };
        }
    }

    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // UI INTEGRATION HELPER
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

    /**
     * Add phone emulation toggle to UI
     * Call this after DOM is loaded
     */
    window.addPhoneEmulationUI = function() {
        // Find master section (right sidebar)
        const masterSection = document.querySelector('.right-sidebar');
        if (!masterSection) {
            console.warn('⚠️ Could not find master section for phone emulation UI');
            return;
        }

        // Create phone check panel
        const phonePanel = document.createElement('div');
        phonePanel.className = 'panel';
        phonePanel.style.marginTop = '15px';
        phonePanel.innerHTML = `
            <div class="panel-header">
                <div class="panel-title">📱 Phone Speaker Check</div>
                <button class="bypass-btn" id="phoneEmulationToggle" style="background: rgba(255, 59, 48, 0.15); color: #ff3b30;">
                    OFF
                </button>
            </div>
            <div class="panel-body">
                <div style="font-size: 0.7rem; opacity: 0.7; margin-bottom: 10px;">
                    Simulates cheap Bluetooth speakers, phone speakers, and car stereos.
                    <br>If it sounds good here, it will translate everywhere.
                </div>
                <div style="font-size: 0.65rem; opacity: 0.5; padding: 8px; background: rgba(255, 255, 255, 0.03); border-radius: 4px;">
                    <strong>Frequency Range:</strong> 250 Hz - 8 kHz<br>
                    <strong>Summing:</strong> Mono<br>
                    <strong>Boost:</strong> +2 dB @ 2 kHz (vocal presence)
                </div>
            </div>
        `;

        // Insert before export section
        const exportSection = masterSection.querySelector('.panel:last-child');
        if (exportSection) {
            masterSection.insertBefore(phonePanel, exportSection);
        } else {
            masterSection.appendChild(phonePanel);
        }

        // Add toggle handler
        const toggleBtn = document.getElementById('phoneEmulationToggle');
        if (toggleBtn && window.phoneSpeakerEmulator) {
            toggleBtn.addEventListener('click', function() {
                const isEnabled = !window.phoneSpeakerEmulator.isEnabled();
                window.phoneSpeakerEmulator.setEnabled(isEnabled);

                if (isEnabled) {
                    this.textContent = 'ON';
                    this.style.background = 'rgba(52, 199, 89, 0.15)';
                    this.style.color = '#34c759';
                } else {
                    this.textContent = 'OFF';
                    this.style.background = 'rgba(255, 59, 48, 0.15)';
                    this.style.color = '#ff3b30';
                }
            });
        }
    };

    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // GLOBAL EXPORT
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

    window.PhoneSpeakerEmulator = PhoneSpeakerEmulator;

})();

/**
 * USAGE EXAMPLE
 * ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 *
 * // Create emulator
 * const phoneEmulator = new PhoneSpeakerEmulator(audioContext);
 *
 * // Insert in signal chain (after mastering, before output)
 * masteringOutput.connect(phoneEmulator.getInput());
 * phoneEmulator.getOutput().connect(audioContext.destination);
 *
 * // Toggle emulation
 * phoneEmulator.setEnabled(true); // Turn on phone mode
 * phoneEmulator.setEnabled(false); // Turn off (bypass)
 *
 * // Process offline (for A/B comparison)
 * const phoneVersion = await phoneEmulator.processBuffer(masteredBuffer);
 *
 * // Add UI controls
 * addPhoneEmulationUI(); // Call after DOM loaded
 */
