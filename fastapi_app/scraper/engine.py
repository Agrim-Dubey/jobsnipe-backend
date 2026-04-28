"""
Orchestrator for scraping, enrichment, validation, and deduplication.
"""
import asyncio
import logging
from typing import List, Optional
from urllib.parse import parse_qsl, urlencode, urlsplit, urlunsplit

from fastapi_app.scraper.arbeitnow import scrape_arbeitnow
from fastapi_app.scraper.base import (
    ScrapedJob,
    clean_html_text,
    extract_emails,
    extract_job_page_details,
    get_async_client,
    job_type_matches,
    looks_like_career_page,
    looks_like_job_title,
    looks_like_job_url,
    looks_like_noise,
    matches_any_skill,
    matches_query_text,
    normalize_for_match,
    normalize_whitespace,
    salary_meets_minimum,
    split_detail_title,
)
from fastapi_app.scraper.generic import scrape_generic_url
from fastapi_app.scraper.hn_hiring import scrape_hn_hiring
from fastapi_app.scraper.reddit import scrape_reddit
from fastapi_app.scraper.remoteok import scrape_remoteok
from fastapi_app.scraper.search import scrape_google_jobs
from fastapi_app.scraper.wellfound import scrape_wellfound
from fastapi_app.scraper.yc_startups import scrape_yc_startups

logger = logging.getLogger("jobsnipe.scraper.engine")

AVAILABLE_SOURCES = {
    "hn_hiring": {"name": "Hacker News", "icon": "HN", "description": "Who is Hiring threads"},
    "reddit": {"name": "Reddit", "icon": "RD", "description": "Strict job-posting subreddits"},
    "remoteok": {"name": "RemoteOK", "icon": "RO", "description": "Remote job listings"},
    "arbeitnow": {"name": "Arbeitnow", "icon": "AN", "description": "Global job board API"},
    "google_discovery": {"name": "Google Discovery", "icon": "GD", "description": "ATS and career-page discovery"},
    "wellfound": {"name": "Wellfound", "icon": "WF", "description": "Startup jobs"},
    "yc_startups": {"name": "YC Startups", "icon": "YC", "description": "Work at a Startup and YC jobs"},
}

SCRAPER_MAP = {
    "hn_hiring": scrape_hn_hiring,
    "reddit": scrape_reddit,
    "remoteok": scrape_remoteok,
    "arbeitnow": scrape_arbeitnow,
    "google_discovery": scrape_google_jobs,
    "wellfound": scrape_wellfound,
    "yc_startups": scrape_yc_startups,
}

WEAK_SOURCES = {"google_discovery", "wellfound", "yc_startups", "custom"}
COMMUNITY_SOURCES = ("hn_hiring", "reddit")
ENRICHMENT_LIMIT = 60
ENRICHMENT_CONCURRENCY = 8

REMOTE_STRONG_HINTS = (
    "100 remote",
    "fully remote",
    "remote first",
    "remote-first",
    "remote only",
    "remote worldwide",
    "worldwide remote",
    "distributed",
    "work from home",
)

REMOTE_WEAK_OR_TEMPORARY_HINTS = (
    "remote until",
    "remote during",
    "partial remote",
    "onsite remote",
    "onsite/remote",
    "on site remote",
    "hybrid",
)


def _source_key(source: str) -> str:
    return (source or "").split(":")[0].split("/")[0]


def _is_community_source(source: str) -> bool:
    return source.startswith(COMMUNITY_SOURCES)


def _normalize_job(job: ScrapedJob) -> ScrapedJob:
    job.title = split_detail_title(job.title)
    job.company = normalize_whitespace(job.company) or None
    job.location = normalize_whitespace(job.location) or None
    job.description = clean_html_text(job.description, 1000)
    job.salary = normalize_whitespace(job.salary) or None
    merged_emails = sorted({email.lower() for email in (job.emails or [])})
    job.emails = merged_emails
    return job


def _job_blob(job: ScrapedJob) -> str:
    return " ".join(
        part for part in [
            job.title,
            job.company,
            job.location,
            job.description,
            job.salary,
            job.source,
            job.job_url,
        ]
        if part
    )


def _job_score(job: ScrapedJob, is_job_posting: bool = False) -> int:
    return sum(
        [
            2 if is_job_posting else 0,
            1 if job.title else 0,
            1 if job.company else 0,
            1 if job.location else 0,
            1 if job.description else 0,
            1 if job.salary else 0,
            1 if job.emails else 0,
            1 if looks_like_job_url(job.job_url) else 0,
        ]
    )


