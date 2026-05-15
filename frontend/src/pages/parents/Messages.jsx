import { useEffect, useState, useMemo, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import {
  fetchParentTeacherMessages, markTeacherMessageRead, sendMessageToTeacher,
  selectTeacherMessages, selectChildren, fetchParentDashboard,
} from "../../store/slices/parentSlice";
import api from "../../api";

function Avatar({ name, size = "size-10", bg = "bg-[#695be6]/10", text = "text-[#695be6] text-sm" }) {
  return (
    <div className={`${size} rounded-full ${bg} flex items-center justify-center font-bold ${text} flex-shrink-0`}>
      {name?.[0]?.toUpperCase() || "?"}
    </div>
  );
}

// ── New Conversation Modal ────────────────────────────────────
function NewConversationModal({ children, onClose, onStart }) {
  const [step, setStep] = useState(0); // 0=pick child, 1=pick teacher
  const [selectedChild, setSelectedChild] = useState(null);
  const [teachers, setTeachers] = useState([]);
  const [loading, setLoading] = useState(false);

  const pickChild = (child) => {
    setSelectedChild(child);
    setLoading(true);
    api.get("/parent/child-teachers", { params: { child_id: child._id || child.id } })
      .then((r) => { setTeachers(r.data || []); setStep(1); })
      .catch(() => setTeachers([]))
      .finally(() => setLoading(false));
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 p-4"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <div className="flex items-center gap-2">
            {step === 1 && (
              <button onClick={() => setStep(0)} className="size-8 rounded-lg hover:bg-gray-100 flex items-center justify-center mr-1">
                <span className="material-symbols-outlined text-gray-500 text-lg">arrow_back</span>
              </button>
            )}
            <h3 className="font-black text-base">
              {step === 0 ? "Select Child" : `Teachers for ${selectedChild?.name}`}
            </h3>
          </div>
          <button onClick={onClose} className="size-8 rounded-lg hover:bg-gray-100 flex items-center justify-center">
            <span className="material-symbols-outlined text-gray-400 text-lg">close</span>
          </button>
        </div>

        <div className="px-5 py-4 space-y-2 max-h-72 overflow-y-auto">
          {step === 0 && children.map((c) => (
            <button key={c._id || c.id} onClick={() => pickChild(c)}
              className="w-full flex items-center gap-3 p-3 rounded-xl border border-gray-100 hover:border-[#695be6]/40 hover:bg-[#695be6]/5 transition-all text-left">
              <Avatar name={c.name} size="size-10" />
              <div>
                <p className="font-bold text-sm">{c.name}</p>
                <p className="text-xs text-gray-400">{c.class_name || c.class || `Grade ${c.grade_number}`}</p>
              </div>
              <span className="material-symbols-outlined text-gray-300 ml-auto">chevron_right</span>
            </button>
          ))}

          {step === 1 && loading && (
            <div className="flex items-center justify-center py-8">
              <span className="size-6 border-2 border-[#695be6]/30 border-t-[#695be6] rounded-full animate-spin" />
            </div>
          )}

          {step === 1 && !loading && teachers.length === 0 && (
            <p className="text-sm text-gray-400 text-center py-6">No teachers found for {selectedChild?.name}.</p>
          )}

          {step === 1 && !loading && teachers.map((t) => (
            <button key={t.id} onClick={() => onStart(selectedChild, t)}
              className="w-full flex items-center gap-3 p-3 rounded-xl border border-gray-100 hover:border-[#695be6]/40 hover:bg-[#695be6]/5 transition-all text-left">
              <Avatar name={t.name} size="size-10" bg="bg-orange-100" text="text-orange-700 text-sm" />
              <div>
                <p className="font-bold text-sm">{t.name}</p>
                {t.subject && <p className="text-xs text-gray-400">{t.subject}</p>}
              </div>
              <span className="material-symbols-outlined text-[#695be6] ml-auto">chat</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────
export default function ParentMessages() {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const messages = useSelector(selectTeacherMessages);
  const children = useSelector(selectChildren);

  const [activeThread, setActiveThread] = useState(null); // { teacherId, teacherName, childId, childName }
  const [msgBody, setMsgBody] = useState("");
  const [sending, setSending] = useState(false);
  const [showNewModal, setShowNewModal] = useState(false);
  const [toast, setToast] = useState(null);
  const bottomRef = useRef(null);

  useEffect(() => {
    dispatch(fetchParentDashboard());
    dispatch(fetchParentTeacherMessages());
  }, [dispatch]);

  // Scroll to bottom when thread changes or new message arrives
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [activeThread, messages.length]);

  function showToast(msg, type = "success") {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  }

  // Group messages into threads keyed by teacher_id + student_id
  const threads = useMemo(() => {
    const map = new Map();
    messages.forEach((m) => {
      // Key by teacher_id + student_id — one thread per teacher per child
      const key = `${m.teacher_id || "unknown"}__${m.student_id || "unknown"}`;
      if (!map.has(key)) {
        map.set(key, {
          key,
          teacherId: m.teacher_id || "unknown",
          teacherName: m.teacher_name || "Teacher",
          childId: m.student_id || "unknown",
          childName: m.student_name || "Student",
          messages: [],
          unread: 0,
          lastAt: "",
        });
      }
      const t = map.get(key);
      // Update teacher name if we get a better one
      if (m.teacher_name && t.teacherName === "Teacher") t.teacherName = m.teacher_name;
      t.messages.push(m);
      if (m.direction === "teacher_to_parent" && !m.read) t.unread++;
      if ((m.sent_at || "") > t.lastAt) t.lastAt = m.sent_at || "";
    });
    // Sort each thread's messages chronologically
    map.forEach((t) => t.messages.sort((a, b) => (a.sent_at || "").localeCompare(b.sent_at || "")));
    // Sort threads: unread first, then most recent
    return Array.from(map.values()).sort((a, b) => {
      if (b.unread !== a.unread) return b.unread - a.unread;
      return b.lastAt.localeCompare(a.lastAt);
    });
  }, [messages]);

  const currentThread = activeThread
    ? threads.find((t) => t.key === `${activeThread.teacherId}__${activeThread.childId}`)
    : null;

  const totalUnread = threads.reduce((s, t) => s + t.unread, 0);

  const openThread = (thread) => {
    setActiveThread({ teacherId: thread.teacherId, teacherName: thread.teacherName, childId: thread.childId, childName: thread.childName });
    // Mark unread messages as read
    thread.messages.forEach((m) => {
      if (m.direction === "teacher_to_parent" && !m.read) {
        dispatch(markTeacherMessageRead(m._id || m.id));
      }
    });
  };

  const handleStartNew = (child, teacher) => {
    setShowNewModal(false);
    setActiveThread({ teacherId: teacher.id, teacherName: teacher.name, childId: child._id || child.id, childName: child.name });
  };

  const handleSend = async () => {
    if (!activeThread || !msgBody.trim()) return;
    setSending(true);
    try {
      await dispatch(sendMessageToTeacher({
        teacher_id: activeThread.teacherId,
        child_id: activeThread.childId,
        message: msgBody,
      })).unwrap();
      setMsgBody("");
      dispatch(fetchParentTeacherMessages());
    } catch { showToast("Failed to send", "error"); }
    finally { setSending(false); }
  };

  // ── Mobile: show thread list or chat ─────────────────────────
  const showChat = !!activeThread;

  return (
    <div className="bg-[#f6f6f8] h-screen flex flex-col" style={{ fontFamily: "'Lexend', sans-serif" }}>
      {toast && (
        <div className={`fixed top-4 left-1/2 -translate-x-1/2 z-[100] flex items-center gap-2 px-5 py-3 rounded-xl shadow-lg text-sm font-semibold ${
          toast.type === "error" ? "bg-red-600 text-white" : "bg-green-600 text-white"
        }`}>
          <span className="material-symbols-outlined text-base">{toast.type === "error" ? "error" : "check_circle"}</span>
          {toast.msg}
        </div>
      )}

      {showNewModal && (
        <NewConversationModal
          children={children}
          onClose={() => setShowNewModal(false)}
          onStart={handleStartNew}
        />
      )}

      {/* Header */}
      <header className="bg-[#695be6] text-white px-4 pt-5 pb-4 flex-shrink-0">
        <div className="max-w-2xl mx-auto flex items-center gap-3">
          {showChat ? (
            <button onClick={() => setActiveThread(null)} className="p-1.5 hover:bg-white/20 rounded-lg sm:hidden">
              <span className="material-symbols-outlined text-xl">arrow_back</span>
            </button>
          ) : (
            <button onClick={() => navigate("/parent")} className="p-1.5 hover:bg-white/20 rounded-lg">
              <span className="material-symbols-outlined text-xl">arrow_back</span>
            </button>
          )}
          <div className="size-8 bg-white/20 rounded-xl flex items-center justify-center">
            <span className="material-symbols-outlined text-lg">forum</span>
          </div>
          {showChat && activeThread ? (
            <div className="flex-1 min-w-0">
              <p className="font-black text-base leading-tight truncate">{activeThread.teacherName}</p>
              <p className="text-white/70 text-xs">Re: {activeThread.childName}</p>
            </div>
          ) : (
            <h1 className="font-black text-lg flex-1">Messages</h1>
          )}
          {!showChat && totalUnread > 0 && (
            <span className="bg-red-500 text-white text-xs font-bold px-2.5 py-0.5 rounded-full">{totalUnread} NEW</span>
          )}
          {!showChat && (
            <button onClick={() => setShowNewModal(true)}
              className="size-9 bg-white/20 hover:bg-white/30 rounded-xl flex items-center justify-center transition-colors">
              <span className="material-symbols-outlined text-lg">edit</span>
            </button>
          )}
        </div>
      </header>

      {/* Body — two-pane on desktop, single pane on mobile */}
      <div className="flex-1 overflow-hidden max-w-2xl mx-auto w-full flex">

        {/* Thread list — hidden on mobile when chat is open */}
        <div className={`${showChat ? "hidden sm:flex" : "flex"} flex-col w-full sm:w-72 sm:flex-shrink-0 border-r border-gray-200 bg-white overflow-y-auto`}>
          <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
            <p className="text-xs font-bold text-gray-400 uppercase tracking-wide">Conversations</p>
            <button onClick={() => setShowNewModal(true)}
              className="flex items-center gap-1 text-xs font-bold text-[#695be6] hover:underline">
              <span className="material-symbols-outlined text-sm">add</span> New
            </button>
          </div>

          {threads.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center text-gray-400 p-8 text-center">
              <span className="material-symbols-outlined text-4xl mb-2">chat_bubble_outline</span>
              <p className="text-sm font-medium">No conversations yet</p>
              <button onClick={() => setShowNewModal(true)}
                className="mt-4 bg-[#695be6] text-white text-sm font-bold px-4 py-2 rounded-xl hover:bg-[#5a4dd4]">
                Start a conversation
              </button>
            </div>
          ) : (
            <div className="divide-y divide-gray-50">
              {threads.map((t) => (
                <button key={t.key} onClick={() => openThread(t)}
                  className={`w-full flex items-center gap-3 px-4 py-3.5 text-left hover:bg-gray-50 transition-colors ${
                    activeThread?.teacherId === t.teacherId && activeThread?.childId === t.childId
                      ? "bg-[#695be6]/5 border-r-2 border-[#695be6]"
                      : ""
                  }`}>
                  <div className="relative">
                    <Avatar name={t.teacherName} size="size-11" bg="bg-orange-100" text="text-orange-700 text-sm" />
                    {t.unread > 0 && (
                      <span className="absolute -top-1 -right-1 size-4 bg-[#695be6] rounded-full text-[9px] font-bold text-white flex items-center justify-center">
                        {t.unread}
                      </span>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-0.5">
                      <p className={`text-sm truncate ${t.unread > 0 ? "font-black" : "font-semibold"}`}>{t.teacherName}</p>
                      <p className="text-[10px] text-gray-400 shrink-0 ml-2">
                        {t.lastAt ? new Date(t.lastAt).toLocaleDateString([], { month: "short", day: "numeric" }) : ""}
                      </p>
                    </div>
                    <p className="text-xs text-gray-400 truncate">Re: {t.childName}</p>
                    <p className={`text-xs truncate mt-0.5 ${t.unread > 0 ? "text-gray-700 font-medium" : "text-gray-400"}`}>
                      {t.messages[t.messages.length - 1]?.message || ""}
                    </p>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Chat pane */}
        <div className={`${showChat ? "flex" : "hidden sm:flex"} flex-1 flex-col overflow-hidden`}>
          {!activeThread ? (
            <div className="flex-1 flex flex-col items-center justify-center text-gray-400 p-8 text-center">
              <span className="material-symbols-outlined text-5xl mb-3 text-gray-200">forum</span>
              <p className="text-sm font-medium text-gray-500">Select a conversation</p>
              <p className="text-xs text-gray-400 mt-1">or start a new one</p>
              <button onClick={() => setShowNewModal(true)}
                className="mt-4 bg-[#695be6] text-white text-sm font-bold px-5 py-2.5 rounded-xl hover:bg-[#5a4dd4] flex items-center gap-2">
                <span className="material-symbols-outlined text-base">edit</span> New Conversation
              </button>
            </div>
          ) : (
            <>
              {/* Messages */}
              <div className="flex-1 overflow-y-auto px-4 py-4 space-y-2 bg-[#f6f6f8]">
                {currentThread?.messages.length === 0 && (
                  <div className="text-center text-gray-400 text-sm py-8">
                    No messages yet. Say hello!
                  </div>
                )}
                {currentThread?.messages.map((m, i) => {
                  const fromTeacher = m.direction === "teacher_to_parent";
                  const prevMsg = currentThread.messages[i - 1];
                  const showDateSep = !prevMsg || new Date(m.sent_at).toDateString() !== new Date(prevMsg.sent_at).toDateString();

                  return (
                    <div key={m._id || m.id}>
                      {showDateSep && m.sent_at && (
                        <div className="flex items-center gap-3 my-3">
                          <div className="flex-1 h-px bg-gray-200" />
                          <span className="text-[10px] font-bold text-gray-400 uppercase">
                            {new Date(m.sent_at).toLocaleDateString([], { weekday: "short", month: "short", day: "numeric" })}
                          </span>
                          <div className="flex-1 h-px bg-gray-200" />
                        </div>
                      )}
                      <div className={`flex items-end gap-2 ${fromTeacher ? "justify-start" : "justify-end"}`}>
                        {fromTeacher && (
                          <Avatar name={m.teacher_name || "T"} size="size-7" bg="bg-orange-100" text="text-orange-700 text-xs" />
                        )}
                        <div className={`max-w-[78%] ${fromTeacher ? "" : "items-end"} flex flex-col`}>
                          <div className={`px-4 py-2.5 rounded-2xl text-sm leading-relaxed ${
                            fromTeacher
                              ? "bg-white text-gray-800 rounded-bl-sm shadow-sm border border-gray-100"
                              : "bg-[#695be6] text-white rounded-br-sm"
                          }`}>
                            {m.message}
                          </div>
                          <p className={`text-[10px] mt-1 ${fromTeacher ? "text-gray-400" : "text-gray-400 text-right"}`}>
                            {m.sent_at ? new Date(m.sent_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : ""}
                          </p>
                        </div>
                        {!fromTeacher && (
                          <Avatar name="Me" size="size-7" bg="bg-[#695be6]/20" text="text-[#695be6] text-xs" />
                        )}
                      </div>
                    </div>
                  );
                })}
                <div ref={bottomRef} />
              </div>

              {/* Input */}
              <div className="bg-white border-t border-gray-100 px-4 py-3 flex items-end gap-3">
                <textarea
                  value={msgBody}
                  onChange={(e) => setMsgBody(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
                  placeholder="Type a message…"
                  rows={1}
                  className="flex-1 border border-gray-200 rounded-2xl px-4 py-2.5 text-sm outline-none focus:border-[#695be6] resize-none leading-relaxed"
                  style={{ maxHeight: "120px", overflowY: "auto" }}
                  onInput={(e) => { e.target.style.height = "auto"; e.target.style.height = e.target.scrollHeight + "px"; }}
                />
                <button
                  onClick={handleSend}
                  disabled={sending || !msgBody.trim()}
                  className="size-10 bg-[#695be6] text-white rounded-2xl hover:bg-[#5a4dd4] flex items-center justify-center disabled:opacity-40 transition-colors flex-shrink-0">
                  {sending
                    ? <span className="size-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                    : <span className="material-symbols-outlined text-lg">send</span>}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
