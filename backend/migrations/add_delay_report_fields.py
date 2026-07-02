"""
Add structured delay report snapshot and evidence columns.
Run: docker exec dacoris-backend python migrations/add_delay_report_fields.py
"""
import asyncio
import os
import sys

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from sqlalchemy import text
from database import engine


COLUMNS = [
    ("student_name", "VARCHAR(200)"),
    ("programme_name", "VARCHAR(300)"),
    ("department", "VARCHAR(200)"),
    ("cohort_year", "INTEGER"),
    ("expected_completion_date", "DATE"),
    ("days_overdue", "INTEGER"),
    ("evidence_filename", "VARCHAR(255)"),
    ("evidence_stored_filename", "VARCHAR(255)"),
    ("evidence_mime_type", "VARCHAR(100)"),
]


async def migrate():
    async with engine.begin() as conn:
        for name, col_type in COLUMNS:
            await conn.execute(text(
                f"ALTER TABLE pg_supervisor_reports ADD COLUMN IF NOT EXISTS {name} {col_type}"
            ))
    print("Delay report columns migration complete")


if __name__ == "__main__":
    asyncio.run(migrate())
