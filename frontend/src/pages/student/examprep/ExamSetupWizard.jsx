import { useState } from "react";
import api from "../../../api";

const SUBJECTS = ["Maths", "Science", "English", "Social", "Hindi"];
const BOARDS   = ["CBSE", "ICSE", "State Board"];
const CLASSES  = ["6", "7", "8", "9", "10"];
const STUDY_TIMES = [
  { id: "30",  label: "30 mins" },
  { id: "60",  label: "1 hour" },
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
const STATE_BOARDS = [
  "Andhra Pradesh","Arunachal Pradesh","Assam","Bihar","Chhattisgarh","Goa","Gujarat",
  "Haryana","Himachal Pradesh","Jharkhand","Karnataka","Kerala","Madhya Pradesh",
  "Maharashtra","Manipur","Meghalaya","Mizoram","Nagaland","Odisha","Punjab",
  "Rajasthan","Sikkim","Tamil Nadu","Telangana","Tripura","Uttar Pradesh",
  "Uttarakhand","West Bengal","Delhi","Jammu & Kashmir",
];

const TOTAL_STEPS = 8;

// Bug 2 fix: parse date string as local midnight, not UTC midnight
const parseLocalDate = (d) => {
  if (!d) return null;
  const [y, m, day] = d.split("-");
  return new Date(Number(y), Number(m) - 1, Number(day));
};
const daysUntil = (dateStr) =>
  dateStr ? Math.max(0, Math.ceil((parseLocalDate(dateStr) - new Date()) / 86400000)) : 0;

export default function ExamSetupWizard({ user, navigate, onComplete }) {
  const [step, setStep]     = useState(1);
  const [saving, setSaving] = useState(false);

  // Step 1
  const [classVal, setClassVal] = useState(user?.class || "");
  const [board, setBoard]       = useState(user?.board || "");
  const [stateBoard, setStateBoard] = useState("");

  // Step 2
  const [subjects, setSubjects] = useState([]);

  // Step 3 — exam dates
  const [examDates, setExamDates] = useState({});

  // Step 4 — syllabus
  const [syllabusMode, setSyllabusMode] = useState({});
  const [customTopics, setCustomTopics] = useState({});

  // Step 5 — exam pattern
  const [patterns, setPatterns] = useState({});

  // Step 6 — daily study time
  const [studyTime, setStudyTime] = useState("");

  // Step 7 — confidence
  const [confidence, setConfidence] = useState({});

  // Step 8 — self-assessment quiz
  const [quizChoice, setQuizChoice]         = useState(null); // "yes" | "skip"
  const [quizSubject, setQuizSubject]       = useState(null);
  const [quizData, setQuizData]             = useState(null);
  const [quizLoading, setQuizLoading]       = useState(false);
  const [quizAnswers, setQuizAnswers]       = useState({});
  const [quizSubmitted, setQuizSubmitted]   = useState(false);
  const [quizScores, setQuizScores]         = useState({});   // {subject: pct}
  const [quizSubjectIdx, setQuizSubjectIdx] = useState(0);

  const toggleSubject = (s) =>
    setSubjects((p) => p.includes(s) ? p.filter((x) => x !== s) : [...p, s]);

  const canNext = () => {
    if (step === 1) return classVal && board && (board !== "State Board" || stateBoard);
    if (step === 2) return subjects.length > 0;
    if (step === 3) return subjects.every((s) => examDates[s]);
    if (step === 4) return subjects.every((s) => syllabusMode[s]);
    if (step === 5) return subjects.every((s) => patterns[s]);
    if (step === 6) return !!studyTime;
    if (step === 7) return subjects.every((s) => confidence[s]);
    if (step === 8) return quizChoice !== null;
    return true;
  };

  const loadQuiz = (subjectName) => {
    setQuizSubject(subjectName);
    setQuizData(null);
    setQuizAnswers({});
    setQuizSubmitted(false);
    setQuizLoading(true);
    const topics = syllabusMode[subjectName] === "custom"
      ? (customTopics[subjectName] || "").split(",").map((t) => t.trim()).filter(Boolean)
      : [];
    api.post("/student/exam-prep/self-assessment-quiz", {
      subject: subjectName,
      class: classVal,
      board,
      topics,
    })
      .then((r) => setQuizData(r.data))
      .catch(() => setQuizData({ questions: [], error: true }))
      .finally(() => setQuizLoading(false));
  };

  const submitQuiz = () => {
    if (!quizData?.questions) return;
    let correct = 0;
    quizData.questions.forEach((q) => {
      const chosen = quizAnswers[q.id];
      const correctOpt = q.options.find((o) => o.is_correct);
      if (chosen === correctOpt?.id) correct++;
    });
    const pct = Math.round((correct / quizData.questions.length) * 100);
    setQuizScores((prev) => ({ ...prev, [quizSubject]: pct }));
    setQuizSubmitted(true);
  };

  const nextQuizSubject = () => {
    const next = quizSubjectIdx + 1;
    if (next < subjects.length) {
      setQuizSubjectIdx(next);
      loadQuiz(subjects[next]);
    } else {
      // All subjects done — finish
      doFinish();
    }
  };

  const [saveError, setSaveError] = useState(null);

  const doFinish = async () => {
    setSaving(true);
    setSaveError(null);
    const profile = {
      class: classVal,
      board,
      stateBoard: board === "State Board" ? stateBoard : undefined,
      subjects: subjects.map((s) => ({
        name: s,
        examDate: examDates[s] || "",
        daysLeft: daysUntil(examDates[s]),
        syllabusMode: syllabusMode[s] || "full",
        topics: syllabusMode[s] === "custom" ? (customTopics[s] || "").split(",").map((t) => t.trim()).filter(Boolean) : [],
        pattern: patterns[s] || "mixed",
        confidence: confidence[s] || "medium",
        state: board === "State Board" ? stateBoard : undefined,
      })),
      dailyStudyMinutes: parseInt(studyTime) || 60,
      selfAssessmentScores: Object.keys(quizScores).length ? quizScores : null,
    };
    try {
      const r = await api.post("/student/exam-prep/setup", profile);
      onComplete(r.data);
    } catch (err) {
      const status = err.response?.status;
      const detail = err.response?.data?.detail;
      // If the API endpoint isn't available yet, fall back to a local plan
      if (status === 404 || !status) {
        const fallbackProfile = {
          ...profile,
          studyPlan: [],
          readiness: Object.fromEntries(profile.subjects.map((s) => [s.name, 50])),
          aiInsights: ["Keep studying consistently to improve your readiness!"],
          currentMode: "regular",
          weakTopics: {},
        };
        onComplete(fallbackProfile);
        return;
      }
      const msg = detail && detail !== "Not Found"
        ? detail
        : "Failed to save your study plan. Please try again.";
      setSaveError(msg);
    } finally {
      setSaving(false);
    }
  };

  const handleFinish = () => {
    if (quizChoice === "yes" && subjects.length > 0) {
      setQuizSubjectIdx(0);
      loadQuiz(subjects[0]);
    } else {
      doFinish();
    }
  };

  // If quiz is active, show quiz UI
  if (quizChoice === "yes" && quizSubject) {
    return (
      <QuizScreen
        subject={quizSubject}
        quizData={quizData}
        loading={quizLoading}
        answers={quizAnswers}
        submitted={quizSubmitted}
        score={quizScores[quizSubject]}
        totalSubjects={subjects.length}
        currentIdx={quizSubjectIdx}
        nextSubjectName={subjects[quizSubjectIdx + 1] || null}
        onAnswer={(qid, optId) => !quizSubmitted && setQuizAnswers((p) => ({ ...p, [qid]: optId }))}
        onSubmit={submitQuiz}
        onNext={nextQuizSubject}
        onSkipAll={doFinish}
        saving={saving}
        navigate={navigate}
      />
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#f6f6f8] to-[#ede9ff]" style={{ fontFamily: "'Lexend', sans-serif" }}>
      <header className="fixed top-0 left-0 right-0 z-50 bg-white/80 backdrop-blur-md border-b border-gray-200">
        <div className="max-w-lg mx-auto px-6 h-14 flex items-center justify-between">
          <button onClick={() => navigate("/student")} className="p-2 hover:bg-gray-100 rounded-lg">
            <span className="material-symbols-outlined text-gray-600">arrow_back</span>
          </button>
          <p className="text-sm font-bold text-gray-500">Step {step} of {TOTAL_STEPS}</p>
          <div className="size-8" />
        </div>
        <div className="h-1 bg-gray-100">
          <div className="h-full bg-[#695be6] transition-all duration-500" style={{ width: `${(step / TOTAL_STEPS) * 100}%` }} />
        </div>
      </header>

      <main className="max-w-lg mx-auto pt-20 px-6 pb-32">

        {/* Step 1: Class & Board */}
        {step === 1 && (
          <WizardCard emoji="🏫" title="Let's get started!" subtitle="Which class are you in and which board do you follow?">
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
                    <button key={b} onClick={() => { setBoard(b); setStateBoard(""); }}
                      className={`px-4 py-2 rounded-xl border-2 font-bold text-sm transition-all ${board === b ? "border-[#695be6] bg-[#695be6]/5 text-[#695be6]" : "border-gray-200 text-gray-600 hover:border-gray-300"}`}>
                      {b}
                    </button>
                  ))}
                </div>
              </div>
              {board === "State Board" && (
                <div>
                  <p className="text-xs font-bold text-gray-500 uppercase mb-2">Select Your State</p>
                  <select
                    value={stateBoard}
                    onChange={(e) => setStateBoard(e.target.value)}
                    className="w-full border-2 border-gray-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-[#695be6] bg-white font-semibold"
                  >
                    <option value="">— Select State —</option>
                    {STATE_BOARDS.map((s) => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
              )}
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
                const days = daysUntil(examDates[s]);
                return (
                  <div key={s} className="bg-gray-50 rounded-xl p-4 border border-gray-200">
                    <p className="text-sm font-bold mb-2">{s}</p>
                    <input type="date" value={examDates[s] || ""}
                      onChange={(e) => setExamDates({ ...examDates, [s]: e.target.value })}
                      className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-[#695be6]" />
                    {examDates[s] && <p className="text-xs text-[#695be6] font-bold mt-1.5">👉 {days} days left</p>}
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
                    <textarea value={customTopics[s] || ""}
                      onChange={(e) => setCustomTopics({ ...customTopics, [s]: e.target.value })}
                      placeholder="Enter topics separated by commas"
                      rows={2}
                      className="w-full border border-gray-200 rounded-lg px-3 py-2 text-xs outline-none focus:border-[#695be6] resize-none" />
                  )}
                  {syllabusMode[s] === "full" && (
                    <p className="text-xs text-green-600 font-bold mt-1.5">✅ AI will use the full {board}{board === "State Board" && stateBoard ? ` (${stateBoard})` : ""} Class {classVal} {s} syllabus</p>
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

        {/* Step 8: Self-Assessment Quiz */}
        {step === 8 && (
          <WizardCard emoji="🧠" title="Quick check before we start?" subtitle="A 5-question quiz per subject helps us calibrate your plan more accurately">
            <div className="space-y-3">
              <button onClick={() => setQuizChoice("yes")}
                className={`w-full flex items-center gap-4 p-4 rounded-xl border-2 text-left transition-all ${quizChoice === "yes" ? "border-[#695be6] bg-[#695be6]/5" : "border-gray-200 hover:border-gray-300"}`}>
                <div className={`size-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${quizChoice === "yes" ? "bg-[#695be6] border-[#695be6]" : "border-gray-300"}`}>
                  {quizChoice === "yes" && <span className="size-2 rounded-full bg-white block" />}
                </div>
                <div>
                  <p className="font-bold text-sm">Yes, start the quiz</p>
                  <p className="text-xs text-gray-400 mt-0.5">5 questions per subject · Takes ~2 mins · Improves your plan accuracy</p>
                </div>
              </button>
              <button onClick={() => setQuizChoice("skip")}
                className={`w-full flex items-center gap-4 p-4 rounded-xl border-2 text-left transition-all ${quizChoice === "skip" ? "border-[#695be6] bg-[#695be6]/5" : "border-gray-200 hover:border-gray-300"}`}>
                <div className={`size-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${quizChoice === "skip" ? "bg-[#695be6] border-[#695be6]" : "border-gray-300"}`}>
                  {quizChoice === "skip" && <span className="size-2 rounded-full bg-white block" />}
                </div>
                <div>
                  <p className="font-bold text-sm">Skip for now</p>
                  <p className="text-xs text-gray-400 mt-0.5">We'll use your confidence ratings to build the plan</p>
                </div>
              </button>
            </div>
          </WizardCard>
        )}
      </main>

      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 px-6 py-4">
        <div className="max-w-lg mx-auto">
          {saveError && (
            <p className="text-xs text-red-500 font-semibold text-center mb-2">⚠ {saveError}</p>
          )}
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
              ) : quizChoice === "yes" ? (
                <><span className="material-symbols-outlined">quiz</span> Start Self-Assessment ✨</>
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

// ── Self-Assessment Quiz Screen ───────────────────────────────────────────────
function QuizScreen({ subject, quizData, loading, answers, submitted, score, totalSubjects, currentIdx, nextSubjectName, onAnswer, onSubmit, onNext, onSkipAll, saving, navigate }) {
  if (loading) return (
    <div className="min-h-screen bg-gradient-to-br from-[#f6f6f8] to-[#ede9ff] flex flex-col items-center justify-center gap-3" style={{ fontFamily: "'Lexend', sans-serif" }}>
      <span className="size-10 border-2 border-[#695be6]/30 border-t-[#695be6] rounded-full animate-spin" />
      <p className="text-sm text-gray-500">Generating {subject} quiz...</p>
    </div>
  );

  if (!quizData?.questions?.length) return (
    <div className="min-h-screen bg-gradient-to-br from-[#f6f6f8] to-[#ede9ff] flex flex-col items-center justify-center gap-4 px-6" style={{ fontFamily: "'Lexend', sans-serif" }}>
      <span className="text-4xl">😕</span>
      <p className="text-sm text-gray-500 text-center">Couldn't load quiz for {subject}. Skipping to next.</p>
      <button onClick={onNext} className="px-6 py-3 bg-[#695be6] text-white font-bold rounded-xl text-sm">
        {currentIdx + 1 < totalSubjects ? "Next Subject →" : "Create My Plan ✨"}
      </button>
    </div>
  );

  const allAnswered = quizData.questions.every((q) => answers[q.id]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#f6f6f8] to-[#ede9ff] pb-32" style={{ fontFamily: "'Lexend', sans-serif" }}>
      <header className="fixed top-0 left-0 right-0 z-50 bg-white/80 backdrop-blur-md border-b border-gray-200">
        <div className="max-w-lg mx-auto px-6 h-14 flex items-center justify-between">
          <button onClick={() => navigate("/student")} className="p-2 hover:bg-gray-100 rounded-lg">
            <span className="material-symbols-outlined text-gray-600">arrow_back</span>
          </button>
          <p className="text-sm font-bold text-gray-700">Self-Assessment · {subject}</p>
          <p className="text-xs text-gray-400">{currentIdx + 1}/{totalSubjects}</p>
        </div>
        <div className="h-1 bg-gray-100">
          <div className="h-full bg-[#695be6] transition-all" style={{ width: `${((currentIdx + 1) / totalSubjects) * 100}%` }} />
        </div>
      </header>

      <main className="max-w-lg mx-auto pt-20 px-6 space-y-4">
        {submitted ? (
          <div className="pt-8 text-center space-y-4">
            <p className="text-5xl">{score >= 80 ? "🎉" : score >= 50 ? "👍" : "💪"}</p>
            <p className="font-black text-2xl text-gray-800">{score}%</p>
            <p className="text-sm text-gray-500">
              {score >= 80 ? "Great job! You know this subject well." : score >= 50 ? "Good foundation — a bit more practice will help." : "Needs more focus — we'll prioritize this in your plan."}
            </p>
            <div className="space-y-3 text-left mt-4">
              {quizData.questions.map((q, i) => {
                const correctOpt = q.options.find((o) => o.is_correct);
                const chosen = answers[q.id];
                const isRight = chosen === correctOpt?.id;
                return (
                  <div key={q.id} className={`p-4 rounded-xl border-2 ${isRight ? "border-green-200 bg-green-50" : "border-red-200 bg-red-50"}`}>
                    <p className="text-xs font-bold text-gray-500 mb-1">Q{i + 1} · {q.topic}</p>
                    <p className="text-sm font-semibold text-gray-800 mb-2">{q.question}</p>
                    <p className={`text-xs font-bold ${isRight ? "text-green-700" : "text-red-700"}`}>
                      {isRight ? "✅ Correct" : `❌ Your answer: ${q.options.find((o) => o.id === chosen)?.text || "—"}`}
                    </p>
                    {!isRight && <p className="text-xs text-gray-600 mt-1">✅ Correct: {correctOpt?.text}</p>}
                    <p className="text-xs text-gray-500 mt-1 italic">{q.explanation}</p>
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          <>
            <div className="pt-4 text-center mb-2">
              <p className="text-3xl mb-2">🧠</p>
              <p className="font-black text-lg text-gray-800">{subject} — Quick Check</p>
              <p className="text-xs text-gray-400">Answer all 5 questions to calibrate your plan</p>
            </div>
            {quizData.questions.map((q, i) => (
              <div key={q.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
                <p className="text-xs font-bold text-[#695be6] mb-2">Q{i + 1} · {q.topic}</p>
                <p className="text-sm font-semibold text-gray-800 mb-3">{q.question}</p>
                <div className="space-y-2">
                  {q.options.map((opt) => (
                    <button key={opt.id} onClick={() => onAnswer(q.id, opt.id)}
                      className={`w-full text-left px-4 py-2.5 rounded-xl border-2 text-sm font-semibold transition-all ${answers[q.id] === opt.id ? "border-[#695be6] bg-[#695be6]/5 text-[#695be6]" : "border-gray-200 text-gray-700 hover:border-gray-300"}`}>
                      <span className="font-black mr-2">{opt.id}.</span>{opt.text}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </>
        )}
      </main>

      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 px-6 py-4">
        <div className="max-w-lg mx-auto space-y-2">
          {!submitted ? (
            <button onClick={onSubmit} disabled={!allAnswered}
              className="w-full bg-[#695be6] text-white font-black py-4 rounded-xl hover:bg-[#5a4dd4] transition-colors disabled:opacity-50">
              Submit Answers
            </button>
          ) : (
            <button onClick={onNext} disabled={saving}
              className="w-full bg-[#695be6] text-white font-black py-4 rounded-xl hover:bg-[#5a4dd4] transition-colors disabled:opacity-50 flex items-center justify-center gap-2">
              {saving ? <><span className="size-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Generating plan...</> :
                currentIdx + 1 < totalSubjects ? `Next: ${nextSubjectName} →` : "Create My Study Plan ✨"}
            </button>
          )}
          <button onClick={onSkipAll} className="w-full py-2 text-sm text-gray-400 font-semibold hover:text-gray-600">
            Skip remaining quizzes
          </button>
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
