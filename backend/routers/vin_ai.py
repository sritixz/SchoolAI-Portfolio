"""
Vin AI router - SSE streaming with XML response format.
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
from services.ocr import extract_text_from_url, extract_text_from_urls
from config import settings
import httpx
import re
import uuid
import asyncio


def _grade_band(grade_str: str) -> str:
    """Return 'junior' (5-8) or 'senior' (9-12) based on grade string."""
    try:
        g = int("".join(filter(str.isdigit, str(grade_str))))
        return "junior" if g <= 8 else "senior"
    except Exception:
        return "senior"


_IMAGE_URL_RE = re.compile(
    r"Image URL[s]?:\s*(https?://\S+(?:\s*,\s*https?://\S+)*)", re.IGNORECASE
)

router = APIRouter(prefix="/vin-ai", tags=["vin-ai"])


def build_system_prompt(grade: str = "", board: str = "CBSE") -> str:
    """Build grade-adaptive system prompt for LumiTutor."""
    band = _grade_band(grade)
    grade_label = f"Class {grade}" if grade else "school student"

    if band == "junior":
        grade_guidance = (
            "GRADE LEVEL: Classes 5-8 (Junior)\n"
            "- Use SIMPLE, everyday language -- avoid heavy jargon; introduce one new term at a time\n"
            "- Anchor every concept to a relatable real-world analogy (food, sports, daily life)\n"
            "- Encouraging, friendly tone -- celebrate small wins, make learning feel achievable\n"
            "- Maths: focus on the why behind each step, not just the procedure; use number examples\n"
            "- Science: explain cause-and-effect with vivid descriptions; avoid abstract theory\n"
            "- History/Geography/Civics: use storytelling -- who, what, why, what changed\n"
            "- Exam answers: short, clear sentences; simple vocabulary; 3-5 key points max\n"
            "- MCQ options: keep language simple, make distractors plausible but clearly wrong\n"
        )
    else:
        grade_guidance = (
            "GRADE LEVEL: Classes 9-12 (Senior)\n"
            "- Use precise technical terminology -- students need exam-level vocabulary\n"
            "- Derive before you state: show the logical path to formulas and conclusions\n"
            "- Maths: complete step-by-step solutions; state the theorem/formula used at each step;\n"
            "  show all working; bold the final answer with correct units\n"
            "- Physics/Chemistry: include equations, laws, and SI units; connect to real applications\n"
            "- Biology: use correct nomenclature; structure answers as definition -> mechanism -> significance\n"
            "- Commerce/Humanities: use subject-specific frameworks (e.g. demand-supply, constitutional articles)\n"
            "- Exam answers: comprehensive, well-structured, proper academic language;\n"
            "  match the mark allocation -- 1-mark = 1 line, 3-mark = 3 points, 5-mark = full paragraph\n"
            "- MCQ options: use precise language; distractors should test common misconceptions\n"
        )

    prompt = f"""You are LumiTutor, an AI tutor for {board} {grade_label} students.
You are sharp, warm, and direct -- like a brilliant friend who explains things clearly.
Always call yourself LumiTutor. Never say "I am an AI".

BANNED OPENERS -- never start a response with any of these or anything similar:
"Great question!", "Of course!", "Certainly!", "No problem!", "No worries!",
"Let's make it super clear!", "Let's try to make this clear!", "LumiTutor is here to help!",
"Sure!", "Absolutely!", "Happy to help!", "Let me explain!", "Allow me to explain!",
"That's a great topic!", "Glad you asked!", any sentence that doesn't immediately address the question.

Start EVERY response with the actual answer or explanation. First word = substance.

=== STUDENT CONTEXT ===
Grade: {grade_label} | Board: {board}

=== GRADE GUIDANCE ===
{grade_guidance}
=== RESPONSE LENGTH -- THIS IS THE MOST IMPORTANT RULE ===

Match response length to the question. Think how ChatGPT or Gemini answers:
- Short question ("What are integers?") -> clear explanation: definition + how it works + 1-2 examples.
  Cover the concept properly in <content> -- 4-6 sentences. Then add a hint and MCQ.
- Medium question ("Explain photosynthesis") -> solid explanation covering the key mechanism, examples, significance.
- Complex/multi-part question -> full treatment with steps and structure.
- Problem to solve ("Solve x^2 - 5x + 6") -> step-by-step working.

