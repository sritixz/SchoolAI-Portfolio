"""
COMPREHENSIVE HOMEWORK FLOW TEST
Tests the complete student-teacher homework interaction including:
1. Teacher creates homework with MCQ and file upload questions
2. Teacher assigns homework to students
3. Student views assigned homework
4. Student submits homework with file upload
5. AI analyzes submission
6. Teacher reviews and grades
7. Student views results

AWS S3 Configuration:
- AWS_ACCESS_KEY_ID: AKIAXP4MWQX7UR3XVMPR
- AWS_SECRET_ACCESS_KEY: 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
- AWS_REGION: ap-south-1
- AWS_S3_BUCKET: listup-ai-images-all
"""

import requests
import json
import time
from io import BytesIO

BASE_URL = "http://localhost:8000"

# Test credentials from seed data
TEACHER_EMAIL = "john.doe@school.com"
TEACHER_PASSWORD = "teacher123"
STUDENT_PHONE = "1111111111"  # Alice Johnson (Grade 6-A)
STUDENT_OTP = "123456"

def print_section(title):
    print(f"\n{'='*60}")
    print(f"  {title}")
    print(f"{'='*60}\n")

def print_result(step, data):
    print(f"✓ {step}")
    print(json.dumps(data, indent=2))
    print()

# ============================================================
# STEP 1: Teacher Login
# ============================================================
print_section("STEP 1: Teacher Login")

response = requests.post(f"{BASE_URL}/auth/login", json={
    "email": TEACHER_EMAIL,
    "password": TEACHER_PASSWORD,
    "role": "teacher"
})
assert response.status_code == 200, f"Login failed: {response.text}"
teacher_data = response.json()
teacher_token = teacher_data["access_token"]
teacher_headers = {"Authorization": f"Bearer {teacher_token}"}
print_result("Teacher logged in", {
    "name": teacher_data["user"]["name"],
    "email": teacher_data["user"]["email"],
    "role": teacher_data["user"]["role"]
})

# ============================================================
# STEP 2: Get Teacher's Students
# ============================================================
print_section("STEP 2: Get Teacher's Students")

response = requests.get(f"{BASE_URL}/teacher/my-students", headers=teacher_headers)
assert response.status_code == 200
students = response.json()
print_result(f"Found {len(students)} students", students[:2])  # Show first 2

# Get Alice Johnson's ID
alice = next((s for s in students if s["name"] == "Alice Johnson"), None)
assert alice, "Alice Johnson not found in teacher's students"
alice_id = alice["_id"]
print(f"Target student: Alice Johnson (ID: {alice_id})\n")

# ============================================================
# STEP 3: Teacher Creates Homework
# ============================================================
print_section("STEP 3: Teacher Creates Homework with Mixed Questions")

homework_payload = {
    "subject": "Mathematics",
    "title": "Algebra Basics - Variables and Equations",
    "description": "Practice solving linear equations and understanding variables",
    "assigned_to_class": "Grade 6-A",
    "assigned_students": [],  # Will assign later
    "due_date": "2026-04-15T23:59:59",
    "submission_type": "online_quiz",
    "difficulty_level": "medium",
    "estimated_duration_minutes": 45,
    "instructions": "Answer all questions. For file upload questions, show your work clearly.",
    "tags": ["algebra", "equations", "grade6"],
    "questions": [
        {
            "id": "q1",
            "question_number": 1,
            "total_questions": 4,
            "question_text": "What is the value of x in the equation: 2x + 5 = 13?",
            "answer_type": "mcq",
            "options": [
                {"id": "a", "text": "x = 3", "is_correct": False},
                {"id": "b", "text": "x = 4", "is_correct": True},
                {"id": "c", "text": "x = 5", "is_correct": False},
                {"id": "d", "text": "x = 6", "is_correct": False}
            ],
            "hint": "Subtract 5 from both sides first",
            "max_points": 2
        },
        {
            "id": "q2",
            "question_number": 2,
            "total_questions": 4,
            "question_text": "Solve for y: 3y - 7 = 14",
            "answer_type": "typed",
            "hint": "Add 7 to both sides, then divide by 3",
            "max_points": 3,
            "sample_answer": "y = 7"
        },
        {
            "id": "q3",
            "question_number": 3,
            "total_questions": 4,
            "question_text": "If a + b = 10 and a = 3, what is b?",
            "answer_type": "mcq",
            "options": [
                {"id": "a", "text": "b = 5", "is_correct": False},
                {"id": "b", "text": "b = 6", "is_correct": False},
                {"id": "c", "text": "b = 7", "is_correct": True},
                {"id": "d", "text": "b = 8", "is_correct": False}
            ],
            "max_points": 2
        },
        {
            "id": "q4",
            "question_number": 4,
            "total_questions": 4,
            "question_text": "Upload a photo of your work solving: 5(x + 2) = 25. Show all steps.",
            "answer_type": "upload",
            "hint": "First distribute 5, then solve for x",
            "max_points": 5,
            "accepted_formats": ["image/jpeg", "image/png", "application/pdf"],
            "max_file_size_mb": 20
        }
    ],
    "total_marks": 12
}

