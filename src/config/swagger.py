try:
    from flasgger import Swagger
    from markupsafe import Markup
    
    try:
        import flask
        if not hasattr(flask, 'Markup'):
            flask.Markup = Markup
    except:
        pass
    
    SWAGGER_AVAILABLE = True
except ImportError:
    SWAGGER_AVAILABLE = False
    print("Warning: Flasgger not available, API docs will not work")
    # Define dummy Swagger class
    class Swagger:
        def __init__(self, *args, **kwargs):
            pass

def setup_swagger(app):
    """Configure Swagger documentation for the application"""
    
    if not SWAGGER_AVAILABLE:
        # Add a route that provides an explanation when Swagger is unavailable
        @app.route('/docs')
        @app.route('/docs/')
        def swagger_unavailable():
            return """
            <html>
                <head><title>API Docs Unavailable</title></head>
                <body>
                    <h1>API Documentation Unavailable</h1>
                    <p>Flasgger package is not properly installed or incompatible with current Flask version.</p>
                    <p>Try installing compatible versions:</p>
                    <pre>pip install flask==2.0.1 flasgger==0.9.5 markupsafe==2.0.1</pre>
                </body>
            </html>
            """
        return None
    
    # Use app's existing SWAGGER config if it exists
    if 'SWAGGER' not in app.config:
        app.config['SWAGGER'] = {
            'title': 'Document Converter API',
            'uiversion': 3,
            'specs_route': '/docs/'
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
        "securityDefinitions": {
            "ApiKeyAuth": {
                "type": "apiKey",
                "name": "X-API-KEY",
                "in": "header"
            }
        }
    }
    
    # Let Flasgger handle the routes
    return Swagger(app, template=swagger_template) 