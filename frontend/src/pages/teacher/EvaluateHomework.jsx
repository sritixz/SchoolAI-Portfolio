import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import {
  fetchEvaluateList, gradeHomework, triggerAiAnalysis,
  selectEvaluateData, selectEvaluateStatus,
} from "../../store/slices/homeworkSlice";

// ── Helpers ──────────────────────────────────────────────────
function ScoreBadge({ pct }) {
  const cls = pct >= 80 ? "bg-green-100 text-green-700" : pct >= 50 ? "bg-amber-100 text-amber-700" : "bg-red-100 text-red-600";
  return <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${cls}`}>{pct}%</span>;
}

function StatusBadge({ status }) {
  const map = {
    submitted:   "bg-blue-100 text-blue-700",
    graded:      "bg-green-100 text-green-700",
    draft_grade: "bg-amber-100 text-amber-700",
  };
  return <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${map[status] || "bg-gray-100 text-gray-500"}`}>{status?.replace("_", " ")}</span>;
}

// ── AI Analysis Panel ─────────────────────────────────────────
function AIAnalysisPanel({ analysis, onRefresh, loading }) {
  if (loading) return (
    <div className="bg-[#695be6]/5 border border-[#695be6]/20 rounded-xl p-5 flex items-center gap-3">
      <span className="size-5 border-2 border-[#695be6]/40 border-t-[#695be6] rounded-full animate-spin shrink-0" />
      <p className="text-sm text-[#695be6] font-medium">AI is analysing this submission...</p>
    </div>
  );

  if (!analysis) return (
    <div className="bg-gray-50 border border-gray-200 rounded-xl p-5 text-center">
      <span className="material-symbols-outlined text-3xl text-gray-300 mb-2 block">psychology</span>
      <p className="text-sm text-gray-400 mb-3">AI analysis not yet available</p>
      <button onClick={onRefresh} className="text-xs font-bold text-[#695be6] hover:underline flex items-center gap-1 mx-auto">
        <span className="material-symbols-outlined text-sm">refresh</span> Run AI Analysis
      </button>
    </div>
  );

  return (
    <div className="space-y-4">
      {/* Summary */}
      <div className="bg-[#695be6]/5 border border-[#695be6]/20 rounded-xl p-4">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-[#695be6] text-base">psychology</span>
            <span className="text-xs font-black text-[#695be6] uppercase tracking-wider">AI Pre-Analysis</span>
          </div>
          <ScoreBadge pct={analysis.estimated_score_pct || 0} />
        </div>
        <p className="text-sm text-slate-700 leading-relaxed">{analysis.overall_summary}</p>
      </div>

      {/* Strengths & Weaknesses */}
      <div className="grid grid-cols-2 gap-3">
        {analysis.strength_areas?.length > 0 && (
          <div className="bg-green-50 border border-green-200 rounded-xl p-3">
            <p className="text-xs font-bold text-green-700 mb-2 flex items-center gap-1">
              <span className="material-symbols-outlined text-sm">thumb_up</span> Strengths
            </p>
            <ul className="space-y-1">
              {analysis.strength_areas.map((s, i) => <li key={i} className="text-xs text-green-800">• {s}</li>)}
            </ul>
          </div>
        )}
        {analysis.weakness_areas?.length > 0 && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-3">
            <p className="text-xs font-bold text-red-700 mb-2 flex items-center gap-1">
              <span className="material-symbols-outlined text-sm">warning</span> Needs Work
            </p>
            <ul className="space-y-1">
              {analysis.weakness_areas.map((s, i) => <li key={i} className="text-xs text-red-800">• {s}</li>)}
            </ul>
          </div>
        )}
      </div>

      {/* Error patterns */}
      {analysis.error_patterns?.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-3">
          <p className="text-xs font-bold text-amber-700 mb-2">Error Patterns Detected</p>
          <ul className="space-y-1">
            {analysis.error_patterns.map((e, i) => <li key={i} className="text-xs text-amber-800">• {e}</li>)}
          </ul>
        </div>
      )}

      {/* Suggested feedback */}
      {analysis.suggested_teacher_feedback && (
        <div className="bg-white border border-gray-200 rounded-xl p-3">
          <p className="text-xs font-bold text-gray-500 mb-1">Suggested Feedback (editable)</p>
          <p className="text-sm text-gray-700 italic">"{analysis.suggested_teacher_feedback}"</p>
        </div>
      )}
    </div>
  );
}

