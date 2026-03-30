# 🧪 Homework Flow Testing Commands

Quick reference for testing the complete homework submission flow with AWS S3 file uploads.

---

## Prerequisites

1. **Start Backend Server**
```bash
cd backend
uvicorn main:app --reload
```

2. **Verify AWS S3 Connection**
```bash
cd backend
python test_s3_connection.py
```

Expected output:
```
✅ Successfully connected to bucket: listup-ai-images-all
✅ File uploaded successfully!
✅ All S3 tests passed!
```

---

## Option 1: Automated Full Test

Run the complete automated test:

```bash
cd backend
python test_homework_flow.py
```

This tests:
- ✅ Teacher login
- ✅ Homework creation with mixed questions
- ✅ Assignment to students
- ✅ Student login
- ✅ File upload to S3
- ✅ Homework submission
- ✅ AI analysis
- ✅ Teacher grading
- ✅ Student viewing results

---

## Option 2: Manual Testing with cURL

### 1. Teacher Login
```bash
curl -X POST http://localhost:8000/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "john.doe@school.com",
    "password": "teacher123",
    "role": "teacher"
  }'
```

Save the `access_token` from response.

### 2. Create Homework
```bash
curl -X POST http://localhost:8000/homework/create \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TEACHER_TOKEN" \
  -d '{
    "subject": "Mathematics",
    "title": "Algebra Test",
    "description": "Linear equations practice",
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
        "question_text": "Solve: 2x + 5 = 13",
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
        "question_text": "Upload your work",
        "answer_type": "upload",
        "max_points": 5
      }
    ],
    "total_marks": 7
  }'
```

Save the `id` (homework_id) from response.

### 3. Get Teacher's Students
```bash
curl -X GET http://localhost:8000/teacher/my-students \
  -H "Authorization: Bearer YOUR_TEACHER_TOKEN"
```

