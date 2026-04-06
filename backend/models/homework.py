from pydantic import BaseModel, Field
from typing import Optional, List, Any
from enum import Enum
from datetime import date, datetime

class SubmissionType(str, Enum):
    online_quiz  = "online_quiz"   # MCQ / typed in-app
    file_upload  = "file_upload"   # PDF, image upload
    handwritten  = "handwritten"   # photo of handwritten work

class DifficultyLevel(str, Enum):
    low    = "low"
    medium = "medium"
    high   = "high"

class AnswerType(str, Enum):
    mcq    = "mcq"
    typed  = "typed"
    upload = "upload"

class QuestionOption(BaseModel):
    id: str
    text: str
    is_correct: bool = False

class Question(BaseModel):
    id: str
    question_number: int
    total_questions: int
    question_text: str
    answer_type: AnswerType
    options: List[QuestionOption] = []
    hint: Optional[str] = None
    vin_nudge: Optional[str] = None
    math_reference: Optional[Any] = None
    max_points: int = 1
    sample_answer: Optional[str] = None
    accepted_formats: Optional[List[str]] = None
    max_file_size_mb: Optional[int] = 20

class HomeworkCreate(BaseModel):
    subject: str
    title: str
    description: str
    assigned_to_class: str
    assigned_students: List[str] = []   # student IDs; empty = whole class
    due_date: str                        # ISO date string
    submission_type: SubmissionType = SubmissionType.online_quiz
    difficulty_level: DifficultyLevel = DifficultyLevel.medium
    estimated_duration_minutes: int = 30
    questions: List[Question] = []
    tags: List[str] = []
    total_marks: int = 0
    instructions: Optional[str] = None
    ai_assistant_enabled: bool = True    # Allow students to use Vin AI assistant

class HomeworkAssign(BaseModel):
    homework_id: str
    student_ids: List[str]
    due_date: Optional[str] = None

class AnswerPayload(BaseModel):
    question_id: str
    answer: Optional[str] = None        # text answer or selected MCQ option id
    file_url: Optional[str] = None      # S3 URL for uploads
    answer_type: Optional[str] = None

class HomeworkSubmission(BaseModel):
    homework_id: str
    student_id: str = ""                # filled from JWT
    answers: List[AnswerPayload] = []
    submission_file_url: Optional[str] = None  # single file for handwritten/upload type

class AIAnalysisRequest(BaseModel):
    submission_id: str

class TeacherGradeRequest(BaseModel):
    homework_id: str
    student_id: str
    final_grade: str                    # e.g. "A", "85%"
    final_score: Optional[float] = None
    teacher_feedback: str
    question_overrides: List[dict] = [] # [{question_id, points_awarded, comment}]
    publish: bool = True                # publish result to student
