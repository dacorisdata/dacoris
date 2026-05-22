# Researcher Projects Page Update

## Overview
Updated the researcher projects page (`/researcher/projects`) to remove the Register Project button and display only projects that have been converted from awards and are in draft or proposed status.

## Changes Made

### File: `frontend/app/researcher/projects/page.js`

#### 1. Removed "Register Project" Button
- **Removed from header**: Deleted the button that navigated to `/researcher/projects/new`
- **Removed from empty state**: Deleted the call-to-action button when no projects exist
- **Removed unused import**: Removed `AddIcon` from Material-UI imports

#### 2. Added Filtering Logic
**Before:**
```javascript
const live = res.data || [];
setProjects(live.length > 0 ? live : SAMPLE_PROJECTS);
```

**After:**
```javascript
const live = res.data || [];

// Filter to show only projects converted from awards and in draft/proposed status
const filteredProjects = live.filter(p => 
  p.award_id && (p.status === 'proposed' || p.status === 'draft')
);

setProjects(filteredProjects);
```

**Filter Criteria:**
- `award_id` must be present (project was converted from an award)
- `status` must be either "proposed" or "draft" (in-review stage)

#### 3. Updated Page Description
**Before:** "Research project portfolio — milestones, teams, and ethics status"

**After:** "Projects converted from awards — drafts and proposals in review"

#### 4. Updated Empty State Messages
**Before:** "No projects yet" / "Register your first research project to get started."

**After:** "No projects in draft/proposed status" / "Projects converted from awards will appear here when they are in draft or proposed status."

#### 5. Updated Summary Statistics
**Before:** Showed Active, Proposed, Completed, Milestones Done

**After:** Shows Total Projects, Draft, Proposed, Milestones Done
- Only displays stats when projects exist
- Removed "Active" and "Completed" counts as filtered projects only include draft/proposed
- Added "Total Projects" count

## Project Status Values

According to the backend model, projects can have the following statuses:
- **PROPOSED** = "proposed" - Draft/in-review status (shown on this page)
- **ACTIVE** = "active" - Project is actively running (filtered out)
- **SUSPENDED** = "suspended" - Project is paused (filtered out)
- **COMPLETED** = "completed" - Project finished (filtered out)

## Database Schema

### ResearchProject Model Fields Used:
- `award_id` (nullable) - Links project to an award; null means manually created, non-null means converted from award
- `status` - Project status enum (proposed, active, suspended, completed)
- `title` - Project title
- `pi_id` - Principal Investigator ID
- `start_date` / `end_date` - Project period
- `involves_human_subjects` - Boolean flag
- `project_type` - Type of project (funded, internal, etc.)

## User Flow

1. **Award Issued**: Grant officer issues an award for a proposal (via `/admin-staff/grants/awards`)
2. **Project Created**: A research project is automatically created with `status = "proposed"` and linked to the award
3. **Project Appears**: The project appears on this page (researcher/projects) in draft/proposed status
4. **Project Activated**: Once activated, the project status changes to "active" and is filtered out from this page

## Benefits

1. **Clearer Purpose**: Page now has a focused purpose - reviewing projects converted from awards before activation
2. **Prevents Manual Creation**: Removing the Register button ensures all projects come from awards
3. **Workflow Alignment**: Aligns with the research workflow: Award → Draft Project → Active Project
4. **Better Filtering**: Shows only relevant projects that need researcher attention/review

## API Endpoint

**GET** `/api/research/projects`

- Returns all projects for the current user
- Filtered on frontend by `award_id` presence and status
- No backend changes required

## Testing

To test this change:

1. **Create an award**:
   - Log in as Grant Officer
   - Issue an award for a proposal
   - A project will be automatically created with status "proposed"

2. **View as researcher**:
   - Log in as the PI (researcher)
   - Navigate to `/researcher/projects`
   - You should see the project in the list

3. **Activate project**:
   - When the project status is changed to "active"
   - It will no longer appear on this page (filtered out)

4. **Empty state**:
   - If no projects match the filter criteria
   - Appropriate message is shown (no Register button)

## Related Files

- **Frontend**: `frontend/app/researcher/projects/page.js`
- **Backend Model**: `backend/models.py` (ResearchProject class)
- **Backend Route**: `backend/routes/research/projects.py`
- **Awards Backend**: `backend/routes/grants/awards.py` (creates projects when awards are issued)

## Notes

- Projects are automatically created when awards are issued (see awards.py line 155-166)
- Default project status is `ProjectStatus.ACTIVE` when manually created, but this page only shows those in "proposed" or "draft" status
- The filtering logic ensures only award-converted projects in draft/review stage are displayed
- Researchers can still access active projects through other routes if needed