Save a student `_id` (e.g., Alice Johnson's ID).

### 4. Assign Homework
```bash
curl -X POST http://localhost:8000/homework/assign \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TEACHER_TOKEN" \
  -d '{
    "homework_id": "YOUR_HOMEWORK_ID",
    "student_ids": ["ALICE_STUDENT_ID"],
    "due_date": "2026-04-15T23:59:59"
  }'
```

### 5. Student Login
```bash
# Request OTP
curl -X POST http://localhost:8000/auth/student/request-otp \
  -H "Content-Type: application/json" \
  -d '{"phone": "1111111111"}'

# Verify OTP
curl -X POST http://localhost:8000/auth/student/verify-otp \
  -H "Content-Type: application/json" \
  -d '{
    "phone": "1111111111",
    "otp": "123456"
  }'
```

Save the student `access_token`.

### 6. Student Views Homework
```bash
curl -X GET http://localhost:8000/homework/student \
  -H "Authorization: Bearer YOUR_STUDENT_TOKEN"
```

### 7. Upload File to S3
```bash
curl -X POST http://localhost:8000/homework/upload-file \
  -H "Authorization: Bearer YOUR_STUDENT_TOKEN" \
  -F "file=@/path/to/your/image.jpg"
```

Save the `url` from response.

### 8. Submit Homework
```bash
curl -X POST http://localhost:8000/homework/submit \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_STUDENT_TOKEN" \
  -d '{
    "homework_id": "YOUR_HOMEWORK_ID",
    "answers": [
      {
        "question_id": "q1",
        "answer": "b",
        "answer_type": "mcq"
      },
      {
        "question_id": "q2",
        "file_url": "YOUR_S3_FILE_URL",
        "answer_type": "upload"
      }
    ]
  }'
```

### 9. Teacher Views Submissions
```bash
curl -X GET "http://localhost:8000/homework/YOUR_HOMEWORK_ID/submissions" \
  -H "Authorization: Bearer YOUR_TEACHER_TOKEN"
```

### 10. Teacher Grades
```bash
curl -X POST http://localhost:8000/homework/grade \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TEACHER_TOKEN" \
  -d '{
    "homework_id": "YOUR_HOMEWORK_ID",
    "student_id": "ALICE_STUDENT_ID",
    "final_grade": "A",
    "final_score": 6.5,
    "teacher_feedback": "Excellent work!",
    "question_overrides": [
      {
        "question_id": "q2",
        "points_awarded": 4.5,
        "comment": "Good solution"
      }
    ],
    "publish": true
  }'
```

### 11. Student Views Results
```bash
curl -X GET "http://localhost:8000/homework/YOUR_HOMEWORK_ID/result" \
  -H "Authorization: Bearer YOUR_STUDENT_TOKEN"
```

---

## Option 3: Using Postman/Thunder Client

Import this collection:

1. Create a new collection "Homework Flow"
2. Add environment variables:
   - `base_url`: http://localhost:8000
   - `teacher_token`: (set after login)
   - `student_token`: (set after login)
   - `homework_id`: (set after creation)
   - `student_id`: (set after getting students)

3. Create requests following the manual testing steps above

---

## Test Scenarios

### Scenario A: MCQ Only
```bash
# Create homework with only MCQ questions
# Student submits
# Check auto-grading works (100% automated)
```

### Scenario B: File Upload Only
```bash
# Create homework requiring file upload
# Student uploads image/PDF
# Check S3 storage
# Teacher reviews uploaded file
```

### Scenario C: Mixed Questions
```bash
# MCQ (auto-graded) + File upload (manual review)
# Test partial auto-grading
# Test teacher override capabilities
```

### Scenario D: Multiple Students
```bash
# Assign to 3+ students
# Each submits independently
# Teacher views all submissions
# Test bulk operations
```

---

## Verification Checklist

After running tests, verify:

### AWS S3
- [ ] Files uploaded to `listup-ai-images-all` bucket
- [ ] Files in correct folder: `submissions/{user_id}/`
- [ ] URLs are publicly accessible
- [ ] File types validated (JPG, PNG, PDF, HEIC)
- [ ] File size limit enforced (20MB)

### Database (MongoDB)
- [ ] Homework documents created in `homework` collection
- [ ] Submissions saved in `homework_submissions` collection
- [ ] Student IDs in `assigned_students` array
- [ ] Submission status updated
- [ ] Grading data persisted

### API Responses
- [ ] Proper HTTP status codes (200, 400, 404)
- [ ] Error messages clear and helpful
- [ ] Response times acceptable (<2s)
- [ ] File URLs in responses are valid

### Business Logic
- [ ] MCQ auto-grading accurate
- [ ] Points calculated correctly
- [ ] Due dates enforced
- [ ] Only assigned students can submit
- [ ] Teachers can only grade their homework
- [ ] Students can only view their results

---

## Troubleshooting

### Issue: S3 upload fails with "Access Denied"
**Check:**
```bash
# Verify credentials
python -c "from config import settings; print(f'Key: {settings.AWS_ACCESS_KEY_ID[:10]}...')"

# Test connection
python test_s3_connection.py
```

### Issue: "Invalid homework ID"
**Solution:** Ensure homework_id is a valid ObjectId string

### Issue: Student can't see homework
**Check:**
1. Homework status is "assigned"
2. Student ID in `assigned_students` array
3. Student is logged in with correct token

### Issue: AI analysis not running
**Check:**
1. OpenRouter API key configured
2. Background tasks enabled
3. Check logs for errors

---

## Expected Results

### After Homework Creation
```json
{
  "id": "65f8a1b2c3d4e5f6g7h8i9j0"
}
```

### After File Upload
```json
{
  "url": "https://listup-ai-images-all.s3.ap-south-1.amazonaws.com/submissions/user123/abc123.jpg",
  "filename": "homework.jpg",
  "size_kb": 245.3
}
```

### After Submission
```json
{
  "submission_id": "65f8a1b2c3d4e5f6g7h8i9j1",
  "auto_score_pct": 100,
  "mcq_earned": 2,
  "mcq_total": 2,
  "status": "submitted",
  "ai_analysis_pending": true
}
```

### After Grading
```json
{
  "status": "graded"
}
```

---

## Performance Benchmarks

Expected response times:
- Login: <500ms
- Create homework: <300ms
- File upload (5MB): <2s
- Submit homework: <500ms
- View submissions: <800ms
- Grade homework: <300ms

---

## Next Steps After Testing

1. **Test with real files**: Use actual photos from phone
2. **Test parent view**: Parents should see child's homework
3. **Test notifications**: Email alerts for new homework
4. **Test analytics**: Completion rates, average scores
5. **Load testing**: Multiple concurrent submissions
6. **Mobile testing**: Test file upload from mobile devices

---

## Support

If you encounter issues:
1. Check backend logs: `uvicorn main:app --reload --log-level debug`
2. Check MongoDB: Verify data in collections
3. Check S3: Verify files in AWS console
4. Run diagnostic: `python test_s3_connection.py`
