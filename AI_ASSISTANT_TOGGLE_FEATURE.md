# AI Assistant Toggle Feature

## Overview

Teachers can now control whether students have access to Vin AI assistant for each homework assignment. This gives teachers flexibility to:
- Enable AI help for practice assignments
- Disable AI help for assessments/exams
- Control when students can get assistance

## Feature Details

### For Teachers

#### Creating New Homework
When creating homework, teachers will see a new toggle:

```
┌─────────────────────────────────────────────────┐
│  Assignment Settings                             │
│                                                  │
│  ┌──────────────────────────────────────────┐  │
│  │  Allow Retries                      [✓]  │  │
│  │  Let students attempt more than once     │  │
│  └──────────────────────────────────────────┘  │
│                                                  │
│  ┌──────────────────────────────────────────┐  │
│  │  AI Assistant (Vin)                 [✓]  │  │
│  │  Allow students to use Vin AI for help  │  │
│  └──────────────────────────────────────────┘  │
│                                                  │
└─────────────────────────────────────────────────┘
```

**Default:** Enabled (checked)

**Location:** Section 3: Assignment Settings in CreateHomework page

#### Editing Existing Homework
Teachers can update the AI assistant setting using the backend API:

```javascript
PUT /homework/{homework_id}
{
  "ai_assistant_enabled": false,
  // ... other fields
}
```

### For Students

#### When AI Assistant is Enabled
Students will see the "Ask Vin" button in the homework header:

```
┌─────────────────────────────────────────────────┐
│  [← Back]  [Ask Vin]  [Save & Exit]  [👤]      │
└─────────────────────────────────────────────────┘
```

Clicking "Ask Vin" opens the side panel with full AI assistance.

#### When AI Assistant is Disabled
The "Ask Vin" button is hidden:

```
┌─────────────────────────────────────────────────┐
│  [← Back]  [Save & Exit]  [👤]                  │
└─────────────────────────────────────────────────┘
```

Students work independently without AI help.

---

## Implementation Details

### Database Schema

Added field to homework collection:

```javascript
{
  // ... existing fields
  "ai_assistant_enabled": true,  // boolean, default: true
  // ... other fields
}
```

### Backend Changes

#### 1. Model Update (`backend/models/homework.py`)
```python
class HomeworkCreate(BaseModel):
    # ... existing fields
    ai_assistant_enabled: bool = True  # New field
```

#### 2. Create Endpoint (`backend/routers/homework.py`)
```python
@router.post("/create")
async def create_homework(body: HomeworkCreate, ...):
    doc = body.dict()
    doc["ai_assistant_enabled"] = body.ai_assistant_enabled
    # ... rest of logic
```

#### 3. Update Endpoint (`backend/routers/homework.py`)
```python
@router.put("/{homework_id}")
async def update_homework(homework_id: str, body: HomeworkCreate, ...):
    update = {
        # ... existing fields
        "ai_assistant_enabled": body.ai_assistant_enabled,
    }
    # ... rest of logic
```

### Frontend Changes

#### 1. Teacher UI (`frontend/src/pages/teacher/CreateHomework.jsx`)

**State:**
```javascript
const [aiAssistantEnabled, setAiAssistantEnabled] = useState(true);
```

**Toggle Component:**
```jsx
<div className="flex items-center justify-between p-4 border rounded-xl">
  <div className="flex flex-col">
    <span className="font-bold text-sm">AI Assistant (Vin)</span>
    <span className="text-xs text-gray-500">
      Allow students to use Vin AI for help
    </span>
  </div>
  <label className="relative inline-flex items-center cursor-pointer">
    <input
      checked={aiAssistantEnabled}
      onChange={() => setAiAssistantEnabled(!aiAssistantEnabled)}
      className="sr-only peer"
      type="checkbox"
    />
    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#932ce2]"></div>
  </label>
</div>
```

#### 2. Student UI (`frontend/src/pages/student/HomeworkAttempt.jsx`)

**State:**
```javascript
const [aiAssistantEnabled, setAiAssistantEnabled] = useState(true);
```

**Load from Homework:**
```javascript
useEffect(() => {
  if (!currentHw) return;
  if (currentHw.ai_assistant_enabled !== undefined) {
    setAiAssistantEnabled(currentHw.ai_assistant_enabled);
  }
  // ... rest of logic
}, [currentHw]);
```

