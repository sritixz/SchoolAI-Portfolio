# Student Pages - Complete Fix List

## CRITICAL ISSUES IDENTIFIED

### 1. STUDENTS LIST PAGE (`/teacher/students`)

#### Issue 1.1: Parent Button Not Clickable
**Problem**: Parent button appears disabled/gray even when parent exists
**Current State**: Button shows "Parent" but doesn't respond to clicks
**Root Cause**: Need to verify parent_id is being returned from API and button handler is working
**Fix Required**:
- Check if `parent_id` exists in API response
- Ensure button is not disabled when parent exists
- Add proper click handler
- Show parent's first name on button (e.g., "Bob" instead of "Parent")
- Navigate to `/teacher/communication?parent={parent_id}`

#### Issue 1.2: More Actions Button Not Clickable
**Problem**: "More Actions" button (three dots) doesn't open dropdown menu
**Current State**: Button exists but no dropdown appears
**Fix Required**:
- Add state for dropdown visibility: `const [openDropdown, setOpenDropdown] = useState(null)`
- Add click handler to toggle dropdown
- Create dropdown menu with options:
  - View Profile
  - Send Message
  - View Learning Gaps
  - View Attendance
  - Export Report
- Position dropdown absolutely below button
- Close dropdown when clicking outside

#### Issue 1.3: Homework Button Goes to Wrong Page
**Problem**: Homework button navigates to `/teacher/homework` (catalog) instead of student-specific homework
**Current State**: Shows all homework instead of student's homework
**Expected**: Should navigate to `/teacher/students/{student_id}` (student detail page)
**Fix Required**:
- Change navigation from `/teacher/homework` to `/teacher/students/${student.id}`
- This will show only that student's assigned homework

### 2. STUDENT DETAIL PAGE (`/teacher/students/:studentId`)

#### Issue 2.1: Submissions Tab Shows "Coming Soon"
**Problem**: Submissions tab is placeholder with no functionality
**Current State**: Shows "Submissions view coming soon"
**Fix Required**:
- Fetch student's homework submissions from API
- Display submissions in a list/grid with:
  - Homework title
  - Subject
  - Submission date
  - Status (submitted/graded)
  - Score (if graded)
  - Quick actions (View, Download, Re-grade)
- Filter options: All / Pending Review / Graded
- Sort options: Date / Score / Subject

#### Issue 2.2: Profile Tab Shows "Coming Soon"
**Problem**: Profile tab is placeholder with no functionality
**Current State**: Shows "Profile view coming soon"
**Fix Required**:
- Create comprehensive student profile view with:
  - **Personal Info**: Name, Roll No, Class, Contact
  - **Parent Info**: Parent name, email, phone with "Contact Parent" button
  - **Academic Stats**:
    - Overall average score
    - Subject-wise performance chart
    - Homework completion rate
    - Attendance percentage
  - **Learning Gaps**: List of identified gaps with severity
  - **Recent Activity**: Timeline of submissions, grades, interactions
  - **Performance Trends**: Line chart showing score trends over time

#### Issue 2.3: Student Name Not Displayed
**Problem**: Header shows "Student" instead of actual student name
**Current State**: Using placeholder text
**Fix Required**:
- Create new backend endpoint: `GET /teacher/students/{student_id}/profile`
- Return student details: name, roll_no, class, avatar, parent info
- Update frontend to fetch and display actual student name
- Show student avatar if available

#### Issue 2.4: No Quick Actions on Homework Cards
**Problem**: Only one button per homework card, no quick actions
**Fix Required**:
- Add dropdown menu (three dots) on each homework card with:
  - View Details
  - Download Assignment
  - Send Reminder (if pending)
  - View Submission (if submitted)
  - Re-assign with new due date
  - Delete Assignment

### 3. PARENT-STUDENT MATCHING ISSUE

#### Issue 3.1: Parent Data Not Properly Linked
**Problem**: Parent button shows as disabled or undefined
**Root Cause**: Need to verify parent_ids array in student documents
**Investigation Required**:
- Check seed data: Are parent_ids properly set in student documents?
- Check API response: Is parent_id being returned?
- Check frontend: Is parent_id being used correctly?

**Fix Required in Seed Data** (`backend/seed_data.py` or `backend/seed_extended.py`):
```python
# Ensure students have parent_ids array
await db.users.update_one(
    {"_id": alice_id},
    {"$set": {"parent_ids": [str(bob_parent_id)]}}
)
```

**Fix Required in Backend** (`backend/routers/teacher.py`):
- Verify `GET /teacher/students/by-class` returns parent_id, parent_name, parent_email
- Add fallback if parent not found

**Fix Required in Frontend** (`frontend/src/pages/teacher/Students.jsx`):
- Check if `s.parent_id` exists before rendering button
- Show "No Parent" if parent_id is null
- Disable button only if no parent linked

### 4. BACKEND ENDPOINTS NEEDED

