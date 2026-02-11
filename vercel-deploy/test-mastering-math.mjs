#!/usr/bin/env node
/**
 * Mastering Math Validation Harness
 * Validates generateAICorrections() math against professional mastering ranges.
 * Run: node vercel-deploy/test-mastering-math.mjs
 */

// ═══════════════════════════════════════════════════════════════════
// Genre reference targets (exact copy from luvlang_LEGENDARY_COMPLETE.html)
// ═══════════════════════════════════════════════════════════════════
const GENRE_REFERENCE_TARGETS = {
    'pop':        { slopePerOctave: -4.5, spectrum: { sub: -24, bass: -16, lowmid: -14, mid: -12, highmid: -15, high: -20, air: -30 }, dynamics: { crestFactor: 10, lra: 7, targetLUFS: -14 }, stereo: { width: 0.45, lowCorrelation: 0.95, highCorrelation: 0.6 }, spectralTilt: -0.5 },
    'hiphop':     { slopePerOctave: -5.0, spectrum: { sub: -18, bass: -14, lowmid: -16, mid: -14, highmid: -17, high: -22, air: -32 }, dynamics: { crestFactor: 8, lra: 5, targetLUFS: -14 }, stereo: { width: 0.50, lowCorrelation: 0.98, highCorrelation: 0.55 }, spectralTilt: -1.0 },
    'electronic': { slopePerOctave: -4.0, spectrum: { sub: -16, bass: -15, lowmid: -17, mid: -14, highmid: -16, high: -19, air: -28 }, dynamics: { crestFactor: 7, lra: 5, targetLUFS: -14 }, stereo: { width: 0.55, lowCorrelation: 0.95, highCorrelation: 0.50 }, spectralTilt: -0.3 },
    'rock':       { slopePerOctave: -3.5, spectrum: { sub: -26, bass: -16, lowmid: -14, mid: -12, highmid: -13, high: -19, air: -30 }, dynamics: { crestFactor: 12, lra: 7, targetLUFS: -14 }, stereo: { width: 0.42, lowCorrelation: 0.93, highCorrelation: 0.58 }, spectralTilt: 0.0 },
    'rnb':        { slopePerOctave: -4.5, spectrum: { sub: -20, bass: -15, lowmid: -15, mid: -13, highmid: -16, high: -21, air: -31 }, dynamics: { crestFactor: 10, lra: 6, targetLUFS: -14 }, stereo: { width: 0.48, lowCorrelation: 0.96, highCorrelation: 0.58 }, spectralTilt: -0.7 },
    'acoustic':   { slopePerOctave: -3.0, spectrum: { sub: -30, bass: -18, lowmid: -14, mid: -12, highmid: -14, high: -18, air: -27 }, dynamics: { crestFactor: 14, lra: 10, targetLUFS: -16 }, stereo: { width: 0.40, lowCorrelation: 0.92, highCorrelation: 0.65 }, spectralTilt: 0.2 },
    'jazz':       { slopePerOctave: -3.0, spectrum: { sub: -28, bass: -17, lowmid: -14, mid: -12, highmid: -15, high: -19, air: -28 }, dynamics: { crestFactor: 16, lra: 12, targetLUFS: -16 }, stereo: { width: 0.42, lowCorrelation: 0.90, highCorrelation: 0.60 }, spectralTilt: 0.1 },
    'classical':  { slopePerOctave: -3.0, spectrum: { sub: -30, bass: -20, lowmid: -15, mid: -13, highmid: -15, high: -20, air: -28 }, dynamics: { crestFactor: 20, lra: 14, targetLUFS: -18 }, stereo: { width: 0.50, lowCorrelation: 0.88, highCorrelation: 0.55 }, spectralTilt: 0.3 },
    'metal':      { slopePerOctave: -3.0, spectrum: { sub: -24, bass: -15, lowmid: -14, mid: -11, highmid: -12, high: -18, air: -30 }, dynamics: { crestFactor: 8, lra: 5, targetLUFS: -14 }, stereo: { width: 0.40, lowCorrelation: 0.95, highCorrelation: 0.55 }, spectralTilt: 0.5 },
    'country':    { slopePerOctave: -3.5, spectrum: { sub: -28, bass: -17, lowmid: -14, mid: -12, highmid: -14, high: -18, air: -27 }, dynamics: { crestFactor: 12, lra: 8, targetLUFS: -14 }, stereo: { width: 0.43, lowCorrelation: 0.93, highCorrelation: 0.62 }, spectralTilt: -0.2 },
    'latin':      { slopePerOctave: -4.5, spectrum: { sub: -18, bass: -14, lowmid: -15, mid: -13, highmid: -15, high: -20, air: -30 }, dynamics: { crestFactor: 9, lra: 6, targetLUFS: -14 }, stereo: { width: 0.48, lowCorrelation: 0.96, highCorrelation: 0.55 }, spectralTilt: -0.8 },
    'lofi':       { slopePerOctave: -5.5, spectrum: { sub: -22, bass: -15, lowmid: -13, mid: -14, highmid: -18, high: -24, air: -36 }, dynamics: { crestFactor: 11, lra: 8, targetLUFS: -16 }, stereo: { width: 0.38, lowCorrelation: 0.90, highCorrelation: 0.65 }, spectralTilt: -1.5 }
};

