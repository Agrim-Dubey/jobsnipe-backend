"""
Arbeitnow.com scraper — free public API with no auth.
Good source for tech jobs, especially in EU.
"""
import logging
from typing import List
from fastapi_app.scraper.base import ScrapedJob, clean_html_text, get_async_client, matches_query_text

logger = logging.getLogger("jobsnipe.scraper.arbeitnow")

ARBEITNOW_API = "https://www.arbeitnow.com/api/job-board-api"


async def scrape_arbeitnow(role: str, location: str = "", max_results: int = 30) -> List[ScrapedJob]:
    """Fetch jobs from Arbeitnow's free public API."""
    jobs: List[ScrapedJob] = []

    try:
        async with get_async_client() as client:
            resp = await client.get(ARBEITNOW_API)
            resp.raise_for_status()
            data = resp.json()

            listings = data.get("data", [])
            location_lower = location.lower() if location else ""

            count = 0
            for listing in listings:
                if count >= max_results:
                    break

                title = listing.get("title", "")
                company = listing.get("company_name", "")
                loc = listing.get("location", "")
                description = listing.get("description", "")
                url = listing.get("url", "")
                remote = listing.get("remote", False)
                tags = listing.get("tags", [])

                # Match against role
                searchable = f"{title} {' '.join(tags)} {description}"
                if not matches_query_text(role, searchable):
                    continue

                # Optional location filter
                if location_lower and location_lower not in loc.lower() and not remote:
                    continue

                clean_desc = clean_html_text(description, 700)

                display_loc = loc if loc else ("Remote" if remote else "Unknown")

                jobs.append(ScrapedJob(
                    title=title,
                    company=company if company else None,
                    location=display_loc,
                    description=clean_desc[:500] if clean_desc else None,
                    job_url=url,
                    source="arbeitnow",
                ))
                count += 1

    except Exception as e:
        logger.error(f"Arbeitnow scraper error: {e}")

    return jobs
