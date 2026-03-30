# School Admin Data Model - Visual Diagrams

## Entity Relationship Diagram

```
┌─────────────────┐
│     SCHOOL      │
│   (Admin User)  │
└────────┬────────┘
         │
         │ manages
         │
         ▼
┌─────────────────┐
│     GRADES      │
│  - grade_number │
│  - subjects[]   │
└────────┬────────┘
         │
         │ has many
         │
         ▼
┌─────────────────┐
│    SECTIONS     │
│  - section_name │
│  - class_name   │
└────┬────────┬───┘
     │        │
     │        │ has many
     │        │
     │        ▼
     │   ┌──────────────────┐
     │   │    STUDENTS      │
     │   │  - name          │
     │   │  - phone (login) │
     │   │  - roll_no       │
     │   └────────┬─────────┘
     │            │
     │            │ linked to
     │            │
     │            ▼
     │   ┌──────────────────┐
     │   │     PARENTS      │
     │   │  - name          │
     │   │  - email (login) │
     │   │  - children[]    │
     │   └──────────────────┘
     │
     │ has many
     │
     ▼
┌─────────────────────────┐
│  SUBJECT_ASSIGNMENTS    │
│  - subject              │
│  - teacher_id           │
└────────┬────────────────┘
         │
         │ references
         │
         ▼
┌─────────────────┐
│    TEACHERS     │
│  - name         │
│  - email        │
│  - qualified[]  │
└─────────────────┘
```

## Data Flow Diagram

### Student Onboarding Flow
```
Admin Input
    │
    ▼
┌─────────────────────┐
│  Create Student     │
│  - Name             │
│  - Phone            │
│  - Section          │
│  - Parent Info      │
└──────────┬──────────┘
           │
           ├─────────────────┐
           │                 │
           ▼                 ▼
    ┌─────────────┐   ┌──────────────┐
    │   Student   │   │ Auto-Create  │
    │   Account   │   │   Parent     │
    │  (Phone)    │   │  (Email)     │
    └──────┬──────┘   └──────┬───────┘
           │                 │
           └────────┬────────┘
                    │
                    ▼
            ┌───────────────┐
            │  Link Parent  │
            │  to Student   │
            └───────┬───────┘
                    │
                    ▼
            ┌───────────────┐
            │  Audit Log    │
            │  Entry        │
            └───────────────┘
```

### Teacher Assignment Flow
```
Admin Action
    │
    ▼
┌─────────────────────┐
│  Select Section     │
│  (Grade 6-A)        │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│  Select Subject     │
│  (Mathematics)      │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│  Select Teacher     │
│  (Qualified Only)   │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│  Create/Update      │
│  Assignment         │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│  Update Teacher's   │
│  assigned_sections  │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│  Audit Log Entry    │
└─────────────────────┘
```

## User Hierarchy

```
                    ┌──────────────────┐
                    │  SCHOOL ADMIN    │
                    │  (Full Access)   │
                    └────────┬─────────┘
                             │
                ┌────────────┼────────────┐
                │            │            │
                ▼            ▼            ▼
        ┌──────────┐  ┌──────────┐  ┌──────────┐
        │ TEACHERS │  │ STUDENTS │  │ PARENTS  │
        │          │  │          │  │          │
        │ Email +  │  │ Phone +  │  │ Email +  │
        │ Password │  │   OTP    │  │ Password │
        └──────────┘  └──────────┘  └──────────┘
             │             │              │
             │             │              │
             ▼             ▼              ▼
        ┌──────────┐  ┌──────────┐  ┌──────────┐
        │ Teaches  │  │ Learns   │  │ Monitors │
        │ Subjects │  │ Subjects │  │ Children │
        └──────────┘  └──────────┘  └──────────┘
```

## Section Structure Example

```
Grade 6
├── Subjects: [Math, Science, English, SST, Hindi]
│
├── Section A (Grade 6-A)
│   ├── Students: 30
│   │   ├── Alice (Roll 001) → Parent: Bob
│   │   ├── Charlie (Roll 002) → Parent: Diana
│   │   └── ...
│   │
│   └── Subject Assignments:
│       ├── Mathematics → Mr. John Doe
│       ├── Science → Ms. Jane Smith
│       ├── English → Mr. Robert Johnson
│       ├── SST → Ms. Emily Davis
│       └── Hindi → Mr. Michael Brown
│
├── Section B (Grade 6-B)
│   ├── Students: 28
│   └── Subject Assignments:
│       ├── Mathematics → Mr. John Doe (same teacher)
│       ├── Science → Ms. Sarah Wilson (different)
│       └── ...
│
└── Section C (Grade 6-C)
    ├── Students: 32
    └── Subject Assignments:
        └── ...
```

