import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { useAuth } from "../../context/AuthContext";
import { getQuizById } from "../../data/learningGapData";
import {
  fetchQuiz, submitQuiz,
  selectCurrentQuiz, selectQuizSubmitStatus,
} from "../../store/slices/learningGapsSlice";

export default function GapQuiz() {
  const { quizId } = useParams();
  const navigate   = useNavigate();
  const { } = useAuth();
  const dispatch = useDispatch();
  const reduxQuiz = useSelector(selectCurrentQuiz);
  const [quiz, setQuiz] = useState(() => getQuizById(quizId));

  useEffect(() => { dispatch(fetchQuiz(quizId)); }, [quizId, dispatch]);
  useEffect(() => { if (reduxQuiz?.questions) setQuiz(reduxQuiz); }, [reduxQuiz]);

  const [currentIdx, setCurrentIdx] = useState(0);
  const [selected,   setSelected]   = useState(null);
  const [checked,    setChecked]     = useState(false);
  const [score,      setScore]       = useState(0);
  const [finished,   setFinished]    = useState(false);
  const [showHint,   setShowHint]    = useState(false);
  // Track all answers for API submission
  const [allAnswers, setAllAnswers]  = useState([]);

  if (!quiz) {
    return (
      <div className="min-h-screen bg-[#f6f6f8] flex items-center justify-center" style={{ fontFamily: "'Lexend', sans-serif" }}>
        <div className="text-center">
          <p className="font-bold text-slate-600">Quiz not found.</p>
          <button onClick={() => navigate("/student/learning-gaps")} className="mt-4 px-6 py-2 bg-[#685ae7] text-white rounded-full font-bold">Back</button>
        </div>
      </div>
    );
  }

  const questions  = quiz.questions;
  const q          = questions[currentIdx];
  const totalQ     = questions.length;
  const progressPct= Math.round(((currentIdx) / totalQ) * 100);
  const correct    = q?.options.find((o) => o.isCorrect);
  const isCorrect  = checked && selected === correct?.id;

  const handleCheck = () => {
    if (!selected) return;
    setChecked(true);
    const isRight = selected === correct?.id;
    if (isRight) setScore((s) => s + 1);
    setAllAnswers((p) => [...p, { question_id: q.id, selected_option_id: selected }]);
  };

  const handleNext = () => {
    if (currentIdx < totalQ - 1) {
      setCurrentIdx((i) => i + 1);
      setSelected(null);
      setChecked(false);
      setShowHint(false);
    } else {
      // Submit to API via Redux
      dispatch(submitQuiz({ quiz_id: quizId, answers: allAnswers }));
      setFinished(true);
    }
  };

  // ── Finished screen ──
  if (finished) {
    const pct = Math.round((score / totalQ) * 100);
    return (
      <div className="min-h-screen bg-[#f6f6f8] flex flex-col items-center justify-center px-6" style={{ fontFamily: "'Lexend', sans-serif" }}>
        <div className="bg-white rounded-2xl shadow-sm border border-[#685ae7]/10 p-10 max-w-md w-full text-center">
          <div className="size-20 rounded-full bg-[#685ae7]/10 flex items-center justify-center mx-auto mb-6">
            <span className="material-symbols-outlined text-4xl text-[#685ae7]">
              {pct >= 70 ? "emoji_events" : "school"}
            </span>
          </div>
          <h2 className="text-3xl font-black text-[#100e1b] mb-2">
            {pct >= 80 ? "Excellent!" : pct >= 60 ? "Good Job!" : "Keep Practicing!"}
          </h2>
          <p className="text-slate-500 mb-6">You scored {score} out of {totalQ} ({pct}%)</p>

          <div className="h-3 bg-slate-100 rounded-full overflow-hidden mb-8">
            <div className="h-full bg-[#685ae7] rounded-full" style={{ width: `${pct}%` }} />
          </div>

          <div className="flex flex-col gap-3">
            <button
              onClick={() => { setCurrentIdx(0); setSelected(null); setChecked(false); setScore(0); setFinished(false); setShowHint(false); }}
              className="w-full py-3 bg-[#685ae7] text-white font-bold rounded-xl hover:bg-[#685ae7]/90 transition-all shadow-lg shadow-[#685ae7]/20"
            >
              Retry Quiz
            </button>
            <button
              onClick={() => navigate("/student/learning-gaps/gaps")}
              className="w-full py-3 bg-slate-100 text-slate-700 font-bold rounded-xl hover:bg-slate-200 transition-all"
            >
              Back to Gaps
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-[#f6f6f8] min-h-screen flex flex-col" style={{ fontFamily: "'Lexend', sans-serif" }}>

      {/* Fixed header */}
      <header className="fixed top-0 left-0 right-0 z-50 h-16 px-6 flex items-center justify-between text-white shadow-lg"
        style={{ background: "linear-gradient(135deg, #685ae7 0%, #8e82f3 100%)" }}>
        <div className="flex items-center gap-4">
          <button onClick={() => navigate("/student/learning-gaps/gaps")} className="hover:bg-white/20 p-2 rounded-lg transition-colors">
            <span className="material-symbols-outlined">close</span>
          </button>
          <h1 className="text-base font-semibold truncate max-w-[260px]">{quiz.title}</h1>
        </div>

        {/* Progress bar (center, desktop) */}
        <div className="flex-1 max-w-xl mx-8 hidden md:block">
          <div className="flex flex-col gap-1.5">
            <div className="flex justify-between text-xs font-medium uppercase tracking-wider opacity-90">
              <span>Quiz Progress</span>
              <span>{progressPct}%</span>
            </div>
            <div className="h-2 w-full bg-white/20 rounded-full overflow-hidden">
              <div className="h-full bg-white transition-all duration-500" style={{ width: `${progressPct}%` }} />
            </div>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 bg-white/10 px-3 py-1.5 rounded-full border border-white/20">
            <span className="material-symbols-outlined text-sm">timer_off</span>
            <span className="text-xs font-medium">No timer</span>
          </div>
        </div>
      </header>

      {/* Main */}
      <main className="flex-1 mt-16 mb-24 p-4 md:p-8 flex justify-center overflow-y-auto">
        <div className="w-full max-w-3xl space-y-6">

          {/* Question card */}
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="p-6 md:p-8">
              <div className="flex items-center justify-between mb-6">
                <span className="text-[#685ae7] font-bold text-2xl">Q{q.number}</span>
                <span className="px-3 py-1 bg-[#685ae7]/10 text-[#685ae7] text-xs font-bold rounded-full uppercase tracking-widest">{q.difficulty}</span>
              </div>
              <div className="space-y-3">
                <p className="text-slate-500 text-sm font-medium">{q.prompt}</p>
                <h2 className="text-3xl md:text-4xl font-bold text-slate-900 tracking-tight">{q.equation}</h2>
              </div>
            </div>

            {/* Options */}
            <div className="px-6 md:px-8 pb-8 space-y-3">
              {q.options.map((opt) => {
                const isSel   = selected === opt.id;
                const isGood  = checked && opt.isCorrect;
                const isBad   = checked && isSel && !opt.isCorrect;
                return (
                  <label
                    key={opt.id}
                    className={`flex items-center gap-4 rounded-lg border-2 p-4 cursor-pointer transition-all active:scale-[0.99]
                      ${isGood  ? "border-green-400 bg-green-50" :
                        isBad   ? "border-red-400 bg-red-50" :
                        isSel   ? "border-[#685ae7] bg-[#D4C5F9]/30" :
                                  "border-slate-100 bg-slate-50/50 hover:border-[#685ae7]/30"}`}
                  >
                    <input
                      type="radio"
                      name="quiz-opt"
                      className="h-5 w-5 border-2 border-slate-300 text-[#685ae7] focus:ring-[#685ae7]"
                      checked={isSel}
                      onChange={() => !checked && setSelected(opt.id)}
                    />
                    <div className="flex-1">
                      <p className={`font-medium ${isSel ? "text-[#685ae7] font-bold" : "text-slate-700"}`}>{opt.text}</p>
                    </div>
                    <span className={`font-bold ${isSel ? "text-[#685ae7]" : "text-slate-400"}`}>{opt.id}</span>
                  </label>
                );
              })}
            </div>
          </div>

          {/* Feedback panel */}
          {checked && (
            <div className={`bg-white rounded-xl shadow-sm border-l-8 overflow-hidden ${isCorrect ? "border-green-400" : "border-red-400"}`}>
              <div className="p-6">
                <div className="flex items-start gap-4">
                  <div className={`p-2 rounded-lg ${isCorrect ? "bg-green-100" : "bg-red-100"}`}>
                    <span className={`material-symbols-outlined ${isCorrect ? "text-green-600" : "text-red-600"}`}>
                      {isCorrect ? "celebration" : "cancel"}
                    </span>
                  </div>
                  <div className="flex-1">
                    <h3 className="text-lg font-bold text-slate-900 mb-1">
                      {isCorrect ? "Correct! Well done!" : `Not quite — the answer is ${correct?.text}`}
                    </h3>
                    <p className="text-slate-600 leading-relaxed text-sm">{q.explanation}</p>

                    {/* Collapsible hint */}
                    <div className="mt-4 pt-4 border-t border-slate-100">
                      <button
                        onClick={() => setShowHint(!showHint)}
                        className="flex items-center justify-between w-full text-[#685ae7] text-sm font-semibold hover:underline"
                      >
                        <span>Hint for next time</span>
                        <span className={`material-symbols-outlined text-sm transition-transform ${showHint ? "rotate-180" : ""}`}>expand_more</span>
                      </button>
                      {showHint && (
                        <p className="mt-2 text-slate-500 text-xs italic">{q.hint}</p>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>

      {/* Fixed footer */}
      <footer className="fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-slate-200 h-20 px-6 md:px-12 flex items-center justify-between">
        <div className="flex flex-col">
          <span className="text-[10px] uppercase font-bold tracking-widest text-slate-400">Current Session</span>
          <span className="text-slate-700 font-bold text-lg">Score: {score}/{currentIdx + (checked ? 1 : 0)} correct</span>
        </div>
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate("/student/vin-ai")}
            className="hidden md:flex items-center gap-2 text-slate-500 font-semibold px-4 py-2 hover:bg-slate-100 rounded-lg transition-colors"
          >
            <span className="material-symbols-outlined">help</span>Ask for help
          </button>
          {!checked ? (
            <button
              onClick={handleCheck}
              disabled={!selected}
              className="bg-[#685ae7] hover:bg-[#685ae7]/90 text-white font-bold py-3 px-8 rounded-lg shadow-md shadow-[#685ae7]/20 flex items-center gap-2 transition-transform active:scale-95 disabled:opacity-40"
            >
              Check Answer
              <span className="material-symbols-outlined">check</span>
            </button>
          ) : (
            <button
              onClick={handleNext}
              className="bg-[#685ae7] hover:bg-[#685ae7]/90 text-white font-bold py-3 px-8 rounded-lg shadow-md shadow-[#685ae7]/20 flex items-center gap-2 transition-transform active:scale-95"
            >
              {currentIdx < totalQ - 1 ? "Next Question" : "Finish Quiz"}
              <span className="material-symbols-outlined">arrow_forward</span>
            </button>
          )}
        </div>
      </footer>
    </div>
  );
}
