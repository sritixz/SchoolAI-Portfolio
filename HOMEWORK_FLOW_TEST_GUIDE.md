# 📚 Homework Flow Testing Guide

## AWS S3 Configuration ✅

Your AWS credentials are configured in `.env`:
```
AWS_ACCESS_KEY_ID = AKIAXP4MWQX7UR3XVMPR
AWS_SECRET_ACCESS_KEY = mbeXZXlyve56xQnyJGDNYylfzGJPcKvdZ155sbjh
AWS_REGION = ap-south-1
AWS_S3_BUCKET = listup-ai-images-all
```

## Email Configuration ✅

SMTP credentials configured:
```
SMTP_USER = ashishgupta.980876115@gmail.com
SMTP_PASSWORD = qyhoevtwqbpkcehx
```

---

## Quick Test (Automated)

### 1. Start Backend
```bash
cd backend
uvicorn main:app --reload
```

### 2. Run Complete Test
```bash
cd backend
python test_homework_flow.py
```

This will test the entire flow automatically:
- Teacher creates homework
- Teacher assigns to student
- Student uploads file to S3
- Student submits homework
- AI analyzes submission
- Teacher grades
- Student views results

---

## Manual Testing Steps

### STEP 1: Teacher Creates Homework

**Login as Teacher:**
```bash
POST http://localhost:8000/auth/login
{
  "email": "john.doe@school.com",
  "password": "teacher123",
  "role": "teacher"
}
```

**Create Homework:**
```bash
POST http://localhost:8000/homework/create
Authorization: Bearer <teacher_token>

{
  "subject": "Mathematics",
  "title": "Algebra Practice",
  "description": "Solve linear equations",
  "assigned_to_class": "Grade 6-A",
  "due_date": "2026-04-15T23:59:59",
  "submission_type": "online_quiz",
  "difficulty_level": "medium",
  "estimated_duration_minutes": 30,
  "questions": [
    {
      "id": "q1",
      "question_number": 1,
      "total_questions": 2,
      "question_text": "What is 2x + 5 = 13?",
      "answer_type": "mcq",
      "options": [
        {"id": "a", "text": "x = 3", "is_correct": false},
        {"id": "b", "text": "x = 4", "is_correct": true}
      ],
      "max_points": 2
    },
    {
      "id": "q2",
      "question_number": 2,
      "total_questions": 2,
      "question_text": "Upload your work for: 5(x+2) = 25",
      "answer_type": "upload",
      "max_points": 5,
      "accepted_formats": ["image/jpeg", "image/png", "application/pdf"]
    }
  ],
  "total_marks": 7
}
```

**Response:**
```json
{
  "id": "homework_id_here"
}
```

---

### STEP 2: Teacher Assigns Homework

**Get Students:**
```bash
GET http://localhost:8000/teacher/my-students
Authorization: Bearer <teacher_token>
```

**Assign to Students:**
```bash
POST http://localhost:8000/homework/assign
Authorization: Bearer <teacher_token>

{
  "homework_id": "<homework_id>",
  "student_ids": ["<alice_id>", "<charlie_id>"],
  "due_date": "2026-04-15T23:59:59"
}
```

---

### STEP 3: Student Views Homework

**Login as Student:**
```bash
# Request OTP
POST http://localhost:8000/auth/student/request-otp
{
  "phone": "1111111111"
}

# Verify OTP
POST http://localhost:8000/auth/student/verify-otp
{
  "phone": "1111111111",
  "otp": "123456"
}
```

**View Assigned Homework:**
```bash
GET http://localhost:8000/homework/student
Authorization: Bearer <student_token>
```

**Get Homework Details:**
```bash
GET http://localhost:8000/homework/<homework_id>
Authorization: Bearer <student_token>
```

---

### STEP 4: Student Uploads File (AWS S3)

**Upload Image/PDF:**
```bash
POST http://localhost:8000/homework/upload-file
Authorization: Bearer <student_token>
Content-Type: multipart/form-data

file: <select image/pdf file>
```

**Response:**
```json
{
  "url": "https://listup-ai-images-all.s3.ap-south-1.amazonaws.com/submissions/user_id/uuid.jpg",
  "filename": "homework.jpg",
  "size_kb": 245.3
}
```

**Supported Formats:**
- JPG/JPEG images
- PNG images
- PDF documents
- HEIC images (iPhone)
- Max size: 20MB

---

### STEP 5: Student Submits Homework

```bash
POST http://localhost:8000/homework/submit
Authorization: Bearer <student_token>

{
  "homework_id": "<homework_id>",
  "answers": [
    {
      "question_id": "q1",
      "answer": "b",
      "answer_type": "mcq"
    },
    {
      "question_id": "q2",
      "file_url": "https://listup-ai-images-all.s3.ap-south-1.amazonaws.com/...",
      "answer_type": "upload"
    }
  ]
}
```

**Response:**
```json
{
  "submission_id": "...",
  "auto_score_pct": 100,
  "mcq_earned": 2,
  "mcq_total": 2,
  "status": "submitted",
  "ai_analysis_pending": true
}
```

---

### STEP 6: Teacher Views Submissions

**List All Submissions:**
```bash
GET http://localhost:8000/homework/<homework_id>/submissions
Authorization: Bearer <teacher_token>
```

**Get Specific Student Submission:**
```bash
GET http://localhost:8000/homework/<homework_id>/submissions/<student_id>
Authorization: Bearer <teacher_token>
```

**Response includes:**
- Student answers
- Auto-graded MCQ scores
- Uploaded file URLs
- AI analysis (if completed)
- Submission timestamp

---

