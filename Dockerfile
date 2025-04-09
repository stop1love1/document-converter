FROM python:3.9-slim

# Set working directory
WORKDIR /app

# Install system dependencies with retry mechanism and minimal required packages
RUN echo 'Acquire::Retries "3";' > /etc/apt/apt.conf.d/80-retries && \
    apt-get update && apt-get install -y --no-install-recommends \
    pandoc \
    imagemagick \
    libmagickwand-dev \
    ghostscript \
    libfreetype6-dev \
    libfontconfig1-dev \
    librsvg2-bin \
    fonts-liberation \
    git \
    build-essential \
    cmake \
    wget \
    unzip \
    pkg-config \
    libjpeg-dev \
    libpng-dev \
    libtiff-dev \
    libavcodec-dev \
    libavformat-dev \
    libswscale-dev \
    libv4l-dev \
    libxvidcore-dev \
    libx264-dev \
    libatlas-base-dev \
    gfortran \
    libgl1-mesa-dev \
    xvfb \
    xauth \
    python3-opengl \
    && rm -rf /var/lib/apt/lists/*

# Cấu hình ImageMagick để cho phép chuyển đổi tất cả các định dạng
RUN if [ -f /etc/ImageMagick-6/policy.xml ]; then \
        sed -i 's/rights="none" pattern="PDF"/rights="read|write" pattern="PDF"/' /etc/ImageMagick-6/policy.xml && \
        sed -i 's/rights="none" pattern="LABEL"/rights="read|write" pattern="LABEL"/' /etc/ImageMagick-6/policy.xml && \
        sed -i 's/rights="none" pattern="PS"/rights="read|write" pattern="PS"/' /etc/ImageMagick-6/policy.xml && \
        sed -i 's/rights="none" pattern="XPS"/rights="read|write" pattern="XPS"/' /etc/ImageMagick-6/policy.xml && \
        sed -i 's/<policy domain="module" rights="none" pattern="{PS,PDF,XPS}" \/>/<policy domain="module" rights="read|write" pattern="{PS,PDF,XPS}" \/>/' /etc/ImageMagick-6/policy.xml; \
    fi; \
    if [ -f /etc/ImageMagick/policy.xml ]; then \
        sed -i 's/rights="none" pattern="PDF"/rights="read|write" pattern="PDF"/' /etc/ImageMagick/policy.xml && \
        sed -i 's/rights="none" pattern="LABEL"/rights="read|write" pattern="LABEL"/' /etc/ImageMagick/policy.xml && \
        sed -i 's/rights="none" pattern="PS"/rights="read|write" pattern="PS"/' /etc/ImageMagick/policy.xml && \
        sed -i 's/rights="none" pattern="XPS"/rights="read|write" pattern="XPS"/' /etc/ImageMagick/policy.xml && \
        sed -i 's/<policy domain="module" rights="none" pattern="{PS,PDF,XPS}" \/>/<policy domain="module" rights="read|write" pattern="{PS,PDF,XPS}" \/>/' /etc/ImageMagick/policy.xml; \
    fi

# Copy requirements file
COPY requirements.txt .

# Configure pip settings
RUN pip config set global.timeout 300 && \
    pip config set global.retries 10

# Install Python packages
RUN pip install -r requirements.txt

# Install OMRChecker and its requirements
RUN git clone https://github.com/Udayraj123/OMRChecker.git /app/OMRChecker
WORKDIR /app/OMRChecker
RUN pip install -r requirements.txt

# Create directories and set permissions
RUN mkdir -p /app/OMRChecker/inputs /app/OMRChecker/cache /app/OMRChecker/outputs 
RUN chmod -R 777 /app/OMRChecker/cache /app/OMRChecker/outputs /app/OMRChecker/inputs

# Copy sample data for testing
RUN cp -r /app/OMRChecker/samples/sample1/* /app/OMRChecker/inputs/

# Initialize __init__.py in OMRChecker src directory
RUN echo '# Empty __init__ file to mark as a package' > /app/OMRChecker/src/__init__.py

# Create monkeypatch module for screeninfo
RUN mkdir -p /app/OMRChecker/src/utils
RUN echo 'from collections import namedtuple\n\
# Create a Monitor class to emulate screeninfo.get_monitors\n\
Monitor = namedtuple("Monitor", ["width", "height", "x", "y", "is_primary"])\n\
\n\
def get_monitors():\n\
    """Return a fake monitor for headless environments"""\n\
    return [Monitor(width=1920, height=1080, x=0, y=0, is_primary=True)]\n\
\n\
# Patch the screeninfo module\n\
import sys\n\
import os\n\
os.environ["DISPLAY"] = ":99"\n\
os.environ["MPLBACKEND"] = "Agg"\n\
\n\
try:\n\
    import screeninfo\n\
    screeninfo.get_monitors = get_monitors\n\
    print("Applied screeninfo patch")\n\
except ImportError:\n\
    print("screeninfo not imported yet")\n\
' > /app/OMRChecker/src/utils/monkeypatch.py

# Update __init__.py to import the monkeypatch
RUN echo 'try:\n\
    from . import monkeypatch\n\
    print("Imported monkeypatch")\n\
except ImportError as e:\n\
    print(f"Error importing monkeypatch: {e}")\n\
' > /app/OMRChecker/src/utils/__init__.py

# Test that OMRChecker can run in Docker
WORKDIR /app/OMRChecker
RUN echo '#!/bin/bash\n\
# Setup headless display\n\
export DISPLAY=:99\n\
export MPLBACKEND=Agg\n\
export QT_QPA_PLATFORM=offscreen\n\
export PYTHONPATH=$PYTHONPATH:/app/OMRChecker\n\
cd /app/OMRChecker\n\
\n\
# Run test\n\
python -c "\n\
import os\n\
import sys\n\
sys.path.insert(0, \"/app/OMRChecker\")\n\
\n\
# Import monkey patch first\n\
from src.utils import monkeypatch\n\
\n\
# Then import and run OMRChecker\n\
from main import process_files\n\
\n\
args = {\n\
    \"inputDir\": \"/app/OMRChecker/samples/sample1\",\n\
    \"outputDir\": \"/app/OMRChecker/outputs/test\",\n\
    \"setLayout\": False,\n\
    \"autoAlign\": False,\n\
    \"noCropping\": True\n\
}\n\
\n\
print(\"Running OMRChecker...\")\n\
process_files(args)\n\
print(\"OMRChecker test completed successfully\")\n\
"\n\
' > /app/OMRChecker/test_docker.sh

# Make script executable and run test
RUN chmod +x /app/OMRChecker/test_docker.sh
RUN /app/OMRChecker/test_docker.sh || echo "OMRChecker test failed, but continuing with build"

# Return to app directory
WORKDIR /app

# Copy application code
COPY . .

# Create necessary directories
RUN mkdir -p uploads results
RUN chmod -R 777 uploads results

# Make the entrypoint script executable
COPY entrypoint.sh /app/entrypoint.sh
RUN chmod +x /app/entrypoint.sh

# Expose port
EXPOSE 5000

# Run the application with our entrypoint script
CMD ["/app/entrypoint.sh"]
