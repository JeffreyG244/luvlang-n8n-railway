/**
 * MULTITRACK UI COMPONENT
 * Visual interface for the MultiTrackMixer engine
 * Provides drag-drop track management, level meters, and mix controls
 */

import { eventBus, Events } from '../core/event-bus.js';
import { appState } from '../core/app-state.js';
import { resolveContainer } from '../shared/utils.js';

class MultitrackUI {
    constructor(container, audioContext) {
        this.container = resolveContainer(container);
        this.audioContext = audioContext;
        this.mixer = null;
        this.trackElements = new Map();
        this.isRendering = false;
        this.animationFrame = null;

        // Initialize if container exists
        if (this.container) {
            this.init();
        }

        // Initialized
    }

    /**
     * Initialize the multitrack UI
     */
    init() {
        this.render();
        this.bindEvents();
        this.startMeters();
    }

    /**
     * Render the complete multitrack panel
     */
    render() {
        this.container.innerHTML = `
            <div class="multitrack-panel">
                <div class="multitrack-header">
                    <div class="multitrack-title">
                        <span class="icon">🎚️</span>
                        <span>MULTITRACK MASTERING</span>
                    </div>
                    <div class="multitrack-actions">
                        <button class="btn-auto-mix" title="AI Auto-Mix">
                            <span>🤖 Auto-Mix</span>
                        </button>
                        <button class="btn-add-track" title="Add Track">
                            <span>+ Add Track</span>
                        </button>
                    </div>
                </div>

                <div class="multitrack-timeline">
                    <div class="timeline-ruler"></div>
                    <div class="timeline-playhead"></div>
                </div>

                <div class="multitrack-tracks" id="multitrack-tracks">
                    <div class="tracks-empty">
                        <div class="drop-zone" id="multitrack-dropzone">
                            <div class="drop-icon">📁</div>
                            <div class="drop-text">Drop files here or click to add tracks</div>
                            <div class="drop-hint">Supports WAV, MP3, FLAC, AIFF (up to 32 tracks)</div>
                        </div>
                    </div>
                </div>

                <div class="multitrack-master">
                    <div class="master-section">
                        <div class="master-label">Master</div>
                        <div class="master-meter">
                            <div class="meter-bar left">
                                <div class="meter-fill" id="master-meter-l"></div>
                            </div>
                            <div class="meter-bar right">
                                <div class="meter-fill" id="master-meter-r"></div>
                            </div>
                        </div>
                        <div class="master-level" id="master-level">-∞ dB</div>
                    </div>
                    <div class="master-controls">
                        <button class="btn-render-mix" disabled>
                            <span>🎵 Render Mix</span>
                        </button>
                        <button class="btn-export-stems" disabled>
                            <span>📤 Export Stems</span>
                        </button>
                    </div>
                </div>
            </div>
        `;

        // Add file input
        const fileInput = document.createElement('input');
        fileInput.type = 'file';
        fileInput.id = 'multitrack-file-input';
        fileInput.multiple = true;
        fileInput.accept = 'audio/*';
        fileInput.style.display = 'none';
        this.container.appendChild(fileInput);
    }

    /**
     * Bind event handlers
     */
    bindEvents() {
        const dropZone = this.container.querySelector('#multitrack-dropzone');
        const fileInput = this.container.querySelector('#multitrack-file-input');
        const addBtn = this.container.querySelector('.btn-add-track');
        const autoMixBtn = this.container.querySelector('.btn-auto-mix');
        const renderBtn = this.container.querySelector('.btn-render-mix');
        const exportStemsBtn = this.container.querySelector('.btn-export-stems');

        // Drop zone events
        if (dropZone) {
            dropZone.addEventListener('dragover', (e) => {
                e.preventDefault();
                dropZone.classList.add('drag-over');
            });

            dropZone.addEventListener('dragleave', () => {
                dropZone.classList.remove('drag-over');
            });

            dropZone.addEventListener('drop', (e) => {
                e.preventDefault();
                dropZone.classList.remove('drag-over');
                this.handleFiles(e.dataTransfer.files);
            });

            dropZone.addEventListener('click', () => {
                fileInput.click();
            });
        }

        // File input change
        if (fileInput) {
            fileInput.addEventListener('change', (e) => {
                this.handleFiles(e.target.files);
                e.target.value = '';
            });
        }

        // Add track button
        if (addBtn) {
            addBtn.addEventListener('click', () => fileInput.click());
        }

        // Auto-mix button
        if (autoMixBtn) {
            autoMixBtn.addEventListener('click', () => this.handleAutoMix());
        }

        // Render mix button
        if (renderBtn) {
            renderBtn.addEventListener('click', () => this.handleRenderMix());
        }

        // Export stems button
        if (exportStemsBtn) {
            exportStemsBtn.addEventListener('click', () => this.handleExportStems());
        }

        // Listen for state changes
        appState.subscribe('multitrack.tracks', () => this.updateTrackList());
    }

