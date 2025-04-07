from flask import Flask, render_template, request, jsonify, redirect, url_for
import datetime
from src.config.config import PANDOC_INPUT_FORMATS, PANDOC_OUTPUT_FORMATS
from src.routes.api_routes import register_api_routes
from src.utils.converter import convert_document

app = Flask(__name__)
app.config['MAX_CONTENT_LENGTH'] = 50 * 1024 * 1024  # 50MB max file size
app.config['UPLOAD_FOLDER'] = 'src/uploads'
app.config['RESULT_FOLDER'] = 'src/results'
app.config['TIMESTAMP'] = datetime.datetime.now().strftime('%Y%m%d%H%M%S')

# Common Pandoc options for the dropdown selection
COMMON_OPTIONS = [
    "--toc",
    "--standalone",
    "--self-contained",
    "--number-sections",
    "--pdf-engine=xelatex",
    "--highlight-style=pygments",
    "--metadata=title:Document Title",
    "--metadata=author:Author Name",
    "--wrap=preserve",
    "--atx-headers",
    "--extract-media=.",
    "--slide-level=2",
    "--columns=80",
    "--dpi=300",
    "--variable=papersize:a4",
    "--variable=geometry:margin=1in",
    "--bibliography=references.bib",
    "--csl=ieee.csl",
    "--mathjax"
]

register_api_routes(app)

@app.route('/')
def index():
    return render_template('index.html', 
                           input_formats=PANDOC_INPUT_FORMATS, 
                           output_formats=PANDOC_OUTPUT_FORMATS,
                           common_options=COMMON_OPTIONS,
                           author='Document Converter Team')

@app.route('/convert', methods=['POST'])
def convert():
    try:
        return convert_document(request, app.config)
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/uploads/<path:filename>')
def download_file(filename):
    return redirect(url_for('static', filename=f'uploads/{filename}'))

@app.route('/results/<path:filename>')
def download_result(filename):
    return redirect(url_for('static', filename=f'results/{filename}'))

if __name__ == '__main__':
    app.run(debug=True) 