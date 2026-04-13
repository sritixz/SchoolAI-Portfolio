import asyncio, sys, re
sys.path.insert(0, '.')
from motor.motor_asyncio import AsyncIOMotorClient
from bson import ObjectId
from config import settings

async def main():
    client = AsyncIOMotorClient(settings.MONGO_URI)
    db = client[settings.MONGO_DB]
    kevin = (await db.users.find({"name": {"$regex": "kevin", "$options": "i"}}).to_list(None))[0]
    sub = await db.homework_submissions.find_one({"student_id": str(kevin["_id"])})
    extracted_text = sub.get("extracted_text", "")

    sections = re.split(r'Question\s+(\d+)', extracted_text, flags=re.IGNORECASE)
    print(f"Sections count: {len(sections)}")
    q_answers = {}
    for i in range(1, len(sections), 2):
        q_num = int(sections[i])
        section_text = sections[i + 1] if i + 1 < len(sections) else ""
        ans_match = re.search(r'Answer[:\s]+([^\n]+)', section_text, re.IGNORECASE)
        if ans_match:
            ans_val = ans_match.group(1).strip().replace('\u2212', '-').replace('\u2013', '-')
            q_answers[q_num] = ans_val
            print(f"Q{q_num}: '{ans_val}'")
        else:
            print(f"Q{q_num}: NO ANSWER FOUND in section: {section_text[:100]!r}")

    client.close()

asyncio.run(main())
