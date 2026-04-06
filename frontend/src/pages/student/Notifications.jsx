import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import {
  fetchStudentNotifications,
  markStudentNotifRead,
  selectStudentNotifications,
} from "../../store/slices/studentSlice";

export default function StudentNotifications() {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const notifications = useSelector(selectStudentNotifications);

  useEffect(() => {
    dispatch(fetchStudentNotifications());
  }, [dispatch]);

  const TYPE_ICON = {
    homework_new:  { icon: "menu_book",       bg: "bg-[#695be6]/10", color: "text-[#695be6]", border: "border-l-[#695be6]" },
    homework_due:  { icon: "schedule",        bg: "bg-orange-100",   color: "text-orange-500", border: "border-l-orange-400" },
    achievement:   { icon: "emoji_events",    bg: "bg-green-100",    color: "text-green-600",  border: "border-l-green-500" },
    overdue:       { icon: "error",           bg: "bg-red-100",      color: "text-red-600",    border: "border-l-red-500" },
    teacher_message:{ icon: "school",         bg: "bg-blue-100",     color: "text-blue-600",   border: "border-l-blue-400" },
  };

  const unread = notifications.filter((n) => !n.read).length;

  return (
    <div className="bg-[#f6f6f8] min-h-screen pb-10" style={{ fontFamily: "'Lexend', sans-serif" }}>
      <div className="bg-white border-b border-gray-100 px-4 py-4 flex items-center gap-3 sticky top-0 z-10">
        <button onClick={() => navigate("/student")} className="size-9 flex items-center justify-center rounded-xl hover:bg-gray-100">
          <span className="material-symbols-outlined text-xl">arrow_back</span>
        </button>
        <h1 className="text-lg font-bold flex-1">Notifications</h1>
        {unread > 0 && (
          <button
            onClick={() => notifications.filter((n) => !n.read).forEach((n) => {
              const id = n._id || n.id;
              dispatch(markStudentNotifRead(id));
            })}
            className="text-sm text-[#695be6] font-bold flex items-center gap-1"
          >
            Mark all read <span className="material-symbols-outlined text-base">done_all</span>
          </button>
        )}
      </div>

      <div className="max-w-lg mx-auto px-4 pt-4">
        {unread > 0 && (
          <div className="bg-[#695be6]/5 border border-[#695be6]/20 rounded-2xl p-4 mb-4 flex items-center gap-3">
            <span className="material-symbols-outlined text-[#695be6]">notifications_active</span>
            <p className="text-sm font-semibold text-[#695be6]">{unread} unread notification{unread > 1 ? "s" : ""}</p>
          </div>
        )}

        {notifications.length === 0 ? (
          <div className="bg-white rounded-2xl border border-gray-100 p-10 text-center text-gray-400">
            <span className="material-symbols-outlined text-5xl mb-3 block">notifications_none</span>
            <p className="font-semibold">No notifications yet</p>
            <p className="text-sm mt-1">You'll see homework updates, achievements, and messages here</p>
          </div>
        ) : (
          <div className="space-y-3">
            {notifications.map((n) => {
              const id = n._id || n.id;
              const ic = TYPE_ICON[n.type] || TYPE_ICON.homework_new;
              return (
                <div
                  key={id}
                  onClick={() => { if (!n.read) dispatch(markStudentNotifRead(id)); }}
                  className={`bg-white rounded-2xl border border-gray-100 border-l-4 ${ic.border} shadow-sm p-4 cursor-pointer transition-opacity ${n.read ? "opacity-70" : ""}`}
                >
                  <div className="flex items-start gap-3">
                    <div className={`size-10 rounded-xl flex items-center justify-center shrink-0 ${ic.bg}`}>
                      <span className={`material-symbols-outlined text-xl ${ic.color}`}>{ic.icon}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <p className="font-bold text-sm">{n.title}</p>
                        <div className="flex items-center gap-2 shrink-0">
                          <span className="text-xs text-gray-400">{n.time || (n.created_at ? new Date(n.created_at).toLocaleDateString() : "")}</span>
                          {!n.read && <span className="size-2 bg-[#695be6] rounded-full" />}
                        </div>
                      </div>
                      <p className="text-sm text-gray-600 mt-0.5">{n.desc || n.message}</p>
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
