# routes/jobs.py - Job management endpoints
from typing import Optional, List
from fastapi import APIRouter, HTTPException, Depends, Query, Body
from pydantic import BaseModel

from api_server.auth import get_current_user
from api_server.database import (
    create_job,
    get_job,
    get_jobs,
    delete_job,
)
from api_server.services.extractor import extractor_service

router = APIRouter(prefix="/api/jobs", tags=["jobs"])


def require_auth(user=Depends(get_current_user)) -> dict:
    """Require authentication."""
    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    return user


class CreateJobRequest(BaseModel):
    name: str
    center_lat: float
    center_lng: float
    center_address: Optional[str] = None
    categories: Optional[List[str]] = None
    radius: int = 5000
    min_rating: float = 4.0
    min_reviews: int = 10
    min_photos: int = 3
    use_quality_filters: bool = False
    sort_by: str = "score"


@router.post("", status_code=201)
async def create_new_job(
    request: CreateJobRequest,
    user: dict = Depends(require_auth),
):
    """Create a new lead extraction job."""
    job_id = create_job(
        user_id=user["id"],
        name=request.name,
        center_lat=request.center_lat,
        center_lng=request.center_lng,
        center_address=request.center_address,
        categories=request.categories,
        radius=request.radius,
        min_rating=request.min_rating,
        min_reviews=request.min_reviews,
        min_photos=request.min_photos,
        use_quality_filters=request.use_quality_filters,
        sort_by=request.sort_by,
    )

    # Start the job in background
    extractor_service.run_job(job_id, user["id"])

    return {
        "id": job_id,
        "name": request.name,
        "status": "queued",
        "message": "Job created and started",
    }


@router.get("")
async def list_jobs(
    limit: int = Query(50, ge=1, le=100),
    offset: int = Query(0, ge=0),
    user: dict = Depends(require_auth),
):
    """List all jobs for the current user."""
    jobs = get_jobs(user["id"], limit=limit, offset=offset)
    return {"jobs": jobs}


@router.get("/{job_id}")
async def get_job_details(
    job_id: int,
    user: dict = Depends(require_auth),
):
    """Get details of a specific job."""
    job = get_job(job_id, user["id"])

    if not job:
        raise HTTPException(status_code=404, detail="Job not found")

    return job


@router.delete("/{job_id}")
async def remove_job(
    job_id: int,
    user: dict = Depends(require_auth),
):
    """Delete a job."""
    job = get_job(job_id, user["id"])

    if not job:
        raise HTTPException(status_code=404, detail="Job not found")

    # Cancel if running
    if job["status"] == "running":
        extractor_service.cancel_job(job_id)

    # Delete
    success = delete_job(job_id, user["id"])

    if not success:
        raise HTTPException(status_code=500, detail="Failed to delete job")

    return {"message": "Job deleted successfully"}


@router.post("/{job_id}/cancel")
async def cancel_job(
    job_id: int,
    user: dict = Depends(require_auth),
):
    """Cancel a running job."""
    job = get_job(job_id, user["id"])

    if not job:
        raise HTTPException(status_code=404, detail="Job not found")

    if job["status"] != "running":
        raise HTTPException(status_code=400, detail="Job is not running")

    success = extractor_service.cancel_job(job_id)

    if not success:
        raise HTTPException(status_code=500, detail="Failed to cancel job")

    return {"message": "Job cancelled successfully"}


@router.post("/{job_id}/restart")
async def restart_job(
    job_id: int,
    user: dict = Depends(require_auth),
):
    """Restart a failed or cancelled job."""
    job = get_job(job_id, user["id"])

    if not job:
        raise HTTPException(status_code=404, detail="Job not found")

    if job["status"] not in ["failed", "cancelled"]:
        raise HTTPException(status_code=400, detail="Only failed or cancelled jobs can be restarted")

    # Update status to queued
    from api_server.database import update_job_status
    update_job_status(job_id, "queued")

    # Start the job
    extractor_service.run_job(job_id, user["id"])

    return {
        "id": job_id,
        "status": "queued",
        "message": "Job restarted",
    }
