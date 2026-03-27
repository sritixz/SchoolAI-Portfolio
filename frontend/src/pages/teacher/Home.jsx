import { useAuth } from "../../context/AuthContext";
import { useNavigate } from "react-router-dom";

export default function TeacherHome() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  return (
    <div className="bg-[#f6f6f8] min-h-screen pb-24" style={{ fontFamily: "'Lexend', sans-serif" }}>
      <header className="fixed top-0 left-0 right-0 z-50 bg-white/80 backdrop-blur-md border-b border-gray-200">
        <div className="max-w-[1200px] mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="size-8 bg-blue-500 rounded-lg flex items-center justify-center text-white">
              <span className="material-symbols-outlined text-xl">person_book</span>
            </div>
            <h2 className="text-lg font-bold">{user?.school}</h2>
          </div>
          <button onClick={() => { logout(); navigate("/login"); }} className="text-sm text-red-500 flex items-center gap-1">
            <span className="material-symbols-outlined text-base">logout</span> Logout
          </button>
        </div>
      </header>

      <main className="max-w-[1200px] mx-auto pt-24 px-6">
        <div className="mb-8 bg-gradient-to-r from-blue-400 to-indigo-500 rounded-xl p-8 text-white shadow-lg">
          <h1 className="text-3xl font-black">Good Morning, {user?.name?.split(" ")[0]}! 👋</h1>
          <p className="text-white/90 mt-1">{user?.subject} Teacher • {user?.classes?.join(", ")}</p>
        </div>

        <h3 className="text-xl font-bold mb-4">Today's Schedule</h3>
        <div className="flex flex-col gap-3 mb-8">
          {user?.todaySchedule?.map((cls) => (
            <div key={cls.id} className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 flex items-center gap-4">
              <div className={`size-12 rounded-xl flex items-center justify-center text-white ${cls.status === "completed" ? "bg-gray-300" : "bg-blue-500"}`}>
                <span className="material-symbols-outlined">{cls.status === "completed" ? "check_circle" : "class"}</span>
              </div>
              <div className="flex-1">
                <p className="font-bold">{cls.class} — {cls.subject}</p>
                <p className="text-sm text-gray-500">{cls.time} • {cls.room}</p>
              </div>
              <span className={`text-xs font-bold px-2 py-1 rounded-full ${cls.status === "completed" ? "bg-gray-100 text-gray-400" : "bg-blue-100 text-blue-600"}`}>
                {cls.status}
              </span>
            </div>
          ))}
        </div>

        <h3 className="text-xl font-bold mb-4">Homework Submissions</h3>
        <div className="flex flex-col gap-3">
          {user?.pendingHomework?.map((hw) => (
            <div key={hw.id} className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
              <div className="flex justify-between items-start mb-2">
                <div>
                  <p className="font-bold">{hw.title}</p>
                  <p className="text-sm text-gray-500">{hw.class} • Due {hw.dueDate}</p>
                </div>
                <span className="text-sm font-bold text-[#695be6]">{hw.submitted}/{hw.total}</span>
              </div>
              <div className="w-full bg-gray-100 rounded-full h-2">
                <div className="bg-[#695be6] h-2 rounded-full" style={{ width: `${(hw.submitted / hw.total) * 100}%` }}></div>
              </div>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}
