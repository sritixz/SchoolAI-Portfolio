"""
Re-trigger OCR + AI analysis for Kevin Lee's submission.
Run from backend/: python retrigger_analysis.py
"""
import asyncio, sys, os
sys.path.insert(0, os.path.dirname(__file__))

from motor.motor_asyncio import AsyncIOMotorClient
from bson import ObjectId
from config import settings
from routers.homework import _run_analysis

async def main():
    client = AsyncIOMotorClient(settings.MONGO_URI)
    db = client[settings.MONGO_DB]

    users = await db.users.find({"name": {"$regex": "kevin", "$options": "i"}}).to_list(None)
    kevin = users[0] if users else None
    if not kevin:
        print("Kevin Lee not found"); return

    sub = await db.homework_submissions.find_one({"student_id": str(kevin["_id"])})
    if not sub:
        print("Submission not found"); return

    hw = await db.homework.find_one({"_id": ObjectId(sub["homework_id"])})
    print(f"Re-running analysis for submission {sub['_id']}...")
    await _run_analysis(db, sub, hw)

    # Verify
    updated = await db.homework_submissions.find_one({"_id": sub["_id"]})
    print(f"extracted_text: {'YES (' + str(len(updated.get('extracted_text',''))) + ' chars)' if updated.get('extracted_text') else 'NO'}")
    ai = updated.get("ai_analysis", {})
    print(f"ai_analysis score: {ai.get('estimated_score_pct')}%")
    print(f"ai_analysis summary: {ai.get('overall_summary')}")
    client.close()

asyncio.run(main())
