import json
import logging
import re
from contextlib import asynccontextmanager
from typing import Any, Iterable, List, Optional

import httpx
from bs4 import BeautifulSoup
from pydantic import BaseModel

logger = logging.getLogger("jobsnipe.scraper")

class ScrapedJob(BaseModel):
    title: str
    job_url: str
    company: Optional[str] = None
    location: Optional[str] = None
    description: Optional[str] = None
    salary: Optional[str] = None
    source: str
    emails: List[str] = []

# File extensions and domains to ignore in email extraction
_IGNORE_EXTENSIONS = ('.png', '.jpg', '.jpeg', '.gif', '.svg', '.webp', '.ico', '.css', '.js')
_IGNORE_DOMAINS = (
    'example.com', 'test.com', 'email.com', 'domain.com',
    'sentry.io', 'gravatar.com', 'shields.io', 'badge.fury.io',
    'github.com', 'w3.org', 'schema.org', 'googleapis.com',
)

# Patterns that suggest an HR/recruiter/hiring contact
HR_PATTERNS = re.compile(
    r'(hr@|recruit|talent|hiring|career|jobs@|people@|apply@|staffing|human.?resource)',
    re.IGNORECASE
)

NOISE_PATTERNS = re.compile(
    r"\b(article|blog|news|story|guide|tutorial|tips|advice|discussion|opinion|review|"
    r"checklist|roadmap|how to|what is|why you should|best practices|salary guide|"
    r"resume tips|interview tips|career advice|trend report|explained|career path|"
    r"career paths|job market|top companies|best companies|hiring trends|"
    r"salary trends|job description template|resume template)\b",
    re.IGNORECASE,
)

JOB_URL_HINTS = (
    "/jobs/",
    "/job/",
    "/job?",
    "/positions/",
    "/openings/",
    "/vacancies/",
    "jobs.lever.co",
    "boards.greenhouse.io",
    "apply.workable.com",
    "jobs.ashbyhq.com",
    "smartrecruiters.com",
    "myworkdayjobs.com",
    "job-boards.greenhouse.io",
    "workatastartup.com/jobs",
    "remoteok.com/remote-jobs",
    "/remote-jobs/",
)

CAREER_PAGE_HINTS = (
    "/careers",
    "/career",
)

NOISE_URL_HINTS = (
    "/blog/",
    "/blogs/",
    "/article",
    "/articles/",
    "/news/",
    "/story/",
    "/stories/",
    "/guide/",
    "/guides/",
    "/tutorial/",
    "/advice/",
)

GENERIC_TITLES = {
    "apply",
    "apply now",
    "learn more",
    "click here",
    "job openings",
    "open positions",
    "careers",
    "jobs",
}

JOB_TITLE_HINTS = (
    "engineer",
    "developer",
    "intern",
    "manager",
    "analyst",
    "scientist",
    "designer",
    "architect",
    "specialist",
    "consultant",
    "backend",
    "frontend",
    "full stack",
    "fullstack",
    "software",
    "platform",
    "devops",
    "qa",
    "sre",
    "mobile",
    "ios",
    "android",
    "python",
    "java",
    "golang",
    "go",
    "rust",
    "c++",
    "cpp",
)

TOKEN_STOPWORDS = {
    "and",
    "or",
    "for",
    "the",
    "with",
    "to",
    "of",
    "in",
    "a",
    "an",
    "remote",
}

ENGINEERING_FAMILY_TOKENS = {
    "developer",
    "developers",
    "engineer",
    "engineers",
    "software",
    "swe",
}

SKILL_ALIASES = {
    "c++": ("c++", "cpp", "c plus plus"),
    "c": ("c", " c ", "language c"),
    "node.js": ("node.js", "nodejs", "node js"),
    "javascript": ("javascript", "js", "ecmascript"),
    "typescript": ("typescript", "ts"),
    "python": ("python",),
    "django": ("django",),
    "fastapi": ("fastapi", "fast api"),
    "java": ("java",),
    "spring": ("spring", "spring boot", "springboot"),
    "react": ("react", "reactjs", "react.js"),
    "go": ("go", "golang"),
    "rust": ("rust",),
    "aws": ("aws", "amazon web services"),
    "kubernetes": ("kubernetes", "k8s"),
    "docker": ("docker",),
}

