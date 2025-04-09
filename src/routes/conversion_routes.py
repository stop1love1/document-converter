from flask import request, jsonify
try:
    from flasgger import swag_from
    SWAGGER_AVAILABLE = True
except ImportError:
    SWAGGER_AVAILABLE = False
    # Tạo một decorator giả để thay thế swag_from
    def swag_from(content, **kwargs):
        def decorator(f):
            return f
        return decorator

from werkzeug.utils import secure_filename
import os
from src.config.config import allowed_file, UPLOAD_FOLDER
from src.utils.conversion import process_file_conversion, process_text_conversion, process_base64_conversion, process_image_conversion
from datetime import datetime
from src.utils.history import add_to_history

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
            
    @app.route('/convert/image', methods=['POST'])
    @swag_from({
        'tags': ['Conversion'],
        'summary': 'Convert images between different formats',
        'description': 'API to convert images using ImageMagick',
        'consumes': [
            'multipart/form-data'
        ],
        'produces': [
            'application/json'
        ],
        'parameters': [
            {
                'name': 'image',
                'in': 'formData',
                'type': 'file',
                'required': True,
                'description': 'Image file to convert',
            },
            {
                'name': 'to_format',
                'in': 'formData',
                'type': 'string',
                'required': True,
                'description': 'Target format (e.g., jpg, png, webp, gif)',
                'enum': ['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp', 'tiff', 'ico', 'svg']
            },
            {
                'name': 'quality',
                'in': 'formData',
                'type': 'integer',
                'required': False,
                'description': 'Image quality (1-100)',
                'default': 90
            },
            {
                'name': 'resize',
                'in': 'formData',
                'type': 'string',
                'required': False,
                'description': 'Resize parameter (e.g., 800x600, 50%)'
            },
            {
                'name': 'options',
                'in': 'formData',
                'type': 'string',
                'required': False,
                'description': 'Additional ImageMagick options'
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
                            'description': 'URL to download the converted image'
                        },
                        'message': {
                            'type': 'string',
                            'description': 'Success message'
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
    def convert_image():
        try:
            # Check if image file is in the request
            if 'image' not in request.files:
                return jsonify({'error': 'No image file part'}), 400
                
            image = request.files['image']
            if image.filename == '':
                return jsonify({'error': 'No selected image'}), 400
                
            # Check image extension
            allowed_extensions = [
                'jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp', 'tiff', 'svg', 'ico',
                'heic', 'heif', 'avif', 'pdf', 'psd', 'ai', 'eps', 'raw', 'cr2', 'nef',
                'arw', 'dng', 'orf', 'rw2', 'rwl', 'pcx', 'tga', 'xcf', 'pnm', 'pbm',
                'pgm', 'ppm', 'xpm', 'xbm', 'jxr', 'wdp', 'hdp', 'jp2', 'j2k', 'jpf',
                'jpx', 'jpm', 'djvu', 'jxl', 'wmf', 'emf'
            ]
            ext = image.filename.rsplit('.', 1)[1].lower() if '.' in image.filename else ''
            if ext not in allowed_extensions:
                return jsonify({'error': f'Image format not supported. Allowed formats: {", ".join(allowed_extensions)}'}), 400
                
            # Get target format
            to_format = request.form.get('to_format')
            if not to_format:
                return jsonify({'error': 'Target format is required'}), 400
                
            # Validate target format
            if to_format.lower() not in allowed_extensions:
                return jsonify({'error': f'Target format not supported. Allowed formats: {", ".join(allowed_extensions)}'}), 400
                
            # Get optional parameters
            quality = request.form.get('quality', 90)
            try:
                quality = int(quality)
                if quality < 1 or quality > 100:
                    return jsonify({'error': 'Quality must be between 1 and 100'}), 400
            except ValueError:
                return jsonify({'error': 'Quality must be a number between 1 and 100'}), 400
                
            resize = request.form.get('resize', None)
            options = request.form.get('options', None)
                
            # Save uploaded image
            filename = secure_filename(image.filename)
            filepath = os.path.join(UPLOAD_FOLDER, filename)
            image.save(filepath)
                
            try:
                # Process image conversion
                result = process_image_conversion(filepath, to_format, quality, resize, options)
                
                # Clean up uploaded file
                if os.path.exists(filepath):
                    os.remove(filepath)
                    
                return jsonify(result)
            except Exception as e:
                # Clean up uploaded file in case of error
                if os.path.exists(filepath):
                    os.remove(filepath)
                raise e
                
        except Exception as e:
            app.logger.error(f"Image conversion error: {str(e)}")
            return jsonify({'error': str(e)}), 500 