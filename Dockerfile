FROM python:3.9-slim

# Cài gói hệ thống cần thiết
RUN apt-get update && apt-get install -y --no-install-recommends \
    pandoc \
    wget \
    texlive-xetex \
    texlive-fonts-recommended \
    texlive-plain-generic \
    && apt-get clean && rm -rf /var/lib/apt/lists/*

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
CMD ["python", "server.py"]
