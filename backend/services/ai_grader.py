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
            "student_answer": ans.get("answer") or ans.get("file_url", "[file uploaded]"),
            "options":       q.get("options", []),
        })

    if not qa_pairs:
        return _empty_analysis()

    prompt = f"""Subject: {subject}
Assignment: {title}

Analyse each student answer below. For MCQ, check against correct option.
For typed/upload answers, evaluate against the sample answer and rubric.

Questions and student answers:
{json.dumps(qa_pairs, indent=2)}

Return JSON:
{{
  "overall_summary": "2-3 sentence summary of student performance",
  "estimated_score_pct": 72,
  "strength_areas": ["topic1", "topic2"],
  "weakness_areas": ["topic3"],
  "error_patterns": ["Consistent sign errors in algebra", "..."],
  "question_analysis": [
    {{
      "question_id": "q1",
      "is_correct": true,
      "ai_score": 1,
      "max_points": 1,
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
        return json.loads(raw)
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
