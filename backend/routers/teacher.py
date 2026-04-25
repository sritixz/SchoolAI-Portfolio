from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from bson import ObjectId
from datetime import datetime
from dependencies import require_role
from database import get_db
from services.llm import chat_completion
from services.analytics import get_class_performance
from pydantic import BaseModel
from typing import Optional, List
import json, uuid, asyncio, httpx, urllib.parse

router = APIRouter(prefix="/teacher", tags=["teacher"])

# ── In-memory job store for background presentation tasks ─────────────────────
# { job_id: { status, current_slide, total_slides, result_data, error } }
presentation_jobs: dict = {}

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
    difficulty: Optional[str] = "medium"
    question_types: List[str] = ["mcq"]
    board: Optional[str] = "CBSE"
    chapter: Optional[str] = None
    learning_objective: Optional[str] = None
    special_instructions: Optional[str] = None
    extra: Optional[dict] = None

# ── Student Groups models ─────────────────────────────────────
class GroupMember(BaseModel):
    student_id: str
    name: str

class GroupCreate(BaseModel):
    label: str
    difficulty: str = "Foundation"   # Foundation | Intermediate | Advanced
    student_ids: List[str] = []
    performance: Optional[str] = None
    reasoning: Optional[str] = None
    subject: Optional[str] = None
    chapter: Optional[str] = None

class GroupUpdate(BaseModel):
    label: Optional[str] = None
    difficulty: Optional[str] = None
    student_ids: Optional[List[str]] = None
    performance: Optional[str] = None
    reasoning: Optional[str] = None
    subject: Optional[str] = None
    chapter: Optional[str] = None
    homework_id: Optional[str] = None
    homework_title: Optional[str] = None
    due_date: Optional[str] = None
    ai_questions: Optional[List[dict]] = None
    ai_mode: Optional[str] = None
    assigned: Optional[bool] = None

class GroupsBulkSave(BaseModel):
    groups: List[GroupCreate]
    subject: Optional[str] = None
    chapter: Optional[str] = None

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
    """Return students in a section with parent info and homework stats.
    Supports exact class_name match (e.g. 'Grade 6-A') or grade-level match (e.g. 'Class 6' or 'Grade 6').
    """
    # Try exact match first
    section = await db.sections.find_one({"class_name": class_name})
    
    if section:
        # Exact match — single section
        section_ids = [str(section["_id"])]
    else:
        # Try grade-level match: "Class 6" → find all sections with class_name starting with "Grade 6"
        # Normalize: "Class 6" → "6", "Grade 6" → "6"
        grade_num = class_name.replace("Class", "").replace("Grade", "").strip().split("-")[0].strip()
        # Find all sections matching this grade number
        all_sections = await db.sections.find({}).to_list(None)
        matching_sections = [
            s for s in all_sections
            if grade_num in s.get("class_name", "").replace("Grade", "").replace("Class", "").split("-")[0].strip()
        ]
        section_ids = [str(s["_id"]) for s in matching_sections]
    
    if not section_ids:
        # Final fallback: old class field on user document
        docs = await db.users.find({"role": "student", "class": class_name}).to_list(None)
    else:
        docs = await db.users.find(
            {"role": "student", "section_id": {"$in": section_ids}}
        ).to_list(None)
    
    result = []
    for d in docs:
        student_id = str(d["_id"])
        
        # Get parent info
        parent_ids = d.get("parent_ids", [])
        parent_id = parent_ids[0] if parent_ids else None
        parent_name = None
        parent_email = None
        if parent_id:
            parent = await db.users.find_one({"_id": ObjectId(parent_id)})
            if parent:
                parent_name = parent.get("name")
                parent_email = parent.get("email")
        
        # Get homework stats
        total_hw = await db.homework.count_documents({
            "assigned_students": student_id,
            "status": "assigned"
        })
        submitted_hw = await db.homework_submissions.count_documents({
            "student_id": student_id,
            "status": {"$in": ["submitted", "graded"]}
        })
        
        # Get average score
        submissions = await db.homework_submissions.find({
            "student_id": student_id,
            "status": "graded"
        }).to_list(None)
        avg_score = 0
        if submissions:
            scores = [s.get("final_score_pct", s.get("auto_score_pct", 0)) for s in submissions]
            avg_score = round(sum(scores) / len(scores)) if scores else 0
        
        result.append({
            "id": student_id,
            "name": d.get("name", ""),
            "avatar": d.get("avatar"),
            "roll_no": d.get("roll_no"),
            "parent_id": parent_id,
            "parent_name": parent_name,
            "parent_email": parent_email,
            "homework_total": total_hw,
            "homework_completed": submitted_hw,
            "avg_score": avg_score,
            "attendance": d.get("attendance", 95),  # Default 95% if not tracked
        })
    
    return result

class StudentIdsRequest(BaseModel):
    student_ids: List[str]

@router.post("/students/by-ids")
async def students_by_ids(body: StudentIdsRequest, user=Depends(require_role("teacher")), db=Depends(get_db)):
    """Resolve a list of student IDs to name + id pairs."""
    result = []
    for sid in body.student_ids:
        try:
            doc = await db.users.find_one({"_id": ObjectId(sid)}, {"name": 1, "roll_no": 1, "class_name": 1})
            if doc:
                result.append({"id": sid, "name": doc.get("name", ""), "class_name": doc.get("class_name", ""), "roll_no": doc.get("roll_no")})
        except Exception:
            pass
    return result

@router.get("/students/{student_id}/homework")
async def student_homework(student_id: str, user=Depends(require_role("teacher")), db=Depends(get_db)):
    """Get all homework assigned to a specific student with submission status."""
    # Get all homework assigned to this student
    hw_docs = await db.homework.find({
        "assigned_students": student_id,
        "status": "assigned"
    }).to_list(None)
    
    result = []
    for hw in hw_docs:
        hw_id = str(hw["_id"])
        
        # Check if student has submitted
        submission = await db.homework_submissions.find_one({
            "homework_id": hw_id,
            "student_id": student_id
        })
        
        result.append({
            "_id": hw_id,
            "title": hw.get("title"),
            "subject": hw.get("subject"),
            "due_date": hw.get("due_date"),
            "questions": hw.get("questions", []),
            "total_marks": hw.get("total_marks"),
            "submission_status": submission.get("status") if submission else "pending",
            "final_score_pct": submission.get("final_score_pct") if submission else None,
            "auto_score_pct": submission.get("auto_score_pct") if submission else None,
            "submitted_at": submission.get("submitted_at") if submission else None,
        })
    
    return result

@router.get("/students/{student_id}/profile")
async def student_profile(student_id: str, user=Depends(require_role("teacher")), db=Depends(get_db)):
    """Get comprehensive student profile with stats, parent info, and performance data."""
    student = await db.users.find_one({"_id": ObjectId(student_id), "role": "student"})
    if not student:
        raise HTTPException(404, "Student not found")
    
    # Get parent info
    parent_ids = student.get("parent_ids", [])
    parent_id = parent_ids[0] if parent_ids else None
    parent_name = None
    parent_email = None
    parent_phone = None
    if parent_id:
        parent = await db.users.find_one({"_id": ObjectId(parent_id)})
        if parent:
            parent_name = parent.get("name")
            parent_email = parent.get("email")
            parent_phone = parent.get("phone")
    
    # Get homework stats
    total_hw = await db.homework.count_documents({
        "assigned_students": student_id,
        "status": "assigned"
    })
    submitted_hw = await db.homework_submissions.count_documents({
        "student_id": student_id,
        "status": {"$in": ["submitted", "graded"]}
    })
    pending_hw = total_hw - submitted_hw
    
    # Get average score
    submissions = await db.homework_submissions.find({
        "student_id": student_id,
        "status": "graded"
    }).to_list(None)
    avg_score = 0
    if submissions:
        scores = [s.get("final_score_pct", s.get("auto_score_pct", 0)) for s in submissions]
        avg_score = round(sum(scores) / len(scores)) if scores else 0
    
    # Get subject-wise performance
    subject_performance = []
    subjects = await db.homework.distinct("subject", {
        "assigned_students": student_id,
        "status": "assigned"
    })
    for subject in subjects:
        subject_hw = await db.homework.find({
            "assigned_students": student_id,
            "subject": subject,
            "status": "assigned"
        }).to_list(None)
        subject_hw_ids = [str(hw["_id"]) for hw in subject_hw]
        
        subject_subs = await db.homework_submissions.find({
            "student_id": student_id,
            "homework_id": {"$in": subject_hw_ids},
            "status": "graded"
        }).to_list(None)
        
        if subject_subs:
            subject_scores = [s.get("final_score_pct", s.get("auto_score_pct", 0)) for s in subject_subs]
            subject_avg = round(sum(subject_scores) / len(subject_scores)) if subject_scores else 0
        else:
            subject_avg = 0
        
        subject_performance.append({
            "subject": subject,
            "avg_score": subject_avg,
            "homework_count": len(subject_hw)
        })
    
    # Get learning gaps
    learning_gaps = await db.learning_gaps.find({
        "student_id": student_id,
        "resolved": False
    }).sort("severity", -1).limit(5).to_list(None)
    
    gaps_list = [{
        "topic": gap.get("topic"),
        "subject": gap.get("subject"),
        "severity": gap.get("severity", "medium")
    } for gap in learning_gaps]
    
    # Get recent activity
    recent_subs = await db.homework_submissions.find({
        "student_id": student_id
    }).sort("submitted_at", -1).limit(5).to_list(None)
    
    recent_activity = []
    for sub in recent_subs:
        hw = await db.homework.find_one({"_id": ObjectId(sub["homework_id"])})
        recent_activity.append({
            "type": "submission",
            "homework": hw.get("title") if hw else "Homework",
            "date": sub.get("submitted_at"),
            "score": sub.get("final_score_pct", sub.get("auto_score_pct"))
        })
    
    return {
        "id": student_id,
        "name": student.get("name"),
        "roll_no": student.get("roll_no"),
        "class": student.get("class_name", student.get("class")),
        "section_id": student.get("section_id"),
        "avatar": student.get("avatar"),
        "email": student.get("email"),
        "phone": student.get("phone"),
        "parent_id": parent_id,
        "parent_name": parent_name,
        "parent_email": parent_email,
        "parent_phone": parent_phone,
        "attendance": student.get("attendance", 95),
        "overall_avg_score": avg_score,
        "homework_stats": {
            "total": total_hw,
            "completed": submitted_hw,
            "pending": pending_hw,
            "avg_score": avg_score
        },
        "subject_performance": subject_performance,
        "learning_gaps": gaps_list,
        "recent_activity": recent_activity
    }

@router.get("/students/{student_id}/submissions")
async def student_submissions(
    student_id: str,
    status: Optional[str] = None,  # all, pending, graded
    user=Depends(require_role("teacher")),
    db=Depends(get_db)
):
    """Get all submissions for a specific student with filtering."""
    query = {"student_id": student_id}
    
    if status == "pending":
        query["status"] = "submitted"
    elif status == "graded":
        query["status"] = "graded"
    
    submissions = await db.homework_submissions.find(query).sort("submitted_at", -1).to_list(None)
    
    result = []
    for sub in submissions:
        hw = await db.homework.find_one({"_id": ObjectId(sub["homework_id"])})
        result.append({
            "submission_id": str(sub["_id"]),
            "homework_id": sub["homework_id"],
            "homework_title": hw.get("title") if hw else "Homework",
            "subject": hw.get("subject") if hw else None,
            "submitted_at": sub.get("submitted_at"),
            "status": sub.get("status"),
            "auto_score_pct": sub.get("auto_score_pct"),
            "final_score_pct": sub.get("final_score_pct"),
            "teacher_feedback": sub.get("teacher_feedback"),
            "file_urls": sub.get("file_urls", []),
            "can_download": len(sub.get("file_urls", [])) > 0
        })
    
    return result

