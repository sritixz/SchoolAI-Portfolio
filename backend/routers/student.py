from fastapi import APIRouter, Depends, HTTPException
from bson import ObjectId
from dependencies import require_role
from database import get_db
from services.analytics import compute_student_mastery

from pydantic import BaseModel, model_validator
from typing import List, Optional, Any
import json as _json
from services.llm import chat_completion
from datetime import date, timedelta

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



# ─────────────────────────────────────────────────────────────
# EXAM PREP MODULE
# ─────────────────────────────────────────────────────────────


class SubjectSetup(BaseModel):
    name: str
    examDate: str
    daysLeft: int
    syllabusMode: str
    topics: List[str]
    pattern: str
    confidence: str
    state: Optional[str] = None

class ExamPrepSetupRequest(BaseModel):
    class_val: str = ""
    board: str = "CBSE"
    stateBoard: Optional[str] = None
    subjects: List[SubjectSetup]
    dailyStudyMinutes: int = 60
    selfAssessmentScores: Optional[dict] = None

    model_config = {"populate_by_name": True}

    @model_validator(mode="before")
    @classmethod
    def remap_class(cls, data: Any) -> Any:
        if isinstance(data, dict) and "class" in data and "class_val" not in data:
            data = dict(data)
            data["class_val"] = data.pop("class")
        return data

