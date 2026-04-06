# Homework Flow Diagrams

## 1. Vin AI Side Panel Flow

```
┌─────────────────────────────────────────────────────────────┐
│                    Homework Attempt Page                     │
│                                                              │
│  ┌────────────────────────────────────────────────────┐    │
│  │  Header: [← Back] [Ask Vin] [Save & Exit] [👤]    │    │
│  └────────────────────────────────────────────────────┘    │
│                                                              │
│  ┌────────────────────────────────────────────────────┐    │
│  │  Question 1 of 5                                    │    │
│  │  What is the quadratic formula?                     │    │
│  │                                                      │    │
│  │  [Multiple Choice] [Typed] [Upload]                │    │
│  │                                                      │    │
│  │  [Text Editor Area]                                 │    │
│  └────────────────────────────────────────────────────┘    │
│                                                              │
│  [← Previous]                    [Submit Answer →]          │
└─────────────────────────────────────────────────────────────┘

                    ↓ Click "Ask Vin"

┌─────────────────────────────────────────────────────────────┐
│                    Homework Attempt Page                     │
│                                                              │
│  ┌────────────────────────────────┐  ┌──────────────────┐  │
│  │  Question 1 of 5               │  │  Vin AI Panel    │  │
│  │  What is the quadratic...      │  │  ┌────────────┐  │  │
│  │                                 │  │  │ Vin Avatar │  │  │
│  │  [Multiple Choice] [Typed]     │  │  └────────────┘  │  │
│  │                                 │  │                  │  │
│  │  [Text Editor Area]            │  │  Hi! How can I   │  │
│  │                                 │  │  help you?       │  │
│  │                                 │  │                  │  │
│  │                                 │  │  [Chat Area]     │  │
│  │                                 │  │                  │  │
│  │                                 │  │  [Input Box]     │  │
│  │                                 │  │  [Send Button]   │  │
│  └────────────────────────────────┘  └──────────────────┘  │
│                                                              │
│  [← Previous]      [Submit Answer →]                        │
└─────────────────────────────────────────────────────────────┘
```

---

## 2. Text Editor Toolbar Flow

```
Before (Non-functional):
┌────────────────────────────────────────────────────────┐
│  [B] [I] [Σ Equation Editor]        [↶] [↷]           │
│  ↑    ↑    ↑                          ↑   ↑            │
│  No   No   No                         No  No           │
│  action                               action           │
└────────────────────────────────────────────────────────┘
│                                                         │
│  Type your answer here...                              │
│                                                         │
└────────────────────────────────────────────────────────┘

After (Fully Functional):
┌────────────────────────────────────────────────────────┐
│  [B] [I] [Σ Equation Editor]        [↶] [↷]           │
│  ↓    ↓    ↓                          ↓   ↓            │
│  Bold Italic Insert                   Undo Redo        │
│  **   *      Equation                                  │
└────────────────────────────────────────────────────────┘
│                                                         │
│  The **quadratic formula** is *important*              │
│  x = (-b ± √(b²-4ac)) / 2a                            │
│                                                         │
└────────────────────────────────────────────────────────┘

User Actions:
1. Type "quadratic formula"
2. Select "quadratic formula"
3. Click [B] → **quadratic formula**
4. Type "is"
5. Type "important"
6. Select "important"
7. Click [I] → *important*
8. Click [Σ] → Prompt opens
9. Enter "x = (-b ± √(b²-4ac)) / 2a"
10. Equation inserted
```

---

## 3. File Upload Flow

```
Initial State:
┌─────────────────────────────────────────────────────────┐
│                                                          │
│              📷        📁                                │
│                                                          │
│     Click to take a photo or upload a scan              │
│                                                          │
│     Drag & drop your files here or browse               │
│                                                          │
│     [📷 Take Photo]  [📁 Browse Files]                  │
│                                                          │
│     Accepted: JPG, PNG, PDF · Max 20MB                  │
│                                                          │
└─────────────────────────────────────────────────────────┘

                    ↓ User selects file

Uploading State:
┌─────────────────────────────────────────────────────────┐
│                                                          │
│     ┌──────────────────────────────────────────────┐   │
│     │  [⟳]  homework_scan.jpg                      │   │
│     │       245.3 KB · Uploading...                │   │
│     └──────────────────────────────────────────────┘   │
│                                                          │
└─────────────────────────────────────────────────────────┘

                    ↓ Upload complete

Success State:
┌─────────────────────────────────────────────────────────┐
│                                                          │
│     ┌──────────────────────────────────────────────┐   │
│     │  [✓]  homework_scan.jpg              [🗑]   │   │
│     │       245.3 KB · Uploaded ✓                  │   │
│     └──────────────────────────────────────────────┘   │
│                                                          │
│     [Submit Homework →]                                 │
│                                                          │
└─────────────────────────────────────────────────────────┘
```