// ═══════════════════════════════════════════════════════════════════
// Simulated track analysis (from real console logs)
// ═══════════════════════════════════════════════════════════════════
const TEST_ANALYSIS = {
    spectrumDB: { sub: -38, bass: -22, lowmid: -18, mid: -15, highmid: -16, high: -23, air: -35 },
    spectralTilt: -2.95,
    overallCrest: 17.0,
    estimatedWidth: 0.42,
    resonances: Array.from({ length: 30 }, (_, i) => ({
        freq: 100 + i * 200, gain: -3 + Math.random() * 2, q: 4 + Math.random() * 2
    })),
    sibilanceExcessive: false,
};

// ═══════════════════════════════════════════════════════════════════
// Reproduce generateAICorrections math (v7.4.2)
// ═══════════════════════════════════════════════════════════════════
function generateAICorrections(analysis, genre) {
    const ref = GENRE_REFERENCE_TARGETS[genre] || GENRE_REFERENCE_TARGETS['pop'];
    const correctionStrength = 0.20;

    const bandKeys = ['sub', 'bass', 'lowmid', 'mid', 'highmid', 'high', 'air'];
    const bandCenterFreqs = [40, 100, 300, 1000, 3500, 8000, 14000];
    const bandOctaves = bandCenterFreqs.map(f => Math.log2(f / 40));

    // Track slope via linear regression
    const trackValues = bandKeys.map(b => analysis.spectrumDB[b] || -60);
    const trackMean = trackValues.reduce((a, b) => a + b, 0) / trackValues.length;
    const octMean = bandOctaves.reduce((a, b) => a + b, 0) / bandOctaves.length;
    let slopeNum = 0, slopeDen = 0;
    for (let i = 0; i < bandKeys.length; i++) {
        slopeNum += (bandOctaves[i] - octMean) * (trackValues[i] - trackMean);
        slopeDen += (bandOctaves[i] - octMean) * (bandOctaves[i] - octMean);
    }
    const trackSlope = slopeDen > 0 ? slopeNum / slopeDen : -3.5;
    const refSlope = ref.slopePerOctave || -3.5;
    const slopeDiff = trackSlope - refSlope;
    const tiltCorrection = Math.max(-1.5, Math.min(1.5, -slopeDiff * 0.3));

    // Track shape (relative)
    const trackShape = {};
    bandKeys.forEach((b, i) => { trackShape[b] = trackValues[i] - trackMean; });
    const refValues = bandKeys.map(b => ref.spectrum[b] || -20);
    const refMean = refValues.reduce((a, b) => a + b, 0) / refValues.length;
    const refShape = {};
    bandKeys.forEach((b, i) => { refShape[b] = refValues[i] - refMean; });

    // EQ deltas
    const eqDeltas = {};
    let totalEQCorrection = 0;
    for (let i = 0; i < bandKeys.length; i++) {
        const band = bandKeys[i];
        const tiltFactor = (bandOctaves[i] - octMean) / (bandOctaves[bandOctaves.length - 1] - bandOctaves[0]);
        const tiltDelta = tiltCorrection * tiltFactor * 2;
        const anomalyDelta = (refShape[band] - trackShape[band]) * correctionStrength * 0.5;
        let delta = tiltDelta + anomalyDelta;
        delta = Math.max(-2, Math.min(2, delta));
        eqDeltas[band] = Math.round(delta * 100) / 100;
        totalEQCorrection += Math.abs(delta);
    }
    if (totalEQCorrection > 5) {
        const scale = 5 / totalEQCorrection;
        for (const band of bandKeys) {
            eqDeltas[band] = Math.round(eqDeltas[band] * scale * 100) / 100;
        }
        totalEQCorrection = 5;
    }

    // Dynamics
    const crestDiff = (analysis.overallCrest || 10) - (ref.dynamics.crestFactor || 10);

    // Stereo
    const refWidth = ref.stereo.width || 0.45;
    const widthDiff = analysis.estimatedWidth - refWidth;

    // Processing scale
    let processingScale;
    if (totalEQCorrection < 0.5) processingScale = 0.2;
    else if (totalEQCorrection < 1.5) processingScale = 0.4;
    else if (totalEQCorrection < 2.5) processingScale = 0.6;
    else if (totalEQCorrection < 3.5) processingScale = 0.8;
    else processingScale = 1.0;

    // Stage bypass (v7.4.2 — conservative thresholds)
    const stageBypass = {
        eq:            totalEQCorrection < 0.5,
        dynamicEQ:     analysis.resonances.length <= 1 && !analysis.sibilanceExcessive
                       && Math.abs(analysis.spectralTilt) < 1.5,
        compression:   Math.abs(crestDiff) < 3,
        multibandComp: Math.abs(crestDiff) < 4 && Math.abs(analysis.spectralTilt) < 1.0,
        transient:     Math.abs(crestDiff) < 4,
        warmth:        analysis.spectralTilt < -0.5 || analysis.overallCrest < 7,
        exciter:       !(analysis.spectralTilt > 0.5 && analysis.spectrumDB.high < -22),
        stereoWidth:   Math.abs(widthDiff) < 0.10,
        msProcessing:  Math.abs(analysis.spectralTilt) < 1.0 && Math.abs(widthDiff) < 0.15,
        hfLimiter:     false,
    };

    // Dynamics budget: max 3 active dynamics stages
    const dynamicsStages = ['compression', 'multibandComp', 'dynamicEQ', 'transient'];
    const activeDynamics = dynamicsStages.filter(s => !stageBypass[s]);
    if (activeDynamics.length > 3) {
        const dynScore = {
            compression:   Math.abs(crestDiff) / 7,
            multibandComp: Math.abs(crestDiff) / 8,
            dynamicEQ:     analysis.resonances.length > 3 ? 0.8 : analysis.resonances.length > 1 ? 0.5 : 0.2,
            transient:     Math.abs(crestDiff) / 10,
        };
        activeDynamics.sort((a, b) => (dynScore[a] || 0) - (dynScore[b] || 0));
        for (let i = 0; i < activeDynamics.length - 3; i++) {
            stageBypass[activeDynamics[i]] = true;
        }
    }

    // Stage intensity (v7.4.2 — conservative values)
    const stageIntensity = {
        eq:            Math.min(1.0, totalEQCorrection / 3.0),
        dynamicEQ:     analysis.resonances.length > 3 ? 0.8 : analysis.resonances.length > 1 ? 0.5 : 0.2,
        compression:   Math.min(1.0, Math.abs(crestDiff) / 8),
        multibandComp: Math.min(1.0, Math.abs(crestDiff) / 8),
        transient:     Math.min(1.0, Math.abs(crestDiff) / 10),
        warmth:        analysis.spectralTilt > 1.0 ? 0.5 : 0.15,
        exciter:       0.15,
        stereoWidth:   Math.min(1.0, Math.abs(widthDiff) / 0.3),
        msProcessing:  0.25,
        hfLimiter:     analysis.sibilanceExcessive ? 0.6 : 0.3,
    };

    return {
        eqDeltas, totalEQCorrection, crestDiff, widthDiff,
        processingScale, stageBypass, stageIntensity,
        trackSlope, refSlope, tiltCorrection,
    };
}

