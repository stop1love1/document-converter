from flask import render_template, redirect, send_file, request, jsonify
import os
import uuid
from src.config.config import APP_AUTHOR, PANDOC_INPUT_FORMATS, PANDOC_OUTPUT_FORMATS, PANDOC_COMMON_OPTIONS, UPLOAD_FOLDER

def register_main_routes(app):
    """Register main application routes"""
    
    # Ensure upload directory exists
    os.makedirs(UPLOAD_FOLDER, exist_ok=True)
    
    @app.route('/')
    def index():
        return render_template('index.html', 
                            input_formats=PANDOC_INPUT_FORMATS,
                            output_formats=PANDOC_OUTPUT_FORMATS,
                            common_options=PANDOC_COMMON_OPTIONS,
                            author=APP_AUTHOR)

    @app.route('/download/<filename>')
    def download_file(filename):
        return send_file(
            os.path.join(UPLOAD_FOLDER, filename),
            as_attachment=True
        ) 