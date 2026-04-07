import { useState, useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useAuth } from "../../context/AuthContext";
import { useNavigate, Link } from "react-router-dom";
import {
  fetchTasks, fetchStudentDashboard,
  optimisticToggleTask, optimisticAddTask,
  selectTasks, selectTasksStatus,
} from "../../store/slices/studentSlice";
import { fetchStudentHomework, selectStudentHomework } from "../../store/slices/homeworkSlice";

const SUBJECT_COLORS = {
  Mathematics: "text-[#695be6] bg-[#695be6]/10",
  Science: "text-orange-500 bg-orange-100",
  English: "text-blue-500 bg-blue-100",
  Revision: "text-emerald-500 bg-emerald-100",
};

export default function StudentHome() {
  const { user, logout } = useAuth();
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const reduxTasks    = useSelector(selectTasks);
  const tasksStatus   = useSelector(selectTasksStatus);
  const reduxHomework = useSelector(selectStudentHomework);
  const [tasks,    setTasks]    = useState([]);
  const [homework, setHomework] = useState([]);
  const [menuOpen,      setMenuOpen]      = useState(false);
  const [addingTask,    setAddingTask]    = useState(false);
  const [newTaskTitle,  setNewTaskTitle]  = useState("");

  // Load tasks and homework via Redux
  useEffect(() => {
    dispatch(fetchTasks());
    dispatch(fetchStudentHomework());
  }, [dispatch]);

  // Sync Redux state into local state (fallback to mock if empty)
  useEffect(() => {
    if (reduxTasks.length) setTasks(reduxTasks);
  }, [reduxTasks]);
  useEffect(() => {
    if (reduxHomework.length) setHomework(reduxHomework);
  }, [reduxHomework]);

  const toggleTask = (id) => {
    setTasks((prev) => prev.map((t) => (t.id === id ? { ...t, done: !t.done } : t)));
    if (!id.startsWith("t") && !id.startsWith("custom-")) {
      dispatch(optimisticToggleTask(id));
    }
  };

  const addTask = () => {
    if (!newTaskTitle.trim()) return;
    const tempId = `custom-${Date.now()}`;
    const newTask = { id: tempId, subject: "Custom", title: newTaskTitle.trim(), duration: "—", done: false, _optimistic: true };
    setTasks((prev) => [...prev, newTask]);
    dispatch(optimisticAddTask(newTask));
    dispatch({ type: "student/addTask", payload: { title: newTaskTitle.trim() } });
    setNewTaskTitle("");
    setAddingTask(false);
  };

  const pendingCount = tasks.filter((t) => !t.done).length;
  const pendingHw = homework.filter((h) => h.status === "pending").length;

  return (
    <div className="bg-[#f6f6f8] min-h-screen text-[#100e1a]" style={{ fontFamily: "'Lexend', sans-serif" }}>

      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-white/80 backdrop-blur-md border-b border-gray-200">
        <div className="max-w-full mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            {/* <button onClick={() => setMenuOpen(!menuOpen)} className="p-2 hover:bg-gray-100 rounded-lg">
              <span className="material-symbols-outlined">menu</span>
            </button> */}
            <div className="flex items-center gap-2">
              <div className="size-8 bg-[#695be6] rounded-lg flex items-center justify-center text-white flex-shrink-0">
                <span className="material-symbols-outlined text-xl">school</span>
              </div>
              <h2 className="text-sm sm:text-lg font-bold tracking-tight truncate">{user?.school}</h2>
            </div>
          </div>
          <div className="flex items-center gap-3 sm:gap-5">
            <div onClick={() => navigate("/student/notifications")} className="relative cursor-pointer p-2 hover:bg-gray-100 rounded-lg flex-shrink-0">
              <span className="material-symbols-outlined text-gray-600">notifications</span>
              <span className="absolute top-2 right-2 size-2.5 bg-red-500 border-2 border-white rounded-full"></span>
            </div>
            <div className="size-10 rounded-full border-2 border-[#695be6] p-0.5 overflow-hidden cursor-pointer flex-shrink-0" onClick={() => setMenuOpen(!menuOpen)}>
              {user?.avatar ? (
                <img className="w-full h-full object-cover rounded-full" src={user.avatar} alt="avatar" />
              ) : (
                <div className="w-full h-full bg-[#695be6] rounded-full flex items-center justify-center text-white text-sm font-bold">
                  {user?.name?.[0]}
                </div>
              )}
            </div>
          </div>
        </div>
        {/* Dropdown menu */}
        {menuOpen && (
          <div className="absolute right-4 sm:right-6 top-16 bg-white border border-gray-100 rounded-xl shadow-lg py-2 w-44 z-50">
            <button
              onClick={() => { logout(); navigate("/login"); }}
              className="w-full text-left px-4 py-2 text-sm text-red-500 hover:bg-gray-50 flex items-center gap-2"
            >
              <span className="material-symbols-outlined text-base">logout</span> Logout
            </button>
          </div>
        )}
      </header>

      <main className="w-full pt-20 pb-24 px-4 sm:px-6">
        <div className="max-w-7xl mx-auto">

          {/* Welcome Banner */}
          <section className="mb-6 sm:mb-8">
            <div className="relative overflow-hidden rounded-xl bg-gradient-to-r from-[#6B5CE7] to-[#D4C5F9] p-6 sm:p-8 text-white shadow-lg shadow-[#695be6]/20">
              <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-4 sm:gap-6">
                <div className="flex flex-col gap-2">
                  <h1 className="text-2xl sm:text-4xl font-black tracking-tight">Good Morning, {user?.name?.split(" ")[0]}! 👋</h1>
                  <p className="text-white/90 text-sm sm:text-base">You have {pendingCount} tasks for today • Stay focused!</p>
                </div>
                <div className="flex items-center gap-3 bg-white/20 backdrop-blur-md px-4 py-2 sm:px-5 sm:py-3 rounded-xl self-start sm:self-center border border-white/30 flex-shrink-0">
                  <span className="text-xl sm:text-2xl">🔥</span>
                  <div>
                    <p className="text-xs font-bold uppercase tracking-wider opacity-80 leading-none">Streak</p>
                    <p className="text-lg sm:text-xl font-black">{user?.streak} Days</p>
                  </div>
                </div>
              </div>
              <div className="absolute -right-10 -top-10 size-48 bg-white/10 rounded-full blur-3xl"></div>
              <div className="absolute right-1/4 -bottom-10 size-32 bg-[#695be6]/20 rounded-full blur-2xl"></div>
            </div>
          </section>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 sm:gap-8">

            {/* Left: Quick Actions */}
            <div className="lg:col-span-2 flex flex-col gap-6">
              <section>
                <h3 className="text-lg sm:text-xl font-bold mb-4 px-1">Quick Actions</h3>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 sm:gap-4">
                  {[
                    { label: "Homework",        icon: "menu_book",      badge: `${pendingHw} Pending`,                                                          gradient: "from-pink-400 to-rose-500",       to: "/student/homework" },
                    { label: "Vin AI Tutor",    icon: "auto_awesome",   badge: "24/7 Available",                                                        gradient: "from-[#695be6] to-[#8e82f3]",    to: "/student/vin-ai" },
                    { label: "Learning Gaps",   icon: "warning",        badge: "Active Gaps",                                                                   gradient: "from-orange-400 to-amber-500",    to: "/student/learning-gaps" },
                    { label: "My Portfolio",    icon: "account_circle", badge: "Showcase",                                                              gradient: "from-[#A78BFA] to-[#7C3AED]",    to: "/student/portfolio" },
                    { label: "Exam Prep",       icon: "event_repeat",   badge: `${pendingCount} Tasks`,                                                 gradient: "from-[#8e82f3] to-pink-400",     to: "/student/exam-prep" },
                    { label: "Career",          icon: "rocket_launch",  badge: "Discover",                                                              gradient: "from-emerald-400 to-indigo-400", to: "/student/career" },
                  ].map((action) => (
                    <Link
                      key={action.label}
                      to={action.to}
                      className={`cursor-pointer relative overflow-hidden rounded-lg sm:rounded-xl p-3 sm:p-4 h-28 sm:h-32 flex flex-col justify-between bg-gradient-to-br ${action.gradient} text-white shadow-md hover:shadow-lg hover:-translate-y-0.5 transition-all`}
                    >
                      <div className="flex justify-between items-start">
                        <span className="material-symbols-outlined text-2xl sm:text-3xl opacity-80">{action.icon}</span>
                        <span className="bg-white/20 px-1.5 sm:px-2 py-0.5 rounded text-[8px] sm:text-[10px] font-bold uppercase">{action.badge}</span>
                      </div>
                      <p className="text-sm sm:text-lg font-bold leading-tight">{action.label}</p>
                    </Link>
                  ))}
                </div>
              </section>
            </div>

            {/* Right: Today's Focus */}
            <div className="lg:col-span-1">
              <section>
                <h3 className="text-lg sm:text-xl font-bold mb-4 px-1">Today's Focus</h3>
                <div className="bg-white rounded-lg sm:rounded-xl border border-gray-100 shadow-sm p-4 sm:p-6 h-full">
                  <div className="flex flex-col gap-3 sm:gap-4 max-h-96 overflow-y-auto">
                    {tasks.length === 0 ? (
                      <p className="text-gray-400 text-sm text-center py-8">No tasks yet. Add one to get started!</p>
                    ) : (
                      tasks.map((task, i) => (
                        <div key={task.id}>
                          <div className={`flex items-start gap-3 ${task.done ? "opacity-60" : ""}`}>
                            <div className="mt-1 flex-shrink-0">
                              <input
                                type="checkbox"
                                checked={task.done}
                                onChange={() => toggleTask(task.id)}
                                className="size-4 sm:size-5 rounded border-gray-300 text-[#695be6] focus:ring-[#695be6] cursor-pointer"
                              />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center justify-between gap-2 mb-1 flex-wrap">
                                <span className={`text-[10px] sm:text-xs font-bold uppercase tracking-wider px-2 py-0.5 rounded flex-shrink-0 ${SUBJECT_COLORS[task.subject] || "text-gray-500 bg-gray-100"}`}>
                                  {task.subject}
                                </span>
                                <span className="text-[8px] sm:text-[10px] text-gray-400 flex items-center gap-1 flex-shrink-0">
                                  <span className="material-symbols-outlined text-xs">{task.done ? "done_all" : "schedule"}</span>
                                  {task.duration}
                                </span>
                              </div>
                              <p className={`font-semibold leading-tight text-sm ${task.done ? "line-through" : ""} break-words`}>{task.title}</p>
                            </div>
                          </div>
                          {i < tasks.length - 1 && <hr className="border-gray-100 mt-3 sm:mt-4" />}
                        </div>
                      ))
                    )}
                    {addingTask ? (
                      <div className="flex gap-2 mt-2">
                        <input
                          autoFocus
                          value={newTaskTitle}
                          onChange={(e) => setNewTaskTitle(e.target.value)}
                          onKeyDown={(e) => e.key === "Enter" && addTask()}
                          placeholder="Task title..."
                          className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-[#695be6]"
                        />
                        <button onClick={addTask} className="bg-[#695be6] text-white px-3 py-2 rounded-lg text-sm font-bold flex-shrink-0">Add</button>
                        <button onClick={() => setAddingTask(false)} className="text-gray-400 px-2 py-2 rounded-lg text-sm flex-shrink-0">✕</button>
                      </div>
                    ) : (
                      <button onClick={() => setAddingTask(true)} className="w-full py-2 sm:py-3 mt-2 border-2 border-dashed border-gray-200 rounded-lg sm:rounded-xl text-gray-400 font-medium hover:bg-gray-50 transition-colors flex items-center justify-center gap-2 text-sm">
                        <span className="material-symbols-outlined text-base">add</span>Add Task
                      </button>
                    )}
                  </div>
                </div>
              </section>
            </div>
          </div>
        </div>
      </main>

      {/* Bottom Nav */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 px-4 sm:px-6 py-2 z-50">
        <div className="max-w-7xl mx-auto flex items-end justify-around h-16">
          {[
            { icon: "home", label: "Home", active: true, to: "/student" },
            { icon: "description", label: "Homework", active: false, to: "/student/homework" },
            { icon: "auto_awesome", label: "Vin AI", active: false, fab: true },
            { icon: "bar_chart", label: "Progress", active: false, to: "/student/learning-gaps" },
            { icon: "person", label: "Profile", active: false, to: "/student/portfolio" },
          ].map((item) =>
            item.fab ? (
              <Link
                key={item.label}
                to="/student/vin-ai"
                className="flex flex-col items-center -mt-6 bg-[#695be6] text-white size-12 sm:size-14 rounded-full shadow-lg shadow-[#695be6]/40 justify-center hover:shadow-xl transition-shadow"
              >
                <span className="material-symbols-outlined text-xl sm:text-2xl">{item.icon}</span>
              </Link>
            ) : (
              <Link key={item.label} to={item.to || "#"} className={`flex flex-col items-center gap-1 text-center flex-1 ${item.active ? "text-[#695be6]" : "text-gray-400"}`}>
                <span className="material-symbols-outlined text-lg sm:text-xl">{item.icon}</span>
                <span className="text-[9px] sm:text-[10px] font-bold">{item.label}</span>
              </Link>
            )
          )}
        </div>
      </nav>
    </div>
  );
}
