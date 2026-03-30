# School Admin Onboarding System

A comprehensive school management system for onboarding and managing students, teachers, parents, grades, sections, and subject assignments.

## 🎯 Overview

This system provides school administrators with complete control over their school's structure, from creating grades and sections to managing teachers, students, and their relationships. It supports both individual entry and bulk CSV uploads, with full audit trail capabilities.

## ✨ Key Features

- **Complete School Structure Management**: Grades → Sections → Students/Teachers
- **Bulk Operations**: CSV upload for teachers and students
- **Parent Account Management**: Auto-create and link parent accounts
- **Subject Assignments**: Assign teachers to subjects in specific sections
- **Audit Trail**: Track all changes for compliance
- **Password Management**: Auto-generate and reset passwords
- **Search & Filter**: Find users quickly across all entities
- **Email Notifications**: Welcome emails for teachers and parents

## 📚 Documentation

### Quick Links
- **[Quick Start Guide](QUICK_START_GUIDE.md)** - Step-by-step setup instructions
- **[System Overview](SYSTEM_OVERVIEW.md)** - Visual architecture and workflows
- **[Complete Analysis](SCHOOL_ADMIN_ONBOARDING_ANALYSIS.md)** - Detailed system documentation
- **[Data Model Diagrams](DATA_MODEL_DIAGRAM.md)** - Entity relationships and schemas
- **[API Examples](API_EXAMPLES.md)** - Request/response examples for all endpoints
- **[Implementation Summary](IMPLEMENTATION_SUMMARY.md)** - What was built and how

### CSV Templates
- **[teachers_template.csv](teachers_template.csv)** - Sample teacher data format
- **[students_template.csv](students_template.csv)** - Sample student data format

## 🚀 Quick Start

### 1. Setup School Structure

```
1. Create Grades (6, 7, 8, 9, 10, 11, 12)
   └─► Add subjects for each grade

2. Create Sections (A, B, C, D, E, F)
   └─► Link to grades

3. Add Teachers
   └─► Individual or bulk CSV upload

4. Add Students
   └─► Individual or bulk CSV upload
   └─► Parents auto-created

5. Assign Teachers to Subjects
   └─► Per section, per subject
```

### 2. Access the System

**School Admin Portal**: `/schooladmin/onboarding`

**Login Credentials**:
- School Admin: Email + Password
- Teachers: Email + Password (auto-generated)
- Students: Phone + OTP
- Parents: Email + Password (auto-generated)

## 📋 System Architecture

```
School
  └── Grades (6-12)
       ├── Subjects (Math, Science, English, etc.)
       └── Sections (A, B, C, etc.)
            ├── Students
            │    └── Parents (linked)
            └── Subject Assignments
                 └── Teachers (per subject)
```

## 🔐 Security

- **Role-Based Access**: School admin has full control
- **Auto-Generated Passwords**: Secure 10-character passwords
- **Must Change Password**: On first login
- **Audit Trail**: All changes logged with admin ID and timestamp
- **Email Notifications**: Welcome emails with credentials

## 📊 Data Model

### Collections
1. **users** - Students, Teachers, Parents, School Admins
2. **grades** - Grade configurations with subjects
3. **sections** - Class sections (Grade 6-A, etc.)
4. **subject_assignments** - Teacher-to-Subject-to-Section mappings
5. **change_logs** - Audit trail for all changes

### Key Relationships
- One student → One parent
- One parent → Multiple children
- One teacher → Multiple subjects → Multiple sections
- One section → One grade → Multiple subjects
- One subject in one section → One teacher

## 🎨 User Interface

### Tabs
1. **Grades** - Configure grades and subjects
2. **Sections** - Create class sections
3. **Teachers** - Manage teachers (add, edit, bulk upload)
4. **Students** - Manage students (add, edit, bulk upload, transfer)
5. **Assignments** - Assign teachers to subjects in sections

### Features
- Search by name, email, or phone
- Filter by grade, section, or status
- Inline editing
- Bulk CSV upload with validation
- Password reset with display
- Real-time validation

## 📤 Bulk Upload

### Teachers CSV Format
```csv
name,email,phone,employee_id,qualified_subjects
John Doe,john@school.com,1234567890,EMP001,Mathematics;Physics;Chemistry
Jane Smith,jane@school.com,0987654321,EMP002,English;History
```

### Students CSV Format
```csv
name,phone,roll_no,grade_number,section_name,parent_name,parent_email,parent_phone
Alice Johnson,1111111111,001,6,A,Bob Johnson,bob@parent.com,2222222222
Charlie Brown,3333333333,002,6,A,Diana Brown,diana@parent.com,4444444444
```

## 🔧 API Endpoints

### Grades
- `GET /schooladmin/grades` - List all grades
- `POST /schooladmin/grades` - Create grade
- `PATCH /schooladmin/grades/{id}` - Update grade
- `DELETE /schooladmin/grades/{id}` - Delete grade

