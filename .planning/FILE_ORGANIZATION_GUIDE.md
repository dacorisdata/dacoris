# DACORIS Planning Files Organization Guide

## Folder Structure Created

```
.planning/
├── 01-implementations/          # Feature implementations and new modules
├── 02-fixes-and-debugging/      # Bug fixes and debugging documentation
├── 03-deployment-and-cicd/      # Deployment, CI/CD, and production guides
├── 04-guides-and-quickstarts/   # Quick start guides and tutorials
├── 05-testing-and-validation/   # Testing procedures and validation
├── 06-reviews-and-analysis/     # Code reviews and system analysis
└── 07-docker-and-infrastructure/ # Docker setup and infrastructure
```

---

## 📁 01-implementations/

**Purpose:** Documentation for feature implementations and new module development

### Files to Move:
- `ADMIN_STAFF_DASHBOARD_IMPLEMENTATION.md` - Admin dashboard feature
- `COLLABORATOR_INVITATION_IMPLEMENTATION.md` - Invitation system
- `COMMENTING_SYSTEM_IMPLEMENTATION.md` - Commenting feature
- `INTERACTIVE_NOTIFICATIONS_IMPLEMENTATION.md` - Notifications system
- `INTERACTIVE_NOTIFICATIONS_COMPLETE.md` - Notifications completion
- `PAGING_SYSTEM_IMPLEMENTATION.md` - Pagination implementation
- `RESEARCHER_DIRECTORY_DATABASE_INTEGRATION.md` - Directory integration
- `PROJECTS_PAGE_UPDATE.md` - Projects page updates
- `PROJECT_SETUP_FIELDS.md` - Project setup configuration
- `MENTIONS_FEATURE_SUMMARY.md` - Mentions feature
- `EDITOR_IMPROVEMENTS_SUMMARY.md` - Editor enhancements
- `SIDEBAR_REFACTORING_SUMMARY.md` - Sidebar refactoring

### Move Command:
```powershell
Move-Item -Path "ADMIN_STAFF_DASHBOARD_IMPLEMENTATION.md" -Destination ".planning\01-implementations\"
Move-Item -Path "COLLABORATOR_INVITATION_IMPLEMENTATION.md" -Destination ".planning\01-implementations\"
Move-Item -Path "COMMENTING_SYSTEM_IMPLEMENTATION.md" -Destination ".planning\01-implementations\"
Move-Item -Path "INTERACTIVE_NOTIFICATIONS_IMPLEMENTATION.md" -Destination ".planning\01-implementations\"
Move-Item -Path "INTERACTIVE_NOTIFICATIONS_COMPLETE.md" -Destination ".planning\01-implementations\"
Move-Item -Path "PAGING_SYSTEM_IMPLEMENTATION.md" -Destination ".planning\01-implementations\"
Move-Item -Path "RESEARCHER_DIRECTORY_DATABASE_INTEGRATION.md" -Destination ".planning\01-implementations\"
Move-Item -Path "PROJECTS_PAGE_UPDATE.md" -Destination ".planning\01-implementations\"
Move-Item -Path "PROJECT_SETUP_FIELDS.md" -Destination ".planning\01-implementations\"
Move-Item -Path "MENTIONS_FEATURE_SUMMARY.md" -Destination ".planning\01-implementations\"
Move-Item -Path "EDITOR_IMPROVEMENTS_SUMMARY.md" -Destination ".planning\01-implementations\"
Move-Item -Path "SIDEBAR_REFACTORING_SUMMARY.md" -Destination ".planning\01-implementations\"
```

---

## 📁 02-fixes-and-debugging/

**Purpose:** Bug fixes, debugging documentation, and issue resolutions

### Files to Move:
- `FIXES.md` - General bug fixes
- `AWARDS_PAGE_FIX.md` - Awards page fix
- `AWARD_ISSUE_FIX.md` - Award issue resolution
- `CITATION_FIXES_APPLIED.md` - Citation fixes
- `CITATION_FIX_FINAL.md` - Final citation fix
- `CITATION_INSERTION_FIX.md` - Citation insertion fix
- `CITATION_SIDEBAR_DEBUG.md` - Citation sidebar debugging
- `SESSION_TIMEOUT_FIX.md` - Session timeout fix

