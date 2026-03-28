// ============================================================
// PARENT COMMUNICATION DATA
// ============================================================

export const parentMeetingRequests = [
  {
    id: "pmr1",
    studentName: "Priya Sharma",
    studentClass: "8A",
    rollNo: "24",
    avatar: null,
    urgency: "urgent",
    status: "pending_response",
    reason: "Academic Concern - Performance Drop in Mid-terms",
    proposedTimes: [
      { id: "pt1", date: "Nov 10", time: "3:30 PM - 4:00 PM", selected: false },
      { id: "pt2", date: "Nov 11", time: "4:00 PM - 4:30 PM", selected: true },
      { id: "pt3", date: "Nov 12", time: "10:00 AM - 10:30 AM", selected: false },
    ],
    parentContact: {
      name: "Rajesh Kumar",
      relation: "Father",
      type: "PRIMARY CONTACT",
      phone: "+91 98765 43210",
      email: "rajesh.kumar@email.com",
    },
    studentContext: {
      currentAvg: 68,
      trend: "Declining",
      criticalGaps: [
        "Mathematics Geometry Fundamentals",
        "Physics Lab Attendance (40%)",
        "Late Project Submissions (x4)",
      ],
    },
  },
  {
    id: "pmr2",
    studentName: "Arjun Tiwari",
    studentClass: "8B",
    rollNo: "12",
    avatar: null,
    urgency: "normal",
    status: "pending_response",
    reason: "Homework Completion - Missed 4 assignments",
    proposedTimes: [
      { id: "pt1", date: "Nov 13", time: "2:00 PM - 2:30 PM", selected: false },
      { id: "pt2", date: "Nov 14", time: "3:00 PM - 3:30 PM", selected: false },
    ],
    parentContact: {
      name: "Meena Tiwari",
      relation: "Mother",
      type: "PRIMARY CONTACT",
      phone: "+91 98765 11111",
      email: "meena.tiwari@email.com",
    },
    studentContext: {
      currentAvg: 55,
      trend: "Stable",
      criticalGaps: ["Algebra Basics", "Reading Comprehension"],
    },
  },
];

export const messageComposerTemplates = [
  { id: "mt1", label: "Homework Reminder",    body: "Dear Parent, this is a reminder that [Student Name] has pending homework due on [Date]. Please encourage them to complete it." },
  { id: "mt2", label: "Performance Update",   body: "Dear Parent, we wanted to share that [Student Name]'s recent performance in [Subject] has shown [improvement/decline]. Please schedule a meeting if needed." },
  { id: "mt3", label: "Attendance Alert",     body: "Dear Parent, [Student Name]'s attendance has dropped below 85% this month. Please ensure regular attendance." },
  { id: "mt4", label: "Achievement Notice",   body: "Dear Parent, we are pleased to inform you that [Student Name] has shown excellent performance in [Subject]. Keep up the great work!" },
];

export const communicationHistory = [
  { id: "ch1", type: "message",  studentName: "Priya Sharma",  date: "Nov 8, 2026",  subject: "Performance Update",   status: "read",    channel: "SMS" },
  { id: "ch2", type: "meeting",  studentName: "Arjun Tiwari",  date: "Nov 5, 2026",  subject: "Parent Meeting",        status: "completed", channel: "In-Person" },
  { id: "ch3", type: "message",  studentName: "Sana Roy",      date: "Nov 3, 2026",  subject: "Homework Reminder",     status: "unread",  channel: "Email" },
  { id: "ch4", type: "call",     studentName: "Rahul Kumar",   date: "Oct 30, 2026", subject: "Attendance Alert",      status: "completed", channel: "Phone" },
];
