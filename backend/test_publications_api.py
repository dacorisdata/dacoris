"""
Test script to check publications API responses
Run: docker-compose exec backend python test_publications_api.py
"""
import asyncio
from sqlalchemy import select
from database import AsyncSessionLocal
from models import Publication, PublicationLibrary, User

async def test_publications():
    async with AsyncSessionLocal() as db:
        # Get first user (you can change this to your user email)
        user_result = await db.execute(select(User).limit(1))
        user = user_result.scalar_one_or_none()
        
        if not user:
            print("❌ No users found in database")
            return
        
        print(f"✓ Testing with user: {user.email}")
        print()
        
        # Check libraries
        libs_result = await db.execute(
            select(PublicationLibrary).where(PublicationLibrary.user_id == user.id)
        )
        libraries = libs_result.scalars().all()
        
        print(f"📚 Libraries found: {len(libraries)}")
        for lib in libraries:
            print(f"  - {lib.name} (ID: {lib.id}, Folder: {lib.is_folder}, Parent: {lib.parent_id})")
        print()
        
        # Check publications
        pubs_result = await db.execute(
            select(Publication).join(
                PublicationLibrary, Publication.library_id == PublicationLibrary.id
            ).where(
                PublicationLibrary.user_id == user.id
            )
        )
        publications = pubs_result.scalars().all()
        
        print(f"📄 Publications found: {len(publications)}")
        for pub in publications:
            lib = next((l for l in libraries if l.id == pub.library_id), None)
            lib_name = lib.name if lib else "Unknown"
            print(f"  - {pub.title[:50]}... (Library: {lib_name})")
        print()
        
        # Build library hierarchy
        all_libraries = {lib.id: lib for lib in libraries}
        
        def get_library_path(lib_id):
            if lib_id not in all_libraries:
                return "Uncategorized"
            
            path = []
            current = all_libraries[lib_id]
            while current:
                path.insert(0, current.name)
                if current.parent_id and current.parent_id in all_libraries:
                    current = all_libraries[current.parent_id]
                else:
                    break
            return " > ".join(path)
        
        print("📁 Library paths:")
        for pub in publications:
            path = get_library_path(pub.library_id)
            print(f"  - {pub.title[:40]}... → {path}")

if __name__ == "__main__":
    asyncio.run(test_publications())
