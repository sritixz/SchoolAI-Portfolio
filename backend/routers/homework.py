from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, BackgroundTasks, Body
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
from services.ocr import extract_text_from_url, extract_text_from_urls
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
    doc["allow_retries"] = body.allow_retries                # Store retry preference
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
        "allow_retries":               body.allow_retries,          # Update retry preference
        "updated_at":                  datetime.utcnow().isoformat(),
    }
    # Only update questions if provided
    if body.questions:
        update["questions"] = [q.dict() for q in body.questions]
        update["total_marks"] = sum(q.max_points for q in body.questions)
    
    await db.homework.update_one({"_id": ObjectId(homework_id)}, {"$set": update})
    return {"id": homework_id, "updated": True}

@router.patch("/{homework_id}/settings")
async def patch_homework_settings(homework_id: str, body: dict = Body(...),
                                   user=Depends(require_role("teacher")), db=Depends(get_db)):
    """Patch individual homework settings (e.g. allow_retries, ai_assistant_enabled)."""
    try:
        hw = await db.homework.find_one({"_id": ObjectId(homework_id)})
    except Exception:
        raise HTTPException(400, "Invalid ID")
    if not hw:
        raise HTTPException(404, "Homework not found")
    allowed_fields = {"allow_retries", "ai_assistant_enabled"}
    update = {k: v for k, v in body.items() if k in allowed_fields}
    if not update:
        raise HTTPException(400, "No valid fields to update")
    update["updated_at"] = datetime.utcnow().isoformat()
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

    update: dict = {"status": "assigned", "assigned_at": datetime.utcnow().isoformat()}
    if body.due_date:
        update["due_date"] = body.due_date

    # Merge new student_ids with existing ones (avoid overwriting other groups)
    if body.student_ids:
        existing = hw.get("assigned_students", [])
        merged = list(set(existing + body.student_ids))
        update["assigned_students"] = merged

    await db.homework.update_one({"_id": ObjectId(body.homework_id)}, {"$set": update})

    # Notify each assigned student
    student_ids_to_notify = update.get("assigned_students", body.student_ids or [])
    if student_ids_to_notify:
        due_label = f" • Due {body.due_date}" if body.due_date else ""
        notifs = [
            {
                "user_id":    sid,
                "student_id": sid,
                "type":       "homework_new",
                "title":      f"New Homework: {hw.get('title', 'Untitled')}",
                "desc":       f"{hw.get('subject', 'Subject')}{due_label}",
                "tag":        hw.get("subject", ""),
                "homework_id": body.homework_id,
                "read":       False,
                "created_at": datetime.utcnow().isoformat(),
            }
            for sid in student_ids_to_notify
        ]
        await db.notifications.insert_many(notifs)

    return {"assigned": len(body.student_ids)}

@router.delete("/{homework_id}")
async def delete_homework(homework_id: str, user=Depends(require_role("teacher")), db=Depends(get_db)):
    """
    Permanently delete a homework (draft or assigned).
    Also deletes all student submissions for this homework so students
    no longer see it in their list.
    """
    try:
        hw = await db.homework.find_one({"_id": ObjectId(homework_id), "created_by": user["id"]})
    except Exception:
        raise HTTPException(400, "Invalid homework ID")
    if not hw:
        raise HTTPException(404, "Homework not found or not yours")

    # Delete all submissions first
    del_subs = await db.homework_submissions.delete_many({"homework_id": homework_id})
    # Delete the homework itself
    await db.homework.delete_one({"_id": ObjectId(homework_id)})

    return {
        "deleted": True,
        "submissions_removed": del_subs.deleted_count,
    }

