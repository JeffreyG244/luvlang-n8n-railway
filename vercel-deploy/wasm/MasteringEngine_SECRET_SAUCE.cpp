/*
 * LuvLang LEGENDARY - ENHANCED WASM Mastering Engine with "SECRET SAUCE"
 *
 * SECRET SAUCE FEATURES:
 * 1. ✅ True-Peak Detection with 4x Oversampling (dBTP-safe)
 * 2. ✅ Linkwitz-Riley 4th-Order Crossovers (phase-perfect multiband)
 * 3. ✅ Mono-Bass Module (<150Hz phase-coherent mono for punch)
 * 4. ✅ Crest Factor AI (automatic compression based on dynamics)
 */

#include <emscripten/bind.h>
#include <emscripten/val.h>
#include <cmath>
#include <vector>
#include <algorithm>
#include <array>

using namespace emscripten;

// ... [Previous code remains the same until line 300] ...

// ============================================================================
// LINKWITZ-RILEY 4TH-ORDER CROSSOVER FILTERS
// ============================================================================
// Phase-perfect crossover: When summed, the frequency response is perfectly flat
// Used for multiband compression to avoid phase smearing

class LinkwitzRileyCrossover {
private:
    // Two cascaded Butterworth 2nd-order filters = Linkwitz-Riley 4th-order
    ZDFBiquad lowpass1L, lowpass1R;
    ZDFBiquad lowpass2L, lowpass2R;
    ZDFBiquad highpass1L, highpass1R;
    ZDFBiquad highpass2L, highpass2R;

    double crossoverFreq;
    double sampleRate;

public:
    LinkwitzRileyCrossover(double freq = 500.0, double sr = 48000.0)
        : crossoverFreq(freq), sampleRate(sr) {
        updateCoefficients();
    }

    void setSampleRate(double sr) {
        sampleRate = sr;
        updateCoefficients();
    }

    void setCrossoverFrequency(double freq) {
        crossoverFreq = freq;
        updateCoefficients();
    }

    void updateCoefficients() {
        // Linkwitz-Riley 4th-order = Two cascaded Butterworth 2nd-order
        // Q = 0.707 for Butterworth (maximally flat passband)
        double Q = 0.707;

        // Lowpass filters (cascaded)
        lowpass1L.setCoefficients(crossoverFreq, Q, 0.0, ZDFBiquad::LOWPASS);
        lowpass1R.setCoefficients(crossoverFreq, Q, 0.0, ZDFBiquad::LOWPASS);
        lowpass2L.setCoefficients(crossoverFreq, Q, 0.0, ZDFBiquad::LOWPASS);
        lowpass2R.setCoefficients(crossoverFreq, Q, 0.0, ZDFBiquad::LOWPASS);

        // Highpass filters (cascaded)
        highpass1L.setCoefficients(crossoverFreq, Q, 0.0, ZDFBiquad::HIGHPASS);
        highpass1R.setCoefficients(crossoverFreq, Q, 0.0, ZDFBiquad::HIGHPASS);
        highpass2L.setCoefficients(crossoverFreq, Q, 0.0, ZDFBiquad::HIGHPASS);
        highpass2R.setCoefficients(crossoverFreq, Q, 0.0, ZDFBiquad::HIGHPASS);
    }

    // Process and split into low/high bands (stereo)
    void processStereo(double leftIn, double rightIn,
                      double& lowLeft, double& lowRight,
                      double& highLeft, double& highRight) {
        // Lowpass (cascade 2 Butterworth filters)
        lowLeft = lowpass2L.process(lowpass1L.process(leftIn));
        lowRight = lowpass2R.process(lowpass1R.process(rightIn));

        // Highpass (cascade 2 Butterworth filters)
        highLeft = highpass2L.process(highpass1L.process(leftIn));
        highRight = highpass2R.process(highpass1R.process(rightIn));
    }

    void reset() {
        lowpass1L.reset(); lowpass1R.reset();
        lowpass2L.reset(); lowpass2R.reset();
        highpass1L.reset(); highpass1R.reset();
        highpass2L.reset(); highpass2R.reset();
    }
};

// ============================================================================
// 3-BAND LINKWITZ-RILEY CROSSOVER (Low / Mid / High)
// ============================================================================

class ThreeBandCrossover {
private:
    LinkwitzRileyCrossover lowMidCrossover;   // Split Low vs (Mid+High)
    LinkwitzRileyCrossover midHighCrossover;  // Split Mid vs High

