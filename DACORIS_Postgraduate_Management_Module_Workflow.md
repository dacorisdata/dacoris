# DACORIS Postgraduate Researcher Management Module

**Workflow, Supervision Architecture, Dashboards and Integration Blueprint**

Designed for student journey while fully plugging into the DACORIS research management workflow.

> *Confidential product workflow blueprint | Prepared for DACORIS module development*
> **Prepared for:** DACORIS | **Module:** Postgraduate Researcher Management | **Version:** 1.0

---

## Document Contents

1. Executive Product Positioning
2. Core Design Principles
3. Target Users and Role-Based Responsibilities
4. High-Level Architecture and Integration with DACORIS Modules
5. End-to-End Postgraduate Lifecycle Workflow
6. Supervision Management Workflow
7. Stage-Gate Requirements Engine
8. Progress Reporting, Bottleneck Detection and Intervention Management
9. Dashboards and Analytics
10. Forms, Records and Data Model
11. Notifications, Escalations and Audit Trail
12. Implementation Roadmap
13. Developer Notes and Minimum Viable Product Scope

This document is written as a product and workflow specification that can be shared with university leadership, postgraduate schools, ICT teams and DACORIS developers. It avoids locking the module to one institution by using configurable requirements, stages and approval bodies.

---

## 1. Executive Product Positioning

The DACORIS Postgraduate Researcher Management Module should be positioned as the university control system for managing master's and doctoral students from admission to graduation, while treating every postgraduate student as a researcher from day one. This is important because postgraduate study is not only an academic enrolment process; it is a research production pipeline that produces proposals, ethics applications, datasets, publications, theses, institutional visibility and fundable knowledge assets.

The module should therefore operate as an orchestration layer within DACORIS. It should connect postgraduate student records, coursework progress, supervisor assignment, research projects, ethics approvals, data management, publication outputs, thesis examination and graduation clearance into one accountable workflow.

### 1.1 Value Proposition

| Problem universities face | DACORIS response | Institutional value |
|---|---|---|
| Postgraduate offices often know total enrolment but not the real stage-by-stage progress of every student. | A live postgraduate dashboard showing each student by department, programme, cohort, stage, supervisor, delay reason and next action. | Higher completion visibility, better planning and reduced silent stagnation. |
| Supervision is often informal, undocumented or difficult to audit. | Structured supervisor assignment, progress comments, delay reports, response timelines and escalation rules. | Improves supervisor accountability and helps departments intervene early. |
| Students may complete thesis work but fail publication or graduation clearance requirements late. | Configurable requirement packs that check publication, thesis, repository, finance, ethics and academic rules before graduation. | Reduces last-minute graduation failure and improves research output reporting. |
| Student research may be disconnected from institutional research projects and grants. | Links postgraduate projects to the DACORIS Research Management Module, Grant Module and Data Management Module. | Increases institutional research visibility, project utilization and output attribution. |
| University leadership lacks evidence on where students are stuck. | Bottleneck analytics and intervention case management by reason: coursework, fees, supervision, ethics, data, analysis, thesis writing or publication. | Enables targeted support, scholarships, project attachment and policy decisions. |

### 1.2 Product Statement

> *A DACORIS module that manages postgraduate students as institutional researchers, tracking their academic progression, supervision, proposal approval, ethics, data collection, thesis development, publication compliance, defense and graduation clearance through a configurable, auditable and dashboard-driven workflow.*

### 1.3 Proposed UX Concept

DACORIS should adapt the idea by giving each postgraduate student a visible journey canvas: admission, coursework, supervisor assignment, proposal writing, defense, ethics, data collection, analysis, thesis writing, thesis defense, corrections and graduation clearance. Each stage should show status, requirements, responsible officers, pending actions and evidence files.

- A student-facing journey screen that shows what is complete, what is pending and what must be done next. Students also to give reasons as to why they are stuck (in case of past timelines).
- A supervisor-facing dashboard that shows assigned students, overdue reviews and mandatory delay reports (in case of past timelines set).
- A department-facing dashboard that shows bottlenecks and board decisions.
- A postgraduate-school control tower that shows the entire university postgraduate pipeline.

---

## 2. Core Design Principles

