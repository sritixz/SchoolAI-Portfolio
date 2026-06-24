"""
Teacher Chat router - "Ask me Anything" SSE streaming with XML response format.
Conversations are grouped into sessions. Each session = one chat thread.
"""
from fastapi import APIRouter, Depends, BackgroundTasks, UploadFile, File
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from typing import Optional
from bson import ObjectId
from datetime import datetime
from dependencies import require_role
from database import get_db
from services.llm import stream_vin_chat
from services.ocr import extract_text_from_urls
from config import settings
import httpx
import re
import uuid

router = APIRouter(prefix="/teacher-chat", tags=["teacher-chat"])

_IMAGE_URL_RE = re.compile(
    r"Image URL[s]?:\s*(https?://\S+(?:\s*,\s*https?://\S+)*)", re.IGNORECASE
)

def build_system_prompt(teacher_name: str = "Teacher") -> str:
    """Build system prompt for teacher chatbot (Ask me Anything)."""
    prompt = f"""You are "Ask me Anything", a brilliant, warm, and highly supportive AI teaching assistant.
You are professional, sharp, and resource-oriented. You speak directly to the teacher as a trusted expert colleague.
Always call yourself "Ask me Anything". Never say "I am an AI".

BANNED OPENERS -- never start a response with any of these or anything similar:
"Great question!", "Of course!", "Certainly!", "No problem!", "No worries!",
"Sure!", "Absolutely!", "Happy to help!", "Let me explain!", "Allow me to explain!",
"Glad to help!", "That's a great topic!", any sentence that doesn't immediately address the query.

Start EVERY response with the actual answer, resource draft, or explanation. First word = substance.

=== TEACHER CONTEXT ===
Teacher Name: {teacher_name}

=== RESPONSE GUIDELINES ===
- If the teacher asks to draft a lesson plan, provide a clear, comprehensive lesson plan with objectives, materials, and timing details.
- If the teacher asks for worksheets/quizzes, outline questions, answers, and brief step-by-step explanations.
- If the teacher asks to draft a message to parents/colleagues, write a professional, warm, and clear message.
- Explain advanced topics or pedagogy cleanly. Connect abstract educational theories to concrete classroom examples.
- When explaining concepts, suggest engaging classroom activities, analogies, or tricks teachers can use to engage students.

=== XML FORMAT ===
Respond ONLY in this XML. No text outside tags. Start with <response>, end with </response>.

<response>
  <subject>Specific topic/task (e.g. Photosynthesis Lesson Plan, Parent Communication, Integers Quiz)</subject>

  <content>
Core explanation, email/message draft, or planning details. Use <b>bold</b> for key educational terminology.
Keep it practical, well-structured, and rich. The teacher should get full value from <content> alone.
  </content>

  <hint>
A quick teaching tip, classroom management recommendation, or pedagogical analogy for the classroom. 1-2 sentences max.
  </hint>

  <steps>
    <step number="1">Only include when outlining a procedural sequence (e.g., phases of a lesson plan, activity steps, or grading criteria)</step>
    <step number="2">Each step on its own line</step>
  </steps>

  <question>
Optional: A sample question, diagnostic MCQ, or assessment task the teacher can print or use for students.
    <option correct="false">Wrong option A</option>
    <option correct="true">Correct option B</option>
    <option correct="false">Wrong option C</option>
    <option correct="false">Wrong option D</option>
  </question>

  <media_query>2-5 word search phrase for related educational slides/images/videos for class presentation</media_query>

  <followups>
    <followup>Natural next step/question the teacher might ask</followup>
    <followup>Related classroom activity or extension topic</followup>
  </followups>
</response>

=== TAG RULES ===
ALWAYS:     <subject>, <content>, <media_query>, <followups>
OPTIONAL:   <hint>, <question> -- include when helpful
OPTIONAL:   <steps> -- only for procedural sequences
NEVER:      Text outside <response> tags.
"""
    return prompt

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

