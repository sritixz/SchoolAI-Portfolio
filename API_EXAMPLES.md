# School Admin API - Request/Response Examples

## Authentication

All requests require Bearer token authentication:
```
Authorization: Bearer <token>
```

## 1. Grades Management

### Create Grade
```http
POST /schooladmin/grades
Content-Type: application/json

{
  "grade_number": "6",
  "subjects": ["Mathematics", "Science", "English", "SST", "Hindi"]
}
```

**Response:**
```json
{
  "id": "507f1f77bcf86cd799439011",
  "grade_number": "6",
  "subjects": ["Mathematics", "Science", "English", "SST", "Hindi"]
}
```

### List Grades
```http
GET /schooladmin/grades
```

**Response:**
```json
[
  {
    "_id": "507f1f77bcf86cd799439011",
    "school_id": "507f1f77bcf86cd799439012",
    "grade_number": "6",
    "subjects": ["Mathematics", "Science", "English", "SST", "Hindi"],
    "created_at": "2024-01-15T10:30:00Z"
  }
]
```

### Update Grade Subjects
```http
PATCH /schooladmin/grades/507f1f77bcf86cd799439011
Content-Type: application/json

{
  "subjects": ["Mathematics", "Science", "English", "SST", "Hindi", "Computer Science"]
}
```

## 2. Sections Management

### Create Section
```http
POST /schooladmin/sections
Content-Type: application/json

{
  "grade_number": "6",
  "section_name": "A",
  "class_teacher_id": null
}
```

**Response:**
```json
{
  "id": "507f1f77bcf86cd799439013",
  "class_name": "Grade 6-A"
}
```

### List Sections
```http
GET /schooladmin/sections?grade_id=507f1f77bcf86cd799439011
```

**Response:**
```json
[
  {
    "_id": "507f1f77bcf86cd799439013",
    "school_id": "507f1f77bcf86cd799439012",
    "grade_id": "507f1f77bcf86cd799439011",
    "grade_number": "6",
    "section_name": "A",
    "class_name": "Grade 6-A",
    "class_teacher_id": null,
    "student_count": 30,
    "assignment_count": 5,
    "created_at": "2024-01-15T11:00:00Z"
  }
]
```

## 3. Teachers Management

### Create Teacher
```http
POST /schooladmin/teachers
Content-Type: application/json

{
  "name": "John Doe",
  "email": "john.doe@school.com",
  "phone": "1234567890",
  "employee_id": "EMP001",
  "qualified_subjects": ["Mathematics", "Physics"]
}
```

**Response:**
```json
{
  "id": "507f1f77bcf86cd799439014",
  "temp_password": "Xy9#mK2pL!"
}
```

### Bulk Upload Teachers (CSV)
```http
POST /schooladmin/teachers/bulk-csv
Content-Type: multipart/form-data

file: teachers.csv
default_password: School@123
```

**Response:**
```json
{
  "results": [
    {
      "email": "john.doe@school.com",
      "status": "created",
      "id": "507f1f77bcf86cd799439014"
    },
    {
      "email": "jane.smith@school.com",
      "status": "already_exists"
    }
  ],
  "created": 1
}
```

### List Teachers
```http
GET /schooladmin/teachers
```

**Response:**
```json
[
  {
    "_id": "507f1f77bcf86cd799439014",
    "name": "John Doe",
    "email": "john.doe@school.com",
    "phone": "1234567890",
    "employee_id": "EMP001",
    "role": "teacher",
    "school_id": "507f1f77bcf86cd799439012",
    "qualified_subjects": ["Mathematics", "Physics"],
    "assigned_sections": ["507f1f77bcf86cd799439013"],
    "must_change_password": true,
    "status": "active",
    "created_at": "2024-01-15T12:00:00Z"
  }
]
```

## 4. Students Management

### Create Student
```http
POST /schooladmin/students
Content-Type: application/json

{
  "name": "Alice Johnson",
  "phone": "1111111111",
  "roll_no": "001",
  "section_id": "507f1f77bcf86cd799439013",
  "parent_name": "Bob Johnson",
  "parent_email": "bob.johnson@parent.com",
  "parent_phone": "2222222222"
}
```

**Response:**
```json
{
  "id": "507f1f77bcf86cd799439015",
  "parent_id": "507f1f77bcf86cd799439016"
}
```

### Bulk Upload Students (CSV)
```http
POST /schooladmin/students/bulk-csv
Content-Type: multipart/form-data

file: students.csv
default_password: School@123
```

**Response:**
```json
{
  "results": [
    {
      "name": "Alice Johnson",
      "phone": "1111111111",
      "status": "created",
      "student_id": "507f1f77bcf86cd799439015",
      "parent_id": "507f1f77bcf86cd799439016"
    },
    {
      "name": "Charlie Brown",
      "phone": "3333333333",
      "status": "error",
      "reason": "Section Grade 6-Z not found"
    }
  ],
  "created": 1
}
```

### List Students
```http
GET /schooladmin/students?section_id=507f1f77bcf86cd799439013
```

**Response:**
```json
[
  {
    "_id": "507f1f77bcf86cd799439015",
    "name": "Alice Johnson",
    "phone": "1111111111",
    "roll_no": "001",
    "role": "student",
    "school_id": "507f1f77bcf86cd799439012",
    "section_id": "507f1f77bcf86cd799439013",
    "grade_number": "6",
    "section_name": "A",
    "class_name": "Grade 6-A",
    "parent_id": "507f1f77bcf86cd799439016",
    "status": "active",
    "created_at": "2024-01-15T13:00:00Z"
  }
]
```

