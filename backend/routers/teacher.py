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
    difficulty: str = "medium"
    question_types: List[str] = ["mcq"]

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
- Difficulty: {extra.get('difficulty', 'Medium')}
- Total Questions: {extra.get('totalQuestions', 10)}
- Question Types: {', '.join(extra.get('question_types', ['mcq', 'shortAnswer']))}
- Title: {extra.get('title', f'{body.topic} Worksheet')}

Generate a COMPLETE worksheet with detailed answer key, marking scheme, and teacher notes. Questions must be curriculum-appropriate and progressively challenging.

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
- Grade/Class: {body.grade or extra.get('classLevel','')}
- Duration: {extra.get('durationMinutes', 45)} minutes
- Curriculum Standards: {extra.get('standards', 'Not specified')}

TEACHER-SELECTED LEARNING OBJECTIVES:
{chr(10).join(f'- {o}' for o in extra.get('objectives', [])) or '- To be determined by AI based on topic'}

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

Generate a COMPREHENSIVE, DETAILED lesson plan. Each section must have specific, actionable teacher instructions and student activities — not vague descriptions. Include exact questions to ask, specific examples to use, and precise activities.

Return ONLY valid JSON (no markdown, no extra text):
{{
  "title": "Lesson Plan: {body.topic}",
  "subject": "{body.subject}",
  "grade": "{body.grade or extra.get('classLevel','')}",
  "duration_minutes": {extra.get('durationMinutes', 45)},
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
    }},
    {{
      "phase": "Introduction / Hook",
      "duration_minutes": 5,
      "purpose": "Engage students and introduce the lesson topic",
      "teacher_actions": "...",
      "student_actions": "...",
      "key_questions": ["..."],
      "notes": "..."
    }},
    {{
      "phase": "Direct Instruction / Explanation",
      "duration_minutes": 15,
      "purpose": "Teach the core concept with clear explanations and examples",
      "teacher_actions": "Step-by-step explanation including specific examples to write on board, models to demonstrate",
      "student_actions": "Note-taking, responding to questions, following along",
      "key_questions": ["Comprehension check questions"],
      "notes": "Common errors students make and how to address them"
    }},
    {{
      "phase": "Guided Practice",
      "duration_minutes": 10,
      "purpose": "Practice together with teacher support",
      "teacher_actions": "Walk through problems/examples together, circulate and monitor",
      "student_actions": "Attempt problems with teacher guidance, ask questions",
      "key_questions": ["Questions to check understanding during practice"],
      "notes": "Scaffolding strategies to use"
    }},
    {{
      "phase": "Independent Practice / Application",
      "duration_minutes": 8,
      "purpose": "Students apply learning independently",
      "teacher_actions": "Circulate, provide targeted support, note common errors",
      "student_actions": "Complete practice tasks independently or in pairs",
      "key_questions": ["Questions to prompt thinking if students are stuck"],
      "notes": "Differentiation: what to give struggling vs advanced students"
    }},
    {{
      "phase": "Closure / Summary",
      "duration_minutes": 5,
      "purpose": "Consolidate learning and preview next steps",
      "teacher_actions": "Facilitate class discussion to summarize key points, preview next lesson",
      "student_actions": "Share responses, reflect on learning",
      "key_questions": ["What did we learn today?", "How does this connect to...?"],
      "notes": "..."
    }},
    {{
      "phase": "Assessment / Exit Ticket",
      "duration_minutes": 5,
      "purpose": "Check for understanding before students leave",
      "teacher_actions": "Distribute exit ticket, collect and review responses",
      "student_actions": "Complete exit ticket independently",
      "key_questions": ["Exit ticket question(s)"],
      "notes": "How to use exit ticket data to inform next lesson"
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
- Number of Questions: {extra.get('count', 10)}
- Difficulty: {extra.get('difficulty', 'Mixed')}
- Question Types: {', '.join(extra.get('question_types', ['mcq', 'short_answer']))}

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
- Target Audience: {body.grade or extra.get('targetAudience', 'Grade 8')}
- Explanation Style: {extra.get('style', 'Analogy-heavy')}
- Simplify for Struggling Learners: {extra.get('simplify', False)}
- Include Elements: {', '.join(extra.get('include', ['analogies', 'examples', 'misconceptions', 'teaching_tips']))}

Return ONLY valid JSON (no markdown):
{{
  "concept": "{body.topic}",
  "subject": "{body.subject}",
  "grade": "{body.grade or extra.get('targetAudience', '')}",
  "one_line_summary": "A single sentence capturing the essence of this concept",
  "plain_english_explanation": "Clear, jargon-free explanation (3-4 paragraphs)",
  "technical_explanation": "Precise technical definition with correct terminology",
  "primary_analogy": {{
    "analogy": "The main analogy to use",
    "explanation": "How the analogy maps to the concept step by step",
    "limitations": "Where the analogy breaks down"
  }},
  "additional_analogies": [
    {{"analogy": "...", "best_for": "Visual learners / struggling students"}}
  ],
  "real_world_examples": [
    {{"example": "...", "connection": "How this connects to the concept", "context": "Where students encounter this"}}
  ],
  "diagram_description": "Detailed description of a diagram to draw on the board",
  "step_by_step_process": [
    {{"step": 1, "action": "...", "explanation": "..."}}
  ],
  "key_vocabulary": [
    {{"term": "...", "definition": "...", "example_in_sentence": "..."}}
  ],
  "common_misconceptions": [
    {{"misconception": "What students wrongly believe", "correction": "The accurate understanding", "how_to_address": "Teaching strategy"}}
  ],
  "prerequisite_concepts": ["What students must understand first"],
  "discussion_questions": ["Questions to spark class discussion"],
  "quick_check_questions": [
    {{"question": "...", "expected_answer": "...", "purpose": "What this checks"}}
  ],
  "teaching_tips": ["Specific classroom strategies"],
  "simplified_version": "Simpler explanation for struggling learners",
  "extension_for_advanced": "Deeper exploration for advanced students"
}}""",

        "presentation": f"""You are an expert instructional designer. Create a comprehensive, classroom-ready presentation outline.

PRESENTATION DETAILS:
- Topic: {body.topic}
- Subject: {body.subject}
- Grade/Class: {body.grade or extra.get('classLevel', '')}
- Number of Slides: {extra.get('num_slides', 12)}
- Duration: {extra.get('duration_minutes', 45)} minutes
- Purpose: {extra.get('purpose', 'Teaching New Concept')}
- Visual Style: {extra.get('visual_style', 'Modern/Clean')}

Return ONLY valid JSON (no markdown):
{{
  "title": "{body.topic}",
  "subject": "{body.subject}",
  "grade": "{body.grade or extra.get('classLevel', '')}",
  "total_slides": {extra.get('num_slides', 12)},
  "duration_minutes": {extra.get('duration_minutes', 45)},
  "learning_objectives": ["By the end, students will be able to..."],
  "slides": [
    {{
      "number": 1,
      "type": "title",
      "title": "Presentation title",
      "subtitle": "Subject | Grade",
      "speaker_notes": "Welcome students, introduce the topic",
      "duration_minutes": 2,
      "engagement_prompt": null
    }},
    {{
      "number": 2,
      "type": "objectives",
      "title": "What We Will Learn Today",
      "bullets": ["Objective 1", "Objective 2"],
      "speaker_notes": "Walk through each objective. Ask what students already know.",
      "duration_minutes": 2,
      "engagement_prompt": "What do you already know about this topic?"
    }},
    {{
      "number": 3,
      "type": "hook",
      "title": "Did You Know?",
      "content": "Surprising fact or real-world scenario",
      "speaker_notes": "Use this to spark curiosity.",
      "duration_minutes": 3,
      "engagement_prompt": "Where have you seen this in real life?"
    }},
    {{
      "number": 4,
      "type": "content",
      "title": "Core Concept",
      "bullets": ["Key point 1", "Key point 2", "Key point 3"],
      "explanation": "Detailed explanation for teacher reference",
      "speaker_notes": "Explain each bullet with an example.",
      "duration_minutes": 5,
      "engagement_prompt": "Can anyone give me an example?"
    }},
    {{
      "number": 5,
      "type": "example",
      "title": "Worked Example",
      "content": "Step-by-step worked example",
      "steps": ["Step 1: ...", "Step 2: ...", "Step 3: ..."],
      "speaker_notes": "Work through slowly. Ask students to predict each step.",
      "duration_minutes": 5,
      "engagement_prompt": "What should we do next?"
    }},
    {{
      "number": 6,
      "type": "activity",
      "title": "Try It Yourself",
      "content": "Practice problem description",
      "instructions": "Step-by-step activity instructions",
      "speaker_notes": "Give students 3-4 minutes. Circulate.",
      "duration_minutes": 5,
      "engagement_prompt": "Work with your partner."
    }},
    {{
      "number": 7,
      "type": "summary",
      "title": "Key Takeaways",
      "bullets": ["Main point 1", "Main point 2", "Main point 3"],
      "speaker_notes": "Ask students to recall before showing.",
      "duration_minutes": 3,
      "engagement_prompt": "What were the 3 main things we learned?"
    }},
    {{
      "number": 8,
      "type": "assessment",
      "title": "Check Your Understanding",
      "questions": ["Exit ticket question 1", "Exit ticket question 2"],
      "speaker_notes": "Give 2 minutes. Collect responses.",
      "duration_minutes": 3,
      "engagement_prompt": null
    }}
  ],
  "teacher_preparation_notes": "What to prepare, materials needed, potential student questions",
  "differentiation_notes": {{
    "support": "How to adapt for struggling learners",
    "enrichment": "Extension for advanced students"
  }},
  "homework_connection": "How this connects to homework or next lesson"
}}""",

        "grading": f"""You are an expert educational assessor. Provide comprehensive grading using analytic rubric methodology.

GRADING REQUEST:
- Assistance Type: {extra.get('assistance_type', 'Generate Feedback for Response')}
- Question/Task: {extra.get('question', body.topic)}
- Student Response: {extra.get('student_response', 'No response provided')}
- Total Marks: {extra.get('total_marks', 10)}
- Feedback Tone: {extra.get('feedback_tone', 'Encouraging')}
- Subject: {body.subject}
- Grade Level: {body.grade or 'General'}

Return ONLY valid JSON (no markdown):
{{
  "assistance_type": "{extra.get('assistance_type', 'Generate Feedback for Response')}",
  "question": "{extra.get('question', body.topic)}",
  "total_marks": {extra.get('total_marks', 10)},
  "score": 7,
  "max_score": {extra.get('total_marks', 10)},
  "grade_letter": "B",
  "percentage": 70,
  "performance_level": "Meeting Expectations",
  "rubric_criteria": [
    {{
      "criterion": "Content Knowledge / Accuracy",
      "max_marks": 3,
      "marks_awarded": 2,
      "level": "Meeting",
      "descriptor": "What the student demonstrated",
      "evidence": "Specific quote from student response"
    }},
    {{
      "criterion": "Understanding & Explanation",
      "max_marks": 3,
      "marks_awarded": 2,
      "level": "Meeting",
      "descriptor": "...",
      "evidence": "..."
    }},
    {{
      "criterion": "Application / Problem Solving",
      "max_marks": 2,
      "marks_awarded": 2,
      "level": "Exceeding",
      "descriptor": "...",
      "evidence": "..."
    }},
    {{
      "criterion": "Communication / Presentation",
      "max_marks": 2,
      "marks_awarded": 1,
      "level": "Approaching",
      "descriptor": "...",
      "evidence": "..."
    }}
  ],
  "strengths": ["Specific strength 1 with evidence", "Specific strength 2"],
  "areas_for_improvement": ["Specific gap with actionable guidance"],
  "model_answer_notes": "Key points that should have been in a full-mark response",
  "feedback": "Full written feedback in the requested tone — 3-4 sentences, specific and actionable",
  "parent_friendly_summary": "Brief jargon-free summary for parents",
  "next_steps": ["Concrete action 1", "Concrete action 2", "Resource to help"],
  "suggestions": ["Improvement suggestion 1", "Improvement suggestion 2"],
  "grading_rubric_table": [
    {{
      "criterion": "Content Knowledge",
      "exceeding": "Thorough, accurate understanding with no errors",
      "meeting": "Mostly accurate with minor errors",
      "approaching": "Partial understanding with significant errors",
      "developing": "Limited understanding with major omissions"
    }}
  ]
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