@router.get("/submissions")
async def all_submissions(user=Depends(require_role("teacher")), db=Depends(get_db)):
    """Get all submissions for students in this teacher's sections."""
    # Collect all student IDs in teacher's sections
    teacher_doc = await db.users.find_one({"_id": ObjectId(user["id"])})
    student_ids_in_sections = []
    
    if teacher_doc:
        assigned_section_ids = teacher_doc.get("assigned_sections", [])
        for section_id in assigned_section_ids:
            section_students = await db.users.find(
                {"role": "student", "section_id": section_id}, {"_id": 1}
            ).to_list(None)
            student_ids_in_sections.extend([str(s["_id"]) for s in section_students])
    
    # Build query: submissions by students in teacher's sections OR for homework created by teacher
    teacher_hw = await db.homework.find({"created_by": user["id"]}).to_list(None)
    teacher_hw_ids = [str(hw["_id"]) for hw in teacher_hw]
    
    # Also get all assigned homework for students in sections
    if student_ids_in_sections:
        section_hw = await db.homework.find({
            "assigned_students": {"$in": student_ids_in_sections},
            "status": "assigned"
        }).to_list(None)
        for hw in section_hw:
            hw_id = str(hw["_id"])
            if hw_id not in teacher_hw_ids:
                teacher_hw_ids.append(hw_id)
    
    if not teacher_hw_ids and not student_ids_in_sections:
        return []
    
    # Get submissions - either for teacher's homework or by students in sections
    query = {}
    if teacher_hw_ids and student_ids_in_sections:
        query = {"$or": [
            {"homework_id": {"$in": teacher_hw_ids}},
            {"student_id": {"$in": student_ids_in_sections}}
        ]}
    elif teacher_hw_ids:
        query = {"homework_id": {"$in": teacher_hw_ids}}
    else:
        query = {"student_id": {"$in": student_ids_in_sections}}
    
    submissions = await db.homework_submissions.find(query).sort("submitted_at", -1).to_list(None)
    
    result = []
    for sub in submissions:
        student = await db.users.find_one({"_id": ObjectId(sub["student_id"])})
        hw = await db.homework.find_one({"_id": ObjectId(sub["homework_id"])})
        
        result.append({
            "submission_id": str(sub["_id"]),
            "homework_id": sub["homework_id"],
            "student_id": sub["student_id"],
            "student_name": student.get("name") if student else "Unknown",
            "homework_title": hw.get("title") if hw else "Homework",
            "subject": hw.get("subject") if hw else None,
            "submitted_at": sub.get("submitted_at"),
            "status": sub.get("status"),
            "auto_score_pct": sub.get("auto_score_pct"),
            "final_score_pct": sub.get("final_score_pct"),
            "teacher_feedback": sub.get("teacher_feedback"),
            "file_urls": sub.get("file_urls", []),
            "can_download": len(sub.get("file_urls", [])) > 0
        })
    
    return result

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
    """Return interventions for this teacher — stored first, then auto-generated from learning gaps."""
    docs = await db.interventions.find({"teacher_id": user["id"]}).to_list(None)
    if docs:
        return [_ser(d) for d in docs]

    # Auto-generate from learning gaps — single pass, no per-student submission queries
    teacher = await db.users.find_one({"_id": ObjectId(user["id"])})
    if not teacher:
        return []

    assigned_section_ids = teacher.get("assigned_sections", [])
    if not assigned_section_ids:
        return []

    # Fetch all students in teacher's sections in one query
    students = await db.users.find(
        {"role": "student", "section_id": {"$in": assigned_section_ids}},
        {"_id": 1, "name": 1, "class_name": 1, "class": 1}
    ).to_list(None)

    if not students:
        return []

    student_ids = [str(s["_id"]) for s in students]
    student_map = {str(s["_id"]): s for s in students}

    # Fetch all unresolved high/critical gaps for these students in one query
    all_gaps = await db.learning_gaps.find(
        {"student_id": {"$in": student_ids}, "severity": {"$in": ["critical", "high"]}, "resolved": False}
    ).to_list(None)

    # Group gaps by student
    gaps_by_student = {}
    for g in all_gaps:
        sid = g["student_id"]
        gaps_by_student.setdefault(sid, []).append(g)

    interventions_list = []
    for sid, gaps in gaps_by_student.items():
        stu = student_map.get(sid, {})
        priority = "urgent" if any(g.get("severity") == "critical" for g in gaps) else "important"
        issues = [f"Gap in {g.get('topic', 'Unknown')} ({g.get('severity', 'high')})" for g in gaps[:3]]
        interventions_list.append({
            "_id": f"auto-{sid}",
            "teacher_id": user["id"],
            "student_id": sid,
            "student_name": stu.get("name", "Student"),
            "student_class": stu.get("class_name", stu.get("class", "")),
            "priority": priority,
            "performance_drop": 0,
            "previous_score": None,
            "current_score": None,
            "score_history": [],
            "issues": issues,
            "message": issues[0] if issues else "Needs attention",
            "tags": ["LEARNING GAPS"] + (["CRITICAL"] if priority == "urgent" else []),
            "status": "New",
            "resolved": False,
            "created_at": datetime.utcnow().isoformat(),
        })

    return interventions_list


@router.get("/interventions/stats")
async def intervention_stats(user=Depends(require_role("teacher")), db=Depends(get_db)):
    """Return aggregate stats for the intervention dashboard."""
    docs = await db.interventions.find({"teacher_id": user["id"], "resolved": False}).to_list(None)

    if not docs:
        # Fall back to learning-gap count
        teacher = await db.users.find_one({"_id": ObjectId(user["id"])})
        assigned_section_ids = teacher.get("assigned_sections", []) if teacher else []
        students = await db.users.find(
            {"role": "student", "section_id": {"$in": assigned_section_ids}}, {"_id": 1}
        ).to_list(None)
        student_ids = [str(s["_id"]) for s in students]
        at_risk_ids = await db.learning_gaps.distinct(
            "student_id",
            {"student_id": {"$in": student_ids}, "severity": {"$in": ["critical", "high"]}, "resolved": False}
        )
        at_risk = len(at_risk_ids)
        return {
            "students_at_risk": at_risk,
            "repeat_offenders": 0,
            "parent_contact_needed": 0,
            "actions_pending": at_risk,
        }

    return {
        "students_at_risk": len(docs),
        "repeat_offenders": len([d for d in docs if len(d.get("issues", [])) >= 2]),
        "parent_contact_needed": len([d for d in docs if d.get("priority") in ("urgent", "important")]),
        "actions_pending": len([d for d in docs if d.get("status", "New") == "New"]),
    }

@router.get("/analytics/{class_id}")
async def class_analytics(class_id: str, user=Depends(require_role("teacher")), db=Depends(get_db)):
    return await get_class_performance(class_id, db)

@router.get("/topic-mastery")
async def topic_mastery(class_id: str, user=Depends(require_role("teacher")), db=Depends(get_db)):
    """Return mastery heatmap for a section. class_id can be section_id or class_name."""
    # Try section_id first, then class_name
    docs = await db.mastery_heatmap.find({"section_id": class_id}).to_list(None)
    if not docs:
        # Try finding section by class_name
        section = await db.sections.find_one({"class_name": class_id})
        if section:
            docs = await db.mastery_heatmap.find({"section_id": str(section["_id"])}).to_list(None)
    if not docs:
        docs = await db.mastery_heatmap.find({"class_id": class_id}).to_list(None)
    return [_ser(d) for d in docs]

# ─────────────────────────────────────────────────────────────
# AI TOOLS
# ─────────────────────────────────────────────────────────────

