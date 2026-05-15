import { useEffect } from "react";
import { useAuth } from "../../context/AuthContext";
import { getFirstName, getInitial } from "../../utils/nameUtils";
import { useNavigate } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import {
  fetchParentDashboard,
  fetchParentNotifications,
  fetchParentTeacherMessages,
  selectChildren,
  selectUnreadCount,
  selectParentNotifications,
  selectUnreadMessages,
} from "../../store/slices/parentSlice";

const MORE_OPTIONS = [
  { label: "Learning Profile", icon: "manage_accounts", path: "/parent/learning-profile" },
  { label: "Growth Portfolio", icon: "workspace_premium", badge: "NEW", path: "/parent/portfolio" },
  { label: "Settings", icon: "settings", path: "/parent/notifications" },
];

export default function ParentHome() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const children = useSelector(selectChildren);
  const unreadCount = useSelector(selectUnreadCount);
  const notifications = useSelector(selectParentNotifications);
  const unreadMessages = useSelector(selectUnreadMessages);

  useEffect(() => {
    dispatch(fetchParentDashboard());
    dispatch(fetchParentNotifications());
    dispatch(fetchParentTeacherMessages());
  }, [dispatch]);

  const child = children[0];
  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good Morning" : hour < 17 ? "Good Afternoon" : "Good Evening";

  // Compute stats from real data
  const hwNotifs = notifications.filter((n) => n.type === "homework_new" || n.type === "homework_due");
  const overdueCount = notifications.filter((n) => n.type === "overdue").length;

  const NAV_ITEMS = [
    { label: "Homework", icon: "assignment", badge: hwNotifs.length > 0 ? `${hwNotifs.length} PENDING` : null, badgeColor: "bg-[#695be6]/10 text-[#695be6]", sub: child ? `${child.name}'s assignments` : "View assignments", bg: "bg-[#ede9ff]", path: "/parent/homework" },
    { label: "Messages", icon: "chat", badge: unreadMessages > 0 ? `${unreadMessages} NEW` : null, badgeColor: "bg-[#695be6]/10 text-[#695be6]", sub: unreadMessages > 0 ? `${unreadMessages} unread from teacher` : "Chat with teachers", bg: "bg-[#e8f4ff]", path: "/parent/messages" },
    { label: "Progress", icon: "trending_up", badge: null, sub: "Topic mastery overview", bg: "bg-[#e6f9ee]", path: "/parent/progress" },
    { label: "Consistency", icon: "calendar_month", badge: null, sub: "Homework streak & habits", bg: "bg-[#fff8e6]", path: "/parent/consistency" },
    { label: "Notifications", icon: "notifications_active", badge: unreadCount > 0 ? `${unreadCount} NEW` : null, badgeColor: "bg-red-100 text-red-600", sub: "School updates & alerts", bg: "bg-[#fff0f0]", path: "/parent/notifications" },
    { label: "Support Needed", icon: "psychology", badge: null, sub: overdueCount > 0 ? `${overdueCount} patterns detected` : "No active alerts", bg: "bg-[#ffe8e8]", path: "/parent/support", alert: overdueCount > 0 },
    { label: "Curiosity Prompts", icon: "auto_awesome", badge: "NEW PROMPTS", badgeColor: "bg-[#695be6]/10 text-[#695be6]", sub: "Connect learning at home", bg: "bg-[#e8f4ff]", path: "/parent/curiosity" },
    { label: "Request Meeting", icon: "calendar_month", badge: null, sub: "Schedule a teacher meeting", bg: "bg-[#f0f4ff]", path: "/parent/meeting" },
  ];

  return (
    <div className="bg-[#f6f6f8] min-h-screen pb-10" style={{ fontFamily: "'Lexend', sans-serif" }}>
      <header className="bg-[#695be6] text-white px-5 pt-5 pb-6">
        <div className="max-w-lg mx-auto">
          <div className="flex items-center justify-between mb-3">
            <div className="size-9 bg-white/20 rounded-xl flex items-center justify-center">
              <span className="material-symbols-outlined text-xl">family_restroom</span>
            </div>
            <div className="flex items-center gap-3">
              <button className="relative" onClick={() => navigate("/parent/notifications")}>
                <span className="material-symbols-outlined text-2xl">notifications</span>
                {unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 size-4 bg-red-500 rounded-full text-[10px] font-bold flex items-center justify-center">{unreadCount}</span>
                )}
              </button>
              <div className="size-9 rounded-full bg-white/30 overflow-hidden flex items-center justify-center">
                <span className="material-symbols-outlined text-xl">person</span>
              </div>
            </div>
          </div>
          <h1 className="text-2xl font-black">{greeting}, {getFirstName(user?.name) || "Parent"}!</h1>
          <p className="text-white/80 text-sm mt-0.5">
            {child ? `Here's how ${child.name} is doing` : "Welcome to your parent dashboard"}
          </p>
          {child && (
            <div className="mt-3 inline-flex items-center gap-2 bg-white/20 rounded-full px-3 py-1.5 text-sm font-semibold">
              <span className="material-symbols-outlined text-base">chat_bubble</span>
              {child.name} (Grade {child.grade_number || child.class})
              {children.length > 1 && <span className="material-symbols-outlined text-base">expand_more</span>}
            </div>
          )}
        </div>
      </header>

      <div className="max-w-lg mx-auto px-4">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 mt-4 grid grid-cols-3 divide-x divide-gray-100">
          <div className="p-4 text-center">
            <span className="material-symbols-outlined text-[#695be6] text-2xl">menu_book</span>
            <p className="text-2xl font-black mt-1">{hwNotifs.length}</p>
            <p className="text-xs text-gray-500 font-medium">PENDING HW</p>
            <p className="text-xs text-gray-400">This Week</p>
          </div>
          <button className="p-4 text-center hover:bg-gray-50 transition-colors" onClick={() => navigate("/parent/messages")}>
            <span className="material-symbols-outlined text-[#695be6] text-2xl">chat</span>
            <p className="text-2xl font-black mt-1">{unreadMessages}</p>
            <p className="text-xs text-gray-500 font-medium">MESSAGES</p>
            <p className={`text-xs font-semibold ${unreadMessages > 0 ? "text-[#695be6]" : "text-gray-400"}`}>
              {unreadMessages > 0 ? "Unread" : "All Read"}
            </p>
          </button>
          <div className="p-4 text-center">
            <span className="material-symbols-outlined text-red-500 text-2xl">warning</span>
            <p className="text-2xl font-black mt-1">{overdueCount}</p>
            <p className="text-xs text-gray-500 font-medium">ALERTS</p>
            <p className="text-xs text-red-500 font-semibold">{overdueCount > 0 ? "Needs Attention" : "All Clear"}</p>
          </div>
        </div>

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
            </button>
          ))}
        </div>

        <div className="mt-4 bg-amber-50 border border-amber-100 rounded-2xl p-4 flex gap-3">
          <div className="size-9 bg-amber-100 rounded-full flex items-center justify-center shrink-0">
            <span className="material-symbols-outlined text-amber-600 text-xl">lightbulb</span>
          </div>
          <div>
            <p className="text-xs font-bold text-amber-600 uppercase tracking-wide">Insight of the Week</p>
            <p className="text-sm text-gray-700 mt-0.5">
              {child ? `Track ${child.name}'s learning patterns and consistency to help them perform at their best.` : "Track your child's learning patterns and consistency to help them perform at their best."}
            </p>
            <button onClick={() => navigate("/parent/learning-profile")} className="text-xs text-amber-600 font-bold mt-1">Learn More &gt;</button>
          </div>
        </div>

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
