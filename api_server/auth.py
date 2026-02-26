import secrets
import os
from datetime import datetime, timedelta
from typing import Optional
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
import smtplib
from jose import jwt
from passlib.hash import bcrypt
from fastapi import Request

from api_server.database import (
    create_user,
    get_user_by_email,
    create_magic_link,
    get_magic_link,
    use_magic_link,
    update_user_password,
)

SECRET_KEY = os.getenv("SECRET_KEY", secrets.token_hex(32))
ALGORITHM = "HS256"
TOKEN_EXPIRY_HOURS = 24

SMTP_HOST = os.getenv("SMTP_HOST", "")
SMTP_PORT = int(os.getenv("SMTP_PORT", "587"))
SMTP_USER = os.getenv("SMTP_USER", "")
SMTP_PASSWORD = os.getenv("SMTP_PASSWORD", "")
FROM_EMAIL = os.getenv("FROM_EMAIL", "noreply@leadextractor.app")

APP_URL = os.getenv("APP_URL", "http://localhost:4321")


def send_magic_link_email(email: str, magic_link: str) -> bool:
    """Send magic link email (or mock for development)."""
    if not SMTP_HOST or not SMTP_USER:
        # Mock mode - just print the link
        print(f"\n[MOCK EMAIL] Magic link for {email}:")
        print(f"  {magic_link}\n")
        return True

    try:
        msg = MIMEMultipart()
        msg["From"] = FROM_EMAIL
        msg["To"] = email
        msg["Subject"] = "Sign in to Lead Extractor"

        body = f"""Hello,

Click the link below to sign in to Lead Extractor:

{magic_link}

This link will expire in {TOKEN_EXPIRY_HOURS} hours.

If you didn't request this, please ignore this email.
"""
        msg.attach(MIMEText(body, "plain"))

        with smtplib.SMTP(SMTP_HOST, SMTP_PORT) as server:
            server.starttls()
            server.login(SMTP_USER, SMTP_PASSWORD)
            server.send_message(msg)

        return True
    except Exception as e:
        print(f"Error sending email: {e}")
        return False


def register_user(email: str) -> tuple[bool, str]:
    """Register a new user or return existing user."""
    user = get_user_by_email(email)

    if not user:
        user_id = create_user(email)
    else:
        user_id = user["id"]

    # Generate magic link
    token = secrets.token_urlsafe(32)
    expires_at = datetime.utcnow() + timedelta(hours=TOKEN_EXPIRY_HOURS)

    create_magic_link(user_id, token, expires_at)

    magic_link = f"{APP_URL}/auth/verify?token={token}"

    # Send email
    success = send_magic_link_email(email, magic_link)

    if not success:
        return False, "Failed to send magic link email"

    return True, "Magic link sent to your email"


def verify_magic_link(token: str) -> Optional[dict]:
    """Verify a magic link and return user info."""
    magic_link = get_magic_link(token)

    if not magic_link:
        return None

    # Check if expired
    expires_at = datetime.fromisoformat(magic_link["expires_at"])
    if datetime.utcnow() > expires_at:
        return None

    # Mark as used
    use_magic_link(token)

    # Return user info
    from api_server.database import get_user_by_id
    user = get_user_by_id(magic_link["user_id"])

    if user:
        return {
            "id": user["id"],
            "email": user["email"],
        }

    return None


def create_access_token(user_id: int, email: str) -> dict:
    """Create a JWT access token for a user and return it with cookie settings."""
    payload = {
        "user_id": user_id,
        "email": email,
        "exp": datetime.utcnow() + timedelta(hours=TOKEN_EXPIRY_HOURS),
    }
    token = jwt.encode(payload, SECRET_KEY, algorithm=ALGORITHM)
    
    return {
        "access_token": token,
        "token_type": "bearer",
        "expires_hours": TOKEN_EXPIRY_HOURS,
    }


def decode_access_token(token: str) -> Optional[dict]:
    """Decode and verify a JWT access token."""
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        return payload
    except jwt.ExpiredSignatureError:
        return None
    except jwt.InvalidTokenError:
        return None


def get_current_user(request: Request = None, authorization: str = None) -> Optional[dict]:
    """Get the current user from cookie or Authorization header."""
    token = None
    
    # First try to get token from cookie
    if request:
        token = request.cookies.get("access_token")
    
    # Fall back to Authorization header
    if not token and authorization:
        # Extract token from "Bearer <token>"
        parts = authorization.split()
        if len(parts) == 2 and parts[0].lower() == "bearer":
            token = parts[1]

    if not token:
        return None

    payload = decode_access_token(token)

    if not payload:
        return None

    from api_server.database import get_user_by_id
    user = get_user_by_id(payload["user_id"])

    if user:
        return {
            "id": user["id"],
            "email": user["email"],
            "subscription_tier": user.get("subscription_tier", "free"),
            "subscription_expires_at": user.get("subscription_expires_at"),
            "job_credits": user.get("job_credits", 0),
        }

    return None


def hash_password(password: str) -> str:
    """Hash a password using bcrypt."""
    return bcrypt.hash(password)


def verify_password(password: str, password_hash: str) -> bool:
    """Verify a password against a hash."""
    if not password_hash:
        return False
    return bcrypt.verify(password, password_hash)


def register_with_password(email: str, password: str) -> tuple[bool, str, Optional[dict]]:
    """Register a new user with email and password."""
    user = get_user_by_email(email)

    if user:
        # Check if user already has a password set
        if user.get("password_hash"):
            return False, "Email already registered", None
        # User exists but no password - set password
        password_hash = hash_password(password)
        update_user_password(user["id"], password_hash)
        return True, "Password set successfully", {"id": user["id"], "email": email}

    # Create new user with password
    user_id = create_user(email)
    password_hash = hash_password(password)
    update_user_password(user_id, password_hash)

    return True, "User registered successfully", {"id": user_id, "email": email}


def login_with_password(email: str, password: str) -> tuple[bool, str, Optional[dict]]:
    """Login with email and password."""
    user = get_user_by_email(email)

    if not user:
        return False, "Invalid email or password", None

    if not user.get("password_hash"):
        return False, "Invalid email or password", None

    if not verify_password(password, user["password_hash"]):
        return False, "Invalid email or password", None

    return True, "Login successful", {"id": user["id"], "email": user["email"]}
