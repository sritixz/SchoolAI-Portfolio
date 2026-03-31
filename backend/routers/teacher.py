from fastapi import APIRouter, Depends, HTTPException
from bson import ObjectId
from datetime import datetime
from dependencies import require_role
from database import get_db
from services.llm import chat_completion
from services.analytics import get_class_performance
from pydantic import BaseModel
from typing import Optional, List
import json

router = APIRouter(prefix="/teacher", tags=["teacher"])

def _ser(doc):
    if doc and "_id" in doc:
        doc["_id"] = str(doc["_id"])
    return doc

class AIToolRequest(BaseModel):
    tool: str
    subject: str
    topic: str
    grade: Optional[str] = None
    extra: Optional[dict] = None

class AIGenerateQuestionsRequest(BaseModel):
    subject: str
    topic: str
    grade: str
    count: int = 5
    difficulty: str = "medium"          # easy | medium | hard | mixed
    question_types: List[str] = ["mcq"] # mcq | typed | upload

@router.get("/my-students")
async def my_students(user=Depends(require_role("teacher")), db=Depends(get_db)):
    """Return all students this teacher teaches (based on subject assignments)."""
    teacher = await db.users.find_one({"_id": ObjectId(user["id"])})
    if not teacher:
        raise HTTPException(404, "Teacher not found")
    
    # Get all sections this teacher is assigned to
    assigned_section_ids = teacher.get("assigned_sections", [])
    
    # Get all students in those sections
    students = []
    for section_id in assigned_section_ids:
        section = await db.sections.find_one({"_id": ObjectId(section_id)})
        if not section:
            continue
        
        # Get students in this section
        section_students = await db.users.find(
            {"role": "student", "section_id": section_id},
            {"hashed_password": 0, "otp_hash": 0}
        ).to_list(None)
        
        # Get subject assignments for this teacher in this section
        assignments = await db.subject_assignments.find({
            "section_id": section_id,
            "teacher_id": user["id"]
        }).to_list(None)
        subjects = [a["subject"] for a in assignments]
        
        for student in section_students:
            students.append({
                **_ser(student),
                "class_name": section.get("class_name"),
                "subjects_taught": subjects
            })
    
    return students

@router.get("/my-sections")
async def my_sections(user=Depends(require_role("teacher")), db=Depends(get_db)):
    """Return all sections this teacher is assigned to with subject details."""
    teacher = await db.users.find_one({"_id": ObjectId(user["id"])})
    if not teacher:
        raise HTTPException(404, "Teacher not found")
    
    assigned_section_ids = teacher.get("assigned_sections", [])
    sections = []
    
    for section_id in assigned_section_ids:
        section = await db.sections.find_one({"_id": ObjectId(section_id)})
        if not section:
            continue
        
        # Get subject assignments
        assignments = await db.subject_assignments.find({
            "section_id": section_id,
            "teacher_id": user["id"]
        }).to_list(None)
        
        # Count students
        student_count = await db.users.count_documents({
            "role": "student",
            "section_id": section_id
        })
        
        sections.append({
            **_ser(section),
            "subjects": [a["subject"] for a in assignments],
            "student_count": student_count
        })
    
    return sections

@router.get("/students/by-class")
async def students_by_class(class_name: str, user=Depends(require_role("teacher")), db=Depends(get_db)):
    """Return students in a section — used in the homework assign step."""
    # Support both class_name lookup and section_id lookup
    section = await db.sections.find_one({"class_name": class_name})
    if section:
        section_id = str(section["_id"])
        docs = await db.users.find(
            {"role": "student", "section_id": section_id},
            {"_id": 1, "name": 1, "avatar": 1, "roll_no": 1}
        ).to_list(None)
    else:
        # Fallback: old class field
        docs = await db.users.find(
            {"role": "student", "class": class_name},
            {"_id": 1, "name": 1, "avatar": 1, "roll_no": 1}
        ).to_list(None)
    return [{"id": str(d["_id"]), "name": d.get("name", ""), "avatar": d.get("avatar"),
             "roll_no": d.get("roll_no")} for d in docs]

