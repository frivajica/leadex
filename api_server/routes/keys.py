# routes/keys.py - API key management endpoints
from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel

from api_server.auth import get_current_user
from api_server.database import (
    create_api_key,
    get_api_keys,
    delete_api_key,
)

router = APIRouter(prefix="/api/keys", tags=["keys"])


def require_auth(user=Depends(get_current_user)) -> dict:
    """Require authentication."""
    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    return user


class AddKeyRequest(BaseModel):
    key_name: str
    api_key: str


@router.get("")
async def list_keys(user: dict = Depends(require_auth)):
    """List all API keys for the current user."""
    keys = get_api_keys(user["id"])
    # Mask the API key (show only last 4 characters)
    for key in keys:
        key["key_preview"] = "****"
    return {"keys": keys}


@router.post("", status_code=201)
async def add_key(
    request: AddKeyRequest,
    user: dict = Depends(require_auth),
):
    """Add a new API key."""
    if not request.api_key:
        raise HTTPException(status_code=400, detail="API key is required")

    key_id = create_api_key(user["id"], request.key_name, request.api_key)

    return {
        "id": key_id,
        "key_name": request.key_name,
        "message": "API key added successfully",
    }


@router.delete("/{key_id}")
async def remove_key(
    key_id: int,
    user: dict = Depends(require_auth),
):
    """Delete an API key."""
    success = delete_api_key(user["id"], key_id)

    if not success:
        raise HTTPException(status_code=404, detail="API key not found")

    return {"message": "API key deleted successfully"}
