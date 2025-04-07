import os

# Author information
APP_AUTHOR = "stop1love1"
APP_VERSION = "1.0.0"

# Configure upload folder
UPLOAD_FOLDER = 'uploads'
if not os.path.exists(UPLOAD_FOLDER):
    os.makedirs(UPLOAD_FOLDER)

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