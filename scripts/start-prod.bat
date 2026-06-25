@echo off
echo =========================================
echo Smart Vision Assistant - Production Local
echo =========================================

set ENV=production
set ASYNC_MODE=eventlet

echo [1/3] Checking Frontend Build...
if not exist "..\frontend\build" (
    echo Building React Frontend...
    cd ..\frontend
    call npm install
    call npm run build
    cd ..\scripts
) else (
    echo Frontend build found.
)

echo [2/3] Activating Virtual Environment...
cd ..\backend
if not exist "venv" (
    echo Creating virtual environment...
    python -m venv venv
    call venv\Scripts\activate
    echo Installing dependencies...
    pip install -r requirements.txt
) else (
    call venv\Scripts\activate
)

echo [3/3] Starting Unified Backend Server...
start http://localhost:5000
python app.py
