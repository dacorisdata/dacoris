# Stop DACORIS Production
Write-Host "Stopping DACORIS production..." -ForegroundColor Yellow

docker-compose -f docker-compose.prod.yml down $args
