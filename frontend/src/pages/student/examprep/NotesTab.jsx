import { useState, useEffect, useCallback } from "react";
import api from "../../../api";

const NOTE_TYPES = [
  { id: "short",      label: "Short Notes",          icon: "notes",     desc: "Topic-wise summaries" },
  { id: "ultrashort", label: "Ultra-Short",           icon: "bolt",      desc: "2-minute revision" },
  { id: "questions",  label: "Important Questions",   icon: "help",      desc: "Board-level expected" },
  { id: "formulas",   label: "Formulas & Key Points", icon: "functions", desc: "Quick recall" },
];

// Bug 2 fix: parse date as local midnight, not UTC midnight
const parseLocalDate = (d) => {
  if (!d) return null;
  const [y, m, day] = d.split("-");
  return new Date(Number(y), Number(m) - 1, Number(day));
};

export default function NotesTab({ subject, profile, onBack }) {
  const [noteType, setNoteType]     = useState("short");
  const [notes, setNotes]           = useState({});
  const [loading, setLoading]       = useState(false);
  const [filterWeak, setFilterWeak] = useState(false);

  // Derive stable primitives so useCallback/useEffect don't re-fire on every render
  const subjectProfile = profile.subjects?.find((s) => s.name === subject);
  const weakTopics     = profile.weakTopics?.[subject] || [];

  const classVal      = profile.class;
  const board         = profile.board;
  const examDate      = subjectProfile?.examDate;
  const daysLeftFb    = subjectProfile?.daysLeft || 10;
  const state         = subjectProfile?.state;
  const topics        = subjectProfile?.topics;
  const syllabusMode  = subjectProfile?.syllabusMode || "full";
  const pattern       = subjectProfile?.pattern || "mixed";
  // Stable string representations to use as deps instead of object references
  const weakTopicsKey = weakTopics.join(",");
  const topicsKey     = (topics || []).join(",");

  const doFetch = useCallback((type) => {
    setLoading(true);
    const daysLeft = examDate
      ? Math.max(0, Math.ceil((parseLocalDate(examDate) - new Date()) / 86400000))
      : daysLeftFb;

    api.post("/student/exam-prep/notes", {
      subject,
      note_type: type,
      class: classVal,
      board,
      state: state || undefined,
      topics: topicsKey ? topicsKey.split(",") : [],
      syllabusMode,
      pattern,
      days_left: daysLeft,
      weak_topics: weakTopicsKey ? weakTopicsKey.split(",") : [],
    })
      .then((r) => {
        const data = r.data;
        if (data.sections?.length || data.questions?.length) {
          setNotes((prev) => ({ ...prev, [type]: data }));
        } else if (data.error) {
          setNotes((prev) => ({ ...prev, [type]: { error: true, message: data.error } }));
        } else {
          setNotes((prev) => ({ ...prev, [type]: { error: true, message: "Empty response from server" } }));
        }
      })
      .catch((err) => {
        const message = err.response?.data?.detail || err.message || "Failed to load";
        setNotes((prev) => ({ ...prev, [type]: { error: true, message } }));
      })
      .finally(() => setLoading(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [subject, classVal, board, examDate, daysLeftFb, state, topicsKey, syllabusMode, pattern, weakTopicsKey]);

  useEffect(() => {
    if (!notes[noteType]) doFetch(noteType);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [noteType, subject, doFetch]);

  const current = notes[noteType];

  const handleRetry = () => {
    setNotes((prev) => { const n = { ...prev }; delete n[noteType]; return n; });
    doFetch(noteType);
  };

  return (
    <div className="min-h-screen bg-[#f6f6f8]" style={{ fontFamily: "'Lexend', sans-serif" }}>
      <header className="fixed top-0 left-0 right-0 z-50 bg-white border-b border-gray-200">
        <div className="max-w-2xl mx-auto px-4 h-14 flex items-center gap-3">
          <button onClick={onBack} className="p-2 hover:bg-gray-100 rounded-lg">
            <span className="material-symbols-outlined text-gray-600">arrow_back</span>
          </button>
          <div className="flex-1">
            <p className="font-black text-sm">{subject} — Notes & Revision</p>
            <p className="text-[10px] text-gray-400">Class {profile.class} · {profile.board}{subjectProfile?.state ? ` (${subjectProfile.state})` : ""}</p>
          </div>
          {weakTopics.length > 0 && (
            <button
              onClick={() => setFilterWeak((v) => !v)}
              className={`flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-bold transition-all ${filterWeak ? "bg-red-500 text-white" : "bg-red-50 text-red-600 border border-red-200"}`}
            >
              <span className="material-symbols-outlined text-sm">warning</span>
              Weak Only
            </button>
          )}
        </div>
        <div className="max-w-2xl mx-auto px-4 flex gap-1 pb-2 overflow-x-auto">
          {NOTE_TYPES.map((t) => (
            <button key={t.id} onClick={() => setNoteType(t.id)}
              className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition-all flex-shrink-0 ${noteType === t.id ? "bg-[#695be6] text-white" : "text-gray-500 hover:bg-gray-100"}`}>
              <span className="material-symbols-outlined text-sm">{t.icon}</span>{t.label}
            </button>
          ))}
        </div>
      </header>

      <main className="max-w-2xl mx-auto pt-28 px-4 pb-8">
        {loading && (
          <div className="flex flex-col items-center justify-center py-16 gap-3">
            <span className="size-8 border-2 border-[#695be6]/30 border-t-[#695be6] rounded-full animate-spin" />
            <p className="text-sm text-gray-400">Generating {NOTE_TYPES.find((t) => t.id === noteType)?.label}...</p>
            <p className="text-xs text-gray-400">Aligning with {profile.board} Class {profile.class} syllabus...</p>
          </div>
        )}

        {!loading && current?.error && (
          <div className="text-center py-16 text-gray-400">
            <span className="material-symbols-outlined text-4xl mb-2 block">error_outline</span>
            <p className="text-sm font-semibold text-gray-700">Failed to load notes</p>
            <p className="text-xs mt-1 text-gray-400">{current.message || "Check your connection and try again"}</p>
            <button onClick={handleRetry} className="mt-4 px-6 py-2 bg-[#695be6] text-white rounded-full font-bold text-sm">Retry</button>
          </div>
        )}

        {!loading && current && !current.error && (
          <NotesContent type={noteType} data={current} filterWeak={filterWeak} weakTopics={weakTopics} />
        )}
      </main>
    </div>
  );
}

function NotesContent({ type, data, filterWeak, weakTopics }) {
  if (type === "short" || type === "ultrashort") {
    const sections = filterWeak
      ? (data.sections || []).filter((s) => s.isWeakTopic || weakTopics.some((w) => s.topic?.toLowerCase().includes(w.toLowerCase())))
      : (data.sections || []);

    if (!sections.length) return (
      <div className="text-center py-12 text-gray-400">
        <span className="material-symbols-outlined text-3xl mb-2 block">notes</span>
        <p className="text-sm">{filterWeak ? "No weak topic notes found" : "No notes generated"}</p>
      </div>
    );

    return (
      <div className="space-y-4">
        {sections.map((sec, i) => (
          <div key={i} className={`bg-white rounded-2xl border shadow-sm overflow-hidden ${sec.isWeakTopic ? "border-red-200" : "border-gray-100"}`}>
            <div className={`px-4 py-3 border-b flex items-center justify-between ${sec.isWeakTopic ? "bg-red-50 border-red-100" : "bg-[#695be6]/5 border-gray-100"}`}>
              <p className={`font-black text-sm ${sec.isWeakTopic ? "text-red-700" : "text-[#695be6]"}`}>{sec.topic}</p>
              {sec.isWeakTopic && <span className="text-[10px] font-black bg-red-100 text-red-600 px-2 py-0.5 rounded-full">⚠ Weak Area</span>}
            </div>
            <div className="p-4 space-y-2">
              {sec.points?.map((pt, j) => (
                <div key={j} className="flex items-start gap-2">
                  <span className={`size-1.5 rounded-full mt-2 flex-shrink-0 ${sec.isWeakTopic ? "bg-red-400" : "bg-[#695be6]"}`} />
                  <p className="text-sm text-gray-700 leading-relaxed">{pt}</p>
                </div>
              ))}
              {sec.formula && (
                <div className="bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 mt-2">
                  <p className="text-xs font-bold text-amber-700">Formula: <span className="font-mono">{sec.formula}</span></p>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (type === "questions") {
    const questions = filterWeak
      ? (data.questions || []).filter((q) => q.isWeakTopic || weakTopics.some((w) => q.topic?.toLowerCase().includes(w.toLowerCase())))
      : (data.questions || []);

    if (!questions.length) return (
      <div className="text-center py-12 text-gray-400">
        <span className="material-symbols-outlined text-3xl mb-2 block">help</span>
        <p className="text-sm">{filterWeak ? "No weak topic questions found" : "No questions generated"}</p>
      </div>
    );

    return (
      <div className="space-y-3">
        {questions.map((q, i) => (
          <div key={i} className={`bg-white rounded-xl border shadow-sm p-4 ${q.isWeakTopic ? "border-red-200" : "border-gray-100"}`}>
            <div className="flex items-start gap-3">
              <span className={`size-6 rounded-full text-white text-xs font-black flex items-center justify-center flex-shrink-0 mt-0.5 ${q.isHighWeight ? "bg-amber-500" : "bg-[#695be6]"}`}>{i + 1}</span>
              <div className="flex-1">
                <div className="flex flex-wrap gap-1 mb-1.5">
                  {q.topic && <span className="text-[10px] font-bold bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">{q.topic}</span>}
                  {q.isHighWeight && <span className="text-[10px] font-bold bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full">⭐ High Weight</span>}
                  {q.isWeakTopic && <span className="text-[10px] font-bold bg-red-100 text-red-600 px-2 py-0.5 rounded-full">⚠ Weak Area</span>}
                </div>
                <p className="text-sm font-semibold text-gray-800">{q.question}</p>
                {q.marks && <p className="text-xs text-gray-400 mt-1">[{q.marks} marks] · {q.type}</p>}
                {q.hint && <p className="text-xs text-[#695be6] mt-1">💡 {q.hint}</p>}
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (type === "formulas") {
    const sections = filterWeak
      ? (data.sections || []).filter((s) => s.isWeakTopic || weakTopics.some((w) => s.topic?.toLowerCase().includes(w.toLowerCase())))
      : (data.sections || []);

    return (
      <div className="space-y-4">
        {sections.map((sec, i) => (
          <div key={i} className={`bg-white rounded-2xl border shadow-sm overflow-hidden ${sec.isWeakTopic ? "border-red-200" : "border-gray-100"}`}>
            <div className={`px-4 py-3 border-b flex items-center justify-between ${sec.isWeakTopic ? "bg-red-50 border-red-100" : "bg-amber-50 border-amber-100"}`}>
              <p className={`font-black text-sm ${sec.isWeakTopic ? "text-red-700" : "text-amber-700"}`}>{sec.topic}</p>
              {sec.isWeakTopic && <span className="text-[10px] font-black bg-red-100 text-red-600 px-2 py-0.5 rounded-full">⚠ Weak Area</span>}
            </div>
            <div className="p-4 space-y-2">
              {sec.formulas?.map((f, j) => (
                <div key={j} className="flex items-start gap-3 py-2 border-b border-gray-50 last:border-0">
                  <div className="flex-1">
                    <p className="text-xs font-bold text-gray-500 mb-0.5">{f.name}</p>
                    <p className="font-mono text-sm font-bold text-[#695be6]">{f.formula}</p>
                    {f.note && <p className="text-xs text-gray-400 mt-0.5">{f.note}</p>}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    );
  }

  return null;
}