// ── Per-question grading row ──────────────────────────────────
function QuestionGradeRow({ q, answer, aiQ, override, onOverride }) {
  const atype = answer?.answer_type || q?.answer_type;
  const aiScore = aiQ?.ai_score ?? null;
  const maxPts  = q?.max_points || aiQ?.max_points || 1;
  const currentPts = override?.points_awarded ?? aiScore ?? (answer?.points_awarded ?? null);

  return (
    <div className="bg-white border border-gray-100 rounded-xl p-4 space-y-3">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-black text-[#695be6]">Q{q?.question_number || "?"}</span>
            <span className="text-[10px] font-bold uppercase bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">{atype}</span>
            <span className="text-xs text-gray-400">{maxPts} pt{maxPts > 1 ? "s" : ""}</span>
          </div>
          <p className="text-sm font-medium text-gray-800">{q?.question_text || "Question"}</p>
        </div>
        {/* Score input */}
        <div className="flex items-center gap-1 shrink-0">
          <input
            type="number" min={0} max={maxPts}
            value={currentPts ?? ""}
            onChange={(e) => onOverride({ points_awarded: +e.target.value, comment: override?.comment || "" })}
            className="w-14 border border-gray-200 rounded-lg px-2 py-1 text-sm text-center outline-none focus:border-[#695be6]"
            placeholder="—"
          />
          <span className="text-xs text-gray-400">/ {maxPts}</span>
        </div>
      </div>

      {/* Student answer */}
      <div className="bg-gray-50 rounded-lg p-3">
        <p className="text-[10px] font-bold text-gray-400 uppercase mb-1">Student Answer</p>
        {atype === "upload" || atype === "handwritten" ? (
          answer?.file_url
            ? <a href={answer.file_url} target="_blank" rel="noreferrer"
                className="flex items-center gap-2 text-[#695be6] text-sm font-medium hover:underline">
                <span className="material-symbols-outlined text-base">open_in_new</span> View uploaded file
              </a>
            : <p className="text-sm text-gray-400 italic">No file uploaded</p>
        ) : (
          <div>
            {answer?.answer != null ? (
              <div className="flex items-center gap-2">
                {/* If MCQ, show the option text */}
                {q?.options && typeof answer.answer === "number" ? (
                  <span className="text-sm text-gray-700">
                    <span className="font-bold text-[#695be6]">Option {answer.answer + 1}:</span>{" "}
                    {q.options[answer.answer] ?? `Choice ${answer.answer}`}
                  </span>
                ) : (
                  <p className="text-sm text-gray-700">{String(answer.answer)}</p>
                )}
                {/* Correct/wrong indicator */}
                {q?.correct != null && (
                  <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                    answer.answer === q.correct
                      ? "bg-green-100 text-green-700"
                      : "bg-red-100 text-red-700"
                  }`}>
                    {answer.answer === q.correct ? "Correct" : `Correct: Option ${q.correct + 1}`}
                  </span>
                )}
              </div>
            ) : aiQ?.student_answer ? (
              <p className="text-sm text-gray-700">{aiQ.student_answer}</p>
            ) : (
              <span className="italic text-gray-400 text-sm">No answer</span>
            )}
          </div>
        )}
      </div>

      {/* AI feedback */}
      {aiQ?.feedback && (
        <div className="flex items-start gap-2 bg-[#695be6]/5 rounded-lg p-2">
          <span className="material-symbols-outlined text-[#695be6] text-sm shrink-0 mt-0.5">psychology</span>
          <p className="text-xs text-[#695be6]">{aiQ.feedback}</p>
        </div>
      )}

      {/* Teacher comment */}
      <input
        value={override?.comment || ""}
        onChange={(e) => onOverride({ points_awarded: currentPts, comment: e.target.value })}
        placeholder="Add comment for this question (optional)..."
        className="w-full border border-gray-100 rounded-lg px-3 py-2 text-xs outline-none focus:border-[#695be6] bg-white"
      />
    </div>
  );
}

// ── Submission card (left list) ───────────────────────────────
function SubmissionCard({ sub, selected, onClick }) {
  const pct = sub.ai_analysis?.estimated_score_pct ?? sub.auto_score_pct;
  return (
    <button onClick={onClick}
      className={`w-full flex items-center gap-3 p-3 rounded-xl text-left transition-all ${
        selected ? "bg-[#695be6]/10 border-2 border-[#695be6]" : "bg-white border border-gray-100 hover:border-gray-200"
      }`}>
      <div className="size-9 rounded-full bg-[#695be6]/10 flex items-center justify-center shrink-0 text-[#695be6] font-bold text-sm">
        {sub.student_name?.[0] || "?"}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-bold truncate">{sub.student_name || sub.student_id}</p>
        <div className="flex items-center gap-2 mt-0.5">
          <StatusBadge status={sub.status} />
          {pct != null && <ScoreBadge pct={pct} />}
        </div>
      </div>
      {sub.ai_analysis && <span className="material-symbols-outlined text-[#695be6] text-base shrink-0" title="AI analysed">psychology</span>}
    </button>
  );
}

// ── Main ─────────────────────────────────────────────────────
export default function EvaluateHomework() {
  const { id: homeworkId } = useParams();
  const navigate = useNavigate();
  const dispatch = useDispatch();

  const evaluateData   = useSelector(selectEvaluateData);
  const evaluateStatus = useSelector(selectEvaluateStatus);

  const [selected,   setSelected]   = useState(null);
  const [overrides,  setOverrides]  = useState({});
  const [feedback,   setFeedback]   = useState("");
  const [grade,      setGrade]      = useState("");
  const [saving,     setSaving]     = useState(false);
  const [aiLoading,  setAiLoading]  = useState(false);
  const [error,      setError]      = useState("");

  const loading = evaluateStatus === "loading";
  const data    = evaluateData;

  const load = () => dispatch(fetchEvaluateList(homeworkId));

  useEffect(() => {
    load();
  }, [homeworkId]);

  useEffect(() => {
    if (evaluateData?.submissions?.length && !selected) {
      const first = evaluateData.submissions[0];
      setSelected(first);
      setFeedback(first.ai_analysis?.suggested_teacher_feedback || "");
      setGrade(first.final_grade || "");
    }
  }, [evaluateData]);

  const selectSub = (sub) => {
    setSelected(sub);
    setOverrides({});
    setFeedback(sub.ai_analysis?.suggested_teacher_feedback || sub.teacher_feedback || "");
    setGrade(sub.final_grade || "");
  };

  const runAI = async () => {
    if (!selected) return;
    setAiLoading(true);
    try {
      await dispatch(triggerAiAnalysis(selected._id)).unwrap();
      setTimeout(() => { load(); setAiLoading(false); }, 3500);
    } catch {
      setAiLoading(false);
    }
  };

  const handleGrade = async (publish) => {
    if (!selected) return;
    setSaving(true);
    setError("");
    const qOverrides = Object.entries(overrides).map(([qid, v]) => ({ question_id: qid, ...v }));
    const qAnalysis = selected.ai_analysis?.question_analysis || [];
    let total = 0, earned = 0;
    for (const qa of qAnalysis) {
      const ov = overrides[qa.question_id];
      const pts = ov?.points_awarded ?? qa.ai_score ?? 0;
      earned += pts;
      total  += qa.max_points || 1;
    }
    const finalScore = total > 0 ? Math.round(earned / total * 100) : null;
    try {
      await dispatch(gradeHomework({
        homework_id:        homeworkId,
        student_id:         selected.student_id,
        final_grade:        grade,
        final_score:        finalScore,
        teacher_feedback:   feedback,
        question_overrides: qOverrides,
        publish,
      })).unwrap();
      load();
    } catch {
      setError("Failed to save grade.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) return (
    <div className="min-h-screen bg-[#faf9ff] flex items-center justify-center" style={{ fontFamily: "'Lexend', sans-serif" }}>
      <div className="flex flex-col items-center gap-3">
        <span className="size-8 border-2 border-[#695be6]/30 border-t-[#695be6] rounded-full animate-spin" />
        <p className="text-sm text-gray-400">Loading submissions...</p>
      </div>
    </div>
  );

  const hw = data?.homework;
  const submissions = data?.submissions || [];
  const stats = data?.stats || {};
  const qMap = Object.fromEntries((hw?.questions || []).map((q) => [q.id, q]));
  const aiQMap = Object.fromEntries((selected?.ai_analysis?.question_analysis || []).map((q) => [q.question_id, q]));
  // answers can be an object {qid: chosenIndex} or an array [{question_id, answer}]
  const rawAnswers = selected?.answers;
  const ansMap = (() => {
    if (!rawAnswers) return {};
    if (Array.isArray(rawAnswers)) {
      return Object.fromEntries(rawAnswers.map((a) => [a.question_id, a]));
    }
    // Plain object: {qid: chosenIndex} — normalize to {qid: {answer: chosenIndex}}
    return Object.fromEntries(
      Object.entries(rawAnswers).map(([qid, val]) => [
        qid,
        typeof val === "object" && val !== null ? val : { answer: val }
      ])
    );
  })();

  return (
    <div className="min-h-screen bg-[#faf9ff]" style={{ fontFamily: "'Lexend', sans-serif" }}>

      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-white border-b border-gray-200">
        <div className="max-w-[1400px] mx-auto px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button onClick={() => navigate(-1)} className="p-2 hover:bg-gray-100 rounded-lg">
              <span className="material-symbols-outlined text-gray-500">arrow_back</span>
            </button>
            <div>
              <h1 className="font-black text-sm leading-tight">{hw?.title || "Evaluate Homework"}</h1>
              <p className="text-xs text-gray-400">{hw?.subject} · {hw?.assigned_to_class}</p>
            </div>
          </div>
          <div className="flex items-center gap-4 text-xs text-gray-500">
            <span className="flex items-center gap-1"><span className="material-symbols-outlined text-sm">group</span>{stats.submitted}/{stats.total_assigned} submitted</span>
            <span className="flex items-center gap-1"><span className="material-symbols-outlined text-sm text-green-500">check_circle</span>{stats.graded} graded</span>
            <span className="flex items-center gap-1"><span className="material-symbols-outlined text-sm text-[#695be6]">psychology</span>{stats.pending_ai} pending AI</span>
          </div>
        </div>
      </header>

      {error && (
        <div className="fixed top-14 left-0 right-0 z-40 bg-red-50 border-b border-red-200 px-6 py-2 flex items-center gap-2">
          <span className="material-symbols-outlined text-red-500 text-sm">error</span>
          <p className="text-red-600 text-xs">{error}</p>
          <button onClick={() => setError("")} className="ml-auto text-red-400"><span className="material-symbols-outlined text-sm">close</span></button>
        </div>
      )}

      <div className="max-w-[1400px] mx-auto pt-16 flex h-[calc(100vh-56px)]">

        {/* ── Left: Submission list ── */}
        <aside className="w-64 shrink-0 border-r border-gray-200 bg-white overflow-y-auto p-4 space-y-2">
          <p className="text-xs font-black text-gray-400 uppercase tracking-wider mb-3">Submissions</p>
          {submissions.length === 0
            ? <p className="text-xs text-gray-400 text-center py-8">No submissions yet</p>
            : submissions.map((sub) => (
                <SubmissionCard key={sub._id} sub={sub} selected={selected?._id === sub._id} onClick={() => selectSub(sub)} />
              ))
          }
        </aside>

        {/* ── Center: Student work + question grading ── */}
        <main className="flex-1 overflow-y-auto p-6 space-y-4">
          {!selected ? (
            <div className="flex items-center justify-center h-full text-gray-400">
              <div className="text-center">
                <span className="material-symbols-outlined text-5xl mb-3 block">assignment</span>
                <p>Select a submission to review</p>
              </div>
            </div>
          ) : (
            <>
              {/* Student header */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="size-10 rounded-full bg-[#695be6]/10 flex items-center justify-center text-[#695be6] font-bold">
                    {selected.student_name?.[0] || "?"}
                  </div>
                  <div>
                    <p className="font-black">{selected.student_name || selected.student_id}</p>
                    <p className="text-xs text-gray-400">Submitted {selected.submitted_at ? new Date(selected.submitted_at).toLocaleString() : "—"}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <StatusBadge status={selected.status} />
                  {selected.auto_score_pct != null && (
                    <span className="text-xs text-gray-500">MCQ auto: <ScoreBadge pct={selected.auto_score_pct} /></span>
                  )}
                </div>
              </div>

              {/* File submission (for upload/handwritten type) */}
              {selected.submission_file_url && (
                <div className="bg-white border border-gray-200 rounded-xl p-4 flex items-center gap-3">
                  <span className="material-symbols-outlined text-[#695be6] text-2xl">description</span>
                  <div className="flex-1">
                    <p className="text-sm font-bold">Submitted File</p>
                    <p className="text-xs text-gray-400">{hw?.submission_type}</p>
                  </div>
                  <a href={selected.submission_file_url} target="_blank" rel="noreferrer"
                    className="flex items-center gap-1 text-[#695be6] text-sm font-bold hover:underline">
                    <span className="material-symbols-outlined text-base">open_in_new</span> Open
                  </a>
                </div>
              )}

              {/* Per-question grading */}
              {hw?.questions?.length > 0 && (
                <div className="space-y-3">
                  <h3 className="font-black text-sm">Question-by-Question Review</h3>
                  {hw.questions.map((q) => (
                    <QuestionGradeRow
                      key={q.id}
                      q={q}
                      answer={ansMap[q.id]}
                      aiQ={aiQMap[q.id]}
                      override={overrides[q.id]}
                      onOverride={(v) => setOverrides((p) => ({ ...p, [q.id]: v }))}
                    />
                  ))}
                </div>
              )}
            </>
          )}
        </main>

        {/* ── Right: AI analysis + grading panel ── */}
        <aside className="w-80 shrink-0 border-l border-gray-200 bg-white overflow-y-auto p-5 space-y-5">
          {selected && (
            <>
              <AIAnalysisPanel
                analysis={selected.ai_analysis}
                loading={aiLoading}
                onRefresh={runAI}
              />

              <div className="space-y-3">
                <h3 className="font-black text-sm">Final Grade</h3>
                <div>
                  <label className="text-xs font-bold text-gray-500 mb-1 block">Grade / Score</label>
                  <input value={grade} onChange={(e) => setGrade(e.target.value)}
                    placeholder="e.g. A, B+, 85%"
                    className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none focus:border-[#695be6]" />
                </div>
                <div>
                  <label className="text-xs font-bold text-gray-500 mb-1 block">Teacher Feedback</label>
                  <textarea value={feedback} onChange={(e) => setFeedback(e.target.value)} rows={4}
                    placeholder="Write personalised feedback for the student..."
                    className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none focus:border-[#695be6] resize-none" />
                </div>

                <div className="flex gap-2">
                  <button onClick={() => handleGrade(false)} disabled={saving}
                    className="flex-1 py-2.5 border border-gray-200 rounded-xl text-sm font-bold text-gray-600 hover:bg-gray-50 disabled:opacity-50 transition-colors">
                    Save Draft
                  </button>
                  <button onClick={() => handleGrade(true)} disabled={saving || !grade}
                    className="flex-1 py-2.5 bg-[#695be6] text-white rounded-xl text-sm font-bold hover:bg-[#5a4dd4] disabled:opacity-50 transition-colors flex items-center justify-center gap-1">
                    {saving
                      ? <span className="size-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                      : <><span className="material-symbols-outlined text-sm">publish</span> Publish</>
                    }
                  </button>
                </div>

                {selected.status === "graded" && (
                  <div className="flex items-center gap-2 bg-green-50 border border-green-200 rounded-xl px-3 py-2">
                    <span className="material-symbols-outlined text-green-600 text-base">check_circle</span>
                    <p className="text-xs text-green-700 font-medium">Grade published to student</p>
                  </div>
                )}
              </div>
            </>
          )}
        </aside>
      </div>
    </div>
  );
}
