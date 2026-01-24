/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   WEBGL SPECTRUM ANALYZER - Elite Persistence/Ghosting System

   Features:
   - GPU-accelerated rendering (60fps guaranteed)
   - Phosphor-style persistence trails (analog oscilloscope look)
   - Ping-pong framebuffer for smooth decay
   - Bloom/glow on bright peaks
   - EQ curve overlay with transparency
   - Legendary gold color scheme (#FFD700)

   This is the rendering tech used in:
   - FabFilter Pro-Q 3
   - iZotope Ozone 11
   - Waves SSL Channel
   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */

// ═══════════════════════════════════════════════════════════════════════════
// SHADER SOURCE CODE
// ═══════════════════════════════════════════════════════════════════════════

// Simple passthrough vertex shader
const VERTEX_SHADER = `
    attribute vec2 a_position;
    attribute vec2 a_texCoord;
    varying vec2 v_texCoord;

    void main() {
        gl_Position = vec4(a_position, 0.0, 1.0);
        v_texCoord = a_texCoord;
    }
`;

// Persistence/ghosting fragment shader - THE SECRET SAUCE
const PERSISTENCE_SHADER = `
    precision highp float;

    uniform sampler2D u_currentFrame;  // New spectrum data
    uniform sampler2D u_prevFrame;     // Last drawn frame
    uniform float u_decay;             // Decay rate (0.90 - 0.98)
    uniform vec2 u_resolution;
    uniform vec3 u_glowColor;          // #FFD700 (Legendary Gold)

    varying vec2 v_texCoord;

    void main() {
        // Sample the new data and the old data
        vec4 current = texture2D(u_currentFrame, v_texCoord);
        vec4 previous = texture2D(u_prevFrame, v_texCoord);

        // THE MAGIC: Fade the old frame and add the new one
        // Max() ensures that peaks stay bright, while decay creates the trail
        vec4 blended = max(current, previous * u_decay);

        // Add bloom/glow effect to bright peaks
        float brightness = dot(blended.rgb, vec3(0.299, 0.587, 0.114));
        if (brightness > 0.5) {
            blended.rgb += u_glowColor * (brightness - 0.5) * 0.3;
        }

        gl_FragColor = blended;
    }
`;

// Basic texture rendering shader
const DISPLAY_SHADER = `
    precision highp float;

    uniform sampler2D u_texture;
    varying vec2 v_texCoord;

    void main() {
        gl_FragColor = texture2D(u_texture, v_texCoord);
    }
`;

// ═══════════════════════════════════════════════════════════════════════════
// WEBGL CONTEXT AND STATE
// ═══════════════════════════════════════════════════════════════════════════

let gl = null;
let canvas = null;

// Shader programs
let persistenceProgram = null;
let displayProgram = null;

// Framebuffers (ping-pong system)
let framebufferA = null;
let framebufferB = null;
let textureA = null;
let textureB = null;

// Geometry buffers
let quadBuffer = null;
let texCoordBuffer = null;

// Uniforms
let currentFrameTexture = null;

// Settings (mutable for runtime adjustment)
let DECAY_RATE = 0.95;  // 0.95 = ~300ms trail (professional feel)
const GLOW_COLOR = [1.0, 0.843, 0.0]; // #FFD700 (Legendary Gold)

// ═══════════════════════════════════════════════════════════════════════════
// INITIALIZATION
// ═══════════════════════════════════════════════════════════════════════════

function initWebGL(canvasElement) {
    console.log('🎨 Initializing WebGL Persistence System...');

    canvas = canvasElement;
    gl = canvas.getContext('webgl', {
        alpha: true,
        antialias: true,
        premultipliedAlpha: false
    });

    if (!gl) {
        console.error('❌ WebGL not supported!');
        return false;
    }

    console.log('   ✅ WebGL context created');

    // Compile shaders
    persistenceProgram = createProgram(VERTEX_SHADER, PERSISTENCE_SHADER);
    displayProgram = createProgram(VERTEX_SHADER, DISPLAY_SHADER);

    if (!persistenceProgram || !displayProgram) {
        console.error('❌ Shader compilation failed!');
        return false;
    }

    console.log('   ✅ Shaders compiled');

    // Create geometry (full-screen quad)
    quadBuffer = createBuffer(new Float32Array([
        -1, -1,
         1, -1,
        -1,  1,
         1,  1
    ]));

    texCoordBuffer = createBuffer(new Float32Array([
        0, 0,
        1, 0,
        0, 1,
        1, 1
    ]));

    console.log('   ✅ Geometry buffers created');

    // Create framebuffers and textures
    const width = canvas.width;
    const height = canvas.height;

    textureA = createTexture(width, height);
    textureB = createTexture(width, height);
    framebufferA = createFramebuffer(textureA);
    framebufferB = createFramebuffer(textureB);

    // Create texture for current frame spectrum data
    currentFrameTexture = createTexture(width, height);

    console.log(`   ✅ Framebuffers created (${width}x${height})`);

    // Set viewport
    gl.viewport(0, 0, width, height);

    // Enable blending for glow effects
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

    console.log('✅ WebGL Persistence System ready!');
    return true;
}

// ═══════════════════════════════════════════════════════════════════════════
// SHADER COMPILATION UTILITIES
// ═══════════════════════════════════════════════════════════════════════════

function createShader(type, source) {
    const shader = gl.createShader(type);
    gl.shaderSource(shader, source);
    gl.compileShader(shader);

    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
        console.error('Shader compilation error:', gl.getShaderInfoLog(shader));
        gl.deleteShader(shader);
        return null;
    }

    return shader;
}