### STEP 7: Teacher Grades Homework

```bash
POST http://localhost:8000/homework/grade
Authorization: Bearer <teacher_token>

{
  "homework_id": "<homework_id>",
  "student_id": "<student_id>",
  "final_grade": "A",
  "final_score": 6.5,
  "teacher_feedback": "Great work! Clear explanation in your uploaded solution.",
  "question_overrides": [
    {
      "question_id": "q2",
      "points_awarded": 4.5,
      "comment": "Good work, minor calculation error"
    }
  ],
  "publish": true
}
```

---

### STEP 8: Student Views Results

```bash
GET http://localhost:8000/homework/<homework_id>/result
Authorization: Bearer <student_token>
```

**Response:**
```json
{
  "_id": "...",
  "homework_id": "...",
  "student_id": "...",
  "status": "graded",
  "final_grade": "A",
  "final_score": 6.5,
  "teacher_feedback": "Great work!...",
  "auto_score_pct": 100,
  "mcq_earned": 2,
  "mcq_total": 2,
  "answers": [...],
  "ai_analysis": {...},
  "graded_at": "2026-03-30T..."
}
```

---

## Test Scenarios

### Scenario 1: MCQ Only Homework
- Create homework with only MCQ questions
- Student submits
- Auto-grading happens immediately
- Teacher can review and adjust scores

### Scenario 2: File Upload Homework
- Create homework requiring file uploads
- Student uploads image/PDF to S3
- Student submits with file URLs
- AI analyzes uploaded content
- Teacher reviews and grades

### Scenario 3: Mixed Questions
- MCQ questions (auto-graded)
- Typed answers (AI + teacher review)
- File uploads (AI + teacher review)
- Final score combines all types

### Scenario 4: Multiple Students
- Assign same homework to multiple students
- Each student submits independently
- Teacher can view all submissions
- Bulk grading capabilities

---

## Testing Checklist

### AWS S3 Integration
- [ ] File upload endpoint works
- [ ] Files stored in correct bucket
- [ ] Public URLs generated correctly
- [ ] File size validation (20MB limit)
- [ ] File type validation (JPG, PNG, PDF, HEIC)
- [ ] Files organized by student ID

### Homework Creation
- [ ] Teacher can create homework
- [ ] Mixed question types supported
- [ ] Questions saved correctly
- [ ] Total marks calculated

### Assignment
- [ ] Assign to specific students
- [ ] Assign to whole class
- [ ] Due date set correctly
- [ ] Students receive assignment

### Submission
- [ ] Student can view assigned homework
- [ ] Student can upload files
- [ ] Student can submit answers
- [ ] MCQ auto-grading works
- [ ] Submission timestamp recorded

### AI Analysis
- [ ] AI analysis runs in background
- [ ] Analysis results saved
- [ ] Teacher can view AI suggestions

### Grading
- [ ] Teacher can view submissions
- [ ] Teacher can see uploaded files
- [ ] Teacher can override AI scores
- [ ] Teacher can add feedback
- [ ] Grades published to students

### Results
- [ ] Student can view results
- [ ] Scores displayed correctly
- [ ] Feedback visible
- [ ] Uploaded files accessible

---

## Common Issues & Solutions

### Issue: File upload fails
**Solution:** Check AWS credentials in `.env` file

### Issue: AI analysis not running
**Solution:** Check OpenRouter API key and model configuration

### Issue: Student can't see homework
**Solution:** Verify homework is assigned and status is "assigned"

### Issue: S3 URL not accessible
**Solution:** Check bucket permissions and region configuration

---

## Test Data

### Teachers
- **John Doe**: john.doe@school.com / teacher123
- **Jane Smith**: jane.smith@school.com / teacher123

### Students (Phone + OTP: 123456)
- **Alice Johnson**: 1111111111 (Grade 6-A)
- **Charlie Brown**: 3333333333 (Grade 6-A)
- **Emma Wilson**: 5555555555 (Grade 6-A)
- **George Davis**: 7777777777 (Grade 6-B)

### Parents
- **Bob Johnson**: bob.johnson@parent.com / parent123 (Alice's parent)
- **Diana Brown**: diana.brown@parent.com / parent123 (Charlie's parent)

---

## Next Steps

1. **Run automated test**: `python test_homework_flow.py`
2. **Test with real files**: Upload actual images/PDFs
3. **Test parent view**: Parents should see child's homework
4. **Test notifications**: Email alerts for assignments/grades
5. **Test analytics**: Track completion rates, average scores
6. **Test bulk operations**: Assign to entire class, bulk grading

---

## API Endpoints Summary

| Endpoint | Method | Role | Description |
|----------|--------|------|-------------|
| `/homework/create` | POST | Teacher | Create new homework |
| `/homework/assign` | POST | Teacher | Assign to students |
| `/homework/library` | GET | Teacher | View all homework |
| `/homework/{id}/submissions` | GET | Teacher | View submissions |
| `/homework/grade` | POST | Teacher | Grade submission |
| `/homework/student` | GET | Student | View assigned homework |
| `/homework/{id}` | GET | Student | Get homework details |
| `/homework/upload-file` | POST | Student | Upload file to S3 |
| `/homework/submit` | POST | Student | Submit homework |
| `/homework/{id}/result` | GET | Student | View results |

---

## Success Criteria

✅ Teacher can create and assign homework
✅ Student can view and submit homework
✅ Files upload to AWS S3 successfully
✅ MCQ questions auto-graded
✅ AI analysis provides suggestions
✅ Teacher can review and grade
✅ Student can view results
✅ All data persists in MongoDB
✅ File URLs accessible from S3
