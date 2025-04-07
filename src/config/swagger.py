from flasgger import Swagger

def setup_swagger(app):
    """Configure Swagger documentation for the application"""
    
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
    
    return Swagger(app, config=swagger_config, template=swagger_template) 