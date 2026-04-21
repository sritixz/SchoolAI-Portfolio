# Tasks: Hybrid Media Search & PPT Generation Pipeline

## Overview

Three parallel workstreams:
1. **PPT Pipeline Refactor** — replace Pollinations.ai with DuckDuckGo image search; persist job state in MongoDB so server restarts don't lose progress.
2. **VinAI Hybrid Media** — add "Get Images" and "Get Videos" buttons after the first interaction; backend search via DDGS + yt-dlp/YouTube Data API.
3. **Concept Explainer Media** — same image/video search panel surfaced inside the Concept Explainer output view.

---

## Task 1 — Backend: Install & configure new dependencies

**Files:** `backend/requirements.txt`, `backend/config.py`

- [ ] Add `duckduckgo-search>=6.2.0` to `requirements.txt`
- [ ] Add `yt-dlp>=2024.11.18` to `requirements.txt`
- [ ] Add `google-api-python-client>=2.100.0` to `requirements.txt` (YouTube Data API v3)
- [ ] Add `YOUTUBE_API_KEY: str = ""` field to `Settings` in `config.py` (already in `.env`, just needs the model field)
- [ ] Add `MEDIA_CACHE_TTL_DAYS: int = 30` to `Settings` for cache expiry control

---

## Task 2 — Backend: `services/media_search.py` (new file)

Create a unified media search service used by all three features.

**Functions to implement:**

### `search_images(query: str, grade: str, board: str, max_results: int = 6) -> list[dict]`
- Appends `f"{board} educational diagram"` to the query for board alignment
- Calls `asyncio.to_thread(lambda: list(DDGS().images(query_str, max_results=max_results)))` to run sync DDGS in a thread
- Returns list of `{ url, title, source, thumbnail }` dicts
- Strips any results where `url` is empty or doesn't start with `http`

### `search_videos(query: str, grade: str, board: str, max_results: int = 5) -> list[dict]`
- **Phase 1 (yt-dlp)**: `asyncio.to_thread` call to extract top 5 video IDs using `yt-dlp` with `extract_flat=True`, `quiet=True`, searching `ytsearch5:{query} {board} educational`
- **Phase 2 (YouTube Data API)**: Use `googleapiclient.discovery.build("youtube", "v3", developerKey=settings.YOUTUBE_API_KEY)` → `videos().list(part="snippet,statistics", id=",".join(ids))` to fetch clean metadata (title, channel, view count, duration)
- Returns list of `{ video_id, title, channel, thumbnail, views, url }` dicts where `thumbnail = f"https://img.youtube.com/vi/{video_id}/maxresdefault.jpg"`
- If `YOUTUBE_API_KEY` is empty, fall back to yt-dlp metadata only

### `get_cached_or_search(db, cache_key: str, search_fn, *args, **kwargs) -> list[dict]`
- Checks `db.media_cache` for `{ key: cache_key }` where `expires_at > datetime.utcnow()`
- On hit: returns `doc["results"]`
- On miss: calls `search_fn(*args, **kwargs)`, stores result with `expires_at = utcnow() + timedelta(days=settings.MEDIA_CACHE_TTL_DAYS)`, returns results
- Creates a TTL index on `media_cache.expires_at` on first use (use `create_index` with `expireAfterSeconds=0`)

---

## Task 3 — Backend: `/media/search` router (new file `routers/media.py`)

**Endpoints:**

### `POST /media/images`
```
Body: { query: str, grade: str, board: str, max_results?: int }
Auth: require_role("student") OR require_role("teacher")
```
- Builds `cache_key = f"img:{query}:{board}:{grade}"`
- Calls `get_cached_or_search(db, cache_key, search_images, query, grade, board)`
- Returns `{ results: [...] }`

