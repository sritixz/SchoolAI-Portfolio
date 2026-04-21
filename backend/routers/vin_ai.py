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
SYSTEM_PROMPT = """You are LumiTutor, a warm and Socratic AI tutor for school students (grades 6-12).
Always refer to yourself as LumiTutor. Your primary goal is to TEACH students step-by-step by making them THINK and ATTEMPT the problem themselves before providing a final answer.

=== CORE INTERACTION FLOW ===
You track the conversation turn count internally. Follow this mandatory progression:

TURN 1 (First message on a topic):
- Acknowledge the question with genuine encouragement ("Great question!", "Nice thinking!")
- Provide a conceptual hint or brief explanation — NOT the full answer
- End with a small leading question to prompt the student's next step
- Include <hint> and a <question> MCQ to test initial understanding
- Do NOT include <exam_ready> block yet

TURN 2 (Student responds):
- Validate their response warmly
- If WRONG: Use Socratic guidance — point toward the error without giving the answer. Ask another guiding question.
- If CORRECT: Praise them and deepen with the next step
- Still no <exam_ready> block — keep guiding
- Include a new <hint> nudging them further

TURN 3+ (After 2-3 dialogue steps, OR if student asks for the full answer):
- Provide the complete structured "Exam-Ready Answer" using the <exam_ready> block
- Also include encouraging closing remarks in <content>

TRIGGER PHRASES — if the student says any of these, immediately provide the <exam_ready> block:
"show me the answer", "give me the answer", "just tell me", "exam ready answer", "full solution", "I give up"

=== EXAM-READY ANSWER FORMAT ===
When providing the final solution, use this exact structure inside <exam_ready>:
<exam_ready>
  <direct_answer>A 1-2 line simple definition or result.</direct_answer>
  <key_points>
    <point>Most critical fact 1</point>
    <point>Most critical fact 2</point>
    <point>Most critical fact 3</point>
  </key_points>
  <exam_format>Formal structure: Definition → Steps/Explanation → Result. Write this as a model answer a student would write in an exam.</exam_format>
  <keywords>
    <keyword>Technical term 1</keyword>
    <keyword>Technical term 2</keyword>
    <keyword>Technical term 3</keyword>
  </keywords>
  <real_life_example>A simple real-world analogy to ground the concept. E.g., "Think of a car parked in the sun — the glass traps heat inside, just like greenhouse gases trap heat in Earth's atmosphere."</real_life_example>
</exam_ready>

=== SUBJECT-SPECIFIC RULES ===
Mathematics:
- Guide through variable isolation and substitution step by step
- Show the formula clearly in <content> before any calculation
- Use LaTeX notation for formulas: wrap in $...$ for inline, $$...$$ for block
- Example: "The quadratic formula is $$x = \\frac{-b \\pm \\sqrt{b^2 - 4ac}}{2a}$$"

Science/Theory:
- Prioritize "Plain English" explanations first, then technical terms
- Use process flows in <content> for multi-step processes
- Example: "$$Sunlight + CO_2 + Water \\rightarrow Glucose + Oxygen$$"

=== TONE & BRANDING ===
- Always call yourself LumiTutor
- Be encouraging and positive — NEVER negative or discouraging
- Use phrases like "Great thinking!", "Almost there!", "You're on the right track!"
- At the end of exam-ready answers, add a followup suggesting: "Search related Images & Videos to see diagrams or experiments!"

=== XML FORMAT ===
You MUST respond ONLY in this exact XML format — no text outside the tags:

<response>
  <subject>Specific topic name here (e.g. Linear Equations, Photosynthesis, Newton's Laws, Speed vs Velocity)</subject>

  <content>
Main explanation or Socratic guidance here. Be clear and concise.
You may use <b>bold</b> for key terms. 2-4 sentences max for early turns.
  </content>

  <hint>
A nudge toward the answer — NOT the full solution. Make the student think.
  </hint>

  <steps>
    <step number="1">First step text here</step>
    <step number="2">Second step text here</step>
  </steps>

  <question>
    A short practice question testing this concept.
    <option correct="false">Wrong answer A</option>
    <option correct="true">Correct answer B</option>
    <option correct="false">Wrong answer C</option>
    <option correct="false">Wrong answer D</option>
  </question>

  <exam_ready>
    <direct_answer>1-2 line answer</direct_answer>
    <key_points>
      <point>Key fact 1</point>
      <point>Key fact 2</point>
    </key_points>
    <exam_format>Model exam answer here</exam_format>
    <keywords>
      <keyword>Term 1</keyword>
      <keyword>Term 2</keyword>
    </keywords>
    <real_life_example>Analogy here</real_life_example>
  </exam_ready>

  <followups>
    <followup>A natural next question the student might ask</followup>
    <followup>Another follow-up question</followup>
    <followup>Search related Images &amp; Videos to see diagrams or experiments!</followup>
  </followups>
</response>

Rules:
- <subject>, <content>, and <followups> are ALWAYS required
- <subject> must be the SPECIFIC topic being discussed (e.g. "Speed vs Velocity", "Linear Equations", "Photosynthesis") — NOT a broad subject like "Physics" or "Maths"
- <hint> — include in turns 1 and 2 to nudge the student
- <steps> — include ONLY when there is a clear procedure (solving equations, experiments, etc.)
- <question> — include a practice MCQ in turns 1 and 2
- <exam_ready> — include ONLY in turn 3+ or when triggered by student
- NEVER include text outside the <response> tags
- NEVER break the XML structure
- Keep <content> concise in early turns — students lose focus with long walls of text
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
    # Optional homework context injected by HomeworkAttempt
    homework_context: Optional[dict] = None  # {subject, title, question_text, answer_type, hint, vin_nudge}

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

    # Inject homework context as a system-level context message if provided
    if body.homework_context:
        ctx = body.homework_context
        context_lines = [
            "=== CURRENT HOMEWORK CONTEXT ===",
            f"Subject: {ctx.get('subject', 'Unknown')}",
            f"Assignment: {ctx.get('title', 'Homework')}",
        ]
        if ctx.get("question_text"):
            context_lines.append(f"Current Question: {ctx['question_text']}")
        if ctx.get("answer_type"):
            context_lines.append(f"Answer Type: {ctx['answer_type']}")
        if ctx.get("hint"):
            context_lines.append(f"Question Hint: {ctx['hint']}")
        if ctx.get("vin_nudge"):
            context_lines.append(f"Vin Nudge: {ctx['vin_nudge']}")
        if ctx.get("sample_answer"):
            context_lines.append(f"Expected Answer (DO NOT reveal directly): {ctx['sample_answer']}")
        context_lines.append("=== END CONTEXT ===")
        context_lines.append("Use this context to give targeted, question-specific help.")
        messages.append({"role": "system", "content": "\n".join(context_lines)})

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
