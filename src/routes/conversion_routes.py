from flask import request, jsonify
from flasgger import swag_from
from werkzeug.utils import secure_filename
import os
from src.config.config import allowed_file, UPLOAD_FOLDER
from src.utils.conversion import process_file_conversion, process_text_conversion, process_base64_conversion

def register_conversion_routes(app):
    """Register conversion-related routes"""

    @app.route('/convert', methods=['POST'])
    @swag_from({
        'tags': ['Conversion'],
        'summary': 'Convert documents between different formats',
        'description': 'API to convert documents using Pandoc',
        'consumes': [
            'application/json',
            'multipart/form-data'
        ],
        'produces': [
            'application/json'
        ],
        'parameters': [
            {
                'name': 'conversion_type',
                'in': 'formData',
                'type': 'string',
                'required': True,
                'description': 'Type of conversion: file, text, or base64',
                'enum': ['file', 'text', 'base64']
            },
            {
                'name': 'from_format',
                'in': 'formData',
                'type': 'string',
                'required': True,
                'description': 'Source format (e.g., docx, markdown, html)',
            },
            {
                'name': 'to_format',
                'in': 'formData',
                'type': 'string',
                'required': True,
                'description': 'Target format (e.g., html, pdf, markdown)',
            },
            {
                'name': 'options',
                'in': 'formData',
                'type': 'string',
                'required': False,
                'description': 'Additional Pandoc options (e.g., --toc --standalone)',
            },
            {
                'name': 'file',
                'in': 'formData',
                'type': 'file',
                'required': False,
                'description': 'File to convert (required if conversion_type is "file")',
            },
            {
                'name': 'text',
                'in': 'formData',
                'type': 'string',
                'required': False,
                'description': 'Text content to convert (required if conversion_type is "text")',
            },
            {
                'name': 'base64_data',
                'in': 'formData',
                'type': 'string',
                'required': False,
                'description': 'Base64 encoded content (required if conversion_type is "base64")',
            }
        ],
        'responses': {
            '200': {
                'description': 'Successful conversion',
                'schema': {
                    'type': 'object',
                    'properties': {
                        'success': {
                            'type': 'boolean',
                            'description': 'Operation status'
                        },
                        'downloadUrl': {
                            'type': 'string',
                            'description': 'URL to download the converted file (file conversion only)'
                        },
                        'content': {
                            'type': 'string',
                            'description': 'Converted content'
                        },
                        'result': {
                            'type': 'string',
                            'description': 'Converted result (for text and base64)'
                        }
                    }
                }
            },
            '400': {
                'description': 'Bad request',
                'schema': {
                    'type': 'object',
                    'properties': {
                        'error': {
                            'type': 'string',
                            'description': 'Error message'
                        }
                    }
                }
            },
            '500': {
                'description': 'Server error',
                'schema': {
                    'type': 'object',
                    'properties': {
                        'error': {
                            'type': 'string',
                            'description': 'Error message'
                        }
                    }
                }
            }
        }
    })
    def convert():
        try:
            # Get conversion type from either form data or JSON
            if request.is_json:
                data = request.get_json()
                conversion_type = data.get('conversion_type')
                from_format = data.get('from_format')
                to_format = data.get('to_format')
                options = data.get('options', '')
            else:
                conversion_type = request.form.get('conversion_type')
                from_format = request.form.get('from_format')
                to_format = request.form.get('to_format')
                options = request.form.get('options', '')

            # Validate required parameters
            if not conversion_type:
                return jsonify({'error': 'Conversion type is required'}), 400
            if not from_format:
                return jsonify({'error': 'From format is required'}), 400
            if not to_format:
                return jsonify({'error': 'To format is required'}), 400

            if conversion_type == 'file':
                if 'file' not in request.files:
                    return jsonify({'error': 'No file part'}), 400
                
                file = request.files['file']
                if file.filename == '':
                    return jsonify({'error': 'No selected file'}), 400
                
                if not allowed_file(file.filename):
                    return jsonify({'error': 'File type not allowed'}), 400
                
                try:
                    # Save uploaded file
                    filename = secure_filename(file.filename)
                    filepath = os.path.join(UPLOAD_FOLDER, filename)
                    file.save(filepath)
                    
                    # Process file conversion
                    result = process_file_conversion(filepath, from_format, to_format, options)
                    
                    # Clean up uploaded file if it exists
                    if os.path.exists(filepath):
                        os.remove(filepath)
                    
                    return jsonify(result)
                except Exception as e:
                    # Clean up uploaded file in case of error
                    if 'filepath' in locals() and os.path.exists(filepath):
                        os.remove(filepath)
                    raise e
                
            elif conversion_type == 'text':
                if request.is_json:
                    text = data.get('text', '')
                else:
                    text = request.form.get('text', '')
                    
                if not text:
                    return jsonify({'error': 'Text is required'}), 400
                    
                # Process text conversion
                result = process_text_conversion(text, from_format, to_format, options)
                return jsonify(result)
                
            elif conversion_type == 'base64':
                if request.is_json:
                    base64_data = data.get('base64_data', '')
                else:
                    base64_data = request.form.get('base64_data', '')
                    
                if not base64_data:
                    return jsonify({'error': 'Base64 data is required'}), 400
                    
                # Process base64 conversion
                result = process_base64_conversion(base64_data, from_format, to_format, options)
                return jsonify(result)
                
            else:
                return jsonify({'error': 'Invalid conversion type'}), 400
                
        except Exception as e:
            app.logger.error(f"Conversion error: {str(e)}")
            return jsonify({'error': str(e)}), 500 