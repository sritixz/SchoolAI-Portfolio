"""Check homework in database"""
import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
from dotenv import load_dotenv
import os

load_dotenv()
MONGO_URL = os.getenv("MONGO_URI", "mongodb://localhost:27017")
DB_NAME = os.getenv("MONGO_DB", "bawan")

async def check_db():
    client = AsyncIOMotorClient(MONGO_URL)
    db = client[DB_NAME]
    
    print("\n" + "="*60)
    print("CHECKING HOMEWORK DATABASE")
    print("="*60)
    
    # Check homework
    hw_list = await db.homework.find({}).to_list(None)
    print(f"\nTotal homework in DB: {len(hw_list)}")
    
    for hw in hw_list:
        assigned = hw.get('assigned_students', [])
        print(f"\n  📝 {hw.get('title')}")
        print(f"     Status: {hw.get('status')}")
        print(f"     Created by: {hw.get('created_by')}")
        print(f"     Assigned to: {len(assigned)} students")
        if assigned:
            print(f"     Student IDs: {assigned[:3]}...")
    
    # Check students
    students = await db.users.find({"role": "student"}).to_list(None)
    print(f"\n\nTotal students: {len(students)}")
    for s in students:
        print(f"  👨‍🎓 {s.get('name')} (ID: {str(s['_id'])})")
    
    # Check teachers
    teachers = await db.users.find({"role": "teacher"}).to_list(None)
    print(f"\n\nTotal teachers: {len(teachers)}")
    for t in teachers:
        print(f"  👨‍🏫 {t.get('name')} (ID: {str(t['_id'])})")
    
    # Check submissions
    submissions = await db.homework_submissions.find({}).to_list(None)
    print(f"\n\nTotal submissions: {len(submissions)}")
    for sub in submissions:
        print(f"  📤 Student {sub.get('student_id')} → Homework {sub.get('homework_id')} ({sub.get('status')})")
    
    print("\n" + "="*60)
    client.close()

if __name__ == "__main__":
    asyncio.run(check_db())
