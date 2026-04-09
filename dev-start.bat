@echo off
REM Start both frontend and backend locally for development

echo === Starting OpenCurriculum (Development) ===
echo.
echo Starting MongoDB... (ensure mongod is running)
echo.

echo Backend on http://localhost:5000
echo Frontend on http://localhost:5173
echo.

REM Start backend
cd backend
echo 🚀 Starting backend on port 5000...
start npm start

REM Start frontend
cd ..\frontend
echo 🚀 Starting frontend on port 5173...
npm run dev