@router.post("/ai-tool")
async def ai_tool(body: AIToolRequest, user=Depends(require_role("teacher"))):
    extra = body.extra or {}
    prompts = {
        "worksheet": f"""You are an expert curriculum designer. Create a professional, print-ready classroom worksheet with a complete answer key and marking scheme.

WORKSHEET DETAILS:
- Subject: {body.subject}
- Topic: {body.topic}
- Grade: {body.grade or extra.get('classLevel', '')}
- Board: {extra.get('board', 'CBSE')}
- Chapter: {extra.get('chapter', '') or 'Not specified'}
- Difficulty: {extra.get('difficulty', 'Medium')}
- Difficulty Structure: {extra.get('difficulty_structure', 'Medium')} — Easy=Basic concept (1-step), Medium=Application (2-3 steps), Hard=Case-based/multi-step
- Learning Objective: {extra.get('learning_objective', 'Concept Understanding')} — align all questions to this objective
- Total Questions: {extra.get('total_questions', extra.get('totalQuestions', 10))}
- Question Types: {', '.join(extra.get('question_types', ['mcq', 'shortAnswer']))}
- Title: {extra.get('title', f'{body.topic} Worksheet')}
- Special Instructions: {extra.get('special_instructions', 'None')}

BOARD-SPECIFIC GUIDANCE:
- CBSE: Follow NCERT curriculum, use standard CBSE question patterns, include VSA/SA/LA sections
- ICSE: Follow ICSE syllabus, include application-based and analytical questions
- State Board: Use state curriculum standards and regional context
- IB: Use inquiry-based questions, include ATL skills
- Cambridge: Use Cambridge assessment objectives and command words

Generate a COMPLETE worksheet with detailed answer key, marking scheme, and teacher notes. Questions must be curriculum-appropriate, board-aligned, and match the specified learning objective and difficulty structure.

Return ONLY valid JSON (no markdown):
{{
  "title": "{extra.get('title', f'{body.topic} Worksheet')}",
  "subject": "{body.subject}",
  "grade": "{body.grade or extra.get('classLevel', '')}",
  "topic": "{body.topic}",
  "difficulty": "{extra.get('difficulty', 'Medium')}",
  "total_marks": 20,
  "estimated_time_minutes": 30,
  "instructions": "Read all questions carefully. Show all working where required. Write neatly.",
  "learning_objectives_covered": ["Objective 1 this worksheet assesses", "Objective 2"],
  "sections": [
    {{
      "type": "MCQ",
      "title": "Section A: Multiple Choice Questions",
      "instructions": "Circle the letter of the best answer. (1 mark each)",
      "questions": [
        {{
          "number": 1,
          "text": "Question text here",
          "options": ["A. ...", "B. ...", "C. ...", "D. ..."],
          "correct_answer": "A",
          "marks": 1,
          "bloom_level": "Knowledge",
          "answer_explanation": "Why this is the correct answer"
        }}
      ]
    }},
    {{
      "type": "Short Answer",
      "title": "Section B: Short Answer Questions",
      "instructions": "Answer in 2-3 sentences. Show your working.",
      "questions": [
        {{
          "number": 5,
          "text": "Question text here",
          "marks": 3,
          "bloom_level": "Application",
          "sample_answer": "Full model answer",
          "marking_points": ["Point 1 earns 1 mark", "Point 2 earns 1 mark", "Point 3 earns 1 mark"],
          "common_errors": "Typical mistakes students make"
        }}
      ]
    }},
    {{
      "type": "Long Answer",
      "title": "Section C: Extended Response",
      "instructions": "Answer in full sentences. Show all working.",
      "questions": [
        {{
          "number": 8,
          "text": "Question text here",
          "marks": 5,
          "bloom_level": "Analysis",
          "sample_answer": "Comprehensive model answer",
          "marking_rubric": [
            {{"criterion": "...", "marks": 2, "descriptor": "What earns these marks"}},
            {{"criterion": "...", "marks": 3, "descriptor": "What earns these marks"}}
          ]
        }}
      ]
    }}
  ],
  "answer_key": [
    {{"number": 1, "answer": "A", "marks": 1, "notes": ""}},
    {{"number": 5, "answer": "See marking points", "marks": 3, "notes": "Accept any equivalent correct response"}}
  ],
  "teacher_notes": "Guidance on administering this worksheet, common student errors to watch for, and extension suggestions",
  "differentiation": {{
    "support": "How to scaffold this worksheet for struggling students",
    "extension": "Additional challenge questions or tasks for advanced students"
  }}
}}""",

        "lessonplan": f"""You are an expert curriculum designer. Create a DETAILED, PROFESSIONAL lesson plan following standard educational best practices.

LESSON DETAILS:
- Subject: {body.subject}
- Topic: {body.topic}
- Grade/Class: {body.grade or extra.get('classLevel', '')}
- Board / Curriculum: {extra.get('board', 'CBSE')}
- Chapter: {extra.get('chapter', '') or 'Not specified'}
- Duration per Class: {extra.get('durationMinutes', 45)} minutes
- Number of Classes: {extra.get('numberOfClasses', 1)}
- Curriculum Standards: {extra.get('standards', 'Not specified')}
- Lesson Type: {extra.get('lessonType', 'standard')} (standard | activity | inquiry | 5e)
- Focus Areas: {', '.join(extra.get('focusAreas', ['concept_understanding']))}

INCLUDE IN PLAN:
- Assessment Questions: {extra.get('includeOptions', {}).get('assessmentQuestions', True)}
- Homework: {extra.get('includeOptions', {}).get('homework', True)}
- Real-Life Examples: {extra.get('includeOptions', {}).get('realLifeExamples', True)}
- Differentiation: {extra.get('includeOptions', {}).get('differentiation', True)}

TEACHER-SELECTED LEARNING OBJECTIVES (with cognitive tags):
{chr(10).join(f'- [{o.get("tag", "concept").upper()}] {o.get("text", o) if isinstance(o, dict) else o}' for o in extra.get('objectives', [])) or '- To be determined by AI based on topic'}

INSTRUCTIONAL METHODS TO USE:
{', '.join(extra.get('instructionalMethods', ['Direct Instruction', 'Guided Practice']))}

AVAILABLE RESOURCES/MATERIALS:
{', '.join(extra.get('resources', ['Whiteboard', 'Textbook']))}

LESSON STRUCTURE REQUESTED (with timing):
{chr(10).join(f'- {s["label"]}: {s["duration"]} minutes' for s in extra.get('lessonSections', [])) or '- Standard lesson structure'}

SPECIFIC CLASS NEEDS / DIFFERENTIATION NOTES:
{extra.get('specificNeeds', 'Standard mixed-ability class')}

DIFFERENTIATION STRATEGIES PROVIDED:
- Support: {extra.get('differentiation', {}).get('support', 'Provide scaffolding and peer support')}
- Enrichment: {extra.get('differentiation', {}).get('enrichment', 'Extension tasks for advanced learners')}

BOARD-SPECIFIC GUIDANCE:
- CBSE: Follow NCERT curriculum, use standard CBSE patterns and terminology
- ICSE: Include application-based and analytical depth per ICSE style
- State Board: Use state syllabus structure and regional context
- IB: Use inquiry-based questions, ATL skills, and conceptual understanding
- Cambridge: Use Cambridge learning objectives and command words

LESSON TYPE GUIDANCE:
- standard: Traditional teacher-led instruction with guided and independent practice
- activity: Hands-on, student-centred activities as the primary mode of learning
- inquiry: Students explore questions and construct understanding through investigation
- 5e: Follow Engage → Explore → Explain → Elaborate → Evaluate structure

FOCUS AREA GUIDANCE:
- concept_understanding: Prioritise clear explanations, analogies, and conceptual depth
- application: Emphasise real-world problems, worked examples, and transfer tasks
- exam_preparation: Include exam-style questions, mark schemes, and exam technique tips
- revision: Structure around retrieval practice, spaced repetition, and gap-filling

{f'REFERENCE DOCUMENT PROVIDED BY TEACHER (use this to inform content, examples, and alignment):{chr(10)}{extra.get("referenceDocumentContent", "")[:3000]}' if extra.get('referenceDocumentContent') else ''}

Generate a COMPREHENSIVE, DETAILED lesson plan. Each section must have specific, actionable teacher instructions and student activities — not vague descriptions. Include exact questions to ask, specific examples to use, and precise activities. Only include sections the teacher opted into (assessmentQuestions, homework, realLifeExamples, differentiation).

Return ONLY valid JSON (no markdown, no extra text):
{{
  "title": "Lesson Plan: {body.topic}",
  "subject": "{body.subject}",
  "grade": "{body.grade or extra.get('classLevel', '')}",
  "board": "{extra.get('board', 'CBSE')}",
  "chapter": "{extra.get('chapter', '')}",
  "lesson_type": "{extra.get('lessonType', 'standard')}",
  "focus_areas": {extra.get('focusAreas', ['concept_understanding'])},
  "duration_minutes": {extra.get('durationMinutes', 45)},
  "number_of_classes": {extra.get('numberOfClasses', 1)},
  "standards": "{extra.get('standards', '')}",
  "learning_objectives": [
    "By the end of this lesson, students will be able to [specific measurable action] [topic element] with [success criteria]",
    "Students will demonstrate understanding of [concept] by [observable behavior]"
  ],
  "prerequisite_knowledge": ["List what students must already know before this lesson"],
  "key_vocabulary": [
    {{"term": "...", "definition": "..."}}
  ],
  "materials": ["Detailed list of every material needed"],
  "lesson_procedures": [
    {{
      "phase": "Warm-Up / Do Now",
      "duration_minutes": 5,
      "purpose": "Activate prior knowledge and focus student attention",
      "teacher_actions": "Detailed step-by-step instructions for what the teacher does and says",
      "student_actions": "Exactly what students do during this phase",
      "key_questions": ["Specific questions to ask students"],
      "notes": "Tips, common misconceptions to watch for"
    }}
  ],
  "formative_assessment": {{
    "during_lesson": ["Specific formative assessment strategies used throughout"],
    "exit_ticket": "Exact exit ticket question(s) to assess understanding"
  }},
  "summative_assessment": "How student mastery will be formally assessed",
  "differentiation": {{
    "support": "Specific strategies and modifications for struggling learners",
    "enrichment": "Specific extension activities for advanced learners",
    "ell_accommodations": "Strategies for English Language Learners",
    "iep_accommodations": "General accommodations for students with IEPs"
  }},
  "real_life_examples": ["Concrete real-world connection 1", "Concrete real-world connection 2"],
  "cross_curricular_connections": ["Connections to other subjects or real-world applications"],
  "homework_assignment": "Specific homework task with clear instructions",
  "teacher_reflection_prompts": [
    "What went well in this lesson?",
    "Which students need additional support with this concept?",
    "What would I change for next time?"
  ]
}}""",

        "quiz": f"""You are an expert assessment designer. Create a high-quality quiz following Bloom's Taxonomy and Depth of Knowledge (DOK) principles.

QUIZ DETAILS:
- Subject: {body.subject}
- Topic: {body.topic}
- Grade: {body.grade or extra.get('classLevel', '')}
- Board: {extra.get('board', 'CBSE')}
- Chapter: {extra.get('chapter', '') or 'Not specified'}
- Number of Questions: {extra.get('count', 10)}
- Difficulty Distribution: Easy={extra.get('difficulty', {}).get('easy', 30) if isinstance(extra.get('difficulty'), dict) else 30}%, Medium={extra.get('difficulty', {}).get('medium', 50) if isinstance(extra.get('difficulty'), dict) else 50}%, Hard={extra.get('difficulty', {}).get('hard', 20) if isinstance(extra.get('difficulty'), dict) else 20}%
- Question Types: {', '.join(extra.get('question_types', ['mcq', 'short_answer']))}
- Learning Objective: {extra.get('learning_objective', 'Concept Understanding')} — align all questions to this objective
- Special Instructions: {extra.get('special_instructions', 'None')}

BOARD-SPECIFIC GUIDANCE:
- CBSE: Follow NCERT patterns, use standard CBSE marking scheme
- ICSE: Include application and analytical questions per ICSE style
- State Board: Align to state syllabus and regional context
- IB: Use inquiry-based, conceptual questions
- Cambridge: Use Cambridge command words (describe, explain, evaluate, etc.)

Generate a PROFESSIONAL quiz. For MCQs: write plausible distractors with rationale. For short/long answer: include a detailed marking rubric.

Return ONLY valid JSON (no markdown):
{{
  "title": "Quiz: {body.topic}",
  "subject": "{body.subject}",
  "grade": "{body.grade or extra.get('classLevel', '')}",
  "topic": "{body.topic}",
  "total_marks": 20,
  "estimated_time_minutes": 30,
  "instructions": "Answer all questions. Show your working for calculation questions.",
  "questions": [
    {{
      "number": 1,
      "type": "mcq",
      "blooms_level": "Knowledge",
      "difficulty": "Easy",
      "marks": 1,
      "text": "Question text here",
      "options": [
        {{"label": "A", "text": "...", "is_correct": true}},
        {{"label": "B", "text": "...", "is_correct": false}},
        {{"label": "C", "text": "...", "is_correct": false}},
        {{"label": "D", "text": "...", "is_correct": false}}
      ],
      "correct_answer": "A",
      "explanation": "Why A is correct and why the other options are wrong",
      "distractor_rationale": "Common misconception that leads students to wrong options"
    }},
    {{
      "number": 2,
      "type": "short_answer",
      "blooms_level": "Application",
      "difficulty": "Medium",
      "marks": 3,
      "text": "Question text here",
      "sample_answer": "Full model answer",
      "marking_rubric": [
        {{"criterion": "...", "marks": 1, "descriptor": "What earns this mark"}}
      ],
      "common_errors": ["Typical mistakes students make"]
    }}
  ],
  "answer_key_summary": [
    {{"number": 1, "answer": "A", "marks": 1}}
  ],
  "teacher_notes": "Tips for administering this quiz and common areas of difficulty"
}}""",

        "concept": f"""You are a master teacher. Use the ADEPT method (Analogy, Diagram, Example, Plain-English, Technical) to create a comprehensive concept explanation.

CONCEPT DETAILS:
- Concept: {body.topic}
- Subject: {body.subject}
- Class / Grade: {body.grade or 'Grade 8'}
- Board / Curriculum: {extra.get('board', 'CBSE')}
- Explanation Style: {extra.get('style', 'Analogy-based')}
- Level: {extra.get('level', 'Standard')} — Basic = simple vocabulary for struggling students; Standard = default depth; Advanced = deeper exploration
- Include Options: {', '.join(extra.get('include', ['realLifeExamples', 'visualExplanation', 'commonMistakes', 'quickQuestions']))}

LEVEL GUIDANCE:
- Basic: Use very simple language, short sentences, relatable everyday examples. Emphasise simplified_version.
- Standard: Balanced explanation suitable for the grade level.
- Advanced: Include technical depth, chemical equations, formal definitions, extension activities.

BOARD-SPECIFIC GUIDANCE:
- CBSE: Use NCERT-aligned examples and standard textbook language
- ICSE: Include analytical depth and application examples
- State Board: Use regional/local context in examples

INCLUDE OPTIONS GUIDANCE — only generate sections for the options listed above:
- realLifeExamples → populate real_world_examples
- visualExplanation → populate diagram_description
- commonMistakes → populate common_misconceptions
- quickQuestions → populate quick_check_questions (1 MCQ with 4 options + 1 fill-in-the-blank + 1 short question)

Return ONLY valid JSON (no markdown):
{{
  "concept": "{body.topic}",
  "subject": "{body.subject}",
  "grade": "{body.grade or ''}",
  "one_line_summary": "A single sentence capturing the essence of this concept",
  "plain_english_explanation": "Clear, jargon-free explanation (3-4 paragraphs)",
  "technical_explanation": "Precise technical definition with correct terminology and any relevant equations",
  "primary_analogy": {{
    "analogy": "The main analogy to use",
    "explanation": "How the analogy maps to the concept step by step",
    "limitations": "Where the analogy breaks down"
  }},
  "real_world_examples": [
    {{"example": "...", "connection": "How this connects to the concept"}}
  ],
  "diagram_description": "Step-by-step visual flow description suitable for drawing on a board (use arrows and labels)",
  "step_by_step_process": [
    {{"step": 1, "action": "...", "explanation": "..."}}
  ],
  "key_vocabulary": [
    {{"term": "...", "definition": "...", "example_in_sentence": "..."}}
  ],
  "common_misconceptions": [
    {{"misconception": "What students wrongly believe", "correction": "The accurate understanding", "how_to_address": "Teaching strategy"}}
  ],
  "discussion_questions": ["Questions to spark class discussion"],
  "quick_check_questions": [
    {{
      "question": "MCQ question text",
      "type": "mcq",
      "options": [
        {{"text": "Option A", "is_correct": false}},
        {{"text": "Option B", "is_correct": true}},
        {{"text": "Option C", "is_correct": false}},
        {{"text": "Option D", "is_correct": false}}
      ],
      "expected_answer": "Option B"
    }},
    {{
      "question": "Fill in the blank: Plants use _______ to make food.",
      "type": "fill_blank",
      "expected_answer": "Sunlight"
    }},
    {{
      "question": "Short question text",
      "type": "short",
      "expected_answer": "Expected short answer"
    }}
  ],
  "exam_answer_format": "A model exam-style answer (2-3 sentences) suitable for board exams",
  "teaching_tips": ["Specific classroom strategies"],
  "simplified_version": "Simpler explanation for struggling learners using very basic vocabulary",
  "extension_for_advanced": "Deeper exploration for advanced students"
}}""",

        "presentation": f"""You are a Senior Instructional Designer and Presentation Expert. Generate a structured, classroom-ready lesson deck.

PRESENTATION DETAILS:
- Topic: {body.topic}
- Subject: {body.subject}
- Grade/Class: {body.grade or extra.get('classLevel', '')}
- Target Audience: {extra.get('target_audience', 'students')}
- Board: {extra.get('board', 'CBSE')}
- Chapter: {extra.get('chapter', '') or 'Not specified'}
- Number of Slides: {extra.get('num_slides', 12)}
- Duration: {extra.get('duration_minutes', 45)} minutes
- Purpose: {extra.get('purpose', 'Teaching New Concept')}
- Visual Style: {extra.get('visual_style', 'Modern/Clean')}
- Learning Objective: {extra.get('learning_objective', 'Concept Understanding')}
- Tone: {extra.get('tone', 'Engaging')}
- Content Depth: {extra.get('content_depth', 'Concise')}
- Include Mini Quiz: {extra.get('include_mini_quiz', False)}
- Special Instructions: {extra.get('special_instructions', 'None')}

USER MODELING CONSTRAINTS:
1. Adjust vocabulary and complexity for the grade level and target audience specified above.
2. Content Depth rules:
   - "Concise": Max 3 bullets per slide, high-level summaries only.
   - "Detailed": Comprehensive explanations, data points, and full context.
3. Board alignment:
   - CBSE/NCERT: Linear conceptual flow, reference NCERT chapters.
   - IB: Inquiry-based questions, ATL skills, conceptual understanding.
   - ICSE: Analytical and application-focused slides.
   - State Board: State syllabus structure and regional examples.
   - Cambridge: Cambridge learning objectives and command words.

PEDAGOGICAL INSTRUCTIONS:
- Tone "Engaging": Use analogies, "Did you know?" facts, and real-world examples.
- Tone "Formal": Professional, structured, academic language.
- Tone "Reflection": Reflective prompts and deeper thinking questions.
- If Include Mini Quiz is true: the final 2 slides MUST be type "assessment" containing MCQ questions with 4 options each.
- Visuals: Provide a unique, vibrant, modern visual_prompt for EVERY slide describing an image for an AI image generator.

Return ONLY valid JSON (no markdown):
{{
  "title": "{body.topic}",
  "subject": "{body.subject}",
  "grade": "{body.grade or extra.get('classLevel', '')}",
  "total_slides": {extra.get('num_slides', 12)},
  "duration_minutes": {extra.get('duration_minutes', 45)},
  "metadata": {{
    "duration": "{extra.get('duration_minutes', 45)} min",
    "objectives": ["By the end, students will be able to..."]
  }},
  "learning_objectives": ["By the end, students will be able to..."],
  "slides": [
    {{
      "number": 1,
      "type": "title",
      "title": "Presentation title",
      "subtitle": "Subject | Grade",
      "content": {{
        "bullets": [],
        "steps": [],
        "visual_prompt": "A vibrant 3D isometric classroom scene with glowing books and floating equations, modern purple and blue lighting, high resolution"
      }},
      "speaker_notes": "Welcome students, introduce the topic",
      "engagement_prompt": null,
      "vibrant_accent_color": "#695be6",
      "duration_minutes": 2
    }},
    {{
      "number": 2,
      "type": "hook",
      "title": "Did You Know?",
      "content": {{
        "bullets": ["Surprising fact or real-world scenario"],
        "steps": [],
        "visual_prompt": "A vibrant photorealistic scene illustrating a surprising real-world application of the topic, vivid colors, modern style"
      }},
      "speaker_notes": "Use this to spark curiosity. Pause and let students react.",
      "engagement_prompt": "Where have you seen this in real life?",
      "vibrant_accent_color": "#f97316",
      "duration_minutes": 3
    }},
    {{
      "number": 3,
      "type": "content",
      "title": "Core Concept",
      "content": {{
        "bullets": ["Key point 1", "Key point 2", "Key point 3"],
        "steps": [],
        "visual_prompt": "A clean modern infographic diagram explaining the core concept with vibrant color-coded sections, high resolution"
      }},
      "speaker_notes": "Explain each bullet with an example. Check for understanding.",
      "engagement_prompt": "Can anyone give me an example?",
      "vibrant_accent_color": "#3b82f6",
      "duration_minutes": 5
    }},
    {{
      "number": 4,
      "type": "activity",
      "title": "Try It Yourself",
      "content": {{
        "bullets": ["Practice problem description"],
        "steps": ["Step 1: ...", "Step 2: ...", "Step 3: ..."],
        "visual_prompt": "Students collaborating at desks with glowing tablets and colorful sticky notes, vibrant warm lighting, modern classroom"
      }},
      "speaker_notes": "Give students 3-4 minutes. Circulate and support.",
      "engagement_prompt": "Work with your partner.",
      "vibrant_accent_color": "#22c55e",
      "duration_minutes": 5
    }},
    {{
      "number": 5,
      "type": "summary",
      "title": "Key Takeaways",
      "content": {{
        "bullets": ["Main point 1", "Main point 2", "Main point 3"],
        "steps": [],
        "visual_prompt": "A vibrant mind-map with glowing nodes summarizing key concepts, purple and gold color scheme, high resolution"
      }},
      "speaker_notes": "Ask students to recall before revealing bullets.",
      "engagement_prompt": "What were the 3 main things we learned?",
      "vibrant_accent_color": "#8b5cf6",
      "duration_minutes": 3
    }},
    {{
      "number": 6,
      "type": "assessment",
      "title": "Check Your Understanding",
      "content": {{
        "bullets": [],
        "steps": [],
        "visual_prompt": "A modern quiz interface with glowing answer buttons on a dark background, vibrant neon accents, high resolution",
        "questions": [
          {{
            "question": "MCQ question text?",
            "options": ["A. Option 1", "B. Option 2", "C. Option 3", "D. Option 4"],
            "correct": "A"
          }}
        ]
      }},
      "speaker_notes": "Give 2 minutes. Collect responses as exit ticket.",
      "engagement_prompt": null,
      "vibrant_accent_color": "#ef4444",
      "duration_minutes": 3
    }}
  ],
  "teacher_preparation_notes": "What to prepare, materials needed, potential student questions",
  "differentiation_notes": {{
    "support": "How to adapt for struggling learners",
    "enrichment": "Extension for advanced students"
  }},
  "homework_connection": "How this connects to homework or next lesson"
}}""",

        "grading": f"""You are an expert educational assessor. Grade the student response and return structured SMART AI feedback.

GRADING REQUEST:
- Assistance Type: {extra.get('assistance_type', 'feedback')}
- Question/Task: {extra.get('question', body.topic)}
- Student Response: {extra.get('student_response', 'No response provided')}
- Total Marks: {extra.get('total_marks', 10)}
- Feedback Tone: {extra.get('feedback_tone', 'encouraging')}
- Subject: {body.subject}
- Grade Level: {body.grade or 'General'}

TONE GUIDANCE:
- encouraging: warm, positive framing, celebrate effort, gentle on mistakes
- neutral: factual, balanced, no emotional language
- strict: direct, precise, high standards, minimal praise

Return ONLY valid JSON (no markdown):
{{
  "question": "{extra.get('question', body.topic)}",
  "score": <integer marks awarded>,
  "max_score": {extra.get('total_marks', 10)},
  "percentage": <integer 0-100>,
  "overall_verdict": "One sentence overall assessment (e.g. 'You understood the concept but made a calculation error at the end.')",
  "what_went_well": [
    "Specific thing the student did correctly with evidence from their response",
    "Another strength"
  ],
  "what_to_improve": [
    "Specific mistake or gap with exact location in their response",
    "Another improvement point"
  ],
  "quick_fix": [
    "Step-by-step correction for the main mistake (e.g. 'From 3x = 15, divide both sides by 3 → x = 5')",
    "Any other quick correction"
  ],
  "next_steps": [
    "Actionable study/practice suggestion",
    "Another next step"
  ],
  "try_again_message": "Short motivational retry prompt (e.g. 'Almost correct — fix the last step and retry!')",
  "feedback": "Full written feedback paragraph in the requested tone — 3-4 sentences, specific and actionable"
}}""",

        "diffgroups": f"""You are an expert educator specialising in differentiated instruction. Analyse the student performance data and create optimal learning groups.

GROUPING REQUEST:
- Subject: {extra.get('subject', body.subject)}
- Chapter/Topic: {extra.get('chapter', body.topic)}
- Number of Groups: {extra.get('num_groups', 3)}
- Difficulty Levels: {extra.get('difficulty_levels', ['Foundation', 'Intermediate', 'Advanced'])}
- Students: {[{'id': s.get('id', ''), 'name': s.get('name', ''), 'avg_score': s.get('avg_score', s.get('avg', 0)), 'performance_level': s.get('performance_level', '')} for s in extra.get('students', [])]}

Create {extra.get('num_groups', 3)} differentiated groups based on student performance. Assign EVERY student to exactly one group.

Return ONLY valid JSON (no markdown):
{{
  "groups": [
    {{
      "label": "Group A",
      "difficulty": "Foundation",
      "performance": "Needs More Support",
      "reasoning": "Brief explanation of why these students are grouped together",
      "student_ids": ["student_id_1", "student_id_2"],
      "students": ["Student Name 1", "Student Name 2"],
      "questions": []
    }}
  ]
}}""",

        "classreport": f"""You are an expert educational data analyst. Analyse the following class performance data and generate a comprehensive, actionable class report.

CLASS DATA:
- Grade/Class: {extra.get('grade', body.grade or '')}
- Subject: {extra.get('subject', body.subject)}
- Overall Class Average: {extra.get('overall_avg', 0)}%
- Topics Assessed: {', '.join(extra.get('topics', []))}
- Critical Topics (avg < 50%): {', '.join(extra.get('critical_topics', []))}
- Topics Needing Attention (50-65%): {', '.join(extra.get('struggling_topics', []))}
- Class Average Per Topic: {dict(zip(extra.get('topics', []), extra.get('class_avg_per_topic', [])))}
- Student Performance Summary: {[{'name': s.get('name', ''), 'avg': s.get('avg', s.get('avg_score', 0))} for s in extra.get('students', [])]}

Generate a detailed, actionable class report with specific insights and recommendations.

Return ONLY valid JSON (no markdown):
{{
  "summary": "2-3 sentence executive summary of class performance",
  "overall_assessment": "Detailed assessment of the class's overall performance level",
  "insights": [
    "Specific insight 1 about class performance patterns",
    "Specific insight 2 about topic-level trends",
    "Specific insight 3 about student groupings",
    "Specific insight 4 about curriculum gaps"
  ],
  "recommendations": [
    "Specific actionable recommendation 1 for the teacher",
    "Specific actionable recommendation 2",
    "Specific actionable recommendation 3"
  ],
  "at_risk_students": ["Names of students with avg below 50%"],
  "top_performers": ["Names of students with avg above 80%"],
  "priority_topics": [
    {{
      "topic": "Topic name",
      "avg": 0,
      "action": "Specific teaching action to take",
      "strategy": "Recommended teaching strategy"
    }}
  ],
  "teaching_strategies": [
    "Strategy 1 for addressing the identified gaps",
    "Strategy 2"
  ],
  "next_steps": [
    "Immediate action 1 (this week)",
    "Short-term action 2 (this month)",
    "Long-term action 3"
  ]
}}""",
    }
    prompt = prompts.get(body.tool, f"Help with {body.tool} for {body.topic} in {body.subject}. Return JSON.")
    raw = await chat_completion([{"role": "user", "content": prompt}])
    raw = raw.strip().lstrip("```json").lstrip("```").rstrip("```").strip()
    try:
        return json.loads(raw)
    except Exception:
        return {"content": raw}


