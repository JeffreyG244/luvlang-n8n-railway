/**
 * KEYBOARD SHORTCUTS MANAGER
 * Professional power-user keyboard controls
 */

class KeyboardShortcuts {
    constructor(callbacks) {
        this.callbacks = callbacks || {};
        this.enabled = true;
        this.shortcuts = {};

        this.defineShortcuts();
        this.attachListeners();

        console.log('✅ Keyboard Shortcuts initialized');
        console.log('  ℹ️  Press "?" to show shortcut help');
    }

    /**
     * Define all keyboard shortcuts
     */
    defineShortcuts() {
        this.shortcuts = {
            // Playback
            'Space': { action: 'playPause', description: 'Play/Pause' },
            'Enter': { action: 'playPause', description: 'Play/Pause' },
            'Escape': { action: 'stop', description: 'Stop playback' },

            // A/B Comparison
            'a': { action: 'abToggle', description: 'Toggle A/B comparison' },
            'A': { action: 'abToggle', description: 'Toggle A/B comparison' },

            // EQ Controls
            '1': { action: 'selectBand1', description: 'Select Sub band (40Hz)' },
            '2': { action: 'selectBand2', description: 'Select Bass band (120Hz)' },
            '3': { action: 'selectBand3', description: 'Select Low-Mid band (350Hz)' },
            '4': { action: 'selectBand4', description: 'Select Mid band (1kHz)' },
            '5': { action: 'selectBand5', description: 'Select High-Mid band (3.5kHz)' },
            '6': { action: 'selectBand6', description: 'Select High band (8kHz)' },
            '7': { action: 'selectBand7', description: 'Select Air band (14kHz)' },

            // Reset & Bypass
            'r': { action: 'resetEQ', description: 'Reset all EQ to 0dB' },
            'R': { action: 'resetAll', description: 'Reset everything' },
            'b': { action: 'bypassAll', description: 'Bypass all processing' },
            'B': { action: 'bypassEQ', description: 'Bypass EQ only' },

            // M/S Processing
            'm': { action: 'toggleMS', description: 'Toggle M/S mode' },
            'M': { action: 'soloMid', description: 'Solo Mid channel' },
            's': { action: 'soloSide', description: 'Solo Side channel' },
            'S': { action: 'toggleStereo', description: 'Toggle stereo mode' },

            // Master Controls
            'ArrowUp': { action: 'increaseMasterGain', description: 'Increase master gain (+0.5dB)' },
            'ArrowDown': { action: 'decreaseMasterGain', description: 'Decrease master gain (-0.5dB)' },
            'ArrowLeft': { action: 'narrowStereo', description: 'Narrow stereo width (-5%)' },
            'ArrowRight': { action: 'widenStereo', description: 'Widen stereo width (+5%)' },

            // Undo/Redo (with Ctrl/Cmd)
            'Ctrl+z': { action: 'undo', description: 'Undo last change' },
            'Ctrl+Z': { action: 'undo', description: 'Undo last change' },
            'Ctrl+y': { action: 'redo', description: 'Redo last undone change' },
            'Ctrl+Y': { action: 'redo', description: 'Redo last undone change' },
            'Cmd+z': { action: 'undo', description: 'Undo last change (Mac)' },
            'Cmd+Z': { action: 'undo', description: 'Undo last change (Mac)' },
            'Cmd+Shift+z': { action: 'redo', description: 'Redo (Mac)' },

            // Presets
            'Ctrl+s': { action: 'savePreset', description: 'Save current settings as preset' },
            'Ctrl+o': { action: 'loadPreset', description: 'Open preset menu' },

            // AI Mastering
            'Ctrl+m': { action: 'autoMaster', description: 'Run AI Auto Master' },
            'Cmd+m': { action: 'autoMaster', description: 'Run AI Auto Master (Mac)' },

            // Export
            'Ctrl+e': { action: 'export', description: 'Export master' },
            'Cmd+e': { action: 'export', description: 'Export master (Mac)' },

            // Help
            '?': { action: 'showHelp', description: 'Show keyboard shortcuts' },
            '/': { action: 'showHelp', description: 'Show keyboard shortcuts' }
        };
    }

    /**
     * Attach event listeners
     */
    attachListeners() {
        document.addEventListener('keydown', (e) => {
            if (!this.enabled) return;

            // Don't trigger if user is typing in input/textarea
            if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') {
                return;
            }

            const key = this.getKeyString(e);
            const shortcut = this.shortcuts[key];

            if (shortcut && this.callbacks[shortcut.action]) {
                e.preventDefault();
                this.callbacks[shortcut.action]();
                this.showKeyPressIndicator(key, shortcut.description);
            }
        });

