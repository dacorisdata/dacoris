# DACORIS Planning & Documentation

This folder contains organized planning documents, implementation guides, and technical documentation for the DACORIS project.

## 📂 Folder Structure

```
.planning/
├── 01-implementations/          # Feature implementations and new modules
├── 02-fixes-and-debugging/      # Bug fixes and debugging documentation
├── 03-deployment-and-cicd/      # Deployment, CI/CD, and production guides
├── 04-guides-and-quickstarts/   # Quick start guides and tutorials
├── 05-testing-and-validation/   # Testing procedures and validation
├── 06-reviews-and-analysis/     # Code reviews and system analysis
├── 07-docker-and-infrastructure/ # Docker setup and infrastructure
├── FILE_ORGANIZATION_GUIDE.md   # Detailed organization guide
├── organize-files.ps1           # Automation script
└── README.md                    # This file
```

---

## 📁 Folder Descriptions

### 01-implementations/
**Purpose:** Feature implementations and new module development

**Contains:**
- Admin dashboard implementation
- Collaborator invitation system
- Commenting system
- Interactive notifications
- Paging system
- Researcher directory integration
- Projects page updates
- Mentions feature
- Editor improvements
- Sidebar refactoring

**Use when:** Documenting new features, module implementations, or major enhancements

---

### 02-fixes-and-debugging/
**Purpose:** Bug fixes, debugging documentation, and issue resolutions

**Contains:**
- General bug fixes
- Awards page fixes
- Citation system fixes
- Session timeout fixes
- Debugging procedures

**Use when:** Documenting bug fixes, debugging sessions, or issue resolutions

---

### 03-deployment-and-cicd/
**Purpose:** Deployment guides, CI/CD pipelines, and production documentation

**Contains:**
- CI/CD setup and deployment guides
- General deployment documentation
- Deployment structure
- Update procedures
- Linux deployment guide

**Use when:** Setting up deployments, configuring CI/CD, or updating production

---

### 04-guides-and-quickstarts/
**Purpose:** Quick start guides, tutorials, and how-to documentation

**Contains:**
- Quick start guides
- Token refresh guide
- Citation library guide
- Database seeding guide
- Server startup guide
- System overviews

**Use when:** Creating tutorials, onboarding documentation, or quick reference guides

---

### 05-testing-and-validation/
**Purpose:** Testing procedures, validation guides, and test documentation

**Contains:**
- Comment endpoint testing
- Citation API testing
- Paging system tests
- Testing readiness documentation

**Use when:** Documenting test procedures, validation steps, or QA processes

---

### 06-reviews-and-analysis/
**Purpose:** Code reviews, system analysis, and comprehensive documentation

**Contains:**
- Comprehensive application review
- Architecture analysis
- Gap analysis
- Performance reviews

**Use when:** Conducting code reviews, system audits, or architectural analysis

---

### 07-docker-and-infrastructure/
**Purpose:** Docker setup, infrastructure configuration, and containerization

**Contains:**
- Docker setup guides
- Docker migration documentation
- Docker update procedures
- Infrastructure configuration

**Use when:** Setting up Docker, managing containers, or configuring infrastructure

---

## 🚀 Quick Start

### Organizing Files

To organize all planning files automatically:

```powershell
cd c:\projects\dacoris\.planning
.\organize-files.ps1
```

This will move all planning markdown files from the project root into their appropriate folders.

### Finding Documentation

1. **Looking for feature implementation docs?** → Check `01-implementations/`
2. **Need to fix a bug?** → Check `02-fixes-and-debugging/`
3. **Deploying to production?** → Check `03-deployment-and-cicd/`
4. **Getting started?** → Check `04-guides-and-quickstarts/`
5. **Running tests?** → Check `05-testing-and-validation/`
6. **Reviewing code?** → Check `06-reviews-and-analysis/`
7. **Setting up Docker?** → Check `07-docker-and-infrastructure/`

---

## 📝 Adding New Documentation

When creating new documentation:

1. **Determine the category** - Which folder best fits your document?
2. **Use descriptive naming** - Use UPPERCASE_WITH_UNDERSCORES.md
3. **Include metadata** - Add creation date and last updated date
4. **Update this README** - If adding a new category or significant document

### Naming Conventions

- **Implementations:** `[FEATURE_NAME]_IMPLEMENTATION.md`
- **Fixes:** `[ISSUE_NAME]_FIX.md`
- **Guides:** `[TOPIC]_GUIDE.md` or `QUICK_START_[TOPIC].md`
- **Testing:** `TEST_[FEATURE].md` or `[FEATURE]_TESTING.md`
- **Reviews:** `[SCOPE]_REVIEW.md` or `[SCOPE]_ANALYSIS.md`

---

## 📊 Statistics

**Total Organized Files:** 43 markdown files

**Breakdown:**
- 📁 01-implementations: 12 files
- 📁 02-fixes-and-debugging: 8 files
- 📁 03-deployment-and-cicd: 8 files
- 📁 04-guides-and-quickstarts: 7 files
- 📁 05-testing-and-validation: 4 files
- 📁 06-reviews-and-analysis: 1 file
- 📁 07-docker-and-infrastructure: 3 files

---

## 🔍 Search Tips

### Find files by keyword:
```powershell
# Search all planning files for a keyword
Get-ChildItem -Path .planning -Recurse -Filter "*.md" | Select-String -Pattern "keyword"
```

### List all files in a category:
```powershell
# List all implementation docs
Get-ChildItem -Path .planning\01-implementations -Filter "*.md"
```

### Find recently modified files:
```powershell
# Find files modified in last 7 days
Get-ChildItem -Path .planning -Recurse -Filter "*.md" | Where-Object {$_.LastWriteTime -gt (Get-Date).AddDays(-7)}
```

---

## 🛠️ Maintenance

### Regular Tasks

- **Monthly:** Review and archive outdated documentation
- **Quarterly:** Update organization structure if needed
- **Yearly:** Archive old planning documents to `archive/` folder

### Archive Policy

Documents older than 1 year that are no longer relevant should be moved to:
```
.planning/archive/[YEAR]/[CATEGORY]/
```

---

## 📚 Related Documentation

- **Project Root:** `c:\projects\dacoris\README.md`
- **Concept Document:** `c:\projects\dacoris\documentation\DACORIS-Concept-Document.md`
- **Backend Docs:** `c:\projects\dacoris\backend\CLI_GUIDE.md`
- **Frontend Docs:** `c:\projects\dacoris\frontend\README.md`

---

## 🤝 Contributing

When adding new planning documents:

1. Create the document in the appropriate folder
2. Follow naming conventions
3. Include proper metadata (dates, version, status)
4. Update this README if necessary
5. Run `organize-files.ps1` to ensure proper organization

---

## 📞 Support

For questions about documentation organization:
- Review `FILE_ORGANIZATION_GUIDE.md` for detailed categorization
- Check existing files in each folder for examples
- Contact the project maintainer

---

**Last Updated:** May 30, 2026  
**Maintained By:** DACORIS Development Team  
**Version:** 1.0
