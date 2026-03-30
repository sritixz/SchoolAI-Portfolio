# 📊 Homework System Flow Diagram

## Complete Student-Teacher Homework Interaction

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         HOMEWORK LIFECYCLE                                   │
└─────────────────────────────────────────────────────────────────────────────┘

┌──────────────┐
│   TEACHER    │
└──────┬───────┘
       │
       │ 1. CREATE HOMEWORK
       │    POST /homework/create
       │    {
       │      subject: "Math",
       │      questions: [MCQ, Typed, Upload],
       │      total_marks: 10
       │    }
       │
       ▼
┌─────────────────┐
│  HOMEWORK DOC   │ ─────────────┐
│  (MongoDB)      │              │
│  status: draft  │              │
└─────────────────┘              │
       │                         │
       │ 2. ASSIGN TO STUDENTS   │
       │    POST /homework/assign│
       │    {                    │
       │      student_ids: [...] │
       │    }                    │
       │                         │
       ▼                         │
┌─────────────────┐              │
│  HOMEWORK DOC   │              │
│  status:        │              │
│  assigned       │              │
│  assigned_      │              │
│  students: [ids]│              │
└─────────────────┘              │
       │                         │
       │                         │
       ▼                         │
┌──────────────┐                 │
│   STUDENT    │                 │
└──────┬───────┘                 │
       │                         │
       │ 3. VIEW HOMEWORK        │
       │    GET /homework/student│
       │                         │
       ▼                         │
┌─────────────────┐              │
│  HOMEWORK LIST  │              │
│  - Math Quiz    │              │
│  - Due: Apr 15  │              │
└─────────────────┘              │
       │                         │
       │ 4. UPLOAD FILE          │
       │    POST /homework/      │
       │         upload-file     │
       │    (multipart/form-data)│
       │                         │
       ▼                         │
┌─────────────────┐              │
│    AWS S3       │              │
│  ┌───────────┐  │              │
│  │ Image/PDF │  │              │
│  └───────────┘  │              │
│  submissions/   │              │
│  user123/       │              │
│  abc123.jpg     │              │
└─────────────────┘              │
       │                         │
       │ Returns S3 URL          │
       │                         │
       ▼                         │
┌─────────────────┐              │
│  S3 URL         │              │
│  https://       │              │
│  listup-ai-     │              │
│  images-all...  │              │
└─────────────────┘              │
       │                         │
       │ 5. SUBMIT HOMEWORK      │
       │    POST /homework/submit│
       │    {                    │
       │      answers: [         │
       │        {q1: "b"},       │
       │        {q2: s3_url}     │
       │      ]                  │
       │    }                    │
       │                         │
       ▼                         │
┌─────────────────┐              │
│  SUBMISSION DOC │              │
│  (MongoDB)      │              │
│  - answers      │              │
│  - file_urls    │              │
│  - auto_score   │◄─────────────┘
│  - status:      │
│    submitted    │
└─────────────────┘
       │
       │ 6. AUTO-GRADE MCQ
       │    (Immediate)
       │
       ▼
┌─────────────────┐
│  MCQ SCORING    │
│  Correct: 2/2   │
│  Score: 100%    │
└─────────────────┘
       │
       │ 7. AI ANALYSIS
       │    (Background Task)
       │
       ▼
┌─────────────────┐
│  AI ANALYSIS    │
│  - Typed answer │
│    suggestions  │
│  - File content │
│    review       │
│  - Scoring      │
│    recommendations
└─────────────────┘
       │
       │
       ▼
┌──────────────┐
│   TEACHER    │
└──────┬───────┘
       │
       │ 8. VIEW SUBMISSIONS
       │    GET /homework/{id}/
       │        submissions
       │
       ▼
┌─────────────────┐
│  SUBMISSIONS    │
│  LIST           │
│  ┌───────────┐  │
│  │ Alice     │  │
│  │ Score: 4/4│  │
│  │ File: ✓   │  │
│  │ AI: ✓     │  │
│  └───────────┘  │
└─────────────────┘
       │
       │ 9. REVIEW & GRADE
       │    POST /homework/grade
       │    {
       │      final_grade: "A",
       │      final_score: 9.5,
       │      feedback: "...",
       │      overrides: [...]
       │    }
       │
       ▼
