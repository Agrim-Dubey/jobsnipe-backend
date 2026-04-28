"""
Reddit job subreddits scraper — STRICT filtering for actual job posts only.
"""
import logging
import re
from typing import List

from fastapi_app.scraper.base import (
    ScrapedJob,
    clean_html_text,
    extract_emails,
    get_async_client,
    matches_query_text,
)

logger = logging.getLogger("jobsnipe.scraper.reddit")

# Only subreddits that are strictly for job POSTINGS (not discussions)
JOB_SUBREDDITS = [
    "forhire",
    "remotejs",
    "hiring",
]

# Title prefixes that indicate actual job postings
HIRING_SIGNALS = [
    "[hiring]", "[job]", "hiring", "we're hiring",
    "we are hiring", "looking for", "seeking", "job opening",
    "position available", "now hiring", "open position",
    "join our team", "come work", "apply now",
]

CANDIDATE_PATTERNS = re.compile(
    r'^\s*\[(for hire|open to work)\]|\b(for hire|hire me|available for hire|'
    r'open to work|looking for work|seeking work|my resume|portfolio)\b',
    re.IGNORECASE,
)

# Title patterns that indicate NOT a job posting (discussion/advice/articles)
NOISE_PATTERNS = re.compile(
    r'(advice|why am i|how do|discussion|what is|should i|'
    r'rant|vent|question|experience|review|best .* software|'
    r'learning|tutorial|guide|tips|help me|career advice|'
    r'how to|getting started|resume|interview prep|'
    r'callbacks|rejected|frustrated|payroll software|time tracking|'
    r'toxic combo|switch off|standup meeting|building a tool|'
    r'article|blog|news|story|opinion|thought|idea|project|'
    r'show hn|check out|made a|looking for advice|critique|'
    r'hiring process|interviewing at|salary for|how much|is it worth)',
    re.IGNORECASE,
)

# Mandatory hiring keywords - if NONE of these are present, we skip (unless it's a known job sub)
STRICT_HIRING_KEYWORDS = ['hiring', 'hiring]', '[hiring]', 'job', 'position', 'opening', 'vacancy', 'role']


async def scrape_reddit(role: str, location: str = "", max_results: int = 25) -> List[ScrapedJob]:
    """Search job subreddits — only return actual job postings, not discussions."""
    jobs: List[ScrapedJob] = []

    async with get_async_client() as client:
        for subreddit in JOB_SUBREDDITS:
            try:
                url = f"https://www.reddit.com/r/{subreddit}/search.json"
                params = {
                    "q": f"{role} (hiring OR job OR position OR apply)",
                    "restrict_sr": "1",
                    "sort": "new",
                    "limit": max_results,
                    "t": "month",
                }

                resp = await client.get(url, params=params)
                if resp.status_code == 429:
                    logger.warning(f"Reddit rate limited on r/{subreddit}")
                    continue
                if resp.status_code != 200:
                    continue
                resp.raise_for_status()
                data = resp.json()

                children = data.get("data", {}).get("children", [])
                for child in children:
                    post = child.get("data", {})
                    title = post.get("title", "")
                    selftext = post.get("selftext", "")
                    permalink = post.get("permalink", "")
                    flair = (post.get("link_flair_text") or "").lower()

                    title_lower = title.lower()
                    searchable = f"{title} {selftext or ''}"

                    # SKIP: noise/discussion posts
                    if NOISE_PATTERNS.search(searchable):
                        continue
                    if CANDIDATE_PATTERNS.search(title) or CANDIDATE_PATTERNS.search(selftext or ""):
                        continue
                    if not matches_query_text(role, searchable):
                        continue

                    # REQUIRE: must have a hiring signal in title or flair
                    has_hiring_signal = any(sig in title_lower for sig in HIRING_SIGNALS)
                    has_hiring_flair = "hiring" in flair or "job" in flair

                    if not has_hiring_signal and not has_hiring_flair:
                        if subreddit != "hiring":
                            continue

                    # Extract emails from the post body
                    emails = extract_emails(selftext) if selftext else []
                    description = clean_html_text(selftext, 700)

                    jobs.append(ScrapedJob(
                        title=title[:200],
                        description=description[:500] if description else None,
                        job_url=f"https://reddit.com{permalink}",
                        source=f"reddit/r/{subreddit}",
                        location=location if location else None,
                        emails=emails,
                    ))

            except Exception as e:
                logger.error(f"Reddit r/{subreddit} error: {e}")
                continue

    return jobs
