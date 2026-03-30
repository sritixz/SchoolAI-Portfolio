"""
Quick API Test Script
Tests the key endpoints to verify data flow
"""
import requests
import json

BASE_URL = "http://localhost:8000"

def test_login(email, password, role):
    """Test login and return token"""
    response = requests.post(f"{BASE_URL}/auth/login", json={
        "email": email,
        "password": password,
        "role": role
    })
    if response.status_code == 200:
        data = response.json()
        print(f"✅ Login successful: {email}")
        return data["access_token"]
    else:
        print(f"❌ Login failed: {email} - {response.text}")
        return None

def test_teacher_students(token):
    """Test teacher can see their students"""
    headers = {"Authorization": f"Bearer {token}"}
    
    # Get sections
    response = requests.get(f"{BASE_URL}/teacher/my-sections", headers=headers)
    if response.status_code == 200:
        sections = response.json()
        print(f"✅ Teacher sections: {len(sections)} sections")
        for section in sections:
            print(f"   - {section['class_name']}: {section['student_count']} students, Subjects: {', '.join(section['subjects'])}")
    else:
        print(f"❌ Failed to get sections: {response.text}")
    
    # Get students
    response = requests.get(f"{BASE_URL}/teacher/my-students", headers=headers)
    if response.status_code == 200:
        students = response.json()
        print(f"✅ Teacher students: {len(students)} students")
        for student in students[:3]:  # Show first 3
            print(f"   - {student['name']} ({student['class_name']}) - Subjects: {', '.join(student['subjects_taught'])}")
    else:
        print(f"❌ Failed to get students: {response.text}")

def test_parent_children(token):
    """Test parent can see their children"""
    headers = {"Authorization": f"Bearer {token}"}
    
    response = requests.get(f"{BASE_URL}/parent/dashboard", headers=headers)
    if response.status_code == 200:
        data = response.json()
        parent = data["parent"]
        children = data["children"]
        print(f"✅ Parent: {parent['name']}")
        print(f"✅ Children: {len(children)}")
        for child in children:
            print(f"   - {child['name']} ({child.get('class_name', 'N/A')}) - Roll: {child.get('roll_no', 'N/A')}")
    else:
        print(f"❌ Failed to get parent dashboard: {response.text}")

def test_admin_data(token):
    """Test admin can see all data"""
    headers = {"Authorization": f"Bearer {token}"}
    
    # Get students
    response = requests.get(f"{BASE_URL}/schooladmin/students", headers=headers)
    if response.status_code == 200:
        students = response.json()
        print(f"✅ Admin - Total students: {len(students)}")
    else:
        print(f"❌ Failed to get students: {response.text}")
    
    # Get teachers
    response = requests.get(f"{BASE_URL}/schooladmin/teachers", headers=headers)
    if response.status_code == 200:
        teachers = response.json()
        print(f"✅ Admin - Total teachers: {len(teachers)}")
    else:
        print(f"❌ Failed to get teachers: {response.text}")
    
    # Get parents
    response = requests.get(f"{BASE_URL}/schooladmin/parents", headers=headers)
    if response.status_code == 200:
        parents = response.json()
        print(f"✅ Admin - Total parents: {len(parents)}")
        for parent in parents:
            print(f"   - {parent['name']}: {len(parent.get('children_details', []))} children")
    else:
        print(f"❌ Failed to get parents: {response.text}")

def main():
    print("="*60)
    print("TESTING SCHOOL ADMIN SYSTEM APIs")
    print("="*60)
    print("\nMake sure backend is running: uvicorn main:app --reload\n")
    
    # Test Admin
    print("\n1. Testing School Admin...")
    print("-"*60)
    admin_token = test_login("admin@school.com", "admin123", "schooladmin")
    if admin_token:
        test_admin_data(admin_token)
    
    # Test Teacher (Mr. John Doe - teaches 3 sections)
    print("\n2. Testing Teacher (Mr. John Doe)...")
    print("-"*60)
    teacher_token = test_login("john.doe@school.com", "teacher123", "teacher")
    if teacher_token:
        test_teacher_students(teacher_token)
    
    # Test Parent (Ms. Diana Brown - 3 children)
    print("\n3. Testing Parent (Ms. Diana Brown - 3 children)...")
    print("-"*60)
    parent_token = test_login("diana.brown@parent.com", "parent123", "parent")
    if parent_token:
        test_parent_children(parent_token)
    
    # Test Parent (Mr. Bob Johnson - 2 children)
    print("\n4. Testing Parent (Mr. Bob Johnson - 2 children)...")
    print("-"*60)
    parent_token2 = test_login("bob.johnson@parent.com", "parent123", "parent")
    if parent_token2:
        test_parent_children(parent_token2)
    
    print("\n" + "="*60)
    print("TEST COMPLETE")
    print("="*60)
    print("\nIf all tests passed ✅, the system is working correctly!")
    print("Next steps:")
    print("1. Test the frontend onboarding interface")
    print("2. Verify data in MongoDB")
    print("3. Start building homework/learning gap features")

if __name__ == "__main__":
    try:
        main()
    except requests.exceptions.ConnectionError:
        print("\n❌ ERROR: Cannot connect to backend")
        print("Make sure the backend is running:")
        print("  cd backend && uvicorn main:app --reload")
    except Exception as e:
        print(f"\n❌ ERROR: {e}")
