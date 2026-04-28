"""
Jobs router — scraping triggers, job listing, updates, stats.
"""
from datetime import datetime, timezone
from time import monotonic
from fastapi import APIRouter, Depends, HTTPException, Query
import httpx
from sqlalchemy.orm import Session
from typing import Optional, List

from fastapi_app.db.database import get_db
from fastapi_app.dependencies.auth import get_current_user
from fastapi_app.schemas.job import (
    JobResponse, JobUpdate, ScrapeRequest, ScrapeResponse, JobStatsResponse
)
from fastapi_app.services.job_service import (
    delete_all_jobs, get_job_stats, get_jobs, get_jobs_by_urls, store_scraped_jobs, update_job
)
from fastapi_app.services.preference_services import get_preference
from fastapi_app.scraper.engine import run_scrape, AVAILABLE_SOURCES

router = APIRouter()

FALLBACK_USD_TO_INR_RATE = 83.5
EXCHANGE_RATE_TTL_SECONDS = 60 * 60
_exchange_rate_cache = {
    "rate": None,
    "as_of": None,
    "updated_at": None,
    "expires_at": 0.0,
}


async def _fetch_usd_inr_rate() -> dict:
    now = monotonic()
    if (
        _exchange_rate_cache["rate"] is not None
        and _exchange_rate_cache["expires_at"] > now
    ):
        return {
            "base": "USD",
            "target": "INR",
            "rate": _exchange_rate_cache["rate"],
            "live": True,
            "as_of": _exchange_rate_cache["as_of"],
            "updated_at": _exchange_rate_cache["updated_at"],
        }

    try:
        async with httpx.AsyncClient(timeout=15.0) as client:
            response = await client.get(
                "https://api.frankfurter.dev/v1/latest",
                params={"base": "USD", "symbols": "INR"},
            )
            response.raise_for_status()
            payload = response.json()
            rate = payload.get("rates", {}).get("INR")
            if rate:
                updated_at = datetime.now(timezone.utc).isoformat()
                _exchange_rate_cache.update(
                    {
                        "rate": float(rate),
                        "as_of": payload.get("date"),
                        "updated_at": updated_at,
                        "expires_at": now + EXCHANGE_RATE_TTL_SECONDS,
                    }
                )
                return {
                    "base": "USD",
                    "target": "INR",
                    "rate": float(rate),
                    "live": True,
                    "as_of": payload.get("date"),
                    "updated_at": updated_at,
                }
    except Exception:
        pass

    fallback_rate = _exchange_rate_cache["rate"] or FALLBACK_USD_TO_INR_RATE
    return {
        "base": "USD",
        "target": "INR",
        "rate": fallback_rate,
        "live": False,
        "as_of": _exchange_rate_cache["as_of"],
        "updated_at": _exchange_rate_cache["updated_at"],
    }


@router.get("/sources")
def list_sources():
    """List all available scraping sources."""
    return AVAILABLE_SOURCES


@router.get("/exchange-rate")
async def exchange_rate():
    """Return the live USD/INR rate with a safe fallback."""
    return await _fetch_usd_inr_rate()


@router.post("/scrape", response_model=ScrapeResponse)
async def trigger_scrape(
    body: ScrapeRequest = None,
    user=Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Trigger a scrape. If roles/locations not provided, uses user preferences.
    """
    roles = []
    locations = []
    skills = []
    body_sent_skills = body is not None and body.skills is not None
    min_salary = body.min_salary if body else None
    job_type = body.job_type if body else None

    if body and body.roles:
        roles = body.roles
    if body and body.locations:
        locations = body.locations
    if body and body.skills is not None:
        skills = body.skills

    # Fall back to user preferences if not provided
    if not roles or not locations or min_salary is None or (not skills and not body_sent_skills):
        try:
            prefs = get_preference(db, user.id)
            if not roles:
                roles = prefs.desired_roles
            if not locations:
                locations = prefs.preferred_locations
            if not skills and not body_sent_skills:
                skills = prefs.skills
            if min_salary is None:
                min_salary = prefs.min_salary
        except HTTPException:
            pass

    if not roles:
        raise HTTPException(
            status_code=400,
            detail="No roles specified and no preferences found. Set preferences or provide roles."
        )

    sources = body.sources if body and body.sources else None
    custom_urls = body.custom_urls if body and body.custom_urls else None

    # Run the scrape
    result = await run_scrape(
        roles=roles,
        locations=locations,
        sources=sources,
        custom_urls=custom_urls,
        skills=skills,
        min_salary=min_salary,
        job_type=job_type,
    )

    # Store results
    new_count = store_scraped_jobs(db, user.id, result["jobs"])
    stored_jobs = get_jobs_by_urls(db, user.id, [job.job_url for job in result["jobs"]])

    return ScrapeResponse(
        total_found=result["total"],
        total_new=new_count,
        stats=result["stats"],
        errors=result["errors"],
        jobs=stored_jobs,
    )


@router.get("", response_model=List[JobResponse])
def list_jobs(
    source: Optional[str] = Query(None),
    is_saved: Optional[bool] = Query(None),
    is_seen: Optional[bool] = Query(None),
    search: Optional[str] = Query(None),
    skills: Optional[str] = Query(None),
    has_salary: Optional[bool] = Query(None),
    has_emails: Optional[bool] = Query(None),
    min_salary: Optional[int] = Query(None, ge=0),
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=200),
    user=Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """List scraped jobs with optional filters."""
    return get_jobs(
        db,
        user.id,
        source,
        is_saved,
        is_seen,
        search,
        skills,
        has_salary,
        has_emails,
        min_salary,
        skip,
        limit,
    )


@router.patch("/{job_id}", response_model=JobResponse)
def patch_job(
    job_id: int,
    data: JobUpdate,
    user=Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Update a job (mark as seen/saved)."""
    return update_job(db, user.id, job_id, data.is_seen, data.is_saved)


@router.get("/stats", response_model=JobStatsResponse)
def job_stats(
    user=Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Get job stats for the current user."""
    return get_job_stats(db, user.id)


@router.delete("/all")
def clear_all_jobs(
    user=Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Delete all jobs for the current user."""
    count = delete_all_jobs(db, user.id)
    return {"deleted": count}
