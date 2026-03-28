// ============================================================
// SCHOOL ADMIN MOCK DATA
// ============================================================

export const performanceMatrix = {
  subjects: ["Math", "Physics", "Chemistry", "Biology", "English", "Social Science"],
  grades: [
    { grade: "Grade 10", scores: [92, 78, 81, 65, 79, 88], students: [124, 124, 124, 124, 124, 124] },
    { grade: "Grade 9",  scores: [76, 58, 64, 72, 85, 61], students: [118, 118, 118, 118, 118, 118] },
    { grade: "Grade 8",  scores: [54, 42, 51, 67, 75, 56], students: [110, 110, 110, 110, 110, 110] },
    { grade: "Grade 7",  scores: [68, 55, 48, 53, 69, 72], students: [105, 105, 105, 105, 105, 105] },
    { grade: "Grade 6",  scores: [41, 34, 44, 52, 58, 63], students: [98, 98, 98, 98, 98, 98] },
  ],
  bestCluster: { label: "Grade 10 - Math", score: 92 },
  priorityIntervention: { label: "Grade 6 - Physics", score: 34 },
  aiInsights: {
    growthTrends: [
      { subject: "Social Science", grades: "Grades 7 & 10", change: "+12%" },
      { subject: "English", grades: "Grade 9", change: "+8%" },
    ],
    priorityActions: [
      { title: "Physics Intervention", desc: "Grade 6 scores are 22% below target.", action: "Draft Plan" },
      { title: "Chemistry Review", desc: "Grade 7 high deviation detected.", action: "Item Analysis" },
    ],
  },
};

export const classComparisonData = {
  bestPerformance: { section: "Grade 6-A", teacher: "Sarah Jenkins", students: 28, score: 89, vsAvg: "+2.4%" },
  mostImproved: { section: "Grade 6-D", growth: "+12%" },
  rankings: [
    { rank: 1, section: "Section 6-A", teacher: "Sarah Jenkins", students: 28, perf: 89, comp: 96, engage: 92, overall: 91.4 },
    { rank: 2, section: "Section 6-C", teacher: "Michael Chen", students: 30, perf: 84, comp: 91, engage: 88, overall: 87.2 },
    { rank: 3, section: "Section 6-F", teacher: "Elena Rodriguez", students: 26, perf: 81, comp: 89, engage: 82, overall: 84.0 },
  ],
  bestPractices: [
    { title: "Consistent Homework Submission", desc: "Top classes maintain a 95%+ submission rate within 24 hours of assignment.", impact: "+15% IMPACT ON GRADE" },
    { title: "Early Intervention Forums", desc: "Teachers host 15-min optional review sessions for students below 70%.", impact: "+8% RETENTION" },
    { title: "Gamified Assessment", desc: "Use of competitive quizzes (Kahoot/Blooket) increases engagement scores by 2x.", impact: "+22% ENGAGEMENT" },
  ],
};

export const curriculumData = {
  overallCompletion: 68,
  forecastDate: "March 15, 2024",
  onTrack: 14,
  atRisk: 4,
  behind: 2,
  subjects: [
    { code: "SCI-101", name: "Biology", unit: "Unit 4: Genetics", planned: 85, taught: 72, status: "ON TRACK", topicsLeft: 3, daysAvailable: 8 },
    { code: "MAT-204", name: "Calculus II", unit: "Unit 6: Integrals", planned: 60, taught: 45, status: "AT RISK", topicsLeft: 9, daysAvailable: 5 },
    { code: "PHY-301", name: "Grade 9 Physics", unit: "Unit 3: Thermodynamics", planned: 55, taught: 25, status: "BEHIND", topicsLeft: 14, daysAvailable: 12 },
  ],
  insights: [
    { type: "critical", title: "Critical Delay", desc: "Grade 9 Physics is behind by 3 weeks. Current pacing suggests it will not finish by Term end." },
    { type: "warning", title: "Velocity Alert", desc: "Chemistry syllabus deceleration detected in Grade 10-B." },
    { type: "success", title: "High Performance", desc: "English Literature has completed Unit 5 ahead of schedule." },
  ],
};

