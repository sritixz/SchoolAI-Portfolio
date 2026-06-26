from fastapi import APIRouter, Depends, HTTPException
from bson import ObjectId
from datetime import datetime
from dependencies import require_role
from database import get_db
from models.learning_gap import GapQuizSubmission
import json

router = APIRouter(prefix="/learning-gaps", tags=["learning-gaps"])

def _ser(doc):
    if doc and "_id" in doc:
        doc["_id"] = str(doc["_id"])
    return doc

# ── System prompt for gap analysis ──────────────────────────
GAP_ANALYSIS_SYSTEM = """You are an expert academic learning analyst for a K-12 school platform.
Your job is to analyze a student's actual homework and assessment performance data and identify
specific learning gaps — topics where the student is consistently struggling.

RULES:
- Base your analysis ONLY on the actual submission data provided (scores, wrong answers, error patterns, weakness areas)
- Identify 3-6 specific gaps with concrete evidence from the data
- severity: "critical" if mastery < 45%, "moderate" if 45-65%, "minor" if 65-75%
- Each gap must reference the specific homework/assessment it was identified from
- correctivePath must be actionable steps tailored to the specific weakness
- aiErrorSummary must describe the SPECIFIC mistakes the student made (from error_patterns/feedback)
- aiLastFeedback must be a personalized coaching message referencing their actual errors
- Return ONLY valid JSON — no markdown fences, no extra text"""

async def _build_performance_context(student_id: str, db) -> dict:
    """Pull all relevant performance data for a student."""
    # Recent homework submissions with AI analysis
    submissions = await db.homework_submissions.find(
        {"student_id": student_id}
    ).sort("submitted_at", -1).to_list(30)

    # Homework details for each submission
    hw_ids = list({s.get("homework_id") for s in submissions if s.get("homework_id")})
    homeworks = {}
    for hid in hw_ids:
        try:
            hw = await db.homeworks.find_one({"_id": ObjectId(hid)})
            if hw:
                homeworks[hid] = hw
        except Exception:
            pass

    # Quiz attempts
    quiz_attempts = await db.quiz_attempts.find(
        {"student_id": student_id}
    ).sort("submitted_at", -1).to_list(20)

    # Grades
    grades = await db.grades.find({"student_id": student_id}).to_list(None)

    return {
        "submissions": submissions,
        "homeworks": homeworks,
        "quiz_attempts": quiz_attempts,
        "grades": grades,
    }

