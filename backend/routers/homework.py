from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, BackgroundTasks
from bson import ObjectId
from datetime import datetime
from dependencies import require_role, get_current_user
from database import get_db
from pydantic import BaseModel
from typing import List, Any
from models.homework import (
    HomeworkCreate, HomeworkAssign, HomeworkSubmission,
    TeacherGradeRequest, AIAnalysisRequest,
)
from services.ai_grader import analyse_submission
from services.ocr import extract_text_from_url
from services.s3 import upload_file

router = APIRouter(prefix="/homework", tags=["homework"])

class QuestionsPatch(BaseModel):
    questions: List[Any]

def _ser(doc):
    if doc and "_id" in doc:
        doc["_id"] = str(doc["_id"])
    return doc

# ─────────────────────────────────────────────────────────────
# TEACHER — Create & Assign
# ─────────────────────────────────────────────────────────────

@router.post("/create")
async def create_homework(body: HomeworkCreate, user=Depends(require_role("teacher")), db=Depends(get_db)):
    # Validate that homework has consistent submission type
    if body.submission_type in ["file_upload", "handwritten"]:
        # For file/handwritten types, questions should be empty or minimal
        if body.questions and len(body.questions) > 0:
            # Check if any question has MCQ or typed answer types
            for q in body.questions:
                if q.answer_type in ["mcq", "typed"]:
                    raise HTTPException(
                        400, 
                        f"Homework with submission_type '{body.submission_type}' cannot have MCQ or typed questions. Use 'online_quiz' for interactive questions."
                    )
    
    doc = body.dict()
    doc["created_by"]  = user["id"]
    doc["created_at"]  = datetime.utcnow().isoformat()
    doc["status"]      = "draft"
    doc["submission_counts"] = {"submitted": 0, "pending": 0, "graded": 0}
    doc["ai_assistant_enabled"] = body.ai_assistant_enabled  # Store AI assistant preference
    result = await db.homework.insert_one(doc)
    hw_id = str(result.inserted_id)
    return {"id": hw_id}

@router.put("/{homework_id}")
async def update_homework(homework_id: str, body: HomeworkCreate,
                          user=Depends(require_role("teacher")), db=Depends(get_db)):
    """Update an existing homework's details (title, subject, class, etc.)."""
    try:
        hw = await db.homework.find_one({"_id": ObjectId(homework_id)})
    except Exception:
        raise HTTPException(400, "Invalid ID")
    if not hw:
        raise HTTPException(404, "Homework not found")
    
    # Validate submission type consistency
    if body.submission_type in ["file_upload", "handwritten"]:
        if body.questions and len(body.questions) > 0:
            for q in body.questions:
                if q.answer_type in ["mcq", "typed"]:
                    raise HTTPException(
                        400, 
                        f"Homework with submission_type '{body.submission_type}' cannot have MCQ or typed questions."
                    )
    
    update = {
        "title":                       body.title,
        "subject":                     body.subject,
        "description":                 body.description,
        "assigned_to_class":           body.assigned_to_class,
        "submission_type":             body.submission_type,
        "difficulty_level":            body.difficulty_level,
        "estimated_duration_minutes":  body.estimated_duration_minutes,
        "instructions":                body.instructions,
        "tags":                        body.tags,
        "ai_assistant_enabled":        body.ai_assistant_enabled,  # Update AI assistant preference
        "updated_at":                  datetime.utcnow().isoformat(),
    }
    # Only update questions if provided
    if body.questions:
        update["questions"] = [q.dict() for q in body.questions]
        update["total_marks"] = sum(q.max_points for q in body.questions)
    
    await db.homework.update_one({"_id": ObjectId(homework_id)}, {"$set": update})
    return {"id": homework_id, "updated": True}

@router.patch("/{homework_id}/questions")
async def patch_questions(homework_id: str, body: QuestionsPatch,
                          user=Depends(require_role("teacher")), db=Depends(get_db)):
    """Replace the questions array on an existing draft homework."""
    try:
        hw = await db.homework.find_one({"_id": ObjectId(homework_id), "created_by": user["id"]})
    except Exception:
        raise HTTPException(400, "Invalid ID")
    if not hw:
        raise HTTPException(404, "Homework not found or not yours")
    total_marks = sum(q.get("max_points", 1) if isinstance(q, dict) else 1 for q in body.questions)
    await db.homework.update_one(
        {"_id": ObjectId(homework_id)},
        {"$set": {"questions": body.questions, "total_marks": total_marks}},
    )
    return {"saved": len(body.questions)}

