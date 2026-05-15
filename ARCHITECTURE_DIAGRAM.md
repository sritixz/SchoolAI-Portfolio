# VinAI Media Recommendations - Architecture Diagram

## System Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           VinAI Chat Interface                              │
│                                                                             │
│  Student asks: "Explain photosynthesis"                                    │
│  Grade: 9, Board: CBSE                                                     │
│                                                                             │
│  [Get Images] button clicked                                               │
└────────────────────────────────┬────────────────────────────────────────────┘
                                 │
                                 ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                        Frontend: MediaPanel.jsx                             │
│                                                                             │
│  fetchImagesFresh("photosynthesis", "9", "CBSE")                           │
│  fetchVideosFresh("photosynthesis", "9", "CBSE")                           │
└────────────────────────────────┬────────────────────────────────────────────┘
                                 │
                                 ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                    Backend: /media/images endpoint                          │
│                                                                             │
│  POST /media/images                                                        │
│  {                                                                         │
│    "query": "photosynthesis",                                              │
│    "grade": "9",                                                           │
│    "board": "CBSE",                                                        │
│    "max_results": 6                                                        │
│  }                                                                         │
└────────────────────────────────┬────────────────────────────────────────────┘
                                 │
                                 ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                  MongoDB Cache Check (30-day TTL)                           │
│                                                                             │
│  cache_key = "img:photosynthesis:CBSE:9"                                   │
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │ Cache HIT? Return cached results (< 100ms)                         │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
│  Cache MISS? Continue to search...                                         │
└────────────────────────────────┬────────────────────────────────────────────┘
                                 │
                                 ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                    THREE-TIER IMAGE SEARCH STRATEGY                         │
│                                                                             │
│  ┌──────────────────────────────────────────────────────────────────────┐  │
│  │ TIER 1: Bing Image Search (Primary)                                 │  │
│  │                                                                      │  │
│  │ Query: "photosynthesis 9 class educational"                         │  │
│  │ API: https://api.bing.microsoft.com/v7.0/images/search              │  │
│  │ Response Time: ~1-2 seconds                                         │  │
│  │ Results: 6 school-level images                                      │  │
│  │                                                                      │  │
│  │ ✅ If BING_SEARCH_KEY configured                                    │  │
│  │ ⚠️  If not configured → Fallback to Tier 2                          │  │
│  └──────────────────────────────────────────────────────────────────────┘  │
│                                 │                                           │
│                                 ▼                                           │
│  ┌──────────────────────────────────────────────────────────────────────┐  │
│  │ TIER 2: Wikipedia Lead Images (Secondary)                           │  │
│  │                                                                      │  │
│  │ Step 1: Search Wikipedia for "photosynthesis"                       │  │
│  │ API: https://en.wikipedia.org/w/api.php?action=query&list=search   │  │
│  │                                                                      │  │
│  │ Step 2: Fetch lead images for top articles                          │  │
│  │ API: https://en.wikipedia.org/w/api.php?prop=pageimages            │  │
│  │                                                                      │  │
│  │ Step 3: Filter & prioritize educational content                     │  │
│  │ - Extract article content                                           │  │
│  │ - Check for educational keywords                                    │  │
│  │ - Apply blacklist (logos, portraits, etc.)                          │  │
│  │ - Sort by educational relevance                                     │  │
│  │                                                                      │  │
│  │ Response Time: ~1-2 seconds                                         │  │
│  │ Results: Up to 6 authoritative images                               │  │
│  │                                                                      │  │
│  │ ✅ If results < 6 → Continue to Tier 3                              │  │
│  └──────────────────────────────────────────────────────────────────────┘  │
│                                 │                                           │
│                                 ▼                                           │
│  ┌──────────────────────────────────────────────────────────────────────┐  │
│  │ TIER 3: Wikimedia Commons Diagrams (Tertiary)                       │  │
│  │                                                                      │  │
│  │ Query: "photosynthesis diagram OR illustration OR labeled structure"│  │
│  │ API: https://commons.wikimedia.org/w/api.php                        │  │
│  │                                                                      │  │
│  │ Filtering:                                                           │  │
│  │ - Whitelist: diagram, structure, cycle, process, illustration, etc. │  │
│  │ - Blacklist: chart, screenshot, logo, portrait, etc.                │  │
│  │ - File extension validation                                         │  │
│  │                                                                      │  │
│  │ Response Time: ~2-3 seconds                                         │  │
│  │ Results: Up to 6 high-quality diagrams                              │  │
│  │                                                                      │  │
│  │ ✅ If results < 6 → Return what we have                             │  │
│  └──────────────────────────────────────────────────────────────────────┘  │
│                                                                             │
│  Deduplication: Remove duplicate URLs across all tiers                     │
│  Final Results: Up to 6 unique, high-quality images                        │
└────────────────────────────────┬────────────────────────────────────────────┘
                                 │
                                 ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                    Cache Results in MongoDB (30 days)                       │
