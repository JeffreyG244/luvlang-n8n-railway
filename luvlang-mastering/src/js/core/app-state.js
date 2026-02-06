/**
 * APP STATE - Central state management with pub/sub reactivity
 * Manages all application state with history tracking for undo/redo
 */

import { eventBus, Events } from './event-bus.js';
import {
    EQ_BANDS,
    COMPRESSOR_DEFAULTS,
    LIMITER_DEFAULTS
} from '../shared/constants.js';

class AppState {
    constructor() {
        this.state = this.getInitialState();
        this.subscribers = new Map();
        this.history = [];
        this.historyIndex = -1;
        this.maxHistory = 50;
        this.isReplaying = false;

        // Initialized with default state
    }

    /**
     * Get initial application state
     */
    getInitialState() {
        return {
            // Audio state
            audio: {
                loaded: false,
                playing: false,
                currentTime: 0,
                duration: 0,
                fileName: null,
                fileSize: 0,
                sampleRate: 44100,
                channels: 2,
                bitDepth: 16,
                buffer: null
            },

            // EQ state (band definitions from shared constants)
            eq: {
                enabled: true,
                bands: EQ_BANDS.map(band => ({ ...band, gain: 0 }))
            },

            // Dynamics state (defaults from shared constants)
            dynamics: {
                compressor: {
                    enabled: true,
                    ...COMPRESSOR_DEFAULTS
                },
                limiter: {
                    enabled: true,
                    ceiling: LIMITER_DEFAULTS.ceiling,
                    release: LIMITER_DEFAULTS.release
                }
            },

            // Stereo state
            stereo: {
                width: 100,
                midSideBalance: 0,
                monoBassFreq: 120,
                monoBassEnabled: true
            },

            // Master state
            master: {
                gain: 0,
                targetLUFS: -14,
                autoGain: true
            },

            // Analysis state
            analysis: {
                lufs: {
                    integrated: null,
                    shortTerm: null,
                    momentary: null
                },
                truePeak: null,
                dynamicRange: null,
                spectrum: null,
                crestFactor: null
            },

            // UI state
            ui: {
                mode: 'music', // 'music', 'podcast', 'multitrack', 'batch'
                activePanels: ['eq', 'dynamics', 'master'],
                sidebarCollapsed: false,
                theme: 'dark-chrome',
                showHistory: false
            },

            // Multitrack state
            multitrack: {
                enabled: false,
                tracks: [],
                masterGain: 0
            },

            // Batch state
            batch: {
                enabled: false,
                queue: [],
                currentIndex: -1,
                settings: {
                    matchLUFS: true,
                    targetLUFS: -14,
                    applyEQ: true,
                    applyCompression: true
                }
            },

            // Podcast state
            podcast: {
                enabled: false,
                preset: 'interview',
                voiceClarity: 2.5,
                deessing: 5,
                breathRemoval: 4,
                roomTone: 5,
                speakers: []
            },

            // Collaboration state
            collaboration: {
                connected: false,
                projectId: null,
                users: [],
                comments: []
            },

            // Export state
            export: {
                format: 'wav',
                bitDepth: 24,
                sampleRate: 48000,
                normalize: true,
                dither: true
            },

            // Presets
            presets: {
                active: null,
                custom: []
            }
        };
    }

    /**
     * Get current state or a specific path
     * @param {string} path - Dot-notation path (e.g., 'eq.bands.0.gain')
     */
    get(path) {
        if (!path) return { ...this.state };

        const keys = path.split('.');
        let value = this.state;

        for (const key of keys) {
            if (value === undefined || value === null) return undefined;
            value = value[key];
        }

        return value;
    }

    /**
     * Set state at a specific path
     * @param {string} path - Dot-notation path
     * @param {*} value - New value
     * @param {boolean} saveHistory - Whether to save to history
     */
    set(path, value, saveHistory = true) {
        if (this.isReplaying) return;

        const oldValue = this.get(path);
        if (JSON.stringify(oldValue) === JSON.stringify(value)) return;

        // Save to history before change
        if (saveHistory) {
            this.saveToHistory(path, oldValue, value);
        }

        // Update state
        const keys = path.split('.');
        let target = this.state;

        for (let i = 0; i < keys.length - 1; i++) {
            if (target[keys[i]] === undefined) {
                target[keys[i]] = {};
            }
            target = target[keys[i]];
        }

        target[keys[keys.length - 1]] = value;

        // Notify subscribers
        this.notifySubscribers(path, value, oldValue);

        // Emit state change event
        eventBus.emit(Events.STATE_CHANGE, { path, value, oldValue });
    }

    /**
     * Update multiple state paths at once
     * @param {Object} updates - Object with path:value pairs
     */
    update(updates, saveHistory = true) {
        for (const [path, value] of Object.entries(updates)) {
            this.set(path, value, saveHistory);
        }
    }

    /**
     * Subscribe to state changes at a path
     * @param {string} path - Path to watch
     * @param {Function} callback - Called with (newValue, oldValue)
     * @returns {Function} Unsubscribe function
     */
    subscribe(path, callback) {
        if (!this.subscribers.has(path)) {
            this.subscribers.set(path, new Set());
        }

        this.subscribers.get(path).add(callback);

        return () => {
            this.subscribers.get(path).delete(callback);
        };
    }

    /**
     * Notify subscribers of state change
     */
    notifySubscribers(changedPath, newValue, oldValue) {
        // Notify exact path subscribers
        if (this.subscribers.has(changedPath)) {
            for (const callback of this.subscribers.get(changedPath)) {
                try {
                    callback(newValue, oldValue);
                } catch (error) {
                    console.error('[AppState] Subscriber error:', error);
                }
            }
        }

        // Notify parent path subscribers
        const parts = changedPath.split('.');
        for (let i = 1; i < parts.length; i++) {
            const parentPath = parts.slice(0, i).join('.');
            if (this.subscribers.has(parentPath)) {
                for (const callback of this.subscribers.get(parentPath)) {
                    try {
                        callback(this.get(parentPath), null);
                    } catch (error) {
                        console.error('[AppState] Subscriber error:', error);
                    }
                }
            }
        }
    }

