"""
Migration: Add Training & Capacity Building tables (Module 10)
Run: python migrations/add_training_tables.py
"""
import asyncio
import sys
import os

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from database import engine
from models import Base, TrainingProgram, TrainingEnrollment, TrainingCertificate, UserSkill, TrainingNeedsAssessment, CPDRecord


async def migrate():
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all, tables=[
            TrainingProgram.__table__,
            TrainingEnrollment.__table__,
            TrainingCertificate.__table__,
            UserSkill.__table__,
            TrainingNeedsAssessment.__table__,
            CPDRecord.__table__,
        ])
    print("Training & Capacity Building tables created successfully.")


if __name__ == "__main__":
    asyncio.run(migrate())
