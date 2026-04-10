"""Test exam prep AI endpoints directly to find the actual errors."""
import asyncio
import sys
import json
sys.path.insert(0, '.')

from services.llm import chat_completion
from datetime import date

async def test_self_assessment_quiz():
    """Simulate what the /exam-prep/self-assessment-quiz endpoint does."""
    print("\n=== TEST: Self-Assessment Quiz ===")
    subject = "English"
    class_label = "8"
    board = "ICSE"
    topics_str = "key topics across the syllabus"

    prompt = f"""Generate a quick 5-question self-assessment quiz for a Class {class_label} {subject} student ({board} board).
Topics to cover: {topics_str}

This quiz helps gauge the student's current readiness level. Make questions representative of the full syllabus.

Return ONLY valid JSON (no markdown):
{{
  "subject": "{subject}",
  "questions": [
    {{
      "id": "q1",
      "question": "Question text",
      "options": [
        {{"id": "A", "text": "Option A", "is_correct": false}},
        {{"id": "B", "text": "Option B", "is_correct": true}},
        {{"id": "C", "text": "Option C", "is_correct": false}},
        {{"id": "D", "text": "Option D", "is_correct": false}}
      ],
      "explanation": "Why the correct answer is right",
      "topic": "Which topic this tests"
    }}
  ]
}}

RULES:
- Exactly 5 MCQ questions, 4 options each, exactly one correct
- Cover different topics/chapters for breadth
- Mix easy (2), medium (2), hard (1) difficulty
- Questions must be Class {class_label} {board} syllabus appropriate
"""
    try:
        raw = await chat_completion([
            {"role": "system", "content": f"You are an expert {subject} teacher for Class {class_label} {board} students. Generate accurate, curriculum-aligned MCQ questions. Return only valid JSON."},
            {"role": "user", "content": prompt}
        ])
        print("RAW RESPONSE (first 500 chars):", raw[:500])
        clean = raw.strip()
        if "```" in clean:
            parts = clean.split("```")
            inner = parts[1] if len(parts) > 1 else clean
            if inner.startswith("json"):
                inner = inner[4:]
            clean = inner.strip()
        result = json.loads(clean)
        print("PARSED OK - questions count:", len(result.get("questions", [])))
    except json.JSONDecodeError as e:
        print("JSON PARSE ERROR:", e)
        print("Raw was:", raw[:500])
    except Exception as e:
        print("ERROR:", type(e).__name__, str(e))


async def test_practice_questions():
    """Simulate what the /exam-prep/practice-questions endpoint does."""
    print("\n=== TEST: Practice Questions ===")
    subject = "English"
    class_label = "8"
    board_label = "ICSE"
    difficulty = "medium"
    topics_instruction = f"Cover key topics from the standard {board_label} Class {class_label} {subject} syllabus"

    prompt = f"""Generate 5 practice questions for a Class {class_label} {subject} student ({board_label} board).
{topics_instruction}
Exam pattern: mixed
Difficulty: {difficulty}

Return ONLY valid JSON (no markdown fences):
{{
  "questions": [
    {{
      "id": "q1",
      "question": "Question text here",
      "topic": "Which specific topic/chapter this is from",
      "options": [
        {{"id": "A", "text": "Option A", "is_correct": false}},
        {{"id": "B", "text": "Option B", "is_correct": true}},
        {{"id": "C", "text": "Option C", "is_correct": false}},
        {{"id": "D", "text": "Option D", "is_correct": false}}
      ],
      "explanation": "Clear step-by-step explanation of why the correct answer is right",
      "trick": "A quick memory trick or shortcut to remember this"
    }}
  ]
}}

RULES:
- All 5 questions must be MCQ with exactly 4 options
- Exactly one option must have is_correct: true
- Questions must be directly relevant to {subject} Class {class_label} {board_label} syllabus
- Each question must test a different concept
- explanation must be clear, educational, and show the working/reasoning
- difficulty: {difficulty} — adjust question complexity accordingly
"""
    try:
        raw = await chat_completion([
            {"role": "system", "content": f"You are an expert {subject} teacher for Class {class_label} {board_label} students. Generate accurate, curriculum-aligned MCQ practice questions. Return only valid JSON."},
            {"role": "user", "content": prompt}
        ])
        print("RAW RESPONSE (first 500 chars):", raw[:500])
        clean = raw.strip()
        if "```" in clean:
            parts = clean.split("```")
            inner = parts[1] if len(parts) > 1 else clean
            if inner.startswith("json"):
                inner = inner[4:]
            clean = inner.strip()
        result = json.loads(clean)
        print("PARSED OK - questions count:", len(result.get("questions", [])))
    except json.JSONDecodeError as e:
        print("JSON PARSE ERROR:", e)
        print("Raw was:", raw[:500])
    except Exception as e:
        print("ERROR:", type(e).__name__, str(e))


async def test_notes():
    """Simulate what the /exam-prep/notes endpoint does."""
    print("\n=== TEST: Notes (short) ===")
    subject = "English"
    class_label = "8"
    board_label = "ICSE"
    note_type = "short"
    days_left = 10

    topics_context = f"SYLLABUS: Full {board_label} Class {class_label} {subject} curriculum — cover the most important chapters"
    brevity = "5-7 clear bullet points per topic with simple explanations, key concepts, examples, and important definitions"

    prompt = f"""Generate revision notes for Class {class_label} {subject} ({board_label} board).
{topics_context}
Style: {brevity}
Days until exam: {days_left}. Cover all key topics systematically.

Return ONLY valid JSON (no markdown fences):
{{
  "sections": [
    {{
      "topic": "Exact Topic/Chapter Name",
      "isWeakTopic": false,
      "points": ["Key point 1 with detail", "Key point 2 with example", "Key point 3"],
      "formula": "Key formula if applicable, else null"
    }}
  ]
}}

RULES:
- Generate notes for 5-6 most important topics/chapters
- Each topic name must be the actual chapter/concept name from the {board_label} Class {class_label} {subject} syllabus
- Points must be factually accurate and exam-relevant
- Mark isWeakTopic: true for topics matching the weak topics list
- formula field: include the most important formula for that topic, or null"""

    try:
        raw = await chat_completion([
            {"role": "system", "content": f"You are an expert {subject} teacher for Class {class_label} {board_label} students. Generate accurate, curriculum-aligned study notes. Return only valid JSON, no markdown."},
            {"role": "user", "content": prompt}
        ])
        print("RAW RESPONSE (first 500 chars):", raw[:500])
        clean = raw.strip()
        if "```" in clean:
            parts = clean.split("```")
            inner = parts[1] if len(parts) > 1 else clean
            if inner.startswith("json"):
                inner = inner[4:]
            clean = inner.strip()
        result = json.loads(clean)
        print("PARSED OK - sections count:", len(result.get("sections", [])))
    except json.JSONDecodeError as e:
        print("JSON PARSE ERROR:", e)
        print("Raw was:", raw[:500])
    except Exception as e:
        print("ERROR:", type(e).__name__, str(e))


async def main():
    await test_self_assessment_quiz()
    await test_practice_questions()
    await test_notes()

asyncio.run(main())
