"""
Diagnostic test for the OCR + AI grading pipeline.
Run from backend/: python test_ocr_pipeline.py
"""
import asyncio
import sys
import os
sys.path.insert(0, os.path.dirname(__file__))

from motor.motor_asyncio import AsyncIOMotorClient
from config import settings

async def main():
    client = AsyncIOMotorClient(settings.MONGO_URI)
    db = client[settings.MONGO_DB]

    print("=" * 60)
    print("STEP 1: Find Kevin Lee's submission")
    print("=" * 60)

    # Find the submission
    sub = await db.homework_submissions.find_one(
        {},
        sort=[("submitted_at", -1)]  # most recent
    )
    if not sub:
        print("ERROR: No submissions found at all!")
        return

    # Try to find Kevin Lee specifically
    from bson import ObjectId
    users = await db.users.find({"name": {"$regex": "kevin", "$options": "i"}}).to_list(None)
    print(f"Users matching 'kevin': {[u.get('name') for u in users]}")

    kevin = users[0] if users else None
    if kevin:
        sub = await db.homework_submissions.find_one({"student_id": str(kevin["_id"])})
        if not sub:
            sub = await db.homework_submissions.find_one({"student_id": kevin.get("id") or kevin.get("email")})

    if not sub:
        print("WARNING: Could not find Kevin's submission, using most recent submission")
        sub = await db.homework_submissions.find_one({}, sort=[("submitted_at", -1)])

    print(f"Submission ID: {sub.get('_id')}")
    print(f"Student ID: {sub.get('student_id')}")
    print(f"Homework ID: {sub.get('homework_id')}")
    print(f"submission_file_url: {sub.get('submission_file_url')}")
    print(f"extracted_text present: {'YES - ' + sub['extracted_text'][:80] if sub.get('extracted_text') else 'NO'}")
    print(f"ai_analysis present: {'YES' if sub.get('ai_analysis') else 'NO'}")
    print(f"answers count: {len(sub.get('answers', []))}")
    print(f"answers sample: {sub.get('answers', [])[:2]}")

    print()
    print("=" * 60)
    print("STEP 2: Fetch homework doc")
    print("=" * 60)
    hw = await db.homework.find_one({"_id": ObjectId(sub["homework_id"])})
    if not hw:
        print("ERROR: Homework doc not found!")
        return
    print(f"Homework title: {hw.get('title')}")
    print(f"submission_type: {hw.get('submission_type')}")
    print(f"questions count: {len(hw.get('questions', []))}")
    print(f"questions sample: {hw.get('questions', [])[:1]}")

    print()
    print("=" * 60)
    print("STEP 3: Test OCR")
    print("=" * 60)
    file_url = sub.get("submission_file_url")
    if not file_url:
        print("ERROR: No submission_file_url on submission — OCR cannot run!")
        print("This is likely the root cause. The file URL was not saved to the submission doc.")
    else:
        print(f"File URL: {file_url}")
        print("Running OCR...")
        try:
            from services.ocr import extract_text_from_url
            text = await extract_text_from_url(file_url)
            if text:
                print(f"OCR SUCCESS: {len(text)} chars extracted")
                print(f"Preview: {text[:200]}")
            else:
                print("OCR returned empty string — check logs above for errors")
        except Exception as e:
            print(f"OCR EXCEPTION: {e}")
            import traceback; traceback.print_exc()

    print()
    print("=" * 60)
    print("STEP 4: Test AI grader with mock extracted_text")
    print("=" * 60)
    # Inject a mock extracted_text to test grader independently
    test_sub = dict(sub)
    test_sub["extracted_text"] = "Q1: 3, Q2: -1, Q3: number line drawn, Q4: -7, Q5: -4"
    try:
        from services.ai_grader import analyse_submission
        print("Running analyse_submission with mock extracted_text...")
        result = await analyse_submission(hw or {}, test_sub)
        if result.get("overall_summary") == "AI analysis unavailable.":
            print(f"AI GRADER FAILED: {result.get('parse_error', 'unknown error')}")
            print(f"Raw: {result.get('raw', '')[:300]}")
        else:
            print(f"AI GRADER SUCCESS: score={result.get('estimated_score_pct')}%")
            print(f"Summary: {result.get('overall_summary')}")
    except Exception as e:
        print(f"AI GRADER EXCEPTION: {e}")
        import traceback; traceback.print_exc()

    print()
    print("=" * 60)
    print("STEP 5: Check qa_pairs build (answers vs questions matching)")
    print("=" * 60)
    questions = {q["id"]: q for q in hw.get("questions", [])}
    answers = sub.get("answers", [])
    print(f"Question IDs in hw: {list(questions.keys())}")
    print(f"question_id in answers: {[a.get('question_id') for a in answers]}")
    matched = [a for a in answers if questions.get(a.get("question_id"))]
    print(f"Matched pairs: {len(matched)} / {len(answers)}")
    if len(matched) == 0 and len(answers) > 0:
        print("ERROR: No answers match any question IDs — qa_pairs will be empty → _empty_analysis() returned!")

    client.close()

asyncio.run(main())
