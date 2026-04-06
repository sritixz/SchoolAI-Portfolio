"""
Seeds intervention alerts and learning gaps for the teacher dashboard.
Run: python seed_interventions.py
"""
import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
from datetime import datetime, timedelta
from bson import ObjectId
import os
from dotenv import load_dotenv

load_dotenv()

MONGO_URI = os.getenv("MONGO_URI", "mongodb://localhost:27017")
DB_NAME   = os.getenv("MONGO_DB", "vinschool")

async def main():
    client = AsyncIOMotorClient(MONGO_URI, serverSelectionTimeoutMS=15000)
    db = client[DB_NAME]

    # ── Get teacher ──────────────────────────────────────────
    teacher = await db.users.find_one({"email": "john.doe@school.com", "role": "teacher"})
    if not teacher:
        print("❌  Teacher john.doe@school.com not found. Run seed_extended.py first.")
        return
    teacher_id = str(teacher["_id"])
    print(f"✅  Teacher: {teacher['name']} ({teacher_id})")

    # ── Get students ─────────────────────────────────────────
    students = await db.users.find({"role": "student"}).to_list(None)
    if not students:
        print("❌  No students found. Run seed_extended.py first.")
        return
    print(f"✅  Found {len(students)} students")

    # ── Clear existing interventions & gaps ──────────────────
    await db.interventions.delete_many({"teacher_id": teacher_id})
    await db.learning_gaps.delete_many({})
    print("🗑️   Cleared old interventions and learning gaps")

    # ── Seed learning gaps ───────────────────────────────────
    gap_definitions = [
        {"subject": "Math",    "topic": "Fractions",         "severity": "high",     "recommended_time": "3 hours"},
        {"subject": "Math",    "topic": "Algebra Basics",    "severity": "critical",  "recommended_time": "5 hours"},
        {"subject": "Science", "topic": "Newton's Laws",     "severity": "medium",   "recommended_time": "2 hours"},
        {"subject": "English", "topic": "Grammar - Tenses",  "severity": "high",     "recommended_time": "2 hours"},
        {"subject": "Math",    "topic": "Linear Equations",  "severity": "critical",  "recommended_time": "4 hours"},
    ]

    gap_count = 0
    for i, stu in enumerate(students):
        sid = str(stu["_id"])
        # Give each student 2-3 gaps
        for gd in gap_definitions[i % 3 : (i % 3) + 3]:
            await db.learning_gaps.insert_one({
                "student_id":       sid,
                "school_id":        stu.get("school_id", ""),
                "subject":          gd["subject"],
                "topic":            gd["topic"],
                "severity":         gd["severity"],
                "recommended_time": gd["recommended_time"],
                "resolved":         False,
                "created_at":       datetime.utcnow().isoformat(),
            })
            gap_count += 1

    print(f"✅  Seeded {gap_count} learning gaps")

    # ── Seed interventions ───────────────────────────────────
    intervention_data = [
        {
            "student":         students[0],
            "priority":        "urgent",
            "performance_drop": 28,
            "previous_score":  75,
            "current_score":   47,
            "score_history":   [75, 70, 65, 58, 47],
            "issues": [
                "Score dropped by 28% in the last 2 weeks",
                "Missed 3 consecutive homework assignments",
                "Critical gap in Algebra Basics",
            ],
            "tags": ["PERFORMANCE DROP", "MULTIPLE TRIGGERS", "NEW"],
        },
        {
            "student":         students[1],
            "priority":        "urgent",
            "performance_drop": 20,
            "previous_score":  80,
            "current_score":   60,
            "score_history":   [80, 78, 72, 68, 60],
            "issues": [
                "Score dropped by 20% this month",
                "Critical gap in Linear Equations",
            ],
            "tags": ["PERFORMANCE DROP", "NEW"],
        },
        {
            "student":         students[2] if len(students) > 2 else students[0],
            "priority":        "important",
            "performance_drop": 12,
            "previous_score":  72,
            "current_score":   60,
            "score_history":   [72, 70, 67, 63, 60],
            "issues": [
                "Consistent decline over 3 weeks",
                "High severity gap in Fractions",
            ],
            "tags": ["DECLINING TREND"],
        },
        {
            "student":         students[3] if len(students) > 3 else students[0],
            "priority":        "important",
            "performance_drop": 8,
            "previous_score":  85,
            "current_score":   77,
            "score_history":   [85, 83, 80, 79, 77],
            "issues": [
                "Slight performance decline",
                "High severity gap in Grammar - Tenses",
            ],
            "tags": ["MONITOR"],
        },
        {
            "student":         students[4] if len(students) > 4 else students[0],
            "priority":        "routine",
            "performance_drop": 5,
            "previous_score":  78,
            "current_score":   73,
            "score_history":   [78, 77, 76, 74, 73],
            "issues": [
                "Minor dip — routine check-in recommended",
            ],
            "tags": ["ROUTINE"],
        },
    ]

    inserted = 0
    for item in intervention_data:
        stu = item["student"]
        sid = str(stu["_id"])
        await db.interventions.insert_one({
            "teacher_id":       teacher_id,
            "student_id":       sid,
            "student_name":     stu.get("name", "Student"),
            "student_class":    stu.get("class_name", stu.get("class", "")),
            "priority":         item["priority"],
            "performance_drop": item["performance_drop"],
            "previous_score":   item["previous_score"],
            "current_score":    item["current_score"],
            "score_history":    item["score_history"],
            "issues":           item["issues"],
            "message":          item["issues"][0],
            "tags":             item["tags"],
            "status":           "New",
            "resolved":         False,
            "snoozed":          False,
            "private_note":     "",
            "created_at":       datetime.utcnow().isoformat(),
        })
        inserted += 1
        print(f"   ✓ Intervention for {stu.get('name')} ({item['priority']})")

    print(f"\n✅  Seeded {inserted} interventions")
    print(f"\n🎉  Done! Run: python test_interventions.py to verify")

if __name__ == "__main__":
    asyncio.run(main())