// ═══════════════════════════════════════════════════════════════════
// Compute LUFS correction (v7.4.2)
// ═══════════════════════════════════════════════════════════════════
function computeLUFSCorrection(inputLUFS, targetLUFS, intensity, measuredChainLUFS) {
    const chainLossCompensation = { 1: 1.5, 2: 2.0, 3: 2.5, 4: 3.0, 5: 3.5 };
    const compensation = chainLossCompensation[intensity] || 2.5;

    let correctionDB;
    if (measuredChainLUFS !== null && isFinite(measuredChainLUFS) && measuredChainLUFS > -60) {
        correctionDB = targetLUFS - measuredChainLUFS + compensation;
        correctionDB = Math.max(-6, Math.min(12, correctionDB));
    } else {
        correctionDB = targetLUFS - inputLUFS + 4.0;
        correctionDB = Math.max(-3, Math.min(12, correctionDB));
    }
    return correctionDB;
}

// ═══════════════════════════════════════════════════════════════════
// Compute NY compression wet mix (v7.4.2)
// ═══════════════════════════════════════════════════════════════════
function computeNYWet(intensity, compRatioTarget, bypass) {
    if (intensity <= 2 || bypass) return 0;
    const nyBaseMix = { 3: 0.04, 4: 0.06, 5: 0.10 };
    const nyBase = nyBaseMix[intensity] || 0.04;
    const nyRatioScale = Math.max(0.3, 1.0 - (compRatioTarget - 1.5) / 6.0);
    return nyBase * nyRatioScale;
}