# ── Background presentation pipeline (FastAPI BackgroundTasks) ────────────────

def _pollinations_url(detailed_description: str, seed: int) -> str:
    """Build a Pollinations.ai image URL with a stable seed for visual cohesion."""
    import urllib.parse
    encoded = urllib.parse.quote(detailed_description[:300])
    return (
        f"https://image.pollinations.ai/prompt/{encoded}"
        f"?width=1024&height=768&nologo=true&model=flux&seed={seed}"
    )


async def _generate_image_pollinations(visual_prompt: str, job_seed: int = 42) -> Optional[str]:
    """
    Return a Pollinations.ai URL for the given visual description.
    Uses job_seed for visual cohesion across all slides in a presentation.
    No API key required — URL is returned immediately (image generated on first fetch).
    """
    try:
        return _pollinations_url(visual_prompt, job_seed)
    except Exception as exc:
        import logging
        logging.getLogger(__name__).warning("Pollinations URL build failed: %s", exc)
        return None


def _robust_json_parse(raw: str, label: str = "") -> dict:
    """
    Parse LLM output that may be wrapped in markdown fences or partially complete.
    Strategy: extract the content between the FIRST { and LAST } — the strictest
    possible extraction — then fall back to progressively looser strategies.
    Logs the raw output on failure so we can diagnose stub triggers.
    """
    import re
    import logging
    log = logging.getLogger(__name__)

    text = raw.strip() if raw else ""

    # ── Strategy 1: strict first-{ to last-} extraction ──────────────────────
    first = text.find("{")
    last  = text.rfind("}")
    if first != -1 and last != -1 and last > first:
        candidate = text[first : last + 1]
        try:
            return json.loads(candidate)
        except json.JSONDecodeError:
            pass

    # ── Strategy 2: strip markdown fences then direct parse ──────────────────
    cleaned = re.sub(r"^```(?:json)?\s*", "", text)
    cleaned = re.sub(r"\s*```$", "", cleaned).strip()
    try:
        return json.loads(cleaned)
    except json.JSONDecodeError:
        pass

    # ── Strategy 3: close unclosed braces/brackets ───────────────────────────
    try:
        open_b  = cleaned.count("{") - cleaned.count("}")
        open_sq = cleaned.count("[") - cleaned.count("]")
        patched = cleaned + ("]" * max(0, open_sq)) + ("}" * max(0, open_b))
        return json.loads(patched)
    except json.JSONDecodeError:
        pass

    # ── All strategies failed — log raw output so we can diagnose ────────────
    log.error(
        "JSON parse FAILED%s. Raw output (first 500 chars):\n%s",
        f" [{label}]" if label else "",
        text[:500],
    )
    print(f"[PPTX] JSON parse FAILED{' [' + label + ']' if label else ''}. Raw:\n{text[:500]}")
    raise ValueError(f"Cannot parse JSON from LLM output: {text[:200]}")


