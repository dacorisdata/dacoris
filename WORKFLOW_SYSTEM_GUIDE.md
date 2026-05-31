# Workflow System Implementation Guide

## Overview

The DACORIS platform now includes a comprehensive institutional workflow management system that allows administrators to configure multi-stage review processes for:

- **Proposal Review** - Research grant proposals
- **Project Review** - Research project activations
- **Ethics Review** - Ethics applications and clearances
- **DMP Review** - Data Management Plans

## Database Schema

### Tables Created

1. **workflows** - Main workflow definitions
   - `id`, `name`, `workflow_type`, `description`, `status`, `is_default`
   - `created_by_id`, `created_at`, `updated_at`

2. **workflow_stages** - Individual stages within workflows
   - `id`, `workflow_id`, `stage_order`, `stage_name`
   - `assigned_role`, `approvals_required`, `auto_advance`
   - `duration_days`, `description`

3. **workflow_instances** - Active workflow executions
   - `id`, `workflow_id`, `entity_type`, `entity_id`
   - `current_stage_id`, `status`, `started_at`, `completed_at`

4. **workflow_stage_history** - Audit trail of stage transitions
   - `id`, `instance_id`, `stage_id`, `status`
   - `assigned_to_id`, `reviewed_by_id`, `notes`
   - `started_at`, `completed_at`

## Setup Instructions

### 1. Run Database Migration

```bash
cd backend
python migrations/add_workflow_tables.py
```

This creates all workflow-related tables.

### 2. Seed Default Workflows

```bash
python migrations/seed_default_workflows.py
```

This creates 5 default workflows:
- Standard Proposal Review (4 stages)
- Expedited Ethics Review (2 stages)
- Full Ethics Board Review (4 stages)
- Project Activation Review (3 stages)
- DMP Standard Review (2 stages)

### 3. Restart Backend Server

```bash
# If using Docker
docker-compose restart backend

# If running locally
# Stop and restart your FastAPI server
```

## Features

### Admin Workflow Management

**Location:** `http://192.168.100.90/admin-staff/admin/workflows`

**Capabilities:**
- ✅ View all workflows with filtering by type
- ✅ Create new workflows with custom stages
- ✅ Edit existing workflows
- ✅ Delete workflows
- ✅ Toggle workflow active/inactive status
- ✅ Configure stage-specific settings:
  - Stage order and name
  - Assigned role (who reviews)
  - Number of approvals required
  - Expected duration in days
  - Stage description

### Workflow Types

1. **Proposal Review** (Purple 📝)
   - For research grant proposals
   - Typically: Screening → Technical Review → Budget Review → Final Approval

2. **Project Review** (Blue 🔬)
   - For activating new research projects
   - Typically: Documentation → Resource Allocation → Final Activation

3. **Ethics Review** (Green ⚖️)
   - For ethics applications
   - Two variants: Expedited (2 stages) or Full Board (4 stages)

4. **DMP Review** (Orange 📊)
   - For Data Management Plans
   - Typically: Data Steward Review → Technical Validation

### Available Roles

Workflows can assign stages to these roles:
- Grant Manager
- External Reviewer
- Finance Officer
- Institutional Leadership
- Admin Staff
- Ethics Committee Member
- Data Steward
- Data Engineer
- Legal Officer
- Partnership Coordinator

## API Endpoints

### List Workflows
```
GET /api/workflows
GET /api/workflows?workflow_type=proposal_review
GET /api/workflows?status=active
```

### Get Workflow Details
```
GET /api/workflows/{workflow_id}
```

### Create Workflow
```
POST /api/workflows
{
  "name": "Custom Proposal Review",
  "workflow_type": "proposal_review",
  "description": "Tailored review process",
  "status": "active",
  "is_default": false,
  "stages": [
    {
      "stage_order": 1,
      "stage_name": "Initial Check",
      "assigned_role": "ADMIN_STAFF",
      "approvals_required": 1,
      "duration_days": 3
    }
  ]
}
```

### Update Workflow
```
PUT /api/workflows/{workflow_id}
{
  "name": "Updated Name",
  "stages": [...]
}
```

### Delete Workflow
```
DELETE /api/workflows/{workflow_id}
```

### Toggle Status
```
POST /api/workflows/{workflow_id}/toggle-status
```

## Usage Examples

### Creating a Custom Ethics Review Workflow

