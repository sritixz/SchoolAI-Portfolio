# 🚀 Vin AI Quick Start

## What You Got

A real-time streaming AI tutor that:
- Streams responses token-by-token from Gemini Flash
- Provides structured explanations (hints, steps, practice questions)
- Maintains conversation context (last 10 turns)
- Saves all conversations per student
- Allows search, filter, and star conversations

---

## Start in 3 Steps

### 1. Backend

```bash
cd backend

# Add to .env (if not already there)
echo "OPENROUTER_API_KEY=sk-or-v1-YOUR_KEY_HERE" >> .env
echo "OPENROUTER_MODEL=google/gemini-flash-1.5" >> .env

# Start server
uvicorn main:app --reload
```

### 2. Frontend

```bash
cd frontend

# Ensure .env has
echo "VITE_API_URL=http://localhost:8000" >> .env

# Start
npm run dev
```

### 3. Test

1. Login as student
2. Click "Vin AI" from dashboard
3. Ask: "How do I solve x² - 5x + 6 = 0?"
4. Watch it stream live
5. Answer the practice question
6. Check history sidebar

---

## Test Script

```bash
cd backend
python test_vin_streaming.py
```

---

## Files Changed

### Backend
- `backend/services/llm.py` — Added streaming
- `backend/routers/vin_ai.py` — SSE endpoints + XML prompt

### Frontend
- `frontend/src/utils/xmlParser.js` — NEW
- `frontend/src/pages/student/VinAI.jsx` — Complete rewrite
- `frontend/src/store/slices/vinAiSlice.js` — Simplified
- `frontend/src/index.css` — Added animation

---

## How It Works

```
Student asks question
  ↓
Frontend streams from /vin-ai/chat
  ↓
Backend calls OpenRouter with last 10 turns
  ↓
Gemini streams XML response
  ↓
Frontend parses XML progressively
  ↓
Content streams live, then hint/steps/question appear
  ↓
Student answers practice question
  ↓
Wrong answer → /vin-ai/answer streams explanation
  ↓
Conversation saved to MongoDB
  ↓
History sidebar refreshes
```

---

## XML Response Format

```xml
<response>
  <subject>Algebra</subject>
  <content>Main explanation here...</content>
  <hint>A nudge toward the answer...</hint>
  <steps>
    <step number="1">First step</step>
    <step number="2">Second step</step>
  </steps>
  <question>
    Practice question text
    <option correct="false">Wrong A</option>
    <option correct="true">Correct B</option>
    <option correct="false">Wrong C</option>
    <option correct="false">Wrong D</option>
  </question>
  <followups>
    <followup>Next question 1</followup>
    <followup>Next question 2</followup>
  </followups>
</response>
```

---

## Troubleshooting

**Stream doesn't start**
- Check OpenRouter API key in backend/.env
- Check VITE_API_URL in frontend/.env
- Check browser console for errors

**XML parsing errors**
- Check backend logs for LLM response
- Verify model is following XML schema
- Try different model (gemini-2.0-flash-exp:free)

**History not saving**
- Check MongoDB connection
- Check student_id in JWT token
- Check backend logs for errors

---

## Documentation

- **Complete Guide**: `VIN_AI_STREAMING_GUIDE.md`
- **Implementation Summary**: `VIN_AI_COMPLETE.md`
- **Test Script**: `backend/test_vin_streaming.py`

---

## ✅ Done

Vin AI is production-ready. Students can now have real conversations with an AI tutor that streams responses live, provides structured explanations, and maintains conversation history.
