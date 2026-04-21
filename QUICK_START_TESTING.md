# Quick Start Testing Guide

## Prerequisites
- Backend running on `http://localhost:8001`
- MongoDB connected
- Teacher account created with email: `teacher@example.com` and password: `password123`

## Quick Test (5 minutes)

### 1. Start the Backend
```bash
cd backend
python main.py
```

### 2. Start the Frontend
```bash
cd frontend
npm run dev
```

### 3. Test in Browser
1. Navigate to `http://localhost:5173`
2. Login as teacher
3. Go to AI Assistant → Presentation Creator

### 4. Generate a Test Presentation
1. Fill in the form:
   - **Topic**: "Photosynthesis"
   - **Subject**: "Biology"
   - **Class**: "10"
   - **Board**: "CBSE"
   - **Chapter**: "Chapter 5"
   - **Number of Slides**: 5
   - **Duration**: 30 minutes
   - **Purpose**: "teaching"
   - **Visual Style**: "modern"
   - **Learning Objective**: "Concept Understanding"
   - **Target Audience**: "students"
   - **Tone**: "Engaging"
   - **Content Depth**: "Concise"
   - **Include Mini Quiz**: Yes
   - **Special Instructions**: "Include real-world examples"

2. Click "Generate Presentation"

3. Wait for generation (3-4 minutes)

### 5. Verify Results
- [ ] Presentation generated successfully
- [ ] All 5 slides visible
- [ ] Each slide has:
  - [ ] Title
  - [ ] Subtitle
  - [ ] Bullets
  - [ ] Speaker notes
  - [ ] Engagement prompt
- [ ] Visual descriptions are unique (not generic)

### 6. Test History Feature
1. Click "Save" button in result header
2. Confirm save message
3. Click "History" button in header
4. Verify presentation appears in list
5. Click "Load" to reload it
6. Click "Delete" to remove it

### 7. Test Image Fetching
1. Click "Download PPTX"
2. Wait for image pre-fetching (2-3 minutes)
3. Check browser console for image fetch logs
4. Verify PPTX downloads successfully
5. Open PPTX and verify images are embedded

## Comprehensive Test (15 minutes)

### Run Automated Test Script
```bash
python backend/test_presentation_feature.py
```

This will:
1. Login as teacher
2. Generate presentation with all form context
3. Poll for completion
4. Verify result structure
5. Check image URLs
6. Verify visual descriptions are unique
7. Save to history
8. Load from history
9. Test image proxy
10. Report results

### Expected Output
```
================================================================================
PRESENTATION CREATOR FEATURE TEST
================================================================================

[1] Logging in as teacher...
✓ Logged in successfully

[2] Generating presentation with complete form context...
✓ Presentation generation started with job_id: xxx

[3] Polling for presentation completion...
  Status: processing | Slide 1/5 (20%)
  Status: processing | Slide 2/5 (40%)
  Status: processing | Slide 3/5 (60%)
  Status: processing | Slide 4/5 (80%)
  Status: processing | Slide 5/5 (100%)
✓ Presentation completed!

[4] Verifying presentation result structure...
✓ All required fields present
  - Title: Photosynthesis
  - Subject: Biology
  - Grade: 10
  - Board: CBSE
  - Total slides: 5
  - Purpose: teaching
  - Tone: Engaging
  - Visual style: modern

[5] Verifying slide image URLs...
  Slide 1: ✓ Has image URL
  Slide 2: ✓ Has image URL
  Slide 3: ✓ Has image URL
  Slide 4: ✓ Has image URL
  Slide 5: ✓ Has image URL
✓ 5/5 slides have image URLs

[6] Verifying unique visual descriptions...
  Slide 1: A detailed illustration of photosynthesis process...
  Slide 2: A chloroplast structure diagram showing...
  Slide 3: The light-dependent reactions in a thylakoid...
  Slide 4: The Calvin cycle showing carbon fixation...
  Slide 5: A comparison of C3 and C4 photosynthesis...
✓ 5/5 descriptions are unique

[7] Saving presentation to history...
✓ Presentation saved with ID: xxx

[8] Retrieving presentation history...
✓ Retrieved 1 presentations from history

[9] Loading specific presentation from history...
✓ Loaded presentation: Photosynthesis
  - Slides: 5
  - Created: 2024-04-20T10:30:00

[10] Testing image proxy...
✓ Image proxy working (received 45234 bytes)

================================================================================
✓ ALL TESTS PASSED!
================================================================================
```

