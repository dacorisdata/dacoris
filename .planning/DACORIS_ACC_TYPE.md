# DACORIS Account Types Implementation Summary

## Overview

This document summarizes the implementation of refined account types for the full DACORIS product, replacing the prototype's simple role system with a comprehensive multi-tier account structure with role-based access control.

## Account Type Structure

The system implements **4 primary account tiers** with distinct registration flows, authentication methods, and route access patterns.

### Tier 1: Platform Admin

#### Roles
- **Global admin**
- **Institution admin**

#### Registration Flow
1. **Run CLI** - `manage create-global-admin`
2. **Set email + password**
3. **Login** → `/global-admin`

#### Routes
- `/global-admin/*` - Full platform access
- `/institution-admin/*` - Create institutions
- `/admin/institutions` - Manage institutions
- `/admin/users` - User management

#### Authentication
- **Register:** CLI only
- **Login:** email + password

#### Characteristics
- No self-registration
- MFA recommended
- Full platform access
- Tenant management capabilities

---

### Tier 2: Administrative Staff

#### Roles (Can Hold Multiple)
- **Grant officer**
- **Research administrator**
- **Finance officer**
- **Data steward**
- **Ethics reviewer**
- **Ethics committee chair**

#### Registration Flow
1. **Self-register** - Institutional email
2. **Institution admin approves** - Assigns one or more roles
3. **Login → /dashboard** - Sees role-appropriate modules

#### Routes (Role-Gated)
- `/grants/manage/*` - Grant officer
- `/grants/review/*` - Research administrator
- `/grants/awards/*` - Finance officer
- `/grants/finance/*` - Finance officer
- `/research/ethics/manage` - Ethics reviewer
- `/research/admin/*` - Research administrator
- `/data/steward/*` - Data steward
- `/dashboard` - All roles

#### Authentication
- **Register:** Institutional email
- **Login:** email + password
- **Approval:** Required by institution admin

#### Characteristics
- Self-registration allowed
- Institutional email required
- Multiple roles assignable
- Role-based module access

---

### Tier 3: Researcher

#### Roles (Merged — Can Hold Multiple)
- **Principal investigator** (elevated)
- **Co-investigator** (base)
- **Researcher / staff** (base)

#### Registration Flow
1. **Choose method** (or)
   - **ORCID OAuth** → email + password
   - **Institutional email** → Follow-up: institution picker
2. **Select institution**
3. **Active immediately** - No pending approval step
4. **Login with same method** - ORCID OAuth or email + password

#### Routes (Role-Gated)
- `/grants/proposals/*` - All researcher roles
- `/grants/proposals/new` - PI role unlocks proposal creation; Co-I and Researcher cannot create proposals but can contribute to assigned ones
- `/research/projects/*` - All researcher roles
- `/research/ethics/submit` - PI and Co-I
- `/research/outputs/*` - All researcher roles
- `/data/collect/*` - All researcher roles
- `/dashboard` - All researcher roles

#### Authentication
- **Register:** ORCID or institutional email
- **Login:** ORCID OAuth or email + password

#### Characteristics
- Self-registration with choice of method
- Active immediately (no approval)
- Role elevation: PI role unlocks proposal creation
- Co-I and Researcher can contribute to assigned proposals

---

### Tier 4: Guest & External Reviewer

#### Roles
- **External reviewer** - Grant scoring
- **Guest collaborator** - Proposal/project access

#### Invitation Flow
1. **Grant officer / PI sends invite** - Email with scoped-access token
2. **Invitee clicks link** - Token sets scoped access
3. **Logs in to specific item only** - Proposal ID + project ID
4. **Token expires automatically** - No manual revoke needed

#### Routes (Item-Scoped Only)
- `/grants/proposals/{id}/review` - External reviewer
- `/grants/proposals/{id}/view` - External reviewer
- `/research/projects/{id}` - Guest collaborator
- `/data/forms/{id}/view` - Guest collaborator

#### Authentication
- **No self-registration**
- **Invitation only**
- **Auto-expires**

#### Characteristics
- Token-based scoped access
- Time-bounded sessions
- Item-specific permissions
- Automatic expiry

