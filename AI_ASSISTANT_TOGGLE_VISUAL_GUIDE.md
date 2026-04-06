# AI Assistant Toggle - Visual Guide

## Teacher Interface

### Creating Homework - Assignment Settings Section

```
┌─────────────────────────────────────────────────────────────┐
│  Section 3: Assignment Settings                              │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌────────────────────────────────────────────────────┐    │
│  │  Due Date & Time                                    │    │
│  │  [2025-02-01] [23:59]                              │    │
│  └────────────────────────────────────────────────────┘    │
│                                                              │
│  ┌────────────────────────────────────────────────────┐    │
│  │  Allow Retries                              [✓ ON] │    │
│  │  Let students attempt more than once               │    │
│  └────────────────────────────────────────────────────┘    │
│                                                              │
│  ┌────────────────────────────────────────────────────┐    │
│  │  AI Assistant (Vin)                         [✓ ON] │    │  ← NEW!
│  │  Allow students to use Vin AI for help            │    │
│  └────────────────────────────────────────────────────┘    │
│                                                              │
│  ┌────────────────────────────────────────────────────┐    │
│  │  Resources & Instructions                           │    │
│  │  [Text area for instructions...]                   │    │
│  └────────────────────────────────────────────────────┘    │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

### Toggle States

#### Enabled (Default)
```
┌──────────────────────────────────────────────┐
│  AI Assistant (Vin)              [●─── ON]  │
│  Allow students to use Vin AI for help      │
└──────────────────────────────────────────────┘
```

#### Disabled
```
┌──────────────────────────────────────────────┐
│  AI Assistant (Vin)              [───○ OFF] │
│  Allow students to use Vin AI for help      │
└──────────────────────────────────────────────┘
```

---

## Student Interface

### When AI Assistant is ENABLED

```
┌─────────────────────────────────────────────────────────────┐
│  Header                                                      │
│  [← Back]  [🤖 Ask Vin]  [Save & Exit]  [👤]               │  ← Button visible
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  Question 1 of 5                                            │
│  What is the quadratic formula?                             │
│                                                              │
│  [Multiple Choice] [Typed] [Upload]                         │
│                                                              │
│  [Text Editor Area]                                         │
│                                                              │
└─────────────────────────────────────────────────────────────┘

                    ↓ Click "Ask Vin"

┌─────────────────────────────────────────────────────────────┐
│  Question Area                │  Vin AI Side Panel          │
│                               │  ┌────────────────────┐     │
│  What is the quadratic...     │  │ Vin Avatar    [X]  │     │
│                               │  └────────────────────┘     │
│  [Text Editor]                │                             │
│                               │  Hi! How can I help?        │
│                               │                             │
│                               │  [Chat messages...]         │
│                               │                             │
│                               │  [Type message...] [Send]   │
└─────────────────────────────────────────────────────────────┘
```

### When AI Assistant is DISABLED

```
┌─────────────────────────────────────────────────────────────┐
│  Header                                                      │
│  [← Back]  [Save & Exit]  [👤]                              │  ← No "Ask Vin" button
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  Question 1 of 5                                            │
│  What is the quadratic formula?                             │
│                                                              │
│  [Multiple Choice] [Typed] [Upload]                         │
│                                                              │
│  [Text Editor Area]                                         │
│                                                              │
│                                                              │
│  Student works independently without AI assistance          │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

---

## Decision Flow

### Teacher's Decision Process

```
Creating Homework
       ↓
   What type?
       ↓
  ┌────┴────┬────────────┐
  ↓         ↓            ↓
Practice  Review      Assessment
  ↓         ↓            ↓
AI: ON    AI: ON      AI: OFF
  ↓         ↓            ↓
Students  Students    Students
can get   can get     work
help      help        alone
```

### Student's Experience Flow

```
Open Homework
      ↓
Check Header
      ↓
  ┌───┴───┐
  ↓       ↓
"Ask Vin" No Button
visible?  visible?
  ↓       ↓
  YES     NO
  ↓       ↓
Can use   Must work
AI help   independently
  ↓       ↓
Click     Complete
button    without AI
  ↓       ↓
Side      Submit
panel     answers
opens
  ↓
Get help
  ↓
Submit
answers
```

---

## Use Case Scenarios

### Scenario 1: Practice Assignment

```
Teacher Creates:
┌──────────────────────────────────┐
│ Title: "Practice Problems"       │
│ Type: Online Quiz                │
│ AI Assistant: [✓ ON]             │
└──────────────────────────────────┘

Student Sees:
┌──────────────────────────────────┐
│ [← Back] [🤖 Ask Vin] [Exit] [👤]│
│                                  │
│ Question 1: Solve for x...       │
│                                  │
│ [Can click "Ask Vin" anytime]   │
└──────────────────────────────────┘

Result:
✅ Student learns with AI support
✅ Gets help when stuck
✅ Understands concepts better
```

### Scenario 2: Final Exam