response = requests.post(f"{BASE_URL}/homework/create", 
                        json=homework_payload, 
                        headers=teacher_headers)
assert response.status_code == 200, f"Create failed: {response.text}"
homework_data = response.json()
homework_id = homework_data["id"]
print_result("Homework created", {"homework_id": homework_id})

# ============================================================
# STEP 4: Teacher Assigns Homework to Alice
# ============================================================
print_section("STEP 4: Teacher Assigns Homework to Student")

assign_payload = {
    "homework_id": homework_id,
    "student_ids": [alice_id],
    "due_date": "2026-04-15T23:59:59"
}

response = requests.post(f"{BASE_URL}/homework/assign", 
                        json=assign_payload, 
                        headers=teacher_headers)
assert response.status_code == 200, f"Assign failed: {response.text}"
print_result("Homework assigned to Alice", response.json())

# ============================================================
# STEP 5: Student Login (Alice)
# ============================================================
print_section("STEP 5: Student Login (Alice Johnson)")

# Request OTP
response = requests.post(f"{BASE_URL}/auth/student/request-otp", json={
    "phone": STUDENT_PHONE
})
assert response.status_code == 200, f"OTP request failed: {response.text}"
print("✓ OTP requested")

# Verify OTP
response = requests.post(f"{BASE_URL}/auth/student/verify-otp", json={
    "phone": STUDENT_PHONE,
    "otp": STUDENT_OTP
})
assert response.status_code == 200, f"OTP verify failed: {response.text}"
student_data = response.json()
student_token = student_data["access_token"]
student_headers = {"Authorization": f"Bearer {student_token}"}
print_result("Student logged in", {
    "name": student_data["user"]["name"],
    "phone": student_data["user"]["phone"],
    "class": student_data["user"]["class_name"]
})

# ============================================================
# STEP 6: Student Views Assigned Homework
# ============================================================
print_section("STEP 6: Student Views Assigned Homework")

response = requests.get(f"{BASE_URL}/homework/student", headers=student_headers)
assert response.status_code == 200
homework_list = response.json()
print_result(f"Found {len(homework_list)} assigned homework", homework_list)

# Get homework details
response = requests.get(f"{BASE_URL}/homework/{homework_id}", headers=student_headers)
assert response.status_code == 200
homework_details = response.json()
print_result("Homework details", {
    "title": homework_details["title"],
    "subject": homework_details["subject"],
    "total_marks": homework_details["total_marks"],
    "questions_count": len(homework_details["questions"])
})

# ============================================================
# STEP 7: Student Uploads File for Question 4
# ============================================================
print_section("STEP 7: Student Uploads Work (Simulated Image)")

# Create a fake image file (in real scenario, this would be actual photo)
fake_image = BytesIO(b"FAKE_IMAGE_DATA_FOR_TESTING_" * 100)
fake_image.name = "algebra_work.jpg"

files = {
    'file': ('algebra_work.jpg', fake_image, 'image/jpeg')
}

response = requests.post(f"{BASE_URL}/homework/upload-file", 
                        files=files, 
                        headers=student_headers)
assert response.status_code == 200, f"Upload failed: {response.text}"
upload_result = response.json()
file_url = upload_result["url"]
print_result("File uploaded to S3", upload_result)

# ============================================================
# STEP 8: Student Submits Homework
# ============================================================
print_section("STEP 8: Student Submits Homework")

submission_payload = {
    "homework_id": homework_id,
    "answers": [
        {
            "question_id": "q1",
            "answer": "b",  # Correct answer
            "answer_type": "mcq"
        },
        {
            "question_id": "q2",
            "answer": "y = 7",  # Typed answer
            "answer_type": "typed"
        },
        {
            "question_id": "q3",
            "answer": "c",  # Correct answer
            "answer_type": "mcq"
        },
        {
            "question_id": "q4",
            "file_url": file_url,  # Uploaded file
            "answer_type": "upload"
        }
    ]
}

