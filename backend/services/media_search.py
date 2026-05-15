"""
Hybrid media search service — reliable, zero-cost-at-scale.

Images  → Serper Google Images (primary) → Wikipedia Lead Image → Wikimedia Commons
Videos  → yt-dlp scrape (0 quota) + YouTube videos.list metadata (1 unit/call)
Cache   → MongoDB media_cache collection, 30-day TTL
"""
import logging
import re
import subprocess
import json
from datetime import datetime, timedelta

import httpx

from config import settings

log = logging.getLogger(__name__)

_WIKI_HEADERS   = {"User-Agent": "EduApp/1.0 (educational platform; contact@admin.com)"}
_YT_SEARCH_URL  = "https://www.googleapis.com/youtube/v3/search"
_YT_VIDEOS_URL  = "https://www.googleapis.com/youtube/v3/videos"
_SERPER_URL     = "https://google.serper.dev/images"

# File extensions that are actual images (exclude .ogg, .pdf, .webm, etc.)
_IMAGE_EXTS = (".jpg", ".jpeg", ".png", ".gif", ".svg", ".webp")

# ── Filename heuristics ───────────────────────────────────────────────────────

# Whitelist: filenames containing these keywords are likely conceptual diagrams
_DIAGRAM_WHITELIST = re.compile(
    r"(diagram|labeled|labelled|structure|anatomy|cycle|process|"
    r"illustration|figure|scheme|formula|equation|wave|circuit|"
    r"vector|force|motion|energy|reaction|mechanism|cross.?section|"
    r"overview|model|layout|flowchart|pathway|map)",
    re.IGNORECASE,
)

# Blacklist: discard anything that looks like a data chart, screenshot, or logo
_DIAGRAM_BLACKLIST = re.compile(
    r"(bar_graph|bar_chart|pie_chart|pie_graph|table|screenshot|"
    r"screen_shot|logo|flag|portrait|building|school|map_of|"
    r"location|photo|photograph|selfie|thumbnail|banner|icon)",
    re.IGNORECASE,
)

# Strip grade/class/board metadata from queries to avoid regional school noise
_GRADE_STRIP = re.compile(
    r"\b(class|grade|std|standard|cbse|icse|igcse|ncert|board)\s*\d*\b",
    re.IGNORECASE,
)


def _clean_query(query: str) -> str:
    """Strip grade/board metadata and filler phrases so searches stay topic-focused."""
    cleaned = _GRADE_STRIP.sub("", query).strip()
    # Strip common filler prefixes
    cleaned = re.sub(
        r"^\s*(what is|what are|what's|whats|how to|how does|explain|define|"
        r"describe|show me|tell me about|help me with|give me|can you|"
        r"i need help with|difference between|compare)\s+",
        "",
        cleaned,
        flags=re.IGNORECASE,
    )
    # Remove trailing question marks and extra spaces
    cleaned = re.sub(r"\s+", " ", cleaned).strip().rstrip("?").strip()
    return cleaned if cleaned else query


# ── TTL index bootstrap ───────────────────────────────────────────────────────
_ttl_index_created = False

async def _ensure_ttl_index(db):
    global _ttl_index_created
    if _ttl_index_created:
        return
    try:
        await db.media_cache.create_index("expires_at", expireAfterSeconds=0)
        _ttl_index_created = True
    except Exception as exc:
        log.warning("Could not create media_cache TTL index: %s", exc)


# ── Image search ──────────────────────────────────────────────────────────────

async def _serper_image_search(query: str, max_results: int) -> list[dict]:
    """
    Search Google Images via Serper.dev API.
    Passes the query exactly as-is — no suffixes, no cleaning.
    Returns whatever Google Images returns for that query.
    """
    if not settings.SERPER_API_KEY:
        return []

    results = []
    seen_urls: set[str] = set()

    try:
        async with httpx.AsyncClient(timeout=15) as client:
            resp = await client.post(
                _SERPER_URL,
                headers={
                    "X-API-KEY":    settings.SERPER_API_KEY,
                    "Content-Type": "application/json",
                },
                json={
                    "q":    query,
                    "num":  max_results,
                    "safe": "active",
                },
            )
            resp.raise_for_status()
            items = resp.json().get("images", [])

        for item in items:
            if len(results) >= max_results:
                break

            url    = item.get("imageUrl", "")
            thumb  = item.get("thumbnailUrl", url)
            title  = item.get("title", "")
            source = item.get("link", "")

            if not url or url in seen_urls:
                continue
            # Only skip non-image file types (pdfs, videos, etc.)
            url_path = url.lower().split("?")[0]
            if not any(url_path.endswith(ext) for ext in _IMAGE_EXTS):
                continue

            seen_urls.add(url)
            results.append({
                "url":       url,
                "thumbnail": thumb,
                "title":     title,
                "source":    source,
            })

    except Exception as exc:
        log.warning("Serper image search failed for '%s': %s", query, exc)

    return results


