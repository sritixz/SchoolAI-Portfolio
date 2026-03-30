# Testing Flow Guide - School Admin System

## Overview
This guide walks through testing the complete data flow from school admin setup to teacher/parent/student access.

## Test Scenario

### School Structure
- **School**: ABC High School
- **Grades**: 6, 7
- **Sections**: 6-A, 6-B, 7-A
- **Teachers**: 3 teachers teaching multiple subjects
- **Students**: 7 students across 3 sections
- **Parents**: 3 parents with multiple children (testing multi-child scenarios)

### Key Test Cases
1. **Parent with multiple children in different classes**
   - Ms. Diana Brown has 3 children: Charlie (6-A), George (6-B), Lucy (7-A)
   
2. **Teacher teaching multiple sections**
   - Mr. John Doe teaches Math & Science in 6-A, 6-B, and 7-A
   
3. **Student-Parent linkage**
   - Each student is linked to exactly one parent
   - Parents can see all their children's data

## Step-by-Step Testing

### Step 1: Start MongoDB
```bash
# Make sure MongoDB is running
# If using MongoDB Atlas, ensure connection string is in .env file
```

### Step 2: Run Seed Script
```bash
cd backend
python seed_data.py
```

This creates:
- 1 School Admin
- 3 Teachers
- 3 Parents
- 7 Students
- 2 Grades with subjects
- 3 Sections
- 15 Subject assignments

### Step 3: Test School Admin Login
**Credentials**: admin@school.com / admin123

**What to verify**:
1. Navigate to `/schooladmin/onboarding`
2. Check Grades tab - should see Grade 6 and 7 with subjects
3. Check Sections tab - should see 6-A, 6-B, 7-A
4. Check Teachers tab - should see 3 teachers
5. Check Students tab - should see 7 students
6. Check Assignments tab - should see all subject-teacher mappings

### Step 4: Test Teacher Login
**Credentials**: john.doe@school.com / teacher123

**What to verify**:
1. Call `GET /teacher/my-sections` - should return 3 sections (6-A, 6-B, 7-A)
2. Call `GET /teacher/my-students` - should return all students from those 3 sections
3. Verify each student shows:
   - Student name
   - Class name
   - Subjects taught by this teacher

**Expected for Mr. John Doe**:
- Teaches: Mathematics, Science
- Sections: 6-A (3 students), 6-B (2 students), 7-A (2 students)
- Total students: 7

### Step 5: Test Parent Login (Single Child)
**Credentials**: bob.johnson@parent.com / parent123

**What to verify**:
1. Call `GET /parent/dashboard`
2. Should see 2 children:
   - Alice Johnson (Grade 6-A)
   - Ivy Martinez (Grade 6-B)
3. Both children should have complete data (name, class, roll_no)

### Step 6: Test Parent Login (Multiple Children)
**Credentials**: diana.brown@parent.com / parent123

**What to verify**:
1. Call `GET /parent/dashboard`
2. Should see 3 children:
   - Charlie Brown (Grade 6-A)
   - George Davis (Grade 6-B)
   - Lucy Chen (Grade 7-A)
3. All three children in different classes
4. Parent can access data for all three

### Step 7: Test Student Login (OTP)
**Phone**: 1111111111 (Alice Johnson)

**What to verify**:
1. Student belongs to Grade 6-A
2. Student has parent_id linked to Bob Johnson
3. Student can see their homework, learning gaps, etc.

## API Endpoints to Test

### School Admin
```bash
# List all students
GET /schooladmin/students

# List students in specific section
GET /schooladmin/students?section_id=<section_id>

# List all teachers
GET /schooladmin/teachers

# List all parents
GET /schooladmin/parents
```

### Teacher
```bash
# Get my assigned sections
GET /teacher/my-sections

# Get all my students
GET /teacher/my-students

# Get students in specific class
GET /teacher/students/by-class?class_name=Grade%206-A
```

### Parent
```bash
# Get dashboard with all children
GET /parent/dashboard

# Get homework for specific child
GET /parent/homework-overview?child_id=<student_id>

# Get topic progress for child
GET /parent/topic-progress?child_id=<student_id>
```

