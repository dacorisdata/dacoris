"""
Initialize global admin on startup
This script runs when the backend container starts and ensures a global admin account.

Environment variables:
- ADMIN_NAME: Admin name (default: "Global Admin")
- ADMIN_EMAIL: Admin email (required if ADMIN_PASSWORD is set)
- ADMIN_PASSWORD: Admin password (required if ADMIN_EMAIL is set)

When ADMIN_EMAIL and ADMIN_PASSWORD are set, that account is created or updated
as a global admin (password reset to the env value). Otherwise, if no global
admin exists, interactive creation is used.
"""
import asyncio
import sys
import os
import getpass
from sqlalchemy import select
from database import async_session_maker
from models import User, AccountType, UserStatus, Institution
from auth import get_password_hash

def is_interactive():
    """Check if running in interactive mode"""
    return sys.stdin.isatty()

def get_input(prompt, default=None):
    """Get input with optional default value"""
    if not is_interactive():
        return default
    
    if default:
        user_input = input(f"{prompt} [{default}]: ").strip()
        return user_input if user_input else default
    return input(f"{prompt}: ").strip()

def get_password():
    """Get password with confirmation"""
    if not is_interactive():
        return None
    
    while True:
        password = getpass.getpass("Password: ")
        if not password:
            print("[ERROR] Password cannot be empty")
            continue
        
        if len(password) < 8:
            print("[ERROR] Password must be at least 8 characters")
            continue
            
        confirm = getpass.getpass("Confirm Password: ")
        if password != confirm:
            print("[ERROR] Passwords do not match. Please try again.")
            continue
        
        return password

async def get_or_create_default_institution(db):
    from services.departments import find_ascension_dynamics_institution

    inst = await find_ascension_dynamics_institution(db)
    
    if not inst:
        print("[INFO] Creating default institution: Ascension Dynamics")
        inst = Institution(
            name="Ascension Dynamics",
            domain="ascensiondynamics.com",
            verified_domains="ascensiondynamics.com,ascensiondynamics.co",
            is_active=True,
        )
        db.add(inst)
        await db.flush()
    
    return inst

async def ensure_env_admin(db, email, password, name):
    """Create or update the ADMIN_EMAIL user as a global admin."""
    if len(password) < 8:
        print("[ERROR] ADMIN_PASSWORD must be at least 8 characters")
        sys.exit(1)

    inst = await get_or_create_default_institution(db)
    result = await db.execute(select(User).where(User.email == email))
    admin = result.scalar_one_or_none()

    if admin:
        admin.name = name
        admin.password_hash = get_password_hash(password)
        admin.is_global_admin = True
        admin.status = UserStatus.ACTIVE
        admin.email_verified = True
        if not admin.primary_institution_id:
            admin.primary_institution_id = inst.id
        await db.commit()
        print("\n" + "="*60)
        print("[OK] Global admin updated from environment variables")
        print("="*60)
        print(f"Email: {email}")
        print(f"Name: {name}")
        print("="*60 + "\n")
        return

    admin = User(
        email=email,
        name=name,
        password_hash=get_password_hash(password),
        account_type=AccountType.ORCID,
        status=UserStatus.ACTIVE,
        primary_institution_id=inst.id,
        is_global_admin=True,
        email_verified=True,
    )
    db.add(admin)
    await db.commit()

    print("\n" + "="*60)
    print("[OK] Global admin created from environment variables")
    print("="*60)
    print(f"Email: {email}")
    print(f"Name: {name}")
    print("="*60 + "\n")

async def init_admin():
    """Ensure global admin from env vars, or create interactively if none exists."""
    async with async_session_maker() as db:
        await get_or_create_default_institution(db)
        from services.departments import ensure_ascension_dynamics_setup
        await ensure_ascension_dynamics_setup(db)
        await db.commit()

        env_email = os.getenv("ADMIN_EMAIL")
        env_password = os.getenv("ADMIN_PASSWORD")
        env_name = os.getenv("ADMIN_NAME", "Global Admin")

        # Prefer compose/env credentials — create or update that account
        if env_email and env_password:
            await ensure_env_admin(db, env_email, env_password, env_name)
            return

        result = await db.execute(
            select(User).where(User.is_global_admin == True)
        )
        existing_admin = result.scalar_one_or_none()

        if existing_admin:
            print(f"[OK] Global admin already exists: {existing_admin.email}")
            return

        # Interactive mode when no env vars and no admin
        if not is_interactive():
            print("\n" + "="*60)
            print("NO GLOBAL ADMIN FOUND")
            print("="*60)
            print("[ERROR] Running in non-interactive mode but ADMIN_EMAIL and ADMIN_PASSWORD are not set.")
            print("[INFO] Please set environment variables ADMIN_EMAIL and ADMIN_PASSWORD, or run interactively.")
            print("="*60 + "\n")
            sys.exit(1)

        print("\n" + "="*60)
        print("NO GLOBAL ADMIN FOUND")
        print("="*60)
        print("Please create a global admin account to continue.\n")

        name = get_input("Name", "Global Admin")

        while True:
            email = get_input("Email")
            if not email:
                print("[ERROR] Email cannot be empty")
                continue

            if "@" not in email:
                print("[ERROR] Invalid email format")
                continue

            result = await db.execute(
                select(User).where(User.email == email)
            )
            if result.scalar_one_or_none():
                print(f"[ERROR] User with email {email} already exists")
                continue

            break

        password = get_password()
        inst = await get_or_create_default_institution(db)

        admin = User(
            email=email,
            name=name,
            password_hash=get_password_hash(password),
            account_type=AccountType.ORCID,
            status=UserStatus.ACTIVE,
            primary_institution_id=inst.id,
            is_global_admin=True,
            email_verified=True,
        )

        db.add(admin)
        await db.commit()

        print("\n" + "="*60)
        print("[OK] Global admin created successfully!")
        print("="*60)
        print(f"Email: {email}")
        print(f"Name: {name}")
        print("="*60 + "\n")

if __name__ == "__main__":
    try:
        asyncio.run(init_admin())
    except KeyboardInterrupt:
        print("\n[WARN] Admin creation cancelled")
        sys.exit(1)
    except Exception as e:
        print(f"[ERROR] Failed to create admin: {e}")
        sys.exit(1)
