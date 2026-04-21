import { useLocation, useNavigate, useParams } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";

// ── Score helpers ────────────────────────────────────────────
function getScoreColor(pct) {
  if (pct >= 80) return { text: "text-green-600", bg: "bg-green-100", ring: "stroke-green-500" };
  if (pct >= 50) return { text: "text-amber-600", bg: "bg-amber-100", ring: "stroke-amber-500" };
  return { text: "text-red-600", bg: "bg-red-100", ring: "stroke-red-500" };
}

function getGrade(pct) {
  if (pct >= 90) return "A+";
  if (pct >= 80) return "A";
  if (pct >= 70) return "B+";
  if (pct >= 60) return "B";
  if (pct >= 50) return "C";
  return "D";
}

function getEncouragement(pct) {
  if (pct >= 80) return { emoji: "🎉", msg: "Outstanding work! You've mastered this topic." };
  if (pct >= 60) return { emoji: "👍", msg: "Good effort! A little more practice and you'll nail it." };
  return { emoji: "💪", msg: "Keep going! Every attempt makes you stronger." };
}

// ── Circular progress ring ───────────────────────────────────
function ScoreRing({ pct, grade }) {
  const r = 54;
  const circ = 2 * Math.PI * r;
  const offset = circ - (pct / 100) * circ;
  const col = getScoreColor(pct);

  return (
    <div className="relative flex items-center justify-center size-36">
      <svg className="-rotate-90" width="144" height="144">
        <circle cx="72" cy="72" r={r} fill="none" stroke="#e8e9f2" strokeWidth="10" />
        <circle
          cx="72" cy="72" r={r} fill="none"
          className={col.ring}
          strokeWidth="10"
          strokeDasharray={circ}
          strokeDashoffset={offset}
          strokeLinecap="round"
          style={{ transition: "stroke-dashoffset 1s ease" }}
        />
      </svg>
      <div className="absolute flex flex-col items-center">
        <span className={`text-3xl font-black ${col.text}`}>{grade}</span>
        <span className="text-xs text-slate-500 font-medium">{pct}%</span>
      </div>
    </div>
  );
}