| Design principle | Meaning in the DACORIS postgraduate module |
|---|---|
| **Every postgraduate is a researcher** | At enrolment, DACORIS creates a researcher identity for every MSc and PhD student, with ORCID/PID fields, affiliation, department, programme, research interests, supervisors, project record, outputs and thesis record. |
| **One student journey, many institutional configurations** | Universities must be able to configure programme rules, publication requirements, approval bodies, timelines, supervisor ratios, defense rules and graduation checklists. |
| **Supervision is an accountable workflow, not a note-taking feature** | The lead supervisor must sign off on readiness, comment on progress, and write reasons when the student is stuck. Co-supervisors and external supervisors provide specialist input. |
| **No silent stagnation** | Every stage should have an expected completion date. Overdue stages trigger alerts, supervisor reports, intervention cases and dashboards. |
| **Research-module linkage is mandatory** | Once a proposal is approved, the student research record should link to the DACORIS Research Management Module as either an independent postgraduate project or as part of an existing departmental/grant-funded project. |
| **Graduation readiness is evidence-based** | A student should only move to graduation clearance when coursework, supervisor sign-offs, publication requirements, thesis examination, corrections, fees and repository deposit are verified. |
| **Dashboards must support intervention, not just reporting** | Each dashboard metric should open the underlying student list and intervention case records. |

---

## 3. Target Users and Role-Based Responsibilities

The module should support a role-based workflow. Each role sees only the actions relevant to their mandate, while the postgraduate office and authorized university leadership retain institutional oversight.

| Role | Core responsibilities |
|---|---|
| **Postgraduate Student / Researcher** | Update profile, complete requirements, submit proposal and thesis drafts, upload progress logs, report challenges, track supervision feedback, upload publications and view graduation readiness. |
| **Lead Supervisor** | Approve research direction, review drafts, validate progress, sign stage readiness, provide structured delay reasons, recommend interventions and confirm thesis/defense readiness. |
| **Co-Supervisor** | Provide comments, specialist review, data/methodology support and stage-specific sign-off where configured. |
| **External Supervisor** | Provide external expertise and review input; access controlled to assigned students only. |
| **HOD / Departmental Postgraduate Coordinator** | Approve supervisors, schedule proposal defenses, record departmental board decisions, monitor departmental progress and resolve bottlenecks. |
| **Faculty / School Postgraduate Board** | Approve committee decisions, verify compliance, handle escalations and monitor faculty-wide performance. |
| **Head/Dean of Postgraduate Studies** | University-wide control tower, intervention oversight, policy compliance, graduation readiness monitoring and supervision quality analytics. |
| **Ethics/IRB Office** | Receive ethics-linked proposals, update ethics status, track corrections and issue approval evidence. |
| **Finance / Scholarship Office** | Verify fee status, scholarship status and bursary/intervention cases where financial blockages affect progression. |
| **Research Office / Grants Office** | Attach students to funded projects, track outputs, support publication requirements and harvest student research into institutional reporting. |
| **Library / Repository Office** | Validate thesis deposit, DOI/ORCID metadata, institutional repository records and publication evidence. |
| **ICT / System Administrator** | Configure workflows, user roles, departments, programmes, notification templates, integrations and data access controls. |

### 3.1 Role-Based Access Principle

- Students can view their own journey, submissions, feedback and requirements, but cannot approve their own stage gates.
- Supervisors can view only assigned students unless they have department-level roles.
- External supervisors access limited records and documents relevant to their assignment.
- Departmental officers see students under their department/programme.
- Postgraduate office sees all students but should still use audit-controlled administrative actions.
- Research office sees postgraduate research records and outputs relevant to institutional research reporting.
- Every override must require reason, authorizing role and supporting evidence.

---

## 4. High-Level Architecture and Integration with DACORIS Modules

The postgraduate module should be developed as a DACORIS sub-system that shares researcher identities, project records, outputs, data assets and dashboards with the broader platform. The core architectural decision is to avoid building a separate postgraduate silo. Postgraduate work must increase the university research portfolio automatically.

### 4.1 Integration Points

