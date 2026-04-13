"""Clear answers and re-run analysis to get fresh backfilled answers."""
import asyncio, sys
sys.path.insert(0, '.')
from motor.motor_asyncio import AsyncIOMotorClient
from bson import ObjectId
from config import settings
from routers.homework import _run_analysis

async def main():
    client = AsyncIOMotorClient(settings.MONGO_URI)
    db = client[settings.MONGO_DB]
    kevin = (await db.users.find({"name": {"$regex": "kevin", "$options": "i"}}).to_list(None))[0]
    sub = await db.homework_submissions.find_one({"student_id": str(kevin["_id"])})

    # Clear answers so backfill runs fresh
    await db.homework_submissions.update_one(
        {"_id": sub["_id"]},
        {"$set": {"answers": [], "ai_analysis": None, "extracted_text": None}}
    )
    sub = await db.homework_submissions.find_one({"_id": sub["_id"]})
    hw = await db.homework.find_one({"_id": ObjectId(sub["homework_id"])})

    print("Re-running full pipeline...")
    await _run_analysis(db, sub, hw)

    updated = await db.homework_submissions.find_one({"_id": sub["_id"]})
    ai = updated.get("ai_analysis", {})
    print(f"Score: {ai.get('estimated_score_pct')}%")
    for qa in ai.get("question_analysis", []):
        print(f"  {qa['question_id']}: correct={qa.get('is_correct')} score={qa.get('ai_score')}/{qa.get('max_points')} answer='{qa.get('student_answer')}'")
    print(f"\nAnswers backfilled: {len(updated.get('answers', []))}")
    for a in updated.get("answers", []):
        print(f"  {a['question_id']}: '{a['answer']}' correct={a.get('is_correct')} pts={a.get('points_awarded')}")
    client.close()

asyncio.run(main())