@router.post("/assign")
async def assign_homework(body: HomeworkAssign, user=Depends(require_role("teacher")), db=Depends(get_db)):
    """Assign an existing homework to a list of students (or a whole class)."""
    try:
        hw = await db.homework.find_one({"_id": ObjectId(body.homework_id), "created_by": user["id"]})
    except Exception:
        raise HTTPException(400, "Invalid homework ID")
    if not hw:
        raise HTTPException(404, "Homework not found or not yours")

    update: dict = {"status": "assigned"}
    if body.due_date:
        update["due_date"] = body.due_date

    # Merge new student_ids with existing ones (avoid overwriting other groups)
    if body.student_ids:
        existing = hw.get("assigned_students", [])
        merged = list(set(existing + body.student_ids))
        update["assigned_students"] = merged

    await db.homework.update_one({"_id": ObjectId(body.homework_id)}, {"$set": update})
    return {"assigned": len(body.student_ids)}

@router.get("/library")
async def homework_library(user=Depends(require_role("teacher")), db=Depends(get_db)):
    docs = await db.homework.find({"created_by": user["id"]}).sort("created_at", -1).to_list(None)
    return [_ser(d) for d in docs]

@router.get("/{homework_id}/submissions")
async def list_submissions(homework_id: str, user=Depends(require_role("teacher")), db=Depends(get_db)):
    """All student submissions for a homework, with AI analysis status."""
    docs = await db.homework_submissions.find({"homework_id": homework_id}).to_list(None)
    return [_ser(d) for d in docs]

@router.get("/{homework_id}/submissions/{student_id}")
async def get_submission(homework_id: str, student_id: str, user=Depends(require_role("teacher")), db=Depends(get_db)):
    doc = await db.homework_submissions.find_one({"homework_id": homework_id, "student_id": student_id})
    if not doc:
        raise HTTPException(404, "Submission not found")
    return _ser(doc)

@router.post("/ai-analyse")
async def trigger_ai_analysis(body: AIAnalysisRequest, background: BackgroundTasks,
                               user=Depends(require_role("teacher")), db=Depends(get_db)):
    """Manually trigger AI pre-analysis on a submission."""
    try:
        sub = await db.homework_submissions.find_one({"_id": ObjectId(body.submission_id)})
    except Exception:
        raise HTTPException(400, "Invalid submission ID")
    if not sub:
        raise HTTPException(404, "Submission not found")

    hw = await db.homework.find_one({"_id": ObjectId(sub["homework_id"])})
    background.add_task(_run_analysis, db, sub, hw)
    return {"status": "analysis_queued"}

async def _run_analysis(db, sub, hw):
    # 1. Run OCR if submission has a file URL
    file_url = sub.get("submission_file_url")
    if file_url:
        extracted_text = await extract_text_from_url(file_url)
        if extracted_text:
            await db.homework_submissions.update_one(
                {"_id": sub["_id"]},
                {"$set": {"extracted_text": extracted_text}}
            )
            # Inject into sub so ai_grader sees it immediately
            sub["extracted_text"] = extracted_text

    # 2. Run AI grading (unchanged)
    analysis = await analyse_submission(hw or {}, sub)

    # 3. For file_upload submissions with empty answers, backfill per-question
    #    student_answer from the AI's question_analysis so the frontend can display them
    updates = {"ai_analysis": analysis, "ai_analysed_at": datetime.utcnow().isoformat()}
    if not sub.get("answers") and analysis.get("question_analysis"):
        backfilled = [
            {
                "question_id":    qa["question_id"],
                "answer":         qa.get("student_answer", ""),
                "answer_type":    "typed",
                "is_correct":     qa.get("is_correct"),
                "points_awarded": qa.get("ai_score"),
                "max_points":     qa.get("max_points", 1),
            }
            for qa in analysis["question_analysis"]
        ]
        updates["answers"] = backfilled

    await db.homework_submissions.update_one(
        {"_id": sub["_id"]},
        {"$set": updates},
    )

@router.post("/grade")
async def grade_homework(body: TeacherGradeRequest, user=Depends(require_role("teacher")), db=Depends(get_db)):
    """Teacher finalises grade — optionally overriding AI suggestions."""
    update = {
        "final_grade":        body.final_grade,
        "final_score":        body.final_score,
        "teacher_feedback":   body.teacher_feedback,
        "question_overrides": body.question_overrides,
        "graded_by":          user["id"],
        "graded_at":          datetime.utcnow().isoformat(),
        "status":             "graded" if body.publish else "draft_grade",
    }
    result = await db.homework_submissions.update_one(
        {"homework_id": body.homework_id, "student_id": body.student_id},
        {"$set": update},
    )
    if result.matched_count == 0:
        raise HTTPException(404, "Submission not found")
    return {"status": update["status"]}

