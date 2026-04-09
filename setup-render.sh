#!/bin/bash
# Render deployment setup script

echo "=== OpenCurriculum Render Deployment Setup ==="

# Check if .env file exists in backend
if [ ! -f "backend/.env" ]; then
  echo "❌ backend/.env not found"
  echo "📝 Creating from .env.example..."
  cp backend/.env.example backend/.env
  echo "✅ Created backend/.env - Please edit with your credentials"
fi

# Install frontend dependencies
echo ""
echo "📦 Installing frontend dependencies..."
cd frontend
npm install
cd ..

# Install backend dependencies
echo ""
echo "📦 Installing backend dependencies..."
cd backend
npm install
cd ..

echo ""
echo "✅ Setup complete!"
echo ""
echo "📋 Next steps:"
echo "1. Update backend/.env with your MongoDB Atlas connection string"
echo "2. Read RENDER_DEPLOYMENT.md for deployment instructions"
echo "3. Push to GitHub"
echo "4. Deploy on Render dashboard: https://dashboard.render.com/"