async def _save_conversation(db, teacher_id: str, question: str, full_xml: str, session_id: str):
    """Background task - save completed conversation turn to MongoDB."""
    subject = _extract_tag(full_xml, "subject") or "General"
    preview = _extract_content_preview(full_xml)
    now = datetime.utcnow().isoformat()
    await db.teacher_doubt_history.insert_one({
        "teacher_id": teacher_id,
        "session_id": session_id,
        "question": question,
        "subject": subject,
        "preview": preview,
        "full_xml": full_xml,
        "starred": False,
        "created_at": now,
    })
    # Upsert session metadata
    await db.teacher_chat_sessions.update_one(
        {"session_id": session_id, "teacher_id": teacher_id},
        {
            "$set": {
                "teacher_id": teacher_id,
                "session_id": session_id,
                "subject": subject,
                "updated_at": now,
            },
            "$setOnInsert": {
                "title": question[:80],
                "created_at": now,
                "starred": False,
            },
            "$inc": {"turn_count": 1},
        },
        upsert=True,
    )

class ChatRequest(BaseModel):
    message: str
    history: list[dict] = []
    session_id: Optional[str] = None

class AnswerRequest(BaseModel):
    question: str
    chosen: str
    correct: bool
    history: list[dict] = []
    session_id: Optional[str] = None

@router.post("/transcribe")
async def transcribe_audio(
    file: UploadFile = File(...),
    user=Depends(require_role("teacher")),
):
    """Transcribe teacher voice query using Groq API."""
    try:
        audio_bytes = await file.read()
        filename = file.filename or "audio.webm"
        if len(audio_bytes) < 100:
            return {"text": "", "error": "Audio file too small"}

        async with httpx.AsyncClient(timeout=60.0) as client:
            try:
                files = {
                    "file": (filename, audio_bytes, "audio/webm"),
                }
                data = {
                    "model": "whisper-large-v3-turbo",
                    "language": "en",
                }
                groq_resp = await client.post(
                    "https://api.groq.com/openai/v1/audio/transcriptions",
                    headers={"Authorization": f"Bearer {settings.GROQ_API_KEY}"},
                    files=files,
                    data=data,
                )
                if groq_resp.status_code != 200:
                    return {"text": "", "error": "Transcription API error"}
                
                transcript_data = groq_resp.json()
                return {"text": transcript_data.get("text", "").strip()}
            except Exception as e:
                return {"text": "", "error": str(e)}
    except Exception as e:
        return {"text": "", "error": str(e)}

@router.post("/chat")
async def chat(
    body: ChatRequest,
    background_tasks: BackgroundTasks,
    user=Depends(require_role("teacher")),
    db=Depends(get_db),
):
    """SSE streaming chat for teachers. Returns text/event-stream of XML tokens."""
    # Fetch teacher profile
    teacher_doc = await db.users.find_one(
        {"_id": ObjectId(user["id"])}, {"name": 1}
    )
    teacher_name = teacher_doc.get("name") if teacher_doc else "Teacher"
    system_prompt = build_system_prompt(teacher_name)

    user_message = body.message
    extracted = None
    image_urls = []
    img_match = _IMAGE_URL_RE.search(user_message)
    if img_match:
        raw_urls = img_match.group(1)
        image_urls = [u.strip().rstrip(",") for u in raw_urls.split(",") if u.strip()]
        image_count = len(image_urls)
        extracted = await extract_text_from_urls(image_urls)
        if extracted:
            img_label = f"{image_count} image{'s' if image_count > 1 else ''}"
            user_message = (
                f"[IMAGE_UPLOAD] The teacher uploaded {img_label} of a worksheet, problem, or document. "
                f"The extracted text is:\n\n{extracted}\n\n"
                f"IMPORTANT: Address this uploaded resource fully and assist the teacher with their request."
            )
        else:
            user_message = "I uploaded an image but the text could not be read. Please ask me to describe the problem."

    messages = [{"role": "system", "content": system_prompt}]
    
    # Last 20 turns
    for h in body.history[-20:]:
        role = h.get("role", "user")
        content = h.get("content", "")
        if role in ("user", "assistant") and content:
            messages.append({"role": role, "content": content})

    messages.append({"role": "user", "content": user_message})

    full_response = []
    session_id = body.session_id or str(uuid.uuid4())

    async def event_gen():
        try:
            async for token in stream_vin_chat(messages):
                if token.startswith("[FALLBACK_REASON]:"):
                    yield f"data: {token}\n\n"
                    continue
                full_response.append(token)
                safe = token.replace("\n", "\\n")
                yield f"data: {safe}\n\n"
        except Exception as e:
            import traceback
            traceback.print_exc()
            error_xml = "<response><subject>General</subject><content>Sorry, I ran into an issue. Please try again.</content><followups><followup>Try asking again</followup></followups></response>"
            yield f"data: {error_xml}\n\n"
        finally:
            yield "data: [DONE]\n\n"
            assembled = "".join(full_response)
            save_question = (
                body.message if not img_match
                else f"[Image upload x{len(image_urls)}] " + (extracted or "unreadable")
            )
            background_tasks.add_task(_save_conversation, db, user["id"], save_question, assembled, session_id)

    return StreamingResponse(
        event_gen(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "X-Accel-Buffering": "no",
            "Connection": "keep-alive",
            "Transfer-Encoding": "chunked",
            "X-Content-Type-Options": "nosniff",
        },
    )

