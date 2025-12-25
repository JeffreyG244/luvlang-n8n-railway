/**
 * INTERACTIVE WAVEFORM SCRUBBER
 * Makes waveform canvas fully interactive with professional DAW-like scrubbing
 *
 * Standard: Matches Pro Tools, Ableton Live, Logic Pro X scrubbing physics
 */

class InteractiveWaveform {
    constructor(canvas, audioElement, audioBuffer, audioContext) {
        this.canvas = canvas;
        this.audioElement = audioElement;
        this.audioBuffer = audioBuffer;
        this.audioContext = audioContext;

        this.isDragging = false;
        this.isHovering = false;

        // Scrubber visual element
        this.scrubberElement = document.getElementById('waveformScrubber');

        // Bind methods
        this.handleMouseDown = this.handleMouseDown.bind(this);
        this.handleMouseMove = this.handleMouseMove.bind(this);
        this.handleMouseUp = this.handleMouseUp.bind(this);
        this.handleMouseLeave = this.handleMouseLeave.bind(this);
        this.handleTouchStart = this.handleTouchStart.bind(this);
        this.handleTouchMove = this.handleTouchMove.bind(this);
        this.handleTouchEnd = this.handleTouchEnd.bind(this);

        this.initialize();
    }

    initialize() {
        // Set cursor style
        this.canvas.style.cursor = 'col-resize';
        this.canvas.style.userSelect = 'none'; // Prevent text selection while dragging

        // Mouse events
        this.canvas.addEventListener('mousedown', this.handleMouseDown);
        this.canvas.addEventListener('mousemove', this.handleMouseMove);
        this.canvas.addEventListener('mouseup', this.handleMouseUp);
        this.canvas.addEventListener('mouseleave', this.handleMouseLeave);

        // Touch events for mobile
        this.canvas.addEventListener('touchstart', this.handleTouchStart, { passive: false });
        this.canvas.addEventListener('touchmove', this.handleTouchMove, { passive: false });
        this.canvas.addEventListener('touchend', this.handleTouchEnd);

        console.log('✅ Interactive Waveform initialized (click or drag to scrub)');
    }

    /**
     * Calculate timestamp from mouse/touch position
     */
    getTimeFromPosition(clientX) {
        const rect = this.canvas.getBoundingClientRect();
        const x = clientX - rect.left;
        const width = rect.width;

        // Clamp to canvas bounds
        const clampedX = Math.max(0, Math.min(x, width));

        // Calculate ratio
        const ratio = clampedX / width;

        // Calculate time
        const time = ratio * this.audioBuffer.duration;

        return {
            time: time,
            ratio: ratio,
            x: clampedX
        };
    }

    /**
     * Seek to position
     */
    seekToPosition(clientX) {
        const { time, ratio } = this.getTimeFromPosition(clientX);

        // Update audio playback position
        if (this.audioElement) {
            this.audioElement.currentTime = time;
        } else if (this.audioContext) {
            // If using Web Audio API source nodes directly
            // (Note: sourceNode.start() can't be used to seek - need to recreate)
            // For now, we rely on audioElement
        }

        // Update scrubber visual position IMMEDIATELY
        this.updateScrubberPosition(ratio);

        // Update playhead visual IMMEDIATELY (don't wait for animation frame)
        this.drawPlayheadImmediate(ratio);

        return time;
    }

    /**
     * Update scrubber visual position
     */
    updateScrubberPosition(ratio) {
        if (this.scrubberElement) {
            const canvasWidth = this.canvas.offsetWidth;
            this.scrubberElement.style.left = (ratio * canvasWidth) + 'px';
        }
    }

