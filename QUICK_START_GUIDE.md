# School Admin Onboarding - Quick Start Guide

## 🚀 Setup Workflow (Step-by-Step)

### Step 1: Create Grades
1. Go to **Grades** tab
2. Select grade number (6, 7, 8, 9, 10, 11, 12)
3. Click on subjects to add (Mathematics, Science, English, etc.)
4. Click "Add Grade"
5. Repeat for all grades in your school

**Example:**
- Grade 6: Mathematics, Science, SST, English, Hindi
- Grade 7: Mathematics, Science, SST, English, Hindi, Computer Science

### Step 2: Create Sections
1. Go to **Sections** tab
2. Select a grade
3. Select section name (A, B, C, D, E, F)
4. Click "Add Section"
5. Repeat for all sections

**Example:**
- Grade 6-A
- Grade 6-B
- Grade 6-C
- Grade 7-A
- Grade 7-B

### Step 3: Add Teachers
Choose one method:

#### Option A: Individual Entry
1. Go to **Teachers** tab
2. Click "Add Teacher"
3. Fill in: Name, Email, Phone, Employee ID
4. Select qualified subjects
5. Click "Add Teacher"
6. Note the temporary password shown

#### Option B: Bulk CSV Upload
1. Go to **Teachers** tab
2. Click "Bulk CSV"
3. Download or create CSV with columns:
   ```
   name, email, phone, employee_id, qualified_subjects
   ```
4. Upload the CSV file
5. Default password: `School@123`
6. Teachers will receive welcome email

**CSV Example:**
```csv
name,email,phone,employee_id,qualified_subjects
John Doe,john@school.com,1234567890,EMP001,Mathematics;Physics
Jane Smith,jane@school.com,0987654321,EMP002,English;History
```

### Step 4: Add Students
Choose one method:

#### Option A: Individual Entry
1. Go to **Students** tab
2. Click "Add Student"
3. Fill in: Name, Phone (for login), Roll No, Section
4. Optionally add parent info: Name, Email, Phone
5. Click "Add Student"
6. Parent account is auto-created if email provided

#### Option B: Bulk CSV Upload
1. Go to **Students** tab
2. Click "Bulk CSV"
3. Create CSV with columns:
   ```
   name, phone, roll_no, grade_number, section_name, parent_name, parent_email, parent_phone
   ```
4. Upload the CSV file
5. Students and parents are created automatically

**CSV Example:**
```csv
name,phone,roll_no,grade_number,section_name,parent_name,parent_email,parent_phone
Alice Johnson,1111111111,001,6,A,Bob Johnson,bob@parent.com,2222222222
Charlie Brown,3333333333,002,6,A,Diana Brown,diana@parent.com,4444444444
```

### Step 5: Assign Teachers to Subjects
1. Go to **Assignments** tab
2. Select a section (e.g., Grade 6-A)
3. For each subject:
   - Select the subject
   - Select a qualified teacher
   - Click "Assign"
4. Repeat for all subjects in all sections

**Example for Grade 6-A:**
- Mathematics → Mr. John Doe
- Science → Ms. Jane Smith
- English → Mr. Robert Johnson
- SST → Ms. Emily Davis

### Step 6: Manage Parents (Optional)
1. Go to **Parents** tab
2. View all parents and their linked children
3. Add new parents manually if needed
4. Link/unlink children as required
5. Update parent information

### Step 7: Monitor Changes
1. Go to **Audit Log** tab
2. View all changes made by admins
3. Filter by entity type or specific entity
4. Track who made what changes and when

## 🔐 Login Credentials

### For Teachers
- **Login Method**: Email + Password
- **Initial Password**: Auto-generated (shown after creation) or `School@123` (bulk upload)
- **Must Change**: Yes, on first login

### For Students
- **Login Method**: Phone + OTP
- **No Password**: OTP sent to phone number

### For Parents
- **Login Method**: Email + Password
- **Initial Password**: `School@123` (bulk upload) or auto-generated
- **Must Change**: Yes, on first login

## 🔧 Common Operations

### Reset Password
1. Find the user (teacher, student, or parent)
2. Click "Reset" button
3. New password is displayed
4. Share with user securely

### Transfer Student
1. Go to **Students** tab
2. Find the student
3. Click "Edit"
4. Select new section from dropdown
5. Click "Save"
6. Transfer is logged in audit trail

### Update Teacher Subjects
1. Go to **Teachers** tab
2. Find the teacher
3. Click "Edit"
4. Update qualified subjects
5. Click "Save"

### Reassign Subject Teacher
1. Go to **Assignments** tab
2. Select the section
3. Find the subject
4. Select new teacher
5. Click "Assign" (replaces previous teacher)

### Link Child to Parent
1. Go to **Parents** tab
2. Find the parent
3. Click "Link Child"
4. Select student
5. Confirm

## 📊 Data Validation

### Before Uploading CSV
- ✅ Check all required fields are filled
- ✅ Verify email formats are correct
- ✅ Ensure phone numbers are unique for students
- ✅ Confirm grade and section exist before adding students
- ✅ Use semicolon (;) to separate multiple subjects for teachers

### Common Errors
- **"Section not found"**: Create the section first
- **"Email already registered"**: User exists, use edit instead
- **"Phone already registered"**: Student exists with that phone
- **"Cannot delete"**: Remove dependencies first (e.g., students in section)

## 🎯 Best Practices

1. **Setup Order**: Always create Grades → Sections → Teachers → Students → Assignments
2. **Bulk Upload**: Use for large batches (>10 users)
3. **Individual Entry**: Use for single users or when parent info varies
4. **Regular Audits**: Check audit log weekly for compliance
5. **Password Security**: Reset passwords immediately if compromised
6. **Data Backup**: Export data regularly (future feature)

## 📞 Support

### If Something Goes Wrong
1. Check the error message displayed
2. Review audit log for recent changes
3. Verify data relationships (grade → section → student)
4. Use edit/update instead of delete/recreate when possible

### Data Integrity
- Students must belong to existing sections
- Sections must belong to existing grades
- Teachers can only be assigned to subjects they're qualified for
- Parents can be linked to multiple children
- One student can have one parent account

## 🔄 Typical School Year Workflow

### Start of Year
1. Create new grades/sections if needed
2. Bulk upload new students
3. Transfer existing students to new grades
4. Assign teachers to new sections

### During Year
1. Add individual students as they join
2. Transfer students between sections if needed
3. Update teacher assignments
4. Reset passwords as requested

### End of Year
1. Review audit logs
2. Archive data (future feature)
3. Prepare for next year setup

## 📝 Notes

- All times are in UTC
- Changes are immediate (no save button needed after operations)
- Bulk uploads show detailed results (created, skipped, errors)
- Search works on names, emails, and phone numbers
- Filters can be combined for precise results

---

**Need Help?** Check the full documentation in `SCHOOL_ADMIN_ONBOARDING_ANALYSIS.md`
