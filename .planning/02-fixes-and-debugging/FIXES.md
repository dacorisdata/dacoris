# DACORIS Bug Fixes

## Institution Settings - Primary Domain & Auto-Approve Not Saving

### Issue
On the institution settings page (http://localhost/institution-admin/settings):
1. The primary domain field was not being saved when clicking "Save Changes"
2. The auto-approve toggle was not being saved

### Root Cause
1. The backend API endpoint `/api/institution-admin/settings` (PUT) was missing the `name` and `domain` fields in the `InstitutionSettings` Pydantic model and the update logic
2. The `auto_approve` column didn't exist in the database `institutions` table

### Files Changed
- `backend/models.py` - Added `auto_approve` column to Institution model
- `backend/routes/institution_admin.py` - Added missing fields to settings model and update logic
- `backend/add_auto_approve.py` - Migration script to add the column

### Changes Made

1. **Added auto_approve column to Institution model** (models.py line 67):
```python
class Institution(Base):
    # ...
    verified_domains = Column(Text, nullable=True)
    auto_approve = Column(Boolean, default=False, nullable=False)  # ← Added
    orcid_client_id = Column(String, nullable=True)
```

2. **Added missing fields to InstitutionSettings model** (institution_admin.py lines 38-45):
```python
class InstitutionSettings(BaseModel):
    name: Optional[str] = None           # ← Added
    domain: Optional[str] = None         # ← Added
    verified_domains: Optional[str] = None
    auto_approve: Optional[bool] = None  # ← Added
    orcid_client_id: Optional[str] = None
    orcid_client_secret: Optional[str] = None
    orcid_redirect_uri: Optional[str] = None
```

3. **Added update logic for all fields** (institution_admin.py lines 433-446):
```python
# Update settings
if settings.name is not None:
    institution.name = settings.name
if settings.domain is not None:
    institution.domain = settings.domain
if settings.verified_domains is not None:
    institution.verified_domains = settings.verified_domains
if settings.auto_approve is not None:
    institution.auto_approve = settings.auto_approve  # ← Added
# ... rest of updates
```

4. **Added auto_approve to GET response** (institution_admin.py line 402):
```python
return {
    # ...
    "auto_approve": institution.auto_approve,  # ← Added
    # ...
}
```

5. **Created and ran database migration**:
```bash
docker exec dacoris-backend python add_auto_approve.py
# ✅ Successfully added 'auto_approve' column to institutions table
```

### Testing
1. Navigate to http://localhost/institution-admin/settings
2. Update the "Primary Domain" field
3. Toggle the "Auto-approve users with verified domains" switch
4. Click "Save Changes"
5. Refresh the page - both settings should persist

### Status
✅ **Fixed** - Backend rebuilt, database migrated, and deployed

### Registration Flow Integration

The auto-approve setting now controls user registration across all flows:

**Registration Endpoints Updated:**
1. ✅ `/api/registration/complete` - Standard registration
2. ✅ `/api/registration/admin-staff` - Admin staff registration  
3. ✅ `/api/auth/orcid/callback` - ORCID login/registration

**How It Works:**
- When `auto_approve = ON` and user email matches verified domains → User status = `ACTIVE`
- When `auto_approve = OFF` or email doesn't match → User status = `PENDING` (requires admin approval)

**Example:**
```
Institution Settings:
- Primary Domain: university.edu
- Verified Domains: university.edu, research.university.edu
- Auto-approve: ON

Registration Results:
- john@university.edu → ✅ ACTIVE (auto-approved)
- jane@research.university.edu → ✅ ACTIVE (auto-approved)
- bob@gmail.com → ⏳ PENDING (requires approval)
```

---

## Other Known Issues

### Categories and Opportunities Seeding
✅ **Resolved** - Created `seed_complete.py` script that:
- Seeds 20 categories from Excel
- Seeds 20 opportunities from Excel
- Links opportunities to their categories

Run with: `docker exec dacoris-backend python seed_complete.py`

### Docker Build Network Timeout
⚠️ **Known Issue** - TLS handshake timeout when pulling Docker images
- **Cause**: Network connectivity issues
- **Solution**: See `TROUBLESHOOTING.md` for fixes
- **Workaround**: Pull images manually first

---

## Future Improvements

### Institution Settings Page
- [ ] Add validation for domain format
- [ ] Add confirmation dialog for domain changes
- [ ] Show warning if domain is changed (affects user logins)
- [ ] Add ORCID configuration section
- [ ] Add institution logo upload

### General
- [ ] Add automated tests for institution settings
- [ ] Add audit log for settings changes
- [ ] Add email notification when settings are updated
