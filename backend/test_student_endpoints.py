"""
Test script for student detail endpoints
Run after starting the backend server
"""
import requests
import json

BASE_URL = "http://localhost:8000"

# Login as teacher
def login():
    response = requests.post(f"{BASE_URL}/auth/login", json={
        "email": "john.doe@school.com",
        "password": "teacher123",
        "role": "teacher"
    })
    if response.status_code == 200:
        data = response.json()
        return data["access_token"]
    else:
        print(f"Login failed: {response.status_code}")
        print(response.text)
        return None

def test_endpoints(token):
    headers = {"Authorization": f"Bearer {token}"}
    
    print("\n" + "="*60)
    print("TESTING STUDENT ENDPOINTS")
    print("="*60)
    
    # 1. Get students by class
    print("\n1. GET /teacher/students/by-class?class_name=Grade 6-A")
    response = requests.get(f"{BASE_URL}/teacher/students/by-class?class_name=Grade 6-A", headers=headers)
    if response.status_code == 200:
        students = response.json()
        print(f"✅ Found {len(students)} students")
        if students:
            student = students[0]
            student_id = student["id"]
            print(f"   Student: {student['name']}")
            print(f"   Parent: {student.get('parent_name', 'No parent')}")
            print(f"   Homework: {student['homework_completed']}/{student['homework_total']}")
            print(f"   Avg Score: {student['avg_score']}%")
            
            # 2. Get student profile
            print(f"\n2. GET /teacher/students/{student_id}/profile")
            response = requests.get(f"{BASE_URL}/teacher/students/{student_id}/profile", headers=headers)
            if response.status_code == 200:
                profile = response.json()
                print(f"✅ Profile loaded")
                print(f"   Name: {profile['name']}")
                print(f"   Class: {profile['class']}")
                print(f"   Overall Avg: {profile['overall_avg_score']}%")
                print(f"   Subjects: {len(profile.get('subject_performance', []))}")
                print(f"   Learning Gaps: {len(profile.get('learning_gaps', []))}")
            else:
                print(f"❌ Profile failed: {response.status_code}")
                print(response.text)
            
            # 3. Get student homework
            print(f"\n3. GET /teacher/students/{student_id}/homework")
            response = requests.get(f"{BASE_URL}/teacher/students/{student_id}/homework", headers=headers)
            if response.status_code == 200:
                homework = response.json()
                print(f"✅ Found {len(homework)} homework assignments")
                for hw in homework:
                    print(f"   - {hw['title']} ({hw['submission_status']})")
            else:
                print(f"❌ Homework failed: {response.status_code}")
                print(response.text)
            
            # 4. Get student submissions
            print(f"\n4. GET /teacher/students/{student_id}/submissions")
            response = requests.get(f"{BASE_URL}/teacher/students/{student_id}/submissions", headers=headers)
            if response.status_code == 200:
                submissions = response.json()
                print(f"✅ Found {len(submissions)} submissions")
                for sub in submissions:
                    print(f"   - {sub['homework_title']} ({sub['status']}) - {sub.get('final_score_pct', 'N/A')}%")
            else:
                print(f"❌ Submissions failed: {response.status_code}")
                print(response.text)
    else:
        print(f"❌ Get students failed: {response.status_code}")
        print(response.text)
    
    print("\n" + "="*60)
    print("TESTS COMPLETE")
    print("="*60 + "\n")

if __name__ == "__main__":
    print("🔐 Logging in as teacher...")
    token = login()
    if token:
        print("✅ Login successful")
        test_endpoints(token)
    else:
        print("❌ Login failed")
