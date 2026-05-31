#!/bin/bash

echo "========================================"
echo "DACORIS Workflow System Setup"
echo "========================================"
echo ""

echo "Step 1: Creating workflow tables..."
python add_workflow_tables.py
if [ $? -ne 0 ]; then
    echo "ERROR: Failed to create tables"
    exit 1
fi
echo ""

echo "Step 2: Seeding default workflows..."
python seed_default_workflows.py
if [ $? -ne 0 ]; then
    echo "ERROR: Failed to seed workflows"
    exit 1
fi
echo ""

echo "========================================"
echo "✅ Workflow system setup complete!"
echo "========================================"
echo ""
echo "You can now access the workflow management page at:"
echo "http://192.168.100.90/admin-staff/admin/workflows"
echo ""
