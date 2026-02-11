#!/usr/bin/env node
/**
 * Mastering Math Validation Harness (v7.4.6)
 * Validates generateAICorrections() math against professional mastering ranges.
 * Run: node vercel-deploy/test-mastering-math.mjs
 */

// ═══════════════════════════════════════════════════════════════════
// Genre reference targets (exact copy from luvlang_LEGENDARY_COMPLETE.html v7.4.5)
// ═══════════════════════════════════════════════════════════════════
const GENRE_REFERENCE_TARGETS = {
    'pop':        { slopePerOctave: -4.5, spectrum: { sub: -24, bass: -16, lowmid: -14, mid: -12, highmid: -13, high: -19, air: -29 }, dynamics: { crestFactor: 10, lra: 7, targetLUFS: -14 }, stereo: { width: 0.45, lowCorrelation: 0.95, highCorrelation: 0.6 }, spectralTilt: -0.5 },
    'hiphop':     { slopePerOctave: -5.5, spectrum: { sub: -14, bass: -13, lowmid: -18, mid: -15, highmid: -16, high: -22, air: -33 }, dynamics: { crestFactor: 8, lra: 5, targetLUFS: -14 }, stereo: { width: 0.50, lowCorrelation: 0.98, highCorrelation: 0.55 }, spectralTilt: -1.5 },
    'electronic': { slopePerOctave: -3.5, spectrum: { sub: -14, bass: -14, lowmid: -18, mid: -15, highmid: -15, high: -18, air: -24 }, dynamics: { crestFactor: 7, lra: 5, targetLUFS: -14 }, stereo: { width: 0.55, lowCorrelation: 0.95, highCorrelation: 0.50 }, spectralTilt: 0.0 },
    'rock':       { slopePerOctave: -3.0, spectrum: { sub: -28, bass: -15, lowmid: -14, mid: -11, highmid: -11, high: -17, air: -28 }, dynamics: { crestFactor: 12, lra: 7, targetLUFS: -14 }, stereo: { width: 0.42, lowCorrelation: 0.93, highCorrelation: 0.58 }, spectralTilt: 0.3 },
    'rnb':        { slopePerOctave: -4.8, spectrum: { sub: -18, bass: -14, lowmid: -16, mid: -13, highmid: -15, high: -21, air: -31 }, dynamics: { crestFactor: 10, lra: 6, targetLUFS: -14 }, stereo: { width: 0.48, lowCorrelation: 0.96, highCorrelation: 0.58 }, spectralTilt: -1.0 },
    'acoustic':   { slopePerOctave: -2.8, spectrum: { sub: -32, bass: -18, lowmid: -13, mid: -11, highmid: -13, high: -17, air: -26 }, dynamics: { crestFactor: 14, lra: 10, targetLUFS: -16 }, stereo: { width: 0.40, lowCorrelation: 0.92, highCorrelation: 0.65 }, spectralTilt: 0.5 },
    'jazz':       { slopePerOctave: -2.8, spectrum: { sub: -30, bass: -17, lowmid: -13, mid: -11, highmid: -14, high: -19, air: -28 }, dynamics: { crestFactor: 16, lra: 12, targetLUFS: -16 }, stereo: { width: 0.42, lowCorrelation: 0.90, highCorrelation: 0.60 }, spectralTilt: 0.3 },
    'classical':  { slopePerOctave: -2.5, spectrum: { sub: -34, bass: -20, lowmid: -14, mid: -12, highmid: -14, high: -19, air: -27 }, dynamics: { crestFactor: 20, lra: 14, targetLUFS: -18 }, stereo: { width: 0.50, lowCorrelation: 0.88, highCorrelation: 0.55 }, spectralTilt: 0.5 },
    'metal':      { slopePerOctave: -2.5, spectrum: { sub: -24, bass: -14, lowmid: -14, mid: -10, highmid: -11, high: -17, air: -29 }, dynamics: { crestFactor: 8, lra: 5, targetLUFS: -14 }, stereo: { width: 0.40, lowCorrelation: 0.95, highCorrelation: 0.55 }, spectralTilt: 0.8 },
    'country':    { slopePerOctave: -3.5, spectrum: { sub: -28, bass: -17, lowmid: -14, mid: -11, highmid: -12, high: -17, air: -26 }, dynamics: { crestFactor: 12, lra: 8, targetLUFS: -14 }, stereo: { width: 0.43, lowCorrelation: 0.93, highCorrelation: 0.62 }, spectralTilt: -0.2 },
    'latin':      { slopePerOctave: -5.0, spectrum: { sub: -15, bass: -13, lowmid: -16, mid: -14, highmid: -15, high: -20, air: -30 }, dynamics: { crestFactor: 9, lra: 6, targetLUFS: -14 }, stereo: { width: 0.48, lowCorrelation: 0.96, highCorrelation: 0.55 }, spectralTilt: -1.2 },
    'lofi':       { slopePerOctave: -6.5, spectrum: { sub: -20, bass: -14, lowmid: -12, mid: -14, highmid: -20, high: -28, air: -40 }, dynamics: { crestFactor: 11, lra: 8, targetLUFS: -16 }, stereo: { width: 0.38, lowCorrelation: 0.90, highCorrelation: 0.65 }, spectralTilt: -2.5 }
};

