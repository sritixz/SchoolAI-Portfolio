# PPT Generation: Tech Stack & Workflow

## Overview
Vintutor uses a **3-phase async pipeline** to generate presentations. Teachers define parameters, the backend generates slides via LLM, and the frontend exports to PDF/PPTX formats.

---

## 1. Tech Stack

### Backend
- **Framework**: FastAPI (Python)
- **LLM Service**: OpenRouter API (GPT-4o-mini for planning, Gemini Flash for slides)
- **Image Generation**: Pollinations.ai (free, no API key required)
- **Job Management**: In-memory dictionary + FastAPI BackgroundTasks
- **Database**: MongoDB (for saving presentation history)
- **Async**: asyncio with semaphore for concurrency control (4 concurrent slides)

### Frontend
- **Framework**: React 19 + Redux Toolkit
- **PDF Export**: jsPDF library
- **PPTX Export**: PptxGenJS library
- **Image Fetching**: Fetch API with retry logic
- **State Management**: Redux for form state, polling status

### External Services
- **Pollinations.ai**: Generates slide images (deterministic with seed)
- **OpenRouter**: LLM API for slide content generation

---

## 2. Data Flow Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                    FRONTEND (React)                             │
│  PresentationCreator.jsx                                        │
│  - Form inputs (topic, subject, grade, num_slides, etc.)       │
│  - Polling mechanism (2s intervals)                             │
│  - Export to PDF/PPTX                                           │
└────────────────────┬────────────────────────────────────────────┘
                     │
                     │ POST /teacher/ai-tool/presentation/generate
                     │ (returns job_id)
                     ▼
┌─────────────────────────────────────────────────────────────────┐
│                    BACKEND (FastAPI)                            │
│  teacher.py router                                              │
│                                                                 │
│  1. POST /presentation/generate                                │
│     - Creates job_id                                            │
│     - Starts background task                                    │
│     - Returns immediately                                       │
│                                                                 │
│  2. Background: process_pptx_pipeline()                        │
│     Phase 0: Planner (LLM generates slide outlines)            │
│     Phase 1: Slides (4 concurrent LLM calls per slide)         │
│     Phase 2: Images (Pollinations.ai URLs)                     │
│                                                                 │
│  3. GET /ai-tool/status/{job_id}                               │
│     - Returns: status, current_slide, total_slides, result     │
│                                                                 │
│  4. POST /presentation/save-history                            │
│     - Saves to MongoDB presentation_history collection         │
│                                                                 │
│  5. GET /presentation/history                                  │
│     - Returns all saved presentations for teacher              │
│                                                                 │
│  6. GET /presentation/{presentation_id}                        │
│     - Returns specific saved presentation                      │
└─────────────────────────────────────────────────────────────────┘
                     ▲
                     │ GET /ai-tool/status/{job_id}
                     │ (polls every 2 seconds)
                     │
                     └─ Frontend polls until status = "completed"
```

---

## 3. Detailed Generation Pipeline

### Phase 0: Planner (LLM)
**Input**: Topic, subject, grade, num_slides, learning_objective, board, chapter
**Process**:
1. LLM generates a JSON array of N slide outlines
2. Each outline contains:
   - `slide_number`: integer
   - `title`: specific slide title
   - `sub_topic`: specific aspect of topic
   - `key_points`: array of 3 facts/concepts
   - `visual_hint`: specific visual description (e.g., "Balance scale with x+5 on left, 10 on right")
   - `slide_type`: one of [title, hook, content, example, activity, summary, assessment]

**Output**: Array of slide outlines (JSON strings)

### Phase 1: Slide Generation (Parallel, Semaphore=4)
**Input**: Each slide outline + full context (topic, subject, grade, purpose, tone, etc.)
**Process**:
1. For each slide (1 to N):
   - Call LLM with system prompt (Instructional Designer persona)
   - Pass slide outline as context
   - Retry up to 2 times on failure
   - Fallback to stub slide if both attempts fail
2. Semaphore limits to 4 concurrent LLM calls
3. Each slide returns JSON with:
   - `number`: slide number
   - `type`: slide type
   - `title`: slide title
   - `subtitle`: optional subtitle
   - `content`: dict with:
     - `bullet_points`: array of content bullets
     - `detailed_visual_description`: for image generation
     - `speaker_notes`: notes for teacher
     - `engagement_prompt`: optional interactive element
   - `duration_minutes`: estimated time for slide

**Output**: Array of slide objects with content

### Phase 2: Image Generation (Pollinations.ai)
**Input**: `detailed_visual_description` from each slide
**Process**:
1. For each slide:
   - Generate Pollinations.ai URL with:
     - Slide description
     - Deterministic seed (job_seed + slide_number)
   - URL format: `https://image.pollinations.ai/prompt/{encoded_prompt}?seed={seed}`
   - Image is generated on first fetch (lazy generation)
