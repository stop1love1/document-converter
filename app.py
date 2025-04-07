from flask import Flask, render_template, request, jsonify, send_file, redirect
import os
import base64
import tempfile
from werkzeug.utils import secure_filename
import subprocess
import json
from flasgger import Swagger, swag_from

app = Flask(__name__, 
    static_folder='src/static',
    template_folder='src/templates'
)

# Swagger configuration
swagger_config = {
    "swagger": "2.0",
    "title": "Document Converter API",
    "description": "API for converting documents between different formats using Pandoc",
    "version": "1.0.0",
    "termsOfService": "",
    "headers": [],
    "specs": [
        {
            "endpoint": "apispec",
            "route": "/apispec.json",
            "rule_filter": lambda rule: True,
            "model_filter": lambda tag: True,
        }
    ],
    "static_url_path": "/flasgger_static",
    "swagger_ui": True,
    "specs_route": "/api/docs/",
    "uiversion": 3  # Use Swagger UI version 3
}

swagger_template = {
    "info": {
        "title": "Document Converter API",
        "description": "API for converting documents between different formats using Pandoc",
        "contact": {
            "name": "stop1love1",
            "url": "https://github.com/stop1love1/document-converter"
        },
        "version": "1.0.0"
    },
    "schemes": ["http", "https"],
    "consumes": ["application/json", "multipart/form-data"],
    "produces": ["application/json"],
    "security": [
        {"ApiKeyAuth": []}
    ],
    "securityDefinitions": {
        "ApiKeyAuth": {
            "type": "apiKey",
            "name": "X-API-KEY",
            "in": "header"
        }
    }
}

swagger = Swagger(app, config=swagger_config, template=swagger_template)

# Author information
APP_AUTHOR = "stop1love1"
APP_VERSION = "1.0.0"

# Configure upload folder
UPLOAD_FOLDER = 'uploads'
if not os.path.exists(UPLOAD_FOLDER):
    os.makedirs(UPLOAD_FOLDER)
app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER

# Allowed file extensions
ALLOWED_EXTENSIONS = {'txt', 'pdf', 'docx', 'md', 'html', 'odt', 'epub', 'latex', 'tex'}

# Pandoc supported formats
PANDOC_INPUT_FORMATS = [
    'markdown', 'commonmark', 'gfm', 'markdown_mmd', 'markdown_phpextra', 'markdown_strict', 
    'docx', 'docbook', 'docbook4', 'docbook5', 'html', 'latex', 'odt', 'opml', 'org', 'rst', 
    'mediawiki', 'textile', 'twiki', 'epub', 'haddock', 'jats'
]

PANDOC_OUTPUT_FORMATS = [
    'markdown', 'commonmark', 'gfm', 'markdown_mmd', 'markdown_phpextra', 'markdown_strict',
    'asciidoc', 'docx', 'docbook', 'docbook4', 'docbook5', 'epub', 'epub2', 'epub3', 'html', 
    'html4', 'html5', 'jats', 'json', 'latex', 'man', 'ms', 'odt', 'opendocument', 'opml', 
    'org', 'pdf', 'plain', 'pptx', 'rst', 'rtf', 'texinfo', 'textile', 'zimwiki'
]

# Common Pandoc options
PANDOC_COMMON_OPTIONS = [
    '--toc', '--standalone', '--self-contained', '--template=', '--css=', 
    '--number-sections', '--no-highlight', '--highlight-style=', '--include-in-header=',
    '--include-before-body=', '--include-after-body=', '--columns=', '--table-of-contents',
    '--reference-links', '--atx-headers', '--preserve-tabs', '--tab-stop=',
    '--pdf-engine=xelatex', '--pdf-engine=wkhtmltopdf', '--metadata='
]

def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

@app.route('/')
def index():
    return render_template('index.html', 
                          input_formats=PANDOC_INPUT_FORMATS,
                          output_formats=PANDOC_OUTPUT_FORMATS,
                          common_options=PANDOC_COMMON_OPTIONS,
                          author=APP_AUTHOR)

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
                filepath = os.path.join(app.config['UPLOAD_FOLDER'], filename)
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

@app.route('/download/<filename>')
@swag_from({
    'tags': ['Download'],
    'summary': 'Download converted file',
    'description': 'API to download a converted file',
    'produces': [
        'application/octet-stream'
    ],
    'parameters': [
        {
            'name': 'filename',
            'in': 'path',
            'type': 'string',
            'required': True,
            'description': 'Name of the file to download',
        }
    ],
    'responses': {
        '200': {
            'description': 'File content',
        },
        '404': {
            'description': 'File not found',
        }
    }
})
def download_file(filename):
    return send_file(
        os.path.join(app.config['UPLOAD_FOLDER'], filename),
        as_attachment=True
    )

