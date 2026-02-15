/* global JSZip */
/**
 * BATCH PROCESSOR
 * Process albums/playlists with consistent settings
 * Ensures LUFS matching, queue management, and ZIP export
 */

import { eventBus, Events } from '../core/event-bus.js';
import { appState } from '../core/app-state.js';
import { resolveContainer, escapeHtml } from '../shared/utils.js';

class BatchProcessor {
    constructor(container, audioContext) {
        this.container = resolveContainer(container);
        this.audioContext = audioContext;
        this.queue = [];
        this.currentIndex = -1;
        this.isProcessing = false;
        this.isPaused = false;
        this.settings = {
            matchLUFS: true,
            targetLUFS: -14,
            maxVariance: 0.5,
            applyEQ: true,
            applyCompression: true,
            applyLimiter: true,
            exportFormat: 'wav',
            bitDepth: 24
        };

        if (this.container) {
            this.init();
        }

        // Initialized
    }

    /**
     * Initialize batch processor UI
     */
    init() {
        this.render();
        this.bindEvents();
    }

    /**
     * Render batch processing panel
     */
    render() {
        this.container.innerHTML = `
            <div class="batch-panel">
                <div class="batch-header">
                    <div class="batch-title">
                        <span class="icon">📦</span>
                        <span>BATCH PROCESSING</span>
                    </div>
                    <button class="btn-clear-queue" title="Clear Queue">Clear Queue</button>
                </div>

                <div class="batch-settings">
                    <div class="setting-row">
                        <label>
                            <input type="checkbox" id="batch-match-lufs" checked>
                            Match LUFS:
                        </label>
                        <input type="number" id="batch-target-lufs" value="-14" min="-24" max="-6" step="0.1">
                        <span class="unit">LUFS</span>
                    </div>
                    <div class="setting-row">
                        <label>
                            <input type="checkbox" id="batch-apply-eq" checked>
                            Apply EQ
                        </label>
                        <label>
                            <input type="checkbox" id="batch-apply-comp" checked>
                            Apply Compression
                        </label>
                    </div>
                    <div class="setting-row">
                        <label>Max Variance:</label>
                        <input type="number" id="batch-variance" value="0.5" min="0.1" max="2" step="0.1">
                        <span class="unit">dB</span>
                    </div>
                </div>

                <div class="batch-progress">
                    <div class="progress-info">
                        <span class="queue-count">Queue (<span id="batch-count">0</span> tracks)</span>
                        <span class="progress-percent" id="batch-progress-percent">0%</span>
                    </div>
                    <div class="progress-bar">
                        <div class="progress-fill" id="batch-progress-bar"></div>
                    </div>
                </div>

                <div class="batch-queue" id="batch-queue">
                    <div class="queue-empty">
                        <div class="drop-zone" id="batch-dropzone"
                             role="button" tabindex="0"
                             aria-label="Drop audio files here or click to browse">
                            <div class="drop-icon">📁</div>
                            <div class="drop-text">Drop album/playlist files here</div>
                            <div class="drop-hint">Process multiple files with consistent settings</div>
                        </div>
                    </div>
                </div>

                <div class="batch-controls">
                    <button class="btn-start-batch" id="btn-start-batch" disabled>
                        <span>▶ Start Batch</span>
                    </button>
                    <button class="btn-pause-batch" id="btn-pause-batch" disabled>
                        <span>⏸ Pause</span>
                    </button>
                    <button class="btn-export-zip" id="btn-export-zip" disabled>
                        <span>📥 Export All as ZIP</span>
                    </button>
                </div>
            </div>
        `;

        // Add hidden file input
        const fileInput = document.createElement('input');
        fileInput.type = 'file';
        fileInput.id = 'batch-file-input';
        fileInput.multiple = true;
        fileInput.accept = 'audio/*';
        fileInput.style.display = 'none';
        this.container.appendChild(fileInput);
    }

