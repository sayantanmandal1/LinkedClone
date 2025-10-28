#!/bin/bash

# Production deployment script for LinkedIn Clone

set -e

echo "🚀 Starting production deployment..."

# Check if required environment variables are set
check_env_var() {
    if [ -z "${!1}" ]; then
        echo "❌ Error: $1 environment variable is not set"
        exit 1
    fi
}

echo "📋 Checking environment variables..."
check_env_var "MONGODB_URI"
check_env_var "JWT_SECRET"
check_env_var "FRONTEND_URL"

# Build shared dependencies
echo "🔧 Building shared dependencies..."
cd shared
npm ci
npm run build
cd ..

# Build backend
echo "🔧 Building backend..."
cd backend
npm ci
npm run build
echo "✅ Backend build complete"
cd ..

# Build frontend
echo "🔧 Building frontend..."
cd frontend
npm ci
npm run build
echo "✅ Frontend build complete"
cd ..

echo "✅ Production deployment preparation complete!"
echo "📝 Next steps:"
echo "   1. Deploy backend to Railway/Render"
echo "   2. Deploy frontend to Vercel"
echo "   3. Update environment variables on hosting platforms"
echo "   4. Test the deployed application"