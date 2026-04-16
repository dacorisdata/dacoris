import asyncio
import click
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
import bcrypt
from dotenv import load_dotenv
import os

from database import async_session_maker, init_db
from models import User, Institution, AccountType, UserStatus

load_dotenv()

@click.group()
def cli():
    """DACORIS Management CLI"""
    pass

@cli.command()
@click.option('--email', prompt=True, help='Global admin email address')
@click.option('--password', prompt=True, hide_input=True, confirmation_prompt=True, help='Global admin password')
@click.option('--name', prompt=True, help='Global admin name')
def create_global_admin(email, password, name):
    """Create a global admin account"""
    async def _create():
        async with async_session_maker() as session:
            result = await session.execute(select(User).where(User.email == email))
            existing = result.scalar_one_or_none()
            
            if existing:
                click.echo(f"Error: User with email {email} already exists")
                return
            
            # Hash password with bcrypt (automatically handles 72 byte limit)
            password_bytes = password.encode('utf-8')
            salt = bcrypt.gensalt()
            password_hash = bcrypt.hashpw(password_bytes, salt).decode('utf-8')
            
            admin = User(
                email=email,
                name=name,
                password_hash=password_hash,
                account_type=AccountType.GLOBAL_ADMIN,
                status=UserStatus.ACTIVE,
                is_global_admin=True,
                primary_institution_id=None
            )
            
            session.add(admin)
            await session.commit()
            await session.refresh(admin)
            
            click.echo(f"[OK] Global admin created successfully!")
            click.echo(f"  ID: {admin.id}")
            click.echo(f"  Email: {admin.email}")
            click.echo(f"  Name: {admin.name}")
    
    asyncio.run(_create())

@cli.command()
def list_admins():
    """List all admin accounts"""
    async def _list():
        async with async_session_maker() as session:
            result = await session.execute(
                select(User).where(
                    (User.is_global_admin == True) | (User.is_institution_admin == True)
                )
            )
            admins = result.scalars().all()
            
            if not admins:
                click.echo("No admin accounts found")
                return
            
            click.echo("\nAdmin Accounts:")
            click.echo("-" * 80)
            for admin in admins:
                admin_type = "Global Admin" if admin.is_global_admin else "Institution Admin"
                institution = f" (Institution ID: {admin.primary_institution_id})" if admin.primary_institution_id else ""
                click.echo(f"ID: {admin.id} | {admin_type} | {admin.email} | {admin.name}{institution}")
            click.echo("-" * 80)
    
    asyncio.run(_list())

@cli.command()
@click.option('--email', prompt=True, help='Admin email address')
@click.option('--password', prompt=True, hide_input=True, confirmation_prompt=True, help='New password')
def reset_admin_password(email, password):
    """Reset an admin account password"""
    async def _reset():
        async with async_session_maker() as session:
            result = await session.execute(select(User).where(User.email == email))
            user = result.scalar_one_or_none()
            
            if not user:
                click.echo(f"Error: User with email {email} not found")
                return
            
            if not (user.is_global_admin or user.is_institution_admin):
                click.echo(f"Error: User {email} is not an admin account")
                return
            
            user.password_hash = pwd_context.hash(password)
            await session.commit()
            
            click.echo(f"[OK] Password reset successfully for {email}")
    
    asyncio.run(_reset())

@cli.command()
@click.option('--name', prompt=True, help='Institution name')
@click.option('--domain', prompt=True, help='Primary domain (e.g., university.edu)')
def create_institution(name, domain):
    """Create a new institution"""
    async def _create():
        async with async_session_maker() as session:
            result = await session.execute(select(Institution).where(Institution.domain == domain))
            existing = result.scalar_one_or_none()
            
            if existing:
                click.echo(f"Error: Institution with domain {domain} already exists")
                return
            
            institution = Institution(
                name=name,
                domain=domain,
                is_active=True
            )
            
            session.add(institution)
            await session.commit()
            await session.refresh(institution)
            
            click.echo(f"[OK] Institution created successfully!")
            click.echo(f"  ID: {institution.id}")
            click.echo(f"  Name: {institution.name}")
            click.echo(f"  Domain: {institution.domain}")
    
    asyncio.run(_create())

@cli.command()
def list_institutions():
    """List all institutions"""
    async def _list():
        async with async_session_maker() as session:
            result = await session.execute(select(Institution))
            institutions = result.scalars().all()
            
            if not institutions:
                click.echo("No institutions found")
                return
            
            click.echo("\nInstitutions:")
            click.echo("-" * 80)
            for inst in institutions:
                status = "Active" if inst.is_active else "Inactive"
                click.echo(f"ID: {inst.id} | {inst.name} | {inst.domain} | {status}")
            click.echo("-" * 80)
    
    asyncio.run(_list())

@cli.command()
def init_database():
    """Initialize database tables"""
    async def _init():
        await init_db()
        click.echo("[OK] Database initialized successfully!")
    
    asyncio.run(_init())

if __name__ == '__main__':
    cli()
