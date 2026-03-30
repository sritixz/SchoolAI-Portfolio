# Vin AI Streaming Chatbot — Complete Implementation Guide

## Overview

Vin AI is now a **real-time streaming chatbot** powered by **Gemini Flash via OpenRouter** with **SSE (Server-Sent Events)** streaming and **XML-based structured responses**.

### Key Features

✅ Real-time token-by-token streaming (no fake animations)  
✅ XML-based response format with structured blocks (content, hints, steps, questions, follow-ups)  
✅ Student-wise conversation history (last 10 turns as context)  
✅ Practice MCQ questions with instant feedback  
✅ Follow-up explanations when students answer incorrectly  
✅ Per-student doubt history with search, filter, and star  
✅ Progressive rendering — blocks appear as XML tags close  

---

## Architecture

### Backend Flow

```
POST /vin-ai/chat
  ↓
Build messages: [system_prompt] + last_10_turns + [user_message]
  ↓
stream_vin_chat() → OpenRouter /chat/completions (stream=True)
  ↓
Yield tokens as SSE: data: <token>\n\n
  ↓
On [DONE] → background task saves to MongoDB
```

### Frontend Flow

```
User types → sendMessage()
  ↓
fetch() with text/event-stream
  ↓
ReadableStream reader → decode chunks
  ↓
Accumulate into xmlBuffer
  ↓
parseVinXML() extracts completed blocks
  ↓
Render progressively: content streams, then hint, steps, question, followups
```

---

## XML Response Schema

The LLM is instructed to always respond in this format:

```xml
<response>
  <subject>Algebra</subject>

  <content>
    Main explanation here. Use <b>bold</b> for key terms.
    Keep it 2-4 sentences max.
  </content>

  <hint>
    A nudge toward the answer — NOT the full solution.
    Example: "Think about what two numbers multiply to give c..."
  </hint>

  <steps>
    <step number="1">First step text</step>
    <step number="2">Second step text</step>
    <step number="3">Third step text</step>
  </steps>

  <question>
    A short practice question testing this concept.
    <option correct="false">Wrong answer A</option>
    <option correct="true">Correct answer B</option>
    <option correct="false">Wrong answer C</option>
    <option correct="false">Wrong answer D</option>
  </question>

  <followups>
    <followup>A natural next question</followup>
    <followup>Another follow-up</followup>
    <followup>A deeper question</followup>
  </followups>
</response>
```

### Tag Rules

- `<subject>`, `<content>`, `<followups>` — **always required**
- `<hint>` — optional, include when student needs a nudge
- `<steps>` — optional, only for procedures (solving equations, experiments)
- `<question>` — optional, include a practice MCQ when helpful

---

## File Changes

### Backend

| File | Changes |
|------|---------|
| `backend/services/llm.py` | Added `stream_vin_chat()` async generator for SSE streaming |
| `backend/routers/vin_ai.py` | Complete rewrite with SSE endpoints, XML system prompt, background save |

### Frontend

| File | Changes |
|------|---------|
| `frontend/src/utils/xmlParser.js` | **NEW** — Incremental XML parser for streaming responses |
| `frontend/src/pages/student/VinAI.jsx` | Complete rewrite with SSE fetch, progressive rendering |
| `frontend/src/store/slices/vinAiSlice.js` | Removed `sendChatMessage` thunk (streaming is local state) |
| `frontend/src/index.css` | Added `@keyframes fadeIn` for block animations |

---

## API Endpoints

### POST `/vin-ai/chat`

**Request:**
```json
{
  "message": "How do I solve x² - 5x + 6 = 0?",
  "history": [
    { "role": "user", "content": "What is a quadratic equation?" },
    { "role": "assistant", "content": "<response>...</response>" }
  ]
}
```

**Response:** `text/event-stream`
```
data: <response>
data: <subject>Algebra</subject>
data: <content>To solve...
data: [DONE]
```

### POST `/vin-ai/answer`

Called when student answers a practice question.

**Request:**
```json
{
  "question": "Solve x² - 5x + 6 = 0",
  "chosen": "x = 2 and x = 4",
  "correct": false,
  "history": [...]
}
```

**Response:** SSE stream with follow-up explanation

### GET `/vin-ai/history`

Returns student's conversation history.

**Response:**
```json
[
  {
    "_id": "...",
    "student_id": "...",
    "question": "How do I solve...",
    "subject": "Algebra",
    "preview": "To solve quadratic equations...",
    "full_xml": "<response>...</response>",
    "starred": false,
    "created_at": "2024-01-15T10:30:00"
  }
]
```

### POST `/vin-ai/history/{doubt_id}/star`

Toggles star on a history item.

**Response:**
```json
{ "starred": true }
```

---

## Environment Variables

Add to `backend/.env`:

```env
OPENROUTER_API_KEY=sk-or-v1-...
OPENROUTER_BASE_URL=https://openrouter.ai/api/v1
OPENROUTER_MODEL=google/gemini-flash-1.5
# or
# OPENROUTER_MODEL=google/gemini-2.0-flash-exp:free
```

The backend uses `settings.OPENROUTER_MODEL` by default, or you can set `VIN_MODEL` separately.

