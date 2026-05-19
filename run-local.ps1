# Run DACORIS in Local Development Mode
Write-Host "Starting DACORIS in LOCAL development mode..." -ForegroundColor Green

# Check if .env.local exists
if (-not (Test-Path ".env.local")) {
    Write-Host "ERROR: .env.local file not found!" -ForegroundColor Red
    Write-Host "Please create .env.local with your local configuration." -ForegroundColor Yellow
    exit 1
}

# Run docker-compose (uses docker-compose.yml by default)
docker-compose up --build $args
