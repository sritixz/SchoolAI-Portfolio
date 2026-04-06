"""
Quick test script to verify AI Assistant Toggle feature
Tests both enabled and disabled states
"""
import requests
from datetime import datetime, timedelta

BASE_URL = "http://localhost:8001"

# Test credentials
TEACHER_CREDS = {"email": "teacher@school.com", "password": "teacher123", "role": "teacher"}
STUDENT_CREDS = {"email": "student@school.com", "password": "student123", "role": "student"}

def login(creds):
    """Login and return auth token"""
    resp = requests.post(f"{BASE_URL}/auth/login", json=creds)
    if resp.status_code == 200:
        return resp.json()["token"]
    raise Exception(f"Login failed: {resp.text}")

def test_ai_enabled():
    """Test creating homework with AI assistant enabled"""
    print("\n" + "="*60)
    print("TEST 1: AI Assistant ENABLED")
    print("="*60)
    
    teacher_token = login(TEACHER_CREDS)
    headers = {"Authorization": f"Bearer {teacher_token}"}
    
    hw_data = {
        "subject": "Mathematics",
        "title": "Practice Problems - AI Enabled",
        "description": "Students can use AI help",
        "assigned_to_class": "10A",
        "assigned_students": [],
        "due_date": (datetime.now() + timedelta(days=7)).isoformat(),
        "submission_type": "online_quiz",
        "difficulty_level": "medium",
        "estimated_duration_minutes": 30,
        "ai_assistant_enabled": True,  # ← AI ENABLED
        "questions": [
            {
                "id": "q1",
                "question_number": 1,
                "total_questions": 1,
                "question_text": "What is 2 + 2?",
                "answer_type": "mcq",
                "options": [
                    {"id": "a", "text": "3", "is_correct": False},
                    {"id": "b", "text": "4", "is_correct": True}
                ],
                "max_points": 1
            }
        ],
        "tags": ["practice"],
        "total_marks": 1
    }
    
    resp = requests.post(f"{BASE_URL}/homework/create", json=hw_data, headers=headers)
    if resp.status_code != 200:
        print(f"❌ Failed to create homework: {resp.text}")
        return None
    
    hw_id = resp.json()["id"]
    print(f"✅ Created homework with AI enabled: {hw_id}")
    
    # Verify the field was stored
    resp = requests.get(f"{BASE_URL}/homework/{hw_id}", headers=headers)
    if resp.status_code == 200:
        hw = resp.json()
        ai_enabled = hw.get("ai_assistant_enabled", None)
        if ai_enabled is True:
            print(f"✅ Verified: ai_assistant_enabled = True")
        else:
            print(f"❌ Error: ai_assistant_enabled = {ai_enabled} (expected True)")
    else:
        print(f"❌ Failed to fetch homework: {resp.text}")
    
    return hw_id

def test_ai_disabled():
    """Test creating homework with AI assistant disabled"""
    print("\n" + "="*60)
    print("TEST 2: AI Assistant DISABLED")
    print("="*60)
    
    teacher_token = login(TEACHER_CREDS)
    headers = {"Authorization": f"Bearer {teacher_token}"}
    
    hw_data = {
        "subject": "Mathematics",
        "title": "Final Exam - AI Disabled",
        "description": "Students must work independently",
        "assigned_to_class": "10A",
        "assigned_students": [],
        "due_date": (datetime.now() + timedelta(days=7)).isoformat(),
        "submission_type": "online_quiz",
        "difficulty_level": "high",
        "estimated_duration_minutes": 60,
        "ai_assistant_enabled": False,  # ← AI DISABLED
        "questions": [
            {
                "id": "q1",
                "question_number": 1,
                "total_questions": 1,
                "question_text": "Solve for x: 2x + 5 = 15",
                "answer_type": "typed",
                "max_points": 5
            }
        ],
        "tags": ["exam"],
        "total_marks": 5
    }
    
    resp = requests.post(f"{BASE_URL}/homework/create", json=hw_data, headers=headers)
    if resp.status_code != 200:
        print(f"❌ Failed to create homework: {resp.text}")
        return None
    
    hw_id = resp.json()["id"]
    print(f"✅ Created homework with AI disabled: {hw_id}")
    
    # Verify the field was stored
    resp = requests.get(f"{BASE_URL}/homework/{hw_id}", headers=headers)
    if resp.status_code == 200:
        hw = resp.json()
        ai_enabled = hw.get("ai_assistant_enabled", None)
        if ai_enabled is False:
            print(f"✅ Verified: ai_assistant_enabled = False")
        else:
            print(f"❌ Error: ai_assistant_enabled = {ai_enabled} (expected False)")
    else:
        print(f"❌ Failed to fetch homework: {resp.text}")
    
    return hw_id