#### Endpoint 4.1: Get Student Profile
```
GET /teacher/students/{student_id}/profile
Response:
{
  "id": "...",
  "name": "Alice Johnson",
  "roll_no": "#001",
  "class": "Grade 6-A",
  "section_id": "...",
  "avatar": null,
  "email": null,
  "phone": "1111111111",
  "parent_id": "...",
  "parent_name": "Bob Johnson",
  "parent_email": "bob.johnson@parent.com",
  "parent_phone": "...",
  "attendance": 95,
  "overall_avg_score": 85,
  "homework_stats": {
    "total": 10,
    "completed": 7,
    "pending": 3,
    "avg_score": 85
  },
  "subject_performance": [
    {"subject": "Math", "avg_score": 90, "homework_count": 5},
    {"subject": "Physics", "avg_score": 80, "homework_count": 5}
  ],
  "learning_gaps": [
    {"topic": "Fractions", "severity": "medium", "subject": "Math"}
  ],
  "recent_activity": [
    {"type": "submission", "homework": "...", "date": "...", "score": 90}
  ]
}
```

#### Endpoint 4.2: Get Student Submissions
```
GET /teacher/students/{student_id}/submissions
Query params: ?status=all|pending|graded&sort=date|score
Response:
[
  {
    "submission_id": "...",
    "homework_id": "...",
    "homework_title": "Fractions Practice",
    "subject": "Math",
    "submitted_at": "2026-04-01T10:00:00Z",
    "status": "graded",
    "auto_score_pct": 85,
    "final_score_pct": 90,
    "teacher_feedback": "Great work!",
    "file_urls": ["..."],
    "can_download": true
  }
]
```

#### Endpoint 4.3: Send Homework Reminder
```
POST /teacher/homework/{homework_id}/remind
Body: { "student_id": "..." }
Response: { "success": true, "message": "Reminder sent" }
```

### 5. FRONTEND COMPONENT FIXES

#### Fix 5.1: Students.jsx - Parent Button
```javascript
// Current (broken):
<button className="text-gray-400">Parent</button>

// Fixed:
<button
  onClick={() => {
    if (s.parent_id) {
      navigate(`/teacher/communication?parent=${s.parent_id}`);
    } else {
      alert("No parent linked to this student");
    }
  }}
  disabled={!s.parent_id}
  className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
    s.parent_id
      ? "bg-gray-100 text-gray-700 hover:bg-gray-200"
      : "bg-gray-50 text-gray-400 cursor-not-allowed"
  }`}
>
  <span className="material-symbols-outlined text-sm">person</span>
  {s.parent_name ? s.parent_name.split(' ')[0] : 'No Parent'}
</button>
```

#### Fix 5.2: Students.jsx - More Actions Dropdown
```javascript
// Add state
const [openDropdown, setOpenDropdown] = useState(null);

// Add dropdown component
{openDropdown === s.id && (
  <div className="absolute right-0 top-full mt-1 bg-white rounded-lg shadow-lg border border-gray-200 py-2 w-48 z-10">
    <button className="w-full px-4 py-2 text-left text-sm hover:bg-gray-50">
      <span className="material-symbols-outlined text-sm mr-2">person</span>
      View Profile
    </button>
    <button className="w-full px-4 py-2 text-left text-sm hover:bg-gray-50">
      <span className="material-symbols-outlined text-sm mr-2">mail</span>
      Send Message
    </button>
    <button className="w-full px-4 py-2 text-left text-sm hover:bg-gray-50">
      <span className="material-symbols-outlined text-sm mr-2">analytics</span>
      View Learning Gaps
    </button>
    <button className="w-full px-4 py-2 text-left text-sm hover:bg-gray-50">
      <span className="material-symbols-outlined text-sm mr-2">download</span>
      Export Report
    </button>
  </div>
)}
```

#### Fix 5.3: Students.jsx - Homework Button Navigation
```javascript
// Current (wrong):
<button onClick={() => navigate("/teacher/homework")}>

// Fixed:
<button onClick={() => navigate(`/teacher/students/${s.id}`)}>
```

#### Fix 5.4: StudentDetail.jsx - Fetch Student Profile
```javascript
// Add to loadStudentData function:
const profileResp = await api.get(`/teacher/students/${studentId}/profile`);
setStudent(profileResp.data);
```

#### Fix 5.5: StudentDetail.jsx - Submissions Tab
```javascript
// Add state
const [submissions, setSubmissions] = useState([]);

// Add fetch function
const loadSubmissions = async () => {
  const resp = await api.get(`/teacher/students/${studentId}/submissions`);
  setSubmissions(resp.data);
};

// Add to useEffect
useEffect(() => {
  if (activeTab === "submissions") {
    loadSubmissions();
  }
}, [activeTab]);