async def _safe_llm_slide(i: int, total: int, params: dict, slide_outline: str = "") -> dict:
    """Wrapper that never raises — retries once, then returns a minimal fallback slide."""
    import logging
    log = logging.getLogger(__name__)
    for attempt in range(2):
        try:
            return await _llm_single_slide(i, total, params, slide_outline)
        except Exception as exc:
            log.warning("Slide %d/%d generation failed (attempt %d): %s", i, total, attempt + 1, exc)
            print(f"[PPTX] Slide {i}/{total} attempt {attempt + 1} FAILED: {exc}")
            if attempt == 0:
                await asyncio.sleep(3)
    topic = params.get("topic", "this topic")
    print(f"[PPTX] Slide {i}/{total} falling back to stub after 2 failed attempts")
    return {
        "number": i, "type": "content", "title": f"Slide {i}: {topic}",
        "content": {
            "bullets": [f"Key concept {i} of {topic}"],
            "steps": [], "explanation": "", "key_terms": [],
            "diagram": {"type": "none", "nodes": [], "connections": [], "mermaid": ""},
            "visual_prompt": f"A hyper-realistic educational illustration of {topic}, vibrant colors, modern style",
            "detailed_visual_description": f"A hyper-realistic educational illustration of {topic}, vibrant colors, modern style",
        },
        "speaker_notes": f"Discuss slide {i} with students.",
        "engagement_prompt": "What do you think about this?",
        "vibrant_accent_color": "#695be6",
    }


async def _llm_single_slide(slide_number: int, total: int, params: dict, slide_outline: str = "") -> dict:
    """Call LLM to generate one slide's content using a specific slide outline for context."""
    topic                = params["topic"]
    subject              = params["subject"]
    grade                = params.get("grade", "")
    board                = params.get("board", "CBSE")
    chapter              = params.get("chapter", "")
    tone                 = params.get("tone", "Engaging")
    content_depth        = params.get("content_depth", "Concise")
    purpose              = params.get("purpose", "teaching")
    target_audience      = params.get("target_audience", "students")
    include_quiz         = params.get("include_mini_quiz", False)
    learning_objective   = params.get("learning_objective", "Concept Understanding")
    special_instructions = params.get("special_instructions", "")
    visual_style         = params.get("visual_style", "modern")
    duration_minutes     = params.get("duration_minutes", 30)

    depth_rule = (
        "3-4 concise bullets + a 2-sentence explanation."
        if content_depth == "Concise"
        else "4-6 detailed bullets + a 3-4 sentence explanation with data points and worked examples."
    )
    tone_rule = {
        "Engaging":   "Use analogies, 'Did you know?' hooks, and relatable real-world examples.",
        "Formal":     "Professional, structured, academic language with precise terminology.",
        "Reflection": "Pose Socratic questions and reflective prompts to encourage metacognition.",
    }.get(tone, "")
    purpose_rule = {
        "teaching":  "Introduce and explain the concept clearly from scratch.",
        "revision":  "Summarise key points and highlight common mistakes.",
        "template":  "Provide a structured template students can fill in themselves.",
    }.get(purpose, "")
    style_rule = {
        "modern":   "Clean, minimal layout.",
        "colorful": "Vibrant, engaging layout with bold accent colors.",
        "ncert":    "NCERT-aligned: definition box, examples, exercises.",
    }.get(visual_style, "")

    chapter_context  = f"Chapter: {chapter}." if chapter else ""
    special_context  = f"Special instructions: {special_instructions}" if special_instructions else ""
    outline_context  = (
        f"\n\nSLIDE OUTLINE (use this as your primary content source for THIS slide):\n{slide_outline}"
        if slide_outline else ""
    )

    type_map   = ["title", "hook", "content", "content", "example", "activity", "summary", "assessment"]
    slide_type = type_map[min(slide_number - 1, len(type_map) - 1)]
    if include_quiz and slide_number >= total - 1:
        slide_type = "assessment"

    assessment_extra = ""
    if slide_type == "assessment":
        assessment_extra = """,
    "questions": [
      {
        "question": "Question text here?",
        "options": ["A) Option 1", "B) Option 2", "C) Option 3", "D) Option 4"],
        "correct": "A"
      }
    ]"""

    system_prompt = (
        f"You are a Senior Instructional Designer for {board} {subject}, {grade}. "
        f"Generate ONE presentation slide as a raw JSON object. "
        f"Learning objective: {learning_objective}. "
        f"Purpose: {purpose_rule} "
        f"Visual style: {style_rule} "
        f"Tone: {tone_rule} "
        f"Content depth: {depth_rule} "
        f"Target audience: {target_audience}. "
        f"CRITICAL RULES: "
        f"(1) Output ONLY the JSON object — no markdown fences, no prose before or after. "
        f"(2) Start your response with {{ and end with }}. "
        f"(3) Every string value must be complete — no truncation. "
        f"(4) The 'detailed_visual_description' MUST be a rich, specific AI image prompt (not generic)."
    )

    user_prompt = f"""Generate slide {slide_number} of {total} for a {board} {subject} presentation on "{topic}".

COMPLETE CONTEXT:
- Subject: {subject}  |  Grade: {grade}  |  Board: {board}
- {chapter_context}
- Topic: {topic}
- Slide type: {slide_type}
- Learning objective: {learning_objective}
- Target audience: {target_audience}
- Tone: {tone}
- Content depth: {content_depth}
- Visual style: {visual_style}
- Purpose: {purpose}
- Duration budget: {duration_minutes} min total
- {special_context}{outline_context}

VISUAL DESCRIPTION RULE — CRITICAL:
The "detailed_visual_description" MUST be a UNIQUE, SPECIFIC, RICH AI image prompt for THIS slide's sub-topic.
DO NOT use generic descriptions like "educational illustration of {topic}".
DO NOT repeat the same description for multiple slides.

Examples of GOOD prompts:
  Slide 1 (intro): "A coordinate plane with a straight line y=2x+1 drawn in vibrant blue, grid lines visible, educational poster style, high quality"
  Slide 2 (balance): "A balance scale with 'x + 5' on the left pan and '10' on the right pan, 3D render, bright classroom colors, realistic"
  Slide 3 (solving): "Step-by-step algebra working on a whiteboard showing 2x+3=7 being solved, chalk style, high contrast, educational"

Return ONLY this JSON (start with {{, end with }}, no other text):
{{
  "number": {slide_number},
  "type": "{slide_type}",
  "title": "Specific engaging title for slide {slide_number} about {topic}",
  "subtitle": "One-line hook or sub-heading",
  "content": {{
    "bullets": ["Specific fact or concept about {topic}", "Another substantive point", "Third point with example"],
    "steps": [],
    "explanation": "2-3 sentences of context with a Did you know? fact specific to this slide's sub-topic.",
    "key_terms": [{{"term": "Relevant term", "definition": "Clear one-line definition"}}],
    "diagram": {{
      "type": "none",
      "nodes": [],
      "connections": [],
      "mermaid": ""
    }},
    "visual_prompt": "Short 5-word search phrase specific to this slide",
    "detailed_visual_description": "UNIQUE rich AI image prompt specific to slide {slide_number}'s sub-topic (NOT generic)"{assessment_extra}
  }},
  "speaker_notes": "3-4 sentence teacher script with specific analogies and talking points for {topic}.",
  "engagement_prompt": "Specific question or activity about this slide's sub-topic",
  "vibrant_accent_color": "#695be6"
}}"""

    raw = await chat_completion(
        [
            {"role": "system", "content": system_prompt},
            {"role": "user",   "content": user_prompt},
        ],
        timeout=120,
    )
    return _robust_json_parse(raw, label=f"slide {slide_number}/{total}")

async def process_pptx_pipeline(job_id: str, params: dict, db):
    """
    3-phase pipeline:
      Phase 0 — Planner: LLM returns a JSON list of N slide outlines (each with visual_keyword)
      Phase 1 — Slides: throttled parallel LLM calls (semaphore=4)
      Phase 2 — Images: DuckDuckGo search per slide (semaphore=6), Pollinations fallback
    Job state is persisted to MongoDB so server restarts don't lose progress.
    """
    import logging
    log = logging.getLogger(__name__)

    async def _db_update(fields: dict):
        """Write-through: update both in-memory dict and MongoDB."""
        presentation_jobs[job_id].update(fields)
        try:
            await db.presentation_jobs.update_one(
                {"_id": job_id}, {"$set": fields}
            )
        except Exception as exc:
            log.warning("[PPTX] MongoDB update failed for job %s: %s", job_id, exc)

    total   = int(params.get("num_slides", 10))
    topic   = params["topic"]
    subject = params["subject"]
    grade   = params.get("grade", "")
    board   = params.get("board", "CBSE")
    chapter = params.get("chapter", "")
    lo      = params.get("learning_objective", "Concept Understanding")

    await _db_update({"total_slides": total, "current_slide": 0, "status": "processing"})

    # ── Phase 0: Planner ─────────────────────────────────────────────────────
    planner_prompt = f"""You are a curriculum planner. Create a structured outline for a {total}-slide {board} {subject} presentation on "{topic}" for {grade}.
{f"Chapter: {chapter}." if chapter else ""}
Learning objective: {lo}.

Return ONLY a JSON array of exactly {total} objects. Each object must have:
- "slide_number": integer
- "title": specific slide title (NOT generic like "Slide 1")
- "sub_topic": the specific aspect of {topic} this slide covers
- "key_points": array of 3 specific facts or concepts for this slide
- "visual_keyword": a short 3-5 word search phrase for finding a diagram (e.g. "mitochondria cell diagram")
- "visual_hint": a specific visual description unique to this slide's sub-topic
- "slide_type": one of title|hook|content|example|activity|summary|assessment

Return ONLY the JSON array, starting with [ and ending with ]. No other text."""

    slide_outlines: list[str] = []
    try:
        raw_plan = await chat_completion(
            [{"role": "user", "content": planner_prompt}],
            timeout=120,
        )
        first_b = raw_plan.find("[")
        last_b  = raw_plan.rfind("]")
        if first_b != -1 and last_b > first_b:
            plan_list = json.loads(raw_plan[first_b : last_b + 1])
            slide_outlines = [json.dumps(item) for item in plan_list]
            log.info("[PPTX] Planner produced %d outlines for job %s", len(slide_outlines), job_id)
        else:
            raise ValueError("No JSON array found in planner response")
    except Exception as exc:
        log.warning("[PPTX] Planner failed for job %s: %s — proceeding without outlines", job_id, exc)
        slide_outlines = []

    while len(slide_outlines) < total:
        slide_outlines.append("")
    slide_outlines = slide_outlines[:total]

    # ── Phase 1: throttled parallel slides (semaphore=4) ─────────────────────
    sem = asyncio.Semaphore(4)

    async def _throttled_slide(i: int) -> dict:
        outline = slide_outlines[i - 1] if i - 1 < len(slide_outlines) else ""
        async with sem:
            slide = await _safe_llm_slide(i, total, params, outline)
            new_current = max(presentation_jobs[job_id].get("current_slide", 0), i)
            await _db_update({"current_slide": new_current})
            return slide

    slides_data: list = list(await asyncio.gather(*[_throttled_slide(i) for i in range(1, total + 1)]))

    # ── Phase 2: Wikipedia image search (semaphore=6, Pollinations fallback) ──
    from services.media_search import search_images as _wiki_search_images

    img_sem = asyncio.Semaphore(6)

    async def _fetch_slide_image(slide: dict) -> None:
        content = slide.get("content") or {}
        if not isinstance(content, dict):
            return

        # Prefer visual_keyword from planner outline, fall back to visual_prompt
        outline_raw = slide_outlines[slide.get("number", 1) - 1] if slide_outlines else ""
        visual_keyword = ""
        try:
            outline_obj = json.loads(outline_raw) if outline_raw else {}
            visual_keyword = outline_obj.get("visual_keyword", "")
        except Exception:
            pass

        keyword = visual_keyword or content.get("visual_prompt") or slide.get("title", topic)
        query   = f"{keyword} {grade} {board} educational diagram"

        async with img_sem:
            try:
                results = await _wiki_search_images(keyword, grade, board, 3)
                if results:
                    content["image_url"]        = results[0]["url"]
                    content["image_source_url"] = results[0]["source"]
                    content["image_alt"]        = results[0]["title"]
                    return
            except Exception as exc:
                log.warning("[PPTX] Wikipedia image failed for slide %s: %s", slide.get("number"), exc)

        # Pollinations fallback
        desc = content.get("detailed_visual_description") or content.get("visual_prompt", "")
        if desc:
            job_seed  = abs(hash(job_id)) % 100000
            slide_num = slide.get("number", 1)
            content["image_url"] = _pollinations_url(desc, job_seed + slide_num)

    await asyncio.gather(*[_fetch_slide_image(s) for s in slides_data])

    # ── Build result ──────────────────────────────────────────────────────────
    chapter_str = f" ({chapter})" if chapter else ""
    result = {
        "title":            topic,
        "subject":          subject,
        "grade":            grade,
        "board":            board,
        "chapter":          chapter,
        "total_slides":     total,
        "duration_minutes": params.get("duration_minutes", 30),
        "purpose":          params.get("purpose", "teaching"),
        "tone":             params.get("tone", "Engaging"),
        "visual_style":     params.get("visual_style", "modern"),
        "learning_objectives": [
            f"By the end, students will demonstrate {lo.lower()} of {topic}.",
            f"Students will be able to apply {topic} concepts to real-world scenarios.",
            f"Students will connect {topic} to the broader {subject} curriculum.",
        ],
        "slides": slides_data,
        "teacher_preparation_notes": (
            f"Review {topic}{chapter_str} materials aligned to {board} curriculum. "
            f"Prepare {params.get('tone', 'Engaging').lower()} examples and activities. "
            f"Estimated delivery time: {params.get('duration_minutes', 30)} minutes."
        ),
    }

    # Keep full result (with image_url) in memory for the hot-path status endpoint.
    # Strip large/re-fetchable image fields only for the MongoDB write to stay
    # well under the 16 MB BSON document limit.
    # NOTE: We keep image_url in the DB write too — it's just a short string,
    # not a blob. Only the actual base64 image data is stripped.
    def _slim_slides(slides: list) -> list:
        slim = []
        for s in slides:
            s2 = {k: v for k, v in s.items() if k != "content"}
            content = s.get("content")
            if isinstance(content, dict):
                s2["content"] = {
                    k: v for k, v in content.items()
                    if k not in ("_fetched_image", "image_b64")
                }
            else:
                s2["content"] = content
            slim.append(s2)
        return slim

    # Update in-memory store with the FULL result (image_url intact for preview)
    presentation_jobs[job_id].update({"status": "completed", "result_data": result})
    # Write only the slimmed version to MongoDB
    result_for_db = {**result, "slides": _slim_slides(result["slides"])}
    try:
        await db.presentation_jobs.update_one(
            {"_id": job_id}, {"$set": {"status": "completed", "result_data": result_for_db}}
        )
    except Exception as exc:
        log.warning("[PPTX] MongoDB update failed for job %s: %s", job_id, exc)