    /**
     * Draw playhead line immediately (synchronous)
     */
    drawPlayheadImmediate(ratio) {
        const playheadCanvas = document.getElementById('waveformCanvasPlayhead');
        if (!playheadCanvas) return;

        const ctx = playheadCanvas.getContext('2d');
        const width = playheadCanvas.width;
        const height = playheadCanvas.height;

        // Clear previous playhead
        ctx.clearRect(0, 0, width, height);

        // Draw new playhead
        const x = ratio * width;

        ctx.strokeStyle = '#00ffff';
        ctx.lineWidth = 2;
        ctx.shadowBlur = 10;
        ctx.shadowColor = 'rgba(0, 255, 255, 0.8)';

        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, height);
        ctx.stroke();
    }

    /**
     * Mouse down - start dragging
     */
    handleMouseDown(event) {
        this.isDragging = true;
        this.canvas.style.cursor = 'grabbing';

        // Immediately seek to click position
        const time = this.seekToPosition(event.clientX);

        console.log(`🎯 Scrubbed to ${time.toFixed(2)}s`);

        // Prevent default to avoid text selection
        event.preventDefault();
    }

    /**
     * Mouse move - scrub if dragging
     */
    handleMouseMove(event) {
        if (this.isDragging) {
            this.seekToPosition(event.clientX);
        }

        // Update hover state
        this.isHovering = true;
    }

    /**
     * Mouse up - stop dragging
     */
    handleMouseUp(event) {
        if (this.isDragging) {
            this.isDragging = false;
            this.canvas.style.cursor = 'col-resize';
        }
    }

    /**
     * Mouse leave - stop dragging
     */
    handleMouseLeave(event) {
        if (this.isDragging) {
            this.isDragging = false;
            this.canvas.style.cursor = 'col-resize';
        }
        this.isHovering = false;
    }

    /**
     * Touch start - start dragging
     */
    handleTouchStart(event) {
        event.preventDefault(); // Prevent scrolling

        this.isDragging = true;

        const touch = event.touches[0];
        const time = this.seekToPosition(touch.clientX);

        console.log(`🎯 Scrubbed to ${time.toFixed(2)}s (touch)`);
    }

    /**
     * Touch move - scrub while dragging
     */
    handleTouchMove(event) {
        event.preventDefault(); // Prevent scrolling

        if (this.isDragging) {
            const touch = event.touches[0];
            this.seekToPosition(touch.clientX);
        }
    }

    /**
     * Touch end - stop dragging
     */
    handleTouchEnd(event) {
        this.isDragging = false;
    }

    /**
     * Update audio buffer (when new file is loaded)
     */
    updateAudioBuffer(audioBuffer) {
        this.audioBuffer = audioBuffer;
    }

    /**
     * Destroy - clean up event listeners
     */
    destroy() {
        this.canvas.removeEventListener('mousedown', this.handleMouseDown);
        this.canvas.removeEventListener('mousemove', this.handleMouseMove);
        this.canvas.removeEventListener('mouseup', this.handleMouseUp);
        this.canvas.removeEventListener('mouseleave', this.handleMouseLeave);

        this.canvas.removeEventListener('touchstart', this.handleTouchStart);
        this.canvas.removeEventListener('touchmove', this.handleTouchMove);
        this.canvas.removeEventListener('touchend', this.handleTouchEnd);

        console.log('🔄 Interactive Waveform destroyed');
    }
}

/**
 * Initialize interactive waveform
 * Call this after audio is loaded
 */
function initializeInteractiveWaveform() {
    const canvas = document.getElementById('waveformCanvasStatic');
    const audioElement = document.getElementById('audioElement');

    if (!canvas) {
        console.error('❌ Waveform canvas not found');
        return null;
    }

    if (!audioBuffer) {
        console.warn('⚠️ Audio buffer not loaded yet');
        return null;
    }

    const interactiveWaveform = new InteractiveWaveform(
        canvas,
        audioElement,
        audioBuffer,
        audioContext
    );

    console.log('✅ Waveform is now fully interactive');
    return interactiveWaveform;
}

// Export
if (typeof window !== 'undefined') {
    window.InteractiveWaveform = InteractiveWaveform;
    window.initializeInteractiveWaveform = initializeInteractiveWaveform;
}
