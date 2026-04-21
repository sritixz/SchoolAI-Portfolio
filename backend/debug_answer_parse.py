import asyncio, sys, re
sys.path.insert(0, '.')
from motor.motor_asyncio import AsyncIOMotorClient
from bson import ObjectId
from config import settings

def parse_answers(extracted_text):
    norm_text = extracted_text.replace('\u2212', '-').replace('\u2013', '-')
    sections_q = re.split(r'Question\s+(\d+)', norm_text, flags=re.IGNORECASE)
    sections_qn = re.split(r'\bQ(\d+)\s*[:\.]', norm_text, flags=re.IGNORECASE)
    sections = sections_q if len(sections_q) >= len(sections_qn) else sections_qn
    print(f"Using split with {len(sections)} sections (Q-split={len(sections_q)}, QN-split={len(sections_qn)})")
    q_answers = {}
    for i in range(1, len(sections), 2):
        try:
            q_num = int(sections[i])
        except ValueError:
            continue
        section_text = sections[i + 1] if i + 1 < len(sections) else ""
        ans_match = re.search(r'(?:→\s*)?(?:Answer|Result)[:\s]+([^\n]+)', section_text, re.IGNORECASE)
        if ans_match:
            ans_val = ans_match.group(1).strip()
            q_answers[q_num] = ans_val
            print(f"  Q{q_num}: '{ans_val}'")
        else:
            print(f"  Q{q_num}: NO MATCH in: {section_text[:120]!r}")
    return q_answers

async def main():
    client = AsyncIOMotorClient(settings.MONGO_URI)
    db = client[settings.MONGO_DB]

    for name_pattern in ["kevin", "lucy"]:
        user = (await db.users.find({"name": {"$regex": name_pattern, "$options": "i"}}).to_list(None))[0]
        sub = await db.homework_submissions.find_one({"student_id": str(user["_id"])})
        if not sub or not sub.get("extracted_text"):
            print(f"\n{name_pattern}: no extracted_text"); continue
        print(f"\n=== {user['name']} ===")
        parse_answers(sub["extracted_text"])

    client.close()

asyncio.run(main())