@router.post("/analyze")
async def analyze_gaps(user=Depends(require_role("student")), db=Depends(get_db)):
    """
    Pull the student's real homework/assessment performance data, send it to the LLM
    with a rich system prompt, and upsert identified learning gaps into the DB.
    """
    from services.llm import chat_completion

    perf = await _build_performance_context(user["id"], db)
    submissions = perf["submissions"]
    homeworks   = perf["homeworks"]
    grades      = perf["grades"]

    if not submissions and not grades:
        return {"gaps_created": 0, "message": "No performance data found yet. Complete some homework first."}

    # Build a structured summary for the LLM
    sub_summaries = []
    for sub in submissions[:20]:
        hid  = sub.get("homework_id", "")
        hw   = homeworks.get(hid, {})
        analysis = sub.get("analysis") or sub.get("ai_analysis") or {}
        sub_summaries.append({
            "homework_id":      str(hid),
            "homework_title":   hw.get("title", sub.get("title", "Homework")),
            "subject":          hw.get("subject", sub.get("subject", "General")),
            "score_pct":        sub.get("score_pct") or sub.get("ai_score") or analysis.get("estimated_score_pct", 0),
            "submitted_at":     sub.get("submitted_at", ""),
            "weakness_areas":   analysis.get("weakness_areas", []),
            "strength_areas":   analysis.get("strength_areas", []),
            "error_patterns":   analysis.get("error_patterns", []),
            "overall_summary":  analysis.get("overall_summary", ""),
            "question_analysis": [
                {
                    "question": qa.get("question_id"),
                    "is_correct": qa.get("is_correct"),
                    "feedback": qa.get("feedback", ""),
                    "error_type": qa.get("error_type"),
                }
                for qa in analysis.get("question_analysis", []) if not qa.get("is_correct")
            ][:5],  # only wrong answers
        })

    grade_summary = [
        {"subject": g.get("subject", ""), "marks": g.get("marks", 0), "semester": g.get("semester", "")}
        for g in grades
    ]

    prompt = f"""Analyze this student's performance data and identify their learning gaps.

HOMEWORK & ASSESSMENT SUBMISSIONS (most recent first):
{json.dumps(sub_summaries, indent=2)}

GRADE RECORDS:
{json.dumps(grade_summary, indent=2)}

Based on the actual errors, weak areas, and low scores above, identify 3-6 specific learning gaps.

Return ONLY valid JSON (no markdown):
{{
  "gaps": [
    {{
      "subject": "Mathematics",
      "topic": "Quadratic Equations",
      "subtopic": "Discriminant & Nature of Roots",
      "severity": "critical",
      "masteryPercent": 35,
      "identifiedFrom": {{
        "title": "Unit 3 Quiz: Algebra Foundations",
        "type": "homework",
        "id": "homework_id_here"
      }},
      "impactAnalysis": "Affects performance in Calculus and advanced algebra topics.",
      "impactSubject": "Calculus",
      "prerequisiteDependency": "Requires mastery of Basic Algebra and factoring.",
      "prerequisiteSubject": "Basic Algebra",
      "aiErrorSummary": "Student consistently confused the sign of the discriminant when b is negative. Squared a negative number incorrectly in 3 out of 4 attempts.",
      "aiLastFeedback": "In your last submission you wrote b² = -16 when b = -4. Remember: (-4)² = +16, not -16. Squaring always gives a positive result.",
      "correctivePath": [
        {{"type": "video",    "label": "Watch Explanation", "icon": "play_circle"}},
        {{"type": "practice", "label": "Practice Problems",  "icon": "quiz"}}
      ],
      "retryQuestion": {{
        "text": "For 3x² - 4x + 5 = 0, find the discriminant and state the nature of roots.",
        "equation": "D = b² - 4ac"
      }}
    }}
  ]
}}

IMPORTANT:
- identifiedFrom.id must match the homework_id of the corresponding homework/assessment from the submissions list
- masteryPercent must reflect the actual score data (not a guess)
- severity: critical if masteryPercent < 45, moderate if 45-65, minor if 65-75
- aiErrorSummary must reference SPECIFIC mistakes from the submission data above
- Only include gaps with real evidence from the data
"""

    try:
        raw = await chat_completion(
            [
                {"role": "system", "content": GAP_ANALYSIS_SYSTEM},
                {"role": "user",   "content": prompt},
            ]
        )
        raw = raw.strip()
        if raw.startswith("```"):
            raw = raw.split("```")[1]
            if raw.startswith("json"):
                raw = raw[4:]
            raw = raw.strip()
        result = json.loads(raw)
    except Exception as e:
        raise HTTPException(500, f"Gap analysis failed: {str(e)}")

    gaps_created = 0
    now = datetime.utcnow().isoformat()
    for gap in result.get("gaps", []):
        identified_from = gap.get("identifiedFrom", {"title": "Performance Analysis", "type": "homework"})
        if isinstance(identified_from, dict):
            g_type = identified_from.get("type", "homework")
            g_id = identified_from.get("id")
            title = identified_from.get("title", "")
            
            # As a fallback: if the LLM outputted a placeholder or no ID, resolve it by searching submissions
            if (not g_id or g_id == "homework_id_here") and g_type == "homework" and title:
                for sub in submissions:
                    hid = sub.get("homework_id")
                    if hid:
                        hw = homeworks.get(hid, {})
                        if hw.get("title") == title or sub.get("title") == title:
                            g_id = str(hid)
                            break
            
            # Clean up placeholder values
            if g_id == "homework_id_here":
                g_id = None

            if g_id:
                identified_from["id"] = str(g_id)
            else:
                # Substring case-insensitive match fallback
                if len(submissions) == 1 and g_type == "homework":
                    identified_from["id"] = str(submissions[0].get("homework_id", ""))
                elif len(submissions) > 0 and g_type == "homework" and title:
                    for sub in submissions:
                        hid = sub.get("homework_id")
                        if hid:
                            hw = homeworks.get(hid, {})
                            h_title = hw.get("title", sub.get("title", "")).lower()
                            if title.lower() in h_title or h_title in title.lower():
                                identified_from["id"] = str(hid)
                                break

        doc = {
            "student_id":             user["id"],
            "subject":                gap.get("subject", "General"),
            "topic":                  gap.get("topic", "Unknown"),
            "subtopic":               gap.get("subtopic", ""),
            "severity":               gap.get("severity", "minor"),
            "masteryPercent":         gap.get("masteryPercent", 50),
            "score":                  gap.get("masteryPercent", 50),
            "resolved":               False,
            "identifiedFrom":         identified_from,
            "impactAnalysis":         gap.get("impactAnalysis", ""),
            "impactSubject":          gap.get("impactSubject", gap.get("subject", "")),
            "prerequisiteDependency": gap.get("prerequisiteDependency", ""),
            "prerequisiteSubject":    gap.get("prerequisiteSubject", ""),
            "aiErrorSummary":         gap.get("aiErrorSummary", ""),
            "aiLastFeedback":         gap.get("aiLastFeedback", ""),
            "correctivePath":         gap.get("correctivePath", [
                {"type": "video",    "label": "Watch Explanation", "icon": "play_circle"},
                {"type": "practice", "label": "Practice Problems",  "icon": "quiz"},
            ]),
            "retryQuestion":          gap.get("retryQuestion", {}),
            "source":                 "ai_analysis",
            "analyzed_at":            now,
        }
        # Upsert: update existing gap for same topic or insert new
        await db.learning_gaps.update_one(
            {"student_id": user["id"], "topic": doc["topic"], "resolved": False},
            {"$set": doc},
            upsert=True,
        )
        gaps_created += 1

    return {"gaps_created": gaps_created, "message": f"Analysis complete. {gaps_created} learning gaps identified from your performance data."}


