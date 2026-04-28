"""
Generic web scraper — crawls any given URL and extracts job-related links.
Uses keyword matching on anchor text to identify job postings.
"""
import logging
from typing import List
from urllib.parse import urljoin
from fastapi_app.scraper.base import (
    ScrapedJob,
    extract_title_from_url,
    get_async_client,
    looks_like_job_url,
    looks_like_noise,
    matches_query_text,
)

logger = logging.getLogger("jobsnipe.scraper.generic")

JOB_KEYWORDS = [
    "apply", "job", "career", "hiring", "opening", "position", "role",
    "engineer", "developer", "designer", "manager", "analyst", "intern",
    "associate", "specialist", "consultant", "lead", "senior", "junior",
    "full-time", "part-time", "contract", "remote", "work with us",
]


async def scrape_generic_url(target_url: str, role: str = "", location: str = "", max_results: int = 30) -> List[ScrapedJob]:
    """
    Crawl any URL and extract links that look like job postings.
    Uses keyword matching on link text and URLs.
    """
    jobs: List[ScrapedJob] = []

    try:
        from bs4 import BeautifulSoup

        async with get_async_client() as client:
            resp = await client.get(target_url)
            resp.raise_for_status()
            soup = BeautifulSoup(resp.text, "html.parser")

            seen_urls = set()
            for a_tag in soup.find_all("a", href=True):
                if len(jobs) >= max_results:
                    break

                text = a_tag.get_text(strip=True)
                href = a_tag["href"]

                # Resolve relative URLs
                full_url = urljoin(target_url, href)

                # Skip if already seen or if it's a fragment/mailto
                if full_url in seen_urls or href.startswith("#") or href.startswith("mailto:"):
                    continue

                combined = f"{text.lower()} {href.lower()}"
                is_job_link = any(kw in combined for kw in JOB_KEYWORDS)

                display_text = text or extract_title_from_url(full_url) or "Job Opening"

                if is_job_link and looks_like_job_url(full_url):
                    searchable = f"{display_text} {full_url}"
                    if role and not matches_query_text(role, searchable):
                        continue
                    if looks_like_noise(display_text, "", full_url):
                        continue
                    seen_urls.add(full_url)

                    jobs.append(ScrapedJob(
                        title=display_text[:200],
                        job_url=full_url,
                        source=f"custom:{target_url}",
                        location=location if location else None,
                    ))

    except Exception as e:
        logger.error(f"Generic scraper error for {target_url}: {e}")

    return jobs