**Conditional Rendering:**
```jsx
{aiAssistantEnabled && (
  <button onClick={() => openVinPanel(...)}>
    <span className="material-symbols-outlined">smart_toy</span>
    Ask Vin
  </button>
)}
```

**Conditional Panel:**
```jsx
{aiAssistantEnabled && (
  <VinSidePanel 
    isOpen={vinPanelOpen} 
    onClose={() => setVinPanelOpen(false)}
    context={vinContext}
  />
)}
```

---

## Use Cases

### Use Case 1: Practice Assignment (AI Enabled)
**Scenario:** Teacher assigns practice problems for learning

**Teacher Action:**
1. Create homework
2. Keep "AI Assistant (Vin)" toggle ON (default)
3. Assign to students

**Student Experience:**
1. Open homework
2. See "Ask Vin" button
3. Can get help anytime
4. Learn with AI assistance

### Use Case 2: Assessment/Exam (AI Disabled)
**Scenario:** Teacher creates a test to evaluate student knowledge

**Teacher Action:**
1. Create homework
2. Turn OFF "AI Assistant (Vin)" toggle
3. Assign to students

**Student Experience:**
1. Open homework
2. No "Ask Vin" button visible
3. Work independently
4. Demonstrate own knowledge

### Use Case 3: Mixed Approach
**Scenario:** Teacher wants AI help for some assignments but not others

**Teacher Action:**
1. Create practice homework → AI ON
2. Create quiz homework → AI OFF
3. Create review homework → AI ON
4. Create final exam → AI OFF

**Student Experience:**
- Gets help when learning
- Works independently when being assessed
- Clear expectations per assignment

---

## Testing

### Manual Testing

#### Test 1: Create Homework with AI Enabled
```
1. Go to Create Homework page
2. Fill in homework details
3. Verify "AI Assistant (Vin)" toggle is ON by default
4. Create homework
5. As student, open homework
6. Verify "Ask Vin" button is visible
7. Click "Ask Vin"
8. Verify side panel opens
✅ Pass
```

#### Test 2: Create Homework with AI Disabled
```
1. Go to Create Homework page
2. Fill in homework details
3. Turn OFF "AI Assistant (Vin)" toggle
4. Create homework
5. As student, open homework
6. Verify "Ask Vin" button is NOT visible
7. Verify side panel cannot be opened
✅ Pass
```

#### Test 3: Update Homework AI Setting
```
1. Create homework with AI enabled
2. Use PUT /homework/{id} endpoint
3. Set "ai_assistant_enabled": false
4. As student, open homework
5. Verify "Ask Vin" button is NOT visible
✅ Pass
```

### Automated Testing

Updated test file: `backend/test_homework_submission_flow.py`

**Test Cases:**
1. Create online quiz with AI enabled
2. Create file upload with AI disabled
3. Verify field is stored in database
4. Verify field is returned in API responses

**Run Tests:**
```bash
cd backend
python test_homework_submission_flow.py
```

---

## API Examples

### Create Homework with AI Enabled
```bash
POST /homework/create
Authorization: Bearer {teacher_token}

{
  "subject": "Mathematics",
  "title": "Practice Problems",
  "description": "Solve these problems with AI help",
  "assigned_to_class": "10A",
  "assigned_students": [],
  "due_date": "2025-02-01T23:59:59",
  "submission_type": "online_quiz",
  "difficulty_level": "medium",
  "estimated_duration_minutes": 30,
  "ai_assistant_enabled": true,  // ← AI help allowed
  "questions": [...],
  "tags": ["practice"],
  "total_marks": 10
}
```

### Create Homework with AI Disabled
```bash
POST /homework/create
Authorization: Bearer {teacher_token}

{
  "subject": "Mathematics",
  "title": "Final Exam",
  "description": "Complete independently",
  "assigned_to_class": "10A",
  "assigned_students": [],
  "due_date": "2025-02-15T23:59:59",
  "submission_type": "online_quiz",
  "difficulty_level": "high",
  "estimated_duration_minutes": 60,
  "ai_assistant_enabled": false,  // ← No AI help
  "questions": [...],
  "tags": ["exam"],
  "total_marks": 50
}
```

### Update AI Setting
```bash
PUT /homework/{homework_id}
Authorization: Bearer {teacher_token}

{
  "ai_assistant_enabled": false,
  // ... other fields (all required)
}
```

