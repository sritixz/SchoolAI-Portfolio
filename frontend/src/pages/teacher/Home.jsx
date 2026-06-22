import { useState, useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useAuth } from "../../context/AuthContext";
import { getFirstName, getInitial } from "../../utils/nameUtils";
import { useNavigate, Link } from "react-router-dom";
import { teacherSchedule, dashboardStats } from "../../data/teacherData";
import {
  fetchTeacherDashboard, fetchSchedule, fetchInterventions,
  selectTeacherDashboard, selectSchedule, selectInterventions,
} from "../../store/slices/teacherSlice";

export default function TeacherHome() {
  const { user, logout } = useAuth();
  const dispatch = useDispatch();
  const navigate = useNavigate();

  const reduxDashboard = useSelector(selectTeacherDashboard);
  const reduxSchedule  = useSelector(selectSchedule);
  const apiInterventions = useSelector(selectInterventions);
  const [stats,       setStats]       = useState(dashboardStats);
  const [schedule,    setSchedule]    = useState(teacherSchedule);
  const [submissions, setSubmissions] = useState([]);
  const [menuOpen,    setMenuOpen]    = useState(false);

  useEffect(() => {
    dispatch(fetchTeacherDashboard());
    dispatch(fetchSchedule());
    dispatch(fetchInterventions());
  }, [dispatch]);

  useEffect(() => {
    if (!reduxDashboard) return;
    setStats((p) => ({
      ...p,
      homeworkToEvaluate: { ...p.homeworkToEvaluate, count: reduxDashboard.pending_review ?? p.homeworkToEvaluate.count },
      parentReplies:      { ...p.parentReplies,      count: reduxDashboard.parent_messages ?? p.parentReplies.count },
      studentsWithGaps:   { ...p.studentsWithGaps,   count: reduxDashboard.interventions   ?? p.studentsWithGaps.count },
      pendingMeetings:    { count: reduxDashboard.pending_meetings ?? 0 },
    }));
    if (reduxDashboard.recent_submissions?.length) {
      setSubmissions(reduxDashboard.recent_submissions.map((s, i) => ({
        id:          s.submission_id,
        homework_id: s.homework_id,
        name:        s.student_name,
        initials:    s.student_name?.split(" ").map((w) => w[0]).join("").slice(0, 2) || "??",
        color:       ["orange", "pink", "blue", "purple", "green"][i % 5],
        title:       s.homework_title,
        status:      s.status === "graded"
                       ? `Graded: ${s.auto_score_pct ?? "—"}%`
                       : s.ai_analysed ? "AI Analysed" : "Needs Review",
        timeAgo:     s.submitted_at ? new Date(s.submitted_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "—",
        autoGraded:  s.status === "graded",
      })));
    }
  }, [reduxDashboard]);

  useEffect(() => {
    if (Array.isArray(reduxSchedule) && reduxSchedule.length) setSchedule(reduxSchedule);
  }, [reduxSchedule]);

  const displayInterventions = (apiInterventions || []).slice(0, 4).map((a) => ({
    id:       a._id || a.id,
    name:     a.student_name || a.student_id,
    initials: (a.student_name || "??").split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase(),
    color:    a.priority === "urgent" ? "red" : "orange",
    priority: a.priority === "urgent" ? "High Priority" : "Medium",
    issue:    a.issues?.[0] || a.message || "Needs attention",
  }));

  const quickActions = [
    { label: "Create Homework",  icon: "add_circle",   color: "from-[#695be6] to-[#8e82f3]", to: "/teacher/homework/create" },
    { label: "Homework Library", icon: "menu_book",    color: "from-blue-400 to-indigo-500",  to: "/teacher/homework" },
    { label: "AI Assistant",     icon: "auto_awesome", color: "from-purple-400 to-pink-500",  to: "/teacher/ai-assistant" },
    { label: "Ask me Anything",  icon: "forum",        color: "from-indigo-500 to-purple-600", to: "/teacher/ask-me-anything" },
    { label: "Interventions",    icon: "warning",      color: "from-orange-400 to-amber-500", to: "/teacher/interventions" },
    { label: "Analytics",        icon: "bar_chart",    color: "from-emerald-400 to-teal-500", to: "/teacher/analytics" },
    { label: "Communication",    icon: "chat",         color: "from-rose-400 to-pink-500",    to: "/teacher/communication" },
  ];

  return (
    <div className="bg-[#f6f6f8] min-h-screen pb-24 lg:pb-6" style={{ fontFamily: "'Lexend', sans-serif" }}>

      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-white/80 backdrop-blur-md border-b border-gray-200">
        <div className="max-w-[1200px] mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="size-8 bg-blue-500 rounded-lg flex items-center justify-center text-white flex-shrink-0">
              <span className="material-symbols-outlined text-xl">person_book</span>
            </div>
            <h2 className="text-sm sm:text-lg font-bold tracking-tight truncate">TrueSchoolAI</h2>
          </div>
          <div className="flex items-center gap-2 sm:gap-4">
            <Link to="/teacher/students"
              className="hidden sm:flex items-center gap-2 border border-gray-200 text-gray-700 text-sm font-bold px-4 py-2 rounded-xl hover:bg-gray-50 transition-colors">
              <span className="material-symbols-outlined text-base">group</span> Students
            </Link>
            <Link to="/teacher/homework/create"
              className="flex items-center gap-1.5 bg-[#695be6] text-white text-xs sm:text-sm font-bold px-3 sm:px-4 py-2 rounded-xl hover:bg-[#5a4dd4] transition-colors">
              <span className="material-symbols-outlined text-base">add</span>
              <span className="hidden sm:inline">New Homework</span>
              <span className="sm:hidden">New HW</span>
            </Link>
            <button onClick={() => setMenuOpen(!menuOpen)}
              className="size-10 rounded-full border-2 border-[#695be6]/30 overflow-hidden flex items-center justify-center bg-[#695be6]/10 text-[#695be6] font-bold flex-shrink-0">
              {user?.avatar ? <img src={user.avatar} alt="avatar" className="w-full h-full object-cover" /> : getInitial(user?.name)}
            </button>
          </div>
        </div>
      </header>

      {/* Avatar dropdown — outside header to avoid clipping */}
      {menuOpen && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setMenuOpen(false)} />
          <div className="fixed right-4 sm:right-6 top-16 bg-white border border-gray-100 rounded-xl shadow-lg py-2 w-44 z-50">
            <button onClick={() => { logout(); navigate("/login"); }}
              className="w-full text-left px-4 py-2 text-sm text-red-500 hover:bg-gray-50 flex items-center gap-2">
              <span className="material-symbols-outlined text-base">logout</span> Logout
            </button>
          </div>
        </>
      )}

      <main className="max-w-[1200px] mx-auto pt-20 sm:pt-24 px-4 sm:px-6">

        {/* Welcome banner */}
        <div className="mb-6 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-2xl p-5 sm:p-8 text-white shadow-lg shadow-blue-500/20">
          <h1 className="text-2xl sm:text-3xl font-black">Good Morning, {getFirstName(user?.name) || "Teacher"}! 👋</h1>
          <p className="text-white/80 mt-1 text-sm">
            {stats.homeworkToEvaluate?.count > 0
              ? `You have ${stats.homeworkToEvaluate.count} submissions waiting for review.`
              : "All caught up! No pending reviews."}
          </p>
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
          {[
            { label: "To Evaluate",      value: stats.homeworkToEvaluate?.count, icon: "grading",        color: "text-[#695be6]",   to: "/teacher/homework" },
            { label: "Students w/ Gaps", value: stats.studentsWithGaps?.count,   icon: "warning",        color: "text-orange-500",  to: "/teacher/interventions" },
            { label: "Mtg Requests",     value: stats.pendingMeetings?.count,    icon: "calendar_month", color: "text-rose-500",    to: "/teacher/communication" },
            { label: "Parent Messages",  value: stats.parentReplies?.count,      icon: "chat",           color: "text-emerald-500", to: "/teacher/communication" },
          ].map((s) => (
            <Link key={s.label} to={s.to}
              className="bg-white rounded-xl p-3 sm:p-4 border border-gray-100 shadow-sm hover:shadow-md transition-shadow flex flex-col gap-1">
              <span className={`material-symbols-outlined text-xl sm:text-2xl ${s.color}`}>{s.icon}</span>
              <p className="text-xl sm:text-2xl font-black text-[#100e1a]">{s.value ?? "—"}</p>
              <p className="text-[10px] sm:text-xs text-gray-400 font-medium leading-tight">{s.label}</p>
            </Link>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

          {/* Main content */}
          <div className="lg:col-span-8">
            <h3 className="text-lg font-bold mb-4">Quick Actions</h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 sm:gap-4 mb-6">
              {quickActions.map((a) => (
                <Link key={a.label} to={a.to}
                  className={`bg-gradient-to-br ${a.color} text-white rounded-xl p-4 sm:p-5 flex flex-col gap-2 sm:gap-3 hover:-translate-y-1 transition-transform shadow-md`}>
                  <span className="material-symbols-outlined text-2xl sm:text-3xl opacity-90">{a.icon}</span>
                  <p className="font-bold text-xs sm:text-sm">{a.label}</p>
                </Link>
              ))}
            </div>

            <h3 className="text-lg font-bold mb-3">Today's Schedule</h3>
            <div className="flex flex-col gap-3 mb-6">
              {schedule.length === 0 ? (
                <p className="text-sm text-gray-400 py-4 text-center">No classes scheduled today</p>
              ) : schedule.map((cls) => (
                <div key={cls.id} className="bg-white rounded-xl border border-gray-100 shadow-sm p-3 sm:p-4 flex items-center gap-3 sm:gap-4">
                  <div className={`size-10 sm:size-12 rounded-xl flex items-center justify-center text-white shrink-0 ${cls.status === "completed" ? "bg-gray-300" : "bg-blue-500"}`}>
                    <span className="material-symbols-outlined text-sm sm:text-base">{cls.status === "completed" ? "check_circle" : "class"}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-sm truncate">{cls.class} — {cls.subject}</p>
                    <p className="text-xs text-gray-500">{cls.time} · {cls.room}</p>
                  </div>
                  <span className={`text-xs font-bold px-2 py-1 rounded-full shrink-0 ${cls.status === "completed" ? "bg-gray-100 text-gray-400" : "bg-blue-100 text-blue-600"}`}>
                    {cls.status}
                  </span>
                </div>
              ))}
            </div>

            <h3 className="text-lg font-bold mb-3">Recent Submissions</h3>
            <div className="flex flex-col gap-3">
              {submissions.length === 0 ? (
                <p className="text-sm text-gray-400 py-4 text-center">No submissions yet</p>
              ) : submissions.map((sub) => (
                <div key={sub.id}
                  className="bg-white rounded-xl border border-gray-100 shadow-sm p-3 sm:p-4 flex items-center gap-3 hover:shadow-md hover:border-[#695be6]/30 transition-all cursor-pointer group"
                  onClick={() => sub.homework_id && navigate(`/teacher/homework/evaluate/${sub.homework_id}?student=${sub.id}`)}>
                  <div className={`size-9 sm:size-10 rounded-full bg-${sub.color}-100 flex items-center justify-center text-${sub.color}-700 font-bold text-sm shrink-0`}>
                    {sub.initials}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-sm truncate">{sub.name}</p>
                    <p className="text-xs text-gray-400 truncate">{sub.title}</p>
                  </div>
                  <div className="flex flex-col sm:flex-row items-end sm:items-center gap-1 sm:gap-2 shrink-0">
                    <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${sub.autoGraded ? "bg-green-100 text-green-700" : "bg-amber-100 text-amber-700"}`}>
                      {sub.status}
                    </span>
                    <span className="text-[10px] text-gray-400">{sub.timeAgo}</span>
                    <span className="material-symbols-outlined text-[#695be6] text-sm opacity-0 group-hover:opacity-100 transition-opacity">arrow_forward</span>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-6">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-lg font-bold">My Students</h3>
                <Link to="/teacher/students" className="text-sm text-[#695be6] font-bold hover:underline">View All →</Link>
              </div>
              <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 sm:p-5">
                <p className="text-sm text-gray-600 mb-4">Quick access to your students' work, submissions, and parent communication</p>
                <div className="grid grid-cols-3 gap-2 sm:gap-3">
                  {[
                    { label: "All Students", icon: "group",           to: "/teacher/students" },
                    { label: "Submissions",  icon: "assignment",      to: "/teacher/submissions" },
                    { label: "Parents",      icon: "family_restroom", to: "/teacher/communication" },
                  ].map((btn) => (
                    <button key={btn.label} onClick={() => navigate(btn.to)}
                      className="flex flex-col items-center gap-1.5 p-3 sm:p-4 rounded-xl border-2 border-dashed border-gray-200 hover:border-[#695be6] hover:bg-[#695be6]/5 transition-all">
                      <span className="material-symbols-outlined text-[#695be6] text-xl sm:text-2xl">{btn.icon}</span>
                      <span className="text-[10px] sm:text-xs font-bold text-gray-700 text-center">{btn.label}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Right sidebar */}
          <div className="lg:col-span-4 flex flex-col gap-4">
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-bold text-sm">Intervention Alerts</h3>
                <Link to="/teacher/interventions" className="text-xs text-[#695be6] font-medium">View All</Link>
              </div>
              {displayInterventions.length === 0 ? (
                <p className="text-xs text-gray-400 py-2 text-center">No active alerts</p>
              ) : displayInterventions.map((s) => (
                <div key={s.id} className="flex items-center gap-3 py-2 border-b border-gray-50 last:border-0">
                  <div className={`size-9 rounded-full bg-${s.color}-100 flex items-center justify-center text-${s.color}-700 font-bold text-xs shrink-0`}>
                    {s.initials}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold truncate">{s.name}</p>
                    <p className="text-xs text-gray-400 truncate">{s.issue}</p>
                  </div>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0 ${s.priority === "High Priority" ? "bg-red-100 text-red-600" : "bg-amber-100 text-amber-600"}`}>
                    {s.priority}
                  </span>
                </div>
              ))}
            </div>

            <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
              <h3 className="font-bold text-sm mb-3">Recent Activity</h3>
              {submissions.length === 0 ? (
                <p className="text-xs text-gray-400 py-2 text-center">No recent activity</p>
              ) : submissions.slice(0, 3).map((a) => (
                <div key={a.id} className="flex items-start gap-3 py-2 border-b border-gray-50 last:border-0">
                  <span className={`material-symbols-outlined text-${a.autoGraded ? "green" : "orange"}-500 text-xl shrink-0 mt-0.5`}>
                    {a.autoGraded ? "check_circle" : "pending_actions"}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-gray-700 leading-snug">{a.name} submitted {a.title}</p>
                    <p className="text-[10px] text-gray-400 mt-0.5">{a.status}</p>
                  </div>
                  <span className="text-[10px] text-gray-400 shrink-0">{a.timeAgo}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </main>

      {/* Bottom Nav — mobile only */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 px-2 py-2 z-50 lg:hidden">
        <div className="flex items-end justify-around h-16">
          {[
            { icon: "home",       label: "Home",     to: "/teacher", active: true },
            { icon: "group",      label: "Students", to: "/teacher/students" },
            { icon: "forum",      label: "Ask me",   to: "/teacher/ask-me-anything", fab: true },
            { icon: "assignment", label: "Homework", to: "/teacher/homework" },
            { icon: "chat",       label: "Messages", to: "/teacher/communication" },
          ].map((item) =>
            item.fab ? (
              <Link
                key={item.label}
                to={item.to}
                className="flex flex-col items-center -mt-6 bg-[#695be6] text-white size-12 rounded-full shadow-lg shadow-[#695be6]/40 justify-center hover:shadow-xl transition-shadow"
              >
                <span className="material-symbols-outlined text-xl">{item.icon}</span>
              </Link>
            ) : (
              <Link key={item.label} to={item.to} className={`flex flex-col items-center gap-1 text-center flex-1 ${item.active ? "text-[#695be6]" : "text-gray-400"}`}>
                <span className="material-symbols-outlined text-xl">{item.icon}</span>
                <span className="text-[9px] font-bold">{item.label}</span>
              </Link>
            )
          )}
        </div>
      </nav>
    </div>
  );
}
