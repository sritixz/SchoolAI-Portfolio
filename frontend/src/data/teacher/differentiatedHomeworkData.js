// ============================================================
// DIFFERENTIATED HOMEWORK DATA
// ============================================================

export const diffHomeworkSubjects = ["Math", "Physics", "Chemistry", "Biology", "English"];
export const diffHomeworkChapters = {
  Math:      ["Linear Equations", "Quadratic Equations", "Probability", "Geometry", "Trigonometry"],
  Physics:   ["Laws of Motion", "Optics", "Thermodynamics", "Electricity"],
  Chemistry: ["Stoichiometry", "Organic Reactions", "Periodic Table"],
  Biology:   ["Cell Division", "Genetics", "Ecosystems"],
  English:   ["Grammar", "Comprehension", "Essay Writing"],
};

export const aiSuggestedGroups = [
  {
    id: "groupA",
    label: "Group A",
    color: "blue",
    dotColor: "bg-blue-500",
    studentCount: 12,
    performance: "Needs More Support",
    level: "Foundation Level",
    levelColor: "bg-blue-100 text-blue-700",
    avatarCount: 3,
    extra: 9,
  },
  {
    id: "groupB",
    label: "Group B",
    color: "green",
    dotColor: "bg-green-500",
    studentCount: 15,
    performance: "On Track",
    level: "Intermediate Level",
    levelColor: "bg-green-100 text-green-700",
    avatarCount: 3,
    extra: 12,
  },
  {
    id: "groupC",
    label: "Group C",
    color: "purple",
    dotColor: "bg-purple-500",
    studentCount: 8,
    performance: "Ready for Challenge",
    level: "Advanced Level",
    levelColor: "bg-purple-100 text-purple-700",
    avatarCount: 3,
    extra: 5,
  },
];

export const groupQuestions = [
  {
    id: "q1",
    difficulty: "EASY",
    diffColor: "bg-green-100 text-green-700",
    id_code: "ID: #LQ-100",
    marks: 5,
    text: "Solve for x in the following linear equation: 2x + 5 = 15.",
    selected: false,
  },
  {
    id: "q2",
    difficulty: "EASY",
    diffColor: "bg-green-100 text-green-700",
    id_code: "ID: #LQ-105",
    marks: 5,
    text: "What is the value of y if y - 10 = 20?",
    selected: true,
  },
  {
    id: "q3",
    difficulty: "EASY",
    diffColor: "bg-green-100 text-green-700",
    id_code: "ID: #LQ-109",
    marks: 5,
    text: "Identify the coefficient of x in the expression 4x + 7.",
    selected: true,
  },
  {
    id: "q4",
    difficulty: "MEDIUM",
    diffColor: "bg-yellow-100 text-yellow-700",
    id_code: "ID: #LQ-112",
    marks: 8,
    text: "A number is 3 more than twice another. Their sum is 27. Find both numbers.",
    selected: false,
  },
  {
    id: "q5",
    difficulty: "HARD",
    diffColor: "bg-red-100 text-red-600",
    id_code: "ID: #LQ-118",
    marks: 10,
    text: "Solve the system of equations: 3x + 2y = 12 and x - y = 1.",
    selected: false,
  },
];

export const allStudents = [
  { id: "st1", name: "Alex Thompson",   status: "ON TRACK",      statusColor: "text-green-500",  avatar: null, group: null },
  { id: "st2", name: "Bella Martinez",  status: "SUPPORT NEEDED", statusColor: "text-red-500",   avatar: null, group: null },
  { id: "st3", name: "Chris Evans",     status: "ADVANCED",      statusColor: "text-purple-500", avatar: null, group: null },
  { id: "st4", name: "Daniel Craig",    status: "ON TRACK",      statusColor: "text-green-500",  avatar: null, group: null },
  { id: "st5", name: "Elena Rodriguez", status: "SUPPORT NEEDED", statusColor: "text-red-500",   avatar: null, group: null },
  { id: "st6", name: "Frank Miller",    status: "ON TRACK",      statusColor: "text-green-500",  avatar: null, group: null },
];

export const manualGroups = [
  {
    id: "mg1",
    label: "Group 1",
    studentCount: 10,
    difficulty: "Foundation",
    members: [
      { id: "m1", name: "Jordan S." },
      { id: "m2", name: "Sarah W." },
      { id: "m3", name: "Mike R." },
      { id: "m4", name: "Lily A." },
      { id: "m5", name: "Liam K." },
    ],
    extra: 5,
  },
  {
    id: "mg2",
    label: "Group 2",
    studentCount: 0,
    difficulty: "Intermediate",
    members: [],
    extra: 0,
  },
];
