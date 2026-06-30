FROM python:3.11-slim

WORKDIR /app

RUN apt-get update && apt-get install -y \
    gcc \
    postgresql-client \
    tesseract-ocr \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --upgrade pip setuptools wheel && \
    pip install --no-cache-dir --default-timeout=300 --retries 10 -r requirements.txt

COPY . .

RUN mkdir -p /app/uploads

# Convert line endings and make startup script executable
RUN sed -i 's/\r$//' startup.sh && \
    chmod +x startup.sh

EXPOSE 8000

CMD ["/bin/bash", "./startup.sh"]
