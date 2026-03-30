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
