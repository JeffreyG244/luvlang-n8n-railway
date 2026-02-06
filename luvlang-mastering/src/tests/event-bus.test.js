/**
 * EVENT BUS TESTS
 * Unit tests for the pub/sub event system
 */

import { describe, it, expect, beforeEach, afterEach } from './test-runner.js';
import { EventBus, eventBus, Events } from '../js/core/event-bus.js';

describe('EventBus - Core Functionality', () => {
    let testBus;

    beforeEach(() => {
        testBus = new EventBus();
    });

    it('should register event listeners', () => {
        let called = false;
        testBus.on('test', () => {
            called = true;
        });

        testBus.emit('test');
        expect(called).toBe(true);
    });

    it('should pass data to listeners', () => {
        let receivedData = null;
        testBus.on('test', (data) => {
            receivedData = data;
        });

        testBus.emit('test', { value: 42 });
        expect(receivedData).toEqual({ value: 42 });
    });

    it('should support multiple listeners', () => {
        let count = 0;
        testBus.on('test', () => count++);
        testBus.on('test', () => count++);
        testBus.on('test', () => count++);

        testBus.emit('test');
        expect(count).toBe(3);
    });

    it('should unsubscribe listeners', () => {
        let count = 0;
        const off = testBus.on('test', () => count++);

        testBus.emit('test');
        expect(count).toBe(1);

        off();
        testBus.emit('test');
        expect(count).toBe(1);
    });

    it('should handle once listeners', () => {
        let count = 0;
        testBus.once('test', () => count++);

        testBus.emit('test');
        testBus.emit('test');
        testBus.emit('test');

        expect(count).toBe(1);
    });
});

describe('EventBus - Error Handling', () => {
    let testBus;

    beforeEach(() => {
        testBus = new EventBus();
    });

    it('should continue execution if listener throws', () => {
        let secondCalled = false;

        testBus.on('test', () => {
            throw new Error('First listener error');
        });

        testBus.on('test', () => {
            secondCalled = true;
        });

        testBus.emit('test');
        expect(secondCalled).toBe(true);
    });

    it('should handle emitting non-existent events', () => {
        // Should not throw
        testBus.emit('nonexistent');
        expect(true).toBe(true);
    });
});

describe('EventBus - Clear Functionality', () => {
    let testBus;

    beforeEach(() => {
        testBus = new EventBus();
    });

    it('should clear specific event listeners', () => {
        let called = false;
        testBus.on('test', () => {
            called = true;
        });

        testBus.off('test');
        testBus.emit('test');

        expect(called).toBe(false);
    });

    it('should clear all listeners', () => {
        let testCalled = false;
        let otherCalled = false;

        testBus.on('test', () => { testCalled = true; });
        testBus.on('other', () => { otherCalled = true; });

        testBus.clear();

        testBus.emit('test');
        testBus.emit('other');

        expect(testCalled).toBe(false);
        expect(otherCalled).toBe(false);
    });
});

describe('Events Constants', () => {
    it('should have audio events', () => {
        expect(Events.AUDIO_LOADED).toBeDefined();
        expect(Events.AUDIO_PLAY).toBeDefined();
        expect(Events.AUDIO_PAUSE).toBeDefined();
        expect(Events.AUDIO_STOP).toBeDefined();
    });

    it('should have state events', () => {
        expect(Events.STATE_CHANGE).toBeDefined();
        expect(Events.STATE_RESET).toBeDefined();
    });

    it('should have history events', () => {
        expect(Events.HISTORY_UNDO).toBeDefined();
        expect(Events.HISTORY_REDO).toBeDefined();
    });

    it('should have collaboration events', () => {
        expect(Events.COLLAB_CONNECT).toBeDefined();
        expect(Events.COLLAB_COMMENT).toBeDefined();
    });

    it('should have analysis events', () => {
        expect(Events.ANALYSIS_START).toBeDefined();
        expect(Events.ANALYSIS_COMPLETE).toBeDefined();
        expect(Events.LUFS_UPDATE).toBeDefined();
    });
});

describe('EventBus - Singleton', () => {
    it('should export a singleton instance', () => {
        expect(eventBus).toBeDefined();
        expect(eventBus).toBeInstanceOf(EventBus);
    });

    it('should work with the singleton', () => {
        let received = null;
        const off = eventBus.on('singleton-test', (data) => {
            received = data;
        });

        eventBus.emit('singleton-test', { test: true });
        expect(received).toEqual({ test: true });

        off();
    });
});