### Sections
- `GET /schooladmin/sections` - List sections
- `POST /schooladmin/sections` - Create section
- `PATCH /schooladmin/sections/{id}` - Update section
- `DELETE /schooladmin/sections/{id}` - Delete section

### Teachers
- `GET /schooladmin/teachers` - List teachers
- `POST /schooladmin/teachers` - Create teacher
- `POST /schooladmin/teachers/bulk-csv` - Bulk upload
- `PATCH /schooladmin/teachers/{id}` - Update teacher
- `DELETE /schooladmin/teachers/{id}` - Deactivate teacher

### Students
- `GET /schooladmin/students` - List students
- `POST /schooladmin/students` - Create student
- `POST /schooladmin/students/bulk-csv` - Bulk upload
- `POST /schooladmin/students/transfer` - Transfer student
- `PATCH /schooladmin/students/{id}` - Update student
- `DELETE /schooladmin/students/{id}` - Deactivate student

### Parents
- `GET /schooladmin/parents` - List parents
- `POST /schooladmin/parents` - Create parent
- `PATCH /schooladmin/parents/{id}` - Update parent
- `POST /schooladmin/parents/{id}/link-child/{student_id}` - Link child
- `DELETE /schooladmin/parents/{id}/unlink-child/{student_id}` - Unlink child

### Assignments
- `GET /schooladmin/sections/{id}/assignments` - List assignments
- `PUT /schooladmin/sections/{id}/assignments` - Assign teacher
- `DELETE /schooladmin/sections/{id}/assignments/{subject}` - Remove assignment

### Audit & Security
- `GET /schooladmin/audit-logs` - View change history
- `POST /schooladmin/reset-credentials` - Reset password

## 🎯 Common Operations

### Add a New Student
1. Go to Students tab
2. Click "Add Student"
3. Fill in: Name, Phone, Roll No, Section
4. Optionally add parent info
5. Click "Add Student"
6. Parent account auto-created if email provided

### Transfer a Student
1. Go to Students tab
2. Find the student
3. Click "Edit"
4. Select new section
5. Click "Save"
6. Transfer logged in audit trail

### Assign Teacher to Subject
1. Go to Assignments tab
2. Select section
3. Select subject
4. Select qualified teacher
5. Click "Assign"

### Reset Password
1. Find the user (any tab)
2. Click "Reset" button
3. New password displayed
4. Share with user securely

## 📈 Audit Trail

All operations are logged:
- Student: created, updated, transferred, deactivated
- Teacher: created, updated, deactivated
- Parent: created, updated, linked_child, unlinked_child
- Assignment: assigned, reassigned, removed

View logs: `GET /schooladmin/audit-logs?entity_type=student&limit=100`

## 🔍 Search & Filter

### Search
- By name (students, teachers, parents)
- By email (teachers, parents)
- By phone (students)

### Filter
- By grade
- By section
- By status (active/inactive)

## ⚠️ Important Notes

1. **Setup Order**: Always create Grades → Sections → Teachers → Students → Assignments
2. **Dependencies**: Cannot delete grades with sections, or sections with students
3. **Unique Constraints**: Phone numbers must be unique for students, emails for teachers/parents
4. **Password Security**: Change default passwords immediately in production
5. **Bulk Upload**: Verify CSV format before uploading

## 🐛 Troubleshooting

### "Section not found"
- Create the section first before adding students

### "Email already registered"
- User exists, use edit instead of create

### "Cannot delete grade"
- Remove all sections in that grade first

### "Teacher not qualified"
- Add subject to teacher's qualified_subjects list

## 📞 Support

For issues or questions:
1. Check the [Quick Start Guide](QUICK_START_GUIDE.md)
2. Review [API Examples](API_EXAMPLES.md)
3. Check [Audit Logs](API_EXAMPLES.md#8-audit-logs) for recent changes

## 🎓 Best Practices

1. Use bulk CSV upload for large batches (>10 users)
2. Verify data before bulk upload
3. Review audit logs weekly
4. Reset passwords immediately if compromised
5. Keep parent information up-to-date
6. Transfer students properly (don't delete and recreate)

## 📦 Tech Stack

- **Backend**: FastAPI (Python)
- **Frontend**: React (JavaScript)
- **Database**: MongoDB (NoSQL)
- **Authentication**: JWT tokens
- **Email**: SMTP (configurable)

## 🚀 Status

✅ **Production Ready**

All core features implemented and tested:
- Complete CRUD operations
- Bulk CSV uploads
- Parent management
- Subject assignments
- Audit trail
- Password management
- Email notifications

## 📝 Version

**Version**: 1.0
**Last Updated**: 2024-01-15
**Status**: Stable

---

## 📖 Additional Resources

- [Complete System Analysis](SCHOOL_ADMIN_ONBOARDING_ANALYSIS.md)
- [Data Model Diagrams](DATA_MODEL_DIAGRAM.md)
- [Implementation Details](IMPLEMENTATION_SUMMARY.md)
- [System Overview](SYSTEM_OVERVIEW.md)

---

**Built with ❤️ for schools**