@router.post("/exam-prep/setup")
async def exam_prep_setup(body: ExamPrepSetupRequest, user=Depends(require_role("student")), db=Depends(get_db)):
    """Save exam prep profile and generate AI study plan + readiness scores."""
    today_str = date.today().isoformat()
    class_label = body.class_val or "8"
    board_label = f"{body.board}{' (' + body.stateBoard + ')' if body.stateBoard and body.board == 'State Board' else ''}"

    # ── Pull past performance data for returning users ──────────────
    past_scores_str = "No past data available (new user)."
    try:
        grade_docs = await db.grades.find({"student_id": user["id"]}).to_list(None)
        gap_docs   = await db.learning_gaps.find({"student_id": user["id"]}).to_list(None)
        hw_docs    = await db.homework_submissions.find({"student_id": user["id"]}).sort("_id", -1).to_list(20)
        prev_profile = await db.exam_prep_profiles.find_one({"student_id": user["id"]})

        if grade_docs or gap_docs or hw_docs:
            grade_summary = ", ".join([f"{g.get('subject','?')}: {g.get('marks',0)}%" for g in grade_docs[:6]])
            weak_topics   = [g.get("topic","") for g in gap_docs if not g.get("resolved") and g.get("topic")][:8]
            hw_scores     = [f"{h.get('subject','?')} hw={h.get('score',h.get('ai_score','?'))}" for h in hw_docs[:5]]
            prev_readiness = prev_profile.get("readiness", {}) if prev_profile else {}
            past_scores_str = (
                f"Grades: {grade_summary or 'none'}\n"
                f"Weak topics: {', '.join(weak_topics) or 'none'}\n"
                f"Recent homework scores: {', '.join(hw_scores) or 'none'}\n"
                f"Previous readiness: {prev_readiness or 'none'}"
            )
    except Exception:
        pass

    subjects_info = "\n".join([
        f"- {s.name}: exam on {s.examDate} ({s.daysLeft} days left), "
        f"pattern={s.pattern}, confidence={s.confidence}, "
        f"syllabus={'full ' + board_label + ' Class ' + class_label + ' ' + s.name + ' syllabus' if s.syllabusMode == 'full' else 'custom topics: ' + (', '.join(s.topics) or 'full syllabus')}"
        for s in body.subjects
    ])

    # Determine nearest exam date for plan length
    min_days = min((s.daysLeft for s in body.subjects if s.daysLeft > 0), default=14)
    plan_days = max(min_days, 1)

    prompt = f"""You are a smart AI study planner for a Class {class_label} student ({board_label} board).

STUDENT PROFILE:
- Daily study time: {body.dailyStudyMinutes} minutes
- Board: {board_label}
- Class: {class_label}
- Subjects and exams:
{subjects_info}
- Today: {today_str}

PAST PERFORMANCE DATA (use this to calibrate readiness and prioritize weak areas):
{past_scores_str}

SELF-ASSESSMENT SCORES (from diagnostic quiz, if provided — use these to fine-tune readiness):
{_json.dumps(body.selfAssessmentScores) if body.selfAssessmentScores else 'Not taken — rely on confidence ratings and past data'}

Generate a DYNAMIC, PERSONALIZED study plan from today until the exam date ({plan_days} days).
Determine the current mode:
- LAST_DAY mode (1 day left): Ultra-short revision only — notes + key points
- REVISION mode (2-5 days left): Notes + important questions + quick practice
- REGULAR mode (6+ days left): Learning + practice + revision mix

Return ONLY valid JSON (no markdown, no code fences, no extra text):
{{
  "readiness": {{
    "<SubjectName>": <integer 30-90 calibrated using past scores, self-assessment scores, confidence, days left, and weak topics>
  }},
  "currentMode": "regular|revision|last_day",
  "aiInsights": [
    "Specific insight using actual data, e.g. 'Your Maths grade was 62% — focus on Algebra this week'"
  ],
  "weakTopics": {{
    "<SubjectName>": ["topic1", "topic2"]
  }},
  "studyPlan": [
    {{
      "day": 1,
      "date": "{today_str}",
      "totalMinutes": {body.dailyStudyMinutes},
      "mode": "regular|revision|last_day",
      "sessions": [
        {{
          "subject": "<subject name>",
          "topic": "<specific topic — prioritize weak topics from past data>",
          "type": "Learn|Practice|Revise|Notes|ImportantQ",
          "duration": <minutes as integer>,
          "done": false,
          "isWeakTopic": <true if this topic is from weak areas>
        }}
      ]
    }}
  ]
}}

SMART RULES:
- Plan covers ALL {plan_days} days from today to nearest exam
- Each day's total session minutes must equal {body.dailyStudyMinutes}
- Max 2-3 subjects per day; balance weak + urgent subjects
- Prioritize subjects with low confidence, near exam dates, and weak topics from past data
- If self-assessment scores are provided, use them as the primary readiness signal (override confidence ratings)
- type: Learn (new content), Practice (MCQ/problems), Revise (review), Notes (read notes), ImportantQ (exam questions)
- Last 1 day: only Notes + ImportantQ sessions
- Last 2-5 days: Revise + ImportantQ + Practice only
- 6+ days: Learn + Practice + Revise mix
- readiness: calibrate using self-assessment scores first, then past grades, confidence, days left, and weak topics
- aiInsights: 2-3 specific messages referencing actual data (scores, weak topics, days left)
- weakTopics: list 2-3 weak topics per subject based on past data, self-assessment results, or confidence
"""
    try:
        raw = await chat_completion([
            {"role": "system", "content": f"You are an expert AI study planner for Class {class_label} {board_label} school students. Create highly personalized, day-by-day study plans based on the student's performance data, exam dates, board curriculum, and daily availability. Return ONLY valid JSON — no markdown fences, no extra text, no explanation."},
            {"role": "user", "content": prompt}
        ])
        clean = raw.strip()
        if clean.startswith("```"):
            clean = clean.split("```")[1]
            if clean.startswith("json"):
                clean = clean[4:]
        result = _json.loads(clean.strip())
    except Exception:
        result = {
            "readiness": {s.name: 50 for s in body.subjects},
            "currentMode": "regular",
            "aiInsights": ["Keep studying consistently to improve your readiness!"],
            "weakTopics": {},
            "studyPlan": [{
                "day": 1, "date": today_str, "totalMinutes": body.dailyStudyMinutes, "mode": "regular",
                "sessions": [{"subject": body.subjects[0].name if body.subjects else "Maths", "topic": "Chapter Review", "type": "Learn", "duration": body.dailyStudyMinutes, "done": False, "isWeakTopic": False}]
            }]
        }

    profile_doc = {
        "student_id": user["id"],
        "class": class_label,
        "board": body.board,
        "stateBoard": body.stateBoard,
        "subjects": [s.dict() for s in body.subjects],
        "dailyStudyMinutes": body.dailyStudyMinutes,
        "selfAssessmentScores": body.selfAssessmentScores,
        "studyPlan": result.get("studyPlan", []),
        "readiness": result.get("readiness", {}),
        "aiInsights": result.get("aiInsights", []),
        "currentMode": result.get("currentMode", "regular"),
        "weakTopics": result.get("weakTopics", {}),
        "updatedAt": today_str,
    }
    await db.exam_prep_profiles.update_one(
        {"student_id": user["id"]},
        {"$set": profile_doc},
        upsert=True,
    )
    return {
        "class": class_label,
        "board": body.board,
        "stateBoard": body.stateBoard,
        "subjects": [s.dict() for s in body.subjects],
        "dailyStudyMinutes": body.dailyStudyMinutes,
        "selfAssessmentScores": body.selfAssessmentScores,
        **result,
    }


