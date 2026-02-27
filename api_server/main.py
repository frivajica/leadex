import os
from typing import Optional, List, Union
from contextlib import asynccontextmanager
from fastapi import FastAPI, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv

# Load environment variables
load_dotenv()  # From CWD
# Also look in root directory if we are inside api_server/
load_dotenv(os.path.join(os.path.dirname(__file__), "..", ".env"))

from api_server.database import init_db
from api_server.auth import register_user, verify_magic_link, create_access_token, get_current_user, register_with_password, login_with_password
from api_server.routes import jobs, results, keys, categories, payments

# Initialize database on startup
@asynccontextmanager
async def lifespan(app: FastAPI):
    init_db()
    yield


# Create FastAPI app
app = FastAPI(
    title="Lead Extractor API",
    description="Multi-user lead extraction service using Google Maps API",
    version="1.0.0",
    lifespan=lifespan,
)

# Configure CORS
# Configure CORS
dev_origins = [
    "http://localhost:4321",
    "http://localhost:5173",
    "http://127.0.0.1:4321",
    "http://127.0.0.1:5173",
]
CORS_ORIGINS_STR = os.getenv("CORS_ORIGINS", "")
env_origins = [origin.strip() for origin in CORS_ORIGINS_STR.split(",") if origin.strip()]
CORS_ORIGINS = list(set(dev_origins + env_origins))

app.add_middleware(
    CORSMiddleware,
    allow_origins=CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Cookie settings
COOKIE_NAME = "access_token"
COOKIE_MAX_AGE = 60 * 60 * 24  # 24 hours in seconds

# Include routers
app.include_router(jobs.router)
app.include_router(results.router)
app.include_router(keys.router)
app.include_router(categories.router)
app.include_router(payments.router)


# Auth endpoints
from pydantic import BaseModel


class EmailRequest(BaseModel):
    email: str
    redirect_url: Optional[str] = None


class PasswordLoginRequest(BaseModel):
    email: str
    password: str


class PasswordRegisterRequest(BaseModel):
    email: str
    password: str


class TokenRequest(BaseModel):
    token: str


@app.post("/api/auth/register")
async def register(request: EmailRequest):
    """Register a new user and send magic link."""
    if not request.email or "@" not in request.email:
        raise HTTPException(status_code=400, detail="Valid email is required")

    success, message = register_user(request.email, redirect_url=request.redirect_url)

    if not success:
        raise HTTPException(status_code=500, detail=message)

    return {"message": message}


@app.post("/api/auth/login")
async def login(request: EmailRequest):
    """Request magic link for login."""
    return await register(request)


@app.post("/api/auth/register/password")
async def register_password(request: PasswordRegisterRequest):
    """Register a new user with email and password."""
    if not request.email or "@" not in request.email:
        raise HTTPException(status_code=400, detail="Valid email is required")

    if not request.password or len(request.password) < 8:
        raise HTTPException(status_code=400, detail="Password must be at least 8 characters")

    if len(request.password.encode("utf-8")) > 72:
        raise HTTPException(status_code=400, detail="Password cannot be longer than 72 bytes")

    success, message, user = register_with_password(request.email, request.password)

    if not success:
        raise HTTPException(status_code=400, detail=message)

    token_data = create_access_token(user["id"], user["email"])

    response = {
        "access_token": token_data["access_token"],
        "token_type": token_data["token_type"],
        "user": user,
    }

    # Return response with cookies set
    from fastapi.responses import JSONResponse
    response_obj = JSONResponse(content=response)
    response_obj.set_cookie(
        key=COOKIE_NAME,
        value=token_data["access_token"],
        httponly=True,
        path="/",
        max_age=COOKIE_MAX_AGE,
        samesite="lax",
    )
    response_obj.set_cookie(
        key="is_logged_in",
        value="true",
        httponly=False,
        path="/",
        max_age=COOKIE_MAX_AGE,
        samesite="lax",
    )
    return response_obj


@app.post("/api/auth/login/password")
async def login_password(request: PasswordLoginRequest):
    """Login with email and password."""
    if not request.email or not request.password:
        raise HTTPException(status_code=400, detail="Email and password are required")

    if len(request.password.encode("utf-8")) > 72:
        raise HTTPException(status_code=400, detail="Password cannot be longer than 72 bytes")

    success, message, user = login_with_password(request.email, request.password)

    if not success:
        raise HTTPException(status_code=401, detail=message)

    token_data = create_access_token(user["id"], user["email"])

    response = {
        "access_token": token_data["access_token"],
        "token_type": token_data["token_type"],
        "user": user,
    }

    # Return response with cookies set
    from fastapi.responses import JSONResponse
    response_obj = JSONResponse(content=response)
    response_obj.set_cookie(
        key=COOKIE_NAME,
        value=token_data["access_token"],
        httponly=True,
        path="/",
        max_age=COOKIE_MAX_AGE,
        samesite="lax",
    )
    response_obj.set_cookie(
        key="is_logged_in",
        value="true",
        httponly=False,
        path="/",
        max_age=COOKIE_MAX_AGE,
        samesite="lax",
    )
    return response_obj


@app.post("/api/auth/verify")
async def verify(request: TokenRequest):
    """Verify magic link and return access token."""
    user = verify_magic_link(request.token)

    if not user:
        raise HTTPException(status_code=400, detail="Invalid or expired magic link")

    token_data = create_access_token(user["id"], user["email"])

    response = {
        "access_token": token_data["access_token"],
        "token_type": token_data["token_type"],
        "user": user,
    }

    # Return response with cookies set
    from fastapi.responses import JSONResponse
    response_obj = JSONResponse(content=response)
    response_obj.set_cookie(
        key=COOKIE_NAME,
        value=token_data["access_token"],
        httponly=True,
        path="/",
        max_age=COOKIE_MAX_AGE,
        samesite="lax",
    )
    response_obj.set_cookie(
        key="is_logged_in",
        value="true",
        httponly=False,
        path="/",
        max_age=COOKIE_MAX_AGE,
        samesite="lax",
    )
    return response_obj


@app.get("/api/auth/me")
async def get_me(user=Depends(get_current_user)):
    """Get current user info."""
    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    return user


@app.post("/api/auth/logout")
async def logout():
    """Logout user by clearing cookies."""
    from fastapi.responses import JSONResponse
    response = JSONResponse(content={"message": "Logged out successfully"})
    response.delete_cookie(key=COOKIE_NAME, path="/")
    response.delete_cookie(key="is_logged_in", path="/")
    return response


# Health check
@app.get("/health")
async def health_check():
    """Health check endpoint."""
    return {"status": "healthy"}
