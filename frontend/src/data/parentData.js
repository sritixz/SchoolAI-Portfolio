// ============================================================
// PARENT DASHBOARD MOCK DATA
// ============================================================

export const parentDashboardData = {
  parent: { name: "Priya", avatar: null },
  child: {
    name: "Aarav Sharma",
    grade: "8-A",
    avatar: "https://lh3.googleusercontent.com/aida-public/AB6AXuBjn_KzyG9Q4RzZ1WUzq-TuxGVq89imj91LIhE12t3m8IPGjPUxMBCGuKh94IvTt7E5yyjOUiXmMbFFnJgcqYfeLSD_hF8PSxTd0Gmr51A8q6yhv4NTg_WzdPXclnWbZWjSOti-IDCPuGBBDqtfThbEYDdM23NcOYTV4GaUojABLFatQcxWXOvlo-qe5a4HYOFntZ6UzvOiZBimSW61UIgq6nOFfCOrAA-KWIoVSsno6bz4eUutbl6ubKkh1EPLHjRQ3aDR8SuFiQY4",
  },
  quickStats: {
    homeworkDone: { value: "8/10", label: "HOMEWORK DONE", sub: "This Week" },
    consistency: { value: "85%", label: "CONSISTENCY", sub: "+5%", trend: "up" },
    alerts: { value: 2, label: "ALERTS", sub: "Needs Attention" },
  },
  insight: {
    text: "Aarav performs best in morning study sessions. He completes tasks 20% faster before 10 AM compared to evening sessions.",
  },
};

export const homeworkOverviewData = {
  child: { name: "Aarav Sharma", grade: "Grade 8-A", dateRange: "Dec 9-15" },
  stats: {
    completed: { count: 8, pct: 80 },
    inProgress: { count: 1, pct: 10 },
    pending: { count: 1, pct: 10 },
    overdue: { count: 0, pct: 0 },
  },
  consistency: { submitted: 8, total: 10, punctuality: 80, trend: "+2 from last week" },
  subjects: [
    { name: "Mathematics", count: 3, status: "66% On Track", pct: 66, color: "#695be6", dots: ["green", "green", "yellow"] },
    { name: "Physics", count: 2, status: "100% Completed", pct: 100, color: "#22c55e", dots: ["green", "green"] },
    { name: "Chemistry", count: 2, status: "50% Pending", pct: 50, color: "#695be6", dots: ["green", "red"] },
    { name: "Biology", count: 3, status: "100% On Track", pct: 100, color: "#22c55e", dots: ["green", "green", "green"] },
  ],
};

export const consistencyData = {
  score: 85,
  trend: "+5%",
  percentile: "Top 15%",
  target: "90%",
  peakActivity: "Most active on weekdays between 6:00 PM - 8:00 PM",
  engagement: {
    timeSpent: "4.5 hrs/wk",
    doubtsAsked: 18,
    testsTaken: 12,
  },
  streaks: {
    current: 5,
    best: 12,
    thisWeek: "5/7",
  },
  calendar: {
    month: "December 2024",
    days: [
      { date: 1, status: "completed" },
      { date: 2, status: "completed" },
      { date: 3, status: "partial" },
      { date: 4, status: "completed" },
      { date: 5, status: "missed" },
      { date: 6, status: "completed" },
      { date: 7, status: "completed" },
      { date: 8, status: "completed" },
    ],
  },
  aiInsight: "Aarav is showing great progress this month! He's completed more homework on time than 85% of his peers.",
};

export const topicProgressData = {
  overall: { proficient: 28, developing: 12, needsPractice: 5, criticalGap: 3, total: 48, pct: 60 },
  topics: [
    { name: "Trigonometry", score: 35, subject: "Mathematics", concepts: "3 concepts identified as blockers", status: "Critical Gap", statusColor: "red", recommendation: 'Review "Sine & Cosine Rules" before next quiz.' },
    { name: "Quadratic Equations", score: 75, subject: "Mathematics", concepts: "5 concepts mastered", status: "Proficient", statusColor: "green", recommendation: null },
    { name: "Newtonian Mechanics", score: 58, subject: "Physics", concepts: "3 concepts covered (Physics)", status: "Developing", statusColor: "yellow", recommendation: null },
    { name: "Atomic Structure", score: 42, subject: "Chemistry", concepts: "1 concept needing review (Chemistry)", status: "Needs Practice", statusColor: "orange", recommendation: null },
  ],
};