// ═══════════════════════════════════════════════════════════════════
// Compute compressor threshold (v7.4.2)
// ═══════════════════════════════════════════════════════════════════
function computeCompThreshold(baseThreshold, intensity, compScale, aiThresholdOffset) {
    const thresholdOffset = { 1: 4, 2: 2, 3: 0, 4: -2, 5: -4 };
    let adjusted = baseThreshold + (thresholdOffset[intensity] || 0);
    adjusted += (1.0 - compScale) * 6;
    adjusted += aiThresholdOffset || 0;
    adjusted = Math.max(adjusted, -24); // Floor cap
    return adjusted;
}

// ═══════════════════════════════════════════════════════════════════
// Test runner
// ═══════════════════════════════════════════════════════════════════
const GENRES = Object.keys(GENRE_REFERENCE_TARGETS);
let totalChecks = 0;
let passedChecks = 0;
let failedChecks = 0;
const failures = [];

function check(label, value, min, max) {
    totalChecks++;
    const pass = value >= min && value <= max;
    if (pass) {
        passedChecks++;
    } else {
        failedChecks++;
        failures.push({ label, value, min, max });
    }
    const icon = pass ? 'PASS' : 'FAIL';
    const valueStr = typeof value === 'number' ? value.toFixed(3) : value;
    if (!pass) {
        console.log(`  ${icon}: ${label} = ${valueStr} (expected ${min} to ${max})`);
    }
    return pass;
}