def _prefer_job(current: ScrapedJob, incoming: ScrapedJob, current_signal: bool, incoming_signal: bool) -> ScrapedJob:
    if _job_score(incoming, incoming_signal) > _job_score(current, current_signal):
        return incoming
    return current


def _normalize_url(url: str) -> str:
    split = urlsplit(url)
    query = [
        (key, value)
        for key, value in parse_qsl(split.query, keep_blank_values=True)
        if not key.startswith("utm_") and key not in {"ref", "source", "gh_src"}
    ]
    path = split.path.rstrip("/")
    return urlunsplit((split.scheme.lower(), split.netloc.lower(), path, urlencode(query), ""))


def _fallback_key(job: ScrapedJob) -> Optional[str]:
    if not job.title:
        return None
    parts = [
        split_detail_title(job.title).lower(),
        (job.company or "").lower(),
        (job.location or "").lower(),
    ]
    if not parts[0]:
        return None
    return "|".join(parts)


def _merge_details(job: ScrapedJob, details: dict) -> None:
    if details.get("title") and (not job.title or looks_like_noise(job.title, job.description or "", job.job_url)):
        job.title = split_detail_title(details["title"])
    if details.get("company") and not job.company:
        job.company = normalize_whitespace(details["company"])
    if details.get("location") and not job.location:
        job.location = normalize_whitespace(details["location"])
    if details.get("description") and (not job.description or len(job.description) < 160):
        job.description = clean_html_text(details["description"], 1000)
    if details.get("salary") and not job.salary:
        job.salary = normalize_whitespace(details["salary"])
    combined_emails = set(job.emails or [])
    combined_emails.update(details.get("emails") or [])
    job.emails = sorted(combined_emails)


async def _enrich_job_page(
    client,
    semaphore: asyncio.Semaphore,
    job: ScrapedJob,
    page_signals: dict[str, bool],
) -> None:
    async with semaphore:
        try:
            response = await client.get(job.job_url)
            if response.status_code != 200:
                page_signals[job.job_url] = False
                return

            details = extract_job_page_details(response.text, job.job_url)
            if not details.get("emails") and response.text:
                details["emails"] = extract_emails(response.text)
            _merge_details(job, details)
            page_signals[job.job_url] = bool(details.get("is_job_posting"))
        except Exception as exc:
            logger.debug("Job page enrichment failed for %s: %s", job.job_url, exc)
            page_signals[job.job_url] = False


def _needs_enrichment(job: ScrapedJob) -> bool:
    source = _source_key(job.source)
    if _is_community_source(job.source):
        return not job.emails
    return (
        source in WEAK_SOURCES
        or not job.company
        or not job.description
        or not job.salary
        or not looks_like_job_url(job.job_url)
    )


def _matches_remote_location(text: str) -> bool:
    normalized = normalize_for_match(text)
    if "remote" not in normalized:
        return False
    if any(hint in normalized for hint in REMOTE_WEAK_OR_TEMPORARY_HINTS):
        return False
    if any(marker in normalized for marker in ("onsite", "on site", "office")) and not any(
        hint in normalized for hint in REMOTE_STRONG_HINTS
    ):
        return False
    return True


def _passes_quality_gate(
    job: ScrapedJob,
    role: str,
    location: str,
    skills: List[str],
    min_salary: Optional[int],
    job_type: Optional[str],
    page_signal: bool,
) -> bool:
    blob = _job_blob(job)
    source = _source_key(job.source)

    if looks_like_noise(job.title, job.description or "", job.job_url):
        return False
    if not matches_query_text(role, blob):
        return False
    if skills and not matches_any_skill(skills, blob):
        return False
    if location:
        location_blob = f"{job.location or ''} {job.description or ''}"
        if "remote" in location.lower():
            if not _matches_remote_location(location_blob):
                return False
        elif not matches_query_text(location, location_blob):
            return False
    if not job_type_matches(job_type, blob):
        return False
    if not salary_meets_minimum(job.salary, min_salary, allow_missing=True):
        return False

    if source not in {"hn_hiring", "reddit"} and looks_like_career_page(job.job_url) and not page_signal:
        return False

    if source not in {"hn_hiring", "reddit"} and not page_signal and not looks_like_job_url(job.job_url):
        return False

    # Non-community jobs should have at least some real structure after enrichment.
    if source not in {"hn_hiring", "reddit"} and not any([job.company, job.salary, page_signal]):
        return False

    if source not in {"hn_hiring", "reddit"} and not page_signal and not looks_like_job_title(job.title):
        return False

    return True


