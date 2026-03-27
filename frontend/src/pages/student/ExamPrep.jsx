import { useState } from "react";
import { useAuth } from "../../context/AuthContext";
import { useNavigate, Link } from "react-router-dom";

// Static exam prep data — model ready for backend
const EXAM_DATA = {
  upcomingExams: [
    {
      id: "ex1",
      subject: "Mathematics",
      examType: "Unit Test 4",
      date: "2026-04-05",
      daysLeft: 9,
      syllabus: ["Quadratic Equations", "Trigonometry", "Probability"],
      readinessPercent: 62,
      color: "from-[#695be6] to-[#8e82f3]",
    },
    {
      id: "ex2",
      subject: "Physics",
      examType: "Mid-Term",
      date: "2026-04-10",
      daysLeft: 14,
      syllabus: ["Thermodynamics", "Optics", "Waves"],
      readinessPercent: 45,
      color: "from-blue-400 to-indigo-500",
    },
    {
      id: "ex3",
      subject: "Chemistry",
      examType: "Unit Test 4",
      date: "2026-04-08",
      daysLeft: 12,
      syllabus: ["Organic Reactions", "Electrochemistry"],
      readinessPercent: 30,
      color: "from-orange-400 to-amber-500",
    },
  ],
  revisionTasks: [
    { id: "rt1", subject: "Mathematics", topic: "Quadratic Formula Practice",  duration: "30 min", done: false, priority: "high" },
    { id: "rt2", subject: "Physics",     topic: "Thermodynamics MCQ Set",       duration: "45 min", done: false, priority: "high" },
    { id: "rt3", subject: "Mathematics", topic: "Trigonometry Identities",      duration: "20 min", done: true,  priority: "medium" },
    { id: "rt4", subject: "Chemistry",   topic: "Organic Reaction Mechanisms",  duration: "40 min", done: false, priority: "high" },
    { id: "rt5", subject: "Physics",     topic: "Optics Ray Diagrams",          duration: "25 min", done: false, priority: "medium" },
    { id: "rt6", subject: "Mathematics", topic: "Probability Problems",         duration: "30 min", done: true,  priority: "low" },
  ],
  studyStreak: 5,
  totalStudyHoursThisWeek: 12,
};

const PRIORITY_COLORS = {
  high:   "text-red-600 bg-red-50",
  medium: "text-amber-600 bg-amber-50",
  low:    "text-green-600 bg-green-50",
};

