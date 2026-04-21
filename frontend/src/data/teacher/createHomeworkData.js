// ============================================================
// CREATE NEW HOMEWORK DATA
// ============================================================

export const homeworkSubjects = ["Math", "Physics", "Chemistry", "Biology", "English", "History"];
export const homeworkChapters = ["Linear Equations", "Quadratic Equations", "Probability", "Geometry", "Trigonometry"];

export const homeworkTypes = [
  { id: "online_quiz",  icon: "cloud_upload",  label: "Online Quiz",  desc: "Auto-graded MCQ/typed" },
  { id: "file_upload",  icon: "upload_file",   label: "File Upload",  desc: "Student uploads PDF/image" },
  { id: "handwritten",  icon: "draw",          label: "Handwritten",  desc: "Photo of written work" },
  { id: "online_quiz",  icon: "layers",        label: "Mixed",        desc: "Combo of formats" },
];

export const topicFilters = [
  { id: "stoich",   label: "Stoichiometry",      count: 12 },
  { id: "oxidation",label: "Oxidation & Reduction", count: 8 },
  { id: "mole",     label: "Mole Concept",        count: 15 },
  { id: "equil",    label: "Equilibrium",          count: 6 },
];

export const questionBank = [
  {
    id: "qb1",
    difficulty: "EASY",
    diffColor: "bg-green-100 text-green-700",
    id_code: "ID: #PCH-100",
    marks: 5,
    timeMinutes: 4,
    text: "Calculate the mass of 2.5 moles of Magnesium Carbonate.",
    selected: true,
  },
  {
    id: "qb2",
    difficulty: "MEDIUM",
    diffColor: "bg-yellow-100 text-yellow-700",
    id_code: "ID: #PCH-104",
    marks: 10,
    timeMinutes: 13,
    text: "Explain the relationship between pressure and volume in a closed system (Boyle's Law).",
    selected: false,
  },
  {
    id: "qb3",
    difficulty: "HARD",
    diffColor: "bg-red-100 text-red-600",
    id_code: "ID: #PCH-389",
    marks: 15,
    timeMinutes: 20,
    text: "Derive the empirical formula for a compound with 40% Carbon, 6.7% Hydrogen and 53.3% Oxygen.",
    selected: false,
  },
];

export const assignmentTargets = ["Entire Class", "Groups", "Individual Students"];
