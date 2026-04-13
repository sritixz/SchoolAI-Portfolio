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
    extracted = sub.get("extracted_text", "")
    text_lower = extracted.lower()

    questions = {q["id"]: q for q in hw.get("questions", [])}
    print("Deterministic MCQ scoring simulation:\n")
    for qid, q in questions.items():
        if q.get("answer_type") != "mcq":
            print(f"{qid}: typed — skip")
            continue
        correct_opt = next((o for o in q.get("options", []) if o.get("is_correct")), None)
        if correct_opt:
            correct_text = correct_opt.get("text", "").strip().lower()
            found = correct_text in text_lower
            print(f"{qid}: correct_opt_text='{correct_text}' | found_in_text={found}")
            # Show context around where it appears
            idx = text_lower.find(correct_text)
            if idx >= 0:
                print(f"  context: ...{extracted[max(0,idx-30):idx+50]}...")
        else:
            print(f"{qid}: no correct option found!")

    client.close()

asyncio.run(main())
