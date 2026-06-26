import { useState, useMemo, useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useAuth } from "../../context/AuthContext";
import { getFirstName, getInitial } from "../../utils/nameUtils";
import { useNavigate } from "react-router-dom";
import { fetchStudentHomework, selectStudentHomework, selectStudentHwStatus } from "../../store/slices/homeworkSlice";

// ── Status config ────────────────────────────────────────────
const STATUS_CONFIG = {
  pending:     { label: "Pending",     bg: "bg-[#FFE5E5]",  text: "text-red-600",    border: "border-l-[#6B5CE7]", badge: "bg-[#FFE5E5] text-red-600",     icon: "assignment_late" },
  in_progress: { label: "In Progress", bg: "bg-[#D4C5F9]",  text: "text-indigo-700", border: "border-l-[#D4C5F9]", badge: "bg-[#D4C5F9] text-indigo-700",  icon: "pending_actions" },
  overdue:     { label: "Overdue",     bg: "bg-[#FFB3BA]",  text: "text-red-800",    border: "border-l-red-500",   badge: "bg-[#FFB3BA] text-red-800",     icon: "history" },
  completed:   { label: "Completed",   bg: "bg-[#C8E6C9]",  text: "text-green-700",  border: "border-l-[#C8E6C9]", badge: "bg-[#C8E6C9] text-green-700",   icon: "check_circle" },
  submitted:   { label: "Awaiting Evaluation", bg: "bg-[#FFF3CD]", text: "text-amber-700", border: "border-l-amber-400", badge: "bg-[#FFF3CD] text-amber-700", icon: "hourglass_top" },
};

// ── Subject accent colors ────────────────────────────────────
const SUBJECT_COLORS = {
  indigo:  "bg-indigo-50 text-indigo-600",
  blue:    "bg-blue-50 text-blue-600",
  green:   "bg-green-50 text-green-600",
  yellow:  "bg-yellow-50 text-yellow-700",
  purple:  "bg-purple-50 text-purple-600",
  orange:  "bg-orange-50 text-orange-600",
};

const DIFFICULTY_COLORS = {
  low:    "text-green-600",
  medium: "text-amber-600",
  high:   "text-red-600",
};

// ── Helpers ──────────────────────────────────────────────────
function formatDueDate(dateStr, status) {
  const due = new Date(dateStr);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const diffDays = Math.round((due - today) / 86400000);

  if (status === "completed") return null; // handled separately
  if (status === "overdue") {
    const days = Math.abs(diffDays);
    return { label: `Due ${due.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })} (${days} day${days > 1 ? "s" : ""} ago)`, urgent: true, icon: "warning" };
  }
  if (diffDays === 0) return { label: "Due Today", urgent: true, icon: "priority_high" };
  if (diffDays === 1) return { label: "Due Tomorrow", urgent: true, icon: "priority_high" };
  return { label: `Due ${due.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}`, urgent: false, icon: "event" };
}

