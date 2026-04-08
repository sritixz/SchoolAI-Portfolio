import { useState, useEffect } from "react";
import api from "../../../api";

export default function PracticeMode({ subject, profile, onBack }) {
  const [questions, setQuestions] = useState([]);
  const [loading, setLoading]     = useState(true);
  const [idx, setIdx]             = useState(0);
  const [selected, setSelected]   = useState(null);
  const [checked, setChecked]     = useState(false);
  const [score, setScore]         = useState(0);
  const [finished, setFinished]   = useState(false);

  const subjectProfile = profile.subjects?.find((s) => s.name === subject);

  useEffect(() => {
    api.post("/student/exam-prep/practice-questions", {
      subject,
      class: profile.class,
      board: profile.board,
      topics: subjectProfile?.topics || [],
      pattern: subjectProfile?.pattern || "mixed",
      confidence: subjectProfile?.confidence || "medium",
    })
      .then((r) => setQuestions(r.data.questions || []))
      .catch(() => setQuestions(FALLBACK_QUESTIONS))
      .finally(() => setLoading(false));
  }, [subject]);

  if (loading) {
    return (
      <Screen onBack={onBack} title={`Practice: ${subject}`}>
        <div className="flex flex-col items-center justify-center flex-1 gap-3">
          <span className="size-8 border-2 border-[#695be6]/30 border-t-[#695be6] rounded-full animate-spin" />
          <p className="text-sm text-gray-400">Generating questions...</p>
        </div>
      </Screen>
    );
  }

  if (!questions.length) {
    return (
      <Screen onBack={onBack} title={`Practice: ${subject}`}>
        <div className="flex flex-col items-center justify-center flex-1 gap-3 text-gray-400">
          <span className="material-symbols-outlined text-4xl">quiz</span>
          <p className="text-sm">No questions available</p>
          <button onClick={onBack} className="px-6 py-2 bg-[#695be6] text-white rounded-full font-bold text-sm">Back</button>
        </div>
      </Screen>
    );
  }

  if (finished) {
    const pct = Math.round((score / questions.length) * 100);
    return (
      <Screen onBack={onBack} title="Practice Complete">
        <div className="flex flex-col items-center justify-center flex-1 px-6 text-center gap-4">
          <div className="size-20 rounded-full bg-[#695be6]/10 flex items-center justify-center">
            <span className="material-symbols-outlined text-4xl text-[#695be6]">{pct >= 70 ? "emoji_events" : "school"}</span>
          </div>
          <h2 className="text-2xl font-black">{pct >= 80 ? "Excellent!" : pct >= 60 ? "Good Job!" : "Keep Practicing!"}</h2>
          <p className="text-gray-500 text-sm">You scored {score} / {questions.length} ({pct}%)</p>
          <div className="h-3 bg-gray-100 rounded-full overflow-hidden w-full max-w-xs">
            <div className="h-full bg-[#695be6] rounded-full" style={{ width: `${pct}%` }} />
          </div>
          {pct < 70 && (
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-left w-full max-w-xs">
              <p className="text-xs font-bold text-amber-700 mb-1">📚 What to do next</p>
              <p className="text-xs text-gray-600">Review the topics you missed and try again. Check the Notes tab for quick revision.</p>
            </div>
          )}
          <div className="flex gap-3 w-full max-w-xs">
            <button onClick={() => { setIdx(0); setSelected(null); setChecked(false); setScore(0); setFinished(false); }}
              className="flex-1 py-3 bg-[#695be6] text-white font-bold rounded-xl text-sm">Retry</button>
            <button onClick={onBack} className="flex-1 py-3 bg-gray-100 text-gray-700 font-bold rounded-xl text-sm">Back</button>
          </div>
        </div>
      </Screen>
    );
  }

  const q = questions[idx];
  const correct = q.options?.find((o) => o.is_correct);
  const isCorrect = checked && selected === correct?.id;
  const progress = Math.round((idx / questions.length) * 100);

  return (
    <Screen onBack={onBack} title={`Practice: ${subject}`} progress={progress} score={score} total={idx + (checked ? 1 : 0)}>
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
        {/* Question */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <div className="flex items-center justify-between mb-4">
            <span className="text-[#695be6] font-black text-lg">Q{idx + 1}</span>
            <span className="text-xs text-gray-400">{idx + 1} / {questions.length}</span>
          </div>
          <p className="font-semibold text-gray-800 leading-relaxed">{q.question}</p>
        </div>

        {/* Options */}
        {q.options?.length > 0 && (
          <div className="space-y-2">
            {q.options.map((opt) => {
              const isSel  = selected === opt.id;
              const isGood = checked && opt.is_correct;
              const isBad  = checked && isSel && !opt.is_correct;
              return (
                <button key={opt.id} onClick={() => !checked && setSelected(opt.id)}
                  className={`w-full flex items-center gap-3 p-4 rounded-xl border-2 text-left transition-all ${
                    isGood ? "border-green-400 bg-green-50" :
                    isBad  ? "border-red-400 bg-red-50" :
                    isSel  ? "border-[#695be6] bg-[#695be6]/5" :
                             "border-gray-200 bg-white hover:border-gray-300"
                  }`}>
                  <span className={`size-6 rounded-full border-2 flex items-center justify-center text-xs font-bold flex-shrink-0 ${
                    isGood ? "border-green-500 bg-green-500 text-white" :
                    isBad  ? "border-red-500 bg-red-500 text-white" :
                    isSel  ? "border-[#695be6] bg-[#695be6] text-white" :
                             "border-gray-300 text-gray-500"
                  }`}>{opt.id}</span>
                  <span className={`text-sm font-medium ${isSel ? "text-[#695be6]" : "text-gray-700"}`}>{opt.text}</span>
                  {isGood && <span className="material-symbols-outlined text-green-500 text-sm ml-auto">check_circle</span>}
                </button>
              );
            })}
          </div>
        )}

        {/* Feedback */}
        {checked && (
          <div className={`bg-white rounded-xl border-l-4 p-4 ${isCorrect ? "border-green-400" : "border-red-400"}`}>
            <p className={`font-bold text-sm mb-1 ${isCorrect ? "text-green-700" : "text-red-700"}`}>
              {isCorrect ? "✅ Correct! Great thinking!" : `❌ Not quite — the answer is ${correct?.text}`}
            </p>
            {q.explanation && <p className="text-xs text-gray-600 leading-relaxed">{q.explanation}</p>}
            {q.trick && <p className="text-xs text-[#695be6] font-semibold mt-2">💡 Here's the trick: {q.trick}</p>}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="px-4 py-4 border-t border-gray-100 bg-white">
        {!checked ? (
          <button onClick={() => { if (!selected) return; setChecked(true); if (selected === correct?.id) setScore((s) => s + 1); }}
            disabled={!selected}
            className="w-full bg-[#695be6] text-white font-black py-3.5 rounded-xl disabled:opacity-50 flex items-center justify-center gap-2">
            <span className="material-symbols-outlined">check</span> Check Answer
          </button>
        ) : (
          <button onClick={() => { if (idx < questions.length - 1) { setIdx((i) => i + 1); setSelected(null); setChecked(false); } else { setFinished(true); } }}
            className="w-full bg-[#695be6] text-white font-black py-3.5 rounded-xl flex items-center justify-center gap-2">
            {idx < questions.length - 1 ? "Next Question" : "Finish"} <span className="material-symbols-outlined">arrow_forward</span>
          </button>
        )}
      </div>
    </Screen>
  );
}

function Screen({ onBack, title, progress, score, total, children }) {
  return (
    <div className="min-h-screen bg-[#f6f6f8] flex flex-col" style={{ fontFamily: "'Lexend', sans-serif" }}>
      <header className="fixed top-0 left-0 right-0 z-50 bg-white border-b border-gray-200">
        <div className="max-w-2xl mx-auto px-4 h-14 flex items-center gap-3">
          <button onClick={onBack} className="p-2 hover:bg-gray-100 rounded-lg">
            <span className="material-symbols-outlined text-gray-600">arrow_back</span>
          </button>
          <p className="font-black text-sm flex-1">{title}</p>
          {score !== undefined && <p className="text-xs font-bold text-[#695be6]">Score: {score}/{total}</p>}
        </div>
        {progress !== undefined && (
          <div className="h-1 bg-gray-100">
            <div className="h-full bg-[#695be6] transition-all" style={{ width: `${progress}%` }} />
          </div>
        )}
      </header>
      <div className="flex flex-col flex-1 pt-16 max-w-2xl mx-auto w-full">
        {children}
      </div>
    </div>
  );
}

const FALLBACK_QUESTIONS = [
  {
    id: "q1", question: "What is the value of x in 2x + 4 = 10?",
    options: [
      { id: "A", text: "2", is_correct: false },
      { id: "B", text: "3", is_correct: true },
      { id: "C", text: "4", is_correct: false },
      { id: "D", text: "5", is_correct: false },
    ],
    explanation: "2x = 10 - 4 = 6, so x = 3",
    trick: "Isolate x by moving constants to the other side first.",
  },
];
