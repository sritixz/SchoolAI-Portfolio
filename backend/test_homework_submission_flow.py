"""
Test script to verify homework submission flow for all three types:
1. online_quiz (MCQ + typed questions)
2. file_upload (single file submission)
3. handwritten (photo submission)
"""
import asyncio
import requests
from datetime import datetime, timedelta

BASE_URL = "http://localhost:8000"

# Test credentials
TEACHER_CREDS = {"email": "teacher@school.com", "password": "teacher123"}
STUDENT_CREDS = {"email": "student@school.com", "password": "student123"}

def login(creds):
    """Login and return auth token"""
    resp = requests.post(f"{BASE_URL}/auth/login", json=creds)
    if resp.status_code == 200:
        return resp.json()["token"]
    raise Exception(f"Login failed: {resp.text}")

def test_online_quiz_homework():
    """Test 1: Online quiz with MCQ and typed questions"""
    print("\n" + "="*60)
    print("TEST 1: Online Quiz Homework (MCQ + Typed)")
    print("="*60)
    
    teacher_token = login(TEACHER_CREDS)
    headers = {"Authorization": f"Bearer {teacher_token}"}
    
    # Create homework
    hw_data = {
        "subject": "Mathematics",
        "title": "Algebra Quiz - Test Flow",
        "description": "Test online quiz submission",
        "assigned_to_class": "10A",
        "assigned_students": [],
        "due_date": (datetime.now() + timedelta(days=7)).isoformat(),
        "submission_type": "online_quiz",
        "difficulty_level": "medium",
        "estimated_duration_minutes": 30,
        "ai_assistant_enabled": True,  # Allow Vin AI assistant
        "questions": [
            {
                "id": "q1",
                "question_number": 1,
                "total_questions": 2,
                "question_text": "What is 2 + 2?",
                "answer_type": "mcq",
                "options": [
                    {"id": "a", "text": "3", "is_correct": False},
                    {"id": "b", "text": "4", "is_correct": True},
                    {"id": "c", "text": "5", "is_correct": False}
                ],
                "max_points": 1
            },
            {
                "id": "q2",
                "question_number": 2,
                "total_questions": 2,
                "question_text": "Explain the quadratic formula",
                "answer_type": "typed",
                "max_points": 2
            }
        ],
        "tags": ["algebra", "test"],
        "total_marks": 3
    }
    
    resp = requests.post(f"{BASE_URL}/homework/create", json=hw_data, headers=headers)
    if resp.status_code != 200:
        print(f"❌ Failed to create homework: {resp.text}")
        return
    
    hw_id = resp.json()["id"]
    print(f"✅ Created online quiz homework: {hw_id}")
    
    # Assign to students
    assign_data = {
        "homework_id": hw_id,
        "student_ids": ["student1", "student2"],
        "due_date": (datetime.now() + timedelta(days=7)).isoformat()
    }
    resp = requests.post(f"{BASE_URL}/homework/assign", json=assign_data, headers=headers)
    if resp.status_code == 200:
        print(f"✅ Assigned to students")
    else:
        print(f"❌ Failed to assign: {resp.text}")
    
    # Student submits
    student_token = login(STUDENT_CREDS)
    student_headers = {"Authorization": f"Bearer {student_token}"}
    
    submission_data = {
        "homework_id": hw_id,
        "answers": [
            {"question_id": "q1", "answer": "b", "answer_type": "mcq"},
            {"question_id": "q2", "answer": "The quadratic formula is x = (-b ± √(b²-4ac)) / 2a", "answer_type": "typed"}
        ]
    }
    
    resp = requests.post(f"{BASE_URL}/homework/submit", json=submission_data, headers=student_headers)
    if resp.status_code == 200:
        result = resp.json()
        print(f"✅ Student submitted successfully")
        print(f"   Auto-score: {result.get('auto_score_pct')}%")
        print(f"   MCQ earned: {result.get('mcq_earned')}/{result.get('mcq_total')}")
    else:
        print(f"❌ Failed to submit: {resp.text}")

