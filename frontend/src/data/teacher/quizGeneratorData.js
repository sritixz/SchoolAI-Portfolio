// ============================================================
// QUIZ / QUESTION GENERATOR DATA
// ============================================================

export const quizGeneratorDefaults = {
  topic: "Linear Equations",
  subject: "Math",
  classLevel: "Grade 8",
  questionTypes: { mcq: true, shortAnswer: true, numerical: false, caseBased: false },
  difficulty: { easy: 30, medium: 50, hard: 20 },
};

export const subjectOptions = ["Math", "Physics", "Chemistry", "Biology", "English", "History"];
export const classOptions   = ["Grade 6", "Grade 7", "Grade 8", "Grade 9", "Grade 10"];

export const questionTypeOptions = [
  { id: "mcq",         label: "Multiple Choice (MCQ)" },
  { id: "shortAnswer", label: "Short Answer" },
  { id: "numerical",   label: "Numerical" },
  { id: "caseBased",   label: "Case-based" },
];
