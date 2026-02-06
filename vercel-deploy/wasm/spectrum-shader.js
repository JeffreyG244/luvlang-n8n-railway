/**
 * LuvLang LEGENDARY - WebGL Spectrum Shader
 * GPU-accelerated spectrum visualization with professional aesthetics
 */

class WebGLSpectrumRenderer {
    constructor(canvas) {
        this.canvas = canvas;
        this.gl = canvas.getContext('webgl2') || canvas.getContext('webgl');

        if (!this.gl) {
            console.error('❌ WebGL not supported');
            return null;
        }

        this.program = null;
        this.buffers = {};
        this.uniforms = {};
        this.textures = {};

        this.initShaders();
        this.initBuffers();
        this.resize();

    }

    initShaders() {
        const gl = this.gl;

        // ════════════════════════════════════════════════════════════════
        // VERTEX SHADER - Simple fullscreen quad
        // ════════════════════════════════════════════════════════════════
        const vertexShaderSource = `
            attribute vec2 a_position;
            varying vec2 v_uv;

            void main() {
                v_uv = a_position * 0.5 + 0.5;  // Convert -1..1 to 0..1
                gl_Position = vec4(a_position, 0.0, 1.0);
            }
        `;

        // ════════════════════════════════════════════════════════════════
        // FRAGMENT SHADER - Spectrum visualization with professional look
        // ════════════════════════════════════════════════════════════════
        const fragmentShaderSource = `
            precision highp float;

            varying vec2 v_uv;

            uniform sampler2D u_spectrumTexture;  // FFT data (1D texture)
            uniform float u_time;                 // Animation time
            uniform vec2 u_resolution;            // Canvas size
            uniform float u_gain;                 // Visual gain multiplier

            // Professional metering colors
            vec3 colorGreen = vec3(0.26, 0.91, 0.48);   // #43e97b
            vec3 colorYellow = vec3(1.0, 0.89, 0.25);   // #fee140
            vec3 colorRed = vec3(0.98, 0.44, 0.60);     // #fa709a

            // Smooth spectrum bar
            float spectrumBar(vec2 uv, float freq, float magnitude) {
                // Map frequency to X position (logarithmic)
                float x = (log(freq / 20.0) / log(1000.0)); // 20Hz to 20kHz

                // Bar width
                float barWidth = 0.015;

                // Distance from bar center
                float dist = abs(uv.x - x);

                // Soft edges
                float alpha = smoothstep(barWidth, barWidth * 0.5, dist);

                // Height (logarithmic dB scaling)
                float dbValue = magnitude; // Assume already in dB (-60 to 0)
                float normalizedHeight = (dbValue + 60.0) / 60.0; // 0 to 1
                normalizedHeight = pow(normalizedHeight, 0.5) * u_gain; // Power curve + gain

                // Bar mask (from bottom up)
                float barMask = step(uv.y, normalizedHeight);

                return alpha * barMask;
            }

            // Gradient based on dB level
            vec3 meteringGradient(float dbValue) {
                // Green: -60 to -20 dB
                // Yellow: -20 to -6 dB
                // Red: -6 to 0 dB

                float t;

                if (dbValue < -20.0) {
                    // Green zone
                    t = (dbValue + 60.0) / 40.0; // 0 to 1
                    return mix(vec3(0.0), colorGreen, t);
                } else if (dbValue < -6.0) {
                    // Yellow zone
                    t = (dbValue + 20.0) / 14.0; // 0 to 1
                    return mix(colorGreen, colorYellow, t);
                } else {
                    // Red zone
                    t = (dbValue + 6.0) / 6.0; // 0 to 1
                    return mix(colorYellow, colorRed, t);
                }
            }

            // Background grid
            vec3 drawGrid(vec2 uv) {
                vec3 gridColor = vec3(0.1, 0.1, 0.1);

                // Horizontal lines (dB markings)
                float hGrid = 0.0;
                for (float db = 0.0; db < 60.0; db += 6.0) {
                    float y = db / 60.0;
                    hGrid += smoothstep(0.002, 0.0, abs(uv.y - y));
                }

                // Vertical lines (frequency markings)
                float vGrid = 0.0;
                float freqs[7];
                freqs[0] = log(100.0 / 20.0) / log(1000.0);
                freqs[1] = log(200.0 / 20.0) / log(1000.0);
                freqs[2] = log(500.0 / 20.0) / log(1000.0);
                freqs[3] = log(1000.0 / 20.0) / log(1000.0);
                freqs[4] = log(2000.0 / 20.0) / log(1000.0);
                freqs[5] = log(5000.0 / 20.0) / log(1000.0);
                freqs[6] = log(10000.0 / 20.0) / log(1000.0);

                for (int i = 0; i < 7; i++) {
                    vGrid += smoothstep(0.002, 0.0, abs(uv.x - freqs[i]));
                }

                return gridColor * (hGrid + vGrid) * 0.3;
            }

            void main() {
                vec2 uv = v_uv;

                // Background
                vec3 bgColor = vec3(0.04, 0.04, 0.04);

                // Grid
                vec3 gridColor = drawGrid(uv);

                // Spectrum bars
                vec3 spectrumColor = vec3(0.0);
                float spectrumAlpha = 0.0;

                // Sample spectrum texture at multiple frequencies
                int numBars = 64;
                for (int i = 0; i < numBars; i++) {
                    float t = float(i) / float(numBars);

                    // Logarithmic frequency mapping (20Hz to 20kHz)
                    float freq = 20.0 * pow(1000.0, t);

                    // Sample FFT data
                    float magnitude = texture2D(u_spectrumTexture, vec2(t, 0.5)).r;

                    // Convert to dB (-60 to 0 range)
                    float dbValue = magnitude * 60.0 - 60.0;

                    // Draw bar
                    float bar = spectrumBar(uv, freq, dbValue);

                    if (bar > 0.0) {
                        vec3 barColor = meteringGradient(dbValue);
                        spectrumColor += barColor * bar;
                        spectrumAlpha += bar;
                    }
                }

                // Normalize spectrum color
                if (spectrumAlpha > 0.0) {
                    spectrumColor /= spectrumAlpha;
                }

                // Glow effect
                float glow = spectrumAlpha * 0.5;
                vec3 glowColor = spectrumColor * glow;

                // Composite
                vec3 finalColor = bgColor + gridColor + spectrumColor + glowColor;

                // Subtle vignette
                float vignette = 1.0 - length(uv - 0.5) * 0.3;
                finalColor *= vignette;

                gl_FragColor = vec4(finalColor, 1.0);
            }
        `;

        // Compile shaders
        const vertexShader = this.compileShader(vertexShaderSource, gl.VERTEX_SHADER);
        const fragmentShader = this.compileShader(fragmentShaderSource, gl.FRAGMENT_SHADER);

        // Link program
        this.program = gl.createProgram();
        gl.attachShader(this.program, vertexShader);
        gl.attachShader(this.program, fragmentShader);
        gl.linkProgram(this.program);

        if (!gl.getProgramParameter(this.program, gl.LINK_STATUS)) {
            console.error('❌ Shader program link failed:', gl.getProgramInfoLog(this.program));
            return;
        }

        // Get attribute/uniform locations
        this.attribs = {
            position: gl.getAttribLocation(this.program, 'a_position')
        };

        this.uniforms = {
            spectrumTexture: gl.getUniformLocation(this.program, 'u_spectrumTexture'),
            time: gl.getUniformLocation(this.program, 'u_time'),
            resolution: gl.getUniformLocation(this.program, 'u_resolution'),
            gain: gl.getUniformLocation(this.program, 'u_gain')
        };
    }

