"""
End-to-end homework flow test.
Tests all three submission types:
  1. online_quiz  (MCQ + typed questions)
  2. file_upload  (single file URL)
  3. handwritten  (photo URL)

Flow per type:
  Teacher login → create homework → add questions → assign to student
  Student login  → list homework  → get questions → submit
  Teacher        → list submissions → grade

Run: python test_homework_e2e.py
Requires backend running on http://localhost:8001
"""

import httpx, json, sys

BASE = "http://localhost:8001"
PASS = "\033[92m✓\033[0m"
FAIL = "\033[91m✗\033[0m"

results = []

def check(label, condition, detail=""):
    status = PASS if condition else FAIL
    results.append(condition)
    print(f"  {status} {label}" + (f"  [{detail}]" if detail else ""))
    return condition

def section(title):
    print(f"\n{'─'*55}")
    print(f"  {title}")
    print(f"{'─'*55}")

# ─────────────────────────────────────────────────────────────
# AUTH HELPERS
# ─────────────────────────────────────────────────────────────

def teacher_login(client):
    r = client.post("/auth/login", json={
        "email": "john.doe@school.com",
        "password": "teacher123",
        "role": "teacher"
    })
    check("Teacher login", r.status_code == 200, f"status={r.status_code}")
    if r.status_code != 200:
        print(f"    Response: {r.text[:200]}")
        return None
    token = r.json().get("access_token")
    check("Teacher token received", bool(token))
    return token

def student_login(client, phone="1111111111"):
    # Step 1: request OTP
    r1 = client.post("/auth/otp/request", json={"phone": phone, "role": "student"})
    check(f"Student OTP request ({phone})", r1.status_code == 200, f"status={r1.status_code}")
    if r1.status_code != 200:
        print(f"    Response: {r1.text[:200]}")
        return None
    otp = r1.json().get("dev_otp")
    check("Dev OTP returned", bool(otp), f"otp={otp}")
    if not otp:
        return None

    # Step 2: verify OTP
    r2 = client.post("/auth/otp/verify", json={"phone": phone, "otp": otp, "role": "student"})
    check("Student OTP verify", r2.status_code == 200, f"status={r2.status_code}")
    if r2.status_code != 200:
        print(f"    Response: {r2.text[:200]}")
        return None
    token = r2.json().get("access_token")
    student_id = r2.json().get("user_id")
    check("Student token received", bool(token))
    return token, student_id

# ─────────────────────────────────────────────────────────────
# HOMEWORK CREATION HELPERS
# ─────────────────────────────────────────────────────────────

MCQ_QUESTIONS = [
    {
        "id": "q1", "question_number": 1, "total_questions": 2,
        "question_text": "What is 2 + 2?",
        "answer_type": "mcq",
        "options": [
            {"id": "A", "text": "3",  "is_correct": False},
            {"id": "B", "text": "4",  "is_correct": True},
            {"id": "C", "text": "5",  "is_correct": False},
            {"id": "D", "text": "22", "is_correct": False},
        ],
        "hint": "Basic addition",
        "max_points": 2
    },
    {
        "id": "q2", "question_number": 2, "total_questions": 2,
        "question_text": "Explain the quadratic formula.",
        "answer_type": "typed",
        "options": [],
        "hint": "Think about ax² + bx + c = 0",
        "max_points": 3
    }
]

UPLOAD_QUESTIONS = [
    {
        "id": "q1", "question_number": 1, "total_questions": 1,
        "question_text": "Draw and label a cell diagram.",
        "answer_type": "upload",
        "options": [],
        "accepted_formats": ["jpg", "png", "pdf"],
        "max_points": 5
    }
]

def create_homework(client, teacher_token, submission_type, questions, title):
    headers = {"Authorization": f"Bearer {teacher_token}"}
    payload = {
        "subject": "Mathematics",
        "title": title,
        "description": f"Test homework - {submission_type}",
        "assigned_to_class": "10-A",
        "assigned_students": [],
        "due_date": "2026-12-31",
        "submission_type": submission_type,
        "difficulty_level": "medium",
        "estimated_duration_minutes": 30,
        "questions": questions,
        "tags": ["test", submission_type],
        "total_marks": sum(q["max_points"] for q in questions),
        "instructions": f"Complete this {submission_type} homework."
    }
    r = client.post("/homework/create", json=payload, headers=headers)
    check(f"Create {submission_type} homework", r.status_code == 200, f"status={r.status_code}")
    if r.status_code != 200:
        print(f"    Response: {r.text[:300]}")
        return None
    hw_id = r.json().get("id")
    check(f"Homework ID returned", bool(hw_id), f"id={hw_id}")
    return hw_id