### `POST /media/videos`
```
Body: { query: str, grade: str, board: str, max_results?: int }
Auth: require_role("student") OR require_role("teacher")
```
- Builds `cache_key = f"vid:{query}:{board}:{grade}"`
- Calls `get_cached_or_search(db, cache_key, search_videos, query, grade, board)`
- Returns `{ results: [...] }`

- [ ] Register `media.router` in `backend/main.py`

---

## Task 4 — Backend: PPT pipeline — replace Pollinations.ai with DDGS images

**File:** `backend/routers/teacher.py` (the `process_pptx_pipeline` async function)

Current Phase 2 generates Pollinations.ai URLs. Replace it:

- [ ] In Phase 0 (Planner), ensure each slide outline includes a `visual_keyword` field (short 3-5 word search phrase, e.g. `"mitochondria cell diagram"`) — update the planner prompt to require this field
- [ ] In Phase 2, replace the Pollinations loop with:
  ```python
  async def _fetch_slide_image(slide: dict, grade: str, board: str) -> str | None:
      keyword = (slide.get("content") or {}).get("visual_prompt") or slide.get("title", "")
      query = f"{keyword} {grade} educational"
      results = await asyncio.to_thread(
          lambda: list(DDGS().images(f"{query} {board} diagram", max_results=3))
      )
      return results[0]["image"] if results else None
  ```
- [ ] Run all slide image fetches concurrently with `asyncio.gather` (semaphore=6)
- [ ] Set `content["image_url"]` to the DDGS result URL, or `None` if no result
- [ ] Keep the existing `_pollinations_url` as a fallback if DDGS returns nothing

---

## Task 5 — Backend: PPT job persistence in MongoDB

**Problem:** `presentation_jobs` is an in-memory dict — server restart loses all job state, causing the frontend 404 polling error that stops the progress bar.

**File:** `backend/routers/teacher.py`

- [ ] On job creation (`presentation_generate`), insert a document into `db.presentation_jobs`:
  ```python
  { "_id": job_id, "status": "processing", "current_slide": 0, "total_slides": N,
    "result_data": None, "error": None, "created_at": datetime.utcnow() }
  ```
- [ ] In `process_pptx_pipeline`, replace all `presentation_jobs[job_id][...] = ...` mutations with `await db.presentation_jobs.update_one({"_id": job_id}, {"$set": {...}})`
- [ ] In `presentation_status`, query `db.presentation_jobs.find_one({"_id": job_id})` instead of the in-memory dict
- [ ] Keep the in-memory dict as a write-through cache (write to both) so hot-path polling stays fast
- [ ] Add a TTL index on `presentation_jobs.created_at` with `expireAfterSeconds = 86400` (24h auto-cleanup)
- [ ] The `process_pptx_pipeline` function needs `db` injected — pass it as a parameter from `background_tasks.add_task(process_pptx_pipeline, job_id, params, db)`

---

## Task 6 — Frontend: `api/mediaApi.js` (new file)

**File:** `frontend/src/api/mediaApi.js`

```js
import api from "../api";

export const fetchImages = (query, grade, board) =>
  api.post("/media/images", { query, grade, board }).then(r => r.data.results);

export const fetchVideos = (query, grade, board) =>
  api.post("/media/videos", { query, grade, board }).then(r => r.data.results);
```

---

## Task 7 — Frontend: `MediaPanel` component (new file)

**File:** `frontend/src/components/MediaPanel.jsx`

A reusable panel that shows image and video search results. Used by both VinAI and Concept Explainer.

**Props:** `{ query, grade, board, onClose? }`

**Layout:**
- Two tabs: "Images" and "Videos"
- Images tab: 3-column grid of `<img>` cards with title overlay; clicking opens image in new tab
- Videos tab: 2-column grid of YouTube thumbnail cards (`img.youtube.com/vi/{id}/maxresdefault.jpg`); clicking opens `https://youtube.com/watch?v={id}` in new tab
- Loading skeleton (3 grey placeholder cards) while fetching
- Error state with retry button
- Each card shows title truncated to 2 lines

