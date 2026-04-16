# DACORIS CLI Management Guide

This guide covers the command-line interface for managing DACORIS administrators and institutions.

## Prerequisites

1. Ensure you're in the backend directory:
```bash
cd backend
```

2. Activate the virtual environment:
```bash
# Windows
venv\Scripts\activate

# Linux/Mac
source venv/bin/activate
```

## Available Commands

### Initialize Database

Create all database tables:

```bash
python manage.py init-database
```

### Global Admin Management

#### Create Global Admin

Create the first global administrator (run this once during initial setup):

```bash
python manage.py create-global-admin
```

You'll be prompted for:
- Email address
- Password (hidden input)
- Name

Example:
```
Email: admin@dacoris.org
Password: ********
Repeat for confirmation: ********
Name: System Administrator
✓ Global admin created successfully!
```

#### List All Admins

View all admin accounts (Global and Institution admins):

```bash
python manage.py list-admins
```

#### Reset Admin Password

Reset password for any admin account:

```bash
python manage.py reset-admin-password
```

You'll be prompted for:
- Admin email address
- New password

### Institution Management

#### Create Institution

Create a new institution/tenant:

```bash
python manage.py create-institution
```

You'll be prompted for:
- Institution name
- Primary domain (e.g., university.edu)

Example:
```
Name: University of Example
Domain: example.edu
✓ Institution created successfully!
  ID: 1
  Name: University of Example
  Domain: example.edu
```

#### List Institutions

View all institutions:

```bash
python manage.py list-institutions
```

## Initial Setup Workflow

Follow these steps to set up a new DACORIS instance:

### 1. Initialize Database

```bash
python manage.py init-database
```

### 2. Create Global Admin

```bash
python manage.py create-global-admin
```

### 3. Start the Server

```bash
python main.py
```

### 4. Login as Global Admin

Use the Global Admin portal at:
- URL: `http://localhost:8000/docs` (Swagger UI)
- Endpoint: `POST /api/auth/login`
- Credentials: Email and password from step 2

### 5. Create First Institution

Option A - Via CLI:
```bash
python manage.py create-institution
```

Option B - Via API:
- Use Global Admin token
- POST to `/api/global-admin/institutions`

### 6. Create Institution Admin

Via API (requires Global Admin token):
- POST to `/api/global-admin/institutions/{id}/admin`
- Provide email, name, and password

### 7. Configure Institution ORCID Credentials

Via API (Institution Admin or Global Admin):
- PUT to `/api/institution-admin/settings`
- Provide ORCID client ID, secret, and redirect URI

## Environment Variables

Before running commands, ensure your `.env` file is configured:

```env
# Database
DATABASE_URL="postgresql+asyncpg://user:password@localhost:5432/dacoris"

# JWT
JWT_SECRET_KEY=your-secret-key-here
JWT_ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=30
ADMIN_SESSION_EXPIRE_MINUTES=480

# ORCID
ORCID_CLIENT_ID=your_orcid_client_id
ORCID_CLIENT_SECRET=your_orcid_client_secret
ORCID_SANDBOX_MODE=true
```

## Troubleshooting

### Database Connection Error

If you see database connection errors:
1. Verify PostgreSQL is running
2. Check DATABASE_URL in `.env`
3. Ensure database exists: `createdb dacoris`

### Import Errors

If you see module import errors:
1. Ensure virtual environment is activated
2. Install dependencies: `pip install -r requirements.txt`

### Permission Errors

If commands fail with permission errors:
1. Ensure you have write access to the database
2. Check file permissions on the backend directory

## Security Notes

1. **Never commit** `.env` file with real credentials
2. Use strong passwords for admin accounts
3. Change `JWT_SECRET_KEY` in production
4. Use HTTPS in production environments
5. Regularly rotate admin passwords

## API Documentation

Once the server is running, access interactive API docs at:
- Swagger UI: `http://localhost:8000/docs`
- ReDoc: `http://localhost:8000/redoc`
