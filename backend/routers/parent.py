from fastapi import APIRouter, Depends, HTTPException
from bson import ObjectId
from dependencies import require_role
from database import get_db

router = APIRouter(prefix="/parent", tags=["parent"])

def _ser(doc):
    if doc and "_id" in doc:
        doc["_id"] = str(doc["_id"])
    return doc

@router.get("/dashboard")
async def dashboard(user=Depends(require_role("parent")), db=Depends(get_db)):
    parent = await db.users.find_one({"_id": ObjectId(user["id"])}, {"hashed_password": 0, "otp_hash": 0})
    if not parent:
        raise HTTPException(404, "Parent not found")
    child_ids = parent.get("children", [])
    children = []
    for cid in child_ids:
        try:
            child = await db.users.find_one({"_id": ObjectId(cid)}, {"hashed_password": 0, "otp_hash": 0})
            if child:
                children.append(_ser(child))
        except Exception:
            pass
    return {"parent": _ser(parent), "children": children}

@router.get("/homework-overview")
async def homework_overview(child_id: str, user=Depends(require_role("parent")), db=Depends(get_db)):
    # Verify this child belongs to this parent
    parent = await db.users.find_one({"_id": ObjectId(user["id"])}, {"children": 1})
    if not parent:
        raise HTTPException(404, "Parent not found")

    # Find homework assigned to this student directly OR to their class
    child = await db.users.find_one({"_id": ObjectId(child_id)}, {"class_name": 1, "section_id": 1})
    class_name = child.get("class_name", "") if child else ""

    # Query: assigned to this student individually OR to their whole class
    query = {
        "status": "assigned",
        "$or": [
            {"assigned_students": child_id},
            {"assigned_to_class": class_name, "assigned_students": {"$size": 0}},
            {"assigned_to_class": class_name, "assigned_students": []},
        ]
    }
    docs = await db.homework.find(query).sort("due_date", -1).to_list(None)

    # Fetch this child's submissions for all these homework IDs
    hw_ids = [str(d["_id"]) for d in docs]
    submissions = await db.homework_submissions.find(
        {"student_id": child_id, "homework_id": {"$in": hw_ids}}
    ).to_list(None)
    sub_map = {s["homework_id"]: s for s in submissions}

    result = []
    for d in docs:
        d = _ser(d)
        hw_id = d["_id"]
        sub = sub_map.get(hw_id)
        # Enrich with child's submission status
        if sub:
            d["child_submission_status"] = sub.get("status", "submitted")
            d["child_score_pct"] = sub.get("auto_score_pct")
            d["child_grade"] = sub.get("final_grade")
        else:
            d["child_submission_status"] = "pending"
        result.append(d)
    return result

@router.get("/consistency")
async def consistency(child_id: str, user=Depends(require_role("parent")), db=Depends(get_db)):
    doc = await db.consistency_data.find_one({"student_id": child_id})
    return _ser(doc) if doc else {}

@router.get("/topic-progress")
async def topic_progress(child_id: str, user=Depends(require_role("parent")), db=Depends(get_db)):
    docs = await db.topic_progress.find({"student_id": child_id}).to_list(None)
    return [_ser(d) for d in docs]

@router.get("/notifications")
async def notifications(user=Depends(require_role("parent")), db=Depends(get_db)):
    docs = await db.notifications.find({"user_id": user["id"]}).sort("_id", -1).to_list(50)
    return [_ser(d) for d in docs]

@router.patch("/notifications/{notif_id}/read")
async def mark_read(notif_id: str, user=Depends(require_role("parent")), db=Depends(get_db)):
    try:
        await db.notifications.update_one({"_id": ObjectId(notif_id)}, {"$set": {"read": True}})
    except Exception:
        raise HTTPException(400, "Invalid notification ID")
    return {"status": "ok"}

@router.get("/support-alerts")
async def support_alerts(child_id: str, user=Depends(require_role("parent")), db=Depends(get_db)):
    docs = await db.support_alerts.find({"student_id": child_id}).to_list(None)
    return [_ser(d) for d in docs]

@router.get("/growth-portfolio")
async def growth_portfolio(child_id: str, user=Depends(require_role("parent")), db=Depends(get_db)):
    docs = await db.portfolio_entries.find({"student_id": child_id}).sort("_id", -1).to_list(None)
    return [_ser(d) for d in docs]

@router.post("/growth-portfolio/add")
async def add_portfolio_entry(child_id: str, title: str, text: str,
                               user=Depends(require_role("parent")), db=Depends(get_db)):
    doc = {
        "student_id": child_id,
        "type":       "parent_reflection",
        "title":      title,
        "text":       text,
        "author_id":  user["id"],
    }
    result = await db.portfolio_entries.insert_one(doc)
    return {"id": str(result.inserted_id)}

