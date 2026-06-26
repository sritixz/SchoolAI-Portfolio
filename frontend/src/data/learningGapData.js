// ============================================================
// LEARNING GAP DATA — backend-ready schema
// ============================================================

// ── Gap health overview ──────────────────────────────────────
export const GAP_HEALTH = {
  score: 78,                    // 0–100
  maxScore: 100,
  trend: "+5%",                 // vs last period
  trendDirection: "up",         // up | down
  improvementMessage: "Great job! You've improved your health score by 12 points this month.",
  totalGaps: 12,
  totalGapsTrend: "-2%",
  resolvedGaps: 8,
  resolvedGapsTrend: "+10%",
  severity: { critical: 3, moderate: 5, minor: 4 },
};

// ── Subject filter list (broad Indian-curriculum categories) ──
export const GAP_SUBJECTS = ["All", "Mathematics", "Science", "English", "Social Science", "Languages", "Computer Science"];

// ── Normalize any subject string into a broad category ────────
const SUBJECT_MAP = {
  // Mathematics
  mathematics: "Mathematics", math: "Mathematics", maths: "Mathematics", algebra: "Mathematics",
  geometry: "Mathematics", trigonometry: "Mathematics", calculus: "Mathematics", arithmetic: "Mathematics",
  statistics: "Mathematics", "number theory": "Mathematics",

  // Science (Physics, Chemistry, Biology, Earth Science, etc.)
  science: "Science", physics: "Science", chemistry: "Science", biology: "Science",
  "earth science": "Science", "environmental science": "Science", "life science": "Science",
  "physical science": "Science", "natural science": "Science", botany: "Science", zoology: "Science",

  // English
  english: "English", "language arts": "English", "english language": "English",
  "english literature": "English", literature: "English", grammar: "English",
  writing: "English", "creative writing": "English", comprehension: "English",

  // Social Science (History, Geography, Civics, Economics, SST)
  "social science": "Social Science", "social studies": "Social Science", sst: "Social Science",
  history: "Social Science", geography: "Social Science", civics: "Social Science",
  economics: "Social Science", "political science": "Social Science",

  // Languages (Hindi, Sanskrit, regional languages)
  hindi: "Languages", sanskrit: "Languages", french: "Languages", spanish: "Languages",
  german: "Languages", urdu: "Languages", tamil: "Languages", telugu: "Languages",
  kannada: "Languages", marathi: "Languages", bengali: "Languages", "second language": "Languages",
  "third language": "Languages", languages: "Languages",

  // Computer Science
  "computer science": "Computer Science", "computer studies": "Computer Science",
  computers: "Computer Science", it: "Computer Science", "information technology": "Computer Science",
  programming: "Computer Science", coding: "Computer Science",
};

export function normalizeSubject(subject) {
  if (!subject) return "Science";
  const key = subject.trim().toLowerCase();
  if (SUBJECT_MAP[key]) return SUBJECT_MAP[key];
  // Partial keyword match fallback
  for (const [keyword, category] of Object.entries(SUBJECT_MAP)) {
    if (key.includes(keyword) || keyword.includes(key)) return category;
  }
  return "Science"; // default fallback
}

// ── Severity config (UI) ─────────────────────────────────────
export const SEVERITY_UI = {
  critical: {
    label: "Critical",
    borderColor: "border-l-[#ec5b13]",
    badge: "bg-rose-100 text-rose-600",
    dot: "bg-[#ec5b13]",
    dotText: "text-[#ec5b13]",
    actionLabel: "Start Fixing This Gap",
  },
  moderate: {
    label: "Moderate",
    borderColor: "border-l-orange-400",
    badge: "bg-orange-100 text-orange-600",
    dot: "bg-orange-400",
    dotText: "text-orange-400",
    actionLabel: "Retry Concept",
  },
  minor: {
    label: "Minor",
    borderColor: "border-l-slate-300",
    badge: "bg-slate-100 text-slate-600",
    dot: "bg-slate-400",
    dotText: "text-slate-500",
    actionLabel: "Quick Review",
  },
};

export const SUBJECT_BADGE_UI = {
  Mathematics:       "bg-purple-100 text-purple-700",
  Science:           "bg-blue-100 text-blue-700",
  English:           "bg-pink-100 text-pink-700",
  "Social Science":  "bg-amber-100 text-amber-700",
  Languages:         "bg-teal-100 text-teal-700",
  "Computer Science":"bg-emerald-100 text-emerald-700",
};

