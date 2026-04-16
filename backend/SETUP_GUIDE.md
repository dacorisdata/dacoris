# DACORIS Backend Setup Guide (Prototype)

This guide walks you through setting up the database and creating the global admin account for the DACORIS prototype.

## Prerequisites

- PostgreSQL installed and running
- Python virtual environment activated (`venv\Scripts\activate`)
- Dependencies installed (`pip install -r requirements.txt`)
- `.env` file configured with your database credentials

## Setup Steps

### 1. Create the Database

Run the database creation script:

```powershell
python create_db.py
```

This will create the `dacoris` database if it doesn't exist.

### 2. Run Database Migrations

Apply the Alembic migrations to create all tables:

```powershell
alembic upgrade head
```

This creates all the necessary tables (users, institutions, grants, proposals, awards, research projects, ethics applications, capture forms, etc.)

### 3. Seed Demo Data (Optional but Recommended for Prototype)

Populate the database with demo institution, users, and sample data:

```powershell
python seed.py
```

This creates:
- **Institution**: Ascension Dynamics
- **Demo Users** (password: `Demo@12345` for all):
  - `pi@ascensiondynamics.com` - Principal Investigator
  - `grant@ascensiondynamics.com` - Grant Officer
  - `finance@ascensiondynamics.com` - Finance Officer
  - `reviewer@ascensiondynamics.com` - External Reviewer
  - `ethics@ascensiondynamics.com` - Ethics Chair
  - `data@ascensiondynamics.com` - Data Steward
- **Sample Data**:
  - Grant opportunity: Digital Health Innovation Grant 2026
  - Draft proposal: Mobile-Based Maternal Health Monitoring System
  - Funded award: AWD-2026-DEMO01 (KES 3,500,000)
  - Active research project with ethics application
  - KoBoToolbox capture form

### 4. Create Global Admin Account

Create your global admin account using the management CLI:

```powershell
python manage.py create-global-admin
```

You'll be prompted for:
- Email address
- Password (hidden input, with confirmation)
- Name

Example:
```
Email: admin@dacoris.org
Password: ********
Repeat for confirmation: ********
Name: System Administrator
✓ Global admin created successfully!
```

## Management Commands

The `manage.py` CLI provides several useful commands:

### List all admin accounts
```powershell
python manage.py list-admins
```

### Reset an admin password
```powershell
python manage.py reset-admin-password
```

### Create a new institution
```powershell
python manage.py create-institution
```

### List all institutions
```powershell
python manage.py list-institutions
```

### Initialize database (alternative to Alembic)
```powershell
python manage.py init-database
```

## Starting the Server

After setup is complete, start the FastAPI server:

```powershell
python main.py
```

Or with uvicorn:
```powershell
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

The API will be available at:
- **API**: http://localhost:8000
- **API Docs**: http://localhost:8000/docs
- **ReDoc**: http://localhost:8000/redoc

## Verification

1. Visit http://localhost:8000/docs
2. Try the `/api/auth/login` endpoint with your global admin credentials
3. Check that you receive a valid JWT token

## Troubleshooting

### Database connection errors
- Verify PostgreSQL is running
- Check DATABASE_URL in `.env` file
- Ensure password special characters are URL-encoded (e.g., `@` → `%40`)

### Migration errors
- Ensure database exists before running migrations
- Check that all dependencies are installed
- Verify Alembic configuration in `alembic.ini`

### Seed script errors
- Run migrations first (`alembic upgrade head`)
- Check that the database is empty or run seed script only once
- Existing data will be skipped with warnings

## Next Steps

1. Start the frontend (`cd ../frontend && npm run dev`)
2. Access the application at http://localhost:3000
3. Log in with your global admin account or demo users
4. Explore the prototype features!