def assign_homework(client, teacher_token, hw_id, student_id):
    headers = {"Authorization": f"Bearer {teacher_token}"}
    r = client.post("/homework/assign", json={
        "homework_id": hw_id,
        "student_ids": [student_id],
        "due_date": "2026-12-31"
    }, headers=headers)
    check("Assign homework to student", r.status_code == 200, f"status={r.status_code}")
    if r.status_code != 200:
        print(f"    Response: {r.text[:200]}")
    return r.status_code == 200

# ─────────────────────────────────────────────────────────────
# MAIN TEST RUNNER
# ─────────────────────────────────────────────────────────────

def run_tests():
    with httpx.Client(base_url=BASE, timeout=30) as client:

        # ── Health check ──────────────────────────────────────
        section("0. HEALTH CHECK")
        r = client.get("/health")
        if not check("Backend reachable", r.status_code == 200):
            print("\n  Backend not running. Start with: uvicorn main:app --port 8001")
            sys.exit(1)

        # ── Auth ──────────────────────────────────────────────
        section("1. AUTHENTICATION")
        teacher_token = teacher_login(client)
        if not teacher_token:
            print("  Cannot continue without teacher token.")
            sys.exit(1)

        result = student_login(client, "1111111111")
        if not result:
            print("  Cannot continue without student token.")
            sys.exit(1)
        student_token, student_id = result
        student_headers = {"Authorization": f"Bearer {student_token}"}
        teacher_headers = {"Authorization": f"Bearer {teacher_token}"}

        # ── Teacher library (baseline) ────────────────────────
        section("2. TEACHER HOMEWORK LIBRARY")
        r = client.get("/homework/library", headers=teacher_headers)
        check("Library endpoint accessible", r.status_code == 200, f"status={r.status_code}")
        initial_count = len(r.json()) if r.status_code == 200 else 0
        check("Library returns list", isinstance(r.json(), list) if r.status_code == 200 else False,
              f"count={initial_count}")

        # ═══════════════════════════════════════════════════════
        # TYPE 1: ONLINE QUIZ (MCQ + typed)
        # ═══════════════════════════════════════════════════════
        section("3. TYPE 1 — ONLINE QUIZ (MCQ + Typed)")

        hw_id_quiz = create_homework(
            client, teacher_token, "online_quiz", MCQ_QUESTIONS,
            "E2E Test: Quadratic Equations Quiz"
        )
        if not hw_id_quiz:
            print("  Skipping quiz flow — creation failed")
        else:
            # Assign
            assign_homework(client, teacher_token, hw_id_quiz, student_id)

            # Student: list homework
            r = client.get("/homework/student", headers=student_headers)
            check("Student sees assigned homework", r.status_code == 200, f"status={r.status_code}")
            hw_list = r.json() if r.status_code == 200 else []
            found = any(h.get("_id") == hw_id_quiz or h.get("id") == hw_id_quiz for h in hw_list)
            check("Assigned homework appears in student list", found, f"list_len={len(hw_list)}")

            # Student: get questions
            r = client.get(f"/homework/{hw_id_quiz}/questions", headers=student_headers)
            check("Student fetches questions", r.status_code == 200, f"status={r.status_code}")
            questions = r.json() if r.status_code == 200 else []
            check("Questions returned", len(questions) == 2, f"count={len(questions)}")

            # Student: submit (correct MCQ + typed answer)
            r = client.post("/homework/submit", headers=student_headers, json={
                "homework_id": hw_id_quiz,
                "student_id": student_id,
                "answers": [
                    {"question_id": "q1", "answer": "B", "answer_type": "mcq"},
                    {"question_id": "q2", "answer": "x = (-b ± √(b²-4ac)) / 2a", "answer_type": "typed"}
                ],
                "submission_file_url": None
            })
            check("Student submits quiz", r.status_code == 200, f"status={r.status_code}")
            if r.status_code == 200:
                sub_data = r.json()
                check("Submission ID returned", bool(sub_data.get("submission_id")))
                check("MCQ auto-scored", sub_data.get("mcq_total") == 2,
                      f"earned={sub_data.get('mcq_earned')}/{sub_data.get('mcq_total')}")
                check("Correct MCQ answer scored", sub_data.get("mcq_earned") == 2,
                      f"earned={sub_data.get('mcq_earned')}")
                check("Auto score percent correct", sub_data.get("auto_score_pct") == 100,
                      f"pct={sub_data.get('auto_score_pct')}")
                check("AI analysis pending flag", sub_data.get("ai_analysis_pending") is True)

            # Student: get result
            r = client.get(f"/homework/{hw_id_quiz}/result", headers=student_headers)
            check("Student fetches result", r.status_code == 200, f"status={r.status_code}")
            if r.status_code == 200:
                result_data = r.json()
                check("Result has answers", len(result_data.get("answers", [])) == 2)
                check("Result status = submitted", result_data.get("status") == "submitted")

            # Teacher: list submissions
            r = client.get(f"/homework/{hw_id_quiz}/submissions", headers=teacher_headers)
            check("Teacher lists submissions", r.status_code == 200, f"status={r.status_code}")
            if r.status_code == 200:
                subs = r.json()
                check("Submission visible to teacher", len(subs) >= 1, f"count={len(subs)}")

            # Teacher: grade
            r = client.post("/homework/grade", headers=teacher_headers, json={
                "homework_id": hw_id_quiz,
                "student_id": student_id,
                "final_grade": "A",
                "final_score": 95.0,
                "teacher_feedback": "Excellent work on the MCQ. Good explanation of the formula.",
                "question_overrides": [
                    {"question_id": "q2", "points_awarded": 3, "comment": "Well explained"}
                ],
                "publish": True
            })
            check("Teacher grades submission", r.status_code == 200, f"status={r.status_code}")
            if r.status_code == 200:
                check("Grade status = graded", r.json().get("status") == "graded")

            # Verify grade persisted
            r = client.get(f"/homework/{hw_id_quiz}/result", headers=student_headers)
            if r.status_code == 200:
                check("Student sees final grade", r.json().get("final_grade") == "A",
                      f"grade={r.json().get('final_grade')}")
                check("Student sees feedback", bool(r.json().get("teacher_feedback")))

        # ═══════════════════════════════════════════════════════
        # TYPE 2: FILE UPLOAD
        # ═══════════════════════════════════════════════════════
        section("4. TYPE 2 — FILE UPLOAD")

        hw_id_file = create_homework(
            client, teacher_token, "file_upload", UPLOAD_QUESTIONS,
            "E2E Test: Cell Diagram Upload"
        )
        if not hw_id_file:
            print("  Skipping file upload flow — creation failed")
        else:
            assign_homework(client, teacher_token, hw_id_file, student_id)

            # Student: submit with file URL (simulated — no actual S3 in test)
            fake_url = "https://bawan-uploads.s3.ap-south-1.amazonaws.com/submissions/test/cell_diagram.jpg"
            r = client.post("/homework/submit", headers=student_headers, json={
                "homework_id": hw_id_file,
                "student_id": student_id,
                "answers": [],
                "submission_file_url": fake_url
            })
            check("Student submits file upload", r.status_code == 200, f"status={r.status_code}")
            if r.status_code == 200:
                sub_data = r.json()
                check("Submission ID returned", bool(sub_data.get("submission_id")))
                check("No MCQ score for file upload", sub_data.get("auto_score_pct") is None,
                      f"pct={sub_data.get('auto_score_pct')}")

            # Verify file URL stored
            r = client.get(f"/homework/{hw_id_file}/result", headers=student_headers)
            check("File upload result accessible", r.status_code == 200)
            if r.status_code == 200:
                check("File URL stored in result",
                      r.json().get("submission_file_url") == fake_url,
                      f"url={r.json().get('submission_file_url', '')[:50]}")

            # Teacher grades file upload
            r = client.post("/homework/grade", headers=teacher_headers, json={
                "homework_id": hw_id_file,
                "student_id": student_id,
                "final_grade": "B+",
                "final_score": 78.0,
                "teacher_feedback": "Good diagram but missing mitochondria label.",
                "question_overrides": [],
                "publish": True
            })
            check("Teacher grades file upload", r.status_code == 200, f"status={r.status_code}")

        # ═══════════════════════════════════════════════════════
        # TYPE 3: HANDWRITTEN
        # ═══════════════════════════════════════════════════════
        section("5. TYPE 3 — HANDWRITTEN")

        hw_id_hw = create_homework(
            client, teacher_token, "handwritten", [],
            "E2E Test: Handwritten Algebra"
        )
        if not hw_id_hw:
            print("  Skipping handwritten flow — creation failed")
        else:
            assign_homework(client, teacher_token, hw_id_hw, student_id)

            # Student: submit handwritten photo URL
            photo_url = "https://bawan-uploads.s3.ap-south-1.amazonaws.com/submissions/test/algebra_handwritten.jpg"
            r = client.post("/homework/submit", headers=student_headers, json={
                "homework_id": hw_id_hw,
                "student_id": student_id,
                "answers": [],
                "submission_file_url": photo_url
            })
            check("Student submits handwritten", r.status_code == 200, f"status={r.status_code}")
            if r.status_code == 200:
                check("Submission ID returned", bool(r.json().get("submission_id")))

            # Teacher: view submission
            r = client.get(f"/homework/{hw_id_hw}/submissions/{student_id}", headers=teacher_headers)
            check("Teacher views specific submission", r.status_code == 200, f"status={r.status_code}")
            if r.status_code == 200:
                check("Photo URL in submission",
                      r.json().get("submission_file_url") == photo_url)

            # Teacher grades handwritten
            r = client.post("/homework/grade", headers=teacher_headers, json={
                "homework_id": hw_id_hw,
                "student_id": student_id,
                "final_grade": "A-",
                "final_score": 88.0,
                "teacher_feedback": "Clear working shown. Watch sign errors in step 3.",
                "question_overrides": [],
                "publish": True
            })
            check("Teacher grades handwritten", r.status_code == 200, f"status={r.status_code}")

        # ═══════════════════════════════════════════════════════
        # EDGE CASES
        # ═══════════════════════════════════════════════════════
        section("6. EDGE CASES")

        # Wrong MCQ answer scoring
        if hw_id_quiz:
            # Create a second quiz to test wrong answer
            hw_id_wrong = create_homework(
                client, teacher_token, "online_quiz", MCQ_QUESTIONS,
                "E2E Test: Wrong Answer Scoring"
            )
            if hw_id_wrong:
                assign_homework(client, teacher_token, hw_id_wrong, student_id)
                r = client.post("/homework/submit", headers=student_headers, json={
                    "homework_id": hw_id_wrong,
                    "student_id": student_id,
                    "answers": [
                        {"question_id": "q1", "answer": "A", "answer_type": "mcq"},  # WRONG
                        {"question_id": "q2", "answer": "I don't know", "answer_type": "typed"}
                    ],
                    "submission_file_url": None
                })
                check("Wrong MCQ answer submission accepted", r.status_code == 200)
                if r.status_code == 200:
                    d = r.json()
                    check("Wrong MCQ earns 0 points", d.get("mcq_earned") == 0,
                          f"earned={d.get('mcq_earned')}")
                    check("Auto score = 0% for wrong answer", d.get("auto_score_pct") == 0,
                          f"pct={d.get('auto_score_pct')}")

        # Unauthenticated access blocked
        r = client.get("/homework/library")
        check("Unauthenticated library access blocked", r.status_code in (401, 403),
              f"status={r.status_code}")

        # Student cannot access teacher library
        r = client.get("/homework/library", headers=student_headers)
        check("Student cannot access teacher library", r.status_code in (401, 403),
              f"status={r.status_code}")

        # Invalid homework ID
        r = client.get("/homework/000000000000000000000000", headers=student_headers)
        check("Invalid homework ID returns 404", r.status_code == 404,
              f"status={r.status_code}")

        # Duplicate submission (upsert — should succeed, not duplicate)
        if hw_id_quiz:
            r = client.post("/homework/submit", headers=student_headers, json={
                "homework_id": hw_id_quiz,
                "student_id": student_id,
                "answers": [
                    {"question_id": "q1", "answer": "B", "answer_type": "mcq"},
                    {"question_id": "q2", "answer": "Updated answer", "answer_type": "typed"}
                ],
                "submission_file_url": None
            })
            check("Re-submission (upsert) succeeds", r.status_code == 200,
                  f"status={r.status_code}")
            # Verify only one submission exists
            r2 = client.get(f"/homework/{hw_id_quiz}/submissions", headers=teacher_headers)
            if r2.status_code == 200:
                subs = [s for s in r2.json() if s.get("student_id") == student_id]
                check("No duplicate submissions created", len(subs) == 1,
                      f"count={len(subs)}")

        # ── Summary ───────────────────────────────────────────
        section("RESULTS")
        passed = sum(results)
        total  = len(results)
        failed = total - passed
        pct    = round(passed / total * 100) if total else 0
        print(f"\n  Passed: {passed}/{total}  ({pct}%)")
        if failed:
            print(f"  Failed: {failed} test(s)")
        print()
        return failed == 0

if __name__ == "__main__":
    ok = run_tests()
    sys.exit(0 if ok else 1)