# ─────────────────────────────────────────────────────────────
# DASHBOARD
# ─────────────────────────────────────────────────────────────

@router.get("/dashboard")
async def dashboard(user=Depends(require_role("teacher")), db=Depends(get_db)):
    teacher = await db.users.find_one({"_id": ObjectId(user["id"])}, {"hashed_password": 0})
    if not teacher:
        raise HTTPException(404, "Teacher not found")
    teacher = _ser(teacher)

    # Pending submissions needing review (submitted + AI done, not yet graded)
    pending_review = await db.homework_submissions.count_documents(
        {"status": "submitted", "final_grade": None}
    )
    # Homework created by this teacher
    hw_count = await db.homework.count_documents({"created_by": user["id"]})

    # Recent submissions (last 10) for this teacher's homework
    teacher_hw_ids = [
        str(h["_id"])
        async for h in db.homework.find({"created_by": user["id"]}, {"_id": 1})
    ]
    recent_subs_cursor = db.homework_submissions.find(
        {"homework_id": {"$in": teacher_hw_ids}, "status": {"$in": ["submitted", "graded"]}}
    ).sort("submitted_at", -1).limit(10)
    recent_subs_raw = await recent_subs_cursor.to_list(None)

    # Enrich with student name + homework title
    recent_submissions = []
    for sub in recent_subs_raw:
        student = await db.users.find_one({"_id": ObjectId(sub["student_id"])}, {"name": 1})
        hw      = await db.homework.find_one({"_id": ObjectId(sub["homework_id"])}, {"title": 1})
        recent_submissions.append({
            "submission_id":  str(sub["_id"]),
            "student_id":     sub["student_id"],
            "student_name":   student.get("name", "Unknown") if student else "Unknown",
            "homework_title": hw.get("title", "Homework") if hw else "Homework",
            "status":         sub.get("status"),
            "auto_score_pct": sub.get("auto_score_pct"),
            "submitted_at":   sub.get("submitted_at"),
            "ai_analysed":    sub.get("ai_analysis") is not None,
        })

    # Parent messages count (unread)
    parent_messages_count = await db.messages.count_documents({"teacher_id": user["id"]})

    # Interventions count (students with learning gaps flagged)
    interventions_count = await db.interventions.count_documents({"teacher_id": user["id"]})

    return {
        "teacher":            teacher,
        "pending_review":     pending_review,
        "homework_count":     hw_count,
        "recent_submissions": recent_submissions,
        "parent_messages":    parent_messages_count,
        "interventions":      interventions_count,
    }

@router.get("/schedule")
async def schedule(user=Depends(require_role("teacher")), db=Depends(get_db)):
    docs = await db.schedules.find({"teacher_id": user["id"]}).to_list(None)
    return [_ser(d) for d in docs]

@router.get("/interventions")
async def interventions(user=Depends(require_role("teacher")), db=Depends(get_db)):
    docs = await db.interventions.find({"teacher_id": user["id"]}).to_list(None)
    return [_ser(d) for d in docs]

@router.get("/analytics/{class_id}")
async def class_analytics(class_id: str, user=Depends(require_role("teacher")), db=Depends(get_db)):
    return await get_class_performance(class_id, db)

@router.get("/topic-mastery")
async def topic_mastery(class_id: str, user=Depends(require_role("teacher")), db=Depends(get_db)):
    docs = await db.mastery_heatmap.find({"class_id": class_id}).to_list(None)
    return [_ser(d) for d in docs]

# ─────────────────────────────────────────────────────────────
# AI TOOLS
# ─────────────────────────────────────────────────────────────