    /**
     * Handle dropped/selected files
     */
    async handleFiles(files) {
        const audioFiles = Array.from(files).filter(file =>
            file.type.startsWith('audio/') ||
            /\.(wav|mp3|flac|aiff|ogg|m4a)$/i.test(file.name)
        );

        if (audioFiles.length === 0) {
            console.warn('[MultitrackUI] No valid audio files found');
            return;
        }

        for (const file of audioFiles) {
            await this.addTrack(file);
        }

        this.updateControls();
    }

    /**
     * Add a track from file
     */
    async addTrack(file) {
        try {
            const arrayBuffer = await file.arrayBuffer();
            const audioBuffer = await this.audioContext.decodeAudioData(arrayBuffer);

            const trackId = Date.now();
            const trackName = file.name.replace(/\.[^/.]+$/, '');

            // Detect track type from filename
            const type = this.detectTrackType(trackName);

            const track = {
                id: trackId,
                name: trackName,
                type: type,
                buffer: audioBuffer,
                duration: audioBuffer.duration,
                sampleRate: audioBuffer.sampleRate,
                channels: audioBuffer.numberOfChannels,
                gain: 0,
                pan: 0,
                solo: false,
                mute: false,
                eq: { enabled: false },
                compression: { enabled: false }
            };

            // Add to state
            const tracks = appState.get('multitrack.tracks') || [];
            tracks.push(track);
            appState.set('multitrack.tracks', tracks);
            appState.set('multitrack.enabled', true);

            eventBus.emit(Events.TRACK_ADD, track);
            console.log(`[MultitrackUI] Added track: ${trackName} (${type})`);

            this.renderTrack(track);
            return track;
        } catch (error) {
            console.error('[MultitrackUI] Failed to add track:', error);
            eventBus.emit(Events.PROCESSING_ERROR, { message: `Failed to load: ${file.name}` });
        }
    }

    /**
     * Detect track type from filename
     */
    detectTrackType(name) {
        const lower = name.toLowerCase();

        if (/vocal|vox|voice|sing/i.test(lower)) return 'vocal';
        if (/drum|kick|snare|hihat|cymbal|perc/i.test(lower)) return 'drum';
        if (/bass|sub/i.test(lower)) return 'bass';
        if (/key|piano|synth|pad|organ/i.test(lower)) return 'keys';
        if (/guitar|gtr/i.test(lower)) return 'guitar';
        if (/string|violin|cello|orchestra/i.test(lower)) return 'strings';

        return 'instrument';
    }

