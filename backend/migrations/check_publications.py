"""
Check publications and libraries in database
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

print("=" * 60)
print("CHECKING PUBLICATION LIBRARIES")
print("=" * 60)

cursor.execute("""
    SELECT id, name, is_folder, parent_id, user_id
    FROM publication_libraries
    ORDER BY created_at
""")

libraries = cursor.fetchall()
print(f"\n📚 Found {len(libraries)} libraries:")
for lib in libraries:
    lib_id, name, is_folder, parent_id, user_id = lib
    folder_type = "📁 Folder" if is_folder else "📚 Library"
    parent = f"(Parent: {parent_id[:8]}...)" if parent_id else "(Root)"
    print(f"  {folder_type}: {name} {parent}")
    print(f"    ID: {lib_id}")

print("\n" + "=" * 60)
print("CHECKING PUBLICATIONS")
print("=" * 60)

cursor.execute("""
    SELECT p.id, p.title, p.library_id, pl.name as library_name
    FROM publications p
    LEFT JOIN publication_libraries pl ON p.library_id = pl.id
    ORDER BY p.created_at DESC
    LIMIT 10
""")

publications = cursor.fetchall()
print(f"\n📄 Found {len(publications)} publications (showing last 10):")
for pub in publications:
    pub_id, title, lib_id, lib_name = pub
    print(f"  - {title[:50]}")
    print(f"    Library: {lib_name or 'None'} (ID: {lib_id[:8] if lib_id else 'None'}...)")

print("\n" + "=" * 60)
print("CHECKING PUBLICATION COUNT PER LIBRARY")
print("=" * 60)

cursor.execute("""
    SELECT pl.name, COUNT(p.id) as pub_count
    FROM publication_libraries pl
    LEFT JOIN publications p ON p.library_id = pl.id
    GROUP BY pl.id, pl.name
    ORDER BY pub_count DESC
""")

counts = cursor.fetchall()
print(f"\n📊 Publications per library:")
for lib_name, count in counts:
    print(f"  {lib_name}: {count} publications")

cursor.close()
conn.close()
