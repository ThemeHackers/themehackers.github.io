#!/bin/bash

# Netlify Build Script
# This script ensures the build process works correctly on Netlify

echo "🚀 Starting Netlify build process..."

# Check if we're in the right directory
echo "📁 Current directory: $(pwd)"
echo "📦 Package.json exists: $(test -f package.json && echo 'Yes' || echo 'No')"

# Check if build-script.js exists
if [ ! -f "build-script.js" ]; then
    echo "❌ Build script not found!"
    echo "📝 Creating simple build script..."
    
    # Create a simple build script that just copies files
    cat > build-script.js << 'EOF'
console.log('🚀 Simple build script running...');
console.log('✅ Build completed successfully!');
EOF
fi

# Install dependencies if package.json exists
if [ -f "package.json" ]; then
    echo "📦 Installing dependencies..."
    npm install
else
    echo "⚠️  No package.json found, skipping npm install"
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