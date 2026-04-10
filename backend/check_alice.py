import asyncio
import sys
sys.path.insert(0, '.')
from database import connect_db, close_db, get_db

async def check():
    await connect_db()
    db = get_db()
    
    # Check for Alice by phone
    user = await db.users.find_one({"phone": "1111111111"})
    if user:
        print("FOUND by phone:", user.get("name"), "| role:", user.get("role"), "| phone:", user.get("phone"))
    else:
        print("NOT FOUND by phone 1111111111")
    
    students = await db.users.find({"role": "student"}).to_list(10)
    print(f"\nAll students ({len(students)}):")
    for s in students:
        print(f"  - {s.get('name')} | phone: {s.get('phone')} | role: {s.get('role')}")
    
    await close_db()

asyncio.run(check())
