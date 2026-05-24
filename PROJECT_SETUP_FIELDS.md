# Project Setup Page — Field Reference

**Page:** `/researcher/projects/{projectId}`  
**Example:** `http://192.168.100.90/researcher/projects/8d26f622-98f7-4eda-8108-c8b909dc4820`  
**UI title:** Project Setup (8-step wizard)

This document lists every field on the project setup page. Fields marked **Required** must be filled (or satisfied) before the project can be submitted for review. **Submission section** indicates which checklist item each field contributes to.

---

## Submission checklist (all must be complete to submit)

| # | Section | Completion criteria |
|---|---------|---------------------|
| 1 | Project Context & Identity | Project title, project type, start date, and end date |
| 2 | Research Team Details | PI full name and PI email |
| 3 | Research Abstract & Objectives | Project abstract and problem statement (non-empty text) |
| 4 | Milestones & Deliverables | At least one milestone **or** one deliverable |
| 5 | Ethics Documentation | Uploaded ethics doc, linked ethics application, existing ethics record, **or** conflict-of-interest disclosure |
| 6 | Data Management Plan | Uploaded DMP, attached library DMP, **or** (form mode) types of data filled in |
| 7 | Budget & Financial Plan | At least one budget line item, uploaded budget document, **or** pending budget upload |
| 8 | All Declarations Signed | All 7 compliance declarations checked, PI full name, and declaration date |

**Submit button** is enabled only when all declarations are signed off and the project title is present.

---

## Step 1 — Project Context

### 1.1 Award Reference *(shown only when project is linked to a grant award)*

| Field | Required | Notes |
|-------|----------|-------|
| Linked Award (read-only) | — | Displays proposal title, funder, amount, award number |

### 1.2 Project Identity

| Field | Required | Submission | Notes |
|-------|----------|------------|-------|
| Project Title | **Yes** | Context | Label shows `*` |
| Project Code | — | — | Read-only / auto-generated |
| Project Type | **Yes** | Context | Options: Contract Research, Grant Funded, Internal, Collaborative |
| Project Status | — | — | Read-only chip |
| Lead Institution | No | — | e.g. University of Nairobi |
| Department / Faculty | No | — | e.g. School of Business |

### 1.3 Project Timeline

| Field | Required | Submission | Notes |
|-------|----------|------------|-------|
| Start Date | **Yes** | Context | Date picker |
| End Date | **Yes** | Context | Date picker |
| Duration | — | — | Auto-calculated from start/end dates (months) |

### 1.4 Project Flags *(checkboxes — at least review; none required for submission)*

| Field | Required | Notes |
|-------|----------|-------|
| This project involves human subjects | No | Triggers ethics warning on Step 5 if checked and no ethics approval |
| This project involves animal subjects | No | |
| This project handles sensitive / personal data | No | |
| This project is a clinical trial or interventional study | No | |
| This project uses hazardous materials or chemicals | No | |

---

## Step 2 — Research Team

### 2.1 Principal Investigator

| Field | Required | Submission | Notes |
|-------|----------|------------|-------|
| Full Name | **Yes** | Team, Declarations | Also used for PI sign-off |
| Title | No | — | Prof., Dr., Mr., Mrs., Ms., Eng., Other |
| Email | **Yes** | Team | |
| Phone | No | — | |
| Institution | No | — | Syncs with Lead Institution |
| Department | No | — | Syncs with Department / Faculty |
| ORCID ID | No | — | Optional format hint |
| Staff / Employee ID | No | — | |

### 2.2 Co-Investigators *(optional for submission; add via dialog)*

When adding a co-investigator, the invite dialog requires:

| Field | Required | Notes |
|-------|----------|-------|
| Email | **Yes** | Required for notification |
| Name (given + family, or full name) | **Yes** | At least one name part |
| Role | **Yes** | Default: Co-Investigator |
| Affiliation | No | |
| ORCID | No | For external invitees |

### 2.3 Research Assistants & Support Staff *(optional for submission; add via dialog)*

