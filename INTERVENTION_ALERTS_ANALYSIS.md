# Intervention Alerts Analysis & Implementation Plan

## Current State Analysis

### How Interventions Are Created

Based on my analysis of the codebase, here's how interventions currently work:

#### 1. **Backend Storage & Generation** (`backend/routers/teacher.py`)

**Database Collection:** `db.interventions`

**Intervention Structure:**
```python
{
    "_id": ObjectId or "auto-{student_id}",
    "teacher_id": str,
    "student_id": str,
    "student_name": str,
    "priority": "urgent" | "important" | "routine",
    "message": str,
    "issue": str,
    "resolved": bool,
    "status": "New" | "In Progress" | "Resolved",
    "snoozed": bool,
    "snoozed_at": ISO datetime,
    "reviewed_at": ISO datetime,
    "private_note": str,
    "note_updated_at": ISO datetime,
    "updated_at": ISO datetime
}
```

**Current Logic (Line 506-547):**
- Endpoint: `GET /teacher/interventions`
- First checks if stored interventions exist in `db.interventions`
- If none exist, **auto-generates** from learning gaps:
  - Finds all students in teacher's assigned sections
  - Checks for critical learning gaps (`severity: "critical"`, `resolved: False`)
  - Creates intervention alerts for students with critical gaps
  - Returns auto-generated list (not persisted)

#### 2. **Learning Gaps Creation**

**Current State:** Learning gaps are only created during seeding (`seed_extended.py`)

**Missing:** No automatic learning gap creation during:
- AI grading analysis
- Teacher grading
- Homework submission analysis
- Performance tracking

#### 3. **Frontend Display** (`frontend/src/pages/teacher/Home.jsx`)

**Current Issues:**
- Uses mock data from `interventionStudents` as fallback
- Shows only 4 interventions (`.slice(0, 4)`)
- "View All" link goes to `/teacher/interventions` but doesn't pass data
- Recent Activity section uses submission data, not intervention-specific activity

#### 4. **Intervention Alerts Page** (`frontend/src/pages/teacher/InterventionAlerts.jsx`)

**Current Issues:**
- Uses hardcoded mock data from `interventionAlerts` object
- API data from Redux (`apiAlerts`) is fetched but only used for stats count
- All alert details, priority tabs, and student information are from mock data
- CRUD operations (snooze, review, notes) call API but display doesn't reflect backend data

---

## Problems Identified

### 1. **Data Flow Disconnect**
- Backend generates interventions from learning gaps
- Frontend displays hardcoded mock data
- API is called but data is ignored

### 2. **No Automatic Intervention Creation**
- Interventions are only auto-generated from existing learning gaps
- No learning gaps are created during homework grading
- No intervention triggers during AI analysis

### 3. **Missing AI Integration**
- AI grader (`ai_grader.py`) analyzes submissions and identifies:
  - `weakness_areas`
  - `error_patterns`
  - `estimated_score_pct`
- This data is NOT used to create learning gaps or interventions

### 4. **Recent Activity Confusion**
- "Recent Activity" shows homework submissions
- Should show intervention-related activities (created, updated, resolved)

---

## Proposed Solution

### Phase 1: Connect Existing Data (Quick Win)

#### A. Fix Teacher Home Page
**File:** `frontend/src/pages/teacher/Home.jsx`

**Changes:**
1. Use `apiInterventions` data instead of mock fallback
2. Show all interventions with proper mapping
3. Fix "View All" to navigate with proper state

#### B. Fix Intervention Alerts Page
**File:** `frontend/src/pages/teacher/InterventionAlerts.jsx`

**Changes:**
1. Replace all mock data with API data
2. Map API interventions to priority tabs based on `priority` field
3. Display real student information
4. Show actual intervention details from backend

#### C. Add Recent Activity Endpoint
**File:** `backend/routers/teacher.py`

**New Endpoint:**
```python
@router.get("/intervention-activity")
async def intervention_activity(user=Depends(require_role("teacher")), db=Depends(get_db)):
    """Recent intervention-related activities"""
    # Get recent interventions created/updated
    # Get recent status changes
    # Get recent notes added
    # Return chronological activity feed
```

---

### Phase 2: Automatic Intervention Creation (Core Feature)

#### A. Create Learning Gaps During AI Grading
**File:** `backend/services/ai_grader.py`

**Enhancement:**
```python
async def analyse_submission(homework: dict, submission: dict, db) -> dict:
    # ... existing analysis ...
    
    # NEW: Create learning gaps from weakness areas
    if analysis.get("weakness_areas"):
        for topic in analysis["weakness_areas"]:
            await create_learning_gap(
                db=db,
                student_id=submission["student_id"],
                subject=homework["subject"],
                topic=topic,
                severity=determine_severity(analysis["estimated_score_pct"]),
                source="ai_grading"
            )
```

#### B. Create Interventions from Learning Gaps
**File:** `backend/routers/homework.py`

