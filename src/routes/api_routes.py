from flask import jsonify, request, send_file
from flasgger import swag_from
import json
import os
import tempfile
import zipfile
import io
from src.config.config import PANDOC_INPUT_FORMATS, PANDOC_OUTPUT_FORMATS

def register_api_routes(app):
    """Register API routes"""
    
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
    
    @app.route('/api/history/download', methods=['POST'])
    @swag_from({
        'tags': ['History'],
        'summary': 'Download conversion history',
        'description': 'Creates a ZIP file containing all conversion results from history',
        'consumes': [
            'application/json'
        ],
        'produces': [
            'application/zip'
        ],
        'parameters': [
            {
                'name': 'history',
                'in': 'body',
                'required': True,
                'schema': {
                    'type': 'array',
                    'items': {
                        'type': 'object',
                        'properties': {
                            'filename': {'type': 'string'},
                            'fromFormat': {'type': 'string'},
                            'toFormat': {'type': 'string'},
                            'timestamp': {'type': 'string'},
                            'content': {'type': 'string'},
                            'downloadUrl': {'type': 'string'},
                            'base64Result': {'type': 'string'},
                            'isFile': {'type': 'boolean'}
                        }
                    }
                }
            }
        ],
        'responses': {
            '200': {
                'description': 'ZIP file containing conversion results',
                'content': {
                    'application/zip': {}
                }
            },
            '400': {
                'description': 'Bad request'
            }
        }
    })
    def download_history():
        try:
            # Get history data from request
            history_data = request.json
            
            if not history_data or not isinstance(history_data, list):
                return jsonify({'error': 'Invalid history data'}), 400
            
            # Create a temporary directory to store files
            with tempfile.TemporaryDirectory() as temp_dir:
                # Create an in-memory file-like object for the ZIP
                memory_file = io.BytesIO()
                
                # Create a ZIP file
                with zipfile.ZipFile(memory_file, 'w', zipfile.ZIP_DEFLATED) as zf:
                    # Add history summary
                    summary = {
                        'total_conversions': len(history_data),
                        'conversions': history_data
                    }
                    
                    zf.writestr('history_summary.json', json.dumps(summary, indent=2))
                    
                    # Add each conversion result
                    for i, item in enumerate(history_data):
                        if item.get('isFile') and item.get('downloadUrl'):
                            # For file conversions, include download URL info
                            info = {
                                'filename': item.get('filename', 'unknown'),
                                'fromFormat': item.get('fromFormat', 'unknown'),
                                'toFormat': item.get('toFormat', 'unknown'),
                                'timestamp': item.get('timestamp', ''),
                                'download_link': item.get('downloadUrl', '')
                            }
                            zf.writestr(f'conversion_{i+1}/info.json', json.dumps(info, indent=2))
                        else:
                            # For text or base64 conversions
                            content = item.get('content', '') or item.get('base64Result', '')
                            if content:
                                filename = item.get('filename', f'conversion_{i+1}')
                                safe_filename = "".join([c if c.isalnum() or c in "._- " else "_" for c in filename])
                                zf.writestr(f'conversion_{i+1}/{safe_filename}.{item.get("toFormat", "txt")}', content)
                                
                                # Add metadata
                                info = {
                                    'filename': item.get('filename', 'unknown'),
                                    'fromFormat': item.get('fromFormat', 'unknown'),
                                    'toFormat': item.get('toFormat', 'unknown'),
                                    'timestamp': item.get('timestamp', '')
                                }
                                zf.writestr(f'conversion_{i+1}/info.json', json.dumps(info, indent=2))
                
                # Reset the file pointer
                memory_file.seek(0)
                
                return send_file(
                    memory_file,
                    mimetype='application/zip',
                    as_attachment=True,
                    download_name=f'conversion_history_{app.config["TIMESTAMP"]}.zip'
                )
                
        except Exception as e:
            app.logger.error(f"Error generating history zip: {str(e)}")
            return jsonify({'error': 'Failed to generate history ZIP file'}), 500 