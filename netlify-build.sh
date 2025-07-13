#!/bin/bash

# Netlify Build Script
# This script ensures the build process works correctly on Netlify

echo "🚀 Starting Netlify build process..."

# Check if we're in the right directory
echo "📁 Current directory: $(pwd)"
echo "📦 Package.json exists: $(test -f package.json && echo 'Yes' || echo 'No')"

# Install dependencies if package.json exists
if [ -f "package.json" ]; then
    echo "📦 Installing dependencies..."
    npm install
else
    echo "❌ Package.json not found!"
    exit 1
fi

# Run the build script
echo "🔨 Running build script..."
node build-script.js

# Check if build was successful
if [ $? -eq 0 ]; then
    echo "✅ Build completed successfully!"
else
    echo "❌ Build failed!"
    exit 1
fi 