@router.get("/")
async def get_gaps(user=Depends(require_role("student")), db=Depends(get_db)):
    docs = await db.learning_gaps.find({"student_id": user["id"], "resolved": False}).to_list(None)
    return [_ser(d) for d in docs]

@router.get("/health")
async def gap_health(user=Depends(require_role("student")), db=Depends(get_db)):
    total    = await db.learning_gaps.count_documents({"student_id": user["id"]})
    resolved = await db.learning_gaps.count_documents({"student_id": user["id"], "resolved": True})
    critical = await db.learning_gaps.count_documents({"student_id": user["id"], "severity": "critical", "resolved": False})
    moderate = await db.learning_gaps.count_documents({"student_id": user["id"], "severity": "moderate", "resolved": False})
    minor    = await db.learning_gaps.count_documents({"student_id": user["id"], "severity": "minor",    "resolved": False})
    active   = total - resolved
    score    = max(0, 100 - (critical * 15) - (moderate * 7) - (minor * 3))
    return {
        "score":              score,
        "maxScore":           100,
        "totalGaps":          active,
        "totalGapsTrend":     "",
        "resolvedGaps":       resolved,
        "resolvedGapsTrend":  "",
        "trend":              "",
        "improvementMessage": f"You have {active} active gap{'s' if active != 1 else ''} to work on.",
        "severity": {"critical": critical, "moderate": moderate, "minor": minor},
    }

@router.get("/{gap_id}")
async def get_gap(gap_id: str, user=Depends(require_role("student")), db=Depends(get_db)):
    try:
        doc = await db.learning_gaps.find_one({"_id": ObjectId(gap_id), "student_id": user["id"]})
    except Exception:
        raise HTTPException(400, "Invalid gap ID")
    if not doc:
        raise HTTPException(404, "Gap not found")
    return _ser(doc)

def _search_youtube_video_id(subject: str, topic: str, subtopic: str) -> str:
    import urllib.request
    import urllib.parse
    import re

    query = f"{subject} {topic} {subtopic} lesson".strip()
    encoded_query = urllib.parse.quote_plus(query)
    url = f"https://www.youtube.com/results?search_query={encoded_query}"
    
    headers = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
    }
    req = urllib.request.Request(url, headers=headers)
    try:
        with urllib.request.urlopen(req, timeout=5) as response:
            html = response.read().decode('utf-8')
        matches = re.findall(r'"videoId":"([^"]+)"', html)
        if matches:
            for match in matches:
                if len(match) == 11 and match != "undefined":
                    return match
    except Exception:
        pass

    # Keyword fallbacks if scraping fails
    t = (topic or "").lower()
    s = (subject or "").lower()
    if "quadratic" in t or "discriminant" in t or "root" in t:
        return "kYJqD9W2S6c"
    if "stoichiometry" in t or "mole" in t or "balance" in t or "balancing" in t:
        return "RnGu3xO2h74"
    if "newton" in t or "force" in t or "third law" in t:
        return "A32w-7e3h_4"
    if "trigonometry" in t or "sine" in t or "cosine" in t or "trig" in t:
        return "141C34R7L8w"
    if "chemistry" in s or "chemical" in t:
        return "RnGu3xO2h74"
    if "biology" in s or "cell" in t or "mitosis" in t:
        return "LqN684jYt8U"
    if "physics" in s or "forces" in t:
        return "A32w-7e3h_4"
    return "RnGu3xO2h74"

