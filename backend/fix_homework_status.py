"""Fix homework status from 'active' to 'assigned'"""
import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
from dotenv import load_dotenv
import os

load_dotenv()
MONGO_URL = os.getenv("MONGO_URI", "mongodb://localhost:27017")
DB_NAME = os.getenv("MONGO_DB", "bawan")

async def fix_status():
    client = AsyncIOMotorClient(MONGO_URL)
    db = client[DB_NAME]
    
    print("\nFixing homework status...")
    
    # Update all homework with status 'active' to 'assigned'
    result = await db.homework.update_many(
        {"status": "active"},
        {"$set": {"status": "assigned"}}
    )
    
    print(f"Updated {result.modified_count} homework assignments")
    
    # Also set created_by for homework that don't have it
    teachers = await db.users.find({"role": "teacher"}).to_list(None)
    john_id = str([t["_id"] for t in teachers if "John" in t.get("name", "")][0])
    
    result2 = await db.homework.update_many(
        {"created_by": None},
        {"$set": {"created_by": john_id}}
    )
    
    print(f"Set created_by for {result2.modified_count} homework assignments")
    
    # Show final status
    hw_list = await db.homework.find({}).to_list(None)
    print(f"\nTotal homework: {len(hw_list)}")
    for hw in hw_list:
        assigned = hw.get('assigned_students', [])
        print(f"  - {hw.get('title')}: status={hw.get('status')}, assigned_to={len(assigned)} students")
    
    print("\nDone!")
    client.close()

if __name__ == "__main__":
    asyncio.run(fix_status())