│                                                                             │
│  db.media_cache.insert({                                                   │
│    "key": "img:photosynthesis:CBSE:9",                                     │
│    "results": [...],                                                       │
│    "expires_at": datetime.utcnow() + timedelta(days=30),                   │
│    "updated_at": datetime.utcnow()                                         │
│  })                                                                        │
└────────────────────────────────┬────────────────────────────────────────────┘
                                 │
                                 ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                    Return Results to Frontend                               │
│                                                                             │
│  {                                                                         │
│    "results": [                                                            │
│      {                                                                     │
│        "url": "https://...",                                               │
│        "thumbnail": "https://...",                                         │
│        "title": "Photosynthesis — Wikipedia",                              │
│        "source": "https://en.wikipedia.org/wiki/Photosynthesis"            │
│      },                                                                    │
│      ...                                                                   │
│    ]                                                                       │
│  }                                                                         │
└────────────────────────────────┬────────────────────────────────────────────┘
                                 │
                                 ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                    Frontend: Display in MediaPanel                          │
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │ Media for "photosynthesis"                                          │   │
│  │ CBSE · Grade 9                                                      │   │
│  │                                                                     │   │
│  │ [Images] [Videos]                                                   │   │
│  │                                                                     │   │
│  │ ┌──────────┐ ┌──────────┐ ┌──────────┐                              │   │
│  │ │ Image 1  │ │ Image 2  │ │ Image 3  │                              │   │
│  │ │ Simple   │ │ Clear    │ │ Relevant │                              │   │
│  │ │ Diagram  │ │ Structure│ │ Cycle    │                              │   │
│  │ └──────────┘ └──────────┘ └──────────┘                              │   │
│  │                                                                     │   │
│  │ ┌──────────┐ ┌──────────┐ ┌──────────┐                              │   │
│  │ │ Image 4  │ │ Image 5  │ │ Image 6  │                              │   │
│  │ │ Grade 9  │ │ Labeled  │ │ Process  │                              │   │
│  │ │ Appropriate│ │ Diagram  │ │ Flow     │                              │   │
│  │ └──────────┘ └──────────┘ └──────────┘                              │   │
│  │                                                                     │   │
│  │ Images via Wikipedia & Wikimedia Commons · Results cached 30 days  │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
│  Student sees: Simple, relevant, grade-appropriate images ✅               │
└─────────────────────────────────────────────────────────────────────────────┘
```

## Data Flow Diagram

```
┌──────────────────┐
│  Student Query   │
│  + Grade Level   │
└────────┬─────────┘
         │
         ▼
┌──────────────────────────────────────────┐
│  Frontend: mediaApi.js                   │
│  fetchImages(query, grade, board)        │
└────────┬─────────────────────────────────┘
         │
         ▼
┌──────────────────────────────────────────┐
│  Backend: /media/images endpoint         │
│  POST request with query params          │
└────────┬─────────────────────────────────┘
         │
         ▼