┌─────────────────┐
│  SUBMISSION DOC │
│  (Updated)      │
│  - final_grade  │
│  - final_score  │
│  - feedback     │
│  - status:      │
│    graded       │
└─────────────────┘
       │
       │
       ▼
┌──────────────┐
│   STUDENT    │
└──────┬───────┘
       │
       │ 10. VIEW RESULTS
       │     GET /homework/{id}/
       │         result
       │
       ▼
┌─────────────────┐
│  RESULT VIEW    │
│  Grade: A       │
│  Score: 9.5/10  │
│  Feedback: "..." │
│  Answers: [...]  │
└─────────────────┘
```

---

## Data Flow Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                      DATA STORAGE                                │
└─────────────────────────────────────────────────────────────────┘

┌──────────────────┐         ┌──────────────────┐
│   MongoDB        │         │    AWS S3        │
│                  │         │                  │
│  homework        │         │  Bucket:         │
│  ┌────────────┐  │         │  listup-ai-      │
│  │ _id        │  │         │  images-all      │
│  │ title      │  │         │                  │
│  │ questions  │  │         │  submissions/    │
│  │ status     │  │         │  ├─ user1/       │
│  │ assigned_  │  │         │  │  ├─ abc.jpg   │
│  │   students │  │         │  │  └─ def.pdf   │
│  └────────────┘  │         │  └─ user2/       │
│                  │         │     └─ ghi.jpg   │
│  homework_       │         │                  │
│  submissions     │         │  Region:         │
│  ┌────────────┐  │         │  ap-south-1      │
│  │ _id        │  │         │                  │
│  │ homework_id│  │         │  Access:         │
│  │ student_id │  │         │  Public URLs     │
│  │ answers    │──┼─────────┼─►file_urls       │
│  │ file_urls  │  │         │                  │
│  │ auto_score │  │         └──────────────────┘
│  │ ai_analysis│  │
│  │ final_grade│  │
│  └────────────┘  │
└──────────────────┘
```

---

## Question Types Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                    QUESTION TYPES                                │
└─────────────────────────────────────────────────────────────────┘

1. MCQ (Multiple Choice)
   ┌──────────────┐
   │ Question     │
   │ Options: A-D │
   │ Correct: B   │
   └──────┬───────┘
          │
          │ Student selects: B
          │
          ▼
   ┌──────────────┐
   │ AUTO-GRADE   │
   │ Correct ✓    │
   │ Points: 2/2  │
   └──────────────┘

2. TYPED (Text Answer)
   ┌──────────────┐
   │ Question     │
   │ Type answer  │
   └──────┬───────┘
          │
          │ Student types: "y = 7"
          │
          ▼
   ┌──────────────┐
   │ AI ANALYSIS  │
   │ Compare with │
   │ sample answer│
   └──────┬───────┘
          │
          ▼
   ┌──────────────┐
   │ TEACHER      │
   │ REVIEW       │
   │ Final score  │
   └──────────────┘

3. UPLOAD (File Upload)
   ┌──────────────┐
   │ Question     │
   │ Upload work  │
   └──────┬───────┘
          │
          │ Student uploads image
          │
          ▼
   ┌──────────────┐
   │ AWS S3       │
   │ Store file   │
   │ Return URL   │
   └──────┬───────┘
          │
          ▼
   ┌──────────────┐
   │ AI ANALYSIS  │
   │ (Optional)   │
   │ OCR/Vision   │
   └──────┬───────┘
          │
          ▼
   ┌──────────────┐
   │ TEACHER      │
   │ REVIEW       │
   │ View file    │
   │ Grade work   │
   └──────────────┘
```

---

## Scoring System

```
┌─────────────────────────────────────────────────────────────────┐
│                    SCORING FLOW                                  │
└─────────────────────────────────────────────────────────────────┘

Homework: Total 10 points
├─ Q1 (MCQ): 2 points
├─ Q2 (MCQ): 2 points
├─ Q3 (Typed): 3 points
└─ Q4 (Upload): 3 points