**Enhancement in `_run_analysis` function:**
```python
async def _run_analysis(db, sub, hw):
    analysis = await analyse_submission(hw or {}, sub, db)
    
    # Save analysis
    await db.homework_submissions.update_one(...)
    
    # NEW: Check if intervention needed
    if analysis.get("estimated_score_pct", 100) < 50:
        await create_intervention_alert(
            db=db,
            student_id=sub["student_id"],
            teacher_id=hw["created_by"],
            priority="urgent" if analysis["estimated_score_pct"] < 40 else "important",
            message=f"Low score on {hw['title']}: {analysis['estimated_score_pct']}%",
            issue=", ".join(analysis.get("weakness_areas", []))
        )
```

#### C. Helper Functions
**File:** `backend/services/interventions.py` (NEW)

```python
async def create_learning_gap(db, student_id, subject, topic, severity, source):
    """Create or update learning gap"""
    existing = await db.learning_gaps.find_one({
        "student_id": student_id,
        "subject": subject,
        "topic": topic,
        "resolved": False
    })
    
    if existing:
        # Update severity if worse
        if severity_level(severity) > severity_level(existing["severity"]):
            await db.learning_gaps.update_one(
                {"_id": existing["_id"]},
                {"$set": {"severity": severity, "updated_at": datetime.utcnow().isoformat()}}
            )
    else:
        # Create new gap
        await db.learning_gaps.insert_one({
            "id": str(ObjectId()),
            "student_id": student_id,
            "subject": subject,
            "topic": topic,
            "severity": severity,
            "source": source,
            "recommended_time": calculate_time(severity),
            "resolved": False,
            "created_at": datetime.utcnow().isoformat()
        })

async def create_intervention_alert(db, student_id, teacher_id, priority, message, issue):
    """Create intervention alert"""
    # Get student info
    student = await db.users.find_one({"_id": ObjectId(student_id)})
    
    # Check for existing unresolved intervention
    existing = await db.interventions.find_one({
        "student_id": student_id,
        "teacher_id": teacher_id,
        "resolved": False
    })
    
    if existing:
        # Update existing
        await db.interventions.update_one(
            {"_id": existing["_id"]},
            {"$set": {
                "priority": priority,
                "message": message,
                "issue": issue,
                "updated_at": datetime.utcnow().isoformat()
            }}
        )
    else:
        # Create new
        await db.interventions.insert_one({
            "teacher_id": teacher_id,
            "student_id": student_id,
            "student_name": student.get("name", "Student"),
            "priority": priority,
            "message": message,
            "issue": issue,
            "resolved": False,
            "status": "New",
            "created_at": datetime.utcnow().isoformat()
        })
```

---

### Phase 3: Enhanced Features

#### A. Intervention Analytics
- Track intervention resolution time
- Measure effectiveness (did student improve?)
- Parent contact tracking

#### B. Automated Triggers
- Multiple missed assignments → auto-intervention
- Score drop > 20% → auto-intervention
- Attendance drop → auto-intervention

#### C. Parent Notifications
- Auto-notify parents when intervention created
- Send progress updates
- Request meeting integration

---

## Implementation Priority

### 🔴 HIGH PRIORITY (Do First)
1. Fix frontend to use API data instead of mock data
2. Add intervention activity endpoint
3. Connect Recent Activity to real data

### 🟡 MEDIUM PRIORITY (Phase 2)
4. Create learning gaps during AI grading
5. Auto-create interventions from low scores
6. Add intervention helper service

### 🟢 LOW PRIORITY (Future Enhancement)
7. Advanced analytics
8. Automated triggers
9. Parent notification integration

---

## Files to Modify

### Frontend
- ✅ `frontend/src/pages/teacher/Home.jsx` - Use API data
- ✅ `frontend/src/pages/teacher/InterventionAlerts.jsx` - Replace mock data
- ✅ `frontend/src/store/slices/teacherSlice.js` - Add activity fetch

### Backend
- ✅ `backend/routers/teacher.py` - Add activity endpoint
- ✅ `backend/routers/homework.py` - Add intervention creation
- ✅ `backend/services/ai_grader.py` - Add learning gap creation
- ✅ `backend/services/interventions.py` - NEW helper service

---

## Testing Plan

### 1. Manual Testing
- Submit homework with low score
- Verify learning gap created
- Verify intervention alert created
- Check frontend displays correctly

### 2. API Testing
```bash
# Test intervention fetch
curl -H "Authorization: Bearer $TOKEN" http://localhost:8000/teacher/interventions

# Test activity feed
curl -H "Authorization: Bearer $TOKEN" http://localhost:8000/teacher/intervention-activity
```

### 3. Integration Testing
- Complete homework flow: create → assign → submit → grade → intervention
- Verify data flows from AI grader → learning gaps → interventions → frontend

---

## Success Criteria

✅ Intervention Alerts page shows real backend data
✅ Recent Activity shows intervention-related events
✅ Low homework scores automatically create interventions
✅ AI analysis creates learning gaps
✅ "View All" navigation works correctly
✅ CRUD operations (snooze, review, notes) reflect in UI
✅ No mock data used in production views

