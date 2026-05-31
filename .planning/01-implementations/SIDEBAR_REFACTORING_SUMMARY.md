# Admin Staff Sidebar Refactoring Summary

## Overview
The admin-staff sidebar has been refactored to better align with the research workflow and improve user experience by grouping related functions logically.

## Changes Made

### 1. **Grant Management** (Unchanged - Already Well Organized)
Keeps the complete grant lifecycle from opportunity discovery to awards:
- Opportunities
- All Proposals
- Pipeline
- **Awards** (added ADMIN_STAFF to roles for visibility)
- Funder CRM
- Reports & Compliance

### 2. **Project Management** (NEW SECTION)
Consolidates all project execution and review activities:
- **Project Review** - Review and approve project proposals
- **Projects Tracking** - Monitor active projects
- **Ethics Review** - Review ethical aspects of projects
- **DMP Review** - Review data management plans

**Rationale**: After a grant is awarded, it becomes a project. This section brings together all project-related tracking and review processes in one logical place, making it easier for staff to manage the entire project lifecycle.

### 3. **Ethics & IRB** (Restructured)
Now focuses on application submission and final decisions:
- **Applications** - Ethics application submissions
- **Decisions** - Final ethics decisions

**Note**: Ethics Review has been moved to Project Management as it's part of the project review workflow.

### 4. **Research Support** (NEW SECTION)
Groups supporting research functions:
- **Teams & Members** - Manage research teams
- **Research Outputs** - Track publications and deliverables
- **Data Import Requests** - Handle data import workflows

### 5. **Administration** (NEW SECTION)
Central hub for institutional administration:
- **Researcher Directory** - View all researchers and their work
- **Workflows** ⭐ NEW - Configure dynamic workflows for:
  - Proposal Review
  - Project Review
  - Ethics Review
  - DMP Review
- **MoU Overview** - Partnership overview
- **New Agreement** - Create new MoUs
- **All Agreements** - View all agreements
- **Partner Registry** - Manage partner organizations
- **Approval Queue** - Review pending approvals
- **Analytics & Reports** - MoU analytics

**Rationale**: This section consolidates all administrative and system configuration functions, including the new Workflows feature and all MoU management items.

### 6. **Data Module A** - ❌ REMOVED
The Data Module A section (Capture Forms, Submissions & QA, Repository, Datasets) has been removed as requested.

### 7. **Other Sections** (Unchanged)
- **Main** - Overview, My Profile
- **Post-Award Finance** - Budgets, Disbursements, Expense Reports
- **Data Module B** - ETL Pipelines, Analytics Workspace
- **External Reviews** - Assigned Reviews

## New Feature: Workflows Page

Created a new Workflows management page at `/admin-staff/admin/workflows` that allows administrators to:

- View all configured workflows by type (Proposal Review, Project Review, Ethics Review, DMP Review)
- Create new workflows with multiple stages
- Define approval requirements for each stage
- Assign roles to workflow stages
- Activate/deactivate workflows
- Edit existing workflows

**Features**:
- Visual workflow stage display using Material-UI Stepper
- Workflow type filtering with statistics
- Status management (Active/Inactive)
- Role-based stage configuration
- Multi-stage approval workflows

## Research Workflow Alignment

The new structure follows the natural research lifecycle:

```
1. GRANTS MANAGEMENT
   └─> Find opportunities → Submit proposals → Track pipeline → Receive awards

2. PROJECT MANAGEMENT (Post-Award)
   └─> Review project → Track execution → Review ethics → Review DMP

3. ETHICS & IRB
   └─> Submit application → Make decision

4. RESEARCH SUPPORT
   └─> Manage teams → Track outputs → Import data

5. ADMINISTRATION
   └─> View researchers → Configure workflows → Manage partnerships
```

## Benefits

1. **Clearer Organization**: Related functions are grouped together, reducing cognitive load
2. **Workflow-Aligned**: Structure follows the natural research lifecycle
3. **Easier Navigation**: Reviews are consolidated in Project Management
4. **Better Scalability**: New features can be added to appropriate sections
5. **Role Clarity**: Each section clearly shows which roles have access

## Technical Changes

### Files Modified
- `frontend/components/AdminStaffSidebar.js`
  - Restructured NAV_SECTIONS array
  - Added WorkflowIcon import from Material-UI
  - Added ADMIN_STAFF role to Awards visibility
  - Reorganized sections to match new structure

### Files Created
- `frontend/app/admin-staff/admin/workflows/page.js`
  - New Workflows management page
  - Full CRUD interface for workflow configuration
  - Visual workflow designer (UI foundation)

## Future Enhancements

The Workflows page is currently displaying mock data. Future implementation will include:
- Backend API integration for workflow CRUD operations
- Database schema for workflow storage
- Workflow execution engine
- Automatic workflow assignment to submissions
- Workflow history and audit trail
- Custom approval logic and conditions
- Email notifications for workflow stages
- Drag-and-drop workflow designer