## Registration Flows by Tier

### Flow 1: Platform Admin (CLI Only)

```bash
# Run CLI command
python manage.py create-global-admin

# Prompts:
- Email address
- Password (with confirmation)
- Full name

# Result:
- Account created with account_type=PLATFORM_ADMIN
- Role: GLOBAL_ADMIN
- Status: ACTIVE (no approval needed)
```

### Flow 2: Administrative Staff (Self-Register + Approval)

```
Step 1: Self-register
  - Institutional email + password
  - Full name, department, job title
  ↓
Step 2: Institution admin approves
  - Assigns one or more roles:
    • Grant officer
    • Research administrator
    • Finance officer
    • Data steward
    • Ethics reviewer
    • Ethics committee chair
  ↓
Step 3: Login → /dashboard
  - Sees role-appropriate modules
```

### Flow 3: Researcher (Choose Method)

```
Option A: ORCID OAuth
  Step 1: Choose method → ORCID
    ↓
  Step 2: ORCID OAuth
    - Redirect to ORCID
    - Capture ORCID iD + email + password
    ↓
  Step 3: Select institution
    - Institution picker (follow-up)
    ↓
  Step 4: Active immediately
    - No pending approval step
    - Default role: RESEARCHER

Option B: Institutional Email
  Step 1: Choose method → Institutional email
    ↓
  Step 2: Email + password
    - Institutional email validation
    ↓
  Step 3: Select institution
    - Institution picker (follow-up)
    ↓
  Step 4: Active immediately
    - No pending approval step
    - Default role: RESEARCHER
```

### Flow 4: Guest & External Reviewer (Invitation Only)

```
Step 1: Grant officer / PI sends invite
  - Email with scoped-access token
  - Token includes:
    • Proposal ID or Project ID
    • Expiry timestamp
    • Role: EXTERNAL_REVIEWER or GUEST_COLLABORATOR
  ↓
Step 2: Invitee clicks link
  - Token sets scoped access
  - No password creation needed (token-based)
  ↓
Step 3: Logs in to specific item only
  - Access limited to proposal/project ID
  ↓
Step 4: Token expires automatically
  - No manual revoke needed
```

## Database Schema Changes

### Account Type Enum (4 Tiers)

```python
class AccountType(str, enum.Enum):
    PLATFORM_ADMIN = "platform_admin"          # Tier 1
    ADMIN_STAFF = "admin_staff"                # Tier 2
    RESEARCHER = "researcher"                  # Tier 3
    GUEST_EXTERNAL = "guest_external"          # Tier 4
```

### Role Enum (Refined)

```python
class ResearchRole(str, enum.Enum):
    # Tier 1: Platform Admin
    GLOBAL_ADMIN = "global_admin"
    INSTITUTION_ADMIN = "institution_admin"
    
    # Tier 2: Administrative Staff (can hold multiple)
    GRANT_OFFICER = "grant_officer"
    RESEARCH_ADMIN = "research_admin"
    FINANCE_OFFICER = "finance_officer"
    DATA_STEWARD = "data_steward"
    ETHICS_REVIEWER = "ethics_reviewer"
    ETHICS_CHAIR = "ethics_chair"
    
    # Tier 3: Researcher (can hold multiple)
    PRINCIPAL_INVESTIGATOR = "principal_investigator"  # Elevated
    CO_INVESTIGATOR = "co_investigator"                # Base
    RESEARCHER = "researcher"                          # Base
    
    # Tier 4: Guest & External
    EXTERNAL_REVIEWER = "external_reviewer"
    GUEST_COLLABORATOR = "guest_collaborator"
```

### User Model Fields

```python
class User(Base):
    # ... existing fields ...
    
    # Account type (4 tiers)
    account_type = Column(Enum(AccountType), nullable=False)
    
    # Profile fields
    department = Column(String(200), nullable=True)
    job_title = Column(String(200), nullable=True)
    phone = Column(String(50), nullable=True)
    
    # Guest/External account management
    is_guest = Column(Boolean, default=False, nullable=False)
    access_expires_at = Column(DateTime(timezone=True), nullable=True)
    invited_by_id = Column(Integer, ForeignKey('users.id'), nullable=True)
    scoped_access_token = Column(String(255), nullable=True)  # For item-scoped access
    scoped_item_type = Column(String(50), nullable=True)      # 'proposal' or 'project'
    scoped_item_id = Column(Integer, nullable=True)           # Proposal/Project ID
```