    /**
     * Save state change to history
     */
    saveToHistory(path, oldValue, newValue) {
        // Remove future history if we're not at the end
        if (this.historyIndex < this.history.length - 1) {
            this.history = this.history.slice(0, this.historyIndex + 1);
        }

        // Add to history
        this.history.push({
            path,
            oldValue: JSON.parse(JSON.stringify(oldValue)),
            newValue: JSON.parse(JSON.stringify(newValue)),
            timestamp: Date.now(),
            description: this.getActionDescription(path, newValue)
        });

        this.historyIndex++;

        // Trim history if needed
        if (this.history.length > this.maxHistory) {
            this.history.shift();
            this.historyIndex--;
        }

        eventBus.emit(Events.HISTORY_SAVE, this.getHistoryInfo());
    }

    /**
     * Get human-readable description of action
     */
    getActionDescription(path, value) {
        const parts = path.split('.');

        if (parts[0] === 'eq' && parts[1] === 'bands') {
            const bandIndex = parseInt(parts[2]);
            const band = this.state.eq.bands[bandIndex];
            return `EQ ${band?.label || bandIndex + 1}: ${parts[3]} = ${value}`;
        }

        if (parts[0] === 'dynamics') {
            return `${parts[1]} ${parts[2]} = ${value}`;
        }

        if (parts[0] === 'master') {
            return `Master ${parts[1]} = ${value}`;
        }

        return `${path} changed`;
    }

    /**
     * Undo last change
     */
    undo() {
        if (!this.canUndo()) return null;

        this.isReplaying = true;
        const entry = this.history[this.historyIndex];

        // Restore old value
        const keys = entry.path.split('.');
        let target = this.state;

        for (let i = 0; i < keys.length - 1; i++) {
            target = target[keys[i]];
        }

        target[keys[keys.length - 1]] = entry.oldValue;
        this.historyIndex--;

        this.notifySubscribers(entry.path, entry.oldValue, entry.newValue);
        eventBus.emit(Events.HISTORY_UNDO, { entry, info: this.getHistoryInfo() });

        this.isReplaying = false;
        return entry;
    }

    /**
     * Redo previously undone change
     */
    redo() {
        if (!this.canRedo()) return null;

        this.isReplaying = true;
        this.historyIndex++;
        const entry = this.history[this.historyIndex];

        // Restore new value
        const keys = entry.path.split('.');
        let target = this.state;

        for (let i = 0; i < keys.length - 1; i++) {
            target = target[keys[i]];
        }

        target[keys[keys.length - 1]] = entry.newValue;

        this.notifySubscribers(entry.path, entry.newValue, entry.oldValue);
        eventBus.emit(Events.HISTORY_REDO, { entry, info: this.getHistoryInfo() });

        this.isReplaying = false;
        return entry;
    }

    /**
     * Jump to specific history point
     */
    jumpToHistory(index) {
        if (index < 0 || index >= this.history.length) return;

        this.isReplaying = true;

        // Apply all changes between current and target
        if (index < this.historyIndex) {
            // Going backwards (undo)
            while (this.historyIndex > index) {
                const entry = this.history[this.historyIndex];
                const keys = entry.path.split('.');
                let target = this.state;
                for (let i = 0; i < keys.length - 1; i++) target = target[keys[i]];
                target[keys[keys.length - 1]] = entry.oldValue;
                this.historyIndex--;
            }
        } else {
            // Going forwards (redo)
            while (this.historyIndex < index) {
                this.historyIndex++;
                const entry = this.history[this.historyIndex];
                const keys = entry.path.split('.');
                let target = this.state;
                for (let i = 0; i < keys.length - 1; i++) target = target[keys[i]];
                target[keys[keys.length - 1]] = entry.newValue;
            }
        }

        eventBus.emit(Events.HISTORY_JUMP, this.getHistoryInfo());
        this.isReplaying = false;
    }

    canUndo() {
        return this.historyIndex >= 0;
    }

    canRedo() {
        return this.historyIndex < this.history.length - 1;
    }

    /**
     * Get history info for UI
     */
    getHistoryInfo() {
        return {
            entries: this.history.map((entry, i) => ({
                index: i,
                description: entry.description,
                timestamp: entry.timestamp,
                isCurrent: i === this.historyIndex
            })),
            currentIndex: this.historyIndex,
            canUndo: this.canUndo(),
            canRedo: this.canRedo()
        };
    }

    /**
     * Reset state to initial values
     */
    reset() {
        this.state = this.getInitialState();
        this.history = [];
        this.historyIndex = -1;

        eventBus.emit(Events.STATE_RESET, this.state);
        // State reset
    }

    /**
     * Export state to JSON
     */
    toJSON() {
        return JSON.stringify(this.state, null, 2);
    }

    /**
     * Import state from JSON
     */
    fromJSON(json) {
        try {
            const imported = JSON.parse(json);
            this.state = { ...this.getInitialState(), ...imported };
            eventBus.emit(Events.STATE_CHANGE, { path: '', value: this.state });
            return true;
        } catch (error) {
            console.error('[AppState] Failed to import state:', error);
            return false;
        }
    }
}

// Singleton instance
const appState = new AppState();

// Export
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { AppState, appState };
}

if (typeof window !== 'undefined') {
    window.AppState = AppState;
    window.appState = appState;
}

export { AppState, appState };
