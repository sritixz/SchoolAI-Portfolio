import { useState } from "react";
import api from "../../../api";

const SUBJECTS = ["Maths", "Science", "English", "Social", "Hindi"];
const BOARDS   = ["CBSE", "ICSE", "State Board"];
const CLASSES  = ["6", "7", "8", "9", "10"];
const STUDY_TIMES = [
  { id: "30", label: "30 mins" },
  { id: "60", label: "1 hour" },
  { id: "120", label: "2 hours" },
  { id: "180", label: "3+ hours" },
];
const CONFIDENCE = [
  { id: "low",    emoji: "😰", label: "Low" },
  { id: "medium", emoji: "😐", label: "Medium" },
  { id: "high",   emoji: "😎", label: "High" },
];
const EXAM_PATTERNS = [
  { id: "mcq",   label: "MCQ Based" },
  { id: "mixed", label: "Mixed (MCQ + Short + Long)" },
  { id: "desc",  label: "Descriptive" },
  { id: "board", label: "Board Pattern (Auto-fill)" },
];

const TOTAL_STEPS = 7;

export default function ExamSetupWizard({ user, navigate, onComplete }) {
  const [step, setStep]       = useState(1);
  const [saving, setSaving]   = useState(false);

  // Step 1
  const [classVal, setClassVal] = useState(user?.class || "");
  const [board, setBoard]       = useState(user?.board || "");

  // Step 2
  const [subjects, setSubjects] = useState([]);

  // Step 3 — exam dates per subject
  const [examDates, setExamDates] = useState({});

  // Step 4 — syllabus per subject (simple: full or custom topics)
  const [syllabusMode, setSyllabusMode] = useState({}); // "full" | "custom"
  const [customTopics, setCustomTopics] = useState({});

  // Step 5 — exam pattern per subject
  const [patterns, setPatterns] = useState({});

  // Step 6 — daily study time
  const [studyTime, setStudyTime] = useState("");

  // Step 7 — confidence per subject
  const [confidence, setConfidence] = useState({});

  const toggleSubject = (s) =>
    setSubjects((p) => p.includes(s) ? p.filter((x) => x !== s) : [...p, s]);

  const canNext = () => {
    if (step === 1) return classVal && board;
    if (step === 2) return subjects.length > 0;
    if (step === 3) return subjects.every((s) => examDates[s]);
    if (step === 4) return subjects.every((s) => syllabusMode[s]);
    if (step === 5) return subjects.every((s) => patterns[s]);
    if (step === 6) return !!studyTime;
    if (step === 7) return subjects.every((s) => confidence[s]);
    return true;
  };

  const handleFinish = async () => {
    setSaving(true);
    const profile = {
      class: classVal,
      board,
      subjects: subjects.map((s) => ({
        name: s,
        examDate: examDates[s] || "",
        daysLeft: examDates[s] ? Math.max(0, Math.ceil((new Date(examDates[s]) - new Date()) / 86400000)) : 0,
        syllabusMode: syllabusMode[s] || "full",
        topics: syllabusMode[s] === "custom" ? (customTopics[s] || "").split(",").map((t) => t.trim()).filter(Boolean) : [],
        pattern: patterns[s] || "mixed",
        confidence: confidence[s] || "medium",
      })),
      dailyStudyMinutes: parseInt(studyTime) || 60,
    };
    try {
      const r = await api.post("/student/exam-prep/setup", profile);
      onComplete(r.data);
    } catch {
      // fallback: use local profile with empty plan
      onComplete({ ...profile, studyPlan: [], readiness: {} });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#f6f6f8] to-[#ede9ff]" style={{ fontFamily: "'Lexend', sans-serif" }}>
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-white/80 backdrop-blur-md border-b border-gray-200">
        <div className="max-w-lg mx-auto px-6 h-14 flex items-center justify-between">
          <button onClick={() => navigate("/student")} className="p-2 hover:bg-gray-100 rounded-lg">
            <span className="material-symbols-outlined text-gray-600">arrow_back</span>
          </button>
          <p className="text-sm font-bold text-gray-500">Step {step} of {TOTAL_STEPS}</p>
          <div className="size-8" />
        </div>
        {/* Progress bar */}
        <div className="h-1 bg-gray-100">
          <div className="h-full bg-[#695be6] transition-all duration-500" style={{ width: `${(step / TOTAL_STEPS) * 100}%` }} />
        </div>
      </header>

      <main className="max-w-lg mx-auto pt-20 px-6 pb-32">
        {/* Step 1: Class & Board */}
        {step === 1 && (
          <WizardCard
            emoji="🏫"
            title="Let's get started!"
            subtitle="Which class are you in and which board do you follow?"
          >
            <div className="space-y-4">
              <div>
                <p className="text-xs font-bold text-gray-500 uppercase mb-2">Class</p>
                <div className="flex gap-2 flex-wrap">
                  {CLASSES.map((c) => (
                    <button key={c} onClick={() => setClassVal(c)}
                      className={`px-4 py-2 rounded-xl border-2 font-bold text-sm transition-all ${classVal === c ? "border-[#695be6] bg-[#695be6]/5 text-[#695be6]" : "border-gray-200 text-gray-600 hover:border-gray-300"}`}>
                      Class {c}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <p className="text-xs font-bold text-gray-500 uppercase mb-2">Board</p>
                <div className="flex gap-2 flex-wrap">
                  {BOARDS.map((b) => (
                    <button key={b} onClick={() => setBoard(b)}
                      className={`px-4 py-2 rounded-xl border-2 font-bold text-sm transition-all ${board === b ? "border-[#695be6] bg-[#695be6]/5 text-[#695be6]" : "border-gray-200 text-gray-600 hover:border-gray-300"}`}>
                      {b}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </WizardCard>
        )}

        {/* Step 2: Subjects */}
        {step === 2 && (
          <WizardCard emoji="📚" title="Which subjects do you have exams for?" subtitle="Select all that apply">
            <div className="space-y-2">
              <button onClick={() => setSubjects(subjects.length === SUBJECTS.length ? [] : [...SUBJECTS])}
                className="w-full py-2 border-2 border-dashed border-[#695be6]/40 text-[#695be6] font-bold text-sm rounded-xl hover:bg-[#695be6]/5">
                {subjects.length === SUBJECTS.length ? "Deselect All" : "Select All"}
              </button>
              {SUBJECTS.map((s) => (
                <button key={s} onClick={() => toggleSubject(s)}
                  className={`w-full flex items-center gap-3 p-4 rounded-xl border-2 text-left transition-all ${subjects.includes(s) ? "border-[#695be6] bg-[#695be6]/5" : "border-gray-200 hover:border-gray-300"}`}>
                  <div className={`size-5 rounded border-2 flex items-center justify-center flex-shrink-0 ${subjects.includes(s) ? "bg-[#695be6] border-[#695be6]" : "border-gray-300"}`}>
                    {subjects.includes(s) && <span className="material-symbols-outlined text-white text-xs">check</span>}
                  </div>
                  <span className="font-semibold text-sm">{s}</span>
                </button>
              ))}
            </div>
          </WizardCard>
        )}

        {/* Step 3: Exam Dates */}
        {step === 3 && (
          <WizardCard emoji="📅" title="When are your exams?" subtitle="Set a date for each subject">
            <div className="space-y-3">
              {subjects.map((s) => {
                const days = examDates[s] ? Math.max(0, Math.ceil((new Date(examDates[s]) - new Date()) / 86400000)) : null;
                return (
                  <div key={s} className="bg-gray-50 rounded-xl p-4 border border-gray-200">
                    <p className="text-sm font-bold mb-2">{s}</p>
                    <input type="date" value={examDates[s] || ""}
                      onChange={(e) => setExamDates({ ...examDates, [s]: e.target.value })}
                      className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-[#695be6]" />
                    {days !== null && (
                      <p className="text-xs text-[#695be6] font-bold mt-1.5">👉 You have {days} days left</p>
                    )}
                  </div>
                );
              })}
            </div>
          </WizardCard>
        )}

        {/* Step 4: Syllabus */}
        {step === 4 && (
          <WizardCard emoji="📖" title="What topics are included?" subtitle="Choose syllabus coverage per subject">
            <div className="space-y-4">
              {subjects.map((s) => (
                <div key={s} className="bg-gray-50 rounded-xl p-4 border border-gray-200">
                  <p className="text-sm font-bold mb-3">{s}</p>
                  <div className="flex gap-2 mb-3">
                    {["full", "custom"].map((m) => (
                      <button key={m} onClick={() => setSyllabusMode({ ...syllabusMode, [s]: m })}
                        className={`flex-1 py-2 rounded-lg border-2 text-xs font-bold transition-all ${syllabusMode[s] === m ? "border-[#695be6] bg-[#695be6]/5 text-[#695be6]" : "border-gray-200 text-gray-600"}`}>
                        {m === "full" ? "Full Syllabus" : "Select Topics"}
                      </button>
                    ))}
                  </div>
                  {syllabusMode[s] === "custom" && (
                    <textarea
                      value={customTopics[s] || ""}
                      onChange={(e) => setCustomTopics({ ...customTopics, [s]: e.target.value })}
                      placeholder="Enter topics separated by commas (e.g. Quadratic Equations, Trigonometry)"
                      rows={2}
                      className="w-full border border-gray-200 rounded-lg px-3 py-2 text-xs outline-none focus:border-[#695be6] resize-none"
                    />
                  )}
                  {syllabusMode[s] && (
                    <p className="text-xs text-green-600 font-bold mt-1.5">
                      ✅ {syllabusMode[s] === "full" ? "Full syllabus selected" : `Custom topics for ${s}`}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </WizardCard>
        )}

        {/* Step 5: Exam Pattern */}
        {step === 5 && (
          <WizardCard emoji="📝" title="What's your exam pattern?" subtitle="Select the format for each subject">
            <div className="space-y-4">
              {subjects.map((s) => (
                <div key={s} className="bg-gray-50 rounded-xl p-4 border border-gray-200">
                  <p className="text-sm font-bold mb-3">{s}</p>
                  <div className="grid grid-cols-2 gap-2">
                    {EXAM_PATTERNS.map((p) => (
                      <button key={p.id} onClick={() => setPatterns({ ...patterns, [s]: p.id })}
                        className={`py-2 px-3 rounded-lg border-2 text-xs font-semibold text-left transition-all ${patterns[s] === p.id ? "border-[#695be6] bg-[#695be6]/5 text-[#695be6]" : "border-gray-200 text-gray-600 hover:border-gray-300"}`}>
                        {p.label}
                      </button>
                    ))}
                  </div>
                  {patterns[s] && (
                    <p className="text-xs text-green-600 font-bold mt-2">
                      ✅ {EXAM_PATTERNS.find((p) => p.id === patterns[s])?.label} selected
                    </p>
                  )}
                </div>
              ))}
            </div>
          </WizardCard>
        )}

        {/* Step 6: Daily Study Time */}
        {step === 6 && (
          <WizardCard emoji="⏱" title="How much time can you study daily?" subtitle="We'll build your plan around this">
            <div className="grid grid-cols-2 gap-3">
              {STUDY_TIMES.map((t) => (
                <button key={t.id} onClick={() => setStudyTime(t.id)}
                  className={`py-4 rounded-xl border-2 font-bold text-sm transition-all ${studyTime === t.id ? "border-[#695be6] bg-[#695be6]/5 text-[#695be6]" : "border-gray-200 text-gray-600 hover:border-gray-300"}`}>
                  {t.label}
                </button>
              ))}
            </div>
          </WizardCard>
        )}

        {/* Step 7: Confidence */}
        {step === 7 && (
          <WizardCard emoji="😊" title="How confident are you?" subtitle="Rate your confidence in each subject">
            <div className="space-y-3">
              {subjects.map((s) => (
                <div key={s} className="bg-gray-50 rounded-xl p-4 border border-gray-200">
                  <p className="text-sm font-bold mb-3">{s}</p>
                  <div className="flex gap-2">
                    {CONFIDENCE.map((c) => (
                      <button key={c.id} onClick={() => setConfidence({ ...confidence, [s]: c.id })}
                        className={`flex-1 py-2.5 rounded-xl border-2 text-center transition-all ${confidence[s] === c.id ? "border-[#695be6] bg-[#695be6]/5" : "border-gray-200 hover:border-gray-300"}`}>
                        <p className="text-xl">{c.emoji}</p>
                        <p className={`text-xs font-bold mt-0.5 ${confidence[s] === c.id ? "text-[#695be6]" : "text-gray-500"}`}>{c.label}</p>
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </WizardCard>
        )}
      </main>

      {/* Footer CTA */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 px-6 py-4">
        <div className="max-w-lg mx-auto">
          {step < TOTAL_STEPS ? (
            <button onClick={() => setStep((s) => s + 1)} disabled={!canNext()}
              className="w-full bg-[#695be6] text-white font-black py-4 rounded-xl hover:bg-[#5a4dd4] transition-colors disabled:opacity-50 flex items-center justify-center gap-2">
              Continue <span className="material-symbols-outlined">arrow_forward</span>
            </button>
          ) : (
            <button onClick={handleFinish} disabled={!canNext() || saving}
              className="w-full bg-[#695be6] text-white font-black py-4 rounded-xl hover:bg-[#5a4dd4] transition-colors disabled:opacity-50 flex items-center justify-center gap-2">
              {saving ? (
                <><span className="size-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Generating your plan...</>
              ) : (
                <><span className="material-symbols-outlined">auto_awesome</span> Create My Study Plan ✨</>
              )}
            </button>
          )}
          {step > 1 && (
            <button onClick={() => setStep((s) => s - 1)} className="w-full mt-2 py-2 text-sm text-gray-400 font-semibold hover:text-gray-600">
              ← Back
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function WizardCard({ emoji, title, subtitle, children }) {
  return (
    <div className="pt-4">
      <div className="text-center mb-6">
        <p className="text-4xl mb-3">{emoji}</p>
        <h2 className="text-xl font-black text-gray-800">{title}</h2>
        <p className="text-sm text-gray-400 mt-1">{subtitle}</p>
      </div>
      {children}
    </div>
  );
}
