"""
Extended Seed Script — fills all missing collections that the frontend needs.

Run AFTER seed_data.py:
    python seed_extended.py

Collections seeded:
  - learning_gaps        (student learning gaps for LearningGaps/Hub/Remediation/Quiz)
  - gap_quizzes          (quiz linked to each gap)
  - schedules            (teacher daily schedule)
  - exams                (upcoming exams for students)
  - revision_tasks       (exam prep revision tasks)
  - tasks                (student daily tasks for Home dashboard)
  - doubt_history        (Vin AI conversation history)
  - messages             (teacher→parent messages)
  - interventions        (teacher intervention alerts)
  - mastery_heatmap      (topic mastery per student per topic)
  - career_domains       (career explorer domains)
  - careers              (career details per domain)
  - homework_submissions (additional submissions for realistic data)
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

async def seed_extended():
    client = AsyncIOMotorClient(MONGO_URL)
    db = client[DB_NAME]

    # ── Load existing IDs from DB ─────────────────────────────
    print("🔍 Loading existing users...")
    students  = await db.users.find({"role": "student"}).to_list(None)
    teachers  = await db.users.find({"role": "teacher"}).to_list(None)
    parents   = await db.users.find({"role": "parent"}).to_list(None)
    sections  = await db.sections.find({}).to_list(None)
    hw_list   = await db.homework.find({}).to_list(None)

    if not students:
        print("❌ No students found. Run seed_data.py first.")
        client.close()
        return

    # Build lookup maps
    stu_by_name  = {s["name"]: s for s in students}
    tea_by_name  = {t["name"]: t for t in teachers}
    sec_by_class = {s["class_name"]: s for s in sections}
    hw_by_title  = {h["title"]: h for h in hw_list}

    john  = tea_by_name.get("Mr. John Doe",      {})
    jane  = tea_by_name.get("Ms. Jane Smith",     {})
    robert= tea_by_name.get("Mr. Robert Johnson", {})
    alice = stu_by_name.get("Alice Johnson",  {})
    charlie=stu_by_name.get("Charlie Brown",  {})
    emma  = stu_by_name.get("Emma Wilson",    {})
    george= stu_by_name.get("George Davis",   {})
    ivy   = stu_by_name.get("Ivy Martinez",   {})
    kevin = stu_by_name.get("Kevin Lee",      {})
    lucy  = stu_by_name.get("Lucy Chen",      {})

    john_id   = str(john.get("_id", ""))
    jane_id   = str(jane.get("_id", ""))
    robert_id = str(robert.get("_id", ""))
    alice_id  = str(alice.get("_id", ""))
    charlie_id= str(charlie.get("_id", ""))
    emma_id   = str(emma.get("_id", ""))
    george_id = str(george.get("_id", ""))
    ivy_id    = str(ivy.get("_id", ""))
    kevin_id  = str(kevin.get("_id", ""))
    lucy_id   = str(lucy.get("_id", ""))

    sec_6a = str(sec_by_class.get("Grade 6-A", {}).get("_id", ""))
    sec_6b = str(sec_by_class.get("Grade 6-B", {}).get("_id", ""))
    sec_7a = str(sec_by_class.get("Grade 7-A", {}).get("_id", ""))

    print(f"   Found {len(students)} students, {len(teachers)} teachers, {len(parents)} parents")

    # ── Clear extended collections ────────────────────────────
    print("\n🗑️  Clearing extended collections...")
    for col in ["learning_gaps","gap_quizzes","schedules","exams","revision_tasks",
                "tasks","doubt_history","messages","interventions","mastery_heatmap",
                "career_domains","careers"]:
        await db[col].delete_many({})
    print("   ✓ Cleared")

    # ── 1. LEARNING GAPS ─────────────────────────────────────
    print("\n📉 Seeding learning gaps...")
    gap_definitions = [
        {"topic": "Fractions & Decimals",    "subject": "Mathematics", "severity": "critical", "score": 38},
        {"topic": "Algebra Basics",          "subject": "Mathematics", "severity": "moderate", "score": 55},
        {"topic": "Cell Biology",            "subject": "Science",     "severity": "critical", "score": 32},
        {"topic": "Newton's Laws",           "subject": "Science",     "severity": "minor",    "score": 68},
        {"topic": "Grammar & Tenses",        "subject": "English",     "severity": "minor",    "score": 72},
        {"topic": "Ancient Civilizations",   "subject": "SST",         "severity": "moderate", "score": 51},
    ]
    gap_ids = {}  # (student_id, topic) -> gap_id
    for stu in students:
        sid = str(stu["_id"])
        for gd in gap_definitions[:4]:  # each student gets 4 gaps
            r = await db.learning_gaps.insert_one({
                "student_id":  sid,
                "school_id":   stu.get("school_id", ""),
                "topic":       gd["topic"],
                "subject":     gd["subject"],
                "severity":    gd["severity"],
                "score":       gd["score"],
                "resolved":    False,
                "subtopic":    f"Core concepts in {gd['topic']}",
                "identifiedFrom": {"title": "Homework Analysis", "id": "hw001"},
                "impactAnalysis": f"Affects performance in {gd['subject']} assessments",
                "impactSubject": gd["subject"],
                "prerequisiteDependency": f"Requires understanding of basic {gd['subject']} concepts",
                "prerequisiteSubject": gd["subject"],
                "masteryPercent": gd["score"],
                "correctivePath": [
                    {"type": "video",    "label": "Watch Explanation", "icon": "play_circle"},
                    {"type": "practice", "label": "Practice Problems",  "icon": "quiz"},
                ],
                "aiLastFeedback": f"Focus on the core definition of {gd['topic']} before attempting problems.",
                "retryQuestion": {
                    "text": f"Solve this {gd['topic']} problem step by step.",
                    "equation": None,
                },
                "created_at": datetime.utcnow().isoformat(),
            })
            gap_ids[(sid, gd["topic"])] = str(r.inserted_id)
    print(f"   ✓ {len(students) * 4} learning gaps created")

    # ── 2. GAP QUIZZES ───────────────────────────────────────
    print("\n📝 Seeding gap quizzes...")
    quiz_templates = {
        "Fractions & Decimals": {
            "questions": [
                {"id": "gq1", "text": "What is 3/4 + 1/4?", "options": [
                    {"id": "a", "text": "1",    "is_correct": True},
                    {"id": "b", "text": "4/8",  "is_correct": False},
                    {"id": "c", "text": "2/4",  "is_correct": False},
                    {"id": "d", "text": "3/8",  "is_correct": False},
                ], "correct_option_id": "a"},
                {"id": "gq2", "text": "Convert 0.75 to a fraction.", "options": [
                    {"id": "a", "text": "3/4",  "is_correct": True},
                    {"id": "b", "text": "7/5",  "is_correct": False},
                    {"id": "c", "text": "75/10","is_correct": False},
                    {"id": "d", "text": "1/4",  "is_correct": False},
                ], "correct_option_id": "a"},
                {"id": "gq3", "text": "Which is larger: 2/3 or 3/4?", "options": [
                    {"id": "a", "text": "2/3",  "is_correct": False},
                    {"id": "b", "text": "3/4",  "is_correct": True},
                    {"id": "c", "text": "Equal","is_correct": False},
                    {"id": "d", "text": "Cannot compare","is_correct": False},
                ], "correct_option_id": "b"},
                {"id": "gq4", "text": "What is 1/2 × 4/5?", "options": [
                    {"id": "a", "text": "4/10", "is_correct": True},
                    {"id": "b", "text": "5/10", "is_correct": False},
                    {"id": "c", "text": "2/5",  "is_correct": False},
                    {"id": "d", "text": "6/10", "is_correct": False},
                ], "correct_option_id": "a"},
            ]
        },
        "Algebra Basics": {
            "questions": [
                {"id": "gq1", "text": "Solve: 2x = 10", "options": [
                    {"id": "a", "text": "x=4",  "is_correct": False},
                    {"id": "b", "text": "x=5",  "is_correct": True},
                    {"id": "c", "text": "x=6",  "is_correct": False},
                    {"id": "d", "text": "x=20", "is_correct": False},
                ], "correct_option_id": "b"},
                {"id": "gq2", "text": "What is the value of 3y - 2 when y = 4?", "options": [
                    {"id": "a", "text": "10",   "is_correct": True},
                    {"id": "b", "text": "12",   "is_correct": False},
                    {"id": "c", "text": "14",   "is_correct": False},
                    {"id": "d", "text": "8",    "is_correct": False},
                ], "correct_option_id": "a"},
                {"id": "gq3", "text": "Simplify: 4a + 3a", "options": [
                    {"id": "a", "text": "7a",   "is_correct": True},
                    {"id": "b", "text": "12a",  "is_correct": False},
                    {"id": "c", "text": "7",    "is_correct": False},
                    {"id": "d", "text": "a7",   "is_correct": False},
                ], "correct_option_id": "a"},
                {"id": "gq4", "text": "Solve: x + 7 = 15", "options": [
                    {"id": "a", "text": "x=6",  "is_correct": False},
                    {"id": "b", "text": "x=7",  "is_correct": False},
                    {"id": "c", "text": "x=8",  "is_correct": True},
                    {"id": "d", "text": "x=22", "is_correct": False},
                ], "correct_option_id": "c"},
            ]
        },
        "Cell Biology": {
            "questions": [
                {"id": "gq1", "text": "What controls all cell activities?", "options": [
                    {"id": "a", "text": "Cell wall",  "is_correct": False},
                    {"id": "b", "text": "Nucleus",    "is_correct": True},
                    {"id": "c", "text": "Vacuole",    "is_correct": False},
                    {"id": "d", "text": "Ribosome",   "is_correct": False},
                ], "correct_option_id": "b"},
                {"id": "gq2", "text": "Which organelle produces energy?", "options": [
                    {"id": "a", "text": "Golgi body",      "is_correct": False},
                    {"id": "b", "text": "Mitochondria",    "is_correct": True},
                    {"id": "c", "text": "Lysosome",        "is_correct": False},
                    {"id": "d", "text": "Endoplasmic reticulum","is_correct": False},
                ], "correct_option_id": "b"},
                {"id": "gq3", "text": "Plant cells have ___ but animal cells do not.", "options": [
                    {"id": "a", "text": "Nucleus",    "is_correct": False},
                    {"id": "b", "text": "Cell wall",  "is_correct": True},
                    {"id": "c", "text": "Cytoplasm",  "is_correct": False},
                    {"id": "d", "text": "Ribosome",   "is_correct": False},
                ], "correct_option_id": "b"},
                {"id": "gq4", "text": "What is the basic unit of life?", "options": [
                    {"id": "a", "text": "Tissue",  "is_correct": False},
                    {"id": "b", "text": "Organ",   "is_correct": False},
                    {"id": "c", "text": "Cell",    "is_correct": True},
                    {"id": "d", "text": "Molecule","is_correct": False},
                ], "correct_option_id": "c"},
            ]
        },
        "Newton's Laws": {
            "questions": [
                {"id": "gq1", "text": "Newton's first law is also called the law of?", "options": [
                    {"id": "a", "text": "Gravity",  "is_correct": False},
                    {"id": "b", "text": "Inertia",  "is_correct": True},
                    {"id": "c", "text": "Motion",   "is_correct": False},
                    {"id": "d", "text": "Friction", "is_correct": False},
                ], "correct_option_id": "b"},
                {"id": "gq2", "text": "F = ma is Newton's ___ law.", "options": [
                    {"id": "a", "text": "First",  "is_correct": False},
                    {"id": "b", "text": "Second", "is_correct": True},
                    {"id": "c", "text": "Third",  "is_correct": False},
                    {"id": "d", "text": "Fourth", "is_correct": False},
                ], "correct_option_id": "b"},
                {"id": "gq3", "text": "Action and reaction forces act on?", "options": [
                    {"id": "a", "text": "Same object",       "is_correct": False},
                    {"id": "b", "text": "Different objects", "is_correct": True},
                    {"id": "c", "text": "No object",         "is_correct": False},
                    {"id": "d", "text": "Depends on mass",   "is_correct": False},
                ], "correct_option_id": "b"},
                {"id": "gq4", "text": "A book on a table is at rest. This is an example of?", "options": [
                    {"id": "a", "text": "Newton's 2nd law", "is_correct": False},
                    {"id": "b", "text": "Newton's 3rd law", "is_correct": False},
                    {"id": "c", "text": "Newton's 1st law", "is_correct": True},
                    {"id": "d", "text": "Gravity only",     "is_correct": False},
                ], "correct_option_id": "c"},
            ]
        },
    }
    quiz_ids = {}
    for stu in students:
        sid = str(stu["_id"])
        for topic, qdata in quiz_templates.items():
            gap_id = gap_ids.get((sid, topic))
            if not gap_id:
                continue
            r = await db.gap_quizzes.insert_one({
                "gap_id":     gap_id,
                "student_id": sid,
                "topic":      topic,
                "questions":  qdata["questions"],
                "created_at": datetime.utcnow().isoformat(),
            })
            quiz_ids[(sid, topic)] = str(r.inserted_id)
    print(f"   ✓ Gap quizzes created for all students")

    # ── 3. TEACHER SCHEDULES ─────────────────────────────────
    print("\n📅 Seeding teacher schedules...")
    today = datetime.utcnow().strftime("%Y-%m-%d")
    schedule_docs = [
        {"teacher_id": john_id,   "class": "Grade 6-A", "subject": "Mathematics", "topic": "Fractions & Decimals",  "time": "08:00 AM", "end_time": "09:00 AM", "room": "Room 101", "status": "upcoming", "date": today},
        {"teacher_id": john_id,   "class": "Grade 6-B", "subject": "Science",     "topic": "Newton's Laws",         "time": "10:00 AM", "end_time": "11:00 AM", "room": "Room 102", "status": "upcoming", "date": today},
        {"teacher_id": john_id,   "class": "Grade 7-A", "subject": "Mathematics", "topic": "Algebra Basics",        "time": "01:00 PM", "end_time": "02:00 PM", "room": "Room 101", "status": "upcoming", "date": today},
        {"teacher_id": jane_id,   "class": "Grade 6-A", "subject": "English",     "topic": "Grammar & Tenses",      "time": "09:00 AM", "end_time": "10:00 AM", "room": "Room 103", "status": "upcoming", "date": today},
        {"teacher_id": jane_id,   "class": "Grade 7-A", "subject": "English",     "topic": "Creative Writing",      "time": "11:00 AM", "end_time": "12:00 PM", "room": "Room 103", "status": "upcoming", "date": today},
        {"teacher_id": robert_id, "class": "Grade 6-A", "subject": "SST",         "topic": "Ancient Civilizations", "time": "02:00 PM", "end_time": "03:00 PM", "room": "Room 104", "status": "upcoming", "date": today},
    ]
    await db.schedules.insert_many(schedule_docs)
    print(f"   ✓ {len(schedule_docs)} schedule entries created")

    # ── 4. EXAMS ─────────────────────────────────────────────
    print("\n📋 Seeding upcoming exams...")
    exam_docs = [
        {
            "section_id": sec_6a,
            "assigned_students": [alice_id, charlie_id, emma_id],
            "subject": "Mathematics",
            "exam_type": "Unit Test 3",
            "exam_date": (datetime.utcnow() + timedelta(days=9)).strftime("%Y-%m-%d"),
            "days_left": 9,
            "syllabus": ["Fractions & Decimals", "Algebra Basics", "Ratios & Proportions"],
            "readiness_percent": 62,
            "color": "from-[#695be6] to-[#8e82f3]",
            "created_by": john_id,
        },
        {
            "section_id": sec_6a,
            "assigned_students": [alice_id, charlie_id, emma_id],
            "subject": "Science",
            "exam_type": "Mid-Term",
            "exam_date": (datetime.utcnow() + timedelta(days=14)).strftime("%Y-%m-%d"),
            "days_left": 14,
            "syllabus": ["Cell Biology", "Newton's Laws", "Light & Optics"],
            "readiness_percent": 45,
            "color": "from-blue-400 to-indigo-500",
            "created_by": john_id,
        },
        {
            "section_id": sec_7a,
            "assigned_students": [kevin_id, lucy_id],
            "subject": "English",
            "exam_type": "Unit Test 3",
            "exam_date": (datetime.utcnow() + timedelta(days=7)).strftime("%Y-%m-%d"),
            "days_left": 7,
            "syllabus": ["Grammar & Tenses", "Creative Writing", "Comprehension"],
            "readiness_percent": 78,
            "color": "from-emerald-400 to-teal-500",
            "created_by": jane_id,
        },
    ]
    await db.exams.insert_many(exam_docs)
    print(f"   ✓ {len(exam_docs)} exams created")

    # ── 5. REVISION TASKS ────────────────────────────────────
    print("\n✅ Seeding revision tasks...")
    revision_task_templates = [
        {"subject": "Mathematics", "topic": "Fractions Practice Set",      "duration": "30 min", "priority": "high",   "done": False},
        {"subject": "Science",     "topic": "Cell Biology Diagram Review",  "duration": "25 min", "priority": "high",   "done": False},
        {"subject": "Mathematics", "topic": "Algebra Equations Practice",   "duration": "20 min", "priority": "medium", "done": True},
        {"subject": "English",     "topic": "Tenses Worksheet",             "duration": "15 min", "priority": "medium", "done": False},
        {"subject": "Science",     "topic": "Newton's Laws MCQ Set",        "duration": "20 min", "priority": "high",   "done": False},
        {"subject": "SST",         "topic": "Ancient Civilizations Notes",  "duration": "30 min", "priority": "low",    "done": True},
    ]
    for stu in students:
        sid = str(stu["_id"])
        for i, t in enumerate(revision_task_templates):
            await db.revision_tasks.insert_one({
                "student_id": sid,
                "id": f"rt{i+1}_{sid[:6]}",
                **t,
                "created_at": datetime.utcnow().isoformat(),
            })
    print(f"   ✓ {len(revision_task_templates)} revision tasks per student")

    # ── 6. STUDENT DAILY TASKS ───────────────────────────────
    print("\n📌 Seeding student daily tasks...")
    task_templates = [
        {"subject": "Mathematics", "title": "Complete Fractions Homework",       "duration": "30 min", "done": False},
        {"subject": "Science",     "title": "Read Chapter 4 - Cell Biology",     "duration": "20 min", "done": False},
        {"subject": "English",     "title": "Write a short paragraph on nature", "duration": "15 min", "done": True},
        {"subject": "Revision",    "title": "Review Newton's Laws notes",        "duration": "25 min", "done": False},
    ]
    for stu in students:
        sid = str(stu["_id"])
        for t in task_templates:
            await db.tasks.insert_one({
                "student_id": sid,
                **t,
                "created_at": datetime.utcnow().isoformat(),
            })
    print(f"   ✓ {len(task_templates)} daily tasks per student")

    # ── 7. DOUBT HISTORY (Vin AI) ────────────────────────────
    print("\n🤖 Seeding Vin AI doubt history...")
    doubt_templates = [
        {"subject": "Mathematics", "question": "How do I solve equations with fractions? I keep getting confused when the denominator is different.", "starred": False},
        {"subject": "Science",     "question": "Can you explain Newton's Third Law with a real-life example? I don't understand action-reaction pairs.", "starred": True},
        {"subject": "Mathematics", "question": "What is the difference between a variable and a constant in algebra?", "starred": False},
        {"subject": "English",     "question": "How do I identify the correct tense to use in a sentence? Past perfect vs simple past confuses me.", "starred": False},
        {"subject": "Science",     "question": "What is the function of the mitochondria in a cell? Why is it called the powerhouse?", "starred": True},
    ]
    times = ["2 days ago", "3 days ago", "Last week", "Last week", "2 weeks ago"]
    for stu in students:
        sid = str(stu["_id"])
        for i, d in enumerate(doubt_templates):
            await db.doubt_history.insert_one({
                "student_id":   sid,
                "subject":      d["subject"],
                "question":     d["question"],
                "starred":      d["starred"],
                "status":       "resolved",
                "relative_time": times[i],
                "created_at":   (datetime.utcnow() - timedelta(days=i*2)).isoformat(),
            })
    print(f"   ✓ {len(doubt_templates)} doubt history entries per student")

    # ── 8. TEACHER→PARENT MESSAGES ───────────────────────────
    print("\n💬 Seeding teacher-parent messages...")
    for parent in parents:
        pid = str(parent["_id"])
        children_ids = parent.get("children", [])
        for child_id in children_ids[:1]:  # message for first child
            child = await db.users.find_one({"_id": ObjectId(child_id)})
            child_name = child["name"] if child else "your child"
            await db.messages.insert_many([
                {
                    "teacher_id": john_id,
                    "student_id": child_id,
                    "message": f"Dear Parent, I wanted to share that {child_name} has been making great progress in Mathematics this week. Their homework completion rate has improved significantly. Please encourage them to keep up the good work!",
                    "direction": "teacher_to_parent",
                    "action_type": "appreciation",
                    "sent_at": (datetime.utcnow() - timedelta(days=1)).isoformat(),
                    "read": False,
                    "teacher_name": "Mr. John Doe",
                    "student_name": child_name,
                },
                {
                    "teacher_id": jane_id,
                    "student_id": child_id,
                    "message": f"Hi, I'm reaching out regarding {child_name}'s English assignment. They missed submitting the grammar worksheet due yesterday. Please remind them to submit it by tomorrow. Thank you!",
                    "direction": "teacher_to_parent",
                    "action_type": "reminder",
                    "sent_at": (datetime.utcnow() - timedelta(days=3)).isoformat(),
                    "read": True,
                    "teacher_name": "Ms. Jane Smith",
                    "student_name": child_name,
                },
            ])
    print(f"   ✓ Messages seeded for all parents")

    # ── 9. TEACHER INTERVENTIONS ─────────────────────────────
    print("\n⚠️  Seeding teacher interventions...")
    intervention_students = [
        (alice_id,  "Alice Johnson",  "Grade 6-A", "urgent",    28, 75, 47, [75,70,65,58,47]),
        (charlie_id,"Charlie Brown",  "Grade 6-A", "important", 15, 80, 65, [80,78,72,68,65]),
        (george_id, "George Davis",   "Grade 6-B", "routine",    8, 70, 62, [70,68,65,63,62]),
    ]
    for sid, sname, sclass, priority, drop, prev, curr, history in intervention_students:
        await db.interventions.insert_one({
            "teacher_id":      john_id,
            "student_id":      sid,
            "student_name":    sname,
            "student_class":   sclass,
            "priority":        priority,
            "performance_drop": drop,
            "previous_score":  prev,
            "current_score":   curr,
            "score_history":   history,
            "issues": [
                f"Score dropped by {drop}% in the last 2 weeks",
                "Missed 2 consecutive homework assignments",
            ],
            "message": f"Performance dropped by {drop}% — needs attention",
            "status":  "New",
            "resolved": False,
            "tags": ["PERFORMANCE DROP"] + (["NEW"] if priority == "urgent" else []),
            "created_at": datetime.utcnow().isoformat(),
        })
    print(f"   ✓ {len(intervention_students)} interventions created")

    # ── 10. TOPIC MASTERY HEATMAP ────────────────────────────
    print("\n🔥 Seeding topic mastery heatmap...")
    mastery_topics = [
        "Linear Equations", "Fractions", "Algebra Basics", "Ratios",
        "Percentages", "Cell Biology", "Newton's Laws", "Grammar",
    ]
    import random
    random.seed(42)
    for stu in students:
        sid = str(stu["_id"])
        sec_id = stu.get("section_id", "")
        scores = []
        for topic in mastery_topics:
            # Vary scores realistically
            base = random.randint(30, 95)
            scores.append(base)
        avg = round(sum(scores) / len(scores))
        await db.mastery_heatmap.insert_one({
            "student_id":  sid,
            "section_id":  sec_id,
            "student_name": stu["name"],
            "topics":      mastery_topics,
            "scores":      scores,
            "topic_scores": scores,
            "avg_score":   avg,
            "avg":         avg,
            "updated_at":  datetime.utcnow().isoformat(),
        })
    print(f"   ✓ Mastery heatmap for {len(students)} students")

    # ── 11. ADDITIONAL HOMEWORK SUBMISSIONS ──────────────────
    print("\n📋 Seeding additional homework submissions...")
    algebra_hw_id = hw_by_title.get("Algebra Basics - Chapter 3", {}).get("_id")
    forces_hw_id  = hw_by_title.get("Forces & Motion Quiz", {}).get("_id")
    english_hw_id = hw_by_title.get("English Grammar - Tenses", {}).get("_id")

    if algebra_hw_id:
        # Charlie submits algebra (partial)
        await db.homework_submissions.insert_one({
            "homework_id": str(algebra_hw_id),
            "student_id":  charlie_id,
            "section_id":  sec_6a,
            "answers": [
                {"question_id": "q1", "type": "mcq", "selected": 1},
                {"question_id": "q2", "type": "mcq", "selected": 0},  # wrong
                {"question_id": "q3", "type": "typed", "text": "A variable is a symbol that can change."},
            ],
            "mcq_score": 1, "mcq_total": 2,
            "auto_score_pct": 50,
            "status": "submitted",
            "submitted_at": datetime.utcnow().isoformat(),
        })

    if forces_hw_id:
        # George submits forces quiz
        await db.homework_submissions.insert_one({
            "homework_id": str(forces_hw_id),
            "student_id":  george_id,
            "section_id":  sec_6b,
            "answers": [
                {"question_id": "q1", "type": "mcq", "selected": 1},
                {"question_id": "q2", "type": "mcq", "selected": 2},
                {"question_id": "q3", "type": "typed", "text": "When I push a wall, the wall pushes me back with equal force."},
            ],
            "mcq_score": 2, "mcq_total": 2,
            "auto_score_pct": 90,
            "status": "submitted",
            "submitted_at": datetime.utcnow().isoformat(),
        })

    if english_hw_id:
        # Kevin submits English
        await db.homework_submissions.insert_one({
            "homework_id": str(english_hw_id),
            "student_id":  kevin_id,
            "section_id":  sec_7a,
            "answers": [
                {"question_id": "q1", "type": "mcq", "selected": 2},
                {"question_id": "q2", "type": "mcq", "selected": 2},
                {"question_id": "q3", "type": "typed", "text": "I went to school. I am studying now. I will go home later."},
            ],
            "mcq_score": 2, "mcq_total": 2,
            "auto_score_pct": 88,
            "status": "submitted",
            "submitted_at": datetime.utcnow().isoformat(),
        })
    print("   ✓ Additional submissions created")

    # ── 12. CAREER DOMAINS & CAREERS ─────────────────────────
    print("\n🎯 Seeding career domains and careers...")
    domain_docs = [
        {"id": "tech",       "label": "Technology & Engineering", "icon": "developer_board",  "description": "Shaping the future through code, robotics, and complex systems.",   "color": "from-[#695be6] to-[#8e82f3]"},
        {"id": "medical",    "label": "Medical & Health",         "icon": "medical_services", "description": "Dedicated to healing, wellness, and medical breakthroughs.",         "color": "from-emerald-400 to-teal-500"},
        {"id": "government", "label": "Government & Defence",     "icon": "account_balance",  "description": "Serving the nation and ensuring global security and stability.",      "color": "from-blue-500 to-indigo-600"},
        {"id": "business",   "label": "Business & Finance",       "icon": "payments",         "description": "Driving the global economy and strategic corporate growth.",          "color": "from-amber-400 to-orange-500"},
        {"id": "law",        "label": "Law & Policy",             "icon": "gavel",            "description": "Upholding justice and shaping the regulations of society.",           "color": "from-slate-500 to-slate-700"},
        {"id": "education",  "label": "Education & Research",     "icon": "school",           "description": "Cultivating knowledge and leading scientific innovation.",            "color": "from-pink-400 to-rose-500"},
        {"id": "arts",       "label": "Arts, Media & Design",     "icon": "palette",          "description": "Expressing creativity through visual and digital stories.",           "color": "from-purple-400 to-fuchsia-500"},
        {"id": "social",     "label": "Social & Environment",     "icon": "eco",              "description": "Protecting the planet and empowering global communities.",            "color": "from-green-400 to-emerald-600"},
        {"id": "infra",      "label": "Infrastructure & Travel",  "icon": "flight",           "description": "Connecting the world through logistics and movement.",                "color": "from-sky-400 to-blue-500"},
        {"id": "sports",     "label": "Sports & Events",          "icon": "sports_soccer",    "description": "Managing high-level competition and global entertainment.",           "color": "from-red-400 to-rose-600"},
    ]
    await db.career_domains.insert_many(domain_docs)

    from careers_data import CAREERS_DATA
    career_docs = CAREERS_DATA
    await db.careers.insert_many(career_docs)
    print(f"   ✓ {len(domain_docs)} career domains, {len(career_docs)} career details")

    # ── 13. STUDENT NOTIFICATIONS ────────────────────────────
    print("\n🔔 Seeding student notifications...")
    for stu in students:
        sid = str(stu["_id"])
        await db.notifications.insert_many([
            {"user_id": sid, "student_id": sid, "type": "homework_new",   "title": "New Homework Assigned",    "desc": "Algebra Basics - Chapter 3 has been assigned.", "time": "2 hours ago",  "read": False, "created_at": datetime.utcnow().isoformat()},
            {"user_id": sid, "student_id": sid, "type": "homework_due",   "title": "Homework Due Tomorrow",    "desc": "Forces & Motion Quiz is due tomorrow.",          "time": "5 hours ago",  "read": False, "created_at": datetime.utcnow().isoformat()},
            {"user_id": sid, "student_id": sid, "type": "achievement",    "title": "Achievement Unlocked! 🎉", "desc": "You scored 90%+ on Science quiz. Great work!",   "time": "Yesterday",    "read": True,  "created_at": (datetime.utcnow() - timedelta(days=1)).isoformat()},
            {"user_id": sid, "student_id": sid, "type": "teacher_message","title": "Message from Mr. John Doe","desc": "Keep up the great work on your algebra practice!", "time": "2 days ago",   "read": True,  "created_at": (datetime.utcnow() - timedelta(days=2)).isoformat()},
        ])
    print(f"   ✓ Student notifications seeded")

    # ── SUMMARY ──────────────────────────────────────────────
    print("\n" + "="*60)
    print("✅ EXTENDED SEED COMPLETE!")
    print("="*60)
    print("\nCollections seeded:")
    print(f"  learning_gaps:    {len(students) * 4} gaps ({len(students)} students × 4 gaps)")
    print(f"  gap_quizzes:      {len(students) * 4} quizzes")
    print(f"  schedules:        {len(schedule_docs)} entries")
    print(f"  exams:            {len(exam_docs)} upcoming exams")
    print(f"  revision_tasks:   {len(revision_task_templates)} per student")
    print(f"  tasks:            {len(task_templates)} per student")
    print(f"  doubt_history:    {len(doubt_templates)} per student")
    print(f"  messages:         teacher→parent messages")
    print(f"  interventions:    {len(intervention_students)} alerts")
    print(f"  mastery_heatmap:  {len(students)} student records")
    print(f"  career_domains:   {len(domain_docs)}")
    print(f"  careers:          {len(career_docs)}")
    print(f"  notifications:    4 per student")
    print("\n🎯 Frontend pages now have real data:")
    print("  ✓ Student Home — tasks, homework")
    print("  ✓ Student Homework — real assignments")
    print("  ✓ Student LearningGaps — real gaps with quizzes")
    print("  ✓ Student ExamPrep — real exams + revision tasks")
    print("  ✓ Student VinAI — real doubt history")
    print("  ✓ Student Notifications — real notifications")
    print("  ✓ Teacher Home — real schedule + submissions")
    print("  ✓ Teacher InterventionAlerts — real interventions")
    print("  ✓ Teacher TopicMastery — real heatmap data")
    print("  ✓ Teacher ParentCommunication — real messages")
    print("  ✓ Parent Notifications — real notifications + messages")
    print("  ✓ Career Explorer — real domains + career details")
    print("\n")
    client.close()


if __name__ == "__main__":
    asyncio.run(seed_extended())