async def search_images(
    query: str,
    grade: str = "",
    board: str = "CBSE",
    max_results: int = 6,
) -> list[dict]:
    """
    Search for educational images.
    Strategy (in order):
      1. Serper Google Images — exact Google Images results for the query
      2. Wikipedia Lead Image — fallback if Serper returns too few
      3. Wikimedia Commons — last resort
    """
    # Use query as-is — the AI already generates a clean 2-5 word media_query
    results: list[dict] = []
    seen: set[str] = set()

    def _merge(new_items: list[dict]) -> None:
        for item in new_items:
            if item["url"] not in seen and len(results) < max_results:
                results.append(item)
                seen.add(item["url"])

    # 1. Serper (Google Images) — primary
    if settings.SERPER_API_KEY:
        _merge(await _serper_image_search(query, max_results))

    # 2. Wikipedia lead images (fill remaining slots)
    if len(results) < max_results:
        _merge(await _wikipedia_lead_images(query, max_results - len(results)))

    # 3. Wikimedia Commons (last resort)
    if len(results) < max_results:
        _merge(await _commons_diagram_search(query, max_results - len(results)))

    return results


async def _wikipedia_lead_images(query: str, max_results: int) -> list[dict]:
    """
    Fetch the Wikipedia-designated lead image for the top matching articles.
    Uses the `pageimages` property — returns the single most representative image
    that Wikipedia editors have chosen for each article.
    """
    results = []
    try:
        async with httpx.AsyncClient(timeout=15, headers=_WIKI_HEADERS) as client:
            # Step 1: find top matching article titles
            search_resp = await client.get(
                "https://en.wikipedia.org/w/api.php",
                params={
                    "action":   "query",
                    "list":     "search",
                    "srsearch": query,
                    "srlimit":  max_results,
                    "format":   "json",
                },
            )
            search_resp.raise_for_status()
            hits = search_resp.json().get("query", {}).get("search", [])
            if not hits:
                return []

            titles = [h["title"] for h in hits[:max_results]]

            # Step 2: fetch lead image via pageimages for all titles at once
            img_resp = await client.get(
                "https://en.wikipedia.org/w/api.php",
                params={
                    "action":    "query",
                    "titles":    "|".join(titles),
                    "prop":      "pageimages|pageterms",
                    "piprop":    "original|thumbnail",
                    "pithumbsize": 640,
                    "pilimit":   max_results,
                    "format":    "json",
                },
            )
            img_resp.raise_for_status()
            pages = img_resp.json().get("query", {}).get("pages", {})

            for page in pages.values():
                original = page.get("original", {})
                thumbnail = page.get("thumbnail", {})
                url = original.get("source", "") or thumbnail.get("source", "")
                thumb = thumbnail.get("source", url)

                if not url:
                    continue
                if not any(url.lower().endswith(ext) for ext in _IMAGE_EXTS):
                    continue
                # Apply blacklist even to lead images (some articles lead with logos)
                fname = url.split("/")[-1]
                if _DIAGRAM_BLACKLIST.search(fname):
                    continue

                title = page.get("title", "")
                results.append({
                    "url":       url,
                    "thumbnail": thumb,
                    "title":     f"{title} — Wikipedia",
                    "source":    f"https://en.wikipedia.org/wiki/{title.replace(' ', '_')}",
                })

    except Exception as exc:
        log.warning("Wikipedia lead image fetch failed for '%s': %s", query, exc)

    return results


