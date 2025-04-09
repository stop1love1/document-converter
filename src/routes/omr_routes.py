from flask import Blueprint, request, jsonify, current_app
import os
import uuid
from werkzeug.utils import secure_filename
from src.utils.omr_processor import get_omr_processor

# Create blueprint
omr_bp = Blueprint('omr', __name__)

# Helper function to check allowed file extensions
def allowed_file(filename):
    ALLOWED_EXTENSIONS = {'png', 'jpg', 'jpeg', 'gif'}
    return '.' in filename and \
           filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

@omr_bp.route('/process', methods=['POST'])
def process_omr():
    """Process an OMR sheet image and return results"""
    
    # Check if the post request has the file part
    if 'file' not in request.files:
        return jsonify({'error': 'No file part'}), 400
    
    file = request.files['file']
    
    # If user does not select file, browser also
    # submit an empty part without filename
    if file.filename == '':
        return jsonify({'error': 'No selected file'}), 400
    
    if file and allowed_file(file.filename):
        # Generate unique filename
        unique_id = str(uuid.uuid4())
        filename = secure_filename(file.filename)
        base_name, extension = os.path.splitext(filename)
        unique_filename = f"{unique_id}_{base_name}{extension}"
        
        # Define path
        upload_folder = current_app.config['UPLOAD_FOLDER']
        results_folder = current_app.config['RESULTS_FOLDER']
        file_path = os.path.join(upload_folder, unique_filename)
        
        # Save the file
        file.save(file_path)
        
        # Process the OMR sheet
        omr_processor = get_omr_processor(upload_folder, results_folder)
        
        # Get template path from request if provided
        template_path = None
        if 'template' in request.files:
            template_file = request.files['template']
            template_filename = f"{unique_id}_template.json"
            template_path = os.path.join(upload_folder, template_filename)
            template_file.save(template_path)
        
        # Process the image
        results = omr_processor.process_image(file_path, template_path)
        
        # Add file path to results
        results['file_path'] = file_path
        
        return jsonify(results)
    
    return jsonify({'error': 'File type not allowed'}), 400

@omr_bp.route('/vietnamese-omr', methods=['POST'])
def process_vietnamese_omr():
    """Process a Vietnamese OMR sheet image with specialized settings"""
    
    # Check if the post request has the file part
    if 'file' not in request.files:
        return jsonify({'error': 'No file part'}), 400
    
    file = request.files['file']
    
    # If user does not select file, browser also
    # submit an empty part without filename
    if file.filename == '':
        return jsonify({'error': 'No selected file'}), 400
    
    if file and allowed_file(file.filename):
        # Generate unique filename
        unique_id = str(uuid.uuid4())
        filename = secure_filename(file.filename)
        base_name, extension = os.path.splitext(filename)
        unique_filename = f"{unique_id}_{base_name}{extension}"
        
        # Define path
        upload_folder = current_app.config['UPLOAD_FOLDER']
        results_folder = current_app.config['RESULTS_FOLDER']
        file_path = os.path.join(upload_folder, unique_filename)
        
        # Save the file
        file.save(file_path)
        
        # Process the OMR sheet with Vietnamese template
        omr_processor = get_omr_processor(upload_folder, results_folder)
        
        # Get Vietnamese template path
        template_path = omr_processor.vietnamese_template_path
        
        # Process the image with Vietnamese template
        results = omr_processor.process_image(file_path, template_path)
        
        # Add file path to results
        results['file_path'] = file_path
        results['template_used'] = 'vietnamese'
        
        return jsonify(results)
    
    return jsonify({'error': 'File type not allowed'}), 400

@omr_bp.route('/templates/vietnamese', methods=['GET'])
def get_vietnamese_template():
    """Get the Vietnamese OMR template configuration"""
    omr_processor = get_omr_processor(
        current_app.config['UPLOAD_FOLDER'], 
        current_app.config['RESULTS_FOLDER']
    )
    
    template = omr_processor.get_vietnamese_template()
    return jsonify(template) 