@router.get("/library")
async def homework_library(user=Depends(require_role("teacher")), db=Depends(get_db)):
    docs = await db.homework.find({"created_by": user["id"]}).sort("created_at", -1).to_list(None)
    result = []
    for d in docs:
        d = _ser(d)
        hw_id = d.get("id") or d.get("_id")
        # Resolve assigned student names for history display
        student_ids = d.get("assigned_students", [])
        assigned_names = []
        if student_ids:
            try:
                students = await db.users.find(
                    {"_id": {"$in": [ObjectId(sid) for sid in student_ids[:20]]}},
                    {"name": 1}
                ).to_list(None)
                assigned_names = [s.get("name", "") for s in students if s.get("name")]
            except Exception:
                pass
        d["assigned_student_names"] = assigned_names
        # Submission counts for quick-access evaluate badge
        if hw_id:
            try:
                d["submissions_count"] = await db.homework_submissions.count_documents({"homework_id": hw_id})
                d["pending_review_count"] = await db.homework_submissions.count_documents(
                    {"homework_id": hw_id, "status": {"$in": ["submitted", "ai_analysed"]}, "final_grade": None}
                )
            except Exception:
                d["submissions_count"] = 0
                d["pending_review_count"] = 0
        result.append(d)
    return result

@router.get("/{homework_id}/submissions")
async def list_submissions(homework_id: str, user=Depends(require_role("teacher")), db=Depends(get_db)):
    """All student submissions for a homework — only the selected attempt per student."""
    docs = await db.homework_submissions.find({"homework_id": homework_id}).to_list(None)
    # Group by student, pick selected_for_evaluation or latest
    by_student = {}
    for d in docs:
        sid = d.get("student_id")
        if d.get("selected_for_evaluation"):
            by_student[sid] = d
        elif sid not in by_student:
            by_student[sid] = d
        elif not by_student[sid].get("selected_for_evaluation"):
            # Keep the one with highest attempt_number
            if d.get("attempt_number", 1) > by_student[sid].get("attempt_number", 1):
                by_student[sid] = d
    result = list(by_student.values())
    # Add attempt count info for teacher visibility
    for r in result:
        sid = r.get("student_id")
        r["total_attempts"] = len([d for d in docs if d.get("student_id") == sid])
    return [_ser(d) for d in result]

