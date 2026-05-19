"""
Seed script: Assign MOU_ADMIN role to ra@dacoris.com
Usage: python migrations/seed_mou_role.py [--email ra@dacoris.com] [--role MOU_ADMIN]

Defaults to MOU_ADMIN for ra@dacoris.com. Other valid roles:
  LEGAL_OFFICER, PARTNERSHIP_COORDINATOR, MOU_ADMIN
"""

import psycopg2
from dotenv import load_dotenv
import os
import sys
import argparse

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL", "")
if DATABASE_URL.startswith("postgresql+asyncpg://"):
    DATABASE_URL = DATABASE_URL.replace("postgresql+asyncpg://", "postgresql://")

VALID_ROLES = {"MOU_ADMIN", "LEGAL_OFFICER", "PARTNERSHIP_COORDINATOR"}


def assign_role(email: str, role: str, dry_run: bool = False):
    if role not in VALID_ROLES:
        print(f"❌ Invalid role '{role}'. Choose from: {', '.join(VALID_ROLES)}")
        sys.exit(1)

    conn = psycopg2.connect(DATABASE_URL)
    cursor = conn.cursor()

    try:
        # Find user
        cursor.execute("SELECT id, name, primary_account_type FROM users WHERE email = %s", (email,))
        row = cursor.fetchone()
        if not row:
            print(f"❌ No user found with email: {email}")
            sys.exit(1)

        user_id, name, current_role = row
        print(f"Found user: {name} (id={user_id}) — current role: {current_role}")

        if dry_run:
            print(f"[DRY RUN] Would set primary_account_type = '{role}' for {email}")
            return

        # Update primary_account_type
        cursor.execute(
            "UPDATE users SET primary_account_type = %s, updated_at = NOW() WHERE id = %s",
            (role, user_id)
        )

        # Insert into user_roles (ResearchRole enum uses lowercase)
        role_lower = role.lower()
        cursor.execute(
            """
            INSERT INTO user_roles (user_id, role)
            VALUES (%s, %s)
            ON CONFLICT (user_id, role) DO NOTHING
            """,
            (user_id, role_lower)
        )

        conn.commit()
        print(f"✅ Assigned role '{role}' to {email} ({name})")
        print(f"   primary_account_type = {role}")
        print(f"   user_roles entry: {role_lower}")

    except Exception as e:
        conn.rollback()
        print(f"❌ Failed: {e}")
        raise
    finally:
        cursor.close()
        conn.close()


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Assign MoU role to a user")
    parser.add_argument("--email", default="ra@dacoris.com", help="User email address")
    parser.add_argument("--role",  default="MOU_ADMIN", choices=list(VALID_ROLES), help="Role to assign")
    parser.add_argument("--dry-run", action="store_true", help="Preview without making changes")
    args = parser.parse_args()

    assign_role(args.email, args.role, args.dry_run)