## Database Collections Schema

### users Collection
```json
{
  "_id": "ObjectId",
  "name": "string",
  "email": "string (teachers, parents, admins)",
  "phone": "string (students, optional for others)",
  "role": "student | teacher | parent | schooladmin",
  "school_id": "string",
  "school_name": "string",
  
  // Student specific
  "section_id": "string",
  "grade_number": "string",
  "section_name": "string",
  "class_name": "string",
  "roll_no": "string",
  "parent_id": "string",
  
  // Teacher specific
  "employee_id": "string",
  "qualified_subjects": ["string"],
  "assigned_sections": ["string"],
  
  // Parent specific
  "children": ["student_id"],
  
  // Auth
  "hashed_password": "string",
  "must_change_password": "boolean",
  "status": "active | inactive",
  "created_at": "datetime",
  "created_by": "admin_id"
}
```

### grades Collection
```json
{
  "_id": "ObjectId",
  "school_id": "string",
  "grade_number": "string",
  "subjects": ["string"],
  "created_at": "datetime"
}
```

### sections Collection
```json
{
  "_id": "ObjectId",
  "school_id": "string",
  "grade_id": "string",
  "grade_number": "string",
  "section_name": "string",
  "class_name": "string",
  "class_teacher_id": "string (optional)",
  "created_at": "datetime"
}
```

### subject_assignments Collection
```json
{
  "_id": "ObjectId",
  "section_id": "string",
  "subject": "string",
  "teacher_id": "string",
  "updated_at": "datetime"
}
```

### change_logs Collection (NEW)
```json
{
  "_id": "ObjectId",
  "entity_type": "student | teacher | parent | section | assignment",
  "entity_id": "string",
  "action": "created | updated | deleted | transferred",
  "changes": {
    "field": "old_value → new_value"
  },
  "performed_by": "admin_id",
  "timestamp": "datetime"
}
```

## Access Control Matrix

```
┌──────────────┬─────────┬─────────┬─────────┬─────────┐
│   Action     │  Admin  │ Teacher │ Student │ Parent  │
├──────────────┼─────────┼─────────┼─────────┼─────────┤
│ Create Grade │    ✓    │    ✗    │    ✗    │    ✗    │
│ Create Sect  │    ✓    │    ✗    │    ✗    │    ✗    │
│ Add Teacher  │    ✓    │    ✗    │    ✗    │    ✗    │
│ Add Student  │    ✓    │    ✗    │    ✗    │    ✗    │
│ Assign Subj  │    ✓    │    ✗    │    ✗    │    ✗    │
│ Reset Pass   │    ✓    │    ✗    │    ✗    │    ✗    │
│ View Audit   │    ✓    │    ✗    │    ✗    │    ✗    │
│ View Own     │    ✓    │    ✓    │    ✓    │    ✓    │
│ Update Own   │    ✓    │    ✓    │    ✓    │    ✓    │
└──────────────┴─────────┴─────────┴─────────┴─────────┘
```

## State Transitions

### Student Lifecycle
```
    [Created]
        │
        ▼
    [Active] ←──────┐
        │           │
        ├─→ [Transferred]
        │           │
        └───────────┘
        │
        ▼
    [Inactive]
```

### Teacher Lifecycle
```
    [Created]
        │
        ▼
    [Active] ←──────┐
        │           │
        ├─→ [Updated]
        │           │
        └───────────┘
        │
        ▼
    [Deactivated]
```

### Assignment Lifecycle
```
    [Assigned]
        │
        ├─→ [Reassigned] (new teacher)
        │
        └─→ [Removed]
```

## Integration Points

```
┌─────────────────────────────────────────────┐
│          School Admin System                │
│                                             │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐ │
│  │  Grades  │  │ Sections │  │ Teachers │ │
│  └────┬─────┘  └────┬─────┘  └────┬─────┘ │
│       │             │              │       │
│       └─────────────┼──────────────┘       │
│                     │                      │
│              ┌──────▼──────┐               │
│              │  Students   │               │
│              └──────┬──────┘               │
│                     │                      │
└─────────────────────┼──────────────────────┘
                      │
        ┌─────────────┼─────────────┐
        │             │             │
        ▼             ▼             ▼
┌──────────┐  ┌──────────┐  ┌──────────┐
│ Homework │  │ Learning │  │Portfolio │
│  System  │  │   Gaps   │  │  System  │
└──────────┘  └──────────┘  └──────────┘
```

---

This data model ensures:
- ✅ Clear hierarchical relationships
- ✅ Referential integrity
- ✅ Audit trail for compliance
- ✅ Flexible subject assignments
- ✅ Parent-child linkage
- ✅ Scalable structure
