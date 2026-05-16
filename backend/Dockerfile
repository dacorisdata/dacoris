FROM python:3.11-slim

WORKDIR /app

RUN apt-get update && apt-get install -y \
    gcc \
    postgresql-client \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

RUN mkdir -p /app/uploads

# Convert line endings and make startup script executable
RUN apt-get update && apt-get install -y dos2unix && \
    dos2unix startup.sh && \
    chmod +x startup.sh && \
    rm -rf /var/lib/apt/lists/*

EXPOSE 8000

CMD ["/bin/bash", "./startup.sh"]