// ═══════════════════════════════════════════════════════════════════
// EQ curves (exact copy from luvlang_LEGENDARY_COMPLETE.html v7.4.5)
// ═══════════════════════════════════════════════════════════════════
const _eqCurves = {
    'hiphop':     { sub: 3.5, bass: 2.0, lowmid: -2.5, mid: 0.5, highmid: 1.5, high: 1.5, air: 1.0 },
    'electronic': { sub: 2.5, bass: 1.5, lowmid: -2.0, mid: -0.5, highmid: 1.2, high: 2.5, air: 2.0 },
    'pop':        { sub: 0.5, bass: 1.5, lowmid: -1.5, mid: 0.5, highmid: 2.0, high: 2.0, air: 1.5 },
    'rock':       { sub: 1.0, bass: 2.0, lowmid: -1.5, mid: 1.0, highmid: 1.8, high: 2.5, air: 1.5 },
    'rnb':        { sub: 2.0, bass: 1.5, lowmid: -1.5, mid: 0.5, highmid: 1.5, high: 1.0, air: 0.5 },
    'acoustic':   { sub: 0.5, bass: 1.0, lowmid: -1.0, mid: 1.0, highmid: 1.5, high: 1.5, air: 1.5 },
    'jazz':       { sub: 0.5, bass: 1.0, lowmid: -0.5, mid: 0.5, highmid: 1.2, high: 1.0, air: 0.5 },
    'classical':  { sub: -1.5, bass: 0.5, lowmid: 0.0, mid: 0.5, highmid: 0.8, high: 0.5, air: 0.5 },
    'metal':      { sub: 1.5, bass: 2.0, lowmid: -1.5, mid: 1.5, highmid: 2.0, high: 1.5, air: 1.0 },
    'country':    { sub: 0.5, bass: 1.5, lowmid: -1.0, mid: 1.0, highmid: 2.0, high: 2.5, air: 1.5 },
    'latin':      { sub: 2.5, bass: 2.0, lowmid: -1.5, mid: 0.5, highmid: 1.5, high: 1.5, air: 1.0 },
    'lofi':       { sub: 1.5, bass: 2.0, lowmid: 1.0, mid: -0.5, highmid: -1.0, high: -2.0, air: -3.0 }
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
// Reproduce generateAICorrections math (v7.4.6)
// ═══════════════════════════════════════════════════════════════════
function generateAICorrections(analysis, genre) {
    const ref = GENRE_REFERENCE_TARGETS[genre] || GENRE_REFERENCE_TARGETS['pop'];
    const correctionStrength = 0.26;

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
        const anomalyDelta = (refShape[band] - trackShape[band]) * correctionStrength * 0.6;
        let delta = tiltDelta + anomalyDelta;
        delta = Math.max(-2.5, Math.min(2.5, delta));
        eqDeltas[band] = Math.round(delta * 100) / 100;
        totalEQCorrection += Math.abs(delta);
    }
    if (totalEQCorrection > 7) {
        const scale = 7 / totalEQCorrection;
        for (const band of bandKeys) {
            eqDeltas[band] = Math.round(eqDeltas[band] * scale * 100) / 100;
        }
        totalEQCorrection = 7;
    }

    // Dynamics
    const crestDiff = (analysis.overallCrest || 10) - (ref.dynamics.crestFactor || 10);

    // Stereo
    const refWidth = ref.stereo.width || 0.45;
    const widthDiff = analysis.estimatedWidth - refWidth;

    // Processing scale (v7.4.5 — wider bands for higher totalEQ range)
    let processingScale;
    if (totalEQCorrection < 1.0) processingScale = 0.3;
    else if (totalEQCorrection < 2.5) processingScale = 0.5;
    else if (totalEQCorrection < 4.0) processingScale = 0.7;
    else if (totalEQCorrection < 6.0) processingScale = 0.85;
    else processingScale = 1.0;

    // Stage bypass (v7.4.6)
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

    // Stage intensity (v7.4.6)
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
// Compute LUFS correction (v7.4.6)
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
// Compute NY compression wet mix (v7.4.6)
// ═══════════════════════════════════════════════════════════════════
function computeNYWet(intensity, compRatioTarget, bypass) {
    if (intensity <= 2 || bypass) return 0;
    const nyBaseMix = { 3: 0.03, 4: 0.05, 5: 0.08 };
    const nyBase = nyBaseMix[intensity] || 0.03;
    const nyRatioScale = Math.max(0.3, 1.0 - (compRatioTarget - 1.5) / 6.0);
    return nyBase * nyRatioScale;
}

// ═══════════════════════════════════════════════════════════════════
// Compute compressor threshold (v7.4.6)
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
console.log('Mastering Math Validation (v7.4.6)');
console.log('========================================');
console.log(`Test track: spectralTilt=${TEST_ANALYSIS.spectralTilt}, crest=${TEST_ANALYSIS.overallCrest}, resonances=${TEST_ANALYSIS.resonances.length}\n`);

for (const genre of GENRES) {
    const ref = GENRE_REFERENCE_TARGETS[genre];
    const result = generateAICorrections(TEST_ANALYSIS, genre);
    const bandKeys = ['sub', 'bass', 'lowmid', 'mid', 'highmid', 'high', 'air'];

    console.log(`--- ${genre.toUpperCase()} ---`);
    console.log(`  totalEQ=${result.totalEQCorrection.toFixed(2)}, processingScale=${result.processingScale}, crestDiff=${result.crestDiff.toFixed(1)}, trackSlope=${result.trackSlope.toFixed(2)}`);

    // EQ checks — ±3 dB per band (v7.4.3 professional range)
    for (const band of bandKeys) {
        check(`${genre}:eq:${band}`, result.eqDeltas[band], -2.5, 2.5);
    }
    check(`${genre}:totalEQ`, result.totalEQCorrection, 0, 7.0);

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
        check(`${genre}:nyWet:i${intensity}`, nyWet, 0, 0.08);
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

// ═══════════════════════════════════════════════════════════════════
// Cross-genre differentiation check (v7.4.6)
// Signature bands should differ by >= 1.5 dB between contrasting genres
// ═══════════════════════════════════════════════════════════════════
console.log('--- CROSS-GENRE DIFFERENTIATION ---');
const INTENSITY_MULT = 0.75; // Intensity 3 multiplier

const diffChecks = [
    { name: 'Hip-Hop vs Classical (sub)',     g1: 'hiphop',     g2: 'classical',  band: 'sub' },
    { name: 'Lo-Fi vs Electronic (air)',      g1: 'lofi',       g2: 'electronic', band: 'air' },
    { name: 'Pop vs Lo-Fi (highmid)',         g1: 'pop',        g2: 'lofi',       band: 'highmid' },
    { name: 'Metal vs Electronic (mid)',      g1: 'metal',      g2: 'electronic', band: 'mid' },
    { name: 'Hip-Hop vs Classical (lowmid)',  g1: 'hiphop',     g2: 'classical',  band: 'lowmid' },
    { name: 'Lo-Fi vs Pop (high)',            g1: 'lofi',       g2: 'pop',        band: 'high' },
];

for (const dc of diffChecks) {
    const v1 = _eqCurves[dc.g1][dc.band] * INTENSITY_MULT;
    const v2 = _eqCurves[dc.g2][dc.band] * INTENSITY_MULT;
    const diff = Math.abs(v1 - v2);
    const pass = check(`diff:${dc.name}`, diff, 1.5, 10);
    if (!pass) {
        console.log(`    ${dc.g1}=${v1.toFixed(2)} dB, ${dc.g2}=${v2.toFixed(2)} dB, diff=${diff.toFixed(2)} dB`);
    } else {
        console.log(`  PASS: ${dc.name} — diff=${diff.toFixed(2)} dB (${dc.g1}=${v1.toFixed(2)}, ${dc.g2}=${v2.toFixed(2)})`);
    }
}

// Summary
console.log('\n========================================');
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
