// ============================================================
// EVALUATE HOMEWORK DATA
// ============================================================

export const evaluateHomeworkMeta = {
  subject: "Math",
  chapter: "Chapter 5: Linear Equations",
  class: "Class 6A",
  totalStudents: 35,
  submitted: 32,
  submissionPercent: 91,
};

export const submissionStats = [
  { label: "Pending Review",    value: 8,  icon: "pending",        color: "text-yellow-500", bg: "bg-yellow-50",  border: "border-yellow-200" },
  { label: "AI Evaluated",      value: 18, icon: "auto_awesome",   color: "text-green-500",  bg: "bg-green-50",   border: "border-green-200" },
  { label: "Manually Reviewed", value: 6,  icon: "person",         color: "text-blue-500",   bg: "bg-blue-50",    border: "border-blue-200" },
  { label: "Not Submitted",     value: 3,  icon: "warning",        color: "text-gray-400",   bg: "bg-gray-50",    border: "border-gray-200" },
];

export const studentSubmissions = [
  {
    id: "ss1",
    name: "Rahul Kumar",
    rollNo: 15,
    initials: "RK",
    color: "bg-orange-500",
    status: "ai_evaluated",
    score: 35,
    maxScore: 40,
    scorePercent: 87.5,
    expanded: true,
    questions: [
      {
        id: "q1",
        number: 1,
        type: "Multiple Choice",
        text: "Question 1: Multiple Choice",
        marks: 3,
        maxMarks: 3,
        status: "correct",
        studentAnswer: "Student selected: Option (C) x = 5",
        correctAnswer: "Correct Answer: Option (C)",
        aiEvaluating: false,
      },
      {
        id: "q8",
        number: 8,
        type: "Solve",
        text: "Question 8: Solve 2x + 10 = 24",
        marks: 2,
        maxMarks: 3,
        status: "evaluating",
        studentAnswer: null,
        correctAnswer: null,
        hasOcrScan: true,
        aiEvaluating: true,
        aiConfidence: 92,
        aiSuggestedMarks: "2/3",
        aiComment: "You correctly identified the equation but made an error when solving for x in the final step. 2x = 14 was correct, but 14 / 2 was incorrectly calculated as 6.",
        teacherFeedback: "You correctly identified the equation but made an error when solving for x. Remember to double-check simple division!",
      },
    ],
  },
  {
    id: "ss2",
    name: "Ananya Joshi",
    rollNo: 2,
    initials: "AJ",
    color: "bg-purple-500",
    status: "pending_review",
    score: null,
    maxScore: 40,
    scorePercent: null,
    expanded: false,
    questions: [],
  },
  {
    id: "ss3",
    name: "David Miller",
    rollNo: 9,
    initials: "DM",
    color: "bg-blue-500",
    status: "manually_reviewed",
    score: 38,
    maxScore: 40,
    scorePercent: 95,
    expanded: false,
    questions: [],
  },
];

export const STATUS_LABELS = {
  ai_evaluated:      { label: "AI EVALUATED",      color: "bg-green-100 text-green-700" },
  pending_review:    { label: "PENDING REVIEW",     color: "bg-yellow-100 text-yellow-700" },
  manually_reviewed: { label: "MANUALLY REVIEWED",  color: "bg-blue-100 text-blue-700" },
  not_submitted:     { label: "NOT SUBMITTED",       color: "bg-gray-100 text-gray-500" },
};