@router.post("/ai-tool/presentation/generate")
async def presentation_generate(
    body: AIToolRequest,
    background_tasks: BackgroundTasks,
    user=Depends(require_role("teacher")),
    db=Depends(get_db),
):
    """
    Kick off a background pipeline to build the presentation slide-by-slide.
    Returns immediately with a job_id the client can poll.
    Job state is persisted to MongoDB (presentation_jobs collection).
    """
    extra = body.extra or {}
    params = {
        "topic":                body.topic,
        "subject":              body.subject,
        "grade":                body.grade or extra.get("classLevel", ""),
        "board":                extra.get("board", "CBSE"),
        "chapter":              extra.get("chapter", ""),
        "num_slides":           int(extra.get("num_slides", 10)),
        "duration_minutes":     int(extra.get("duration_minutes", 45)),
        "purpose":              extra.get("purpose", "teaching"),
        "visual_style":         extra.get("visual_style", "modern"),
        "learning_objective":   extra.get("learning_objective", "Concept Understanding"),
        "special_instructions": extra.get("special_instructions", ""),
        "target_audience":      extra.get("target_audience", "students"),
        "tone":                 extra.get("tone", "Engaging"),
        "content_depth":        extra.get("content_depth", "Concise"),
        "include_mini_quiz":    bool(extra.get("include_mini_quiz", False)),
    }

    job_id = str(uuid.uuid4())
    job_doc = {
        "_id":          job_id,
        "teacher_id":   user["id"],
        "status":       "processing",
        "current_slide": 0,
        "total_slides":  params["num_slides"],
        "result_data":   None,
        "error":         None,
        "created_at":    datetime.utcnow(),
    }

    # Persist to MongoDB (survives server restarts)
    try:
        await db.presentation_jobs.insert_one(job_doc)
        # Ensure TTL index exists (24h auto-cleanup)
        await db.presentation_jobs.create_index("created_at", expireAfterSeconds=86400)
    except Exception:
        pass  # Index may already exist

    # Also keep in-memory for fast hot-path polling
    presentation_jobs[job_id] = {k: v for k, v in job_doc.items() if k != "_id"}

    background_tasks.add_task(process_pptx_pipeline, job_id, params, db)
    return {"job_id": job_id, "status": "processing"}


@router.get("/ai-tool/status/{job_id}")
async def presentation_status(
    job_id: str,
    user=Depends(require_role("teacher")),
    db=Depends(get_db),
):
    """Poll the live progress of a background presentation task.
    Falls back to MongoDB if the in-memory dict is empty (e.g. after server restart).
    """
    job = presentation_jobs.get(job_id)

    # Fallback to MongoDB on cache miss (server restart scenario)
    if not job:
        try:
            job = await db.presentation_jobs.find_one({"_id": job_id})
            if job:
                job.pop("_id", None)
                presentation_jobs[job_id] = job  # re-warm cache
        except Exception:
            pass

    if not job:
        raise HTTPException(404, "Job not found")

    current = job["current_slide"]
    total   = job["total_slides"]
    pct     = round((current / total) * 100) if total else 0

    base = {
        "job_id":        job_id,
        "status":        job["status"],
        "current_slide": current,
        "total_slides":  total,
        "progress_pct":  pct,
    }

    if job["status"] == "completed":
        return {**base, **job["result_data"]}

    if job["status"] == "failed":
        return {**base, "error": job.get("error", "Unknown error")}

    return base


@router.post("/ai-tool/presentation/save-history")
async def save_presentation_history(
    body: dict,
    user=Depends(require_role("teacher")),
    db=Depends(get_db),
):
    """Save a generated presentation to history."""
    from datetime import datetime
    from bson import ObjectId
    
    history_doc = {
        "teacher_id": user["id"],
        "subject": body.get("subject", ""),
        "topic": body.get("topic", ""),
        "grade": body.get("grade", ""),
        "board": body.get("board", "CBSE"),
        "chapter": body.get("chapter", ""),
        "title": body.get("title", body.get("topic", "Untitled")),
        "total_slides": body.get("total_slides", 0),
        "duration_minutes": body.get("duration_minutes", 30),
        "purpose": body.get("purpose", "teaching"),
        "visual_style": body.get("visual_style", "modern"),
        "tone": body.get("tone", "Engaging"),
        "content_depth": body.get("content_depth", "Concise"),
        "target_audience": body.get("target_audience", "students"),
        "learning_objective": body.get("learning_objective", ""),
        "include_mini_quiz": body.get("include_mini_quiz", False),
        "special_instructions": body.get("special_instructions", ""),
        "slides": [
            {
                **{k: v for k, v in s.items() if k != "content"},
                "content": {
                    k: v for k, v in (s.get("content") or {}).items()
                    # Strip only the large base64 blobs; keep image_url so loaded
                    # presentations show the same images as the original preview.
                    if k not in ("_fetched_image", "image_b64")
                } if isinstance(s.get("content"), dict) else s.get("content"),
            }
            for s in body.get("slides", [])
        ],
        "learning_objectives": body.get("learning_objectives", []),
        "teacher_preparation_notes": body.get("teacher_preparation_notes", ""),
        "created_at": datetime.utcnow(),
        "updated_at": datetime.utcnow(),
    }
    
    result = await db["presentation_history"].insert_one(history_doc)
    return {"_id": str(result.inserted_id), "status": "saved"}


@router.get("/ai-tool/presentation/history")
async def get_presentation_history(
    user=Depends(require_role("teacher")),
    db=Depends(get_db),
):
    """Get all saved presentations for the teacher."""
    from bson import ObjectId
    
    docs = await db["presentation_history"].find(
        {"teacher_id": user["id"]}
    ).sort("created_at", -1).to_list(100)
    
    for doc in docs:
        doc["_id"] = str(doc["_id"])
    
    return {"presentations": docs}


@router.get("/ai-tool/presentation/{presentation_id}")
async def get_presentation_detail(
    presentation_id: str,
    user=Depends(require_role("teacher")),
    db=Depends(get_db),
):
    """Get a specific saved presentation."""
    from bson import ObjectId
    
    try:
        doc = await db["presentation_history"].find_one({
            "_id": ObjectId(presentation_id),
            "teacher_id": user["id"]
        })
        if not doc:
            raise HTTPException(404, "Presentation not found")
        doc["_id"] = str(doc["_id"])

        # Build the API base for proxy URLs
        api_base = "/api"  # relative — works regardless of deployment domain

        seed_base = abs(hash(presentation_id)) % 100000
        for idx, slide in enumerate(doc.get("slides", [])):
            content = slide.get("content")
            if not isinstance(content, dict):
                continue

            img_url = content.get("image_url", "")

            if not img_url:
                # Old save with no image_url — regenerate a Pollinations URL
                desc = content.get("detailed_visual_description") or content.get("visual_prompt", "")
                if desc:
                    content["image_url"] = _pollinations_url(desc, seed_base + idx + 1)
            elif "wikimedia.org" in img_url or "wikipedia.org" in img_url:
                # Route Wikimedia URLs through the proxy so the browser <img> tag
                # doesn't hit Wikimedia directly (which can 403 without proper headers).
                content["image_url"] = f"/teacher/image-proxy?url={urllib.parse.quote(img_url)}"

        return doc
    except Exception as e:
        raise HTTPException(400, f"Invalid presentation ID: {str(e)}")


@router.delete("/ai-tool/presentation/{presentation_id}")
async def delete_presentation(
    presentation_id: str,
    user=Depends(require_role("teacher")),
    db=Depends(get_db),
):
    """Delete a saved presentation."""
    from bson import ObjectId
    
    try:
        result = await db["presentation_history"].delete_one({
            "_id": ObjectId(presentation_id),
            "teacher_id": user["id"]
        })
        if result.deleted_count == 0:
            raise HTTPException(404, "Presentation not found")
        return {"status": "deleted"}
    except Exception as e:
        raise HTTPException(400, f"Invalid presentation ID: {str(e)}")


@router.get("/image-proxy")
async def image_proxy(url: str):
    """
    Proxy an external image URL to avoid browser CORS restrictions.
    Handles Wikipedia/Wikimedia (requires descriptive User-Agent),
    Pollinations.ai, and any other direct image URL.
    """
    from fastapi.responses import Response
    import urllib.parse

    decoded = urllib.parse.unquote(url)
    if not decoded.startswith(("https://", "http://")):
        raise HTTPException(400, "Invalid image URL")

    # Wikimedia requires a descriptive User-Agent or returns 403.
    # Use a browser-like UA so all sources accept the request.
    headers = {
        "User-Agent": (
            "Mozilla/5.0 (compatible; EduAI/1.0; "
            "+https://github.com/eduai; educational platform)"
        ),
        "Accept": "image/webp,image/apng,image/*,*/*;q=0.8",
        "Accept-Encoding": "gzip, deflate, br",
        "Referer": "https://en.wikipedia.org/",
    }

    last_exc = None
    for attempt in range(3):
        try:
            async with httpx.AsyncClient(
                timeout=60,
                follow_redirects=True,
                headers=headers,
            ) as client:
                resp = await client.get(decoded)
                if resp.status_code in (429, 503) and attempt < 2:
                    # Rate-limited — back off and retry
                    await asyncio.sleep(2 ** attempt)
                    continue
                resp.raise_for_status()
                content_type = resp.headers.get("content-type", "image/jpeg")
                # Strip any non-image content type (e.g. HTML error pages)
                if "image" not in content_type and "octet-stream" not in content_type:
                    raise HTTPException(502, f"Unexpected content-type: {content_type}")
                return Response(
                    content=resp.content,
                    media_type=content_type,
                    headers={
                        "Cache-Control": "public, max-age=86400",
                        "Access-Control-Allow-Origin": "*",
                    },
                )
        except HTTPException:
            raise
        except httpx.TimeoutException as exc:
            last_exc = exc
            if attempt < 2:
                await asyncio.sleep(1)
        except Exception as exc:
            last_exc = exc
            if attempt < 2:
                await asyncio.sleep(1)

    raise HTTPException(502, f"Image fetch failed after 3 attempts: {last_exc}")


