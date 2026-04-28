from pydantic import BaseModel, ConfigDict
from typing import List, Optional
from datetime import datetime


class JobResponse(BaseModel):
    id: int
    user_id: int
    title: str
    company: Optional[str] = None
    location: Optional[str] = None
    job_url: str
    description: Optional[str] = None
    salary: Optional[str] = None
    emails: Optional[List[str]] = None
    source: str
    scraped_at: datetime
    is_seen: bool
    is_saved: bool

    model_config = ConfigDict(from_attributes=True)


class JobUpdate(BaseModel):
    is_seen: Optional[bool] = None
    is_saved: Optional[bool] = None


class ScrapeRequest(BaseModel):
    """Request body to trigger a scrape."""
    roles: Optional[List[str]] = None
    locations: Optional[List[str]] = None
    sources: Optional[List[str]] = None
    custom_urls: Optional[List[str]] = None
    skills: Optional[List[str]] = None
    min_salary: Optional[int] = None
    job_type: Optional[str] = None


class ScrapeResponse(BaseModel):
    """Response from a scrape operation."""
    total_found: int
    total_new: int
    stats: dict
    errors: List[str]
    jobs: List[JobResponse]


class JobStatsResponse(BaseModel):
    total_jobs: int
    total_unseen: int
    total_saved: int
    by_source: dict
