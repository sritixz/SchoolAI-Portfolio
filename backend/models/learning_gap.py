from pydantic import BaseModel
from typing import Optional, List
from enum import Enum

class GapSeverity(str, Enum):
    low = "low"
    medium = "medium"
    high = "high"

class LearningGap(BaseModel):
    id: str
    student_id: str
    subject: str
    topic: str
    severity: GapSeverity
    recommended_time: str
    resolved: bool = False

class GapQuizQuestion(BaseModel):
    id: str
    question_text: str
    options: List[dict]
    correct_option_id: str
    explanation: str

class GapQuizSubmission(BaseModel):
    quiz_id: str
    student_id: str
    answers: List[dict]  # [{question_id, selected_option_id}]

class RemediationContent(BaseModel):
    gap_id: str
    topic: str
    subject: str
    explanation: str
    examples: List[str] = []
    video_url: Optional[str] = None
    practice_questions: List[GapQuizQuestion] = []