Same invite fields as co-investigators. Role options: Research Assistant, Data Manager, External Collaborator.

---

## Step 3 — Research Details

### 3.1 Abstract

| Field | Required | Submission | Notes |
|-------|----------|------------|-------|
| Project Abstract | **Yes** | Research | Rich text; suggested 250–500 words |

### 3.2 Background & Problem Statement

| Field | Required | Submission | Notes |
|-------|----------|------------|-------|
| Background / Rationale | No | — | Rich text |
| Problem Statement | **Yes** | Research | Rich text |

### 3.3 Research Objectives *(repeatable; optional for submission)*

Each objective row:

| Field | Required | Notes |
|-------|----------|-------|
| Objective (text) | No | Per row when added |
| Expected Outcome | No | Per row when added |

### 3.4 Methodology

| Field | Required | Submission | Notes |
|-------|----------|------------|-------|
| Research Methodology | **Yes** | — | Rich text; marked required in UI |
| Research Design | No | — | Qualitative, Quantitative, Mixed Methods, etc. |
| Target Population / Sample | No | — | Free text |

### 3.5 Keywords *(optional for submission)*

| Field | Required | Notes |
|-------|----------|-------|
| Research Keywords | No | Add via text input + Add button or Enter |

---

## Step 4 — Project Plan

### 4.1 Milestones *(at least one milestone **or** deliverable required for submission)*

Each milestone:

| Field | Required | Notes |
|-------|----------|-------|
| Milestone (title) | No | Defaults to "Milestone N" on blur if empty |
| Description | No | |
| Target Date | No | Date picker |
| Status | No | Planned, In Progress, Completed, Overdue (default: Planned) |

### 4.2 Deliverables *(at least one milestone **or** deliverable required for submission)*

Each deliverable:

| Field | Required | Notes |
|-------|----------|-------|
| Name | **Yes** | When a deliverable is added |
| Type | No | Report, Dataset, Prototype, Publication, etc. |
| Description / Details | No | Multiline text |
| Due Date | **Yes** | When a deliverable is added |
| Responsible Person / Team | No | Assign individual or create/select team |
| Status | No | Pending, In Progress, Completed, Overdue |
| Linked Milestone | No | Optional link to a milestone |

**Creating a project team** (from assignee selector): team name is **required** on the backend.

---

## Step 5 — Ethics & Compliance

Two modes: **Upload Document** or **Link Internal Application**.

### Upload Document mode

| Field | Required | Submission | Notes |
|-------|----------|------------|-------|
| Document Type | No | — | Ethics Clearance, IRB Protocol, Consent Form, Other |
| Upload Ethics Document | Conditional | Ethics | Satisfies ethics section when uploaded |

### Link Internal Application mode

| Field | Required | Submission | Notes |
|-------|----------|------------|-------|
| Link Existing Ethics Application | Conditional | Ethics | Select from user's ethics applications |

| Action | Notes |
|--------|-------|
| Create New Application | Navigates to `/researcher/ethics/new?project={id}` |

### Conflict of Interest Disclosure

| Field | Required | Submission | Notes |
|-------|----------|------------|-------|
| Conflict of Interest Disclosure | Conditional | Ethics | Rich text; entering text (e.g. "None") satisfies ethics section if no docs linked |

### Linked / Uploaded Ethics Records

| Field | Required | Notes |
|-------|----------|-------|
| Ethics applications & uploaded docs | — | Read-only list |

---

## Step 6 — Data Management Plan

Three entry modes: **Upload DMP**, **Fill Form**, or **Attach Existing**.

### 6.1 DMP Entry Mode

| Field | Required | Notes |
|-------|----------|-------|
| Entry mode selector | No | Upload DMP / Fill Form / Attach Existing |

### Upload DMP mode

| Field | Required | Submission | Notes |
|-------|----------|------------|-------|
| DMP file upload | Conditional | DMP | PDF, DOC, DOCX |

### Fill Form mode

