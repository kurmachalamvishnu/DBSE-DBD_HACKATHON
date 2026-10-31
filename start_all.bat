@echo off
TITLE CareQueue - Healthcare Queue Management System Launcher
COLOR 0A

echo =========================================================================
echo      CareQueue (TM) - Healthcare Queue Management System (Project 36)
echo      Full Stack: MySQL 8.0 + Python FastAPI AI + Express + React Vite
echo =========================================================================
echo.

cd /d "%~dp0"

echo [1/4] Checking and Initializing MySQL 8.0 Database...
"C:\Program Files\MySQL\MySQL Server 8.0\bin\mysql.exe" -u root -pvishnu@2008 -e "source ./database/01_schema.sql;" 2>nul
"C:\Program Files\MySQL\MySQL Server 8.0\bin\mysql.exe" -u root -pvishnu@2008 -e "source ./database/02_seed_data.sql;" 2>nul
"C:\Program Files\MySQL\MySQL Server 8.0\bin\mysql.exe" -u root -pvishnu@2008 -e "source ./database/03_views.sql;" 2>nul
"C:\Program Files\MySQL\MySQL Server 8.0\bin\mysql.exe" -u root -pvishnu@2008 -e "source ./database/04_stored_procedures.sql;" 2>nul
"C:\Program Files\MySQL\MySQL Server 8.0\bin\mysql.exe" -u root -pvishnu@2008 -e "source ./database/05_triggers.sql;" 2>nul
"C:\Program Files\MySQL\MySQL Server 8.0\bin\mysql.exe" -u root -pvishnu@2008 -e "source ./database/06_indexes_optimization.sql;" 2>nul
echo    [OK] MySQL Database & Stored Procedures initialized successfully.
echo.

echo [2/4] Starting Python AI Waiting Time Estimation Microservice (Port 8000)...
start "CareQueue AI Service (FastAPI :8000)" cmd /k "cd /d %~dp0ai_service && python -m uvicorn main:app --port 8000 --reload"
echo    [OK] Python AI Microservice launched.
echo.

echo [3/4] Starting Node.js REST API & WebSocket Server (Port 5000)...
start "CareQueue Backend API (Node.js :5000)" cmd /k "cd /d %~dp0backend && npm start"
echo    [OK] Node.js Backend API launched.
echo.

echo [4/4] Starting React Vite Frontend Web Application (Port 3000)...
start "CareQueue Frontend (Vite :3000)" cmd /k "cd /d %~dp0frontend && npm run dev"
echo    [OK] Frontend Dev Server launched.
echo.

timeout /t 5 >nul
echo Opening CareQueue Application in default browser...
start http://localhost:3000

echo =========================================================================
echo      System is fully running!
echo      - Frontend Dashboard:   http://localhost:3000
echo      - Backend REST API:     http://localhost:5000/api/health
echo      - Python AI Engine:     http://localhost:8000/
echo =========================================================================
pause
