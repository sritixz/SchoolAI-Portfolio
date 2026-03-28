import { useAuth } from "../../context/AuthContext";
import { useNavigate } from "react-router-dom";
import { getUserById } from "../../data/mockData";
import { parentDashboardData } from "../../data/parentData";

const { insight } = parentDashboardData;

const NAV_ITEMS = [
  { label: "Homework", icon: "assignment", badge: "8/10 DONE", badgeColor: "bg-[#695be6]/10 text-[#695be6]", sub: "2 Pending assignments", bg: "bg-[#ede9ff]", path: "/parent/homework" },
  { label: "Progress", icon: "trending_up", badge: null, badgeColor: null, sub: "3 topics need practice", bg: "bg-[#e6f9ee]", path: "/parent/progress" },
  { label: "Consistency", icon: "calendar_month", badge: "85% Score", badgeColor: "bg-amber-100 text-amber-700", sub: "5-Day Streak!", bg: "bg-[#fff8e6]", path: "/parent/consistency" },
  { label: "Notifications", icon: "notifications_active", badge: "5 NEW", badgeColor: "bg-red-100 text-red-600", sub: "Aarav submitted Math...", bg: "bg-[#fff0f0]", path: "/parent/notifications" },
  { label: "Support Needed", icon: "psychology", badge: null, badgeColor: null, sub: "2 patterns detected", bg: "bg-[#ffe8e8]", path: "/parent/support", alert: true },
  { label: "Curiosity Prompts", icon: "auto_awesome", badge: "NEW PROMPTS", badgeColor: "bg-[#695be6]/10 text-[#695be6]", sub: "Connect learning at home", bg: "bg-[#e8f4ff]", path: "/parent/curiosity" },
];

const MORE_OPTIONS = [
  { label: "Learning Profile", icon: "manage_accounts", path: "/parent/learning-profile" },
  { label: "Growth Portfolio", icon: "workspace_premium", badge: "NEW", path: "/parent/portfolio" },
  { label: "Settings", icon: "settings", path: "/parent/notifications" },
];

