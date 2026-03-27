// ============================================================
// VIN AI TUTOR — Mock data (backend-ready schema)
// ============================================================

export const VIN_AVATAR = "https://lh3.googleusercontent.com/aida-public/AB6AXuCVoyiJ7XrXHXK5K-2X_581fJt9Yda1obdRKXh8gdfrGJ-NTpwYc8Km130_4l0luSueL9ix-IRGHNCp0uH9upkA5CSl6HyXmL9HX8WiewcPAML8ScVZhykcFVW7tUor-OIEAHbE7ZKxqi5Xj8_k00wG3jpjMmNAte8QGNbJqce__URELabhUvBiKHea4H50BaekRP686vZn0lYjQOmCU4n5h_sdI72gdVsRCO-v1PQud4PcPKAtuj3xCRoTX0UhQmi-8lJ7R8e5SPWr";

// ── Subject badge colors ─────────────────────────────────────
export const SUBJECT_BADGE = {
  Math:       { bg: "bg-[#FFE5E5]",  text: "text-red-600" },
  Physics:    { bg: "bg-blue-50",    text: "text-blue-600" },
  Chemistry:  { bg: "bg-green-50",   text: "text-green-700" },
  Biology:    { bg: "bg-emerald-50", text: "text-emerald-700" },
  History:    { bg: "bg-purple-50",  text: "text-purple-600" },
  English:    { bg: "bg-amber-50",   text: "text-amber-700" },
  "Comp Sci": { bg: "bg-indigo-50",  text: "text-indigo-600" },
  Geography:  { bg: "bg-teal-50",    text: "text-teal-700" },
};

export const SIDEBAR_SUBJECTS = ["All", "Math", "Physics", "Chemistry", "Biology", "History", "English"];

// ── Quick action chips ───────────────────────────────────────
export const QUICK_ACTIONS = [
  { id: "qa1", label: "Upload Problem", icon: "upload_file" },
  { id: "qa2", label: "Formula Help",   icon: "function" },
  { id: "qa3", label: "Past Lessons",   icon: "history_edu" },
];

// ── Doubt history ────────────────────────────────────────────
export const DOUBT_HISTORY = [
  { id: "dh1", subject: "Math",     question: "How do I solve quadratic equations using the formula? I'm confused about the discriminant.", relativeTime: "2 days ago",  status: "resolved", starred: false },
  { id: "dh2", subject: "Physics",  question: "Can you explain Newton's Third Law with real-life examples? I'm having trouble with reaction forces.", relativeTime: "3 days ago",  status: "resolved", starred: true  },
  { id: "dh3", subject: "History",  question: "What were the main causes of the industrial revolution in Britain during the 18th century?", relativeTime: "Last week",   status: "resolved", starred: false },
  { id: "dh4", subject: "Math",     question: "Integration by parts seems very difficult. How do I choose which part is 'u' and which is 'dv'?", relativeTime: "2 weeks ago", status: "resolved", starred: false },
  { id: "dh5", subject: "Chemistry",question: "Can you help me balance this equation? H2 + O2 → H2O. I'm stuck on where to start.", relativeTime: "2 weeks ago", status: "resolved", starred: true  },
  { id: "dh6", subject: "Biology",  question: "What is the difference between mitosis and meiosis? When does each occur?", relativeTime: "2 weeks ago", status: "resolved", starred: false },
  { id: "dh7", subject: "English",  question: "How do I identify the theme of a poem? I'm reading 'The Road Not Taken' and I'm confused.", relativeTime: "3 weeks ago", status: "resolved", starred: false },
];

// ── Block builders (maps to backend AI response schema) ──────
export const buildTextBlock    = (html)          => ({ type: "text",           html });
export const buildFormulaBlock = (formula)       => ({ type: "formula",        formula });
export const buildHintBlock    = (label, text)   => ({ type: "hint",           label, text });
export const buildStepsBlock   = (steps)         => ({ type: "steps",          steps });
export const buildExampleBlock = (title, lines)  => ({ type: "example",        title, lines });
export const buildSearchBlock  = ()              => ({ type: "search_actions" });
export const buildPracticeBlock= (problem)       => ({ type: "practice",       problem });
// problem: { question, options:[{id,text,isCorrect}], level, subject }

