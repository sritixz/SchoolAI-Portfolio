# Image Fetching Pipeline - Documentation Index

## Overview

This documentation set explains the complete image fetching pipeline used in VinAI to retrieve educational images. The pipeline is a sophisticated, multi-layered system that ensures fast, relevant, and high-quality results.

---

## Documentation Files

### 1. **PIPELINE_QUICK_REFERENCE.md** ⭐ START HERE
**Best for**: Quick lookup, developers in a hurry
- One-minute overview
- Key files and endpoints
- Common queries
- Troubleshooting table
- Quick debugging commands

### 2. **PIPELINE_EXPLANATION_SUMMARY.md**
**Best for**: Understanding the big picture
- Executive summary
- Journey of an image request
- Key components
- Three-tier search strategy
- Performance characteristics
- Configuration guide

### 3. **IMAGE_FETCHING_PIPELINE_EXPLAINED.md**
**Best for**: Deep technical understanding
- Complete step-by-step explanation
- Code examples for each layer
- Query cleaning logic
- Caching strategy
- Error handling
- Performance metrics

### 4. **IMAGE_PIPELINE_VISUAL_GUIDE.md**
**Best for**: Visual learners
- High-level architecture diagram
- Query processing flow
- Cache decision tree
- Three-tier search strategy
- Filtering logic
- Response format
- Component interaction
- State management

### 5. **MEDIA_FIX_ISSUES_RESOLVED.md**
**Best for**: Understanding recent improvements
- Issues that were fixed
- Root causes identified
- Solutions implemented
- Testing procedures
- Deployment steps

---

## Quick Navigation by Role

### 👨‍💼 Project Manager / Stakeholder
1. Read: `PIPELINE_EXPLANATION_SUMMARY.md`
2. Review: Performance section
3. Check: Configuration requirements

### 👨‍💻 Backend Developer
1. Start: `PIPELINE_QUICK_REFERENCE.md`
2. Deep dive: `IMAGE_FETCHING_PIPELINE_EXPLAINED.md`
3. Reference: Code examples and API endpoints
4. Debug: Troubleshooting section

### 👨‍💻 Frontend Developer
1. Start: `PIPELINE_QUICK_REFERENCE.md`
2. Review: Component interaction diagram
3. Check: API endpoints and response format
4. Reference: State management section

### 🚀 DevOps / Infrastructure
1. Start: `PIPELINE_QUICK_REFERENCE.md`
2. Review: Configuration section
3. Check: MongoDB setup
4. Reference: Debugging commands

### 🧪 QA / Testing
1. Start: `PIPELINE_QUICK_REFERENCE.md`
2. Review: Performance metrics
3. Check: Troubleshooting table
4. Reference: Test procedures in `MEDIA_FIX_ISSUES_RESOLVED.md`

---

## Key Concepts

### The Pipeline in 30 Seconds

```
User clicks "Get Images"
    ↓
Extract topic: "Energy Grade 6-A" → "Energy"
    ↓
Check MongoDB cache
    ├─ HIT: Return (< 100ms)
    └─ MISS: Search
    ↓
Three-tier search:
  1. Bing Images (school-level)
  2. Wikipedia (authoritative)
  3. Commons (diagrams)
    ↓
Deduplicate & cache
    ↓
Display 6 images
```

### The Three Tiers

| Tier | Source | Strength | Speed |
|------|--------|----------|-------|
| 1 | Bing Images | School-level, simple | 1-2s |
| 2 | Wikipedia | Authoritative, curated | 1-2s |
| 3 | Commons | High-quality diagrams | 2-3s |

### Performance

- **First request**: 1-3 seconds
- **Cached request**: <100ms
- **Cache duration**: 30 days
- **Success rate**: ~95%

---

## File Structure

```
Documentation/
├─ PIPELINE_QUICK_REFERENCE.md ⭐
├─ PIPELINE_EXPLANATION_SUMMARY.md
├─ IMAGE_FETCHING_PIPELINE_EXPLAINED.md
├─ IMAGE_PIPELINE_VISUAL_GUIDE.md
├─ MEDIA_FIX_ISSUES_RESOLVED.md
└─ PIPELINE_DOCUMENTATION_INDEX.md (this file)

Code/
├─ frontend/src/pages/student/VinAI.jsx
├─ frontend/src/api/mediaApi.js
├─ frontend/src/components/MediaPanel.jsx
├─ backend/routers/media.py
└─ backend/services/media_search.py
```

---

## Common Questions

### Q: How long does it take to get images?
**A**: First request: 1-3 seconds. Cached request: <100ms.
See: `PIPELINE_QUICK_REFERENCE.md` → Performance section

### Q: What if Bing API fails?
**A**: System automatically falls back to Wikipedia, then Commons.
See: `IMAGE_FETCHING_PIPELINE_EXPLAINED.md` → Error Handling

### Q: How is the query processed?
**A**: Removes filler words, grade info, and normalizes spaces.
See: `PIPELINE_EXPLANATION_SUMMARY.md` → Query Processing

### Q: How does caching work?
**A**: 30-day TTL in MongoDB with auto-cleanup.
See: `IMAGE_FETCHING_PIPELINE_EXPLAINED.md` → Caching Layer

### Q: What images are filtered out?
**A**: Charts, logos, screenshots, portraits, etc.
See: `IMAGE_PIPELINE_VISUAL_GUIDE.md` → Filtering Logic

### Q: How do I debug issues?
**A**: Check logs, clear cache, run tests.
See: `PIPELINE_QUICK_REFERENCE.md` → Debugging

---

## Key Files to Know

### Frontend
- **VinAI.jsx**: User interaction, query extraction
- **mediaApi.js**: API calls (fetchImages, fetchImagesFresh)
- **MediaPanel.jsx**: Display images in grid

