import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { notificationsData } from "../../data/parentData";

const TABS = ["All", "Homework", "Achievements", "System"];

const TYPE_ICON = {
  homework_new: { icon: "menu_book", bg: "bg-[#695be6]/10", color: "text-[#695be6]" },
  homework_due: { icon: "schedule", bg: "bg-orange-100", color: "text-orange-500" },
  achievement: { icon: "emoji_events", bg: "bg-green-500", color: "text-white" },
  overdue: { icon: "error", bg: "bg-red-500", color: "text-white" },
};

const BORDER_COLOR = {
  homework_new: "border-l-[#695be6]",
  homework_due: "border-l-orange-400",
  achievement: "border-l-green-500",
  overdue: "border-l-red-500",
};

export default function ParentNotifications() {
  const navigate = useNavigate();
  const [tab, setTab] = useState("All");
  const [notifications, setNotifications] = useState(notificationsData);

  const markAllRead = () => setNotifications((n) => n.map((x) => ({ ...x, read: true })));
  const unread = notifications.filter((n) => !n.read).length;

  const filtered = tab === "All" ? notifications :
    tab === "Homework" ? notifications.filter((n) => n.type === "homework_new" || n.type === "homework_due" || n.type === "overdue") :
    tab === "Achievements" ? notifications.filter((n) => n.type === "achievement") :
    notifications.filter((n) => n.type === "system");

  return (
    <div className="bg-[#f6f6f8] min-h-screen pb-10" style={{ fontFamily: "'Lexend', sans-serif" }}>
      {/* Header */}
      <div className="bg-white border-b border-gray-100 px-4 py-4 flex items-center gap-3">
        <button onClick={() => navigate("/parent")} className="size-9 flex items-center justify-center rounded-xl hover:bg-gray-100">
          <span className="material-symbols-outlined text-xl">arrow_back</span>
        </button>
        <h1 className="text-lg font-bold flex-1">Notifications</h1>
        <div className="flex items-center gap-3 text-sm text-gray-500">
          <button onClick={() => navigate("/parent")} className="hover:text-[#695be6]">Dashboard</button>
          <button onClick={() => navigate("/parent/homework")} className="hover:text-[#695be6]">Students</button>
          <button onClick={() => navigate("/parent/support")} className="hover:text-[#695be6]">Messages</button>
          <button onClick={() => navigate("/parent/learning-profile")}><span className="material-symbols-outlined text-xl">settings</span></button>
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4 pt-4">
        {/* Unread Banner */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 mb-4 flex items-center justify-between">
          <div>
            <p className="font-bold">You have {unread} unread notifications</p>
            <p className="text-sm text-gray-400">Stay updated with your child's progress and school activities.</p>
          </div>
          <button onClick={markAllRead} className="text-sm text-[#695be6] font-bold flex items-center gap-1 shrink-0">
            Mark all as read <span className="material-symbols-outlined text-base">done_all</span>
          </button>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 mb-4 border-b border-gray-200">
          {TABS.map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-4 py-2 text-sm font-semibold transition-colors ${tab === t ? "text-[#695be6] border-b-2 border-[#695be6]" : "text-gray-500"}`}
            >
              {t}
            </button>
          ))}
        </div>

        {/* Notification List */}
        <div className="space-y-3">
          {filtered.map((n) => {
            const ic = TYPE_ICON[n.type] || TYPE_ICON.homework_new;
            const border = BORDER_COLOR[n.type] || "";
            return (
              <div
                key={n.id}
                className={`bg-white rounded-2xl border border-gray-100 border-l-4 ${border} shadow-sm p-4 ${!n.read ? "bg-white" : "opacity-80"}`}
              >
                <div className="flex items-start gap-3">
                  <div className={`size-10 rounded-xl flex items-center justify-center shrink-0 ${ic.bg}`}>
                    <span className={`material-symbols-outlined text-xl ${ic.color}`}>{ic.icon}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <p className={`font-bold text-sm ${n.type === "achievement" ? "text-green-600" : n.type === "overdue" ? "text-red-600" : ""}`}>{n.title}</p>
                      <span className="text-xs text-gray-400 shrink-0">{n.time}</span>
                    </div>
                    <p className="text-sm text-gray-600 mt-0.5">{n.desc}</p>
                    {n.sub && <p className="text-xs text-gray-400 italic mt-0.5">{n.sub}</p>}
                    <div className="flex items-center gap-2 mt-2 flex-wrap">
                      {n.tag && (
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          n.tagColor === "indigo" ? "bg-indigo-100 text-indigo-700" :
                          n.tagColor === "orange" ? "bg-orange-100 text-orange-700" :
                          n.tagColor === "red" ? "bg-red-100 text-red-700" : "bg-gray-100 text-gray-600"
                        }`}>{n.tag}</span>
                      )}
                      {n.tag2 && <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-100 text-blue-700">{n.tag2}</span>}
                      {n.action && (
                        <button className={`ml-auto text-xs font-bold px-3 py-1 rounded-full border ${
                          n.type === "overdue" ? "border-red-400 text-red-600" : "border-[#695be6] text-[#695be6]"
                        }`}>{n.action}</button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
