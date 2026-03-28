// ============================================================
// TEACHER DATA MODELS — separated by feature
// ============================================================

// --- SCHEDULE ---
export const teacherSchedule = [
  { id: "sc1", class: "Grade 8A", subject: "Math", topic: "Introduction to Algebra", time: "08:00 AM", endTime: "09:00 AM", room: "Room 12", status: "upcoming", lessonPlanId: "lp1", presentationUrl: "https://drive.google.com/presentation" },
  { id: "sc2", class: "Grade 8B", subject: "Science", topic: "Newton's Laws", time: "11:30 AM", endTime: "12:30 PM", room: "Room 8", status: "upcoming", lessonPlanId: "lp2", presentationUrl: null },
  { id: "sc3", class: "Grade 9A", subject: "Math", topic: "Quadratic Equations", time: "02:00 PM", endTime: "03:00 PM", room: "Room 12", status: "upcoming", lessonPlanId: "lp3", presentationUrl: null },
];

// --- HOMEWORK LIBRARY ---
export const homeworkLibrary = [
  {
    id: "hl1",
    subject: "Math",
    subjectColor: "blue",
    tags: ["MATH", "TEMPLATE"],
    title: "Linear Equations - Practice",
    chapter: "Ch 5: Linear Equations in One Variable",
    questions: 8,
    marks: 40,
    estimatedMinutes: 45,
    type: "Online Quiz",
    status: "template",
    starred: true,
    usedCount: null,
    class: "Class 6",
  },
  {
    id: "hl2",
    subject: "Physics",
    subjectColor: "green",
    tags: ["PHYSICS", "ASSIGNED"],
    title: "Laws of Motion - Quiz",
    chapter: "Ch 3: Dynamics & Forces",
    questions: 12,
    marks: null,
    estimatedMinutes: null,
    type: "Online Quiz",
    status: "assigned",
    starred: false,
    usedCount: 5,
    class: "Class 6",
  },
  {
    id: "hl3",
    subject: "Chemistry",
    subjectColor: "orange",
    tags: ["CHEMISTRY", "DRAFT"],
    title: "Organic Compounds Intro",
    chapter: "Ch 2: Carbon Chemistry",
    questions: 5,
    marks: null,
    estimatedMinutes: null,
    type: "Offline Worksheet",
    status: "draft",
    starred: false,
    usedCount: null,
    class: "Class 7",
  },
  {
    id: "hl4",
    subject: "Math",
    subjectColor: "blue",
    tags: ["MATH", "TEMPLATE"],
    title: "Probability Theory Basics",
    chapter: "Ch 12: Statistics & Probability",
    questions: 15,
    marks: 60,
    estimatedMinutes: null,
    type: "Online Quiz",
    status: "template",
    starred: false,
    usedCount: null,
    class: "Class 6",
  },
  {
    id: "hl5",
    subject: "Physics",
    subjectColor: "green",
    tags: ["PHYSICS", "ASSIGNED"],
    title: "Optics - Light Reflection",
    chapter: "Ch 10: Light & Reflection",
    questions: 10,
    marks: 30,
    estimatedMinutes: null,
    type: "Online Quiz",
    status: "assigned",
    starred: true,
    usedCount: null,
    class: "Class 6",
  },
];

// --- INTERVENTION ALERTS ---
export const interventionAlerts = {
  stats: {
    studentsAtRisk: 15,
    repeatOffenders: 6,
    parentContactNeeded: 8,
    actionsPending: 22,
  },
  urgent: [
    {
      id: "ia1",
      priority: "urgent",
      studentName: "Arjun T.",
      studentId: "48821",
      avatar: null,
      tags: ["MULTIPLE TRIGGERS", "NEW"],
      performanceDrop: 28,
      previousScore: 75,
      currentScore: 47,
      scoreHistory: [75, 70, 65, 58, 47],
      issues: [
        "Missed 4 consecutive homework assignments",
        "Attendance dropped below 85% this month",
      ],
      status: "New",
      privateNotes: "",
    },
  ],
  important: [
    {
      id: "ia2",
      priority: "important",
      studentName: "Sarah L.",
      studentId: "48822",
      avatar: null,
      tags: [],
      message: "Important Alert: Quiz score outlier (62% vs avg 94%)",
      timeAgo: "2 hours ago",
      status: "New",
    },
  ],
  routine: [
    {
      id: "ia3",
      priority: "routine",
      studentName: "Liam M.",
      studentId: "48823",
      avatar: null,
      tags: [],
      message: "Routine Check-in: Positive trend in assignment completion",
      timeAgo: "5 hours ago",
      status: "New",
    },
  ],
};

// --- AI TEACHING ASSISTANT ---
export const aiAssistantTools = [
  { id: "worksheet",    icon: "edit_document",   label: "Worksheet Generator",          description: "Create practice worksheets with AI",          color: "purple" },
  { id: "lessonplan",  icon: "menu_book",        label: "Lesson Plan Creator",          description: "Generate structured lesson plans",            color: "blue" },
  { id: "explainer",   icon: "lightbulb",        label: "Concept Explainer",            description: "Age-appropriate explanations",                color: "yellow" },
  { id: "presentation",icon: "present_to_all",   label: "Presentation Creator",         description: "Generate PowerPoint decks",                   color: "orange" },
  { id: "quiz",        icon: "quiz",             label: "Question & Quiz Creator",      description: "Generate items and quizzes",                  color: "green" },
  { id: "grading",     icon: "grading",          label: "Grading Assistant",            description: "AI-powered subjective grading",               color: "purple" },
];

