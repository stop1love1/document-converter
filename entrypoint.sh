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
mkdir -p /app/uploads /app/results
chmod -R 777 /app/uploads /app/results

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