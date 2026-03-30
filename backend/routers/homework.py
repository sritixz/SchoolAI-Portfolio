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
    doc = body.dict()
    doc["created_by"]  = user["id"]
    doc["created_at"]  = datetime.utcnow().isoformat()
    doc["status"]      = "draft"
    doc["submission_counts"] = {"submitted": 0, "pending": 0, "graded": 0}
    result = await db.homework.insert_one(doc)
    hw_id = str(result.inserted_id)
    return {"id": hw_id}

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
    if body.student_ids:
        update["assigned_students"] = body.student_ids
    if body.due_date:
        update["due_date"] = body.due_date

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
    analysis = await analyse_submission(hw or {}, sub)
    await db.homework_submissions.update_one(
        {"_id": sub["_id"]},
        {"$set": {"ai_analysis": analysis, "ai_analysed_at": datetime.utcnow().isoformat()}},
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
    return [_ser(d) for d in docs]

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
async def get_questions(homework_id: str, user=Depends(require_role("student")), db=Depends(get_db)):
    try:
        hw = await db.homework.find_one({"_id": ObjectId(homework_id)})
    except Exception:
        raise HTTPException(400, "Invalid homework ID")
    if not hw:
        raise HTTPException(404, "Homework not found")
    return hw.get("questions", [])

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
