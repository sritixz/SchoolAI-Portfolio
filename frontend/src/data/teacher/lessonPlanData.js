// ============================================================
// LESSON PLAN CREATOR DATA
// ============================================================

export const lessonPlanDefaults = {
  subject: "Math",
  topic: "Quadratic Equations",
  classLevel: "Grade 8A",
  durationMinutes: 40,
  objectives: [
    { id: "lo1", text: "Understand the standard form of quadratic equations (ax² + bx + c = 0)", selected: true },
    { id: "lo2", text: "Solve quadratic equations using the factorization method", selected: true },
    { id: "lo3", text: "Identify coefficients a, b, and c in various equation formats", selected: false },
  ],
  instructionalMethods: ["Guided Practice", "Inquiry-based", "Lecture"],
  resources: ["Projector", "Algebra Tiles"],
  specificNeeds: "Includes visual learners, 3 students need extra support with multiplication",
  lessonSections: [
    { id: "hook",     label: "Hook",            selected: true },
    { id: "recap",    label: "Recap",           selected: true },
    { id: "main",     label: "Main Activity",   selected: true },
    { id: "guided",   label: "Guided Practice", selected: true },
    { id: "exit",     label: "Exit Ticket",     selected: true },
  ],
};

export const aiTips = [
  {
    title: "Effective Hooks for Math:",
    tips: [
      'Start with a real-world bridge: "Where do we see parabolic curves in architecture?"',
      'Use a "What\'s the Pattern?" puzzle to introduce standard form variables.',
    ],
  },
];

export const methodOptions = ["Guided Practice", "Inquiry-based", "Lecture", "Think-Pair-Share", "Flipped Classroom", "Direct Instruction"];
export const resourceOptions = ["Projector", "Algebra Tiles", "Whiteboard", "Worksheets", "Manipulatives", "Digital Tools"];