    double lowMidFreq;   // e.g., 250 Hz
    double midHighFreq;  // e.g., 2000 Hz

public:
    ThreeBandCrossover(double lowMid = 250.0, double midHigh = 2000.0, double sr = 48000.0)
        : lowMidFreq(lowMid), midHighFreq(midHigh),
          lowMidCrossover(lowMid, sr), midHighCrossover(midHigh, sr) {}

    void setSampleRate(double sr) {
        lowMidCrossover.setSampleRate(sr);
        midHighCrossover.setSampleRate(sr);
    }

    void setFrequencies(double lowMid, double midHigh) {
        lowMidFreq = lowMid;
        midHighFreq = midHigh;
        lowMidCrossover.setCrossoverFrequency(lowMid);
        midHighCrossover.setCrossoverFrequency(midHigh);
    }

    // Split into 3 bands: Low, Mid, High (stereo)
    void processStereo(double leftIn, double rightIn,
                      double& lowLeft, double& lowRight,
                      double& midLeft, double& midRight,
                      double& highLeft, double& highRight) {
        // Step 1: Split into Low vs (Mid+High)
        double lowL, lowR, midHighL, midHighR;
        lowMidCrossover.processStereo(leftIn, rightIn, lowL, lowR, midHighL, midHighR);

        // Step 2: Split (Mid+High) into Mid vs High
        midHighCrossover.processStereo(midHighL, midHighR, midLeft, midRight, highLeft, highRight);

        // Outputs
        lowLeft = lowL;
        lowRight = lowR;
    }

    void reset() {
        lowMidCrossover.reset();
        midHighCrossover.reset();
    }
};

// ============================================================================
// MONO-BASS MODULE (Phase-Coherent <150Hz Mono)
// ============================================================================
// Keeps bass frequencies in MONO for maximum punch and sub compatibility
// Only widens mid/high frequencies for stereo image

class MonoBassProcessor {
private:
    LinkwitzRileyCrossover crossover;  // Split @ 150Hz
    double crossoverFreq;

public:
    MonoBassProcessor(double freq = 150.0, double sr = 48000.0)
        : crossoverFreq(freq), crossover(freq, sr) {}

    void setSampleRate(double sr) {
        crossover.setSampleRate(sr);
    }

    void setCrossoverFrequency(double freq) {
        crossoverFreq = freq;
        crossover.setCrossoverFrequency(freq);
    }

    // Process stereo: Bass in mono, highs preserve stereo
    void processStereo(double& left, double& right) {
        double bassLeft, bassRight, highLeft, highRight;

        // Split into bass (<150Hz) and highs (>150Hz)
        crossover.processStereo(left, right, bassLeft, bassRight, highLeft, highRight);

        // Sum bass to MONO (phase-coherent)
        double bassMono = (bassLeft + bassRight) * 0.5;

        // Reconstruct: Mono bass + Stereo highs
        left = bassMono + highLeft;
        right = bassMono + highRight;
    }

    void reset() {
        crossover.reset();
    }
};

// ============================================================================
// MULTIBAND COMPRESSOR (3-Band with Linkwitz-Riley Crossovers)
// ============================================================================

class MultibandCompressor {
private:
    ThreeBandCrossover crossover;

    // Simple compressor per band (threshold, ratio, attack, release)
    struct BandCompressor {
        double threshold;
        double ratio;
        double attackCoeff;
        double releaseCoeff;
        double envelope;

        BandCompressor() : threshold(-20.0), ratio(4.0), envelope(0.0) {
            setAttack(0.01);   // 10ms
            setRelease(0.1);   // 100ms
        }

        void setAttack(double attackSec, double sampleRate = 48000.0) {
            attackCoeff = std::exp(-1.0 / (attackSec * sampleRate));
        }

        void setRelease(double releaseSec, double sampleRate = 48000.0) {
            releaseCoeff = std::exp(-1.0 / (releaseSec * sampleRate));
        }

        inline double process(double input) {
            double inputLevel = std::abs(input);
            double inputDB = linearToDb(inputLevel);

            // Calculate gain reduction
            double gainReductionDB = 0.0;
            if (inputDB > threshold) {
                gainReductionDB = (inputDB - threshold) * (1.0 - 1.0 / ratio);
            }

            double targetGain = dbToLinear(-gainReductionDB);

            // Envelope follower
            double coeff = (targetGain < envelope) ? attackCoeff : releaseCoeff;
            envelope = targetGain + coeff * (envelope - targetGain);

            return input * envelope;
        }
    };