@router.post("/ai-generate-questions")
async def ai_generate_questions(body: AIGenerateQuestionsRequest, user=Depends(require_role("teacher"))):
    """Generate homework questions with AI — returns structured Question objects."""
    type_instructions = {
        "mcq":    "Multiple choice with exactly 4 options. Mark exactly one correct option with is_correct: true. Make distractors plausible but clearly wrong.",
        "typed":  "Open-ended question requiring a written answer. Include a concise sample_answer (2-3 sentences).",
        "upload": "Diagram, graph, or drawing question requiring a visual/uploaded answer.",
    }
    types_desc = "; ".join(type_instructions[t] for t in body.question_types if t in type_instructions)

    system_prompt = """You are an expert curriculum-aligned homework question generator for K-12 students.
Your questions must:
1. Be clear, unambiguous, and age-appropriate
2. Align with the specified board curriculum (CBSE/ICSE/State Board)
3. Match the requested difficulty distribution precisely — generate the right proportion of easy/medium/hard questions
4. For MCQ: provide exactly 4 options with one clearly correct answer and plausible distractors
5. For typed: include a concise sample answer (2-3 sentences max) and a marking rubric hint
6. Include helpful hints that guide without giving away the answer
7. Include vin_nudge — a short encouraging prompt for the AI assistant (e.g. "Think about what happens when...")
8. Align questions to the specified learning objective (recall, application, analysis, etc.)
9. Follow any special instructions provided by the teacher exactly
10. Return ONLY valid JSON, no markdown, no explanation outside the JSON"""

    # Resolve difficulty description from either string or distribution dict
    extra = body.extra or {}
    difficulty_val = extra.get("difficulty", body.difficulty)
    if isinstance(difficulty_val, dict):
        easy_pct   = difficulty_val.get('easy', 30)
        medium_pct = difficulty_val.get('medium', 50)
        hard_pct   = difficulty_val.get('hard', 20)
        difficulty_desc = (
            f"Easy={easy_pct}% (~{round(body.count * easy_pct / 100)} questions), "
            f"Medium={medium_pct}% (~{round(body.count * medium_pct / 100)} questions), "
            f"Hard={hard_pct}% (~{round(body.count * hard_pct / 100)} questions)"
        )
    else:
        difficulty_desc = str(difficulty_val or "mixed")

    board_val              = extra.get('board', body.board) or 'CBSE'
    chapter_val            = extra.get('chapter', body.chapter)
    learning_objective_val = extra.get('learning_objective', body.learning_objective)
    special_instructions_val = extra.get('special_instructions', body.special_instructions)

    prompt = f"""Generate {body.count} homework questions for:
Subject: {body.subject}
Topic: {body.topic}
Grade: {body.grade}
Board: {board_val}
Difficulty Distribution: {difficulty_desc}
{f"Chapter: {chapter_val}" if chapter_val else ""}
{f"Learning Objective: {learning_objective_val} — focus questions on this cognitive level" if learning_objective_val else ""}
{f"Special Instructions (MUST follow): {special_instructions_val}" if special_instructions_val else ""}
Question types to include: {types_desc}

Return ONLY this JSON structure (no markdown, no extra text):
{{
  "questions": [
    {{
      "id": "q1",
      "question_number": 1,
      "total_questions": {body.count},
      "question_text": "Full question text here",
      "answer_type": "mcq",
      "options": [
        {{"id": "o1", "text": "Option A text", "is_correct": false}},
        {{"id": "o2", "text": "Option B text", "is_correct": true}},
        {{"id": "o3", "text": "Option C text", "is_correct": false}},
        {{"id": "o4", "text": "Option D text", "is_correct": false}}
      ],
      "hint": "A helpful hint that guides without giving the answer",
      "vin_nudge": "An encouraging prompt like 'Think about what happens when...'",
      "max_points": 1,
      "sample_answer": null
    }}
  ]
}}"""

    raw = await chat_completion([
        {"role": "system", "content": system_prompt},
        {"role": "user", "content": prompt},
    ])
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
        # Find homework - don't restrict by created_by so any teacher can evaluate
        hw = await db.homework.find_one({"_id": ObjectId(homework_id)})
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

@router.get("/parent/{parent_id}")
async def get_parent_info(parent_id: str, user=Depends(require_role("teacher")), db=Depends(get_db)):
    """Get parent info with their children for the communication page."""
    try:
        parent = await db.users.find_one({"_id": ObjectId(parent_id), "role": "parent"})
    except Exception:
        raise HTTPException(400, "Invalid parent ID")
    if not parent:
        raise HTTPException(404, "Parent not found")
    
    # Get children
    children_ids = parent.get("children", [])
    children = []
    for child_id in children_ids:
        try:
            child = await db.users.find_one({"_id": ObjectId(child_id)})
            if child:
                children.append({
                    "id": str(child["_id"]),
                    "name": child.get("name"),
                    "class": child.get("class_name", child.get("class")),
                    "roll_no": child.get("roll_no"),
                })
        except Exception:
            pass
    
    return {
        "parent": {
            "id": str(parent["_id"]),
            "name": parent.get("name"),
            "email": parent.get("email"),
            "phone": parent.get("phone"),
        },
        "children": children
    }

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

# ─────────────────────────────────────────────────────────────
# AI TOOL HISTORY
# ─────────────────────────────────────────────────────────────

class AIHistoryItem(BaseModel):
    id: str
    tool: str
    title: str
    subject: Optional[str] = None
    topic: Optional[str] = None
    grade: Optional[str] = None
    result: Optional[dict] = None
    createdAt: str

@router.post("/ai-history")
async def save_ai_history(item: AIHistoryItem, user=Depends(require_role("teacher")), db=Depends(get_db)):
    doc = {
        "teacher_id": user["id"],
        "item_id":    item.id,
        "tool":       item.tool,
        "title":      item.title,
        "subject":    item.subject,
        "topic":      item.topic,
        "grade":      item.grade,
        "result":     item.result,
        "created_at": item.createdAt,
    }
    await db.ai_tool_history.update_one(
        {"teacher_id": user["id"], "item_id": item.id},
        {"$set": doc},
        upsert=True,
    )
    return {"ok": True}

@router.get("/ai-history")
async def get_ai_history(user=Depends(require_role("teacher")), db=Depends(get_db)):
    docs = await db.ai_tool_history.find(
        {"teacher_id": user["id"]},
        {"_id": 0, "teacher_id": 0}
    ).sort("created_at", -1).limit(100).to_list(None)
    return [
        {
            "id":        d.get("item_id"),
            "tool":      d.get("tool"),
            "title":     d.get("title"),
            "subject":   d.get("subject"),
            "topic":     d.get("topic"),
            "grade":     d.get("grade"),
            "result":    d.get("result"),
            "createdAt": d.get("created_at"),
        }
        for d in docs
    ]

# ─────────────────────────────────────────────────────────────
# INTERVENTION MANAGEMENT
# ─────────────────────────────────────────────────────────────

class InterventionNoteRequest(BaseModel):
    note: str

class InterventionCreateRequest(BaseModel):
    student_id: str
    student_name: str
    student_class: Optional[str] = ""
    priority: str = "important"   # urgent | important | monitor
    issues: List[str] = []
    message: Optional[str] = ""
    tags: List[str] = []

@router.post("/interventions")
async def create_intervention(body: InterventionCreateRequest, user=Depends(require_role("teacher")), db=Depends(get_db)):
    """Manually add a student to the intervention group from any page (e.g. Topic Mastery)."""
    # Avoid duplicates — update if already exists for this teacher+student
    existing = await db.interventions.find_one({
        "teacher_id": user["id"],
        "student_id": body.student_id,
        "resolved": False,
    })
    if existing:
        # Merge new issues into existing record
        merged_issues = list(set(existing.get("issues", []) + body.issues))
        merged_tags   = list(set(existing.get("tags", []) + body.tags))
        await db.interventions.update_one(
            {"_id": existing["_id"]},
            {"$set": {
                "issues":     merged_issues,
                "tags":       merged_tags,
                "priority":   body.priority if body.priority == "urgent" else existing.get("priority", body.priority),
                "updated_at": datetime.utcnow().isoformat(),
            }}
        )
        return {"id": str(existing["_id"]), "updated": True}

    doc = {
        "teacher_id":    user["id"],
        "student_id":    body.student_id,
        "student_name":  body.student_name,
        "student_class": body.student_class,
        "priority":      body.priority,
        "issues":        body.issues,
        "message":       body.message or (body.issues[0] if body.issues else "Added to intervention group"),
        "tags":          body.tags,
        "status":        "New",
        "resolved":      False,
        "performance_drop": 0,
        "score_history": [],
        "created_at":    datetime.utcnow().isoformat(),
    }
    result = await db.interventions.insert_one(doc)
    return {"id": str(result.inserted_id), "updated": False}

@router.patch("/interventions/{intervention_id}/snooze")
async def snooze_intervention(intervention_id: str, user=Depends(require_role("teacher")), db=Depends(get_db)):
    try:
        await db.interventions.update_one(
            {"_id": ObjectId(intervention_id), "teacher_id": user["id"]},
            {"$set": {"snoozed": True, "snoozed_at": datetime.utcnow().isoformat()}}
        )
    except Exception:
        pass
    return {"ok": True}

@router.patch("/interventions/{intervention_id}/review")
async def review_intervention(intervention_id: str, user=Depends(require_role("teacher")), db=Depends(get_db)):
    try:
        await db.interventions.update_one(
            {"_id": ObjectId(intervention_id), "teacher_id": user["id"]},
            {"$set": {"status": "reviewed", "reviewed_at": datetime.utcnow().isoformat()}}
        )
    except Exception:
        pass
    return {"ok": True}

@router.patch("/interventions/{intervention_id}/notes")
async def save_intervention_note(intervention_id: str, body: InterventionNoteRequest, user=Depends(require_role("teacher")), db=Depends(get_db)):
    try:
        await db.interventions.update_one(
            {"_id": ObjectId(intervention_id), "teacher_id": user["id"]},
            {"$set": {"private_note": body.note, "note_updated_at": datetime.utcnow().isoformat()}}
        )
    except Exception:
        pass
    return {"ok": True}

@router.patch("/interventions/{intervention_id}/status")
async def update_intervention_status(intervention_id: str, status: str, user=Depends(require_role("teacher")), db=Depends(get_db)):
    try:
        await db.interventions.update_one(
            {"_id": ObjectId(intervention_id), "teacher_id": user["id"]},
            {"$set": {"status": status, "updated_at": datetime.utcnow().isoformat()}}
        )
    except Exception:
        pass
    return {"ok": True}

# ─────────────────────────────────────────────────────────────
# QUICK ACTIONS — Bulk messaging
# ─────────────────────────────────────────────────────────────

class BulkReminderRequest(BaseModel):
    student_ids: List[str]
    message: str
    notify_parent: bool = True
    action_type: str = "reminder"  # reminder | appreciation | practice | meeting

@router.post("/quick-actions/send-bulk")
async def send_bulk_action(body: BulkReminderRequest, user=Depends(require_role("teacher")), db=Depends(get_db)):
    """Send bulk reminders/messages to multiple students and optionally their parents."""
    sent = []
    for student_id in body.student_ids:
        doc = {
            "teacher_id":   user["id"],
            "student_id":   student_id,
            "message":      body.message,
            "action_type":  body.action_type,
            "direction":    "teacher_to_student",
            "sent_at":      datetime.utcnow().isoformat(),
            "notify_parent": body.notify_parent,
        }
        result = await db.messages.insert_one(doc)
        sent.append(str(result.inserted_id))
        # If notify_parent, also create a parent notification
        if body.notify_parent:
            student = await db.users.find_one({"_id": ObjectId(student_id)}, {"parent_id": 1, "name": 1})
            if student and student.get("parent_id"):
                notif = {
                    "user_id":    student["parent_id"],
                    "type":       "teacher_message",
                    "title":      f"Message from Teacher",
                    "desc":       body.message[:120],
                    "read":       False,
                    "created_at": datetime.utcnow().isoformat(),
                }
                await db.notifications.insert_one(notif)
    return {"sent": len(sent), "ids": sent}

# ─────────────────────────────────────────────────────────────
# STUDENT EXAM PREP (teacher-side: create exams)
# ─────────────────────────────────────────────────────────────

@router.get("/exams")
async def get_teacher_exams(user=Depends(require_role("teacher")), db=Depends(get_db)):
    docs = await db.exams.find({"created_by": user["id"]}).sort("exam_date", 1).to_list(None)
    return [_ser(d) for d in docs]

# ─────────────────────────────────────────────────────────────
# MEETING REQUESTS
# ─────────────────────────────────────────────────────────────

class MeetingRequestBody(BaseModel):
    student_id: str
    reason: str
    proposed_times: List[dict]  # [{date, time}]
    urgency: str = "normal"     # normal | urgent

