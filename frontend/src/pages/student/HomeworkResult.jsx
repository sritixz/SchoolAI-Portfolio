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

  const { answers = {}, questionSet } = state || {};

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

  // Calculate score from MCQ only (typed/upload are teacher-graded)
  const mcqQuestions = questions.filter((q) => q.answerType === "mcq");
  const mcqCorrect = mcqQuestions.filter((q) => {
    const ans = answers[q.id];
    return q.options.find((o) => o.id === ans && o.isCorrect);
  }).length;

  const totalMcqPoints = mcqQuestions.reduce((s, q) => s + q.maxPoints, 0);
  const totalPoints = questions.reduce((s, q) => s + q.maxPoints, 0);
  const answeredCount = questions.filter((q) => answers[q.id] !== undefined && answers[q.id] !== null && answers[q.id] !== "").length;

  // Estimated score: MCQ scored + assume 70% for typed/upload if answered
  const nonMcqAnswered = questions.filter((q) => q.answerType !== "mcq" && answers[q.id]);
  const estimatedNonMcq = nonMcqAnswered.reduce((s, q) => s + Math.round(q.maxPoints * 0.7), 0);
  const estimatedScore = mcqCorrect + estimatedNonMcq;
  const scorePct = Math.round((estimatedScore / totalPoints) * 100);
  const grade = getGrade(scorePct);
  const enc = getEncouragement(scorePct);
  const col = getScoreColor(scorePct);

  const stats = [
    { label: "Questions", value: `${answeredCount}/${questions.length}`, icon: "quiz", color: "text-[#5b69e6]" },
    { label: "MCQ Score", value: `${mcqCorrect}/${totalMcqPoints}`, icon: "check_circle", color: "text-green-600" },
    { label: "Pending Review", value: `${nonMcqAnswered.length} answers`, icon: "pending", color: "text-amber-600" },
    { label: "Est. Score", value: `${estimatedScore}/${totalPoints}`, icon: "stars", color: "text-purple-600" },
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
                ? `Great work on the MCQ section! You correctly answered ${mcqCorrect} out of ${totalMcqPoints} objective questions. Your typed explanations show strong conceptual understanding — keep it up!`
                : scorePct >= 50
                ? `You're on the right track! You got ${mcqCorrect}/${totalMcqPoints} MCQs correct. Review the questions you missed and revisit the discriminant concept — it'll help with the typed questions too.`
                : `Don't worry — this topic takes practice. You answered ${mcqCorrect}/${totalMcqPoints} MCQs correctly. I recommend revisiting the quadratic formula and discriminant sections before your next attempt.`
              }
            </p>
            <button className="mt-3 text-sm font-bold text-[#5b69e6] hover:underline flex items-center gap-1">
              <span className="material-symbols-outlined text-base">auto_awesome</span>
              Get personalised study plan
            </button>
          </div>
        </div>

        {/* Question-by-question review */}
        <div>
          <h3 className="text-lg font-bold text-slate-800 mb-4">Question Review</h3>
          <div className="flex flex-col gap-3">
            {questions.map((q, i) => (
              <QuestionReview key={q.id} q={q} studentAnswer={answers[q.id]} index={i} />
            ))}
          </div>
        </div>

        {/* Actions */}
        <div className="flex flex-col sm:flex-row gap-3">
          <button
            onClick={() => navigate(`/student/homework/${homeworkId}`)}
            className="flex-1 flex items-center justify-center gap-2 py-4 border-2 border-[#5b69e6]/20 text-[#5b69e6] font-bold rounded-full hover:bg-[#5b69e6]/5 transition-all"
          >
            <span className="material-symbols-outlined">replay</span>
            Retry Homework
          </button>
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