### User-Roles Junction Table (Many-to-Many)

```python
class UserRole(Base):
    __tablename__ = 'user_roles'
    
    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, ForeignKey('users.id'), nullable=False)
    role = Column(Enum(ResearchRole), nullable=False)
    assigned_at = Column(DateTime(timezone=True), server_default=func.now())
    assigned_by_id = Column(Integer, ForeignKey('users.id'), nullable=True)
    
    # Unique constraint: user can't have duplicate roles
    __table_args__ = (UniqueConstraint('user_id', 'role', name='uq_user_role'),)
```

## Route Guard Logic

### Two-Gate Check System

**Gate 1: `account_type`** - Platform admin → `/admin/*` only; guest → item-scoped routes only; `admin_staff` or `researcher` → proceed to Gate 2

**Gate 2: `roles`** - User's role set is a union — a Grant Officer who is also Finance Officer accesses both `/grants/manage/*` and `/grants/finance/*`. PI role unlocks proposal creation; Co-I and Researcher cannot create proposals but can contribute to assigned ones.

### Route Guard Examples

```python
# Example 1: Platform admin routes
@app.get("/global-admin/*")
@require_account_type(AccountType.PLATFORM_ADMIN)
def global_admin_route():
    # Only accessible to platform admins
    pass

# Example 2: Administrative staff with specific role
@app.get("/grants/manage/*")
@require_account_type(AccountType.ADMIN_STAFF)
@require_role(ResearchRole.GRANT_OFFICER)
def grant_management_route():
    # Accessible to admin staff with grant officer role
    pass

# Example 3: Researcher with PI role (proposal creation)
@app.post("/grants/proposals/new")
@require_account_type(AccountType.RESEARCHER)
@require_role(ResearchRole.PRINCIPAL_INVESTIGATOR)
def create_proposal():
    # Only PIs can create proposals
    # Co-I and Researcher cannot create but can contribute to assigned ones
    pass

# Example 4: Item-scoped access for guests
@app.get("/grants/proposals/{id}/review")
@require_scoped_access(item_type="proposal")
def review_proposal(id: int):
    # Check if user has scoped access to this specific proposal
    if current_user.scoped_item_type == "proposal" and current_user.scoped_item_id == id:
        # Allow access
        pass
    else:
        raise HTTPException(status_code=403, detail="Access denied")
```

## Backend Implementation

### Files Created/Modified

1. **`backend/models.py`** - Updated with AccountType, ResearchRole enums, User fields, UserRole junction table
2. **`backend/account_types.py`** - Configuration module for 4-tier account structure
3. **`backend/routes/registration.py`** - Multi-tier registration endpoints
4. **`backend/routes/auth.py`** - ORCID OAuth integration
5. **`backend/middleware/route_guards.py`** - Two-gate check decorators
6. **`backend/main.py`** - Added registration and auth routers
7. **`backend/alembic/versions/add_account_types_and_user_fields.py`** - Migration script
8. **`backend/cli/manage.py`** - CLI command for creating global admin

### API Endpoints

```
# Registration
POST /api/registration/admin-staff          # Tier 2: Self-register
POST /api/registration/researcher/orcid     # Tier 3: ORCID method
POST /api/registration/researcher/email     # Tier 3: Email method

# Authentication
POST /api/auth/login                        # Email + password
GET  /api/auth/orcid/authorize              # ORCID OAuth redirect
GET  /api/auth/orcid/callback               # ORCID OAuth callback

# Invitation (Tier 4)
POST /api/invitations/external-reviewer     # Grant officer sends invite
POST /api/invitations/guest-collaborator    # PI sends invite
GET  /api/invitations/accept/{token}        # Accept invitation

# Admin
POST /api/admin/users/{id}/approve          # Institution admin approves
POST /api/admin/users/{id}/assign-roles     # Assign multiple roles
GET  /api/admin/users/pending               # List pending approvals
```