@router.get("/learning-profile")
async def learning_profile(child_id: str, user=Depends(require_role("parent")), db=Depends(get_db)):
    doc = await db.learning_profiles.find_one({"student_id": child_id})
    return _ser(doc) if doc else {}

@router.put("/learning-profile")
async def update_learning_profile(child_id: str, profile: dict,
                                   user=Depends(require_role("parent")), db=Depends(get_db)):
    await db.learning_profiles.update_one(
        {"student_id": child_id}, {"$set": profile}, upsert=True
    )
    return {"status": "updated"}

@router.get("/messages")
async def get_parent_messages(user=Depends(require_role("parent")), db=Depends(get_db)):
    """Return all messages between this parent and teachers (both directions)."""
    parent = await db.users.find_one({"_id": ObjectId(user["id"])}, {"children": 1})
    if not parent:
        raise HTTPException(404, "Parent not found")
    child_ids = parent.get("children", [])
    docs = await db.messages.find(
        {
            "student_id": {"$in": child_ids},
            "direction": {"$in": ["teacher_to_parent", "parent_to_teacher"]},
        }
    ).sort("sent_at", -1).limit(200).to_list(None)
    enriched = []
    for doc in docs:
        teacher = await db.users.find_one({"_id": ObjectId(doc["teacher_id"])}, {"name": 1}) if doc.get("teacher_id") else None
        student = await db.users.find_one({"_id": ObjectId(doc["student_id"])}, {"name": 1}) if doc.get("student_id") else None
        enriched.append({
            **_ser(doc),
            "teacher_name": teacher.get("name", "Teacher") if teacher else "Teacher",
            "student_name": student.get("name", "Student") if student else "Student",
            "read": doc.get("read", False),
        })
    return enriched

from pydantic import BaseModel as _ParentMsgBody
class ParentMessageBody(_ParentMsgBody):
    teacher_id: str
    child_id: str
    message: str

@router.post("/messages")
async def parent_send_message_v2(body: ParentMessageBody, user=Depends(require_role("parent")), db=Depends(get_db)):
    """Parent sends a message to a teacher."""
    from datetime import datetime as _dt
    # Verify child belongs to this parent
    parent = await db.users.find_one({"_id": ObjectId(user["id"])}, {"children": 1})
    if not parent or body.child_id not in parent.get("children", []):
        raise HTTPException(403, "Not your child")
    child = await db.users.find_one({"_id": ObjectId(body.child_id)}, {"name": 1})
    doc = {
        "teacher_id":  body.teacher_id,
        "parent_id":   user["id"],
        "student_id":  body.child_id,
        "message":     body.message,
        "direction":   "parent_to_teacher",
        "sent_at":     _dt.utcnow().isoformat(),
        "read":        False,
    }
    result = await db.messages.insert_one(doc)
    # Notify teacher
    await db.notifications.insert_one({
        "user_id":    body.teacher_id,
        "type":       "parent_message",
        "title":      "Message from Parent",
        "desc":       f"Parent of {child.get('name', 'a student')} sent you a message.",
        "read":       False,
        "created_at": _dt.utcnow().isoformat(),
    })
    return {"id": str(result.inserted_id)}

@router.patch("/messages/{message_id}/read")
async def mark_message_read(message_id: str, user=Depends(require_role("parent")), db=Depends(get_db)):
    try:
        await db.messages.update_one({"_id": ObjectId(message_id)}, {"$set": {"read": True}})
    except Exception:
        raise HTTPException(400, "Invalid message ID")
    return {"status": "ok"}

# ─────────────────────────────────────────────────────────────
# MEETING REQUESTS (parent-initiated)
# ─────────────────────────────────────────────────────────────

from pydantic import BaseModel
from typing import List
from datetime import datetime

class ParentMeetingRequestBody(BaseModel):
    child_id: str
    reason: str
    proposed_times: List[dict]  # [{date, time}]
    urgency: str = "normal"