2. Store URL in `slide.content.image_url`

**Output**: Slides with image URLs

### Result Object
```json
{
  "title": "Linear Equations",
  "subject": "Math",
  "grade": "Grade 8",
  "board": "CBSE",
  "chapter": "Chapter 2",
  "total_slides": 12,
  "duration_minutes": 30,
  "purpose": "teaching",
  "tone": "Engaging",
  "visual_style": "modern",
  "learning_objectives": [
    "By the end, students will demonstrate concept understanding of Linear Equations.",
    "Students will be able to apply Linear Equations concepts to real-world scenarios.",
    "Students will connect Linear Equations to the broader Math curriculum."
  ],
  "slides": [
    {
      "number": 1,
      "type": "title",
      "title": "Linear Equations",
      "subtitle": "Math | Grade 8",
      "content": {
        "bullet_points": ["..."],
        "detailed_visual_description": "...",
        "speaker_notes": "...",
        "image_url": "https://image.pollinations.ai/..."
      },
      "duration_minutes": 2
    },
    // ... more slides
  ],
  "teacher_preparation_notes": "Review Linear Equations materials..."
}
```

---

## 4. Frontend Form Parameters

**PresentationCreator.jsx** collects:

| Parameter | Type | Default | Purpose |
|-----------|------|---------|---------|
| `topic` | string | "Linear Equations" | Main topic |
| `subject` | string | "Math" | Subject area |
| `classLevel` | string | "Grade 8" | Grade/class |
| `numSlides` | number | 12 | Total slides to generate |
| `durationMinutes` | number | 30 | Total presentation time |
| `purpose` | enum | "teaching" | teaching, revision, template |
| `visualStyle` | enum | "modern" | modern, colorful, ncert |
| `board` | enum | "CBSE" | CBSE, ICSE, State Board |
| `chapter` | string | "" | Optional chapter reference |
| `learningObjective` | enum | "Concept Understanding" | Concept Understanding, Application, Analysis |
| `specialInstructions` | string | "" | Custom instructions |
| `targetAudience` | enum | "students" | students, parents, admin |
| `tone` | enum | "Engaging" | Engaging, Formal, Reflection |
| `contentDepth` | enum | "Concise" | Concise, Detailed |
| `includeMiniQuiz` | boolean | false | Include assessment slides |

---

## 5. Job Status Polling

**Frontend polls** `GET /teacher/ai-tool/status/{job_id}` every 2 seconds:

```json
{
  "status": "processing",           // idle, processing, completed, failed
  "current_slide": 5,               // slides completed so far
  "total_slides": 12,               // total slides to generate
  "progress_pct": 42,               // percentage complete
  "result_data": null               // populated when status = "completed"
}
```

**Polling stops when**:
- `status === "completed"` → Display result
- `status === "failed"` → Show error
- 2 consecutive network errors → Stop polling

---

## 6. Export Formats

### PDF Export (`downloadPresentationPdf`)
1. **Pre-fetch all images** from Pollinations.ai (with retry logic)
2. **Create landscape A4 PDF** (one slide per page)
3. **Cover page**: Title, metadata, learning objectives
4. **Content pages**: Each slide with:
   - Slide number
   - Title
   - Bullet points
   - Image (if available)
   - Speaker notes
5. **Teacher notes page**: Preparation notes
6. **Download**: `{title}.pdf`

