# Document Converter

A simple web-based document conversion tool built with Flask and Pandoc.

![Document Converter Screenshot](docs/screenshot.png)

## Key Features

- Convert files, text, or base64 content between multiple formats
- Support for custom Pandoc options
- Drag & drop file upload
- Responsive design

## Requirements

- Python 3.6+
- Flask 2.0.1
- Werkzeug 2.0.1
- Flasgger 0.9.5
- Pandoc (external dependency)

## Quick Start

1. Install Pandoc from [pandoc.org](https://pandoc.org/installing.html)

2. Install Python dependencies:
```bash
python -m pip install flask==2.0.1 werkzeug==2.0.1 flasgger==0.9.5 flask-cors==3.0.10 gunicorn==20.1.0
```

3. Run the application:
```bash
# Windows
run.bat

# Linux/Mac
python app.py
```

4. Access at http://localhost:5000

## Usage

1. Choose conversion method (File/Text/Base64)
2. Set source and target formats
3. Add optional Pandoc parameters
4. Click Convert

## API Documentation

Access the Swagger UI at: http://localhost:5000/api/docs/

### Main Endpoints

- `POST /convert`: Convert documents
- `GET /download/{filename}`: Download converted files
- `GET /api/formats`: Get supported formats

## License

MIT License

## Credits

- Powered by [Pandoc](https://pandoc.org/)
- Created by stop1love1