@router.get("/{homework_id}/submissions/{student_id}")
async def get_submission(homework_id: str, student_id: str, user=Depends(require_role("teacher")), db=Depends(get_db)):
    """Get the selected submission for a student (or latest if none selected)."""
    doc = await db.homework_submissions.find_one(
        {"homework_id": homework_id, "student_id": student_id, "selected_for_evaluation": True}
    )
    if not doc:
        doc = await db.homework_submissions.find_one(
            {"homework_id": homework_id, "student_id": student_id},
            sort=[("attempt_number", -1)]
        )
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
    # 1. Run OCR if submission has a file URL (supports single or comma-separated multi-file)
    file_url_field = sub.get("submission_file_url", "")
    if file_url_field:
        # Support comma-separated multi-file URLs
        urls = [u.strip() for u in file_url_field.split(",") if u.strip()]
        extracted_text = await extract_text_from_urls(urls) if len(urls) > 1 else await extract_text_from_url(urls[0])
        if extracted_text:
            await db.homework_submissions.update_one(
                {"_id": sub["_id"]},
                {"$set": {"extracted_text": extracted_text}}
            )
            sub["extracted_text"] = extracted_text

    # 1b. Run OCR on per-question file_url fields (mixed homework: MCQ + upload)
    answers = sub.get("answers", [])
    per_q_ocr_updated = False
    for ans in answers:
        furl = ans.get("file_url")
        if furl and not ans.get("answer"):
            try:
                q_text = await extract_text_from_url(furl)
                if q_text:
                    ans["answer"] = q_text
                    per_q_ocr_updated = True
            except Exception:
                pass
    if per_q_ocr_updated:
        await db.homework_submissions.update_one(
            {"_id": sub["_id"]},
            {"$set": {"answers": answers}}
        )
        sub["answers"] = answers

    # 2. Run AI grading
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

    # 4. Auto-trigger learning gap analysis after grading completes
    try:
        from routers.learning_gaps import _build_performance_context, GAP_ANALYSIS_SYSTEM
        from services.llm import chat_completion
        import json as _json

        student_id = sub.get("student_id")
        if not student_id:
            return

        perf = await _build_performance_context(student_id, db)
        if not perf["submissions"] and not perf["grades"]:
            return

        sub_summaries = []
        for s in perf["submissions"][:20]:
            hid = s.get("homework_id", "")
            hw_doc = perf["homeworks"].get(hid, {})
            a = s.get("analysis") or s.get("ai_analysis") or {}
            sub_summaries.append({
                "homework_title":    hw_doc.get("title", s.get("title", "Homework")),
                "subject":           hw_doc.get("subject", s.get("subject", "General")),
                "score_pct":         s.get("score_pct") or s.get("ai_score") or a.get("estimated_score_pct", 0),
                "submitted_at":      s.get("submitted_at", ""),
                "weakness_areas":    a.get("weakness_areas", []),
                "strength_areas":    a.get("strength_areas", []),
                "error_patterns":    a.get("error_patterns", []),
                "overall_summary":   a.get("overall_summary", ""),
                "question_analysis": [
                    {
                        "question": qa.get("question_id"),
                        "is_correct": qa.get("is_correct"),
                        "feedback": qa.get("feedback", ""),
                        "error_type": qa.get("error_type"),
                    }
                    for qa in a.get("question_analysis", []) if not qa.get("is_correct")
                ][:5],
            })

        grade_summary = [
            {"subject": g.get("subject", ""), "marks": g.get("marks", 0), "semester": g.get("semester", "")}
            for g in perf["grades"]
        ]

        prompt = f"""Analyze this student's performance data and identify their learning gaps.

HOMEWORK & ASSESSMENT SUBMISSIONS (most recent first):
{_json.dumps(sub_summaries, indent=2)}

GRADE RECORDS:
{_json.dumps(grade_summary, indent=2)}

Based on the actual errors, weak areas, and low scores above, identify 3-6 specific learning gaps.

Return ONLY valid JSON (no markdown):
{{
  "gaps": [
    {{
      "subject": "Mathematics",
      "topic": "Quadratic Equations",
      "subtopic": "Discriminant & Nature of Roots",
      "severity": "critical",
      "masteryPercent": 35,
      "identifiedFrom": {{"title": "Unit 3 Quiz", "type": "homework"}},
      "impactAnalysis": "Affects performance in Calculus.",
      "impactSubject": "Calculus",
      "prerequisiteDependency": "Requires mastery of Basic Algebra.",
      "prerequisiteSubject": "Basic Algebra",
      "aiErrorSummary": "Specific mistakes from the data.",
      "aiLastFeedback": "Personalized coaching note.",
      "correctivePath": [
        {{"type": "video", "label": "Watch Explanation", "icon": "play_circle"}},
        {{"type": "practice", "label": "Practice Problems", "icon": "quiz"}}
      ],
      "retryQuestion": {{"text": "Practice question.", "equation": null}}
    }}
  ]
}}"""

        raw = await chat_completion([
            {"role": "system", "content": GAP_ANALYSIS_SYSTEM},
            {"role": "user",   "content": prompt},
        ])
        raw = raw.strip()
        if raw.startswith("```"):
            raw = raw.split("```")[1]
            if raw.startswith("json"):
                raw = raw[4:]
            raw = raw.strip()
        result = _json.loads(raw)

        now = datetime.utcnow().isoformat()
        for gap in result.get("gaps", []):
            doc = {
                "student_id":             student_id,
                "subject":                gap.get("subject", "General"),
                "topic":                  gap.get("topic", "Unknown"),
                "subtopic":               gap.get("subtopic", ""),
                "severity":               gap.get("severity", "minor"),
                "masteryPercent":         gap.get("masteryPercent", 50),
                "score":                  gap.get("masteryPercent", 50),
                "resolved":               False,
                "identifiedFrom":         gap.get("identifiedFrom", {"title": "Performance Analysis", "type": "homework"}),
                "impactAnalysis":         gap.get("impactAnalysis", ""),
                "impactSubject":          gap.get("impactSubject", gap.get("subject", "")),
                "prerequisiteDependency": gap.get("prerequisiteDependency", ""),
                "prerequisiteSubject":    gap.get("prerequisiteSubject", ""),
                "aiErrorSummary":         gap.get("aiErrorSummary", ""),
                "aiLastFeedback":         gap.get("aiLastFeedback", ""),
                "correctivePath":         gap.get("correctivePath", [
                    {"type": "video",    "label": "Watch Explanation", "icon": "play_circle"},
                    {"type": "practice", "label": "Practice Problems",  "icon": "quiz"},
                ]),
                "retryQuestion":          gap.get("retryQuestion", {}),
                "source":                 "ai_analysis",
                "analyzed_at":            now,
            }
            await db.learning_gaps.update_one(
                {"student_id": student_id, "topic": doc["topic"], "resolved": False},
                {"$set": doc},
                upsert=True,
            )
    except Exception:
        pass  # Gap analysis failure must never break homework submission