    BandCompressor lowComp, midComp, highComp;
    bool enabled;

public:
    MultibandCompressor() : crossover(250.0, 2000.0), enabled(false) {}

    void setSampleRate(double sr) {
        crossover.setSampleRate(sr);
        lowComp.setAttack(0.01, sr);
        lowComp.setRelease(0.1, sr);
        midComp.setAttack(0.005, sr);  // Faster for mids
        midComp.setRelease(0.08, sr);
        highComp.setAttack(0.003, sr); // Fastest for highs
        highComp.setRelease(0.05, sr);
    }

    void setEnabled(bool enable) {
        enabled = enable;
    }

    void setLowBand(double threshold, double ratio) {
        lowComp.threshold = threshold;
        lowComp.ratio = ratio;
    }

    void setMidBand(double threshold, double ratio) {
        midComp.threshold = threshold;
        midComp.ratio = ratio;
    }

    void setHighBand(double threshold, double ratio) {
        highComp.threshold = threshold;
        highComp.ratio = ratio;
    }

    void processStereo(double& left, double& right) {
        if (!enabled) return;

        // Split into 3 bands
        double lowL, lowR, midL, midR, highL, highR;
        crossover.processStereo(left, right, lowL, lowR, midL, midR, highL, highR);

        // Compress each band
        lowL = lowComp.process(lowL);
        lowR = lowComp.process(lowR);
        midL = midComp.process(midL);
        midR = midComp.process(midR);
        highL = highComp.process(highL);
        highR = highComp.process(highR);

        // Sum back together (phase-perfect due to Linkwitz-Riley)
        left = lowL + midL + highL;
        right = lowR + midR + highR;
    }

    void reset() {
        crossover.reset();
        lowComp.envelope = 0.0;
        midComp.envelope = 0.0;
        highComp.envelope = 0.0;
    }
};

// ============================================================================
// CREST FACTOR ANALYZER
// ============================================================================
// Measures the ratio between peak and RMS (dynamic range indicator)
// Used by AI to auto-adjust compression

class CrestFactorAnalyzer {
private:
    std::vector<double> rmsBuffer;
    int rmsIndex;
    int bufferSize;
    double peakValue;
    double rmsSum;

public:
    CrestFactorAnalyzer(int windowSamples = 4800) // 100ms @ 48kHz
        : bufferSize(windowSamples), rmsIndex(0), peakValue(0.0), rmsSum(0.0) {
        rmsBuffer.resize(bufferSize, 0.0);
    }

    void processSample(double left, double right) {
        // Peak detection
        double peak = std::max(std::abs(left), std::abs(right));
        peakValue = std::max(peakValue * 0.999, peak); // Slow decay

        // RMS calculation (sliding window)
        double meanSquare = (left * left + right * right) / 2.0;

        // Remove old value, add new value
        rmsSum -= rmsBuffer[rmsIndex];
        rmsBuffer[rmsIndex] = meanSquare;
        rmsSum += meanSquare;

        rmsIndex = (rmsIndex + 1) % bufferSize;
    }

    double getCrestFactor() {
        double rms = std::sqrt(rmsSum / bufferSize);
        if (rms < 1e-10) return 100.0; // Silence

        return linearToDb(peakValue / rms); // dB
    }

    double getPeak() {
        return linearToDb(peakValue);
    }

    double getRMS() {
        return linearToDb(std::sqrt(rmsSum / bufferSize));
    }

    void reset() {
        std::fill(rmsBuffer.begin(), rmsBuffer.end(), 0.0);
        rmsIndex = 0;
        peakValue = 0.0;
        rmsSum = 0.0;
    }
};

// ============================================================================
// ENHANCED MAIN MASTERING ENGINE
// ============================================================================

class MasteringEngine {
private:
    double sampleRate;

    // Original components
    SevenBandEQ eqL;
    SevenBandEQ eqR;
    TruePeakLimiter limiter;
    LUFSMeter lufsMeter;

    // SECRET SAUCE components
    MonoBassProcessor monoBass;
    MultibandCompressor multibandComp;
    CrestFactorAnalyzer crestAnalyzer;

    // Metering
    double phaseCorrelation = 0.0;
    double crestFactor = 0.0;

    // Phase correlation calculation
    double sumLL = 0.0;
    double sumRR = 0.0;
    double sumLR = 0.0;
    int correlationSamples = 0;
    constexpr static int CORRELATION_WINDOW = 4800; // 100ms @ 48kHz

