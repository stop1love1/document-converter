#!/bin/bash
set -e

# Debug information
echo "Starting entrypoint script"
echo "Current directory: $(pwd)"
echo "Directory contents: $(ls -la)"

# Setup Python environment
echo "Setting up Python environment"
export PYTHONPATH=/app:$PYTHONPATH
export PYTHONDONTWRITEBYTECODE=1
export PYTHONUNBUFFERED=1

# Create needed directories
echo "Setting up directories"
mkdir -p /app/uploads /app/results /app/OMRChecker/outputs /app/OMRChecker/cache
chmod -R 777 /app/uploads /app/results /app/OMRChecker/outputs /app/OMRChecker/cache

# Set up virtual display
echo "Setting up virtual display"
# Create fake X authentication file
touch ~/.Xauthority

# Start Xvfb in the background
Xvfb :99 -ac -screen 0 1920x1080x24 &
XVFB_PID=$!

# Set display environment variable
export DISPLAY=:99

# Wait for Xvfb to start
sleep 2

# Check if Xvfb started successfully
if ! ps -p $XVFB_PID > /dev/null; then
    echo "Failed to start Xvfb, continuing without display server"
    # Set environment variables to run in headless mode without display
    export MPLBACKEND=Agg
else
    echo "Xvfb started successfully with PID: $XVFB_PID"
fi

# Set environment variables to avoid issues with matplotlib and other GUI dependencies
export MPLBACKEND=Agg
export QT_QPA_PLATFORM=offscreen

# Verify OMRChecker is correctly set up
echo "Checking OMRChecker setup"
ls -la /app/OMRChecker
if [ ! -f "/app/OMRChecker/main.py" ]; then
    echo "ERROR: OMRChecker main.py not found!"
else
    echo "OMRChecker main.py found."
fi

# Verify application structure
echo "Checking application structure"
if [ -d "/app/src" ]; then
    echo "Application src directory found"
    ls -la /app/src
    
    if [ -d "/app/src/config" ]; then
        echo "Config directory found"
        ls -la /app/src/config
    else
        echo "ERROR: Config directory not found!"
    fi
else
    echo "ERROR: Application src directory not found!"
fi

# Run the application
echo "Starting application"
exec python /app/app.py 