1. Navigate to `/admin-staff/admin/workflows`
2. Click "Create Workflow"
3. Fill in details:
   - **Name:** "Expedited Review for Surveys"
   - **Type:** Ethics Review
   - **Description:** "Fast-track for survey-based research"
4. Add stages:
   - Stage 1: Administrative Check (Admin Staff, 1 approval, 2 days)
   - Stage 2: Single Reviewer (Ethics Committee Member, 1 approval, 5 days)
5. Click "Create Workflow"

### Editing an Existing Workflow

1. Find the workflow in the list
2. Click the edit icon (pencil)
3. Modify stages:
   - Add new stages with "Add Stage" button
   - Remove stages with the delete icon
   - Update stage names, roles, or approval counts
4. Click "Save Changes"

### Activating/Deactivating Workflows

- Click the play/pause icon next to a workflow
- Active workflows are available for new submissions
- Inactive workflows are hidden but preserved

## Integration Points

### Future Integration

The workflow system is designed to integrate with:

1. **Proposal Submissions** - Automatically assign workflow when proposal is submitted
2. **Ethics Applications** - Route applications through configured ethics workflows
3. **Project Activation** - Manage project approval process
4. **DMP Reviews** - Track DMP review stages

### Workflow Instance Creation

When a proposal/ethics/project is submitted, create a workflow instance:

```python
from models import WorkflowInstance, WorkflowStageHistory

# Get the default workflow for this type
workflow = await session.execute(
    select(Workflow)
    .where(
        Workflow.workflow_type == WorkflowType.PROPOSAL_REVIEW,
        Workflow.status == WorkflowStatus.ACTIVE,
        Workflow.is_default == True
    )
)
workflow = workflow.scalar_one()

# Create instance
instance = WorkflowInstance(
    workflow_id=workflow.id,
    entity_type="proposal",
    entity_id=proposal.id,
    current_stage_id=workflow.stages[0].id,
    status=WorkflowInstanceStatus.IN_PROGRESS
)
session.add(instance)

# Create first stage history entry
history = WorkflowStageHistory(
    instance_id=instance.id,
    stage_id=workflow.stages[0].id,
    status=StageHistoryStatus.IN_PROGRESS
)
session.add(history)
await session.commit()
```

## Best Practices

1. **Default Workflows** - Mark one workflow per type as default for automatic assignment
2. **Stage Naming** - Use clear, action-oriented names (e.g., "Budget Review" not "Stage 3")
3. **Role Assignment** - Assign stages to appropriate institutional roles
4. **Duration Estimates** - Set realistic duration_days to track delays
5. **Approval Counts** - Use multiple approvals for critical stages
6. **Testing** - Test workflows with inactive status before activating

## Troubleshooting

### Workflows Not Appearing
- Check backend logs for errors
- Verify migration ran successfully
- Ensure user has admin permissions

### Cannot Create Workflow
- Verify all required fields are filled
- Check that at least one stage is defined
- Ensure stage names are not empty

### Changes Not Saving
- Check browser console for API errors
- Verify backend is running
- Check database connection

## Technical Details

### Backend Files
- `backend/models.py` - Lines 1947-2050 (Workflow models)
- `backend/routes/workflows.py` - Complete workflow API
- `backend/migrations/add_workflow_tables.py` - Database migration
- `backend/migrations/seed_default_workflows.py` - Default data

### Frontend Files
- `frontend/app/admin-staff/admin/workflows/page.js` - Workflow management UI

### Database Enums
- `WorkflowType`: proposal_review, project_review, ethics_review, dmp_review
- `WorkflowStatus`: active, inactive, archived
- `WorkflowInstanceStatus`: in_progress, completed, cancelled, rejected
- `StageHistoryStatus`: pending, in_progress, approved, rejected, returned

## Next Steps

1. ✅ Database models created
2. ✅ API endpoints implemented
3. ✅ Admin UI completed
4. ✅ Default workflows seeded
5. ⏳ Integrate with proposal submission flow
6. ⏳ Integrate with ethics application flow
7. ⏳ Integrate with project activation flow
8. ⏳ Add workflow progress tracking UI for researchers
9. ⏳ Add email notifications for stage transitions
10. ⏳ Add workflow analytics and reporting

## Support

For questions or issues:
- Check backend logs: `docker-compose logs backend`
- Review API responses in browser DevTools
- Verify database state with SQL queries