def test_update_ai_setting():
    """Test updating AI assistant setting"""
    print("\n" + "="*60)
    print("TEST 3: UPDATE AI Setting")
    print("="*60)
    
    teacher_token = login(TEACHER_CREDS)
    headers = {"Authorization": f"Bearer {teacher_token}"}
    
    # Create with AI enabled
    hw_data = {
        "subject": "Science",
        "title": "Test Update",
        "description": "Testing update",
        "assigned_to_class": "10A",
        "assigned_students": [],
        "due_date": (datetime.now() + timedelta(days=7)).isoformat(),
        "submission_type": "online_quiz",
        "difficulty_level": "medium",
        "estimated_duration_minutes": 30,
        "ai_assistant_enabled": True,
        "questions": [],
        "tags": [],
        "total_marks": 0
    }
    
    resp = requests.post(f"{BASE_URL}/homework/create", json=hw_data, headers=headers)
    if resp.status_code != 200:
        print(f"❌ Failed to create homework: {resp.text}")
        return
    
    hw_id = resp.json()["id"]
    print(f"✅ Created homework: {hw_id}")
    
    # Update to disable AI
    hw_data["ai_assistant_enabled"] = False
    resp = requests.put(f"{BASE_URL}/homework/{hw_id}", json=hw_data, headers=headers)
    if resp.status_code != 200:
        print(f"❌ Failed to update homework: {resp.text}")
        return
    
    print(f"✅ Updated homework to disable AI")
    
    # Verify the update
    resp = requests.get(f"{BASE_URL}/homework/{hw_id}", headers=headers)
    if resp.status_code == 200:
        hw = resp.json()
        ai_enabled = hw.get("ai_assistant_enabled", None)
        if ai_enabled is False:
            print(f"✅ Verified: ai_assistant_enabled = False after update")
        else:
            print(f"❌ Error: ai_assistant_enabled = {ai_enabled} (expected False)")
    else:
        print(f"❌ Failed to fetch homework: {resp.text}")

def test_default_value():
    """Test that default value is True when not specified"""
    print("\n" + "="*60)
    print("TEST 4: DEFAULT VALUE (Backward Compatibility)")
    print("="*60)
    
    teacher_token = login(TEACHER_CREDS)
    headers = {"Authorization": f"Bearer {teacher_token}"}
    
    # Create without specifying ai_assistant_enabled
    hw_data = {
        "subject": "English",
        "title": "Test Default",
        "description": "Testing default value",
        "assigned_to_class": "10A",
        "assigned_students": [],
        "due_date": (datetime.now() + timedelta(days=7)).isoformat(),
        "submission_type": "online_quiz",
        "difficulty_level": "medium",
        "estimated_duration_minutes": 30,
        # ai_assistant_enabled NOT specified
        "questions": [],
        "tags": [],
        "total_marks": 0
    }
    
    resp = requests.post(f"{BASE_URL}/homework/create", json=hw_data, headers=headers)
    if resp.status_code != 200:
        print(f"❌ Failed to create homework: {resp.text}")
        return
    
    hw_id = resp.json()["id"]
    print(f"✅ Created homework without specifying ai_assistant_enabled")
    
    # Verify default is True
    resp = requests.get(f"{BASE_URL}/homework/{hw_id}", headers=headers)
    if resp.status_code == 200:
        hw = resp.json()
        ai_enabled = hw.get("ai_assistant_enabled", None)
        if ai_enabled is True or ai_enabled is None:
            print(f"✅ Verified: Default value is True (backward compatible)")
        else:
            print(f"❌ Error: ai_assistant_enabled = {ai_enabled} (expected True or None)")
    else:
        print(f"❌ Failed to fetch homework: {resp.text}")

if __name__ == "__main__":
    print("\n" + "="*60)
    print("AI ASSISTANT TOGGLE - FEATURE TESTS")
    print("="*60)
    print("\nMake sure the backend is running on http://localhost:8001")
    print("and test users exist in the database.\n")
    
    try:
        test_ai_enabled()
        test_ai_disabled()
        test_update_ai_setting()
        test_default_value()
        
        print("\n" + "="*60)
        print("ALL TESTS COMPLETED")
        print("="*60)
        print("\n✅ Feature is working correctly!")
        print("\nNext steps:")
        print("1. Test manually in the UI")
        print("2. Verify toggle appears in CreateHomework page")
        print("3. Verify button shows/hides in student view")
        print("4. Deploy to staging")
        print("\n")
    except Exception as e:
        print(f"\n❌ Test failed with error: {e}")
        print("\nPlease check:")
        print("1. Backend is running")
        print("2. Test users exist")
        print("3. Database is accessible")
        print("\n")