| DACORIS / external system | Data exchanged | Trigger | Purpose |
|---|---|---|---|
| **Student Information System / ERP** | Admission details, programme, cohort, units, marks, fee status, graduation list | At enrolment; coursework updates; graduation clearance | Creates student researcher profile and validates academic/finance blocks. |
| **Research Management Module** | Researcher profile, project record, milestones, supervisors, outputs | When proposal stage begins and when proposal is approved | Transforms postgraduate research into an institutional research asset. |
| **Grant Management Module** | Grant-funded project, departmental project, scholarship or project attachment | When student is linked to existing project or support opportunity | Allows students to be embedded into funded research and receive data/fieldwork support. |
| **Ethics & Compliance Module** | Ethics application, IRB approval, permits, similarity reports, board approvals | Before data collection; before thesis submission | Ensures compliance and prevents unauthorized fieldwork. |
| **Data Management Module** | Data management plan, instruments, datasets, metadata, access rules, analysis files | After proposal approval and ethics clearance | Links research data to the student project and institutional repository pipeline. |
| **Publication / Repository Layer** | Manuscripts, DOI, ORCID, thesis deposit, publication evidence | Before thesis submission and graduation clearance | Checks publication requirements and preserves institutional visibility. |
| **Dashboard & Analytics Layer** | KPIs, stage status, bottlenecks, at-risk cases, supervisor workload | Continuous | Supports leadership decisions and targeted interventions. |
| **Notifications Engine** | Emails, system alerts, reminders, escalation notices | Timeline triggers and stage changes | Keeps students, supervisors and administrators accountable. |

---

## 5. End-to-End Postgraduate Lifecycle Workflow

The workflow below assumes a common two-year master's structure and a longer doctoral structure, but the system should not hard-code durations. Each university must be able to configure duration, stage order, stage names, responsible bodies and required evidence.

**End-to-End Lifecycle Stages:**
`Admission & Researcher Identity` → `Coursework & Progression` → `Supervisor Assignment` → `Proposal Development` → `Department / Board Approval` → `Ethics, Permits & Data Plan` → `Fieldwork, Data & Analysis` → `Thesis & Publications` → `Defense & Graduation Clearance`

*Continuous controls: progress reporting | supervisor delay reports | alerts | audit trail | requirements | dashboards | research sync*

| Stage | Workflow description | Responsible actors | Required evidence | DACORIS action |
|---|---|---|---|---|
| **0. Admission / enrolment** | Student admitted into MSc or PhD programme; department, programme, cohort and study mode captured. | Registrar/ERP, Postgraduate Office | Admission record, programme, admission letter, registration status. | Creates postgraduate researcher profile; assigns requirement pack. |
| **1. Researcher profile creation** | Every postgraduate gets a DACORIS researcher profile. | Postgraduate Office / System | Name, student number, ORCID/PID, department, supervisor placeholder, research interests. | Links to DACORIS researcher registry and institutional affiliation. |
| **2. Coursework stage** | Student completes required coursework units. In many master's programmes, first year is predominantly coursework. | Student, Course Coordinator, Department | Unit registration, marks, pass/fail status, coursework completion evidence. | Eligibility gate before proposal-writing portfolio. |
| **3. Supervisor selection / assignment** | Student chooses or is assigned internal and external supervisors based on expertise, availability and workload. | HOD, PG Coordinator, Student, Supervisor | Supervisor request, acceptance, workload check, conflict declaration. | Creates supervisor-student relationship and accountability trail. |
| **4. Research concept and proposal portfolio** | Student develops concept note and proposal with supervisor feedback. | Student, Supervisors | Topic, concept note, proposal drafts, meeting logs, feedback comments. | Begins research project metadata draft in Research Module. |
| **5. Proposal defense and approval** | Student presents proposal to departmental or mandated board. Decision recorded with corrections and approval evidence. | Departmental Board / Faculty Board | Defense date, committee members, decision, minutes, corrections log. | Approved proposal becomes active postgraduate research project. |
| **6. Ethics, permits and data plan** | Student obtains research ethics, institutional approvals, permits and data-management approval before fieldwork. | Ethics Office, Department, Supervisor | Ethics application, IRB approval, permits, DMP, instruments. | Links to compliance and data management modules. |
| **7. Fieldwork / data collection** | Student collects data, reports field progress, incidents and dataset status. | Student, Supervisor, Data Office | Fieldwork logs, data collection tools, consent forms, dataset register. | Updates project milestones and data records. |
| **8. Data analysis** | Student analyzes data; support needs are tracked. | Student, Supervisor, Statistician/Data analyst if needed | Analysis plan, software, analysis outputs, supervisor review. | Can trigger intervention if analysis support is missing. |
| **9. Thesis writing and review** | Student writes thesis chapters and receives supervisor feedback. | Student, Supervisors | Drafts, comments, similarity reports, chapter sign-offs. | Feeds thesis readiness status and publication extraction. |
| **10. Publication compliance** | Student uploads publication evidence according to institutional requirements. | Student, Supervisor, Research/Library Office | Manuscripts, journal status, DOI, ORCID record, acceptance letters. | Updates DACORIS outputs and graduation readiness. |
| **11. Thesis submission and defense** | Student submits thesis for examination and defends before committee. | Department, Examiners, PG Board | Thesis, examiner reports, defense outcome, corrections list. | Creates defense and examination records. |
| **12. Corrections and final thesis deposit** | Student clears corrections and deposits final approved thesis. | Student, Supervisors, Library/Repository Office | Corrections response, final thesis, repository record. | Updates institutional repository and research outputs. |
| **13. Graduation clearance** | Academic, financial, publication, thesis, repository and administrative requirements verified. | Postgraduate Office, Registrar, Finance, Library | Clearance checklist, final approvals, graduation list. | Closes postgraduate lifecycle and retains alumnus researcher profile. |

