from flask import Flask, request, jsonify, render_template, redirect, url_for
import datetime
from src.config.config import UPLOAD_FOLDER, PANDOC_INPUT_FORMATS, PANDOC_OUTPUT_FORMATS
from src.config.swagger import setup_swagger
from src.routes.main_routes import register_main_routes
from src.routes.api_routes import register_api_routes
from src.routes.conversion_routes import register_conversion_routes
from src.utils.conversion import process_file_conversion, convert_document
from src.utils.history import add_to_history
import base64
import tempfile
import os

def create_app():
    """Create and configure the Flask application"""
    
    app = Flask(__name__, 
        static_folder='src/static',
        template_folder='src/templates'
    )
    
    # Configure app
    app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER
    app.config['TIMESTAMP'] = datetime.datetime.now().strftime('%Y%m%d%H%M%S')
    app.config['MAX_CONTENT_LENGTH'] = 50 * 1024 * 1024  # 50MB max file size
    app.config['RESULT_FOLDER'] = 'src/results'
    
    # Configure Swagger before registering routes
    app.config['SWAGGER'] = {
        'title': 'Document Converter API',
        'uiversion': 3,
        'specs_route': '/docs/'
    }
    
    # Register routes
    register_main_routes(app)
    register_api_routes(app)
    register_conversion_routes(app)
    
    # Setup Swagger after routes are registered
    swagger = setup_swagger(app)
    
    # Manual route for documentation
    @app.route('/docs')
    def docs_without_slash():
        return redirect('/docs/')
    
    @app.route('/api/docs')
    @app.route('/api/docs/')
    def legacy_docs_redirect():
        return redirect('/docs/')
    
    # Additional routes for file operations
    @app.route('/convert', methods=['POST'])
    def root_convert_function():
        try:
            return convert_document(request, app.config)
        except Exception as e:
            return jsonify({'error': str(e)}), 500

    @app.route('/uploads/<path:filename>')
    def download_upload(filename):
        return redirect(url_for('static', filename=f'uploads/{filename}'))

    @app.route('/results/<path:filename>')
    def download_result(filename):
        return redirect(url_for('static', filename=f'results/{filename}'))
    
    return app

if __name__ == "__main__":
    app = create_app()
    app.run(debug=True, host='0.0.0.0', port=5000)