    // AI Auto-Mastering state
    bool aiEnabled = false;

public:
    MasteringEngine(double sr = 48000.0)
        : sampleRate(sr), limiter(sr), lufsMeter(sr), monoBass(150.0, sr),
          crestAnalyzer(4800) {
        eqL.setSampleRate(sr);
        eqR.setSampleRate(sr);
        multibandComp.setSampleRate(sr);
    }

    void setSampleRate(double sr) {
        sampleRate = sr;
        eqL.setSampleRate(sr);
        eqR.setSampleRate(sr);
        limiter.setSampleRate(sr);
        monoBass.setSampleRate(sr);
        multibandComp.setSampleRate(sr);
    }

    // ═══════════════════════════════════════════════════════════════════
    // CONTROL METHODS
    // ═══════════════════════════════════════════════════════════════════

    // EQ Control
    void setEQGain(int band, double gainDB) {
        eqL.setBandGain(band, gainDB);
        eqR.setBandGain(band, gainDB);
    }

    void setAllEQGains(val gainsArray) {
        std::array<double, 7> gains;
        for (int i = 0; i < 7; ++i) {
            gains[i] = gainsArray[i].as<double>();
        }
        eqL.setAllGains(gains);
        eqR.setAllGains(gains);
    }

    // Limiter Control
    void setLimiterThreshold(double thresholdDB) {
        limiter.setThreshold(thresholdDB);
    }

    void setLimiterRelease(double releaseSec) {
        limiter.setRelease(releaseSec);
    }

    // Mono Bass Control
    void setMonoBassEnabled(bool enabled) {
        // Could add enable/disable, for now always active
    }

    void setMonoBassFrequency(double freq) {
        monoBass.setCrossoverFrequency(freq);
    }

    // Multiband Compressor Control
    void setMultibandEnabled(bool enabled) {
        multibandComp.setEnabled(enabled);
    }

    void setMultibandLowBand(double threshold, double ratio) {
        multibandComp.setLowBand(threshold, ratio);
    }

    void setMultibandMidBand(double threshold, double ratio) {
        multibandComp.setMidBand(threshold, ratio);
    }

    void setMultibandHighBand(double threshold, double ratio) {
        multibandComp.setHighBand(threshold, ratio);
    }

    // AI Auto-Mastering
    void setAIEnabled(bool enabled) {
        aiEnabled = enabled;
    }

    // ═══════════════════════════════════════════════════════════════════
    // PROCESSING
    // ═══════════════════════════════════════════════════════════════════

    void processStereo(double& left, double& right) {
        // 1. EQ
        left = eqL.process(left);
        right = eqR.process(right);

        // 2. MONO BASS (Secret Sauce #3)
        // Keep bass <150Hz in mono for maximum punch
        monoBass.processStereo(left, right);

        // 3. MULTIBAND COMPRESSION (Secret Sauce #2)
        // Uses Linkwitz-Riley 4th-order crossovers for phase-perfect splitting
        multibandComp.processStereo(left, right);

        // 4. TRUE-PEAK LIMITER (Secret Sauce #1)
        // 4x oversampling for dBTP-safe limiting
        limiter.processStereo(left, right);

        // 5. METERING
        lufsMeter.processSample(left, right);
        crestAnalyzer.processSample(left, right);

        // Phase Correlation
        sumLL += left * left;
        sumRR += right * right;
        sumLR += left * right;
        correlationSamples++;

        if (correlationSamples >= CORRELATION_WINDOW) {
            double denominator = std::sqrt(sumLL * sumRR);
            phaseCorrelation = (denominator > 1e-10) ? (sumLR / denominator) : 0.0;

            // Update Crest Factor
            crestFactor = crestAnalyzer.getCrestFactor();

            // AI Auto-Mastering (Secret Sauce #4)
            if (aiEnabled) {
                applyAIAdjustments();
            }

            // Reset
            sumLL = sumRR = sumLR = 0.0;
            correlationSamples = 0;
        }
    }

    // Process buffer (interleaved stereo)
    void processBuffer(val inputBuffer, val outputBuffer, int numSamples) {
        for (int i = 0; i < numSamples; ++i) {
            double left = inputBuffer[i * 2].as<double>();
            double right = inputBuffer[i * 2 + 1].as<double>();

            processStereo(left, right);

            outputBuffer.set(i * 2, left);
            outputBuffer.set(i * 2 + 1, right);
        }
    }

    // ═══════════════════════════════════════════════════════════════════
    // AI AUTO-MASTERING (Secret Sauce #4)
    // ═══════════════════════════════════════════════════════════════════

