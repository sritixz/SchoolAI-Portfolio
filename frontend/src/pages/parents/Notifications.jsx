import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import {
  fetchParentNotifications,
  markParentNotifRead,
  optimisticMarkNotifRead,
  selectParentNotifications,
  selectUnreadCount,
} from "../../store/slices/parentSlice";

const TABS = ["All", "Homework", "Achievements", "System"];

const TYPE_ICON = {
  homework_new: { icon: "menu_book", bg: "bg-[#695be6]/10", color: "text-[#695be6]" },
  homework_due: { icon: "schedule", bg: "bg-orange-100", color: "text-orange-500" },
  achievement:  { icon: "emoji_events", bg: "bg-green-500", color: "text-white" },
  overdue:      { icon: "error", bg: "bg-red-500", color: "text-white" },
};

const BORDER_COLOR = {
  homework_new: "border-l-[#695be6]",
  homework_due: "border-l-orange-400",
  achievement:  "border-l-green-500",
  overdue:      "border-l-red-500",
};

export default function ParentNotifications() {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const [tab, setTab] = useState("All");

  const notifications = useSelector(selectParentNotifications);
  const unread = useSelector(selectUnreadCount);

  useEffect(() => {
    dispatch(fetchParentNotifications());
  }, [dispatch]);

  const markAllRead = () => {
    notifications.filter((n) => !n.read).forEach((n) => {
      const id = n._id || n.id;
      dispatch(optimisticMarkNotifRead(id));
      dispatch(markParentNotifRead(id));
    });
  };

  const filtered = tab === "All" ? notifications :
    tab === "Homework" ? notifications.filter((n) => ["homework_new","homework_due","overdue"].includes(n.type)) :
    tab === "Achievements" ? notifications.filter((n) => n.type === "achievement") :
    notifications.filter((n) => n.type === "system");

  return (
    <div className="bg-[#f6f6f8] min-h-screen pb-10" style={{ fontFamily: "'Lexend', sans-serif" }}>
      <div className="bg-white border-b border-gray-100 px-4 py-4 flex items-center gap-3">
        <button onClick={() => navigate("/parent")} className="size-9 flex items-center justify-center rounded-xl hover:bg-gray-100">
          <span className="material-symbols-outlined text-xl">arrow_back</span>
        </button>
        <h1 className="text-lg font-bold flex-1">Notifications</h1>
      </div>

      <div className="max-w-lg mx-auto px-4 pt-4">
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 mb-4 flex items-center justify-between">
          <div>
            <p className="font-bold">You have {unread} unread notifications</p>
            <p className="text-sm text-gray-400">Stay updated with your child's progress.</p>
          </div>
          <button onClick={markAllRead} className="text-sm text-[#695be6] font-bold flex items-center gap-1 shrink-0">
            Mark all as read <span className="material-symbols-outlined text-base">done_all</span>
          </button>
        </div>

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

        {filtered.length === 0 ? (
          <div className="bg-white rounded-2xl border border-gray-100 p-8 text-center text-gray-400">
            <span className="material-symbols-outlined text-4xl mb-2">notifications_none</span>
            <p className="font-medium">No notifications</p>
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map((n) => {
              const ic = TYPE_ICON[n.type] || TYPE_ICON.homework_new;
              const border = BORDER_COLOR[n.type] || "";
              const id = n._id || n.id;
              return (
                <div
                  key={id}
                  onClick={() => { if (!n.read) { dispatch(optimisticMarkNotifRead(id)); dispatch(markParentNotifRead(id)); } }}
                  className={`bg-white rounded-2xl border border-gray-100 border-l-4 ${border} shadow-sm p-4 cursor-pointer ${!n.read ? "" : "opacity-75"}`}
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
                      <div className="flex items-center gap-2 mt-2 flex-wrap">
                        {n.tag && (
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                            n.tagColor === "indigo" ? "bg-indigo-100 text-indigo-700" :
                            n.tagColor === "orange" ? "bg-orange-100 text-orange-700" :
                            n.tagColor === "red" ? "bg-red-100 text-red-700" :
                            n.tagColor === "green" ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-600"
                          }`}>{n.tag}</span>
                        )}
                        {n.action && (
                          <button className={`ml-auto text-xs font-bold px-3 py-1 rounded-full border ${
                            n.type === "overdue" ? "border-red-400 text-red-600" : "border-[#695be6] text-[#695be6]"
                          }`}>{n.action}</button>
                        )}
                        {!n.read && <span className="size-2 bg-[#695be6] rounded-full ml-auto" />}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
