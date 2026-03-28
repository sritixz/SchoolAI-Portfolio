// ============================================================
// GRADING & FEEDBACK ASSISTANT DATA
// ============================================================

export const assistanceTypes = [
  {
    id: "feedback",
    label: "Generate Feedback for Response",
    desc: "AI-driven scoring and personalized suggestions",
  },
  {
    id: "rubric",
    label: "Create Grading Rubric",
    desc: "Design a structured scoring guide",
  },
];

export const feedbackTones = [
  { id: "encouraging", label: "Encouraging ✨" },
  { id: "neutral",     label: "Neutral 📝" },
  { id: "strict",      label: "Strict 🎯" },
];

export const gradingDefaults = {
  assistanceType: "feedback",
  question: "Explain how the distributive property is used in the equation 3(x + 5) = 30.",
  studentResponse: "You multiply 3 by x and then 3 by 5 to get 3x + 15. Then you have 3x + 15 = 30. Then you subtract 15 from both sides to get 3x = 15. Finally divide by 3.",
  totalMarks: 3,
  feedbackTone: "encouraging",
};

export const sampleEvaluationResult = {
  score: 2.5,
  maxScore: 3,
  summary: [
    { type: "pass",    text: "Correct process identified: The student accurately described the distributive step." },
    { type: "pass",    text: "Proper algebraic sequence followed for isolating the variable." },
    { type: "warning", text: "Missing final step simplification: The value of 'x' was not explicitly stated in the final sentence." },
  ],
  feedbackDraft: "Great job explaining the process, Rahul! You clearly understand how to distribute the 3 and solve for x. To get full marks, try to finish the calculation and state the final value of x clearly in your summary. Keep up the excellent work!",
};