**Behavior:**
- On mount, auto-fetches both images and videos in parallel (`Promise.all`)
- Caches results in component state (no re-fetch on tab switch)

---

## Task 8 — Frontend: VinAI — add media buttons after first interaction

**File:** `frontend/src/pages/student/VinAI.jsx`

- [ ] Track `interactionCount` state (increment on each completed assistant message where `done === true`)
- [ ] After `interactionCount >= 1`, show two new quick-action buttons in the footer chip row:
  - "Get Images" (`image_search` icon)
  - "Get Videos" (`play_circle` icon)
- [ ] Add `showMediaPanel` state (boolean) and `mediaQuery` state (string)
- [ ] When "Get Images" or "Get Videos" is clicked:
  - Extract the last user message text as `mediaQuery`
  - Derive `board` from `user.board` (fallback `"CBSE"`) and `grade` from `user.grade` (fallback `""`)
  - Set `showMediaPanel = true`
- [ ] Render `<MediaPanel>` as a slide-up drawer above the footer when `showMediaPanel` is true
  - Include a close button that sets `showMediaPanel = false`
- [ ] Add `{ id: "qa4", label: "Get Images", icon: "image_search" }` and `{ id: "qa5", label: "Get Videos", icon: "play_circle" }` to `QUICK_ACTIONS` in `vinAiData.js` — but only render them conditionally in VinAI.jsx based on `interactionCount`

---

## Task 9 — Frontend: Concept Explainer — add media panel to output

**File:** `frontend/src/pages/teacher/ConceptExplainer.jsx`

- [ ] Add a "Find Media" button in the output toolbar (next to Edit/Copy/PDF/History buttons), visible only when `displayResult` is set
- [ ] Clicking it sets `showMediaPanel = true` and derives `mediaQuery` from `form.concept`
- [ ] Render `<MediaPanel query={mediaQuery} grade={form.grade} board={form.board} onClose={() => setShowMediaPanel(false)} />` as a modal overlay (fixed, centered, max-w-3xl, scrollable)

---

## Task 10 — Frontend: PresentationCreator — update slide preview for DDGS images

**File:** `frontend/src/pages/teacher/PresentationCreator.jsx`

The slide preview already handles `slide.content.image_url`. No structural change needed, but:

- [ ] Update the `onError` fallback in the slide image `<img>` tag to show a "No image found" placeholder instead of trying to re-render the visual prompt (since DDGS URLs are direct image links, not AI-generated descriptions)
- [ ] Add a small "🔍 Source" link below each slide image that opens `slide.content.image_source_url` in a new tab (attribution for DDGS results) — backend should include `image_source_url` in the slide content

---

## Task 11 — Backend: Update slide content schema for image attribution

**File:** `backend/routers/teacher.py` (Phase 2 of `process_pptx_pipeline`)

- [ ] When setting `content["image_url"]`, also set `content["image_source_url"]` from the DDGS result's `url` field (the page URL, not the direct image URL)
- [ ] Include `image_alt` from the DDGS result's `title` field for accessibility

---

## Task 12 — Integration & smoke tests

- [ ] Manually test: start PPT generation, restart the backend server mid-generation, verify polling resumes from MongoDB state
- [ ] Manually test: VinAI — send one message, verify "Get Images" and "Get Videos" buttons appear, click each and verify MediaPanel loads results
- [ ] Manually test: Concept Explainer — generate a concept, click "Find Media", verify panel opens with relevant results
- [ ] Verify MongoDB TTL index on `media_cache` by checking `db.media_cache.getIndexes()` in Mongo shell
- [ ] Verify DDGS images appear in PPT slide preview (not Pollinations URLs)

---

## Dependency / execution order

```
Task 1 → Task 2 → Task 3 → Task 8, 9
Task 1 → Task 4 → Task 11 → Task 10
Task 5 (can run in parallel with Task 4)
Task 6 → Task 7 → Task 8, 9
Task 12 (last)
```