DETAIL_SEPARATORS = (" | ", " - ", " :: ")


def normalize_whitespace(text: str) -> str:
    return re.sub(r"\s+", " ", (text or "").strip())


def clean_html_text(text: str, max_length: Optional[int] = None) -> Optional[str]:
    if not text:
        return None
    cleaned = normalize_whitespace(re.sub(r"<[^>]+>", " ", text))
    if not cleaned:
        return None
    if max_length and len(cleaned) > max_length:
        return cleaned[: max_length - 3].rstrip() + "..."
    return cleaned


def normalize_for_match(text: str) -> str:
    value = (text or "").lower()
    replacements = {
        "c++": " cpp ",
        "c#": " csharp ",
        "node.js": " nodejs ",
        "react.js": " reactjs ",
        "spring boot": " springboot ",
        "full-time": " fulltime ",
        "part-time": " parttime ",
        "swe": " software engineer ",
    }
    for source, target in replacements.items():
        value = value.replace(source, target)
    value = re.sub(r"[^a-z0-9\s+/]", " ", value)
    return normalize_whitespace(value)


def tokenize_query(text: str) -> List[str]:
    normalized = normalize_for_match(text)
    tokens = [token for token in normalized.split() if token and token not in TOKEN_STOPWORDS]
    return tokens


def _build_query_units(tokens: List[str]) -> List[str]:
    units: List[str] = []
    has_engineering_family = False
    for token in tokens:
        if token in ENGINEERING_FAMILY_TOKENS:
            has_engineering_family = True
            continue
        if token not in units:
            units.append(token)
    if has_engineering_family:
        units.append("__engineering_family__")
    return units


def _contains_term(term: str, text_normalized: str, text_tokens: set[str]) -> bool:
    cleaned = normalize_for_match(term)
    if not cleaned:
        return False
    if " " in cleaned:
        return cleaned in text_normalized
    if len(cleaned) <= 2:
        return cleaned in text_tokens
    return cleaned in text_tokens or cleaned in text_normalized


def split_detail_title(title: str) -> str:
    cleaned = normalize_whitespace(title)
    if not cleaned:
        return ""
    for separator in DETAIL_SEPARATORS:
        if separator in cleaned:
            first = cleaned.split(separator)[0].strip()
            if len(first) >= 5:
                return first
    return cleaned


def matches_query_text(query: str, text: str) -> bool:
    if not query:
        return True
    query_normalized = normalize_for_match(query)
    text_normalized = normalize_for_match(text)
    text_tokens = set(text_normalized.split())
    if not text_normalized:
        return False
    if query_normalized and _contains_term(query_normalized, text_normalized, text_tokens):
        return True

    tokens = tokenize_query(query)
    if not tokens:
        return True

    units = _build_query_units(tokens)
    if not units:
        return True

    matched = 0
    for unit in units:
        if unit == "__engineering_family__":
            if any(_contains_term(token, text_normalized, text_tokens) for token in ENGINEERING_FAMILY_TOKENS):
                matched += 1
            continue
        if _contains_term(unit, text_normalized, text_tokens):
            matched += 1

    required = 1 if len(units) == 1 else min(2, len(units))
    return matched >= required


def expand_skill_terms(skills: Iterable[str]) -> List[str]:
    expanded: List[str] = []
    for skill in skills:
        cleaned = normalize_whitespace(skill).lower()
        if not cleaned:
            continue
        aliases = SKILL_ALIASES.get(cleaned, (cleaned,))
        for alias in aliases:
            if alias not in expanded:
                expanded.append(alias)
    return expanded


def matches_any_skill(skills: Iterable[str], text: str) -> bool:
    skills = [skill for skill in skills if skill]
    if not skills:
        return True
    text_normalized = normalize_for_match(text)
    text_tokens = set(text_normalized.split())
    if not text_normalized:
        return False
    for skill in expand_skill_terms(skills):
        if _contains_term(skill, text_normalized, text_tokens):
            return True
    return False


def looks_like_noise(title: str, description: str = "", url: str = "") -> bool:
    title_clean = normalize_whitespace(title).lower()
    if not title_clean:
        return True
    if title_clean in GENERIC_TITLES:
        return True
    if any(hint in (url or "").lower() for hint in NOISE_URL_HINTS):
        return True
    return bool(NOISE_PATTERNS.search(title))


