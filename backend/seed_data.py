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
            "parent_id": parent_ids[student_data["parent"]],
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