async def _commons_diagram_search(query: str, max_results: int) -> list[dict]:
    """
    Search Wikimedia Commons for diagrams and illustrations.
    Applies strict whitelist + blacklist filename filters to avoid
    bar graphs, pie charts, screenshots, and other irrelevant visuals.

    Two passes:
      Pass 1: query + "diagram OR illustration" (targeted)
      Pass 2: plain query (broader fallback)
    """
    results = []
    seen_urls: set[str] = set()

    async with httpx.AsyncClient(timeout=15, headers=_WIKI_HEADERS) as client:
        for search_term in [
            f"{query} diagram OR illustration OR labeled structure",
            query,
        ]:
            if len(results) >= max_results:
                break
            try:
                resp = await client.get(
                    "https://commons.wikimedia.org/w/api.php",
                    params={
                        "action":       "query",
                        "generator":    "search",
                        "gsrsearch":    f"filetype:bitmap|drawing {search_term}",
                        "gsrnamespace": 6,           # File namespace only
                        "gsrlimit":     max_results * 5,  # fetch more to survive filtering
                        "prop":         "imageinfo",
                        "iiprop":       "url|thumburl|extmetadata",
                        "iiurlwidth":   640,
                        "format":       "json",
                    },
                )
                resp.raise_for_status()
                pages = resp.json().get("query", {}).get("pages", {})

                for page in pages.values():
                    if len(results) >= max_results:
                        break

                    info  = (page.get("imageinfo") or [{}])[0]
                    url   = info.get("url", "")
                    thumb = info.get("thumburl", url)
                    title = page.get("title", "").replace("File:", "")

                    if not url or url in seen_urls:
                        continue
                    if not any(url.lower().endswith(ext) for ext in _IMAGE_EXTS):
                        continue

                    fname = url.split("/")[-1]

                    # Hard blacklist — skip immediately
                    if _DIAGRAM_BLACKLIST.search(fname) or _DIAGRAM_BLACKLIST.search(title):
                        continue

                    # Whitelist — only accept files that look like conceptual diagrams
                    if not (_DIAGRAM_WHITELIST.search(fname) or _DIAGRAM_WHITELIST.search(title)):
                        continue

                    seen_urls.add(url)
                    results.append({
                        "url":       url,
                        "thumbnail": thumb,
                        "title":     title,
                        "source":    f"https://commons.wikimedia.org/wiki/{page.get('title','').replace(' ','_')}",
                    })

            except Exception as exc:
                log.warning("Commons diagram search failed for '%s': %s", search_term, exc)

    return results


# ── Video search — Hybrid: yt-dlp (0 units) + videos.list (1 unit) ────────────

async def _ytdlp_search_ids(query: str, max_results: int) -> list[str]:
    """
    Use yt-dlp to scrape YouTube search results for video IDs.
    Costs 0 API quota units. Runs in a thread to avoid blocking the event loop.
    """
    import asyncio
    loop = asyncio.get_event_loop()

    def _run():
        try:
            result = subprocess.run(
                [
                    "yt-dlp",
                    f"ytsearch{max_results}:{query}",
                    "--get-id",
                    "--no-playlist",
                    "--quiet",
                    "--no-warnings",
                ],
                capture_output=True,
                text=True,
                timeout=12,
            )
            ids = [line.strip() for line in result.stdout.splitlines() if line.strip()]
            return ids[:max_results]
        except (FileNotFoundError, subprocess.TimeoutExpired) as exc:
            log.warning("yt-dlp unavailable or timed out: %s", exc)
            return []

    try:
        return await asyncio.wait_for(loop.run_in_executor(None, _run), timeout=14)
    except asyncio.TimeoutError:
        log.warning("yt-dlp executor timed out for '%s'", query)
        return []


async def _youtube_metadata(video_ids: list[str]) -> list[dict]:
    """
    Fetch video metadata via YouTube videos.list — costs only 1 quota unit per call
    (vs 100 units for search.list).
    """
    if not video_ids or not settings.YOUTUBE_API_KEY:
        return []

    try:
        async with httpx.AsyncClient(timeout=15) as client:
            resp = await client.get(
                _YT_VIDEOS_URL,
                params={
                    "part":  "snippet,statistics",
                    "id":    ",".join(video_ids),
                    "key":   settings.YOUTUBE_API_KEY,
                },
            )
            resp.raise_for_status()
            items = resp.json().get("items", [])

        results = []
        for item in items:
            vid_id  = item.get("id", "")
            snippet = item.get("snippet", {})
            stats   = item.get("statistics", {})
            if not vid_id:
                continue
            # Use mqdefault (320×180) — always exists, loads fast
            # hqdefault (480×360) also reliable; maxresdefault often 404s
            thumbnails = snippet.get("thumbnails", {})
            thumb = (
                thumbnails.get("high", {}).get("url")
                or thumbnails.get("medium", {}).get("url")
                or f"https://img.youtube.com/vi/{vid_id}/hqdefault.jpg"
            )
            results.append({
                "video_id":  vid_id,
                "title":     snippet.get("title", ""),
                "channel":   snippet.get("channelTitle", ""),
                "thumbnail": thumb,
                "url":       f"https://www.youtube.com/watch?v={vid_id}",
                "views":     int(stats.get("viewCount", 0)),
                "published": snippet.get("publishedAt", ""),
            })
        return results

    except Exception as exc:
        log.warning("YouTube videos.list failed: %s", exc)
        return []


