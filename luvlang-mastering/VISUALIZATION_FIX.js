/* ═══════════════════════════════════════════════════════════════════════════
   VISUALIZATION FIX & INITIALIZATION SYSTEM
   Ensures all visualizations display properly with idle states
   ═══════════════════════════════════════════════════════════════════════════ */

(function() {
    'use strict';

    console.log('🎨 VISUALIZATION FIX: Initializing...');

    // Wait for DOM to be ready
    function initVisualizations() {
        const spectrumCanvas = document.getElementById('spectrumCanvas');
        const leftMeterCanvas = document.getElementById('leftMeterCanvas');
        const rightMeterCanvas = document.getElementById('rightMeterCanvas');
        const goniometerCanvas = document.getElementById('goniometerCanvas');
        const correlationHeatmapCanvas = document.getElementById('correlationHeatmapCanvas');
        const correlationLegendCanvas = document.getElementById('correlationLegendCanvas');

        // ═══ IDLE STATE: SPECTRUM ANALYZER ═══
        function drawIdleSpectrum(canvas) {
            if (!canvas) return;

            const ctx = canvas.getContext('2d');
            const width = canvas.offsetWidth;
            const height = canvas.offsetHeight;

            // Set canvas resolution
            canvas.width = width * window.devicePixelRatio;
            canvas.height = height * window.devicePixelRatio;
            ctx.scale(window.devicePixelRatio, window.devicePixelRatio);

            // Clear with premium dark gradient
            const bgGradient = ctx.createLinearGradient(0, 0, 0, height);
            bgGradient.addColorStop(0, '#000000');
            bgGradient.addColorStop(0.5, '#0a0a0f');
            bgGradient.addColorStop(1, '#000000');
            ctx.fillStyle = bgGradient;
            ctx.fillRect(0, 0, width, height);

            // Draw frequency grid
            const frequencies = [20, 50, 100, 200, 500, 1000, 2000, 5000, 10000, 20000];
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
            ctx.lineWidth = 1;
            ctx.font = '10px -apple-system, sans-serif';
            ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
            ctx.textAlign = 'center';

            for (const freq of frequencies) {
                const x = width * (Math.log10(freq) - Math.log10(20)) / (Math.log10(20000) - Math.log10(20));

                // Vertical grid line
                ctx.beginPath();
                ctx.moveTo(x, 30);
                ctx.lineTo(x, height - 30);
                ctx.stroke();

                // Frequency label
                let label = freq >= 1000 ? (freq / 1000).toFixed(0) + 'k' : freq.toString();
                ctx.fillText(label, x, height - 10);
            }

            // Draw dB grid
            const dbLevels = [0, -12, -24, -36, -48, -60, -72];
            ctx.textAlign = 'right';

            for (const db of dbLevels) {
                const y = 30 + ((Math.abs(db) / 72) * (height - 60));

                ctx.strokeStyle = db === 0 ? 'rgba(255, 100, 100, 0.2)' : 'rgba(255, 255, 255, 0.05)';
                ctx.beginPath();
                ctx.moveTo(40, y);
                ctx.lineTo(width - 20, y);
                ctx.stroke();

                // dB label
                ctx.fillStyle = db === 0 ? 'rgba(255, 100, 100, 0.7)' : 'rgba(255, 255, 255, 0.4)';
                ctx.fillText(db.toString(), 35, y + 3);
            }

            // Draw "READY" text
            ctx.font = 'bold 16px -apple-system, sans-serif';
            ctx.fillStyle = 'rgba(0, 212, 255, 0.5)';
            ctx.textAlign = 'center';
            ctx.fillText('AWAITING AUDIO', width / 2, height / 2);

            ctx.font = '12px -apple-system, sans-serif';
            ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
            ctx.fillText('Upload audio to see spectrum analysis', width / 2, height / 2 + 25);
        }

        // ═══ IDLE STATE: STEREO METERS ═══
        function drawIdleMeter(canvas, label) {
            if (!canvas) {
                console.warn('⚠️ Meter canvas not found:', label);
                return;
            }

            const ctx = canvas.getContext('2d');

            // Use actual canvas dimensions (not offsetWidth for these small meters)
            const width = canvas.width;
            const height = canvas.height;

            console.log(`Drawing idle meter ${label}: ${width}x${height}`);

            // Clear with black background
            ctx.fillStyle = '#000000';
            ctx.fillRect(0, 0, width, height);

            // Draw meter background gradient
            const gradient = ctx.createLinearGradient(0, 0, 0, height);
            gradient.addColorStop(0, 'rgba(255, 0, 0, 0.15)');    // Red at top
            gradient.addColorStop(0.3, 'rgba(255, 170, 0, 0.15)'); // Yellow
            gradient.addColorStop(0.6, 'rgba(0, 255, 136, 0.15)'); // Green
            gradient.addColorStop(1, 'rgba(0, 255, 136, 0.08)');   // Dark green at bottom

            ctx.fillStyle = gradient;
            ctx.fillRect(15, 0, 30, height);

            // Draw scale lines
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
            ctx.lineWidth = 1;

            for (let i = 0; i <= 10; i++) {
                const y = (height / 10) * i;
                ctx.beginPath();
                ctx.moveTo(10, y);
                ctx.lineTo(50, y);
                ctx.stroke();
            }

            // Draw border
            ctx.strokeStyle = 'rgba(0, 212, 255, 0.3)';
            ctx.lineWidth = 1;
            ctx.strokeRect(15, 0, 30, height);
        }

        // ═══ IDLE STATE: GONIOMETER ═══
        function drawIdleGoniometer(canvas) {
            if (!canvas) {
                console.warn('⚠️ Goniometer canvas not found');
                return;
            }

            const ctx = canvas.getContext('2d');
            const width = canvas.width;
            const height = canvas.height;

            console.log(`Drawing idle goniometer: ${width}x${height}`);
            const centerX = width / 2;
            const centerY = height / 2;
            const radius = Math.min(width, height) / 2 - 10;

            // Clear
            ctx.fillStyle = '#000000';
            ctx.fillRect(0, 0, width, height);

            // Draw concentric circles
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
            ctx.lineWidth = 1;

            for (let i = 1; i <= 4; i++) {
                ctx.beginPath();
                ctx.arc(centerX, centerY, (radius / 4) * i, 0, Math.PI * 2);
                ctx.stroke();
            }

            // Draw crosshairs
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
            ctx.lineWidth = 1;

            // Horizontal
            ctx.beginPath();
            ctx.moveTo(centerX - radius, centerY);
            ctx.lineTo(centerX + radius, centerY);
            ctx.stroke();

            // Vertical
            ctx.beginPath();
            ctx.moveTo(centerX, centerY - radius);
            ctx.lineTo(centerX, centerY + radius);
            ctx.stroke();

            // Draw 45-degree lines (stereo field)
            ctx.strokeStyle = 'rgba(0, 212, 255, 0.2)';
            ctx.lineWidth = 2;

            // Top-right to bottom-left (normal stereo)
            ctx.beginPath();
            ctx.moveTo(centerX - radius * 0.707, centerY - radius * 0.707);
            ctx.lineTo(centerX + radius * 0.707, centerY + radius * 0.707);
            ctx.stroke();

            // Border circle
            ctx.strokeStyle = 'rgba(0, 212, 255, 0.3)';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
            ctx.stroke();

            // Draw "READY" text
            ctx.font = 'bold 11px -apple-system, sans-serif';
            ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
            ctx.textAlign = 'center';
            ctx.fillText('READY', centerX, centerY);
        }

        // ═══ IDLE STATE: CORRELATION HEATMAP ═══
        function drawIdleHeatmap(canvas) {
            if (!canvas) return;

            const ctx = canvas.getContext('2d');
            const width = canvas.offsetWidth;
            const height = canvas.offsetHeight;

            // Set canvas resolution
            canvas.width = width * window.devicePixelRatio;
            canvas.height = height * window.devicePixelRatio;
            ctx.scale(window.devicePixelRatio, window.devicePixelRatio);

            // Clear with dark gradient
            const bgGradient = ctx.createLinearGradient(0, 0, 0, height);
            bgGradient.addColorStop(0, '#000000');
            bgGradient.addColorStop(1, '#0a0a0f');
            ctx.fillStyle = bgGradient;
            ctx.fillRect(0, 0, width, height);

            // Draw frequency labels at bottom
            const frequencies = [20, 50, 100, 200, 500, '1k', '2k', '5k', '10k', '20k'];
            ctx.font = '9px -apple-system, sans-serif';
            ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
            ctx.textAlign = 'center';

            for (let i = 0; i < frequencies.length; i++) {
                const x = (width / frequencies.length) * (i + 0.5);
                ctx.fillText(frequencies[i].toString(), x, height - 5);
            }

            // Draw "AWAITING AUDIO" text
            ctx.font = 'bold 14px -apple-system, sans-serif';
            ctx.fillStyle = 'rgba(0, 212, 255, 0.5)';
            ctx.textAlign = 'center';
            ctx.fillText('FREQUENCY-DOMAIN CORRELATION READY', width / 2, height / 2 - 10);

            ctx.font = '10px -apple-system, sans-serif';
            ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
            ctx.fillText('Play audio to see mono compatibility analysis', width / 2, height / 2 + 10);
        }

        // ═══ DRAW CORRELATION LEGEND ═══
        function drawCorrelationLegend(canvas) {
            if (!canvas) return;

            const ctx = canvas.getContext('2d');
            const width = canvas.offsetWidth;
            const height = canvas.offsetHeight;

            canvas.width = width * window.devicePixelRatio;
            canvas.height = height * window.devicePixelRatio;
            ctx.scale(window.devicePixelRatio, window.devicePixelRatio);

            // Draw gradient legend (-1 to +1)
            const gradient = ctx.createLinearGradient(0, 0, width, 0);
            gradient.addColorStop(0, '#ff0066');    // -1 (out of phase)
            gradient.addColorStop(0.5, '#444444');  // 0 (uncorrelated)
            gradient.addColorStop(1, '#00ff88');    // +1 (in phase)

            ctx.fillStyle = gradient;
            ctx.fillRect(0, 0, width, height);

            // Draw labels
            ctx.font = '9px -apple-system, sans-serif';
            ctx.fillStyle = '#ffffff';
            ctx.textAlign = 'left';
            ctx.fillText('-1 (Out of Phase)', 5, height - 2);

            ctx.textAlign = 'center';
            ctx.fillText('0 (Uncorrelated)', width / 2, height - 2);

            ctx.textAlign = 'right';
            ctx.fillText('+1 (Perfect Mono)', width - 5, height - 2);
        }

        // ═══ INITIALIZE ALL VISUALIZATIONS ═══
        console.log('🎨 Drawing idle states for all visualizations...');

        if (spectrumCanvas) {
            drawIdleSpectrum(spectrumCanvas);
            console.log('   ✅ Spectrum Analyzer ready');
        }

        if (leftMeterCanvas) {
            drawIdleMeter(leftMeterCanvas, 'L');
            console.log('   ✅ Left Meter ready');
        }

        if (rightMeterCanvas) {
            drawIdleMeter(rightMeterCanvas, 'R');
            console.log('   ✅ Right Meter ready');
        }

        if (goniometerCanvas) {
            drawIdleGoniometer(goniometerCanvas);
            console.log('   ✅ Goniometer ready');
        }

        if (correlationHeatmapCanvas) {
            drawIdleHeatmap(correlationHeatmapCanvas);
            console.log('   ✅ Correlation Heatmap ready');
        }

        if (correlationLegendCanvas) {
            drawCorrelationLegend(correlationLegendCanvas);
            console.log('   ✅ Correlation Legend ready');
        }

        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log('✅ ALL VISUALIZATIONS INITIALIZED - Ready for audio');
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

        // Make visualization panels more visible
        const vizPanels = document.querySelectorAll('.viz-panel');
        vizPanels.forEach(panel => {
            panel.style.opacity = '1';
            panel.style.visibility = 'visible';
            panel.style.display = 'block';
        });
    }

    // Run on DOM ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initVisualizations);
    } else {
        // DOM already loaded
        initVisualizations();
    }

    // Run multiple times at different intervals to ensure it catches the canvases
    setTimeout(initVisualizations, 100);   // Quick check
    setTimeout(initVisualizations, 500);   // After scripts load
    setTimeout(initVisualizations, 1000);  // Extra safety
    setTimeout(initVisualizations, 2000);  // Final check

    // Expose function globally for manual refresh
    window.refreshVisualizations = initVisualizations;

    console.log('💡 TIP: Call window.refreshVisualizations() to redraw idle states');

})();
