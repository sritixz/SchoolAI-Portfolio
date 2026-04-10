// ============================================================
// LESSON PLAN CREATOR DATA
// Based on professional teaching standards and best practices
// ============================================================

export const lessonPlanDefaults = {
  subject: "",
  topic: "",
  classLevel: "",
  durationMinutes: 45,
  numberOfClasses: 1,
  board: "CBSE",
  chapter: "",
  standards: "",
  lessonType: "standard",
  focusAreas: ["concept_understanding"],
  includeOptions: {
    assessmentQuestions: true,
    homework: true,
    realLifeExamples: true,
    differentiation: true,
  },
  objectives: [],
  instructionalMethods: ["Direct Instruction", "Guided Practice"],
  resources: ["Whiteboard/Smartboard", "Textbook"],
  specificNeeds: "",
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
    support: "",
    enrichment: "",
  },
  referenceDocument: null,
};

export const boardOptions = ["CBSE", "ICSE", "State Board", "IB", "Cambridge"];

export const lessonTypeOptions = [
  { value: "standard",   label: "Standard Lesson Plan" },
  { value: "activity",   label: "Activity-Based" },
  { value: "inquiry",    label: "Inquiry-Based" },
  { value: "5e",         label: "5E Model" },
];

export const focusAreaOptions = [
  { value: "concept_understanding", label: "Concept Understanding" },
  { value: "application",           label: "Application" },
  { value: "exam_preparation",      label: "Exam Preparation" },
  { value: "revision",              label: "Revision" },
];

export const objectiveTagOptions = [
  { value: "concept",     label: "🧠 Concept",     color: "bg-blue-100 text-blue-700" },
  { value: "skill",       label: "⚙️ Skill",       color: "bg-green-100 text-green-700" },
  { value: "application", label: "🔍 Application", color: "bg-orange-100 text-orange-700" },
  { value: "hots",        label: "🔥 HOTS",        color: "bg-red-100 text-red-700" },
];

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
