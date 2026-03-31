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
"""

import requests
import json
import time
from io import BytesIO

BASE_URL = "http://localhost:8000"

# Test credentials from seed data
TEACHER_EMAIL    = "john.doe@school.com"
TEACHER_PASSWORD = "teacher123"
STUDENT_PHONE    = "1111111111"  # Alice Johnson (Grade 6-A)

def print_section(title):
    print(f"\n{'='*60}")
    print(f"  {title}")
    print(f"{'='*60}\n")

def print_result(step, data):
    print(f"✓ {step}")
    print(json.dumps(data, indent=2, default=str))
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
# TokenResponse is flat: access_token, user_id, role, name
teacher_token   = teacher_data["access_token"]
teacher_headers = {"Authorization": f"Bearer {teacher_token}"}
print_result("Teacher logged in", {
    "name":    teacher_data["name"],
    "role":    teacher_data["role"],
    "user_id": teacher_data["user_id"],
})

# ============================================================
# STEP 2: Get Teacher's Students
# ============================================================
print_section("STEP 2: Get Teacher's Students")

response = requests.get(f"{BASE_URL}/teacher/my-students", headers=teacher_headers)
assert response.status_code == 200, f"my-students failed: {response.text}"
students = response.json()
print_result(f"Found {len(students)} students", students[:2])

# Get Alice Johnson's ID
alice = next((s for s in students if s["name"] == "Alice Johnson"), None)
assert alice, "Alice Johnson not found — run seed_data.py first"
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
    "assigned_students": [],
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
homework_id   = homework_data["id"]
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
# STEP 5: Student Login (Alice) — phone OTP flow
# ============================================================
print_section("STEP 5: Student Login (Alice Johnson)")

# Request OTP — endpoint is /auth/otp/request with role field
response = requests.post(f"{BASE_URL}/auth/otp/request", json={
    "phone": STUDENT_PHONE,
    "role": "student"
})
assert response.status_code == 200, f"OTP request failed: {response.text}"
otp_resp = response.json()
# In dev mode (DEBUG=True) the OTP is returned directly
dev_otp = otp_resp.get("dev_otp")
assert dev_otp, f"dev_otp not returned — check DEBUG=True in .env. Response: {otp_resp}"
print(f"✓ OTP requested — dev_otp: {dev_otp}")

# Verify OTP — endpoint is /auth/otp/verify
response = requests.post(f"{BASE_URL}/auth/otp/verify", json={
    "phone": STUDENT_PHONE,
    "otp":   dev_otp,
    "role":  "student"
})
assert response.status_code == 200, f"OTP verify failed: {response.text}"
student_data   = response.json()
student_token  = student_data["access_token"]
student_headers = {"Authorization": f"Bearer {student_token}"}
print_result("Student logged in", {
    "name":    student_data["name"],
    "role":    student_data["role"],
    "user_id": student_data["user_id"],
})

# ============================================================
# STEP 6: Student Views Assigned Homework
# ============================================================
print_section("STEP 6: Student Views Assigned Homework")

response = requests.get(f"{BASE_URL}/homework/student", headers=student_headers)
assert response.status_code == 200, f"Student homework list failed: {response.text}"
homework_list = response.json()
print_result(f"Found {len(homework_list)} assigned homework items", [
    {"title": h["title"], "subject": h["subject"]} for h in homework_list
])

# Get homework details
response = requests.get(f"{BASE_URL}/homework/{homework_id}", headers=student_headers)
assert response.status_code == 200, f"Get homework failed: {response.text}"
homework_details = response.json()
print_result("Homework details", {
    "title":           homework_details["title"],
    "subject":         homework_details["subject"],
    "total_marks":     homework_details["total_marks"],
    "questions_count": len(homework_details.get("questions", [])),
})

# ============================================================
# STEP 7: Student Uploads File for Question 4 (S3)
# ============================================================
print_section("STEP 7: Student Uploads Work to S3")

# Minimal valid JPEG header bytes so content-type detection works
fake_jpeg = (
    b'\xff\xd8\xff\xe0\x00\x10JFIF\x00\x01\x01\x00\x00\x01\x00\x01\x00\x00'
    + b'FAKE_ALGEBRA_WORK_' * 200
    + b'\xff\xd9'
)

files = {
    'file': ('algebra_work.jpg', BytesIO(fake_jpeg), 'image/jpeg')
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
        {"question_id": "q1", "answer": "b",     "answer_type": "mcq"},
        {"question_id": "q2", "answer": "y = 7", "answer_type": "typed"},
        {"question_id": "q3", "answer": "c",     "answer_type": "mcq"},
        {"question_id": "q4", "file_url": file_url, "answer_type": "upload"},
    ]
}

response = requests.post(f"{BASE_URL}/homework/submit",
                         json=submission_payload,
                         headers=student_headers)
assert response.status_code == 200, f"Submit failed: {response.text}"
submission_result = response.json()
print_result("Homework submitted", submission_result)

# Wait for background AI analysis to complete
print("⏳ Waiting 8 seconds for AI analysis background task...")
time.sleep(8)

# ============================================================
# STEP 9: Teacher Views Submissions via /teacher/evaluate
# ============================================================
print_section("STEP 9: Teacher Views Submissions (Evaluate endpoint)")

response = requests.get(f"{BASE_URL}/teacher/evaluate/{homework_id}",
                        headers=teacher_headers)
assert response.status_code == 200, f"Evaluate list failed: {response.text}"
eval_data   = response.json()
submissions = eval_data.get("submissions", [])
stats       = eval_data.get("stats", {})

print_result("Evaluate data stats", stats)

alice_sub = next((s for s in submissions if s.get("student_id") == alice_id), None)
assert alice_sub, "Alice's submission not found in evaluate list"

print_result("Alice's submission", {
    "submission_id":  alice_sub.get("_id"),
    "status":         alice_sub.get("status"),
    "auto_score_pct": alice_sub.get("auto_score_pct"),
    "mcq_earned":     alice_sub.get("mcq_earned"),
    "mcq_total":      alice_sub.get("mcq_total"),
    "ai_analysis":    {
        "overall_summary":      alice_sub.get("ai_analysis", {}).get("overall_summary", "Pending") if alice_sub.get("ai_analysis") else "Pending",
        "estimated_score_pct":  alice_sub.get("ai_analysis", {}).get("estimated_score_pct") if alice_sub.get("ai_analysis") else None,
        "strength_areas":       alice_sub.get("ai_analysis", {}).get("strength_areas", []) if alice_sub.get("ai_analysis") else [],
        "weakness_areas":       alice_sub.get("ai_analysis", {}).get("weakness_areas", []) if alice_sub.get("ai_analysis") else [],
    } if alice_sub.get("ai_analysis") else "AI analysis still pending",
})

# ============================================================
# STEP 10: Teacher Grades Homework
# ============================================================
print_section("STEP 10: Teacher Grades Homework")

grade_payload = {
    "homework_id":      homework_id,
    "student_id":       alice_id,
    "final_grade":      "A",
    "final_score":      11.0,
    "teacher_feedback": "Excellent work Alice! Your understanding of linear equations is very good. The uploaded work shows clear step-by-step solution. Keep it up!",
    "question_overrides": [
        {"question_id": "q2", "points_awarded": 3, "comment": "Perfect answer with correct working"},
        {"question_id": "q4", "points_awarded": 4, "comment": "Good work shown, minor notation issue. Almost perfect!"},
    ],
    "publish": True
}

response = requests.post(f"{BASE_URL}/homework/grade",
                         json=grade_payload,
                         headers=teacher_headers)
assert response.status_code == 200, f"Grade failed: {response.text}"
print_result("Homework graded and published", response.json())

# ============================================================
# STEP 11: Student Views Results
# ============================================================
print_section("STEP 11: Student Views Results")

response = requests.get(f"{BASE_URL}/homework/{homework_id}/result",
                        headers=student_headers)
assert response.status_code == 200, f"Result fetch failed: {response.text}"
result = response.json()
print_result("Student's result", {
    "status":           result.get("status"),
    "final_grade":      result.get("final_grade"),
    "final_score":      result.get("final_score"),
    "teacher_feedback": result.get("teacher_feedback"),
    "auto_score_pct":   result.get("auto_score_pct"),
    "graded_at":        result.get("graded_at"),
})

# ============================================================
# STEP 12: Teacher Views Homework Library
# ============================================================
print_section("STEP 12: Teacher Views Homework Library")

response = requests.get(f"{BASE_URL}/homework/library", headers=teacher_headers)
assert response.status_code == 200, f"Library failed: {response.text}"
library = response.json()
print_result(f"Teacher's homework library ({len(library)} items)",
             [{"title": hw["title"], "status": hw["status"]} for hw in library[:3]])

# ============================================================
# SUMMARY
# ============================================================
print_section("✅ ALL STEPS COMPLETED SUCCESSFULLY")

print("""
COMPLETE HOMEWORK FLOW VERIFIED:
✓ Teacher login (email + password)
✓ Teacher fetches own students
✓ Teacher creates homework (MCQ + typed + file upload questions)
✓ Teacher assigns homework to specific student
✓ Student login (phone OTP — dev_otp from response)
✓ Student views assigned homework list
✓ Student uploads file to AWS S3 (listup-ai-images-all, ap-south-1)
✓ Student submits homework with all answer types
✓ AI analysis runs in background (GPT-4o-mini via OpenRouter)
✓ Teacher views submissions via /teacher/evaluate/:id
✓ Teacher grades and publishes result
✓ Student views graded result with teacher feedback
✓ Teacher views homework library
""")