@router.get("/exam-prep/profile")
async def get_exam_prep_profile(user=Depends(require_role("student")), db=Depends(get_db)):
    """Return saved exam prep profile for this student."""
    doc = await db.exam_prep_profiles.find_one({"student_id": user["id"]})
    if not doc:
        return {}
    doc = _ser(doc)
    return doc


@router.get("/exam-prep/plan")
async def get_exam_prep_plan(user=Depends(require_role("student")), db=Depends(get_db)):
    """Return the study plan from the saved profile."""
    doc = await db.exam_prep_profiles.find_one({"student_id": user["id"]})
    if not doc:
        return {"studyPlan": [], "readiness": {}, "aiInsights": []}
    return {
        "studyPlan": doc.get("studyPlan", []),
        "readiness": doc.get("readiness", {}),
        "aiInsights": doc.get("aiInsights", []),
        "currentMode": doc.get("currentMode", "regular"),
        "weakTopics": doc.get("weakTopics", {}),
    }


class SelfAssessmentRequest(BaseModel):
    subject: str
    class_val: str = ""
    board: str = "CBSE"
    topics: List[str] = []

    model_config = {"populate_by_name": True}

    @model_validator(mode="before")
    @classmethod
    def remap_class(cls, data: Any) -> Any:
        if isinstance(data, dict) and "class" in data and "class_val" not in data:
            data = dict(data)
            data["class_val"] = data.pop("class")
        return data


@router.post("/exam-prep/self-assessment-quiz")
async def generate_self_assessment_quiz(body: SelfAssessmentRequest, user=Depends(require_role("student")), db=Depends(get_db)):
    """Generate a quick 5-question self-assessment quiz to gauge readiness."""
    class_label = body.class_val or "8"
    topics_str = ", ".join(body.topics) if body.topics else "key topics across the syllabus"
    prompt = f"""Generate a quick 5-question self-assessment quiz for a Class {class_label} {body.subject} student ({body.board} board).
Topics to cover: {topics_str}

This quiz helps gauge the student's current readiness level. Make questions representative of the full syllabus.

Return ONLY valid JSON (no markdown):
{{
  "subject": "{body.subject}",
  "questions": [
    {{
      "id": "q1",
      "question": "Question text",
      "options": [
        {{"id": "A", "text": "Option A", "is_correct": false}},
        {{"id": "B", "text": "Option B", "is_correct": true}},
        {{"id": "C", "text": "Option C", "is_correct": false}},
        {{"id": "D", "text": "Option D", "is_correct": false}}
      ],
      "explanation": "Why the correct answer is right",
      "topic": "Which topic this tests"
    }}
  ]
}}

RULES:
- Exactly 5 MCQ questions, 4 options each, exactly one correct
- Cover different topics/chapters for breadth
- Mix easy (2), medium (2), hard (1) difficulty
- Questions must be Class {class_label} {body.board} syllabus appropriate
"""
    try:
        raw = await chat_completion([
            {"role": "system", "content": f"You are an expert {body.subject} teacher for Class {class_label} {body.board} students. Generate accurate, curriculum-aligned MCQ questions. Return only valid JSON."},
            {"role": "user", "content": prompt}
        ])
        clean = raw.strip()
        if "```" in clean:
            parts = clean.split("```")
            inner = parts[1] if len(parts) > 1 else clean
            if inner.startswith("json"):
                inner = inner[4:]
            clean = inner.strip()
        return _json.loads(clean)
    except Exception as e:
        return {"subject": body.subject, "questions": [], "error": str(e)}


class SessionProgressRequest(BaseModel):
    day: int
    session_index: int
    done: bool
    subject: Optional[str] = None
    score_pct: Optional[int] = None  # if practice was done


@router.post("/exam-prep/session-progress")
async def update_session_progress(body: SessionProgressRequest, user=Depends(require_role("student")), db=Depends(get_db)):
    """Mark a study session as done and optionally trigger plan adaptation."""
    doc = await db.exam_prep_profiles.find_one({"student_id": user["id"]})
    if not doc:
        raise HTTPException(404, "No exam prep profile found")

    study_plan = doc.get("studyPlan", [])
    # Find the day and update the session
    for day_obj in study_plan:
        if day_obj.get("day") == body.day:
            sessions = day_obj.get("sessions", [])
            if 0 <= body.session_index < len(sessions):
                sessions[body.session_index]["done"] = body.done
                if body.score_pct is not None:
                    sessions[body.session_index]["score_pct"] = body.score_pct
            break

    # Update readiness if score provided
    readiness = doc.get("readiness", {})
    if body.score_pct is not None and body.subject:
        current = readiness.get(body.subject, 50)
        # Weighted update: 70% old + 30% new score
        readiness[body.subject] = round(current * 0.7 + body.score_pct * 0.3)

    await db.exam_prep_profiles.update_one(
        {"student_id": user["id"]},
        {"$set": {"studyPlan": study_plan, "readiness": readiness}}
    )
    return {"status": "ok", "readiness": readiness}


