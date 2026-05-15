import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { getInitial } from "../../utils/nameUtils";
import { useDispatch, useSelector } from "react-redux";
import { fetchMyStudents, selectMyStudents } from "../../store/slices/teacherSlice";
import api from "../../api";
import { quickActionTypes, reminderStudents } from "../../data/teacherData";
const TEMPLATES = [
  { id: "gentle",     icon: "eco",           label: "Gentle",     color: "green" },
  { id: "urgent",     icon: "priority_high", label: "Urgent",     color: "orange" },
  { id: "motivating", icon: "bolt",          label: "Motivating", color: "blue" },
];

const FILTER_TABS = ["All Pending", "Overdue", "Due Today"];

const STATUS_STYLES = {
  "OVERDUE BY 2 DAYS": "text-red-600 bg-red-50",
  "OVERDUE BY 1 DAY":  "text-orange-600 bg-orange-50",
  "NOT VIEWED":        "text-gray-500 bg-gray-100",
};

const messageTemplates = {
  gentle:     `Hi [Student Name], just a quick reminder that you still have the "Math Fundamentals" homework pending. If you need help, feel free to ask! You're doing great!`,
  urgent:     `[Student Name], your homework is overdue. Please submit it immediately to avoid further penalties.`,
  motivating: `Hey [Student Name]! You've got this! Complete your "Math Fundamentals" homework today and keep your streak going! 💪`,
  appreciation: `Dear [Student Name], we wanted to recognise your excellent effort and improvement this week. Keep up the fantastic work! 🌟`,
  practice:   `Hi [Student Name], we've assigned some extra practice materials to help strengthen your understanding. Please complete them at your earliest convenience.`,
  meeting:    `Dear Parent, we would like to schedule a meeting to discuss [Student Name]'s progress. Please let us know your availability.`,
};

