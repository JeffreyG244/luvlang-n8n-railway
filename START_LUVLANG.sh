#!/bin/bash
# LuvLang Audio Mastering - Start Script
# This script starts all necessary services for LuvLang

echo "🎵 =============================================="
echo "   LUVLANG AUDIO MASTERING - START SCRIPT"
echo "=============================================="
echo ""

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Check if running from correct directory
if [ ! -f "luvlang_supabase_watcher.py" ]; then
    echo -e "${RED}❌ Error: Must run from ~/luvlang-mastering directory${NC}"
    echo "Run: cd ~/luvlang-mastering && ./START_LUVLANG.sh"
    exit 1
fi

echo -e "${YELLOW}📋 Checking system status...${NC}"
echo ""

# Check Python
if ! command -v python3 &> /dev/null; then
    echo -e "${RED}❌ Python 3 not found${NC}"
    exit 1
else
    echo -e "${GREEN}✅ Python 3 installed${NC}"
fi

# Check Python packages
echo -e "${YELLOW}📦 Checking Python packages...${NC}"
python3 -c "import librosa, soundfile, scipy, numpy, supabase" 2>/dev/null
if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ All Python packages installed${NC}"
else
    echo -e "${RED}❌ Missing Python packages${NC}"
    echo "Install with: pip3 install librosa soundfile scipy numpy supabase"
    exit 1
fi

# Check ffmpeg
if ! command -v ffmpeg &> /dev/null; then
    echo -e "${YELLOW}⚠️  ffmpeg not found (needed for MP3 conversion)${NC}"
    echo "Install with: brew install ffmpeg"
else
    echo -e "${GREEN}✅ ffmpeg installed${NC}"
fi

# Check n8n (optional)
if docker ps | grep -q n8n; then
    echo -e "${GREEN}✅ n8n is running (optional)${NC}"
else
    echo -e "${YELLOW}⚠️  n8n not running (optional - not required)${NC}"
fi

echo ""
echo -e "${YELLOW}🚀 Starting services...${NC}"
echo ""

# Check if watcher is already running
if pgrep -f "luvlang_supabase_watcher.py" > /dev/null; then
    echo -e "${YELLOW}⚠️  Python watcher is already running!${NC}"
    echo "PID: $(pgrep -f luvlang_supabase_watcher.py)"
    echo ""
    read -p "Kill existing watcher and restart? (y/n) " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        pkill -f luvlang_supabase_watcher.py
        echo -e "${GREEN}✅ Killed existing watcher${NC}"
        sleep 2
    else
        echo "Keeping existing watcher running"
        exit 0
    fi
fi

# Start Python watcher
echo -e "${GREEN}🎧 Starting Python watcher...${NC}"
echo "This will monitor Supabase for new mastering jobs"
echo ""
echo -e "${YELLOW}Press Ctrl+C to stop the watcher${NC}"
echo ""
sleep 2

# Run the watcher
python3 luvlang_supabase_watcher.py