### Transfer Student
```http
POST /schooladmin/students/transfer
Content-Type: application/json

{
  "student_id": "507f1f77bcf86cd799439015",
  "new_section_id": "507f1f77bcf86cd799439017"
}
```

**Response:**
```json
{
  "transferred": true,
  "new_class": "Grade 6-B"
}
```

## 5. Subject Assignments

### Assign Teacher to Subject
```http
PUT /schooladmin/sections/507f1f77bcf86cd799439013/assignments
Content-Type: application/json

{
  "section_id": "507f1f77bcf86cd799439013",
  "subject": "Mathematics",
  "teacher_id": "507f1f77bcf86cd799439014"
}
```

**Response:**
```json
{
  "status": "assigned"
}
```

### List Assignments for Section
```http
GET /schooladmin/sections/507f1f77bcf86cd799439013/assignments
```

**Response:**
```json
[
  {
    "_id": "507f1f77bcf86cd799439018",
    "section_id": "507f1f77bcf86cd799439013",
    "subject": "Mathematics",
    "teacher_id": "507f1f77bcf86cd799439014",
    "teacher_name": "John Doe",
    "teacher_email": "john.doe@school.com",
    "updated_at": "2024-01-15T14:00:00Z"
  }
]
```

## 6. Parents Management

### List Parents
```http
GET /schooladmin/parents
```

**Response:**
```json
[
  {
    "_id": "507f1f77bcf86cd799439016",
    "name": "Bob Johnson",
    "email": "bob.johnson@parent.com",
    "phone": "2222222222",
    "role": "parent",
    "school_id": "507f1f77bcf86cd799439012",
    "children": ["507f1f77bcf86cd799439015"],
    "children_details": [
      {
        "id": "507f1f77bcf86cd799439015",
        "name": "Alice Johnson",
        "class": "Grade 6-A"
      }
    ],
    "must_change_password": true,
    "status": "active",
    "created_at": "2024-01-15T13:00:00Z"
  }
]
```

### Create Parent
```http
POST /schooladmin/parents
Content-Type: application/json

{
  "name": "Diana Brown",
  "email": "diana.brown@parent.com",
  "phone": "4444444444",
  "children_ids": ["507f1f77bcf86cd799439019"]
}
```

**Response:**
```json
{
  "id": "507f1f77bcf86cd799439020",
  "temp_password": "Qw8#nM5tR!"
}
```

### Link Child to Parent
```http
POST /schooladmin/parents/507f1f77bcf86cd799439016/link-child/507f1f77bcf86cd799439021
```

**Response:**
```json
{
  "linked": true
}
```

## 7. Credential Management

### Reset Password
```http
POST /schooladmin/reset-credentials
Content-Type: application/json

{
  "user_id": "507f1f77bcf86cd799439014",
  "new_password": null
}
```

**Response:**
```json
{
  "new_password": "Lm3#pK9wT!",
  "must_change_password": true
}
```

## 8. Audit Logs

### Get Audit Logs
```http
GET /schooladmin/audit-logs?entity_type=student&limit=50
```

**Response:**
```json
[
  {
    "_id": "507f1f77bcf86cd799439022",
    "entity_type": "student",
    "entity_id": "507f1f77bcf86cd799439015",
    "action": "created",
    "changes": {
      "name": "Alice Johnson",
      "phone": "1111111111",
      "section": "Grade 6-A"
    },
    "performed_by": "507f1f77bcf86cd799439001",
    "admin_name": "School Admin",
    "timestamp": "2024-01-15T13:00:00Z"
  },
  {
    "_id": "507f1f77bcf86cd799439023",
    "entity_type": "student",
    "entity_id": "507f1f77bcf86cd799439015",
    "action": "transferred",
    "changes": {
      "from": "Grade 6-A",
      "to": "Grade 6-B"
    },
    "performed_by": "507f1f77bcf86cd799439001",
    "admin_name": "School Admin",
    "timestamp": "2024-01-16T10:30:00Z"
  }
]
```

## 9. Dashboard

### Get Dashboard Stats
```http
GET /schooladmin/dashboard
```

**Response:**
```json
{
  "admin": {
    "_id": "507f1f77bcf86cd799439001",
    "name": "School Admin",
    "email": "admin@school.com",
    "role": "schooladmin",
    "school_id": "507f1f77bcf86cd799439012",
    "school_name": "ABC High School"
  },
  "counts": {
    "students": 450,
    "teachers": 25,
    "parents": 380,
    "grades": 7,
    "sections": 21
  }
}
```

## Error Responses

### 400 Bad Request
```json
{
  "detail": "Email already registered"
}
```

### 404 Not Found
```json
{
  "detail": "Section not found"
}
```

### 401 Unauthorized
```json
{
  "detail": "Not authenticated"
}
```

### 403 Forbidden
```json
{
  "detail": "Insufficient permissions"
}
```

## Common Query Parameters

- `?section_id=<id>` - Filter by section
- `?grade_id=<id>` - Filter by grade
- `?grade_number=<num>` - Filter by grade number
- `?entity_type=<type>` - Filter audit logs by entity type
- `?entity_id=<id>` - Filter audit logs by specific entity
- `?limit=<num>` - Limit results (default: 100)

## Notes

1. All datetime fields are in ISO 8601 format (UTC)
2. ObjectIds are MongoDB ObjectId strings
3. Bulk operations return detailed results for each row
4. Passwords are auto-generated if not provided
5. Email notifications are sent asynchronously
6. All changes are logged in audit trail