def _dedupe_jobs(jobs: List[ScrapedJob], page_signals: dict[str, bool]) -> List[ScrapedJob]:
    by_url: dict[str, ScrapedJob] = {}
    by_url_signal: dict[str, bool] = {}
    fallback_to_url: dict[str, str] = {}

    for job in jobs:
        normalized_url = _normalize_url(job.job_url)
        signal = page_signals.get(job.job_url, False)

        existing = by_url.get(normalized_url)
        if existing:
            by_url[normalized_url] = _prefer_job(existing, job, by_url_signal.get(normalized_url, False), signal)
            by_url_signal[normalized_url] = by_url_signal.get(normalized_url, False) or signal
            continue

        fallback_key = _fallback_key(job)
        if fallback_key and not _is_community_source(job.source):
            prior_url = fallback_to_url.get(fallback_key)
            if prior_url:
                prior_job = by_url[prior_url]
                chosen = _prefer_job(prior_job, job, by_url_signal.get(prior_url, False), signal)
                by_url[prior_url] = chosen
                by_url_signal[prior_url] = by_url_signal.get(prior_url, False) or signal
                continue
            fallback_to_url[fallback_key] = normalized_url

        by_url[normalized_url] = job
        by_url_signal[normalized_url] = signal

    return list(by_url.values())


async def run_scrape(
    roles: List[str],
    locations: List[str],
    sources: Optional[List[str]] = None,
    custom_urls: Optional[List[str]] = None,
    skills: Optional[List[str]] = None,
    min_salary: Optional[int] = None,
    job_type: Optional[str] = None,
) -> dict:
    """Run all scrapers, enrich weaker sources, then return only curated job openings."""
    stats: dict[str, dict[str, int]] = {}
    errors: List[str] = []
    curated_jobs: List[ScrapedJob] = []
    selected_skills = [normalize_whitespace(skill) for skill in (skills or []) if skill]

    active_sources = sources or list(AVAILABLE_SOURCES.keys())
    if not locations:
        locations = [""]

    tasks = []
    for role in roles:
        for location in locations:
            for src in active_sources:
                if src in SCRAPER_MAP:
                    tasks.append((src, role, location, SCRAPER_MAP[src](role, location)))

    if custom_urls:
        for url in custom_urls:
            for role in roles:
                tasks.append(("custom", role, locations[0] if locations else "", scrape_generic_url(url, role, locations[0] if locations else "")))

    results = await asyncio.gather(*[task for _, _, _, task in tasks], return_exceptions=True)

    raw_jobs: List[tuple[ScrapedJob, str, str]] = []
    for (source_name, role, location, _), result in zip(tasks, results):
        if isinstance(result, Exception):
            errors.append(f"{source_name}: {str(result)}")
            continue
        if isinstance(result, list):
            stats.setdefault(source_name, {"raw": 0, "kept": 0})
            stats[source_name]["raw"] += len(result)
            for job in result:
                raw_jobs.append((_normalize_job(job), role, location))

    page_signals: dict[str, bool] = {}
    enrich_candidates = [job for job, _, _ in raw_jobs if _needs_enrichment(job)][:ENRICHMENT_LIMIT]
    if enrich_candidates:
        async with get_async_client() as client:
            semaphore = asyncio.Semaphore(ENRICHMENT_CONCURRENCY)
            await asyncio.gather(
                *[_enrich_job_page(client, semaphore, job, page_signals) for job in enrich_candidates],
                return_exceptions=True,
            )

    for job, role, location in raw_jobs:
        if job.description:
            combined_emails = set(job.emails)
            combined_emails.update(extract_emails(job.description))
            job.emails = sorted(combined_emails)

        job = _normalize_job(job)
        if _passes_quality_gate(
            job,
            role=role,
            location=location,
            skills=selected_skills,
            min_salary=min_salary,
            job_type=job_type,
            page_signal=page_signals.get(job.job_url, False),
        ):
            curated_jobs.append(job)

    unique_jobs = _dedupe_jobs(curated_jobs, page_signals)
    for job in unique_jobs:
        source_name = _source_key(job.source)
        stats.setdefault(source_name, {"raw": 0, "kept": 0})
        stats[source_name]["kept"] += 1

    return {
        "jobs": unique_jobs,
        "stats": stats,
        "errors": errors,
        "total": len(unique_jobs),
    }
