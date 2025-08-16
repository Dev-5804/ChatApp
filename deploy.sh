#!/bin/bash

# Deployment script for Railway/Render
echo "🚀 Starting deployment process..."

# Install frontend dependencies
echo "📦 Installing frontend dependencies..."
npm install

# Build frontend
echo "🔨 Building frontend..."
npm run build

# Install backend dependencies
echo "📦 Installing backend dependencies..."
cd server && npm install

echo "✅ Deployment setup complete!"
echo "📋 Next steps:"
echo "1. Push your code to GitHub"
echo "2. Connect your repository to Railway/Render"
echo "3. Add environment variables"
echo "4. Deploy!"