# ─────────────────────────────────────────────────────────────
# STUDENT — View & Submit
# ─────────────────────────────────────────────────────────────

@router.get("/student")
async def list_student_homework(user=Depends(require_role("student")), db=Depends(get_db)):
    docs = await db.homework.find(
        {"assigned_students": user["id"], "status": "assigned"}
    ).sort("due_date", 1).to_list(None)

    # Fetch all submissions for this student in one query
    hw_ids = [str(d["_id"]) for d in docs]
    submissions = await db.homework_submissions.find(
        {"student_id": user["id"], "homework_id": {"$in": hw_ids}}
    ).to_list(None)
    sub_map = {s["homework_id"]: s for s in submissions}

    now = datetime.utcnow().date()
    result = []
    for d in docs:
        d = _ser(d)
        hw_id = d["_id"]
        sub = sub_map.get(hw_id)

        # Derive frontend status
        due_str = d.get("due_date", "")
        try:
            due_date = datetime.fromisoformat(due_str).date() if due_str else None
        except Exception:
            due_date = None

        if sub:
            sub_status = sub.get("status", "submitted")
            if sub_status == "graded":
                frontend_status = "completed"
            else:
                frontend_status = "in_progress"
        elif due_date and due_date < now:
            frontend_status = "overdue"
        else:
            frontend_status = "pending"

        # Normalize to camelCase for frontend
        result.append({
            "id":                       hw_id,
            "subject":                  d.get("subject", ""),
            "subjectColor":             d.get("subject_color", d.get("subjectColor", "indigo")),
            "title":                    d.get("title", ""),
            "description":              d.get("description", ""),
            "assignedBy":               d.get("assigned_by_name", d.get("assignedBy", "Teacher")),
            "assignedDate":             d.get("created_at", ""),
            "dueDate":                  due_str,
            "submittedDate":            sub.get("submitted_at") if sub else None,
            "status":                   frontend_status,
            "difficultyLevel":          d.get("difficulty_level", d.get("difficultyLevel", "medium")),
            "estimatedDurationMinutes": d.get("estimated_duration_minutes", d.get("estimatedDurationMinutes", 30)),
            "progressPercent":          sub.get("progress_percent", 0) if sub and frontend_status == "in_progress" else (100 if frontend_status == "completed" else 0),
            "grade":                    sub.get("final_grade") if sub else None,
            "teacherFeedback":          sub.get("teacher_feedback") if sub else None,
            "attachments":              d.get("attachments", []),
            "studentSubmissionUrl":     sub.get("submission_file_url") if sub else None,
            "tags":                     d.get("tags", []),
        })
    return result

@router.get("/{homework_id}")
async def get_homework(homework_id: str, user=Depends(get_current_user), db=Depends(get_db)):
    try:
        hw = await db.homework.find_one({"_id": ObjectId(homework_id)})
    except Exception:
        raise HTTPException(400, "Invalid ID")
    if not hw:
        raise HTTPException(404, "Not found")
    return _ser(hw)

@router.get("/{homework_id}/questions")
async def get_questions(homework_id: str, user=Depends(get_current_user), db=Depends(get_db)):
    try:
        hw = await db.homework.find_one({"_id": ObjectId(homework_id)})
    except Exception:
        raise HTTPException(400, "Invalid homework ID")
    if not hw:
        raise HTTPException(404, "Homework not found")

    raw = hw.get("questions", [])

    # Normalise to camelCase so HomeworkAttempt.jsx works regardless of how
    # questions were stored (AI-generated snake_case vs legacy format)
    def normalise(q, idx):
        if not isinstance(q, dict):
            return q
        raw_options = q.get("options", [])
        # Normalize options to ensure id, text, is_correct are always present
        norm_options = []
        for oi, o in enumerate(raw_options):
            if isinstance(o, dict):
                norm_options.append({
                    "id":         o.get("id") or o.get("_id") or f"o{oi+1}",
                    "text":       o.get("text") or o.get("label") or "",
                    "is_correct": bool(o.get("is_correct") or o.get("isCorrect")),
                })
            else:
                norm_options.append({"id": f"o{oi+1}", "text": str(o), "is_correct": False})
        return {
            "id":              q.get("id") or q.get("_id") or f"q{idx+1}",
            "questionNumber":  q.get("question_number") or q.get("questionNumber") or idx + 1,
            "questionText":    q.get("question_text")   or q.get("questionText")   or q.get("text", ""),
            "answerType":      q.get("answer_type")     or q.get("answerType")     or q.get("type", "mcq"),
            "options":         norm_options,
            "hint":            q.get("hint"),
            "vinNudge":        q.get("vin_nudge")       or q.get("vinNudge"),
            "maxPoints":       q.get("max_points")      or q.get("maxPoints", 1),
            "sampleAnswer":    q.get("sample_answer")   or q.get("sampleAnswer"),
        }

    return [normalise(q, i) for i in range(len(raw)) for q in [raw[i]]]