async def search_videos(
    query: str,
    grade: str = "",
    board: str = "CBSE",
    max_results: int = 5,
) -> list[dict]:
    """
    Hybrid video search:
      1. yt-dlp scrapes YouTube for video IDs (0 quota units)
      2. YouTube videos.list fetches metadata for those IDs (1 quota unit)

    Falls back to search.list (100 units) if yt-dlp is unavailable.
    Uses the query as-is — the AI already generates a clean media_query.
    """
    if not settings.YOUTUBE_API_KEY:
        log.warning("YOUTUBE_API_KEY not set — skipping video search")
        return []

    # --- Primary path: yt-dlp (0 units) + videos.list (1 unit) ---
    video_ids = await _ytdlp_search_ids(query, max_results)
    if video_ids:
        return await _youtube_metadata(video_ids)

    # --- Fallback: search.list (100 units) ---
    log.info("Falling back to YouTube search.list for '%s'", query)
    try:
        async with httpx.AsyncClient(timeout=15) as client:
            resp = await client.get(
                _YT_SEARCH_URL,
                params={
                    "part":              "snippet",
                    "q":                 query,
                    "type":              "video",
                    "maxResults":        max_results,
                    "key":               settings.YOUTUBE_API_KEY,
                    "relevanceLanguage": "en",
                    "safeSearch":        "strict",
                    "videoEmbeddable":   "true",
                },
            )
            resp.raise_for_status()
            items = resp.json().get("items", [])

        results = []
        for item in items:
            vid_id  = item.get("id", {}).get("videoId", "")
            snippet = item.get("snippet", {})
            if not vid_id:
                continue
            thumbnails = snippet.get("thumbnails", {})
            thumb = (
                thumbnails.get("high", {}).get("url")
                or thumbnails.get("medium", {}).get("url")
                or f"https://img.youtube.com/vi/{vid_id}/hqdefault.jpg"
            )
            results.append({
                "video_id":  vid_id,
                "title":     snippet.get("title", ""),
                "channel":   snippet.get("channelTitle", ""),
                "thumbnail": thumb,
                "url":       f"https://www.youtube.com/watch?v={vid_id}",
                "views":     0,
                "published": snippet.get("publishedAt", ""),
            })
        return results

    except Exception as exc:
        log.warning("YouTube search.list fallback failed for '%s': %s", query, exc)
        return []


# ── MongoDB cache wrapper ─────────────────────────────────────────────────────

async def get_cached_or_search(db, cache_key: str, search_fn, *args, **kwargs) -> list[dict]:
    """
    Check MongoDB media_cache for a fresh result; call search_fn on miss.
    TTL controlled by MEDIA_CACHE_TTL_DAYS (default 30).
    """
    await _ensure_ttl_index(db)

    now = datetime.utcnow()
    try:
        cached = await db.media_cache.find_one({"key": cache_key, "expires_at": {"$gt": now}})
        if cached:
            log.debug("Media cache HIT: %s", cache_key)
            return cached["results"]
    except Exception:
        pass

    log.debug("Media cache MISS: %s", cache_key)
    results = await search_fn(*args, **kwargs)

    # Don't cache empty results — let the next request retry live
    if not results:
        return results

    expires_at = now + timedelta(days=settings.MEDIA_CACHE_TTL_DAYS)
    try:
        await db.media_cache.update_one(
            {"key": cache_key},
            {"$set": {"key": cache_key, "results": results, "expires_at": expires_at, "updated_at": now}},
            upsert=True,
        )
    except Exception as exc:
        log.warning("Failed to cache media results: %s", exc)

    return results