### PPTX Export (`downloadPresentationPptx`)
1. **Pre-fetch all images** from Pollinations.ai
2. **Create PPTX** with PptxGenJS (13.33 x 7.5 inches)
3. **Cover slide**: Title, metadata, learning objectives
4. **Content slides**: Each slide with:
   - Left accent strip (colored)
   - Top header band (colored)
   - Slide number circle
   - Slide type badge
   - Title
   - Bullet points
   - Image (right side)
   - Speaker notes
   - Duration indicator
5. **Download**: `{title}.pptx`

---

## 7. History Management

### Save to History
**POST** `/teacher/ai-tool/presentation/save-history`
- Saves generated presentation to MongoDB `presentation_history` collection
- Stores all parameters + slides + metadata
- Indexed by `teacher_id` + `created_at`

### Load History
**GET** `/teacher/ai-tool/presentation/history`
- Returns all saved presentations for logged-in teacher
- Sorted by `created_at` (newest first)
- Limited to 100 results

### Get Specific Presentation
**GET** `/teacher/ai-tool/presentation/{presentation_id}`
- Returns full presentation with all slides
- Validates teacher ownership

---

## 8. Error Handling

### Backend
- **Planner fails**: Proceed without outlines (empty array)
- **Slide generation fails**: Retry up to 2 times, then fallback to stub slide
- **Image generation fails**: Store URL anyway (Pollinations generates on first fetch)
- **Job not found**: Return 404 (client stops polling)

### Frontend
- **Network error**: Retry polling up to 2 consecutive failures
- **Image fetch fails**: Use diagram fallback or skip image
- **Export fails**: Show error message, allow retry

---

## 9. Performance Characteristics

| Operation | Time | Notes |
|-----------|------|-------|
| Planner (Phase 0) | ~10-15s | Single LLM call for all outlines |
| Slide generation (Phase 1) | ~30-60s | 4 concurrent LLM calls, 12 slides = ~3 batches |
| Image generation (Phase 2) | ~5-10s | Just URL generation (images lazy-loaded) |
| **Total generation** | **~45-85s** | Depends on LLM latency |
| PDF export | ~30-120s | Depends on image fetch time |
| PPTX export | ~20-60s | Depends on image fetch time |

---

## 10. Key Design Decisions

1. **Async Background Tasks**: Generation doesn't block frontend
2. **Polling Pattern**: Frontend polls status every 2s (simple, no WebSocket)
3. **Semaphore (4 concurrent)**: Balances speed vs. API rate limits
4. **Deterministic Images**: Same seed per job ensures visual cohesion
5. **Lazy Image Loading**: Pollinations generates on first fetch (no pre-generation)
6. **In-Memory Job Store**: Simple, but lost on server restart
7. **Fallback Slides**: Ensures presentation completes even if LLM fails
8. **History in MongoDB**: Persistent storage for teacher reuse

---

## 11. Integration Points for Video/Image Recommendations

For your video/image recommendation feature, you could:

1. **Extend slide content**: Add `recommended_videos` or `recommended_images` array to each slide
2. **Modify Planner**: Include instruction to suggest relevant resources
3. **Post-processing**: After slides generated, call a recommendation service
4. **Frontend display**: Show recommendations in slide preview or sidebar
5. **Export**: Include resource links in PDF/PPTX speaker notes

Example slide with recommendations:
```json
{
  "number": 3,
  "title": "Solving Linear Equations",
  "content": {
    "bullet_points": ["..."],
    "image_url": "...",
    "recommended_videos": [
      {
        "title": "Solving Linear Equations - Khan Academy",
        "url": "https://youtube.com/...",
        "duration": "8:45",
        "relevance": 0.95
      }
    ],
    "recommended_images": [
      {
        "title": "Step-by-step solution diagram",
        "url": "https://...",
        "source": "pexels"
      }
    ]
  }
}
```

---

## 12. Current Limitations & Future Improvements

### Current Limitations
- Job store lost on server restart
- No real-time progress updates (polling only)
- Images lazy-loaded (may be slow on export)
- No video/image recommendations yet
- No slide editing after generation

### Potential Improvements
- Persist job status to Redis/MongoDB
- WebSocket for real-time progress
- Pre-fetch images during generation
- Add recommendation engine
- Slide editor UI
- Template library
- Collaborative editing
