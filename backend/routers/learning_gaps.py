from fastapi import APIRouter, Depends, HTTPException
from bson import ObjectId
from datetime import datetime
from dependencies import require_role
from database import get_db
from models.learning_gap import GapQuizSubmission
import json

router = APIRouter(prefix="/learning-gaps", tags=["learning-gaps"])

def _ser(doc):
    if doc and "_id" in doc:
        doc["_id"] = str(doc["_id"])
    return doc

@router.get("/")
async def get_gaps(user=Depends(require_role("student")), db=Depends(get_db)):
    docs = await db.learning_gaps.find({"student_id": user["id"], "resolved": False}).to_list(None)
    return [_ser(d) for d in docs]

@router.get("/health")
async def gap_health(user=Depends(require_role("student")), db=Depends(get_db)):
    total    = await db.learning_gaps.count_documents({"student_id": user["id"]})
    resolved = await db.learning_gaps.count_documents({"student_id": user["id"], "resolved": True})
    critical = await db.learning_gaps.count_documents({"student_id": user["id"], "severity": "critical", "resolved": False})
    moderate = await db.learning_gaps.count_documents({"student_id": user["id"], "severity": "moderate", "resolved": False})
    minor    = await db.learning_gaps.count_documents({"student_id": user["id"], "severity": "minor",    "resolved": False})
    active   = total - resolved
    score    = max(0, 100 - (critical * 15) - (moderate * 7) - (minor * 3))
    return {
        "score":              score,
        "maxScore":           100,
        "totalGaps":          active,
        "totalGapsTrend":     "",
        "resolvedGaps":       resolved,
        "resolvedGapsTrend":  "",
        "trend":              "",
        "improvementMessage": f"You have {active} active gap{'s' if active != 1 else ''} to work on.",
        "severity": {"critical": critical, "moderate": moderate, "minor": minor},
    }

@router.get("/{gap_id}")
async def get_gap(gap_id: str, user=Depends(require_role("student")), db=Depends(get_db)):
    try:
        doc = await db.learning_gaps.find_one({"_id": ObjectId(gap_id), "student_id": user["id"]})
    except Exception:
        raise HTTPException(400, "Invalid gap ID")
    if not doc:
        raise HTTPException(404, "Gap not found")
    return _ser(doc)

@router.get("/{gap_id}/remediation")
async def get_remediation(gap_id: str, user=Depends(require_role("student")), db=Depends(get_db)):
    try:
        gap = await db.learning_gaps.find_one({"_id": ObjectId(gap_id), "student_id": user["id"]})
    except Exception:
        raise HTTPException(400, "Invalid gap ID")
    if not gap:
        raise HTTPException(404, "Gap not found")

    # Check cache first
    cached = await db.remediation_cache.find_one({"gap_id": gap_id})
    if cached:
        return {"gap": _ser(gap), "remediation": cached["content"]}

    from services.llm import chat_completion
    prompt = f"""Create a remediation lesson for a student struggling with "{gap['topic']}" in {gap['subject']}.
Return ONLY valid JSON: {{"explanation": "...", "examples": ["..."], "key_points": ["..."]}}"""
    try:
        raw = await chat_completion([{"role": "user", "content": prompt}])
        raw = raw.strip().lstrip("```json").lstrip("```").rstrip("```").strip()
        content = json.loads(raw)
    except Exception:
        content = {"explanation": f"Review {gap['topic']} in {gap['subject']}.", "examples": [], "key_points": []}

    await db.remediation_cache.insert_one({"gap_id": gap_id, "content": content})
    return {"gap": _ser(gap), "remediation": content}

@router.get("/quizzes")
async def list_quizzes(user=Depends(require_role("student")), db=Depends(get_db)):
    docs = await db.gap_quizzes.find({}, {"questions": 0}).to_list(None)
    return [_ser(d) for d in docs]

@router.get("/quiz/{quiz_id}")
async def get_quiz(quiz_id: str, user=Depends(require_role("student")), db=Depends(get_db)):
    # Try string id field first (e.g. "quiz001"), then ObjectId
    doc = await db.gap_quizzes.find_one({"id": quiz_id})
    if not doc:
        try:
            doc = await db.gap_quizzes.find_one({"_id": ObjectId(quiz_id)})
        except Exception:
            pass
    if not doc:
        raise HTTPException(404, "Quiz not found")
    return _ser(doc)

@router.post("/quiz/submit")
async def submit_quiz(body: GapQuizSubmission, user=Depends(require_role("student")), db=Depends(get_db)):
    # Support both string ids (e.g. "quiz001") and ObjectIds
    quiz = await db.gap_quizzes.find_one({"id": body.quiz_id})
    if not quiz:
        try:
            quiz = await db.gap_quizzes.find_one({"_id": ObjectId(body.quiz_id)})
        except Exception:
            pass
    if not quiz:
        raise HTTPException(404, "Quiz not found")

    questions = {q["id"]: q for q in quiz.get("questions", [])}
    correct = sum(
        1 for a in body.answers
        if questions.get(a.get("question_id"), {}).get("correct_option_id") == a.get("selected_option_id")
    )
    total = len(quiz["questions"])
    score_pct = round(correct / total * 100) if total > 0 else 0

    # Save attempt
    await db.quiz_attempts.insert_one({
        "quiz_id": body.quiz_id,
        "student_id": user["id"],
        "answers": body.answers,
        "score_pct": score_pct,
        "submitted_at": datetime.utcnow().isoformat(),
    })

    # Mark gap resolved if score >= 70
    resolved = score_pct >= 70
    if resolved and quiz.get("gap_id"):
        await db.learning_gaps.update_one(
            {"_id": ObjectId(quiz["gap_id"])},
            {"$set": {"resolved": True, "resolved_at": datetime.utcnow().isoformat()}},
        )

    return {"score_pct": score_pct, "correct": correct, "total": total, "resolved": resolved}