┌──────────────────────────────────────────┐
│  MongoDB Cache Check                     │
│  get_cached_or_search()                  │
└────────┬─────────────────────────────────┘
         │
    ┌────┴────┐
    │          │
    ▼          ▼
  MISS       HIT
    │          │
    │          └──────────────────┐
    │                             │
    ▼                             │
┌──────────────────────────────┐  │
│  search_images()             │  │
│  Three-tier strategy         │  │
└──────────────────────────────┘  │
    │                             │
    ▼                             │
┌──────────────────────────────┐  │
│  Tier 1: Bing Images         │  │
│  (if configured)             │  │
└──────────────────────────────┘  │
    │                             │
    ▼                             │
┌──────────────────────────────┐  │
│  Tier 2: Wikipedia Images    │  │
│  (if needed)                 │  │
└──────────────────────────────┘  │
    │                             │
    ▼                             │
┌──────────────────────────────┐  │
│  Tier 3: Commons Diagrams    │  │
│  (if needed)                 │  │
└──────────────────────────────┘  │
    │                             │
    └──────────────┬──────────────┘
                   │
                   ▼
        ┌──────────────────────┐
        │  Deduplicate Results │
        │  Cache in MongoDB    │
        └──────────────────────┘
                   │
                   ▼
        ┌──────────────────────┐
        │  Return to Frontend  │
        │  Display in Panel    │
        └──────────────────────┘
```

## Component Interaction

```
VinAI.jsx
├── StreamingMessage
│   └── InlineMediaRecommendations
│       └── fetchImages() → mediaApi.js
│           └── api.post("/media/images")
│               └── Backend: /media/images endpoint
│                   └── search_images()
│                       ├── _google_images_search()
│                       ├── _wikipedia_lead_images()
│                       └── _commons_diagram_search()
│
└── MediaPanel.jsx
    ├── fetchImagesFresh()
    ├── fetchVideosFresh()
    └── Display results
        ├── ImageCard
        └── VideoCard
```

## Error Handling Flow

```
search_images()
│
├─ Try Bing Images
│  ├─ Success → Return results
│  └─ Fail → Log warning, continue
│
├─ Try Wikipedia Images
│  ├─ Success → Return results
│  └─ Fail → Log warning, continue
│
├─ Try Commons Diagrams
│  ├─ Success → Return results
│  └─ Fail → Log warning, continue
│
└─ Return combined results
   ├─ If empty → Return []
   └─ If partial → Return what we have
```

## Caching Strategy

```
Request comes in
│
├─ Generate cache key
│  cache_key = f"img:{query}:{board}:{grade}"
│
├─ Check MongoDB
│  ├─ Found & not expired → Return cached
│  └─ Not found or expired → Search
│
├─ Search (Tier 1, 2, 3)
│
├─ Store in MongoDB
│  ├─ Set expires_at = now + 30 days
│  └─ Set TTL index for auto-cleanup
│
└─ Return results
```

## Performance Timeline

```
Request received
│
├─ Cache check: 5-10ms
│  ├─ HIT → Return (< 100ms total)
│  └─ MISS → Continue
│
├─ Tier 1 (Bing): 1-2 seconds
│  ├─ Success → Proceed to Tier 2 if needed
│  └─ Fail → Proceed to Tier 2
│
├─ Tier 2 (Wikipedia): 1-2 seconds
│  ├─ Success → Proceed to Tier 3 if needed
│  └─ Fail → Proceed to Tier 3
│
├─ Tier 3 (Commons): 2-3 seconds
│  ├─ Success → Deduplicate
│  └─ Fail → Return what we have
│
├─ Deduplicate: 10-50ms
│
├─ Cache store: 50-100ms
│
└─ Return to frontend: 1-3 seconds total
```

---

**Architecture Version**: 1.0
**Last Updated**: May 8, 2026
**Status**: Production Ready
