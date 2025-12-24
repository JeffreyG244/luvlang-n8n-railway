#!/bin/bash

# ============================================================================
# WASM COMPRESSION SCRIPT
# Compresses .wasm files with Brotli for maximum performance
# ============================================================================

echo "🗜️  WASM Compression Script"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# Check if brotli is installed
if ! command -v brotli &> /dev/null; then
    echo "❌ Brotli is not installed!"
    echo ""
    echo "Install with:"
    echo "  macOS:   brew install brotli"
    echo "  Ubuntu:  sudo apt-get install brotli"
    echo "  CentOS:  sudo yum install brotli"
    echo ""
    exit 1
fi

# Find all .wasm files
WASM_FILES=$(find . -name "*.wasm" -not -path "*/node_modules/*" -not -path "*/.git/*")

if [ -z "$WASM_FILES" ]; then
    echo "❌ No .wasm files found!"
    exit 1
fi

echo "Found WASM files:"
echo "$WASM_FILES"
echo ""

# Compress each file
for file in $WASM_FILES; do
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo "📦 Compressing: $file"

    # Get original size
    ORIGINAL_SIZE=$(wc -c < "$file")
    ORIGINAL_KB=$(echo "scale=2; $ORIGINAL_SIZE / 1024" | bc)

    echo "   Original size: ${ORIGINAL_KB} KB"

    # Compress with Brotli (quality 11 = maximum compression)
    brotli -k -f -q 11 "$file"

    if [ $? -eq 0 ]; then
        COMPRESSED_FILE="${file}.br"
        COMPRESSED_SIZE=$(wc -c < "$COMPRESSED_FILE")
        COMPRESSED_KB=$(echo "scale=2; $COMPRESSED_SIZE / 1024" | bc)

        # Calculate savings
        SAVINGS=$(echo "scale=1; 100 - ($COMPRESSED_SIZE * 100 / $ORIGINAL_SIZE)" | bc)

        echo "   ✅ Compressed: ${COMPRESSED_KB} KB"
        echo "   💾 Savings: ${SAVINGS}%"
        echo "   📄 Output: ${COMPRESSED_FILE}"
    else
        echo "   ❌ Compression failed!"
    fi

    echo ""
done

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✅ Compression complete!"
echo ""
echo "Next steps:"
echo "1. Upload both .wasm and .wasm.br files to your server"
echo "2. Configure server to serve .wasm.br when browser supports Brotli"
echo "3. See WASM_HOSTING_DEPLOYMENT_GUIDE.md for server configuration"
echo ""
