/**
 * UNDO/REDO MANAGER
 * History tracking for all user changes
 */

class UndoRedoManager {
    constructor() {
        this.history = [];
        this.currentIndex = -1;
        this.maxHistorySize = 50; // Limit to prevent memory issues
        this.enabled = true;

    }

    /**
     * Save current state to history
     */
    saveState(state, actionDescription = 'Change') {
        if (!this.enabled) return;

        // Create deep copy of state
        const stateCopy = JSON.parse(JSON.stringify(state));

        // If we're not at the end of history, remove future states
        if (this.currentIndex < this.history.length - 1) {
            this.history = this.history.slice(0, this.currentIndex + 1);
        }

        // Add new state
        const historyEntry = {
            state: stateCopy,
            timestamp: new Date().toISOString(),
            description: actionDescription
        };

        this.history.push(historyEntry);
        this.currentIndex = this.history.length - 1;

        // Trim history if it exceeds max size
        if (this.history.length > this.maxHistorySize) {
            this.history.shift();
            this.currentIndex--;
        }

    }

    /**
     * Undo to previous state
     */
    undo() {
        if (!this.canUndo()) {
            console.warn('⚠️ Nothing to undo');
            return null;
        }

        this.currentIndex--;
        const entry = this.history[this.currentIndex];

        return entry.state;
    }

    /**
     * Redo to next state
     */
    redo() {
        if (!this.canRedo()) {
            console.warn('⚠️ Nothing to redo');
            return null;
        }

        this.currentIndex++;
        const entry = this.history[this.currentIndex];

        return entry.state;
    }

    /**
     * Check if undo is possible
     */
    canUndo() {
        return this.currentIndex > 0;
    }

    /**
     * Check if redo is possible
     */
    canRedo() {
        return this.currentIndex < this.history.length - 1;
    }

    /**
     * Get current state
     */
    getCurrentState() {
        if (this.currentIndex >= 0 && this.currentIndex < this.history.length) {
            return this.history[this.currentIndex].state;
        }
        return null;
    }

    /**
     * Clear all history
     */
    clearHistory() {
        this.history = [];
        this.currentIndex = -1;

    }

    /**
     * Get history summary for display
     */
    getHistorySummary() {
        return this.history.map((entry, index) => ({
            index: index,
            description: entry.description,
            timestamp: new Date(entry.timestamp).toLocaleTimeString(),
            isCurrent: index === this.currentIndex
        }));
    }

    /**
     * Jump to specific state in history
     */
    jumpToState(index) {
        if (index < 0 || index >= this.history.length) {
            console.error('❌ Invalid history index:', index);
            return null;
        }

        this.currentIndex = index;
        const entry = this.history[index];

        return entry.state;
    }

    /**
     * Enable/disable history tracking
     */
    setEnabled(enabled) {
        this.enabled = enabled;

    }

    /**
     * Get undo description (for UI)
     */
    getUndoDescription() {
        if (!this.canUndo()) return null;
        return this.history[this.currentIndex - 1].description;
    }

    /**
     * Get redo description (for UI)
     */
    getRedoDescription() {
        if (!this.canRedo()) return null;
        return this.history[this.currentIndex + 1].description;
    }

    /**
     * Get history statistics
     */
    getStats() {
        return {
            totalStates: this.history.length,
            currentIndex: this.currentIndex,
            canUndo: this.canUndo(),
            canRedo: this.canRedo(),
            memoryUsage: new Blob([JSON.stringify(this.history)]).size
        };
    }
}

// Export
if (typeof module !== 'undefined' && module.exports) {
    module.exports = UndoRedoManager;
}
