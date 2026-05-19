# Stop DACORIS Local Development
Write-Host "Stopping DACORIS local development..." -ForegroundColor Yellow

docker-compose down $args
