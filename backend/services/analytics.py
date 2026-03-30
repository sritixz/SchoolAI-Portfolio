"""
Analytics service — computes mastery scores, learning gaps,
intervention triggers, and school-admin aggregations.

All functions accept `db` as a parameter (injected by FastAPI Depends)
so they work correctly in async context.
"""
from motor.motor_asyncio import AsyncIOMotorDatabase


async def compute_student_mastery(student_id: str, db: AsyncIOMotorDatabase) -> dict:
    """Returns per-topic mastery scores for a student."""
    submissions = await db.homework_submissions.find({"student_id": student_id}).to_list(None)
    topic_scores: dict[str, list[int]] = {}
    for sub in submissions:
        for q in sub.get("question_scores", []):
            topic = q.get("topic", "General")
            topic_scores.setdefault(topic, []).append(q.get("score_pct", 0))
    if not topic_scores:
        return {}
    return {topic: int(sum(v) / len(v)) for topic, v in topic_scores.items()}


async def detect_learning_gaps(student_id: str, db: AsyncIOMotorDatabase, threshold: int = 60) -> list[dict]:
    """Returns topics where mastery < threshold."""
    mastery = await compute_student_mastery(student_id, db)
    return [
        {
            "topic":    t,
            "score":    s,
            "severity": "high" if s < 40 else "medium" if s < threshold else "low",
        }
        for t, s in mastery.items() if s < threshold
    ]


async def get_class_performance(class_id: str, db: AsyncIOMotorDatabase) -> dict:
    """Aggregated performance for a class — used by teacher analytics."""
    pipeline = [
        {"$match":  {"class_id": class_id}},
        {"$group":  {"_id": "$topic", "avg_score": {"$avg": "$score_pct"}, "count": {"$sum": 1}}},
        {"$sort":   {"avg_score": 1}},
    ]
    results = await db.homework_submissions.aggregate(pipeline).to_list(None)
    return {"class_id": class_id, "topics": results}


async def get_school_overview(school_id: str, db: AsyncIOMotorDatabase) -> dict:
    """High-level stats for school admin dashboard."""
    total_students = await db.users.count_documents({"school_id": school_id, "role": "student"})
    total_teachers = await db.users.count_documents({"school_id": school_id, "role": "teacher"})
    return {"total_students": total_students, "total_teachers": total_teachers}