def looks_like_job_url(url: str) -> bool:
    url_lower = (url or "").lower()
    if not url_lower or any(hint in url_lower for hint in NOISE_URL_HINTS):
        return False
    return any(hint in url_lower for hint in JOB_URL_HINTS)


def looks_like_career_page(url: str) -> bool:
    url_lower = (url or "").lower().rstrip("/")
    return any(hint in url_lower for hint in CAREER_PAGE_HINTS)


def looks_like_job_title(title: str) -> bool:
    normalized = normalize_for_match(title)
    if not normalized:
        return False
    return any(hint in normalized for hint in JOB_TITLE_HINTS)


def job_type_matches(job_type: Optional[str], text: str) -> bool:
    if not job_type:
        return True
    blob = normalize_for_match(text)
    if job_type == "intern":
        return any(token in blob for token in ("intern", "internship", "apprentice", "graduate"))
    if job_type == "contract":
        return any(token in blob for token in ("contract", "contractor", "freelance"))
    if job_type == "fulltime":
        return "intern" not in blob and "contract" not in blob and "freelance" not in blob
    return True


def parse_salary_text(salary: Optional[str]) -> tuple[Optional[int], Optional[int]]:
    if not salary:
        return (None, None)

    text = salary.lower().replace(",", "").strip()
    numbers: List[int] = []
    for match in re.finditer(r"(\d+(?:\.\d+)?)\s*([k])?", text):
        raw_value = float(match.group(1))
        suffix = match.group(2)
        if suffix == "k":
            raw_value *= 1000
        value = int(raw_value)
        if value <= 0:
            continue
        numbers.append(value)

    if not numbers:
        return (None, None)

    if any(token in text for token in ("/hr", "hour", "hourly")):
        converted = [value * 2080 for value in numbers if value < 1000]
        if converted:
            numbers = converted

    minimum = min(numbers)
    maximum = max(numbers)
    return (minimum, maximum)


def salary_meets_minimum(
    salary: Optional[str],
    minimum_salary: Optional[int],
    allow_missing: bool = False,
) -> bool:
    if minimum_salary is None:
        return True
    parsed_min, parsed_max = parse_salary_text(salary)
    if parsed_min is None and parsed_max is None:
        return allow_missing
    upper_bound = parsed_max or parsed_min
    return bool(upper_bound and upper_bound >= minimum_salary)


def extract_title_from_url(url: str) -> Optional[str]:
    if not url:
        return None
    slug = url.rstrip("/").split("/")[-1]
    slug = slug.split("?")[0]
    if not slug or slug in {"jobs", "job", "careers"}:
        return None
    slug = re.sub(r"[-_]+", " ", slug)
    slug = normalize_whitespace(slug)
    if len(slug) < 5:
        return None
    return slug.title()

def extract_emails(text: str) -> List[str]:
    """Extract emails from text, filtering out false positives like image filenames."""
    if not text:
        return []
    pattern = r'[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}'
    raw = re.findall(pattern, text)
    
    cleaned = set()
    for e in raw:
        e_lower = e.lower()
        # Skip image/asset extensions
        if e_lower.endswith(_IGNORE_EXTENSIONS):
            continue
        # Skip known non-email domains
        if any(domain in e_lower for domain in _IGNORE_DOMAINS):
            continue
        cleaned.add(e_lower)
    
    # Sort: HR/recruiter emails first for visibility
    result = sorted(cleaned, key=lambda x: (0 if HR_PATTERNS.search(x) else 1, x))
    return result


def is_hr_email(email: str) -> bool:
    """Check if an email looks like an HR/recruiter contact."""
    return bool(HR_PATTERNS.search(email.lower()))


def _iter_json_like_nodes(value: Any) -> Iterable[dict]:
    if isinstance(value, dict):
        yield value
        for child in value.values():
            yield from _iter_json_like_nodes(child)
    elif isinstance(value, list):
        for item in value:
            yield from _iter_json_like_nodes(item)


def _safe_json_loads(raw: str) -> Any:
    try:
        return json.loads(raw)
    except Exception:
        return None


def _extract_company_name(value: Any) -> Optional[str]:
    if isinstance(value, dict):
        return normalize_whitespace(value.get("name") or "")
    if isinstance(value, str):
        return normalize_whitespace(value)
    return None


