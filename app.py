from flask import Flask
import datetime
from src.config.config import UPLOAD_FOLDER
from src.config.swagger import setup_swagger
from src.routes.main_routes import register_main_routes
from src.routes.api_routes import register_api_routes
from src.routes.conversion_routes import register_conversion_routes

def create_app():
    """Create and configure the Flask application"""
    
    app = Flask(__name__, 
        static_folder='src/static',
        template_folder='src/templates'
    )
    
    # Configure app
    app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER
    app.config['TIMESTAMP'] = datetime.datetime.now().strftime('%Y%m%d%H%M%S')
    
    # Setup Swagger
    setup_swagger(app)
    
    # Register routes
    register_main_routes(app)
    register_api_routes(app)
    register_conversion_routes(app)
    
    return app

if __name__ == "__main__":
    app = create_app()
    app.run(debug=True, host='0.0.0.0', port=5000)
