#!/bin/bash

echo "🚀 LuvLang Deployment Script Starting..."

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️ $1${NC}"
}

# Step 1: Validate the code
echo "🔍 Step 1: Validating code..."
if npm run validate; then
    print_status "Code validation passed"
else
    print_error "Code validation failed - stopping deployment"
    exit 1
fi

# Step 2: Build the project
echo "🏗️ Step 2: Building project..."
if npm run build:netlify; then
    print_status "Build completed successfully"
else
    print_error "Build failed - stopping deployment"
    exit 1
fi

# Step 3: Verify build output
echo "🔍 Step 3: Verifying build output..."
if [ -f "dist/index.html" ]; then
    print_status "Build output verified - index.html exists"
else
    print_error "Build output missing - no index.html found"
    exit 1
fi

# Step 4: Check if Executive Dashboard is in build
if grep -q "Executive Dashboard" dist/index.html; then
    print_status "Executive Dashboard found in build"
else
    print_warning "Executive Dashboard not found in static HTML (may be in JS)"
fi

# Step 5: Git status
echo "📊 Step 5: Checking git status..."
git status --porcelain
if [ $? -eq 0 ]; then
    print_status "Git status check completed"
fi

# Step 6: Push to GitHub (if needed)
echo "📤 Step 6: Pushing to GitHub..."
if git diff --quiet HEAD && git diff --cached --quiet; then
    print_status "No changes to push - repository is up to date"
else
    print_warning "Changes detected - pushing to GitHub"
    git add .
    git commit -m "🚀 Deploy: $(date '+%Y-%m-%d %H:%M:%S')"
    git push origin main
    print_status "Changes pushed to GitHub"
fi

echo ""
echo "🎉 Deployment script completed successfully!"
echo ""
echo "Next steps:"
echo "1. Check Netlify dashboard for build status"
echo "2. Verify luvlang.org shows Executive Dashboard"
echo "3. If DNS not working, follow DEPLOYMENT-FIX-GUIDE.md"
echo ""
print_status "Your validated Executive Dashboard version is ready for deployment!"