"""Clear database and reseed with proper data"""
import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
from dotenv import load_dotenv
import os
import subprocess

load_dotenv()
MONGO_URL = os.getenv("MONGO_URI", "mongodb://localhost:27017")
DB_NAME = os.getenv("MONGO_DB", "bawan")

async def clear_db():
    client = AsyncIOMotorClient(MONGO_URL)
    db = client[DB_NAME]
    
    print("🗑️  Clearing entire database...")
    await db.users.delete_many({})
    await db.homework.delete_many({})
    await db.homework_submissions.delete_many({})
    await db.sections.delete_many({})
    await db.grades.delete_many({})
    await db.subject_assignments.delete_many({})
    await db.learning_gaps.delete_many({})
    await db.interventions.delete_many({})
    await db.notifications.delete_many({})
    await db.portfolio_entries.delete_many({})
    await db.learning_profiles.delete_many({})
    await db.support_alerts.delete_many({})
    await db.schedules.delete_many({})
    await db.mastery_heatmap.delete_many({})
    await db.messages.delete_many({})
    
    print("✅ Database cleared\n")
    client.close()

if __name__ == "__main__":
    print("\n" + "="*60)
    print("CLEARING AND RESEEDING DATABASE")
    print("="*60 + "\n")
    
    # Clear database
    asyncio.run(clear_db())
    
    # Run seed_data.py
    print("📊 Running seed_data.py...")
    result = subprocess.run(["python", "seed_data.py"], capture_output=False)
    if result.returncode != 0:
        print("❌ seed_data.py failed")
        exit(1)
    
    # Run seed_homework_comprehensive.py
    print("\n📝 Running seed_homework_comprehensive.py...")
    result = subprocess.run(["python", "seed_homework_comprehensive.py"], capture_output=False)
    if result.returncode != 0:
        print("❌ seed_homework_comprehensive.py failed")
        exit(1)
    
    print("\n" + "="*60)
    print("✅ DATABASE RESEEDED SUCCESSFULLY")
    print("="*60)
    print("\n🎯 You can now:")
    print("   1. Login as teacher: john.doe@school.com / teacher123")
    print("   2. View students with assigned homework")
    print("   3. Assign more homework from library")
    print("   4. Evaluate submissions\n")
