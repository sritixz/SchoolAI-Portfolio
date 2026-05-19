// ============================================================
// PRESENTATION CREATOR DATA
// ============================================================

export const presentationVisualStyles = [
  {
    id: "modern",
    label: "Modern/Clean",
    preview: { bg: "bg-white", accent: "bg-blue-400", lines: ["bg-gray-200", "bg-gray-100"] },
  },
  {
    id: "colorful",
    label: "Colorful/Engaging",
    preview: { bg: "bg-gradient-to-br from-pink-100 to-yellow-100", accent: "bg-pink-400", dots: ["bg-pink-400", "bg-yellow-400", "bg-blue-400"] },
  },
  {
    id: "ncert",
    label: "NCERT-Inspired",
    preview: { bg: "bg-white", accent: "bg-blue-700", lines: ["bg-blue-200", "bg-gray-100"] },
  },
];

export const presentationPurposes = [
  { id: "teaching",  label: "Teaching New Concept" },
  { id: "revision",  label: "Review/Revision" },
  { id: "template",  label: "Student Template" },
];

export const presentationTargetAudiences = [
  { id: "students",  label: "Students" },
  { id: "parents",   label: "Parents" },
  { id: "admin",     label: "School Admin" },
];

export const presentationTones = [
  { id: "Engaging",   label: "Engaging",   desc: "Analogies, fun facts, real-world examples" },
  { id: "Formal",     label: "Formal",     desc: "Professional, structured, academic" },
  { id: "Reflection", label: "Reflection", desc: "Reflective prompts, deeper thinking" },
];

export const presentationContentDepths = [
  { id: "Concise",  label: "Concise",  desc: "Max 3 bullets, high-level summaries" },
  { id: "Detailed", label: "Detailed", desc: "Comprehensive explanations & data points" },
];

export const presentationDefaults = {
  topic: "",
  subject: "",
  classLevel: "",
  numSlides: 12,
  durationMinutes: 30,
  purpose: "teaching",
  visualStyle: "modern",
  board: "CBSE",
  chapter: "",
  learningObjective: "Concept Understanding",
  specialInstructions: "",
  targetAudience: "students",
  tone: "Engaging",
  contentDepth: "Concise",
  includeMiniQuiz: false,
};
