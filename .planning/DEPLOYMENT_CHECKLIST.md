# DACORIS IAM Deployment Checklist

Use this checklist to ensure proper deployment of the DACORIS IAM system.

## Pre-Deployment

### Backend Setup
- [ ] PostgreSQL 12+ installed and running
- [ ] Python 3.10+ installed
- [ ] Virtual environment created
- [ ] Dependencies installed: `pip install -r requirements.txt`
- [ ] `.env` file created from `.env.example`
- [ ] Database created: `createdb dacoris`
- [ ] Database tables initialized: `python manage.py init-database`

### Frontend Setup
- [ ] Node.js 18+ installed
- [ ] Dependencies installed: `npm install`
- [ ] `.env.local` created with `NEXT_PUBLIC_API_URL`

### ORCID Configuration
- [ ] ORCID application registered (sandbox for dev, production for prod)
- [ ] ORCID Client ID obtained
- [ ] ORCID Client Secret obtained
- [ ] Redirect URI configured in ORCID app settings
- [ ] ORCID credentials added to `.env`

### Security Configuration
- [ ] JWT_SECRET_KEY generated (use: `openssl rand -hex 32`)
- [ ] Strong database password set
- [ ] `.env` file added to `.gitignore`
- [ ] No secrets committed to version control

## Initial Setup

### Step 1: Create Global Admin
```bash
cd backend
python manage.py create-global-admin
```
- [ ] Global admin account created
- [ ] Credentials securely stored
- [ ] Login tested via API

### Step 2: Start Services
```bash
# Terminal 1 - Backend
cd backend
python main.py

# Terminal 2 - Frontend
cd frontend
npm run dev
```
- [ ] Backend running on port 8000
- [ ] Frontend running on port 3000
- [ ] No startup errors
- [ ] API docs accessible at http://localhost:8000/docs

### Step 3: Create First Institution
```bash
python manage.py create-institution
```
- [ ] Institution created
- [ ] Institution ID noted
- [ ] Domain configured

### Step 4: Create Institution Admin
Via API (Swagger UI):
- [ ] Login as Global Admin
- [ ] POST to `/api/global-admin/institutions/{id}/admin`
- [ ] Institution admin created
- [ ] Credentials securely shared

### Step 5: Configure Institution ORCID
- [ ] Login as Institution Admin
- [ ] Update settings with institution's ORCID credentials
- [ ] Add verified domains for auto-approval

## Testing

### Authentication Tests
- [ ] Global admin can login with email/password
- [ ] Institution admin can login with email/password
- [ ] ORCID login redirects to ORCID
- [ ] ORCID callback returns token
- [ ] Token stored in localStorage
- [ ] Invalid credentials rejected

### Onboarding Tests
- [ ] New ORCID user redirected to onboarding
- [ ] Institution list displays correctly
- [ ] Institution selection works
- [ ] Auto-approval works for verified domains
- [ ] Pending status set for unverified domains
- [ ] Approved users can access dashboard
- [ ] Pending users see pending message

### Admin Portal Tests

**Global Admin**:
- [ ] Can view all institutions
- [ ] Can create new institutions
- [ ] Can update institution details
- [ ] Can toggle institution status
- [ ] Can create institution admins
- [ ] Can view all users across tenants
- [ ] Can view platform analytics
- [ ] Cannot access other institution's data directly

**Institution Admin**:
- [ ] Can view institution users only
- [ ] Can view pending users
- [ ] Can approve/reject users
- [ ] Can assign roles to users
- [ ] Can update institution settings
- [ ] Can view institution analytics
- [ ] Cannot access other institutions' data

### Security Tests
- [ ] Expired tokens rejected (401)
- [ ] Invalid tokens rejected (401)
- [ ] ORCID users cannot login with password
- [ ] Admins cannot use ORCID login
- [ ] Institution admin cannot access global admin endpoints
- [ ] Institution admin cannot access other institutions
- [ ] Suspended users cannot login
- [ ] Pending users have limited access