    /**
     * Bind event handlers
     */
    bindEvents() {
        const dropZone = this.container.querySelector('#batch-dropzone');
        const fileInput = this.container.querySelector('#batch-file-input');
        const clearBtn = this.container.querySelector('.btn-clear-queue');
        const startBtn = this.container.querySelector('#btn-start-batch');
        const pauseBtn = this.container.querySelector('#btn-pause-batch');
        const exportBtn = this.container.querySelector('#btn-export-zip');

        // Settings inputs
        const matchLufsCheckbox = this.container.querySelector('#batch-match-lufs');
        const targetLufsInput = this.container.querySelector('#batch-target-lufs');
        const applyEqCheckbox = this.container.querySelector('#batch-apply-eq');
        const applyCompCheckbox = this.container.querySelector('#batch-apply-comp');
        const varianceInput = this.container.querySelector('#batch-variance');

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
                this.addFiles(e.dataTransfer.files);
            });

            dropZone.addEventListener('click', () => fileInput.click());

            dropZone.addEventListener('keydown', (e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    fileInput.click();
                }
            });
        }

        // File input
        if (fileInput) {
            fileInput.addEventListener('change', (e) => {
                this.addFiles(e.target.files);
                e.target.value = '';
            });
        }

        // Control buttons
        if (clearBtn) clearBtn.addEventListener('click', () => this.clearQueue());
        if (startBtn) startBtn.addEventListener('click', () => this.startProcessing());
        if (pauseBtn) pauseBtn.addEventListener('click', () => this.togglePause());
        if (exportBtn) exportBtn.addEventListener('click', () => this.exportAsZip());

        // Settings
        if (matchLufsCheckbox) {
            matchLufsCheckbox.addEventListener('change', (e) => {
                this.settings.matchLUFS = e.target.checked;
            });
        }
        if (targetLufsInput) {
            targetLufsInput.addEventListener('change', (e) => {
                this.settings.targetLUFS = parseFloat(e.target.value);
            });
        }
        if (applyEqCheckbox) {
            applyEqCheckbox.addEventListener('change', (e) => {
                this.settings.applyEQ = e.target.checked;
            });
        }
        if (applyCompCheckbox) {
            applyCompCheckbox.addEventListener('change', (e) => {
                this.settings.applyCompression = e.target.checked;
            });
        }
        if (varianceInput) {
            varianceInput.addEventListener('change', (e) => {
                this.settings.maxVariance = parseFloat(e.target.value);
            });
        }
    }

    /**
     * Add files to queue
     */
    async addFiles(files) {
        const audioFiles = Array.from(files).filter(file =>
            file.type.startsWith('audio/') ||
            /\.(wav|mp3|flac|aiff|ogg|m4a)$/i.test(file.name)
        );

        for (const file of audioFiles) {
            await this.addToQueue(file);
        }

        this.updateQueueUI();
        this.updateControls();
    }

    /**
     * Add single file to queue
     */
    async addToQueue(file) {
        try {
            const arrayBuffer = await file.arrayBuffer();
            const audioBuffer = await this.audioContext.decodeAudioData(arrayBuffer);

            const item = {
                id: Date.now() + Math.random(),
                file: file,
                name: file.name.replace(/\.[^/.]+$/, ''),
                buffer: audioBuffer,
                duration: audioBuffer.duration,
                status: 'queued', // 'queued', 'processing', 'done', 'error'
                progress: 0,
                lufs: null,
                processedBuffer: null,
                error: null
            };

            this.queue.push(item);
            eventBus.emit(Events.BATCH_ADD, item);

            return item;
        } catch (error) {
            console.error('[BatchProcessor] Failed to add file:', error);
            return null;
        }
    }

    /**
     * Update queue UI display
     */
    updateQueueUI() {
        const queueContainer = this.container.querySelector('#batch-queue');
        const countEl = this.container.querySelector('#batch-count');

        if (countEl) {
            countEl.textContent = this.queue.length;
        }

        if (!queueContainer) return;

        if (this.queue.length === 0) {
            queueContainer.innerHTML = `
                <div class="queue-empty">
                    <div class="drop-zone" id="batch-dropzone"
                         role="button" tabindex="0"
                         aria-label="Drop audio files here or click to browse">
                        <div class="drop-icon">📁</div>
                        <div class="drop-text">Drop album/playlist files here</div>
                        <div class="drop-hint">Process multiple files with consistent settings</div>
                    </div>
                </div>
            `;
            this.bindEvents();
            return;
        }

        queueContainer.innerHTML = this.queue.map((item, _index) => `
            <div class="queue-item ${item.status}" data-id="${item.id}">
                <div class="item-status">
                    ${this.getStatusIcon(item.status)}
                </div>
                <div class="item-info">
                    <span class="item-name">${escapeHtml(item.name)}</span>
                    <span class="item-duration">${this.formatDuration(item.duration)}</span>
                </div>
                <div class="item-lufs">
                    ${item.lufs !== null ? `${item.lufs.toFixed(1)} LUFS` : '-'}
                </div>
                <div class="item-progress-bar">
                    <div class="item-progress-fill" style="width: ${item.progress}%"></div>
                </div>
                <div class="item-status-text">
                    ${this.getStatusText(item)}
                </div>
                <button class="btn-remove-item" data-id="${item.id}">✕</button>
            </div>
        `).join('');

        // Bind remove buttons
        queueContainer.querySelectorAll('.btn-remove-item').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const id = parseFloat(e.target.dataset.id);
                this.removeFromQueue(id);
            });
        });
    }

    /**
     * Get status icon
     */
    getStatusIcon(status) {
        switch (status) {
            case 'queued': return '○';
            case 'processing': return '●';
            case 'done': return '✓';
            case 'error': return '✗';
            default: return '○';
        }
    }

    /**
     * Get status text
     */
    getStatusText(item) {
        switch (item.status) {
            case 'queued': return 'Queued';
            case 'processing': return `Processing... ${item.progress}%`;
            case 'done': return 'Done';
            case 'error': return `Error: ${escapeHtml(item.error || 'Unknown')}`;
            default: return '';
        }
    }

    /**
     * Format duration in MM:SS
     */
    formatDuration(seconds) {
        const mins = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    }

    /**
     * Remove item from queue
     */
    removeFromQueue(id) {
        const index = this.queue.findIndex(item => item.id === id);
        if (index > -1) {
            this.queue.splice(index, 1);
            this.updateQueueUI();
            this.updateControls();
        }
    }

    /**
     * Clear entire queue
     */
    clearQueue() {
        if (this.isProcessing) {
            this.stopProcessing();
        }
        this.queue = [];
        this.currentIndex = -1;
        this.updateQueueUI();
        this.updateControls();
        // Queue cleared
    }

    /**
     * Start batch processing
     */
    async startProcessing() {
        if (this.queue.length === 0) return;

        this.isProcessing = true;
        this.isPaused = false;
        this.currentIndex = 0;

        eventBus.emit(Events.BATCH_START, { total: this.queue.length });
        this.updateControls();


        // First pass: Analyze all files for LUFS
        await this.analyzeAllFiles();

        // Second pass: Process all files
        await this.processAllFiles();

        this.isProcessing = false;
        eventBus.emit(Events.BATCH_COMPLETE, {
            total: this.queue.length,
            successful: this.queue.filter(i => i.status === 'done').length
        });

        this.updateControls();
        // Batch complete
    }

    /**
     * Analyze all files for LUFS
     */
    async analyzeAllFiles() {
        // Analyzing LUFS for all files

        for (let i = 0; i < this.queue.length; i++) {
            if (this.isPaused) {
                await this.waitForResume();
            }

            const item = this.queue[i];
            item.status = 'processing';
            item.progress = 25;
            this.updateQueueUI();

            try {
                item.lufs = await this.measureLUFS(item.buffer);
                item.progress = 50;
                this.updateQueueUI();
            } catch (error) {
                item.status = 'error';
                item.error = 'Analysis failed';
                console.error(`[BatchProcessor] Failed to analyze ${item.name}:`, error);
            }
        }

        // Log LUFS summary
        const lufsValues = this.queue
            .filter(i => i.lufs !== null)
            .map(i => i.lufs);

        if (lufsValues.length > 0) {
            const _avgLufs = lufsValues.reduce((a, b) => a + b, 0) / lufsValues.length;
            const _variance = Math.max(...lufsValues) - Math.min(...lufsValues);
        }
    }

    /**
     * Process all files with consistent settings
     */
    async processAllFiles() {
        // Processing all files

        for (let i = 0; i < this.queue.length; i++) {
            if (this.isPaused) {
                await this.waitForResume();
            }

            const item = this.queue[i];
            if (item.status === 'error') continue;

            item.status = 'processing';
            this.currentIndex = i;

            try {
                // Calculate gain adjustment for LUFS matching
                let gainAdjustment = 0;
                if (this.settings.matchLUFS && item.lufs !== null) {
                    gainAdjustment = this.settings.targetLUFS - item.lufs;
                }

                // Process the audio
                item.progress = 75;
                this.updateQueueUI();

                item.processedBuffer = await this.processAudio(item.buffer, gainAdjustment);
                item.progress = 100;
                item.status = 'done';

                eventBus.emit(Events.BATCH_ITEM_COMPLETE, {
                    index: i,
                    item: item,
                    total: this.queue.length
                });

            } catch (error) {
                item.status = 'error';
                item.error = error.message;
                console.error(`[BatchProcessor] Failed to process ${item.name}:`, error);
            }

            this.updateQueueUI();
            this.updateProgress();
        }
    }

    /**
     * Measure integrated LUFS
     */
    async measureLUFS(audioBuffer) {
        const channelData = audioBuffer.numberOfChannels > 1
            ? this.mixToMono(audioBuffer)
            : audioBuffer.getChannelData(0);

        const sampleRate = audioBuffer.sampleRate;
        const blockSize = Math.floor(sampleRate * 0.4); // 400ms blocks
        const overlap = Math.floor(sampleRate * 0.1); // 100ms overlap

        let sumSquaredLoudness = 0;
        let blockCount = 0;

        for (let i = 0; i < channelData.length - blockSize; i += (blockSize - overlap)) {
            let blockSum = 0;

            for (let j = 0; j < blockSize; j++) {
                blockSum += channelData[i + j] ** 2;
            }

            const blockLoudness = blockSum / blockSize;
            const blockLufs = -0.691 + 10 * Math.log10(blockLoudness + 1e-10);

            // Gate at -70 LUFS
            if (blockLufs > -70) {
                sumSquaredLoudness += blockLoudness;
                blockCount++;
            }
        }

        if (blockCount === 0) return -70;

        const averageLoudness = sumSquaredLoudness / blockCount;
        const integratedLufs = -0.691 + 10 * Math.log10(averageLoudness + 1e-10);

        return integratedLufs;
    }

    /**
     * Mix stereo to mono
     */
    mixToMono(audioBuffer) {
        const left = audioBuffer.getChannelData(0);
        const right = audioBuffer.getChannelData(1);
        const mono = new Float32Array(left.length);

        for (let i = 0; i < left.length; i++) {
            mono[i] = (left[i] + right[i]) / 2;
        }

        return mono;
    }

    /**
     * Process audio with current settings
     */
    async processAudio(inputBuffer, gainAdjustment) {
        // Create offline context for processing
        const offlineContext = new OfflineAudioContext(
            inputBuffer.numberOfChannels,
            inputBuffer.length,
            inputBuffer.sampleRate
        );

        // Create source
        const source = offlineContext.createBufferSource();
        source.buffer = inputBuffer;

        // Create gain node for LUFS adjustment
        const gainNode = offlineContext.createGain();
        gainNode.gain.value = Math.pow(10, gainAdjustment / 20);

        // Create processing chain
        let lastNode = source;

        // Connect gain
        lastNode.connect(gainNode);
        lastNode = gainNode;

        // Apply EQ if enabled
        if (this.settings.applyEQ) {
            const eqState = appState.get('eq');
            if (eqState && eqState.enabled && eqState.bands) {
                for (const band of eqState.bands) {
                    const filter = offlineContext.createBiquadFilter();
                    filter.type = band.type;
                    filter.frequency.value = band.frequency;
                    filter.gain.value = band.gain;
                    filter.Q.value = band.q || 1.0;

                    lastNode.connect(filter);
                    lastNode = filter;
                }
            }
        }

        // Apply compression if enabled
        if (this.settings.applyCompression) {
            const dynamics = appState.get('dynamics.compressor');
            if (dynamics && dynamics.enabled) {
                const compressor = offlineContext.createDynamicsCompressor();
                compressor.threshold.value = dynamics.threshold;
                compressor.ratio.value = dynamics.ratio;
                compressor.attack.value = dynamics.attack / 1000;
                compressor.release.value = dynamics.release / 1000;
                compressor.knee.value = dynamics.knee || 6;

                lastNode.connect(compressor);
                lastNode = compressor;
            }
        }

        // Apply limiter if enabled
        if (this.settings.applyLimiter) {
            const limiter = appState.get('dynamics.limiter');
            if (limiter && limiter.enabled) {
                const limiterNode = offlineContext.createDynamicsCompressor();
                limiterNode.threshold.value = limiter.ceiling || -0.3;
                limiterNode.ratio.value = 20;
                limiterNode.attack.value = 0.001;
                limiterNode.release.value = (limiter.release || 50) / 1000;

                lastNode.connect(limiterNode);
                lastNode = limiterNode;
            }
        }

        // Connect to destination
        lastNode.connect(offlineContext.destination);

        // Start and render
        source.start(0);
        const processedBuffer = await offlineContext.startRendering();

        return processedBuffer;
    }

    /**
     * Toggle pause state
     */
    togglePause() {
        this.isPaused = !this.isPaused;

        const pauseBtn = this.container.querySelector('#btn-pause-batch');
        if (pauseBtn) {
            pauseBtn.innerHTML = this.isPaused
                ? '<span>▶ Resume</span>'
                : '<span>⏸ Pause</span>';
        }
    }

    /**
     * Wait for resume
     */
    waitForResume() {
        return new Promise(resolve => {
            const checkResume = () => {
                if (!this.isPaused) {
                    resolve();
                } else {
                    setTimeout(checkResume, 100);
                }
            };
            checkResume();
        });
    }

    /**
     * Stop processing
     */
    stopProcessing() {
        this.isProcessing = false;
        this.isPaused = false;
    }

    /**
     * Update overall progress
     */
    updateProgress() {
        const done = this.queue.filter(i => i.status === 'done').length;
        const total = this.queue.length;
        const percent = total > 0 ? Math.round((done / total) * 100) : 0;

        const progressBar = this.container.querySelector('#batch-progress-bar');
        const progressPercent = this.container.querySelector('#batch-progress-percent');

        if (progressBar) progressBar.style.width = `${percent}%`;
        if (progressPercent) progressPercent.textContent = `${percent}%`;

        eventBus.emit(Events.BATCH_PROGRESS, { done, total, percent });
    }

    /**
     * Update control button states
     */
    updateControls() {
        const startBtn = this.container.querySelector('#btn-start-batch');
        const pauseBtn = this.container.querySelector('#btn-pause-batch');
        const exportBtn = this.container.querySelector('#btn-export-zip');

        const hasItems = this.queue.length > 0;
        const _allDone = this.queue.every(i => i.status === 'done' || i.status === 'error');
        const hasDone = this.queue.some(i => i.status === 'done');

        if (startBtn) {
            startBtn.disabled = !hasItems || this.isProcessing;
        }

        if (pauseBtn) {
            pauseBtn.disabled = !this.isProcessing;
        }

        if (exportBtn) {
            exportBtn.disabled = !hasDone;
        }
    }

    /**
     * Export all processed files as ZIP
     */
    async exportAsZip() {
        const processedItems = this.queue.filter(i => i.status === 'done' && i.processedBuffer);

        if (processedItems.length === 0) {
            console.warn('[BatchProcessor] No processed files to export');
            return;
        }

        eventBus.emit(Events.EXPORT_START, { type: 'batch-zip', count: processedItems.length });

        try {
            // Check if JSZip is available
            if (typeof JSZip === 'undefined') {
                // Fallback: export individually
                // JSZip not available, exporting individually
                for (const item of processedItems) {
                    await this.exportSingleFile(item);
                }
                return;
            }

            const zip = new JSZip();

            for (const item of processedItems) {
                const wavBlob = await this.bufferToWav(item.processedBuffer);
                zip.file(`${item.name}_mastered.wav`, wavBlob);
            }

            const zipBlob = await zip.generateAsync({
                type: 'blob',
                compression: 'DEFLATE',
                compressionOptions: { level: 6 }
            });

            // Create download link
            const url = URL.createObjectURL(zipBlob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `mastered_album_${Date.now()}.zip`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);

            eventBus.emit(Events.EXPORT_COMPLETE, { type: 'batch-zip' });
            // Exported ZIP

        } catch (error) {
            console.error('[BatchProcessor] ZIP export failed:', error);
            eventBus.emit(Events.EXPORT_ERROR, { type: 'batch-zip', error });
        }
    }

    /**
     * Export single file
     */
    async exportSingleFile(item) {
        const wavBlob = await this.bufferToWav(item.processedBuffer);

        const url = URL.createObjectURL(wavBlob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${item.name}_mastered.wav`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }

    /**
     * Convert AudioBuffer to WAV Blob
     */
    async bufferToWav(audioBuffer) {
        const numChannels = audioBuffer.numberOfChannels;
        const sampleRate = audioBuffer.sampleRate;
        const format = 1; // PCM
        const bitDepth = this.settings.bitDepth;
        const bytesPerSample = bitDepth / 8;

        const length = audioBuffer.length;
        const buffer = new ArrayBuffer(44 + length * numChannels * bytesPerSample);
        const view = new DataView(buffer);

        // Write WAV header
        const writeString = (offset, string) => {
            for (let i = 0; i < string.length; i++) {
                view.setUint8(offset + i, string.charCodeAt(i));
            }
        };

        writeString(0, 'RIFF');
        view.setUint32(4, 36 + length * numChannels * bytesPerSample, true);
        writeString(8, 'WAVE');
        writeString(12, 'fmt ');
        view.setUint32(16, 16, true);
        view.setUint16(20, format, true);
        view.setUint16(22, numChannels, true);
        view.setUint32(24, sampleRate, true);
        view.setUint32(28, sampleRate * numChannels * bytesPerSample, true);
        view.setUint16(32, numChannels * bytesPerSample, true);
        view.setUint16(34, bitDepth, true);
        writeString(36, 'data');
        view.setUint32(40, length * numChannels * bytesPerSample, true);

        // Write audio data
        const channels = [];
        for (let i = 0; i < numChannels; i++) {
            channels.push(audioBuffer.getChannelData(i));
        }

        let offset = 44;
        const maxValue = Math.pow(2, bitDepth - 1) - 1;

        for (let i = 0; i < length; i++) {
            for (let ch = 0; ch < numChannels; ch++) {
                const sample = Math.max(-1, Math.min(1, channels[ch][i]));
                const intSample = Math.round(sample * maxValue);

                if (bitDepth === 16) {
                    view.setInt16(offset, intSample, true);
                    offset += 2;
                } else if (bitDepth === 24) {
                    view.setInt8(offset, intSample & 0xFF);
                    view.setInt8(offset + 1, (intSample >> 8) & 0xFF);
                    view.setInt8(offset + 2, (intSample >> 16) & 0xFF);
                    offset += 3;
                }
            }
        }

        return new Blob([buffer], { type: 'audio/wav' });
    }

    /**
     * Get queue status
     */
    getStatus() {
        return {
            queue: this.queue.map(item => ({
                name: item.name,
                status: item.status,
                lufs: item.lufs,
                progress: item.progress
            })),
            isProcessing: this.isProcessing,
            isPaused: this.isPaused,
            currentIndex: this.currentIndex,
            settings: { ...this.settings }
        };
    }

    /**
     * Cleanup
     */
    destroy() {
        this.stopProcessing();
        this.queue = [];
        if (this.container) {
            this.container.innerHTML = '';
        }
    }
}

// Export
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { BatchProcessor };
}

if (typeof window !== 'undefined') {
    window.BatchProcessor = BatchProcessor;
}

export { BatchProcessor };
