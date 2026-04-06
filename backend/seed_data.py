"""
MongoDB Seed Script for School Admin System
Creates a complete test school with realistic data

Usage:
    python seed_data.py

Make sure MongoDB is running and .env file has correct MONGO_URI
"""
import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
from passlib.context import CryptContext
from datetime import datetime
from dotenv import load_dotenv
from bson import ObjectId
import os

# Load environment variables
load_dotenv()

# Password hashing
pwd_ctx = CryptContext(schemes=["bcrypt"], deprecated="auto")

# MongoDB connection from .env
MONGO_URL = os.getenv("MONGO_URI", "mongodb://localhost:27017")
DB_NAME = os.getenv("MONGO_DB", "bawan")

async def seed_database():
    client = AsyncIOMotorClient(MONGO_URL)
    db = client[DB_NAME]
    
    print("🗑️  Clearing existing data...")
    await db.users.delete_many({})
    await db.grades.delete_many({})
    await db.sections.delete_many({})
    await db.subject_assignments.delete_many({})
    await db.change_logs.delete_many({})
    await db.homework.delete_many({})
    await db.homework_submissions.delete_many({})
    await db.notifications.delete_many({})
    await db.consistency_data.delete_many({})
    await db.topic_progress.delete_many({})
    await db.support_alerts.delete_many({})
    await db.portfolio_entries.delete_many({})
    await db.learning_profiles.delete_many({})
    await db.performance_matrix.delete_many({})
    await db.gap_heatmap.delete_many({})
    await db.cross_class_analytics.delete_many({})
    await db.curriculum_tracker.delete_many({})
    await db.teacher_support_data.delete_many({})
    
    print("🏫 Creating school structure...")
    
    # School ID (using admin's ID as school_id)
    school_id = "school_001"
    school_name = "ABC High School"
    
    # 1. CREATE SCHOOL ADMIN
    print("👤 Creating school admin...")
    admin_result = await db.users.insert_one({
        "name": "School Admin",
        "email": "admin@school.com",
        "role": "schooladmin",
        "school_id": school_id,
        "school_name": school_name,
        "hashed_password": pwd_ctx.hash("admin123"),
        "must_change_password": False,
        "status": "active",
        "created_at": datetime.utcnow().isoformat()
    })
    admin_id = str(admin_result.inserted_id)
    print(f"   ✓ Admin created: admin@school.com / admin123")
    
    # 2. CREATE GRADES
    print("\n📚 Creating grades...")
    grades_data = [
        {"grade_number": "6", "subjects": ["Mathematics", "Science", "English", "SST", "Hindi"]},
        {"grade_number": "7", "subjects": ["Mathematics", "Science", "English", "SST", "Hindi", "Computer Science"]},
    ]
    
    grade_ids = {}
    for grade_data in grades_data:
        result = await db.grades.insert_one({
            "school_id": school_id,
            **grade_data,
            "created_at": datetime.utcnow().isoformat()
        })
        grade_ids[grade_data["grade_number"]] = str(result.inserted_id)
        print(f"   ✓ Grade {grade_data['grade_number']}: {len(grade_data['subjects'])} subjects")
    
    # 3. CREATE SECTIONS
    print("\n🏛️  Creating sections...")
    sections_data = [
        {"grade_number": "6", "section_name": "A"},
        {"grade_number": "6", "section_name": "B"},
        {"grade_number": "7", "section_name": "A"},
    ]
    
    section_ids = {}
    for section_data in sections_data:
        class_name = f"Grade {section_data['grade_number']}-{section_data['section_name']}"
        result = await db.sections.insert_one({
            "school_id": school_id,
            "grade_id": grade_ids[section_data["grade_number"]],
            **section_data,
            "class_name": class_name,
            "class_teacher_id": None,
            "created_at": datetime.utcnow().isoformat()
        })
        section_ids[class_name] = str(result.inserted_id)
        print(f"   ✓ {class_name}")
    
    # 4. CREATE TEACHERS
    print("\n👨‍🏫 Creating teachers...")
    teachers_data = [
        {
            "name": "Mr. John Doe",
            "email": "john.doe@school.com",
            "phone": "1234567890",
            "employee_id": "EMP001",
            "qualified_subjects": ["Mathematics", "Science"]
        },
        {
            "name": "Ms. Jane Smith",
            "email": "jane.smith@school.com",
            "phone": "0987654321",
            "employee_id": "EMP002",
            "qualified_subjects": ["English", "Hindi"]
        },
        {
            "name": "Mr. Robert Johnson",
            "email": "robert.j@school.com",
            "phone": "5551234567",
            "employee_id": "EMP003",
            "qualified_subjects": ["SST", "Computer Science"]
        },
    ]
    
    teacher_ids = {}
    for teacher_data in teachers_data:
        result = await db.users.insert_one({
            **teacher_data,
            "role": "teacher",
            "school_id": school_id,
            "school_name": school_name,
            "assigned_sections": [],
            "hashed_password": pwd_ctx.hash("teacher123"),
            "must_change_password": False,
            "status": "active",
            "created_at": datetime.utcnow().isoformat(),
            "created_by": admin_id
        })
        teacher_ids[teacher_data["name"]] = str(result.inserted_id)
        print(f"   ✓ {teacher_data['name']}: {teacher_data['email']} / teacher123")
    
    # 5. CREATE PARENTS (will link to students later)
    print("\n👪 Creating parents...")
    parents_data = [
        {
            "name": "Mr. Bob Johnson",
            "email": "bob.johnson@parent.com",
            "phone": "2222222222"
        },
        {
            "name": "Ms. Diana Brown",
            "email": "diana.brown@parent.com",
            "phone": "4444444444"
        },
        {
            "name": "Mr. Frank Wilson",
            "email": "frank.wilson@parent.com",
            "phone": "6666666666"
        },
    ]
    
    parent_ids = {}
    for parent_data in parents_data:
        result = await db.users.insert_one({
            **parent_data,
            "role": "parent",
            "school_id": school_id,
            "school_name": school_name,
            "children": [],  # Will update after creating students
            "hashed_password": pwd_ctx.hash("parent123"),
            "must_change_password": False,
            "status": "active",
            "created_at": datetime.utcnow().isoformat()
        })
        parent_ids[parent_data["name"]] = str(result.inserted_id)
        print(f"   ✓ {parent_data['name']}: {parent_data['email']} / parent123")
    
    # 6. CREATE STUDENTS
    print("\n👨‍🎓 Creating students...")
    students_data = [
        # Grade 6-A students
        {"name": "Alice Johnson", "phone": "1111111111", "roll_no": "001", "section": "Grade 6-A", "parent": "Mr. Bob Johnson"},
        {"name": "Charlie Brown", "phone": "3333333333", "roll_no": "002", "section": "Grade 6-A", "parent": "Ms. Diana Brown"},
        {"name": "Emma Wilson", "phone": "5555555555", "roll_no": "003", "section": "Grade 6-A", "parent": "Mr. Frank Wilson"},
        
        # Grade 6-B students
        {"name": "George Davis", "phone": "7777777777", "roll_no": "001", "section": "Grade 6-B", "parent": "Ms. Diana Brown"},  # Diana has 2 kids
        {"name": "Ivy Martinez", "phone": "9999999999", "roll_no": "002", "section": "Grade 6-B", "parent": "Mr. Bob Johnson"},  # Bob has 2 kids
        
        # Grade 7-A students
        {"name": "Kevin Lee", "phone": "1010101010", "roll_no": "001", "section": "Grade 7-A", "parent": "Mr. Frank Wilson"},  # Frank has 2 kids
        {"name": "Lucy Chen", "phone": "1212121212", "roll_no": "002", "section": "Grade 7-A", "parent": "Ms. Diana Brown"},  # Diana has 3 kids!
    ]
    
    student_ids = {}
    for student_data in students_data:
        section_id = section_ids[student_data["section"]]
        grade_num = student_data["section"].split("-")[0].split()[-1]  # Extract grade number
        section_letter = student_data["section"].split("-")[-1]  # Extract section letter
        
        result = await db.users.insert_one({
            "name": student_data["name"],
            "phone": student_data["phone"],
            "roll_no": student_data["roll_no"],
            "role": "student",
            "school_id": school_id,
            "school_name": school_name,
            "section_id": section_id,
            "grade_number": grade_num,
            "section_name": section_letter,
            "class_name": student_data["section"],
            "parent_ids": [parent_ids[student_data["parent"]]],  # Array of parent IDs
            "status": "active",
            "created_at": datetime.utcnow().isoformat(),
            "created_by": admin_id
        })
        student_ids[student_data["name"]] = str(result.inserted_id)
        print(f"   ✓ {student_data['name']} ({student_data['section']}) → Parent: {student_data['parent']}")
        
        # Update parent's children list
        parent_doc = await db.users.find_one({"name": student_data["parent"]})
        if parent_doc:
            await db.users.update_one(
                {"_id": parent_doc["_id"]},
                {"$addToSet": {"children": str(result.inserted_id)}}
            )
    
    # 7. CREATE SUBJECT ASSIGNMENTS
    print("\n📖 Creating subject assignments...")
    assignments_data = [
        # Grade 6-A
        {"section": "Grade 6-A", "subject": "Mathematics", "teacher": "Mr. John Doe"},
        {"section": "Grade 6-A", "subject": "Science", "teacher": "Mr. John Doe"},
        {"section": "Grade 6-A", "subject": "English", "teacher": "Ms. Jane Smith"},
        {"section": "Grade 6-A", "subject": "Hindi", "teacher": "Ms. Jane Smith"},
        {"section": "Grade 6-A", "subject": "SST", "teacher": "Mr. Robert Johnson"},
        
        # Grade 6-B
        {"section": "Grade 6-B", "subject": "Mathematics", "teacher": "Mr. John Doe"},
        {"section": "Grade 6-B", "subject": "Science", "teacher": "Mr. John Doe"},
        {"section": "Grade 6-B", "subject": "English", "teacher": "Ms. Jane Smith"},
        {"section": "Grade 6-B", "subject": "Hindi", "teacher": "Ms. Jane Smith"},
        {"section": "Grade 6-B", "subject": "SST", "teacher": "Mr. Robert Johnson"},
        
        # Grade 7-A
        {"section": "Grade 7-A", "subject": "Mathematics", "teacher": "Mr. John Doe"},
        {"section": "Grade 7-A", "subject": "Science", "teacher": "Mr. John Doe"},
        {"section": "Grade 7-A", "subject": "English", "teacher": "Ms. Jane Smith"},
        {"section": "Grade 7-A", "subject": "Computer Science", "teacher": "Mr. Robert Johnson"},
        {"section": "Grade 7-A", "subject": "SST", "teacher": "Mr. Robert Johnson"},
    ]
    
    for assignment in assignments_data:
        section_id = section_ids[assignment["section"]]
        teacher_id = teacher_ids[assignment["teacher"]]
        
        await db.subject_assignments.insert_one({
            "section_id": section_id,
            "subject": assignment["subject"],
            "teacher_id": teacher_id,
            "updated_at": datetime.utcnow().isoformat()
        })
        
        # Update teacher's assigned_sections
        teacher_doc = await db.users.find_one({"name": assignment["teacher"]})
        if teacher_doc:
            await db.users.update_one(
                {"_id": teacher_doc["_id"]},
                {"$addToSet": {"assigned_sections": section_id}}
            )
        
        print(f"   ✓ {assignment['section']} - {assignment['subject']} → {assignment['teacher']}")

    # 8. SEED HOMEWORK (linked to teacher John Doe, students in Grade 6-A)
    print("\n📝 Creating homework assignments...")
    alice_id = student_ids["Alice Johnson"]
    charlie_id = student_ids["Charlie Brown"]
    emma_id = student_ids["Emma Wilson"]
    george_id = student_ids["George Davis"]
    ivy_id = student_ids["Ivy Martinez"]
    kevin_id = student_ids["Kevin Lee"]
    lucy_id = student_ids["Lucy Chen"]
    john_id = teacher_ids["Mr. John Doe"]
    jane_id = teacher_ids["Ms. Jane Smith"]
    sec_6a = section_ids["Grade 6-A"]
    sec_6b = section_ids["Grade 6-B"]
    sec_7a = section_ids["Grade 7-A"]

    hw_docs = [
        {
            "title": "Algebra Basics - Chapter 3",
            "subject": "Mathematics",
            "teacher_id": john_id,
            "section_id": sec_6a,
            "assigned_students": [alice_id, charlie_id, emma_id],
            "due_date": "2026-04-05",
            "status": "assigned",
            "created_by": john_id,
            "questions": [
                {"id": "q1", "type": "mcq", "text": "What is 2x + 3 = 7? Solve for x.", "options": ["x=1","x=2","x=3","x=4"], "correct": 1},
                {"id": "q2", "type": "mcq", "text": "Which is a linear equation?", "options": ["x²=4","2x+1=5","x³=8","√x=2"], "correct": 1},
                {"id": "q3", "type": "typed", "text": "Explain what a variable is in your own words."},
            ],
            "created_at": datetime.utcnow().isoformat(),
        },
        {
            "title": "Forces & Motion Quiz",
            "subject": "Science",
            "teacher_id": john_id,
            "section_id": sec_6b,
            "assigned_students": [george_id, ivy_id],
            "due_date": "2026-04-07",
            "status": "assigned",
            "created_by": john_id,
            "questions": [
                {"id": "q1", "type": "mcq", "text": "Newton's first law is about?", "options": ["Gravity","Inertia","Friction","Momentum"], "correct": 1},
                {"id": "q2", "type": "mcq", "text": "Unit of force is?", "options": ["Joule","Watt","Newton","Pascal"], "correct": 2},
                {"id": "q3", "type": "typed", "text": "Describe an example of Newton's third law from daily life."},
            ],
            "created_at": datetime.utcnow().isoformat(),
        },
        {
            "title": "English Grammar - Tenses",
            "subject": "English",
            "teacher_id": jane_id,
            "section_id": sec_7a,
            "assigned_students": [kevin_id, lucy_id],
            "due_date": "2026-04-06",
            "status": "assigned",
            "created_by": jane_id,
            "questions": [
                {"id": "q1", "type": "mcq", "text": "Which sentence is in past perfect tense?", "options": ["She runs","She ran","She had run","She will run"], "correct": 2},
                {"id": "q2", "type": "mcq", "text": "Identify the correct future tense:", "options": ["I go","I went","I will go","I have gone"], "correct": 2},
                {"id": "q3", "type": "typed", "text": "Write 3 sentences using different tenses about your school day."},
            ],
            "created_at": datetime.utcnow().isoformat(),
        },
    ]
    hw_ids = {}
    for hw in hw_docs:
        r = await db.homework.insert_one(hw)
        hw_ids[hw["title"]] = str(r.inserted_id)
        print(f"   ✓ Homework: {hw['title']}")

    # 9. SEED HOMEWORK SUBMISSIONS (Alice submitted Algebra)
    print("\n📋 Creating homework submissions...")
    await db.homework_submissions.insert_one({
        "homework_id": hw_ids["Algebra Basics - Chapter 3"],
        "student_id": alice_id,
        "answers": [
            {"question_id": "q1", "type": "mcq", "selected": 1},
            {"question_id": "q2", "type": "mcq", "selected": 1},
            {"question_id": "q3", "type": "typed", "text": "A variable is a letter that stands for an unknown number."},
        ],
        "mcq_score": 2,
        "mcq_total": 2,
        "status": "submitted",
        "submitted_at": datetime.utcnow().isoformat(),
    })
    print("   ✓ Alice's Algebra submission")

    # 10. SEED PARENT DATA COLLECTIONS
    print("\n👪 Seeding parent data collections...")

    # Consistency data for each student
    for name, sid in student_ids.items():
        await db.consistency_data.insert_one({
            "student_id": sid,
            "score": 82,
            "trend": "5%",
            "percentile": "Top 20%",
            "target": "90%",
            "peakActivity": "Evenings (6-8 PM) show highest focus and completion rates",
            "engagement": {"timeSpent": "4.2 hrs/week", "doubtsAsked": "3 this week", "testsTaken": "2 this week"},
            "streaks": {"current": 5, "best": 12, "thisWeek": 4},
            "calendar": {"days": [
                {"date": 1, "status": "completed"}, {"date": 2, "status": "completed"},
                {"date": 3, "status": "partial"},   {"date": 4, "status": "completed"},
                {"date": 5, "status": "missed"},    {"date": 6, "status": "completed"},
                {"date": 7, "status": "completed"}, {"date": 8, "status": "completed"},
                {"date": 9, "status": "partial"},   {"date": 10, "status": "completed"},
            ]},
            "aiInsight": f"{name} shows strong consistency on weekdays. Encourage weekend practice to maintain momentum.",
        })

    # Topic progress for each student
    subjects_topics = [
        {"subject": "Mathematics", "name": "Algebra Basics", "score": 78, "status": "Developing", "concepts": "Variables, Equations"},
        {"subject": "Mathematics", "name": "Fractions & Decimals", "score": 55, "status": "Needs Practice", "concepts": "Operations, Conversion", "recommendation": "Practice 10 problems daily on fraction operations."},
        {"subject": "Science", "name": "Forces & Motion", "score": 88, "status": "Proficient", "concepts": "Newton's Laws, Gravity"},
        {"subject": "Science", "name": "Cells & Organisms", "score": 42, "status": "Critical Gap", "concepts": "Cell structure, Functions", "recommendation": "Review Chapter 4 and attempt the remediation quiz."},
        {"subject": "English", "name": "Grammar & Tenses", "score": 91, "status": "Proficient", "concepts": "Tenses, Clauses"},
        {"subject": "SST", "name": "Ancient Civilizations", "score": 65, "status": "Developing", "concepts": "History, Geography"},
    ]
    for name, sid in student_ids.items():
        for t in subjects_topics:
            await db.topic_progress.insert_one({"student_id": sid, **t})

    # Notifications for parents
    for pname, pid in parent_ids.items():
        parent_doc = await db.users.find_one({"_id": ObjectId(pid)})
        children = parent_doc.get("children", [])
        child_name = "your child"
        if children:
            child_doc = await db.users.find_one({"_id": ObjectId(children[0])})
            if child_doc:
                child_name = child_doc["name"]
        await db.notifications.insert_many([
            {"user_id": pid, "type": "homework_new", "title": f"New Homework Assigned", "desc": f"Algebra Basics - Chapter 3 has been assigned to {child_name}.", "time": "2 hours ago", "read": False, "tag": "Mathematics", "tagColor": "indigo"},
            {"user_id": pid, "type": "homework_due", "title": "Homework Due Tomorrow", "desc": f"Forces & Motion Quiz is due tomorrow for {child_name}.", "time": "5 hours ago", "read": False, "tag": "Science", "tagColor": "orange"},
            {"user_id": pid, "type": "achievement", "title": "Achievement Unlocked!", "desc": f"{child_name} scored 100% on English Grammar quiz.", "time": "Yesterday", "read": True, "tag": "English", "tagColor": "green"},
            {"user_id": pid, "type": "overdue", "title": "Overdue Assignment", "desc": f"SST worksheet was not submitted by {child_name}.", "time": "2 days ago", "read": False, "tag": "SST", "tagColor": "red", "action": "Contact Teacher"},
        ])
    print("   ✓ Notifications seeded for all parents")

    # Support alerts for each student
    for name, sid in student_ids.items():
        await db.support_alerts.insert_many([
            {
                "student_id": sid, "severity": "urgent", "resolved": False,
                "label": "URGENT", "detected": "Detected 3 days ago",
                "title": "Consistent Struggle with Fractions",
                "points": ["Missed 3 consecutive fraction assignments", "Score dropped from 72% to 45% in 2 weeks", "Avoids fraction-related questions in class"],
                "insight": {"label": "AI PATTERN INSIGHT", "text": "This pattern suggests a foundational gap in fraction concepts from Grade 5. Early intervention recommended."},
            },
            {
                "student_id": sid, "severity": "attention", "resolved": False,
                "label": "ATTENTION NEEDED", "detected": "Detected 1 week ago",
                "title": "Late Submission Pattern",
                "points": ["4 out of last 6 assignments submitted after deadline", "Most late submissions are in Science subject"],
                "insight": {"label": "RECOMMENDATION", "text": "Consider setting a reminder 2 hours before each deadline."},
            },
            {
                "student_id": sid, "severity": "resolved", "resolved": True,
                "label": "RESOLVED", "detected": "Resolved last week",
                "title": "Algebra Confusion - Now Resolved",
                "sub": "Student completed remediation and scored 85% on retest.",
            },
        ])
    print("   ✓ Support alerts seeded for all students")

    # Portfolio entries for each student
    for name, sid in student_ids.items():
        await db.portfolio_entries.insert_many([
            {
                "student_id": sid, "type": "milestone",
                "title": "First Perfect Score!", "date": "Mar 15, 2026",
                "tags": ["Mathematics", "Achievement"],
                "text": f"{name} scored 100% on the Algebra quiz — a huge improvement from last month's 62%.",
            },
            {
                "student_id": sid, "type": "teacher_note",
                "title": "Outstanding Class Participation",
                "date": "Mar 10, 2026",
                "teacher": "Mr. John Doe", "role": "Mathematics Teacher",
                "text": f"{name} has been actively participating in class discussions and helping peers understand concepts.",
            },
            {
                "student_id": sid, "type": "parent_reflection",
                "title": "Noticed Great Focus at Home",
                "date": "Mar 5, 2026",
                "text": f"{name} spent 2 hours on homework without any reminders this week. Very proud!",
            },
        ])
    print("   ✓ Portfolio entries seeded for all students")

    # Learning profiles for each student
    for name, sid in student_ids.items():
        await db.learning_profiles.insert_one({
            "student_id": sid,
            "preferredTime": "Evening",
            "environment": ["Quiet space", "Alone"],
            "learningStyle": "visual",
            "observations": f"{name} focuses best in the evening and prefers visual explanations with diagrams.",
            "focusDuration": 30,
            "strengths": "Problem-solving, pattern recognition",
            "challenges": "Reading comprehension, long-form writing",
            "strategies": "Breaking tasks into smaller steps works well",
            "emotional": "Gets frustrated with repeated mistakes but recovers quickly",
            "subjects": ["Mathematics", "Science"],
            "hobbies": "Drawing, Chess, Cycling",
        })
    print("   ✓ Learning profiles seeded for all students")

    # 11. SEED SCHOOL ADMIN ANALYTICS COLLECTIONS
    print("\n🏫 Seeding school admin analytics...")

    await db.performance_matrix.insert_one({
        "school_id": school_id,
        "subjects": ["Mathematics", "Science", "English", "SST", "Hindi"],
        "grades": [
            {"grade": "Grade 6", "scores": [68, 72, 81, 74, 65], "students": [20, 20, 20, 20, 20]},
            {"grade": "Grade 7", "scores": [74, 69, 85, 71, 70], "students": [14, 14, 14, 14, 14]},
        ],
        "bestCluster": {"label": "Grade 7 - English", "score": 85},
        "priorityIntervention": {"label": "Grade 6 - Hindi", "score": 65},
        "aiInsights": {
            "growthTrends": [
                {"subject": "English", "grades": "Grade 6 & 7", "change": "+8%"},
                {"subject": "Mathematics", "grades": "Grade 7", "change": "+6%"},
            ],
            "priorityActions": [
                {"title": "Hindi Intervention", "desc": "Grade 6 Hindi scores are 15% below target.", "action": "Draft Plan"},
                {"title": "Science Review", "desc": "Grade 7 Science shows high variance between sections.", "action": "Item Analysis"},
            ],
        },
    })
    print("   ✓ Performance matrix")

    await db.gap_heatmap.insert_one({
        "school_id": school_id,
        "activeGaps": 18,
        "studentsAffected": 12,
        "studentsAffectedChange": "+2 FROM LAST MONTH",
        "criticalTopics": 4,
        "improvementRate": 15,
        "subjects": ["Mathematics", "Science", "English", "SST"],
        "topics": ["Algebra Basics", "Fractions", "Cell Biology"],
        "grades": ["Grade 6", "Grade 7"],
        "matrix": [
            {"topic": "Algebra Basics",  "scores": [45, 28], "counts": [9, 4]},
            {"topic": "Fractions",       "scores": [62, 35], "counts": [12, 5]},
            {"topic": "Cell Biology",    "scores": [18, 12], "counts": [4, 2]},
        ],
        "priorityActions": [
            {"priority": "CRITICAL IMPACT", "topic": "Fractions", "title": "Schedule remedial sessions for Grade 6 Fractions", "desc": "62% of Grade 6 students struggle with fraction operations.", "action": "SCHEDULE NOW"},
            {"priority": "HIGH PRIORITY", "topic": "Algebra", "title": "Distribute practice material for Grade 7 Algebra", "desc": "28% gap detected in Grade 7 Algebra Basics.", "action": "SEND MATERIALS"},
            {"priority": "STAFFING INSIGHT", "topic": "Cell Biology", "title": "Review Science teaching approach", "desc": "Cell Biology gap persists across both grades.", "action": "REVIEW STAFFING"},
        ],
    })
    print("   ✓ Gap heatmap")

    await db.cross_class_analytics.insert_one({
        "school_id": school_id,
        "bestPerformance": {"section": "Grade 6-A", "teacher": "Mr. John Doe", "students": 3, "score": 82, "vsAvg": "+4%"},
        "mostImproved": {"section": "Grade 7-A", "growth": "+9%"},
        "rankings": [
            {"rank": 1, "section": "Grade 6-A", "teacher": "Mr. John Doe", "students": 3, "perf": 82, "comp": 90, "engage": 88, "overall": 86},
            {"rank": 2, "section": "Grade 7-A", "teacher": "Ms. Jane Smith", "students": 2, "perf": 78, "comp": 85, "engage": 82, "overall": 81},
            {"rank": 3, "section": "Grade 6-B", "teacher": "Mr. John Doe", "students": 2, "perf": 74, "comp": 80, "engage": 76, "overall": 76},
        ],
        "bestPractices": [
            {"title": "Consistent Homework Submission", "desc": "Grade 6-A maintains 90%+ submission rate within 24 hours.", "impact": "+15% IMPACT ON GRADE"},
            {"title": "Early Intervention", "desc": "Teachers host 15-min review sessions for students below 70%.", "impact": "+8% RETENTION"},
            {"title": "Peer Learning", "desc": "Students who help peers show 22% higher retention.", "impact": "+22% ENGAGEMENT"},
        ],
    })
    print("   ✓ Cross-class analytics")

    await db.curriculum_tracker.insert_one({
        "school_id": school_id,
        "overallCompletion": 62,
        "forecastDate": "May 30, 2026",
        "onTrack": 6,
        "atRisk": 2,
        "behind": 1,
        "subjects": [
            {"code": "MATH-6", "name": "Mathematics Grade 6", "unit": "Unit 3: Fractions", "planned": 70, "taught": 62, "status": "ON TRACK", "topicsLeft": 4, "daysAvailable": 12},
            {"code": "SCI-6", "name": "Science Grade 6", "unit": "Unit 2: Living Things", "planned": 65, "taught": 48, "status": "AT RISK", "topicsLeft": 6, "daysAvailable": 8},
            {"code": "ENG-7", "name": "English Grade 7", "unit": "Unit 4: Creative Writing", "planned": 55, "taught": 30, "status": "BEHIND", "topicsLeft": 10, "daysAvailable": 10},
        ],
        "insights": [
            {"type": "critical", "title": "English Grade 7 Behind", "desc": "Grade 7 English is 3 weeks behind schedule. Needs immediate attention."},
            {"type": "warning", "title": "Science Velocity Alert", "desc": "Grade 6 Science pacing has slowed in the last 2 weeks."},
            {"type": "success", "title": "Math On Track", "desc": "Grade 6 Mathematics is progressing well and on schedule."},
        ],
    })
    print("   ✓ Curriculum tracker")

    await db.teacher_support_data.insert_many([
        {
            "school_id": school_id,
            "avgEngagement": 74,
            "activeTeachers": 3,
            "supportOpps": 1,
            "teachers": [
                {"name": "Mr. John Doe", "subject": "Mathematics", "grade": "Grade 6 & 7", "score": 80, "hw": 92, "aiUse": "High", "intrv": 8, "status": "excellent"},
                {"name": "Ms. Jane Smith", "subject": "English", "grade": "Grade 6 & 7", "score": 72, "hw": 85, "aiUse": "Med", "intrv": 5, "status": "steady"},
                {"name": "Mr. Robert Johnson", "subject": "SST", "grade": "Grade 6 & 7", "score": 58, "hw": 65, "aiUse": "Low", "intrv": 2, "status": "opportunity"},
            ],
            "suggestedPD": [
                {"type": "STRATEGY", "duration": "15 min read", "title": "Integrating AI in Lesson Plans", "desc": "Suggested for: Mr. Robert Johnson"},
                {"type": "WORKSHOP", "duration": "45 min video", "title": "Effective Student Interventions", "desc": "Based on low intervention scores", "rating": "4.9/5"},
                {"type": "RESOURCE", "duration": "Downloadable", "title": "Homework Engagement Kit", "desc": "Improve completion rates by up to 25%", "fileInfo": "PDF • 2.4 MB"},
            ],
        }
    ])
    print("   ✓ Teacher support data")

    print("\n✅ Database seeded successfully!")
    print("\n" + "="*60)
    print("LOGIN CREDENTIALS:")
    print("="*60)
    print("\n🔐 SCHOOL ADMIN:")
    print("   Email: admin@school.com")
    print("   Password: admin123")
    
    print("\n👨‍🏫 TEACHERS (all use password: teacher123):")
    for teacher in teachers_data:
        print(f"   {teacher['email']}")
    
    print("\n👪 PARENTS (all use password: parent123):")
    for parent in parents_data:
        print(f"   {parent['email']}")
    
    print("\n👨‍🎓 STUDENTS (login with phone + OTP):")
    for student in students_data:
        print(f"   {student['phone']} - {student['name']}")
    
    print("\n" + "="*60)
    print("DATA SUMMARY:")
    print("="*60)
    print(f"   Grades: {len(grades_data)}")
    print(f"   Sections: {len(sections_data)}")
    print(f"   Teachers: {len(teachers_data)}")
    print(f"   Parents: {len(parents_data)}")
    print(f"   Students: {len(students_data)}")
    print(f"   Subject Assignments: {len(assignments_data)}")
    
    print("\n📊 PARENT-CHILD RELATIONSHIPS:")
    print("="*60)
    print("   Mr. Bob Johnson → Alice Johnson (6-A), Ivy Martinez (6-B)")
    print("   Ms. Diana Brown → Charlie Brown (6-A), George Davis (6-B), Lucy Chen (7-A)")
    print("   Mr. Frank Wilson → Emma Wilson (6-A), Kevin Lee (7-A)")
    
    print("\n👨‍🏫 TEACHER ASSIGNMENTS:")
    print("="*60)
    print("   Mr. John Doe → Math & Science (6-A, 6-B, 7-A)")
    print("   Ms. Jane Smith → English & Hindi (6-A, 6-B, 7-A)")
    print("   Mr. Robert Johnson → SST (6-A, 6-B, 7-A) + Computer Science (7-A)")
    
    print("\n🎯 NEXT STEPS:")
    print("="*60)
    print("1. Start the backend: cd backend && uvicorn main:app --reload")
    print("2. Start the frontend: cd frontend && npm run dev")
    print("3. Login as admin and verify the onboarding data")
    print("4. Login as teacher to see assigned students")
    print("5. Login as parent to see multiple children")
    print("\n")
    
    client.close()

if __name__ == "__main__":
    asyncio.run(seed_database())