@app.route('/api/formats', methods=['GET'])
@swag_from({
    'tags': ['Formats'],
    'summary': 'Get supported formats',
    'description': 'Get list of supported input and output formats',
    'produces': [
        'application/json'
    ],
    'responses': {
        '200': {
            'description': 'List of supported formats',
            'schema': {
                'type': 'object',
                'properties': {
                    'input_formats': {
                        'type': 'array',
                        'items': {'type': 'string'},
                        'description': 'Supported input formats'
                    },
                    'output_formats': {
                        'type': 'array',
                        'items': {'type': 'string'},
                        'description': 'Supported output formats'
                    }
                }
            }
        }
    }
})
def get_formats():
    return jsonify({
        'input_formats': PANDOC_INPUT_FORMATS,
        'output_formats': PANDOC_OUTPUT_FORMATS
    })

@app.route('/docs/')
def api_docs_redirect():
    return redirect('/api/docs/')

def process_file_conversion(filepath, from_format, to_format, options):
    """Process file conversion using pandoc"""
    try:
        # Convert file
        output_filename = f"{os.path.splitext(os.path.basename(filepath))[0]}.{to_format}"
        output_path = os.path.join(app.config['UPLOAD_FOLDER'], output_filename)
        
        cmd = ['pandoc', filepath, '-f', from_format, '-t', to_format]
        if options:
            cmd.extend(options.split())
        cmd.extend(['-o', output_path])
        
        subprocess.run(cmd, check=True)
        
        # Read the content of the converted file to include in the response
        content = ""
        try:
            with open(output_path, 'r', encoding='utf-8') as f:
                content = f.read()
        except UnicodeDecodeError:
            # If file is binary, provide a message
            content = "[Binary content - download to view]"
        
        return {
            'success': True,
            'downloadUrl': f'/download/{output_filename}',
            'content': content
        }
    except subprocess.CalledProcessError as e:
        return {'error': f'Conversion failed: {str(e)}'}

def process_text_conversion(text, from_format, to_format, options):
    """Process text conversion using pandoc"""
    try:
        # Create temporary file for input
        with tempfile.NamedTemporaryFile(mode='w', delete=False, suffix=f'.{from_format}') as temp_in:
            temp_in.write(text)
            temp_in_path = temp_in.name
        
        # Create temporary file for output
        temp_out_path = temp_in_path + f'.{to_format}'
        
        # Convert content
        cmd = ['pandoc', temp_in_path, '-f', from_format, '-t', to_format]
        if options:
            cmd.extend(options.split())
        cmd.extend(['-o', temp_out_path])
        
        subprocess.run(cmd, check=True)
        
        # Read converted content
        content = ""
        try:
            with open(temp_out_path, 'r', encoding='utf-8') as f:
                content = f.read()
        except UnicodeDecodeError:
            with open(temp_out_path, 'rb') as f:
                content = "[Binary content]"
        
        # Clean up temporary files
        os.unlink(temp_in_path)
        os.unlink(temp_out_path)
        
        return {
            'success': True,
            'result': content,
            'content': content
        }
    except subprocess.CalledProcessError as e:
        return {'error': f'Conversion failed: {str(e)}'}

def process_base64_conversion(base64_data, from_format, to_format, options):
    """Process base64 conversion using pandoc"""
    try:
        # Decode base64 content
        try:
            # Remove data URL prefix if present
            if ',' in base64_data:
                base64_data = base64_data.split(',', 1)[1]
            
            decoded_content = base64.b64decode(base64_data)
        except:
            return {'error': 'Invalid base64 content'}
        
        # Create temporary file for input
        with tempfile.NamedTemporaryFile(delete=False, suffix=f'.{from_format}') as temp_in:
            temp_in.write(decoded_content)
            temp_in_path = temp_in.name
        
        # Create temporary file for output
        temp_out_path = temp_in_path + f'.{to_format}'
        
        # Convert content
        cmd = ['pandoc', temp_in_path, '-f', from_format, '-t', to_format]
        if options:
            cmd.extend(options.split())
        cmd.extend(['-o', temp_out_path])
        
        subprocess.run(cmd, check=True)
        
        # Read converted content
        converted_content = None
        content = ""
        
        try:
            with open(temp_out_path, 'r', encoding='utf-8') as f:
                content = f.read()
                converted_content = base64.b64encode(content.encode('utf-8')).decode('utf-8')
        except UnicodeDecodeError:
            with open(temp_out_path, 'rb') as f:
                binary_content = f.read()
                converted_content = base64.b64encode(binary_content).decode('utf-8')
                content = "[Binary content - encoded as base64]"
        
        # Clean up temporary files
        os.unlink(temp_in_path)
        os.unlink(temp_out_path)
        
        return {
            'success': True,
            'result': converted_content,
            'content': content
        }
    except subprocess.CalledProcessError as e:
        return {'error': f'Conversion failed: {str(e)}'}

if __name__ == "__main__":
    app.run(debug=True, host='0.0.0.0', port=5000)
