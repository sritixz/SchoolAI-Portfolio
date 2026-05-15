# VinAI Media Recommendations - Image Quality Fix

## Problem Statement
The VinAI recommendations were showing irrelevant, overly complex images that didn't match students' grade levels. Issues included:
- Complex diagrams unsuitable for younger students
- Irrelevant search results
- Poor filtering of educational vs. non-educational content
- No grade-level awareness in image selection

## Solution Overview
Implemented a **three-tier image search strategy** with improved filtering and grade-level awareness:

### 1. **Primary Source: Enhanced Wikipedia Lead Images**
- **What**: Wikipedia's editor-curated lead image for each article
- **Why**: Authoritative, relevant, and typically well-chosen for educational context
- **Improvement**: 
  - Now fetches more candidates and filters for educational relevance
  - Prioritizes articles with educational keywords in their content
  - Applies blacklist to exclude logos, portraits, and irrelevant images

### 2. **Secondary Source: Wikimedia Commons (Diagrams)**
- **What**: Strict diagram filtering from Wikimedia Commons
- **Why**: High-quality, free-to-use educational diagrams
- **Filtering**:
  - Whitelist: Only accepts files with diagram-related keywords (structure, cycle, process, etc.)
  - Blacklist: Excludes charts, screenshots, logos, and non-educational content

### 3. **Tertiary Source: Bing Image Search (Optional)**
- **What**: School-level educational images from Bing
- **Why**: Simple, relevant images at appropriate complexity levels
- **Note**: Requires `BING_SEARCH_KEY` in `.env` (optional, falls back to Wikipedia)

## Implementation Details

### Backend Changes (`backend/services/media_search.py`)

#### New Function: `_google_images_search()`
```python
async def _google_images_search(query, grade, max_results):
    """
    Search for school-level images using Bing Image Search API.
    Falls back to enhanced Wikipedia if Bing is unavailable.
    """
```
- Builds search query with grade context: `"{query} {grade} class educational"`
- Uses Bing Image Search API for reliable, school-appropriate results
- Gracefully falls back to Wikipedia if API key not configured

#### Enhanced Function: `_wikipedia_lead_images()`
- Now fetches 2x candidates to allow better filtering
- Extracts article content to identify educational relevance
- Prioritizes articles with educational keywords
- Sorts results to show educational content first

#### Updated Function: `search_images()`
- New three-tier strategy:
  1. Try Bing/Google Images first (school-level)
  2. Fall back to Wikipedia Lead Images (authoritative)
  3. Use Wikimedia Commons (diagrams) as final fallback
- Deduplicates results across all sources

### Frontend Changes (`frontend/src/components/MediaPanel.jsx`)
- Updated attribution to reflect new image sources
- No UI changes needed - existing MediaPanel already handles images well

## Configuration

### Optional: Enable Bing Image Search
Add to `backend/.env`:
```env
BING_SEARCH_KEY=your_bing_search_api_key
```

**Free tier**: 1,000 calls/month (sufficient for most use cases)

If not configured, the system automatically falls back to Wikipedia + Wikimedia Commons.

## Testing

Run the test script to verify image fetching:
```bash
cd backend
python test_media_images.py
```

This tests various educational queries across different grade levels:
- Photosynthesis (Grade 9)
- Newton's Laws (Grade 10)
- Water Cycle (Grade 6)
- Mitochondria Structure (Grade 11)
- Quadratic Equations (Grade 10)
- Solar System (Grade 7)

## Expected Improvements

### Before
- Complex, irrelevant diagrams
- No grade-level filtering
- Mixed quality results
- Often showed non-educational content

### After
✅ Simple, school-level appropriate images
✅ Grade-aware search queries
✅ Consistent educational quality
✅ Filtered for relevance and appropriateness
✅ Fallback strategy ensures results even if one source fails

## Caching
- Results cached in MongoDB for 30 days
- Cache key includes: query, grade, board
- Clear cache endpoint available for testing

## Performance
- Wikipedia Lead Images: ~1-2 seconds
- Wikimedia Commons: ~2-3 seconds (if needed)
- Bing Images: ~1-2 seconds (if configured)
- Total: Typically 1-3 seconds for full results

## Future Enhancements
1. Add image quality scoring (resolution, clarity)
2. Implement student feedback loop to improve filtering
3. Add support for more image sources (Unsplash, Pexels for simple visuals)
4. Cache thumbnail generation for faster loading
5. Add image relevance scoring based on student interactions