@router.post("/answer")
async def answer_question(
    body: AnswerRequest,
    background_tasks: BackgroundTasks,
    user=Depends(require_role("teacher")),
    db=Depends(get_db),
):
    """Teacher answered a sample diagnostic question. Stream feedback."""
    teacher_doc = await db.users.find_one(
        {"_id": ObjectId(user["id"])}, {"name": 1}
    )
    teacher_name = teacher_doc.get("name") if teacher_doc else "Teacher"
    system_prompt = build_system_prompt(teacher_name)

    if body.correct:
        follow_up = (
            f'The teacher answered the sample question correctly. Their choice was: "{body.chosen}". '
            f'Provide a brief comment on why this answer is correct and explain how it can be used to assess students.'
        )
    else:
        follow_up = (
            f'The teacher answered the sample question. Their choice was: "{body.chosen}". '
            f'Discuss this distractor option and why students might common misconception select it, and how to address it.'
        )

    messages = [{"role": "system", "content": system_prompt}]
    for h in body.history[-20:]:
        role = h.get("role", "user")
        content = h.get("content", "")
        if role in ("user", "assistant") and content:
            messages.append({"role": role, "content": content})
    messages.append({"role": "user", "content": follow_up})

    full_response = []
    session_id = body.session_id or str(uuid.uuid4())

    async def event_gen():
        try:
            async for token in stream_vin_chat(messages):
                if token.startswith("[FALLBACK_REASON]:"):
                    yield f"data: {token}\n\n"
                    continue
                full_response.append(token)
                safe = token.replace("\n", "\\n")
                yield f"data: {safe}\n\n"
        except Exception:
            yield "data: <response><subject>General</subject><content>Let me explain that concept further.</content><followups><followup>Ask me again</followup></followups></response>\n\n"
        finally:
            yield "data: [DONE]\n\n"
            assembled = "".join(full_response)
            background_tasks.add_task(
                _save_conversation, db, user["id"],
                f"[Question feedback] {body.question}", assembled, session_id
            )

    return StreamingResponse(
        event_gen(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "X-Accel-Buffering": "no",
            "Connection": "keep-alive",
            "Transfer-Encoding": "chunked",
            "X-Content-Type-Options": "nosniff",
        },
    )

@router.get("/sessions")
async def list_sessions(user=Depends(require_role("teacher")), db=Depends(get_db)):
    """Return all chat sessions for the teacher, newest first."""
    docs = await db.teacher_chat_sessions.find(
        {"teacher_id": user["id"]}
    ).sort("updated_at", -1).to_list(100)
    return [_ser(d) for d in docs]

@router.get("/sessions/{session_id}")
async def get_session_turns(session_id: str, user=Depends(require_role("teacher")), db=Depends(get_db)):
    """Return all turns for a session, oldest first."""
    docs = await db.teacher_doubt_history.find(
        {"session_id": session_id, "teacher_id": user["id"]}
    ).sort("created_at", 1).to_list(200)
    return [_ser(d) for d in docs]

@router.post("/sessions/{session_id}/star")
async def toggle_session_star(session_id: str, user=Depends(require_role("teacher")), db=Depends(get_db)):
    doc = await db.teacher_chat_sessions.find_one({"session_id": session_id, "teacher_id": user["id"]})
    if not doc:
        return {"starred": False}
    new_val = not doc.get("starred", False)
    await db.teacher_chat_sessions.update_one(
        {"session_id": session_id, "teacher_id": user["id"]},
        {"$set": {"starred": new_val}}
    )
    return {"starred": new_val}

