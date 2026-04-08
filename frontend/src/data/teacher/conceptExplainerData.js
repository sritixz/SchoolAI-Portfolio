// ============================================================
// CONCEPT EXPLAINER DATA
// ============================================================

export const conceptExplainerDefaults = {
  concept: "",
  grade: "Grade 7",
  board: "CBSE",
  explanationStyle: "Analogy-based",
  level: "Standard",
  includeElements: {
    realLifeExamples:   true,
    visualExplanation:  true,
    commonMistakes:     true,
    quickQuestions:     true,
  },
};

export const gradeOptions = [
  "Grade 5",
  "Grade 6",
  "Grade 7",
  "Grade 8",
  "Grade 9-12",
];

export const boardOptions = ["CBSE", "ICSE", "State Board"];

export const explanationStyles = [
  { id: "analogy",    label: "Analogy-based" },
  { id: "stepbystep", label: "Step-by-step" },
  { id: "story",      label: "Story-based" },
  { id: "technical",  label: "Technical" },
];

export const levelOptions = [
  { id: "Basic",    label: "Basic",    desc: "For struggling students" },
  { id: "Standard", label: "Standard", desc: "Default level" },
  { id: "Advanced", label: "Advanced", desc: "For advanced learners" },
];

export const includeElementOptions = [
  { id: "realLifeExamples",  label: "Real-life examples" },
  { id: "visualExplanation", label: "Visual explanation (diagram/flow)" },
  { id: "commonMistakes",    label: "Common mistakes" },
  { id: "quickQuestions",    label: "Quick questions (MCQ + short)" },
];