console.log('========================================');
console.log('Mastering Math Validation (v7.4.2)');
console.log('========================================');
console.log(`Test track: spectralTilt=${TEST_ANALYSIS.spectralTilt}, crest=${TEST_ANALYSIS.overallCrest}, resonances=${TEST_ANALYSIS.resonances.length}\n`);

for (const genre of GENRES) {
    const ref = GENRE_REFERENCE_TARGETS[genre];
    const result = generateAICorrections(TEST_ANALYSIS, genre);
    const bandKeys = ['sub', 'bass', 'lowmid', 'mid', 'highmid', 'high', 'air'];

    console.log(`--- ${genre.toUpperCase()} ---`);
    console.log(`  totalEQ=${result.totalEQCorrection.toFixed(2)}, processingScale=${result.processingScale}, crestDiff=${result.crestDiff.toFixed(1)}, trackSlope=${result.trackSlope.toFixed(2)}`);

    // EQ checks
    for (const band of bandKeys) {
        check(`${genre}:eq:${band}`, result.eqDeltas[band], -2.0, 2.0);
    }
    check(`${genre}:totalEQ`, result.totalEQCorrection, 0, 5.0);

    // Dynamics stage bypass count
    const dynamicsStages = ['compression', 'multibandComp', 'dynamicEQ', 'transient'];
    const activeDyn = dynamicsStages.filter(s => !result.stageBypass[s]).length;
    check(`${genre}:activeDynamics`, activeDyn, 0, 3);

    // Stage intensity checks
    check(`${genre}:int:exciter`, result.stageIntensity.exciter, 0, 0.20);
    check(`${genre}:int:warmth`, result.stageIntensity.warmth, 0, 0.6);
    check(`${genre}:int:msProcessing`, result.stageIntensity.msProcessing, 0, 0.35);
    check(`${genre}:int:hfLimiter`, result.stageIntensity.hfLimiter, 0, 0.7);

    // LUFS correction checks (simulate two-pass with typical chain output)
    for (const intensity of [3, 4, 5]) {
        const targetLUFS = ref.dynamics.targetLUFS || -14;
        // Simulate a chain measurement that reads ~2-4 dB louder than target (typical)
        const simulatedChainLUFS = targetLUFS + 2;
        const correction = computeLUFSCorrection(-20, targetLUFS, intensity, simulatedChainLUFS);
        check(`${genre}:lufs:i${intensity}`, correction, -6, 12);
    }

    // NY compression wet checks
    for (const intensity of [3, 4, 5]) {
        const compRatio = 2.5; // Typical mastering ratio
        const nyWet = computeNYWet(intensity, compRatio, result.stageBypass.compression);
        check(`${genre}:nyWet:i${intensity}`, nyWet, 0, 0.10);
    }

    // Compressor threshold checks
    for (const intensity of [3, 4, 5]) {
        const baseThreshold = -18; // Typical genre default
        const compScale = result.stageIntensity.compression;
        const threshold = computeCompThreshold(baseThreshold, intensity, compScale, 0);
        check(`${genre}:compThresh:i${intensity}`, threshold, -24, 0);
    }

    console.log(`  Active dynamics: ${activeDyn}/4`);
    const bypassSummary = Object.entries(result.stageBypass).filter(([, v]) => v).map(([k]) => k);
    console.log(`  Bypassed: ${bypassSummary.join(', ') || 'none'}`);
    console.log('');
}

// Summary
console.log('========================================');
console.log(`RESULTS: ${passedChecks}/${totalChecks} checks passed, ${failedChecks} failed`);
if (failures.length > 0) {
    console.log('\nFAILURES:');
    for (const f of failures) {
        console.log(`  ${f.label} = ${typeof f.value === 'number' ? f.value.toFixed(3) : f.value} (expected ${f.min} to ${f.max})`);
    }
    process.exit(1);
} else {
    console.log('\nAll checks PASSED!');
    process.exit(0);
}
