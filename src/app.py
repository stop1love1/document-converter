# Register blueprints
from src.routes.health_check import health_check_bp
from src.routes.convert_docx_to_pdf import convert_docx_to_pdf_bp
from src.routes.convert_pdf_to_docx import convert_pdf_to_docx_bp
from src.routes.convert_pdf_to_html import convert_pdf_to_html_bp
from src.routes.omr_routes import omr_bp

app.register_blueprint(health_check_bp, url_prefix="/api/health-check")
app.register_blueprint(convert_docx_to_pdf_bp, url_prefix="/api/convert-docx-to-pdf")
app.register_blueprint(convert_pdf_to_docx_bp, url_prefix="/api/convert-pdf-to-docx")
app.register_blueprint(convert_pdf_to_html_bp, url_prefix="/api/convert-pdf-to-html")
app.register_blueprint(omr_bp, url_prefix="/api/omr") 