// Render submissions
{activeTab === "submissions" && (
  <div className="grid gap-4">
    {submissions.map(sub => (
      <SubmissionCard key={sub.submission_id} submission={sub} />
    ))}
  </div>
)}
```

#### Fix 5.6: StudentDetail.jsx - Profile Tab
```javascript
{activeTab === "profile" && student && (
  <div className="grid gap-6">
    {/* Personal Info Card */}
    <div className="bg-white rounded-xl p-6">
      <h3 className="font-bold mb-4">Personal Information</h3>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <p className="text-xs text-gray-500">Name</p>
          <p className="font-medium">{student.name}</p>
        </div>
        <div>
          <p className="text-xs text-gray-500">Roll Number</p>
          <p className="font-medium">{student.roll_no}</p>
        </div>
        <div>
          <p className="text-xs text-gray-500">Class</p>
          <p className="font-medium">{student.class}</p>
        </div>
        <div>
          <p className="text-xs text-gray-500">Attendance</p>
          <p className="font-medium">{student.attendance}%</p>
        </div>
      </div>
    </div>

    {/* Parent Info Card */}
    {student.parent_id && (
      <div className="bg-white rounded-xl p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-bold">Parent Information</h3>
          <button
            onClick={() => navigate(`/teacher/communication?parent=${student.parent_id}`)}
            className="text-sm text-[#695be6] font-semibold hover:underline"
          >
            Contact Parent
          </button>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-xs text-gray-500">Name</p>
            <p className="font-medium">{student.parent_name}</p>
          </div>
          <div>
            <p className="text-xs text-gray-500">Email</p>
            <p className="font-medium">{student.parent_email}</p>
          </div>
        </div>
      </div>
    )}

    {/* Academic Performance Card */}
    <div className="bg-white rounded-xl p-6">
      <h3 className="font-bold mb-4">Academic Performance</h3>
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="text-center">
          <p className="text-2xl font-black text-[#695be6]">{student.overall_avg_score}%</p>
          <p className="text-xs text-gray-500">Overall Average</p>
        </div>
        <div className="text-center">
          <p className="text-2xl font-black text-green-600">{student.homework_stats.completed}/{student.homework_stats.total}</p>
          <p className="text-xs text-gray-500">Homework Completed</p>
        </div>
        <div className="text-center">
          <p className="text-2xl font-black text-amber-600">{student.homework_stats.pending}</p>
          <p className="text-xs text-gray-500">Pending</p>
        </div>
      </div>
      
      {/* Subject Performance */}
      <div className="space-y-3">
        {student.subject_performance?.map(subj => (
          <div key={subj.subject}>
            <div className="flex justify-between text-sm mb-1">
              <span className="font-medium">{subj.subject}</span>
              <span className="text-gray-500">{subj.avg_score}%</span>
            </div>
            <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-[#695be6]"
                style={{ width: `${subj.avg_score}%` }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>

    {/* Learning Gaps Card */}
    {student.learning_gaps?.length > 0 && (
      <div className="bg-white rounded-xl p-6">
        <h3 className="font-bold mb-4">Learning Gaps</h3>
        <div className="space-y-2">
          {student.learning_gaps.map((gap, i) => (
            <div key={i} className="flex items-center gap-3 p-3 bg-red-50 rounded-lg">
              <span className="material-symbols-outlined text-red-500">warning</span>
              <div className="flex-1">
                <p className="font-medium text-sm">{gap.topic}</p>
                <p className="text-xs text-gray-500">{gap.subject}</p>
              </div>
              <span className={`text-xs font-bold px-2 py-1 rounded ${
                gap.severity === 'critical' ? 'bg-red-100 text-red-700' :
                gap.severity === 'high' ? 'bg-orange-100 text-orange-700' :
                'bg-yellow-100 text-yellow-700'
              }`}>
                {gap.severity}
              </span>
            </div>
          ))}
        </div>
      </div>
    )}
  </div>
)}
```

## IMPLEMENTATION PRIORITY

### Phase 1: Critical Fixes (Do First)
1. ✅ Fix Homework button navigation in Students.jsx
2. ✅ Fix Parent button clickability and navigation
3. ✅ Add More Actions dropdown functionality
4. ✅ Create student profile endpoint
5. ✅ Fetch and display actual student name

### Phase 2: Core Features (Do Second)
6. ✅ Implement Submissions tab with data
7. ✅ Implement Profile tab with full student info
8. ✅ Add homework card quick actions dropdown
9. ✅ Verify and fix parent-student matching in seed data

### Phase 3: Enhancements (Do Third)
10. ✅ Add send reminder functionality
11. ✅ Add export report functionality
12. ✅ Add performance charts/graphs
13. ✅ Add recent activity timeline

## TESTING CHECKLIST

- [ ] Parent button is clickable and navigates correctly
- [ ] Parent button shows parent's first name
- [ ] Parent button is disabled when no parent linked
- [ ] More Actions dropdown opens and closes properly
- [ ] Homework button goes to student detail page (not catalog)
- [ ] Student name displays correctly in detail page header
- [ ] Submissions tab shows actual submissions
- [ ] Profile tab shows complete student information
- [ ] All buttons and dropdowns are functional
- [ ] Parent-student relationships are correct in database

## FILES TO MODIFY

### Backend
1. `backend/routers/teacher.py` - Add new endpoints
2. `backend/seed_data.py` or `backend/seed_extended.py` - Fix parent linking

### Frontend
3. `frontend/src/pages/teacher/Students.jsx` - Fix buttons and navigation
4. `frontend/src/pages/teacher/StudentDetail.jsx` - Implement tabs and profile
5. `frontend/src/api.js` - Add new API calls if needed