export const weakTopicsData = {
  years: [2020, 2021, 2022, 2023, 2024, 2025],
  activeYears: [2020, 2021, 2022, 2023, 2024],
  persistentTopics: 23,
  studentsImpacted: 1847,
  critical4Plus: 8,
  topics: [
    { years: 5, name: "Linear Equations & Inequalities", subject: "Mathematics", grade: "8-10", studentsAffected: 412, struggleScore: 8.2, struggle2020: 42, struggle2024: 78 },
    { years: 3, name: "Inference from Complex Texts", subject: "Language Arts", grade: "6-9", studentsAffected: 289, struggleScore: 6.4, struggle2020: 15, struggle2024: 34 },
    { years: 4, name: "Fractional Representations", subject: "Mathematics", grade: "4-6", studentsAffected: 512, struggleScore: 7.1, struggle2020: 30, struggle2024: 62 },
  ],
  rootCauses: [
    { title: "Inadequate Prerequisite Coverage", desc: "Systemic data suggests gaps in Grade 5-7 foundations directly impacting secondary performance in 62% of critical topics." },
    { title: "Curriculum Misalignment", desc: "The jump in rigor between Grade 8 and 9 Math lacks adequate scaffolding for algebraic concepts." },
    { title: "Post-Assessment Drift", desc: "Low retention scores 4 months post-assessment across all persistent topics indicate shallow initial learning." },
  ],
  strategicInterventions: [
    "Implement \"Spiral Review\" sessions for Grade 8 Algebra units.",
    "Cross-department teacher workshops on prerequisite bridging.",
    "Introduce micro-assessments every 3 weeks for high-severity topics.",
  ],
};

export const teacherEngagementData = {
  avgEngagement: 76,
  activeTeachers: 48,
  supportOpps: 8,
  teachers: [
    { name: "Sarah Jenkins", subject: "Mathematics", grade: "Grade 10", score: 82, hw: 94, aiUse: "High", intrv: 12, status: "excellent" },
    { name: "Marcus Thorne", subject: "Physics", grade: "Grade 11", score: 54, hw: 42, aiUse: "Low", intrv: 2, status: "opportunity" },
    { name: "Elena Rodriguez", subject: "Literature", grade: "Grade 9", score: 68, hw: 78, aiUse: "Med", intrv: 6, status: "steady" },
  ],
  suggestedPD: [
    { type: "STRATEGY", duration: "15 min read", title: "Integrating AI in Lesson Plans", desc: "Suggested for: Marcus Thorne, Elena Rodriguez" },
    { type: "WORKSHOP", duration: "45 min video", title: "Effective Student Interventions", desc: "Based on low intervention scores in Grade 11", rating: "4.9/5" },
    { type: "RESOURCE", duration: "Downloadable", title: "Homework Engagement Kit", desc: "Improve completion rates by up to 25%", fileInfo: "PDF • 2.4 MB" },
  ],
};

export const gapHeatmapData = {
  activeGaps: 127,
  studentsAffected: 342,
  studentsAffectedPct: 75,
  studentsAffectedChange: "+12% FROM LAST MONTH",
  criticalTopics: 18,
  improvementRate: 23,
  subjects: ["Mathematics", "Science", "English", "History"],
  topics: ["Algebraic Thinking", "Geometry & Shapes", "Data Interpretation"],
  grades: ["Grade 5", "Grade 6", "Grade 7", "Grade 8", "Grade 9", "Grade 10"],
  matrix: [
    { topic: "Algebraic Thinking",    scores: [72, 48, 12, 28, 64, 42], counts: [180, 120, 30, 70, 160, 105] },
    { topic: "Geometry & Shapes",     scores: [33, 61, 55, 8,  15, 88], counts: [82, 152, 135, 20, 38, 220] },
    { topic: "Data Interpretation",   scores: [19, 5,  25, 44, 67, 11], counts: [47, 12, 62, 110, 168, 27] },
  ],
  priorityActions: [
    { priority: "CRITICAL IMPACT", topic: "Algebra", title: "Schedule remedial class for Grade 5 Algebraic Thinking", desc: "72% of students are struggling with basic variable equations.", action: "SCHEDULE NOW" },
    { priority: "HIGH PRIORITY", topic: "Fractions", title: "Distribute practice material for Grade 9 Geometry", desc: "Sudden 15% drop in performance detected last week.", action: "SEND MATERIALS" },
    { priority: "STAFFING INSIGHT", topic: "Resource Sync", title: "Re-assign teaching assistant to Grade 10", desc: "Grade 10 Calculus gap has exceeded 80% threshold.", action: "REVIEW STAFFING" },
  ],
};