@router.post("/ai-tool")
async def ai_tool(body: AIToolRequest, user=Depends(require_role("teacher"))):
    extra = body.extra or {}
    prompts = {
        "worksheet": f"""Create a classroom worksheet for:
Subject: {body.subject}, Topic: {body.topic}, Grade: {body.grade or extra.get('classLevel','')},
Difficulty: {extra.get('difficulty','Medium')}, Total questions: {extra.get('totalQuestions',10)},
Question types requested: {extra.get('questionTypes','mcq,shortAnswer,longAnswer')}.

Return ONLY valid JSON (no markdown):
{{
  "title": "...",
  "subject": "{body.subject}",
  "grade": "...",
  "topic": "{body.topic}",
  "difficulty": "...",
  "instructions": "Read all questions carefully. Show your working where required.",
  "sections": [
    {{
      "type": "MCQ",
      "questions": [
        {{"number": 1, "text": "...", "options": ["A. ...", "B. ...", "C. ...", "D. ..."], "answer": "A", "marks": 1}}
      ]
    }},
    {{
      "type": "Short Answer",
      "questions": [
        {{"number": 5, "text": "...", "marks": 2, "sample_answer": "..."}}
      ]
    }},
    {{
      "type": "Long Answer",
      "questions": [
        {{"number": 8, "text": "...", "marks": 5, "sample_answer": "..."}}
      ]
    }}
  ],
  "total_marks": 20,
  "estimated_time_minutes": 30
}}""",

        "lessonplan": f"""Create a detailed lesson plan for:
Subject: {body.subject}, Topic: {body.topic}, Grade: {body.grade or extra.get('classLevel','')},
Duration: {extra.get('durationMinutes',45)} minutes,
Instructional methods: {extra.get('instructionalMethods','Guided Practice, Lecture')},
Resources: {extra.get('resources','Projector, Whiteboard')},
Selected objectives: {extra.get('objectives','')},
Specific class needs: {extra.get('specificNeeds','')}.

Return ONLY valid JSON (no markdown):
{{
  "title": "Lesson Plan: {body.topic}",
  "subject": "{body.subject}",
  "grade": "...",
  "duration_minutes": {extra.get('durationMinutes',45)},
  "learning_objectives": ["By the end of this lesson, students will be able to..."],
  "materials": ["..."],
  "sections": [
    {{
      "name": "Hook",
      "duration_minutes": 5,
      "teacher_activity": "...",
      "student_activity": "...",
      "notes": "..."
    }},
    {{
      "name": "Recap / Prior Knowledge",
      "duration_minutes": 5,
      "teacher_activity": "...",
      "student_activity": "...",
      "notes": "..."
    }},
    {{
      "name": "Main Instruction",
      "duration_minutes": 15,
      "teacher_activity": "...",
      "student_activity": "...",
      "notes": "..."
    }},
    {{
      "name": "Guided Practice",
      "duration_minutes": 10,
      "teacher_activity": "...",
      "student_activity": "...",
      "notes": "..."
    }},
    {{
      "name": "Exit Ticket",
      "duration_minutes": 5,
      "teacher_activity": "...",
      "student_activity": "...",
      "notes": "..."
    }}
  ],
  "differentiation": {{
    "support": "...",
    "extension": "..."
  }},
  "assessment": "...",
  "homework_suggestion": "..."
}}""",

        "quiz":         f"Generate 5 MCQ questions on '{body.topic}' in {body.subject}. Return JSON: {{\"questions\": [{{\"text\": \"...\", \"options\": [\"A\", \"B\", \"C\", \"D\"], \"correct\": \"A\"}}]}}",
        "concept":      f"Explain '{body.topic}' in {body.subject} for grade {body.grade} students. Use analogies. Return JSON: {{\"explanation\": \"...\", \"analogy\": \"...\", \"key_points\": []}}",
        "presentation": f"Create a 10-slide outline for '{body.topic}' in {body.subject}. Return JSON: {{\"slides\": [{{\"number\": 1, \"title\": \"...\", \"bullets\": []}}]}}",
        "grading":      f"Grade this student answer on '{body.topic}': {json.dumps(body.extra)}. Return JSON: {{\"score\": 7, \"max_score\": 10, \"feedback\": \"...\", \"suggestions\": []}}",
    }
    prompt = prompts.get(body.tool, f"Help with {body.tool} for {body.topic} in {body.subject}. Return JSON.")
    raw = await chat_completion([{"role": "user", "content": prompt}])
    raw = raw.strip().lstrip("```json").lstrip("```").rstrip("```").strip()
    try:
        return json.loads(raw)
    except Exception:
        return {"content": raw}

