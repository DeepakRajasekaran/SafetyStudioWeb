#!/bin/bash

# Navigate to the workspace directory
cd "$(dirname "$0")"

echo "======================================"
echo " Starting SafetyStudioWeb             "
echo "======================================"

# Check if requirements and npm modules need to be installed (optional but helpful)
if [ ! -d "node_modules" ]; then
    echo "node_modules not found. Running npm install..."
    npm install
fi

echo "[1/2] Starting Python backend..."
python3 app.py &
BACKEND_PID=$!

# Wait briefly to ensure backend starts up
sleep 2

echo "[2/2] Starting React frontend..."
npm start &
FRONTEND_PID=$!

echo ""
echo "All services have been launched."
echo "Press [Ctrl+C] to stop everything."
echo "======================================"

cleanup() {
    echo ""
    echo "Caught termination signal. Cleaning up..."
    
    # Gracefully terminate the background processes
    if kill -0 $BACKEND_PID 2>/dev/null; then
        kill -TERM $BACKEND_PID
    fi
    
    if kill -0 $FRONTEND_PID 2>/dev/null; then
        kill -TERM $FRONTEND_PID
    fi
    
    wait $BACKEND_PID 2>/dev/null
    wait $FRONTEND_PID 2>/dev/null
    echo "Shutdown complete."
    exit 0
}

# Catch Ctrl+C and termination signals
trap cleanup SIGINT SIGTERM

# Keep the script running to catch the trap
while true; do
    sleep 1
done