---

## 6. Supervision Management Workflow

The supervision layer is the central uniqueness of the module. It should make supervision measurable, documented and action-oriented without reducing academic mentorship to a checklist. The system should capture the relationship between student, lead supervisor, co-supervisor, external supervisor, department and postgraduate office.

### 6.1 Supervisor Assignment Rules

- The student may nominate preferred supervisors where institutional rules allow, but the department must validate expertise, workload and conflicts before appointment.
- Each student must have a lead supervisor. Co-supervisors and external supervisors should be configurable by programme, degree level and department.
- Supervisor workload should be visible before assignment: active MSc students, active PhD students, overdue feedback, completion rate and at-risk cases.
- External supervisors should receive controlled access only after appointment approval and confidentiality/data-access conditions are accepted.
- Supervisor reassignment must preserve history, reason, effective date and approval authority.

### 6.2 Supervisor Reporting Requirements

| Report / sign-off | When triggered | Responsible person | System capture |
|---|---|---|---|
| **Regular progress comment** | Monthly or quarterly, configurable by institution | Lead supervisor; co-supervisor optional | Progress rating, achievements, next milestone, risks, support needed. |
| **Stage readiness sign-off** | Before proposal defense, data collection, thesis submission and defense | Lead supervisor plus committee where configured | Confirms student has met minimum requirements for next stage. |
| **Delay reason report** | Automatically required when student is overdue or flagged as stuck | Lead supervisor | Root cause, evidence, recommended intervention, revised timeline. |
| **Meeting log validation** | After scheduled supervision meetings | Student initiates; supervisor confirms | Meeting date, agenda, decisions, next actions. |
| **Intervention recommendation** | When delay requires action beyond student and supervisor | Lead supervisor / HOD | Scholarship support, data access, training, supervisor reassignment, ethics follow-up, writing clinic. |
| **Completion recommendation** | Before final thesis submission and graduation clearance | Lead supervisor | Confirms thesis, publications, corrections and final readiness. |

### 6.3 Supervisor Delay Report Template

The delay report should be structured so that the postgraduate office can compare bottlenecks across departments and act on them. It should not be a free-text-only report.

- Student name and number
- Programme, department, cohort and current stage
- Expected completion date and days overdue
- Primary delay category
- Secondary delay category
- Narrative explanation by lead supervisor
- Evidence attached
- Action already taken by supervisor
- Recommended institutional intervention
- Revised milestone date
- Risk level: low, medium, high, critical
- Escalation needed: yes/no

---

## 7. Stage-Gate Requirements Engine

DACORIS should include a configurable requirements engine. The system should ship with a baseline postgraduate workflow but allow each university, faculty, school, department and programme to add rules. This is essential because graduation rules, publication requirements and defense structures differ across institutions.

**Stage-Gate Logic:**
`Gate A: Coursework Complete` → `Gate B: Supervisor Confirmed` → `Gate C: Proposal Approved` → `Gate D: Research Cleared` → `Gate E: Data & Analysis Complete` → `Gate F: Thesis Ready` → `Gate G: Defense Passed` → `Gate H: Graduation Cleared`

### 7.1 Requirement Hierarchy

The requirement engine should apply rules in a hierarchy. A university-wide rule sets the minimum. A faculty, school, department or programme can add more specific requirements. Student-level exceptions should be rare and must require formal approval, reason and evidence.