export const aiAssistantHistory = [
  { id: "ah1", tool: "Worksheet Generator",  date: "Oct 24, 2023", status: "completed" },
  { id: "ah2", tool: "Lesson Plan Creator",  date: "Oct 23, 2023", status: "draft" },
  { id: "ah3", tool: "Quiz Generator",       date: "Oct 22, 2023", status: "completed" },
];

// --- QUICK ACTIONS ---
export const quickActionTypes = [
  { id: "reminder",   icon: "notifications",  label: "Homework Reminders",    subtitle: "12 students pending",        color: "orange",  borderColor: "border-orange-400" },
  { id: "appreciate", icon: "star",           label: "Send Appreciation",     subtitle: "8 students improved this week", color: "green", borderColor: "border-green-400" },
  { id: "practice",  icon: "menu_book",       label: "Assign Extra Practice", subtitle: "15 students need gap practice", color: "blue",  borderColor: "border-blue-400" },
  { id: "meeting",   icon: "groups",          label: "Request Parent Meetings", subtitle: "3 students flagged",        color: "purple", borderColor: "border-purple-400" },
];

export const reminderStudents = [
  { id: "rs1", name: "Alex Johnson",    status: "OVERDUE BY 2 DAYS", selected: true,  avatar: null },
  { id: "rs2", name: "Sarah Miller",   status: "NOT VIEWED",         selected: false, avatar: null },
  { id: "rs3", name: "Jamie Chen",     status: "OVERDUE BY 1 DAY",   selected: true,  avatar: null },
  { id: "rs4", name: "Elena Rodriguez",status: "NOT VIEWED",         selected: false, avatar: null },
];

// --- TOPIC MASTERY HEATMAP ---
export const masteryTopics = [
  "Linear Equations", "Quadratic Equ.", "Fractions", "Decimals", "Ratios",
  "Percentages", "Trigonometry", "Probability", "Calculus Basic", "Vectors",
  "Stat Tools", "Integration",
];

export const masteryStudents = [
  {
    id: "ms1", name: "Rahul Kumar", avatar: null, avg: 38,
    scores: [12, 45, 32, 60, 42, 21, 8, 55, 65, 48, 71, 15],
  },
  {
    id: "ms2", name: "Priya Singh", avatar: null, avg: 88,
    scores: [88, 92, 95, 78, 85, 90, 82, 89, 75, 93, 96, 84],
  },
  {
    id: "ms3", name: "Arjun Das", avatar: null, avg: 54,
    scores: [42, 15, 55, 22, 68, 49, 72, 81, 33, 58, 75, 88],
  },
  {
    id: "ms4", name: "Sana Khan", avatar: null, avg: 77,
    scores: [72, 68, 81, 89, 76, 91, 55, 84, 73, 88, 69, 74],
  },
];

// --- DASHBOARD STATS ---
export const dashboardStats = {
  homeworkToEvaluate: { count: 12, change: "+12% from yesterday", graded: 8, total: 20 },
  studentsWithGaps: { count: 24, alert: true, message: "Requires immediate intervention" },
  classesToday: { count: 4, nextSession: "Class 6A @ 10:00 AM" },
  parentReplies: { count: 2, newMessages: 1 },
};

export const recentActivity = [
  { id: "ra1", type: "submission", icon: "check_circle", color: "green",  text: "Rahul Kumar submitted Linear Equations HW",  sub: "Grade 8B • Today, 8:45 AM",  timeAgo: "5m ago" },
  { id: "ra2", type: "message",    icon: "chat",         color: "blue",   text: 'Mrs. Verma (Parent) replied to "Math Fair"',  sub: "Grade 6A • Today, 8:12 AM",  timeAgo: "38m ago" },
  { id: "ra3", type: "alert",      icon: "warning",      color: "orange", text: "System Alert: Submission deadline passed",    sub: "Algebra Quiz • 22 pending reviews", timeAgo: "1h ago" },
];

export const interventionStudents = [
  { id: "is1", name: "Arjun Tiwari", initials: "AT", color: "purple", priority: "High Priority", issue: "3 missed homework" },
  { id: "is2", name: "Sana Roy",     initials: "SR", color: "orange", priority: "Medium",        issue: "Mastery dropping: Fractions" },
];

export const classPerformanceTopics = [
  { topic: "Linear Equations",    mastery: 65, progress: 20, critical: 15 },
  { topic: "Polynomials",         mastery: 55, progress: 25, critical: 20 },
  { topic: "Coordinate Geometry", mastery: 70, progress: 18, critical: 12 },
];

export const recentSubmissions = [
  { id: "sub1", name: "Rahul K.",  initials: "RK", color: "orange", title: "Algebra Worksheet (Pt. 2)", status: "Needs Review",   timeAgo: "2m ago",  autoGraded: false },
  { id: "sub2", name: "Sarah M.",  initials: "SM", color: "pink",   title: "Quick Quiz 4.1",            status: "Auto-graded: 85%", timeAgo: "15m ago", autoGraded: true },
  { id: "sub3", name: "Liam O.",   initials: "LO", color: "blue",   title: "Algebra Worksheet (Pt. 2)", status: "Needs Review",   timeAgo: "45m ago", autoGraded: false },
];
