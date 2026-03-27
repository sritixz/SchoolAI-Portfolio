import { useAuth } from "../../context/AuthContext";
import { useNavigate } from "react-router-dom";
import { getUserById } from "../../data/mockData";

export default function ParentHome() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const child = getUserById(user?.children?.[0]);

  return (
    <div className="bg-[#f6f6f8] min-h-screen pb-24" style={{ fontFamily: "'Lexend', sans-serif" }}>
      <header className="fixed top-0 left-0 right-0 z-50 bg-white/80 backdrop-blur-md border-b border-gray-200">
        <div className="max-w-[1200px] mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="size-8 bg-emerald-500 rounded-lg flex items-center justify-center text-white">
              <span className="material-symbols-outlined text-xl">family_restroom</span>
            </div>
            <h2 className="text-lg font-bold">{user?.school}</h2>
          </div>
          <button onClick={() => { logout(); navigate("/login"); }} className="text-sm text-red-500 flex items-center gap-1">
            <span className="material-symbols-outlined text-base">logout</span> Logout
          </button>
        </div>
      </header>

      <main className="max-w-[1200px] mx-auto pt-24 px-6">
        <div className="mb-8 bg-gradient-to-r from-emerald-400 to-teal-500 rounded-xl p-8 text-white shadow-lg">
          <h1 className="text-3xl font-black">Hello, {user?.name?.split(" ")[0]}! 👋</h1>
          <p className="text-white/90 mt-1">Tracking {child?.name}'s progress</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
          {[
            { label: "Attendance", value: `${child?.attendance?.percentage}%`, icon: "event_available", color: "from-blue-400 to-indigo-500" },
            { label: "Pending Fees", value: `₹${child?.fees?.find(f => f.status === "due")?.amount?.toLocaleString() || "0"}`, icon: "payments", color: "from-amber-400 to-orange-500" },
            { label: "Homework Due", value: `${child?.homework?.filter(h => h.status === "pending").length} tasks`, icon: "menu_book", color: "from-pink-400 to-rose-500" },
            { label: "Notifications", value: `${user?.notifications?.filter(n => !n.read).length} unread`, icon: "notifications", color: "from-[#695be6] to-[#8e82f3]" },
          ].map((card) => (
            <div key={card.label} className={`bg-gradient-to-br ${card.color} text-white rounded-xl p-5 flex items-center gap-4 shadow-md cursor-pointer hover:-translate-y-1 transition-transform`}>
              <span className="material-symbols-outlined text-4xl opacity-80">{card.icon}</span>
              <div>
                <p className="text-sm opacity-80 font-medium">{card.label}</p>
                <p className="text-2xl font-black">{card.value}</p>
              </div>
            </div>
          ))}
        </div>

        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
          <h3 className="font-bold text-lg mb-4">Recent Notifications</h3>
          <div className="flex flex-col gap-3">
            {user?.notifications?.map((n) => (
              <div key={n.id} className={`flex items-start gap-3 p-3 rounded-lg ${n.read ? "bg-gray-50" : "bg-[#695be6]/5 border border-[#695be6]/10"}`}>
                <span className="material-symbols-outlined text-[#695be6] mt-0.5">
                  {n.type === "attendance" ? "event_busy" : n.type === "fee" ? "payments" : "grade"}
                </span>
                <div>
                  <p className="text-sm font-medium">{n.message}</p>
                  <p className="text-xs text-gray-400 mt-0.5">{n.date}</p>
                </div>
                {!n.read && <span className="ml-auto size-2 bg-[#695be6] rounded-full mt-1.5 shrink-0"></span>}
              </div>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}