class PracticeQuestionsRequest(BaseModel):
    subject: str
    class_val: str = ""
    board: str = "CBSE"
    state: Optional[str] = None
    topics: List[str] = []
    syllabusMode: str = "full"
    pattern: str = "mixed"
    confidence: str = "medium"

    model_config = {"populate_by_name": True}

    @model_validator(mode="before")
    @classmethod
    def remap_class(cls, data: Any) -> Any:
        if isinstance(data, dict) and "class" in data and "class_val" not in data:
            data = dict(data)
            data["class_val"] = data.pop("class")
        return data

@router.post("/exam-prep/practice-questions")
async def generate_practice_questions(body: PracticeQuestionsRequest, user=Depends(require_role("student")), db=Depends(get_db)):
    """Generate AI practice questions for a subject."""
    class_label = body.class_val or "8"
    board_label = f"{body.board}{' (' + body.state + ')' if body.state and body.board == 'State Board' else ''}"
    difficulty = "easy" if body.confidence == "low" else "medium" if body.confidence == "medium" else "hard"

    if body.syllabusMode == "custom" and body.topics:
        topics_str = ", ".join(body.topics)
        topics_instruction = f"Focus ONLY on these specific topics: {topics_str}"
    else:
        topics_str = f"standard {board_label} Class {class_label} {body.subject} syllabus"
        topics_instruction = f"Cover key topics from the standard {board_label} Class {class_label} {body.subject} syllabus"

    prompt = f"""Generate 5 practice questions for a Class {class_label} {body.subject} student ({board_label} board).
{topics_instruction}
Exam pattern: {body.pattern}
Difficulty: {difficulty}

Return ONLY valid JSON (no markdown fences):
{{
  "questions": [
    {{
      "id": "q1",
      "question": "Question text here",
      "topic": "Which specific topic/chapter this is from",
      "options": [
        {{"id": "A", "text": "Option A", "is_correct": false}},
        {{"id": "B", "text": "Option B", "is_correct": true}},
        {{"id": "C", "text": "Option C", "is_correct": false}},
        {{"id": "D", "text": "Option D", "is_correct": false}}
      ],
      "explanation": "Clear step-by-step explanation of why the correct answer is right",
      "trick": "A quick memory trick or shortcut to remember this"
    }}
  ]
}}

RULES:
- All 5 questions must be MCQ with exactly 4 options
- Exactly one option must have is_correct: true
- Questions must be directly relevant to {body.subject} Class {class_label} {board_label} syllabus
- Each question must test a different concept
- explanation must be clear, educational, and show the working/reasoning
- difficulty: {difficulty} — adjust question complexity accordingly
"""
    try:
        raw = await chat_completion([
            {"role": "system", "content": f"You are an expert {body.subject} teacher for Class {class_label} {board_label} students. Generate accurate, curriculum-aligned MCQ practice questions. Return only valid JSON."},
            {"role": "user", "content": prompt}
        ])
        clean = raw.strip()
        if "```" in clean:
            parts = clean.split("```")
            inner = parts[1] if len(parts) > 1 else clean
            if inner.startswith("json"):
                inner = inner[4:]
            clean = inner.strip()
        return _json.loads(clean)
    except _json.JSONDecodeError as e:
        raise HTTPException(500, f"LLM response parse error: {str(e)}")
    except Exception as e:
        raise HTTPException(500, f"Failed to generate questions: {str(e)}")


class NotesRequest(BaseModel):
    subject: str
    note_type: str
    class_val: str = ""
    board: str = "CBSE"
    state: Optional[str] = None
    topics: List[str] = []
    syllabusMode: str = "full"
    pattern: str = "mixed"
    days_left: int = 10
    weak_topics: List[str] = []

    model_config = {"populate_by_name": True}

    @model_validator(mode="before")
    @classmethod
    def remap_class(cls, data: Any) -> Any:
        if isinstance(data, dict) and "class" in data and "class_val" not in data:
            data = dict(data)
            data["class_val"] = data.pop("class")
        return data

