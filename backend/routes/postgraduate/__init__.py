from fastapi import APIRouter

from routes.postgraduate.students import router as students_router
from routes.postgraduate.supervisor import router as supervisor_router
from routes.postgraduate.progress import router as progress_router
from routes.postgraduate.interventions import router as interventions_router
from routes.postgraduate.proposals import router as proposals_router
from routes.postgraduate.dashboards import router as dashboards_router
from routes.postgraduate.graduation import router as graduation_router
from routes.postgraduate.admin import router as admin_router
from routes.postgraduate.audit import router as audit_router
from routes.postgraduate.student_workspace import router as student_workspace_router

router = APIRouter()
router.include_router(students_router)
router.include_router(supervisor_router)
router.include_router(progress_router)
router.include_router(interventions_router)
router.include_router(proposals_router)
router.include_router(dashboards_router)
router.include_router(graduation_router)
router.include_router(admin_router)
router.include_router(audit_router)
router.include_router(student_workspace_router)
