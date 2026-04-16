"""
Email service for sending verification emails via Gmail SMTP
"""

import os
import secrets
import aiosmtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from datetime import datetime, timedelta, timezone
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from models import EmailVerification, User, PrimaryAccountType, UserStatus


class EmailService:
    """Service for sending emails via Gmail SMTP"""
    
    @staticmethod
    def generate_verification_code() -> str:
        """Generate a 6-digit verification code"""
        return ''.join([str(secrets.randbelow(10)) for _ in range(6)])
    
    @staticmethod
    async def send_verification_email(email: str, verification_code: str) -> bool:
        """
        Send verification email via Gmail SMTP with clickable verification link
        
        Args:
            email: Recipient email address
            verification_code: 6-digit verification code
            
        Returns:
            bool: True if email sent successfully, False otherwise
        """
        smtp_host = os.getenv("SMTP_HOST", "smtp.gmail.com")
        smtp_port = int(os.getenv("SMTP_PORT", "587"))
        smtp_user = os.getenv("SMTP_USER")
        smtp_password = os.getenv("SMTP_PASSWORD")
        from_email = os.getenv("FROM_EMAIL", smtp_user)
        frontend_url = os.getenv("FRONTEND_URL", "http://localhost")
        
        if not smtp_user or not smtp_password:
            print("ERROR: SMTP credentials not configured")
            return False
        
        # Create verification link
        verification_link = f"{frontend_url}/verify-email?email={email}&code={verification_code}"
        
        # Create message
        message = MIMEMultipart("alternative")
        message["Subject"] = "Verify Your Email - DACORIS"
        message["From"] = from_email
        message["To"] = email
        
        # Create HTML and plain text versions
        text_content = f"""
        Welcome to DACORIS!
        
        Please verify your email address by clicking the link below:
        {verification_link}
        
        Or use this verification code: {verification_code}
        
        This link will expire in 24 hours.
        
        If you didn't request this verification, please ignore this email.
        """
        
        html_content = f"""
        <html>
          <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
            <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
              <h2 style="color: #1ca7a1;">Welcome to DACORIS!</h2>
              <p>Thank you for registering. Please verify your email address to complete your registration.</p>
              
              <div style="text-align: center; margin: 30px 0;">
                <a href="{verification_link}" 
                   style="display: inline-block; padding: 15px 30px; background-color: #1ca7a1; color: white; 
                          text-decoration: none; border-radius: 5px; font-weight: bold; font-size: 16px;">
                  Verify Email Address
                </a>
              </div>
              
              <p style="color: #666; font-size: 14px;">Or copy and paste this link into your browser:</p>
              <div style="background-color: #f5f5f5; padding: 15px; margin: 15px 0; border-radius: 5px; word-break: break-all;">
                <a href="{verification_link}" style="color: #1ca7a1; text-decoration: none;">{verification_link}</a>
              </div>
              
              <p style="color: #666; font-size: 14px;">Alternatively, you can manually enter this verification code:</p>
              <div style="background-color: #f5f5f5; padding: 15px; text-align: center; margin: 15px 0; border-radius: 5px;">
                <h2 style="color: #1ca7a1; letter-spacing: 5px; margin: 0;">{verification_code}</h2>
              </div>
              
              <p style="color: #666; font-size: 14px;">This link will expire in 24 hours.</p>
              <p style="color: #666; font-size: 14px;">If you didn't request this verification, please ignore this email.</p>
              <hr style="border: none; border-top: 1px solid #ddd; margin: 30px 0;">
              <p style="color: #999; font-size: 12px;">This is an automated message from DACORIS. Please do not reply to this email.</p>
            </div>
          </body>
        </html>
        """
        
        # Attach both versions
        part1 = MIMEText(text_content, "plain")
        part2 = MIMEText(html_content, "html")
        message.attach(part1)
        message.attach(part2)
        
        try:
            # Send email via SMTP
            await aiosmtplib.send(
                message,
                hostname=smtp_host,
                port=smtp_port,
                username=smtp_user,
                password=smtp_password,
                start_tls=True,
            )
            print(f"Verification email sent to {email}")
            return True
        except Exception as e:
            print(f"Failed to send email to {email}: {e}")
            return False
    
    @staticmethod
    async def create_verification(email: str, db: AsyncSession) -> str:
        """
        Create a new email verification record
        
        Args:
            email: Email address to verify
            db: Database session
            
        Returns:
            str: Generated verification code
        """
        # Generate code
        verification_code = EmailService.generate_verification_code()
        
        # Set expiry to 24 hours from now
        expires_at = datetime.now(timezone.utc) + timedelta(hours=24)
        
        # Create verification record
        verification = EmailVerification(
            email=email,
            verification_code=verification_code,
            expires_at=expires_at,
            verified=False
        )
        
        db.add(verification)
        await db.commit()
        await db.refresh(verification)
        
        return verification_code
    
    @staticmethod
    async def verify_code(email: str, code: str, db: AsyncSession) -> bool:
        """
        Verify an email verification code
        
        Args:
            email: Email address
            code: Verification code to check
            db: Database session
            
        Returns:
            bool: True if code is valid and not expired, False otherwise
        """
        # Find the most recent verification for this email
        result = await db.execute(
            select(EmailVerification)
            .where(EmailVerification.email == email)
            .where(EmailVerification.verification_code == code)
            .where(EmailVerification.verified == False)
            .order_by(EmailVerification.created_at.desc())
        )
        verification = result.scalar_one_or_none()
        
        if not verification:
            return False
        
        # Check if expired
        if datetime.now(timezone.utc) > verification.expires_at:
            return False
        
        # Mark verification as verified
        verification.verified = True
        verification.verified_at = datetime.now(timezone.utc)
        
        # Also update the user's email_verified status
        user_result = await db.execute(
            select(User).where(User.email == email)
        )
        user = user_result.scalar_one_or_none()
        
        if user:
            user.email_verified = True
            
            # Auto-activate researcher accounts upon email verification
            # Other account types (admin/staff) require admin approval
            if user.primary_account_type == PrimaryAccountType.RESEARCHER:
                user.status = UserStatus.ACTIVE
        
        await db.commit()
        
        return True
