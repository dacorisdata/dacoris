@echo off
REM Batch script to run UUID migration with remote database

echo ============================================================
echo UUID MIGRATION - Remote Database Setup
echo ============================================================
echo.

echo [INFO] Make sure your SSH tunnel is running:
echo   ssh -L 15432:localhost:5432 user@41.89.92.140
echo.
pause

REM Set DATABASE_URL for remote connection via SSH tunnel
REM Replace PASSWORD with your actual PostgreSQL password
set /p DB_PASSWORD="Enter PostgreSQL password: "
set DATABASE_URL=postgresql://postgres:%DB_PASSWORD%@localhost:15432/dacoris

echo.
echo [INFO] Running migration with DATABASE_URL pointing to localhost:15432
echo.

python migrations\convert_to_uuid_pks.py

echo.
echo ============================================================
echo Migration script completed
echo ============================================================
pause