export default function ExamPrep() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [tasks, setTasks] = useState(EXAM_DATA.revisionTasks);

  const toggleTask = (id) =>
    setTasks((prev) => prev.map((t) => (t.id === id ? { ...t, done: !t.done } : t)));

  const doneCount = tasks.filter((t) => t.done).length;

  return (
    <div className="min-h-screen bg-[#f6f6f8] pb-24" style={{ fontFamily: "'Lexend', sans-serif" }}>
      <header className="fixed top-0 left-0 right-0 z-50 bg-white/80 backdrop-blur-md border-b border-gray-200">
        <div className="max-w-4xl mx-auto px-6 h-16 flex items-center gap-4">
          <button onClick={() => navigate("/student")} className="p-2 hover:bg-gray-100 rounded-lg">
            <span className="material-symbols-outlined">arrow_back</span>
          </button>
          <div>
            <h1 className="font-bold text-base">Exam Preparation</h1>
            <p className="text-xs text-slate-400">{EXAM_DATA.upcomingExams.length} exams coming up</p>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto pt-24 px-6 space-y-6">
        {/* Stats row */}
        <div className="grid grid-cols-3 gap-4">
          {[
            { label: "Study Streak",   value: `${EXAM_DATA.studyStreak} days`,  icon: "local_fire_department", color: "text-orange-500" },
            { label: "Hours This Week",value: `${EXAM_DATA.totalStudyHoursThisWeek}h`, icon: "schedule", color: "text-[#695be6]" },
            { label: "Tasks Done",     value: `${doneCount}/${tasks.length}`,   icon: "task_alt",  color: "text-green-500" },
          ].map((s) => (
            <div key={s.label} className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 text-center">
              <span className={`material-symbols-outlined text-2xl ${s.color}`}>{s.icon}</span>
              <p className="text-xl font-black text-slate-800 mt-1">{s.value}</p>
              <p className="text-xs text-slate-400">{s.label}</p>
            </div>
          ))}
        </div>

        {/* Upcoming exams */}
        <div>
          <h3 className="text-lg font-bold mb-3">Upcoming Exams</h3>
          <div className="space-y-3">
            {EXAM_DATA.upcomingExams.map((exam) => (
              <div key={exam.id} className={`bg-gradient-to-r ${exam.color} rounded-xl p-5 text-white shadow-md`}>
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div>
                    <p className="text-xs font-bold uppercase tracking-wider text-white/70">{exam.examType}</p>
                    <h4 className="text-xl font-black">{exam.subject}</h4>
                    <p className="text-white/80 text-sm mt-0.5">{exam.date} · {exam.daysLeft} days left</p>
                  </div>
                  <div className="text-right">
                    <p className="text-3xl font-black">{exam.readinessPercent}%</p>
                    <p className="text-xs text-white/70">Ready</p>
                  </div>
                </div>
                <div className="h-2 bg-white/20 rounded-full overflow-hidden mb-3">
                  <div className="h-full bg-white rounded-full" style={{ width: `${exam.readinessPercent}%` }} />
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {exam.syllabus.map((s) => (
                    <span key={s} className="px-2 py-0.5 bg-white/20 text-white text-xs font-medium rounded-full">{s}</span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Revision tasks */}
        <div>
          <h3 className="text-lg font-bold mb-3">Today's Revision Plan</h3>
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 space-y-4">
            {tasks.map((task, i) => (
              <div key={task.id}>
                <div className={`flex items-start gap-4 ${task.done ? "opacity-50" : ""}`}>
                  <input
                    type="checkbox"
                    checked={task.done}
                    onChange={() => toggleTask(task.id)}
                    className="size-5 mt-0.5 rounded border-gray-300 text-[#695be6] focus:ring-[#695be6] cursor-pointer"
                  />
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase ${PRIORITY_COLORS[task.priority]}`}>
                        {task.priority}
                      </span>
                      <span className="text-xs text-slate-400">{task.subject}</span>
                    </div>
                    <p className={`font-semibold text-slate-800 leading-tight ${task.done ? "line-through" : ""}`}>
                      {task.topic}
                    </p>
                  </div>
                  <div className="flex items-center gap-1 text-slate-400 text-xs shrink-0">
                    <span className="material-symbols-outlined text-sm">schedule</span>
                    {task.duration}
                  </div>
                </div>
                {i < tasks.length - 1 && <hr className="border-gray-100 mt-4" />}
              </div>
            ))}
          </div>
        </div>

        {/* Vin AI CTA */}
        <div className="bg-gradient-to-r from-[#695be6] to-[#8e82f3] rounded-xl p-6 text-white flex items-center justify-between gap-4">
          <div>
            <h3 className="font-bold text-lg">Need help with revision?</h3>
            <p className="text-white/80 text-sm mt-1">Ask Vin to quiz you on any topic or explain a concept.</p>
          </div>
          <Link to="/student/vin-ai" className="shrink-0 px-5 py-3 bg-white text-[#695be6] font-bold rounded-full hover:bg-white/90 transition-colors shadow-lg text-sm">
            Ask Vin
          </Link>
        </div>
      </main>

      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 px-6 py-2 z-50">
        <div className="max-w-[600px] mx-auto flex items-end justify-around h-16">
          {[
            { icon: "home", label: "Home", to: "/student" },
            { icon: "description", label: "Homework", to: "/student/homework" },
            { icon: "auto_awesome", label: "Vin AI", to: "/student/vin-ai", fab: true },
            { icon: "bar_chart", label: "Progress", to: "#", active: true },
            { icon: "person", label: "Profile", to: "#" },
          ].map((item) =>
            item.fab ? (
              <Link key={item.label} to={item.to} className="flex flex-col items-center -mt-6 bg-[#695be6] text-white size-14 rounded-full shadow-lg shadow-[#695be6]/40 justify-center">
                <span className="material-symbols-outlined">{item.icon}</span>
              </Link>
            ) : (
              <Link key={item.label} to={item.to} className={`flex flex-col items-center gap-1 ${item.active ? "text-[#695be6]" : "text-gray-400"}`}>
                <span className="material-symbols-outlined">{item.icon}</span>
                <span className="text-[10px] font-bold">{item.label}</span>
              </Link>
            )
          )}
        </div>
      </nav>
    </div>
  );
}
