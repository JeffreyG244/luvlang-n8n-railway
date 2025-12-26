#!/bin/bash
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# MONO-BASS CROSSOVER - WASM COMPILATION SCRIPT
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
#
# Compiles mono-bass-crossover.cpp to optimized WebAssembly module
#
# Requirements:
#   - Emscripten SDK (emsdk) installed and activated
#   - Installation: https://emscripten.org/docs/getting_started/downloads.html
#
# Usage:
#   chmod +x build-mono-bass.sh
#   ./build-mono-bass.sh
#
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

set -e  # Exit on error

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🔨 LUVLANG LEGENDARY - Mono-Bass Crossover WASM Build"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Check if emscripten is available
if ! command -v emcc &> /dev/null; then
    echo "❌ ERROR: Emscripten compiler (emcc) not found"
    echo ""
    echo "📦 Installation instructions:"
    echo ""
    echo "1. Install Emscripten SDK:"
    echo "   git clone https://github.com/emscripten-core/emsdk.git"
    echo "   cd emsdk"
    echo "   ./emsdk install latest"
    echo "   ./emsdk activate latest"
    echo ""
    echo "2. Activate for current session:"
    echo "   source ./emsdk_env.sh"
    echo ""
    echo "3. Run this script again"
    echo ""
    echo "🔄 FALLBACK: JavaScript implementation is already integrated and working."
    echo "   The WASM module provides ~3-5x performance improvement for real-time processing."
    exit 1
fi

echo "✅ Emscripten compiler found: $(emcc --version | head -n1)"
echo ""

# Navigate to script directory
cd "$(dirname "$0")"

# Source file
SOURCE="mono-bass-crossover.cpp"
OUTPUT="mono-bass-crossover"

if [ ! -f "$SOURCE" ]; then
    echo "❌ ERROR: Source file not found: $SOURCE"
    exit 1
fi

echo "📂 Source: $SOURCE"
echo "🎯 Output: ${OUTPUT}.wasm + ${OUTPUT}.js"
echo ""
echo "⚙️  Compiling with aggressive optimizations..."
echo ""

# Compile with Emscripten
emcc "$SOURCE" \
    -o "${OUTPUT}.js" \
    -s WASM=1 \
    -s EXPORTED_FUNCTIONS='["_processMonoBass","_initMonoBass","_setCrossoverFreq","_malloc","_free"]' \
    -s EXPORTED_RUNTIME_METHODS='["ccall","cwrap","getValue","setValue","HEAPF32"]' \
    -s ALLOW_MEMORY_GROWTH=1 \
    -s MAXIMUM_MEMORY=256MB \
    -s INITIAL_MEMORY=64MB \
    -s MODULARIZE=1 \
    -s EXPORT_NAME="createMonoBassModule" \
    -O3 \
    -ffast-math \
    -s ENVIRONMENT='web,worker' \
    --no-entry

if [ $? -eq 0 ]; then
    echo ""
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo "✅ BUILD SUCCESSFUL"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo ""
    echo "📦 Generated files:"
    ls -lh "${OUTPUT}.wasm" "${OUTPUT}.js" 2>/dev/null || true
    echo ""
    echo "🔗 Integration:"
    echo "   The WASM module will be automatically loaded by"
    echo "   ADVANCED_PROCESSING_FEATURES.js when available."
    echo ""
    echo "⚡ Performance:"
    echo "   WASM provides 3-5x faster processing than JavaScript fallback"
    echo ""
    echo "🎉 Ready for production!"
else
    echo ""
    echo "❌ Build failed"
    exit 1
fi