// ── Homework Card ────────────────────────────────────────────
function HomeworkCard({ hw }) {
  const [expanded, setExpanded] = useState(false);
  const navigate = useNavigate();
  // Show "submitted" status badge when homework is submitted but not yet graded
  const displayStatus = (hw.status === "completed" && hw.submission_status === "submitted" && !hw.grade) ? "submitted" : hw.status;
  const sc = STATUS_CONFIG[displayStatus] ?? STATUS_CONFIG["pending"];
  const subjectCls = SUBJECT_COLORS[hw.subjectColor] || "bg-gray-100 text-gray-600";
  const dueInfo = formatDueDate(hw.dueDate, hw.status);

  const actionBtn = ({
    pending:     { label: "Start Homework",    cls: "bg-[#6B5CE7] hover:bg-[#5a4dd4] text-white shadow-lg shadow-[#6B5CE7]/20" },
    in_progress: { label: "Continue Homework", cls: "bg-[#6B5CE7]/10 hover:bg-[#6B5CE7]/20 text-[#6B5CE7]" },
    overdue:     { label: "Complete Now",      cls: "bg-red-500 hover:bg-red-600 text-white shadow-lg shadow-red-500/20" },
    completed:   { label: "View Feedback",     cls: "bg-gray-100 hover:bg-gray-200 text-gray-700" },
  })[hw.status] ?? { label: "Open", cls: "bg-gray-100 text-gray-700" };

  // Override action button for submitted-awaiting-evaluation
  if (displayStatus === "submitted") {
    actionBtn.label = "View Submission";
    actionBtn.cls = "bg-gray-100 hover:bg-gray-200 text-gray-700";
  }

  return (
    <div className={`bg-white p-4 sm:p-8 rounded-xl shadow-sm border border-l-4 ${sc.border} hover:shadow-lg transition-shadow ${hw.status === "overdue" ? "opacity-90 hover:opacity-100" : ""}`}>
      {/* Header */}
      <div className="flex flex-wrap justify-between items-start gap-3 sm:gap-4 mb-4 sm:mb-6">
        <div className="flex flex-col gap-1">
          <div className="flex flex-wrap gap-2 items-center">
            <span className={`px-2 sm:px-3 py-1 text-xs font-bold rounded-full uppercase tracking-wider ${subjectCls}`}>
              {hw.subject}
            </span>
            <span className={`px-2 sm:px-3 py-1 text-xs font-bold rounded-full uppercase tracking-wider ${sc.badge}`}>
              {sc.label}
            </span>
          </div>
          <h3 className="text-lg sm:text-2xl font-bold mt-2 text-[#2D2D2D]">{hw.title}</h3>
          <p className="text-sm text-gray-500 mt-0.5">Assigned by {hw.assignedBy}</p>
        </div>
        {hw.status === "completed" && hw.grade && (
          <div className="text-right">
            <p className="text-3xl font-bold text-green-600">{hw.grade}</p>
            <p className="text-[10px] font-bold text-gray-400 uppercase">Grade</p>
          </div>
        )}
      </div>

      {/* Meta row */}
      <div className="flex flex-wrap gap-6 mb-6 text-[#4F4F4F]">
        {hw.status === "completed" ? (
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-xl text-green-500">check_circle</span>
            <span className="text-sm font-medium">
              Submitted {new Date(hw.submittedDate).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
            </span>
          </div>
        ) : (
          dueInfo && (
            <div className={`flex items-center gap-2 ${dueInfo.urgent ? "text-orange-600 font-bold" : ""}`}>
              <span className="material-symbols-outlined text-xl">{dueInfo.icon}</span>
              <span className="text-sm">{dueInfo.label}</span>
            </div>
          )
        )}
        <div className="flex items-center gap-2">
          <span className="material-symbols-outlined text-xl">bar_chart</span>
          <span className={`text-sm font-medium capitalize ${DIFFICULTY_COLORS[hw.difficultyLevel]}`}>
            Difficulty: {hw.difficultyLevel.charAt(0).toUpperCase() + hw.difficultyLevel.slice(1)}
          </span>
        </div>
        {hw.status === "in_progress" ? (
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-xl">schedule</span>
            <span className="text-sm font-medium">
              Est. Remaining: {Math.round(hw.estimatedDurationMinutes * (1 - hw.progressPercent / 100))} mins
            </span>
          </div>
        ) : hw.status !== "completed" ? (
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-xl">schedule</span>
            <span className="text-sm font-medium">Est. Time: {hw.estimatedDurationMinutes} mins</span>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-xl">star</span>
            <span className="text-sm font-medium">
              {hw.teacherFeedback ? hw.teacherFeedback.split(".")[0] : "Submitted"}
            </span>
          </div>
        )}
      </div>

      {/* Progress bar for in_progress */}
      {hw.status === "in_progress" && hw.progressPercent > 0 && (
        <div className="mb-6">
          <div className="flex justify-between text-xs font-bold mb-2">
            <span className="text-[#4F4F4F] uppercase tracking-wider">Progress</span>
            <span className="text-[#4F4F4F]">{hw.progressPercent}%</span>
          </div>
          <div className="w-full bg-gray-100 h-2.5 rounded-full overflow-hidden">
            <div className="bg-[#6B5CE7] h-full rounded-full transition-all" style={{ width: `${hw.progressPercent}%` }}></div>
          </div>
        </div>
      )}

      {/* Awaiting evaluation indicator */}
      {displayStatus === "submitted" && (
        <div className="mb-6 flex items-center gap-2 p-3 bg-amber-50 border border-amber-200 rounded-xl">
          <span className="material-symbols-outlined text-amber-500">hourglass_top</span>
          <span className="text-sm font-medium text-amber-700">Submitted — waiting for teacher evaluation</span>
        </div>
      )}

      {/* Expandable: description + feedback */}
      {expanded && (
        <div className="mb-6 p-4 bg-gray-50 rounded-xl text-sm text-gray-600 space-y-3">
          <p><span className="font-bold text-gray-700">Description: </span>{hw.description}</p>
          {hw.teacherFeedback && (
            <p><span className="font-bold text-gray-700">Teacher Feedback: </span>{hw.teacherFeedback}</p>
          )}
          {hw.tags.length > 0 && (
            <div className="flex flex-wrap gap-2 pt-1">
              {hw.tags.map((tag) => (
                <span key={tag} className="px-2 py-0.5 bg-white border border-gray-200 rounded-full text-xs text-gray-500">#{tag}</span>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-3">
        <button
          onClick={() => {
            if (displayStatus === "submitted" || hw.status === "completed") {
              import("../../api").then(({ default: api }) => {
                // Fetch submission result + homework questions in parallel
                Promise.all([
                  api.get(`/homework/${hw.id}/result`),
                  api.get(`/homework/${hw.id}/questions`).catch(() => ({ data: [] })),
                ]).then(([{ data }, { data: questions }]) => {
                  const isFile = hw.submissionType === "file_upload" || hw.submissionType === "handwritten"
                    || data.submission_type === "file_upload" || data.submission_type === "handwritten"
                    || hw.submission_type === "file_upload" || hw.submission_type === "handwritten";
                  const questionSet = {
                    questions: questions || [],
                    unitTitle: hw.title || "Homework",
                    tags: hw.tags || [],
                    subjectIcon: "menu_book",
                  };
                  navigate(`/student/homework/${hw.id}/result`, {
                    state: {
                      answers: {},
                      questionSet,
                      fileSubmission: isFile,
                      submissionDoc: data,
                      allowRetries: hw.allow_retries || false,
                      apiResult: {
                        status: data.status || "completed",
                        grade: data.final_grade || data.grade,
                        feedback: data.teacher_feedback || data.feedback,
                        auto_score_pct: data.auto_score_pct,
                        mcq_earned: data.mcq_earned,
                        mcq_total: data.mcq_total,
                      },
                    },
                  });
                }).catch(() => {
                  const isFile = hw.submissionType === "file_upload" || hw.submissionType === "handwritten";
                  navigate(`/student/homework/${hw.id}/result`, {
                    state: {
                      answers: {},
                      questionSet: { questions: [], unitTitle: hw.title || "Homework", tags: hw.tags || [], subjectIcon: "menu_book" },
                      fileSubmission: isFile,
                      allowRetries: hw.allow_retries || false,
                      apiResult: { status: "completed", grade: hw.grade, feedback: hw.teacherFeedback },
                    },
                  });
                });
              });
            } else {
              navigate(`/student/homework/${hw.id}`);
            }
          }}
          className={`flex-1 py-3 sm:py-4 font-bold rounded-full transition-all text-base sm:text-lg ${actionBtn.cls}`}
        >
          {actionBtn.label}
        </button>
        {/* Show separate Retry button when submitted + retries allowed */}
        {displayStatus === "submitted" && hw.allow_retries && !hw.solutions_unlocked && (
          <button
            onClick={() => navigate(`/student/homework/${hw.id}`, { state: { reattempt: true } })}
            className="px-5 py-3 sm:py-4 font-bold rounded-full transition-all text-base bg-[#6B5CE7] hover:bg-[#5a4dd4] text-white shadow-lg shadow-[#6B5CE7]/20"
            title="Reattempt this homework"
          >
            <span className="material-symbols-outlined text-lg align-middle">replay</span>
          </button>
        )}
        <button
          onClick={() => setExpanded(!expanded)}
          className="px-4 py-4 border border-gray-200 rounded-full text-gray-400 hover:bg-gray-50 transition-colors"
          title={expanded ? "Show less" : "Show details"}
        >
          <span className="material-symbols-outlined">{expanded ? "expand_less" : "expand_more"}</span>
        </button>
      </div>
    </div>
  );
}

// ── Main Page ────────────────────────────────────────────────
export default function StudentHomework() {
  const { user } = useAuth();
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const reduxHomework = useSelector(selectStudentHomework);
  const hwStatus      = useSelector(selectStudentHwStatus);
  const [allHomework, setAllHomework] = useState([]);

  const [activeStatus, setActiveStatus] = useState(null);
  const [activeSubject, setActiveSubject] = useState(null);
  const [sortOrder, setSortOrder] = useState("latest");

  useEffect(() => { dispatch(fetchStudentHomework()); }, [dispatch]);
  useEffect(() => { if (reduxHomework.length) setAllHomework(reduxHomework); }, [reduxHomework]);

  // Derived counts
  const counts = useMemo(() => ({
    pending:     allHomework.filter(h => h.status === "pending").length,
    overdue:     allHomework.filter(h => h.status === "overdue").length,
    in_progress: allHomework.filter(h => h.status === "in_progress").length,
    completed:   allHomework.filter(h => h.status === "completed" && (h.submission_status === "graded" || h.grade)).length,
    submitted:   allHomework.filter(h => h.status === "completed" && h.submission_status === "submitted" && !h.grade).length,
  }), [allHomework]);

  const subjects = useMemo(() => [...new Set(allHomework.map(h => h.subject))], [allHomework]);

  const filtered = useMemo(() => {
    let list = [...allHomework];
    if (activeStatus) {
      if (activeStatus === "submitted") {
        list = list.filter(h => h.status === "completed" && h.submission_status === "submitted" && !h.grade);
      } else if (activeStatus === "completed") {
        list = list.filter(h => h.status === "completed" && (h.submission_status === "graded" || h.grade));
      } else {
        list = list.filter(h => h.status === activeStatus);
      }
    }
    if (activeSubject) list = list.filter(h => h.subject === activeSubject);
    if (sortOrder === "latest") list.sort((a, b) => new Date(b.assignedDate) - new Date(a.assignedDate));
    if (sortOrder === "oldest") list.sort((a, b) => new Date(a.assignedDate) - new Date(b.assignedDate));
    if (sortOrder === "difficulty") {
      const order = { high: 0, medium: 1, low: 2 };
      list.sort((a, b) => order[a.difficultyLevel] - order[b.difficultyLevel]);
    }
    return list;
  }, [allHomework, activeStatus, activeSubject, sortOrder]);

  const sortLabels = { latest: "Latest", oldest: "Oldest", difficulty: "Difficulty" };
  const sortCycle = () => {
    setSortOrder(prev => prev === "latest" ? "oldest" : prev === "oldest" ? "difficulty" : "latest");
  };

  return (
    <div className="flex min-h-screen bg-[#FFF0F0]" style={{ fontFamily: "'Lexend', sans-serif" }}>

      {/* ── Sidebar ── */}
      <aside className="hidden md:flex w-72 sticky top-0 h-screen bg-white border-r border-gray-200 flex-col p-6 overflow-y-auto shrink-0">
        {/* Back to Dashboard */}
        <button
          onClick={() => navigate("/student")}
          className="flex items-center gap-2 mb-6 px-3 py-2 rounded-xl hover:bg-gray-100 text-gray-600 font-semibold text-sm transition-colors self-start"
        >
          <span className="material-symbols-outlined text-base">arrow_back</span>
          Dashboard
        </button>

        {/* Profile */}
        <div className="flex items-center gap-4 mb-8">
          <div className="size-14 rounded-full p-0.5 border-2 border-[#6B5CE7] shrink-0">
            {user?.avatar ? (
              <img src={user.avatar} alt="avatar" className="w-full h-full rounded-full object-cover" />
            ) : (
              <div className="w-full h-full rounded-full bg-[#6B5CE7] flex items-center justify-center text-white font-bold">
                {getInitial(user?.name)}
              </div>
            )}
          </div>
          <div>
            <h1 className="text-base font-bold leading-tight">Good Morning, {getFirstName(user?.name) || "Student"}</h1>
            <p className="text-xs text-gray-500 font-medium">Friday, 27 March 2026</p>
          </div>
        </div>

        {/* LumiTutor */}
        <button
          onClick={() => window.open("/student/vin-ai", "_blank")}
          className="w-full flex items-center justify-center gap-2 mb-8 px-4 py-3 bg-[#6B5CE7] text-white font-bold rounded-xl shadow-lg shadow-[#6B5CE7]/20 hover:scale-[1.02] transition-transform">
          <span className="material-symbols-outlined text-xl">auto_awesome</span>
          <span>LumiTutor Chat</span>
        </button>

        {/* Status filters */}
        <div className="space-y-2 mb-8">
          <p className="text-xs font-bold text-gray-400 uppercase tracking-widest px-2 mb-3">Status</p>
          {[
            { key: "pending",     label: "Pending",     count: counts.pending,     bg: "bg-[#FFE5E5]",  text: "text-red-700",    icon: "assignment_late" },
            { key: "overdue",     label: "Overdue",     count: counts.overdue,     bg: "bg-[#FFB3BA]",  text: "text-orange-800", icon: "history" },
            { key: "in_progress", label: "In Progress", count: counts.in_progress, bg: "bg-[#D4C5F9]",  text: "text-indigo-800", icon: "pending_actions" },
            { key: "submitted",   label: "Awaiting Eval", count: counts.submitted, bg: "bg-[#FFF3CD]",  text: "text-amber-800",  icon: "hourglass_top" },
            { key: "completed",   label: "Completed",   count: counts.completed,   bg: "bg-[#C8E6C9]",  text: "text-green-800",  icon: "check_circle" },
          ].map(({ key, label, count, bg, text, icon }) => (
            <button
              key={key}
              onClick={() => setActiveStatus(activeStatus === key ? null : key)}
              className={`w-full ${bg} p-4 rounded-xl flex items-center gap-4 hover:shadow-md transition-all border-2 ${activeStatus === key ? "border-[#6B5CE7]" : "border-transparent"}`}
            >
              <div className="size-10 bg-white/50 rounded-full flex items-center justify-center">
                <span className={`material-symbols-outlined ${text}`}>{icon}</span>
              </div>
              <div className="text-left">
                <p className={`text-xs font-bold ${text}`}>{label}</p>
                <p className="text-xl font-bold text-[#2D2D2D]">{count}</p>
              </div>
            </button>
          ))}
        </div>

        {/* Subject filters */}
        <div className="space-y-1">
          <p className="text-xs font-bold text-gray-400 uppercase tracking-widest px-2 mb-3">Subjects</p>
          <button
            onClick={() => setActiveSubject(null)}
            className={`flex items-center w-full px-4 py-3 rounded-xl text-left font-bold text-sm transition-colors ${!activeSubject ? "bg-[#6B5CE7]/10 text-[#6B5CE7]" : "hover:bg-gray-50 text-gray-600"}`}
          >
            All Subjects
          </button>
          {subjects.map((sub) => (
            <button
              key={sub}
              onClick={() => setActiveSubject(activeSubject === sub ? null : sub)}
              className={`flex items-center w-full px-4 py-3 rounded-xl text-left font-medium text-sm transition-colors ${activeSubject === sub ? "bg-[#6B5CE7]/10 text-[#6B5CE7] font-bold" : "hover:bg-gray-50 text-gray-600"}`}
            >
              {sub}
            </button>
          ))}
        </div>
      </aside>

      {/* ── Main ── */}
      <main className="flex-1 px-4 sm:px-10 py-6 sm:py-8 overflow-y-auto">
        <div className="max-w-4xl mx-auto">
          <div className="flex flex-wrap items-center justify-between gap-3 mb-6 sm:mb-8">
            <div className="flex items-center gap-3">
              <button onClick={() => navigate("/student")} className="md:hidden flex items-center gap-1.5 px-3 py-2 bg-white border border-gray-200 rounded-xl text-sm font-semibold text-gray-600 hover:bg-gray-50 shadow-sm">
                <span className="material-symbols-outlined text-base">arrow_back</span>
                Home
              </button>
              <h2 className="text-xl sm:text-3xl font-bold text-[#2D2D2D]">
                Your Homework
                {(activeStatus || activeSubject) && (
                  <span className="ml-3 text-sm sm:text-base font-medium text-gray-400">
                    {filtered.length} result{filtered.length !== 1 ? "s" : ""}
                  </span>
                )}
              </h2>
            </div>
            <button
              onClick={sortCycle}
              className="flex items-center gap-2 text-[#6B5CE7] font-bold cursor-pointer hover:bg-gray-100 transition-colors bg-[#F9F9F9] px-3 sm:px-4 py-2 rounded-full border border-gray-200 text-sm"
            >
              <span>Sort: {sortLabels[sortOrder]}</span>
              <span className="material-symbols-outlined text-sm">keyboard_arrow_down</span>
            </button>
          </div>

          {/* Mobile status filters */}
          <div className="md:hidden flex gap-2 overflow-x-auto pb-3 mb-4" style={{ scrollbarWidth: "none" }}>
            {[
              { key: null,         label: "All",         bg: "bg-gray-100",   text: "text-gray-700" },
              { key: "pending",    label: "Pending",     bg: "bg-[#FFE5E5]",  text: "text-red-700" },
              { key: "overdue",    label: "Overdue",     bg: "bg-[#FFB3BA]",  text: "text-red-800" },
              { key: "in_progress",label: "In Progress", bg: "bg-[#D4C5F9]",  text: "text-indigo-800" },
              { key: "submitted",  label: "Awaiting",    bg: "bg-[#FFF3CD]",  text: "text-amber-800" },
              { key: "completed",  label: "Completed",   bg: "bg-[#C8E6C9]",  text: "text-green-800" },
            ].map(({ key, label, bg, text }) => (
              <button key={label} onClick={() => setActiveStatus(key)}
                className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-bold border-2 transition-all ${bg} ${text} ${activeStatus === key ? "border-[#6B5CE7]" : "border-transparent"}`}>
                {label}
              </button>
            ))}
          </div>

          {filtered.length === 0 ? (
            <div className="text-center py-20 text-gray-400">
              <span className="material-symbols-outlined text-6xl mb-4 block">assignment</span>
              <p className="font-medium">No homework found for this filter</p>
            </div>
          ) : (
            <div className="space-y-6">
              {filtered.map((hw, i) => <HomeworkCard key={hw.id ?? hw._id ?? i} hw={hw} />)}
            </div>
          )}
        </div>
      </main>

      {/* ── LumiTutor FAB ── */}
      <div className="fixed bottom-6 right-4 sm:bottom-8 sm:right-8 flex flex-col items-end gap-3">
        <div className="hidden sm:block bg-white px-4 py-2 rounded-xl shadow-xl border border-gray-100 mb-2 relative">
          <p className="text-sm font-medium text-[#2D2D2D]">Stuck? Ask me anything!</p>
          <div className="absolute -bottom-2 right-6 w-4 h-4 bg-white rotate-45 border-r border-b border-gray-100"></div>
        </div>
        <button
          onClick={() => window.open("/student/vin-ai", "_blank")}
          className="size-16 bg-[#6B5CE7] text-white rounded-full flex items-center justify-center shadow-2xl hover:scale-110 transition-transform relative">
          <span className="material-symbols-outlined text-3xl">auto_awesome</span>
          <span className="absolute -top-1 -right-1 flex size-4">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full size-4 bg-indigo-500"></span>
          </span>
        </button>
      </div>
    </div>
  );
}