### Backend
- **media.py**: API endpoints
- **media_search.py**: Search logic, caching, filtering

### Database
- **MongoDB**: media_cache collection with TTL index

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

## Configuration

```env
# Optional: Bing Image Search API key
BING_SEARCH_KEY=your_key

# Required: YouTube API key
YOUTUBE_API_KEY=your_key

# MongoDB connection
MONGODB_URL=mongodb://...
```

---

## Debugging Checklist

- [ ] Check backend logs: `docker logs backend | grep media`
- [ ] Verify MongoDB connection: `db.media_cache.count()`
- [ ] Clear cache: `db.media_cache.deleteMany({})`
- [ ] Test query cleaning: `python backend/test_query_cleaning.py`
- [ ] Test image search: `python backend/test_media_images.py`
- [ ] Check API keys in `.env`
- [ ] Verify TTL index: `db.media_cache.getIndexes()`

---

## Performance Optimization Tips

1. **Enable Bing API**: Faster first-tier results
2. **Monitor cache hit rate**: Should be ~80% after first request
3. **Check API quotas**: Bing (1,000/month), YouTube (varies)
4. **Optimize queries**: More specific queries = better results
5. **Clear old cache**: Manually if needed

---

## Troubleshooting Guide

| Issue | Cause | Solution |
|-------|-------|----------|
| No images | Query too specific | Try broader search |
| Slow loading | Network latency | Check connection |
| Irrelevant images | Poor filtering | Verify grade level |
| Cache not working | MongoDB down | Restart service |
| API errors | Missing keys | Check `.env` |

---

## Related Documentation

- `MEDIA_RECOMMENDATIONS_FIX.md` - Original implementation guide
- `IMPLEMENTATION_NOTES_MEDIA_FIX.md` - Technical implementation details
- `ARCHITECTURE_DIAGRAM.md` - System architecture overview
- `BEFORE_AFTER_COMPARISON.md` - Improvements made

---

## Learning Path

### Beginner
1. Read: `PIPELINE_QUICK_REFERENCE.md`
2. Review: One-minute overview
3. Check: Key files section

### Intermediate
1. Read: `PIPELINE_EXPLANATION_SUMMARY.md`
2. Review: Three-tier search strategy
3. Check: Performance characteristics

### Advanced
1. Read: `IMAGE_FETCHING_PIPELINE_EXPLAINED.md`
2. Review: Code examples
3. Check: Error handling and caching

### Expert
1. Read: `IMAGE_PIPELINE_VISUAL_GUIDE.md`
2. Review: All diagrams
3. Check: Component interaction

---

## Key Takeaways

### What is the Pipeline?
A multi-layered system that retrieves educational images from three sources with intelligent caching and filtering.

### How Does It Work?
1. Extract topic from user message
2. Check MongoDB cache
3. Search three sources (Bing → Wikipedia → Commons)
4. Deduplicate and cache results
5. Display in grid

### Why Three Tiers?
- **Bing**: Fast, school-level results
- **Wikipedia**: Authoritative, curated content
- **Commons**: Specialized diagrams

### How Fast Is It?
- First request: 1-3 seconds
- Cached request: <100ms
- Cache duration: 30 days

### How Reliable Is It?
- Success rate: ~95%
- Three-tier fallback
- Graceful error handling
- Comprehensive logging

---

## Support & Questions

### For Technical Questions
- Check: `IMAGE_FETCHING_PIPELINE_EXPLAINED.md`
- Review: Code examples
- Debug: Using commands in `PIPELINE_QUICK_REFERENCE.md`

### For Architecture Questions
- Check: `IMAGE_PIPELINE_VISUAL_GUIDE.md`
- Review: Diagrams and flowcharts
- Reference: Component interaction

### For Performance Questions
- Check: `PIPELINE_EXPLANATION_SUMMARY.md`
- Review: Performance section
- Reference: Timing breakdown

### For Configuration Questions
- Check: `PIPELINE_QUICK_REFERENCE.md`
- Review: Configuration section
- Reference: Environment variables

---

## Version History

| Version | Date | Changes |
|---------|------|---------|
| 1.0 | May 8, 2026 | Initial documentation |

---

## Document Statistics

| Document | Length | Focus |
|----------|--------|-------|
| PIPELINE_QUICK_REFERENCE.md | ~2KB | Quick lookup |
| PIPELINE_EXPLANATION_SUMMARY.md | ~8KB | Overview |
| IMAGE_FETCHING_PIPELINE_EXPLAINED.md | ~15KB | Technical details |
| IMAGE_PIPELINE_VISUAL_GUIDE.md | ~12KB | Visual diagrams |
| MEDIA_FIX_ISSUES_RESOLVED.md | ~6KB | Recent fixes |

**Total**: ~43KB of comprehensive documentation

---

## Next Steps

1. **Choose your starting point** based on your role
2. **Read the relevant documentation**
3. **Review code examples** if needed
4. **Test with sample queries**
5. **Debug using provided commands**
6. **Reference as needed**

---

**Last Updated**: May 8, 2026
**Version**: 1.0
**Status**: Complete & Production Ready

---

## Quick Links

- 📖 [Quick Reference](PIPELINE_QUICK_REFERENCE.md)
- 📊 [Visual Guide](IMAGE_PIPELINE_VISUAL_GUIDE.md)
- 📝 [Full Explanation](IMAGE_FETCHING_PIPELINE_EXPLAINED.md)
- 📋 [Summary](PIPELINE_EXPLANATION_SUMMARY.md)
- 🔧 [Recent Fixes](MEDIA_FIX_ISSUES_RESOLVED.md)