The <content> block is the main explanation -- it should always give the student enough to actually understand
the topic, not just a one-liner. Think of it as the answer a good teacher would give verbally.
DO NOT pad with unnecessary structure. DO NOT always dump every XML tag.
A student asking "what are integers?" does NOT need a 500-word exam essay, but they DO need a real explanation.

=== WHEN TO INCLUDE <exam_ready> ===

INCLUDE <exam_ready> only when:
- Message starts with [EXAM_READY_REQUEST] -- return ONLY the exam_ready block, no content/hint/question filler
- Student explicitly asks: "exam ready", "show exam answer", "give me the full answer",
  "explain in detail", "I need to study this", "what would I write in an exam"
- The question is clearly exam-prep oriented ("5 marks question on...", "write a note on...")
- Student has already seen the basic answer and wants to go deeper
- Message contains [IMAGE_UPLOAD] -- solve it fully

DO NOT include <exam_ready> for:
- Simple "what is X" questions on the first turn
- Short follow-up questions
- Casual curiosity questions

The "Show Exam-Ready Answer" button already exists in the UI -- students can request it anytime.
Trust that. Don't force it on every response.

=== WHEN TO INCLUDE <hint> AND <question> ===

INCLUDE <hint> when: the concept has a useful mnemonic, analogy, or shortcut worth sharing
INCLUDE <question> MCQ when: it's a new concept and a quick quiz would reinforce it
OMIT both when: it's a follow-up, a problem-solving step, or the student just answered the MCQ

=== WHEN TO INCLUDE <steps> ===

ONLY when there is actual step-by-step working: solving equations, derivations, experiments, proofs.
Never for conceptual explanations.

=== MCQ ANSWER RESPONSES ===
- Correct: brief praise + why it's right (1 sentence) -- no need for exam_ready unless they ask
- Wrong: kind correction + explain the misconception (2-3 sentences)

=== MATH FORMATTING -- CRITICAL ===

LaTeX ALLOWED only inside <content> and <steps>:
- ALWAYS wrap LaTeX in $ delimiters -- NEVER write bare commands without them
- Inline: $x^2 + 1$, $F = ma$, $\text{{Upthrust}} = \rho \times V \times g$
- Display: $$E = mc^2$$, $$x = \\frac{{-b \\pm \\sqrt{{b^2 - 4ac}}}}{{2a}}$$
- WRONG: \text{{Upthrust (F_B)}} = \text{{Weight}} (bare LaTeX without $ = broken red text)
- RIGHT: $\text{{Upthrust (F_B)}} = \text{{Weight of displaced fluid}}$

LaTeX FORBIDDEN inside <direct_answer>, <point>, <exam_format>, <keyword>, <real_life_example>, <hint>, <followup>:
- Write fractions as: p/q, 1/2, 3/4 (never \\frac)
- Write exponents as: x^2, 10^6 (no $ signs)
- Write Greek letters as words: "pi", "delta" (never \\pi, \\Delta)
- WRONG: "where $q \\neq 0$" -- RIGHT: "where q is not zero"

Always plain text: H2O, CO2, NaCl, "Rs" for currency, m/s for units

