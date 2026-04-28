"""
Hacker News 'Who is Hiring?' scraper via Algolia API.
Searches comments in Who is Hiring threads — rich source of emails.
"""
import logging
import re
from typing import List

from bs4 import BeautifulSoup

from fastapi_app.scraper.base import (
    ScrapedJob,
    clean_html_text,
    extract_emails,
    get_async_client,
    looks_like_job_title,
    matches_query_text,
    normalize_whitespace,
)

logger = logging.getLogger("jobsnipe.scraper.hn")

HN_API = "https://hn.algolia.com/api/v1/search"

LOCATION_HINTS = (
    "remote",
    "worldwide",
    "anywhere",
    "hybrid",
    "onsite",
    "timezone",
    "utc",
    "usa",
    "us only",
    "uk",
    "europe",
    "india",
    "canada",
    "singapore",
    "bangalore",
    "london",
    "berlin",
    "new york",
    "san francisco",
)


def _looks_like_location(segment: str, requested_location: str = "") -> bool:
    normalized = normalize_whitespace(segment).lower()
    if not normalized:
        return False
    if requested_location and requested_location.lower() in normalized:
        return True
    if any(hint in normalized for hint in LOCATION_HINTS):
        return True
    if re.search(r"\b(?:gmt|utc)[+-]?\d{0,2}\b", normalized):
        return True
    if "," in segment and re.search(r"\b[A-Z]{2,3}\b", segment):
        return True
    return False


def _pick_hn_fields(clean_desc: str, role: str, location: str) -> tuple[str | None, str, str]:
    lines = [
        normalize_whitespace(line)
        for line in clean_desc.splitlines()
        if normalize_whitespace(line)
    ]
    if not lines:
        return None, role, location or "Remote"

    first_line = lines[0]
    segments: List[str] = []
    for line in lines[:4]:
        for part in line.split("|"):
            cleaned = normalize_whitespace(part)
            if cleaned:
                segments.append(cleaned)

    company = segments[0][:80] if segments else None
    title = None
    loc = None

    if "|" not in first_line and " - " in first_line:
        dash_parts = [normalize_whitespace(part) for part in first_line.split(" - ") if normalize_whitespace(part)]
        if dash_parts:
            if _looks_like_location(dash_parts[0], location):
                loc = dash_parts[0][:80]
                if len(dash_parts) >= 2:
                    title = dash_parts[1][:120]
            elif looks_like_job_title(dash_parts[0]) or matches_query_text(role, dash_parts[0]):
                title = dash_parts[0][:120]

        for candidate in reversed(re.findall(r"\(([^()]+)\)", first_line)):
            cleaned = normalize_whitespace(candidate)
            if not cleaned:
                continue
            if _looks_like_location(cleaned, location) and "company" not in cleaned.lower():
                continue
            if looks_like_job_title(cleaned):
                continue
            company = cleaned[:80]
            break

    for segment in segments[1:]:
        if not title and (matches_query_text(role, segment) or looks_like_job_title(segment)):
            title = segment[:120]
            continue
        if not loc and _looks_like_location(segment, location):
            loc = segment[:80]

    if not title:
        for segment in segments:
            if segment == company:
                continue
            if matches_query_text(role, segment) or looks_like_job_title(segment):
                title = segment[:120]
                break

    if not title and first_line:
        title = first_line[:120]

    if not loc:
        for segment in segments[1:]:
            if "remote" in segment.lower():
                loc = segment[:80]
                break
    else:
        for segment in segments[1:]:
            if "remote" in segment.lower():
                loc = segment[:80]
                break

    return company, title or role, loc or (location or "Remote")


async def scrape_hn_hiring(role: str, location: str = "", max_results: int = 30) -> List[ScrapedJob]:
    """Search HN Who is Hiring threads for job posts matching role/location."""
    jobs: List[ScrapedJob] = []
    query_parts = [role]
    if location:
        query_parts.append(location)
    query = " ".join(query_parts)

    try:
        async with get_async_client() as client:
            # First find the latest "Who is hiring" thread
            story_params = {
                "query": "Ask HN: Who is hiring",
                "tags": "story,author_whoishiring",
                "hitsPerPage": 1,
            }
            story_resp = await client.get(HN_API, params=story_params)
            story_data = story_resp.json()
            story_hits = story_data.get("hits", [])

            # Search strategy: if we found the thread, search its comments
            # Otherwise fall back to searching all comments
            if story_hits:
                story_id = story_hits[0]["objectID"]
                params = {
                    "query": query,
                    "tags": f"comment,story_{story_id}",
                    "hitsPerPage": max_results,
                }
            else:
                # Fallback: search all comments mentioning hiring + role
                params = {
                    "query": f"{query} hiring",
                    "tags": "comment",
                    "hitsPerPage": max_results,
                }

            resp = await client.get(HN_API, params=params)
            resp.raise_for_status()
            data = resp.json()

            for hit in data.get("hits", []):
                comment_text = hit.get("comment_text", "")
                object_id = hit.get("objectID", "")

                if not comment_text:
                    continue

                clean_desc = BeautifulSoup(comment_text, "html.parser").get_text("\n")
                clean_desc = clean_html_text(clean_desc, 1000) or ""
                company, title_parsed, loc_parsed = _pick_hn_fields(clean_desc, role, location)

                # Extract emails from the full comment
                emails = extract_emails(clean_desc)

                jobs.append(ScrapedJob(
                    title=title_parsed,
                    company=company,
                    location=loc_parsed,
                    description=clean_desc[:500],
                    job_url=f"https://news.ycombinator.com/item?id={object_id}",
                    source="hn_hiring",
                    emails=emails,
                ))

    except Exception as e:
        logger.error(f"HN scraper error: {e}")

    return jobs
