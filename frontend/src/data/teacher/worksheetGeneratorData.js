// ============================================================
// WORKSHEET GENERATOR DATA
// ============================================================

export const worksheetDefaults = {
  subject: "Math",
  classLevel: "Grade 8",
  topic: "Linear Equations",
  title: "Linear Equations Practice Sheet",
  difficulty: "Medium",
  totalQuestions: 10,
  questionTypes: { mcq: true, shortAnswer: true, longAnswer: true, matching: false },
};

export const difficultyOptions = ["Easy", "Medium", "Hard", "Mixed"];

export const worksheetQuestionTypes = [
  { id: "mcq",         label: "MCQ" },
  { id: "shortAnswer", label: "Short Answer" },
  { id: "longAnswer",  label: "Long Answer" },
  { id: "matching",    label: "Matching" },
];