| Rule level | Examples of configurable rules | Who manages it |
|---|---|---|
| **University-wide baseline** | Minimum publications before graduation, thesis format, repository deposit, ethics requirement, anti-plagiarism threshold, finance clearance. | Postgraduate Office / Senate-approved administrator |
| **Faculty / School** | Additional proposal defense requirements, faculty research seminars, publication type accepted, specific ethics pathway. | Dean / Faculty PG Board |
| **Department / Programme** | Programme-specific coursework, supervisor composition, fieldwork requirements, defense panel requirements, equipment/lab clearances. | HOD / Department PG Coordinator |
| **Degree level: MSc / PhD** | Different publication counts, thesis length bands, residency requirements, number of supervisors, external examiner rules. | Postgraduate Office + Programme administrator |
| **Student exception** | Leave of absence, approved timeline extension, publication waiver or replacement evidence if policy allows. | Formal approval role only; audit required |

### 7.2 Publication Requirement Logic

Because the user requirement is that both master's and PhD students should publish before graduation, the module should make publication compliance a formal graduation gate. However, the exact number and acceptable status should remain configurable.

| Publication-rule field | Configuration / behavior |
|---|---|
| **Degree level** | MSc, MPhil, PhD, professional doctorate. |
| **Minimum number of publications** | Example: MSc = 1; PhD = 2; or any institution-defined rule. |
| **Acceptable status** | Submitted, under review, accepted, published, indexed, DOI assigned, repository-deposited. |
| **Acceptable output types** | Journal article, conference paper, book chapter, preprint, data paper, policy brief; institution decides. |
| **Authorship rule** | First author, corresponding author, co-author, or contributor role. Configurable by programme. |
| **Verification method** | DOI lookup, ORCID record, journal acceptance letter, institutional repository record, manual approval. |
| **Graduation gate behavior** | Block graduation until requirement is met, or route exception to authorized board if policy allows. |

---

## 8. Progress Reporting, Bottleneck Detection and Intervention Management

The system should allow students to self-report progress, but the institutional value comes from combining student logs, supervisor validation, stage-gate deadlines and intervention workflows. Every delay should be classifiable, reportable and actionable.

**Delay Detection Workflow:**
`Stage-gate overdue or no progress log` → `System triggers at-risk flag` → `Lead supervisor submits reason report` → `Department / PG office reviews case`

### 8.1 Progress Report Fields

| Progress area | Required capture |
|---|---|
| **Student progress update** | Current stage, activities completed, documents submitted, challenges, requested support, next planned activity, evidence files. |
| **Supervisor validation** | Progress status, quality of work, feedback given, whether student is on track, reason if delayed, recommended next action. |
| **Milestone status** | Not started, in progress, submitted, under review, returned for corrections, approved, overdue, blocked, escalated. |
| **Evidence attachments** | Drafts, proposal, thesis chapters, publications, ethics applications, fieldwork permits, data collection instruments, meeting notes. |
| **Risk indicators** | Days overdue, number of missed reports, supervisor response delay, unresolved corrections, missing fees, missing ethics approval, publication not met. |

### 8.2 Delay Categories and Interventions

| Delay category | Typical meaning | DACORIS intervention action |
|---|---|---|
| **Coursework incomplete** | Student has not finished units or marks are missing. | Course adviser intervention, remedial plan, defer proposal portfolio, mark verification. |
| **Financial blockage** | Tuition or other fee block prevents registration, submission or defense. | Finance review, scholarship/bursary consideration, project-based support where available. |
| **Supervisor support gap** | Supervisor unavailable, slow feedback, mismatch of expertise or poor supervisory engagement. | HOD review, co-supervisor activation, supervisor reassignment, supervision workload review. |
| **Proposal-writing challenge** | Student lacks research question clarity, methodology support or literature framing. | Proposal clinic, research-methods support, supervisor action plan. |
| **Ethics / permit delay** | Research cannot proceed because approval is pending or application is incomplete. | Ethics office follow-up, missing-document tracker, approval timeline escalation. |
| **Data access / fieldwork challenge** | Student cannot obtain data or enter field site. | Attach to existing departmental project, approve secondary dataset, fieldwork support, partner access. |
| **Analysis gap** | Student lacks statistical, qualitative, computational or data-management support. | Data analysis clinic, statistician support, software training, data-management module support. |
| **Thesis-writing challenge** | Student has data but cannot complete thesis writing or structure. | Writing clinic, chapter targets, supervisor chapter sign-off calendar. |
| **Publication delay** | Student has not met publication requirement. | Journal matching, manuscript development clinic, DOI/ORCID support, library/research office support. |
| **Administrative blockage** | Missing forms, board minutes, defense scheduling, examiner appointment or repository clearance. | Department/PG office action owner and escalation timer. |

### 8.3 Intervention Case Record