// ── AI response library ──────────────────────────────────────
export const AI_RESPONSES = {
  "quadratic formula": {
    id: "resp_001", subject: "Math",
    followUps: ["Show me an example", "I still don't understand", "Try a practice problem", "What if D is negative?"],
    blocks: [
      buildTextBlock("The quadratic formula is a universal tool for solving equations of the form <strong>ax² + bx + c = 0</strong>."),
      buildFormulaBlock("x = (-b ± √(b² - 4ac)) / 2a"),
      buildHintBlock("Hint 1", "Before you use the formula, always make sure your equation is set to zero. If you have something like 2x² = 4x - 1, move everything to one side first!"),
      buildStepsBlock([
        { number: 1, html: "Identify your coefficients: <strong>a</strong>, <strong>b</strong>, and <strong>c</strong>." },
        { number: 2, html: "Calculate the discriminant: <strong>D = b² - 4ac</strong>." },
        { number: 3, html: "Plug everything into the formula and solve for x." },
      ]),
    ],
  },

  "practice problem": {
    id: "resp_002", subject: "Math",
    followUps: ["2 and 3", "1 and 6", "I need a hint"],
    blocks: [
      buildTextBlock("Sure! Let's try a practice problem together. Consider the quadratic equation: <strong>x² + 5x + 6 = 0</strong>. First, I'll show you an example of how to solve a similar one, then we can tackle this step-by-step."),
      buildExampleBlock("Example: Solve x² + 4x + 3 = 0", [
        "<strong>Step 1:</strong> Factorize. (x+3)(x+1) = 0",
        "<strong>Step 2:</strong> Solve for x. x = -3 or x = -1",
      ]),
      buildTextBlock("Now, looking at our problem <strong>x² + 5x + 6 = 0</strong>, what are two numbers that multiply to 6 and add up to 5?"),
      buildPracticeBlock({
        question: "Solve for x: x² + 5x + 6 = 0",
        questionDisplay: "Solve for x: <em class=\"text-[#685ae7]\">x² + 5x + 6 = 0</em>",
        description: "Factor the quadratic expression to find the values of x that satisfy the equation.",
        level: "Algebra • Level 1",
        subject: "Math",
        options: [
          { id: "A", text: "x = -2, -3", isCorrect: true },
          { id: "B", text: "x = 2, 3",   isCorrect: false },
          { id: "C", text: "x = -1, -6", isCorrect: false },
          { id: "D", text: "x = 1, 6",   isCorrect: false },
        ],
      }),
    ],
  },

  "balance equation": {
    id: "resp_003", subject: "Chemistry",
    followUps: ["Show another example", "What is conservation of mass?", "Try a harder equation"],
    blocks: [
      buildTextBlock("Of course! Balancing equations is all about making sure we have the same number of atoms on both sides. Let's think about it step by step."),
      buildSearchBlock(),
      buildStepsBlock([
        { number: 1, html: "Count atoms on each side: H₂ + O₂ → H₂O has 2H, 2O on left and 2H, 1O on right." },
        { number: 2, html: "Oxygen is unbalanced. Try: H₂ + O₂ → <strong>2</strong>H₂O." },
        { number: 3, html: "Now hydrogen is unbalanced. Fix: <strong>2</strong>H₂ + O₂ → 2H₂O. ✓" },
      ]),
      buildHintBlock("Key Rule", "You can only add coefficients in front of molecules — never change the subscripts inside a formula!"),
    ],
  },

  "newton third law": {
    id: "resp_004", subject: "Physics",
    followUps: ["Give me more examples", "How does this relate to momentum?", "What about Newton's First Law?"],
    blocks: [
      buildTextBlock("Newton's Third Law states: <strong>For every action, there is an equal and opposite reaction.</strong>"),
      buildStepsBlock([
        { number: 1, html: "When you push a wall, the wall pushes back on you with equal force." },
        { number: 2, html: "A rocket expels gas downward → the gas pushes the rocket upward." },
        { number: 3, html: "When you walk, your foot pushes the ground backward → the ground pushes you forward." },
      ]),
      buildHintBlock("Common Mistake", "The action and reaction forces act on <em>different objects</em> — they never cancel each other out!"),
    ],
  },

  "default": {
    id: "resp_default", subject: "General",
    followUps: ["Can you explain more?", "Give me an example", "I need more help"],
    blocks: [
      buildTextBlock("That's a great question! Let me help you work through this. Could you share a bit more context or the specific part you're stuck on?"),
      buildHintBlock("Tip", "The more specific your question, the better I can help. Try sharing the exact problem or equation you're working on."),
    ],
  },
};

export function matchResponse(text) {
  const l = text.toLowerCase();
  if (l.includes("quadratic") || l.includes("discriminant") || l.includes("formula")) return AI_RESPONSES["quadratic formula"];
  if (l.includes("practice") || l.includes("example") || l.includes("x² + 5x") || l.includes("2 and 3") || l.includes("1 and 6")) return AI_RESPONSES["practice problem"];
  if (l.includes("balance") || l.includes("h2o") || l.includes("h₂")) return AI_RESPONSES["balance equation"];
  if (l.includes("newton") || l.includes("third law") || l.includes("reaction force")) return AI_RESPONSES["newton third law"];
  return AI_RESPONSES["default"];
}