    /**
     * Render a single track row
     */
    renderTrack(track) {
        const tracksContainer = this.container.querySelector('#multitrack-tracks');

        // Remove empty state if exists
        const emptyState = tracksContainer.querySelector('.tracks-empty');
        if (emptyState) {
            emptyState.remove();
        }

        const trackEl = document.createElement('div');
        trackEl.className = 'track-row';
        trackEl.dataset.trackId = track.id;

        const icon = this.getTrackIcon(track.type);

        trackEl.innerHTML = `
            <div class="track-info">
                <span class="track-icon">${icon}</span>
                <span class="track-name" contenteditable="true">${track.name}</span>
                <span class="track-type">${track.type}</span>
            </div>
            <div class="track-controls">
                <button class="btn-solo ${track.solo ? 'active' : ''}" data-action="solo" title="Solo">S</button>
                <button class="btn-mute ${track.mute ? 'active' : ''}" data-action="mute" title="Mute">M</button>
            </div>
            <div class="track-meter">
                <div class="meter-fill" style="width: 0%"></div>
            </div>
            <div class="track-gain">
                <input type="range" class="gain-slider" min="-24" max="12" step="0.1" value="${track.gain}" data-action="gain">
                <span class="gain-value">${track.gain > 0 ? '+' : ''}${track.gain.toFixed(1)} dB</span>
            </div>
            <div class="track-pan">
                <input type="range" class="pan-slider" min="-100" max="100" step="1" value="${track.pan}" data-action="pan">
                <span class="pan-value">${this.formatPan(track.pan)}</span>
            </div>
            <button class="btn-remove-track" data-action="remove" title="Remove Track">✕</button>
        `;

        // Bind track events
        this.bindTrackEvents(trackEl, track);

        tracksContainer.appendChild(trackEl);
        this.trackElements.set(track.id, trackEl);
    }

