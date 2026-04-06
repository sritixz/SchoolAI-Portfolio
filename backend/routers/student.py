from fastapi import APIRouter, Depends, HTTPException
from bson import ObjectId
from dependencies import require_role
from database import get_db
from services.analytics import compute_student_mastery

router = APIRouter(prefix="/student", tags=["student"])
def _ser(doc):
    if doc and "_id" in doc:
        doc["_id"] = str(doc["_id"])
    return doc

@router.get("/dashboard")
async def dashboard(user=Depends(require_role("student")), db=Depends(get_db)):
    student = await db.users.find_one({"_id": ObjectId(user["id"])}, {"hashed_password": 0})
    if not student:
        raise HTTPException(404, "Student not found")
    student = _ser(student)
    tasks = await db.tasks.find({"student_id": user["id"]}).to_list(20)
    for t in tasks:
        _ser(t)
    return {"student": student, "today_tasks": tasks}

@router.get("/profile")
async def profile(user=Depends(require_role("student")), db=Depends(get_db)):
    doc = await db.users.find_one({"_id": ObjectId(user["id"])}, {"hashed_password": 0})
    return _ser(doc)

@router.get("/grades")
async def grades(user=Depends(require_role("student")), db=Depends(get_db)):
    docs = await db.grades.find({"student_id": user["id"]}).to_list(None)
    return [_ser(d) for d in docs]

@router.get("/attendance")
async def attendance(user=Depends(require_role("student")), db=Depends(get_db)):
    doc = await db.attendance.find_one({"student_id": user["id"]})
    return _ser(doc)

@router.get("/mastery")
async def mastery(user=Depends(require_role("student")), db=Depends(get_db)):
    return await compute_student_mastery(user["id"], db)

@router.get("/tasks")
async def get_tasks(user=Depends(require_role("student")), db=Depends(get_db)):
    docs = await db.tasks.find({"student_id": user["id"]}).to_list(50)
    return [_ser(d) for d in docs]

@router.patch("/tasks/{task_id}/toggle")
async def toggle_task(task_id: str, user=Depends(require_role("student")), db=Depends(get_db)):
    task = await db.tasks.find_one({"_id": ObjectId(task_id), "student_id": user["id"]})
    if not task:
        raise HTTPException(404, "Task not found")
    new_done = not task.get("done", False)
    await db.tasks.update_one({"_id": ObjectId(task_id)}, {"$set": {"done": new_done}})
    return {"done": new_done}

@router.post("/tasks")
async def add_task(title: str, subject: str = "Custom", user=Depends(require_role("student")), db=Depends(get_db)):
    doc = {"student_id": user["id"], "title": title, "subject": subject, "done": False, "duration": "—"}
    result = await db.tasks.insert_one(doc)
    return {"id": str(result.inserted_id), **doc}

@router.get("/exams")
async def get_student_exams(user=Depends(require_role("student")), db=Depends(get_db)):
    """Return upcoming exams for this student based on their class/section."""
    student = await db.users.find_one({"_id": ObjectId(user["id"])}, {"section_id": 1, "class": 1})
    if not student:
        raise HTTPException(404, "Student not found")
    section_id = student.get("section_id") or student.get("class")
    docs = await db.exams.find(
        {"$or": [{"section_id": section_id}, {"assigned_students": user["id"]}]}
    ).sort("exam_date", 1).to_list(None)
    # Normalize to camelCase for frontend
    result = []
    for d in docs:
        d = _ser(d)
        result.append({
            "id":              d.get("_id"),
            "subject":         d.get("subject", ""),
            "examType":        d.get("exam_type", d.get("examType", "Exam")),
            "date":            d.get("exam_date", d.get("date", "")),
            "daysLeft":        d.get("days_left", d.get("daysLeft", 0)),
            "syllabus":        d.get("syllabus", []),
            "readinessPercent":d.get("readiness_percent", d.get("readinessPercent", 0)),
            "color":           d.get("color", "from-[#695be6] to-[#8e82f3]"),
        })
    return result

@router.get("/revision-tasks")
async def get_revision_tasks(user=Depends(require_role("student")), db=Depends(get_db)):
    """Return AI-generated revision tasks for the student's upcoming exams."""
    docs = await db.revision_tasks.find({"student_id": user["id"]}).sort("priority", -1).to_list(50)
    result = []
    for d in docs:
        d = _ser(d)
        result.append({
            "id":       d.get("id") or d.get("_id"),
            "subject":  d.get("subject", ""),
            "topic":    d.get("topic", ""),
            "duration": d.get("duration", ""),
            "done":     d.get("done", False),
            "priority": d.get("priority", "medium"),
        })
    return result

