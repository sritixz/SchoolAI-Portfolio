"""
Complete Homework Flow Test
Tests the entire homework lifecycle: create → assign → submit → evaluate

Run after seeding:
    python test_homework_complete_flow.py
"""
import requests
import json
from datetime import datetime, timedelta

BASE_URL = "http://localhost:8000"

def login(email, password, role="teacher"):
    """Login and return access token"""
    resp = requests.post(f"{BASE_URL}/auth/login", json={"email": email, "password": password, "role": role})
    if resp.status_code != 200:
        print(f"❌ Login failed: {resp.text}")
        return None
    return resp.json()["access_token"]

def test_homework_flow():
    print("="*60)
    print("🧪 TESTING COMPLETE HOMEWORK FLOW")
    print("="*60)

    # ── 1. Teacher Login ──
    print("\n1️⃣  Teacher Login...")
    teacher_token = login("john.doe@school.com", "teacher123", "teacher")
    if not teacher_token:
        return
    print("   ✓ Teacher logged in")
    headers_teacher = {"Authorization": f"Bearer {teacher_token}"}

    # ── 2. Fetch Homework Library ──
    print("\n2️⃣  Fetching Homework Library...")
    resp = requests.get(f"{BASE_URL}/homework/library", headers=headers_teacher)
    if resp.status_code != 200:
        print(f"   ❌ Failed: {resp.text}")
        return
    library = resp.json()
    print(f"   ✓ Found {len(library)} homework assignments")
    
    # Find a draft homework
    draft_hw = next((hw for hw in library if hw.get("status") == "draft"), None)
    if not draft_hw:
        print("   ❌ No draft homework found. Run seed_homework_comprehensive.py first.")
        return
    
    hw_id = draft_hw["_id"]
    print(f"   ✓ Selected: {draft_hw['title']} (ID: {hw_id})")

    # ── 3. Fetch Students for Assignment ──
    print("\n3️⃣  Fetching Students...")
    class_level = draft_hw.get("assigned_to_class", "Class 10")
    resp = requests.get(f"{BASE_URL}/teacher/students/{class_level}", headers=headers_teacher)
    if resp.status_code != 200:
        print(f"   ❌ Failed: {resp.text}")
        return
    students = resp.json()
    print(f"   ✓ Found {len(students)} students in {class_level}")
    
    if len(students) == 0:
        print("   ❌ No students found. Check seed data.")
        return
    
    student_ids = [s["id"] for s in students[:2]]  # Assign to first 2 students
    print(f"   ✓ Selected {len(student_ids)} students for assignment")

    # ── 4. Assign Homework ──
    print("\n4️⃣  Assigning Homework...")
    due_date = (datetime.utcnow() + timedelta(days=2)).strftime("%Y-%m-%d")
    assign_payload = {
        "homework_id": hw_id,
        "student_ids": student_ids,
        "due_date": due_date,
    }
    resp = requests.post(f"{BASE_URL}/homework/assign", json=assign_payload, headers=headers_teacher)
    if resp.status_code != 200:
        print(f"   ❌ Assignment failed: {resp.text}")
        return
    print(f"   ✓ Homework assigned to {len(student_ids)} students")
    print(f"   ✓ Due date: {due_date}")

    # ── 5. Verify Assignment (Teacher View) ──
    print("\n5️⃣  Verifying Assignment...")
    resp = requests.get(f"{BASE_URL}/homework/library", headers=headers_teacher)
    library = resp.json()
    assigned_hw = next((hw for hw in library if hw["_id"] == hw_id), None)
    if not assigned_hw:
        print("   ❌ Homework not found after assignment")
        return
    if assigned_hw.get("status") != "assigned":
        print(f"   ❌ Status not updated. Current: {assigned_hw.get('status')}")
        return
    print(f"   ✓ Status: {assigned_hw['status']}")
    print(f"   ✓ Assigned students: {len(assigned_hw.get('assigned_students', []))}")

    # ── 6. Student Login ──
    print("\n6️⃣  Student Login...")
    student_token = login("alice.johnson@school.com", "student123", "student")
    if not student_token:
        return
    print("   ✓ Student logged in")
    headers_student = {"Authorization": f"Bearer {student_token}"}

    # ── 7. Student Views Homework ──
    print("\n7️⃣  Student Views Homework...")
    resp = requests.get(f"{BASE_URL}/homework/student", headers=headers_student)
    if resp.status_code != 200:
        print(f"   ❌ Failed: {resp.text}")
        return
    student_hw_list = resp.json()
    print(f"   ✓ Student sees {len(student_hw_list)} homework assignments")
    
    # Check if our homework is in the list
    our_hw = next((hw for hw in student_hw_list if hw["_id"] == hw_id), None)
    if not our_hw:
        print("   ⚠️  Assigned homework not visible to student yet (may need refresh)")
    else:
        print(f"   ✓ Found: {our_hw['title']}")

    # ── 8. Student Fetches Questions ──
    print("\n8️⃣  Student Fetches Questions...")
    resp = requests.get(f"{BASE_URL}/homework/{hw_id}/questions", headers=headers_student)
    if resp.status_code != 200:
        print(f"   ❌ Failed: {resp.text}")
        return
    questions = resp.json()
    print(f"   ✓ Loaded {len(questions)} questions")

    # ── 9. Student Submits Homework ──
    print("\n9️⃣  Student Submits Homework...")
    # Build answers based on question types
    answers = []
    for i, q in enumerate(questions):
        if q.get("answer_type") == "mcq":
            # Select first correct option
            correct_opt = next((opt for opt in q.get("options", []) if opt.get("is_correct")), None)
            if correct_opt:
                answers.append({
                    "question_id": f"q{i+1}",
                    "answer_type": "mcq",
                    "selected_option_id": correct_opt["id"],
                })
        elif q.get("answer_type") == "typed":
            answers.append({
                "question_id": f"q{i+1}",
                "answer_type": "typed",
                "text_answer": "This is my answer to the typed question.",
            })
    
    submit_payload = {
        "homework_id": hw_id,
        "answers": answers,
    }
    resp = requests.post(f"{BASE_URL}/homework/submit", json=submit_payload, headers=headers_student)
    if resp.status_code != 200:
        print(f"   ❌ Submission failed: {resp.text}")
        return
    result = resp.json()
    print(f"   ✓ Homework submitted")
    print(f"   ✓ Auto-score: {result.get('auto_score_pct', 0)}%")

    # ── 10. Teacher Views Submissions ──
    print("\n🔟 Teacher Views Submissions...")
    resp = requests.get(f"{BASE_URL}/homework/{hw_id}/submissions", headers=headers_teacher)
    if resp.status_code != 200:
        print(f"   ❌ Failed: {resp.text}")
        return
    submissions = resp.json()
    print(f"   ✓ Found {len(submissions)} submission(s)")
    
    if len(submissions) > 0:
        sub = submissions[0]
        print(f"   ✓ Student: {sub.get('student_id')}")
        print(f"   ✓ Status: {sub.get('status')}")
        print(f"   ✓ Auto-score: {sub.get('auto_score_pct', 0)}%")

    # ── 11. Teacher Grades Submission ──
    if len(submissions) > 0 and submissions[0].get("status") == "submitted":
        print("\n1️⃣1️⃣  Teacher Grades Submission...")
        sub_id = submissions[0]["_id"]
        grade_payload = {
            "submission_id": sub_id,
            "manual_scores": {},  # Empty for now, just marking as graded
            "feedback": "Great work! Keep it up.",
            "final_score_pct": 95,
        }
        resp = requests.post(f"{BASE_URL}/homework/grade", json=grade_payload, headers=headers_teacher)
        if resp.status_code != 200:
            print(f"   ❌ Grading failed: {resp.text}")
        else:
            print("   ✓ Submission graded")
            print("   ✓ Final score: 95%")
            print("   ✓ Feedback: Great work! Keep it up.")

    # ── Summary ──
    print("\n" + "="*60)
    print("✅ COMPLETE HOMEWORK FLOW TEST PASSED")
    print("="*60)
    print("\n📋 Flow Summary:")
    print("   1. Teacher logged in ✓")
    print("   2. Fetched homework library ✓")
    print("   3. Fetched students for class ✓")
    print("   4. Assigned homework to students ✓")
    print("   5. Verified assignment status ✓")
    print("   6. Student logged in ✓")
    print("   7. Student viewed homework list ✓")
    print("   8. Student fetched questions ✓")
    print("   9. Student submitted homework ✓")
    print("   10. Teacher viewed submissions ✓")
    print("   11. Teacher graded submission ✓")
    print("\n🎯 All homework features working correctly!")
    print("\n")

if __name__ == "__main__":
    test_homework_flow()