Every intervention should be treated as a case. The case should have a category, owner, due date, student, supervisor, stage, evidence, action plan and closure status. This makes the postgraduate office proactive rather than reactive.

- Case owner: HOD, postgraduate coordinator, finance officer, supervisor, ethics officer, data analyst, library officer or scholarship office.
- Case due date and escalation level.
- Required action and expected outcome.
- Student and supervisor comments.
- Documents or evidence attached.
- Closure reason and final status.

---

## 9. Dashboards and Analytics

The dashboard layer must operate at several levels: university, faculty, department, supervisor and student. The Head of Postgraduate Studies needs a control tower that can drill from high-level KPIs into individual cases.

### 9.1 University-Level Dashboard

- Total postgraduate students by degree level, department, programme, cohort and status.
- Number of students in each stage: coursework, proposal writing, proposal defense, ethics, data collection, analysis, thesis writing, examination, corrections, graduation clearance.
- Students on track, at risk, overdue and critically delayed.
- Delay reasons by department and supervisor.
- Supervisor workload and overdue feedback reports.
- Publication-compliance status by degree level.
- Students blocked by fees, ethics, data collection, thesis writing, publication or defense scheduling.
- Graduation readiness forecast by semester or graduation cycle.
- Number of students attached to existing projects versus independent projects.
- Average time spent in each stage and stage completion rate.

### 9.2 Department Dashboard

- Active postgraduate students by programme and cohort.
- Student list by stage and expected next milestone.
- Upcoming proposal defenses, thesis defenses and board actions.
- Supervisor assignment gaps and overloaded supervisors.
- Department-specific bottlenecks and intervention cases.
- Students requiring project attachment, fieldwork support or analysis support.
- Publication and thesis readiness per student.

### 9.3 Supervisor Dashboard

- Assigned students and current stage for each.
- Pending reviews, overdue comments and scheduled meetings.
- Students stuck and mandatory delay reports due.
- Drafts awaiting feedback and approaching gate deadlines.
- Stage readiness sign-offs required.
- Supervisor workload profile and intervention recommendations.

### 9.4 Student Dashboard

- Personal postgraduate journey timeline.
- Completed and pending requirements.
- Supervisor feedback and next actions.
- Upcoming milestones, deadlines and defense dates.
- Publication requirement status and thesis deposit readiness.
- Support requests and intervention case status.

---

## 10. Research Linkage, Forms, Records and Data Model

The postgraduate module must connect student research to the DACORIS Research Management Module through two pathways: students attached to existing departmental/grant-funded projects, and students who originate independent projects that become institutional research records after approval.

**Two Research-Origin Pathways:**

**Pathway 1 — Existing DACORIS Project:** Student → Student Attachment (as researcher/postgraduate team member) → Linked Outputs (data, milestones, publications and thesis inherit project context)

**Pathway 2 — Independent Student Project:** Student → Proposal Approval (DACORIS creates a project record) → Institutional Visibility (project, data, ethics, thesis and publications become part of university research portfolio)

*Both pathways feed DACORIS outputs: project metadata, ethics, datasets, publications, thesis repository and dashboards.*

### 10.1 Core Data Objects

| Core data object | Minimum content |
|---|---|
| **Postgraduate researcher profile** | Student identity, programme, department, ORCID/PID, research interests, cohort, status. |
| **Requirement pack** | Rules assigned to student based on university, faculty, department, programme, degree level and cohort. |
| **Supervision record** | Lead supervisor, co-supervisors, external supervisors, appointment date, workload, history, comments. |
| **Research project record** | Approved topic, abstract, keywords, research area, project origin, project milestones, collaborators. |
| **Proposal record** | Drafts, supervisor reviews, defense details, board minutes, decision, corrections. |
| **Ethics/compliance record** | Ethics application, approval, permits, similarity reports, risk controls. |
| **Data management record** | DMP, data collection tools, dataset metadata, storage location, access and sharing status. |
| **Progress report record** | Student updates, supervisor validation, milestones, risks, next actions. |
| **Intervention case** | Delay reason, owner, recommended support, due date, escalation, closure status. |
| **Publication record** | Manuscripts, journal, status, DOI, ORCID link, evidence, requirement match. |
| **Thesis examination record** | Submission, examiners, defense date, committee decision, corrections, final approval. |
| **Graduation clearance record** | Academic, finance, publication, thesis, repository and administrative clearance. |

### 10.2 Key Forms and Screens