@router.post("/exam-prep/notes")
async def generate_notes(body: NotesRequest, user=Depends(require_role("student")), db=Depends(get_db)):
    """Generate AI notes for a subject."""
    class_label = body.class_val or "8"
    board_label = f"{body.board}{' (' + body.state + ')' if body.state and body.board == 'State Board' else ''}"

    # Determine topics context
    if body.syllabusMode == "custom" and body.topics:
        topics_str = ", ".join(body.topics)
        topics_context = f"SPECIFIC TOPICS (cover ONLY these): {topics_str}"
    else:
        topics_str = f"all major chapters in the standard {board_label} Class {class_label} {body.subject} syllabus"
        topics_context = f"SYLLABUS: Full {board_label} Class {class_label} {body.subject} curriculum — cover the most important chapters"

    weak_note = f"\nPrioritize and mark these weak topics: {', '.join(body.weak_topics)}" if body.weak_topics else ""
    urgency = "Focus on highest-priority exam topics only — student has very little time." if body.days_left <= 3 else "Cover all key topics systematically."

    system_prompt = f"You are an expert {body.subject} teacher for Class {class_label} {board_label} students. Generate accurate, curriculum-aligned study notes. Return only valid JSON, no markdown."

    if body.note_type in ("short", "ultrashort"):
        brevity = "ultra-concise 2-3 bullet points per topic (2-minute revision format, only the most critical facts, formulas, and definitions)" if body.note_type == "ultrashort" else "5-7 clear bullet points per topic with simple explanations, key concepts, examples, and important definitions"
        prompt = f"""Generate revision notes for Class {class_label} {body.subject} ({board_label} board).
{topics_context}{weak_note}
Style: {brevity}
Days until exam: {body.days_left}. {urgency}

Return ONLY valid JSON (no markdown fences):
{{
  "sections": [
    {{
      "topic": "Exact Topic/Chapter Name",
      "isWeakTopic": false,
      "points": ["Key point 1 with detail", "Key point 2 with example", "Key point 3"],
      "formula": "Key formula if applicable, else null"
    }}
  ]
}}

RULES:
- Generate notes for 5-6 most important topics/chapters
- Each topic name must be the actual chapter/concept name from the {board_label} Class {class_label} {body.subject} syllabus
- Points must be factually accurate and exam-relevant
- Mark isWeakTopic: true for topics matching the weak topics list
- formula field: include the most important formula for that topic, or null"""

    elif body.note_type == "questions":
        prompt = f"""Generate important exam questions for Class {class_label} {body.subject} ({board_label} board).
{topics_context}{weak_note}
Exam pattern: {body.pattern}
Days left: {body.days_left}. {urgency}

Return ONLY valid JSON (no markdown fences):
{{
  "questions": [
    {{
      "question": "Full question text",
      "marks": 2,
      "type": "Short Answer|Long Answer|MCQ|Fill in the blank",
      "topic": "Which chapter/topic this is from",
      "isWeakTopic": false,
      "hint": "Brief hint for answering this question",
      "isHighWeight": true
    }}
  ]
}}

RULES:
- Generate 10-12 high-probability exam questions
- Include a mix of question types matching the exam pattern: {body.pattern}
- Questions must be from the actual {board_label} Class {class_label} {body.subject} syllabus
- Mark isHighWeight: true for questions very likely to appear in board/school exams
- Mark isWeakTopic: true for questions from the weak topics list
- Vary marks: 1-mark, 2-mark, 3-mark, and 5-mark questions"""

    else:  # formulas
        prompt = f"""Generate a formula sheet and key points reference for Class {class_label} {body.subject} ({board_label} board).
{topics_context}{weak_note}

Return ONLY valid JSON (no markdown fences):
{{
  "sections": [
    {{
      "topic": "Exact Topic/Chapter Name",
      "isWeakTopic": false,
      "formulas": [
        {{
          "name": "Formula/concept name",
          "formula": "The formula or key statement",
          "note": "When to use this / what it means"
        }}
      ]
    }}
  ]
}}

RULES:
- Cover all major formulas and key points across 4-6 topics
- Each formula must be accurate and from the {board_label} Class {class_label} {body.subject} syllabus
- Mark isWeakTopic: true for topics in the weak topics list
- Include units, conditions, and important notes for each formula"""

    try:
        raw = await chat_completion([
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": prompt}
        ])
        clean = raw.strip()
        if "```" in clean:
            parts = clean.split("```")
            inner = parts[1] if len(parts) > 1 else clean
            if inner.startswith("json"):
                inner = inner[4:]
            clean = inner.strip()
        return _json.loads(clean)
    except _json.JSONDecodeError as e:
        raise HTTPException(500, f"LLM response parse error: {str(e)}")
    except Exception as e:
        raise HTTPException(500, f"Failed to generate notes: {str(e)}")
@router.get("/exam-prep/ping")
async def exam_prep_ping():
    return {"ok": True}