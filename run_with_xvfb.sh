#!/bin/bash

# Create fake X authentication file
touch ~/.Xauthority

# Start Xvfb with specific options
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
fi

# Set environment variables to avoid issues with matplotlib and other GUI dependencies
export MPLBACKEND=Agg
export QT_QPA_PLATFORM=offscreen

# Fix Python path for imports
export PYTHONPATH=/app:/app/OMRChecker:$PYTHONPATH

# Debug information
echo "Current directory: $(pwd)"
echo "PYTHONPATH: $PYTHONPATH"
echo "Directory contents: $(ls -la)"
echo "src directory contents: $(ls -la src 2>/dev/null || echo 'src directory not found')"

# Run the application
python app.py 