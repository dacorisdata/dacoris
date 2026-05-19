# PowerShell script to run UUID migration with remote database
# This script sets up the correct DATABASE_URL and runs the migration

Write-Host "============================================================" -ForegroundColor Cyan
Write-Host "UUID MIGRATION - Remote Database Setup" -ForegroundColor Cyan
Write-Host "============================================================" -ForegroundColor Cyan
Write-Host ""

# Check if SSH tunnel is running
Write-Host "[1/4] Checking SSH tunnel to remote database..." -ForegroundColor Yellow
$sshProcess = Get-Process ssh -ErrorAction SilentlyContinue
if ($sshProcess) {
    Write-Host "[OK] SSH process found running" -ForegroundColor Green
} else {
    Write-Host "[WARNING] No SSH process detected!" -ForegroundColor Red
    Write-Host "You need to start the SSH tunnel first:" -ForegroundColor Yellow
    Write-Host "  ssh -L 15432:localhost:5432 user@41.89.92.140" -ForegroundColor White
    Write-Host ""
    $continue = Read-Host "Continue anyway? (y/n)"
    if ($continue -ne "y") {
        exit 1
    }
}

# Set DATABASE_URL for remote connection via SSH tunnel
Write-Host ""
Write-Host "[2/4] Setting up database connection..." -ForegroundColor Yellow
$password = Read-Host "Enter PostgreSQL password" -AsSecureString
$passwordPlain = [Runtime.InteropServices.Marshal]::PtrToStringAuto([Runtime.InteropServices.Marshal]::SecureStringToBSTR($password))

$env:DATABASE_URL = "postgresql://postgres:$passwordPlain@localhost:15432/dacoris"
Write-Host "[OK] DATABASE_URL configured for localhost:15432" -ForegroundColor Green

# Test connection
Write-Host ""
Write-Host "[3/4] Testing database connection..." -ForegroundColor Yellow
try {
    python -c "from sqlalchemy import create_engine; engine = create_engine('$env:DATABASE_URL'); conn = engine.connect(); conn.close(); print('[OK] Connection successful')"
    Write-Host "[OK] Database connection verified" -ForegroundColor Green
} catch {
    Write-Host "[ERROR] Cannot connect to database!" -ForegroundColor Red
    Write-Host "Please check:" -ForegroundColor Yellow
    Write-Host "  1. SSH tunnel is running on port 15432" -ForegroundColor White
    Write-Host "  2. PostgreSQL password is correct" -ForegroundColor White
    Write-Host "  3. Database 'dacoris' exists" -ForegroundColor White
    exit 1
}

# Run migration
Write-Host ""
Write-Host "[4/4] Running UUID migration..." -ForegroundColor Yellow
Write-Host ""
python migrations/convert_to_uuid_pks.py

Write-Host ""
Write-Host "============================================================" -ForegroundColor Cyan
Write-Host "Migration script completed" -ForegroundColor Cyan
Write-Host "============================================================" -ForegroundColor Cyan
