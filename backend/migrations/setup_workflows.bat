@echo off
echo ========================================
echo DACORIS Workflow System Setup
echo ========================================
echo.

echo Step 1: Creating workflow tables...
python add_workflow_tables.py
if %errorlevel% neq 0 (
    echo ERROR: Failed to create tables
    pause
    exit /b 1
)
echo.

echo Step 2: Seeding default workflows...
python seed_default_workflows.py
if %errorlevel% neq 0 (
    echo ERROR: Failed to seed workflows
    pause
    exit /b 1
)
echo.

echo ========================================
echo ✅ Workflow system setup complete!
echo ========================================
echo.
echo You can now access the workflow management page at:
echo http://192.168.100.90/admin-staff/admin/workflows
echo.
pause