@router.post("/grade")
async def grade_homework(body: TeacherGradeRequest, user=Depends(require_role("teacher")), db=Depends(get_db)):
    """Teacher finalises grade — optionally overriding AI suggestions."""
    # Apply question-level overrides back into the answers array and ai_analysis
    sub = await db.homework_submissions.find_one(
        {"homework_id": body.homework_id, "student_id": body.student_id}
    )
    if not sub:
        raise HTTPException(404, "Submission not found")

    extra_updates = {}
    if body.question_overrides:
        ov_map = {o["question_id"]: o for o in body.question_overrides}

        # Patch answers array
        answers = sub.get("answers") or []
        patched_answers = []
        for ans in answers:
            ov = ov_map.get(ans.get("question_id"))
            if ov:
                ans = {**ans}
                if "points_awarded" in ov and ov["points_awarded"] is not None:
                    ans["points_awarded"] = ov["points_awarded"]
                if "is_correct" in ov and ov["is_correct"] is not None:
                    ans["is_correct"] = ov["is_correct"]
                if "comment" in ov:
                    ans["teacher_comment"] = ov["comment"]
            patched_answers.append(ans)
        extra_updates["answers"] = patched_answers

        # Patch ai_analysis.question_analysis to keep feedback consistent
        ai_analysis = sub.get("ai_analysis") or {}
        qa_list = ai_analysis.get("question_analysis") or []
        patched_qa = []
        for qa in qa_list:
            ov = ov_map.get(qa.get("question_id"))
            if ov:
                qa = {**qa}
                if "points_awarded" in ov and ov["points_awarded"] is not None:
                    qa["ai_score"] = ov["points_awarded"]
                if "is_correct" in ov and ov["is_correct"] is not None:
                    qa["is_correct"] = ov["is_correct"]
                    # Fix feedback to match corrected verdict
                    feedback = qa.get("feedback", "")
                    if ov["is_correct"] and feedback.lower().startswith("incorrect"):
                        qa["feedback"] = "Correct (teacher verified). " + feedback.replace("Incorrect.", "").replace("incorrect.", "").strip()
                    elif not ov["is_correct"] and feedback.lower().startswith("correct"):
                        qa["feedback"] = "Incorrect (teacher corrected). " + feedback.replace("Correct.", "").replace("correct.", "").strip()
                if "comment" in ov and ov["comment"]:
                    qa["teacher_comment"] = ov["comment"]
            patched_qa.append(qa)
        if patched_qa:
            extra_updates["ai_analysis"] = {**ai_analysis, "question_analysis": patched_qa}

    update = {
        "final_grade":        body.final_grade,
        "final_score":        body.final_score,
        "teacher_feedback":   body.teacher_feedback,
        "question_overrides": body.question_overrides,
        "graded_by":          user["id"],
        "graded_at":          datetime.utcnow().isoformat(),
        "status":             "graded" if body.publish else "draft_grade",
        **extra_updates,
    }
    result = await db.homework_submissions.update_one(
        {"homework_id": body.homework_id, "student_id": body.student_id},
        {"$set": update},
    )
    if result.matched_count == 0:
        raise HTTPException(404, "Submission not found")

    # Notify student when grade is published
    if body.publish:
        hw = await db.homework.find_one({"_id": ObjectId(body.homework_id)})
        hw_title = hw.get("title", "Homework") if hw else "Homework"
        grade_label = f" • Grade: {body.final_grade}" if body.final_grade else ""
        await db.notifications.insert_one({
            "user_id":      body.student_id,
            "student_id":   body.student_id,
            "type":         "homework_graded",
            "title":        f"Homework Graded: {hw_title}",
            "desc":         f"Your teacher has reviewed your submission{grade_label}",
            "tag":          hw.get("subject", "") if hw else "",
            "homework_id":  body.homework_id,
            "read":         False,
            "created_at":   datetime.utcnow().isoformat(),
        })

        # Re-run learning gap analysis with teacher-corrected data
        try:
            from routers.learning_gaps import _build_performance_context, GAP_ANALYSIS_SYSTEM
            from services.llm import chat_completion
            import json as _json

            student_id = body.student_id
            perf = await _build_performance_context(student_id, db)
            if perf["submissions"] or perf["grades"]:
                sub_summaries = []
                for s in perf["submissions"][:20]:
                    hid = s.get("homework_id", "")
                    hw_doc = perf["homeworks"].get(hid, {})
                    a = s.get("analysis") or s.get("ai_analysis") or {}
                    sub_summaries.append({
                        "homework_title":    hw_doc.get("title", s.get("title", "Homework")),
                        "subject":           hw_doc.get("subject", s.get("subject", "General")),
                        "score_pct":         s.get("score_pct") or s.get("ai_score") or a.get("estimated_score_pct", 0),
                        "submitted_at":      s.get("submitted_at", ""),
                        "weakness_areas":    a.get("weakness_areas", []),
                        "strength_areas":    a.get("strength_areas", []),
                        "error_patterns":    a.get("error_patterns", []),
                        "overall_summary":   a.get("overall_summary", ""),
                        "question_analysis": [
                            {
                                "question": qa.get("question_id"),
                                "is_correct": qa.get("is_correct"),
                                "feedback": qa.get("feedback", ""),
                                "error_type": qa.get("error_type"),
                            }
                            for qa in a.get("question_analysis", []) if not qa.get("is_correct")
                        ][:5],
                    })

                grade_summary = [
                    {"subject": g.get("subject", ""), "marks": g.get("marks", 0), "semester": g.get("semester", "")}
                    for g in perf["grades"]
                ]

                prompt = f"""Analyze this student's performance data and identify their learning gaps.

HOMEWORK & ASSESSMENT SUBMISSIONS (most recent first):
{_json.dumps(sub_summaries, indent=2)}

GRADE RECORDS:
{_json.dumps(grade_summary, indent=2)}

Based on the actual errors, weak areas, and low scores above, identify 3-6 specific learning gaps.

Return ONLY valid JSON (no markdown):
{{
  "gaps": [
    {{
      "subject": "Mathematics",
      "topic": "Quadratic Equations",
      "subtopic": "Discriminant & Nature of Roots",
      "severity": "critical",
      "masteryPercent": 35,
      "identifiedFrom": {{"title": "Unit 3 Quiz", "type": "homework"}},
      "impactAnalysis": "Affects performance in Calculus.",
      "impactSubject": "Calculus",
      "prerequisiteDependency": "Requires mastery of Basic Algebra.",
      "prerequisiteSubject": "Basic Algebra",
      "aiErrorSummary": "Specific mistakes from the data.",
      "aiLastFeedback": "Personalized coaching note.",
      "correctivePath": [
        {{"type": "video", "label": "Watch Explanation", "icon": "play_circle"}},
        {{"type": "practice", "label": "Practice Problems", "icon": "quiz"}}
      ],
      "retryQuestion": {{"text": "Practice question.", "equation": null}}
    }}
  ]
}}"""

                raw = await chat_completion([
                    {"role": "system", "content": GAP_ANALYSIS_SYSTEM},
                    {"role": "user",   "content": prompt},
                ])
                raw = raw.strip()
                if raw.startswith("```"):
                    raw = raw.split("```")[1]
                    if raw.startswith("json"):
                        raw = raw[4:]
                    raw = raw.strip()
                result = _json.loads(raw)

                now = datetime.utcnow().isoformat()
                for gap in result.get("gaps", []):
                    doc = {
                        "student_id":             student_id,
                        "subject":                gap.get("subject", "General"),
                        "topic":                  gap.get("topic", "Unknown"),
                        "subtopic":               gap.get("subtopic", ""),
                        "severity":               gap.get("severity", "minor"),
                        "masteryPercent":         gap.get("masteryPercent", 50),
                        "score":                  gap.get("masteryPercent", 50),
                        "resolved":               False,
                        "identifiedFrom":         gap.get("identifiedFrom", {"title": hw_title, "type": "homework"}),
                        "impactAnalysis":         gap.get("impactAnalysis", ""),
                        "impactSubject":          gap.get("impactSubject", gap.get("subject", "")),
                        "prerequisiteDependency": gap.get("prerequisiteDependency", ""),
                        "prerequisiteSubject":    gap.get("prerequisiteSubject", ""),
                        "aiErrorSummary":         gap.get("aiErrorSummary", ""),
                        "aiLastFeedback":         gap.get("aiLastFeedback", ""),
                        "correctivePath":         gap.get("correctivePath", [
                            {"type": "video",    "label": "Watch Explanation", "icon": "play_circle"},
                            {"type": "practice", "label": "Practice Problems",  "icon": "quiz"},
                        ]),
                        "retryQuestion":          gap.get("retryQuestion", {}),
                        "source":                 "teacher_evaluation",
                        "analyzed_at":            now,
                    }
                    await db.learning_gaps.update_one(
                        {"student_id": student_id, "topic": doc["topic"], "resolved": False},
                        {"$set": doc},
                        upsert=True,
                    )
        except Exception:
            pass  # Gap analysis failure must never block grade publishing

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
    all_submissions = await db.homework_submissions.find(
        {"student_id": user["id"], "homework_id": {"$in": hw_ids}}
    ).to_list(None)
    # Group by homework_id: pick selected_for_evaluation or latest
    sub_map = {}
    attempt_counts = {}
    for s in all_submissions:
        hid = s["homework_id"]
        attempt_counts[hid] = attempt_counts.get(hid, 0) + 1
        if s.get("selected_for_evaluation"):
            sub_map[hid] = s
        elif hid not in sub_map:
            sub_map[hid] = s
        elif not sub_map[hid].get("selected_for_evaluation"):
            if s.get("attempt_number", 1) > sub_map[hid].get("attempt_number", 1):
                sub_map[hid] = s

    # Fetch saved progress for in-progress items
    progress_docs = await db.homework_progress.find(
        {"student_id": user["id"], "homework_id": {"$in": hw_ids}}
    ).to_list(None)
    progress_map = {p["homework_id"]: p for p in progress_docs}

    now = datetime.utcnow().date()
    result = []
    due_soon_hw = []  # collect homework due within 1 day for notifications

    for d in docs:
        d = _ser(d)
        hw_id = d["_id"]
        sub = sub_map.get(hw_id)
        prog = progress_map.get(hw_id)

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
            elif sub_status == "submitted":
                frontend_status = "completed"  # submitted = awaiting evaluation
            else:
                frontend_status = "in_progress"
        elif prog:
            # Has saved progress but no submission yet
            frontend_status = "in_progress"
        elif due_date and due_date < now:
            frontend_status = "overdue"
        else:
            frontend_status = "pending"

        # Calculate progress percent
        total_q = len(d.get("questions", []))
        if frontend_status == "completed":
            progress_pct = 100
        elif prog and total_q > 0:
            answered = len([v for v in (prog.get("answers") or {}).values() if v is not None and v != ""])
            progress_pct = round((answered / total_q) * 100)
        elif sub and sub.get("progress_percent"):
            progress_pct = sub.get("progress_percent", 0)
        else:
            progress_pct = 0

        # Determine submission_status for frontend display
        submission_status = sub.get("status") if sub else None

        # Collect due-soon homework for notification generation
        if due_date and frontend_status in ("pending", "in_progress"):
            days_until = (due_date - now).days
            if 0 <= days_until <= 1:
                due_soon_hw.append({"hw_id": hw_id, "title": d.get("title", ""), "due_date": due_str, "days_until": days_until})

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
            "submission_status":        submission_status,
            "difficultyLevel":          d.get("difficulty_level", d.get("difficultyLevel", "medium")),
            "estimatedDurationMinutes": d.get("estimated_duration_minutes", d.get("estimatedDurationMinutes", 30)),
            "progressPercent":          progress_pct,
            "grade":                    sub.get("final_grade") if sub else None,
            "teacherFeedback":          sub.get("teacher_feedback") if sub else None,
            "attachments":              d.get("attachments", []),
            "studentSubmissionUrl":     sub.get("submission_file_url") if sub else None,
            "tags":                     d.get("tags", []),
            "submission_type":          d.get("submission_type", "online_quiz"),
            "allow_retries":            d.get("allow_retries", False),
            "ai_assistant_enabled":     d.get("ai_assistant_enabled", True),
            "attempt_count":            attempt_counts.get(hw_id, 0),
        })

    # Generate homework_due notifications for items due today/tomorrow
    for hw_info in due_soon_hw:
        existing_notif = await db.notifications.find_one({
            "user_id": user["id"],
            "type": "homework_due",
            "homework_id": hw_info["hw_id"],
            "due_date": hw_info["due_date"],
        })
        if not existing_notif:
            due_label = "today" if hw_info["days_until"] == 0 else "tomorrow"
            await db.notifications.insert_one({
                "user_id": user["id"],
                "student_id": user["id"],
                "type": "homework_due",
                "title": f"Homework due {due_label}: {hw_info['title']}",
                "message": f"Your homework \"{hw_info['title']}\" is due {due_label}. Don't forget to submit!",
                "desc": f"Due {due_label}",
                "homework_id": hw_info["hw_id"],
                "due_date": hw_info["due_date"],
                "read": False,
                "created_at": datetime.utcnow().isoformat(),
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

class SaveProgressBody(BaseModel):
    homework_id: str
    answers: Any = {}
    active_types: Any = {}
    current_index: int = 0
    skipped: List[str] = []

@router.post("/save-progress")
async def save_progress(body: SaveProgressBody, user=Depends(require_role("student")), db=Depends(get_db)):
    """Save in-progress homework answers so the student can resume later."""
    doc = {
        "homework_id": body.homework_id,
        "student_id": user["id"],
        "answers": body.answers,
        "active_types": body.active_types,
        "current_index": body.current_index,
        "skipped": body.skipped,
        "updated_at": datetime.utcnow().isoformat(),
    }
    await db.homework_progress.update_one(
        {"homework_id": body.homework_id, "student_id": user["id"]},
        {"$set": doc}, upsert=True,
    )
    # Also update progress_percent on the latest submission doc (for list display)
    total_q = 0
    try:
        hw = await db.homework.find_one({"_id": ObjectId(body.homework_id)})
        if hw:
            total_q = len(hw.get("questions", []))
    except Exception:
        pass
    answered_count = len([v for v in (body.answers or {}).values() if v is not None and v != ""])
    progress_pct = round((answered_count / total_q) * 100) if total_q > 0 else 0
    # Update the latest attempt's progress if one exists
    latest_sub = await db.homework_submissions.find_one(
        {"homework_id": body.homework_id, "student_id": user["id"]},
        sort=[("attempt_number", -1)]
    )
    if latest_sub:
        await db.homework_submissions.update_one(
            {"_id": latest_sub["_id"]},
            {"$set": {"progress_percent": progress_pct}},
        )
    return {"status": "ok", "progress_percent": progress_pct}

@router.get("/{homework_id}/progress")
async def get_progress(homework_id: str, user=Depends(require_role("student")), db=Depends(get_db)):
    """Retrieve saved progress for a homework attempt."""
    doc = await db.homework_progress.find_one(
        {"homework_id": homework_id, "student_id": user["id"]}
    )
    if not doc:
        return None
    return _ser(doc)

@router.post("/submit")
async def submit_homework(body: HomeworkSubmission, background: BackgroundTasks,
                          user=Depends(require_role("student")), db=Depends(get_db)):
    body.student_id = user["id"]

    try:
        hw = await db.homework.find_one({"_id": ObjectId(body.homework_id)})
    except Exception:
        raise HTTPException(400, "Invalid homework ID")

    # Count existing attempts
    existing_attempts = await db.homework_submissions.find(
        {"homework_id": body.homework_id, "student_id": user["id"]}
    ).sort("attempt_number", -1).to_list(None)

    if existing_attempts:
        allow_retries = hw.get("allow_retries", False) if hw else False
        if not allow_retries:
            raise HTTPException(400, "Retries are not allowed for this homework")

    attempt_number = (existing_attempts[0]["attempt_number"] if existing_attempts else 0) + 1

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

    # First attempt is auto-selected for evaluation; subsequent ones are not
    is_selected = attempt_number == 1

    doc = {
        "homework_id":        body.homework_id,
        "student_id":         user["id"],
        "attempt_number":     attempt_number,
        "selected_for_evaluation": is_selected,
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

    result = await db.homework_submissions.insert_one(doc)
    sub = await db.homework_submissions.find_one({"_id": result.inserted_id})

    # If this is a better score than the currently selected attempt, auto-select it
    if not is_selected and auto_score_pct is not None:
        selected_sub = next((a for a in existing_attempts if a.get("selected_for_evaluation")), None)
        if selected_sub:
            prev_score = selected_sub.get("auto_score_pct")
            if prev_score is None or auto_score_pct > prev_score:
                # Deselect old, select new
                await db.homework_submissions.update_one(
                    {"_id": selected_sub["_id"]}, {"$set": {"selected_for_evaluation": False}}
                )
                await db.homework_submissions.update_one(
                    {"_id": result.inserted_id}, {"$set": {"selected_for_evaluation": True}}
                )
                is_selected = True

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

    # Clear saved progress after successful submission
    await db.homework_progress.delete_one(
        {"homework_id": body.homework_id, "student_id": user["id"]}
    )

    return {
        "submission_id":  str(sub["_id"]),
        "auto_score_pct": auto_score_pct,
        "mcq_earned":     mcq_earned,
        "mcq_total":      mcq_total,
        "status":         "submitted",
        "attempt_number": attempt_number,
        "selected_for_evaluation": is_selected,
        "ai_analysis_pending": True,
    }

@router.get("/{homework_id}/result")
async def get_result(homework_id: str, user=Depends(require_role("student")), db=Depends(get_db)):
    """Return the selected attempt for this student (backward-compatible)."""
    doc = await db.homework_submissions.find_one(
        {"homework_id": homework_id, "student_id": user["id"], "selected_for_evaluation": True}
    )
    # Fallback: if no selected attempt, return the latest one
    if not doc:
        doc = await db.homework_submissions.find_one(
            {"homework_id": homework_id, "student_id": user["id"]},
            sort=[("attempt_number", -1)]
        )
    if not doc:
        raise HTTPException(404, "No submission found")
    return _ser(doc)

@router.get("/{homework_id}/attempts")
async def get_attempts(homework_id: str, user=Depends(require_role("student")), db=Depends(get_db)):
    """Return all attempts for a homework by this student."""
    docs = await db.homework_submissions.find(
        {"homework_id": homework_id, "student_id": user["id"]}
    ).sort("attempt_number", 1).to_list(None)
    return [_ser(d) for d in docs]

@router.post("/{homework_id}/select-attempt")
async def select_attempt(homework_id: str, body: dict = Body(...),
                         user=Depends(require_role("student")), db=Depends(get_db)):
    """Student selects which attempt to send for teacher evaluation."""
    attempt_id = body.get("attempt_id")
    if not attempt_id:
        raise HTTPException(400, "attempt_id is required")
    # Verify the attempt belongs to this student
    try:
        attempt = await db.homework_submissions.find_one(
            {"_id": ObjectId(attempt_id), "homework_id": homework_id, "student_id": user["id"]}
        )
    except Exception:
        raise HTTPException(400, "Invalid attempt ID")
    if not attempt:
        raise HTTPException(404, "Attempt not found")
    # Deselect all other attempts for this homework
    await db.homework_submissions.update_many(
        {"homework_id": homework_id, "student_id": user["id"]},
        {"$set": {"selected_for_evaluation": False}}
    )
    # Select the chosen one
    await db.homework_submissions.update_one(
        {"_id": ObjectId(attempt_id)},
        {"$set": {"selected_for_evaluation": True}}
    )
    return {"status": "ok", "selected_attempt_id": attempt_id}

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
