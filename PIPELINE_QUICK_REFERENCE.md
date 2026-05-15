# Image Fetching Pipeline - Quick Reference Card

## One-Minute Overview

```
User clicks "Get Images"
    ↓
Extract topic from message
    ↓
Check MongoDB cache
    ├─ HIT: Return (< 100ms)
    └─ MISS: Search
    ↓
Three-tier search:
  1. Bing Images (1-2s)
  2. Wikipedia (1-2s)
  3. Commons (2-3s)
    ↓
Deduplicate & cache
    ↓
Display 6 images
```

---

## Key Files

| File | Purpose |
|------|---------|
| `frontend/src/pages/student/VinAI.jsx` | Query extraction, panel opening |
| `frontend/src/api/mediaApi.js` | API calls (fetchImages, fetchImagesFresh) |
| `frontend/src/components/MediaPanel.jsx` | Display images in grid |
| `backend/routers/media.py` | API endpoints (/media/images, /media/videos) |
| `backend/services/media_search.py` | Search logic, caching, filtering |

---

## API Endpoints

```
POST /media/images
├─ Request: { query, grade, board, max_results }
└─ Response: { results: [...] }

POST /media/images/clear-cache
├─ Request: { query, grade, board }
└─ Response: { cleared: true }

POST /media/videos
├─ Request: { query, grade, board, max_results }
└─ Response: { results: [...] }
```

---

## Cache Key Format

```
img:{query}:{board}:{grade}

Examples:
- img:energy:CBSE:6
- img:photosynthesis:ICSE:9
- img:newton's laws:CBSE:10
```

---

## Three-Tier Search

| Tier | Source | Query | Speed | Coverage |
|------|--------|-------|-------|----------|
| 1 | Bing | "Energy 6 class educational" | 1-2s | Good |
| 2 | Wikipedia | Search articles, fetch images | 1-2s | Excellent |
| 3 | Commons | "Energy diagram" + filters | 2-3s | Specialized |

---

## Filtering Rules

**Whitelist** (Accept):
- diagram, structure, cycle, process, illustration
- figure, scheme, formula, equation, wave, circuit
- vector, force, motion, energy, reaction, mechanism

**Blacklist** (Reject):
- bar_graph, pie_chart, table, screenshot, logo
- flag, portrait, building, school, photo, selfie
- thumbnail, banner, icon

---

## Performance

| Metric | Value |
|--------|-------|
| First request | 1-3 seconds |
| Cached request | < 100ms |
| Cache TTL | 30 days |
| Max results | 6 images |
| Success rate | ~95% |

---

## Configuration

```env
# Optional: Bing Image Search
BING_SEARCH_KEY=your_key

# Required: YouTube API
YOUTUBE_API_KEY=your_key

# MongoDB (required)
MONGODB_URL=mongodb://...
```

---

## Common Queries

```javascript
// Fetch images (use cache if available)
fetchImages("Energy", "6", "CBSE")

// Fetch fresh images (clear cache first)
fetchImagesFresh("Energy", "6", "CBSE")

// Fetch videos
fetchVideos("Energy", "6", "CBSE")

// Clear cache
api.post("/media/images/clear-cache", { query, grade, board })
```

---

## Query Extraction

```
Input:  "Hello, can you explain me what is Energy Grade 6-A"
        ↓
Remove filler: "Energy Grade 6-A"
        ↓
Remove grade: "Energy"
        ↓
Output: "Energy"
```

---

## Response Format

```json
{
  "results": [
    {
      "url": "https://...",
      "thumbnail": "https://...",
      "title": "Energy — Wikipedia",
      "source": "https://en.wikipedia.org/wiki/Energy"
    },
    ...
  ]
}
```

---

## Error Handling

```
Tier 1 fails → Try Tier 2
Tier 2 fails → Try Tier 3
Tier 3 fails → Return partial results
All fail → Return []
```

---

## Debugging

```bash
# Check cache
db.media_cache.find({ key: "img:energy:CBSE:6" })

# Clear cache
db.media_cache.deleteMany({})

# View logs
docker logs backend | grep media

# Test query cleaning
python backend/test_query_cleaning.py

# Test image search
python backend/test_media_images.py
```

---

## State Flow

```
Frontend State:
├─ messages: Chat history
├─ mediaQuery: Current search
├─ showMediaPanel: Show/hide
├─ mediaMode: "images" or "videos"
├─ grade: Student grade
└─ board: Student board

MediaPanel State:
├─ images: Results
├─ videos: Results
├─ loading: Boolean
├─ error: Error message
└─ tab: Active tab
```

---

## Component Hierarchy

```
VinAI.jsx
├─ StreamingMessage
│  └─ InlineMediaRecommendations
│     └─ fetchImages()
│
└─ MediaPanel.jsx
   ├─ fetchImagesFresh()
   ├─ ImageCard
   └─ VideoCard
```

---

## Timing Breakdown

```
First Request:
├─ Query extraction:    50ms
├─ API overhead:        50ms
├─ Cache check:         10ms
├─ Tier 1 (Bing):      1000-2000ms
├─ Tier 2 (Wikipedia): 1000-2000ms
├─ Tier 3 (Commons):   2000-3000ms
├─ Deduplication:       10ms
├─ Cache storage:       50ms
└─ Total:              1000-3000ms

Cached Request:
├─ Query extraction:    50ms
├─ API overhead:        50ms
├─ Cache check:         10ms
└─ Total:              < 100ms
```

---

## MongoDB Schema

```javascript
{
  _id: ObjectId,
  key: "img:energy:CBSE:6",
  results: [
    {
      url: "https://...",
      thumbnail: "https://...",
      title: "Energy — Wikipedia",
      source: "https://..."
    }
  ],
  expires_at: ISODate("2026-06-07T..."),
  updated_at: ISODate("2026-05-08T...")
}
```

---

## Educational Keywords

```
explain, describe, concept, theory, law, principle,
process, structure, system, type, form, energy,
force, motion
```

---

## Whitelist Keywords

```
diagram, labeled, labelled, structure, anatomy, cycle,
process, illustration, figure, scheme, formula, equation,
wave, circuit, vector, force, motion, energy, reaction,
mechanism, cross-section, overview, model, layout,
flowchart, pathway, map
```

---

## Blacklist Keywords

```
bar_graph, bar_chart, pie_chart, pie_graph, table,
screenshot, screen_shot, logo, flag, portrait, building,
school, map_of, location, photo, photograph, selfie,
thumbnail, banner, icon
```

---

## Troubleshooting

| Problem | Solution |
|---------|----------|
| No images | Check query, verify APIs, clear cache |
| Slow loading | Check network, enable Bing API |
| Irrelevant images | Verify grade level, try different query |
| Cache not working | Check MongoDB, verify TTL index |
| API errors | Check API keys, verify quotas |

---

## Related Files

- `IMAGE_FETCHING_PIPELINE_EXPLAINED.md` - Full explanation
- `IMAGE_PIPELINE_VISUAL_GUIDE.md` - Visual diagrams
- `PIPELINE_EXPLANATION_SUMMARY.md` - Executive summary
- `MEDIA_FIX_ISSUES_RESOLVED.md` - Recent fixes

---

**Last Updated**: May 8, 2026
**Version**: 1.0
