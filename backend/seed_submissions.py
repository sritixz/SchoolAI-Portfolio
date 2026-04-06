"""Seed homework submissions for testing"""
import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
from dotenv import load_dotenv
from bson import ObjectId
from datetime import datetime, timedelta
import os

load_dotenv()
MONGO_URL = os.getenv("MONGO_URI", "mongodb://localhost:27017")
DB_NAME = os.getenv("MONGO_DB", "bawan")

async def seed_submissions():
    client = AsyncIOMotorClient(MONGO_URL)
    db = client[DB_NAME]

    # Get all assigned homework
    hw_list = await db.homework.find({"status": "assigned"}).to_list(None)
    students = await db.users.find({"role": "student"}).to_list(None)
    stu_by_id = {str(s["_id"]): s for s in students}

    print(f"Found {len(hw_list)} assigned homework, {len(students)} students")

    # Clear existing submissions
    await db.homework_submissions.delete_many({})
    print("Cleared existing submissions")

    submissions_created = 0

    for hw in hw_list:
        hw_id = str(hw["_id"])
        assigned_students = hw.get("assigned_students", [])
        questions = hw.get("questions", [])

        for i, student_id in enumerate(assigned_students):
            student = stu_by_id.get(student_id)
            if not student:
                continue

            # Vary submission status: first student submits, rest pending
            if i == 0:
                # Submitted with answers
                answers = {}
                score = 0
                for q in questions:
                    qid = q.get("id", str(q.get("_id", "")))
                    correct = q.get("correct", 0)
                    # Student gets it right 70% of the time
                    chosen = correct if i % 3 != 2 else (correct + 1) % len(q.get("options", ["a", "b"]))
                    answers[qid] = chosen
                    if chosen == correct:
                        score += 1

                total_q = len(questions) if questions else 1
                score_pct = round((score / total_q) * 100) if total_q > 0 else 75

                sub = {
                    "homework_id": hw_id,
                    "student_id": student_id,
                    "status": "submitted",
                    "submitted_at": (datetime.utcnow() - timedelta(hours=i+1)).isoformat(),
                    "answers": answers,
                    "auto_score_pct": score_pct,
                    "final_score_pct": None,
                    "teacher_feedback": None,
                    "file_urls": [],
                }
                await db.homework_submissions.insert_one(sub)
                submissions_created += 1
                print(f"  Submitted: {student.get('name')} -> {hw.get('title')} ({score_pct}%)")

            elif i == 1 and len(assigned_students) > 2:
                # Graded submission
                answers = {}
                for q in questions:
                    qid = q.get("id", str(q.get("_id", "")))
                    correct = q.get("correct", 0)
                    answers[qid] = correct  # Perfect score

                sub = {
                    "homework_id": hw_id,
                    "student_id": student_id,
                    "status": "graded",
                    "submitted_at": (datetime.utcnow() - timedelta(hours=i+3)).isoformat(),
                    "answers": answers,
                    "auto_score_pct": 90,
                    "final_score_pct": 88,
                    "teacher_feedback": "Great work! Keep it up.",
                    "file_urls": [],
                }
                await db.homework_submissions.insert_one(sub)
                submissions_created += 1
                print(f"  Graded: {student.get('name')} -> {hw.get('title')} (88%)")
            # else: pending (no submission doc)

    print(f"\nCreated {submissions_created} submissions")

    # Verify
    total = await db.homework_submissions.count_documents({})
    submitted = await db.homework_submissions.count_documents({"status": "submitted"})
    graded = await db.homework_submissions.count_documents({"status": "graded"})
    print(f"DB totals: {total} total, {submitted} submitted, {graded} graded")
    client.close()

if __name__ == "__main__":
    asyncio.run(seed_submissions())
