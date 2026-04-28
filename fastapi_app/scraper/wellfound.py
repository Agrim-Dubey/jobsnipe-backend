"""
Wellfound (formerly AngelList Talent) scraper.
Scrapes the public job board at wellfound.com.
"""
import logging
from typing import List
from fastapi_app.scraper.base import (
    ScrapedJob,
    extract_emails,
    extract_title_from_url,
    get_async_client,
    looks_like_noise,
    matches_query_text,
)

logger = logging.getLogger("jobsnipe.scraper.wellfound")


async def scrape_wellfound(role: str, location: str = "", max_results: int = 30) -> List[ScrapedJob]:
    """Scrape Wellfound's public job listings page."""
    jobs: List[ScrapedJob] = []

    try:
        from bs4 import BeautifulSoup
        import urllib.parse

        # Wellfound has a public search page
        role_slug = urllib.parse.quote(role.lower().replace(" ", "-"))
        search_url = f"https://wellfound.com/role/l/{role_slug}"
        if location:
            loc_slug = urllib.parse.quote(location.lower().replace(" ", "-"))
            search_url = f"https://wellfound.com/role/l/{role_slug}/{loc_slug}"

        async with get_async_client() as client:
            resp = await client.get(search_url)
            if resp.status_code != 200:
                # Try alternative URL pattern
                search_url = f"https://wellfound.com/jobs?q={urllib.parse.quote(role)}"
                resp = await client.get(search_url)

            if resp.status_code == 403:
                raise RuntimeError("Wellfound blocked the public scrape request (403)")
            if resp.status_code != 200:
                raise RuntimeError(f"Wellfound returned {resp.status_code}")

            soup = BeautifulSoup(resp.text, "html.parser")
            
            # Look for job listing links
            for a_tag in soup.find_all("a", href=True):
                href = a_tag["href"]
                
                # Wellfound job URLs contain /jobs/ or /company/
                if "/jobs/" not in href and "/company/" not in href:
                    continue
                if href.startswith("/"):
                    href = f"https://wellfound.com{href}"
                if "wellfound.com" not in href:
                    continue

                text = a_tag.get_text(strip=True) or extract_title_from_url(href) or ""
                if not text or len(text) < 5 or len(text) > 200:
                    continue

                parent = a_tag.find_parent(["div", "li", "article"])
                parent_text = parent.get_text(" ", strip=True) if parent else ""
                searchable = f"{text} {href} {parent_text}"
                if not matches_query_text(role, searchable):
                    continue
                if looks_like_noise(text, parent_text, href):
                    continue

                if not any(j.job_url == href for j in jobs):
                    # Try to extract company from nearby elements
                    company = None
                    if parent:
                        # Look for company name in parent
                        company_el = parent.find(["h2", "h3", "h4"])
                        if company_el:
                            company = company_el.get_text(strip=True)[:100]
                    
                    # Extract emails from any visible text
                    emails = extract_emails(parent_text)

                    jobs.append(ScrapedJob(
                        title=text[:200],
                        company=company,
                        location=location if location else "Remote",
                        job_url=href,
                        source="wellfound",
                        emails=emails,
                    ))

                if len(jobs) >= max_results:
                    break

    except Exception as e:
        logger.warning(f"Wellfound scraper issue: {e}")
        raise

    return jobs