@router.post("/meeting-requests")
async def parent_create_meeting_request(body: ParentMeetingRequestBody, user=Depends(require_role("parent")), db=Depends(get_db)):
    """Parent requests a meeting with their child's teacher."""
    child = await db.users.find_one({"_id": ObjectId(body.child_id)}, {"name": 1, "section_id": 1})
    if not child:
        raise HTTPException(404, "Child not found")
    # Find all teachers for this section and pick the class teacher or first available
    teacher_id = None
    if child.get("section_id"):
        section = await db.sections.find_one({"_id": ObjectId(child["section_id"])})
        if section and section.get("class_teacher_id"):
            teacher_id = section["class_teacher_id"]
        else:
            assignment = await db.subject_assignments.find_one({"section_id": child["section_id"]})
            if assignment:
                teacher_id = assignment.get("teacher_id")
    doc = {
        "parent_id":      user["id"],
        "child_id":       body.child_id,
        "child_name":     child.get("name", "Student"),
        "teacher_id":     teacher_id,
        "reason":         body.reason,
        "proposed_times": body.proposed_times,
        "urgency":        body.urgency,
        "status":         "pending_response",
        "initiated_by":   "parent",
        "created_at":     datetime.utcnow().isoformat(),
    }
    result = await db.meeting_requests.insert_one(doc)
    # Notify teacher if found
    if teacher_id:
        await db.notifications.insert_one({
            "user_id":    teacher_id,
            "type":       "meeting_request",
            "title":      "Meeting Request from Parent",
            "desc":       f"Parent of {child.get('name', 'a student')} has requested a meeting: {body.reason}",
            "read":       False,
            "created_at": datetime.utcnow().isoformat(),
            "ref_id":     str(result.inserted_id),
        })
    return {"id": str(result.inserted_id), "status": "pending_response"}

@router.get("/meeting-requests")
async def parent_get_meeting_requests(user=Depends(require_role("parent")), db=Depends(get_db)):
    """Get all meeting requests for this parent."""
    docs = await db.meeting_requests.find({"parent_id": user["id"]}).sort("created_at", -1).to_list(None)
    return [_ser(d) for d in docs]

@router.get("/child-teachers")
async def get_child_teachers(child_id: str, user=Depends(require_role("parent")), db=Depends(get_db)):
    """Return teachers associated with a child's section."""
    child = await db.users.find_one({"_id": ObjectId(child_id)}, {"section_id": 1, "class_name": 1, "name": 1})
    if not child:
        raise HTTPException(404, "Child not found")
    teachers = []
    seen = set()
    section_id = child.get("section_id")
    if section_id:
        # Class teacher from section
        section = await db.sections.find_one({"_id": ObjectId(section_id)})
        if section and section.get("class_teacher_id"):
            tid = section["class_teacher_id"]
            if tid not in seen:
                t = await db.users.find_one({"_id": ObjectId(tid)}, {"name": 1, "subject": 1})
                if t:
                    teachers.append({"id": str(t["_id"]), "name": t.get("name", "Teacher"), "subject": t.get("subject", "Class Teacher")})
                    seen.add(tid)
        # Subject teachers from assignments
        assignments = await db.subject_assignments.find({"section_id": str(section_id)}).to_list(None)
        for a in assignments:
            tid = a.get("teacher_id")
            if tid and tid not in seen:
                t = await db.users.find_one({"_id": ObjectId(tid)}, {"name": 1, "subject": 1})
                if t:
                    teachers.append({"id": str(t["_id"]), "name": t.get("name", "Teacher"), "subject": a.get("subject", t.get("subject", ""))})
                    seen.add(tid)
    # Fallback: teachers who have sent messages to this child
    if not teachers:
        msgs = await db.messages.find({"student_id": child_id, "direction": "teacher_to_parent"}).to_list(20)
        for m in msgs:
            tid = m.get("teacher_id")
            if tid and tid not in seen:
                t = await db.users.find_one({"_id": ObjectId(tid)}, {"name": 1, "subject": 1})
                if t:
                    teachers.append({"id": str(t["_id"]), "name": t.get("name", "Teacher"), "subject": t.get("subject", "")})
                    seen.add(tid)
    return teachers

@router.get("/homework-submission")
async def get_child_submission(homework_id: str, child_id: str,
                                user=Depends(require_role("parent")), db=Depends(get_db)):
    """Return a child's submission detail for a specific homework."""
    # Verify child belongs to this parent
    parent = await db.users.find_one({"_id": ObjectId(user["id"])}, {"children": 1})
    if not parent or child_id not in [str(c) for c in parent.get("children", [])]:
        raise HTTPException(403, "Not your child")
    doc = await db.homework_submissions.find_one({"homework_id": homework_id, "student_id": child_id})
    if not doc:
        raise HTTPException(404, "No submission found")
    # Also fetch the homework questions for context
    hw = await db.homework.find_one({"_id": ObjectId(homework_id)})
    return {
        "submission": _ser(doc),
        "homework": _ser(hw) if hw else {},
    }
