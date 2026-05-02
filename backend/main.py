from fastapi import FastAPI, Depends
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from dotenv import load_dotenv
from pydantic import BaseModel, ConfigDict
from contextlib import asynccontextmanager
import os

from database import get_db, init_db, engine
from models import User, AccountType
from routes.auth import router as auth_router
from routes.orcid import router as orcid_router
from routes.registration import router as registration_router
from routes.email_verification import router as email_verification_router
from routes.verify_email import router as verify_email_router
from routes.notifications import router as notifications_router
from routes.admin.pending_users import router as pending_users_router
from routes.global_admin import router as global_admin_router
from routes.institution_admin import router as institution_admin_router
from routes.onboarding import router as onboarding_router
from routes.grants.opportunities import router as opportunities_router
from routes.grants.proposals import router as proposals_router
from routes.grants.reviews import router as reviews_router
from routes.grants.awards import router as awards_router
from routes.research.projects import router as research_projects_router
from routes.research.ethics import router as research_ethics_router
from routes.research.outputs import router as research_outputs_router
from routes.research.data_import import router as research_data_import_router
from routes.admin.data_import import router as admin_data_import_router
from routes.data.forms import router as forms_router
from routes.data.datasets import router as datasets_router
from routes.data.qa import router as qa_router
from routes.public_research import router as public_research_router
from routes.scholarly_works import router as scholarly_works_router
from routes.publications import router as publications_router
from routes.manuscripts import router as manuscripts_router

load_dotenv()

@asynccontextmanager
async def lifespan(app: FastAPI):
    await init_db()
    print("Database connected and initialized")
    yield
    await engine.dispose()
    print("Database disconnected")

app = FastAPI(title="DACORIS API", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://localhost",
        "http://frontend:3000",
        "http://192.168.0.103",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth_router)
app.include_router(orcid_router)
app.include_router(registration_router)
app.include_router(email_verification_router)
app.include_router(verify_email_router)
app.include_router(notifications_router)
app.include_router(pending_users_router)
app.include_router(global_admin_router)
app.include_router(institution_admin_router)
app.include_router(onboarding_router)
app.include_router(opportunities_router)
app.include_router(proposals_router)
app.include_router(reviews_router)
app.include_router(awards_router)
app.include_router(research_projects_router)
app.include_router(research_ethics_router)
app.include_router(research_outputs_router)
app.include_router(research_data_import_router)
app.include_router(admin_data_import_router)
app.include_router(forms_router)
app.include_router(datasets_router)
app.include_router(qa_router)
app.include_router(public_research_router)
app.include_router(scholarly_works_router)
app.include_router(publications_router)
app.include_router(manuscripts_router)

class UserCreate(BaseModel):
    email: str
    name: str | None = None

class UserResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    
    id: int
    email: str
    name: str | None = None

@app.get("/")
async def root():
    return {"message": "Welcome to DACORIS API"}

@app.get("/api/health")
async def health_check():
    return {"status": "healthy", "service": "DACORIS", "database": "connected"}

# User management endpoints moved to admin routes

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
