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

# Cài đặt phiên bản mới nhất của ImageMagick từ source (tùy chọn)
# RUN cd /tmp && \
#     wget https://imagemagick.org/archive/ImageMagick.tar.gz && \
#     tar xvzf ImageMagick.tar.gz && \
#     cd ImageMagick-* && \
#     ./configure --with-wmf=yes && \
#     make && \
#     make install && \
#     ldconfig /usr/local/lib && \
#     rm -rf /tmp/ImageMagick*

# Copy requirements file
COPY requirements.txt .

# Configure pip settings
RUN pip config set global.timeout 300 && \
    pip config set global.retries 10

# Install Python packages
RUN pip install --no-cache-dir -r requirements.txt

# Copy application code
COPY . .

# Create necessary directories
RUN mkdir -p uploads results

# Expose port
EXPOSE 5000

# Run the application
CMD ["python", "app.py"]