---

## 4. Homework Submission Type Decision Tree

```
Teacher Creates Homework
         |
         ↓
    Choose Type
         |
    ┌────┴────┬────────────┐
    ↓         ↓            ↓
Online Quiz  File Upload  Handwritten
    |         |            |
    ↓         ↓            ↓
Can Add:   Can Add:     Can Add:
✅ MCQ     ❌ MCQ       ❌ MCQ
✅ Typed   ❌ Typed     ❌ Typed
❌ File    ✅ File      ✅ File
    |         |            |
    ↓         ↓            ↓
Student:   Student:     Student:
Answer     Upload       Take Photo
Questions  Document     or Scan
    |         |            |
    ↓         ↓            ↓
Auto-grade Teacher      Teacher
MCQs       Reviews      Reviews
    |         |            |
    ↓         ↓            ↓
Teacher    Teacher      Teacher
Reviews    Grades       Grades
Typed
    |         |            |
    ↓         ↓            ↓
Final      Final        Final
Grade      Grade        Grade
```

---

## 5. Backend Validation Flow

```
Teacher Creates Homework
         |
         ↓
POST /homework/create
         |
         ↓
    Validation
         |
    ┌────┴────┐
    ↓         ↓
submission_type?
    |
    ├─ online_quiz
    │    ↓
    │  Check questions
    │    ↓
    │  MCQ/Typed? → ✅ Allow
    │  File only? → ✅ Allow
    │
    ├─ file_upload
    │    ↓
    │  Check questions
    │    ↓
    │  MCQ/Typed? → ❌ Reject (400 Error)
    │  File only? → ✅ Allow
    │  Empty?     → ✅ Allow
    │
    └─ handwritten
         ↓
       Check questions
         ↓
       MCQ/Typed? → ❌ Reject (400 Error)
       File only? → ✅ Allow
       Empty?     → ✅ Allow

Error Response:
{
  "detail": "Homework with submission_type 'file_upload' 
             cannot have MCQ or typed questions. 
             Use 'online_quiz' for interactive questions."
}
```

---

## 6. Student Submission Flow

```
Student Opens Homework
         |
         ↓
    Check Type
         |
    ┌────┴────┬────────────┐
    ↓         ↓            ↓
Online Quiz  File Upload  Handwritten
    |         |            |
    ↓         ↓            ↓
Question-by- Single File  Camera +
Question UI  Upload UI    Upload UI
    |         |            |
    ↓         ↓            ↓
Answer Each  Select File  Take Photo
Question     or Browse    or Browse
    |         |            |
    ↓         ↓            ↓
Can Use      Upload to    Upload to
"Ask Vin"    S3           S3
    |         |            |
    ↓         ↓            ↓
Submit       Get URL      Get URL
Answers      |            |
Array        ↓            ↓
    |      Submit URL   Submit URL
    ↓         |            |
    └─────────┴────────────┘
              ↓
    POST /homework/submit
              ↓
         Store in DB
              ↓
    ┌─────────┴─────────┐
    ↓                   ↓
Auto-grade MCQs    Queue AI Analysis
    ↓                   ↓
Calculate Score    Analyze Typed/File
    ↓                   ↓
    └─────────┬─────────┘
              ↓
       Navigate to
       Results Page
```

---

## 7. Component Architecture