| Form / screen | Purpose |
|---|---|
| **Student profile and researcher identity form** | Captures student biodata, programme, research interests, ORCID/PID and departmental affiliation. |
| **Supervisor nomination / assignment form** | Captures proposed supervisors, expertise match, acceptance, workload and conflicts. |
| **Proposal portfolio screen** | Manages proposal drafts, feedback, defense readiness, corrections and approval evidence. |
| **Progress report form** | Used by students to report stage progress, activities, barriers and support needs. |
| **Supervisor validation form** | Used by lead supervisor to validate progress and provide stage comments. |
| **Delay reason report** | Mandatory supervisor report when student is stuck or overdue. |
| **Intervention case form** | Assigns support action, owner, due date and closure status. |
| **Publication compliance screen** | Tracks required papers and verifies evidence before graduation. |
| **Thesis examination screen** | Tracks examiner nomination, defense scheduling, outcome and corrections. |
| **Graduation clearance checklist** | Verifies all academic, research, publication, thesis, repository and finance requirements. |

---

## 11. Notifications, Escalations and Audit Trail

The system should not wait for manual follow-up. Every stage should have timelines, reminders and escalation rules. Notifications should be configurable by university and programme.

| Trigger | Meaning | Recipients | Escalation behavior |
|---|---|---|---|
| **Supervisor not assigned** | Student reaches supervisor assignment period with no confirmed supervisor. | Student, HOD, PG Coordinator | Escalate to HOD after configured days. |
| **Coursework not complete** | Student cannot enter proposal-writing portfolio due to missing units or marks. | Student, Course Coordinator, Department | Escalate if unresolved before proposal cycle. |
| **Proposal writing overdue** | Student remains in proposal writing beyond expected period. | Student, Lead Supervisor, HOD | Supervisor delay report required. |
| **Supervisor feedback overdue** | Draft or progress report submitted but supervisor has not responded. | Lead Supervisor, HOD | Escalate based on response SLA. |
| **Ethics approval missing** | Student attempts to move to fieldwork without ethics/permit clearance. | Student, Supervisor, Ethics Office | Block fieldwork stage and open compliance task. |
| **Publication requirement not met** | Student approaches thesis submission or graduation without required publication evidence. | Student, Supervisor, Research Office, Library | Open publication support action. |
| **Fees block detected** | Financial status prevents registration, defense or graduation. | Student, Finance Office, PG Office | Route to scholarship/support review if eligible. |
| **Defense corrections overdue** | Corrections not cleared by due date. | Student, Supervisor, Department | Escalate to department board. |

### 11.1 Audit Trail Requirements

- Record every submission, upload, review, approval, rejection, correction, sign-off and override.
- Capture user, role, timestamp, action, previous value, new value and reason where applicable.
- Store board minutes, defense reports and supervisor sign-offs as evidence records.
- Prevent deletion of critical academic records; allow only controlled archival or versioning.
- Maintain history when supervisors are changed or students shift projects/programmes.
- Support reporting for internal quality assurance and external audits.

---

## 12. Implementation Roadmap

| Phase | Build scope | Business value |
|---|---|---|
| **Phase 1: Core postgraduate workflow** | Researcher profile, programme setup, stage configuration, supervisor assignment, student journey, progress reporting, basic dashboard. | MVP foundation. |
| **Phase 2: Research-module integration** | Approved proposal creates/updates research project, supervisor linkage, project origin pathway, ethics linkage, publication tracker. | Makes module part of DACORIS research lifecycle. |
| **Phase 3: Supervision accountability** | Mandatory supervisor reports, delay reasons, workload analytics, reassignment workflow, intervention cases. | Differentiates DACORIS from generic student systems. |
| **Phase 4: Data, publications and repository** | Data management records, DOI/ORCID verification, thesis repository, publication compliance engine. | Strengthens research output visibility. |
| **Phase 5: Advanced analytics** | Completion forecasting, bottleneck heatmaps, supervisor effectiveness, scholarship-impact analysis, project-attachment outcomes. | Leadership intelligence and performance contracting. |

### 12.1 Suggested MVP Scope

- University/faculty/department/programme configuration.
- Student researcher profile creation and postgraduate lifecycle stage tracker.
- Supervisor assignment and supervisor dashboard.
- Student progress reporting and supervisor validation.
- Proposal development, proposal defense and approval workflow.
- Delay reason report and intervention case management.
- Head of postgraduate studies dashboard with stage distribution, department view and at-risk list.
- Publication requirement tracker and graduation readiness checklist.
- Basic linkage to DACORIS Research Management Module for approved student projects.

---

