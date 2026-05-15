import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import {
  fetchParentDashboard,
  fetchHomeworkOverview,
  selectChildren,
  selectHomeworkOverview,
} from "../../store/slices/parentSlice";
import api from "../../api";

const SUBJECT_FILTERS = ["All", "Mathematics", "Science", "English", "SST"];

// ── helpers ──────────────────────────────────────────────────
function ScoreBar({ pct }) {
  const color = pct >= 80 ? "bg-green-500" : pct >= 50 ? "bg-amber-500" : "bg-red-500";
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 bg-gray-100 rounded-full h-2">
        <div className={`${color} h-2 rounded-full transition-all`} style={{ width: `${pct}%` }} />
      </div>
      <span className={`text-xs font-bold ${pct >= 80 ? "text-green-600" : pct >= 50 ? "text-amber-600" : "text-red-600"}`}>{pct}%</span>
    </div>
  );
}

function QuestionRow({ q, ans, index }) {
  const atype = ans?.answer_type || q?.answerType || q?.answer_type || "typed";
  const isCorrect = ans?.is_correct;
  const earned = ans?.points_awarded ?? ans?.ai_score;
  const max = ans?.max_points || q?.maxPoints || q?.max_points || 1;
  const feedback = ans?.feedback;
  const teacherComment = ans?.teacher_comment;
  const qText = q?.questionText || q?.question_text || ans?.question_text || "";
  const options = q?.options || [];
  const correctOpt = options.find((o) => o.isCorrect || o.is_correct);

  let studentAnswerText = ans?.student_answer || null;
  if (!studentAnswerText && ans?.answer != null) {
    if (atype === "mcq" && options.length > 0) {
      const chosen = options.find((o) => o.id === ans.answer);
      studentAnswerText = chosen?.text || String(ans.answer);
    } else {
      studentAnswerText = String(ans.answer);
    }
  }

  const statusColor = isCorrect === true ? "text-green-500" : isCorrect === false ? "text-red-500" : "text-amber-500";
  const statusIcon = isCorrect === true ? "check_circle" : isCorrect === false ? "cancel" : "pending";
  const borderCls = isCorrect === true ? "border-green-100" : isCorrect === false ? "border-red-100" : "border-gray-100";

  return (
    <div className={`bg-white rounded-xl border ${borderCls} p-4 space-y-2`}>
      <div className="flex items-start gap-3">
        <span className={`material-symbols-outlined text-xl shrink-0 mt-0.5 ${statusColor}`}>{statusIcon}</span>
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-black text-[#695be6]">Q{index + 1}</span>
            <span className="text-[10px] font-bold uppercase bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">{atype}</span>
            <span className="ml-auto text-xs font-bold text-gray-500">{earned ?? "—"} / {max} pt{max > 1 ? "s" : ""}</span>
          </div>
          {qText && <p className="text-sm font-medium text-gray-800 leading-snug">{qText}</p>}
        </div>
      </div>

      {atype !== "upload" && atype !== "handwritten" && studentAnswerText && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 ml-8">
          <div className={`rounded-lg px-3 py-2 ${isCorrect === false ? "bg-red-50" : "bg-gray-50"}`}>
            <p className="text-[10px] font-bold text-gray-400 uppercase mb-0.5">Answer</p>
            <p className={`text-sm font-medium ${isCorrect === false ? "text-red-700" : isCorrect === true ? "text-green-700" : "text-gray-700"}`}>
              {studentAnswerText}
            </p>
          </div>
          {isCorrect === false && correctOpt && (
            <div className="bg-green-50 rounded-lg px-3 py-2">
              <p className="text-[10px] font-bold text-gray-400 uppercase mb-0.5">Correct Answer</p>
              <p className="text-sm font-medium text-green-700">{correctOpt.text}</p>
            </div>
          )}
        </div>
      )}

      {(atype === "upload" || atype === "handwritten") && ans?.file_url && (
        <a href={ans.file_url} target="_blank" rel="noreferrer"
          className="ml-8 inline-flex items-center gap-1 text-[#695be6] text-xs font-bold hover:underline">
          <span className="material-symbols-outlined text-sm">open_in_new</span> View submitted file
        </a>
      )}

      {feedback && (
        <div className="ml-8 flex items-start gap-2 bg-[#695be6]/5 rounded-lg px-3 py-2">
          <span className="material-symbols-outlined text-[#695be6] text-sm shrink-0 mt-0.5">psychology</span>
          <p className="text-xs text-[#695be6] leading-relaxed">{feedback}</p>
        </div>
      )}
      {teacherComment && (
        <div className="ml-8 flex items-start gap-2 bg-green-50 rounded-lg px-3 py-2">
          <span className="material-symbols-outlined text-green-600 text-sm shrink-0 mt-0.5">rate_review</span>
          <p className="text-xs text-green-700 leading-relaxed">{teacherComment}</p>
        </div>
      )}
    </div>
  );
}