@router.get("/{gap_id}/remediation")
async def get_remediation(gap_id: str, user=Depends(require_role("student")), db=Depends(get_db)):
    import asyncio
    try:
        gap = await db.learning_gaps.find_one({"_id": ObjectId(gap_id), "student_id": user["id"]})
    except Exception:
        raise HTTPException(400, "Invalid gap ID")
    if not gap:
        raise HTTPException(404, "Gap not found")

    # Check cache first
    cached = await db.remediation_cache.find_one({"gap_id": gap_id})
    if cached:
        video_id = cached.get("video_id")
        if not video_id:
            video_id = await asyncio.to_thread(
                _search_youtube_video_id,
                gap.get("subject", ""),
                gap.get("topic", ""),
                gap.get("subtopic", "")
            )
            await db.remediation_cache.update_one({"gap_id": gap_id}, {"$set": {"video_id": video_id}})
        return {"gap": _ser(gap), "remediation": cached["content"], "video_id": video_id}

    from services.llm import chat_completion

    error_summary  = gap.get("aiErrorSummary", "")
    mastery        = gap.get("masteryPercent", gap.get("score", 50))
    identified_from = gap.get("identifiedFrom", {})
    source_title   = identified_from.get("title", "recent assessment") if isinstance(identified_from, dict) else str(identified_from)

    prompt = f"""Create a targeted remediation lesson for a student struggling with "{gap['topic']}" in {gap['subject']}.

STUDENT CONTEXT:
- Current mastery: {mastery}%
- Identified from: {source_title}
- Specific errors made: {error_summary or 'General weakness in this topic'}
- Subtopic: {gap.get('subtopic', gap['topic'])}

Design the remediation to directly address the student's specific errors above.
Return ONLY valid JSON (no markdown):
{{
  "explanation": "Clear, step-by-step explanation targeting the specific errors the student made",
  "examples": ["Worked example 1 addressing the specific mistake", "Worked example 2"],
  "key_points": ["Key rule or concept to remember", "Common mistake to avoid"],
  "practice_tip": "One specific practice strategy for this student"
}}"""
    try:
        raw = await chat_completion([
            {"role": "system", "content": f"You are an expert {gap['subject']} tutor. Create targeted remediation that directly addresses the student's specific errors. Return only valid JSON."},
            {"role": "user", "content": prompt},
        ])
        raw = raw.strip().lstrip("```json").lstrip("```").rstrip("```").strip()
        content = json.loads(raw)
    except Exception:
        content = {"explanation": f"Review {gap['topic']} in {gap['subject']}.", "examples": [], "key_points": [], "practice_tip": ""}

    # Resolve video ID dynamically on generation
    video_id = await asyncio.to_thread(
        _search_youtube_video_id,
        gap.get("subject", ""),
        gap.get("topic", ""),
        gap.get("subtopic", "")
    )
    await db.remediation_cache.insert_one({"gap_id": gap_id, "content": content, "video_id": video_id})
    return {"gap": _ser(gap), "remediation": content, "video_id": video_id}


@router.get("/quizzes")
async def list_quizzes(user=Depends(require_role("student")), db=Depends(get_db)):
    docs = await db.gap_quizzes.find({}, {"questions": 0}).to_list(None)
    return [_ser(d) for d in docs]