@router.post("/submit")
async def submit_homework(body: HomeworkSubmission, background: BackgroundTasks,
                          user=Depends(require_role("student")), db=Depends(get_db)):
    body.student_id = user["id"]

    try:
        hw = await db.homework.find_one({"_id": ObjectId(body.homework_id)})
    except Exception:
        raise HTTPException(400, "Invalid homework ID")

    questions = {q["id"]: q for q in (hw.get("questions", []) if hw else [])}
    scored_answers = []
    mcq_total = mcq_earned = 0

    for ans in body.answers:
        q = questions.get(ans.question_id)
        if not q:
            scored_answers.append(ans.dict())
            continue
        max_pts = q.get("max_points", 1)
        atype   = ans.answer_type or q.get("answer_type", "typed")

        if atype == "mcq":
            correct = next((o for o in q.get("options", []) if o.get("is_correct")), None)
            ok = bool(correct and ans.answer == correct.get("id"))
            pts = max_pts if ok else 0
            mcq_total  += max_pts
            mcq_earned += pts
            scored_answers.append({**ans.dict(), "is_correct": ok, "points_awarded": pts, "max_points": max_pts})
        else:
            # typed / upload — pending AI + teacher review
            scored_answers.append({**ans.dict(), "is_correct": None, "points_awarded": None, "max_points": max_pts, "pending_review": True})

    auto_score_pct = round(mcq_earned / mcq_total * 100) if mcq_total > 0 else None

    doc = {
        "homework_id":        body.homework_id,
        "student_id":         user["id"],
        "submission_type":    hw.get("submission_type", "online_quiz") if hw else "online_quiz",
        "answers":            scored_answers,
        "submission_file_url": body.submission_file_url,
        "auto_score_pct":     auto_score_pct,
        "mcq_earned":         mcq_earned,
        "mcq_total":          mcq_total,
        "submitted_at":       datetime.utcnow().isoformat(),
        "status":             "submitted",
        "ai_analysis":        None,
        "final_grade":        None,
        "teacher_feedback":   None,
    }

    await db.homework_submissions.update_one(
        {"homework_id": body.homework_id, "student_id": user["id"]},
        {"$set": doc}, upsert=True,
    )
    sub = await db.homework_submissions.find_one({"homework_id": body.homework_id, "student_id": user["id"]})

    # Mark homework status
    if hw:
        await db.homework.update_one(
            {"_id": ObjectId(body.homework_id)},
            {"$set": {f"submission_status.{user['id']}": "submitted"},
             "$inc": {"submission_counts.submitted": 1}},
        )

    # Kick off AI analysis in background
    if hw:
        background.add_task(_run_analysis, db, sub, hw)

    return {
        "submission_id":  str(sub["_id"]),
        "auto_score_pct": auto_score_pct,
        "mcq_earned":     mcq_earned,
        "mcq_total":      mcq_total,
        "status":         "submitted",
        "ai_analysis_pending": True,
    }

@router.get("/{homework_id}/result")
async def get_result(homework_id: str, user=Depends(require_role("student")), db=Depends(get_db)):
    doc = await db.homework_submissions.find_one(
        {"homework_id": homework_id, "student_id": user["id"]}
    )
    if not doc:
        raise HTTPException(404, "No submission found")
    return _ser(doc)

# ─────────────────────────────────────────────────────────────
# FILE UPLOAD — for handwritten / file-upload type homework
# ─────────────────────────────────────────────────────────────

@router.post("/upload-file")
async def upload_submission_file(
    file: UploadFile = File(...),
    user=Depends(get_current_user),
):
    allowed = {"image/jpeg", "image/png", "application/pdf", "image/heic"}
    if file.content_type not in allowed:
        raise HTTPException(400, f"File type {file.content_type} not allowed. Use JPG, PNG, PDF.")
    content = await file.read()
    if len(content) > 20 * 1024 * 1024:
        raise HTTPException(400, "File exceeds 20MB limit")
    url = upload_file(content, file.filename, folder=f"submissions/{user['id']}")
    return {"url": url, "filename": file.filename, "size_kb": round(len(content) / 1024, 1)}