## Expected Data Relationships

### Teacher → Students
```
Mr. John Doe (Math & Science)
├── Grade 6-A
│   ├── Alice Johnson
│   ├── Charlie Brown
│   └── Emma Wilson
├── Grade 6-B
│   ├── George Davis
│   └── Ivy Martinez
└── Grade 7-A
    ├── Kevin Lee
    └── Lucy Chen
```

### Parent → Children
```
Mr. Bob Johnson
├── Alice Johnson (6-A)
└── Ivy Martinez (6-B)

Ms. Diana Brown (MULTI-CHILD TEST)
├── Charlie Brown (6-A)
├── George Davis (6-B)
└── Lucy Chen (7-A)

Mr. Frank Wilson
├── Emma Wilson (6-A)
└── Kevin Lee (7-A)
```

### Section → Students
```
Grade 6-A (5 subjects)
├── Alice Johnson (Parent: Bob)
├── Charlie Brown (Parent: Diana)
└── Emma Wilson (Parent: Frank)

Grade 6-B (5 subjects)
├── George Davis (Parent: Diana)
└── Ivy Martinez (Parent: Bob)

Grade 7-A (5 subjects)
├── Kevin Lee (Parent: Frank)
└── Lucy Chen (Parent: Diana)
```

## Verification Checklist

### ✅ Data Integrity
- [ ] All students have valid section_id
- [ ] All students have valid parent_id
- [ ] All parents have children array populated
- [ ] All teachers have assigned_sections array populated
- [ ] All subject_assignments reference valid teacher_id and section_id

### ✅ Relationships
- [ ] Parent can see all their children
- [ ] Teacher can see all students in assigned sections
- [ ] Student data shows correct class_name
- [ ] Subject assignments show correct teacher names

### ✅ Multi-Child Scenario
- [ ] Diana Brown sees 3 children in different classes
- [ ] Each child shows correct class information
- [ ] Parent can access data for each child independently

### ✅ Multi-Section Teacher
- [ ] John Doe sees students from 3 different sections
- [ ] Each student shows which subjects John teaches them
- [ ] Section count matches assignment count

## Common Issues & Solutions

### Issue: Parent sees no children
**Solution**: Check that parent's `children` array is populated and student's `parent_id` is set

### Issue: Teacher sees no students
**Solution**: Check that teacher's `assigned_sections` array is populated and subject_assignments exist

### Issue: Student shows wrong class
**Solution**: Verify student's `section_id`, `class_name`, `grade_number`, and `section_name` are all consistent

### Issue: Cannot login
**Solution**: 
- Admin/Teacher/Parent: Check email and password (default: admin123, teacher123, parent123)
- Student: Use phone number for OTP login

## Next Steps After Verification

Once all tests pass:
1. ✅ Data model is correct
2. ✅ Relationships are properly maintained
3. ✅ Multi-child scenarios work
4. ✅ Multi-section teacher scenarios work
5. ✅ Ready to build homework assignment features
6. ✅ Ready to build learning gap tracking
7. ✅ Ready to build parent notifications

## Database Collections to Inspect

```javascript
// Check users collection
db.users.find({role: "parent"}).pretty()
db.users.find({role: "teacher"}).pretty()
db.users.find({role: "student"}).pretty()

// Check sections
db.sections.find().pretty()

// Check subject assignments
db.subject_assignments.find().pretty()

// Verify parent-child links
db.users.findOne({email: "diana.brown@parent.com"})
// Should show children array with 3 student IDs

// Verify teacher assignments
db.users.findOne({email: "john.doe@school.com"})
// Should show assigned_sections array with 3 section IDs
```

## Success Criteria

The system is working correctly when:
1. ✅ School admin can see all entities in onboarding interface
2. ✅ Teachers can see only their assigned students
3. ✅ Parents can see all their children (even in different classes)
4. ✅ Students are correctly linked to sections and parents
5. ✅ Subject assignments correctly map teachers to sections
6. ✅ No orphaned data (all references are valid)
7. ✅ Login works for all user types
8. ✅ Data relationships are bidirectional (parent→children, children→parent)
