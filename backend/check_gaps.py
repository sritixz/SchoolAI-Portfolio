import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
from config import settings

async def main():
    client = AsyncIOMotorClient(settings.MONGO_URI)
    db = client[settings.MONGO_DB]
    
    # Check student Alice Johnson
    student = await db.users.find_one({"phone": "1111111111", "role": "student"})
    if student:
        print(f"Alice user _id type: {type(student['_id'])}, value: {student['_id']}")
    else:
        print("Alice not found by phone 1111111111")
        
    # Check learning gaps for Alice
    gaps = await db.learning_gaps.find({"student_id": str(student['_id'])}).to_list(None)
    print(f"Gaps found by string student_id: {len(gaps)}")
    
    gaps_obj = await db.learning_gaps.find({"student_id": student['_id']}).to_list(None)
    print(f"Gaps found by ObjectId student_id: {len(gaps_obj)}")
    
    if gaps or gaps_obj:
        gap = gaps[0] if gaps else gaps_obj[0]
        print(f"Gap _id type: {type(gap['_id'])}, student_id type: {type(gap.get('student_id'))}, student_id value: {gap.get('student_id')}")
        
    client.close()

if __name__ == "__main__":
    asyncio.run(main())
