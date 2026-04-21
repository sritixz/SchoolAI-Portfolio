"""Fix wrong answer keys in the Integers homework."""
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

    questions = hw.get("questions", [])
    for q in questions:
        if q["id"] == "q2":
            # -1 is the greatest among -3, -7, -1, -5
            for o in q["options"]:
                o["is_correct"] = (o["text"] == "-1")
            print(f"Fixed q2: -1 is now correct")
        elif q["id"] == "q5":
            # -8 + -4 + 5 + 3 = -4
            for o in q["options"]:
                o["is_correct"] = (o["text"] == "-4")
            print(f"Fixed q5: -4 is now correct")

    await db.homework.update_one(
        {"_id": hw["_id"]},
        {"$set": {"questions": questions}}
    )
    print("Homework answer key updated.")
    client.close()

asyncio.run(main())