### Move Command:
```powershell
Move-Item -Path "FIXES.md" -Destination ".planning\02-fixes-and-debugging\"
Move-Item -Path "AWARDS_PAGE_FIX.md" -Destination ".planning\02-fixes-and-debugging\"
Move-Item -Path "AWARD_ISSUE_FIX.md" -Destination ".planning\02-fixes-and-debugging\"
Move-Item -Path "CITATION_FIXES_APPLIED.md" -Destination ".planning\02-fixes-and-debugging\"
Move-Item -Path "CITATION_FIX_FINAL.md" -Destination ".planning\02-fixes-and-debugging\"
Move-Item -Path "CITATION_INSERTION_FIX.md" -Destination ".planning\02-fixes-and-debugging\"
Move-Item -Path "CITATION_SIDEBAR_DEBUG.md" -Destination ".planning\02-fixes-and-debugging\"
Move-Item -Path "SESSION_TIMEOUT_FIX.md" -Destination ".planning\02-fixes-and-debugging\"
```

---

## 📁 03-deployment-and-cicd/

**Purpose:** Deployment guides, CI/CD pipelines, and production documentation

### Files to Move:
- `CICD_SETUP_GUIDE.md` - CI/CD setup
- `CICD_DEPLOYMENT_GUIDE.md` - Deployment guide
- `DEPLOYMENT.md` - General deployment
- `DEPLOYMENT_STRUCTURE.md` - Deployment structure
- `DEPLOYMENT_UPDATE_GUIDE.md` - Update guide
- `PAGING_SYSTEM_DEPLOYMENT.md` - Paging deployment
- `LINUX_DEPLOYMENT_GUIDE.md` - Linux deployment
- `README_CICD.md` - CI/CD readme

### Move Command:
```powershell
Move-Item -Path "CICD_SETUP_GUIDE.md" -Destination ".planning\03-deployment-and-cicd\"
Move-Item -Path "CICD_DEPLOYMENT_GUIDE.md" -Destination ".planning\03-deployment-and-cicd\"
Move-Item -Path "DEPLOYMENT.md" -Destination ".planning\03-deployment-and-cicd\"
Move-Item -Path "DEPLOYMENT_STRUCTURE.md" -Destination ".planning\03-deployment-and-cicd\"
Move-Item -Path "DEPLOYMENT_UPDATE_GUIDE.md" -Destination ".planning\03-deployment-and-cicd\"
Move-Item -Path "PAGING_SYSTEM_DEPLOYMENT.md" -Destination ".planning\03-deployment-and-cicd\"
Move-Item -Path "LINUX_DEPLOYMENT_GUIDE.md" -Destination ".planning\03-deployment-and-cicd\"
Move-Item -Path "README_CICD.md" -Destination ".planning\03-deployment-and-cicd\"
```

---

## 📁 04-guides-and-quickstarts/

**Purpose:** Quick start guides, tutorials, and how-to documentation

### Files to Move:
- `QUICK_START.md` - General quick start
- `QUICK_START_TOKEN_REFRESH.md` - Token refresh guide
- `CITATION_LIBRARY_QUICK_START.md` - Citation library guide
- `SEEDING_GUIDE.md` - Database seeding
- `START_SERVERS.md` - Server startup guide
- `CITATION_SYSTEM.md` - Citation system overview
- `CITATION_IMPLEMENTATION_SUMMARY.md` - Citation implementation

### Move Command:
```powershell
Move-Item -Path "QUICK_START.md" -Destination ".planning\04-guides-and-quickstarts\"
Move-Item -Path "QUICK_START_TOKEN_REFRESH.md" -Destination ".planning\04-guides-and-quickstarts\"
Move-Item -Path "CITATION_LIBRARY_QUICK_START.md" -Destination ".planning\04-guides-and-quickstarts\"
Move-Item -Path "SEEDING_GUIDE.md" -Destination ".planning\04-guides-and-quickstarts\"
Move-Item -Path "START_SERVERS.md" -Destination ".planning\04-guides-and-quickstarts\"
Move-Item -Path "CITATION_SYSTEM.md" -Destination ".planning\04-guides-and-quickstarts\"
Move-Item -Path "CITATION_IMPLEMENTATION_SUMMARY.md" -Destination ".planning\04-guides-and-quickstarts\"
```

---

## 📁 05-testing-and-validation/

**Purpose:** Testing procedures, validation guides, and test documentation

### Files to Move:
- `test_comment_endpoints.md` - Comment endpoint testing
- `TEST_CITATION_API.md` - Citation API testing
- `PAGING_SYSTEM_TESTING.md` - Paging system tests
- `CITATION_READY_TO_TEST.md` - Citation testing readiness