export default function QuickActions() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const dispatch = useDispatch();
  const apiStudents = useSelector(selectMyStudents);
  const [activeAction, setActiveAction] = useState("reminder");
  const [activeTemplate, setActiveTemplate] = useState("gentle");
  const [filterTab, setFilterTab] = useState("All Pending");
  const [students, setStudents] = useState(reminderStudents);
  const [notifyParent, setNotifyParent] = useState(true);
  const [selectedClass, setSelectedClass] = useState("All Classes");
  const [sending, setSending] = useState(false);
  const [toast, setToast] = useState(null);

  useEffect(() => { dispatch(fetchMyStudents()); }, [dispatch]);

  // Sync API students into local state when loaded
  useEffect(() => {
    if (apiStudents.length > 0) {
      setStudents(apiStudents.map((s) => ({
        id: s._id || s.id,
        name: s.name,
        status: "NOT VIEWED",
        selected: false,
        avatar: s.avatar || null,
      })));
    }
  }, [apiStudents]);

  const toggleStudent = (id) =>
    setStudents((prev) => prev.map((s) => s.id === id ? { ...s, selected: !s.selected } : s));

  const selectedCount = students.filter((s) => s.selected).length;

  function showToast(msg, type = "success") {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  }

  const getTemplateForAction = () => {
    if (activeAction === "appreciate") return messageTemplates.appreciation;
    if (activeAction === "practice")   return messageTemplates.practice;
    if (activeAction === "meeting")    return messageTemplates.meeting;
    return messageTemplates[activeTemplate];
  };

  const handleSend = async () => {
    const selected = students.filter((s) => s.selected);
    if (!selected.length) { showToast("Please select at least one student", "error"); return; }
    setSending(true);
    try {
      await api.post("/teacher/quick-actions/send-bulk", {
        student_ids:   selected.map((s) => s.id),
        message:       getTemplateForAction(),
        notify_parent: notifyParent,
        action_type:   activeAction,
      });
      showToast(`${activeAction === "meeting" ? "Meeting requests" : "Messages"} sent to ${selected.length} student${selected.length > 1 ? "s" : ""}`);
      setStudents((prev) => prev.map((s) => ({ ...s, selected: false })));
    } catch {
      showToast("Failed to send. Please try again.", "error");
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="bg-[#fff8f5] min-h-screen" style={{ fontFamily: "'Lexend', sans-serif" }}>

      {/* Toast */}
      {toast && (
        <div className={`fixed top-4 left-1/2 -translate-x-1/2 z-[100] flex items-center gap-2 px-5 py-3 rounded-xl shadow-lg text-sm font-semibold ${
          toast.type === "error" ? "bg-red-600 text-white" : "bg-green-600 text-white"
        }`}>
          <span className="material-symbols-outlined text-base">{toast.type === "error" ? "error" : "check_circle"}</span>
          {toast.msg}
        </div>
      )}

      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-white border-b border-gray-200">
        <div className="max-w-[1200px] mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button onClick={() => navigate("/teacher")} className="p-2 hover:bg-gray-100 rounded-lg">
              <span className="material-symbols-outlined text-gray-500">arrow_back</span>
            </button>
            <div className="size-8 bg-green-500 rounded-lg flex items-center justify-center text-white">
              <span className="material-symbols-outlined text-lg">bolt</span>
            </div>
            <div>
              <p className="font-black text-base leading-tight">Quick Actions</p>
              <p className="text-xs text-gray-400">Classroom Intervention Hub</p>
            </div>
          </div>
          <nav className="hidden md:flex items-center gap-6 text-sm font-semibold text-gray-500">
            <button onClick={() => navigate("/teacher")} className="hover:text-gray-700">Dashboard</button>
            <button onClick={() => navigate("/teacher/homework")} className="hover:text-gray-700">Classes</button>
            <button onClick={() => navigate("/teacher/interventions")} className="hover:text-gray-700">Students</button>
            <button className="text-[#695be6] border-b-2 border-[#695be6] pb-0.5">Actions</button>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-gray-400">BULK MODE</span>
              <div className="w-10 h-5 bg-gray-200 rounded-full relative cursor-pointer">
                <div className="size-4 bg-white rounded-full absolute top-0.5 left-0.5 shadow-sm" />
              </div>
            </div>
          </nav>
          <div className="size-9 rounded-full bg-[#695be6] flex items-center justify-center text-white font-bold text-sm">{getInitial(user?.name) || "T"}</div>
        </div>
      </header>

      <main className="max-w-[1200px] mx-auto pt-20 sm:pt-24 px-4 sm:px-6 pb-12">
        <div className="flex items-start justify-between mb-6">
          <div>
            <h1 className="text-3xl font-black">Quick Actions</h1>
            <p className="text-gray-500 mt-1">Send reminders, appreciation, and communicate with students & parents</p>
          </div>
          <div className="flex items-center gap-2 border border-gray-200 rounded-xl px-3 py-2 bg-white">
            <span className="material-symbols-outlined text-gray-400 text-base">school</span>
            <select
              value={selectedClass}
              onChange={(e) => setSelectedClass(e.target.value)}
              className="text-sm font-semibold bg-transparent outline-none"
            >
              <option>All Classes</option>
              {[...new Set(apiStudents.map((s) => s.class_name).filter(Boolean))].map((c) => (
                <option key={c}>{c}</option>
              ))}
            </select>
            <span className="material-symbols-outlined text-gray-400 text-base">expand_more</span>
          </div>
        </div>

        {/* Action Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          {quickActionTypes.map((action) => (
            <button
              key={action.id}
              onClick={() => setActiveAction(action.id)}
              className={`p-4 rounded-xl border-2 text-left transition-all ${
                activeAction === action.id
                  ? `border-${action.color}-400 bg-${action.color}-50`
                  : "border-gray-100 bg-white hover:border-gray-200"
              }`}
            >
              <div className={`size-10 rounded-xl flex items-center justify-center mb-3 ${
                action.color === "orange" ? "bg-orange-500" :
                action.color === "green"  ? "bg-green-500"  :
                action.color === "blue"   ? "bg-blue-500"   : "bg-purple-500"
              } text-white`}>
                <span className="material-symbols-outlined">{action.icon}</span>
              </div>
              <p className="font-black text-sm">{action.label}</p>
              <p className={`text-xs mt-0.5 ${
                action.color === "orange" ? "text-orange-500" :
                action.color === "green"  ? "text-green-500"  :
                action.color === "blue"   ? "text-blue-500"   : "text-purple-500"
              }`}>{action.subtitle}</p>
              <button className={`mt-3 text-xs font-bold border rounded-lg px-3 py-1.5 w-full transition-colors ${
                action.color === "orange" ? "border-orange-400 text-orange-600 hover:bg-orange-50" :
                action.color === "green"  ? "border-green-400 text-green-600 hover:bg-green-50"   :
                action.color === "blue"   ? "border-blue-400 text-blue-600 hover:bg-blue-50"     :
                "border-purple-400 text-purple-600 hover:bg-purple-50"
              }`}>
                {action.id === "reminder"   ? "Send Reminders"    :
                 action.id === "appreciate" ? "Appreciate Students" :
                 action.id === "practice"   ? "Assign Practice"   : "Request Meetings"}
              </button>
            </button>
          ))}
        </div>

        {/* Workspace Panel */}
        {activeAction === "reminder" && (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <div className="flex items-center gap-2">
                <div className="size-6 bg-orange-500 rounded flex items-center justify-center">
                  <span className="material-symbols-outlined text-white text-sm">notifications</span>
                </div>
                <h3 className="font-black text-base">Homework Reminders Workspace</h3>
              </div>
              <div className="flex items-center gap-2">
                <button className="p-1.5 hover:bg-gray-100 rounded-lg">
                  <span className="material-symbols-outlined text-gray-400">settings</span>
                </button>
                <button className="p-1.5 hover:bg-gray-100 rounded-lg">
                  <span className="material-symbols-outlined text-gray-400">close</span>
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-0">
              {/* Student List */}
              <div className="border-r border-gray-100 p-5">
                <div className="flex gap-2 mb-4">
                  {FILTER_TABS.map((tab) => (
                    <button
                      key={tab}
                      onClick={() => setFilterTab(tab)}
                      className={`text-xs font-bold px-3 py-1.5 rounded-full transition-colors ${
                        filterTab === tab ? "bg-green-500 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                      }`}
                    >
                      {tab}
                    </button>
                  ))}
                </div>
                <div className="flex flex-col gap-2">
                  {students.map((s) => (
                    <div
                      key={s.id}
                      onClick={() => toggleStudent(s.id)}
                      className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all ${
                        s.selected ? "border-[#695be6] bg-[#695be6]/5" : "border-gray-100 hover:border-gray-200"
                      }`}
                    >
                      <div className={`size-5 rounded border-2 flex items-center justify-center flex-shrink-0 ${
                        s.selected ? "bg-[#695be6] border-[#695be6]" : "border-gray-300"
                      }`}>
                        {s.selected && <span className="material-symbols-outlined text-white text-xs">check</span>}
                      </div>
                      <div className="size-9 rounded-full bg-gray-200 flex items-center justify-center flex-shrink-0">
                        <span className="material-symbols-outlined text-gray-400 text-sm">person</span>
                      </div>
                      <div className="flex-1">
                        <p className="font-bold text-sm">{s.name}</p>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${STATUS_STYLES[s.status] || "bg-gray-100 text-gray-500"}`}>
                          {s.status}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Template & Message */}
              <div className="p-5">
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wide mb-3">Choose Template</p>
                <div className="grid grid-cols-3 gap-2 mb-4">
                  {TEMPLATES.map((t) => (
                    <button
                      key={t.id}
                      onClick={() => setActiveTemplate(t.id)}
                      className={`flex flex-col items-center gap-1 p-3 rounded-xl border-2 transition-all ${
                        activeTemplate === t.id
                          ? t.color === "green"  ? "border-green-400 bg-green-50"   :
                            t.color === "orange" ? "border-orange-400 bg-orange-50" :
                            "border-blue-400 bg-blue-50"
                          : "border-gray-100 hover:border-gray-200"
                      }`}
                    >
                      <span className={`material-symbols-outlined text-xl ${
                        t.color === "green"  ? "text-green-500"  :
                        t.color === "orange" ? "text-orange-500" : "text-blue-500"
                      }`}>{t.icon}</span>
                      <span className="text-xs font-bold">{t.label}</span>
                    </button>
                  ))}
                </div>

                <p className="text-xs font-bold text-gray-600 mb-2">Message Content</p>
                <textarea
                  value={messageTemplates[activeTemplate]}
                  readOnly
                  className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm outline-none resize-none h-32 bg-gray-50"
                />

                <label className="flex items-center gap-2 mt-3 cursor-pointer">
                  <div
                    onClick={() => setNotifyParent(!notifyParent)}
                    className={`w-10 h-5 rounded-full relative transition-colors ${notifyParent ? "bg-green-500" : "bg-gray-200"}`}
                  >
                    <div className={`size-4 bg-white rounded-full absolute top-0.5 shadow-sm transition-transform ${notifyParent ? "translate-x-5" : "translate-x-0.5"}`} />
                  </div>
                  <span className="text-sm text-gray-600">Also notify parent via mobile app</span>
                </label>
              </div>
            </div>

            {/* Footer */}
            <div className="flex items-center justify-between px-6 py-4 border-t border-gray-100 bg-gray-50 rounded-b-2xl">
              <div className="flex items-center gap-2">
                <div className="size-5 bg-green-500 rounded-full flex items-center justify-center">
                  <span className="material-symbols-outlined text-white text-xs">check</span>
                </div>
                <span className="text-sm font-semibold text-gray-600">{selectedCount} Students selected for Homework Reminders</span>
              </div>
              <div className="flex gap-3">
                <button className="border border-gray-200 text-sm font-bold px-4 py-2 rounded-xl hover:bg-gray-100 transition-colors">
                  Preview All
                </button>
                <button onClick={handleSend} disabled={sending || selectedCount === 0}
                  className="bg-green-500 text-white text-sm font-bold px-5 py-2 rounded-xl hover:bg-green-600 transition-colors flex items-center gap-2 disabled:opacity-50">
                  {sending
                    ? <><span className="size-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />Sending...</>
                    : <><span className="material-symbols-outlined text-base">send</span>Send to {selectedCount} Students</>
                  }
                </button>
              </div>
            </div>
          </div>
        )}

        {activeAction !== "reminder" && (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <div className="flex items-center gap-2">
                <div className={`size-6 rounded flex items-center justify-center text-white ${
                  activeAction === "appreciate" ? "bg-green-500" : activeAction === "practice" ? "bg-blue-500" : "bg-purple-500"
                }`}>
                  <span className="material-symbols-outlined text-sm">
                    {activeAction === "appreciate" ? "star" : activeAction === "practice" ? "menu_book" : "groups"}
                  </span>
                </div>
                <h3 className="font-black text-base">
                  {activeAction === "appreciate" ? "Send Appreciation" : activeAction === "practice" ? "Assign Extra Practice" : "Request Parent Meetings"}
                </h3>
              </div>
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-0">
              {/* Student List */}
              <div className="border-r border-gray-100 p-5">
                <p className="text-xs font-bold text-gray-400 uppercase mb-3">Select Students</p>
                <div className="flex flex-col gap-2">
                  {students.map((s) => (
                    <div key={s.id} onClick={() => toggleStudent(s.id)}
                      className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all ${
                        s.selected ? "border-[#695be6] bg-[#695be6]/5" : "border-gray-100 hover:border-gray-200"
                      }`}>
                      <div className={`size-5 rounded border-2 flex items-center justify-center flex-shrink-0 ${
                        s.selected ? "bg-[#695be6] border-[#695be6]" : "border-gray-300"
                      }`}>
                        {s.selected && <span className="material-symbols-outlined text-white text-xs">check</span>}
                      </div>
                      <div className="size-9 rounded-full bg-gray-200 flex items-center justify-center flex-shrink-0">
                        <span className="material-symbols-outlined text-gray-400 text-sm">person</span>
                      </div>
                      <p className="font-bold text-sm">{s.name}</p>
                    </div>
                  ))}
                </div>
              </div>
              {/* Message */}
              <div className="p-5">
                <p className="text-xs font-bold text-gray-600 mb-2">Message</p>
                <textarea readOnly value={getTemplateForAction()}
                  className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm outline-none resize-none h-32 bg-gray-50" />
                <label className="flex items-center gap-2 mt-3 cursor-pointer">
                  <div onClick={() => setNotifyParent(!notifyParent)}
                    className={`w-10 h-5 rounded-full relative transition-colors ${notifyParent ? "bg-green-500" : "bg-gray-200"}`}>
                    <div className={`size-4 bg-white rounded-full absolute top-0.5 shadow-sm transition-transform ${notifyParent ? "translate-x-5" : "translate-x-0.5"}`} />
                  </div>
                  <span className="text-sm text-gray-600">Also notify parent via mobile app</span>
                </label>
              </div>
            </div>
            <div className="flex items-center justify-between px-6 py-4 border-t border-gray-100 bg-gray-50 rounded-b-2xl">
              <span className="text-sm font-semibold text-gray-600">{selectedCount} Students selected</span>
              <button onClick={handleSend} disabled={sending || selectedCount === 0}
                className={`text-white text-sm font-bold px-5 py-2 rounded-xl transition-colors flex items-center gap-2 disabled:opacity-50 ${
                  activeAction === "appreciate" ? "bg-green-500 hover:bg-green-600" : activeAction === "practice" ? "bg-blue-500 hover:bg-blue-600" : "bg-purple-500 hover:bg-purple-600"
                }`}>
                {sending
                  ? <><span className="size-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />Sending...</>
                  : <><span className="material-symbols-outlined text-base">send</span>
                    {activeAction === "appreciate" ? "Send Appreciation" : activeAction === "practice" ? "Assign Practice" : "Request Meetings"} ({selectedCount})
                  </>
                }
              </button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
