"""
Y Combinator / Work at a Startup scraper.
Uses the public Work at a Startup pages and embedded payloads instead of scraping loose anchors.
"""
import asyncio
import html
import json
import logging
import re
import urllib.parse
from typing import Any, Optional

from fastapi_app.scraper.base import (
    ENGINEERING_FAMILY_TOKENS,
    ScrapedJob,
    clean_html_text,
    extract_emails,
    get_async_client,
    matches_query_text,
    normalize_whitespace,
    tokenize_query,
)

logger = logging.getLogger("jobsnipe.scraper.yc")

WAAS_BASE = "https://www.workatastartup.com"
MAX_DETAIL_FETCHES = 10
MAX_COMPANY_FETCHES = 6


def _extract_data_page_payload(markup: str) -> Optional[dict]:
    match = re.search(r'data-page="([^"]+)"', markup)
    if not match:
        return None
    try:
        return json.loads(html.unescape(match.group(1)))
    except Exception:
        return None


def _detail_url(job_id: Any) -> Optional[str]:
    if not job_id:
        return None
    return f"{WAAS_BASE}/jobs/{job_id}"


def _company_url(slug: str) -> str:
    return f"{WAAS_BASE}/companies/{slug}"


def _build_search_query(role: str) -> str:
    specific_tokens = [
        token for token in tokenize_query(role)
        if token not in ENGINEERING_FAMILY_TOKENS
    ]
    if not specific_tokens:
        return role
    return " ".join(specific_tokens)


def _build_search_blob(job_data: dict, company_data: Optional[dict] = None) -> str:
    company_data = company_data or {}
    parts: list[str] = [
        job_data.get("title") or "",
        job_data.get("roleType") or "",
        job_data.get("location") or "",
        job_data.get("jobType") or "",
        job_data.get("salary") or job_data.get("salaryRange") or "",
        " ".join(job_data.get("skills") or []),
        company_data.get("name") or job_data.get("companyName") or "",
        company_data.get("description") or job_data.get("companyOneLiner") or "",
        company_data.get("industry") or "",
        company_data.get("location") or "",
    ]
    return normalize_whitespace(" ".join(part for part in parts if part))


def _matches_role_and_location(
    role: str,
    location: str,
    job_data: dict,
    company_data: Optional[dict] = None,
) -> bool:
    blob = _build_search_blob(job_data, company_data)
    if not matches_query_text(role, blob):
        return False
    return _matches_location(location, job_data, company_data)


def _matches_location(
    location: str,
    job_data: dict,
    company_data: Optional[dict] = None,
) -> bool:
    if location:
        location_blob = normalize_whitespace(
            f"{job_data.get('location') or ''} {(company_data or {}).get('location') or ''}"
        )
        if "remote" in location.lower():
            return "remote" in location_blob.lower()
        return matches_query_text(location, location_blob)
    return True


def _compose_description(job_data: dict, company_data: Optional[dict] = None) -> Optional[str]:
    company_data = company_data or {}
    description = clean_html_text(job_data.get("descriptionHtml") or "", 1000)
    if description:
        return description

    fragments: list[str] = []
    if company_data.get("description"):
        fragments.append(str(company_data["description"]))
    if job_data.get("roleType"):
        fragments.append(f"Role area: {job_data['roleType']}")
    if job_data.get("minExperience"):
        fragments.append(f"Minimum experience: {job_data['minExperience']}")
    skills = [normalize_whitespace(skill) for skill in (job_data.get("skills") or []) if skill]
    if skills:
        fragments.append(f"Skills: {', '.join(skills[:8])}")
    if job_data.get("sponsorsVisa"):
        fragments.append("Visa sponsorship available.")
    if company_data.get("hiringDescriptionHtml"):
        fragments.append(clean_html_text(company_data["hiringDescriptionHtml"], 500) or "")

    combined = normalize_whitespace(" ".join(fragment for fragment in fragments if fragment))
    return combined[:1000] if combined else None


def _build_emails(job_data: dict, company_data: Optional[dict] = None) -> list[str]:
    company_data = company_data or {}
    blob = " ".join(
        value
        for value in [
            job_data.get("descriptionHtml") or "",
            company_data.get("description") or "",
            company_data.get("hiringDescriptionHtml") or "",
            company_data.get("techDescriptionHtml") or "",
            company_data.get("url") or "",
        ]
        if value
    )
    return extract_emails(blob)