### Move Command:
```powershell
Move-Item -Path "test_comment_endpoints.md" -Destination ".planning\05-testing-and-validation\"
Move-Item -Path "TEST_CITATION_API.md" -Destination ".planning\05-testing-and-validation\"
Move-Item -Path "PAGING_SYSTEM_TESTING.md" -Destination ".planning\05-testing-and-validation\"
Move-Item -Path "CITATION_READY_TO_TEST.md" -Destination ".planning\05-testing-and-validation\"
```

---

## 📁 06-reviews-and-analysis/

**Purpose:** Code reviews, system analysis, and comprehensive documentation

### Files to Move:
- `COMPREHENSIVE_APP_REVIEW.md` - Full application review

### Move Command:
```powershell
Move-Item -Path "COMPREHENSIVE_APP_REVIEW.md" -Destination ".planning\06-reviews-and-analysis\"
```

---

## 📁 07-docker-and-infrastructure/

**Purpose:** Docker setup, infrastructure configuration, and containerization

### Files to Move:
- `DOCKER_SETUP.md` - Docker setup guide
- `DOCKER_MIGRATION_COMPLETE.md` - Docker migration
- `DOCKER_UPDATE_PRESERVE_DB.md` - Docker update procedures

### Move Command:
```powershell
Move-Item -Path "DOCKER_SETUP.md" -Destination ".planning\07-docker-and-infrastructure\"
Move-Item -Path "DOCKER_MIGRATION_COMPLETE.md" -Destination ".planning\07-docker-and-infrastructure\"
Move-Item -Path "DOCKER_UPDATE_PRESERVE_DB.md" -Destination ".planning\07-docker-and-infrastructure\"
```

---

## Files to Keep in Root

These files should remain in the project root as they are essential project documentation:

- ✅ `README.md` - Main project readme (KEEP IN ROOT)
- ✅ `documentation/DACORIS-Concept-Document.md` - Already in documentation folder
- ✅ `docs/remote-db-ssh-tunnel.md` - Already in docs folder
- ✅ `backend/CLI_GUIDE.md` - Already in backend folder
- ✅ `frontend/README.md` - Already in frontend folder
- ✅ `frontend/README_THEME.md` - Already in frontend folder
- ✅ `backend/scripts/README_SEED.md` - Already in backend/scripts folder

---

## Quick Move All Script

Run this PowerShell script to move all files at once:

```powershell
# Navigate to project root
cd c:\projects\dacoris

# 01-implementations
Move-Item -Path "ADMIN_STAFF_DASHBOARD_IMPLEMENTATION.md" -Destination ".planning\01-implementations\"
Move-Item -Path "COLLABORATOR_INVITATION_IMPLEMENTATION.md" -Destination ".planning\01-implementations\"
Move-Item -Path "COMMENTING_SYSTEM_IMPLEMENTATION.md" -Destination ".planning\01-implementations\"
Move-Item -Path "INTERACTIVE_NOTIFICATIONS_IMPLEMENTATION.md" -Destination ".planning\01-implementations\"
Move-Item -Path "INTERACTIVE_NOTIFICATIONS_COMPLETE.md" -Destination ".planning\01-implementations\"
Move-Item -Path "PAGING_SYSTEM_IMPLEMENTATION.md" -Destination ".planning\01-implementations\"
Move-Item -Path "RESEARCHER_DIRECTORY_DATABASE_INTEGRATION.md" -Destination ".planning\01-implementations\"
Move-Item -Path "PROJECTS_PAGE_UPDATE.md" -Destination ".planning\01-implementations\"
Move-Item -Path "PROJECT_SETUP_FIELDS.md" -Destination ".planning\01-implementations\"
Move-Item -Path "MENTIONS_FEATURE_SUMMARY.md" -Destination ".planning\01-implementations\"
Move-Item -Path "EDITOR_IMPROVEMENTS_SUMMARY.md" -Destination ".planning\01-implementations\"
Move-Item -Path "SIDEBAR_REFACTORING_SUMMARY.md" -Destination ".planning\01-implementations\"

# 02-fixes-and-debugging
Move-Item -Path "FIXES.md" -Destination ".planning\02-fixes-and-debugging\"
Move-Item -Path "AWARDS_PAGE_FIX.md" -Destination ".planning\02-fixes-and-debugging\"
Move-Item -Path "AWARD_ISSUE_FIX.md" -Destination ".planning\02-fixes-and-debugging\"
Move-Item -Path "CITATION_FIXES_APPLIED.md" -Destination ".planning\02-fixes-and-debugging\"
Move-Item -Path "CITATION_FIX_FINAL.md" -Destination ".planning\02-fixes-and-debugging\"
Move-Item -Path "CITATION_INSERTION_FIX.md" -Destination ".planning\02-fixes-and-debugging\"
Move-Item -Path "CITATION_SIDEBAR_DEBUG.md" -Destination ".planning\02-fixes-and-debugging\"
Move-Item -Path "SESSION_TIMEOUT_FIX.md" -Destination ".planning\02-fixes-and-debugging\"

# 03-deployment-and-cicd
Move-Item -Path "CICD_SETUP_GUIDE.md" -Destination ".planning\03-deployment-and-cicd\"
Move-Item -Path "CICD_DEPLOYMENT_GUIDE.md" -Destination ".planning\03-deployment-and-cicd\"
Move-Item -Path "DEPLOYMENT.md" -Destination ".planning\03-deployment-and-cicd\"
Move-Item -Path "DEPLOYMENT_STRUCTURE.md" -Destination ".planning\03-deployment-and-cicd\"
Move-Item -Path "DEPLOYMENT_UPDATE_GUIDE.md" -Destination ".planning\03-deployment-and-cicd\"
Move-Item -Path "PAGING_SYSTEM_DEPLOYMENT.md" -Destination ".planning\03-deployment-and-cicd\"
Move-Item -Path "LINUX_DEPLOYMENT_GUIDE.md" -Destination ".planning\03-deployment-and-cicd\"
Move-Item -Path "README_CICD.md" -Destination ".planning\03-deployment-and-cicd\"

# 04-guides-and-quickstarts
Move-Item -Path "QUICK_START.md" -Destination ".planning\04-guides-and-quickstarts\"
Move-Item -Path "QUICK_START_TOKEN_REFRESH.md" -Destination ".planning\04-guides-and-quickstarts\"
Move-Item -Path "CITATION_LIBRARY_QUICK_START.md" -Destination ".planning\04-guides-and-quickstarts\"
Move-Item -Path "SEEDING_GUIDE.md" -Destination ".planning\04-guides-and-quickstarts\"
Move-Item -Path "START_SERVERS.md" -Destination ".planning\04-guides-and-quickstarts\"
Move-Item -Path "CITATION_SYSTEM.md" -Destination ".planning\04-guides-and-quickstarts\"
Move-Item -Path "CITATION_IMPLEMENTATION_SUMMARY.md" -Destination ".planning\04-guides-and-quickstarts\"

# 05-testing-and-validation
Move-Item -Path "test_comment_endpoints.md" -Destination ".planning\05-testing-and-validation\"
Move-Item -Path "TEST_CITATION_API.md" -Destination ".planning\05-testing-and-validation\"
Move-Item -Path "PAGING_SYSTEM_TESTING.md" -Destination ".planning\05-testing-and-validation\"
Move-Item -Path "CITATION_READY_TO_TEST.md" -Destination ".planning\05-testing-and-validation\"

# 06-reviews-and-analysis
Move-Item -Path "COMPREHENSIVE_APP_REVIEW.md" -Destination ".planning\06-reviews-and-analysis\"

# 07-docker-and-infrastructure
Move-Item -Path "DOCKER_SETUP.md" -Destination ".planning\07-docker-and-infrastructure\"
Move-Item -Path "DOCKER_MIGRATION_COMPLETE.md" -Destination ".planning\07-docker-and-infrastructure\"
Move-Item -Path "DOCKER_UPDATE_PRESERVE_DB.md" -Destination ".planning\07-docker-and-infrastructure\"

Write-Host "✅ All files organized successfully!" -ForegroundColor Green
```

---

## Summary

**Total Files Organized:** 46 markdown files

**Breakdown by Category:**
- 📁 01-implementations: 12 files
- 📁 02-fixes-and-debugging: 8 files
- 📁 03-deployment-and-cicd: 8 files
- 📁 04-guides-and-quickstarts: 7 files
- 📁 05-testing-and-validation: 4 files
- 📁 06-reviews-and-analysis: 1 file
- 📁 07-docker-and-infrastructure: 3 files
- ✅ Files kept in original locations: 7 files

**Benefits:**
- ✅ Clear categorization by purpose
- ✅ Easy to find specific documentation
- ✅ Numbered folders for logical ordering
- ✅ Scalable structure for future additions
- ✅ Maintains important files in their proper locations

---

**Created:** May 30, 2026  
**Last Updated:** May 30, 2026
