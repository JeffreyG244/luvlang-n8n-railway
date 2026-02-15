/**
 * UNDO TIMELINE UI
 * Visual history timeline for all changes
 * Click any point to restore, keyboard shortcuts (Ctrl+Z, Ctrl+Y)
 */

import { eventBus, Events } from '../core/event-bus.js';
import { appState } from '../core/app-state.js';
import { showToast, resolveContainer } from '../shared/utils.js';

class UndoTimeline {
    constructor(container, options = {}) {
        this.container = resolveContainer(container);

        this.options = {
            compact: false,
            maxVisible: 10,
            ...options
        };

        this.isVisible = false;
        this._eventUnsubs = [];
        this._keyHandler = null;

        if (this.container) {
            this.init();
        }

        // Initialized
    }

    /**
     * Initialize the timeline
     */
    init() {
        this.render();
        this.bindEvents();
        this.bindKeyboardShortcuts();
    }

    /**
     * Render the timeline panel
     */
    render() {
        this.container.innerHTML = `
            <div class="undo-timeline ${this.options.compact ? 'compact' : ''}">
                <div class="timeline-header">
                    <div class="timeline-title">
                        <span class="icon">📜</span>
                        <span>HISTORY</span>
                    </div>
                    <div class="timeline-actions">
                        <button class="btn-undo" title="Undo (Ctrl+Z)" disabled>
                            <span>↶ Undo</span>
                        </button>
                        <button class="btn-redo" title="Redo (Ctrl+Y)" disabled>
                            <span>↷ Redo</span>
                        </button>
                    </div>
                </div>

                <div class="timeline-visual">
                    <div class="timeline-track">
                        <div class="timeline-points" id="timeline-points"></div>
                        <div class="timeline-current-marker" id="timeline-marker"></div>
                    </div>
                    <div class="timeline-labels" id="timeline-labels"></div>
                    <div class="timeline-timestamps" id="timeline-timestamps"></div>
                </div>

                <div class="timeline-list" id="timeline-list">
                    <div class="list-empty">
                        <span>No history yet</span>
                        <span class="hint">Make changes to see history</span>
                    </div>
                </div>

                <div class="timeline-info">
                    <span class="info-position" id="history-position">0/0</span>
                    <span class="info-shortcut">Ctrl+Z / Ctrl+Y</span>
                </div>
            </div>
        `;
    }

    /**
     * Bind event handlers
     */
    bindEvents() {
        const undoBtn = this.container.querySelector('.btn-undo');
        const redoBtn = this.container.querySelector('.btn-redo');

        if (undoBtn) {
            undoBtn.addEventListener('click', () => this.handleUndo());
        }

        if (redoBtn) {
            redoBtn.addEventListener('click', () => this.handleRedo());
        }

        // Listen for history events (store unsubs for cleanup)
        const events = [
            [Events.HISTORY_SAVE, () => this.updateTimeline()],
            [Events.HISTORY_UNDO, () => this.updateTimeline()],
            [Events.HISTORY_REDO, () => this.updateTimeline()],
            [Events.HISTORY_JUMP, () => this.updateTimeline()],
            [Events.STATE_CHANGE, () => this.updateButtons()]
        ];
        for (const [event, handler] of events) {
            const unsub = eventBus.on(event, handler);
            if (typeof unsub === 'function') this._eventUnsubs.push(unsub);
        }
    }

    /**
     * Bind keyboard shortcuts
     */
    bindKeyboardShortcuts() {
        this._keyHandler = (e) => {
            // Ignore if typing in input
            if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') {
                return;
            }

            // Ctrl+Z / Cmd+Z
            if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) {
                e.preventDefault();
                this.handleUndo();
            }