@router.patch("/revision-tasks/{task_id}/toggle")
async def toggle_revision_task(task_id: str, user=Depends(require_role("student")), db=Depends(get_db)):
    # Try by _id first, then by id field
    task = None
    try:
        task = await db.revision_tasks.find_one({"_id": ObjectId(task_id), "student_id": user["id"]})
    except Exception:
        pass
    if not task:
        task = await db.revision_tasks.find_one({"id": task_id, "student_id": user["id"]})
    if not task:
        raise HTTPException(404, "Task not found")
    new_done = not task.get("done", False)
    await db.revision_tasks.update_one({"_id": task["_id"]}, {"$set": {"done": new_done}})
    return {"done": new_done}

@router.get("/study-stats")
async def get_study_stats(user=Depends(require_role("student")), db=Depends(get_db)):
    """Return study streak and weekly study hours derived from task completion history."""
    from datetime import date, timedelta
    today = date.today()

    # Streak: count consecutive days with at least one completed task
    streak = 0
    check_date = today
    for _ in range(30):  # look back up to 30 days
        day_str = check_date.isoformat()
        count = await db.tasks.count_documents({
            "student_id": user["id"],
            "done": True,
            "completed_date": day_str,
        })
        if count > 0:
            streak += 1
            check_date -= timedelta(days=1)
        else:
            break

    # Weekly hours: sum estimated durations of completed tasks this week
    week_start = (today - timedelta(days=today.weekday())).isoformat()
    completed_this_week = await db.tasks.find({
        "student_id": user["id"],
        "done": True,
        "completed_date": {"$gte": week_start},
    }).to_list(None)

    total_minutes = 0
    for t in completed_this_week:
        dur = t.get("duration", "")
        # Parse "30 min", "1 hr", "45 min" etc.
        if "hr" in str(dur):
            try: total_minutes += int(str(dur).split("hr")[0].strip()) * 60
            except: pass
        elif "min" in str(dur):
            try: total_minutes += int(str(dur).split("min")[0].strip())
            except: pass

    return {
        "studyStreak": streak,
        "totalStudyHoursThisWeek": round(total_minutes / 60, 1),
    }


@router.get("/portfolio-summary")
async def portfolio_summary(user=Depends(require_role("student")), db=Depends(get_db)):
    """Aggregate grades, attendance, badges and extracurricular for the Portfolio page."""
    student = await db.users.find_one({"_id": ObjectId(user["id"])}, {"hashed_password": 0})
    if not student:
        raise HTTPException(404, "Student not found")

    grade_docs = await db.grades.find({"student_id": user["id"]}).to_list(None)
    academic_progress = [
        {"subject": g.get("subject", ""), "percent": g.get("marks", 0), "semester": g.get("semester", "")}
        for g in grade_docs
    ]

    att = await db.attendance.find_one({"student_id": user["id"]})
    att_pct = f"{att.get('percentage', 0)}%" if att else None

    points = await db.tasks.count_documents({"student_id": user["id"], "done": True}) * 10
    concepts = await db.learning_gaps.count_documents({"student_id": user["id"], "resolved": True})

    badge_docs = await db.badges.find({"student_id": user["id"]}).to_list(None)
    badges = [
        {"id": str(b.get("_id", "")), "label": b.get("label", ""), "icon": b.get("icon", "grade"),
         "color": b.get("color", "yellow"), "date": b.get("date", "")}
        for b in badge_docs
    ]

    ec_docs = await db.extracurricular.find({"student_id": user["id"]}).to_list(None)
    extracurricular = [
        {"id": str(e.get("_id", "")), "name": e.get("name", ""), "role": e.get("role", ""), "icon": e.get("icon", "school")}
        for e in ec_docs
    ]

    ib_docs = await db.ib_profile.find({"student_id": user["id"]}).to_list(None)
    ib_profile = [
        {"id": str(p.get("_id", "")), "trait": p.get("trait", ""), "icon": p.get("icon", "psychology"),
         "color": p.get("color", "blue"), "evidenceCount": p.get("evidence_count", 0), "percent": p.get("percent", 0)}
        for p in ib_docs
    ]

    return {
        "bio":             student.get("bio", ""),
        "stats": {
            "attendance":       att_pct,
            "points":           points,
            "conceptsMastered": concepts,
            "improvement":      student.get("improvement", ""),
            "classRank":        student.get("class_rank", ""),
        },
        "academicProgress": academic_progress,
        "ibProfile":        ib_profile,
        "badges":           badges,
        "extracurricular":  extracurricular,
    }


@router.get("/notifications")
async def get_student_notifications(user=Depends(require_role("student")), db=Depends(get_db)):
    """Return notifications for this student."""
    docs = await db.notifications.find(
        {"$or": [{"user_id": user["id"]}, {"student_id": user["id"]}]}
    ).sort("_id", -1).limit(50).to_list(None)
    return [_ser(d) for d in docs]

@router.patch("/notifications/{notif_id}/read")
async def mark_student_notif_read(notif_id: str, user=Depends(require_role("student")), db=Depends(get_db)):
    try:
        await db.notifications.update_one({"_id": ObjectId(notif_id)}, {"$set": {"read": True}})
    except Exception:
        raise HTTPException(400, "Invalid notification ID")
    return {"status": "ok"}
