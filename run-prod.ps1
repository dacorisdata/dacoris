# Run DACORIS in Production Mode
Write-Host "Starting DACORIS in PRODUCTION mode..." -ForegroundColor Yellow

# Check if .env.production exists
if (-not (Test-Path ".env.production")) {
    Write-Host "ERROR: .env.production file not found!" -ForegroundColor Red
    Write-Host "Please copy .env.production.example to .env.production and configure it." -ForegroundColor Yellow
    exit 1
}

# Warning prompt
$confirmation = Read-Host "Are you sure you want to start in PRODUCTION mode? (yes/no)"
if ($confirmation -ne 'yes') {
    Write-Host "Cancelled." -ForegroundColor Yellow
    exit 0
}

# Run docker-compose with production configuration
docker-compose -f docker-compose.prod.yml up --build $args