            // Ctrl+Y / Cmd+Y or Ctrl+Shift+Z / Cmd+Shift+Z
            if ((e.ctrlKey || e.metaKey) && (e.key === 'y' || (e.key === 'z' && e.shiftKey))) {
                e.preventDefault();
                this.handleRedo();
            }
        };
        document.addEventListener('keydown', this._keyHandler);
    }

    /**
     * Handle undo action
     */
    handleUndo() {
        const entry = appState.undo();
        if (entry) {
            this.showToast(`Undo: ${entry.description}`);
            this.updateTimeline();
        }
    }

    /**
     * Handle redo action
     */
    handleRedo() {
        const entry = appState.redo();
        if (entry) {
            this.showToast(`Redo: ${entry.description}`);
            this.updateTimeline();
        }
    }

    /**
     * Jump to specific history point
     */
    jumpToPoint(index) {
        appState.jumpToHistory(index);
        this.updateTimeline();
    }

    /**
     * Update the visual timeline
     */
    updateTimeline() {
        const historyInfo = appState.getHistoryInfo();
        const { entries, currentIndex } = historyInfo;

        // Update visual timeline points
        this.updateVisualTimeline(entries, currentIndex);

        // Update list view
        this.updateListView(entries, currentIndex);

        // Update position info
        this.updatePositionInfo(entries.length, currentIndex);

        // Update buttons
        this.updateButtons();
    }

    /**
     * Update visual timeline track
     */
    updateVisualTimeline(entries, currentIndex) {
        const pointsContainer = this.container.querySelector('#timeline-points');
        const labelsContainer = this.container.querySelector('#timeline-labels');
        const timestampsContainer = this.container.querySelector('#timeline-timestamps');
        const marker = this.container.querySelector('#timeline-marker');

        if (!pointsContainer || !labelsContainer || !timestampsContainer) return;

        if (entries.length === 0) {
            pointsContainer.innerHTML = '';
            labelsContainer.innerHTML = '';
            timestampsContainer.innerHTML = '';
            if (marker) marker.style.display = 'none';
            return;
        }

        // Limit visible entries for compact view
        const visibleEntries = this.options.compact
            ? entries.slice(Math.max(0, currentIndex - 5), currentIndex + 5)
            : entries.slice(-this.options.maxVisible);

        const startIndex = this.options.compact
            ? Math.max(0, currentIndex - 5)
            : Math.max(0, entries.length - this.options.maxVisible);

        // Render points
        pointsContainer.innerHTML = visibleEntries.map((entry, i) => {
            const actualIndex = startIndex + i;
            const isCurrent = actualIndex === currentIndex;
            const isActive = actualIndex <= currentIndex;

            return `
                <div class="timeline-point ${isCurrent ? 'current' : ''} ${isActive ? 'active' : ''}"
                     data-index="${actualIndex}"
                     title="${entry.description}">
                    <div class="point-dot"></div>
                </div>
            `;
        }).join('');

        // Render labels (short descriptions)
        labelsContainer.innerHTML = visibleEntries.map((entry, i) => {
            const actualIndex = startIndex + i;
            const isCurrent = actualIndex === currentIndex;
            const label = this.getShortLabel(entry.description);

            return `
                <div class="timeline-label ${isCurrent ? 'current' : ''}"
                     data-index="${actualIndex}"
                     title="${entry.description}">
                    ${label}
                </div>
            `;
        }).join('');

        // Render timestamps
        timestampsContainer.innerHTML = visibleEntries.map((entry, i) => {
            const actualIndex = startIndex + i;
            const time = this.formatTime(entry.timestamp);

            return `
                <div class="timeline-timestamp" data-index="${actualIndex}">
                    ${time}
                </div>
            `;
        }).join('');

        // Position marker
        if (marker) {
            const currentPointIndex = visibleEntries.findIndex((_, i) =>
                (startIndex + i) === currentIndex
            );

            if (currentPointIndex >= 0) {
                const percent = (currentPointIndex / (visibleEntries.length - 1 || 1)) * 100;
                marker.style.left = `${percent}%`;
                marker.style.display = 'block';
            }
        }

        // Bind click events on points
        pointsContainer.querySelectorAll('.timeline-point').forEach(point => {
            point.addEventListener('click', () => {
                const index = parseInt(point.dataset.index);
                this.jumpToPoint(index);
            });
        });

        labelsContainer.querySelectorAll('.timeline-label').forEach(label => {
            label.addEventListener('click', () => {
                const index = parseInt(label.dataset.index);
                this.jumpToPoint(index);
            });
        });
    }

    /**
     * Update list view
     */
    updateListView(entries, currentIndex) {
        const listContainer = this.container.querySelector('#timeline-list');
        if (!listContainer) return;

        if (entries.length === 0) {
            listContainer.innerHTML = `
                <div class="list-empty">
                    <span>No history yet</span>
                    <span class="hint">Make changes to see history</span>
                </div>
            `;
            return;
        }

        // Show entries in reverse order (newest first)
        const reversedEntries = [...entries].reverse();

        listContainer.innerHTML = reversedEntries.map((entry, i) => {
            const actualIndex = entries.length - 1 - i;
            const isCurrent = actualIndex === currentIndex;
            const isPast = actualIndex < currentIndex;
            const isFuture = actualIndex > currentIndex;

            return `
                <div class="history-item ${isCurrent ? 'current' : ''} ${isPast ? 'past' : ''} ${isFuture ? 'future' : ''}"
                     data-index="${actualIndex}">
                    <div class="item-indicator">
                        ${isCurrent ? '●' : isPast ? '○' : '◌'}
                    </div>
                    <div class="item-content">
                        <span class="item-description">${entry.description}</span>
                        <span class="item-time">${this.formatTime(entry.timestamp)}</span>
                    </div>
                    <button class="btn-restore" title="Restore to this point">
                        ↩
                    </button>
                </div>
            `;
        }).join('');

        // Bind click events
        listContainer.querySelectorAll('.history-item').forEach(item => {
            item.addEventListener('click', () => {
                const index = parseInt(item.dataset.index);
                this.jumpToPoint(index);
            });
        });

        listContainer.querySelectorAll('.btn-restore').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const item = btn.closest('.history-item');
                const index = parseInt(item.dataset.index);
                this.jumpToPoint(index);
            });
        });
    }

    /**
     * Update position info
     */
    updatePositionInfo(total, current) {
        const positionEl = this.container.querySelector('#history-position');
        if (positionEl) {
            positionEl.textContent = `${current + 1}/${total}`;
        }
    }

    /**
     * Update undo/redo buttons
     */
    updateButtons() {
        const undoBtn = this.container.querySelector('.btn-undo');
        const redoBtn = this.container.querySelector('.btn-redo');

        if (undoBtn) {
            undoBtn.disabled = !appState.canUndo();
        }

        if (redoBtn) {
            redoBtn.disabled = !appState.canRedo();
        }
    }

    /**
     * Get short label for timeline display
     */
    getShortLabel(description) {
        // Extract key parts from description
        const parts = description.split(':');
        if (parts.length > 0) {
            return parts[0].trim().substring(0, 8);
        }
        return description.substring(0, 8);
    }

    /**
     * Format timestamp
     */
    formatTime(timestamp) {
        const date = new Date(timestamp);
        return date.toLocaleTimeString('en-US', {
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
            hour12: false
        });
    }

    /**
     * Show toast notification
     */
    showToast(message) {
        showToast(message, { className: 'undo-toast', duration: 2000 });
    }

    /**
     * Toggle visibility
     */
    toggle() {
        this.isVisible = !this.isVisible;
        this.container.style.display = this.isVisible ? 'block' : 'none';

        if (this.isVisible) {
            this.updateTimeline();
        }
    }

    /**
     * Show timeline
     */
    show() {
        this.isVisible = true;
        this.container.style.display = 'block';
        this.updateTimeline();
    }

    /**
     * Hide timeline
     */
    hide() {
        this.isVisible = false;
        this.container.style.display = 'none';
    }

    /**
     * Cleanup
     */
    destroy() {
        // Remove keyboard listener
        if (this._keyHandler) {
            document.removeEventListener('keydown', this._keyHandler);
            this._keyHandler = null;
        }

        // Remove eventBus subscriptions
        for (const unsub of this._eventUnsubs) {
            unsub();
        }
        this._eventUnsubs = [];

        if (this.container) {
            this.container.innerHTML = '';
        }
    }
}

// Export
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { UndoTimeline };
}

if (typeof window !== 'undefined') {
    window.UndoTimeline = UndoTimeline;
}

export { UndoTimeline };
