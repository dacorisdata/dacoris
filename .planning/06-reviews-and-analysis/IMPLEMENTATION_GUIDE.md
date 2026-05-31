# DACORIS IAM Implementation Guide

This guide provides complete instructions for deploying and using the DACORIS ORCID-centric Identity & Access Management system.

## Table of Contents

1. [System Overview](#system-overview)
2. [Prerequisites](#prerequisites)
3. [Installation](#installation)
4. [Initial Setup](#initial-setup)
5. [User Workflows](#user-workflows)
6. [Admin Workflows](#admin-workflows)
7. [API Reference](#api-reference)
8. [Troubleshooting](#troubleshooting)

## System Overview

### Architecture

DACORIS implements a two-tier admin system with ORCID-centric authentication:

- **Backend**: FastAPI (Python) with PostgreSQL
- **Frontend**: Next.js (React) with Material-UI
- **Authentication**: ORCID OAuth 2.0 for researchers, local credentials for admins

### Account Types

1. **Global Admin** - Platform-level administrator
   - Manages all institutions
   - Creates Institution Admins
   - Views cross-tenant analytics
   - Authentication: Email/password

2. **Institution Admin** - Tenant-level administrator
   - Manages users within their institution
   - Approves/rejects pending users
   - Assigns roles to researchers
   - Authentication: Email/password

3. **ORCID Researchers** - Research users
   - 7 role types: PI, Grant Officer, Ethics Reviewer, Data Steward, Data Engineer, Institutional Lead, System Admin
   - Authentication: ORCID OAuth 2.0 only

### Database Models

- `Institution` - Tenant/organization
- `User` - All user types (admins and researchers)
- `OrcidProfile` - Cached ORCID data
- `ResearchRole` - Enum of 7 research roles
- `user_roles` - Many-to-many role assignments

## Prerequisites

### Backend Requirements

- Python 3.10+
- PostgreSQL 12+
- pip and virtualenv

### Frontend Requirements

- Node.js 18+
- npm or yarn

### ORCID Requirements

- ORCID Sandbox account (for development)
- ORCID Production credentials (for production)
- Registered OAuth application

## Installation

### 1. Clone and Setup Backend

```bash
cd backend

# Create virtual environment
python -m venv venv

# Activate virtual environment
# Windows:
venv\Scripts\activate
# Linux/Mac:
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt
```

### 2. Configure Backend Environment

Create `.env` file from example:

```bash
cp .env.example .env
```

Edit `.env` with your configuration:

```env
# Database
DATABASE_URL="postgresql+asyncpg://postgres:password@localhost:5432/dacoris"

# JWT Configuration
JWT_SECRET_KEY=<generate-with-openssl-rand-hex-32>
JWT_ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=30
ADMIN_SESSION_EXPIRE_MINUTES=480

# ORCID Configuration
ORCID_CLIENT_ID=APP-XXXXXXXXXXXXXXXX
ORCID_CLIENT_SECRET=xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
ORCID_REDIRECT_URI=http://localhost:8000/api/auth/orcid/callback
ORCID_SANDBOX_MODE=true
ORCID_API_BASE_URL=https://sandbox.orcid.org

# Frontend URL
FRONTEND_URL=http://localhost:3000
```

### 3. Initialize Database

```bash
# Create PostgreSQL database
createdb dacoris

# Initialize tables
python manage.py init-database
```

### 4. Setup Frontend

```bash
cd ../frontend

# Install dependencies
npm install

# Create .env.local
echo "NEXT_PUBLIC_API_URL=http://localhost:8000" > .env.local
```

## Initial Setup

### Step 1: Create Global Admin

```bash
cd backend
python manage.py create-global-admin
```

Example:
```
Email: admin@dacoris.org
Password: ********
Repeat for confirmation: ********
Name: System Administrator
✓ Global admin created successfully!
```

### Step 2: Start Services

Terminal 1 (Backend):
```bash
cd backend
python main.py
```

Terminal 2 (Frontend):
```bash
cd frontend
npm run dev
```

### Step 3: Create First Institution

Option A - CLI:
```bash
python manage.py create-institution
```

Option B - API (via Swagger UI at http://localhost:8000/docs):
1. Login as Global Admin: `POST /api/auth/login`
2. Copy access token
3. Click "Authorize" button, paste token
4. Create institution: `POST /api/global-admin/institutions`

### Step 4: Create Institution Admin

Via API (requires Global Admin token):
```
POST /api/global-admin/institutions/{institution_id}/admin
{
  "email": "admin@university.edu",
  "name": "University Admin",
  "password": "secure_password",
  "institution_id": 1
}
```

### Step 5: Configure ORCID Credentials

Each institution needs its own ORCID credentials:

1. Login as Institution Admin
2. Navigate to Settings
3. Add ORCID Client ID, Secret, and Redirect URI

Or via API:
```
PUT /api/institution-admin/settings
{
  "orcid_client_id": "APP-XXXXXXXXXXXXXXXX",
  "orcid_client_secret": "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx",
  "orcid_redirect_uri": "http://localhost:8000/api/auth/orcid/callback"
}
```

## User Workflows

### Researcher Onboarding (ORCID)

1. **Visit Login Page**
   - URL: `http://localhost:3000/login`
   - Click "Sign in with ORCID (Researchers)"

2. **ORCID Authentication**
   - Redirected to ORCID
   - Login with ORCID credentials
   - Authorize DACORIS application

3. **Institution Selection**
   - Redirected to onboarding page
   - Select institution from dropdown
   - Submit selection

4. **Account Status**
   - **Auto-approved**: If email domain matches institution domain
   - **Pending**: If email domain doesn't match (requires admin approval)

5. **Access Dashboard**
   - Active users: Redirected to dashboard
   - Pending users: Shown pending message

### Admin Login

1. **Visit Login Page**
   - URL: `http://localhost:3000/login`
   - Enter email and password
   - Click "Sign In (Admin Only)"

2. **Access Admin Portal**
   - Global Admin: Navigate to Global Admin portal
   - Institution Admin: Navigate to Institution Admin portal

## Admin Workflows

### Global Admin Tasks

#### Create New Institution

```bash
# CLI
python manage.py create-institution

# Or via API
POST /api/global-admin/institutions
{
  "name": "University of Example",
  "domain": "example.edu",
  "verified_domains": "example.edu,example.org"
}
```

#### Create Institution Admin

```
POST /api/global-admin/institutions/{id}/admin
{
  "email": "admin@example.edu",
  "name": "Admin Name",
  "password": "secure_password",
  "institution_id": 1
}
```

#### View Platform Analytics

```
GET /api/global-admin/analytics
```

Returns:
- Total institutions
- Total users
- Active users
- Pending users
- ORCID users count

### Institution Admin Tasks

#### View Pending Users

```
GET /api/institution-admin/users/pending
```

#### Approve User

```
POST /api/institution-admin/users/{user_id}/approve
{
  "status": "active"
}
```

#### Assign Roles

```
POST /api/institution-admin/users/{user_id}/roles
{
  "roles": [
    "principal_investigator",
    "grant_officer"
  ]
}
```

Available roles:
- `principal_investigator`
- `grant_officer`
- `ethics_reviewer`
- `data_steward`
- `data_engineer`
- `institutional_lead`
- `system_admin`

#### Update Institution Settings

```
PUT /api/institution-admin/settings
{
  "orcid_client_id": "APP-XXXXXXXXXXXXXXXX",
  "orcid_client_secret": "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx",
  "verified_domains": "example.edu,example.org,example.com"
}
```

## API Reference

### Authentication Endpoints

| Endpoint | Method | Auth | Description |
|----------|--------|------|-------------|
| `/api/auth/login` | POST | None | Admin login (email/password) |
| `/api/auth/me` | GET | Bearer | Get current user info |
| `/api/auth/orcid/login` | GET | None | Initiate ORCID OAuth flow |
| `/api/auth/orcid/callback` | GET | None | ORCID OAuth callback |

### Onboarding Endpoints

| Endpoint | Method | Auth | Description |
|----------|--------|------|-------------|
| `/api/onboarding/institutions` | GET | Bearer | List available institutions |
| `/api/onboarding/select-institution` | POST | Bearer | Select institution |
| `/api/onboarding/status` | GET | Bearer | Get onboarding status |

### Global Admin Endpoints

| Endpoint | Method | Auth | Description |
|----------|--------|------|-------------|
| `/api/global-admin/institutions` | GET | Global Admin | List all institutions |
| `/api/global-admin/institutions` | POST | Global Admin | Create institution |
| `/api/global-admin/institutions/{id}` | GET | Global Admin | Get institution |
| `/api/global-admin/institutions/{id}` | PUT | Global Admin | Update institution |
| `/api/global-admin/institutions/{id}/admin` | POST | Global Admin | Create institution admin |
| `/api/global-admin/users` | GET | Global Admin | List all users |
| `/api/global-admin/analytics` | GET | Global Admin | Platform analytics |

### Institution Admin Endpoints

| Endpoint | Method | Auth | Description |
|----------|--------|------|-------------|
| `/api/institution-admin/users` | GET | Institution Admin | List institution users |
| `/api/institution-admin/users/pending` | GET | Institution Admin | List pending users |
| `/api/institution-admin/users/{id}/approve` | POST | Institution Admin | Approve/suspend user |
| `/api/institution-admin/users/{id}/roles` | POST | Institution Admin | Assign roles |
| `/api/institution-admin/users/{id}/roles` | GET | Institution Admin | Get user roles |
| `/api/institution-admin/settings` | GET | Institution Admin | Get institution settings |
| `/api/institution-admin/settings` | PUT | Institution Admin | Update settings |
| `/api/institution-admin/analytics` | GET | Institution Admin | Institution analytics |

## Troubleshooting

### Database Connection Issues

**Problem**: `connection refused` or `database does not exist`

**Solution**:
```bash
# Ensure PostgreSQL is running
# Windows: Check Services
# Linux: sudo systemctl status postgresql

# Create database if missing
createdb dacoris

# Verify DATABASE_URL in .env
```

### ORCID Authentication Fails

**Problem**: ORCID redirect fails or shows error

**Solution**:
1. Verify ORCID credentials in `.env`
2. Check redirect URI matches ORCID app settings
3. Ensure using sandbox credentials for development
4. Check ORCID_REDIRECT_URI is accessible

### Token Expired Errors

**Problem**: 401 Unauthorized after some time

**Solution**:
- Tokens expire after configured time
- Re-login to get new token
- Admins have longer session (480 minutes by default)
- Researchers have shorter session (30 minutes by default)

### User Stuck in Pending Status

**Problem**: User can't access system after ORCID login

**Solution**:
1. Institution Admin must approve the user
2. Check if email domain matches institution
3. Add domain to `verified_domains` for auto-approval
4. Manually approve via Institution Admin portal

### Import Errors in Backend

**Problem**: `ModuleNotFoundError` or import errors

**Solution**:
```bash
# Ensure virtual environment is activated
source venv/bin/activate  # Linux/Mac
venv\Scripts\activate     # Windows

# Reinstall dependencies
pip install -r requirements.txt
```

### Frontend Build Errors

**Problem**: Module not found or build fails

**Solution**:
```bash
# Clear node_modules and reinstall
rm -rf node_modules package-lock.json
npm install

# Clear Next.js cache
rm -rf .next
npm run dev
```

## Security Best Practices

1. **Production Deployment**:
   - Use HTTPS only
   - Change JWT_SECRET_KEY to strong random value
   - Use production ORCID credentials
   - Enable CORS only for your domain
   - Use environment variables, never commit secrets

2. **Password Policy**:
   - Enforce strong passwords for admin accounts
   - Rotate admin passwords regularly
   - Use password managers

3. **Database Security**:
   - Use strong database passwords
   - Restrict database access to backend only
   - Regular backups
   - Enable SSL for database connections in production

4. **ORCID Tokens**:
   - Tokens are stored encrypted
   - Refresh tokens automatically
   - Revoke tokens when users are suspended

## Next Steps

1. **Customize Roles**: Modify `ResearchRole` enum for your needs
2. **Add Features**: Build on the IAM foundation
3. **Deploy**: Follow deployment guide for production
4. **Monitor**: Set up logging and monitoring
5. **Scale**: Configure load balancing and caching

## Support

For issues or questions:
- Check API docs: `http://localhost:8000/docs`
- Review logs in backend console
- Check browser console for frontend errors