## Frontend Implementation

### Components Created

1. **`TierSelector.js`** - Select account tier (Admin Staff or Researcher)
2. **`ResearcherMethodSelector.js`** - Choose ORCID or Email method
3. **`OrcidAuthFlow.js`** - ORCID OAuth redirect and callback
4. **`AdminStaffRegistration.js`** - Email + password for admin staff
5. **`ResearcherRegistration.js`** - Handles both ORCID and email methods
6. **`InstitutionPicker.js`** - Institution selection (follow-up for researchers)
7. **`RegistrationSuccess.js`** - Success page with tier-specific messaging
8. **`InvitationAccept.js`** - Token-based invitation acceptance for guests

### Key Features

- **Tier-Based Flow:** Different flows for each of the 4 tiers
- **ORCID Integration:** OAuth redirect for researchers
- **Real-time Validation:** Email domain validation, password strength
- **Approval Status:** Admin staff see "Pending approval" message
- **Immediate Access:** Researchers activated immediately
- **Token-Based Invitations:** Scoped access for guests and external reviewers
- **Responsive Design:** Works on mobile and desktop
- **Material-UI Components:** Consistent with existing design system

## Role Assignment Logic

### Tier 1: Platform Admin
1. Created via CLI with `GLOBAL_ADMIN` role
2. Status: `ACTIVE` immediately (no approval)
3. Can create `INSTITUTION_ADMIN` users

### Tier 2: Administrative Staff
1. Self-registers with `account_type=ADMIN_STAFF`
2. Status: `PENDING` until institution admin approves
3. Institution admin assigns one or more roles:
   - Grant officer
   - Research administrator
   - Finance officer
   - Data steward
   - Ethics reviewer
   - Ethics committee chair
4. Status changed to `ACTIVE`
5. User receives activation email

### Tier 3: Researcher
1. Self-registers with `account_type=RESEARCHER`
2. Default role: `RESEARCHER` (base)
3. Status: `ACTIVE` immediately (no approval)
4. Institution admin can elevate to:
   - `PRINCIPAL_INVESTIGATOR` (unlocks proposal creation)
   - `CO_INVESTIGATOR` (can contribute to assigned proposals)
5. Can hold multiple researcher roles

### Tier 4: Guest & External Reviewer
1. Created via invitation with scoped access token
2. Role: `EXTERNAL_REVIEWER` or `GUEST_COLLABORATOR`
3. Status: `ACTIVE` with expiry timestamp
4. Access limited to specific proposal/project ID
5. Token expires automatically

### Multiple Roles (Union-Based Access)
- Users can have multiple roles via `user_roles` junction table
- Example: Grant Officer who is also Finance Officer accesses both `/grants/manage/*` and `/grants/finance/*`
- Example: Researcher who is also PI can create proposals and contribute to assigned ones
- Roles are additive, not exclusive

## Migration Guide

### For Existing Users
1. Run migration: `alembic upgrade head`
2. Existing users will have `account_type=NULL`
3. Migration script auto-assigns account types:
   ```python
   # Auto-assignment logic
   if user.has_role('SYSTEM_ADMIN'):
       user.account_type = AccountType.PLATFORM_ADMIN
   elif user.has_any_role(['GRANT_OFFICER', 'RESEARCH_ADMIN', 'FINANCE_OFFICER', 'DATA_STEWARD', 'ETHICS_REVIEWER']):
       user.account_type = AccountType.ADMIN_STAFF
   elif user.has_any_role(['RESEARCHER', 'PRINCIPAL_INVESTIGATOR', 'CO_INVESTIGATOR']):
       user.account_type = AccountType.RESEARCHER
   elif user.has_any_role(['EXTERNAL_REVIEWER', 'GUEST_COLLABORATOR']):
       user.account_type = AccountType.GUEST_EXTERNAL
   ```