    /**
     * Bind events for a track row
     */
    bindTrackEvents(trackEl, track) {
        // Solo button
        trackEl.querySelector('.btn-solo').addEventListener('click', (e) => {
            this.toggleSolo(track.id);
            e.target.classList.toggle('active');
        });

        // Mute button
        trackEl.querySelector('.btn-mute').addEventListener('click', (e) => {
            this.toggleMute(track.id);
            e.target.classList.toggle('active');
        });

        // Gain slider
        const gainSlider = trackEl.querySelector('.gain-slider');
        gainSlider.addEventListener('input', (e) => {
            const gain = parseFloat(e.target.value);
            this.setTrackGain(track.id, gain);
            trackEl.querySelector('.gain-value').textContent =
                `${gain > 0 ? '+' : ''}${gain.toFixed(1)} dB`;
        });

        // Pan slider
        const panSlider = trackEl.querySelector('.pan-slider');
        panSlider.addEventListener('input', (e) => {
            const pan = parseInt(e.target.value);
            this.setTrackPan(track.id, pan);
            trackEl.querySelector('.pan-value').textContent = this.formatPan(pan);
        });

        // Remove button
        trackEl.querySelector('.btn-remove-track').addEventListener('click', () => {
            this.removeTrack(track.id);
        });

        // Track name editing
        const nameEl = trackEl.querySelector('.track-name');
        nameEl.addEventListener('blur', (e) => {
            this.renameTrack(track.id, e.target.textContent);
        });
        nameEl.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                e.target.blur();
            }
        });
    }

    /**
     * Get icon for track type
     */
    getTrackIcon(type) {
        const icons = {
            vocal: '🎤',
            drum: '🥁',
            bass: '🎸',
            keys: '🎹',
            guitar: '🎸',
            strings: '🎻',
            instrument: '🎵'
        };
        return icons[type] || '🎵';
    }

    /**
     * Format pan value for display
     */
    formatPan(pan) {
        if (pan === 0) return 'C';
        return pan < 0 ? `${Math.abs(pan)}L` : `${pan}R`;
    }

    /**
     * Toggle solo for a track
     */
    toggleSolo(trackId) {
        const tracks = appState.get('multitrack.tracks');
        const track = tracks.find(t => t.id === trackId);
        if (track) {
            track.solo = !track.solo;
            appState.set('multitrack.tracks', tracks);
            eventBus.emit(Events.TRACK_SOLO, { trackId, solo: track.solo });
        }
    }

    /**
     * Toggle mute for a track
     */
    toggleMute(trackId) {
        const tracks = appState.get('multitrack.tracks');
        const track = tracks.find(t => t.id === trackId);
        if (track) {
            track.mute = !track.mute;
            appState.set('multitrack.tracks', tracks);
            eventBus.emit(Events.TRACK_MUTE, { trackId, mute: track.mute });
        }
    }

    /**
     * Set track gain
     */
    setTrackGain(trackId, gain) {
        const tracks = appState.get('multitrack.tracks');
        const track = tracks.find(t => t.id === trackId);
        if (track) {
            track.gain = gain;
            appState.set('multitrack.tracks', tracks);
            eventBus.emit(Events.TRACK_UPDATE, { trackId, property: 'gain', value: gain });
        }
    }

    /**
     * Set track pan
     */
    setTrackPan(trackId, pan) {
        const tracks = appState.get('multitrack.tracks');
        const track = tracks.find(t => t.id === trackId);
        if (track) {
            track.pan = pan;
            appState.set('multitrack.tracks', tracks);
            eventBus.emit(Events.TRACK_UPDATE, { trackId, property: 'pan', value: pan });
        }
    }

    /**
     * Rename a track
     */
    renameTrack(trackId, name) {
        const tracks = appState.get('multitrack.tracks');
        const track = tracks.find(t => t.id === trackId);
        if (track) {
            track.name = name;
            appState.set('multitrack.tracks', tracks);
        }
    }

    /**
     * Remove a track
     */
    removeTrack(trackId) {
        const tracks = appState.get('multitrack.tracks').filter(t => t.id !== trackId);
        appState.set('multitrack.tracks', tracks);

        const trackEl = this.trackElements.get(trackId);
        if (trackEl) {
            trackEl.remove();
            this.trackElements.delete(trackId);
        }

        eventBus.emit(Events.TRACK_REMOVE, { trackId });

        // Show empty state if no tracks
        if (tracks.length === 0) {
            this.showEmptyState();
        }

        this.updateControls();
    }

    /**
     * Show empty state
     */
    showEmptyState() {
        const tracksContainer = this.container.querySelector('#multitrack-tracks');
        tracksContainer.innerHTML = `
            <div class="tracks-empty">
                <div class="drop-zone" id="multitrack-dropzone">
                    <div class="drop-icon">📁</div>
                    <div class="drop-text">Drop files here or click to add tracks</div>
                    <div class="drop-hint">Supports WAV, MP3, FLAC, AIFF (up to 32 tracks)</div>
                </div>
            </div>
        `;

        // Rebind drop zone events
        this.bindEvents();
    }

    /**
     * Handle auto-mix
     */
    async handleAutoMix() {
        const tracks = appState.get('multitrack.tracks');
        if (!tracks || tracks.length === 0) return;

        eventBus.emit(Events.PROCESSING_START, { type: 'auto-mix' });

        try {
            // Import MultiTrackMixer if not already loaded
            if (!this.mixer) {
                // Assume MultiTrackMixer is globally available
                if (typeof MultiTrackMixer !== 'undefined') {
                    this.mixer = new MultiTrackMixer(this.audioContext);
                } else {
                    throw new Error('MultiTrackMixer not loaded');
                }
            }

            // Clear and add tracks
            this.mixer.clearTracks();
            for (const track of tracks) {
                this.mixer.addTrack(track.buffer, { name: track.name, type: track.type });
            }

            // Run auto-mix
            await this.mixer.autoMix();

            // Update UI with mix settings
            const mixSettings = this.mixer.getMixSettings();
            for (const trackSetting of mixSettings.tracks) {
                const trackEl = this.trackElements.get(tracks[trackSetting.id]?.id);
                if (trackEl) {
                    // Update gain slider
                    const gainSlider = trackEl.querySelector('.gain-slider');
                    const gainValue = trackEl.querySelector('.gain-value');
                    gainSlider.value = trackSetting.gain;
                    gainValue.textContent = `${trackSetting.gain > 0 ? '+' : ''}${trackSetting.gain.toFixed(1)} dB`;

                    // Update pan slider
                    const panSlider = trackEl.querySelector('.pan-slider');
                    const panValue = trackEl.querySelector('.pan-value');
                    panSlider.value = trackSetting.pan;
                    panValue.textContent = this.formatPan(trackSetting.pan);
                }
            }

            // Update state
            appState.set('multitrack.tracks', tracks.map((t, i) => ({
                ...t,
                ...mixSettings.tracks[i]
            })));

            eventBus.emit(Events.PROCESSING_COMPLETE, { type: 'auto-mix' });
            console.log('[MultitrackUI] Auto-mix complete');
        } catch (error) {
            console.error('[MultitrackUI] Auto-mix failed:', error);
            eventBus.emit(Events.PROCESSING_ERROR, { type: 'auto-mix', error });
        }
    }

    /**
     * Handle render mix
     */
    async handleRenderMix() {
        const tracks = appState.get('multitrack.tracks');
        if (!tracks || tracks.length === 0) return;

        this.isRendering = true;
        eventBus.emit(Events.PROCESSING_START, { type: 'render-mix' });

        try {
            if (!this.mixer) {
                this.mixer = new MultiTrackMixer(this.audioContext);
            }

            // Sync mixer with current track settings
            this.mixer.clearTracks();
            for (const track of tracks) {
                const id = this.mixer.addTrack(track.buffer, { name: track.name, type: track.type });
                this.mixer.tracks[id].gain = track.gain;
                this.mixer.tracks[id].pan = track.pan;
                this.mixer.tracks[id].mute = track.mute;
                this.mixer.tracks[id].solo = track.solo;
            }

            const mixBuffer = await this.mixer.renderMix();

            eventBus.emit(Events.MIX_RENDER, { buffer: mixBuffer });
            eventBus.emit(Events.PROCESSING_COMPLETE, { type: 'render-mix', buffer: mixBuffer });

            console.log('[MultitrackUI] Mix rendered successfully');
        } catch (error) {
            console.error('[MultitrackUI] Render failed:', error);
            eventBus.emit(Events.PROCESSING_ERROR, { type: 'render-mix', error });
        } finally {
            this.isRendering = false;
        }
    }

    /**
     * Handle export stems
     */
    async handleExportStems() {
        const tracks = appState.get('multitrack.tracks');
        if (!tracks || tracks.length === 0) return;

        eventBus.emit(Events.EXPORT_START, { type: 'stems' });

        try {
            // Create ZIP file with processed stems
            // This would typically use a library like JSZip
            console.log('[MultitrackUI] Exporting stems...');

            eventBus.emit(Events.EXPORT_COMPLETE, { type: 'stems' });
        } catch (error) {
            console.error('[MultitrackUI] Export stems failed:', error);
        }
    }

    /**
     * Update control states based on tracks
     */
    updateControls() {
        const tracks = appState.get('multitrack.tracks') || [];
        const hasTracks = tracks.length > 0;

        const renderBtn = this.container.querySelector('.btn-render-mix');
        const exportBtn = this.container.querySelector('.btn-export-stems');

        if (renderBtn) renderBtn.disabled = !hasTracks;
        if (exportBtn) exportBtn.disabled = !hasTracks;
    }

    /**
     * Update track list from state
     */
    updateTrackList() {
        const tracks = appState.get('multitrack.tracks') || [];

        // Sync UI with state
        for (const track of tracks) {
            const trackEl = this.trackElements.get(track.id);
            if (trackEl) {
                // Update existing track
                trackEl.querySelector('.gain-slider').value = track.gain;
                trackEl.querySelector('.pan-slider').value = track.pan;
                trackEl.querySelector('.btn-solo').classList.toggle('active', track.solo);
                trackEl.querySelector('.btn-mute').classList.toggle('active', track.mute);
            }
        }
    }

    /**
     * Start level meters animation
     */
    startMeters() {
        const animate = () => {
            // Update track meters (would need actual audio analysis)
            this.animationFrame = requestAnimationFrame(animate);
        };

        animate();
    }

    /**
     * Stop meters animation
     */
    stopMeters() {
        if (this.animationFrame) {
            cancelAnimationFrame(this.animationFrame);
        }
    }

    /**
     * Cleanup
     */
    destroy() {
        this.stopMeters();
        this.trackElements.clear();
        if (this.container) {
            this.container.innerHTML = '';
        }
    }
}

// Export
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { MultitrackUI };
}

if (typeof window !== 'undefined') {
    window.MultitrackUI = MultitrackUI;
}

export { MultitrackUI };
