/**
 * OPTIMIZED WASM LOADER FOR LUVLANG MASTERING ENGINE
 *
 * Features:
 * - Streaming compilation (starts while downloading)
 * - Automatic fallback if streaming fails
 * - Progress tracking
 * - Error handling
 * - Cache detection
 *
 * This is 3-5x faster than traditional WebAssembly.instantiate()
 */

class WASMLoader {
    constructor(wasmPath) {
        this.wasmPath = wasmPath;
        this.instance = null;
        this.module = null;
        this.memory = null;
        this.isLoaded = false;
        this.loadProgress = 0;
    }

    /**
     * Load WASM using streaming compilation (FASTEST METHOD)
     * This compiles the WASM while it downloads - like a "Just-In-Time" compiler
     */
    async loadStreaming(importObject = {}) {

        try {
            // Check if streaming is supported
            if (!WebAssembly.instantiateStreaming) {
                console.warn('⚠️ Streaming not supported, falling back to traditional loading');
                return await this.loadTraditional(importObject);
            }

            const startTime = performance.now();

            // Fetch the WASM file
            const response = await fetch(this.wasmPath, {
                headers: {
                    'Accept': 'application/wasm'
                },
                mode: 'cors',
                credentials: 'same-origin'
            });

            if (!response.ok) {
                throw new Error(`Failed to fetch WASM: ${response.status} ${response.statusText}`);
            }

            // Check if it's from cache
            const fromCache = response.headers.get('x-cache') === 'HIT' ||
                             response.headers.get('cf-cache-status') === 'HIT';
            if (fromCache) {

            }

            // Get file size for progress tracking
            const contentLength = response.headers.get('content-length');
            if (contentLength) {

            }

            // STREAMING INSTANTIATION - This is the magic!
            // Browser compiles WASM while downloading
            const { instance, module } = await WebAssembly.instantiateStreaming(
                response,
                importObject
            );

            this.instance = instance;
            this.module = module;
            this.memory = instance.exports.memory;
            this.isLoaded = true;

            const loadTime = performance.now() - startTime;

            return instance;

        } catch (error) {
            console.error('❌ Streaming load failed:', error);

            // Fallback to traditional loading

            return await this.loadTraditional(importObject);
        }
    }

    /**
     * Traditional WASM loading (fallback)
     * Downloads entire file, then compiles
     */
    async loadTraditional(importObject = {}) {

        try {
            const startTime = performance.now();

            // Fetch as ArrayBuffer
            const response = await fetch(this.wasmPath, {
                mode: 'cors',
                credentials: 'same-origin'
            });

            if (!response.ok) {
                throw new Error(`Failed to fetch WASM: ${response.status} ${response.statusText}`);
            }

            const buffer = await response.arrayBuffer();

            // Compile and instantiate
            const { instance, module } = await WebAssembly.instantiate(buffer, importObject);

            this.instance = instance;
            this.module = module;
            this.memory = instance.exports.memory;
            this.isLoaded = true;

            const loadTime = performance.now() - startTime;

            return instance;

        } catch (error) {
            console.error('❌ Traditional load failed:', error);
            throw error;
        }
    }

    /**
     * Load with progress tracking (useful for large WASM files)
     */
    async loadWithProgress(importObject = {}, progressCallback = null) {

        try {
            const response = await fetch(this.wasmPath);
            if (!response.ok) {
                throw new Error(`HTTP error: ${response.status}`);
            }

            const contentLength = response.headers.get('content-length');
            if (!contentLength) {
                // No content length - fall back to streaming
                return await this.loadStreaming(importObject);
            }

            const total = parseInt(contentLength);
            let loaded = 0;

            // Read response as stream
            const reader = response.body.getReader();
            const chunks = [];

            while (true) {
                const { done, value } = await reader.read();

                if (done) break;

                chunks.push(value);
                loaded += value.byteLength;

                const progress = (loaded / total) * 100;
                this.loadProgress = progress;

                if (progressCallback) {
                    progressCallback(progress, loaded, total);
                }

            }

            // Concatenate chunks into single ArrayBuffer
            const buffer = new Uint8Array(loaded);
            let offset = 0;
            for (const chunk of chunks) {
                buffer.set(chunk, offset);
                offset += chunk.byteLength;
            }

            // Compile and instantiate

            const { instance, module } = await WebAssembly.instantiate(buffer.buffer, importObject);

            this.instance = instance;
            this.module = module;
            this.memory = instance.exports.memory;
            this.isLoaded = true;

            return instance;

        } catch (error) {
            console.error('❌ Progress load failed:', error);
            throw error;
        }
    }

    /**
     * Get exported functions from WASM
     */
    getExports() {
        if (!this.isLoaded) {
            throw new Error('WASM not loaded yet');
        }
        return this.instance.exports;
    }

    /**
     * Get WASM memory
     */
    getMemory() {
        if (!this.isLoaded) {
            throw new Error('WASM not loaded yet');
        }
        return this.memory;
    }
}

// ============================================================================
// USAGE EXAMPLE
// ============================================================================

/**
 * Example: Load the LuvLang mastering engine
 */
async function loadMasteringEngine() {
    // Create loader
    const loader = new WASMLoader('wasm/build/mastering-engine-100-ultimate.wasm');

    try {
        // Option 1: Streaming (FASTEST - recommended)
        const instance = await loader.loadStreaming({
            env: {
                // Your import object here
                memory: new WebAssembly.Memory({ initial: 256, maximum: 512 }),
                // Add your imports...
            }
        });

        return instance;

    } catch (error) {
        console.error('Failed to load mastering engine:', error);
        throw error;
    }
}

/**
 * Example: Load with progress bar
 */
async function loadMasteringEngineWithProgress() {
    const loader = new WASMLoader('wasm/build/mastering-engine-100-ultimate.wasm');

    // Update UI progress bar
    const progressCallback = (percent, loaded, total) => {
        // Update your UI here

        // document.getElementById('progress').value = percent;
    };

    const instance = await loader.loadWithProgress({}, progressCallback);
    return instance;
}

// Export for use in your app
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { WASMLoader, loadMasteringEngine, loadMasteringEngineWithProgress };
}