        console.log('  ✓ Keyboard event listeners attached');
    }

    /**
     * Get key string from event (handles modifiers)
     */
    getKeyString(e) {
        const parts = [];

        if (e.ctrlKey) parts.push('Ctrl');
        if (e.metaKey) parts.push('Cmd');
        if (e.shiftKey) parts.push('Shift');
        if (e.altKey) parts.push('Alt');

        // Special handling for Space
        if (e.code === 'Space') {
            parts.push('Space');
        } else if (e.key) {
            parts.push(e.key);
        }

        return parts.join('+');
    }

    /**
     * Show visual indicator when key is pressed
     */
    showKeyPressIndicator(key, description) {
        // Remove existing indicator
        const existing = document.getElementById('keyPressIndicator');
        if (existing) {
            existing.remove();
        }

        // Create indicator
        const indicator = document.createElement('div');
        indicator.id = 'keyPressIndicator';
        indicator.style.cssText = `
            position: fixed;
            bottom: 30px;
            right: 30px;
            background: rgba(0, 212, 255, 0.95);
            color: #0a0a0f;
            padding: 12px 20px;
            border-radius: 8px;
            font-family: 'JetBrains Mono', monospace;
            font-size: 0.9rem;
            font-weight: 600;
            box-shadow: 0 8px 32px rgba(0, 212, 255, 0.4);
            z-index: 10000;
            animation: slideInRight 0.2s ease-out;
            pointer-events: none;
        `;

        indicator.innerHTML = `
            <div style="display: flex; align-items: center; gap: 12px;">
                <span style="background: rgba(255,255,255,0.2); padding: 4px 8px; border-radius: 4px;">${key}</span>
                <span>${description}</span>
            </div>
        `;

        document.body.appendChild(indicator);

        // Fade out and remove
        setTimeout(() => {
            indicator.style.opacity = '0';
            indicator.style.transition = 'opacity 0.3s ease-out';
        }, 1500);

        setTimeout(() => {
            indicator.remove();
        }, 1800);
    }

    /**
     * Show keyboard shortcuts help overlay
     */
    showHelp() {
        // Remove existing help
        const existing = document.getElementById('keyboardHelpOverlay');
        if (existing) {
            existing.remove();
            return; // Toggle off
        }

        // Create help overlay
        const overlay = document.createElement('div');
        overlay.id = 'keyboardHelpOverlay';
        overlay.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: rgba(0, 0, 0, 0.85);
            z-index: 10000;
            display: flex;
            align-items: center;
            justify-content: center;
            animation: fadeIn 0.2s ease-out;
        `;

        overlay.innerHTML = `
            <div style="
                background: linear-gradient(180deg, #1a1a24 0%, #0f0f16 100%);
                border-radius: 16px;
                padding: 40px;
                max-width: 800px;
                max-height: 80vh;
                overflow-y: auto;
                box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5);
            ">
                <div style="
                    font-size: 1.8rem;
                    font-weight: 800;
                    background: linear-gradient(135deg, #00d4ff 0%, #b84fff 100%);
                    -webkit-background-clip: text;
                    -webkit-text-fill-color: transparent;
                    margin-bottom: 30px;
                    text-align: center;
                ">
                    ⌨️ Keyboard Shortcuts
                </div>

                <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 30px;">
                    ${this.generateHelpSections()}
                </div>

                <div style="
                    text-align: center;
                    margin-top: 30px;
                    font-size: 0.85rem;
                    opacity: 0.5;
                ">
                    Press ? or Escape to close
                </div>
            </div>
        `;

        // Click to close
        overlay.addEventListener('click', (e) => {
            if (e.target === overlay) {
                overlay.remove();
            }
        });

        document.body.appendChild(overlay);

        // Also trigger the callback if it exists
        if (this.callbacks.showHelp) {
            this.callbacks.showHelp();
        }
    }

    /**
     * Generate help sections HTML
     */
    generateHelpSections() {
        const sections = {
            'Playback': ['Space', 'Enter', 'Escape'],
            'A/B Comparison': ['a'],
            'EQ Bands': ['1', '2', '3', '4', '5', '6', '7'],
            'Reset & Bypass': ['r', 'R', 'b', 'B'],
            'M/S Processing': ['m', 'M', 's', 'S'],
            'Master Controls': ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'],
            'Undo/Redo': ['Ctrl+z', 'Ctrl+y'],
            'Presets': ['Ctrl+s', 'Ctrl+o'],
            'AI & Export': ['Ctrl+m', 'Ctrl+e']
        };

        return Object.keys(sections).map(sectionName => {
            const keys = sections[sectionName];
            const shortcuts = keys.map(key => {
                const shortcut = this.shortcuts[key];
                return shortcut ? `
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
                        <span style="
                            background: rgba(0, 212, 255, 0.1);
                            color: #00d4ff;
                            padding: 4px 8px;
                            border-radius: 4px;
                            font-family: 'JetBrains Mono', monospace;
                            font-size: 0.75rem;
                            font-weight: 600;
                        ">${key.replace('Ctrl+', '⌘').replace('Cmd+', '⌘')}</span>
                        <span style="font-size: 0.8rem; opacity: 0.7;">${shortcut.description}</span>
                    </div>
                ` : '';
            }).join('');

            return `
                <div>
                    <div style="
                        font-size: 0.85rem;
                        font-weight: 700;
                        color: #b84fff;
                        margin-bottom: 12px;
                        text-transform: uppercase;
                        letter-spacing: 1px;
                    ">${sectionName}</div>
                    ${shortcuts}
                </div>
            `;
        }).join('');
    }

    /**
     * Enable/disable all shortcuts
     */
    setEnabled(enabled) {
        this.enabled = enabled;
        console.log(enabled ? '✅ Keyboard shortcuts enabled' : '⏸️ Keyboard shortcuts disabled');
    }

    /**
     * Register a callback for a shortcut action
     */
    registerCallback(action, callback) {
        this.callbacks[action] = callback;
        console.log(`  ✓ Callback registered: ${action}`);
    }

    /**
     * Get all shortcut descriptions
     */
    getAllShortcuts() {
        return Object.keys(this.shortcuts).map(key => ({
            key: key,
            action: this.shortcuts[key].action,
            description: this.shortcuts[key].description
        }));
    }
}

// Export
if (typeof module !== 'undefined' && module.exports) {
    module.exports = KeyboardShortcuts;
}
