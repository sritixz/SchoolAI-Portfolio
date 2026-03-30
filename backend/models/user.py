from pydantic import BaseModel, EmailStr, Field
from typing import Optional, List
from enum import Enum

class Role(str, Enum):
    student     = "student"
    parent      = "parent"
    teacher     = "teacher"
    schooladmin = "schooladmin"

# ── Auth requests ────────────────────────────────────────────

class EmailLoginRequest(BaseModel):
    email: EmailStr
    password: str
    role: Role

class PhoneOtpRequest(BaseModel):
    """Student / parent phone-based login — step 1: request OTP"""
    phone: str
    role: Role  # student only in practice

class PhoneOtpVerify(BaseModel):
    """Step 2: verify OTP"""
    phone: str
    otp: str
    role: Role

class RegisterRequest(BaseModel):
    """Self-registration (school admin only, or direct teacher/parent signup)"""
    name: str
    email: EmailStr
    password: str
    role: Role

class ChangePasswordRequest(BaseModel):
    current_password: str
    new_password: str

class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user_id: str
    role: str
    name: str
    avatar: Optional[str] = None
    must_change_password: bool = False  # True on first login after admin-created account

# ── School structure models ──────────────────────────────────

class GradeSection(BaseModel):
    """e.g. Grade 10 - Section A"""
    grade: str          # "10", "11", "12"
    section: str        # "A", "B", "C"
    class_name: str     # "Class 10-A"  (computed)

class SubjectAssignment(BaseModel):
    """Maps a teacher to a subject in a specific class"""
    teacher_id: str
    subject: str
    class_name: str     # "Class 10-A"
    grade: str
    section: str

# ── Bulk onboarding models ───────────────────────────────────

class StudentOnboard(BaseModel):
    name: str
    phone: str                      # primary login credential
    roll_no: Optional[str] = None
    grade: str
    section: str
    parent_name: Optional[str] = None
    parent_email: Optional[EmailStr] = None
    parent_phone: Optional[str] = None

class TeacherOnboard(BaseModel):
    name: str
    email: EmailStr                 # primary login credential
    phone: Optional[str] = None
    employee_id: Optional[str] = None
    subjects: List[str] = []        # subjects they can teach

class BulkStudentUpload(BaseModel):
    students: List[StudentOnboard]

class BulkTeacherUpload(BaseModel):
    teachers: List[TeacherOnboard]