@router.post("/meeting-requests")
async def create_meeting_request(body: MeetingRequestBody, user=Depends(require_role("teacher")), db=Depends(get_db)):
    """Teacher requests a meeting with a student's parent."""
    student = await db.users.find_one({"_id": ObjectId(body.student_id)}, {"name": 1, "parent_id": 1})
    if not student:
        raise HTTPException(404, "Student not found")
    doc = {
        "teacher_id":     user["id"],
        "student_id":     body.student_id,
        "student_name":   student.get("name", "Student"),
        "parent_id":      student.get("parent_id"),
        "reason":         body.reason,
        "proposed_times": body.proposed_times,
        "urgency":        body.urgency,
        "status":         "pending_response",
        "created_at":     datetime.utcnow().isoformat(),
    }
    result = await db.meeting_requests.insert_one(doc)
    # Notify parent
    if student.get("parent_id"):
        await db.notifications.insert_one({
            "user_id":    student["parent_id"],
            "type":       "meeting_request",
            "title":      "Meeting Request from Teacher",
            "desc":       f"Your child's teacher has requested a meeting regarding: {body.reason}",
            "read":       False,
            "created_at": datetime.utcnow().isoformat(),
            "ref_id":     str(result.inserted_id),
        })
    return {"id": str(result.inserted_id), "status": "pending_response"}

@router.get("/meeting-requests")
async def get_meeting_requests(user=Depends(require_role("teacher")), db=Depends(get_db)):
    """Get all meeting requests created by this teacher."""
    docs = await db.meeting_requests.find({"teacher_id": user["id"]}).sort("created_at", -1).to_list(None)
    return [_ser(d) for d in docs]

@router.patch("/meeting-requests/{req_id}/confirm")
async def confirm_meeting(req_id: str, time_index: int = 0, user=Depends(require_role("teacher")), db=Depends(get_db)):
    """Confirm a meeting at the selected proposed time."""
    req = await db.meeting_requests.find_one({"_id": ObjectId(req_id), "teacher_id": user["id"]})
    if not req:
        raise HTTPException(404, "Meeting request not found")
    times = req.get("proposed_times", [])
    confirmed_time = times[time_index] if time_index < len(times) else (times[0] if times else {})
    await db.meeting_requests.update_one(
        {"_id": ObjectId(req_id)},
        {"$set": {"status": "confirmed", "confirmed_time": confirmed_time, "confirmed_at": datetime.utcnow().isoformat()}}
    )
    # Notify parent
    if req.get("parent_id"):
        await db.notifications.insert_one({
            "user_id":    req["parent_id"],
            "type":       "meeting_confirmed",
            "title":      "Meeting Confirmed",
            "desc":       f"Your meeting has been confirmed for {confirmed_time.get('date', '')} at {confirmed_time.get('time', '')}",
            "read":       False,
            "created_at": datetime.utcnow().isoformat(),
        })
    return {"status": "confirmed", "confirmed_time": confirmed_time}


# ─────────────────────────────────────────────────────────────
# STUDENT GROUPS — single source of truth per teacher
# ─────────────────────────────────────────────────────────────

@router.get("/groups")
async def get_groups(user=Depends(require_role("teacher")), db=Depends(get_db)):
    """Return all student groups created by this teacher."""
    docs = await db.teacher_groups.find({"teacher_id": user["id"]}).sort("created_at", -1).to_list(None)
    return [_ser(d) for d in docs]

@router.post("/groups")
async def create_group(body: GroupCreate, user=Depends(require_role("teacher")), db=Depends(get_db)):
    """Create a single new group."""
    doc = {
        "teacher_id":  user["id"],
        "label":       body.label,
        "difficulty":  body.difficulty,
        "student_ids": body.student_ids,
        "performance": body.performance or "",
        "reasoning":   body.reasoning or "",
        "subject":     body.subject or "",
        "chapter":     body.chapter or "",
        "created_at":  datetime.utcnow().isoformat(),
        "updated_at":  datetime.utcnow().isoformat(),
    }
    result = await db.teacher_groups.insert_one(doc)
    doc["_id"] = str(result.inserted_id)
    return doc

@router.put("/groups/bulk")
async def bulk_save_groups(body: GroupsBulkSave, user=Depends(require_role("teacher")), db=Depends(get_db)):
    """Replace all groups for this teacher with the provided list (used after AI grouping).
    Returns the saved groups with their new _ids."""
    # Delete existing groups for this teacher
    await db.teacher_groups.delete_many({"teacher_id": user["id"]})
    if not body.groups:
        return []
    docs = []
    for g in body.groups:
        doc = {
            "teacher_id":  user["id"],
            "label":       g.label,
            "difficulty":  g.difficulty,
            "student_ids": g.student_ids,
            "performance": g.performance or "",
            "reasoning":   g.reasoning or "",
            "subject":     g.subject or body.subject or "",
            "chapter":     g.chapter or body.chapter or "",
            "created_at":  datetime.utcnow().isoformat(),
            "updated_at":  datetime.utcnow().isoformat(),
        }
        docs.append(doc)
    result = await db.teacher_groups.insert_many(docs)
    saved = await db.teacher_groups.find({"_id": {"$in": result.inserted_ids}}).to_list(None)
    return [_ser(d) for d in saved]

@router.patch("/groups/{group_id}")
async def update_group(group_id: str, body: GroupUpdate, user=Depends(require_role("teacher")), db=Depends(get_db)):
    """Update a single group (rename, change difficulty, update members)."""
    try:
        existing = await db.teacher_groups.find_one({"_id": ObjectId(group_id), "teacher_id": user["id"]})
    except Exception:
        raise HTTPException(400, "Invalid group ID")
    if not existing:
        raise HTTPException(404, "Group not found")
    update = {"updated_at": datetime.utcnow().isoformat()}
    if body.label          is not None: update["label"]          = body.label
    if body.difficulty     is not None: update["difficulty"]     = body.difficulty
    if body.student_ids    is not None: update["student_ids"]    = body.student_ids
    if body.performance    is not None: update["performance"]    = body.performance
    if body.reasoning      is not None: update["reasoning"]      = body.reasoning
    if body.subject        is not None: update["subject"]        = body.subject
    if body.chapter        is not None: update["chapter"]        = body.chapter
    if body.homework_id    is not None: update["homework_id"]    = body.homework_id
    if body.homework_title is not None: update["homework_title"] = body.homework_title
    if body.due_date       is not None: update["due_date"]       = body.due_date
    if body.ai_questions   is not None: update["ai_questions"]   = body.ai_questions
    if body.ai_mode        is not None: update["ai_mode"]        = body.ai_mode
    if body.assigned       is not None: update["assigned"]       = body.assigned
    await db.teacher_groups.update_one({"_id": ObjectId(group_id)}, {"$set": update})
    updated = await db.teacher_groups.find_one({"_id": ObjectId(group_id)})
    return _ser(updated)

@router.delete("/groups/{group_id}")
async def delete_group(group_id: str, user=Depends(require_role("teacher")), db=Depends(get_db)):
    """Delete a single group."""
    try:
        result = await db.teacher_groups.delete_one({"_id": ObjectId(group_id), "teacher_id": user["id"]})
    except Exception:
        raise HTTPException(400, "Invalid group ID")
    if result.deleted_count == 0:
        raise HTTPException(404, "Group not found")
    return {"deleted": group_id}


# ─────────────────────────────────────────────────────────────
# QUIZ DRAFTS — save generated questions as reusable drafts
# ─────────────────────────────────────────────────────────────

class QuizDraftSave(BaseModel):
    title: str
    subject: str
    topic: str
    grade: Optional[str] = None
    board: Optional[str] = "CBSE"
    chapter: Optional[str] = None
    questions: List[dict]
    meta: Optional[dict] = None  # stores form config (difficulty, types, etc.)

@router.post("/quiz-drafts")
async def save_quiz_draft(body: QuizDraftSave, user=Depends(require_role("teacher")), db=Depends(get_db)):
    """Save AI-generated questions as a reusable quiz draft."""
    doc = {
        "teacher_id": user["id"],
        "title":      body.title,
        "subject":    body.subject,
        "topic":      body.topic,
        "grade":      body.grade,
        "board":      body.board,
        "chapter":    body.chapter,
        "questions":  body.questions,
        "meta":       body.meta or {},
        "status":     "draft",
        "created_at": datetime.utcnow().isoformat(),
        "updated_at": datetime.utcnow().isoformat(),
    }
    result = await db.quiz_drafts.insert_one(doc)
    doc["_id"] = str(result.inserted_id)
    return doc

@router.get("/quiz-drafts")
async def list_quiz_drafts(user=Depends(require_role("teacher")), db=Depends(get_db)):
    """List all quiz drafts for this teacher."""
    docs = await db.quiz_drafts.find({"teacher_id": user["id"]}).sort("created_at", -1).to_list(None)
    return [_ser(d) for d in docs]

@router.patch("/quiz-drafts/{draft_id}")
async def update_quiz_draft(draft_id: str, body: QuizDraftSave, user=Depends(require_role("teacher")), db=Depends(get_db)):
    """Update an existing quiz draft."""
    try:
        existing = await db.quiz_drafts.find_one({"_id": ObjectId(draft_id), "teacher_id": user["id"]})
    except Exception:
        raise HTTPException(400, "Invalid draft ID")
    if not existing:
        raise HTTPException(404, "Draft not found")
    update = {
        "title":      body.title,
        "subject":    body.subject,
        "topic":      body.topic,
        "grade":      body.grade,
        "board":      body.board,
        "chapter":    body.chapter,
        "questions":  body.questions,
        "meta":       body.meta or {},
        "updated_at": datetime.utcnow().isoformat(),
    }
    await db.quiz_drafts.update_one({"_id": ObjectId(draft_id)}, {"$set": update})
    updated = await db.quiz_drafts.find_one({"_id": ObjectId(draft_id)})
    return _ser(updated)

@router.delete("/quiz-drafts/{draft_id}")
async def delete_quiz_draft(draft_id: str, user=Depends(require_role("teacher")), db=Depends(get_db)):
    """Delete a quiz draft."""
    try:
        result = await db.quiz_drafts.delete_one({"_id": ObjectId(draft_id), "teacher_id": user["id"]})
    except Exception:
        raise HTTPException(400, "Invalid draft ID")
    if result.deleted_count == 0:
        raise HTTPException(404, "Draft not found")
    return {"deleted": True}


# WORKSHEET DRAFTS — save generated worksheets as reusable drafts
# ───────────────────────────────────────────────────────────────

class WorksheetDraftSave(BaseModel):
    title: str
    subject: Optional[str] = None
    topic: Optional[str] = None
    grade: Optional[str] = None
    board: Optional[str] = "CBSE"
    chapter: Optional[str] = None
    worksheet: dict          # full AI result object
    meta: Optional[dict] = None  # stores form config

@router.post("/worksheet-drafts")
async def save_worksheet_draft(body: WorksheetDraftSave, user=Depends(require_role("teacher")), db=Depends(get_db)):
    """Save an AI-generated worksheet as a reusable draft."""
    doc = {
        "teacher_id": user["id"],
        "title":      body.title,
        "subject":    body.subject,
        "topic":      body.topic,
        "grade":      body.grade,
        "board":      body.board,
        "chapter":    body.chapter,
        "worksheet":  body.worksheet,
        "meta":       body.meta or {},
        "status":     "draft",
        "created_at": datetime.utcnow().isoformat(),
        "updated_at": datetime.utcnow().isoformat(),
    }
    result = await db.worksheet_drafts.insert_one(doc)
    doc["_id"] = str(result.inserted_id)
    return doc

@router.get("/worksheet-drafts")
async def list_worksheet_drafts(user=Depends(require_role("teacher")), db=Depends(get_db)):
    """List all worksheet drafts for this teacher."""
    docs = await db.worksheet_drafts.find({"teacher_id": user["id"]}).sort("created_at", -1).to_list(None)
    return [_ser(d) for d in docs]

@router.patch("/worksheet-drafts/{draft_id}")
async def update_worksheet_draft(draft_id: str, body: WorksheetDraftSave, user=Depends(require_role("teacher")), db=Depends(get_db)):
    """Update an existing worksheet draft."""
    try:
        existing = await db.worksheet_drafts.find_one({"_id": ObjectId(draft_id), "teacher_id": user["id"]})
    except Exception:
        raise HTTPException(400, "Invalid draft ID")
    if not existing:
        raise HTTPException(404, "Draft not found")
    update = {
        "title":      body.title,
        "subject":    body.subject,
        "topic":      body.topic,
        "grade":      body.grade,
        "board":      body.board,
        "chapter":    body.chapter,
        "worksheet":  body.worksheet,
        "meta":       body.meta or {},
        "updated_at": datetime.utcnow().isoformat(),
    }
    await db.worksheet_drafts.update_one({"_id": ObjectId(draft_id)}, {"$set": update})
    updated = await db.worksheet_drafts.find_one({"_id": ObjectId(draft_id)})
    return _ser(updated)

@router.delete("/worksheet-drafts/{draft_id}")
async def delete_worksheet_draft(draft_id: str, user=Depends(require_role("teacher")), db=Depends(get_db)):
    """Delete a worksheet draft."""
    try:
        result = await db.worksheet_drafts.delete_one({"_id": ObjectId(draft_id), "teacher_id": user["id"]})
    except Exception:
        raise HTTPException(400, "Invalid draft ID")
    if result.deleted_count == 0:
        raise HTTPException(404, "Draft not found")
    return {"deleted": True}