// ── Question review row ──────────────────────────────────────
function QuestionReview({ q, studentAnswer, index }) {
  const answered = studentAnswer !== null && studentAnswer !== undefined && studentAnswer !== "";
  const isUpload = q.answerType === "upload";
  const isMcq = q.answerType === "mcq";

  // For MCQ, check correctness
  const correctOption = isMcq ? q.options.find((o) => o.isCorrect) : null;
  const selectedOption = isMcq ? q.options.find((o) => o.id === studentAnswer) : null;
  const mcqCorrect = isMcq && selectedOption?.isCorrect;

  const statusIcon = !answered ? "remove_circle" : isUpload ? "cloud_done" : isMcq ? (mcqCorrect ? "check_circle" : "cancel") : "pending";
  const statusColor = !answered ? "text-slate-300" : isUpload ? "text-blue-500" : isMcq ? (mcqCorrect ? "text-green-500" : "text-red-500") : "text-amber-500";

  return (
    <div className="flex items-start gap-4 p-4 bg-white rounded-xl border border-slate-100 shadow-sm">
      <span className={`material-symbols-outlined text-2xl shrink-0 mt-0.5 ${statusColor}`}>{statusIcon}</span>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-xs font-bold text-[#5b69e6] uppercase tracking-wider">Q{index + 1}</span>
          <span className="text-xs text-slate-400 capitalize">{q.answerType}</span>
          <span className="ml-auto text-xs font-bold text-slate-500">{q.maxPoints} pt{q.maxPoints > 1 ? "s" : ""}</span>
        </div>
        <p className="text-sm font-medium text-slate-700 leading-snug line-clamp-2"
          dangerouslySetInnerHTML={{ __html: q.questionText }} />
        {answered && (
          <div className="mt-2">
            {isMcq && (
              <p className={`text-xs font-medium ${mcqCorrect ? "text-green-600" : "text-red-500"}`}>
                Your answer: {selectedOption?.text || "—"}
                {!mcqCorrect && correctOption && (
                  <span className="text-green-600 ml-2">· Correct: {correctOption.text}</span>
                )}
              </p>
            )}
            {q.answerType === "typed" && (
              <p className="text-xs text-slate-500 italic line-clamp-2 mt-0.5">"{studentAnswer}"</p>
            )}
            {isUpload && (
              <p className="text-xs text-blue-500 font-medium mt-0.5">
                <span className="material-symbols-outlined text-xs align-middle mr-1">attach_file</span>
                {studentAnswer?.name || "File uploaded"}
              </p>
            )}
          </div>
        )}
        {!answered && (
          <p className="text-xs text-slate-400 mt-1 italic">Not answered</p>
        )}
      </div>
    </div>
  );
}

// ── Main screen ──────────────────────────────────────────────
export default function HomeworkResult() {
  const { homeworkId } = useParams();
  const { state } = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();

  const { answers = {}, questionSet, apiResult, fileSubmission, submissionDoc, allowRetries } = state || {};

  // ── File / handwritten submission result ──────────────────
  if (fileSubmission) {
    const doc = submissionDoc || {};
    const isGraded = ["graded", "completed", "evaluated"].includes(apiResult?.status || doc.status);
    const grade    = apiResult?.grade || doc.final_grade;
    const feedback = apiResult?.feedback || apiResult?.teacher_feedback || doc.teacher_feedback;
    const submittedAt = doc.submitted_at;
    const aiAnalysis  = doc.ai_analysis;
    const qAnalysis   = aiAnalysis?.question_analysis || [];
    const scorePct    = apiResult?.auto_score_pct ?? doc.auto_score_pct ?? aiAnalysis?.estimated_score_pct;
    const fileUrl     = doc.submission_file_url;

    const scoreCol = scorePct != null
      ? scorePct >= 80 ? "text-green-600" : scorePct >= 50 ? "text-amber-600" : "text-red-600"
      : "text-slate-600";

    if (!isGraded) {
      // Still pending review — show submitted confirmation with time
      return (
        <div className="min-h-screen bg-[#f6f6f8] flex flex-col items-center justify-center px-6" style={{ fontFamily: "'Lexend', sans-serif" }}>
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-10 max-w-md w-full text-center">
            <div className="size-20 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-6">
              <span className="material-symbols-outlined text-4xl text-green-600">cloud_done</span>
            </div>
            <h2 className="text-2xl font-black text-[#100e1a] mb-2">Submitted!</h2>
            <p className="text-slate-500 mb-1">Your work has been uploaded successfully.</p>
            {submittedAt && (
              <p className="text-xs text-slate-400 mb-2">
                Submitted on {new Date(submittedAt).toLocaleString("en-IN", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })}
              </p>
            )}
            <p className="text-xs text-slate-400 mb-8">Your teacher will review it and publish your grade. You'll be notified when it's ready.</p>
            <div className="flex flex-col gap-3">
              <button onClick={() => navigate("/student/homework")}
                className="w-full py-3 bg-[#5b69e6] text-white font-bold rounded-xl hover:bg-[#5b69e6]/90 transition-all shadow-lg shadow-[#5b69e6]/20">
                Back to Homework
              </button>
              <button onClick={() => navigate("/student")}
                className="w-full py-3 bg-slate-100 text-slate-700 font-bold rounded-xl hover:bg-slate-200 transition-all">
                Go to Dashboard
              </button>
            </div>
          </div>
        </div>
      );
    }

    // ── Graded: full analysis view ──────────────────────────
    return (
      <div className="min-h-screen bg-[#f6f6f8] text-slate-900 pb-16" style={{ fontFamily: "'Lexend', sans-serif" }}>
        {/* Header */}
        <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-[#5b69e6]/10">
          <div className="max-w-3xl mx-auto px-6 h-16 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="bg-[#5b69e6]/10 p-2 rounded-full">
                <span className="material-symbols-outlined text-[#5b69e6]">task_alt</span>
              </div>
              <div>
                <h1 className="font-bold text-base leading-tight">{questionSet?.unitTitle || "Homework"}</h1>
                <p className="text-xs text-[#5b69e6]/70 font-medium uppercase tracking-wider">Feedback & Analysis</p>
              </div>
            </div>
            {submittedAt && (
              <p className="text-xs text-slate-400">
                Submitted {new Date(submittedAt).toLocaleString("en-IN", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })}
              </p>
            )}
          </div>
        </header>

        <main className="max-w-3xl mx-auto px-6 py-8 flex flex-col gap-6">

          {/* Grade hero card */}
          <div className="bg-white rounded-2xl p-8 shadow-sm border border-slate-100 flex flex-col sm:flex-row items-center gap-6">
            <div className="flex flex-col items-center gap-1 shrink-0">
              {grade ? (
                <>
                  <span className={`text-6xl font-black ${scoreCol}`}>{grade}</span>
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Final Grade</p>
                </>
              ) : (
                <span className="material-symbols-outlined text-5xl text-green-500">task_alt</span>
              )}
              {scorePct != null && (
                <span className={`mt-1 text-sm font-bold ${scoreCol}`}>{scorePct}%</span>
              )}
            </div>
            <div className="flex-1 text-center sm:text-left">
              <h2 className="text-xl font-black text-slate-800 mb-1">Homework Graded</h2>
              {aiAnalysis?.overall_summary && (
                <p className="text-sm text-slate-500 leading-relaxed">{aiAnalysis.overall_summary}</p>
              )}
              {fileUrl && (
                <a href={fileUrl} target="_blank" rel="noreferrer"
                  className="inline-flex items-center gap-1 mt-3 text-xs font-bold text-[#5b69e6] hover:underline">
                  <span className="material-symbols-outlined text-sm">open_in_new</span> View submitted file
                </a>
              )}
            </div>
          </div>

          {/* Teacher feedback */}
          {feedback && (
            <div className="bg-white border border-indigo-100 rounded-xl p-5 flex items-start gap-4 shadow-sm">
              <div className="size-10 bg-indigo-100 rounded-full flex items-center justify-center shrink-0">
                <span className="material-symbols-outlined text-[#5b69e6]">rate_review</span>
              </div>
              <div>
                <p className="text-xs font-black text-[#5b69e6] uppercase tracking-widest mb-1">Teacher Feedback</p>
                <p className="text-sm text-slate-700 leading-relaxed">{feedback}</p>
              </div>
            </div>
          )}

          {/* AI analysis summary */}
          {aiAnalysis && (
            <div className="bg-gradient-to-r from-indigo-50 to-purple-50 border border-indigo-100 rounded-xl p-5 flex items-start gap-4">
              <div className="size-10 bg-[#5b69e6] rounded-full flex items-center justify-center shrink-0">
                <span className="material-symbols-outlined text-white">smart_toy</span>
              </div>
              <div className="flex-1">
                <p className="text-xs font-black text-[#5b69e6] uppercase tracking-widest mb-2">Vin AI Analysis</p>
                {(aiAnalysis.strength_areas?.length > 0 || aiAnalysis.weakness_areas?.length > 0) && (
                  <div className="grid grid-cols-2 gap-3 mb-3">
                    {aiAnalysis.strength_areas?.length > 0 && (
                      <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                        <p className="text-xs font-bold text-green-700 mb-1 flex items-center gap-1">
                          <span className="material-symbols-outlined text-sm">thumb_up</span> Strengths
                        </p>
                        {aiAnalysis.strength_areas.map((s, i) => (
                          <p key={i} className="text-xs text-green-800">• {s}</p>
                        ))}
                      </div>
                    )}
                    {aiAnalysis.weakness_areas?.length > 0 && (
                      <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                        <p className="text-xs font-bold text-red-700 mb-1 flex items-center gap-1">
                          <span className="material-symbols-outlined text-sm">warning</span> Needs Work
                        </p>
                        {aiAnalysis.weakness_areas.map((s, i) => (
                          <p key={i} className="text-xs text-red-800">• {s}</p>
                        ))}
                      </div>
                    )}
                  </div>
                )}
                {aiAnalysis.error_patterns?.length > 0 && (
                  <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 mb-3">
                    <p className="text-xs font-bold text-amber-700 mb-1">Error Patterns</p>
                    {aiAnalysis.error_patterns.map((e, i) => (
                      <p key={i} className="text-xs text-amber-800">• {e}</p>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Per-question analysis — merge hw questions + submission answers + AI */}
          {(() => {
            // Build lookup maps
            const hwQuestions = questionSet?.questions || [];
            const submAnswers = Array.isArray(doc.answers) ? doc.answers : [];
            const ansMap = Object.fromEntries(submAnswers.map((a) => [a.question_id, a]));
            const aiMap  = Object.fromEntries(qAnalysis.map((q) => [q.question_id, q]));

            // Use hw questions as the source of truth; fall back to qAnalysis if no hw questions
            const rows = hwQuestions.length > 0
              ? hwQuestions.map((q, i) => ({ q, i, qa: aiMap[q.id] || aiMap[q.questionId], ans: ansMap[q.id] || ansMap[q.questionId] }))
              : qAnalysis.map((qa, i) => ({ q: null, i, qa, ans: ansMap[qa.question_id] }));

            if (rows.length === 0) return null;

            return (
              <div>
                <h3 className="text-base font-bold text-slate-800 mb-3">Question-by-Question Review</h3>
                <div className="flex flex-col gap-3">
                  {rows.map(({ q, i, qa, ans }) => {
                    const isCorrect  = ans?.is_correct ?? qa?.is_correct;
                    const atype      = ans?.answer_type || q?.answerType || q?.answer_type || "typed";
                    const maxPts     = ans?.max_points || qa?.max_points || q?.maxPoints || q?.max_points || 1;
                    const earnedPts  = ans?.points_awarded ?? qa?.ai_score;
                    const qText      = q?.questionText || q?.question_text || "";
                    const options    = q?.options || [];
                    const correctOpt = options.find((o) => o.isCorrect || o.is_correct);

                    // Resolve student's answer text
                    const rawAns = ans?.answer;
                    let studentAnswerText = qa?.student_answer || null;
                    if (!studentAnswerText && rawAns != null) {
                      if (atype === "mcq" && options.length > 0) {
                        const chosen = options.find((o) => o.id === rawAns);
                        studentAnswerText = chosen?.text || String(rawAns);
                      } else {
                        studentAnswerText = String(rawAns);
                      }
                    }

                    const statusColor = isCorrect === true ? "text-green-500" : isCorrect === false ? "text-red-500" : "text-amber-500";
                    const statusIcon  = isCorrect === true ? "check_circle" : isCorrect === false ? "cancel" : "pending";
                    const borderCls   = isCorrect === true ? "border-green-100" : isCorrect === false ? "border-red-100" : "border-slate-100";

                    return (
                      <div key={qa?.question_id || q?.id || i} className={`bg-white rounded-xl border ${borderCls} p-4 shadow-sm space-y-3`}>
                        {/* Question header */}
                        <div className="flex items-start gap-3">
                          <span className={`material-symbols-outlined text-xl shrink-0 mt-0.5 ${statusColor}`}>{statusIcon}</span>
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="text-xs font-black text-[#5b69e6]">Q{i + 1}</span>
                              <span className="text-[10px] font-bold uppercase bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full">{atype}</span>
                              <span className="ml-auto text-xs font-bold text-slate-500">
                                {earnedPts ?? "—"} / {maxPts} pt{maxPts > 1 ? "s" : ""}
                              </span>
                            </div>
                            {qText && <p className="text-sm font-medium text-slate-800 leading-snug">{qText}</p>}
                          </div>
                        </div>

                        {/* File upload answer */}
                        {(atype === "upload" || atype === "handwritten") && (
                          ans?.file_url || fileUrl ? (
                            <a href={ans?.file_url || fileUrl} target="_blank" rel="noreferrer"
                              className="flex items-center gap-2 text-[#5b69e6] text-sm font-medium hover:underline bg-[#5b69e6]/5 rounded-lg px-3 py-2">
                              <span className="material-symbols-outlined text-base">open_in_new</span>
                              View submitted file
                            </a>
                          ) : (
                            <p className="text-xs text-slate-400 italic">No file uploaded</p>
                          )
                        )}

                        {/* MCQ / typed answer */}
                        {atype !== "upload" && atype !== "handwritten" && (
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                            <div className={`rounded-lg px-3 py-2 ${isCorrect === false ? "bg-red-50" : "bg-slate-50"}`}>
                              <p className="text-[10px] font-bold text-slate-400 uppercase mb-0.5">Your Answer</p>
                              <p className={`text-sm font-medium ${isCorrect === false ? "text-red-700" : isCorrect === true ? "text-green-700" : "text-slate-700"}`}>
                                {studentAnswerText || <span className="italic text-slate-400">No answer</span>}
                              </p>
                            </div>
                            {isCorrect === false && correctOpt && (
                              <div className="bg-green-50 rounded-lg px-3 py-2">
                                <p className="text-[10px] font-bold text-slate-400 uppercase mb-0.5">Correct Answer</p>
                                <p className="text-sm font-medium text-green-700">{correctOpt.text}</p>
                              </div>
                            )}
                            {isCorrect === false && !correctOpt && qa?.feedback && (
                              <div className="bg-green-50 rounded-lg px-3 py-2">
                                <p className="text-[10px] font-bold text-slate-400 uppercase mb-0.5">Expected</p>
                                <p className="text-sm font-medium text-green-700">{q?.sampleAnswer || q?.sample_answer || "See feedback"}</p>
                              </div>
                            )}
                          </div>
                        )}

                        {/* AI feedback */}
                        {qa?.feedback && (
                          <div className="flex items-start gap-2 bg-[#5b69e6]/5 rounded-lg px-3 py-2">
                            <span className="material-symbols-outlined text-[#5b69e6] text-sm shrink-0 mt-0.5">psychology</span>
                            <p className="text-xs text-[#5b69e6] leading-relaxed">{qa.feedback}</p>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })()}

          {/* Actions */}
          <div className="flex flex-col sm:flex-row gap-3">
            <button onClick={() => navigate("/student/homework")}
              className="flex-1 flex items-center justify-center gap-2 py-4 bg-[#5b69e6] text-white font-bold rounded-full shadow-lg shadow-[#5b69e6]/20 hover:brightness-110 transition-all">
              <span className="material-symbols-outlined">arrow_back</span>
              Back to Homework
            </button>
            <button onClick={() => navigate("/student")}
              className="flex-1 flex items-center justify-center gap-2 py-4 bg-slate-100 text-slate-700 font-bold rounded-full hover:bg-slate-200 transition-all">
              <span className="material-symbols-outlined">home</span>
              Go to Dashboard
            </button>
          </div>
        </main>
      </div>
    );
  }

  if (!questionSet) {
    return (
      <div className="min-h-screen bg-[#f6f6f8] flex items-center justify-center" style={{ fontFamily: "'Lexend', sans-serif" }}>
        <div className="text-center">
          <p className="font-bold text-slate-600">No result data found.</p>
          <button onClick={() => navigate("/student/homework")} className="mt-4 px-6 py-2 bg-[#5b69e6] text-white rounded-full font-bold">
            Back to Homework
          </button>
        </div>
      </div>
    );
  }

  const questions = questionSet.questions;

  // Use server score if available, otherwise compute locally
  const serverScorePct = apiResult?.auto_score_pct ?? null;
  const mcqEarned      = apiResult?.mcq_earned ?? null;
  const mcqTotal       = apiResult?.mcq_total ?? null;

  // Local fallback calculation
  const mcqQuestions = questions.filter((q) => q.answerType === "mcq");
  const localMcqCorrect = mcqQuestions.filter((q) => {
    const ans = answers[q.id];
    return q.options?.find((o) => o.id === ans && o.isCorrect);
  }).length;
  const localMcqTotal = mcqQuestions.reduce((s, q) => s + (q.maxPoints || 1), 0);

  const finalMcqCorrect = mcqEarned ?? localMcqCorrect;
  const finalMcqTotal   = mcqTotal  ?? localMcqTotal;
  const totalPoints     = questions.reduce((s, q) => s + (q.maxPoints || 1), 0);
  const answeredCount   = questions.filter((q) => answers[q.id] !== undefined && answers[q.id] !== null && answers[q.id] !== "").length;

  const nonMcqAnswered = questions.filter((q) => q.answerType !== "mcq" && answers[q.id]);
  const estimatedNonMcq = nonMcqAnswered.reduce((s, q) => s + Math.round((q.maxPoints || 1) * 0.7), 0);
  const estimatedScore  = finalMcqCorrect + estimatedNonMcq;
  const scorePct = serverScorePct ?? (totalPoints > 0 ? Math.round((estimatedScore / totalPoints) * 100) : 0);
  const grade = getGrade(scorePct);
  const enc   = getEncouragement(scorePct);
  const col   = getScoreColor(scorePct);

  const stats = [
    { label: "Questions",      value: `${answeredCount}/${questions.length}`, icon: "quiz",         color: "text-[#5b69e6]" },
    { label: "MCQ Score",      value: `${finalMcqCorrect}/${finalMcqTotal}`,  icon: "check_circle", color: "text-green-600" },
    { label: "Pending Review", value: `${nonMcqAnswered.length} answers`,     icon: "pending",      color: "text-amber-600" },
    { label: "Est. Score",     value: `${estimatedScore}/${totalPoints}`,     icon: "stars",        color: "text-purple-600" },
  ];

  return (
    <div className="min-h-screen bg-[#f6f6f8] text-slate-900 pb-16" style={{ fontFamily: "'Lexend', sans-serif" }}>

      {/* Header */}
      <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-[#5b69e6]/10">
        <div className="max-w-4xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-[#5b69e6]/10 p-2 rounded-full">
              <span className="material-symbols-outlined text-[#5b69e6]">{questionSet.subjectIcon}</span>
            </div>
            <div>
              <h1 className="font-bold text-base leading-tight">{questionSet.unitTitle}</h1>
              <p className="text-xs text-[#5b69e6]/70 font-medium uppercase tracking-wider">Submission Summary</p>
            </div>
          </div>
          {user?.avatar ? (
            <img src={user.avatar} alt="avatar" className="size-10 rounded-full border-2 border-[#5b69e6]/20 object-cover" />
          ) : (
            <div className="size-10 rounded-full bg-[#5b69e6]/20 flex items-center justify-center border-2 border-[#5b69e6]/30">
              <span className="material-symbols-outlined text-[#5b69e6]">person</span>
            </div>
          )}
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-10 flex flex-col gap-8">

        {/* Hero score card */}
        <div className={`bg-white rounded-2xl p-8 shadow-sm border border-slate-100 flex flex-col md:flex-row items-center gap-8`}>
          <ScoreRing pct={scorePct} grade={grade} />
          <div className="flex-1 text-center md:text-left">
            <div className="flex items-center gap-2 justify-center md:justify-start mb-2">
              <span className="text-3xl">{enc.emoji}</span>
              <span className={`text-sm font-bold uppercase tracking-widest ${col.text}`}>
                {grade === "A+" || grade === "A" ? "Excellent" : grade === "B+" || grade === "B" ? "Good Job" : "Keep Trying"}
              </span>
            </div>
            <h2 className="text-2xl font-black text-slate-800 mb-2">{enc.msg}</h2>
            <p className="text-slate-500 text-sm">
              Typed and upload answers are pending teacher review. Your final grade will be updated once reviewed.
            </p>
            <div className="flex flex-wrap gap-2 mt-4 justify-center md:justify-start">
              {questionSet.tags.map((tag) => (
                <span key={tag} className="bg-[#5b69e6]/10 text-[#5b69e6] text-[10px] font-bold uppercase tracking-widest px-3 py-1 rounded-full">
                  {tag}
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {stats.map((s) => (
            <div key={s.label} className="bg-white rounded-xl p-4 border border-slate-100 shadow-sm flex flex-col items-center gap-1 text-center">
              <span className={`material-symbols-outlined text-2xl ${s.color}`}>{s.icon}</span>
              <p className="text-xl font-black text-slate-800">{s.value}</p>
              <p className="text-xs text-slate-400 font-medium">{s.label}</p>
            </div>
          ))}
        </div>

        {/* Vin AI feedback panel */}
        <div className="bg-gradient-to-r from-indigo-50 to-purple-50 border border-indigo-100 rounded-xl p-6 flex items-start gap-4">
          <div className="size-12 bg-[#5b69e6] rounded-full flex items-center justify-center shrink-0">
            <span className="material-symbols-outlined text-white text-2xl">smart_toy</span>
          </div>
          <div>
            <p className="font-bold text-slate-800 mb-1">Vin AI Feedback</p>
            <p className="text-sm text-slate-600 leading-relaxed">
              {scorePct >= 80
                ? `Great work on the MCQ section! You correctly answered ${finalMcqCorrect} out of ${finalMcqTotal} objective questions. Your typed explanations show strong conceptual understanding — keep it up!`
                : scorePct >= 50
                ? `You're on the right track! You got ${finalMcqCorrect}/${finalMcqTotal} MCQs correct. Review the questions you missed and revisit the concept — it'll help with the typed questions too.`
                : `Don't worry — this topic takes practice. You answered ${finalMcqCorrect}/${finalMcqTotal} MCQs correctly. I recommend revisiting the key concepts before your next attempt.`
              }
            </p>
            <button className="mt-3 text-sm font-bold text-[#5b69e6] hover:underline flex items-center gap-1">
              <span className="material-symbols-outlined text-base">auto_awesome</span>
              Get personalised study plan
            </button>
          </div>
        </div>

        {/* Teacher feedback (shown when graded) */}
        {(apiResult?.feedback || apiResult?.teacher_feedback) && (
          <div className="bg-white border border-green-200 rounded-xl p-6 flex items-start gap-4 shadow-sm">
            <div className="size-12 bg-green-100 rounded-full flex items-center justify-center shrink-0">
              <span className="material-symbols-outlined text-green-600 text-2xl">rate_review</span>
            </div>
            <div>
              <p className="font-bold text-slate-800 mb-1">Teacher Feedback</p>
              <p className="text-sm text-slate-600 leading-relaxed">
                {apiResult.feedback || apiResult.teacher_feedback}
              </p>
            </div>
          </div>
        )}

        {/* Question-by-question review */}
        {questions.length > 0 && (
        <div>
          <h3 className="text-lg font-bold text-slate-800 mb-4">Question Review</h3>
          <div className="flex flex-col gap-3">
            {questions.map((q, i) => (
              <QuestionReview key={q.id} q={q} studentAnswer={answers[q.id]} index={i} />
            ))}
          </div>
        </div>
        )}

        {/* Actions */}
        <div className="flex flex-col sm:flex-row gap-3">
          {allowRetries && (
            <button
              onClick={() => navigate(`/student/homework/${homeworkId}`)}
              className="flex-1 flex items-center justify-center gap-2 py-4 border-2 border-[#5b69e6]/20 text-[#5b69e6] font-bold rounded-full hover:bg-[#5b69e6]/5 transition-all"
            >
              <span className="material-symbols-outlined">replay</span>
              Retry Homework
            </button>
          )}
          <button
            onClick={() => navigate("/student/homework")}
            className="flex-1 flex items-center justify-center gap-2 py-4 bg-[#5b69e6] text-white font-bold rounded-full shadow-lg shadow-[#5b69e6]/20 hover:brightness-110 transition-all"
          >
            <span className="material-symbols-outlined">arrow_back</span>
            Back to Homework
          </button>
          <button
            onClick={() => navigate("/student")}
            className="flex-1 flex items-center justify-center gap-2 py-4 bg-slate-100 text-slate-700 font-bold rounded-full hover:bg-slate-200 transition-all"
          >
            <span className="material-symbols-outlined">home</span>
            Go to Dashboard
          </button>
        </div>
      </main>
    </div>
  );
}
