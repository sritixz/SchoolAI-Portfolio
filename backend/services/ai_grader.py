"""
AI pre-analysis service.
Runs after a student submits homework — analyses each answer,
generates per-question feedback, estimates score, and identifies
error patterns. Teacher sees this before publishing the final grade.
"""
from services.llm import chat_completion
import json

GRADER_SYSTEM = """You are an expert academic grader assistant.
Analyse a student's homework submission and provide detailed, constructive feedback.
Return ONLY valid JSON — no markdown fences."""

async def analyse_submission(homework: dict, submission: dict) -> dict:
    """
    homework  — the homework document from MongoDB (has questions, subject, title)
    submission — the submission document (has answers, student_id)
    Returns an analysis dict saved back to the submission.
    """
    questions = {q["id"]: q for q in homework.get("questions", [])}
    answers   = submission.get("answers", [])
    subject   = homework.get("subject", "General")
    title     = homework.get("title", "Homework")

    # Build per-question analysis prompt
    qa_pairs = []
    extracted_text = submission.get("extracted_text", "")

    for ans in answers:
        q = questions.get(ans.get("question_id") or ans.get("question_id", ""))
        if not q:
            continue
        qa_pairs.append({
            "question_id":   q["id"],
            "question_text": q.get("question_text", ""),
            "answer_type":   q.get("answer_type", "typed"),
            "max_points":    q.get("max_points", 1),
            "sample_answer": q.get("sample_answer", ""),
            "student_answer": ans.get("answer") or extracted_text or ans.get("file_url", "[file uploaded]"),
            "options":       q.get("options", []),
        })

    # For file_upload / handwritten submissions: answers list is empty but
    # the student uploaded a file. Build qa_pairs from homework questions
    # using extracted_text as the student's overall answer.
    is_file_upload = not qa_pairs and extracted_text and homework.get("questions")
    if is_file_upload:
        for q in homework.get("questions", []):
            qa_pairs.append({
                "question_id":   q.get("id", ""),
                "question_text": q.get("question_text", ""),
                "answer_type":   q.get("answer_type", "typed"),
                "max_points":    q.get("max_points", 1),
                "sample_answer": q.get("sample_answer", ""),
                "student_answer": "[see full submission text below]",
                "options":       q.get("options", []),
            })
        # Append the full extracted text once at the end so the LLM can reference it
        qa_pairs_with_context = {
            "questions": qa_pairs,
            "full_student_submission": extracted_text,
        }
    else:
        is_file_upload = False
        qa_pairs_with_context = {"questions": qa_pairs}

    if not qa_pairs:
        return _empty_analysis()

    prompt = f"""Subject: {subject}
Assignment: {title}

You are grading a student's homework submission. The student submitted a written/typed solutions document which has been OCR-extracted. The document contains the student's answers to each question.

GRADING RULES:
- The extracted text IS the student's answer — trust it completely
- For MCQ: find the student's stated answer and check if it matches the option where is_correct=true
- For typed/written: evaluate correctness based on mathematical/factual accuracy
- Do NOT second-guess the student's answer — if they wrote "-7" and -7 is mathematically correct, mark it correct
- The "Answer:" lines in the extracted text are the student's final answers

IMPORTANT for MCQ scoring: Look at the options array. The option with "is_correct": true is the correct answer. If the student's answer matches that option's text value, mark is_correct=true and give full points.

Questions and student submission:
{json.dumps(qa_pairs_with_context, indent=2)}

Return JSON:
{{
  "overall_summary": "2-3 sentence summary of student performance",
  "estimated_score_pct": 100,
  "strength_areas": ["topic1", "topic2"],
  "weakness_areas": ["topic3"],
  "error_patterns": [],
  "question_analysis": [
    {{
      "question_id": "q1",
      "is_correct": true,
      "ai_score": 1,
      "max_points": 1,
      "student_answer": "The exact answer value from the student's document (e.g. '3' or '-1' or '-7')",
      "feedback": "Correct. Good understanding of...",
      "error_type": null
    }}
  ],
  "suggested_teacher_feedback": "Personalised message to student (2-3 sentences)"
}}"""

    try:
        raw = await chat_completion([
            {"role": "system", "content": GRADER_SYSTEM},
            {"role": "user",   "content": prompt},
        ])
        raw = raw.strip().lstrip("```json").lstrip("```").rstrip("```").strip()
        result = json.loads(raw)

        # For file_upload submissions, deterministically re-score MCQ questions
        # by parsing "Answer: X" lines from the extracted text.
        # This is more reliable than substring matching or LLM grading.
        if extracted_text and homework.get("questions"):
            import re
            # Parse "Answer: <value>" lines from the OCR text
            # Handles unicode minus signs (−) and regular hyphens (-)
            answer_pattern = re.compile(
                r'(?:Question\s+(\d+).*?)?Answer[:\s]+([^\n]+)',
                re.IGNORECASE | re.DOTALL
            )
            # Build a map of question_number -> answer_text from the extracted text
            # by splitting on "Question N" sections
            sections = re.split(r'Question\s+(\d+)', extracted_text, flags=re.IGNORECASE)
            q_answers = {}  # question_number (1-based) -> answer text
            for i in range(1, len(sections), 2):
                q_num = int(sections[i])
                section_text = sections[i + 1] if i + 1 < len(sections) else ""
                ans_match = re.search(r'Answer[:\s]+([^\n]+)', section_text, re.IGNORECASE)
                if ans_match:
                    # Normalize unicode minus to regular hyphen, strip whitespace
                    ans_val = ans_match.group(1).strip().replace('\u2212', '-').replace('\u2013', '-')
                    q_answers[q_num] = ans_val

            # Map question IDs to question numbers
            hw_questions = homework.get("questions", [])
            qid_to_num = {q.get("id"): q.get("question_number", i+1) for i, q in enumerate(hw_questions)}

            total_pts = 0
            earned_pts = 0
            for qa in result.get("question_analysis", []):
                q = questions.get(qa["question_id"])
                if not q:
                    total_pts += qa.get("max_points", 1)
                    earned_pts += qa.get("ai_score", 0)
                    continue
                max_pts = q.get("max_points", 1)
                total_pts += max_pts
                atype = q.get("answer_type", "typed")
                q_num = qid_to_num.get(qa["question_id"])
                student_ans_text = q_answers.get(q_num, "").lower().strip()

                if atype == "mcq" and student_ans_text:
                    # Find which option the student's answer matches
                    matched_opt = None
                    for o in q.get("options", []):
                        opt_text = o.get("text", "").strip().lower().replace('\u2212', '-')
                        if opt_text and (opt_text in student_ans_text or student_ans_text in opt_text):
                            # Prefer correct option if multiple options have same text
                            if matched_opt is None or o.get("is_correct"):
                                matched_opt = o
                    if matched_opt:
                        is_correct = matched_opt.get("is_correct", False)
                        qa["is_correct"] = is_correct
                        qa["ai_score"] = max_pts if is_correct else 0
                        qa["student_answer"] = matched_opt.get("text", student_ans_text)
                    else:
                        # Couldn't match to an option — keep LLM result but update student_answer
                        qa["student_answer"] = student_ans_text or qa.get("student_answer", "")

                earned_pts += qa.get("ai_score", 0)

            # Recalculate score
            if total_pts > 0:
                result["estimated_score_pct"] = round(earned_pts / total_pts * 100)

        return result
    except Exception as e:
        return {**_empty_analysis(), "parse_error": str(e), "raw": raw if "raw" in dir() else ""}

def _empty_analysis():
    return {
        "overall_summary": "AI analysis unavailable.",
        "estimated_score_pct": 0,
        "strength_areas": [],
        "weakness_areas": [],
        "error_patterns": [],
        "question_analysis": [],
        "suggested_teacher_feedback": "",
    }
