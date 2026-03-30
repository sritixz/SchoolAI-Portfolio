"""
Vin AI router — SSE streaming with XML response format.
Student-wise conversation history, last 10 turns as context.
"""
from fastapi import APIRouter, Depends, BackgroundTasks
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from typing import Optional
from bson import ObjectId
from datetime import datetime
from dependencies import require_role
from database import get_db
from services.llm import stream_vin_chat
import re

router = APIRouter(prefix="/vin-ai", tags=["vin-ai"])

# ─────────────────────────────────────────────────────────────
# SYSTEM PROMPT
# ─────────────────────────────────────────────────────────────
SYSTEM_PROMPT = """You are Vin, a warm and Socratic AI tutor for school students (grades 6-12).
Your job is to GUIDE students to the answer — not just give it. Ask them to think first.
Always be encouraging, patient, and clear.

You MUST respond ONLY in this exact XML format — no text outside the tags:

<response>
  <subject>Subject name here (e.g. Algebra, Physics, History)</subject>

  <content>
Your main explanation here. Be clear and concise. Use simple language.
You may use <b>bold</b> for key terms. Keep it 2-4 sentences max.
  </content>

  <hint>
A nudge toward the answer — NOT the full solution. Make the student think.
Example: "Think about what happens to velocity when acceleration is constant..."
  </hint>

  <steps>
    <step number="1">First step text here</step>
    <step number="2">Second step text here</step>
    <step number="3">Third step text here</step>
  </steps>

  <question>
    A short practice question testing this concept.
    <option correct="false">Wrong answer A</option>
    <option correct="true">Correct answer B</option>
    <option correct="false">Wrong answer C</option>
    <option correct="false">Wrong answer D</option>
  </question>

  <followups>
    <followup>A natural next question the student might ask</followup>
    <followup>Another follow-up question</followup>
    <followup>A deeper or related question</followup>
  </followups>
</response>

Rules:
- <subject> and <content> and <followups> are ALWAYS required
- <hint> is optional — include when the student needs a nudge, not a full answer
- <steps> is optional — include ONLY when there is a clear procedure (solving equations, experiments, etc.)
- <question> is optional — include a practice MCQ when it would help the student test themselves
- NEVER include text outside the <response> tags
- NEVER break the XML structure
- Keep <content> concise — students lose focus with long walls of text
- When a student answers a practice question wrong, explain WHY in <content> and give a new <hint>
"""

# ─────────────────────────────────────────────────────────────
# HELPERS
# ─────────────────────────────────────────────────────────────
def _ser(doc):
    if doc and "_id" in doc:
        doc["_id"] = str(doc["_id"])
    return doc

def _extract_tag(xml: str, tag: str) -> Optional[str]:
    """Extract first occurrence of a tag's content from XML string."""
    m = re.search(rf"<{tag}[^>]*>(.*?)</{tag}>", xml, re.DOTALL)
    return m.group(1).strip() if m else None

def _extract_content_preview(xml: str) -> str:
    """Get plain-text preview from <content> tag."""
    raw = _extract_tag(xml, "content") or ""
    plain = re.sub(r"<[^>]+>", "", raw).strip()
    return plain[:120]

async def _save_conversation(db, student_id: str, question: str, full_xml: str):
    """Background task — save completed conversation turn to MongoDB."""
    subject = _extract_tag(full_xml, "subject") or "General"
    preview = _extract_content_preview(full_xml)
    await db.doubt_history.insert_one({
        "student_id": student_id,
        "question": question,
        "subject": subject,
        "preview": preview,
        "full_xml": full_xml,
        "starred": False,
        "created_at": datetime.utcnow().isoformat(),
    })

# ─────────────────────────────────────────────────────────────
# MODELS
# ─────────────────────────────────────────────────────────────
class ChatRequest(BaseModel):
    message: str
    history: list[dict] = []   # [{role: "user"|"assistant", content: "..."}]

class AnswerRequest(BaseModel):
    question: str              # the MCQ question text
    chosen: str                # the option text the student picked
    correct: bool              # whether it was correct
    history: list[dict] = []