### Get Homework (Student View)
```bash
GET /homework/{homework_id}
Authorization: Bearer {student_token}

Response:
{
  "_id": "...",
  "title": "Practice Problems",
  "ai_assistant_enabled": true,  // ← Student checks this
  // ... other fields
}
```

---

## Migration Guide

### For Existing Homework

Existing homework in the database won't have the `ai_assistant_enabled` field. The system handles this gracefully:

**Backend:** Defaults to `true` if field is missing
**Frontend:** Defaults to `true` if field is undefined

**Optional Migration Script:**
```javascript
// Add field to all existing homework
db.homework.updateMany(
  { ai_assistant_enabled: { $exists: false } },
  { $set: { ai_assistant_enabled: true } }
)
```

---

## Security Considerations

### Client-Side Enforcement
- Button visibility controlled by React state
- Side panel rendering conditional

### Server-Side Enforcement (Future Enhancement)
Consider adding server-side checks:

```python
@router.post("/vin-ai/chat")
async def vin_chat(homework_id: str, ...):
    hw = await db.homework.find_one({"_id": ObjectId(homework_id)})
    if not hw.get("ai_assistant_enabled", True):
        raise HTTPException(403, "AI assistant not allowed for this homework")
    # ... proceed with chat
```

---

## UI/UX Considerations

### Visual Feedback
- Toggle uses standard iOS-style switch
- Clear label: "AI Assistant (Vin)"
- Helpful description: "Allow students to use Vin AI for help"
- Default state: Enabled (most common use case)

### Student Experience
- No error message when AI is disabled
- Button simply not visible
- Clean, uncluttered interface
- No confusion about why AI isn't available

### Teacher Experience
- Easy to find in Assignment Settings
- Clear on/off state
- Consistent with other toggles (Allow Retries)
- No additional steps required

---

## Future Enhancements

### 1. Bulk Edit
Allow teachers to enable/disable AI for multiple homework at once:
```
Select multiple homework → Actions → Enable/Disable AI Assistant
```

### 2. Class-Level Default
Set default AI assistant setting per class:
```
Class Settings → Default AI Assistant: [ON/OFF]
```

### 3. Time-Based Control
Enable AI for first attempt, disable for retries:
```
AI Assistant: [Enabled for first attempt only]
```

### 4. Usage Analytics
Track AI assistant usage:
```
- How many students used AI help
- Average questions asked
- Most common topics
- Correlation with scores
```

### 5. Partial Restrictions
Allow AI for some questions but not others:
```
Question 1: AI Allowed ✓
Question 2: AI Allowed ✓
Question 3: AI Blocked ✗ (Assessment question)
```

---

## Troubleshooting

### Issue: Toggle not saving
**Check:**
1. Browser console for errors
2. Network tab for API call
3. Backend logs for validation errors

**Fix:**
- Ensure all required fields are provided
- Check authentication token
- Verify field name matches model

### Issue: Button still visible when disabled
**Check:**
1. Homework data in Redux store
2. `ai_assistant_enabled` field value
3. Component state

**Fix:**
- Clear browser cache
- Refresh homework data
- Check conditional rendering logic

### Issue: Existing homework shows button
**Expected Behavior:**
- Existing homework defaults to AI enabled
- This is intentional for backward compatibility

**To Disable:**
- Edit homework via API
- Set `ai_assistant_enabled: false`

---

## Documentation Updates

### Updated Files
1. `AI_ASSISTANT_TOGGLE_FEATURE.md` (this file)
2. `backend/models/homework.py`
3. `backend/routers/homework.py`
4. `frontend/src/pages/teacher/CreateHomework.jsx`
5. `frontend/src/pages/student/HomeworkAttempt.jsx`
6. `backend/test_homework_submission_flow.py`

### Related Documentation
- `HOMEWORK_FLOW_FIXES.md` - Main homework flow documentation
- `IMPLEMENTATION_SUMMARY.md` - Architecture overview
- `QUICK_START_GUIDE.md` - Testing guide

---

## Summary

✅ **Implemented:**
- Database field for AI assistant toggle
- Backend create/update endpoints
- Teacher UI toggle in CreateHomework
- Student conditional rendering
- Test coverage
- Documentation

✅ **Benefits:**
- Teacher control over AI assistance
- Flexible learning vs assessment modes
- Clean student experience
- Backward compatible
- Easy to use

✅ **Ready for:**
- Production deployment
- User testing
- Feedback collection
- Future enhancements
