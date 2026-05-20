# Fix Email Verification URL

## Problem
Email verification links are showing `http://localhost/verify-email?...` instead of `http://rims.dacoris.com/verify-email?...`

## Root Cause
The `FRONTEND_URL` environment variable in `.env.production` needs to be updated to use the correct production domain.

## Solution

### Step 1: Update `.env.production`

Edit your `.env.production` file and change:

```bash
# FROM:
FRONTEND_URL=http://localhost

# TO:
FRONTEND_URL=https://rims.dacoris.com
```

**Note:** Use `https://` (not `http://`) for production to ensure secure links.

### Step 2: Restart the Backend Service

After updating the environment variable, restart the backend container to apply changes:

```bash
# Using docker-compose
docker compose -f docker-compose.prod.yml --env-file .env.production restart backend

# Or rebuild and restart all services
docker compose -f docker-compose.prod.yml --env-file .env.production down
docker compose -f docker-compose.prod.yml --env-file .env.production up -d
```

### Step 3: Test

1. Register a new account
2. Check the verification email
3. The link should now be: `https://rims.dacoris.com/verify-email?email=...&code=...`

## How It Works

The email verification URL is generated in:
- **File:** `backend/services/email_service.py`
- **Line 42:** `frontend_url = os.getenv("FRONTEND_URL", "http://localhost")`
- **Line 49:** `verification_link = f"{frontend_url}/verify-email?email={email}&code={verification_code}"`

The backend reads the `FRONTEND_URL` environment variable and uses it to construct the verification link in the email.

## Additional Configuration

Also update the ORCID redirect URI in `.env.production` to match:

```bash
ORCID_REDIRECT_URI=https://rims.dacoris.com/api/auth/orcid/callback
```
