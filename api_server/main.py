# main.py - FastAPI application entry point
import os
from contextlib import asynccontextmanager
from fastapi import FastAPI, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware

from api_server.database import init_db
from api_server.auth import register_user, verify_magic_link, create_access_token, get_current_user, register_with_password, login_with_password
from api_server.routes import jobs, results, keys, categories

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
CORS_ORIGINS = os.getenv("CORS_ORIGINS", "http://localhost:4321")
app.add_middleware(
    CORSMiddleware,
    allow_origins=[CORS_ORIGINS, "http://localhost:4321", "http://localhost:5173"],
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


# Auth endpoints
from pydantic import BaseModel


class EmailRequest(BaseModel):
    email: str


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

    success, message = register_user(request.email)

    if not success:
        raise HTTPException(status_code=500, detail=message)

    return {"message": message}


@app.post("/api/auth/login")
async def login(request: EmailRequest):
    """Request magic link for login."""
    return register(request)


@app.post("/api/auth/register/password")
async def register_password(request: PasswordRegisterRequest):
    """Register a new user with email and password."""
    if not request.email or "@" not in request.email:
        raise HTTPException(status_code=400, detail="Valid email is required")

    if not request.password or len(request.password) < 8:
        raise HTTPException(status_code=400, detail="Password must be at least 8 characters")

    success, message, user = register_with_password(request.email, request.password)

    if not success:
        raise HTTPException(status_code=400, detail=message)

    token_data = create_access_token(user["id"], user["email"])

    response = {
        "access_token": token_data["access_token"],
        "token_type": token_data["token_type"],
        "user": user,
    }

    # Return response with cookie set
    from fastapi.responses import JSONResponse
    return JSONResponse(
        content=response,
        headers={
            "Set-Cookie": f"{COOKIE_NAME}={token_data['access_token']}; HttpOnly; Path=/; Max-Age={COOKIE_MAX_AGE}; SameSite=Lax"
        }
    )


@app.post("/api/auth/login/password")
async def login_password(request: PasswordLoginRequest):
    """Login with email and password."""
    if not request.email or not request.password:
        raise HTTPException(status_code=400, detail="Email and password are required")

    success, message, user = login_with_password(request.email, request.password)

    if not success:
        raise HTTPException(status_code=401, detail=message)

    token_data = create_access_token(user["id"], user["email"])

    response = {
        "access_token": token_data["access_token"],
        "token_type": token_data["token_type"],
        "user": user,
    }

    # Return response with cookie set
    from fastapi.responses import JSONResponse
    return JSONResponse(
        content=response,
        headers={
            "Set-Cookie": f"{COOKIE_NAME}={token_data['access_token']}; HttpOnly; Path=/; Max-Age={COOKIE_MAX_AGE}; SameSite=Lax"
        }
    )


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

    # Return response with cookie set
    from fastapi.responses import JSONResponse
    return JSONResponse(
        content=response,
        headers={
            "Set-Cookie": f"{COOKIE_NAME}={token_data['access_token']}; HttpOnly; Path=/; Max-Age={COOKIE_MAX_AGE}; SameSite=Lax"
        }
    )


@app.get("/api/auth/me")
async def get_me(user=Depends(get_current_user)):
    """Get current user info."""
    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    return user


@app.post("/api/auth/logout")
async def logout():
    """Logout user by clearing the cookie."""
    from fastapi.responses import JSONResponse
    return JSONResponse(
        content={"message": "Logged out successfully"},
        headers={
            "Set-Cookie": f"{COOKIE_NAME}=; HttpOnly; Path=/; Max-Age=0"
        }
    )


# Health check
@app.get("/health")
async def health_check():
    """Health check endpoint."""
    return {"status": "healthy"}
