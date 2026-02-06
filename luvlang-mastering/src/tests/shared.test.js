/**
 * Tests for shared constants and utilities
 */
import { describe, it, expect } from 'vitest';
import {
    EQ_BANDS,
    EQ_LIMITS,
    COMPRESSOR_DEFAULTS,
    COMPRESSOR_LIMITS,
    LIMITER_DEFAULTS,
    LIMITER_LIMITS,
    AUDIO_CONFIG,
    PLATFORM_TARGETS,
    GENRE_LUFS,
    PRESETS
} from '../js/shared/constants.js';
import { escapeHtml } from '../js/shared/utils.js';

// ============================================
// CONSTANTS INTEGRITY
// ============================================

describe('EQ_BANDS', () => {
    it('should have 7 bands', () => {
        expect(EQ_BANDS).toHaveLength(7);
    });

    it('should have required properties on each band', () => {
        for (const band of EQ_BANDS) {
            expect(band).toHaveProperty('frequency');
            expect(band).toHaveProperty('label');
            expect(band).toHaveProperty('type');
            expect(band).toHaveProperty('q');
            expect(band.frequency).toBeGreaterThan(0);
            expect(band.q).toBeGreaterThan(0);
        }
    });

    it('should be sorted by frequency ascending', () => {
        for (let i = 1; i < EQ_BANDS.length; i++) {
            expect(EQ_BANDS[i].frequency).toBeGreaterThan(EQ_BANDS[i - 1].frequency);
        }
    });
});

describe('EQ_LIMITS', () => {
    it('should have valid gain range', () => {
        expect(EQ_LIMITS.gainRange.min).toBeLessThan(0);
        expect(EQ_LIMITS.gainRange.max).toBeGreaterThan(0);
    });

    it('should have valid Q range', () => {
        expect(EQ_LIMITS.qRange.min).toBeGreaterThan(0);
        expect(EQ_LIMITS.qRange.max).toBeGreaterThan(EQ_LIMITS.qRange.min);
    });
});

describe('COMPRESSOR_DEFAULTS / LIMITS', () => {
    it('defaults should be within limits', () => {
        expect(COMPRESSOR_DEFAULTS.threshold).toBeGreaterThanOrEqual(COMPRESSOR_LIMITS.threshold.min);
        expect(COMPRESSOR_DEFAULTS.threshold).toBeLessThanOrEqual(COMPRESSOR_LIMITS.threshold.max);
        expect(COMPRESSOR_DEFAULTS.ratio).toBeGreaterThanOrEqual(COMPRESSOR_LIMITS.ratio.min);
        expect(COMPRESSOR_DEFAULTS.ratio).toBeLessThanOrEqual(COMPRESSOR_LIMITS.ratio.max);
        expect(COMPRESSOR_DEFAULTS.attack).toBeGreaterThanOrEqual(COMPRESSOR_LIMITS.attack.min);
        expect(COMPRESSOR_DEFAULTS.attack).toBeLessThanOrEqual(COMPRESSOR_LIMITS.attack.max);
    });
});

describe('LIMITER_DEFAULTS / LIMITS', () => {
    it('defaults should be within limits', () => {
        expect(LIMITER_DEFAULTS.ceiling).toBeGreaterThanOrEqual(LIMITER_LIMITS.ceiling.min);
        expect(LIMITER_DEFAULTS.ceiling).toBeLessThanOrEqual(LIMITER_LIMITS.ceiling.max);
        expect(LIMITER_DEFAULTS.release).toBeGreaterThanOrEqual(LIMITER_LIMITS.release.min);
        expect(LIMITER_DEFAULTS.release).toBeLessThanOrEqual(LIMITER_LIMITS.release.max);
    });
});

describe('AUDIO_CONFIG', () => {
    it('should have standard audio properties', () => {
        expect(AUDIO_CONFIG.defaultSampleRate).toBeGreaterThan(0);
        expect(AUDIO_CONFIG.defaultBitDepth).toBeGreaterThan(0);
        expect(AUDIO_CONFIG.bufferSize).toBeGreaterThan(0);
        expect(AUDIO_CONFIG.fftSize).toBeGreaterThan(0);
    });

    it('fftSize should be a power of 2', () => {
        expect(Math.log2(AUDIO_CONFIG.fftSize) % 1).toBe(0);
    });
});

describe('PLATFORM_TARGETS', () => {
    it('should include major streaming platforms', () => {
        const platforms = Object.keys(PLATFORM_TARGETS);
        expect(platforms).toContain('spotify');
        expect(platforms).toContain('apple_music');
        expect(platforms).toContain('youtube');
    });

    it('each platform should have a negative LUFS target', () => {
        for (const [, target] of Object.entries(PLATFORM_TARGETS)) {
            expect(target.lufs).toBeLessThan(0);
        }
    });
});

describe('PRESETS', () => {
    it('should be a non-empty array', () => {
        expect(Array.isArray(PRESETS)).toBe(true);
        expect(PRESETS.length).toBeGreaterThan(0);
    });
});

// ============================================
// UTILITIES
// ============================================

describe('escapeHtml', () => {
    it('should escape < and >', () => {
        expect(escapeHtml('<script>alert("xss")</script>')).toBe(
            '&lt;script&gt;alert(&quot;xss&quot;)&lt;/script&gt;'
        );
    });

    it('should escape ampersands', () => {
        expect(escapeHtml('foo & bar')).toBe('foo &amp; bar');
    });

    it('should escape quotes', () => {
        expect(escapeHtml('"hello" \'world\'')).toBe('&quot;hello&quot; &#39;world&#39;');
    });

    it('should return empty string for non-string input', () => {
        expect(escapeHtml(null)).toBe('');
        expect(escapeHtml(undefined)).toBe('');
        expect(escapeHtml(123)).toBe('');
    });

    it('should pass through safe strings unchanged', () => {
        expect(escapeHtml('hello world')).toBe('hello world');
    });
});
