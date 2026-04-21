"""Re-run OCR + AI analysis for all submissions of the Integers homework."""
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
    sub_k = await db.homework_submissions.find_one({"student_id": str(kevin["_id"])})

    lucy = (await db.users.find({"name": {"$regex": "lucy", "$options": "i"}}).to_list(None))[0]
    sub_l = await db.homework_submissions.find_one({"student_id": str(lucy["_id"])})

    hw = await db.homework.find_one({"_id": ObjectId(sub_k["homework_id"])})

    for name, sub in [("Kevin", sub_k), ("Lucy", sub_l)]:
        if not sub:
            print(f"{name}: no submission found"); continue
        # Clear stale answers so backfill runs fresh
        await db.homework_submissions.update_one(
            {"_id": sub["_id"]},
            {"$set": {"answers": [], "ai_analysis": None, "extracted_text": None}}
        )
        sub = await db.homework_submissions.find_one({"_id": sub["_id"]})
        print(f"\nRunning analysis for {name}...")
        await _run_analysis(db, sub, hw)
        updated = await db.homework_submissions.find_one({"_id": sub["_id"]})
        ai = updated.get("ai_analysis", {})
        print(f"  Score: {ai.get('estimated_score_pct')}%")
        for qa in ai.get("question_analysis", []):
            mark = "✓" if qa.get("is_correct") else "✗"
            print(f"  {mark} {qa['question_id']}: '{qa.get('student_answer')}' ({qa.get('ai_score')}/{qa.get('max_points')})")

    client.close()

asyncio.run(main())