@router.delete("/sessions/{session_id}")
async def delete_session(session_id: str, user=Depends(require_role("teacher")), db=Depends(get_db)):
    """Delete a chat session and all its turns."""
    await db.teacher_chat_sessions.delete_one({"session_id": session_id, "teacher_id": user["id"]})
    await db.teacher_doubt_history.delete_many({"session_id": session_id, "teacher_id": user["id"]})
    return {"deleted": True}

@router.post("/sessions/{session_id}/pin")
async def toggle_session_pin(session_id: str, user=Depends(require_role("teacher")), db=Depends(get_db)):
    """Toggle pinned state for a session."""
    doc = await db.teacher_chat_sessions.find_one({"session_id": session_id, "teacher_id": user["id"]})
    if not doc:
        return {"pinned": False}
    new_val = not doc.get("pinned", False)
    await db.teacher_chat_sessions.update_one(
        {"session_id": session_id, "teacher_id": user["id"]},
        {"$set": {"pinned": new_val}}
    )
    return {"pinned": new_val}

class RenameRequest(BaseModel):
    title: str

@router.patch("/sessions/{session_id}/rename")
async def rename_session(session_id: str, body: RenameRequest, user=Depends(require_role("teacher")), db=Depends(get_db)):
    """Rename a chat session."""
    title = body.title.strip()[:120]
    if not title:
        from fastapi import HTTPException
        raise HTTPException(status_code=400, detail="Title cannot be empty")
    await db.teacher_chat_sessions.update_one(
        {"session_id": session_id, "teacher_id": user["id"]},
        {"$set": {"title": title}}
    )
    return {"title": title}

class SaveDraftRequest(BaseModel):
    session_id: str
    messages: list[dict]  # List of {role, text/xmlBuffer}
    subject: Optional[str] = "General"

@router.post("/save-draft")
async def save_draft(req: SaveDraftRequest, user=Depends(require_role("teacher")), db=Depends(get_db)):
    """Save current chat as a draft session so it appears in history."""
    now = datetime.utcnow().isoformat()

    title = "Untitled Chat"
    for msg in req.messages:
        if msg.get("role") == "user":
            title = msg.get("text", "")[:80]
            break

    existing = await db.teacher_doubt_history.find(
        {"session_id": req.session_id, "teacher_id": user["id"]},
        {"question": 1}
    ).to_list(200)
    existing_questions = {d["question"] for d in existing}

    turns_to_insert = []
    messages = req.messages
    i = 0
    while i < len(messages):
        user_msg = messages[i] if messages[i].get("role") == "user" else None
        asst_msg = messages[i + 1] if i + 1 < len(messages) and messages[i + 1].get("role") == "assistant" else None
        if user_msg and asst_msg:
            question = user_msg.get("text", "")
            full_xml = asst_msg.get("xmlBuffer", "")
            if question and full_xml and question not in existing_questions:
                subject = _extract_tag(full_xml, "subject") or req.subject or "General"
                preview = _extract_content_preview(full_xml)
                turns_to_insert.append({
                    "teacher_id": user["id"],
                    "session_id": req.session_id,
                    "question": question,
                    "subject": subject,
                    "preview": preview,
                    "full_xml": full_xml,
                    "starred": False,
                    "created_at": now,
                })
            i += 2
        else:
            i += 1

    if turns_to_insert:
        await db.teacher_doubt_history.insert_many(turns_to_insert)

    turn_count = len(existing) + len(turns_to_insert)

    await db.teacher_chat_sessions.update_one(
        {"session_id": req.session_id, "teacher_id": user["id"]},
        {
            "$set": {
                "teacher_id": user["id"],
                "session_id": req.session_id,
                "subject": req.subject,
                "updated_at": now,
                "turn_count": turn_count,
            },
            "$setOnInsert": {
                "title": title,
                "created_at": now,
                "starred": False,
            },
        },
        upsert=True,
    )

    return {"success": True, "session_id": req.session_id}
