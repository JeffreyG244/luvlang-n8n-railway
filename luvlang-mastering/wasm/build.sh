#!/bin/bash

# ============================================================================
# LuvLang LEGENDARY - WASM Build Script
# Compiles C++ DSP engine to WebAssembly with Emscripten
# ============================================================================

set -e  # Exit on error

echo "🔨 Building LuvLang Mastering Engine (WASM)..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# Check if Emscripten is installed
if ! command -v emcc &> /dev/null; then
    echo "❌ Error: Emscripten not found!"
    echo "   Please install Emscripten SDK:"
    echo "   https://emscripten.org/docs/getting_started/downloads.html"
    exit 1
fi

# Display Emscripten version
echo "📦 Emscripten version: $(emcc --version | head -n 1)"
echo ""

# Build directory
BUILD_DIR="build"
mkdir -p "$BUILD_DIR"

# Compiler flags
CFLAGS=(
    -O3                              # Maximum optimization
    -std=c++17                       # C++17 standard
    -ffast-math                      # Fast math operations (safe for audio DSP)
    -msimd128                        # Enable SIMD (WebAssembly SIMD)
    --bind                           # Enable Emscripten bindings
    -s WASM=1                        # Generate WASM (not asm.js)
    -s ALLOW_MEMORY_GROWTH=1         # Allow dynamic memory allocation
    -s MODULARIZE=1                  # Export as ES6 module
    -s EXPORT_NAME="createMasteringEngine"  # Module factory name
    -s ENVIRONMENT=web               # Web-only (not Node.js)
    -s MALLOC=emmalloc               # Lightweight allocator for audio
    -s INITIAL_MEMORY=16MB           # 16MB initial memory
    -s MAXIMUM_MEMORY=64MB           # 64MB max memory
    -s STACK_SIZE=1MB                # 1MB stack
    -s ASSERTIONS=0                  # Disable runtime assertions (production)
    -s NO_FILESYSTEM=1               # No filesystem needed
    -s DISABLE_EXCEPTION_CATCHING=1  # No exceptions (faster)
    --closure 1                      # Google Closure Compiler optimization
    --no-entry                       # No main() function needed
)

# Debug build (optional - comment out for production)
# CFLAGS+=(
#     -g                               # Debug symbols
#     -s ASSERTIONS=1                  # Enable runtime checks
#     -s SAFE_HEAP=1                   # Memory safety checks
#     -fsanitize=undefined             # Undefined behavior sanitizer
# )

echo "🏗️  Compiling MasteringEngine.cpp → mastering-engine.wasm..."

emcc MasteringEngine.cpp \
    "${CFLAGS[@]}" \
    -o "$BUILD_DIR/mastering-engine.js"

if [ $? -eq 0 ]; then
    echo "✅ Build successful!"
    echo ""
    echo "📊 Build artifacts:"
    ls -lh "$BUILD_DIR/"
    echo ""

    # Display WASM size
    WASM_SIZE=$(stat -f%z "$BUILD_DIR/mastering-engine.wasm" 2>/dev/null || stat -c%s "$BUILD_DIR/mastering-engine.wasm")
    WASM_SIZE_KB=$((WASM_SIZE / 1024))
    echo "📦 WASM size: ${WASM_SIZE_KB} KB"

    # Check if gzip is available for compression estimate
    if command -v gzip &> /dev/null; then
        GZIP_SIZE=$(gzip -c "$BUILD_DIR/mastering-engine.wasm" | wc -c)
        GZIP_SIZE_KB=$((GZIP_SIZE / 1024))
        echo "📦 Gzipped size: ${GZIP_SIZE_KB} KB (estimated network transfer)"
    fi

    echo ""
    echo "🎉 Ready to use! Import the module:"
    echo "   import createMasteringEngine from './wasm/build/mastering-engine.js';"
    echo ""
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
else
    echo "❌ Build failed!"
    exit 1
fi
