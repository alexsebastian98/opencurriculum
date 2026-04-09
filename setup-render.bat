@echo off
REM Render deployment setup script for Windows

echo === OpenCurriculum Render Deployment Setup ===

REM Check if .env file exists in backend
if not exist "backend\.env" (
  echo ❌ backend\.env not found
  echo 📝 Creating from .env.example...
  copy backend\.env.example backend\.env
  echo ✅ Created backend\.env - Please edit with your credentials
) else (
  echo ✅ backend\.env found
)

REM Install frontend dependencies
echo.
echo 📦 Installing frontend dependencies...
cd frontend
call npm install
cd ..

REM Install backend dependencies
echo.
echo 📦 Installing backend dependencies...
cd backend
call npm install
cd ..

echo.
echo ✅ Setup complete!
echo.
echo 📋 Next steps:
echo 1. Update backend\.env with your MongoDB Atlas connection string
echo 2. Read RENDER_DEPLOYMENT.md for deployment instructions
echo 3. Push to GitHub
echo 4. Deploy on Render dashboard: https://dashboard.render.com/
pause
