FROM python:3.9-slim

# Cài gói hệ thống cần thiết
RUN apt-get update && apt-get install -y --no-install-recommends \
    pandoc \
    wget \
    texlive-xetex \
    texlive-fonts-recommended \
    texlive-plain-generic \
    imagemagick \
    libmagickwand-dev \
    libheif-dev \
    libwebp-dev \
    libjxl-dev \
    libopenjp2-7-dev \
    libavif-dev \
    libwmf-dev \
    libwmf-bin \
    ghostscript \
    libfreetype6-dev \
    libfontconfig1-dev \
    librsvg2-dev \
    librsvg2-bin \
    libcairo2-dev \
    fonts-liberation \
    && apt-get clean && rm -rf /var/lib/apt/lists/*

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

# Thiết lập thư mục làm việc
WORKDIR /app

# Cài thư viện Python
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy mã nguồn vào container
COPY . .

# Tạo thư mục uploads (nếu chưa có)
RUN mkdir -p uploads

# Mở cổng Flask
EXPOSE 5000

# Chạy Flask app
CMD ["python", "app.py"]