SUBMISSION
│
├─ AUTO-GRADING (Immediate)
│  ├─ Q1: Correct → 2/2 ✓
│  └─ Q2: Correct → 2/2 ✓
│  
│  Auto Score: 4/4 MCQ = 100%
│
├─ AI ANALYSIS (Background)
│  ├─ Q3: "y = 7" → Suggest 3/3 ✓
│  └─ Q4: File review → Suggest 2.5/3
│  
│  AI Suggestions: 5.5/6
│
└─ TEACHER GRADING (Manual)
   ├─ Review Q3: Accept AI → 3/3 ✓
   ├─ Review Q4: Override → 3/3 ✓
   └─ Add feedback
   
   Final Score: 10/10 = A grade
```

---

## Authentication Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                    AUTHENTICATION                                │
└─────────────────────────────────────────────────────────────────┘

TEACHER LOGIN
┌──────────────┐
│ Email +      │
│ Password     │
└──────┬───────┘
       │
       ▼
┌──────────────┐
│ JWT Token    │
│ role: teacher│
└──────────────┘

STUDENT LOGIN
┌──────────────┐
│ Phone Number │
└──────┬───────┘
       │
       ▼
┌──────────────┐
│ Request OTP  │
│ SMS/Email    │
└──────┬───────┘
       │
       ▼
┌──────────────┐
│ Enter OTP    │
│ (123456)     │
└──────┬───────┘
       │
       ▼
┌──────────────┐
│ JWT Token    │
│ role: student│
└──────────────┘

PARENT LOGIN
┌──────────────┐
│ Email +      │
│ Password     │
└──────┬───────┘
       │
       ▼
┌──────────────┐
│ JWT Token    │
│ role: parent │
│ children: [] │
└──────────────┘
```

---

## File Upload Details

```
┌─────────────────────────────────────────────────────────────────┐
│                    FILE UPLOAD FLOW                              │
└─────────────────────────────────────────────────────────────────┘

CLIENT                    BACKEND                    AWS S3
  │                         │                          │
  │ 1. Select File          │                          │
  │    (image.jpg)          │                          │
  │                         │                          │
  │ 2. POST /upload-file    │                          │
  ├────────────────────────►│                          │
  │    multipart/form-data  │                          │
  │                         │                          │
  │                         │ 3. Validate              │
  │                         │    - Type (JPG/PNG/PDF)  │
  │                         │    - Size (<20MB)        │
  │                         │                          │
  │                         │ 4. Generate UUID         │
  │                         │    abc123.jpg            │
  │                         │                          │
  │                         │ 5. Upload to S3          │
  │                         ├─────────────────────────►│
  │                         │    PUT Object            │
  │                         │    Key: submissions/     │
  │                         │         user123/         │
  │                         │         abc123.jpg       │
  │                         │                          │
  │                         │ 6. Success               │
  │                         │◄─────────────────────────┤
  │                         │                          │
  │                         │ 7. Generate URL          │
  │                         │    https://listup-ai-... │
  │                         │                          │
  │ 8. Return URL           │                          │
  │◄────────────────────────┤                          │
  │    {url, filename, size}│                          │
  │                         │                          │
  │ 9. Use URL in submission│                          │
  │                         │                          │

Stored in S3:
submissions/
├─ 65f8a1b2c3d4e5f6/
│  ├─ abc123.jpg
│  └─ def456.pdf
└─ 65f8a1b2c3d4e5f7/
   └─ ghi789.jpg

Public URLs:
https://listup-ai-images-all.s3.ap-south-1.amazonaws.com/
  submissions/65f8a1b2c3d4e5f6/abc123.jpg
```

---

## Status Transitions

```
┌─────────────────────────────────────────────────────────────────┐
│                    HOMEWORK STATUS                               │
└─────────────────────────────────────────────────────────────────┘

HOMEWORK DOCUMENT
draft ──────► assigned ──────► completed
  │              │                 │
  │              │                 │
  │              ▼                 │
  │         (students can          │
  │          view & submit)        │
  │                                │
  └────────────────────────────────┘
         (can edit)


SUBMISSION DOCUMENT
not_started ──► submitted ──► graded
                   │             │
                   │             │
                   ▼             │
              ai_analysis        │
              (background)       │
                   │             │
                   └─────────────┘
```

This comprehensive diagram shows the complete flow of your homework system with AWS S3 integration!
