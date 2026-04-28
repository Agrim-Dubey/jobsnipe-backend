"""
Job service — handles storing scraped jobs and querying them.
"""
from datetime import datetime, timezone

from sqlalchemy import func, desc
from fastapi import HTTPException
from sqlalchemy.orm import Session
from fastapi_app.models.job import Job
from fastapi_app.scraper.base import (
    ScrapedJob,
    looks_like_career_page,
    looks_like_job_title,
    looks_like_job_url,
    looks_like_noise,
    matches_any_skill,
    salary_meets_minimum,
)
from typing import List, Optional


def store_scraped_jobs(db: Session, user_id: int, scraped_jobs: List[ScrapedJob]) -> int:
    """
    Store scraped jobs in DB, skipping duplicates (same user + same URL).
    Returns count of newly inserted jobs.
    """
    new_count = 0
    for sj in scraped_jobs:
        exists = db.query(Job).filter(
            Job.user_id == user_id,
            Job.job_url == sj.job_url
        ).first()
        if exists:
            changed = False
            for field in ("title", "company", "location", "salary", "source"):
                incoming = getattr(sj, field, None)
                current = getattr(exists, field, None)
                if incoming and (not current or len(str(incoming)) > len(str(current))):
                    setattr(exists, field, incoming)
                    changed = True

            if sj.description and (not exists.description or len(sj.description) > len(exists.description)):
                exists.description = sj.description
                changed = True

            if sj.emails:
                merged_emails = sorted({*(exists.emails or []), *sj.emails})
                if merged_emails != (exists.emails or []):
                    exists.emails = merged_emails
                    changed = True

            exists.scraped_at = datetime.now(timezone.utc)
            changed = True

            if changed:
                db.add(exists)
            continue

        job = Job(
            user_id=user_id,
            title=sj.title,
            company=sj.company,
            location=sj.location,
            job_url=sj.job_url,
            description=sj.description,
            salary=sj.salary,
            source=sj.source,
            emails=sj.emails,
        )
        db.add(job)
        new_count += 1

    db.commit()
    return new_count


def get_jobs_by_urls(db: Session, user_id: int, job_urls: List[str]) -> List[Job]:
    """Return stored jobs for the provided URLs in the same order."""
    if not job_urls:
        return []

    unique_urls = list(dict.fromkeys(job_urls))
    jobs = db.query(Job).filter(
        Job.user_id == user_id,
        Job.job_url.in_(unique_urls),
    ).all()
    by_url = {job.job_url: job for job in jobs}
    return [by_url[url] for url in unique_urls if url in by_url]


def get_jobs(
    db: Session,
    user_id: int,
    source: Optional[str] = None,
    is_saved: Optional[bool] = None,
    is_seen: Optional[bool] = None,
    search: Optional[str] = None,
    skills: Optional[str] = None,
    has_salary: Optional[bool] = None,
    has_emails: Optional[bool] = None,
    min_salary: Optional[int] = None,
    skip: int = 0,
    limit: int = 50,
) -> List[Job]:
    """Query jobs with optional filters."""
    query = db.query(Job).filter(Job.user_id == user_id)

    if source:
        query = query.filter(func.lower(Job.source).like(f"{source.lower()}%"))
    if is_saved is not None:
        query = query.filter(Job.is_saved == is_saved)
    if is_seen is not None:
        query = query.filter(Job.is_seen == is_seen)
    if search:
        search_filter = f"%{search.lower()}%"
        query = query.filter(
            (func.lower(Job.title).like(search_filter)) |
            (func.lower(Job.company).like(search_filter)) |
            (func.lower(Job.location).like(search_filter)) |
            (func.lower(Job.description).like(search_filter))
        )

    jobs = query.order_by(desc(Job.scraped_at)).all()

    requested_skills = [item.strip() for item in (skills or "").split(",") if item.strip()]
    filtered_jobs: List[Job] = []
    for job in jobs:
        source_key = (job.source or "").split(":")[0].split("/")[0]
        if looks_like_noise(job.title or "", job.description or "", job.job_url or ""):
            continue
        if source_key not in {"hn_hiring", "reddit"} and looks_like_career_page(job.job_url or ""):
            continue
        if source_key not in {"hn_hiring", "reddit"} and not any([job.company, job.salary, looks_like_job_url(job.job_url or "")]):
            continue
        if source_key not in {"hn_hiring", "reddit"} and not looks_like_job_title(job.title or ""):
            continue

        blob = " ".join(
            part for part in [job.title, job.company, job.location, job.description, job.salary, job.job_url]
            if part
        )
        if requested_skills and not matches_any_skill(requested_skills, blob):
            continue
        if has_salary is not None and bool(job.salary) != has_salary:
            continue
        if has_emails is not None and bool(job.emails) != has_emails:
            continue
        if min_salary is not None and not salary_meets_minimum(job.salary, min_salary):
            continue
        filtered_jobs.append(job)

    return filtered_jobs[skip: skip + limit]


def update_job(db: Session, user_id: int, job_id: int, is_seen: Optional[bool] = None, is_saved: Optional[bool] = None) -> Job:
    """Update job flags (seen/saved)."""
    job = db.query(Job).filter(Job.id == job_id, Job.user_id == user_id).first()
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")

    if is_seen is not None:
        job.is_seen = is_seen
    if is_saved is not None:
        job.is_saved = is_saved

    db.commit()
    db.refresh(job)
    return job


def get_job_stats(db: Session, user_id: int) -> dict:
    """Get aggregate job stats for a user."""
    total = db.query(func.count(Job.id)).filter(Job.user_id == user_id).scalar()
    unseen = db.query(func.count(Job.id)).filter(Job.user_id == user_id, Job.is_seen == False).scalar()
    saved = db.query(func.count(Job.id)).filter(Job.user_id == user_id, Job.is_saved == True).scalar()

    # By source
    source_counts = db.query(Job.source, func.count(Job.id)).filter(
        Job.user_id == user_id
    ).group_by(Job.source).all()

    return {
        "total_jobs": total or 0,
        "total_unseen": unseen or 0,
        "total_saved": saved or 0,
        "by_source": {source: count for source, count in source_counts},
    }


def delete_all_jobs(db: Session, user_id: int) -> int:
    """Delete all jobs for a user. Returns count deleted."""
    count = db.query(Job).filter(Job.user_id == user_id).delete()
    db.commit()
    return count
