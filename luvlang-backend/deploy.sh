#!/bin/bash

echo "🚀 Deploying LuvLang Backend to Railway..."

# Check if already logged in
if railway whoami > /dev/null 2>&1; then
    echo "✅ Already logged in to Railway"
else
    echo "🔐 Please login to Railway first:"
    echo "railway login"
    exit 1
fi

# Initialize project if not exists
if [ ! -f ".railway/project.json" ]; then
    echo "📦 Initializing Railway project..."
    railway init
fi

# Deploy
echo "🚀 Deploying to Railway..."
railway up

echo "📝 Add environment variables:"
echo "railway variables set VITE_SUPABASE_URL=https://tzskjzkolyiwhijslqmq.supabase.co"
echo "railway variables set VITE_SUPABASE_PUBLISHABLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InR6c2tqemtvbHlpd2hpanNscW1xIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDg2NTY3ODAsImV4cCI6MjA2NDIzMjc4MH0.EvlZrWKZVsUks6VArpizk98kmOc8nVS7vvjUbd4ThMw"
echo "railway variables set NODE_ENV=production"
echo "railway variables set PORT=3000" 
echo "railway variables set SUPABASE_SERVICE_KEY=[your-service-key]"

echo "✅ Deployment complete!"