4. Deprecated roles removed:
   - `APPLICANT` → merged into `RESEARCHER`
   - `INSTITUTIONAL_LEAD` → merged into `ADMIN_STAFF` with multiple roles
   - `EXTERNAL_FUNDER` → removed (use `GUEST_COLLABORATOR` instead)
   - `DATA_ENGINEER` → merged into `DATA_STEWARD`
   - `SYSTEM_ADMIN` → renamed to `GLOBAL_ADMIN`

### For New Installations
1. Run migrations to create tables with new fields
2. Create Global Admin via CLI: `python manage.py create-global-admin`
3. Global Admin creates Institution and Institution Admin
4. Users can self-register with tier-based flow

## Testing Checklist

### Tier 1: Platform Admin
- [ ] CLI command creates global admin
- [ ] Global admin can access `/global-admin/*`
- [ ] Global admin can create institution admins
- [ ] MFA setup works correctly

### Tier 2: Administrative Staff
- [ ] Self-registration with institutional email works
- [ ] Pending approval status set correctly
- [ ] Institution admin can approve/reject accounts
- [ ] Institution admin can assign multiple roles
- [ ] Role-gated routes work (e.g., `/grants/manage/*` for grant officer)
- [ ] Union-based access works (e.g., Grant Officer + Finance Officer)

### Tier 3: Researcher
- [ ] ORCID OAuth flow redirects and returns correctly
- [ ] Email method registration works
- [ ] Institution picker displays after registration
- [ ] Account activated immediately (no approval)
- [ ] Default role `RESEARCHER` assigned
- [ ] PI role unlocks `/grants/proposals/new`
- [ ] Co-I and Researcher cannot create proposals but can contribute to assigned ones

### Tier 4: Guest & External Reviewer
- [ ] Grant officer can send external reviewer invitations
- [ ] PI can send guest collaborator invitations
- [ ] Token-based access works for specific proposal/project
- [ ] Scoped routes enforce item-level access
- [ ] Tokens expire automatically
- [ ] Expired tokens deny access

### Route Guards
- [ ] Two-gate check enforces account type + role
- [ ] Platform admin blocked from researcher routes
- [ ] Guest blocked from non-scoped routes
- [ ] Union-based role access works correctly

## Benefits

1. **Clear Tier Structure:** 4 distinct tiers with specific registration flows
2. **Flexible Role Management:** Multiple roles per user (union-based access)
3. **ORCID Integration:** OAuth for researchers with choice of method
4. **Immediate Researcher Access:** No approval bottleneck for researchers
5. **Controlled Admin Access:** Approval required for administrative staff
6. **Scoped Guest Access:** Token-based, item-level permissions with auto-expiry
7. **Route Guard Logic:** Two-gate check (account type + role)
8. **Security:** Email domain validation, password strength, MFA for admins
9. **Scalability:** Easy to add new roles within existing tiers
10. **Compliance:** Institutional email requirement ensures affiliation

## Next Steps

1. **Email Notification System**
   - Admin staff approval notifications
   - External reviewer invitations
   - Guest collaborator invitations
   - Token expiry reminders

2. **Institution Admin Approval Workflow**
   - Dashboard for pending approvals
   - Role assignment UI (multi-select)
   - Bulk approval actions

3. **Role Management UI**
   - Assign/revoke roles for existing users
   - Role elevation (e.g., Researcher → PI)
   - Role history and audit trail

4. **Guest Account Expiry Automation**
   - Cron job to check `access_expires_at`
   - Auto-disable expired accounts
   - Email notification before expiry

5. **Invitation System**
   - Token generation with scoped access
   - Email templates for invitations
   - Invitation acceptance flow

6. **Route Guard Middleware**
   - Implement `@require_account_type` decorator
   - Implement `@require_role` decorator
   - Implement `@require_scoped_access` decorator
   - Add route guard tests

7. **Audit Logging**
   - Log account creation, approval, role changes
   - Log invitation sends and acceptances
   - Log route access attempts (success/failure)

8. **ORCID OAuth Integration**
   - Register ORCID OAuth app
   - Implement OAuth flow (authorize + callback)
   - Store ORCID iD and sync profile data
