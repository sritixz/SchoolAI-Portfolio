from pydantic import BaseModel
from typing import Optional, List
from enum import Enum

class EntryType(str, Enum):
    parent_reflection = "parent_reflection"
    milestone = "milestone"
    teacher_note = "teacher_note"
    achievement = "achievement"

class PortfolioEntry(BaseModel):
    student_id: str
    type: EntryType
    title: str
    text: str
    tags: List[str] = []
    author: Optional[str] = None  # teacher name or parent name
    date: Optional[str] = None

class PortfolioEntryOut(PortfolioEntry):
    id: str
