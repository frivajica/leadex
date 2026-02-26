# routes/results.py - Results endpoints
import io
import csv
import json
from fastapi import APIRouter, HTTPException, Depends, Query
from fastapi.responses import StreamingResponse

from api_server.auth import get_current_user
from api_server.database import get_job, get_result

router = APIRouter(prefix="/api", tags=["results"])


def require_auth(user=Depends(get_current_user)) -> dict:
    """Require authentication."""
    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    return user


@router.get("/jobs/{job_id}/results")
async def get_job_results(
    job_id: int,
    limit: int = Query(100, ge=1, le=1000),
    offset: int = Query(0, ge=0),
    user: dict = Depends(require_auth),
):
    """Get results for a job."""
    job = get_job(job_id, user["id"])

    if not job:
        raise HTTPException(status_code=404, detail="Job not found")

    if job["status"] != "completed":
        raise HTTPException(status_code=400, detail="Job is not completed yet")

    results = get_result(job_id)

    if results is None:
        results = []

    # Apply pagination
    paginated_results = results[offset : offset + limit]

    return {
        "job_id": job_id,
        "total": len(results),
        "limit": limit,
        "offset": offset,
        "results": paginated_results,
    }


@router.get("/jobs/{job_id}/results/export")
async def export_results(
    job_id: int,
    format: str = Query("csv", pattern="^(csv|json)$"),
    user: dict = Depends(require_auth),
):
    """Export job results as CSV or JSON."""
    job = get_job(job_id, user["id"])

    if not job:
        raise HTTPException(status_code=404, detail="Job not found")

    if job["status"] != "completed":
        raise HTTPException(status_code=400, detail="Job is not completed yet")

    results = get_result(job_id)

    if not results:
        raise HTTPException(status_code=404, detail="No results found")

    filename = f"leads_{job_id}"

    if format == "csv":
        # Create CSV
        output = io.StringIO()
        if results:
            fieldnames = [
                "name",
                "business_type",
                "address",
                "phone",
                "rating",
                "review_count",
                "price_level",
                "photos_count",
                "distance_km",
                "distance_miles",
                "website",
                "maps_url",
                "lead_score",
            ]
            writer = csv.DictWriter(output, fieldnames=fieldnames)
            writer.writeheader()

            for row in results:
                filtered = {k: row.get(k, "") for k in fieldnames}
                writer.writerow(filtered)

        output.seek(0)
        return StreamingResponse(
            io.BytesIO(output.getvalue().encode()),
            media_type="text/csv",
            headers={"Content-Disposition": f"attachment; filename={filename}.csv"},
        )

    elif format == "json":
        # Create JSON
        return StreamingResponse(
            io.BytesIO(json.dumps(results, indent=2).encode()),
            media_type="application/json",
            headers={"Content-Disposition": f"attachment; filename={filename}.json"},
        )