// ── Submission Detail Drawer ─────────────────────────────────
function SubmissionDrawer({ hw, childId, onClose }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    api.get("/parent/homework-submission", { params: { homework_id: hw._id, child_id: childId } })
      .then((r) => setData(r.data))
      .catch(() => setError("Could not load submission details."))
      .finally(() => setLoading(false));
  }, [hw._id, childId]);

  const sub = data?.submission;
  const hwDoc = data?.homework;
  const hwQuestions = hwDoc?.questions || [];
  const subAnswers = sub?.answers || [];
  const ansMap = Object.fromEntries(subAnswers.map((a) => [a.question_id, a]));
  const aiMap = Object.fromEntries((sub?.ai_analysis?.question_analysis || []).map((q) => [q.question_id, q]));

  const scorePct = sub?.auto_score_pct;
  const grade = sub?.final_grade;
  const teacherFeedback = sub?.teacher_feedback;
  const aiAnalysis = sub?.ai_analysis;
  const isGraded = ["graded", "completed", "evaluated"].includes(sub?.status);

  const rows = hwQuestions.length > 0
    ? hwQuestions.map((q, i) => ({ q, i, ans: { ...(ansMap[q.id] || ansMap[q.questionId] || {}), ...(aiMap[q.id] || aiMap[q.questionId] || {}) } }))
    : subAnswers.map((a, i) => ({ q: null, i, ans: { ...a, ...(aiMap[a.question_id] || {}) } }));

  return (
    <div className="fixed inset-0 z-50 flex justify-end" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative bg-[#f6f6f8] w-full max-w-lg h-full overflow-y-auto shadow-2xl flex flex-col"
        style={{ fontFamily: "'Lexend', sans-serif" }}>
        {/* Drawer header */}
        <div className="bg-white border-b border-gray-100 px-5 py-4 flex items-center gap-3 sticky top-0 z-10">
          <button onClick={onClose} className="size-9 flex items-center justify-center rounded-xl hover:bg-gray-100">
            <span className="material-symbols-outlined text-xl">close</span>
          </button>
          <div className="flex-1 min-w-0">
            <p className="font-black text-sm truncate">{hw.title}</p>
            <p className="text-xs text-gray-400">{hw.subject} · Due: {hw.due_date || "N/A"}</p>
          </div>
        </div>

        <div className="flex-1 px-4 py-4 space-y-4">
          {loading && (
            <div className="flex items-center justify-center py-16">
              <span className="size-8 border-2 border-[#695be6]/30 border-t-[#695be6] rounded-full animate-spin" />
            </div>
          )}

          {error && (
            <div className="bg-red-50 border border-red-100 rounded-xl p-4 text-center text-red-600 text-sm">{error}</div>
          )}

          {!loading && !error && !sub && (
            <div className="bg-white rounded-2xl border border-gray-100 p-10 text-center text-gray-400">
              <span className="material-symbols-outlined text-4xl mb-2 block">assignment_late</span>
              <p className="text-sm font-medium">No submission yet</p>
              <p className="text-xs mt-1">Your child hasn't submitted this homework.</p>
            </div>
          )}

          {sub && (
            <>
              {/* Score hero */}
              <div className="bg-white rounded-2xl border border-gray-100 p-5">
                <div className="flex items-center gap-4">
                  <div className={`size-16 rounded-2xl flex flex-col items-center justify-center font-black ${
                    isGraded ? "bg-green-100" : "bg-amber-100"
                  }`}>
                    {grade ? (
                      <>
                        <span className={`text-2xl ${isGraded ? "text-green-700" : "text-amber-700"}`}>{grade}</span>
                        <span className="text-[10px] text-gray-500">Grade</span>
                      </>
                    ) : (
                      <span className={`material-symbols-outlined text-3xl ${isGraded ? "text-green-600" : "text-amber-600"}`}>
                        {isGraded ? "task_alt" : "pending"}
                      </span>
                    )}
                  </div>
                  <div className="flex-1">
                    <p className="font-black text-sm mb-1">
                      {isGraded ? "Graded" : sub.status === "submitted" ? "Submitted — Pending Review" : "In Progress"}
                    </p>
                    {scorePct != null && <ScoreBar pct={scorePct} />}
                    {sub.submitted_at && (
                      <p className="text-xs text-gray-400 mt-1">
                        Submitted {new Date(sub.submitted_at).toLocaleString()}
                      </p>
                    )}
                  </div>
                </div>
              </div>

              {/* Teacher feedback */}
              {teacherFeedback && (
                <div className="bg-white border border-indigo-100 rounded-xl p-4 flex items-start gap-3">
                  <div className="size-9 bg-indigo-100 rounded-full flex items-center justify-center shrink-0">
                    <span className="material-symbols-outlined text-[#695be6] text-base">rate_review</span>
                  </div>
                  <div>
                    <p className="text-xs font-black text-[#695be6] uppercase tracking-widest mb-1">Teacher Feedback</p>
                    <p className="text-sm text-gray-700 leading-relaxed">{teacherFeedback}</p>
                  </div>
                </div>
              )}

              {/* AI analysis summary */}
              {aiAnalysis?.overall_summary && (
                <div className="bg-gradient-to-r from-indigo-50 to-purple-50 border border-indigo-100 rounded-xl p-4 flex items-start gap-3">
                  <div className="size-9 bg-[#695be6] rounded-full flex items-center justify-center shrink-0">
                    <span className="material-symbols-outlined text-white text-base">smart_toy</span>
                  </div>
                  <div className="flex-1">
                    <p className="text-xs font-black text-[#695be6] uppercase tracking-widest mb-1">AI Analysis</p>
                    <p className="text-sm text-gray-700 leading-relaxed">{aiAnalysis.overall_summary}</p>
                    {(aiAnalysis.strength_areas?.length > 0 || aiAnalysis.weakness_areas?.length > 0) && (
                      <div className="grid grid-cols-2 gap-2 mt-3">
                        {aiAnalysis.strength_areas?.length > 0 && (
                          <div className="bg-green-50 border border-green-200 rounded-lg p-2">
                            <p className="text-[10px] font-bold text-green-700 mb-1">Strengths</p>
                            {aiAnalysis.strength_areas.map((s, i) => (
                              <p key={i} className="text-xs text-green-800">• {s}</p>
                            ))}
                          </div>
                        )}
                        {aiAnalysis.weakness_areas?.length > 0 && (
                          <div className="bg-red-50 border border-red-200 rounded-lg p-2">
                            <p className="text-[10px] font-bold text-red-700 mb-1">Needs Work</p>
                            {aiAnalysis.weakness_areas.map((s, i) => (
                              <p key={i} className="text-xs text-red-800">• {s}</p>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Per-question review */}
              {rows.length > 0 && (
                <div>
                  <p className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-2">Question Review</p>
                  <div className="space-y-2">
                    {rows.map(({ q, i, ans }) => (
                      <QuestionRow key={q?.id || q?.questionId || i} q={q} ans={ans} index={i} />
                    ))}
                  </div>
                </div>
              )}

              {/* File submission link */}
              {sub.submission_file_url && (
                <a href={sub.submission_file_url} target="_blank" rel="noreferrer"
                  className="flex items-center gap-2 bg-white border border-gray-100 rounded-xl p-4 text-[#695be6] font-bold text-sm hover:bg-[#695be6]/5 transition-colors">
                  <span className="material-symbols-outlined">open_in_new</span>
                  View submitted file
                </a>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Main page ────────────────────────────────────────────────
export default function ParentHomeworkOverview() {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const [filter, setFilter] = useState("All");
  const [selectedHw, setSelectedHw] = useState(null);

  const children = useSelector(selectChildren);
  const homeworkList = useSelector(selectHomeworkOverview);

  useEffect(() => {
    dispatch(fetchParentDashboard()).then((res) => {
      const kids = res.payload?.children || [];
      if (kids.length > 0) dispatch(fetchHomeworkOverview(kids[0]._id));
    });
  }, [dispatch]);

  const child = children[0];

  const filtered = filter === "All"
    ? homeworkList
    : homeworkList.filter((h) => h.subject === filter);

  const completed = homeworkList.filter((h) => ["graded", "submitted"].includes(h.child_submission_status)).length;
  const active = homeworkList.filter((h) => h.child_submission_status === "pending").length;
  const overdue = homeworkList.filter((h) => {
    if (!h.due_date) return false;
    return new Date(h.due_date) < new Date() && h.child_submission_status === "pending";
  }).length;

  return (
    <div className="bg-[#f6f6f8] min-h-screen pb-10" style={{ fontFamily: "'Lexend', sans-serif" }}>
      {selectedHw && child && (
        <SubmissionDrawer hw={selectedHw} childId={child._id} onClose={() => setSelectedHw(null)} />
      )}

      <div className="bg-white border-b border-gray-100 px-4 py-4 flex items-center gap-3">
        <button onClick={() => navigate("/parent")} className="size-9 flex items-center justify-center rounded-xl hover:bg-gray-100">
          <span className="material-symbols-outlined text-xl">arrow_back</span>
        </button>
        <h1 className="text-lg font-bold flex-1">Homework Overview</h1>
        <button onClick={() => navigate("/parent/notifications")} className="relative">
          <span className="material-symbols-outlined text-2xl text-gray-600">notifications</span>
        </button>
      </div>

      <div className="max-w-lg mx-auto px-4 pt-4">
        {child && (
          <div className="flex items-center gap-3 mb-4">
            <div className="size-12 rounded-full bg-[#695be6]/20 flex items-center justify-center">
              <span className="material-symbols-outlined text-[#695be6] text-2xl">person</span>
            </div>
            <div>
              <p className="font-bold">{child.name}</p>
              <p className="text-sm text-gray-500">Grade {child.grade_number}-{child.section_name} • {child.class_name}</p>
            </div>
          </div>
        )}

        <div className="flex items-center justify-between mb-3">
          <h2 className="font-bold text-base">Homework Summary</h2>
        </div>

        <div className="grid grid-cols-4 gap-2 mb-4">
          {[
            { label: "TOTAL",     count: homeworkList.length, bg: "bg-blue-50",   border: "border-blue-100",   text: "text-blue-700" },
            { label: "ACTIVE",    count: active,              bg: "bg-yellow-50", border: "border-yellow-100", text: "text-yellow-700" },
            { label: "COMPLETED", count: completed,           bg: "bg-green-50",  border: "border-green-100",  text: "text-green-700" },
            { label: "OVERDUE",   count: overdue,             bg: "bg-red-50",    border: "border-red-100",    text: "text-red-700" },
          ].map((s) => (
            <div key={s.label} className={`${s.bg} border ${s.border} rounded-xl p-3`}>
              <p className={`text-[10px] font-bold ${s.text}`}>{s.label}</p>
              <p className={`text-2xl font-black ${s.text}`}>{s.count}</p>
            </div>
          ))}
        </div>

        <div className="bg-[#695be6]/10 rounded-2xl p-4 mb-4">
          <div className="flex items-center gap-2 mb-1">
            <span className="material-symbols-outlined text-[#695be6] text-base">bar_chart</span>
            <p className="text-sm font-bold text-[#695be6]">Learning Consistency</p>
          </div>
          <p className="text-xl font-black text-[#695be6]">{completed}/{homeworkList.length} completed</p>
          <div className="flex items-center justify-between mt-2">
            <div className="flex items-center gap-2 flex-1">
              <span className="text-xs text-gray-600 font-medium">Completion</span>
              <div className="flex-1 bg-white/50 rounded-full h-2">
                <div className="bg-[#695be6] h-2 rounded-full"
                  style={{ width: `${homeworkList.length ? Math.round((completed / homeworkList.length) * 100) : 0}%` }} />
              </div>
              <span className="text-xs font-bold text-[#695be6]">
                {homeworkList.length ? Math.round((completed / homeworkList.length) * 100) : 0}%
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between mb-3">
          <h2 className="font-bold text-base">Subject-wise Homework</h2>
          <p className="text-xs text-gray-400">Tap a card to see submission</p>
        </div>
        <div className="flex gap-2 mb-3 overflow-x-auto pb-1">
          {SUBJECT_FILTERS.map((f) => (
            <button key={f} onClick={() => setFilter(f)}
              className={`shrink-0 px-3 py-1.5 rounded-full text-sm font-semibold transition-colors ${
                filter === f ? "bg-[#695be6] text-white" : "bg-white border border-gray-200 text-gray-600"
              }`}>
              {f}
            </button>
          ))}
        </div>

        {filtered.length === 0 ? (
          <div className="bg-white rounded-2xl border border-gray-100 p-8 text-center text-gray-400">
            <span className="material-symbols-outlined text-4xl mb-2">assignment</span>
            <p className="font-medium">No homework found</p>
          </div>
        ) : (
          <div className="flex flex-col gap-3 mb-6">
            {filtered.map((hw) => {
              const isOverdue = hw.due_date && new Date(hw.due_date) < new Date() && hw.child_submission_status === "pending";
              const subStatus = hw.child_submission_status || "pending";
              const hasSubmission = subStatus !== "pending";
              return (
                <button key={hw._id} onClick={() => setSelectedHw(hw)}
                  className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 text-left hover:border-[#695be6]/40 hover:shadow-md transition-all w-full">
                  <div className="flex items-start justify-between mb-1">
                    <p className="font-bold text-sm flex-1 pr-2">{hw.title}</p>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0 ${
                      subStatus === "graded"    ? "bg-green-100 text-green-700" :
                      subStatus === "submitted" ? "bg-blue-100 text-blue-700" :
                      isOverdue                 ? "bg-red-100 text-red-700" : "bg-yellow-100 text-yellow-700"
                    }`}>
                      {subStatus === "graded" ? "GRADED" : subStatus === "submitted" ? "SUBMITTED" : isOverdue ? "OVERDUE" : "PENDING"}
                    </span>
                  </div>
                  <p className="text-xs text-gray-400 mb-2">{hw.subject} · Due: {hw.due_date || "N/A"}</p>
                  <div className="flex items-center justify-between">
                    <p className="text-xs text-gray-500">{hw.questions?.length || 0} questions</p>
                    <div className="flex items-center gap-2">
                      {hw.child_grade && (
                        <span className="text-xs font-bold text-green-600">Grade: {hw.child_grade}</span>
                      )}
                      {hw.child_score_pct != null && !hw.child_grade && (
                        <span className="text-xs font-bold text-[#695be6]">{hw.child_score_pct}%</span>
                      )}
                      <span className={`flex items-center gap-0.5 text-xs font-semibold ${hasSubmission ? "text-[#695be6]" : "text-gray-300"}`}>
                        <span className="material-symbols-outlined text-sm">chevron_right</span>
                      </span>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        )}

        <div className="flex gap-3">
          <button onClick={() => navigate("/parent/notifications")}
            className="flex-1 border-2 border-[#695be6] text-[#695be6] font-bold py-3.5 rounded-2xl flex items-center justify-center gap-2">
            <span className="material-symbols-outlined text-xl">chat</span> Contact Teacher
          </button>
        </div>
      </div>
    </div>
  );
}
