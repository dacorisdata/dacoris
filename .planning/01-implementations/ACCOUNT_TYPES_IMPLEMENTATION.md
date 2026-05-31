# DACORIS Account Types Implementation Summary

## Overview

This document summarizes the implementation of refined account types for the full DACORIS product, replacing the prototype's simple role system with a comprehensive multi-step registration flow.

## Account Type Structure

### Self-Registration Account Types (7 Types)

#### 1. Researcher (ORCID Required)
- **Registration Flow:** Account Type → ORCID Auth → Details → Password
- **Default Role:** `RESEARCHER`
- **Assignable Roles:** `RESEARCHER`, `PI`, `CO_I`, `ETHICS_REVIEWER`
- **Primary Modules:** Grants, Research, Data
- **Use Case:** Faculty, postdocs, research staff, students conducting research

#### 2. Grant Manager (Email Only)
- **Registration Flow:** Account Type → Details → Password
- **Default Role:** `GRANT_OFFICER`
- **Assignable Roles:** `GRANT_OFFICER`, `RESEARCH_ADMIN`
- **Primary Modules:** Grant Management
- **Use Case:** Grant office staff managing funding opportunities

#### 3. Finance Officer (Email Only)
- **Registration Flow:** Account Type → Details → Password
- **Default Role:** `FINANCE_OFFICER`
- **Assignable Roles:** `FINANCE_OFFICER`
- **Primary Modules:** Grant Management (Finance)
- **Use Case:** Finance staff managing budgets and disbursements

#### 4. Ethics Committee Member (ORCID Required)
- **Registration Flow:** Account Type → ORCID Auth → Details → Password
- **Default Role:** `ETHICS_REVIEWER`
- **Assignable Roles:** `ETHICS_REVIEWER`, `ETHICS_CHAIR`
- **Primary Modules:** Research Management (Ethics)
- **Use Case:** Ethics/IRB committee members reviewing protocols

#### 5. Data Steward (Email Only)
- **Registration Flow:** Account Type → Details → Password
- **Default Role:** `DATA_STEWARD`
- **Assignable Roles:** `DATA_STEWARD`
- **Primary Modules:** Data Management Part A
- **Use Case:** Data management professionals curating datasets

#### 6. Data Engineer (Email Only)
- **Registration Flow:** Account Type → Details → Password
- **Default Role:** `DATA_ENGINEER`
- **Assignable Roles:** `DATA_ENGINEER`
- **Primary Modules:** Data Management Part B
- **Use Case:** Technical staff building data pipelines

#### 7. Institutional Leadership (Email Only)
- **Registration Flow:** Account Type → Details → Password
- **Default Role:** `INSTITUTIONAL_LEAD`
- **Assignable Roles:** `INSTITUTIONAL_LEAD`
- **Primary Modules:** All (Strategic Dashboards)
- **Use Case:** Executives, deans, department heads

### Admin Account Types (CLI/Manual Creation)

#### 8. Global Admin
- **Creation Method:** CLI command only
- **Auth:** Email + Password (+ MFA recommended)
- **Permissions:** Full platform access, tenant management

#### 9. Institution Admin
- **Creation Method:** Global Admin creates via dashboard
- **Auth:** Email + Password (+ MFA recommended)
- **Permissions:** Manage users within tenant, assign roles

### External Account Types (Invitation-Only)

#### 10. External Reviewer
- **Creation Method:** Grant Manager invitation
- **Default Role:** `EXTERNAL_REVIEWER`
- **Access:** Time-bounded, specific proposals only
- **Use Case:** External experts reviewing grant applications

#### 11. Guest Collaborator
- **Creation Method:** PI/Researcher invitation
- **Default Role:** `GUEST_COLLABORATOR`
- **Access:** Time-bounded, scoped to specific proposals/projects
- **Use Case:** External collaborators on specific work

#### 12. External Funder
- **Creation Method:** Grant Manager invitation
- **Default Role:** `EXTERNAL_FUNDER`
- **Access:** Linked to award lifecycle
- **Use Case:** Funder representatives monitoring grants

## Multi-Step Registration Flow

### Flow A: ORCID-Required (Researcher, Ethics Committee Member)

```
Step 1: Select Account Type
  ↓
Step 2: ORCID Search & Authentication
  - Redirect to ORCID OAuth
  - Capture ORCID iD and profile data
  ↓
Step 3: Account Details
  - Pre-fill name from ORCID
  - Institutional email (validated)
  - Department/Faculty
  - Phone, expertise keywords (optional)
  ↓
Step 4: Password Setup
  - Create password
  - Confirm password
  - Accept terms and conditions
  ↓
Step 5: Pending Approval
  - Account created with status=PENDING
  - Institution Admin notified
```

### Flow B: Email-Only (All Other Account Types)

```
Step 1: Select Account Type
  ↓
Step 2: Account Details (ORCID step skipped)
  - Full name
  - Institutional email (validated)
  - Department/Faculty
  - Phone, job title (optional)
  ↓
Step 3: Password Setup
  - Create password
  - Confirm password
  - Accept terms and conditions
  ↓
Step 4: Pending Approval
  - Account created with status=PENDING
  - Institution Admin notified
```

## Database Schema Changes

### New Enums

