// ============================================================
// ROOT CAUSE MAPPING ANALYSIS DATA
// ============================================================

export const rootCauseStats = {
  totalErrors: 47,
  changeFromLastWeek: -12,
  errorDistribution: [
    { type: "Conceptual",  percent: 38, color: "#f97316" },
    { type: "Procedural",  percent: 45, color: "#fb923c" },
    { type: "Calculation", percent: 17, color: "#fbbf24" },
  ],
  studentsAffected: 24,
  studentBreakdown: [
    { label: "1-2 err",  count: 14, width: 58 },
    { label: "3-4 err",  count: 7,  width: 29 },
    { label: "5+ err",   count: 3,  width: 13 },
  ],
};

export const rootCauseTabs = [
  { id: "classification",  label: "Error Classification",      icon: "category" },
  { id: "mapping",         label: "Root Cause Mapping",        icon: "account_tree" },
  { id: "interventions",   label: "Recommended Interventions", icon: "lightbulb" },
];

export const prerequisiteGaps = [
  {
    id: "pg1",
    title: "Distributive Property",
    affectedStudents: 12,
    mastery: 62,
    severity: "critical",
    evidence: 'Students wrote 2(x+3) as 2x+3',
    evidenceHighlight: "2x+3",
    expanded: true,
  },
  {
    id: "pg2",
    title: "Negative Number Operations",
    affectedStudents: 8,
    mastery: 71,
    severity: "warning",
    evidence: null,
    expanded: false,
  },
];

export const proceduralIssues = [
  {
    id: "pi1",
    title: "Procedural Knowledge Issues",
    detail: "Issue: Equation Solving Steps (11 students)",
    severity: "warning",
    expanded: false,
  },
  {
    id: "pi2",
    title: "Attention and Carelessness",
    detail: "Issue: Basic Calculation Mistakes (7 students)",
    severity: "ok",
    expanded: false,
  },
];

export const errorCauseMap = [
  { category: "CONCEPTUAL",  color: "bg-orange-500",  rootCause: "Distributive Property",    lineColor: "#f97316" },
  { category: "PROCEDURAL",  color: "bg-orange-400",  rootCause: "Eq. Solving Steps",        lineColor: "#fb923c" },
  { category: "CALCULATION", color: "bg-yellow-400",  rootCause: "Basic Calculation",        lineColor: "#fbbf24" },
  { category: "",            color: "",               rootCause: "Reading Comprehension",    lineColor: "#86efac" },
];

export const aiInsight = "A strong correlation exists between Conceptual Errors and the Distributive Property gap. Focusing on this will resolve ~40% of detected errors.";