## 13. Developer Notes and Minimum Functional Requirements

### 13.1 Workflow States

- Not started
- In progress
- Submitted
- Under supervisor review
- Returned for correction
- Ready for department review
- Defense scheduled
- Approved
- Rejected
- Blocked
- Overdue
- Escalated
- Completed
- Archived

### 13.2 Business Rules

- A student cannot enter data collection until proposal approval and required ethics/permit status are complete, unless the institution explicitly configures an exception.
- A student cannot be marked thesis-ready without lead supervisor sign-off.
- Graduation readiness cannot be achieved unless all mandatory rules in the requirement pack are met or formally waived by an authorized role.
- An overdue stage must trigger a reminder first, then a mandatory supervisor delay report, then escalation to the department or postgraduate office.
- Supervisor reassignment must preserve previous supervisor history and reason for change.
- Independent student projects should become DACORIS research project records after proposal approval.
- Students attached to existing projects must inherit project metadata but still retain individual thesis and graduation requirements.
- Publication compliance should accept multiple evidence types but require verification before graduation clearance.
- Every committee decision must be linked to a meeting/board record and uploaded evidence.

### 13.3 Suggested Database Entities

- `pg_students`
- `pg_programmes`
- `pg_requirement_packs`
- `pg_stage_definitions`
- `pg_student_stage_status`
- `pg_supervisor_assignments`
- `pg_supervisor_reports`
- `pg_progress_reports`
- `pg_proposal_records`
- `pg_defense_records`
- `pg_ethics_records`
- `pg_data_records`
- `pg_publication_requirements`
- `pg_publication_evidence`
- `pg_intervention_cases`
- `pg_graduation_clearance`
- `pg_audit_log`

### 13.4 Reporting Outputs

- University postgraduate status report by department and programme.
- At-risk postgraduate student report with reason and intervention status.
- Supervisor workload and responsiveness report.
- Proposal defense pipeline report.
- Ethics and fieldwork readiness report.
- Publication compliance report.
- Graduation readiness report.
- Postgraduate research output report linked to DACORIS research management.
- Completion-rate and bottleneck trend report.

---

## Appendix A: Summary of the Recommended DACORIS Postgraduate Module Logic

- Treat each postgraduate student as a researcher from the moment of enrolment.
- Use a TemplumIS-style journey canvas to make each stage visible to the student, supervisor and university.
- Make supervisor assignment, supervisor feedback and delay reporting central product features.
- Link every approved student research project to the DACORIS Research Management Module.
- Support both students attached to existing projects and students pursuing independent projects.
- Use configurable graduation requirements, especially publication requirements for MSc and PhD students.
- Use dashboards to show the Head of Postgraduate Studies total students, departmental counts, stage progress, stuck cases, supervisor assignments and intervention status.
- Make every delay actionable through structured reason reporting and intervention case management.
- Use the module to improve completion, supervision quality, research output visibility and institutional decision-making.

---

## Appendix B: Board-Ready One-Paragraph Description

The DACORIS Postgraduate Researcher Management Module is a configurable postgraduate lifecycle and supervision management system that treats every master's and PhD student as a researcher. It tracks the student from admission, coursework, supervisor assignment, proposal development, proposal defense, ethics clearance, data collection, analysis, thesis writing, publication compliance, thesis defense, corrections and graduation clearance. Its unique value is in supervision accountability and institutional visibility: the Head of Postgraduate Studies can view all postgraduate students across the university, drill down by department and programme, see where each student is stuck, identify the assigned supervisors, read supervisor-written delay reports and trigger interventions such as scholarship support, methodology assistance, data-analysis support, ethics follow-up, writing support or attachment to existing DACORIS research projects.

---

## Appendix C: Developer Acceptance Checklist

| Acceptance item | Status |
|---|---|
| Researcher identity created for every postgraduate | Yes/No |
| Stage tracker supports configurable MSc and PhD workflows | Yes/No |
| Supervisor assignment supports lead, co-supervisor and external supervisor | Yes/No |
| Supervisor delay report is mandatory for overdue students | Yes/No |
| Approved proposal links to Research Management Module | Yes/No |
| Existing project and independent project pathways are both supported | Yes/No |
| Publication requirement engine is configurable | Yes/No |
| Head of Postgraduate Studies dashboard is available | Yes/No |
| Department, supervisor and student dashboards are available | Yes/No |
| Intervention case management is implemented | Yes/No |
| Audit trail records all approvals, changes and overrides | Yes/No |