---

## MongoDB Schema

### Collection: `doubt_history`

```javascript
{
  _id: ObjectId,
  student_id: string,
  question: string,           // User's original question
  subject: string,            // Extracted from <subject> tag
  preview: string,            // First 120 chars of <content>
  full_xml: string,           // Complete XML response for replay
  starred: boolean,
  created_at: ISO date string
}
```

---

## How It Works

### 1. User Sends Message

- User types "How do I solve quadratic equations?"
- Frontend adds user message to chat
- Calls `fetch("/vin-ai/chat")` with `Accept: text/event-stream`
- Sends last 10 conversation turns as context

### 2. Backend Streams Response

- Builds messages array: `[system_prompt] + history[-20] + [user_message]`
- Calls OpenRouter with `stream=True`
- Yields tokens as SSE: `data: <token>\n\n`
- On completion: sends `data: [DONE]\n\n`
- Background task saves full XML to MongoDB

### 3. Frontend Parses & Renders

- Accumulates tokens into `xmlBuffer`
- Calls `parseVinXML(xmlBuffer)` after each chunk
- Extracts completed blocks:
  - `<content>` — streams live word by word
  - `<hint>` — appears when `</hint>` received
  - `<steps>` — each step appears when `</step>` received
  - `<question>` — appears when `</question>` received
  - `<followups>` — appear when `</followups>` received

### 4. Student Answers Practice Question

- Student picks an option
- Frontend calls `/vin-ai/answer` with question, chosen answer, and correctness
- Backend streams follow-up explanation:
  - If wrong: explains why, gives new hint
  - If correct: reinforces and deepens understanding

### 5. History Sidebar

- Loads on mount via `fetchDoubtHistory()`
- Shows subject badge, question, preview, timestamp, star button
- Filter by subject, search by keyword
- Click to view full conversation (future: detail view)

---

## Testing

### 1. Start Backend

```bash
cd backend
uvicorn main:app --reload
```

### 2. Start Frontend

```bash
cd frontend
npm run dev
```

### 3. Test Flow

1. Login as a student
2. Navigate to Vin AI
3. Ask: "How do I solve x² - 5x + 6 = 0?"
4. Watch content stream live
5. See hint, steps, and practice question appear
6. Answer the practice question (try wrong answer first)
7. See Vin's follow-up explanation stream
8. Check history sidebar — your conversation is saved
9. Star a conversation
10. Filter by subject

---

## Customization

### Change the Model

Edit `backend/.env`:
```env
OPENROUTER_MODEL=google/gemini-2.0-flash-exp:free
# or
OPENROUTER_MODEL=anthropic/claude-3.5-sonnet
```

### Adjust System Prompt

Edit `backend/routers/vin_ai.py` → `SYSTEM_PROMPT` constant.

### Change Context Window

Currently keeps last 10 turns (20 messages). To change:

**Frontend:** `frontend/src/pages/student/VinAI.jsx`
```js
chatHistoryRef.current = [
  ...chatHistoryRef.current.slice(-20),  // Change -20 to -40 for 20 turns
  { role: "user", content: trimmed },
];
```

**Backend:** `backend/routers/vin_ai.py`
```python
for h in body.history[-20:]:  # Change -20 to -40
```

### Add More Block Types

1. Update system prompt with new XML tag
2. Update `parseVinXML()` in `frontend/src/utils/xmlParser.js`
3. Add renderer in `StreamingMessage` component

---

## Troubleshooting

### Stream doesn't start

- Check OpenRouter API key in `.env`
- Check browser console for CORS errors
- Verify `VITE_API_URL` in frontend `.env`

### XML parsing errors

- Check LLM is following the XML schema
- Add error handling in `parseVinXML()`
- Log `xmlBuffer` to see raw response

### History not saving

- Check MongoDB connection
- Check background task is running
- Verify `student_id` is in JWT token

### Tokens not streaming smoothly

- Check network throttling in DevTools
- Verify SSE headers: `Cache-Control: no-cache`, `X-Accel-Buffering: no`
- Check if proxy/nginx is buffering responses

---

## Next Steps

### Enhancements

- [ ] Add image upload support (send to vision model)
- [ ] Add voice input (speech-to-text)
- [ ] Add LaTeX rendering for math formulas
- [ ] Add code syntax highlighting in responses
- [ ] Add conversation detail view (click history card)
- [ ] Add export conversation as PDF
- [ ] Add share conversation with teacher
- [ ] Add conversation analytics (topics, time spent)

### Performance

- [ ] Add Redis caching for frequent questions
- [ ] Add rate limiting per student
- [ ] Add conversation compression (summarize old turns)
- [ ] Add streaming abort on navigation

---

## Summary

Vin AI is now a production-ready streaming chatbot with:

✅ Real OpenRouter/Gemini integration  
✅ SSE streaming with progressive XML parsing  
✅ Structured responses (hints, steps, questions)  
✅ Conversation context (last 10 turns)  
✅ Practice questions with follow-up explanations  
✅ Per-student history with search/filter/star  

The system is fully functional and ready for student use.