export const notificationsData = [
  { id: "n1", type: "homework_new", title: "New Homework Assigned", desc: "Math: Algebra II - Chapter 5 Exercises", tag: "MATHEMATICS", tagColor: "indigo", time: "2 hours ago", read: false, action: null },
  { id: "n2", type: "homework_due", title: "Homework Due Soon", desc: "Physics: Quantum Mechanics Principles Lab Report", tag: "DUE TOMORROW", tag2: "PHYSICS", tagColor: "orange", time: "5 hours ago", read: false, action: "View Details" },
  { id: "n3", type: "achievement", title: "Achievement Unlocked! 🎉", desc: "Leo completed 20 homework assignments in a row!", sub: "Keep up the great work, Leo!", tagColor: "green", time: "Today", read: false, action: null },
  { id: "n4", type: "overdue", title: "HOMEWORK OVERDUE", desc: "Physics: Thermodynamics Worksheet", tag: "PHYSICS", tagColor: "red", time: "1 day ago", read: true, action: "Contact Teacher" },
];

export const supportAlertsData = [
  {
    id: "a1", severity: "urgent", label: "URGENT PATTERN", detected: "Detected over last 2 weeks",
    title: "Multiple Critical Learning Gaps",
    points: ["3 homework assignments missed", "Math performance dropped 25%", "4 critical gaps identified in Algebra"],
    insight: { label: "SUPPORTIVE INSIGHT", text: '"Aarav might be struggling with foundational concepts in functions. Targeted review could prevent further frustration."' },
    resolved: false,
  },
  {
    id: "a2", severity: "attention", label: "ATTENTION REQUIRED", detected: "Detected over last 5 days",
    title: "Engagement Decrease Detected",
    points: ["Time spent on reading apps down 40%", "Participation in group forum dropped", "2 late log-ins to digital sessions"],
    insight: { label: "FOCUS INSIGHT", text: '"A decrease in digital engagement often follows a change in external routine. Is there a shift in his study environment?"' },
    resolved: false,
  },
  {
    id: "a3", severity: "resolved", label: "RESOLVED",
    title: "Homework Consistency Pattern Resolved",
    sub: "Resolved on Oct 12, 2023 • 100% submission rate maintained for 3 weeks",
    resolved: true,
  },
];

export const growthPortfolioData = {
  child: { name: "Aarav Sharma", year: "Academic Year 2024-2025" },
  stats: { achievements: 24, homework: 156, growth: "+18%" },
  entries: [
    {
      id: "e1", type: "parent_reflection", date: "Oct 24, 2024",
      title: "Resilience in Practice",
      text: '"Aarav showed great resilience during his piano practice today. Even though he struggled with the complex chords, he didn\'t give up and practiced for an extra 15 minutes until he got it right. Proud of his perseverance!"',
    },
    {
      id: "e2", type: "milestone", date: "Oct 20, 2024",
      tags: ["MATH", "ACADEMIC"],
      title: "Completed 20 Homework Assignments!",
      text: "Aarav has reached a significant milestone in consistency. He hasn't missed a single Math homework submission in the last month, maintaining an average grade of A-.",
    },
    {
      id: "e3", type: "teacher_note", date: "Oct 18, 2024",
      teacher: "Mrs. Sharma", role: "CLASS TEACHER",
      title: "Kindness Award",
      text: '"I was so pleased to see Aarav helping a classmate who was struggling with their science project today. His patience and ability to explain complex ideas to his peers is truly commendable. Keep up the wonderful spirit!"',
    },
  ],
  summary: { assignmentCompletion: 94, charDevPoints: 820, charDevTotal: 1000 },
};

export const curiosityPromptsData = {
  conversations: [
    { id: "c1", text: '"What\'s the most interesting thing plants do?"', time: "3 min", tag: "Critical Thinking" },
    { id: "c2", text: '"If you could be a plant, where would you grow?"', time: "5 min", tag: "Imagination" },
  ],
  realWorld: [
    { id: "r1", type: "OBSERVATION", title: "Notice the leaves changing color", desc: 'As you walk, look for trees changing colors. Ask: "What happens to the chlorophyll in the fall?"' },
    { id: "r2", type: "KITCHEN SCIENCE", title: "The Grocery Store Garden", desc: "Identify which vegetables are roots, stems, or leaves. How do they store energy from the sun?" },
  ],
  activity: {
    title: "Grow a Bean Plant Together",
    time: "15 min", difficulty: "Easy", items: 3,
    image: "https://images.unsplash.com/photo-1416879595882-3373a0480b5b?w=400&q=80",
  },
};

export const learningProfileData = {
  preferredTime: "Morning",
  environment: ["Quiet space", "Music"],
  learningStyle: "auditory",
  focusDuration: 20,
  strengths: "",
  challenges: "",
  strategies: "",
  emotional: "",
  subjects: ["Mathematics", "Science", "Fine Arts"],
  hobbies: "",
};