def _extract_location(value: Any) -> Optional[str]:
    if isinstance(value, list):
        locations = [_extract_location(item) for item in value]
        compact = [location for location in locations if location]
        return ", ".join(compact[:2]) if compact else None
    if isinstance(value, dict):
        address = value.get("address", value)
        if isinstance(address, dict):
            pieces = [
                address.get("addressLocality"),
                address.get("addressRegion"),
                address.get("addressCountry"),
            ]
            compact = [normalize_whitespace(piece) for piece in pieces if piece]
            if compact:
                return ", ".join(compact)
    return None


def _extract_salary_from_struct(value: Any) -> Optional[str]:
    if isinstance(value, dict):
        salary_value = value.get("value", value)
        if isinstance(salary_value, dict):
            min_value = salary_value.get("minValue")
            max_value = salary_value.get("maxValue")
            unit = salary_value.get("unitText") or value.get("currency")
            if min_value and max_value:
                suffix = f" / {unit}" if unit else ""
                return f"${int(min_value):,} - ${int(max_value):,}{suffix}"
            if min_value:
                suffix = f" / {unit}" if unit else ""
                return f"${int(min_value):,}+{suffix}"
        amount = value.get("amount")
        if amount:
            return f"${int(amount):,}"
    return None


def extract_job_page_details(html: str, url: str) -> dict:
    details = {
        "title": None,
        "company": None,
        "location": None,
        "description": None,
        "salary": None,
        "emails": [],
        "is_job_posting": False,
    }

    if not html:
        return details

    soup = BeautifulSoup(html, "html.parser")
    page_text = normalize_whitespace(soup.get_text(" ", strip=True))
    details["emails"] = extract_emails(page_text)

    for script_tag in soup.find_all("script", type=lambda value: value and "ld+json" in value):
        payload = _safe_json_loads(script_tag.string or script_tag.get_text() or "")
        if payload is None:
            continue
        for node in _iter_json_like_nodes(payload):
            node_type = node.get("@type")
            types = node_type if isinstance(node_type, list) else [node_type]
            types = [str(value).lower() for value in types if value]
            if "jobposting" not in types:
                continue

            details["is_job_posting"] = True
            details["title"] = details["title"] or normalize_whitespace(node.get("title") or "")
            details["company"] = details["company"] or _extract_company_name(node.get("hiringOrganization"))
            details["location"] = details["location"] or _extract_location(node.get("jobLocation"))
            details["description"] = details["description"] or clean_html_text(node.get("description"), 1000)
            details["salary"] = details["salary"] or _extract_salary_from_struct(node.get("baseSalary"))

    if not details["title"]:
        meta_title = (
            soup.find("meta", property="og:title")
            or soup.find("meta", attrs={"name": "twitter:title"})
        )
        if meta_title and meta_title.get("content"):
            details["title"] = split_detail_title(meta_title["content"])

    if not details["description"]:
        meta_desc = (
            soup.find("meta", property="og:description")
            or soup.find("meta", attrs={"name": "description"})
            or soup.find("meta", attrs={"name": "twitter:description"})
        )
        if meta_desc and meta_desc.get("content"):
            details["description"] = clean_html_text(meta_desc["content"], 1000)

    if not details["title"] and soup.title and soup.title.string:
        details["title"] = split_detail_title(soup.title.string)

    if not details["title"]:
        details["title"] = extract_title_from_url(url)

    if not details["location"] and "remote" in page_text.lower():
        details["location"] = "Remote"

    if not details["salary"]:
        salary_match = re.search(
            r"(\$[\d,]+(?:\s*-\s*\$[\d,]+)?(?:\s*(?:per year|/year|annually|hour|/hr))?)",
            page_text,
            re.IGNORECASE,
        )
        if salary_match:
            details["salary"] = normalize_whitespace(salary_match.group(1))

    job_hints = (
        "apply now",
        "job description",
        "responsibilities",
        "qualifications",
        "employment type",
        "hiring organization",
    )
    if not details["is_job_posting"] and any(hint in page_text.lower() for hint in job_hints):
        details["is_job_posting"] = True

    return details


@asynccontextmanager
async def get_async_client():
    """Reusable async HTTP client context."""
    async with httpx.AsyncClient(
        headers={
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
            "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8",
        },
        timeout=30.0,
        follow_redirects=True
    ) as client:
        yield client
