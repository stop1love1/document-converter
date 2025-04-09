import json
import os
from datetime import datetime

HISTORY_FILE = 'conversion_history.json'

def add_to_history(source_file, target_format, status, error_message=None):
    """
    Add a conversion attempt to the history.
    
    Args:
        source_file (str): Name of the source file
        target_format (str): Target format of the conversion
        status (str): Success or failure status
        error_message (str, optional): Error message if conversion failed
    """
    history = load_history()
    
    entry = {
        'timestamp': datetime.now().isoformat(),
        'source_file': source_file,
        'target_format': target_format,
        'status': status,
        'error_message': error_message
    }
    
    history.append(entry)
    save_history(history)

def load_history():
    """Load the conversion history from file."""
    if os.path.exists(HISTORY_FILE):
        try:
            with open(HISTORY_FILE, 'r') as f:
                return json.load(f)
        except json.JSONDecodeError:
            return []
    return []

def save_history(history):
    """Save the conversion history to file."""
    with open(HISTORY_FILE, 'w') as f:
        json.dump(history, f, indent=2)

def get_history():
    """Get the complete conversion history."""
    return load_history() 