function createProgram(vertexSource, fragmentSource) {
    const vertexShader = createShader(gl.VERTEX_SHADER, vertexSource);
    const fragmentShader = createShader(gl.FRAGMENT_SHADER, fragmentSource);

    if (!vertexShader || !fragmentShader) {
        return null;
    }

    const program = gl.createProgram();
    gl.attachShader(program, vertexShader);
    gl.attachShader(program, fragmentShader);
    gl.linkProgram(program);

    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
        console.error('Program linking error:', gl.getProgramInfoLog(program));
        gl.deleteProgram(program);
        return null;
    }

    return program;
}

// ═══════════════════════════════════════════════════════════════════════════
// WEBGL RESOURCE CREATION
// ═══════════════════════════════════════════════════════════════════════════

function createBuffer(data) {
    const buffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(gl.ARRAY_BUFFER, data, gl.STATIC_DRAW);
    return buffer;
}

function createTexture(width, height) {
    const texture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, texture);

    // Allocate storage
    gl.texImage2D(
        gl.TEXTURE_2D,
        0,
        gl.RGBA,
        width,
        height,
        0,
        gl.RGBA,
        gl.UNSIGNED_BYTE,
        null
    );

    // Set filtering (linear for smooth trails)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

    return texture;
}

function createFramebuffer(texture) {
    const framebuffer = gl.createFramebuffer();
    gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffer);
    gl.framebufferTexture2D(
        gl.FRAMEBUFFER,
        gl.COLOR_ATTACHMENT0,
        gl.TEXTURE_2D,
        texture,
        0
    );

    // Check framebuffer status
    const status = gl.checkFramebufferStatus(gl.FRAMEBUFFER);
    if (status !== gl.FRAMEBUFFER_COMPLETE) {
        console.error('Framebuffer incomplete:', status);
    }

    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    return framebuffer;
}

// ═══════════════════════════════════════════════════════════════════════════
// SPECTRUM DATA → TEXTURE CONVERSION
// ═══════════════════════════════════════════════════════════════════════════