```python
class PrimaryAccountType(str, enum.Enum):
    RESEARCHER = "researcher"
    GRANT_MANAGER = "grant_manager"
    FINANCE_OFFICER = "finance_officer"
    ETHICS_COMMITTEE_MEMBER = "ethics_committee_member"
    DATA_STEWARD = "data_steward"
    DATA_ENGINEER = "data_engineer"
    INSTITUTIONAL_LEADERSHIP = "institutional_leadership"
    EXTERNAL_REVIEWER = "external_reviewer"
    GUEST_COLLABORATOR = "guest_collaborator"
    EXTERNAL_FUNDER = "external_funder"
```

### Expanded ResearchRole Enum

```python
class ResearchRole(str, enum.Enum):
    RESEARCHER = "researcher"
    PRINCIPAL_INVESTIGATOR = "principal_investigator"
    CO_INVESTIGATOR = "co_investigator"
    GRANT_OFFICER = "grant_officer"
    RESEARCH_ADMIN = "research_admin"
    FINANCE_OFFICER = "finance_officer"
    ETHICS_REVIEWER = "ethics_reviewer"
    ETHICS_CHAIR = "ethics_chair"
    DATA_STEWARD = "data_steward"
    DATA_ENGINEER = "data_engineer"
    INSTITUTIONAL_LEAD = "institutional_lead"
    SYSTEM_ADMIN = "system_admin"
    EXTERNAL_REVIEWER = "external_reviewer"
    GUEST_COLLABORATOR = "guest_collaborator"
    EXTERNAL_FUNDER = "external_funder"
    APPLICANT = "applicant"
```

### New User Model Fields

```python
class User(Base):
    # ... existing fields ...
    
    # Account type and profile
    primary_account_type = Column(Enum(PrimaryAccountType), nullable=True)
    department = Column(String(200), nullable=True)
    job_title = Column(String(200), nullable=True)
    phone = Column(String(50), nullable=True)
    expertise_keywords = Column(Text, nullable=True)  # JSON array
    
    # Guest account management
    is_guest = Column(Boolean, default=False, nullable=False)
    access_expires_at = Column(DateTime(timezone=True), nullable=True)
    invited_by_id = Column(Integer, ForeignKey('users.id'), nullable=True)
    invitation_context = Column(Text, nullable=True)  # JSON
```

## Backend Implementation

### Files Created/Modified

1. **`backend/models.py`** - Updated with new enums and User fields
2. **`backend/account_types.py`** - New configuration module for account types
3. **`backend/routes/registration.py`** - New multi-step registration endpoints
4. **`backend/main.py`** - Added registration router
5. **`backend/alembic/versions/add_account_types_and_user_fields.py`** - Migration script

### API Endpoints

```
GET  /api/registration/account-types
POST /api/registration/validate-step1
POST /api/registration/validate-email
POST /api/registration/complete
GET  /api/registration/departments/{institution_domain}
```

## Frontend Implementation

### Components Created

1. **`AccountTypeSelector.js`** - Grid of account type cards with icons
2. **`OrcidSearchStep.js`** - ORCID authentication flow
3. **`AccountDetailsForm.js`** - Account details with email validation
4. **`PasswordSetupForm.js`** - Password creation with strength indicator
5. **`RegistrationStepper.js`** - Main orchestrator component
6. **`registration/success/page.js`** - Success page after registration

### Key Features

- **Dynamic Step Flow:** Automatically skips ORCID step for email-only accounts
- **Real-time Validation:** Email domain validation, password strength
- **Pre-fill from ORCID:** Name and profile data auto-populated
- **Responsive Design:** Works on mobile and desktop
- **Material-UI Components:** Consistent with existing design system

## Role Assignment Logic

### During Registration
1. User selects primary account type
2. System assigns default role based on account type
3. Account created with `status=PENDING`

### After Approval
1. Institution Admin reviews account
2. Admin can assign additional roles
3. Account status changed to `ACTIVE`
4. User receives activation email

### Multiple Roles
- Users can have multiple roles via `user_roles` junction table
- Example: Researcher can also be PI, Co-I, Ethics Reviewer
- Roles are additive, not exclusive

## Migration Guide

### For Existing Users
1. Run migration: `alembic upgrade head`
2. Existing users will have `primary_account_type=NULL`
3. Admin should assign account types based on current roles
4. Script can auto-assign based on primary role

### For New Installations
1. Run migrations to create tables with new fields
2. Create Global Admin via CLI
3. Create Institution and Institution Admin
4. Users can self-register with new flow

## Testing Checklist

- [ ] Account type selection displays all 7 types
- [ ] ORCID flow redirects and returns correctly
- [ ] Email validation checks institution domain
- [ ] Password strength indicator works
- [ ] Form validation prevents invalid submissions
- [ ] Default roles assigned correctly
- [ ] Pending approval status set
- [ ] Success page displays after registration
- [ ] Admin can approve/reject accounts
- [ ] Admin can assign additional roles
- [ ] Guest accounts expire automatically
- [ ] External invitations work correctly

## Benefits

1. **Simplified Registration:** Clear account types instead of confusing roles
2. **Flexible Role Management:** Multiple roles per user
3. **Better UX:** Multi-step flow with validation
4. **ORCID Integration:** Automatic profile sync for researchers
5. **Security:** Email domain validation, password strength
6. **Scalability:** Easy to add new account types
7. **Compliance:** Institutional email requirement ensures affiliation

## Next Steps

1. Implement email notification system
2. Build Institution Admin approval workflow
3. Add role management UI for admins
4. Implement guest account expiry automation
5. Create invitation system for external users
6. Add audit logging for account changes