// ── Learning gaps ────────────────────────────────────────────
export const LEARNING_GAPS = [
  {
    id: "lg001",
    subject: "Math",
    topic: "Quadratic Equations",
    subtopic: "Discriminant & Nature of Roots",
    severity: "critical",                        // critical | moderate | minor
    status: "active",                            // active | resolved | in_progress
    identifiedFrom: {
      title: "Unit 3 Quiz: Algebra Foundations",
      type: "quiz",                              // quiz | homework | test
      date: "2026-03-20",
      id: "quiz001",
    },
    impactAnalysis: "Mastery required for Calculus and complex optimization problems.",
    impactSubject: "Calculus",
    prerequisiteDependency: "Requires full mastery of Basic Algebra and factoring.",
    prerequisiteSubject: "Basic Algebra",
    masteryPercent: 38,
    recommendedTimeMinutes: 120,
    attempts: [
      { attemptNumber: 1, score: 40, date: "2026-03-20" },
      { attemptNumber: 2, score: 65, date: "2026-03-23" },
    ],
    prerequisites: [
      { topic: "Basic Algebra",    masteryPercent: 92, status: "mastered" },
      { topic: "Equation Solving", masteryPercent: 64, status: "weak" },
      { topic: "Discriminant Logic", masteryPercent: 38, status: "current" },
    ],
    correctivePath: [
      { type: "video",   label: "Watch Video",   detail: "Nature of Roots (4m)",    icon: "play_circle" },
      { type: "reading", label: "Read Summary",  detail: "Key Rules & Formulas",    icon: "menu_book" },
      { type: "practice",label: "Practice",      detail: "10 targeted questions",   icon: "edit_note" },
    ],
    aiErrorSummary: "You consistently struggled with identifying the number of roots when D < 0. Specifically, you confused 'No Real Roots' with 'Zero Roots.'",
    aiLastFeedback: "In your last attempt, you correctly identified b = -4, but forgot that squaring a negative number results in a positive. Remember: (-4)² = 16. Watch out for this common sign error!",
    visualRef: {
      label: "Visual Quick-Ref: The Three Cases",
      detail: "D > 0 (Two Roots), D = 0 (One Root), D < 0 (Complex Roots)",
    },
    retryQuestion: {
      text: "Consider the quadratic equation: 3x² - 4x + 5 = 0. Determine the value of the discriminant (D) and state the nature and number of the roots.",
      equation: "3x² - 4x + 5 = 0",
      type: "typed",
    },
  },
  {
    id: "lg002",
    subject: "Chemistry",
    topic: "Stoichiometry & Mole Ratios",
    subtopic: "Balancing Chemical Equations",
    severity: "moderate",
    status: "active",
    identifiedFrom: {
      title: "Homework #14: Balancing Equations",
      type: "homework",
      date: "2026-03-22",
      id: "hw6",
    },
    impactAnalysis: "Critical for understanding Limiting Reagents and Gas Laws.",
    impactSubject: "Limiting Reagents",
    prerequisiteDependency: "Needs review of Molar Mass Calculations.",
    prerequisiteSubject: "Molar Mass Calculations",
    masteryPercent: 55,
    recommendedTimeMinutes: 60,
    attempts: [
      { attemptNumber: 1, score: 55, date: "2026-03-22" },
    ],
    prerequisites: [
      { topic: "Atomic Structure",       masteryPercent: 88, status: "mastered" },
      { topic: "Molar Mass Calculations",masteryPercent: 70, status: "weak" },
      { topic: "Stoichiometry",          masteryPercent: 55, status: "current" },
    ],
    correctivePath: [
      { type: "video",   label: "Watch Video", detail: "Mole Ratios Explained (6m)", icon: "play_circle" },
      { type: "practice",label: "Practice",    detail: "8 targeted questions",       icon: "edit_note" },
    ],
    aiErrorSummary: "You struggled with converting between moles and grams when the molar mass involves decimal values.",
    aiLastFeedback: "Remember to always write out the mole ratio from the balanced equation before doing any calculations.",
    visualRef: null,
    retryQuestion: {
      text: "How many moles of H₂O are produced when 2 moles of H₂ react with excess O₂?",
      equation: "2H₂ + O₂ → 2H₂O",
      type: "mcq",
    },
  },
  {
    id: "lg003",
    subject: "Physics",
    topic: "Newton's Third Law",
    subtopic: "Action-Reaction Pairs",
    severity: "minor",
    status: "active",
    identifiedFrom: {
      title: "Chapter Review: Dynamics",
      type: "quiz",
      date: "2026-03-18",
      id: "quiz001",
    },
    impactAnalysis: "Minor impact on Orbital Mechanics calculations.",
    impactSubject: "Orbital Mechanics",
    prerequisiteDependency: "Understood well, just needs Vector Addition refresher.",
    prerequisiteSubject: "Vector Addition",
    masteryPercent: 72,
    recommendedTimeMinutes: 30,
    attempts: [
      { attemptNumber: 1, score: 72, date: "2026-03-18" },
    ],
    prerequisites: [
      { topic: "Newton's First Law",  masteryPercent: 95, status: "mastered" },
      { topic: "Newton's Second Law", masteryPercent: 88, status: "mastered" },
      { topic: "Newton's Third Law",  masteryPercent: 72, status: "current" },
    ],
    correctivePath: [
      { type: "video",   label: "Watch Video", detail: "Action-Reaction (3m)", icon: "play_circle" },
    ],
    aiErrorSummary: "You correctly identified action-reaction pairs in simple cases but struggled with complex multi-body systems.",
    aiLastFeedback: "Focus on identifying the two objects involved in each force pair. The forces are always equal in magnitude but opposite in direction.",
    visualRef: null,
    retryQuestion: {
      text: "A book rests on a table. Identify the action-reaction pair for the gravitational force on the book.",
      equation: null,
      type: "typed",
    },
  },
  {
    id: "lg004",
    subject: "Math",
    topic: "Trigonometry",
    subtopic: "Sine & Cosine Rules",
    severity: "moderate",
    status: "in_progress",
    identifiedFrom: {
      title: "Unit 4 Test: Trigonometry",
      type: "homework",
      date: "2026-03-15",
      id: "hw1",
    },
    impactAnalysis: "Required for advanced calculus and wave mechanics.",
    impactSubject: "Calculus",
    prerequisiteDependency: "Requires Pythagoras theorem mastery.",
    prerequisiteSubject: "Pythagoras Theorem",
    masteryPercent: 60,
    recommendedTimeMinutes: 90,
    attempts: [
      { attemptNumber: 1, score: 45, date: "2026-03-15" },
      { attemptNumber: 2, score: 60, date: "2026-03-24" },
    ],
    prerequisites: [
      { topic: "Pythagoras Theorem", masteryPercent: 90, status: "mastered" },
      { topic: "Basic Trig Ratios",  masteryPercent: 75, status: "weak" },
      { topic: "Sine & Cosine Rules",masteryPercent: 60, status: "current" },
    ],
    correctivePath: [
      { type: "video",   label: "Watch Video",  detail: "Sine Rule Derivation (5m)", icon: "play_circle" },
      { type: "reading", label: "Read Summary", detail: "Formula Sheet",             icon: "menu_book" },
      { type: "practice",label: "Practice",     detail: "12 targeted questions",     icon: "edit_note" },
    ],
    aiErrorSummary: "You applied the sine rule correctly but made errors in the ambiguous case (two possible triangles).",
    aiLastFeedback: "When using the sine rule, always check if the angle could be obtuse. If sin(A) gives a valid angle, check if 180° - A also works.",
    visualRef: null,
    retryQuestion: {
      text: "In triangle ABC, a = 7, b = 10, A = 30°. Find angle B.",
      equation: null,
      type: "typed",
    },
  },
];

