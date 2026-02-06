/**
 * ADAPTIVE ROOM/SPEAKER COMPENSATION
 *
 * Plays test tones through user's speakers
 * Listens back via microphone
 * Analyzes room frequency response
 * Suggests EQ compensation
 *
 * "Your room boosts 120Hz by +4dB - consider reducing bass"
 */

class RoomCompensator {
    constructor() {
        this.roomProfile = null;
        this.testTones = [];
        this.compensation = null;
    }

    /**
     * Calibrate room/speaker response
     */
    async calibrate() {

        try {
            // Request microphone access
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            const audioContext = new AudioContext();
            const microphone = audioContext.createMediaStreamSource(stream);
            const analyser = audioContext.createAnalyser();
            analyser.fftSize = 8192;

            microphone.connect(analyser);

            // Generate and play test tones
            const frequencies = [40, 80, 120, 250, 500, 1000, 2000, 4000, 8000, 16000];
            const responses = [];

            for (const freq of frequencies) {

                // Play test tone
                await this.playTestTone(freq, 0.5, audioContext);

                // Measure response
                const response = this.measureResponse(analyser, freq);
                responses.push({ frequency: freq, response });

                // Wait between tones
                await this.sleep(500);
            }

            // Analyze room response
            this.roomProfile = this.analyzeRoomResponse(responses);

            // Generate compensation curve
            this.compensation = this.generateCompensation(this.roomProfile);

            // Clean up
            stream.getTracks().forEach(track => track.stop());
            audioContext.close();

            return this.compensation;

        } catch (error) {
            console.error('[Room Compensation] Calibration failed:', error);
            throw error;
        }
    }

    /**
     * Play test tone
     */
    async playTestTone(frequency, duration, audioContext) {
        return new Promise(resolve => {
            const oscillator = audioContext.createOscillator();
            const gainNode = audioContext.createGain();

            oscillator.frequency.value = frequency;
            oscillator.type = 'sine';

            gainNode.gain.value = 0.3; // Moderate level

            oscillator.connect(gainNode);
            gainNode.connect(audioContext.destination);

            oscillator.start();
            setTimeout(() => {
                oscillator.stop();
                resolve();
            }, duration * 1000);
        });
    }

    /**
     * Measure microphone response at frequency
     */
    measureResponse(analyser, targetFreq) {
        const bufferLength = analyser.frequencyBinCount;
        const dataArray = new Float32Array(bufferLength);
        analyser.getFloatFrequencyData(dataArray);

        // Find bin for target frequency
        const binFreq = analyser.context.sampleRate / (analyser.fftSize);
        const targetBin = Math.round(targetFreq / binFreq);

        // Measure level at target frequency (±5 bins average)
        let sum = 0;
        for (let i = targetBin - 5; i <= targetBin + 5; i++) {
            if (i >= 0 && i < bufferLength) {
                sum += dataArray[i];
            }
        }

        return sum / 11; // Average
    }

    /**
     * Analyze room response
     */
    analyzeRoomResponse(responses) {
        // Find reference level (1kHz)
        const referenceResponse = responses.find(r => r.frequency === 1000);
        const referenceLevel = referenceResponse ? referenceResponse.response : -60;

        // Calculate deviations
        const deviations = responses.map(r => ({
            frequency: r.frequency,
            deviation: r.response - referenceLevel
        }));

        // Identify problem frequencies
        const problems = deviations.filter(d => Math.abs(d.deviation) > 3);

        return {
            responses,
            deviations,
            referenceLevel,
            problems
        };
    }

    /**
     * Generate EQ compensation curve
     */
    generateCompensation(roomProfile) {
        const compensation = {
            enabled: false,
            bands: [],
            suggestions: []
        };

        for (const dev of roomProfile.deviations) {
            if (Math.abs(dev.deviation) > 3) {
                // Significant deviation - suggest compensation
                const adjustment = -dev.deviation * 0.7; // Partial correction

                compensation.bands.push({
                    frequency: dev.frequency,
                    gain: adjustment
                });

                const direction = dev.deviation > 0 ? 'boosts' : 'cuts';
                const absDeviation = Math.abs(dev.deviation).toFixed(1);
                const suggestion = `Your room ${direction} ${dev.frequency}Hz by ${absDeviation}dB - ` +
                                 `consider ${adjustment > 0 ? 'adding' : 'reducing'} ${Math.abs(adjustment).toFixed(1)}dB`;

                compensation.suggestions.push(suggestion);
            }
        }

        if (compensation.bands.length === 0) {
            compensation.suggestions.push('✓ Your room response is relatively flat - no compensation needed');
        }

        return compensation;
    }

    /**
     * Apply compensation to EQ settings
     */
    applyCompensation(eqSettings) {
        if (!this.compensation || this.compensation.bands.length === 0) {
            return eqSettings;
        }


        for (const band of this.compensation.bands) {
            // Find matching EQ band
            const eqBand = eqSettings.find(eq =>
                Math.abs(eq.frequency - band.frequency) < 50
            );

            if (eqBand) {
                eqBand.gain += band.gain;
            }
        }

        return eqSettings;
    }

    /**
     * Get room profile
     */
    getRoomProfile() {
        return this.roomProfile;
    }

    /**
     * Get compensation
     */
    getCompensation() {
        return this.compensation;
    }

    /**
     * Sleep helper
     */
    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}

// Export
if (typeof module !== 'undefined' && module.exports) {
    module.exports = RoomCompensator;
}
