import { useAuth } from "../../context/AuthContext";
import { useNavigate } from "react-router-dom";

export default function SchoolAdminHome() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const stats = user?.stats || {};

  return (
    <div className="bg-[#f6f6f8] min-h-screen pb-24" style={{ fontFamily: "'Lexend', sans-serif" }}>
      <header className="fixed top-0 left-0 right-0 z-50 bg-white/80 backdrop-blur-md border-b border-gray-200">
        <div className="max-w-[1200px] mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="size-8 bg-amber-500 rounded-lg flex items-center justify-center text-white">
              <span className="material-symbols-outlined text-xl">admin_panel_settings</span>
            </div>
            <h2 className="text-lg font-bold">{user?.school}</h2>
          </div>
          <button onClick={() => { logout(); navigate("/login"); }} className="text-sm text-red-500 flex items-center gap-1">
            <span className="material-symbols-outlined text-base">logout</span> Logout
          </button>
        </div>
      </header>

      <main className="max-w-[1200px] mx-auto pt-24 px-6">
        <div className="mb-8 bg-gradient-to-r from-amber-400 to-orange-500 rounded-xl p-8 text-white shadow-lg">
          <h1 className="text-3xl font-black">Welcome, {user?.name?.split(" ")[0]}! 👋</h1>
          <p className="text-white/90 mt-1">{user?.designation} • {user?.school}</p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          {[
            { label: "Students", value: stats.totalStudents, icon: "school", color: "from-[#695be6] to-[#8e82f3]" },
            { label: "Teachers", value: stats.totalTeachers, icon: "person_book", color: "from-blue-400 to-indigo-500" },
            { label: "Classes", value: stats.totalClasses, icon: "class", color: "from-emerald-400 to-teal-500" },
            { label: "Attendance %", value: `${stats.attendanceToday}%`, icon: "event_available", color: "from-pink-400 to-rose-500" },
          ].map((s) => (
            <div key={s.label} className={`bg-gradient-to-br ${s.color} text-white rounded-xl p-5 shadow-md`}>
              <span className="material-symbols-outlined text-3xl opacity-80">{s.icon}</span>
              <p className="text-2xl font-black mt-2">{s.value}</p>
              <p className="text-sm opacity-80">{s.label}</p>
            </div>
          ))}
        </div>

        <h3 className="text-xl font-bold mb-4">Recent Activity</h3>
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6 flex flex-col gap-4">
          {user?.recentActivities?.map((a) => (
            <div key={a.id} className="flex items-start gap-3">
              <div className="size-9 bg-amber-100 rounded-lg flex items-center justify-center shrink-0">
                <span className="material-symbols-outlined text-amber-600 text-base">
                  {a.type === "admission" ? "person_add" : a.type === "fee" ? "payments" : "event"}
                </span>
              </div>
              <div>
                <p className="font-medium text-sm">{a.message}</p>
                <p className="text-xs text-gray-400 mt-0.5">{a.date}</p>
              </div>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}
