"""
School data models — the core structure that everything else hangs off.

Hierarchy:
  School → Grade → Section → Students
                           → SubjectAssignments (teacher per subject)
"""
from pydantic import BaseModel, EmailStr
from typing import Optional, List
from enum import Enum


# ── Grade ────────────────────────────────────────────────────
class GradeCreate(BaseModel):
    grade_number: str           # "6", "7", "8" … "12"
    subjects: List[str] = []    # ["Mathematics", "Science", "SST", "English"]

class GradeUpdate(BaseModel):
    subjects: Optional[List[str]] = None


# ── Section ──────────────────────────────────────────────────
class SectionCreate(BaseModel):
    grade_number: str           # must match an existing grade
    section_name: str           # "A", "B", "C"
    class_teacher_id: Optional[str] = None   # optional class teacher

class SectionUpdate(BaseModel):
    class_teacher_id: Optional[str] = None


# ── Subject assignment ────────────────────────────────────────
class SubjectAssignmentCreate(BaseModel):
    section_id: str
    subject: str
    teacher_id: str

class SubjectAssignmentUpdate(BaseModel):
    teacher_id: str             # replace teacher for this subject in this section


# ── Student onboarding ────────────────────────────────────────
class StudentCreate(BaseModel):
    name: str
    phone: str                  # login credential
    roll_no: Optional[str] = None
    section_id: str             # which class they belong to
    # Parent info — creates parent account if email provided
    parent_name: Optional[str] = None
    parent_email: Optional[EmailStr] = None
    parent_phone: Optional[str] = None

class StudentUpdate(BaseModel):
    name: Optional[str] = None
    phone: Optional[str] = None
    roll_no: Optional[str] = None
    section_id: Optional[str] = None   # transfer to another section

class StudentTransfer(BaseModel):
    student_id: str
    new_section_id: str


# ── Teacher onboarding ────────────────────────────────────────
class TeacherCreate(BaseModel):
    name: str
    email: EmailStr             # login credential
    phone: Optional[str] = None
    employee_id: Optional[str] = None
    # Subjects they're qualified to teach (not yet assigned to sections)
    qualified_subjects: List[str] = []

class TeacherUpdate(BaseModel):
    name: Optional[str] = None
    phone: Optional[str] = None
    employee_id: Optional[str] = None
    qualified_subjects: Optional[List[str]] = None


# ── Bulk CSV upload ───────────────────────────────────────────
class BulkStudentRow(BaseModel):
    name: str
    phone: str
    roll_no: Optional[str] = None
    grade_number: str           # "6"
    section_name: str           # "A"
    parent_name: Optional[str] = None
    parent_email: Optional[EmailStr] = None
    parent_phone: Optional[str] = None

class BulkTeacherRow(BaseModel):
    name: str
    email: EmailStr
    phone: Optional[str] = None
    employee_id: Optional[str] = None
    qualified_subjects: str = ""   # semicolon-separated in CSV


# ── Credential reset ──────────────────────────────────────────
class ResetCredentials(BaseModel):
    user_id: str
    new_password: Optional[str] = None   # if None, auto-generate

# ── Parent management ─────────────────────────────────────────
class ParentCreate(BaseModel):
    name: str
    email: EmailStr
    phone: Optional[str] = None
    children_ids: List[str] = []  # student IDs to link

class ParentUpdate(BaseModel):
    name: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[EmailStr] = None

# ── Change history / Audit ────────────────────────────────────
class ChangeLog(BaseModel):
    """Track all admin changes for audit trail"""
    entity_type: str        # "student", "teacher", "section", "assignment"
    entity_id: str
    action: str             # "created", "updated", "deleted", "transferred"
    changes: dict           # what changed
    performed_by: str       # admin user_id
    timestamp: str
