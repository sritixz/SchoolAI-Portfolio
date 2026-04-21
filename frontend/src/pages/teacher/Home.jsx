import { useState, useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useAuth } from "../../context/AuthContext";
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
    // Wire all real counts from API
    setStats((p) => ({
      ...p,
      homeworkToEvaluate: { ...p.homeworkToEvaluate, count: reduxDashboard.pending_review ?? p.homeworkToEvaluate.count },
      parentReplies:      { ...p.parentReplies,      count: reduxDashboard.parent_messages ?? p.parentReplies.count },
      studentsWithGaps:   { ...p.studentsWithGaps,   count: reduxDashboard.interventions   ?? p.studentsWithGaps.count },
    }));
    // Wire recent submissions from API
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

  // Build intervention list from API data only — no mock fallback
  const displayInterventions = (apiInterventions || []).slice(0, 4).map((a) => ({
    id:       a._id || a.id,
    name:     a.student_name || a.student_id,
    initials: (a.student_name || "??").split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase(),
    color:    a.priority === "urgent" ? "red" : "orange",
    priority: a.priority === "urgent" ? "High Priority" : "Medium",
    issue:    a.issues?.[0] || a.message || "Needs attention",
  }));

  const quickActions = [
    { label: "Create Homework",   icon: "add_circle",    color: "from-[#695be6] to-[#8e82f3]", to: "/teacher/homework/create" },
    { label: "Homework Library",  icon: "menu_book",     color: "from-blue-400 to-indigo-500",  to: "/teacher/homework" },
    { label: "AI Assistant",      icon: "auto_awesome",  color: "from-purple-400 to-pink-500",  to: "/teacher/ai-assistant" },
    { label: "Interventions",     icon: "warning",       color: "from-orange-400 to-amber-500", to: "/teacher/interventions" },
    { label: "Analytics",         icon: "bar_chart",     color: "from-emerald-400 to-teal-500", to: "/teacher/analytics" },
    { label: "Communication",     icon: "chat",          color: "from-rose-400 to-pink-500",    to: "/teacher/communication" },
  ];

  return (
    <div className="bg-[#f6f6f8] min-h-screen pb-24" style={{ fontFamily: "'Lexend', sans-serif" }}>

      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-white/80 backdrop-blur-md border-b border-gray-200">
        <div className="max-w-[1200px] mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="size-8 bg-blue-500 rounded-lg flex items-center justify-center text-white">
              <span className="material-symbols-outlined text-xl">person_book</span>
            </div>
            <h2 className="text-lg font-bold tracking-tight">TrueSchoolAI</h2>
          </div>
          <div className="flex items-center gap-4">
            <Link to="/teacher/students"
              className="flex items-center gap-2 border border-gray-200 text-gray-700 text-sm font-bold px-4 py-2 rounded-xl hover:bg-gray-50 transition-colors">
              <span className="material-symbols-outlined text-base">group</span> Students
            </Link>
            <Link to="/teacher/homework/create"
              className="flex items-center gap-2 bg-[#695be6] text-white text-sm font-bold px-4 py-2 rounded-xl hover:bg-[#5a4dd4] transition-colors">
              <span className="material-symbols-outlined text-base">add</span> New Homework
            </Link>
            <div className="relative">
              <button onClick={() => setMenuOpen(!menuOpen)} className="size-10 rounded-full border-2 border-[#695be6]/30 overflow-hidden flex items-center justify-center bg-[#695be6]/10 text-[#695be6] font-bold">
                {user?.avatar ? <img src={user.avatar} alt="avatar" className="w-full h-full object-cover" /> : user?.name?.[0]}
              </button>
              {menuOpen && (
                <div className="absolute right-0 top-12 bg-white border border-gray-100 rounded-xl shadow-lg py-2 w-44 z-50">
                  <button onClick={() => { logout(); navigate("/login"); }}
                    className="w-full text-left px-4 py-2 text-sm text-red-500 hover:bg-gray-50 flex items-center gap-2">
                    <span className="material-symbols-outlined text-base">logout</span> Logout
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-[1200px] mx-auto pt-24 px-6">

        {/* Welcome banner */}
        <div className="mb-8 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-2xl p-8 text-white shadow-lg shadow-blue-500/20">
          <h1 className="text-3xl font-black">Good Morning, {user?.name?.split(" ")[0] || "Teacher"}! 👋</h1>
          <p className="text-white/80 mt-1 text-sm">
            {stats.homeworkToEvaluate?.count > 0
              ? `You have ${stats.homeworkToEvaluate.count} submissions waiting for review.`
              : "All caught up! No pending reviews."}
          </p>
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          {[
            { label: "To Evaluate",    value: stats.homeworkToEvaluate?.count,  icon: "grading",       color: "text-[#695be6]", to: "/teacher/homework" },
            { label: "Students w/ Gaps", value: stats.studentsWithGaps?.count,  icon: "warning",       color: "text-orange-500", to: "/teacher/interventions" },
            { label: "Classes Today",  value: stats.classesToday?.count,        icon: "class",         color: "text-blue-500",   to: "/teacher/analytics" },
            { label: "Parent Replies", value: stats.parentReplies?.count,       icon: "chat",          color: "text-emerald-500", to: "/teacher/communication" },
          ].map((s) => (
            <Link key={s.label} to={s.to}
              className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm hover:shadow-md transition-shadow flex flex-col gap-1">
              <span className={`material-symbols-outlined text-2xl ${s.color}`}>{s.icon}</span>
              <p className="text-2xl font-black text-[#100e1a]">{s.value ?? "—"}</p>
              <p className="text-xs text-gray-400 font-medium">{s.label}</p>
            </Link>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

          {/* Quick actions */}
          <div className="lg:col-span-8">
            <h3 className="text-lg font-bold mb-4">Quick Actions</h3>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-6">
              {quickActions.map((a) => (
                <Link key={a.label} to={a.to}
                  className={`bg-gradient-to-br ${a.color} text-white rounded-xl p-5 flex flex-col gap-3 hover:-translate-y-1 transition-transform shadow-md`}>
                  <span className="material-symbols-outlined text-3xl opacity-90">{a.icon}</span>
                  <p className="font-bold text-sm">{a.label}</p>
                </Link>
              ))}
            </div>

            {/* Today's schedule */}
            <h3 className="text-lg font-bold mb-3">Today's Schedule</h3>
            <div className="flex flex-col gap-3 mb-6">
              {schedule.length === 0 ? (
                <p className="text-sm text-gray-400 py-4 text-center">No classes scheduled today</p>
              ) : schedule.map((cls) => (
                <div key={cls.id} className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 flex items-center gap-4">
                  <div className={`size-12 rounded-xl flex items-center justify-center text-white shrink-0 ${cls.status === "completed" ? "bg-gray-300" : "bg-blue-500"}`}>
                    <span className="material-symbols-outlined">{cls.status === "completed" ? "check_circle" : "class"}</span>
                  </div>
                  <div className="flex-1">
                    <p className="font-bold">{cls.class} — {cls.subject}</p>
                    <p className="text-sm text-gray-500">{cls.time} · {cls.room}</p>
                  </div>
                  <span className={`text-xs font-bold px-2 py-1 rounded-full ${cls.status === "completed" ? "bg-gray-100 text-gray-400" : "bg-blue-100 text-blue-600"}`}>
                    {cls.status}
                  </span>
                </div>
              ))}
            </div>

            {/* Recent submissions */}
            <h3 className="text-lg font-bold mb-3">Recent Submissions</h3>
            <div className="flex flex-col gap-3">
              {submissions.length === 0 ? (
                <p className="text-sm text-gray-400 py-4 text-center">No submissions yet</p>
              ) : submissions.map((sub) => (
                <div key={sub.id} className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 flex items-center gap-4 hover:shadow-md transition-shadow cursor-pointer"
                  onClick={() => sub.homework_id && navigate(`/teacher/homework/evaluate/${sub.homework_id}`)}>
                  <div className={`size-10 rounded-full bg-${sub.color}-100 flex items-center justify-center text-${sub.color}-700 font-bold text-sm shrink-0`}>
                    {sub.initials}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-sm truncate">{sub.name}</p>
                    <p className="text-xs text-gray-400 truncate">{sub.title}</p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${sub.autoGraded ? "bg-green-100 text-green-700" : "bg-amber-100 text-amber-700"}`}>
                      {sub.status}
                    </span>
                    <span className="text-xs text-gray-400">{sub.timeAgo}</span>
                  </div>
                </div>
              ))}
            </div>

            {/* My Students Section */}
            <div className="mt-6">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-lg font-bold">My Students</h3>
                <Link to="/teacher/students" className="text-sm text-[#695be6] font-bold hover:underline">
                  View All →
                </Link>
              </div>
              <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
                <p className="text-sm text-gray-600 mb-4">
                  Quick access to your students' work, submissions, and parent communication
                </p>
                <div className="grid grid-cols-3 gap-3">
                  <button
                    onClick={() => navigate("/teacher/students")}
                    className="flex flex-col items-center gap-2 p-4 rounded-xl border-2 border-dashed border-gray-200 hover:border-[#695be6] hover:bg-[#695be6]/5 transition-all"
                  >
                    <span className="material-symbols-outlined text-[#695be6] text-2xl">group</span>
                    <span className="text-xs font-bold text-gray-700">All Students</span>
                  </button>
                  <button
                    onClick={() => navigate("/teacher/submissions")}
                    className="flex flex-col items-center gap-2 p-4 rounded-xl border-2 border-dashed border-gray-200 hover:border-[#695be6] hover:bg-[#695be6]/5 transition-all"
                  >
                    <span className="material-symbols-outlined text-[#695be6] text-2xl">assignment</span>
                    <span className="text-xs font-bold text-gray-700">Submissions</span>
                  </button>
                  <button
                    onClick={() => navigate("/teacher/communication")}
                    className="flex flex-col items-center gap-2 p-4 rounded-xl border-2 border-dashed border-gray-200 hover:border-[#695be6] hover:bg-[#695be6]/5 transition-all"
                  >
                    <span className="material-symbols-outlined text-[#695be6] text-2xl">family_restroom</span>
                    <span className="text-xs font-bold text-gray-700">Parents</span>
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Right sidebar */}
          <div className="lg:col-span-4 flex flex-col gap-4">

            {/* Intervention alerts */}
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
                    <p className="text-xs text-gray-400">{s.issue}</p>
                  </div>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${s.priority === "High Priority" ? "bg-red-100 text-red-600" : "bg-amber-100 text-amber-600"}`}>
                    {s.priority}
                  </span>
                </div>
              ))}
            </div>

            {/* Recent activity — built from real submissions */}
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
    </div>
  );
}
