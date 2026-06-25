@echo off
echo =========================================
echo Smart Vision Assistant - Development Local
echo =========================================

set ENV=development
set ASYNC_MODE=threading

echo Starting Frontend...
cd ..\frontend
start cmd /k "npm start"

echo Starting Backend...
cd ..\backend
call venv\Scripts\activate
python app.py