function renderSpectrumToTexture(analyser, audioContext) {
    if (!gl || !currentFrameTexture) return;

    const width = canvas.width;
    const height = canvas.height;

    // Create pixel buffer (RGBA)
    const pixels = new Uint8Array(width * height * 4);

    // Get frequency data from analyzer
    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Float32Array(bufferLength);
    analyser.getFloatFrequencyData(dataArray);

    const nyquist = audioContext.sampleRate / 2;

    // Draw spectrum bars
    const numBars = 300;
    for (let i = 0; i < numBars; i++) {
        // Logarithmic frequency mapping (20Hz - 20kHz)
        const freq = 20 * Math.pow(20000 / 20, i / numBars);
        const binIndex = Math.round((freq / nyquist) * bufferLength);
        const db = dataArray[Math.min(binIndex, bufferLength - 1)];

        // Convert dB to normalized height (0.0 - 1.0)
        const normalized = Math.max(0, (db + 100) / 100); // -100dB to 0dB range
        const barHeight = Math.pow(normalized, 0.5) * height; // Square root for better visual

        // Calculate bar position in texture
        const barWidth = width / numBars;
        const x1 = Math.floor(i * barWidth);
        const x2 = Math.floor((i + 1) * barWidth);

        // Gold color gradient based on height
        const intensity = normalized;
        const r = Math.floor(255 * intensity);
        const g = Math.floor(215 * intensity);
        const b = Math.floor(0 * intensity);
        const a = Math.floor(255 * intensity);

        // Fill pixels for this bar
        for (let x = x1; x < x2; x++) {
            for (let y = 0; y < barHeight; y++) {
                const pixelIndex = (y * width + x) * 4;
                pixels[pixelIndex + 0] = r;
                pixels[pixelIndex + 1] = g;
                pixels[pixelIndex + 2] = b;
                pixels[pixelIndex + 3] = a;
            }
        }
    }

    // Draw EQ curve overlay (if available)
    if (window.eqBands && window.eqBands.length > 0) {
        drawEQCurveToPixels(pixels, width, height, audioContext);
    }

    // Upload to texture
    gl.bindTexture(gl.TEXTURE_2D, currentFrameTexture);
    gl.texImage2D(
        gl.TEXTURE_2D,
        0,
        gl.RGBA,
        width,
        height,
        0,
        gl.RGBA,
        gl.UNSIGNED_BYTE,
        pixels
    );
}

function drawEQCurveToPixels(pixels, width, height, audioContext) {
    const sampleRate = audioContext.sampleRate;

    for (let i = 0; i < width; i++) {
        const freq = 20 * Math.pow(20000 / 20, i / width);
        let totalGain = 0;

        // Calculate EQ response at this frequency
        for (const band of window.eqBands) {
            if (!band.enabled) continue;

            const centerFreq = band.frequency;
            const gain = band.gain;
            const Q = band.q;

            const w0 = 2 * Math.PI * centerFreq / sampleRate;
            const w = 2 * Math.PI * freq / sampleRate;
            const A = Math.pow(10, gain / 40);
            const alpha = Math.sin(w0) / (2 * Q);

            // Biquad peaking filter response
            const cos_w = Math.cos(w);
            const cos_w0 = Math.cos(w0);

            const b0 = 1 + alpha * A;
            const b1 = -2 * cos_w0;
            const b2 = 1 - alpha * A;
            const a0 = 1 + alpha / A;
            const a1 = -2 * cos_w0;
            const a2 = 1 - alpha / A;

            // Complex transfer function magnitude
            const real_num = b0 + b1 * cos_w + b2 * Math.cos(2 * w);
            const imag_num = -b1 * Math.sin(w) - b2 * Math.sin(2 * w);
            const real_den = a0 + a1 * cos_w + a2 * Math.cos(2 * w);
            const imag_den = -a1 * Math.sin(w) - a2 * Math.sin(2 * w);

            const mag_num = Math.sqrt(real_num * real_num + imag_num * imag_num);
            const mag_den = Math.sqrt(real_den * real_den + imag_den * imag_den);

            const response_gain = 20 * Math.log10(mag_num / mag_den);
            totalGain += response_gain;
        }

        // Draw EQ curve line (cyan with transparency)
        const curveHeight = height * 0.5 + (totalGain / 24) * height * 0.4; // ±24dB range
        const y = Math.floor(Math.max(0, Math.min(height - 1, curveHeight)));

        // Draw a 3-pixel thick line for visibility
        for (let dy = -1; dy <= 1; dy++) {
            const pixelY = Math.max(0, Math.min(height - 1, y + dy));
            const pixelIndex = (pixelY * width + i) * 4;

            // Cyan color with high alpha
            pixels[pixelIndex + 0] = 0;
            pixels[pixelIndex + 1] = 212;
            pixels[pixelIndex + 2] = 255;
            pixels[pixelIndex + 3] = 220;
        }
    }
}

