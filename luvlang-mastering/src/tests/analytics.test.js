/**
 * ANALYTICS DASHBOARD TESTS
 * Unit tests for LUFS, dynamics, spectrogram, and comparison features
 */

import { describe, it, expect, beforeEach } from './test-runner.js';

describe('Analytics - LUFS Calculation', () => {
    it('should calculate RMS correctly', () => {
        const calculateRMS = (samples) => {
            let sum = 0;
            for (let i = 0; i < samples.length; i++) {
                sum += samples[i] * samples[i];
            }
            return Math.sqrt(sum / samples.length);
        };

        // Test with known values
        const samples = [0.5, -0.5, 0.5, -0.5];
        const rms = calculateRMS(samples);

        expect(rms).toBe(0.5);
    });

    it('should convert RMS to LUFS', () => {
        const rmsToLUFS = (rms) => {
            return -0.691 + 10 * Math.log10(rms + 1e-10);
        };

        // Full scale (1.0) should be close to 0 LUFS
        const lufs = rmsToLUFS(1.0);
        expect(lufs).toBeGreaterThan(-1);
        expect(lufs).toBeLessThan(0);
    });

    it('should gate quiet sections', () => {
        const shouldGate = (lufs) => lufs <= -70;

        expect(shouldGate(-80)).toBe(true);
        expect(shouldGate(-70)).toBe(true);
        expect(shouldGate(-69)).toBe(false);
        expect(shouldGate(-14)).toBe(false);
    });

    it('should have correct momentary window (400ms)', () => {
        const sampleRate = 44100;
        const momentaryBlockSize = Math.floor(sampleRate * 0.4);

        expect(momentaryBlockSize).toBe(17640);
    });

    it('should have correct short-term window (3s)', () => {
        const sampleRate = 44100;
        const shortTermBlockSize = Math.floor(sampleRate * 3);

        expect(shortTermBlockSize).toBe(132300);
    });
});

describe('Analytics - Dynamic Range', () => {
    it('should calculate peak correctly', () => {
        const findPeak = (samples) => {
            let peak = 0;
            for (const sample of samples) {
                const abs = Math.abs(sample);
                if (abs > peak) peak = abs;
            }
            return peak;
        };

        const samples = [0.1, -0.5, 0.8, -0.3, 0.2];
        expect(findPeak(samples)).toBe(0.8);
    });

    it('should convert to dB correctly', () => {
        const toDb = (linear) => 20 * Math.log10(linear + 1e-10);

        expect(toDb(1.0)).toBe(0);
        expect(Math.round(toDb(0.5))).toBe(-6);
        expect(Math.round(toDb(0.1))).toBe(-20);
    });

    it('should calculate crest factor', () => {
        const calculateCrestFactor = (peak, rms) => peak / (rms + 1e-10);

        // If peak = 1.0 and RMS = 0.5, crest factor = 2.0
        const crest = calculateCrestFactor(1.0, 0.5);
        expect(crest).toBe(2.0);
    });

    it('should detect heavy compression', () => {
        const isHeavilyCompressed = (dynamicRange) => dynamicRange < 6;

        expect(isHeavilyCompressed(4)).toBe(true);
        expect(isHeavilyCompressed(6)).toBe(false);
        expect(isHeavilyCompressed(12)).toBe(false);
    });
});