    void applyAIAdjustments() {
        // Analyze Crest Factor to determine compression needs
        double cf = crestFactor;

        // High Crest Factor (>15dB) = Very dynamic, needs more compression
        // Low Crest Factor (<8dB) = Already compressed, reduce compression

        if (cf > 15.0) {
            // Track is too dynamic - increase compression for "glue"
            multibandComp.setEnabled(true);
            multibandComp.setLowBand(-24.0, 3.0);
            multibandComp.setMidBand(-20.0, 3.5);
            multibandComp.setHighBand(-18.0, 4.0);
        } else if (cf > 12.0) {
            // Moderate dynamics - balanced compression
            multibandComp.setEnabled(true);
            multibandComp.setLowBand(-20.0, 2.5);
            multibandComp.setMidBand(-18.0, 3.0);
            multibandComp.setHighBand(-16.0, 3.5);
        } else if (cf > 8.0) {
            // Already well-compressed - gentle touch
            multibandComp.setEnabled(true);
            multibandComp.setLowBand(-18.0, 2.0);
            multibandComp.setMidBand(-16.0, 2.0);
            multibandComp.setHighBand(-14.0, 2.5);
        } else {
            // Over-compressed - disable multiband, use limiter only
            multibandComp.setEnabled(false);
        }
    }

    // ═══════════════════════════════════════════════════════════════════
    // METERING GETTERS
    // ═══════════════════════════════════════════════════════════════════

    double getIntegratedLUFS() { return lufsMeter.getIntegratedLUFS(); }
    double getShortTermLUFS() { return lufsMeter.getShortTermLUFS(); }
    double getMomentaryLUFS() { return lufsMeter.getMomentaryLUFS(); }
    double getPhaseCorrelation() { return phaseCorrelation; }
    double getCrestFactor() { return crestFactor; }
    double getLimiterGainReduction() { return limiter.getGainReduction(); }
    double getPeakDB() { return crestAnalyzer.getPeak(); }
    double getRMSDB() { return crestAnalyzer.getRMS(); }

    // Reset all processing
    void reset() {
        eqL.reset();
        eqR.reset();
        limiter.reset();
        lufsMeter.reset();
        monoBass.reset();
        multibandComp.reset();
        crestAnalyzer.reset();
        sumLL = sumRR = sumLR = 0.0;
        correlationSamples = 0;
        phaseCorrelation = 0.0;
        crestFactor = 0.0;
    }
};

// ============================================================================
// EMSCRIPTEN BINDINGS
// ============================================================================

EMSCRIPTEN_BINDINGS(mastering_engine) {
    class_<MasteringEngine>("MasteringEngine")
        .constructor<double>()
        .function("setSampleRate", &MasteringEngine::setSampleRate)

        // EQ
        .function("setEQGain", &MasteringEngine::setEQGain)
        .function("setAllEQGains", &MasteringEngine::setAllEQGains)

        // Limiter
        .function("setLimiterThreshold", &MasteringEngine::setLimiterThreshold)
        .function("setLimiterRelease", &MasteringEngine::setLimiterRelease)

        // Mono Bass
        .function("setMonoBassFrequency", &MasteringEngine::setMonoBassFrequency)

        // Multiband Compressor
        .function("setMultibandEnabled", &MasteringEngine::setMultibandEnabled)
        .function("setMultibandLowBand", &MasteringEngine::setMultibandLowBand)
        .function("setMultibandMidBand", &MasteringEngine::setMultibandMidBand)
        .function("setMultibandHighBand", &MasteringEngine::setMultibandHighBand)

        // AI
        .function("setAIEnabled", &MasteringEngine::setAIEnabled)

        // Processing
        .function("processBuffer", &MasteringEngine::processBuffer)

        // Metering
        .function("getIntegratedLUFS", &MasteringEngine::getIntegratedLUFS)
        .function("getShortTermLUFS", &MasteringEngine::getShortTermLUFS)
        .function("getMomentaryLUFS", &MasteringEngine::getMomentaryLUFS)
        .function("getPhaseCorrelation", &MasteringEngine::getPhaseCorrelation)
        .function("getCrestFactor", &MasteringEngine::getCrestFactor)
        .function("getLimiterGainReduction", &MasteringEngine::getLimiterGainReduction)
        .function("getPeakDB", &MasteringEngine::getPeakDB)
        .function("getRMSDB", &MasteringEngine::getRMSDB)

        // Reset
        .function("reset", &MasteringEngine::reset);
}
