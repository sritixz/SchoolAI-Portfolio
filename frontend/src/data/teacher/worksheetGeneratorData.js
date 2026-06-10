// ============================================================
// WORKSHEET GENERATOR DATA
// ============================================================

// Grade-specific defaults for personalization
export const gradePresets = {
  "Grade 6": {
    totalQuestions: 8,
    difficulty: "Easy",
    difficultyStructure: "Easy",
    learningObjective: "Concept Understanding",
    questionTypes: { mcq: true, shortAnswer: true, longAnswer: false, matching: true },
    hint: "Simple vocabulary, real-life examples, single-step questions",
  },
  "Grade 7": {
    totalQuestions: 10,
    difficulty: "Easy",
    difficultyStructure: "Easy",
    learningObjective: "Concept Understanding",
    questionTypes: { mcq: true, shortAnswer: true, longAnswer: false, matching: true },
    hint: "Mix of concrete and semi-abstract, 1-2 step problems",
  },
  "Grade 8": {
    totalQuestions: 10,
    difficulty: "Medium",
    difficultyStructure: "Medium",
    learningObjective: "Application",
    questionTypes: { mcq: true, shortAnswer: true, longAnswer: true, matching: false },
    hint: "Application-based, multi-step problems, daily-life connections",
  },
  "Grade 9": {
    totalQuestions: 12,
    difficulty: "Medium",
    difficultyStructure: "Mixed",
    learningObjective: "Problem Solving",
    questionTypes: { mcq: true, shortAnswer: true, longAnswer: true, matching: false },
    hint: "Analytical thinking, prove/derive questions, case-based",
  },
  "Grade 10": {
    totalQuestions: 15,
    difficulty: "Hard",
    difficultyStructure: "Mixed",
    learningObjective: "HOTS",
    questionTypes: { mcq: true, shortAnswer: true, longAnswer: true, matching: false },
    hint: "Board-exam level, HOTS questions, competency-based",
  },
};

export const worksheetDefaults = {
  subject: "Math",
  classLevel: "Grade 8",
  topic: "",
  title: "",
  difficulty: "Medium",
  totalQuestions: 10,
  questionTypes: { mcq: true, shortAnswer: true, longAnswer: true, matching: false },
  board: "CBSE",
  chapter: "",
  learningObjective: "Application",
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
