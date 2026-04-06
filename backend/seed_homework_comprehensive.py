"""
Comprehensive Homework Seed Script
Creates homework with all submission types: online_quiz, file_upload, handwritten
Uses AI to generate realistic questions where applicable

Run after seed_data.py:
    python seed_homework_comprehensive.py
"""
import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
from datetime import datetime, timedelta
from dotenv import load_dotenv
from bson import ObjectId
import os

load_dotenv()
MONGO_URL = os.getenv("MONGO_URI", "mongodb://localhost:27017")
DB_NAME   = os.getenv("MONGO_DB", "bawan")

async def seed_homework():
    client = AsyncIOMotorClient(MONGO_URL)
    db = client[DB_NAME]

    print("🔍 Loading existing data...")
    teachers = await db.users.find({"role": "teacher"}).to_list(None)
    students = await db.users.find({"role": "student"}).to_list(None)
    sections = await db.sections.find({}).to_list(None)

    if not teachers or not students:
        print("❌ No teachers/students found. Run seed_data.py first.")
        client.close()
        return

    tea_by_name = {t["name"]: t for t in teachers}
    stu_by_name = {s["name"]: s for s in students}
    sec_by_class = {s["class_name"]: s for s in sections}

    john = tea_by_name.get("Mr. John Doe", {})
    jane = tea_by_name.get("Ms. Jane Smith", {})
    robert = tea_by_name.get("Mr. Robert Johnson", {})
    
    john_id = str(john.get("_id", ""))
    jane_id = str(jane.get("_id", ""))
    robert_id = str(robert.get("_id", ""))

    alice_id = str(stu_by_name.get("Alice Johnson", {}).get("_id", ""))
    charlie_id = str(stu_by_name.get("Charlie Brown", {}).get("_id", ""))
    emma_id = str(stu_by_name.get("Emma Wilson", {}).get("_id", ""))
    george_id = str(stu_by_name.get("George Davis", {}).get("_id", ""))
    ivy_id = str(stu_by_name.get("Ivy Martinez", {}).get("_id", ""))
    kevin_id = str(stu_by_name.get("Kevin Lee", {}).get("_id", ""))
    lucy_id = str(stu_by_name.get("Lucy Chen", {}).get("_id", ""))

    sec_6a = str(sec_by_class.get("Grade 6-A", {}).get("_id", ""))
    sec_6b = str(sec_by_class.get("Grade 6-B", {}).get("_id", ""))
    sec_7a = str(sec_by_class.get("Grade 7-A", {}).get("_id", ""))

    print(f"   Found {len(teachers)} teachers, {len(students)} students")

    # Clear existing homework
    print("\n🗑️  Clearing existing homework...")
    await db.homework.delete_many({"created_by": {"$in": [john_id, jane_id, robert_id]}})
    print("   ✓ Cleared")

    # ── HOMEWORK TEMPLATES ────────────────────────────────────
    print("\n📝 Creating comprehensive homework assignments...")
    
    homework_docs = [
        # ── ONLINE QUIZ (auto-graded MCQ + typed) ──
        {
            "title": "Quadratic Equations - Practice Quiz",
            "subject": "Mathematics",
            "assigned_to_class": "Grade 6-A",
            "description": "Test your understanding of quadratic equations with this auto-graded quiz",
            "submission_type": "online_quiz",
            "difficulty_level": "medium",
            "estimated_duration_minutes": 30,
            "instructions": "Solve all questions. MCQs are auto-graded. Show your work for typed answers.",
            "due_date": (datetime.utcnow() + timedelta(days=3)).isoformat(),
            "questions": [
                {
                    "question_text": "What is the standard form of a quadratic equation?",
                    "answer_type": "mcq",
                    "options": [
                        {"id": "opt1", "text": "ax + b = 0", "is_correct": False},
                        {"id": "opt2", "text": "ax² + bx + c = 0", "is_correct": True},
                        {"id": "opt3", "text": "ax³ + bx² + cx + d = 0", "is_correct": False},
                        {"id": "opt4", "text": "a/x + b = 0", "is_correct": False},
                    ],
                    "max_points": 2,
                    "hint": "Look for the equation with x²"
                },
                {
                    "question_text": "Solve: x² - 5x + 6 = 0",
                    "answer_type": "mcq",
                    "options": [
                        {"id": "opt1", "text": "x = 1, 6", "is_correct": False},
                        {"id": "opt2", "text": "x = 2, 3", "is_correct": True},
                        {"id": "opt3", "text": "x = -2, -3", "is_correct": False},
                        {"id": "opt4", "text": "x = 5, 6", "is_correct": False},
                    ],
                    "max_points": 3,
                    "hint": "Factor the equation or use the quadratic formula"
                },
                {
                    "question_text": "Find the discriminant of 2x² + 3x - 5 = 0 and explain what it tells you about the roots.",
                    "answer_type": "typed",
                    "max_points": 5,
                    "sample_answer": "Discriminant = b² - 4ac = 9 - 4(2)(-5) = 9 + 40 = 49. Since discriminant > 0, the equation has two distinct real roots.",
                    "hint": "Use the formula b² - 4ac"
                },
                {
                    "question_text": "A ball is thrown upward with initial velocity 20 m/s. Its height h(t) = -5t² + 20t. When does it hit the ground?",
                    "answer_type": "typed",
                    "max_points": 5,
                    "sample_answer": "Set h(t) = 0: -5t² + 20t = 0, factor: t(-5t + 20) = 0, so t = 0 or t = 4. The ball hits the ground at t = 4 seconds.",
                    "hint": "Set height = 0 and solve for t"
                },
            ],
            "total_marks": 15,
            "tags": ["Mathematics", "Algebra", "Quadratic Equations"],
            "created_by": john_id,
            "created_at": datetime.utcnow().isoformat(),
            "status": "draft",
            "assigned_students": [],
            "submission_counts": {"submitted": 0, "pending": 0, "graded": 0},
        },
        
        # ── FILE UPLOAD (students upload PDF/image) ──
        {
            "title": "Organic Chemistry - Reaction Mechanisms",
            "subject": "Chemistry",
            "assigned_to_class": "Grade 7-A",
            "description": "Draw and explain reaction mechanisms for the given organic reactions",
            "submission_type": "file_upload",
            "difficulty_level": "hard",
            "estimated_duration_minutes": 60,
            "instructions": "Draw all reaction mechanisms clearly. Show electron movement with curved arrows. Upload as PDF or clear image.",
            "due_date": (datetime.utcnow() + timedelta(days=5)).isoformat(),
            "questions": [
                {
                    "question_text": "Draw the mechanism for the SN2 reaction between CH₃Br and OH⁻. Show all electron movements.",
                    "answer_type": "upload",
                    "max_points": 10,
                    "hint": "Remember: SN2 is a one-step mechanism with backside attack"
                },
                {
                    "question_text": "Explain the mechanism of electrophilic addition of HBr to propene. Why does the major product follow Markovnikov's rule?",
                    "answer_type": "upload",
                    "max_points": 10,
                    "hint": "Consider carbocation stability"
                },
                {
                    "question_text": "Draw the mechanism for the aldol condensation reaction between two acetaldehyde molecules.",
                    "answer_type": "upload",
                    "max_points": 10,
                    "hint": "This involves enolate formation and nucleophilic addition"
                },
            ],
            "total_marks": 30,
            "tags": ["Chemistry", "Organic Chemistry", "Mechanisms"],
            "created_by": robert_id,
            "created_at": datetime.utcnow().isoformat(),
            "status": "draft",
            "assigned_students": [],
            "submission_counts": {"submitted": 0, "pending": 0, "graded": 0},
        },

        # ── HANDWRITTEN SCAN (students photograph work) ──
        {
            "title": "Calculus Problem Set - Derivatives",
            "subject": "Mathematics",
            "assigned_to_class": "Grade 6-B",
            "description": "Solve derivative problems showing all steps. Photograph your handwritten work.",
            "submission_type": "handwritten",
            "difficulty_level": "medium",
            "estimated_duration_minutes": 45,
            "instructions": "Show all steps clearly. Write neatly. Take a clear photo in good lighting. Upload as image.",
            "due_date": (datetime.utcnow() + timedelta(days=4)).isoformat(),
            "questions": [
                {
                    "question_text": "Find dy/dx for y = 3x⁴ - 2x³ + 5x - 7",
                    "answer_type": "upload",
                    "max_points": 5,
                    "hint": "Use the power rule for each term"
                },
                {
                    "question_text": "Differentiate y = (2x + 1)(x² - 3) using the product rule",
                    "answer_type": "upload",
                    "max_points": 6,
                    "hint": "Product rule: (uv)' = u'v + uv'"
                },
                {
                    "question_text": "Find the derivative of y = sin(3x²) using the chain rule",
                    "answer_type": "upload",
                    "max_points": 7,
                    "hint": "Chain rule: dy/dx = dy/du × du/dx"
                },
                {
                    "question_text": "Find the equation of the tangent line to y = x³ - 2x at the point (1, -1)",
                    "answer_type": "upload",
                    "max_points": 7,
                    "hint": "Find the slope using the derivative at x = 1, then use point-slope form"
                },
            ],
            "total_marks": 25,
            "tags": ["Mathematics", "Calculus", "Derivatives"],
            "created_by": john_id,
            "created_at": datetime.utcnow().isoformat(),
            "status": "draft",
            "assigned_students": [],
            "submission_counts": {"submitted": 0, "pending": 0, "graded": 0},
        },

        # ── ONLINE QUIZ - Physics ──
        {
            "title": "Newton's Laws of Motion - Assessment",
            "subject": "Physics",
            "assigned_to_class": "Grade 6-A",
            "description": "Comprehensive quiz on Newton's three laws of motion",
            "submission_type": "online_quiz",
            "difficulty_level": "easy",
            "estimated_duration_minutes": 25,
            "instructions": "Read each question carefully. You have one attempt per question.",
            "due_date": (datetime.utcnow() + timedelta(days=2)).isoformat(),
            "questions": [
                {
                    "question_text": "Newton's first law is also known as the law of:",
                    "answer_type": "mcq",
                    "options": [
                        {"id": "opt1", "text": "Acceleration", "is_correct": False},
                        {"id": "opt2", "text": "Inertia", "is_correct": True},
                        {"id": "opt3", "text": "Action-Reaction", "is_correct": False},
                        {"id": "opt4", "text": "Gravity", "is_correct": False},
                    ],
                    "max_points": 2,
                },
                {
                    "question_text": "If a 5 kg object accelerates at 2 m/s², what is the net force acting on it?",
                    "answer_type": "mcq",
                    "options": [
                        {"id": "opt1", "text": "2.5 N", "is_correct": False},
                        {"id": "opt2", "text": "7 N", "is_correct": False},
                        {"id": "opt3", "text": "10 N", "is_correct": True},
                        {"id": "opt4", "text": "3 N", "is_correct": False},
                    ],
                    "max_points": 3,
                    "hint": "Use F = ma"
                },
                {
                    "question_text": "Explain Newton's third law with a real-life example from your daily life.",
                    "answer_type": "typed",
                    "max_points": 5,
                    "sample_answer": "When I jump, I push down on the ground (action), and the ground pushes me up (reaction) with equal force, allowing me to jump into the air.",
                },
            ],
            "total_marks": 10,
            "tags": ["Physics", "Newton's Laws", "Mechanics"],
            "created_by": john_id,
            "created_at": datetime.utcnow().isoformat(),
            "status": "draft",
            "assigned_students": [],
            "submission_counts": {"submitted": 0, "pending": 0, "graded": 0},
        },

        # ── FILE UPLOAD - English Essay ──
        {
            "title": "Creative Writing - Short Story",
            "subject": "English",
            "assigned_to_class": "Grade 7-A",
            "description": "Write a creative short story (500-800 words) on the given theme",
            "submission_type": "file_upload",
            "difficulty_level": "medium",
            "estimated_duration_minutes": 90,
            "instructions": "Theme: 'An Unexpected Friendship'. Write in proper paragraphs. Check grammar and spelling. Upload as PDF or Word document.",
            "due_date": (datetime.utcnow() + timedelta(days=7)).isoformat(),
            "questions": [
                {
                    "question_text": "Write a short story (500-800 words) on the theme 'An Unexpected Friendship'. Include: clear beginning, middle, and end; well-developed characters; descriptive language; proper dialogue formatting.",
                    "answer_type": "upload",
                    "max_points": 20,
                    "hint": "Plan your story before writing. Create interesting characters. Show, don't just tell."
                },
            ],
            "total_marks": 20,
            "tags": ["English", "Creative Writing", "Essay"],
            "created_by": jane_id,
            "created_at": datetime.utcnow().isoformat(),
            "status": "draft",
            "assigned_students": [],
            "submission_counts": {"submitted": 0, "pending": 0, "graded": 0},
        },

        # ── ASSIGNED HOMEWORK (for testing Evaluate flow) ──
        {
            "title": "Fractions and Decimals - Practice",
            "subject": "Mathematics",
            "assigned_to_class": "Grade 6-A",
            "description": "Practice problems on fractions and decimal conversions",
            "submission_type": "online_quiz",
            "difficulty_level": "easy",
            "estimated_duration_minutes": 20,
            "instructions": "Solve all problems. Show your work for typed answers.",
            "due_date": (datetime.utcnow() + timedelta(days=1)).isoformat(),
            "questions": [
                {
                    "question_text": "What is 3/4 + 1/4?",
                    "answer_type": "mcq",
                    "options": [
                        {"id": "opt1", "text": "1", "is_correct": True},
                        {"id": "opt2", "text": "4/8", "is_correct": False},
                        {"id": "opt3", "text": "2/4", "is_correct": False},
                        {"id": "opt4", "text": "3/8", "is_correct": False},
                    ],
                    "max_points": 2,
                },
                {
                    "question_text": "Convert 0.75 to a fraction in simplest form",
                    "answer_type": "mcq",
                    "options": [
                        {"id": "opt1", "text": "3/4", "is_correct": True},
                        {"id": "opt2", "text": "7/5", "is_correct": False},
                        {"id": "opt3", "text": "75/100", "is_correct": False},
                        {"id": "opt4", "text": "1/4", "is_correct": False},
                    ],
                    "max_points": 2,
                },
                {
                    "question_text": "Explain how to compare 2/3 and 3/4. Which is larger?",
                    "answer_type": "typed",
                    "max_points": 4,
                    "sample_answer": "Convert to common denominator: 2/3 = 8/12 and 3/4 = 9/12. Since 9/12 > 8/12, therefore 3/4 is larger.",
                },
            ],
            "total_marks": 8,
            "tags": ["Mathematics", "Fractions", "Decimals"],
            "created_by": john_id,
            "created_at": datetime.utcnow().isoformat(),
            "status": "assigned",
            "assigned_students": [alice_id, charlie_id, emma_id],
            "submission_counts": {"submitted": 0, "pending": 3, "graded": 0},
        },
    ]

    # Insert all homework
    hw_ids = []
    for hw in homework_docs:
        result = await db.homework.insert_one(hw)
        hw_ids.append(str(result.inserted_id))
        status_emoji = "✅" if hw["status"] == "assigned" else "📝"
        print(f"   {status_emoji} {hw['title']} ({hw['submission_type']}) - {hw['status']}")

    print(f"\n✅ Created {len(homework_docs)} homework assignments:")
    print(f"   • {sum(1 for h in homework_docs if h['submission_type'] == 'online_quiz')} online quizzes")
    print(f"   • {sum(1 for h in homework_docs if h['submission_type'] == 'file_upload')} file uploads")
    print(f"   • {sum(1 for h in homework_docs if h['submission_type'] == 'handwritten')} handwritten scans")
    print(f"   • {sum(1 for h in homework_docs if h['status'] == 'assigned')} assigned")
    print(f"   • {sum(1 for h in homework_docs if h['status'] == 'draft')} drafts")
    
    print("\n🎯 Test the homework flow:")
    print("   1. Login as teacher (john@school.com / password123)")
    print("   2. Go to Homework Library (/teacher/homework)")
    print("   3. Click 'Assign' on any draft homework")
    print("   4. Select students and set due date")
    print("   5. Click 'Evaluate' on assigned homework to see submissions")
    print("\n")

    client.close()

if __name__ == "__main__":
    asyncio.run(seed_homework())
