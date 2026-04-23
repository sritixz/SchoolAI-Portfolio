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

GRADING PRIORITY RULES:
1. student_answer contains the student's actual answer text (for MCQ, the option text they selected).
2. If student_answer is "[see full submission text below]", use the full_student_submission text to find the answer.
3. Never mark an answer wrong just because it came from OCR — trust the extracted text.
4. For MCQ: compare student_answer text against the option where is_correct=true. If they match, mark correct.
5. For typed/written: evaluate mathematical/factual correctness strictly.
6. Always populate student_answer in your response with the exact answer the student gave.

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
        # Priority chain: 1) typed/MCQ answer  2) extracted OCR text  3) file URL placeholder
        typed_answer = ans.get("answer")
        atype = q.get("answer_type", "typed")

        # For MCQ: resolve option ID to option text so the LLM can compare text directly
        if atype == "mcq" and typed_answer:
            matched_opt = next((o for o in q.get("options", []) if o.get("id") == typed_answer), None)
            student_answer = matched_opt.get("text", typed_answer) if matched_opt else typed_answer
        else:
            student_answer = typed_answer if typed_answer else (extracted_text or ans.get("file_url", "[file uploaded]"))

        qa_pairs.append({
            "question_id":   q["id"],
            "question_text": q.get("question_text", ""),
            "answer_type":   atype,
            "max_points":    q.get("max_points", 1),
            "sample_answer": q.get("sample_answer", ""),
            "student_answer": student_answer,
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
    elif extracted_text and qa_pairs:
        # Mixed submission: has both per-question answers AND extracted OCR text
        # Attach the full OCR text as additional context for the grader
        is_file_upload = True  # reuse the context-injection path
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

            # Normalize unicode minus signs throughout
            norm_text = extracted_text.replace('\u2212', '-').replace('\u2013', '-')

            # Try splitting on "Question N" first (Kevin's PDF format), then "QN:" (Lucy's format)
            sections_q = re.split(r'Question\s+(\d+)', norm_text, flags=re.IGNORECASE)
            sections_qn = re.split(r'\bQ(\d+)\s*[:\.]', norm_text, flags=re.IGNORECASE)

            # Use whichever split produced more sections
            sections = sections_q if len(sections_q) >= len(sections_qn) else sections_qn

            q_answers = {}  # question_number (1-based) -> answer text
            for i in range(1, len(sections), 2):
                try:
                    q_num = int(sections[i])
                except ValueError:
                    continue
                section_text = sections[i + 1] if i + 1 < len(sections) else ""
                # Match "Answer:", "→ Answer:", "Result:", "→ Result:" patterns
                ans_match = re.search(
                    r'(?:→\s*)?(?:Answer|Result)[:\s]+([^\n]+)',
                    section_text, re.IGNORECASE
                )
                if ans_match:
                    ans_val = ans_match.group(1).strip()
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
                        prev_correct = qa.get("is_correct")
                        qa["is_correct"] = is_correct
                        qa["ai_score"] = max_pts if is_correct else 0
                        qa["student_answer"] = matched_opt.get("text", student_ans_text)
                        # Fix feedback if it contradicts the deterministic score
                        if prev_correct != is_correct:
                            correct_opt = next((o for o in q.get("options", []) if o.get("is_correct")), None)
                            correct_text = correct_opt.get("text", "") if correct_opt else ""
                            if is_correct:
                                qa["feedback"] = f"Correct. {qa.get('feedback', '')}".replace("Incorrect.", "").replace("incorrect.", "").strip()
                                if not qa["feedback"].lower().startswith("correct"):
                                    qa["feedback"] = f"Correct. {qa['feedback']}".strip()
                            else:
                                qa["feedback"] = f"Incorrect. The correct answer is: {correct_text}."
                    else:
                        # Couldn't match to an option — keep LLM result but update student_answer
                        qa["student_answer"] = student_ans_text or qa.get("student_answer", "")
                elif atype == "typed" and student_ans_text:
                    # For typed answers, check if feedback contradicts is_correct
                    is_correct = qa.get("is_correct")
                    feedback_lower = (qa.get("feedback") or "").lower()
                    feedback_says_incorrect = feedback_lower.startswith("incorrect") or "incorrect" in feedback_lower[:20]
                    feedback_says_correct   = feedback_lower.startswith("correct") or feedback_lower.startswith("yes")
                    if is_correct is True and feedback_says_incorrect:
                        qa["feedback"] = qa["feedback"].replace("Incorrect.", "Correct.").replace("incorrect.", "correct.")
                    elif is_correct is False and feedback_says_correct and not feedback_says_incorrect:
                        sample = q.get("sample_answer", "")
                        qa["feedback"] = f"Incorrect. {('Expected: ' + sample + '. ') if sample else ''}{qa.get('feedback', '')}"

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
