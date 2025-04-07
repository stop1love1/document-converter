#!/bin/bash

# Check if Python is installed
if ! command -v python3 &> /dev/null; then
    echo "Error: Python 3 is not installed"
    exit 1
fi

# Check if pandoc is installed
if ! command -v pandoc &> /dev/null; then
    echo "Warning: Pandoc is not installed. The converter will not work properly."
    echo "Please install Pandoc: https://pandoc.org/installing.html"
    read -p "Continue anyway? (y/n) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        exit 1
    fi
fi

# Install dependencies if not already installed
if [ ! -d "venv" ]; then
    echo "Setting up virtual environment..."
    python3 -m venv venv
    source venv/bin/activate
    pip install -r requirements.txt
else
    source venv/bin/activate
fi

# Set Flask environment variables
export FLASK_APP=server.py
export FLASK_ENV=development

# Start the server
echo "Starting document converter UI server..."
flask run --host=0.0.0.0 --port=5000
