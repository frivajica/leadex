# extractor.py - Background job runner for lead extraction
import asyncio
import threading
from typing import Optional, Callable, Awaitable
from datetime import datetime

from lib.google_places import GooglePlacesClient
from lib.filters import apply_all_filters
from lib.exporter import export_to_csv, export_to_markdown, export_to_json
from api_server.database import (
    get_job,
    update_job_status,
    create_result,
    get_active_api_key,
)


class LeadExtractorService:
    """Background service for running lead extraction jobs."""

    def __init__(self):
        self._running_jobs: dict[int, asyncio.Task] = {}
        self._job_cancellations: dict[int, Callable[[], None]] = {}

    async def _run_job(
        self,
        job_id: int,
        user_id: int,
        progress_callback: Optional[Callable[[str, int, int], Awaitable[None]]] = None,
    ):
        """Run a single job."""
        # Get job details
        job = get_job(job_id, user_id)
        if not job:
            return

        # Get user's API key
        api_key = get_active_api_key(user_id)
        if not api_key:
            update_job_status(
                job_id,
                "failed",
                error_message="No API key configured. Please add your Google Maps API key in settings."
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
                use_quality_filters=bool(job["use_quality_filters"]),
                min_rating=job["min_rating"],
                min_reviews=job["min_reviews"],
                min_photos=job["min_photos"],
                sort_by=job["sort_by"],
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