# ─────────────────────────────────────────────────────────────
# ENDPOINTS
# ─────────────────────────────────────────────────────────────
@router.post("/chat")
async def chat(
    body: ChatRequest,
    background_tasks: BackgroundTasks,
    user=Depends(require_role("student")),
    db=Depends(get_db),
):
    """SSE streaming chat. Returns text/event-stream of XML tokens."""
    messages = [{"role": "system", "content": SYSTEM_PROMPT}]

    # Last 10 turns (20 messages) as context
    for h in body.history[-20:]:
        role = h.get("role", "user")
        content = h.get("content", "")
        if role in ("user", "assistant") and content:
            messages.append({"role": role, "content": content})

    messages.append({"role": "user", "content": body.message})

    full_response = []

    async def event_gen():
        try:
            async for token in stream_vin_chat(messages):
                full_response.append(token)
                # Escape newlines for SSE — each data line must be single-line
                safe = token.replace("\n", "\\n")
                yield f"data: {safe}\n\n"
        except Exception as e:
            error_xml = f"<response><subject>General</subject><content>Sorry, I ran into an issue. Please try again.</content><followups><followup>Try asking again</followup></followups></response>"
            yield f"data: {error_xml}\n\n"
        finally:
            yield "data: [DONE]\n\n"
            # Save after stream completes
            assembled = "".join(full_response)
            background_tasks.add_task(
                _save_conversation, db, user["id"], body.message, assembled
            )

    return StreamingResponse(event_gen(), media_type="text/event-stream",
                             headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"})


@router.post("/answer")
async def answer_question(
    body: AnswerRequest,
    background_tasks: BackgroundTasks,
    user=Depends(require_role("student")),
    db=Depends(get_db),
):
    """
    Student answered a practice MCQ. Stream Vin's follow-up explanation.
    If wrong: explain why and give a new hint.
    If correct: reinforce and deepen.
    """
    if body.correct:
        follow_up = f'The student answered the practice question correctly. Their answer was: "{body.chosen}". Reinforce why it\'s correct and deepen their understanding with a slightly harder follow-up question.'
    else:
        follow_up = f'The student answered the practice question INCORRECTLY. The question was: "{body.question}". They chose: "{body.chosen}". Gently explain why that\'s wrong, guide them to the correct reasoning, and give a new <hint> to help them get there.'

    messages = [{"role": "system", "content": SYSTEM_PROMPT}]
    for h in body.history[-20:]:
        role = h.get("role", "user")
        content = h.get("content", "")
        if role in ("user", "assistant") and content:
            messages.append({"role": role, "content": content})
    messages.append({"role": "user", "content": follow_up})

    full_response = []

    async def event_gen():
        try:
            async for token in stream_vin_chat(messages):
                full_response.append(token)
                safe = token.replace("\n", "\\n")
                yield f"data: {safe}\n\n"
        except Exception:
            yield f"data: <response><subject>General</subject><content>Let me try explaining that differently.</content><followups><followup>Ask me again</followup></followups></response>\n\n"
        finally:
            yield "data: [DONE]\n\n"
            assembled = "".join(full_response)
            background_tasks.add_task(
                _save_conversation, db, user["id"],
                f"[Answer feedback] {body.question}", assembled
            )

    return StreamingResponse(event_gen(), media_type="text/event-stream",
                             headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"})


@router.get("/history")
async def doubt_history(user=Depends(require_role("student")), db=Depends(get_db)):
    docs = await db.doubt_history.find(
        {"student_id": user["id"]}
    ).sort("_id", -1).to_list(50)
    return [_ser(d) for d in docs]


@router.post("/history/{doubt_id}/star")
async def toggle_star(doubt_id: str, user=Depends(require_role("student")), db=Depends(get_db)):
    doc = await db.doubt_history.find_one({"_id": ObjectId(doubt_id), "student_id": user["id"]})
    if not doc:
        return {"starred": False}
    new_val = not doc.get("starred", False)
    await db.doubt_history.update_one({"_id": ObjectId(doubt_id)}, {"$set": {"starred": new_val}})
    return {"starred": new_val}
