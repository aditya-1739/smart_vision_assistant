#!/bin/bash
echo "========================================="
echo "Smart Vision Assistant - Production Local"
echo "========================================="

export ENV=production
export ASYNC_MODE=eventlet

echo "[1/3] Checking Frontend Build..."
if [ ! -d "../frontend/build" ]; then
    echo "Building React Frontend..."
    cd ../frontend
    npm install
    npm run build
    cd ../scripts
else
    echo "Frontend build found."
fi

echo "[2/3] Activating Virtual Environment..."
cd ../backend
if [ ! -d "venv" ]; then
    echo "Creating virtual environment..."
    python3 -m venv venv
    source venv/bin/activate
    echo "Installing dependencies..."
    pip install -r requirements.txt
else
    source venv/bin/activate
fi

echo "[3/3] Starting Unified Backend Server..."
# Attempt to open browser on macOS or Linux
if which xdg-open > /dev/null
then
  xdg-open http://localhost:5000 &
elif which open > /dev/null
then
  open http://localhost:5000 &
fi

python app.py
