@echo off
title LaserVibe Machine Vibration Monitor Launcher
cls
echo =====================================================================
echo  LaserVibe - Non-Contact Machine Vibration Monitor Launcher
echo =====================================================================
echo.

echo [1/3] Detecting Laptop LAN IP Address...
for /f "tokens=2 delims=:" %%a in ('ipconfig ^| findstr /c:"IPv4 Address"') do (
    echo  -> Your Laptop IP is: %%a
)
echo.

echo [2/3] Starting FastAPI Backend Server on port 8000...
start "LaserVibe FastAPI Backend" cmd /k "set PYTHONPATH=. && .venv\Scripts\python.exe -m uvicorn backend.main:app --host 0.0.0.0 --port 8000"

echo [3/3] Starting Next.js SCADA Dashboard on port 3000...
start "LaserVibe SCADA Dashboard" cmd /k "npm run dev"

echo.
echo =====================================================================
echo  System is launching!
echo  - Dashboard URL: http://localhost:3000/dashboard
echo  - ESP32 Endpoint: http://<your-laptop-ip>:8000/api/signal
echo =====================================================================
echo.
timeout /t 4 >nul
start http://localhost:3000/dashboard
pause
