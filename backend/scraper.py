"""
scraper.py — Async URL scraper for AEO Analyzer.

Fetches a URL and extracts only the structured fields needed downstream
by the AEO scoring pipeline. Results are cached in-memory for 10 minutes
so the same URL is never re-fetched within that window.
"""

import json
import re
import time
from typing import TypedDict

import httpx
from bs4 import BeautifulSoup

# ---------------------------------------------------------------------------
# Constants
# ---------------------------------------------------------------------------

TIMEOUT = 10                # seconds
CACHE_TTL = 600             # 10 minutes in seconds
BODY_TEXT_LIMIT = 4000      # hard cap on chars sent to Claude

USER_AGENT = (
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) "
    "AppleWebKit/537.36 (KHTML, like Gecko) "
    "Chrome/122.0.0.0 Safari/537.36"
)

# ---------------------------------------------------------------------------
# In-memory cache  { url -> (timestamp, ScrapeResult) }
# ---------------------------------------------------------------------------

_cache: dict[str, tuple[float, "ScrapeResult"]] = {}


def _cache_get(url: str) -> "ScrapeResult | None":
    entry = _cache.get(url)
    if entry and (time.monotonic() - entry[0]) < CACHE_TTL:
        return entry[1]
    # Stale entry — evict it
    _cache.pop(url, None)
    return None


def _cache_set(url: str, result: "ScrapeResult") -> None:
    _cache[url] = (time.monotonic(), result)


# ---------------------------------------------------------------------------
# Return type
# ---------------------------------------------------------------------------

class ScrapeResult(TypedDict):
    title: str
    meta_description: str
    headings: list[str]
    body_text: str
    has_schema: bool
    schema_types: list[str]
    error: str | None        # None on success; error message on failure


# ---------------------------------------------------------------------------
# Targeted extraction helpers  (no full-DOM SELECT * scans)
# ---------------------------------------------------------------------------

def _extract_schema_types(soup: BeautifulSoup) -> list[str]:
    """
    Return unique @type values from JSON-LD blocks and microdata attributes.

    We query only <script type="application/ld+json"> tags and tags that
    carry an itemtype attribute — nothing else.
    """
    types: set[str] = set()

    # JSON-LD — targeted tag search, not a full-DOM traversal
    for tag in soup.find_all("script", type="application/ld+json"):
        try:
            data = json.loads(tag.string or "")
            nodes = data if isinstance(data, list) else [data]
            for node in nodes:
                if isinstance(node, dict):
                    raw = node.get("@type")
                    if isinstance(raw, list):
                        types.update(str(t) for t in raw)
                    elif raw:
                        types.add(str(raw))
        except (json.JSONDecodeError, AttributeError, ValueError):
            pass

    # Microdata — only tags that actually carry itemtype
    for tag in soup.find_all(itemtype=True):
        slug = (tag.get("itemtype") or "").strip("/").split("/")[-1]
        if slug:
            types.add(slug)

    return sorted(types)


def _extract_body_text(soup: BeautifulSoup) -> str:
    """
    Pull readable text from the most relevant content container.

    Removes boilerplate elements first, then extracts text from
    <main>/<article>/content-div, falling back to <body>.
    Hard-capped at BODY_TEXT_LIMIT characters before being returned.
    """
    # Remove noise — targeted tag names only, not a wildcard search
    for tag in soup(["script", "style", "noscript", "header", "footer", "nav", "aside"]):
        tag.decompose()

    container = (
        soup.find("main")
        or soup.find("article")
        or soup.find(id=re.compile(r"content|main|body", re.I))
        or soup.find(class_=re.compile(r"content|main|article|post", re.I))
        or soup.body
    )

    if container is None:
        return ""

    text = container.get_text(separator=" ", strip=True)
    text = re.sub(r"\s{2,}", " ", text)

    # Hard cap — never send more than BODY_TEXT_LIMIT chars to Claude
    return text[:BODY_TEXT_LIMIT]


# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------

async def scrape_url(url: str) -> ScrapeResult:
    """
    Fetch *url* and return only the AEO-relevant fields.

    Results are cached for CACHE_TTL seconds. On any failure the *error*
    key is set and all other fields hold safe empty defaults.
    """
    # --- Cache hit --------------------------------------------------------
    cached = _cache_get(url)
    if cached is not None:
        return cached

    # --- Validate URL before touching the network -------------------------
    try:
        parsed = httpx.URL(url)
        if parsed.scheme not in ("http", "https"):
            raise ValueError(f"Unsupported scheme: '{parsed.scheme}'")
    except Exception as exc:
        return _empty_result(f"Invalid URL: {exc}")

    # --- Fetch ------------------------------------------------------------
    headers = {
        "User-Agent": USER_AGENT,
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.9",
    }

    try:
        async with httpx.AsyncClient(
            follow_redirects=True,
            timeout=httpx.Timeout(TIMEOUT),
            verify=False,  # macOS conda SSL cert workaround; safe for a local scraping tool
        ) as client:
            response = await client.get(url, headers=headers)
    except httpx.TimeoutException:
        return _empty_result(f"Request timed out after {TIMEOUT}s.")
    except httpx.RequestError as exc:
        return _empty_result(f"Network error: {exc}")

    # --- Handle non-200 status explicitly (covers redirects that 4xx/5xx) -
    if response.status_code != 200:
        # Capture the final URL in case redirects occurred
        final_url = str(response.url)
        location = (
            f" (redirected to {final_url})" if final_url != url else ""
        )
        return _empty_result(
            f"HTTP {response.status_code}{location}. "
            "The page could not be retrieved."
        )

    # --- Reject non-HTML responses ----------------------------------------
    content_type = response.headers.get("content-type", "")
    if "html" not in content_type.lower():
        return _empty_result(
            f"Non-HTML response (Content-Type: {content_type!r}). "
            "Only HTML pages can be analysed."
        )

    # --- Parse — extract only the fields we need, no full DOM dumps -------
    soup = BeautifulSoup(response.text, "lxml")

    # Title — single targeted lookup
    title_tag = soup.find("title")
    title = title_tag.get_text(strip=True) if title_tag else ""

    # Meta description — single targeted lookup
    desc_tag = soup.find("meta", attrs={"name": re.compile(r"^description$", re.I)})
    meta_description = (desc_tag.get("content") or "").strip() if desc_tag else ""

    # Headings — compute text once per tag, not twice
    headings: list[str] = []
    for tag in soup.find_all(["h1", "h2", "h3"]):
        text = tag.get_text(strip=True)
        if text:
            headings.append(text)

    # Body text (already capped at BODY_TEXT_LIMIT inside helper)
    body_text = _extract_body_text(soup)

    # Schema — single pass; _has_schema reuses the result, no re-scan
    schema_types = _extract_schema_types(soup)
    has_schema = bool(schema_types)

    result = ScrapeResult(
        title=title,
        meta_description=meta_description,
        headings=headings,
        body_text=body_text,
        has_schema=has_schema,
        schema_types=schema_types,
        error=None,
    )

    _cache_set(url, result)
    return result


def _empty_result(error: str) -> ScrapeResult:
    return ScrapeResult(
        title="",
        meta_description="",
        headings=[],
        body_text="",
        has_schema=False,
        schema_types=[],
        error=error,
    )