def _job_from_payload(job_data: dict, company_data: Optional[dict] = None) -> Optional[ScrapedJob]:
    company_data = company_data or {}
    title = normalize_whitespace(job_data.get("title") or "")
    job_url = _detail_url(job_data.get("id"))
    if not title or not job_url:
        return None

    company = normalize_whitespace(company_data.get("name") or job_data.get("companyName") or "") or None
    location = normalize_whitespace(job_data.get("location") or company_data.get("location") or "") or None
    salary = normalize_whitespace(job_data.get("salary") or job_data.get("salaryRange") or "") or None
    description = _compose_description(job_data, company_data)
    emails = _build_emails(job_data, company_data)

    return ScrapedJob(
        title=title[:200],
        company=company,
        location=location,
        description=description,
        salary=salary,
        job_url=job_url,
        source="yc_startups",
        emails=emails,
    )


async def scrape_yc_startups(role: str, location: str = "", max_results: int = 30) -> list[ScrapedJob]:
    """Scrape YC's public Work at a Startup search, company pages, and job detail pages."""
    jobs: list[ScrapedJob] = []
    jobs_by_url: dict[str, ScrapedJob] = {}

    params = {"query": _build_search_query(role)}
    if location:
        params["location"] = location
    search_url = f"{WAAS_BASE}/jobs?{urllib.parse.urlencode(params)}"

    try:
        async with get_async_client() as client:
            search_response = await client.get(search_url)
            search_response.raise_for_status()
            payload = _extract_data_page_payload(search_response.text)
            if not payload:
                return jobs

            search_jobs = payload.get("props", {}).get("jobs", [])
            matched_company_slugs: list[str] = []
            detail_ids: list[Any] = []

            for item in search_jobs:
                if not _matches_location(location, item):
                    continue

                detail_ids.append(item.get("id"))
                company_slug = item.get("companySlug")
                if company_slug and company_slug not in matched_company_slugs:
                    matched_company_slugs.append(company_slug)
                if _matches_role_and_location(role, location, item):
                    candidate = _job_from_payload(item)
                    if candidate:
                        jobs_by_url[candidate.job_url] = candidate
                if len(detail_ids) >= max(MAX_DETAIL_FETCHES, max_results):
                    break

            detail_tasks = [
                client.get(_detail_url(job_id))
                for job_id in detail_ids[: min(MAX_DETAIL_FETCHES, max_results)]
                if _detail_url(job_id)
            ]
            if detail_tasks:
                detail_responses = await asyncio.gather(*detail_tasks, return_exceptions=True)
                for response in detail_responses:
                    if isinstance(response, Exception) or getattr(response, "status_code", 0) != 200:
                        continue
                    detail_payload = _extract_data_page_payload(response.text)
                    if not detail_payload:
                        continue
                    job_data = detail_payload.get("props", {}).get("job", {})
                    company_data = detail_payload.get("props", {}).get("company", {})
                    if not _matches_role_and_location(role, location, job_data, company_data):
                        continue
                    candidate = _job_from_payload(job_data, company_data)
                    if candidate:
                        jobs_by_url[candidate.job_url] = candidate

            company_tasks = [
                client.get(_company_url(slug))
                for slug in matched_company_slugs[:MAX_COMPANY_FETCHES]
            ]
            if company_tasks and len(jobs_by_url) < max_results:
                company_responses = await asyncio.gather(*company_tasks, return_exceptions=True)
                for response in company_responses:
                    if isinstance(response, Exception) or getattr(response, "status_code", 0) != 200:
                        continue
                    company_payload = _extract_data_page_payload(response.text)
                    if not company_payload:
                        continue
                    company_data = company_payload.get("props", {}).get("company", {})
                    for company_job in company_data.get("jobs", []):
                        if not _matches_role_and_location(role, location, company_job, company_data):
                            continue
                        candidate = _job_from_payload(company_job, company_data)
                        if not candidate:
                            continue
                        jobs_by_url[candidate.job_url] = candidate
                        if len(jobs_by_url) >= max_results:
                            break
                    if len(jobs_by_url) >= max_results:
                        break

    except Exception as exc:
        logger.error(f"YC startups scraper error: {exc}")

    jobs = list(jobs_by_url.values())
    return jobs[:max_results]
