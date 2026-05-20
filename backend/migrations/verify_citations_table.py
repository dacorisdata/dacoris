"""
Verify manuscript_citations table was created
"""

import psycopg2
from dotenv import load_dotenv
import os

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL", "")
if DATABASE_URL.startswith("postgresql+asyncpg://"):
    DATABASE_URL = DATABASE_URL.replace("postgresql+asyncpg://", "postgresql://")

conn = psycopg2.connect(DATABASE_URL)
cursor = conn.cursor()

# Check table exists
cursor.execute("""
    SELECT column_name, data_type 
    FROM information_schema.columns 
    WHERE table_name = 'manuscript_citations' 
    ORDER BY ordinal_position
""")

columns = cursor.fetchall()

if columns:
    print("✓ manuscript_citations table exists with columns:")
    for col_name, col_type in columns:
        print(f"  - {col_name}: {col_type}")
else:
    print("✗ manuscript_citations table not found")

# Check indexes
cursor.execute("""
    SELECT indexname 
    FROM pg_indexes 
    WHERE tablename = 'manuscript_citations'
""")

indexes = cursor.fetchall()
if indexes:
    print("\n✓ Indexes created:")
    for idx in indexes:
        print(f"  - {idx[0]}")

cursor.close()
conn.close()
