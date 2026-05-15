"""
Test script to verify worksheet generator fixes:
1. Question type selection (only MCQ)
2. Math formatting (no LaTeX)
"""
import requests
import json

BASE_URL = "http://localhost:8000"

# First, login as a teacher
login_response = requests.post(f"{BASE_URL}/auth/login", json={
    "email": "teacher@school.com",
    "password": "teacher123",
    "role": "teacher"
})

if login_response.status_code != 200:
    print("❌ Login failed:", login_response.text)
    exit(1)

token = login_response.json()["access_token"]
headers = {"Authorization": f"Bearer {token}"}

print("✅ Logged in as teacher")
print()

# Test 1: Generate worksheet with ONLY MCQ questions
print("=" * 60)
print("TEST 1: Generate worksheet with ONLY MCQ questions")
print("=" * 60)

worksheet_payload = {
    "tool": "worksheet",
    "subject": "Math",
    "topic": "Linear Equations",
    "grade": "Grade 8",
    "extra": {
        "difficulty": "Medium",
        "total_questions": 5,
        "question_types": ["mcq"],  # ONLY MCQ
        "title": "Linear Equations MCQ Worksheet",
        "board": "CBSE",
        "chapter": "Chapter 2",
        "learning_objective": "Concept Understanding",
        "difficulty_structure": "Medium",
        "special_instructions": "Focus on basic linear equation solving"
    }
}

print(f"Requesting worksheet with question_types: {worksheet_payload['extra']['question_types']}")
print()

response = requests.post(f"{BASE_URL}/teacher/ai-tool", json=worksheet_payload, headers=headers)

if response.status_code != 200:
    print(f"❌ Request failed: {response.status_code}")
    print(response.text)
    exit(1)

result = response.json()

# Check sections
print("Generated sections:")
for section in result.get("sections", []):
    section_type = section.get("type", "Unknown")
    num_questions = len(section.get("questions", []))
    print(f"  - {section_type}: {num_questions} questions")

print()

# Verify ONLY MCQ sections exist
section_types = [s.get("type") for s in result.get("sections", [])]
has_only_mcq = all(t == "MCQ" for t in section_types)

if has_only_mcq and len(section_types) > 0:
    print("✅ PASS: Only MCQ sections generated")
else:
    print(f"❌ FAIL: Found non-MCQ sections: {section_types}")

print()

# Check for LaTeX in questions
print("Checking for LaTeX syntax in questions...")
has_latex = False
for section in result.get("sections", []):
    for question in section.get("questions", []):
        text = question.get("text", "")
        if "\\frac" in text or "\\sqrt" in text or "\\(" in text or "$" in text:
            print(f"  ❌ Found LaTeX in: {text[:100]}")
            has_latex = True

if not has_latex:
    print("✅ PASS: No LaTeX syntax found")
else:
    print("❌ FAIL: LaTeX syntax detected")

print()
print("=" * 60)
print("Sample question:")
if result.get("sections") and result["sections"][0].get("questions"):
    q = result["sections"][0]["questions"][0]
    print(f"Q{q.get('number')}: {q.get('text')}")
    for opt in q.get("options", []):
        print(f"  {opt}")
print("=" * 60)

# Save full result for inspection
with open("test_worksheet_result.json", "w") as f:
    json.dump(result, f, indent=2)

print()
print("Full result saved to: test_worksheet_result.json")
