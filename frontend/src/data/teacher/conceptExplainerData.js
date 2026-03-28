// ============================================================
// CONCEPT EXPLAINER DATA
// ============================================================

export const conceptExplainerDefaults = {
  concept: "Photosynthesis",
  targetAudience: "Grade 7 (12-13 years old)",
  simplifyForStruggling: true,
  explanationStyle: "Analogy-heavy",
  includeElements: {
    visualAnalogies:       true,
    realWorldExamples:     true,
    commonMisconceptions:  true,
    teachingTips:          false,
  },
};

export const targetAudienceOptions = [
  "Grade 5 (10-11 years old)",
  "Grade 6 (11-12 years old)",
  "Grade 7 (12-13 years old)",
  "Grade 8 (13-14 years old)",
  "Grade 9 (14-15 years old)",
  "Grade 10 (15-16 years old)",
];

export const explanationStyles = [
  { id: "analogy",    label: "Analogy-heavy" },
  { id: "stepbystep", label: "Step-by-step" },
  { id: "story",      label: "Story-based" },
  { id: "technical",  label: "Technical" },
];

export const includeElementOptions = [
  { id: "visualAnalogies",      label: "Visual Analogies" },
  { id: "realWorldExamples",    label: "Real-world Examples" },
  { id: "commonMisconceptions", label: "Common Misconceptions" },
  { id: "teachingTips",         label: "Teaching Tips" },
];

export const conceptExplainerHistory = [
  { id: "ce1", concept: "Photosynthesis",    audience: "Grade 7", date: "Mar 25, 2026", status: "completed" },
  { id: "ce2", concept: "Newton's 3rd Law",  audience: "Grade 8", date: "Mar 22, 2026", status: "completed" },
  { id: "ce3", concept: "Fractions",         audience: "Grade 5", date: "Mar 20, 2026", status: "draft" },
];