export default function ParentHome() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const child = getUserById(user?.children?.[0]);

  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good Morning" : hour < 17 ? "Good Afternoon" : "Good Evening";

  return (
    <div className="bg-[#f6f6f8] min-h-screen pb-10" style={{ fontFamily: "'Lexend', sans-serif" }}>
      {/* Header */}
      <header className="bg-[#695be6] text-white px-5 pt-5 pb-6">
        <div className="max-w-lg mx-auto">
          <div className="flex items-center justify-between mb-3">
            <div className="size-9 bg-white/20 rounded-xl flex items-center justify-center">
              <span className="material-symbols-outlined text-xl">family_restroom</span>
            </div>
            <div className="flex items-center gap-3">
              <button className="relative" onClick={() => navigate("/parent/notifications")}>
                <span className="material-symbols-outlined text-2xl">notifications</span>
                <span className="absolute -top-1 -right-1 size-4 bg-red-500 rounded-full text-[10px] font-bold flex items-center justify-center">2</span>
              </button>
              <div className="size-9 rounded-full bg-white/30 overflow-hidden flex items-center justify-center">
                <span className="material-symbols-outlined text-xl">person</span>
              </div>
            </div>
          </div>
          <h1 className="text-2xl font-black">{greeting}, {user?.name?.split(" ")[0]}!</h1>
          <p className="text-white/80 text-sm mt-0.5">Here's how Aarav is doing</p>
          <div className="mt-3 inline-flex items-center gap-2 bg-white/20 rounded-full px-3 py-1.5 text-sm font-semibold">
            <span className="material-symbols-outlined text-base">chat_bubble</span>
            {child?.name} (Grade {child?.class})
            <span className="material-symbols-outlined text-base">expand_more</span>
          </div>
        </div>
      </header>

      <div className="max-w-lg mx-auto px-4">
        {/* Quick Stats */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 mt-4 grid grid-cols-3 divide-x divide-gray-100">
          <div className="p-4 text-center">
            <span className="material-symbols-outlined text-[#695be6] text-2xl">menu_book</span>
            <p className="text-2xl font-black mt-1">8/10</p>
            <p className="text-xs text-gray-500 font-medium">HOMEWORK DONE</p>
            <p className="text-xs text-gray-400">This Week</p>
          </div>
          <div className="p-4 text-center">
            <span className="material-symbols-outlined text-orange-500 text-2xl">local_fire_department</span>
            <p className="text-2xl font-black mt-1">85%</p>
            <p className="text-xs text-gray-500 font-medium">CONSISTENCY</p>
            <p className="text-xs text-emerald-500 font-semibold">+5% ↑</p>
          </div>
          <div className="p-4 text-center">
            <span className="material-symbols-outlined text-red-500 text-2xl">warning</span>
            <p className="text-2xl font-black mt-1">2</p>
            <p className="text-xs text-gray-500 font-medium">ALERTS</p>
            <p className="text-xs text-red-500 font-semibold">Needs Attention</p>
          </div>
        </div>

        {/* My Dashboard */}
        <h2 className="text-lg font-bold mt-6 mb-3">My Dashboard</h2>
        <div className="grid grid-cols-2 gap-3">
          {NAV_ITEMS.map((item) => (
            <button
              key={item.label}
              onClick={() => navigate(item.path)}
              className={`${item.bg} rounded-2xl p-4 text-left hover:scale-[1.02] transition-transform`}
            >
              <div className="flex items-start justify-between mb-2">
                <span className={`material-symbols-outlined text-2xl ${item.alert ? "text-red-500" : "text-gray-700"}`}>{item.icon}</span>
                {item.badge && (
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${item.badgeColor}`}>{item.badge}</span>
                )}
              </div>
              <p className={`font-bold text-sm ${item.alert ? "text-red-600" : "text-gray-800"}`}>{item.label}</p>
              <p className={`text-xs mt-0.5 ${item.alert ? "text-red-500 font-semibold" : "text-gray-500"}`}>{item.sub}</p>
              {item.label === "Curiosity Prompts" && (
                <p className="text-xs text-gray-400 mt-0.5">Personalized conversation starters for Aarav's science unit.</p>
              )}
            </button>
          ))}
        </div>

        {/* Insight of the Week */}
        <div className="mt-4 bg-amber-50 border border-amber-100 rounded-2xl p-4 flex gap-3">
          <div className="size-9 bg-amber-100 rounded-full flex items-center justify-center shrink-0">
            <span className="material-symbols-outlined text-amber-600 text-xl">lightbulb</span>
          </div>
          <div>
            <p className="text-xs font-bold text-amber-600 uppercase tracking-wide">Insight of the Week</p>
            <p className="text-sm text-gray-700 mt-0.5">{insight.text}</p>
            <button onClick={() => navigate("/parent/learning-profile")} className="text-xs text-amber-600 font-bold mt-1">Learn More &gt;</button>
          </div>
        </div>

        {/* More Options */}
        <h2 className="text-lg font-bold mt-6 mb-3">More Options</h2>
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm divide-y divide-gray-100">
          {MORE_OPTIONS.map((opt) => (
            <button
              key={opt.label}
              onClick={() => navigate(opt.path)}
              className="w-full flex items-center gap-3 px-4 py-4 hover:bg-gray-50 transition-colors"
            >
              <span className="material-symbols-outlined text-gray-500 text-xl">{opt.icon}</span>
              <span className="font-medium text-sm flex-1 text-left">{opt.label}</span>
              {opt.badge && (
                <span className="text-[10px] font-bold bg-[#695be6] text-white px-2 py-0.5 rounded-full">{opt.badge}</span>
              )}
              <span className="material-symbols-outlined text-gray-300 text-xl">chevron_right</span>
            </button>
          ))}
          <button
            onClick={() => { logout(); navigate("/login"); }}
            className="w-full flex items-center gap-3 px-4 py-4 hover:bg-gray-50 transition-colors"
          >
            <span className="material-symbols-outlined text-red-400 text-xl">logout</span>
            <span className="font-medium text-sm text-red-500 flex-1 text-left">Logout</span>
          </button>
        </div>
      </div>
    </div>
  );
}
