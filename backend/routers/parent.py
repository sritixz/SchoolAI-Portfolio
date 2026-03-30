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
    docs = await db.homework.find({"assigned_students": child_id}).to_list(None)
    return [_ser(d) for d in docs]

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
