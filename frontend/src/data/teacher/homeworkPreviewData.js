// ============================================================
// HOMEWORK PREVIEW / TEMPLATE DETAIL DATA
// ============================================================

export const homeworkTemplates = {
  hl1: {
    id: "hl1",
    title: "Linear Equations - Practice Set",
    subject: "Math",
    chapter: "Ch 5: Linear Equations",
    overview: {
      createdDate: "Feb 1, 2026",
      usedCount: 12,
      avgScore: 82,
      type: "Online",
      totalQuestions: 8,
      totalMarks: 40,
      estTimeMinutes: 45,
    },
    tags: ["#revision", "#exam-prep", "#algebra"],
    questions: [
      {
        id: "q1",
        number: 1,
        difficulty: "EASY",
        marks: 3,
        timeMinutes: 5,
        type: "mcq",
        text: "Solve for x: 3x + 5 = 20",
        options: ["A) 5", "B) 15", "C) 25", "D) 45"],
        correctOption: "A) 5",
      },
      {
        id: "q2",
        number: 2,
        difficulty: "MEDIUM",
        marks: 5,
        timeMinutes: 5,
        type: "short_answer",
        text: "Taxi Fare Problem",
        description: "A taxi charges a flat fee of $5 plus $2 per mile traveled. If a passenger paid $21 for a ride, write and solve an equation to find the number of miles (m) the taxi traveled.",
        note: "Options viewable upon assignment activation",
      },
    ],
    assignmentHistory: [
      { dateAssigned: "Jan 15, 2026", class: "Grade 8A", students: 32, completionRate: "91%" },
      { dateAssigned: "Jan 22, 2026", class: "Grade 8B", students: 30, completionRate: "87%" },
    ],
  },
};

export const getHomeworkTemplate = (id) => homeworkTemplates[id] || homeworkTemplates["hl1"];