@router.get("/quiz/{quiz_id}")
async def get_quiz(quiz_id: str, user=Depends(require_role("student")), db=Depends(get_db)):
    # Try string id field first (e.g. "quiz001"), then ObjectId
    doc = await db.gap_quizzes.find_one({"id": quiz_id})
    if not doc:
        try:
            doc = await db.gap_quizzes.find_one({"_id": ObjectId(quiz_id)})
        except Exception:
            pass
            
    if doc:
        return _ser(doc)

    # If quiz not found directly, check if the ID is a gap_id
    try:
        gap = await db.learning_gaps.find_one({"_id": ObjectId(quiz_id), "student_id": user["id"]})
    except Exception:
        gap = None

    if gap:
        # Check if we already generated a quiz for this gap_id
        doc = await db.gap_quizzes.find_one({"gap_id": str(gap["_id"])})
        if doc:
            return _ser(doc)
            
        # Generate new quiz via LLM
        from services.llm import chat_completion
        import json
        from datetime import datetime
        
        prompt = f"""Generate a 5-question multiple choice quiz to test the student's understanding of "{gap.get('topic')}" in {gap.get('subject')}.
        
        Subtopic: {gap.get('subtopic', '')}
        Specific weakness to address: {gap.get('aiErrorSummary', 'General understanding')}
        
        Each question should have 4 options, only 1 correct option, and a helpful explanation for the correct answer and a hint.
        Return ONLY valid JSON (no markdown):
        {{
            "title": "{gap.get('topic')} Assessment",
            "questions": [
                {{
                    "id": "q1",
                    "number": 1,
                    "difficulty": "medium",
                    "prompt": "Question text here",
                    "equation": "Optional equation here or empty string",
                    "options": [
                        {{"id": "A", "text": "Option A text", "isCorrect": true}},
                        {{"id": "B", "text": "Option B text", "isCorrect": false}},
                        {{"id": "C", "text": "Option C text", "isCorrect": false}},
                        {{"id": "D", "text": "Option D text", "isCorrect": false}}
                    ],
                    "correct_option_id": "A",
                    "explanation": "Why A is correct",
                    "hint": "Hint to help"
                }}
            ]
        }}"""
        try:
            raw = await chat_completion([
                {"role": "system", "content": f"You are an expert {gap.get('subject', 'educator')} teacher creating targeted assessment questions. Return only valid JSON."},
                {"role": "user", "content": prompt}
            ])
            raw = raw.strip().lstrip("```json").lstrip("```").rstrip("```").strip()
            quiz_data = json.loads(raw)
            
            # Save it
            quiz_doc = {
                "gap_id": str(gap["_id"]),
                "student_id": user["id"],
                "title": quiz_data.get("title", f"{gap.get('topic')} Quiz"),
                "questions": quiz_data.get("questions", []),
                "created_at": datetime.utcnow().isoformat()
            }
            res = await db.gap_quizzes.insert_one(quiz_doc)
            quiz_doc["_id"] = res.inserted_id
            return _ser(quiz_doc)
            
        except Exception as e:
            raise HTTPException(500, f"Failed to generate quiz: {str(e)}")

    raise HTTPException(404, "Quiz or Gap not found")

@router.post("/quiz/submit")
async def submit_quiz(body: GapQuizSubmission, user=Depends(require_role("student")), db=Depends(get_db)):
    # Support both string ids (e.g. "quiz001") and ObjectIds
    quiz = await db.gap_quizzes.find_one({"id": body.quiz_id})
    if not quiz:
        try:
            quiz = await db.gap_quizzes.find_one({"_id": ObjectId(body.quiz_id)})
        except Exception:
            pass
    if not quiz:
        # the client might send the gap_id as the quiz_id since they navigated via /quiz/{gap_id}
        try:
            quiz = await db.gap_quizzes.find_one({"gap_id": body.quiz_id})
        except Exception:
            pass
    if not quiz:
        raise HTTPException(404, "Quiz not found")

    questions = {q["id"]: q for q in quiz.get("questions", [])}
    correct = sum(
        1 for a in body.answers
        if questions.get(a.get("question_id"), {}).get("correct_option_id") == a.get("selected_option_id")
    )
    total = len(quiz["questions"])
    score_pct = round(correct / total * 100) if total > 0 else 0

    # Save attempt
    await db.quiz_attempts.insert_one({
        "quiz_id": body.quiz_id,
        "student_id": user["id"],
        "answers": body.answers,
        "score_pct": score_pct,
        "submitted_at": datetime.utcnow().isoformat(),
    })

    # Mark gap resolved if score >= 70
    resolved = score_pct >= 70
    if resolved and quiz.get("gap_id"):
        await db.learning_gaps.update_one(
            {"_id": ObjectId(quiz["gap_id"])},
            {"$set": {"resolved": True, "resolved_at": datetime.utcnow().isoformat()}},
        )

    return {"score_pct": score_pct, "correct": correct, "total": total, "resolved": resolved}