### ORCID Integration Tests
- [ ] Profile sync fetches name
- [ ] Profile sync fetches affiliations
- [ ] Profile sync fetches works (if available)
- [ ] Email extracted from ORCID
- [ ] Domain verification works
- [ ] Refresh tokens stored
- [ ] Token expiration handled

## Production Deployment

### Environment Configuration
- [ ] `ORCID_SANDBOX_MODE=false`
- [ ] Production ORCID credentials configured
- [ ] Strong `JWT_SECRET_KEY` set
- [ ] `FRONTEND_URL` set to production domain
- [ ] Database SSL enabled
- [ ] HTTPS enforced

### Database
- [ ] Production database created
- [ ] Database backups configured
- [ ] Connection pooling configured
- [ ] Database migrations tested
- [ ] Indexes verified

### Backend Deployment
- [ ] Gunicorn or Uvicorn configured
- [ ] Process manager (systemd/supervisor) configured
- [ ] Reverse proxy (nginx) configured
- [ ] SSL certificates installed
- [ ] CORS configured for production domain
- [ ] Logging configured
- [ ] Error monitoring configured (Sentry, etc.)

### Frontend Deployment
- [ ] Build tested: `npm run build`
- [ ] Environment variables set
- [ ] Static files served correctly
- [ ] API URL points to production backend
- [ ] CDN configured (optional)
- [ ] Error boundaries implemented

### Security Hardening
- [ ] HTTPS only (no HTTP)
- [ ] Security headers configured
- [ ] Rate limiting enabled
- [ ] SQL injection prevention verified
- [ ] XSS prevention verified
- [ ] CSRF protection enabled
- [ ] Secrets in environment variables only
- [ ] Database credentials rotated
- [ ] Admin passwords strong and unique

### Monitoring
- [ ] Application logs configured
- [ ] Error tracking enabled
- [ ] Performance monitoring enabled
- [ ] Uptime monitoring configured
- [ ] Database monitoring enabled
- [ ] Alerts configured for critical errors

## Post-Deployment

### User Onboarding
- [ ] Global admin account secured
- [ ] Institution admins created
- [ ] Institution ORCID credentials configured
- [ ] Verified domains configured
- [ ] First test user onboarded successfully

### Documentation
- [ ] Admin credentials documented (securely)
- [ ] Deployment process documented
- [ ] Troubleshooting guide accessible
- [ ] API documentation shared with developers
- [ ] User guides created

### Backup & Recovery
- [ ] Database backup schedule configured
- [ ] Backup restoration tested
- [ ] Disaster recovery plan documented
- [ ] Rollback procedure tested

### Maintenance
- [ ] Update schedule planned
- [ ] Dependency update process defined
- [ ] Security patch process defined
- [ ] Admin password rotation schedule set

## Verification

### Smoke Tests
- [ ] Homepage loads
- [ ] Login page accessible
- [ ] ORCID login works end-to-end
- [ ] Admin login works
- [ ] Dashboard displays correctly
- [ ] API endpoints respond
- [ ] Database queries execute

### Performance Tests
- [ ] Page load times acceptable (<3s)
- [ ] API response times acceptable (<500ms)
- [ ] Database queries optimized
- [ ] No N+1 query issues
- [ ] Concurrent user load tested

### Accessibility
- [ ] Keyboard navigation works
- [ ] Screen reader compatible
- [ ] Color contrast sufficient
- [ ] Error messages clear
- [ ] Forms properly labeled

## Rollback Plan

If deployment fails:
- [ ] Rollback procedure documented
- [ ] Database backup available
- [ ] Previous version deployable
- [ ] DNS can be reverted
- [ ] Users notified of maintenance

## Sign-Off

- [ ] Technical lead approval
- [ ] Security review completed
- [ ] Performance benchmarks met
- [ ] User acceptance testing passed
- [ ] Documentation complete
- [ ] Backup verified
- [ ] Monitoring active

---

**Deployment Date**: _______________

**Deployed By**: _______________

**Verified By**: _______________

**Notes**:
_______________________________________
_______________________________________
_______________________________________