def test_file_upload_homework():
    """Test 2: File upload homework"""
    print("\n" + "="*60)
    print("TEST 2: File Upload Homework")
    print("="*60)
    
    teacher_token = login(TEACHER_CREDS)
    headers = {"Authorization": f"Bearer {teacher_token}"}
    
    # Create homework
    hw_data = {
        "subject": "Physics",
        "title": "Lab Report - Test Flow",
        "description": "Upload your completed lab report as PDF",
        "assigned_to_class": "10A",
        "assigned_students": [],
        "due_date": (datetime.now() + timedelta(days=7)).isoformat(),
        "submission_type": "file_upload",
        "difficulty_level": "medium",
        "estimated_duration_minutes": 60,
        "ai_assistant_enabled": False,  # Disable Vin for file upload
        "questions": [],  # No questions for file upload
        "tags": ["lab", "report"],
        "total_marks": 10
    }
    
    resp = requests.post(f"{BASE_URL}/homework/create", json=hw_data, headers=headers)
    if resp.status_code != 200:
        print(f"❌ Failed to create homework: {resp.text}")
        return
    
    hw_id = resp.json()["id"]
    print(f"✅ Created file upload homework: {hw_id}")
    
    # Try to add MCQ questions (should fail)
    invalid_data = hw_data.copy()
    invalid_data["questions"] = [
        {
            "id": "q1",
            "question_number": 1,
            "total_questions": 1,
            "question_text": "Test question",
            "answer_type": "mcq",
            "options": [{"id": "a", "text": "Option A", "is_correct": True}],
            "max_points": 1
        }
    ]
    
    resp = requests.put(f"{BASE_URL}/homework/{hw_id}", json=invalid_data, headers=headers)
    if resp.status_code == 400:
        print(f"✅ Correctly rejected MCQ questions for file_upload type")
    else:
        print(f"❌ Should have rejected MCQ questions: {resp.status_code}")

def test_handwritten_homework():
    """Test 3: Handwritten homework"""
    print("\n" + "="*60)
    print("TEST 3: Handwritten Homework")
    print("="*60)
    
    teacher_token = login(TEACHER_CREDS)
    headers = {"Authorization": f"Bearer {teacher_token}"}
    
    # Create homework
    hw_data = {
        "subject": "Mathematics",
        "title": "Problem Set - Test Flow",
        "description": "Solve problems on paper and upload photo",
        "assigned_to_class": "10A",
        "assigned_students": [],
        "due_date": (datetime.now() + timedelta(days=7)).isoformat(),
        "submission_type": "handwritten",
        "difficulty_level": "high",
        "estimated_duration_minutes": 45,
        "questions": [],  # No interactive questions
        "tags": ["problem-solving"],
        "total_marks": 15
    }
    
    resp = requests.post(f"{BASE_URL}/homework/create", json=hw_data, headers=headers)
    if resp.status_code != 200:
        print(f"❌ Failed to create homework: {resp.text}")
        return
    
    hw_id = resp.json()["id"]
    print(f"✅ Created handwritten homework: {hw_id}")
    
    # Assign
    assign_data = {
        "homework_id": hw_id,
        "student_ids": ["student1"],
        "due_date": (datetime.now() + timedelta(days=7)).isoformat()
    }
    resp = requests.post(f"{BASE_URL}/homework/assign", json=assign_data, headers=headers)
    if resp.status_code == 200:
        print(f"✅ Assigned to students")
    else:
        print(f"❌ Failed to assign: {resp.text}")

def test_mixed_type_validation():
    """Test 4: Validate that mixed types are rejected"""
    print("\n" + "="*60)
    print("TEST 4: Mixed Type Validation")
    print("="*60)
    
    teacher_token = login(TEACHER_CREDS)
    headers = {"Authorization": f"Bearer {teacher_token}"}
    
    # Try to create file_upload homework with typed questions
    invalid_hw = {
        "subject": "Science",
        "title": "Invalid Mixed Type",
        "description": "This should fail",
        "assigned_to_class": "10A",
        "assigned_students": [],
        "due_date": (datetime.now() + timedelta(days=7)).isoformat(),
        "submission_type": "file_upload",
        "difficulty_level": "medium",
        "estimated_duration_minutes": 30,
        "questions": [
            {
                "id": "q1",
                "question_number": 1,
                "total_questions": 1,
                "question_text": "Type your answer",
                "answer_type": "typed",
                "max_points": 5
            }
        ],
        "tags": ["test"],
        "total_marks": 5
    }
    
    resp = requests.post(f"{BASE_URL}/homework/create", json=invalid_hw, headers=headers)
    if resp.status_code == 400:
        print(f"✅ Correctly rejected mixed type homework")
        print(f"   Error: {resp.json().get('detail')}")
    else:
        print(f"❌ Should have rejected mixed type: {resp.status_code}")

if __name__ == "__main__":
    print("\n" + "="*60)
    print("HOMEWORK SUBMISSION FLOW TESTS")
    print("="*60)
    print("\nMake sure the backend is running on http://localhost:8000")
    print("and test users exist in the database.\n")
    
    try:
        test_online_quiz_homework()
        test_file_upload_homework()
        test_handwritten_homework()
        test_mixed_type_validation()
        
        print("\n" + "="*60)
        print("ALL TESTS COMPLETED")
        print("="*60 + "\n")
    except Exception as e:
        print(f"\n❌ Test failed with error: {e}")
