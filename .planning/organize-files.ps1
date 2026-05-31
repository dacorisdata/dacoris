# DACORIS Planning Files Organization Script
# This script moves all planning markdown files into organized folders

Write-Host "🗂️  DACORIS Planning Files Organization" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Navigate to project root
$projectRoot = "c:\projects\dacoris"
Set-Location $projectRoot

# Counter for tracking
$movedCount = 0
$errorCount = 0

# Function to move file safely
function Move-FileSafely {
    param(
        [string]$FileName,
        [string]$Destination
    )
    
    if (Test-Path $FileName) {
        try {
            Move-Item -Path $FileName -Destination $Destination -Force
            Write-Host "  ✅ Moved: $FileName" -ForegroundColor Green
            $script:movedCount++
        }
        catch {
            Write-Host "  ❌ Error moving $FileName : $_" -ForegroundColor Red
            $script:errorCount++
        }
    }
    else {
        Write-Host "  ⚠️  Not found: $FileName" -ForegroundColor Yellow
    }
}

# 01-implementations
Write-Host "📁 01-implementations (Feature Implementations)" -ForegroundColor Magenta
Move-FileSafely "ADMIN_STAFF_DASHBOARD_IMPLEMENTATION.md" ".planning\01-implementations\"
Move-FileSafely "COLLABORATOR_INVITATION_IMPLEMENTATION.md" ".planning\01-implementations\"
Move-FileSafely "COMMENTING_SYSTEM_IMPLEMENTATION.md" ".planning\01-implementations\"
Move-FileSafely "INTERACTIVE_NOTIFICATIONS_IMPLEMENTATION.md" ".planning\01-implementations\"
Move-FileSafely "INTERACTIVE_NOTIFICATIONS_COMPLETE.md" ".planning\01-implementations\"
Move-FileSafely "PAGING_SYSTEM_IMPLEMENTATION.md" ".planning\01-implementations\"
Move-FileSafely "RESEARCHER_DIRECTORY_DATABASE_INTEGRATION.md" ".planning\01-implementations\"
Move-FileSafely "PROJECTS_PAGE_UPDATE.md" ".planning\01-implementations\"
Move-FileSafely "PROJECT_SETUP_FIELDS.md" ".planning\01-implementations\"
Move-FileSafely "MENTIONS_FEATURE_SUMMARY.md" ".planning\01-implementations\"
Move-FileSafely "EDITOR_IMPROVEMENTS_SUMMARY.md" ".planning\01-implementations\"
Move-FileSafely "SIDEBAR_REFACTORING_SUMMARY.md" ".planning\01-implementations\"
Write-Host ""

# 02-fixes-and-debugging
Write-Host "📁 02-fixes-and-debugging (Bug Fixes)" -ForegroundColor Magenta
Move-FileSafely "FIXES.md" ".planning\02-fixes-and-debugging\"
Move-FileSafely "AWARDS_PAGE_FIX.md" ".planning\02-fixes-and-debugging\"
Move-FileSafely "AWARD_ISSUE_FIX.md" ".planning\02-fixes-and-debugging\"
Move-FileSafely "CITATION_FIXES_APPLIED.md" ".planning\02-fixes-and-debugging\"
Move-FileSafely "CITATION_FIX_FINAL.md" ".planning\02-fixes-and-debugging\"
Move-FileSafely "CITATION_INSERTION_FIX.md" ".planning\02-fixes-and-debugging\"
Move-FileSafely "CITATION_SIDEBAR_DEBUG.md" ".planning\02-fixes-and-debugging\"
Move-FileSafely "SESSION_TIMEOUT_FIX.md" ".planning\02-fixes-and-debugging\"
Write-Host ""