    compileShader(source, type) {
        const gl = this.gl;
        const shader = gl.createShader(type);

        gl.shaderSource(shader, source);
        gl.compileShader(shader);

        if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
            console.error('❌ Shader compile error:', gl.getShaderInfoLog(shader));
            console.error('Source:', source);
            return null;
        }

        return shader;
    }

    initBuffers() {
        const gl = this.gl;

        // Fullscreen quad (2 triangles)
        const positions = new Float32Array([
            -1, -1,
             1, -1,
            -1,  1,
             1,  1
        ]);

        this.buffers.position = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, this.buffers.position);
        gl.bufferData(gl.ARRAY_BUFFER, positions, gl.STATIC_DRAW);

        // Create texture for spectrum data
        this.textures.spectrum = gl.createTexture();
        gl.bindTexture(gl.TEXTURE_2D, this.textures.spectrum);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    }

    resize() {
        const displayWidth = this.canvas.clientWidth;
        const displayHeight = this.canvas.clientHeight;

        if (this.canvas.width !== displayWidth || this.canvas.height !== displayHeight) {
            this.canvas.width = displayWidth;
            this.canvas.height = displayHeight;
        }

        this.gl.viewport(0, 0, this.canvas.width, this.canvas.height);
    }

    /**
     * Render spectrum
     * @param {Float32Array} spectrumData - FFT magnitude data (normalized 0 to 1)
     * @param {number} time - Animation time in seconds
     * @param {number} gain - Visual gain multiplier (default 1.0)
     */
    render(spectrumData, time = 0, gain = 1.2) {
        const gl = this.gl;

        // Resize if needed
        this.resize();

        // Clear
        gl.clearColor(0.04, 0.04, 0.04, 1.0);
        gl.clear(gl.COLOR_BUFFER_BIT);

        // Use program
        gl.useProgram(this.program);

        // Bind position buffer
        gl.bindBuffer(gl.ARRAY_BUFFER, this.buffers.position);
        gl.enableVertexAttribArray(this.attribs.position);
        gl.vertexAttribPointer(this.attribs.position, 2, gl.FLOAT, false, 0, 0);

        // Update spectrum texture
        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, this.textures.spectrum);
        gl.texImage2D(
            gl.TEXTURE_2D,
            0,
            gl.LUMINANCE,
            spectrumData.length,
            1,
            0,
            gl.LUMINANCE,
            gl.FLOAT,
            spectrumData
        );

        // Set uniforms
        gl.uniform1i(this.uniforms.spectrumTexture, 0);
        gl.uniform1f(this.uniforms.time, time);
        gl.uniform2f(this.uniforms.resolution, this.canvas.width, this.canvas.height);
        gl.uniform1f(this.uniforms.gain, gain);

        // Draw
        gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    }

    /**
     * Cleanup resources
     */
    destroy() {
        const gl = this.gl;

        if (this.program) {
            gl.deleteProgram(this.program);
        }

        if (this.buffers.position) {
            gl.deleteBuffer(this.buffers.position);
        }

        if (this.textures.spectrum) {
            gl.deleteTexture(this.textures.spectrum);
        }
    }
}

// Export
if (typeof module !== 'undefined' && module.exports) {
    module.exports = WebGLSpectrumRenderer;
}

// ════════════════════════════════════════════════════════════════════════
// USAGE EXAMPLE
// ════════════════════════════════════════════════════════════════════════
/*

const canvas = document.getElementById('spectrumCanvas');
const renderer = new WebGLSpectrumRenderer(canvas);

// In animation loop
function animate(time) {
    // Get FFT data from Web Audio API
    analyser.getFloatFrequencyData(frequencyData);

    // Normalize to 0-1 range (FFT gives -100 to 0 dB)
    const normalized = new Float32Array(frequencyData.length);
    for (let i = 0; i < frequencyData.length; i++) {
        normalized[i] = (frequencyData[i] + 100.0) / 100.0; // -100dB to 0dB → 0 to 1
    }

    // Render
    renderer.render(normalized, time / 1000, 1.2);

    requestAnimationFrame(animate);
}

requestAnimationFrame(animate);

*/
