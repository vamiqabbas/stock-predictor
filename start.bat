@echo off
echo Starting Stock Predictor...
echo.

start "Backend API" cmd /k "cd /d %~dp0backend && node src/index.js"
timeout /t 2 /nobreak >nul
start "Frontend UI" cmd /k "cd /d %~dp0frontend && npm run dev"

echo.
echo Backend:  http://localhost:3001
echo Frontend: http://localhost:3000
echo.
pause