## Troubleshooting

### Issue: "Presentation generation timed out"
**Solution**: 
- Check backend logs for errors
- Verify LLM API key is set
- Check network connectivity
- Increase timeout in test script

### Issue: "Image fetch failed"
**Solution**:
- Check backend image-proxy endpoint
- Verify Pollinations.ai is accessible
- Check browser console for CORS errors
- Verify proxy URL is correct

### Issue: "History save failed"
**Solution**:
- Check MongoDB connection
- Verify teacher_id is set correctly
- Check database permissions
- Review backend logs

### Issue: "Visual descriptions are generic"
**Solution**:
- Check LLM prompt in `_llm_single_slide()`
- Verify special_instructions are passed
- Check LLM model is Claude (not older model)
- Review LLM response in backend logs

## Performance Benchmarks

### Expected Times
- Presentation generation: 3-4 minutes
- Image pre-fetching: 2-3 minutes
- PPTX export: 1-2 minutes
- PDF export: 2-3 minutes
- History save: <1 second
- History load: <1 second

### If Slower Than Expected
1. Check network latency
2. Monitor CPU/memory usage
3. Check LLM API response times
4. Verify Pollinations.ai is not rate-limited
5. Check database performance

## Browser Console Logs

### Expected Logs During Generation
```
[PPTX] Planner OK: 5 outlines for job xxx
[PPTX] Slide 1/5 generation...
[PPTX] Slide 2/5 generation...
[PPTX] Slide 3/5 generation...
[PPTX] Slide 4/5 generation...
[PPTX] Slide 5/5 generation...
[PPTX] All slides generated. Generating image URLs...
```

### Expected Logs During Image Fetching
```
[Image fetch] Attempt 1/5 for: https://image.pollinations.ai/prompt/...
[Image fetch] Attempt 1/5 succeeded
[Image fetch] Attempt 1/5 for: https://image.pollinations.ai/prompt/...
[Image fetch] Attempt 1/5 succeeded
...
[PDF Export] All images fetched. Generating PDF...
```

## Next Steps After Testing

1. **Verify Database**
   ```bash
   # Check presentation_history collection
   db.presentation_history.find().pretty()
   ```

2. **Check Logs**
   ```bash
   # Backend logs
   tail -f backend/logs/app.log
   
   # Browser console (F12)
   # Check for any errors
   ```

3. **Performance Monitoring**
   - Monitor image fetch success rate
   - Track LLM API usage
   - Check database query times
   - Monitor error rates

4. **User Acceptance Testing**
   - Have teachers test the feature
   - Collect feedback
   - Verify image quality
   - Check presentation quality

## Support

### Common Questions

**Q: Why does image fetching take so long?**
A: Pollinations.ai generates images on-demand. First image takes 20-60s, subsequent are cached.

**Q: Can I use different image providers?**
A: Currently only Pollinations.ai. Future versions will support DALL-E, Midjourney, etc.

**Q: How many presentations can I save?**
A: Unlimited. History is paginated (100 per page).

**Q: Can I edit presentations after generation?**
A: Not yet. This is a planned feature for future versions.

**Q: How do I share presentations with other teachers?**
A: Sharing is a planned feature. Currently, only the generating teacher can access.

## Reporting Issues

If you encounter issues:

1. **Collect Information**
   - Browser console logs (F12)
   - Backend logs
   - Network tab (F12)
   - Database logs

2. **Create Issue Report**
   - Describe what you were doing
   - Include error messages
   - Attach logs
   - Include system info (OS, browser, etc.)

3. **Contact Support**
   - Email: support@schoolai.com
   - Slack: #presentation-creator
   - GitHub: Issues tab

---

**Happy Testing! 🎉**
