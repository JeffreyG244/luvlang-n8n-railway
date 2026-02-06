/**
 * APP STATE TESTS
 * Unit tests for the central state management system
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { AppState, appState } from '../js/core/app-state.js';

describe('AppState - Core Functionality', () => {
    let testState;

    beforeEach(() => {
        testState = new AppState();
    });

    afterEach(() => {
        testState.reset();
    });

    it('should initialize with default state', () => {
        const state = testState.get();
        expect(state).toBeDefined();
        expect(state.audio).toBeDefined();
        expect(state.eq).toBeDefined();
        expect(state.dynamics).toBeDefined();
    });

    it('should get nested state values', () => {
        const threshold = testState.get('dynamics.compressor.threshold');
        expect(threshold).toBe(-18);
    });

    it('should set state values', () => {
        testState.set('master.gain', 5);
        const gain = testState.get('master.gain');
        expect(gain).toBe(5);
    });

    it('should set nested state values', () => {
        testState.set('dynamics.compressor.ratio', 4.0);
        const ratio = testState.get('dynamics.compressor.ratio');
        expect(ratio).toBe(4.0);
    });

    it('should not trigger update for same value', () => {
        let updateCount = 0;
        testState.subscribe('master.gain', () => updateCount++);

        testState.set('master.gain', 0); // Same as default
        expect(updateCount).toBe(0);
    });

    it('should update multiple values at once', () => {
        testState.update({
            'master.gain': 3,
            'master.targetLUFS': -12
        });

        expect(testState.get('master.gain')).toBe(3);
        expect(testState.get('master.targetLUFS')).toBe(-12);
    });
});

describe('AppState - Subscriptions', () => {
    let testState;

    beforeEach(() => {
        testState = new AppState();
    });

    it('should notify subscribers on state change', () => {
        let notifiedValue = null;
        testState.subscribe('master.gain', (value) => {
            notifiedValue = value;
        });

        testState.set('master.gain', 10);
        expect(notifiedValue).toBe(10);
    });

    it('should unsubscribe correctly', () => {
        let notifyCount = 0;
        const unsubscribe = testState.subscribe('master.gain', () => {
            notifyCount++;
        });

        testState.set('master.gain', 5);
        expect(notifyCount).toBe(1);

        unsubscribe();
        testState.set('master.gain', 10);
        expect(notifyCount).toBe(1); // Should not increase
    });

    it('should notify parent path subscribers', () => {
        let parentNotified = false;
        testState.subscribe('dynamics', () => {
            parentNotified = true;
        });

        testState.set('dynamics.compressor.threshold', -20);
        expect(parentNotified).toBe(true);
    });
});

describe('AppState - History (Undo/Redo)', () => {
    let testState;

    beforeEach(() => {
        testState = new AppState();
    });

    it('should track history', () => {
        testState.set('master.gain', 5);
        const info = testState.getHistoryInfo();
        expect(info.entries.length).toBe(1);
    });

    it('should undo changes', () => {
        testState.set('master.gain', 5);
        testState.set('master.gain', 10);

        expect(testState.get('master.gain')).toBe(10);

        testState.undo();
        expect(testState.get('master.gain')).toBe(5);
    });

    it('should redo changes', () => {
        testState.set('master.gain', 5);
        testState.set('master.gain', 10);

        testState.undo();
        expect(testState.get('master.gain')).toBe(5);

        testState.redo();
        expect(testState.get('master.gain')).toBe(10);
    });

    it('should report canUndo correctly', () => {
        expect(testState.canUndo()).toBe(false);

        testState.set('master.gain', 5);
        expect(testState.canUndo()).toBe(true);

        testState.undo();
        expect(testState.canUndo()).toBe(false);
    });

    it('should report canRedo correctly', () => {
        testState.set('master.gain', 5);
        expect(testState.canRedo()).toBe(false);

        testState.undo();
        expect(testState.canRedo()).toBe(true);
    });

    it('should clear future history on new change after undo', () => {
        testState.set('master.gain', 5);
        testState.set('master.gain', 10);
        testState.set('master.gain', 15);

        testState.undo();
        testState.undo();

        testState.set('master.gain', 20);

        expect(testState.canRedo()).toBe(false);
    });

    it('should not save history when saveHistory is false', () => {
        testState.set('master.gain', 5, false);
        expect(testState.canUndo()).toBe(false);
    });
});

describe('AppState - EQ State', () => {
    let testState;

    beforeEach(() => {
        testState = new AppState();
    });

    it('should have 7 EQ bands by default', () => {
        const bands = testState.get('eq.bands');
        expect(bands).toHaveLength(7);
    });

    it('should have correct default frequencies', () => {
        const bands = testState.get('eq.bands');
        expect(bands[0].frequency).toBe(60);
        expect(bands[3].frequency).toBe(1000);
        expect(bands[6].frequency).toBe(12000);
    });

    it('should update individual band gain', () => {
        testState.set('eq.bands.0.gain', 3);
        expect(testState.get('eq.bands.0.gain')).toBe(3);
    });

    it('should toggle EQ enabled state', () => {
        testState.set('eq.enabled', false);
        expect(testState.get('eq.enabled')).toBe(false);
    });
});

describe('AppState - Dynamics State', () => {
    let testState;

    beforeEach(() => {
        testState = new AppState();
    });

    it('should have compressor settings', () => {
        const compressor = testState.get('dynamics.compressor');
        expect(compressor).toBeDefined();
        expect(compressor.threshold).toBeDefined();
        expect(compressor.ratio).toBeDefined();
    });

    it('should have limiter settings', () => {
        const limiter = testState.get('dynamics.limiter');
        expect(limiter).toBeDefined();
        expect(limiter.ceiling).toBe(-0.3);
    });

    it('should update compressor settings', () => {
        testState.set('dynamics.compressor.threshold', -24);
        testState.set('dynamics.compressor.ratio', 4.0);

        expect(testState.get('dynamics.compressor.threshold')).toBe(-24);
        expect(testState.get('dynamics.compressor.ratio')).toBe(4.0);
    });
});

describe('AppState - Serialization', () => {
    let testState;

    beforeEach(() => {
        testState = new AppState();
    });

    it('should export state to JSON', () => {
        const json = testState.toJSON();
        expect(json).toBeTruthy();
        expect(typeof json).toBe('string');

        const parsed = JSON.parse(json);
        expect(parsed.audio).toBeDefined();
    });

    it('should import state from JSON', () => {
        const importData = JSON.stringify({
            master: { gain: 10, targetLUFS: -12 }
        });

        const success = testState.fromJSON(importData);
        expect(success).toBe(true);
        expect(testState.get('master.gain')).toBe(10);
    });

    it('should handle invalid JSON gracefully', () => {
        const success = testState.fromJSON('invalid json');
        expect(success).toBe(false);
    });
});

describe('AppState - Reset', () => {
    let testState;

    beforeEach(() => {
        testState = new AppState();
    });

    it('should reset to initial state', () => {
        testState.set('master.gain', 10);
        testState.set('dynamics.compressor.threshold', -30);

        testState.reset();

        expect(testState.get('master.gain')).toBe(0);
        expect(testState.get('dynamics.compressor.threshold')).toBe(-18);
    });

    it('should clear history on reset', () => {
        testState.set('master.gain', 5);
        testState.set('master.gain', 10);

        testState.reset();

        expect(testState.canUndo()).toBe(false);
        expect(testState.canRedo()).toBe(false);
    });
});
