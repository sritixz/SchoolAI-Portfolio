// ============================================================
// CREATE NEW TEST DATA
// ============================================================

export const testCreationSteps = ["Test Details", "Question Selection", "Settings", "Review"];

export const testChapters = [
  {
    id: "ch5",
    title: "Chapter 5: Linear Equations",
    selected: true,
    partial: false,
    subtopics: [
      { id: "st1", title: "5.1 Graphing Linear Equations", selected: true },
      { id: "st2", title: "5.2 Solving by Substitution",   selected: true },
    ],
  },
  {
    id: "ch6",
    title: "Chapter 6: Quadratic Equations",
    selected: false,
    partial: true,
    subtopics: [
      { id: "st3", title: "6.1 Factoring",                 selected: false },
      { id: "st4", title: "6.2 Quadratic Formula",         selected: false },
    ],
  },
];

export const testDefaults = {
  name: "Mid-Term Math Assessment",
  subject: "Math",
  classLevel: "Grade 8A",
  mode: "ai",           // ai | manual
  totalQuestions: 25,
  difficulty: { easy: 30, medium: 50, hard: 20 },
  questionTypes: { mcq: 15, shortAnswer: 10, numerical: 0 },
};

export const qualityChecks = [
  { label: "No repeated questions",        pass: true },
  { label: "Topic coverage balanced",      pass: true },
  { label: "Difficulty aligns with Grade 8", pass: true },
];