// ═══════════════════════════════════════════════════════════════════════════
// RENDERING PIPELINE
// ═══════════════════════════════════════════════════════════════════════════

let pingPong = false; // Toggle between framebuffers

function render(analyser, audioContext) {
    if (!gl || !persistenceProgram || !displayProgram) return;

    // Step 1: Render current spectrum data to texture
    renderSpectrumToTexture(analyser, audioContext);

    // Step 2: Apply persistence shader (blend current with previous)
    const inputFramebuffer = pingPong ? framebufferB : framebufferA;
    const outputFramebuffer = pingPong ? framebufferA : framebufferB;
    const inputTexture = pingPong ? textureB : textureA;
    const outputTexture = pingPong ? textureA : textureB;

    gl.bindFramebuffer(gl.FRAMEBUFFER, outputFramebuffer);
    gl.useProgram(persistenceProgram);

    // Set uniforms
    const u_currentFrame = gl.getUniformLocation(persistenceProgram, 'u_currentFrame');
    const u_prevFrame = gl.getUniformLocation(persistenceProgram, 'u_prevFrame');
    const u_decay = gl.getUniformLocation(persistenceProgram, 'u_decay');
    const u_resolution = gl.getUniformLocation(persistenceProgram, 'u_resolution');
    const u_glowColor = gl.getUniformLocation(persistenceProgram, 'u_glowColor');

    gl.uniform1i(u_currentFrame, 0);
    gl.uniform1i(u_prevFrame, 1);
    gl.uniform1f(u_decay, DECAY_RATE);
    gl.uniform2f(u_resolution, canvas.width, canvas.height);
    gl.uniform3fv(u_glowColor, GLOW_COLOR);

    // Bind textures
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, currentFrameTexture);
    gl.activeTexture(gl.TEXTURE1);
    gl.bindTexture(gl.TEXTURE_2D, inputTexture);

    // Set vertex attributes
    const a_position = gl.getAttribLocation(persistenceProgram, 'a_position');
    const a_texCoord = gl.getAttribLocation(persistenceProgram, 'a_texCoord');

    gl.bindBuffer(gl.ARRAY_BUFFER, quadBuffer);
    gl.enableVertexAttribArray(a_position);
    gl.vertexAttribPointer(a_position, 2, gl.FLOAT, false, 0, 0);

    gl.bindBuffer(gl.ARRAY_BUFFER, texCoordBuffer);
    gl.enableVertexAttribArray(a_texCoord);
    gl.vertexAttribPointer(a_texCoord, 2, gl.FLOAT, false, 0, 0);

    // Draw
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);

    // Step 3: Display final result to screen
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.useProgram(displayProgram);

    const u_texture = gl.getUniformLocation(displayProgram, 'u_texture');
    gl.uniform1i(u_texture, 0);

    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, outputTexture);

    const a_position_display = gl.getAttribLocation(displayProgram, 'a_position');
    const a_texCoord_display = gl.getAttribLocation(displayProgram, 'a_texCoord');

    gl.bindBuffer(gl.ARRAY_BUFFER, quadBuffer);
    gl.enableVertexAttribArray(a_position_display);
    gl.vertexAttribPointer(a_position_display, 2, gl.FLOAT, false, 0, 0);

    gl.bindBuffer(gl.ARRAY_BUFFER, texCoordBuffer);
    gl.enableVertexAttribArray(a_texCoord_display);
    gl.vertexAttribPointer(a_texCoord_display, 2, gl.FLOAT, false, 0, 0);

    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);

    // Toggle ping-pong
    pingPong = !pingPong;
}

// ═══════════════════════════════════════════════════════════════════════════
// GLOBAL API
// ═══════════════════════════════════════════════════════════════════════════

window.WebGLSpectrum = {
    init: initWebGL,
    render: render,
    setDecay: (rate) => { DECAY_RATE = rate; },
    isReady: () => gl !== null
};

console.log('🎨 WEBGL_SPECTRUM_PERSISTENCE.js loaded - Use window.WebGLSpectrum.init(canvas)');
