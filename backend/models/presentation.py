from pydantic import BaseModel, Field
from typing import Optional, List, Any
from datetime import datetime

class PresentationSlide(BaseModel):
    """Individual slide in a presentation"""
    number: int
    type: str  # title, hook, content, example, activity, summary, assessment
    title: str
    subtitle: Optional[str] = None
    content: Optional[dict] = None
    speaker_notes: Optional[str] = None
    engagement_prompt: Optional[str] = None
    vibrant_accent_color: Optional[str] = None
    duration_minutes: Optional[int] = None

class PresentationCreate(BaseModel):
    """Request to generate a presentation"""
    subject: str
    topic: str
    grade: str
    num_slides: int = 10
    duration_minutes: int = 30
    purpose: str = "teaching"
    visual_style: str = "modern"
    board: str = "CBSE"
    chapter: Optional[str] = None
    learning_objective: str = "Concept Understanding"
    special_instructions: Optional[str] = None
    target_audience: str = "students"
    tone: str = "Engaging"
    content_depth: str = "Concise"
    include_mini_quiz: bool = False

class PresentationHistory(BaseModel):
    """Saved presentation in history"""
    id: Optional[str] = Field(None, alias="_id")
    teacher_id: str
    subject: str
    topic: str
    grade: str
    board: str
    chapter: Optional[str] = None
    title: str
    total_slides: int
    duration_minutes: int
    purpose: str
    visual_style: str
    tone: str
    content_depth: str
    target_audience: str
    learning_objective: str
    include_mini_quiz: bool
    special_instructions: Optional[str] = None
    slides: List[dict] = []
    learning_objectives: List[str] = []
    teacher_preparation_notes: Optional[str] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    
    class Config:
        populate_by_name = True