from pydantic import BaseModel

class VerifyAnswerRequest(BaseModel):
    question_text: str
    student_answer: str

@router.post("/{gap_id}/practice-question")
async def generate_practice_question(gap_id: str, user=Depends(require_role("student")), db=Depends(get_db)):
    try:
        gap = await db.learning_gaps.find_one({"_id": ObjectId(gap_id), "student_id": user["id"]})
    except Exception:
        raise HTTPException(400, "Invalid gap ID")
    if not gap:
        raise HTTPException(404, "Gap not found")

    from services.llm import chat_completion
    
    error_summary = gap.get("aiErrorSummary", "")
    prompt = f"""Generate a single, highly targeted practice question for a student struggling with "{gap['topic']}" in {gap['subject']}.
    
    CONTEXT:
    - Subtopic: {gap.get('subtopic', gap['topic'])}
    - Mistakes/Weaknesses: {error_summary or 'General review'}
    
    Create a new question that specifically helps test and fix these weaknesses. It should be solvable by typing a text/numerical answer or showing steps.
    
    Return ONLY valid JSON (no markdown):
    {{
      "text": "The text of the question. E.g., 'Solve for x: x^2 - 6x + 8 = 0 and explain how you factored it.'",
      "equation": "Optional equation to display on a highlighted card",
      "hint": "A helpful hint tailored to avoid their common error"
    }}"""
    
    try:
        raw = await chat_completion([
            {"role": "system", "content": f"You are a professional educational developer for {gap['subject']}. Return only valid JSON."},
            {"role": "user", "content": prompt}
        ])
        raw = raw.strip().lstrip("```json").lstrip("```").rstrip("```").strip()
        data = json.loads(raw)
    except Exception:
        data = {
            "text": f"Solve a typical problem on {gap['topic']}.",
            "equation": "",
            "hint": "Double check your math calculations."
        }
    return data

@router.post("/{gap_id}/verify-answer")
async def verify_practice_answer(gap_id: str, body: VerifyAnswerRequest, user=Depends(require_role("student")), db=Depends(get_db)):
    try:
        gap = await db.learning_gaps.find_one({"_id": ObjectId(gap_id), "student_id": user["id"]})
    except Exception:
        raise HTTPException(400, "Invalid gap ID")
    if not gap:
        raise HTTPException(404, "Gap not found")

    from services.llm import chat_completion

    prompt = f"""Evaluate the student's answer/working for this practice question:
    
    QUESTION:
    {body.question_text}
    
    STUDENT ANSWER / WORKINGS:
    {body.student_answer}
    
    Evaluate the student's steps for conceptual accuracy and computational correctness.
    Return a score between 0 and 100 representing their level of correctness, and a brief coaching feedback message.
    
    Return ONLY valid JSON (no markdown):
    {{
      "score": 85,
      "feedback": "Your overall approach was excellent! However, you made a minor calculation error on the final step..."
    }}"""
    
    try:
        raw = await chat_completion([
            {"role": "system", "content": "You are an expert tutor. Evaluate the student's solution carefully. Return only valid JSON."},
            {"role": "user", "content": prompt}
        ])
        raw = raw.strip().lstrip("```json").lstrip("```").rstrip("```").strip()
        result = json.loads(raw)
        score = int(result.get("score", 50))
        feedback = result.get("feedback", "Good effort.")
    except Exception:
        score = 50
        feedback = "Answer submitted. Check your final steps."

    # Update gap attempts in DB
    attempts = gap.get("attempts", [])
    attempts = [a for a in attempts if isinstance(a, dict)]
    attempt_num = len(attempts) + 1
    new_attempt = {
        "attemptNumber": attempt_num,
        "score": score,
        "date": datetime.utcnow().isoformat()[:10],
        "question": body.question_text,
        "student_answer": body.student_answer,
        "feedback": feedback
    }
    
    await db.learning_gaps.update_one(
        {"_id": ObjectId(gap_id)},
        {"$push": {"attempts": new_attempt}}
    )
    
    # Also update masteryPercent if the new score is higher than current
    current_mastery = gap.get("masteryPercent", 0)
    if score > current_mastery:
        await db.learning_gaps.update_one(
            {"_id": ObjectId(gap_id)},
            {"$set": {"masteryPercent": score, "score": score}}
        )

    return {"score": score, "feedback": feedback, "attempt": new_attempt}

