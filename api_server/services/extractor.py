# extractor.py - Background job runner for lead extraction
import asyncio
import os
import threading
from typing import Optional, Callable, Awaitable
from datetime import datetime

from lib.google_places import GooglePlacesClient
from lib.filters import apply_all_filters
from lib.exporter import export_to_csv, export_to_markdown, export_to_json
from api_server.database import (
    get_job,
    get_user_by_id,
    update_job_status,
    create_result,
    get_active_api_key,
)

GOOGLE_PLACES_API_KEY = os.getenv("GOOGLE_PLACES_API_KEY", "")


class LeadExtractorService:
    """Background service for running lead extraction jobs."""

    def __init__(self):
        self._running_jobs: dict[int, asyncio.Task] = {}
        self._job_cancellations: dict[int, Callable[[], None]] = {}

    def _resolve_api_key(self, user_id: int) -> Optional[str]:
        """Resolve the API key to use: user's own key first, then platform key for paid users."""
        user_key = get_active_api_key(user_id)
        if user_key:
            return user_key

        user = get_user_by_id(user_id)
        if not user:
            return None

        tier = user.get("subscription_tier", "free")
        credits = user.get("job_credits", 0)
        expires_at_str = user.get("subscription_expires_at")

        has_paid_access = False
        if tier in ["week", "month"] and expires_at_str:
            expires_at = datetime.fromisoformat(expires_at_str)
            if expires_at > datetime.utcnow():
                has_paid_access = True
        if credits > 0:
            has_paid_access = True

        if has_paid_access and GOOGLE_PLACES_API_KEY:
            return GOOGLE_PLACES_API_KEY

        return None

    async def _run_job(
        self,
        job_id: int,
        user_id: int,
        progress_callback: Optional[Callable[[str, int, int], Awaitable[None]]] = None,
    ):
        """Run a single job."""
        job = get_job(job_id, user_id)
        if not job:
            return

        api_key = self._resolve_api_key(user_id)
        if not api_key:
            update_job_status(
                job_id,
                "failed",
                error_message="No API key available. Add your own Google Maps API key in settings, or purchase a managed plan."
            )
            return

        try:
            update_job_status(job_id, "running", progress=0)

            # Initialize client
            client = GooglePlacesClient(
                api_key=api_key,
                verbose=False,
                enable_rate_limit=True,
                progress_callback=progress_callback,
            )

            # Get categories
            categories = job.get("categories") or ["restaurant", "plumber", "electrician"]

            # Run extraction
            businesses = await client.search_multiple_categories(
                lat=job["center_lat"],
                lng=job["center_lng"],
                categories=categories,
                radius=job["radius"],
                max_parallel=10,
            )

            update_job_status(
                job_id,
                "running",
                progress=50,
                total_businesses=len(businesses),
            )

            # Apply filters
            leads = apply_all_filters(
                businesses,
                require_no_website=bool(job.get("require_no_website")),
                require_no_social=bool(job.get("require_no_social")),
                require_phone=bool(job.get("require_phone")),
                require_address=bool(job.get("require_address")),
                min_rating=job.get("min_rating"),
                min_reviews=job.get("min_reviews"),
                min_photos=job.get("min_photos"),
                sort_by=job.get("sort_by", "score"),
                center_lat=job["center_lat"],
                center_lng=job["center_lng"],
            )

            update_job_status(
                job_id,
                "running",
                progress=80,
                leads_found=len(leads),
            )

            # Save results
            create_result(job_id, leads)

            # Export to files (optional - for file downloads)
            export_to_csv(leads, f"job_{job_id}")
            export_to_markdown(leads, f"job_{job_id}", job["center_lat"], job["center_lng"])
            export_to_json(leads)

            # Mark as completed
            update_job_status(job_id, "completed", progress=100, leads_found=len(leads))

        except Exception as e:
            update_job_status(job_id, "failed", error_message=str(e))

    async def _progress_handler(self, job_id: int, category: str, completed: int, total: int):
        """Handle progress updates."""
        progress = int((completed / total) * 50) if total > 0 else 0
        update_job_status(job_id, "running", progress=progress)

    def run_job(self, job_id: int, user_id: int):
        """Run a job in the background."""
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)

        async def run():
            await self._run_job(
                job_id,
                user_id,
                lambda cat, c, t: self._progress_handler(job_id, cat, c, t),
            )

        task = loop.create_task(run())
        self._running_jobs[job_id] = task

        def done_callback(t):
            if job_id in self._running_jobs:
                del self._running_jobs[job_id]

        task.add_done_callback(done_callback)

        # Run the loop in a thread
        thread = threading.Thread(target=loop.run_forever, daemon=True)
        thread.start()

    def cancel_job(self, job_id: int) -> bool:
        """Cancel a running job."""
        if job_id in self._running_jobs:
            task = self._running_jobs[job_id]
            task.cancel()
            update_job_status(job_id, "cancelled")
            return True
        return False


# Global service instance
extractor_service = LeadExtractorService()