```
HomeworkAttempt.jsx
    │
    ├─ State Management
    │   ├─ currentIdx (question index)
    │   ├─ answers (student responses)
    │   ├─ activeType (answer type per question)
    │   ├─ vinPanelOpen (side panel state)
    │   └─ vinContext (question context)
    │
    ├─ Components
    │   ├─ MCQInput
    │   │   └─ Radio buttons with options
    │   │
    │   ├─ TypedInput
    │   │   ├─ Toolbar
    │   │   │   ├─ Bold button
    │   │   │   ├─ Italic button
    │   │   │   ├─ Equation editor
    │   │   │   ├─ Undo button
    │   │   │   └─ Redo button
    │   │   └─ Textarea
    │   │
    │   ├─ UploadInput
    │   │   ├─ Camera button
    │   │   ├─ Browse button
    │   │   ├─ Drag & drop zone
    │   │   └─ File preview
    │   │
    │   └─ VinSidePanel
    │       ├─ Header (with close)
    │       ├─ Chat area
    │       │   ├─ Message list
    │       │   └─ Streaming renderer
    │       └─ Input footer
    │
    └─ Actions
        ├─ sendMessage (to Vin)
        ├─ handleFileUpload
        ├─ handleNext (question)
        └─ handleSubmit (homework)
```

---

## 8. Data Flow

```
Frontend                Backend              Database
   │                       │                    │
   │  POST /homework/      │                    │
   │  create               │                    │
   ├──────────────────────→│                    │
   │                       │  Validate          │
   │                       │  submission_type   │
   │                       │  + questions       │
   │                       │                    │
   │                       │  Insert            │
   │                       ├───────────────────→│
   │                       │                    │
   │  ← homework_id        │                    │
   │←──────────────────────┤                    │
   │                       │                    │
   │  POST /homework/      │                    │
   │  upload-file          │                    │
   ├──────────────────────→│                    │
   │                       │  Upload to S3      │
   │                       │  ↓                 │
   │                       │  Get URL           │
   │  ← file_url           │                    │
   │←──────────────────────┤                    │
   │                       │                    │
   │  POST /homework/      │                    │
   │  submit               │                    │
   ├──────────────────────→│                    │
   │                       │  Auto-grade MCQs   │
   │                       │  ↓                 │
   │                       │  Queue AI analysis │
   │                       │  ↓                 │
   │                       │  Insert submission │
   │                       ├───────────────────→│
   │                       │                    │
   │  ← submission_id      │                    │
   │  ← auto_score_pct     │                    │
   │←──────────────────────┤                    │
   │                       │                    │
   │  Navigate to          │                    │
   │  results page         │                    │
   │                       │                    │
```

---

## 9. Error Handling Flow

```
User Action
    ↓
Try Operation
    ↓
Success? ──Yes──→ Continue
    │
    No
    ↓
Catch Error
    ↓
Error Type?
    │
    ├─ Network Error
    │   ↓
    │  Show: "Connection failed. Please check your internet."
    │   ↓
    │  Retry button
    │
    ├─ Validation Error (400)
    │   ↓
    │  Show: Error message from backend
    │   ↓
    │  Highlight invalid fields
    │
    ├─ Auth Error (401)
    │   ↓
    │  Redirect to login
    │
    ├─ File Too Large
    │   ↓
    │  Show: "File exceeds 20MB limit"
    │   ↓
    │  Clear file, allow retry
    │
    └─ Unknown Error
        ↓
       Show: "Something went wrong. Please try again."
        ↓
       Log to console
        ↓
       Retry button
```

---

## 10. Mobile Responsive Layout

```
Desktop (> 1024px):
┌─────────────────────────────────────────────────────────┐
│  Header: [← Back] [Ask Vin] [Save & Exit] [👤]         │
├─────────────────────────────────────────────────────────┤
│                                                          │
│  ┌────────────────────────────────────────────────┐    │
│  │  Question 1 of 5                                │    │
│  │  What is the quadratic formula?                 │    │
│  │                                                  │    │
│  │  [Multiple Choice] [Typed] [Upload]            │    │
│  │                                                  │    │
│  │  [Large Text Editor Area]                       │    │
│  │                                                  │    │
│  └────────────────────────────────────────────────┘    │
│                                                          │
│  [← Previous]                    [Submit Answer →]      │
└─────────────────────────────────────────────────────────┘

Mobile (< 768px):
┌──────────────────────────┐
│  [←] [Ask Vin] [👤]      │
├──────────────────────────┤
│                          │
│  Question 1 of 5         │
│  What is the quadratic   │
│  formula?                │
│                          │
│  [MCQ] [Typed] [Upload]  │
│  (Scrollable tabs)       │
│                          │
│  [Text Editor]           │
│  (Full width)            │
│                          │
│                          │
│  [← Prev] [Submit →]     │
│  (Stacked on small)      │
└──────────────────────────┘
```

---

These diagrams show the complete flow of the homework system with all the fixes applied!