```
Teacher Creates:
┌──────────────────────────────────┐
│ Title: "Final Exam"              │
│ Type: Online Quiz                │
│ AI Assistant: [○ OFF]            │
└──────────────────────────────────┘

Student Sees:
┌──────────────────────────────────┐
│ [← Back] [Exit] [👤]             │
│                                  │
│ Question 1: Solve for x...       │
│                                  │
│ [No AI button - work alone]     │
└──────────────────────────────────┘

Result:
✅ Student demonstrates own knowledge
✅ Fair assessment
✅ No external help
```

### Scenario 3: Mixed Approach

```
Week 1: Practice
┌──────────────────────────────────┐
│ "Practice Set 1"                 │
│ AI: [✓ ON]  → Students learn     │
└──────────────────────────────────┘

Week 2: Quiz
┌──────────────────────────────────┐
│ "Weekly Quiz"                    │
│ AI: [○ OFF] → Students assessed  │
└──────────────────────────────────┘

Week 3: Review
┌──────────────────────────────────┐
│ "Review Problems"                │
│ AI: [✓ ON]  → Students review    │
└──────────────────────────────────┘

Week 4: Exam
┌──────────────────────────────────┐
│ "Final Exam"                     │
│ AI: [○ OFF] → Final assessment   │
└──────────────────────────────────┘
```

---

## Mobile View

### Teacher Mobile (Creating Homework)

```
┌──────────────────────┐
│ Assignment Settings  │
├──────────────────────┤
│                      │
│ Due Date & Time      │
│ [2025-02-01] [23:59] │
│                      │
│ ┌──────────────────┐ │
│ │ Allow Retries    │ │
│ │          [✓ ON]  │ │
│ └──────────────────┘ │
│                      │
│ ┌──────────────────┐ │
│ │ AI Assistant     │ │  ← NEW!
│ │ (Vin)    [✓ ON]  │ │
│ └──────────────────┘ │
│                      │
│ Instructions         │
│ [Text area...]       │
│                      │
└──────────────────────┘
```

### Student Mobile (With AI)

```
┌──────────────────────┐
│ [←] [🤖] [Exit] [👤] │  ← Compact header
├──────────────────────┤
│                      │
│ Question 1 of 5      │
│                      │
│ What is the          │
│ quadratic formula?   │
│                      │
│ [MCQ][Type][Upload]  │
│                      │
│ [Answer area...]     │
│                      │
└──────────────────────┘
```

### Student Mobile (Without AI)

```
┌──────────────────────┐
│ [←] [Exit] [👤]      │  ← No AI button
├──────────────────────┤
│                      │
│ Question 1 of 5      │
│                      │
│ What is the          │
│ quadratic formula?   │
│                      │
│ [MCQ][Type][Upload]  │
│                      │
│ [Answer area...]     │
│                      │
└──────────────────────┘
```

---

## Data Flow Diagram

```
Teacher Creates Homework
         ↓
    Set Toggle
         ↓
    ┌────┴────┐
    ↓         ↓
  ON (✓)    OFF (○)
    ↓         ↓
    └────┬────┘
         ↓
  POST /homework/create
  {
    "ai_assistant_enabled": true/false
  }
         ↓
    Save to DB
    {
      "_id": "...",
      "ai_assistant_enabled": true/false
    }
         ↓
    Assign to Students
         ↓
    ─────────────────────
         ↓
Student Opens Homework
         ↓
  GET /homework/{id}
         ↓
  Receive Data
  {
    "ai_assistant_enabled": true/false
  }
         ↓
    Check Value
         ↓
    ┌────┴────┐
    ↓         ↓
  true      false
    ↓         ↓
  Show      Hide
  Button    Button
    ↓         ↓
  Student   Student
  can use   works
  AI help   alone
```

---

## Before & After Comparison

### Before (No Control)

```
Teacher:
- Creates homework
- No AI control
- All students get AI help always

Student:
- Always sees "Ask Vin" button
- Can always get help
- No way to disable for exams
```

### After (With Control)

```
Teacher:
- Creates homework
- ✅ Controls AI access per assignment
- ✅ Can enable for practice
- ✅ Can disable for exams

Student:
- Sees "Ask Vin" when allowed
- Gets help when learning
- Works independently when assessed
- Clear expectations
```

---

## Quick Reference

### Teacher Checklist

Creating Practice Assignment:
- [ ] Fill homework details
- [ ] Keep AI Assistant toggle ON ✓
- [ ] Assign to students
- [ ] Students can get help

Creating Assessment:
- [ ] Fill homework details
- [ ] Turn AI Assistant toggle OFF ○
- [ ] Assign to students
- [ ] Students work independently

### Student Experience

With AI Enabled:
- ✅ "Ask Vin" button visible
- ✅ Can open side panel
- ✅ Can chat with AI
- ✅ Get help anytime

With AI Disabled:
- ❌ No "Ask Vin" button
- ❌ Cannot open side panel
- ❌ No AI assistance
- ✅ Work independently

---

## Summary

### What Changed
- ✅ Added toggle in teacher UI
- ✅ Stored setting in database
- ✅ Conditional button in student UI
- ✅ Conditional panel rendering

### Benefits
- 🎯 Teacher control
- 📚 Flexible learning modes
- 📝 Fair assessments
- 👥 Clear expectations

### Impact
- Teachers: More control
- Students: Clear guidance
- System: More flexible
- Learning: Better outcomes
