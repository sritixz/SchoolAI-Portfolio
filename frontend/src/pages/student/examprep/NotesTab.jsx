import { useState, useEffect } from "react";
import api from "../../../api";

const NOTE_TYPES = [
  { id: "short",     label: "Short Notes",       icon: "notes",          desc: "Topic-wise summaries" },
  { id: "ultrashort",label: "Ultra-Short Notes",  icon: "bolt",           desc: "2-minute revision" },
  { id: "questions", label: "Important Questions",icon: "help",           desc: "Board-level expected" },
  { id: "formulas",  label: "Formulas & Key Points",icon: "functions",    desc: "Quick recall" },
];

export default function NotesTab({ subject, profile, onBack }) {
  const [noteType, setNoteType] = useState("short");
  const [notes, setNotes]       = useState({});
  const [loading, setLoading]   = useState(false);

  const subjectProfile = profile.subjects?.find((s) => s.name === subject);

  const doFetch = (type) => {
    setLoading(true);
    api.post("/student/exam-prep/notes", {
      subject,
      note_type: type,
      class: profile.class,
      board: profile.board,
      topics: subjectProfile?.topics || [],
      pattern: subjectProfile?.pattern || "mixed",
      days_left: subjectProfile?.daysLeft || 10,
    })
      .then((r) => setNotes((prev) => ({ ...prev, [type]: r.data })))
      .catch(() => setNotes((prev) => ({ ...prev, [type]: { error: true } })))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    if (!notes[noteType]) doFetch(noteType);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [noteType, subject]);

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
          <div>
            <p className="font-black text-sm">{subject} — Notes</p>
            <p className="text-[10px] text-gray-400">Class {profile.class} · {profile.board}</p>
          </div>
        </div>
        {/* Note type tabs */}
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
          </div>
        )}

        {!loading && current?.error && (
          <div className="text-center py-16 text-gray-400">
            <span className="material-symbols-outlined text-4xl mb-2 block">error_outline</span>
            <p className="text-sm">Failed to load notes. Please try again.</p>
            <button onClick={handleRetry}
              className="mt-4 px-6 py-2 bg-[#695be6] text-white rounded-full font-bold text-sm">Retry</button>
          </div>
        )}

        {!loading && current && !current.error && (
          <NotesContent type={noteType} data={current} />
        )}
      </main>
    </div>
  );
}

function NotesContent({ type, data }) {
  if (type === "short" || type === "ultrashort") {
    return (
      <div className="space-y-4">
        {data.sections?.map((sec, i) => (
          <div key={i} className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="px-4 py-3 bg-[#695be6]/5 border-b border-gray-100">
              <p className="font-black text-sm text-[#695be6]">{sec.topic}</p>
            </div>
            <div className="p-4 space-y-2">
              {sec.points?.map((pt, j) => (
                <div key={j} className="flex items-start gap-2">
                  <span className="size-1.5 rounded-full bg-[#695be6] mt-2 flex-shrink-0" />
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
    return (
      <div className="space-y-3">
        {data.questions?.map((q, i) => (
          <div key={i} className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
            <div className="flex items-start gap-3">
              <span className="size-6 rounded-full bg-[#695be6] text-white text-xs font-black flex items-center justify-center flex-shrink-0 mt-0.5">{i + 1}</span>
              <div>
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
    return (
      <div className="space-y-4">
        {data.sections?.map((sec, i) => (
          <div key={i} className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="px-4 py-3 bg-amber-50 border-b border-amber-100">
              <p className="font-black text-sm text-amber-700">{sec.topic}</p>
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