# 03-deployment-and-cicd
Write-Host "📁 03-deployment-and-cicd (Deployment & CI/CD)" -ForegroundColor Magenta
Move-FileSafely "CICD_SETUP_GUIDE.md" ".planning\03-deployment-and-cicd\"
Move-FileSafely "CICD_DEPLOYMENT_GUIDE.md" ".planning\03-deployment-and-cicd\"
Move-FileSafely "DEPLOYMENT.md" ".planning\03-deployment-and-cicd\"
Move-FileSafely "DEPLOYMENT_STRUCTURE.md" ".planning\03-deployment-and-cicd\"
Move-FileSafely "DEPLOYMENT_UPDATE_GUIDE.md" ".planning\03-deployment-and-cicd\"
Move-FileSafely "PAGING_SYSTEM_DEPLOYMENT.md" ".planning\03-deployment-and-cicd\"
Move-FileSafely "LINUX_DEPLOYMENT_GUIDE.md" ".planning\03-deployment-and-cicd\"
Move-FileSafely "README_CICD.md" ".planning\03-deployment-and-cicd\"
Write-Host ""

# 04-guides-and-quickstarts
Write-Host "📁 04-guides-and-quickstarts (Quick Start Guides)" -ForegroundColor Magenta
Move-FileSafely "QUICK_START.md" ".planning\04-guides-and-quickstarts\"
Move-FileSafely "QUICK_START_TOKEN_REFRESH.md" ".planning\04-guides-and-quickstarts\"
Move-FileSafely "CITATION_LIBRARY_QUICK_START.md" ".planning\04-guides-and-quickstarts\"
Move-FileSafely "SEEDING_GUIDE.md" ".planning\04-guides-and-quickstarts\"
Move-FileSafely "START_SERVERS.md" ".planning\04-guides-and-quickstarts\"
Move-FileSafely "CITATION_SYSTEM.md" ".planning\04-guides-and-quickstarts\"
Move-FileSafely "CITATION_IMPLEMENTATION_SUMMARY.md" ".planning\04-guides-and-quickstarts\"
Write-Host ""

# 05-testing-and-validation
Write-Host "📁 05-testing-and-validation (Testing Procedures)" -ForegroundColor Magenta
Move-FileSafely "test_comment_endpoints.md" ".planning\05-testing-and-validation\"
Move-FileSafely "TEST_CITATION_API.md" ".planning\05-testing-and-validation\"
Move-FileSafely "PAGING_SYSTEM_TESTING.md" ".planning\05-testing-and-validation\"
Move-FileSafely "CITATION_READY_TO_TEST.md" ".planning\05-testing-and-validation\"
Write-Host ""

# 06-reviews-and-analysis
Write-Host "📁 06-reviews-and-analysis (Code Reviews & Analysis)" -ForegroundColor Magenta
Move-FileSafely "COMPREHENSIVE_APP_REVIEW.md" ".planning\06-reviews-and-analysis\"
Write-Host ""

# 07-docker-and-infrastructure
Write-Host "📁 07-docker-and-infrastructure (Docker & Infrastructure)" -ForegroundColor Magenta
Move-FileSafely "DOCKER_SETUP.md" ".planning\07-docker-and-infrastructure\"
Move-FileSafely "DOCKER_MIGRATION_COMPLETE.md" ".planning\07-docker-and-infrastructure\"
Move-FileSafely "DOCKER_UPDATE_PRESERVE_DB.md" ".planning\07-docker-and-infrastructure\"
Write-Host ""

# Summary
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "📊 Organization Summary" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "✅ Files moved successfully: $movedCount" -ForegroundColor Green
if ($errorCount -gt 0) {
    Write-Host "❌ Errors encountered: $errorCount" -ForegroundColor Red
}
Write-Host ""
Write-Host "📁 Folder Structure:" -ForegroundColor Yellow
Write-Host "  .planning/" -ForegroundColor White
Write-Host "  ├── 01-implementations/          (12 files)" -ForegroundColor White
Write-Host "  ├── 02-fixes-and-debugging/      (8 files)" -ForegroundColor White
Write-Host "  ├── 03-deployment-and-cicd/      (8 files)" -ForegroundColor White
Write-Host "  ├── 04-guides-and-quickstarts/   (7 files)" -ForegroundColor White
Write-Host "  ├── 05-testing-and-validation/   (4 files)" -ForegroundColor White
Write-Host "  ├── 06-reviews-and-analysis/     (1 file)" -ForegroundColor White
Write-Host "  └── 07-docker-and-infrastructure/ (3 files)" -ForegroundColor White
Write-Host ""
Write-Host "✨ Organization complete! See FILE_ORGANIZATION_GUIDE.md for details." -ForegroundColor Green
Write-Host ""