// ── Self-assessment quiz bank ────────────────────────────────
// Each quiz has questions with MCQ options
export const QUIZ_BANK = [
  {
    id: "quiz001",
    title: "Quadratic Equations - Easy",
    subject: "Math",
    topic: "Quadratic Equations",
    difficulty: "easy",                          // easy | medium | hard
    totalQuestions: 10,
    estimatedMinutes: 15,
    questions: [
      {
        id: "qq1",
        number: 1,
        difficulty: "Easy",
        prompt: "Solve for x:",
        equation: "x² - 4 = 0",
        options: [
          { id: "A", text: "x = 0",  isCorrect: false },
          { id: "B", text: "x = ±2", isCorrect: true  },
          { id: "C", text: "x = 4",  isCorrect: false },
          { id: "D", text: "x = 1",  isCorrect: false },
        ],
        explanation: "The square root of 4 is both 2 and -2, therefore x² = 4 leads to x = ±2. Remember to always consider both positive and negative roots.",
        hint: "Always isolate the squared term first before taking the square root.",
      },
      {
        id: "qq2",
        number: 2,
        difficulty: "Easy",
        prompt: "What is the discriminant of:",
        equation: "x² + 6x + 9 = 0",
        options: [
          { id: "A", text: "D = 0",   isCorrect: true  },
          { id: "B", text: "D = 36",  isCorrect: false },
          { id: "C", text: "D = -36", isCorrect: false },
          { id: "D", text: "D = 9",   isCorrect: false },
        ],
        explanation: "D = b² - 4ac = 36 - 4(1)(9) = 36 - 36 = 0. Since D = 0, there is exactly one repeated real root.",
        hint: "Use D = b² - 4ac. Here a=1, b=6, c=9.",
      },
      {
        id: "qq3",
        number: 3,
        difficulty: "Easy",
        prompt: "Solve for x:",
        equation: "x² + 5x + 6 = 0",
        options: [
          { id: "A", text: "x = -2, -3", isCorrect: true  },
          { id: "B", text: "x = 2, 3",   isCorrect: false },
          { id: "C", text: "x = -1, -6", isCorrect: false },
          { id: "D", text: "x = 1, 6",   isCorrect: false },
        ],
        explanation: "Factor: (x+2)(x+3) = 0, so x = -2 or x = -3.",
        hint: "Find two numbers that multiply to 6 and add to 5.",
      },
      {
        id: "qq4",
        number: 4,
        difficulty: "Medium",
        prompt: "How many real roots does this equation have?",
        equation: "2x² + 3x + 5 = 0",
        options: [
          { id: "A", text: "Two real roots",    isCorrect: false },
          { id: "B", text: "One real root",     isCorrect: false },
          { id: "C", text: "No real roots",     isCorrect: true  },
          { id: "D", text: "Infinite roots",    isCorrect: false },
        ],
        explanation: "D = 9 - 40 = -31 < 0. Since D < 0, there are no real roots.",
        hint: "Calculate the discriminant first. If D < 0, there are no real roots.",
      },
      {
        id: "qq5",
        number: 5,
        difficulty: "Medium",
        prompt: "Using the quadratic formula, solve:",
        equation: "x² - 5x + 6 = 0",
        options: [
          { id: "A", text: "x = 2, 3",   isCorrect: true  },
          { id: "B", text: "x = -2, -3", isCorrect: false },
          { id: "C", text: "x = 1, 6",   isCorrect: false },
          { id: "D", text: "x = -1, -6", isCorrect: false },
        ],
        explanation: "D = 25 - 24 = 1. x = (5 ± 1)/2, so x = 3 or x = 2.",
        hint: "Apply x = (-b ± √D) / 2a with a=1, b=-5, c=6.",
      },
    ],
  },
  {
    id: "quiz002",
    title: "Stoichiometry - Medium",
    subject: "Chemistry",
    topic: "Stoichiometry",
    difficulty: "medium",
    totalQuestions: 8,
    estimatedMinutes: 20,
    questions: [
      {
        id: "cq1",
        number: 1,
        difficulty: "Medium",
        prompt: "How many moles of O₂ are needed to burn 2 moles of CH₄?",
        equation: "CH₄ + 2O₂ → CO₂ + 2H₂O",
        options: [
          { id: "A", text: "1 mole",  isCorrect: false },
          { id: "B", text: "2 moles", isCorrect: false },
          { id: "C", text: "4 moles", isCorrect: true  },
          { id: "D", text: "3 moles", isCorrect: false },
        ],
        explanation: "From the balanced equation, 1 mol CH₄ needs 2 mol O₂. So 2 mol CH₄ needs 4 mol O₂.",
        hint: "Use the mole ratio from the balanced equation.",
      },
    ],
  },
];

export const getGapById    = (id) => LEARNING_GAPS.find((g) => g.id === id);
export const getQuizById   = (id) => QUIZ_BANK.find((q) => q.id === id);
export const getGapsBySubject = (subject) =>
  subject === "All" ? LEARNING_GAPS : LEARNING_GAPS.filter((g) => normalizeSubject(g.subject) === subject);
