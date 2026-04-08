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
  board: "CBSE",
  chapter: "",
  learningObjective: "Concept Understanding",
  difficultyStructure: "Medium",
  specialInstructions: "",
};

export const difficultyOptions = ["Easy", "Medium", "Hard", "Mixed"];

export const worksheetQuestionTypes = [
  { id: "mcq",         label: "MCQ" },
  { id: "shortAnswer", label: "Short Answer" },
  { id: "longAnswer",  label: "Long Answer" },
  { id: "matching",    label: "Matching" },
];

export const boardOptions = ["CBSE", "ICSE", "State Board", "IB", "Cambridge"];

export const learningObjectiveOptions = [
  { id: "Concept Understanding", label: "Concept Understanding", desc: "Basic recall and comprehension" },
  { id: "Application",           label: "Application",           desc: "Apply concepts to problems" },
  { id: "Problem Solving",       label: "Problem Solving",       desc: "Multi-step reasoning" },
  { id: "HOTS",                  label: "HOTS",                  desc: "Higher Order Thinking Skills" },
];

export const difficultyStructureOptions = [
  { id: "Easy",   label: "Easy",   desc: "Basic concept (1-step)" },
  { id: "Medium", label: "Medium", desc: "Application (2–3 steps)" },
  { id: "Hard",   label: "Hard",   desc: "Case-based / multi-step" },
  { id: "Mixed",  label: "Mixed",  desc: "Balanced across levels" },
];