=== OUTPUT RULES ===
- <b>bold</b> only for key technical terms -- never whole sentences
- No markdown (**, ##) outside XML tags -- renders as raw characters
- No filler phrases, no padding, no "let me explain this clearly" meta-commentary
- Tone: direct, warm, confident

=== XML FORMAT ===
Respond ONLY in this XML. No text outside tags. Start with <response>, end with </response>.

<response>
  <subject>Specific topic (e.g. Integers, Photosynthesis, Newton's Third Law)</subject>

  <content>
Explanation of the concept. Use <b>bold</b> for key terms.
- For any "what is / explain / define" question: give a proper explanation -- definition, how it works,
  concrete examples, and why it matters. Aim for 4-6 sentences. The student should understand the topic
  fully from <content> alone, before they even see the hint or MCQ.
- For problem-solving: brief setup of what concept applies, then use <steps> for the working.
- Scale up for complex questions, scale down only for very simple one-liners.
  </content>

  <hint>
A SHORT memory aid, mnemonic, or analogy -- ONLY after the full explanation in <content>.
1-2 sentences max. This is a supplement, not the explanation itself.
WRONG: using <hint> to explain the concept for the first time.
RIGHT: "Memory trick: integers = IN-TEGer = IN-TEGral/whole, no fractions allowed."
  </hint>

  <steps>
    <step number="1">Only include when solving a problem step by step</step>
    <step number="2">Each step on its own line</step>
    <step number="3">Final answer with units</step>
  </steps>

  <question>
Question text goes here -- one focused MCQ on the core concept.
    <option correct="false">Wrong option A</option>
    <option correct="true">Correct option B</option>
    <option correct="false">Wrong option C</option>
    <option correct="false">Wrong option D</option>
  </question>

  <exam_ready>
    <direct_answer>1-2 sentence exam answer. Plain text only -- no LaTeX fractions or symbols.</direct_answer>
    <key_points>
      <point>Key point 1 -- plain text, no LaTeX</point>
      <point>Key point 2</point>
      <point>Key point 3</point>
    </key_points>
    <exam_format>
Model exam answer. Plain text only -- write fractions as a/b, exponents as x^2.
Adapt length to mark allocation if mentioned.
    </exam_format>
    <keywords>
      <keyword>Term 1</keyword>
      <keyword>Term 2</keyword>
    </keywords>
    <real_life_example>Plain text analogy. No LaTeX.</real_life_example>
  </exam_ready>

  <media_query>2-5 word search phrase for educational images/videos</media_query>

  <followups>
    <followup>Natural next question</followup>
    <followup>Related concept to explore</followup>
  </followups>
</response>

=== TAG RULES ===
ALWAYS:     <subject>, <content>, <media_query>, <followups>
OPTIONAL:   <hint>, <question> -- include when genuinely useful
OPTIONAL:   <exam_ready> -- only when student needs exam prep (see rules above)
OPTIONAL:   <steps> -- only for procedural step-by-step working
NEVER:      Text outside <response> tags. Broad subjects like "Maths" or "Science".
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


async def _save_conversation(db, student_id: str, question: str, full_xml: str, session_id: str):
    """Background task - save completed conversation turn to MongoDB."""
    subject = _extract_tag(full_xml, "subject") or "General"
    preview = _extract_content_preview(full_xml)
    now = datetime.utcnow().isoformat()
    await db.doubt_history.insert_one({
        "student_id": student_id,
        "session_id": session_id,
        "question": question,
        "subject": subject,
        "preview": preview,
        "full_xml": full_xml,
        "starred": False,
        "created_at": now,
    })
    # Upsert session metadata
    await db.chat_sessions.update_one(
        {"session_id": session_id, "student_id": student_id},
        {
            "$set": {
                "student_id": student_id,
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
    homework_context: Optional[dict] = None
    session_id: Optional[str] = None  # client-generated UUID for this conversation


class AnswerRequest(BaseModel):
    question: str
    chosen: str
    correct: bool
    history: list[dict] = []
    session_id: Optional[str] = None


@router.post("/transcribe")
async def transcribe_audio(
    file: UploadFile = File(...),
    user=Depends(require_role("student")),
):
    """Transcribe student voice using Groq API."""
    try:
        audio_bytes = await file.read()
        filename = file.filename or "audio.webm"
        
        print(f"[TRANSCRIBE] Received file: {filename}")
        print(f"[TRANSCRIBE] Size: {len(audio_bytes)} bytes")
        print(f"[TRANSCRIBE] First 20 bytes (hex): {audio_bytes[:20].hex()}")
        
        if len(audio_bytes) < 100:
            return {"text": "", "error": "Audio file too small"}

        # Send to Groq API
        async with httpx.AsyncClient(timeout=60.0) as client:
            try:
                print(f"[TRANSCRIBE] Sending to Groq API...")
                
                # Prepare multipart form data
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
                
                print(f"[TRANSCRIBE] Groq response status: {groq_resp.status_code}")
                print(f"[TRANSCRIBE] Groq response body: {groq_resp.text}")
                
                if groq_resp.status_code != 200:
                    error_data = groq_resp.json()
                    print(f"[TRANSCRIBE] Error details: {error_data}")
                    return {"text": "", "error": str(error_data.get("error", {}).get("message", "Unknown error"))}
                
                groq_resp.raise_for_status()
                transcript_data = groq_resp.json()
                transcribed_text = transcript_data.get("text", "").strip()
                
                print(f"[TRANSCRIBE] Parsed JSON: {transcript_data}")
                print(f"[TRANSCRIBE] Final text: '{transcribed_text}'")
                return {"text": transcribed_text}
                
            except Exception as e:
                print(f"[TRANSCRIBE] ERROR: {str(e)}")
                import traceback
                traceback.print_exc()
                return {"text": "", "error": str(e)}
    except Exception as e:
        print(f"[TRANSCRIBE] OUTER ERROR: {str(e)}")
        import traceback
        traceback.print_exc()
        return {"text": "", "error": str(e)}


@router.post("/transcribe-test")
async def transcribe_test(
    user=Depends(require_role("student")),
):
    """Test endpoint - returns a test transcription without using microphone."""
    return {"text": "This is a test transcription. The voice feature is working correctly!"}


@router.post("/chat")
async def chat(
    body: ChatRequest,
    background_tasks: BackgroundTasks,
    user=Depends(require_role("student")),
    db=Depends(get_db),
):
    """SSE streaming chat. Returns text/event-stream of XML tokens."""

    # Fetch student profile for grade-adaptive prompt
    student_doc = await db.users.find_one(
        {"_id": ObjectId(user["id"])}, {"grade": 1, "board": 1, "class_name": 1}
    )
    grade = str(student_doc.get("grade") or student_doc.get("class_name") or "") if student_doc else ""
    board = str(student_doc.get("board") or "CBSE") if student_doc else "CBSE"
    system_prompt = build_system_prompt(grade, board)

    # OCR: if the message contains uploaded image URL(s), extract text
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
                f"[IMAGE_UPLOAD] The student uploaded {img_label} of a problem. "
                f"The extracted question/content is:\n\n{extracted}\n\n"
                f"IMPORTANT: This is an uploaded problem - skip the Socratic withholding. "
                f"Solve it completely and correctly right now using the <steps> and <exam_ready> blocks. "
                f"After the full solution, add 2 follow-up questions in <followups> to deepen understanding of the concept."
            )
        else:
            user_message = "I uploaded a problem image but the text could not be read. Please ask me to describe the problem."

    messages = [{"role": "system", "content": system_prompt}]

    # Inject homework context if provided
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

    # Last 20 messages (10 turns) as context
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
                full_response.append(token)
                safe = token.replace("\n", "\\n")
                yield f"data: {safe}\n\n"
        except Exception:
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
    user=Depends(require_role("student")),
    db=Depends(get_db),
):
    """Student answered a practice MCQ. Stream LumiTutor's follow-up explanation."""

    # Fetch student profile for grade-adaptive prompt
    student_doc = await db.users.find_one(
        {"_id": ObjectId(user["id"])}, {"grade": 1, "board": 1, "class_name": 1}
    )
    grade = str(student_doc.get("grade") or student_doc.get("class_name") or "") if student_doc else ""
    board = str(student_doc.get("board") or "CBSE") if student_doc else "CBSE"
    system_prompt = build_system_prompt(grade, board)

    if body.correct:
        follow_up = (
            f'The student answered the practice question correctly. Their answer was: "{body.chosen}". '
            f'Reinforce why it is correct and deepen their understanding with a slightly harder follow-up question.'
        )
    else:
        follow_up = (
            f'The student answered the practice question INCORRECTLY. '
            f'The question was: "{body.question}". They chose: "{body.chosen}". '
            f'Gently explain why that is wrong, guide them to the correct reasoning, '
            f'and give a new <hint> to help them get there.'
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
                full_response.append(token)
                safe = token.replace("\n", "\\n")
                yield f"data: {safe}\n\n"
        except Exception:
            yield "data: <response><subject>General</subject><content>Let me try explaining that differently.</content><followups><followup>Ask me again</followup></followups></response>\n\n"
        finally:
            yield "data: [DONE]\n\n"
            assembled = "".join(full_response)
            background_tasks.add_task(
                _save_conversation, db, user["id"],
                f"[Answer feedback] {body.question}", assembled, session_id
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
async def list_sessions(user=Depends(require_role("student")), db=Depends(get_db)):
    """Return all chat sessions for the student, newest first."""
    docs = await db.chat_sessions.find(
        {"student_id": user["id"]}
    ).sort("updated_at", -1).to_list(100)
    return [_ser(d) for d in docs]


@router.get("/sessions/{session_id}")
async def get_session_turns(session_id: str, user=Depends(require_role("student")), db=Depends(get_db)):
    """Return all turns for a session, oldest first."""
    docs = await db.doubt_history.find(
        {"session_id": session_id, "student_id": user["id"]}
    ).sort("created_at", 1).to_list(200)
    return [_ser(d) for d in docs]


@router.post("/sessions/{session_id}/star")
async def toggle_session_star(session_id: str, user=Depends(require_role("student")), db=Depends(get_db)):
    doc = await db.chat_sessions.find_one({"session_id": session_id, "student_id": user["id"]})
    if not doc:
        return {"starred": False}
    new_val = not doc.get("starred", False)
    await db.chat_sessions.update_one(
        {"session_id": session_id, "student_id": user["id"]},
        {"$set": {"starred": new_val}}
    )
    return {"starred": new_val}


@router.delete("/sessions/{session_id}")
async def delete_session(session_id: str, user=Depends(require_role("student")), db=Depends(get_db)):
    """Delete a chat session and all its turns."""
    await db.chat_sessions.delete_one({"session_id": session_id, "student_id": user["id"]})
    await db.doubt_history.delete_many({"session_id": session_id, "student_id": user["id"]})
    return {"deleted": True}


@router.post("/sessions/{session_id}/pin")
async def toggle_session_pin(session_id: str, user=Depends(require_role("student")), db=Depends(get_db)):
    """Toggle pinned state for a session."""
    doc = await db.chat_sessions.find_one({"session_id": session_id, "student_id": user["id"]})
    if not doc:
        return {"pinned": False}
    new_val = not doc.get("pinned", False)
    await db.chat_sessions.update_one(
        {"session_id": session_id, "student_id": user["id"]},
        {"$set": {"pinned": new_val}}
    )
    return {"pinned": new_val}


class RenameRequest(BaseModel):
    title: str


@router.patch("/sessions/{session_id}/rename")
async def rename_session(session_id: str, body: RenameRequest, user=Depends(require_role("student")), db=Depends(get_db)):
    """Rename a chat session."""
    title = body.title.strip()[:120]
    if not title:
        from fastapi import HTTPException
        raise HTTPException(status_code=400, detail="Title cannot be empty")
    await db.chat_sessions.update_one(
        {"session_id": session_id, "student_id": user["id"]},
        {"$set": {"title": title}}
    )
    return {"title": title}


@router.get("/history")
async def doubt_history(user=Depends(require_role("student")), db=Depends(get_db)):
    docs = await db.doubt_history.find(
        {"student_id": user["id"]}
    ).sort("_id", -1).to_list(50)
    return [_ser(d) for d in docs]


@router.get("/history/{doubt_id}")
async def get_doubt_detail(doubt_id: str, user=Depends(require_role("student")), db=Depends(get_db)):
    """Fetch a single doubt history item (with full_xml) for the authenticated student."""
    try:
        doc = await db.doubt_history.find_one(
            {"_id": ObjectId(doubt_id), "student_id": user["id"]}
        )
    except Exception:
        from fastapi import HTTPException
        raise HTTPException(status_code=400, detail="Invalid doubt ID")
    if not doc:
        from fastapi import HTTPException
        raise HTTPException(status_code=404, detail="Doubt not found")
    return _ser(doc)


@router.post("/history/{doubt_id}/star")
async def toggle_star(doubt_id: str, user=Depends(require_role("student")), db=Depends(get_db)):
    doc = await db.doubt_history.find_one({"_id": ObjectId(doubt_id), "student_id": user["id"]})
    if not doc:
        return {"starred": False}
    new_val = not doc.get("starred", False)
    await db.doubt_history.update_one({"_id": ObjectId(doubt_id)}, {"$set": {"starred": new_val}})
    return {"starred": new_val}


class SaveDraftRequest(BaseModel):
    session_id: str
    messages: list[dict]  # List of {role, text/xmlBuffer}
    subject: Optional[str] = "General"


@router.post("/save-draft")
async def save_draft(req: SaveDraftRequest, user=Depends(require_role("student")), db=Depends(get_db)):
    """Save current chat as a draft session so it appears in history."""
    now = datetime.utcnow().isoformat()

    # Extract first user message as title
    title = "Untitled Chat"
    for msg in req.messages:
        if msg.get("role") == "user":
            title = msg.get("text", "")[:80]
            break

    # Pair up user+assistant messages into turns and save to doubt_history
    # Only insert turns that don't already exist for this session
    existing = await db.doubt_history.find(
        {"session_id": req.session_id, "student_id": user["id"]},
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
            # Skip if already saved (avoid duplicates on repeated draft saves)
            if question and full_xml and question not in existing_questions:
                subject = _extract_tag(full_xml, "subject") or req.subject or "General"
                preview = _extract_content_preview(full_xml)
                turns_to_insert.append({
                    "student_id": user["id"],
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
        await db.doubt_history.insert_many(turns_to_insert)

    turn_count = len(existing) + len(turns_to_insert)

    # Upsert session metadata
    await db.chat_sessions.update_one(
        {"session_id": req.session_id, "student_id": user["id"]},
        {
            "$set": {
                "student_id": user["id"],
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
