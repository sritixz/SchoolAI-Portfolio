import asyncio, sys, os
sys.path.insert(0, os.path.dirname(__file__))
from motor.motor_asyncio import AsyncIOMotorClient
from config import settings

async def main():
    client = AsyncIOMotorClient(settings.MONGO_URI)
    db = client[settings.MONGO_DB]
    users = await db.users.find({"name": {"$regex": "kevin", "$options": "i"}}).to_list(None)
    kevin = users[0]
    sub = await db.homework_submissions.find_one({"student_id": str(kevin["_id"])})
    ai = sub.get("ai_analysis", {})
    print(f"Score: {ai.get('estimated_score_pct')}%")
    for qa in ai.get("question_analysis", []):
        print(f"\n{qa['question_id']}: is_correct={qa.get('is_correct')} score={qa.get('ai_score')}/{qa.get('max_points')}")
        print(f"  student_answer: {qa.get('student_answer')}")
        print(f"  feedback: {qa.get('feedback')}")
    print(f"\nAnswers in submission: {sub.get('answers')}")
    client.close()

asyncio.run(main())