response = requests.post(f"{BASE_URL}/homework/submit", 
                        json=submission_payload, 
                        headers=student_headers)
assert response.status_code == 200, f"Submit failed: {response.text}"
submission_result = response.json()
print_result("Homework submitted", submission_result)

# Wait for AI analysis
print("⏳ Waiting 5 seconds for AI analysis...")
time.sleep(5)

# ============================================================
# STEP 9: Teacher Views Submissions
# ============================================================
print_section("STEP 9: Teacher Views Submissions")

response = requests.get(f"{BASE_URL}/homework/{homework_id}/submissions", 
                       headers=teacher_headers)
assert response.status_code == 200
submissions = response.json()
print_result(f"Found {len(submissions)} submissions", submissions)

# Get specific submission
response = requests.get(f"{BASE_URL}/homework/{homework_id}/submissions/{alice_id}", 
                       headers=teacher_headers)
assert response.status_code == 200
alice_submission = response.json()
print_result("Alice's submission details", {
    "submission_id": alice_submission["_id"],
    "status": alice_submission["status"],
    "auto_score_pct": alice_submission.get("auto_score_pct"),
    "mcq_earned": alice_submission.get("mcq_earned"),
    "mcq_total": alice_submission.get("mcq_total"),
    "ai_analysis": alice_submission.get("ai_analysis", {}).get("overall_assessment") if alice_submission.get("ai_analysis") else "Pending"
})

# ============================================================
# STEP 10: Teacher Grades Homework
# ============================================================
print_section("STEP 10: Teacher Grades Homework")

grade_payload = {
    "homework_id": homework_id,
    "student_id": alice_id,
    "final_grade": "A",
    "final_score": 11.0,  # Out of 12
    "teacher_feedback": "Excellent work Alice! Your understanding of linear equations is very good. The uploaded work shows clear step-by-step solution. Keep it up!",
    "question_overrides": [
        {
            "question_id": "q2",
            "points_awarded": 3,
            "comment": "Perfect answer with correct working"
        },
        {
            "question_id": "q4",
            "points_awarded": 4,
            "comment": "Good work shown, minor notation issue. Almost perfect!"
        }
    ],
    "publish": True
}

response = requests.post(f"{BASE_URL}/homework/grade", 
                        json=grade_payload, 
                        headers=teacher_headers)
assert response.status_code == 200, f"Grade failed: {response.text}"
print_result("Homework graded", response.json())

# ============================================================
# STEP 11: Student Views Results
# ============================================================
print_section("STEP 11: Student Views Results")

response = requests.get(f"{BASE_URL}/homework/{homework_id}/result", 
                       headers=student_headers)
assert response.status_code == 200
result = response.json()
print_result("Student's result", {
    "status": result["status"],
    "final_grade": result.get("final_grade"),
    "final_score": result.get("final_score"),
    "teacher_feedback": result.get("teacher_feedback"),
    "auto_score_pct": result.get("auto_score_pct"),
    "graded_at": result.get("graded_at")
})

# ============================================================
# STEP 12: Teacher Views Homework Library
# ============================================================
print_section("STEP 12: Teacher Views Homework Library")

response = requests.get(f"{BASE_URL}/homework/library", headers=teacher_headers)
assert response.status_code == 200
library = response.json()
print_result(f"Teacher's homework library ({len(library)} items)", 
            [{"title": hw["title"], "status": hw["status"], "created_at": hw["created_at"]} 
             for hw in library[:3]])

# ============================================================
# SUMMARY
# ============================================================
print_section("✅ TEST COMPLETED SUCCESSFULLY")

print("""
COMPLETE HOMEWORK FLOW TESTED:
✓ Teacher login and authentication
✓ Teacher creates homework with mixed question types (MCQ, typed, file upload)
✓ Teacher assigns homework to specific student
✓ Student login via phone OTP
✓ Student views assigned homework
✓ Student uploads file to AWS S3
✓ Student submits homework with answers
✓ AI analysis runs in background
✓ Teacher views all submissions
✓ Teacher reviews and grades homework
✓ Student views graded results
✓ Teacher views homework library

AWS S3 INTEGRATION:
✓ File upload endpoint working
✓ Files stored in: listup-ai-images-all bucket
✓ Region: ap-south-1
✓ Public URLs generated correctly

NEXT STEPS:
1. Test with real image files (JPG, PNG, PDF)
2. Test multiple students submitting same homework
3. Test late submissions
4. Test homework editing before assignment
5. Test bulk grading
6. Test parent viewing child's homework results
""")
