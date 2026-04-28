"""
Google Search based job discovery.
Searches for jobs across major ATS platforms and company career pages.
"""
import logging
import urllib.parse
from typing import List
from bs4 import BeautifulSoup
from fastapi_app.scraper.base import (
    ScrapedJob,
    extract_title_from_url,
    get_async_client,
    looks_like_job_url,
    looks_like_noise,
    matches_query_text,
    split_detail_title,
)

logger = logging.getLogger("jobsnipe.scraper.search")

ATS_DOMAINS = [
    "jobs.lever.co",
    "boards.greenhouse.io",
    "apply.workable.com",
    "jobs.ashbyhq.com",
    "smartrecruiters.com",
    "myworkdayjobs.com",
    "careers.google.com",
    "workatastartup.com",
]


async def scrape_google_jobs(role: str, location: str = "", max_results: int = 30) -> List[ScrapedJob]:
    """Scrape Google Search to find job postings on ATS platforms and career pages."""
    jobs: List[ScrapedJob] = []
    
    queries = []
    
    site_query = " OR ".join([f"site:{domain}" for domain in ATS_DOMAINS])
    q1 = f'"{role}"'
    if location:
        q1 += f' "{location}"'
    queries.append(f'{q1} ("job" OR "apply" OR "opening") ({site_query})')
    
    q2 = f'"{role}" ("software engineer" OR "developer" OR "hiring" OR "apply now")'
    if location:
        q2 += f' "{location}"'
    queries.append(q2)
    
    # Query 3: Internship-specific if role contains intern
    if "intern" in role.lower():
        q3 = f'"{role}" (internship OR "summer intern" OR "fall intern" OR "spring intern")'
        if location:
            q3 += f' "{location}"'
        queries.append(q3)

    try:
        async with get_async_client() as client:
            for query in queries:
                if len(jobs) >= max_results:
                    break
                    
                encoded = urllib.parse.quote(query)
                search_url = f"https://www.google.com/search?q={encoded}&num=20"

                try:
                    resp = await client.get(search_url)
                    if resp.status_code != 200:
                        continue
                    
                    soup = BeautifulSoup(resp.text, "html.parser")
                    
                    for a_tag in soup.find_all("a", href=True):
                        if len(jobs) >= max_results:
                            break
                            
                        href = a_tag["href"]
                        
                        # Unwrap Google's /url?q= wrapper
                        if "/url?q=" in href:
                            href = href.split("/url?q=")[1].split("&")[0]
                            href = urllib.parse.unquote(href)
                        
                        # Skip Google's own pages
                        if "google.com" in href and "careers.google" not in href:
                            continue
                        if not href.startswith("http"):
                            continue

                        if not looks_like_job_url(href):
                            continue

                        title_tag = a_tag.find("h3")
                        title = title_tag.get_text(" ", strip=True) if title_tag else a_tag.get_text(" ", strip=True)
                        clean_title = split_detail_title(title) or extract_title_from_url(href) or ""
                        
                        if not clean_title or len(clean_title) < 5:
                            continue
                        if looks_like_noise(clean_title, title, href):
                            continue
                        if not matches_query_text(role, f"{clean_title} {title} {href}"):
                            continue
                        
                        if not any(j.job_url == href for j in jobs):
                            # Try to get company from title
                            company = None
                            parts = title.split(" - ")
                            if len(parts) >= 2:
                                company = parts[-1].strip()[:60]
                            
                            jobs.append(ScrapedJob(
                                title=clean_title,
                                job_url=href,
                                source="google_discovery",
                                location=location if location else "Remote",
                                company=company,
                            ))

                except Exception as e:
                    logger.warning(f"Google search query failed: {e}")
                    continue

    except Exception as e:
        logger.error(f"Google search scraper error: {e}")

    return jobs