#### 6.2 Data Description

| Field | Required | Submission | Notes |
|-------|----------|------------|-------|
| Types of Data to be Collected | **Yes** (form mode) | DMP | Rich text |
| Estimated Volume | No | — | e.g. ~500 MB, 2,000 records |
| Data Formats | No | — | e.g. CSV, SPSS, PDF |

#### 6.3 Storage & Security

| Field | Required | Notes |
|-------|----------|-------|
| Primary Storage Location | No | Institutional Server, Cloud, etc. |
| Backup Procedure | No | |
| Access Controls | No | |
| Retention Period | No | 1 year through Permanent |

#### 6.4 Sharing & Archiving

| Field | Required | Notes |
|-------|----------|-------|
| Data Sharing Plan | No | Rich text |
| Repository / Archive | No | e.g. Zenodo, ICPSR |

### Attach Existing mode

| Field | Required | Submission | Notes |
|-------|----------|------------|-------|
| Select DMP from Library | Conditional | DMP | Choose from previously uploaded DMPs |

---

## Step 7 — Financial

Summary cards (read-only): Awarded Budget, Total Planned, Unallocated.

### 7.1 Budget Document

| Field | Required | Submission | Notes |
|-------|----------|------------|-------|
| Budget document upload | No | Financial | Optional label in UI; XLSX, CSV, PDF — satisfies financial section if no line items |

### 7.2 Itemised Budget Plan *(at least one line item, budget doc, or pending upload required for submission)*

Each budget line:

| Field | Required | Notes |
|-------|----------|-------|
| Category | **Yes** | Personnel, Equipment, Travel, Supplies, Services, Indirect Costs, Participant Costs, Other |
| Description | No | |
| Amount | No | Numeric; currency prefix from reporting currency |

### 7.3 Financial Notes

| Field | Required | Notes |
|-------|----------|-------|
| Indirect Cost / Overhead Rate | No | e.g. 15% of direct costs |
| Reporting Currency | No | KES (default), USD, EUR, GBP |
| Financial Justification / Notes | No | Multiline text |

---

## Step 8 — Declarations

### 8.1 Compliance Declarations *(all seven required for submission)*

| Declaration | Required | Key |
|-------------|----------|-----|
| Research Integrity | **Yes** | Checkbox |
| Conflict of Interest | **Yes** | Checkbox |
| Data Protection | **Yes** | Checkbox |
| Funder Compliance | **Yes** | Checkbox |
| Institutional Approval | **Yes** | Checkbox |
| Ethics Compliance | **Yes** | Checkbox |
| Originality Declaration | **Yes** | Checkbox |

### 8.2 Principal Investigator Sign-off

| Field | Required | Submission | Notes |
|-------|----------|------------|-------|
| Full Name of PI | **Yes** | Declarations | Electronic signature |
| Designation / Title | No | — | |
| Date of Declaration | **Yes** | Declarations | Date picker |
| Staff / Employee ID | No | — | |

### 8.3 Submission Readiness

Read-only checklist mirroring the eight submission sections above.

---

## Global actions

| Action | Notes |
|--------|-------|
| Save Draft | Saves progress without submitting; no full validation |
| Previous / Next Step | Navigate between wizard steps |
| Submit Project | Requires all declarations + title; sets project status to `proposed` |

---

## Quick reference — minimum fields to submit

1. **Project Title**, **Project Type**, **Start Date**, **End Date**
2. **PI Full Name**, **PI Email**
3. **Project Abstract**, **Problem Statement**
4. At least **one milestone** or **one deliverable**
5. **Ethics:** upload, link application, existing record, **or** conflict-of-interest text
6. **DMP:** upload, attach from library, **or** (form mode) **Types of Data to be Collected**
7. **Financial:** budget line item(s), uploaded budget, **or** pending budget file
8. All **7 declarations** checked, **PI Full Name**, **Date of Declaration**

---

*Generated from `frontend/app/researcher/projects/[id]/page.js` — Project Setup wizard.*