@router.post("/ai-generate-questions")
async def ai_generate_questions(body: AIGenerateQuestionsRequest, user=Depends(require_role("teacher"))):
    """Generate homework questions with AI — returns structured Question objects."""
    type_instructions = {
        "mcq":    "Multiple choice with 4 options, mark the correct one with is_correct: true",
        "typed":  "Open-ended question requiring a written answer, include a sample_answer",
        "upload": "Diagram/graph question requiring a drawn/uploaded answer",
    }
    types_desc = "; ".join(type_instructions[t] for t in body.question_types if t in type_instructions)

    prompt = f"""Generate {body.count} homework questions for:
Subject: {body.subject}, Topic: {body.topic}, Grade: {body.grade}, Difficulty: {body.difficulty}
Question types: {types_desc}

Return ONLY valid JSON:
{{
  "questions": [
    {{
      "id": "q1",
      "question_number": 1,
      "total_questions": {body.count},
      "question_text": "...",
      "answer_type": "mcq",
      "options": [{{"id": "o1", "text": "...", "is_correct": false}}],
      "hint": "...",
      "vin_nudge": "...",
      "max_points": 1,
      "sample_answer": null
    }}
  ]
}}"""

    raw = await chat_completion([{"role": "user", "content": prompt}])
    raw = raw.strip().lstrip("```json").lstrip("```").rstrip("```").strip()
    try:
        data = json.loads(raw)
        return data.get("questions", [])
    except Exception:
        return []

# ─────────────────────────────────────────────────────────────
# EVALUATE — Teacher grading workspace
# ─────────────────────────────────────────────────────────────

@router.get("/evaluate/{homework_id}")
async def evaluate_homework_list(homework_id: str, user=Depends(require_role("teacher")), db=Depends(get_db)):
    """Returns all submissions for a homework with AI analysis, ready for teacher review."""
    try:
        hw = await db.homework.find_one({"_id": ObjectId(homework_id), "created_by": user["id"]})
    except Exception:
        raise HTTPException(400, "Invalid ID")
    if not hw:
        raise HTTPException(404, "Homework not found")

    submissions = await db.homework_submissions.find({"homework_id": homework_id}).to_list(None)
    # Enrich with student names
    enriched = []
    for sub in submissions:
        student = await db.users.find_one({"_id": ObjectId(sub["student_id"])}, {"name": 1, "avatar": 1})
        enriched.append({
            **_ser(sub),
            "student_name":   student.get("name", "Unknown") if student else "Unknown",
            "student_avatar": student.get("avatar") if student else None,
        })

    return {
        "homework": _ser(hw),
        "submissions": enriched,
        "stats": {
            "total_assigned": len(hw.get("assigned_students", [])),
            "submitted":      len([s for s in submissions if s.get("status") in ("submitted", "graded")]),
            "graded":         len([s for s in submissions if s.get("status") == "graded"]),
            "pending_ai":     len([s for s in submissions if s.get("ai_analysis") is None]),
        },
    }

# ─────────────────────────────────────────────────────────────
# COMMUNICATION
# ─────────────────────────────────────────────────────────────

@router.get("/parent-communication")
async def parent_messages(user=Depends(require_role("teacher")), db=Depends(get_db)):
    docs = await db.messages.find({"teacher_id": user["id"]}).sort("_id", -1).to_list(50)
    return [_ser(d) for d in docs]

@router.post("/parent-communication/send")
async def send_parent_message(student_id: str, message: str,
                               user=Depends(require_role("teacher")), db=Depends(get_db)):
    doc = {
        "teacher_id": user["id"],
        "student_id": student_id,
        "message":    message,
        "direction":  "teacher_to_parent",
        "sent_at":    datetime.utcnow().isoformat(),
    }
    result = await db.messages.insert_one(doc)
    return {"id": str(result.inserted_id)}
