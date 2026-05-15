import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import api from "../../../api";
import PracticeMode from "./PracticeMode";
import NotesTab from "./NotesTab";

const SUBJECT_COLORS = {
  Maths:   "from-[#695be6] to-[#8e82f3]",
  Science: "from-orange-400 to-amber-500",
  English: "from-blue-400 to-indigo-500",
  Social:  "from-green-400 to-teal-500",
  Hindi:   "from-pink-400 to-rose-500",
};
const CONFIDENCE_EMOJI = { low: "😰", medium: "😐", high: "😎" };

const MODE_META = {
  regular:   { label: "Regular Mode",   color: "bg-blue-100 text-blue-700",   icon: "school",        desc: "Learning + Practice" },
  revision:  { label: "Revision Mode",  color: "bg-amber-100 text-amber-700", icon: "replay",        desc: "Notes + Important Questions" },
  last_day:  { label: "Last-Day Mode",  color: "bg-red-100 text-red-700",     icon: "emergency_home", desc: "Ultra-short revision only" },
};

export default function ExamDashboard({ user, navigate, profile, onReset, onProfileUpdate }) {
  const [activeTab, setActiveTab]   = useState("today");
  const [studyPlan, setStudyPlan]   = useState(profile.studyPlan || []);
  const [readiness, setReadiness]   = useState(profile.readiness || {});
  const [aiInsights, setAiInsights] = useState(profile.aiInsights || []);
  const [currentMode, setCurrentMode] = useState(profile.currentMode || "regular");
  const [weakTopics, setWeakTopics]   = useState(profile.weakTopics || {});
  const [loadingPlan, setLoadingPlan] = useState(!profile.studyPlan?.length);
  const [practiceSubject, setPracticeSubject] = useState(null);
  const [notesSubject, setNotesSubject]       = useState(null);

  useEffect(() => {
    if (!profile.studyPlan?.length) {
      api.get("/student/exam-prep/plan")
        .then((r) => {
          setStudyPlan(r.data.studyPlan || []);
          setReadiness(r.data.readiness || {});
          setAiInsights(r.data.aiInsights || []);
          setCurrentMode(r.data.currentMode || "regular");
          setWeakTopics(r.data.weakTopics || {});
        })
        .catch(() => {})
        .finally(() => setLoadingPlan(false));
    } else {
      setLoadingPlan(false);
    }
  }, [profile]);

  // Bug 2 fix: parse date as local midnight, not UTC midnight
  const parseLocalDate = (d) => {
    if (!d) return null;
    const [y, m, day] = d.split("-");
    return new Date(Number(y), Number(m) - 1, Number(day));
  };

  // Recalculate daysLeft fresh from examDate (stored value goes stale)
  const freshSubjects = (profile.subjects || []).map((s) => ({
    ...s,
    daysLeft: s.examDate
      ? Math.max(0, Math.ceil((parseLocalDate(s.examDate) - new Date()) / 86400000))
      : s.daysLeft,
  }));

  // Bug 1 fix: Math.min(...[]) === Infinity — guard with explicit length check
  const daysArr = freshSubjects.map((s) => s.daysLeft).filter((d) => d > 0);
  const minDaysLeft = daysArr.length ? Math.min(...daysArr) : 0;
  const derivedMode = minDaysLeft <= 1 ? "last_day" : minDaysLeft <= 5 ? "revision" : "regular";
  const activeMode  = derivedMode !== "regular" ? derivedMode : currentMode;
  const allExamsPast = freshSubjects.length > 0 && freshSubjects.every((s) => s.daysLeft === 0);

  const handleSessionToggle = async (dayNum, sessionIdx, done, subject, scorePct) => {
    // Optimistic update
    setStudyPlan((prev) => prev.map((d) =>
      d.day === dayNum
        ? { ...d, sessions: d.sessions.map((s, i) => i === sessionIdx ? { ...s, done } : s) }
        : d
    ));
    try {
      const r = await api.post("/student/exam-prep/session-progress", {
        day: dayNum, session_index: sessionIdx, done, subject, score_pct: scorePct ?? null,
      });
      if (r.data.readiness) setReadiness(r.data.readiness);
    } catch { /* silent */ }
  };

  if (practiceSubject) return <PracticeMode subject={practiceSubject} profile={{ ...profile, subjects: freshSubjects, weakTopics }} onBack={() => setPracticeSubject(null)} />;
  if (notesSubject)    return <NotesTab subject={notesSubject} profile={{ ...profile, subjects: freshSubjects, weakTopics }} onBack={() => setNotesSubject(null)} />;

  const modeMeta = MODE_META[activeMode] || MODE_META.regular;
  const today = studyPlan[0] || null;
  const totalDailyMins = profile.dailyStudyMinutes || 60;

  return (
    <div className="min-h-screen bg-[#f6f6f8] pb-24" style={{ fontFamily: "'Lexend', sans-serif" }}>
      <header className="fixed top-0 left-0 right-0 z-50 bg-white/90 backdrop-blur-md border-b border-gray-200">
        <div className="max-w-2xl mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button onClick={() => navigate("/student/exam-prep")} className="p-2 hover:bg-gray-100 rounded-lg">
              <span className="material-symbols-outlined text-gray-600 text-xl">arrow_back</span>
            </button>
            <div>
              <h1 className="font-black text-sm">Exam Preparation</h1>
              <p className="text-[10px] text-gray-400">Class {profile.class} · {profile.board}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className={`text-[10px] font-black px-2 py-1 rounded-full flex items-center gap-1 ${modeMeta.color}`}>
              <span className="material-symbols-outlined text-xs">{modeMeta.icon}</span>
              {modeMeta.label}
            </span>
            <button
              onClick={async () => {
                setLoadingPlan(true);
                try {
                  const r = await api.post("/student/exam-prep/setup", {
                    class: profile.class,
                    board: profile.board,
                    state_board: profile.stateBoard,
                    subjects: profile.subjects,
                    daily_study_minutes: profile.dailyStudyMinutes,
                    self_assessment_scores: profile.selfAssessmentScores,
                  });
                  setStudyPlan(r.data.studyPlan || []);
                  setReadiness(r.data.readiness || {});
                  setAiInsights(r.data.aiInsights || []);
                  setCurrentMode(r.data.currentMode || "regular");
                  setWeakTopics(r.data.weakTopics || {});
                  const updated = { ...profile, ...r.data };
                  localStorage.setItem(`exam_prep_profile_${user?.id}`, JSON.stringify(updated));
                  if (onProfileUpdate) onProfileUpdate(updated);
                } catch { /* keep existing plan */ }
                finally { setLoadingPlan(false); }
              }}
              className="p-2 hover:bg-gray-100 rounded-lg"
              title="Refresh study plan based on latest performance"
            >
              <span className="material-symbols-outlined text-gray-400 text-xl">refresh</span>
            </button>
            <button onClick={onReset} className="p-2 hover:bg-gray-100 rounded-lg" title="Reset setup">
              <span className="material-symbols-outlined text-gray-400 text-xl">settings</span>
            </button>
          </div>
        </div>
        <div className="max-w-2xl mx-auto px-4 flex gap-1 pb-2">
          {[
            { id: "today",    label: "Today",     icon: "today" },
            { id: "plan",     label: "Full Plan",  icon: "calendar_month" },
            { id: "notes",    label: "Notes",      icon: "menu_book" },
            { id: "practice", label: "Practice",   icon: "quiz" },
          ].map((t) => (
            <button key={t.id} onClick={() => setActiveTab(t.id)}
              className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${activeTab === t.id ? "bg-[#695be6] text-white" : "text-gray-500 hover:bg-gray-100"}`}>
              <span className="material-symbols-outlined text-sm">{t.icon}</span>{t.label}
            </button>
          ))}
        </div>
      </header>

      <main className="max-w-2xl mx-auto pt-28 px-4 space-y-4">
        {activeTab === "today" && (
          <TodayView
            profile={{ ...profile, subjects: freshSubjects }} readiness={readiness} aiInsights={aiInsights}
            today={today} totalDailyMins={totalDailyMins} loadingPlan={loadingPlan}
            activeMode={activeMode} modeMeta={modeMeta} weakTopics={weakTopics}
            onPractice={setPracticeSubject} onNotes={setNotesSubject}
            onSessionToggle={handleSessionToggle}
            allExamsPast={allExamsPast} onReset={onReset}
          />
        )}
        {activeTab === "plan"     && <FullPlanTab studyPlan={studyPlan} loading={loadingPlan} onSessionToggle={handleSessionToggle} />}
        {activeTab === "notes"    && <SubjectPicker subjects={freshSubjects} colors={SUBJECT_COLORS} onSelect={setNotesSubject} label="Notes & Revision" sublabel="Short notes · Key concepts · Formulas" icon="arrow_forward" weakTopics={weakTopics} />}
        {activeTab === "practice" && <SubjectPicker subjects={freshSubjects} colors={SUBJECT_COLORS} onSelect={setPracticeSubject} label="Practice Mode" sublabel="MCQ · Short Answer · Adaptive" icon="play_arrow" weakTopics={weakTopics} />}
      </main>

      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 px-6 py-2 z-50">
        <div className="max-w-2xl mx-auto flex items-end justify-around h-14">
          {[
            { icon: "home",         label: "Home",     to: "/student" },
            { icon: "description",  label: "Homework", to: "/student/homework" },
            { icon: "auto_awesome", label: "LumiTutor",   to: "/student/vin-ai", fab: true },
            { icon: "bar_chart",    label: "Progress", to: "/student/learning-gaps" },
            { icon: "person",       label: "Profile",  to: "/student/portfolio" },
          ].map((item) =>
            item.fab ? (
              <Link key={item.label} to={item.to} className="flex flex-col items-center -mt-5 bg-[#695be6] text-white size-12 rounded-full shadow-lg shadow-[#695be6]/40 justify-center">
                <span className="material-symbols-outlined text-xl">{item.icon}</span>
              </Link>
            ) : (
              <Link key={item.label} to={item.to} className="flex flex-col items-center gap-0.5 text-gray-400 flex-1">
                <span className="material-symbols-outlined text-lg">{item.icon}</span>
                <span className="text-[9px] font-bold">{item.label}</span>
              </Link>
            )
          )}
        </div>
      </nav>
    </div>
  );
}

// ── Today View ────────────────────────────────────────────────────────────────
function TodayView({ profile, readiness, aiInsights, today, totalDailyMins, loadingPlan, activeMode, modeMeta, weakTopics, onPractice, onNotes, onSessionToggle, allExamsPast, onReset }) {
  return (
    <>
      {allExamsPast && (
        <div className="bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-2xl p-4 flex items-center justify-between gap-4">
          <div>
            <p className="font-black text-sm text-green-800">🎉 All exams completed!</p>
            <p className="text-xs text-green-600 mt-0.5">Ready to prep for new exams?</p>
          </div>
          <button
            onClick={onReset}
            className="shrink-0 flex items-center gap-1.5 bg-[#695be6] text-white text-xs font-bold px-3 py-2 rounded-xl hover:bg-[#5a4dd4] transition-colors"
          >
            <span className="material-symbols-outlined text-sm">replay</span>
            Start Over
          </button>
        </div>
      )}
      <ReadinessReport profile={profile} readiness={readiness} />

      {/* Mode Banner */}
      <div className={`rounded-xl px-4 py-3 flex items-center gap-3 border ${
        activeMode === "last_day" ? "bg-red-50 border-red-200" :
        activeMode === "revision" ? "bg-amber-50 border-amber-200" :
        "bg-blue-50 border-blue-200"
      }`}>
        <span className={`material-symbols-outlined text-xl ${
          activeMode === "last_day" ? "text-red-600" : activeMode === "revision" ? "text-amber-600" : "text-blue-600"
        }`}>{modeMeta.icon}</span>
        <div>
          <p className={`text-xs font-black ${activeMode === "last_day" ? "text-red-700" : activeMode === "revision" ? "text-amber-700" : "text-blue-700"}`}>{modeMeta.label}</p>
          <p className="text-xs text-gray-500">{modeMeta.desc}</p>
        </div>
      </div>

      {aiInsights.length > 0 && (
        <div className="space-y-2">
          {aiInsights.map((msg, i) => (
            <div key={i} className="bg-[#695be6]/5 border border-[#695be6]/20 rounded-xl px-4 py-3 flex items-start gap-2">
              <span className="text-base">🤖</span>
              <p className="text-xs text-gray-700">{msg}</p>
            </div>
          ))}
        </div>
      )}

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
          <div>
            <p className="font-black text-sm">📅 Today's Study Plan</p>
            <p className="text-xs text-gray-400">Total: {totalDailyMins} mins · {today?.sessions?.filter((s) => s.done).length || 0}/{today?.sessions?.length || 0} done</p>
          </div>
          <span className={`text-[10px] font-black px-2 py-1 rounded-full ${modeMeta.color}`}>{modeMeta.label}</span>
        </div>
        {loadingPlan ? (
          <div className="flex items-center justify-center py-10 gap-2">
            <span className="size-5 border-2 border-[#695be6]/30 border-t-[#695be6] rounded-full animate-spin" />
            <p className="text-xs text-gray-400">Building your personalized plan...</p>
          </div>
        ) : today?.sessions?.length ? (
          <div className="divide-y divide-gray-50">
            {today.sessions.map((session, i) => (
              <TodaySession
                key={i} session={session} dayNum={today.day} sessionIdx={i}
                isWeak={session.isWeakTopic || (weakTopics[session.subject] || []).some((w) => session.topic?.toLowerCase().includes(w.toLowerCase()))}
                onPractice={() => onPractice(session.subject)}
                onNotes={() => onNotes(session.subject)}
                onToggle={(done) => onSessionToggle(today.day, i, done, session.subject)}
              />
            ))}
          </div>
        ) : (
          <div className="py-10 text-center text-gray-400">
            <span className="material-symbols-outlined text-3xl mb-2 block">event_available</span>
            <p className="text-sm">No sessions planned for today</p>
          </div>
        )}
      </div>

      <div>
        <p className="text-sm font-black mb-2">📆 Upcoming Exams</p>
        <div className="space-y-2">
          {profile.subjects?.map((s) => (
            <ExamCard key={s.name} subject={s} readiness={readiness} />
          ))}
        </div>
      </div>
      <div className="bg-gradient-to-r from-[#695be6] to-[#8e82f3] rounded-xl p-5 text-white flex items-center justify-between gap-4">
        <div>
          <p className="font-bold text-sm">Need help with revision?</p>
          <p className="text-white/80 text-xs mt-0.5">Ask Vin to quiz you or explain a concept.</p>
        </div>
        <Link to="/student/vin-ai" className="shrink-0 px-4 py-2 bg-white text-[#695be6] font-bold rounded-full text-xs hover:bg-white/90 transition-colors">
          Ask Vin
        </Link>
      </div>
    </>
  );
}

function ReadinessReport({ profile, readiness }) {
  const subjects = profile.subjects || [];
  const avgReadiness = subjects.length
    ? Math.round(subjects.reduce((acc, s) => acc + (readiness[s.name] || 50), 0) / subjects.length)
    : 50;
  const weak = subjects.filter((s) => (readiness[s.name] || 50) < 55);
  const predicted = `${Math.max(50, avgReadiness - 10)}–${Math.min(100, avgReadiness + 10)}`;
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
      <p className="text-xs font-black text-[#695be6] uppercase tracking-wide mb-3">🟢 Readiness Report</p>
      <div className="flex items-center gap-4 mb-4">
        <div className="relative size-16 flex-shrink-0">
          <svg viewBox="0 0 36 36" className="size-16 -rotate-90">
            <circle cx="18" cy="18" r="15.9" fill="none" stroke="#e5e7eb" strokeWidth="3" />
            <circle cx="18" cy="18" r="15.9" fill="none" stroke="#695be6" strokeWidth="3"
              strokeDasharray={`${avgReadiness} ${100 - avgReadiness}`} strokeLinecap="round" />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-sm font-black">{avgReadiness}%</span>
          </div>
        </div>
        <div>
          <p className="text-xs text-gray-500">🎯 Predicted Score Range</p>
          <p className="font-black text-lg text-[#695be6]">{predicted} marks</p>
        </div>
      </div>
      <div className="space-y-2">
        {subjects.map((s) => {
          const pct = readiness[s.name] || 50;
          return (
            <div key={s.name}>
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-semibold text-gray-700">{s.name}</span>
                <span className={`text-xs font-bold ${pct < 55 ? "text-red-500" : pct >= 70 ? "text-green-600" : "text-amber-500"}`}>{pct}%</span>
              </div>
              <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                <div className={`h-full rounded-full ${pct < 55 ? "bg-red-400" : pct >= 70 ? "bg-green-400" : "bg-amber-400"}`} style={{ width: `${pct}%` }} />
              </div>
            </div>
          );
        })}
      </div>
      {weak.length > 0 && (
        <p className="text-xs text-amber-600 font-semibold mt-3">
          💡 Focus on {weak.map((s) => s.name).join(", ")} to boost your score quickly
        </p>
      )}
    </div>
  );
}

function ExamCard({ subject: s, readiness }) {
  const COLORS = { Maths: "from-[#695be6] to-[#8e82f3]", Science: "from-orange-400 to-amber-500", English: "from-blue-400 to-indigo-500", Social: "from-green-400 to-teal-500", Hindi: "from-pink-400 to-rose-500" };
  const pct = readiness[s.name] || 50;
  return (
    <div className={`bg-gradient-to-r ${COLORS[s.name] || "from-gray-400 to-gray-500"} rounded-xl p-4 text-white`}>
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs font-bold text-white/70 uppercase">{s.pattern}</p>
          <p className="font-black text-base">{s.name}</p>
          <p className="text-xs text-white/80 mt-0.5">{s.examDate} · {s.daysLeft} days left</p>
        </div>
        <div className="text-right">
          <p className="text-2xl">{CONFIDENCE_EMOJI[s.confidence] || "😐"}</p>
          <p className="text-xs text-white/70 mt-0.5">{pct}% ready</p>
        </div>
      </div>
      <div className="h-1.5 bg-white/20 rounded-full mt-3 overflow-hidden">
        <div className="h-full bg-white rounded-full" style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

function TodaySession({ session, dayNum, sessionIdx, isWeak, onPractice, onNotes, onToggle }) {
  const [done, setDone] = useState(session.done || false);
  const TYPE_COLORS = {
    Learn:       "bg-blue-100 text-blue-700",
    Practice:    "bg-purple-100 text-purple-700",
    Revise:      "bg-green-100 text-green-700",
    Notes:       "bg-amber-100 text-amber-700",
    ImportantQ:  "bg-red-100 text-red-700",
  };
  const handleToggle = () => {
    const next = !done;
    setDone(next);
    onToggle(next);
  };
  return (
    <div className={`px-4 py-3 flex items-center gap-3 ${done ? "opacity-50" : ""} ${isWeak ? "bg-red-50/40" : ""}`}>
      <button onClick={handleToggle}
        className={`size-5 rounded border-2 flex items-center justify-center flex-shrink-0 transition-all ${done ? "bg-[#695be6] border-[#695be6]" : "border-gray-300"}`}>
        {done && <span className="material-symbols-outlined text-white text-xs">check</span>}
      </button>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-0.5 flex-wrap">
          <span className={`text-[10px] font-black px-2 py-0.5 rounded-full uppercase ${TYPE_COLORS[session.type] || "bg-gray-100 text-gray-600"}`}>{session.type}</span>
          <span className="text-xs text-gray-400">{session.subject}</span>
          {isWeak && <span className="text-[10px] font-black bg-red-100 text-red-600 px-1.5 py-0.5 rounded-full">⚠ Weak</span>}
        </div>
        <p className={`text-sm font-semibold text-gray-800 truncate ${done ? "line-through" : ""}`}>{session.topic}</p>
      </div>
      <div className="flex items-center gap-1 flex-shrink-0">
        <span className="text-xs text-gray-400">{session.duration}m</span>
        <button onClick={onPractice} className="p-1.5 hover:bg-[#695be6]/10 rounded-lg">
          <span className="material-symbols-outlined text-[#695be6] text-sm">quiz</span>
        </button>
        <button onClick={onNotes} className="p-1.5 hover:bg-gray-100 rounded-lg">
          <span className="material-symbols-outlined text-gray-400 text-sm">menu_book</span>
        </button>
      </div>
    </div>
  );
}

function FullPlanTab({ studyPlan, loading, onSessionToggle }) {
  if (loading) return <div className="flex items-center justify-center py-16 gap-2"><span className="size-5 border-2 border-[#695be6]/30 border-t-[#695be6] rounded-full animate-spin" /><p className="text-xs text-gray-400">Loading plan...</p></div>;
  if (!studyPlan?.length) return <div className="text-center py-16 text-gray-400"><span className="material-symbols-outlined text-4xl mb-2 block">calendar_month</span><p className="text-sm">No plan generated yet</p></div>;

  const TYPE_COLORS = {
    Learn: "bg-blue-100 text-blue-700", Practice: "bg-purple-100 text-purple-700",
    Revise: "bg-green-100 text-green-700", Notes: "bg-amber-100 text-amber-700", ImportantQ: "bg-red-100 text-red-700",
  };
  const MODE_COLORS = { regular: "text-blue-600", revision: "text-amber-600", last_day: "text-red-600" };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-sm font-black text-gray-700">📆 Full Study Plan</p>
        <p className="text-xs text-gray-400">{studyPlan.length} days</p>
      </div>
      {studyPlan.map((day, i) => {
        const doneCnt = day.sessions?.filter((s) => s.done).length || 0;
        const totalCnt = day.sessions?.length || 0;
        return (
          <div key={i} className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="px-4 py-2.5 bg-[#695be6]/5 border-b border-gray-100 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <p className="text-xs font-black text-[#695be6]">Day {day.day} — {day.date}</p>
                {day.mode && <span className={`text-[10px] font-bold uppercase ${MODE_COLORS[day.mode] || "text-gray-500"}`}>{day.mode}</span>}
              </div>
              <div className="flex items-center gap-2">
                <p className="text-xs text-gray-400">{day.totalMinutes} min</p>
                {doneCnt > 0 && <span className="text-[10px] font-bold text-green-600">{doneCnt}/{totalCnt} done</span>}
              </div>
            </div>
            <div className="divide-y divide-gray-50">
              {day.sessions?.map((s, j) => (
                <div key={j} className={`px-4 py-2.5 flex items-center gap-3 ${s.done ? "opacity-50" : ""} ${s.isWeakTopic ? "bg-red-50/30" : ""}`}>
                  <button
                    onClick={() => onSessionToggle(day.day, j, !s.done, s.subject)}
                    className={`size-4 rounded border-2 flex items-center justify-center flex-shrink-0 ${s.done ? "bg-[#695be6] border-[#695be6]" : "border-gray-300"}`}
                  >
                    {s.done && <span className="material-symbols-outlined text-white" style={{ fontSize: "10px" }}>check</span>}
                  </button>
                  <span className={`text-[10px] font-black px-2 py-0.5 rounded-full uppercase ${TYPE_COLORS[s.type] || "bg-gray-100 text-gray-600"}`}>{s.type}</span>
                  <span className="text-xs font-semibold text-gray-700 flex-1 truncate">{s.subject} — {s.topic}</span>
                  {s.isWeakTopic && <span className="text-[10px] text-red-500 font-bold flex-shrink-0">⚠</span>}
                  <span className="text-xs text-gray-400 flex-shrink-0">{s.duration} min</span>
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function SubjectPicker({ subjects, colors, onSelect, label, sublabel, icon, weakTopics }) {
  return (
    <div className="space-y-3">
      <p className="text-sm font-black text-gray-700">{label}</p>
      <p className="text-xs text-gray-400">{sublabel}</p>
      {subjects?.map((s) => {
        const hasWeak = (weakTopics?.[s.name] || []).length > 0;
        return (
          <button key={s.name} onClick={() => onSelect(s.name)}
            className={`w-full bg-gradient-to-r ${colors[s.name] || "from-gray-400 to-gray-500"} rounded-xl p-4 text-white text-left flex items-center justify-between`}>
            <div>
              <div className="flex items-center gap-2">
                <p className="font-black">{s.name}</p>
                {hasWeak && <span className="text-[10px] font-black bg-white/20 px-2 py-0.5 rounded-full">⚠ Weak areas</span>}
              </div>
              <p className="text-xs text-white/70">{sublabel}</p>
            </div>
            <span className="material-symbols-outlined">{icon}</span>
          </button>
        );
      })}
    </div>
  );
}