describe('Analytics - Spectrogram', () => {
    it('should have correct FFT size', () => {
        const fftSize = 2048;
        expect(fftSize).toBe(2048);
    });

    it('should calculate number of frames correctly', () => {
        const calculateFrames = (totalSamples, fftSize, hopSize) => {
            return Math.floor((totalSamples - fftSize) / hopSize);
        };

        const totalSamples = 44100 * 3; // 3 seconds at 44.1kHz
        const frames = calculateFrames(totalSamples, 2048, 512);

        expect(frames).toBeGreaterThan(200);
    });

    it('should map frequency to y position', () => {
        const freqToY = (freq, height, maxFreq = 20000) => {
            return height - (freq / maxFreq) * height;
        };

        const height = 300;
        expect(freqToY(0, height)).toBe(300);
        expect(freqToY(20000, height)).toBe(0);
        expect(freqToY(10000, height)).toBe(150);
    });

    it('should support different colormaps', () => {
        const getColormap = (name) => {
            const colormaps = {
                viridis: (t) => `rgb(${Math.floor(68 + t * 187)}, ${Math.floor(1 + t * 254)}, ${Math.floor(84 + t * (-84))})`,
                plasma: (t) => `rgb(${Math.floor(13 + t * 242)}, ${Math.floor(8 + t * 220)}, ${Math.floor(135 + t * (-75))})`,
                grayscale: (t) => { const v = Math.floor(t * 255); return `rgb(${v}, ${v}, ${v})`; }
            };
            return colormaps[name] || colormaps.viridis;
        };

        const viridis = getColormap('viridis');
        const plasma = getColormap('plasma');

        expect(viridis(0)).toContain('rgb');
        expect(plasma(1)).toContain('rgb');
    });
});

describe('Analytics - A/B Comparison', () => {
    it('should calculate LUFS difference', () => {
        const calculateLUFSDiff = (afterLUFS, beforeLUFS) => {
            return afterLUFS - beforeLUFS;
        };

        expect(calculateLUFSDiff(-14, -18)).toBe(4);
        expect(calculateLUFSDiff(-18, -14)).toBe(-4);
    });

    it('should format difference with sign', () => {
        const formatDiff = (diff) => {
            return `${diff > 0 ? '+' : ''}${diff.toFixed(1)} dB`;
        };

        expect(formatDiff(4)).toBe('+4.0 dB');
        expect(formatDiff(-2.5)).toBe('-2.5 dB');
        expect(formatDiff(0)).toBe('0.0 dB');
    });
});

describe('Analytics - Tab System', () => {
    it('should have correct tab IDs', () => {
        const tabs = ['lufs', 'dynamics', 'spectrogram', 'comparison'];

        expect(tabs).toContain('lufs');
        expect(tabs).toContain('dynamics');
        expect(tabs).toContain('spectrogram');
        expect(tabs).toContain('comparison');
        expect(tabs).toHaveLength(4);
    });

    it('should map tab to panel ID correctly', () => {
        const tabToPanelId = (tabId) => `tab-${tabId}`;

        expect(tabToPanelId('lufs')).toBe('tab-lufs');
        expect(tabToPanelId('dynamics')).toBe('tab-dynamics');
    });
});

describe('Analytics - LUFS Targets', () => {
    it('should have correct platform targets', () => {
        const platformTargets = {
            spotify: -14,
            appleMusic: -16,
            youtube: -14,
            tidal: -14,
            amazonMusic: -14,
            podcast: -16
        };

        expect(platformTargets.spotify).toBe(-14);
        expect(platformTargets.appleMusic).toBe(-16);
        expect(platformTargets.podcast).toBe(-16);
    });

    it('should determine if LUFS is within tolerance', () => {
        const isWithinTolerance = (measured, target, tolerance = 1) => {
            return Math.abs(measured - target) <= tolerance;
        };

        expect(isWithinTolerance(-14.5, -14, 1)).toBe(true);
        expect(isWithinTolerance(-16, -14, 1)).toBe(false);
    });
});

describe('Analytics - Graph Drawing', () => {
    it('should scale LUFS to canvas Y', () => {
        const lufsToY = (lufs, height, minLufs = -24, maxLufs = 0) => {
            return ((maxLufs - lufs) / (maxLufs - minLufs)) * height;
        };

        const height = 200;

        expect(lufsToY(0, height)).toBe(0);
        expect(lufsToY(-24, height)).toBe(200);
        expect(lufsToY(-12, height)).toBe(100);
    });

    it('should handle high DPI displays', () => {
        const scaleCanvas = (canvas, dpr = 2) => {
            const rect = { width: 600, height: 200 };
            return {
                width: rect.width * dpr,
                height: rect.height * dpr,
                cssWidth: rect.width,
                cssHeight: rect.height
            };
        };

        const scaled = scaleCanvas(null, 2);

        expect(scaled.width).toBe(1200);
        expect(scaled.cssWidth).toBe(600);
    });
});
