// ============================================================
// LESSON PLAN CREATOR DATA
// Based on professional teaching standards and best practices
// ============================================================

export const lessonPlanDefaults = {
  subject: "Math",
  topic: "Quadratic Equations",
  classLevel: "Grade 8A",
  durationMinutes: 45,
  standards: "CCSS.MATH.CONTENT.HSA.REI.B.4",
  objectives: [
    { id: "lo1", text: "Students will be able to identify and write quadratic equations in standard form (ax² + bx + c = 0)", selected: true },
    { id: "lo2", text: "Students will be able to solve quadratic equations using the factorization method with 80% accuracy", selected: true },
    { id: "lo3", text: "Students will be able to identify and explain the role of coefficients a, b, and c in quadratic equations", selected: false },
  ],
  instructionalMethods: ["Direct Instruction", "Guided Practice", "Collaborative Learning"],
  resources: ["Whiteboard/Smartboard", "Algebra Tiles", "Graphing Calculator", "Worksheets"],
  specificNeeds: "3 students with IEPs need extended time, 5 visual learners benefit from graphic organizers, 2 ELL students need vocabulary support",
  lessonSections: [
    { id: "warmup",      label: "Warm-Up/Do Now",        selected: true, duration: 5 },
    { id: "intro",       label: "Introduction/Hook",     selected: true, duration: 5 },
    { id: "instruction", label: "Direct Instruction",    selected: true, duration: 15 },
    { id: "guided",      label: "Guided Practice",       selected: true, duration: 10 },
    { id: "independent", label: "Independent Practice",  selected: false, duration: 10 },
    { id: "closure",     label: "Closure/Summary",       selected: true, duration: 5 },
    { id: "assessment",  label: "Assessment/Exit Ticket", selected: true, duration: 5 },
  ],
  differentiation: {
    support: "Provide equation templates, use manipulatives, pair with peer tutors",
    enrichment: "Challenge problems with real-world applications, explore graphing connections",
    modifications: "Reduce number of problems, provide formula sheet, allow calculator use"
  }
};

export const aiTips = [
  {
    title: "Effective Lesson Planning:",
    tips: [
      'Use SMART objectives: Specific, Measurable, Achievable, Relevant, Time-bound',
      'Include a strong hook to engage students in the first 2-3 minutes',
      'Plan for 60% teacher-led, 40% student practice time',
      'Build in formative assessment checkpoints every 10-15 minutes',
    ],
  },
  {
    title: "Engagement Strategies:",
    tips: [
      'Start with a real-world problem or visual demonstration',
      'Use think-pair-share for student collaboration',
      'Incorporate movement or hands-on activities',
      'Connect to prior knowledge and preview next steps',
    ],
  },
];

export const methodOptions = [
  "Direct Instruction", 
  "Guided Practice", 
  "Collaborative Learning",
  "Think-Pair-Share", 
  "Inquiry-Based Learning",
  "Flipped Classroom", 
  "Socratic Seminar",
  "Problem-Based Learning",
  "Differentiated Instruction"
];

export const resourceOptions = [
  "Whiteboard/Smartboard", 
  "Projector/Document Camera",
  "Manipulatives", 
  "Worksheets/Handouts",
  "Graphing Calculator",
  "Digital Tools/Apps",
  "Textbook",
  "Visual Aids/Posters",
  "Lab Equipment",
  "Art Supplies"
];
