# DACORIS
## Data, Collaboration & Research Information System
### Product Brochure — Features & Workflows

---

> **DACORIS** is a comprehensive, enterprise-grade research management platform that unifies every stage of the research lifecycle — from funding discovery to knowledge dissemination — in one secure, multi-tenant ecosystem.

---

## Table of Contents

1. [Platform Overview](#1-platform-overview)
2. [Who Is It For](#2-who-is-it-for)
3. [Core Modules](#3-core-modules)
   - 3.1 [Identity & Access Management (IAM)](#31-identity--access-management)
   - 3.2 [Grant Management](#32-grant-management)
   - 3.3 [Research Management](#33-research-management)
   - 3.4 [Ethics & IRB Workflow](#34-ethics--irb-workflow)
   - 3.5 [Data Management](#35-data-management)
   - 3.6 [Publications & Scholarly Output](#36-publications--scholarly-output)
   - 3.7 [Manuscripts & Collaboration](#37-manuscripts--collaboration)
4. [Administration Portals](#4-administration-portals)
   - 4.1 [Researcher Portal](#41-researcher-portal)
   - 4.2 [Admin Staff Portal](#42-admin-staff-portal)
   - 4.3 [Institution Admin Portal](#43-institution-admin-portal)
   - 4.4 [Global Admin Portal](#44-global-admin-portal)
5. [Key Workflows](#5-key-workflows)
6. [Integrations](#6-integrations)
7. [Security & Compliance](#7-security--compliance)
8. [Deployment & Infrastructure](#8-deployment--infrastructure)
9. [Why DACORIS](#9-why-dacoris)

---

## 1. Platform Overview

DACORIS is a modular, API-first Research Information Management System (RIMS) purpose-built for universities, research institutes, and funding bodies in Africa and beyond. It replaces disconnected spreadsheets, siloed email workflows, and legacy CRIS systems with a single platform that connects researchers, grants officers, ethics committees, finance departments, data stewards, and institutional leadership.

**Built on proven open technology:**

| Component | Technology |
|---|---|
| Frontend | Next.js 15 + React 19 + Material-UI |
| Backend API | Python FastAPI (async) |
| Database | PostgreSQL 14+ |
| Authentication | ORCID OAuth 2.0 + JWT |
| Containerisation | Docker + Docker Compose / Kubernetes |
| Deployment | Hybrid Cloud + On-Premises |

---

## 2. Who Is It For

DACORIS serves every stakeholder in the research value chain:

| Role | What They Do in DACORIS |
|---|---|
| **Researcher / PI** | Discover grants, manage projects, submit ethics, publish outputs |
| **Co-Investigator** | Collaborate on proposals, track milestones, co-author manuscripts |
| **Grant Officer** | Manage the full grant lifecycle from call to award |
| **Finance Officer** | Control budgets, approve disbursements, track expenditure |
| **Ethics Reviewer** | Score applications, declare COI, submit recommendations |
| **Ethics Committee Chair** | Assign reviewers, issue decisions, manage review workflow |
| **Data Steward** | Curate datasets, mint DOIs, enforce access policies |
| **Research Administrator** | Portfolio oversight, compliance monitoring, reporting |
| **Institution Admin** | Manage users, approvals, and institutional settings |
| **Global Admin** | Platform governance, multi-tenant institution management |
| **External Reviewer** | Score assigned grant applications (COI-gated, read-only) |

---

## 3. Core Modules

### 3.1 Identity & Access Management

DACORIS implements a battle-hardened IAM layer that is live and in production:

- **ORCID OAuth 2.0** authentication for all researchers — no new passwords to remember
- **Email/password** for administrative accounts with session management
- **Multi-tenant architecture** — each institution operates in complete data isolation
- **Role-Based Access Control (RBAC)** with 12+ specialist roles
- **Attribute-Based Access Control (ABAC)** — context-aware rules including:
  - COI declarations automatically block conflicted reviewers
  - Stage gating prevents premature finance approvals
  - Guest accounts with automatic expiry dates
  - Ethics gate — data capture is locked until an IRB approval is recorded
  - Budget cap enforcement on expense approvals
- **JWT sessions** — 30-minute for researchers; 8-hour for admin accounts
- **Institution domain auto-approval** — new staff onboard in seconds
- **Email verification** workflow for new registrations

---

### 3.2 Grant Management

The complete pre-award → award → post-award lifecycle managed end-to-end.

#### Opportunity Discovery (Researcher-facing)

- Browse a curated catalogue of funding opportunities filtered to each institution's research focus areas
- **Category-based matching** (Health, Agriculture, Technology, Environment, STEM, Multi-disciplinary, and custom categories)
- Sort by deadline, status, sponsor, or title
- Deadline countdown with colour-coded urgency indicators
- One-click **Apply** button launches the proposal wizard directly from the opportunity

#### Proposal Authoring

- **3-step guided wizard:**
  1. **Proposal Details** — title, linked opportunity, sponsor & deadline auto-filled
  2. **Invite Collaborators** — live ORCID registry search by name; add Co-Investigators, Consultants, or Advisors with role assignment
  3. **Review & Create** — summary confirmation before submission
- **Section-by-section authoring** with word count tracking and completion progress bar
- Real-time completion percentage indicator (0–100%)
- Collaborators receive automatic email + in-app notifications to join
- Proposals are locked from editing once submitted (tamper-evident)

#### Proposal Status Lifecycle

```
DRAFT → SUBMITTED → UNDER_REVIEW → AWARDED
                              ↓
                           RETURNED (revision requested)
                              ↓
                           REJECTED
```

#### Grant Awards & Post-Award

- Award registry with status tracking (Pending → Active → Suspended → Completed → Terminated)
- Award financial details: amount, currency, disbursement schedule
- Budget management and expense reporting
- Finance Officer approval workflows with maker-checker for large amounts
- Audit trail on all financial transactions

---

### 3.3 Research Management

#### Research Projects

- Register projects with full metadata: title, abstract, methodology, keywords, research area
- Project types: Funded, Internal, Collaborative, Independent, Unfunded
- Team roster: PI, Co-I, Data Analysts, Research Assistants, Field Coordinators — each with ORCID linkage
- **Milestone tracking** with due dates, priority levels (Critical / High / Medium / Low), and completion status
- Ethics status linked directly to project — gate enforced until approval received
- Human subjects flag with automatic ethics compliance check
- Filter, search, and sort across the full project portfolio

#### Data Management Plans (DMP)

- Create structured DMPs linked to projects and funders
- Track repository assignment (Zenodo, DACORIS Repository, institutional repos), data volume, and retention period
- DMP status workflow: Draft → Submitted → Under Review → Approved / Revision Required
- Funder compliance support (Wellcome Trust, NIH, Gates Foundation templates)
- Data steward assignment

---

### 3.4 Ethics & IRB Workflow

A complete Institutional Review Board (IRB) management system designed for African research contexts.

#### For Researchers

- Submit applications with auto-generated reference codes (e.g., `ETHICS-APP-2026-001`)
- Application types supported:
  - Initial Review
  - Full Review
  - Expedited Review
  - Exempt
  - Amendment
  - Renewal
- Track participant count, risk level (High / Medium / Low), and PI identity
- View real-time application stage and committee decisions
- Upload supporting documents (protocols, consent forms, etc.)

#### Review Stage Pipeline

```
Submitted → Screened → Assigned → Under Review → Decision → Final Approval
                                       ↓
                                   Rejected / Request for Revision
```

#### For Ethics Reviewers & Committee Chairs

- Assigned review queue with risk-flagged cards
- COI declaration gate — reviewers cannot access conflicted applications
- Structured scoring rubrics per review type (Scientific Merit, Informed Consent, Privacy, Risk-Benefit)
- Submit recommendations with comments
- Ethics Chair: assign reviewers, override COI if needed, issue binding decisions
- Full audit log of all reviewer actions

---

### 3.5 Data Management

#### Research Data Capture & Repository (Module A)

- **Form-based data capture** — design structured data collection forms for field, clinical, and survey research
- **Data Submissions** — manage incoming submissions from field teams
- **Dataset Registry** — register datasets with:
  - Title, description, linked source form
  - Access levels: Public, Restricted, Confidential, Highly Sensitive
  - Status: Draft → Staging → Active → Archived
- **Data Sources** — catalogue external data sources and integration feeds
- **Data Lakes** — link to institutional or cloud-based data stores
- **DOI Minting** — data stewards can mint persistent DOIs (DataCite integration)
- **Embargo Enforcement** — datasets under embargo are inaccessible until the embargo date
- Import connectors: **KoBoToolbox, ODK Central, REDCap, Microsoft Forms**

#### Enterprise Big-Data & Analytics (Module B)

- ETL pipelines managed by Data Engineers
- Data lake and data warehouse management
- Analytics dashboards: Grant Pipeline by Stage, Budget vs. Actuals, Ethics Workload, Research Output Trends
- Live KPI cards: Open Opportunities, Total Proposals, Awards Issued, Research Projects, Ethics Records
- Vendor-neutral architecture (Microsoft Fabric, Apache Spark, DuckDB options)

---

### 3.6 Publications & Scholarly Output

#### Publication Search & Import

- **Multi-source search** across:
  - PubMed
  - Crossref
  - OpenAlex
  - Zotero
- **Advanced filters:** author, year range, DOI, keywords, journal name, country, publication type, language, open access only
- Paginated results with bulk selection (select all / select individual)
- **AI-generated abstracts & summaries** for quick triage

#### My Library — Hierarchical Organisation

- Create **libraries** (top-level collections) with custom names
- Nested **folders and subfolders** within each library
- Drag-and-drop or context menu to:
  - Move publications between folders
  - Rename folders and libraries
  - Delete items with confirmation
- Publications in subfolders automatically belong to parent folders
- Persist all data to the database — no data loss on reload
- Context-menu right-click actions on any folder or publication item

#### Research Outputs Registry (Institution-wide)

- Register and track: Journal Articles, Conference Papers, Datasets, Reports, Theses, Book Chapters, Patents
- DOI linkage with live resolver
- Open Access badge (Open / Closed)
- Citation count tracking
- Filter by output type, year, author, project linkage
- Summary KPIs: Total Outputs, Open Access Count, Total Citations, This-Year Count

---

### 3.7 Manuscripts & Collaboration

#### Manuscript Management

- Create manuscript records with title, department, keywords, short description
- **Co-author invitation workflow:**
  1. Search the ORCID registry by given name + family name
  2. Review candidate profiles (name, email, ORCID iD)
  3. Add to manuscript with role assignment
  4. Collaborators receive notifications
- Track manuscript status through to journal submission

#### Teams & Collaborations

- View all research teams you are a member of across projects
- Role display: PI, Co-Investigator, Data Engineer, Research Associate, Ethics Researcher
- Access level per team: Full Edit / Contribute / View Only
- Add new team members directly from collaboration dashboard
- Aggregated stats: Active Teams, Total Collaborators, Projects as PI

---

## 4. Administration Portals

### 4.1 Researcher Portal

The personalized home for every researcher in DACORIS:

- **Greeting dashboard** with time-of-day greeting and institution affiliation
- **Live KPI cards:** Active Grants, Projects, Publications, Collaborators
- **Profile Completion tracker** with field-by-field checklist (Department, Job Title, Email, ORCID iD) and progress bar
- **Quick Actions:** one-click navigation to Browse Grants, My Projects, Publications, Collaborations
- **Edit Profile** — keep ORCID-synced profile current

---

### 4.2 Admin Staff Portal

The operational hub for grants officers, research administrators, finance officers, and ethics staff:

#### Grants Section
- **Application Pipeline** — live view of all submitted proposals with:
  - Review stage (Received / Eligibility / Technical / Budget / Panel / Final Approval)
  - Health status: On Track 🟢, Near Due 🟡, Overdue 🔴, On Hold 🟠, Completed ✅
  - Date received, last updated, lead PI, sponsoring organisation
  - Click-through to individual proposal detail
- **Proposals** — full CRUD on all institution proposals
- **Awards** — manage active, pending, and completed awards
- **Funders** — maintain a funder directory
- **Opportunities** — curate and manage funding calls
- **Reviews** — assign and track external reviewer scores
- **Reports** — generate grant portfolio reports

#### Finance Section
- **Budgets** — set and monitor project budget lines
- **Disbursements** — approve and track fund releases
- **Expenses** — review expense claims against budget caps

#### Ethics Section
- **Applications** — overview of all ethics submissions
- **Reviews** — reviewer queue with risk levels and COI declarations
- **Decisions** — record and communicate ethics committee decisions

#### Research Section
- **Projects** — institution-wide project registry with status, timeline, and human-subjects flag
- **Teams** — research group management
- **Directory** — researcher directory
- **Outputs** — publications, datasets, reports with citation and OA tracking
- **Data Imports** — manage data ingestion from external tools

#### Analytics
- Real-time KPI dashboard: open opportunities, proposals in pipeline, awards issued, active projects, ethics records
- Planned charts: Grant Pipeline by Stage, Budget vs. Actuals, Ethics Workload, Research Output Trends

---

### 4.3 Institution Admin Portal

Tenant-level management for university IT or research office administrators:

- **User Management** — view, approve, and manage all ORCID-authenticated users within the institution
- **Pending Approvals** — one-click approve or reject new user registrations
- **Role Assignment** — assign specialist roles (Ethics Reviewer, Data Steward, Grant Officer, etc.)
- **Roles Directory** — manage role definitions specific to the institution
- **Institution Settings** — configure domain-based auto-approval, institution name, and preferences
- **Statistics Dashboard** — total users, pending approvals, active users, role breakdown

---

### 4.4 Global Admin Portal

Platform governance for the system operator:

- **Institution Registry** — create and manage all tenant institutions on the platform
- **User Management** — cross-institutional user oversight
- **Category Management:**
  - Create and edit opportunity categories (name, description, slug, colour code, icon)
  - View opportunities and institutions per category
  - Bulk import categories via Excel/CSV
  - Seed default category sets
  - Full-text search, sort, filter, and pagination
- **Opportunity Curation:**
  - View all opportunities across all institutions (curated and uncurated)
  - Publish/unpublish (curate) opportunities to make them visible to institutions
  - Assign categories to opportunities for institution-level filtering
- **Institution–Category Assignment** — control which research categories are available to each institution
- **Platform Analytics** — cross-institutional statistics and health checks

---

## 5. Key Workflows

### Workflow A: Full Grant Lifecycle

```
1. Global Admin curates funding opportunity → assigns research categories
2. Institution Admin assigns categories to institution
3. Researcher discovers opportunity in category-filtered catalogue
4. Researcher starts proposal via 3-step wizard, invites Co-Is via ORCID search
5. Collaborators accept invitations → contribute to proposal sections
6. PI submits proposal → status changes to SUBMITTED
7. Grant Officer reviews → advances through 6-stage pipeline
8. External Reviewer scores (COI-checked) → panel review
9. Final Approval → Award issued
10. Finance Officer sets budget lines → approves disbursements
11. PI submits expense reports → Finance Officer reconciles
12. Research outputs linked to award → reported in outputs registry
```

---

### Workflow B: Ethics Submission & Review

```
1. PI creates research project, flags human subjects involvement
2. PI submits ethics application (type: Initial/Full/Expedited/Exempt/Amendment)
3. Ethics Chair screens application → assigns to reviewers (COI-checked)
4. Reviewers score against rubric, submit recommendations
5. Chair convenes panel → issues decision (Approved / Revision / Rejected)
6. If approved: project data capture is unlocked (Ethics Gate lifted)
7. Approval expiry monitored → PI notified to submit Renewal
```

---

### Workflow C: Research Data Lifecycle

```
1. Researcher designs data capture form
2. Field teams collect data via KoBoToolbox / ODK / REDCap / Microsoft Forms
3. Submissions ingest into DACORIS via import connectors
4. Data Steward QA-checks, cleans, and stages dataset
5. Dataset registered with access level, embargo date, repository assignment
6. Data Steward mints DOI (DataCite)
7. Dataset becomes available in Research Outputs registry
8. Analytics pipelines process data in Data Lake (Module B)
```

---

### Workflow D: Publication Discovery & Library Management

```
1. Researcher searches PubMed / Crossref / OpenAlex / Zotero
2. Advanced filters applied (year, type, OA, language, journal, country)
3. AI summary generated for shortlisted papers
4. Researcher bulk-selects papers → opens Library Manager
5. Creates or navigates to target library folder/subfolder
6. Imports selected publications → persisted to database
7. Publications available in My Library with folder hierarchy
8. Context menu: rename, move, delete folders or individual publications
```

---

### Workflow E: Researcher Onboarding

```
1. New researcher visits registration page
2. Authenticates via ORCID OAuth 2.0 → profile auto-populated from ORCID record
3. System checks institution domain → auto-approved OR queued for admin review
4. Institution Admin approves → roles assigned
5. Researcher logs in to personalised dashboard
6. Profile Completion tracker guides them to fill in remaining fields
```

---

## 6. Integrations

| System | Integration Type | Purpose |
|---|---|---|
| **ORCID** | OAuth 2.0 + Registry Search | Authentication, researcher identity, collaborator lookup |
| **PubMed** | API | Publication search and import |
| **Crossref** | API | Publication search and DOI resolution |
| **OpenAlex** | API | Open access publication discovery |
| **Zotero** | API | Reference library import |
| **KoBoToolbox** | Data Connector | Field data collection import |
| **ODK Central** | Data Connector | Mobile/field survey data ingestion |
| **REDCap** | Data Connector | Clinical research data import |
| **Microsoft Forms** | Data Connector | Enterprise survey data import |
| **DataCite** | API | DOI minting for research datasets |
| **QuickBooks** | Finance Connector | Financial reconciliation (pluggable) |
| **SAP** | Finance Connector | ERP integration (pluggable) |
| **Oracle ERP** | Finance Connector | Enterprise finance integration (pluggable) |
| **Zenodo** | Repository | Dataset archiving and DOI assignment |
| **Microsoft Fabric** | Big Data (optional) | Cloud analytics and ML pipelines |

---

## 7. Security & Compliance

### Data Governance Standards

- **FAIR Data Principles** — Findable, Accessible, Interoperable, Reusable
- **CERIF** — Common European Research Information Format interoperability
- **OAI-PMH** — Open Archives Initiative Protocol for Metadata Harvesting
- **DataCite Metadata Schema** — for dataset registration and citation

### Regulatory Compliance

| Regulation | Coverage |
|---|---|
| **GDPR** | Right to erasure, data minimisation, consent tracking |
| **HIPAA** | PHI data stored on-premises only, access-logged |
| **ODPC / Kenya Data Protection Act** | Local data sovereignty, identified health data on-prem |

### Security Architecture

- **Zero-trust posture** — every API call requires authenticated JWT
- **Attribute-Based Access Control (ABAC)** — COI gates, stage gates, budget caps, embargo enforcement
- **Institution isolation** — row-level multi-tenancy; no cross-tenant data leakage
- **Audit log** — every significant actor/action/entity/timestamp recorded
- **Sensitive data on-prem** — ethics records, PHI, grant financials stored locally
- **Encrypted transit** — TLS everywhere; VPN between on-prem and cloud
- **Embargo enforcement** — datasets inaccessible before embargo lift date, even to authenticated users

---

## 8. Deployment & Infrastructure

### Hybrid Cloud + On-Premises Architecture

```
┌──────────────────────────────────────────────────────────┐
│  CLOUD LAYER  (Collaborative, Scalable, Analytics)       │
│  ┌─────────────┐  ┌─────────────┐  ┌──────────────────┐  │
│  │ DACORIS App │  │ Analytics   │  │ CDN (Next.js)    │  │
│  │(Kubernetes) │  │ & ML Layer  │  │ Public Portal    │  │
│  └──────┬──────┘  └──────┬──────┘  └──────────────────┘  │
└─────────│────────────────│─────────────────────────────────┘
          │ VPN / Private Link (Encrypted)
          │
┌─────────│────────────────│─────────────────────────────────┐
│  ON-PREMISES LAYER  (Sovereign, Sensitive, Controlled)     │
│  ┌──────▼──────┐  ┌──────▼──────┐  ┌──────────────────┐  │
│  │ PostgreSQL  │  │ MinIO File  │  │ Ethics / PHI     │  │
│  │ (Sensitive  │  │ Storage     │  │ Compute Workspace│  │
│  │  Records)   │  │ (Documents) │  │                  │  │
│  └─────────────┘  └─────────────┘  └──────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

### Workload Placement Policy

| Data Type | Location | Reason |
|---|---|---|
| Ethics / IRB records | On-premises | Human-subjects sensitivity |
| PHI / Identified health data | On-premises | HIPAA / ODPC requirement |
| Grant financial records | On-premises | Audit sovereignty |
| Researcher profiles | Cloud (replicated) | Availability + ORCID sync |
| Publication metadata | Cloud | Low sensitivity, high availability |
| Anonymous research datasets | Configurable | Per dataset classification |
| Analytics & BI dashboards | Cloud | Compute elasticity |
| Audit logs | On-prem primary + cloud archive | Immutability + disaster recovery |

### Infrastructure Stack

| Layer | Technology |
|---|---|
| API Server | FastAPI + Uvicorn (Python 3.10+) |
| Database | PostgreSQL 14+ with Alembic migrations |
| File Storage | MinIO (S3-compatible, on-prem) / AWS S3 / Azure Blob |
| Task Queue | Celery + Redis |
| Containerisation | Docker + Docker Compose (on-prem) / Kubernetes (cloud) |
| CI/CD | GitHub Actions |
| Monitoring | Prometheus + Grafana (on-prem) / Azure Monitor (cloud) |
| Secrets Management | HashiCorp Vault (on-prem) / AWS Secrets Manager (cloud) |

---

## 9. Why DACORIS

### Built for African Research Contexts

- ORCID-native authentication eliminates the barriers of institutional email-based identity
- Multi-institution, multi-currency support from day one
- Sample data and workflows grounded in East African research environments
- Designed to comply with the Kenya Data Protection Act, Makerere, UoN, KEMRI, and similar institutional contexts

### End-to-End Research Lifecycle

| Stage | DACORIS Feature |
|---|---|
| Funding discovery | Opportunity catalogue with category matching |
| Proposal development | Collaborative proposal authoring with ORCID team invitations |
| Ethical review | Full IRB workflow with COI gates and multi-stage review |
| Project execution | Milestones, teams, DMP, data capture |
| Data management | Repository, QA, DOI minting, embargo, access control |
| Knowledge dissemination | Publications library, research outputs registry, open access tracking |
| Institutional reporting | KPI dashboards, analytics, portfolio reports |

### Standards-First Interoperability

- Export-ready metadata in CERIF, DataCite, and OAI-PMH formats
- FAIR-compliant dataset registration
- DOI-linked publications and datasets
- ORCID-linked researcher profiles — portable across institutions

### Modular, Scalable Architecture

- Start with IAM + Grant Management → add Research, Ethics, Data modules progressively
- Monolith today, microservices-ready tomorrow
- No vendor lock-in — all critical paths have open-source fallbacks
- API-first: every feature accessible via REST API for integration with existing systems

---

*DACORIS — Connecting research ambition to institutional excellence.*

---

**Contact:** [Your institution's DACORIS deployment team]  
**Documentation:** Available at `http://your-dacoris-instance.org/docs`  
**Version:** 1.4 | **Last Updated:** May 2026
