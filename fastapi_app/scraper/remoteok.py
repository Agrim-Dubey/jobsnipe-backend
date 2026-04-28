"""
RemoteOK.com scraper — public JSON API. Extracts emails from descriptions.
"""
import logging
from typing import List
from fastapi_app.scraper.base import (
    ScrapedJob,
    clean_html_text,
    extract_emails,
    get_async_client,
    matches_query_text,
)

logger = logging.getLogger("jobsnipe.scraper.remoteok")

REMOTEOK_API = "https://remoteok.com/api"


async def scrape_remoteok(role: str, location: str = "", max_results: int = 30) -> List[ScrapedJob]:
    """Fetch jobs from RemoteOK's public JSON API."""
    jobs: List[ScrapedJob] = []

    try:
        async with get_async_client() as client:
            resp = await client.get(REMOTEOK_API)
            resp.raise_for_status()
            data = resp.json()

            listings = data[1:] if len(data) > 1 else []
            count = 0
            for listing in listings:
                if count >= max_results:
                    break

                position = listing.get("position", "")
                company = listing.get("company", "")
                tags = listing.get("tags", [])
                description = listing.get("description", "")
                slug = listing.get("slug", "")
                salary_min = listing.get("salary_min")
                salary_max = listing.get("salary_max")

                searchable = f"{position} {' '.join(tags)} {description}"
                if not matches_query_text(role, searchable):
                    continue

                salary = None
                if salary_min and salary_max:
                    salary = f"${salary_min:,} - ${salary_max:,}"
                elif salary_min:
                    salary = f"${salary_min:,}+"

                clean_desc = clean_html_text(description, 700)

                # Extract emails from description
                emails = extract_emails(description) if description else []

                jobs.append(ScrapedJob(
                    title=position,
                    company=company if company else None,
                    location="Remote",
                    description=clean_desc[:500] if clean_desc else None,
                    salary=salary,
                    job_url=f"https://remoteok.com/remote-jobs/{slug}" if slug else "https://remoteok.com",
                    source="remoteok",
                    emails=emails,
                ))
                count += 1

    except Exception as e:
        logger.error(f"RemoteOK scraper error: {e}")

    return jobs
