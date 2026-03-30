"""
Vin AI router — OpenRouter LLM chat with graceful fallback.
"""
from fastapi import APIRouter, Depends
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from typing import Optional
from bson import ObjectId
from datetime import datetime
from dependencies import require_role
from database import get_db
from services.llm import chat_completion, stream_completion
import json

router = APIRouter(prefix="/vin-ai", tags=["vin-ai"])

SYSTEM_PROMPT = """You are Vin, a friendly and encouraging AI tutor for school students (grades 6-12).
Explain concepts clearly with step-by-step breakdowns. Always encourage the student.
Respond ONLY with valid JSON in this exact shape:
{
  "blocks": [
    {"type": "text", "html": "<p>...</p>"},
    {"type": "formula", "formula": "x = (-b ± √D) / 2a"},
    {"type": "steps", "steps": [{"number": 1, "html": "Step text"}]},
    {"type": "hint", "label": "Hint", "text": "hint text"}
  ],
  "followUps": ["Question 1?", "Question 2?"]
}
Only include block types that are relevant. Always include at least one text block.
Keep responses concise and student-friendly."""

def _ser(doc):
    if doc and "_id" in doc:
        doc["_id"] = str(doc["_id"])
    return doc

class ChatRequest(BaseModel):
    message: str
    subject: Optional[str] = None
    history: list[dict] = []

@router.post("/chat")
async def chat(body: ChatRequest, user=Depends(require_role("student")), db=Depends(get_db)):
    messages = [{"role": "system", "content": SYSTEM_PROMPT}]
    # Include last 3 turns of history
    for h in body.history[-6:]:
        messages.append({"role": h.get("role", "user"), "content": h.get("content", "")})
    messages.append({"role": "user", "content": body.message})

    try:
        raw = await chat_completion(messages)
        # Strip markdown code fences if present
        raw = raw.strip()
        if raw.startswith("```"):
            raw = raw.split("```")[1]
            if raw.startswith("json"):
                raw = raw[4:]
        parsed = json.loads(raw.strip())
    except Exception as e:
        # Graceful fallback — return raw text as a text block
        parsed = {
            "blocks": [{"type": "text", "html": f"<p>{raw if 'raw' in dir() else str(e)}</p>"}],
            "followUps": [],
        }

    # Save to doubt history
    await db.doubt_history.insert_one({
        "student_id": user["id"],
        "question": body.message,
        "subject": body.subject or "General",
        "response": parsed,
        "starred": False,
        "created_at": datetime.utcnow().isoformat(),
    })
    return parsed

@router.get("/chat/stream")
async def chat_stream(message: str, user=Depends(require_role("student"))):
    """SSE streaming — yields text chunks."""
    messages = [
        {"role": "system", "content": "You are Vin, a friendly AI tutor. Answer clearly and concisely."},
        {"role": "user", "content": message},
    ]
    async def event_gen():
        try:
            async for chunk in stream_completion(messages):
                yield f"data: {json.dumps({'chunk': chunk})}\n\n"
        except Exception as e:
            yield f"data: {json.dumps({'error': str(e)})}\n\n"
        yield "data: [DONE]\n\n"

    return StreamingResponse(event_gen(), media_type="text/event-stream")

@router.get("/history")
async def doubt_history(user=Depends(require_role("student")), db=Depends(get_db)):
    docs = await db.doubt_history.find({"student_id": user["id"]}).sort("_id", -1).to_list(50)
    return [_ser(d) for d in docs]

@router.post("/history/{doubt_id}/star")
async def toggle_star(doubt_id: str, user=Depends(require_role("student")), db=Depends(get_db)):
    doc = await db.doubt_history.find_one({"_id": ObjectId(doubt_id), "student_id": user["id"]})
    if not doc:
        return {"starred": False}
    new_val = not doc.get("starred", False)
    await db.doubt_history.update_one({"_id": ObjectId(doubt_id)}, {"$set": {"starred": new_val}})
    return {"starred": new_val}

@router.post("/practice")
async def generate_practice(subject: str, topic: str, user=Depends(require_role("student"))):
    prompt = f"""Generate a single MCQ practice problem for a grade 10 student on "{topic}" in {subject}.
Return ONLY valid JSON:
{{"question": "...", "description": "...", "level": "Medium",
"options": [{{"id": "A", "text": "...", "isCorrect": false}}, {{"id": "B", "text": "...", "isCorrect": true}}, {{"id": "C", "text": "...", "isCorrect": false}}, {{"id": "D", "text": "...", "isCorrect": false}}]}}"""
    try:
        raw = await chat_completion([{"role": "user", "content": prompt}])
        raw = raw.strip().lstrip("```json").lstrip("```").rstrip("```").strip()
        return json.loads(raw)
    except Exception as e:
        return {"error": str(e)}
