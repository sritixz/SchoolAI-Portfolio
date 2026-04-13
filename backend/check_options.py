import asyncio, sys
sys.path.insert(0, '.')
from motor.motor_asyncio import AsyncIOMotorClient
from bson import ObjectId
from config import settings

async def main():
    client = AsyncIOMotorClient(settings.MONGO_URI)
    db = client[settings.MONGO_DB]
    kevin = (await db.users.find({"name": {"$regex": "kevin", "$options": "i"}}).to_list(None))[0]
    sub = await db.homework_submissions.find_one({"student_id": str(kevin["_id"])})
    hw = await db.homework.find_one({"_id": ObjectId(sub["homework_id"])})
    for q in hw.get("questions", []):
        print(f"{q['id']}: {q['question_text'][:60]}")
        print(f"  answer_type: {q.get('answer_type')}")
        for o in q.get("options", []):
            print(f"  opt: {o}")
    print()
    print("=== Extracted text ===")
    print(sub.get("extracted_text", "")[:800])
    client.close()

asyncio.run(main())
