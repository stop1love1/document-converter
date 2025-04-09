from flask import render_template, redirect, send_file, request, jsonify
import os
import uuid
from src.config.config import APP_AUTHOR, PANDOC_INPUT_FORMATS, PANDOC_OUTPUT_FORMATS, PANDOC_COMMON_OPTIONS, UPLOAD_FOLDER
from src.utils.orm_scanner import scan_orm_from_file, scan_orm_from_directory, generate_orm_report
from src.utils.omr_processor import get_omr_processor

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

    @app.route('/scan-orm')
    def scan_orm():
        return render_template('scan_orm.html', 
                            author=APP_AUTHOR)
    
    @app.route('/scan-orm/process', methods=['POST'])
    def process_omr():
        """Process an uploaded OMR sheet image and return the results as JSON"""
        if 'file' not in request.files:
            return jsonify({'error': 'No file uploaded'}), 400
            
        file = request.files['file']
        if file.filename == '':
            return jsonify({'error': 'No file selected'}), 400
            
        # Check file extension
        allowed_extensions = {'png', 'jpg', 'jpeg', 'gif', 'tif', 'tiff', 'bmp'}
        if '.' not in file.filename or file.filename.rsplit('.', 1)[1].lower() not in allowed_extensions:
            return jsonify({'error': 'Invalid file format. Allowed formats: png, jpg, jpeg, gif, tif, tiff, bmp'}), 400
            
        # Make sure upload directory exists
        os.makedirs(UPLOAD_FOLDER, exist_ok=True)
        
        # Save the uploaded file with absolute path
        filename = f"{uuid.uuid4()}_{file.filename}"
        upload_path = os.path.join(os.path.abspath(UPLOAD_FOLDER), filename)
        file.save(upload_path)
        
        # Get custom template if provided
        template_path = None
        if 'template' in request.files:
            template_file = request.files['template']
            if template_file.filename != '':
                template_name = f"template_{uuid.uuid4()}.json"
                template_path = os.path.join(os.path.abspath(UPLOAD_FOLDER), template_name)
                template_file.save(template_path)
        
        # Process the image
        result_folder = os.path.join(app.config.get('RESULT_FOLDER', 'src/results'))
        os.makedirs(result_folder, exist_ok=True)
        
        processor = get_omr_processor(UPLOAD_FOLDER, result_folder)
        results = processor.process_image(upload_path, template_path)
        
        # Clean up template file if it was created
        if template_path and os.path.exists(template_path):
            os.unlink(template_path)
            
        return jsonify(results)

    @app.route('/scan-orm/validate-template', methods=['POST'])
    def validate_template():
        """Validate an uploaded OMR template file"""
        if 'template' not in request.files:
            return jsonify({'error': 'No template file uploaded'}), 400
            
        template_file = request.files['template']
        if template_file.filename == '':
            return jsonify({'error': 'No template file selected'}), 400
            
        # Check file extension
        if '.' not in template_file.filename or template_file.filename.rsplit('.', 1)[1].lower() != 'json':
            return jsonify({'error': 'Invalid template format. Only JSON files are allowed'}), 400
            
        # Make sure upload directory exists
        os.makedirs(UPLOAD_FOLDER, exist_ok=True)
        
        # Save the uploaded template with absolute path
        template_name = f"template_{uuid.uuid4()}.json"
        template_path = os.path.join(os.path.abspath(UPLOAD_FOLDER), template_name)
        template_file.save(template_path)
        
        # Validate the template
        result_folder = os.path.join(app.config.get('RESULT_FOLDER', 'src/results'))
        os.makedirs(result_folder, exist_ok=True)
        
        processor = get_omr_processor(UPLOAD_FOLDER, result_folder)
        results = processor.process_template(template_path)
        
        # Clean up template file
        if os.path.exists(template_path):
            os.unlink(template_path)
            
        return jsonify(results)

    @app.route('/download/<filename>')
    def download_file(filename):
        return send_file(
            os.path.join(UPLOAD_FOLDER, filename),
            as_attachment=True
        ) 