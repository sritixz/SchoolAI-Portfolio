import { useState, useEffect, useMemo, useRef } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { useAuth } from "../../context/AuthContext";
import { getInitial } from "../../utils/nameUtils";
import {
  fetchParentMessages, sendParentMessage,
  selectParentMessages, fetchMyStudents, selectMyStudents,
  fetchMySections, selectMySections,
  createMeetingRequest, confirmMeetingRequest,
  fetchMeetingRequests, selectMeetingRequests,
  markParentMessageRead,
} from "../../store/slices/teacherSlice";
import api from "../../api";
import SearchBar from "../../components/SearchBar";
import { messageComposerTemplates } from "../../data/teacher/parentCommunicationData";

const TABS = ["Parents", "Meeting Requests", "Messages"];

// ── helpers ──────────────────────────────────────────────────
function Avatar({ name, size = "size-10", bg = "bg-[#695be6]/10", text = "text-[#695be6]" }) {
  return (
    <div className={`${size} rounded-full ${bg} flex items-center justify-center font-bold ${text} flex-shrink-0`}>
      {name?.[0]?.toUpperCase() || "?"}
    </div>
  );
}

function StatusBadge({ status }) {
  const map = {
    pending_response: "bg-orange-100 text-orange-600",
    confirmed:        "bg-green-100 text-green-700",
    completed:        "bg-blue-100 text-blue-700",
    cancelled:        "bg-gray-100 text-gray-500",
  };
  const label = {
    pending_response: "Pending",
    confirmed:        "Confirmed",
    completed:        "Completed",
    cancelled:        "Cancelled",
  };
  return (
    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${map[status] || "bg-gray-100 text-gray-500"}`}>
      {label[status] || status}
    </span>
  );
}

export default function ParentCommunication() {
  const navigate  = useNavigate();
  const dispatch  = useDispatch();
  const { user }  = useAuth();
  const [searchParams] = useSearchParams();

  const apiMessages = useSelector(selectParentMessages);
  const students    = useSelector(selectMyStudents);
  const mySections  = useSelector(selectMySections);
  const apiMeetings = useSelector(selectMeetingRequests);

  const [activeTab, setActiveTab] = useState(0);
  const [classFilter, setClassFilter] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [toast, setToast] = useState(null);

  // ── Tab 0: Parents List ──────────────────────────────────────
  const [parentsList, setParentsList] = useState([]);
  const [selectedParent, setSelectedParent] = useState(null);

  // ── Tab 1: Meeting Requests ──────────────────────────────────
  const [meetingRequests, setMeetingRequests] = useState([]);
  const [selectedMeeting, setSelectedMeeting] = useState(null);
  const [confirmingId, setConfirmingId] = useState(null);
  const [newMeetingModal, setNewMeetingModal] = useState(false);
  const [nmParentChildren, setNmParentChildren] = useState(null);
  const [nmStudent, setNmStudent] = useState("");
  const [nmReason, setNmReason] = useState("");
  const [nmUrgency, setNmUrgency] = useState("normal");
  const [nmTimes, setNmTimes] = useState([{ date: "", time: "" }]);
  const [nmSubmitting, setNmSubmitting] = useState(false);

  // ── Tab 2: Messages (Chat) ───────────────────────────────────
  const [selectedThread, setSelectedThread] = useState(null); // "parentId__studentId"
  const [replyBody, setReplyBody] = useState("");
  const [replying, setReplying] = useState(false);
  const chatBottomRef = useRef(null);

  // New Message modal state
  const [newMsgModal, setNewMsgModal] = useState(false);
  const [newMsgStudent, setNewMsgStudent] = useState("");
  const [newMsgBody, setNewMsgBody] = useState("");
  const [newMsgSending, setNewMsgSending] = useState(false);

  // ── Quick Message Modal (from Parents tab) ───────────────────
  const [quickMsgModal, setQuickMsgModal] = useState(null); // { parent, childId }
  const [quickMsgBody, setQuickMsgBody] = useState("");
  const [quickMsgSending, setQuickMsgSending] = useState(false);

  // ── Load data ────────────────────────────────────────────────
  useEffect(() => {
    dispatch(fetchParentMessages());
    dispatch(fetchMyStudents());
    dispatch(fetchMySections());
    dispatch(fetchMeetingRequests());
  }, [dispatch]);

  // ── Build parents list from students ─────────────────────────
  useEffect(() => {
    if (!students.length) return;
    const parentsMap = new Map();
    students.forEach((s) => {
      const rawIds = Array.isArray(s.parent_ids) && s.parent_ids.length
        ? s.parent_ids
        : s.parent_id ? [s.parent_id] : [];

      const addChild = (key, name, email, phone) => {
        if (!parentsMap.has(key)) {
          parentsMap.set(key, { id: key, name, email: email || "", phone: phone || "", children: [] });
        } else if (parentsMap.get(key).name === "Unknown Parent" && name !== "Unknown Parent") {
          Object.assign(parentsMap.get(key), { name, email: email || parentsMap.get(key).email, phone: phone || parentsMap.get(key).phone });
        }
        parentsMap.get(key).children.push({ id: s._id || s.id, name: s.name, class: s.class_name, roll_no: s.roll_no });
      };

      if (rawIds.length === 0) {
        addChild(`no-parent-${s._id || s.id}`, s.parent_name || "Unknown Parent", s.parent_email, s.parent_phone);
      } else {
        rawIds.forEach((pid) => addChild(pid, s.parent_name || "Unknown Parent", s.parent_email, s.parent_phone));
      }
    });

    const list = Array.from(parentsMap.values());
    setParentsList(list);

    const missing = list.filter((p) => p.name === "Unknown Parent" && !p.id.startsWith("no-parent-"));
    missing.forEach((p) => {
      api.get(`/teacher/parent/${p.id}`)
        .then((res) => {
          const { parent } = res.data;
          if (parent?.name) {
            setParentsList((prev) =>
              prev.map((x) => x.id === p.id
                ? { ...x, name: parent.name, email: parent.email || x.email, phone: parent.phone || x.phone }
                : x
              )
            );
          }
        })
        .catch(() => {});
    });
  }, [students]);

  // ── Sync API meetings ────────────────────────────────────────
  useEffect(() => {
    if (!apiMeetings.length) return;
    const mapped = apiMeetings.map((m) => ({
      id: m._id || m.id,
      studentName: m.student_name || m.child_name || "Student",
      studentClass: m.student_class || "",
      rollNo: m.roll_no || "",
      reason: m.reason || "",
      urgency: m.urgency || "normal",
      status: m.status || "pending_response",
      confirmedTime: m.confirmed_time || null,
      initiatedBy: m.initiated_by || "teacher",
      proposedTimes: (m.proposed_times || []).map((t, i) => ({
        id: `t${i}`,
        date: t.date || "",
        time: t.time || "",
        selected: i === 0,
      })),
      parentContact: {
        name: m.parent_name || "Parent",
        phone: m.parent_phone || "",
        email: m.parent_email || "",
      },
    }));
    setMeetingRequests(mapped);
    if (mapped.length > 0 && !selectedMeeting) setSelectedMeeting(mapped[0]);
  }, [apiMeetings]);

  // ── Filtering ────────────────────────────────────────────────
  const filteredParents = useMemo(() => {
    let list = parentsList;
    if (classFilter) {
      list = list.filter((p) => p.children.some((c) => c.class === classFilter));
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter((p) =>
        p.name.toLowerCase().includes(q) ||
        p.email.toLowerCase().includes(q) ||
        p.children.some((c) => c.name.toLowerCase().includes(q))
      );
    }
    return list;
  }, [parentsList, classFilter, searchQuery]);

  const filteredMeetings = useMemo(() => {
    let list = meetingRequests;
    if (classFilter) {
      list = list.filter((m) => m.studentClass === classFilter);
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter((m) =>
        m.studentName.toLowerCase().includes(q) ||
        m.parentContact.name.toLowerCase().includes(q) ||
        m.reason.toLowerCase().includes(q)
      );
    }
    return list;
  }, [meetingRequests, classFilter, searchQuery]);

  // ── Toast ────────────────────────────────────────────────────
  function showToast(msg, type = "success") {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  }

  // ── Quick Message Modal ──────────────────────────────────────
  const handleQuickMsgSend = async () => {
    if (!quickMsgModal || !quickMsgBody.trim()) return;
    setQuickMsgSending(true);
    try {
      await dispatch(sendParentMessage({ studentId: quickMsgModal.childId, message: quickMsgBody })).unwrap();
      showToast("Message sent to parent successfully");
      setQuickMsgModal(null);
      setQuickMsgBody("");
      dispatch(fetchParentMessages());
    } catch { showToast("Failed to send message", "error"); }
    finally { setQuickMsgSending(false); }
  };

  // ── Meeting Requests ─────────────────────────────────────────
  const selectTime = (reqId, timeId) => {
    setMeetingRequests((prev) =>
      prev.map((r) =>
        r.id === reqId
          ? { ...r, proposedTimes: r.proposedTimes.map((t) => ({ ...t, selected: t.id === timeId })) }
          : r
      )
    );
    if (selectedMeeting?.id === reqId) {
      setSelectedMeeting((prev) => ({
        ...prev,
        proposedTimes: prev.proposedTimes.map((t) => ({ ...t, selected: t.id === timeId })),
      }));
    }
  };

  const handleConfirmMeeting = async (req) => {
    const chosen = req.proposedTimes.find((t) => t.selected);
    if (!chosen) { showToast("Please select a time slot first", "error"); return; }
    setConfirmingId(req.id);
    try {
      const timeIndex = req.proposedTimes.findIndex((t) => t.selected);
      await dispatch(confirmMeetingRequest({ reqId: req.id, timeIndex })).unwrap();
      showToast(`Meeting confirmed with ${req.parentContact.name} on ${chosen.date} at ${chosen.time}`);
      dispatch(fetchMeetingRequests());
    } catch {
      showToast("Failed to confirm meeting", "error");
    } finally {
      setConfirmingId(null);
    }
  };

  const handleCallParent = (phone) => {
    if (phone) window.open(`tel:${phone.replace(/\s/g, "")}`, "_self");
  };

  // ── New Meeting Request ──────────────────────────────────────
  const handleAddTimeSlot = () => setNmTimes((prev) => [...prev, { date: "", time: "" }]);
  const handleTimeChange = (i, field, val) =>
    setNmTimes((prev) => prev.map((t, idx) => (idx === i ? { ...t, [field]: val } : t)));

  const handleSubmitNewMeeting = async () => {
    if (!nmStudent || !nmReason.trim() || nmTimes.some((t) => !t.date || !t.time)) {
      showToast("Please fill in all fields and time slots", "error");
      return;
    }
    setNmSubmitting(true);
    try {
      await dispatch(createMeetingRequest({
        student_id: nmStudent,
        reason: nmReason,
        proposed_times: nmTimes,
        urgency: nmUrgency,
      })).unwrap();
      showToast("Meeting request sent to parent");
      setNewMeetingModal(false);
      setNmStudent(""); setNmReason(""); setNmUrgency("normal"); setNmTimes([{ date: "", time: "" }]); setNmParentChildren(null);
      dispatch(fetchMeetingRequests());
    } catch {
      showToast("Failed to send meeting request", "error");
    } finally {
      setNmSubmitting(false);
    }
  };

  const unreadCount = apiMessages.filter((m) => m.direction === "parent_to_teacher" && !m.read).length;
  const pendingCount = meetingRequests.filter((r) => r.status === "pending_response").length;

  // ── Thread reply ─────────────────────────────────────────────
  const handleReply = async (studentId) => {
    if (!replyBody.trim()) return;
    setReplying(true);
    try {
      await dispatch(sendParentMessage({ studentId, message: replyBody })).unwrap();
      setReplyBody("");
      showToast("Reply sent");
      dispatch(fetchParentMessages());
    } catch { showToast("Failed to send reply", "error"); }
    finally { setReplying(false); }
  };

  // ── New Message send ─────────────────────────────────────────
  const handleNewMsgSend = async () => {
    if (!newMsgStudent || !newMsgBody.trim()) return;
    setNewMsgSending(true);
    try {
      await dispatch(sendParentMessage({ studentId: newMsgStudent, message: newMsgBody })).unwrap();
      showToast("Message sent to parent successfully");
      await dispatch(fetchParentMessages());
      // Open the thread for this student
      const studentId = newMsgStudent;
      setNewMsgModal(false);
      setNewMsgStudent("");
      setNewMsgBody("");
      // Find the thread key for this student after refresh
      // We'll set selectedThread after messages reload via effect
      setSelectedThread((prev) => {
        // Try to find existing thread key for this student
        const match = apiMessages.find((m) => m.student_id === studentId);
        if (match) return `${match.parent_id || "unknown"}__${studentId}`;
        return prev;
      });
    } catch { showToast("Failed to send message", "error"); }
    finally { setNewMsgSending(false); }
  };

  // ── Auto-scroll chat to bottom ───────────────────────────────
  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [selectedThread, apiMessages.length]);

  // ── Group messages into threads by student_id ────────────────
  // Key by student_id only — one thread per student regardless of parent_id presence
  const threads = useMemo(() => {
    const map = new Map();
    apiMessages.forEach((m) => {
      const key = m.student_id || "unknown";
      if (!map.has(key)) {
        map.set(key, {
          key,
          parentId: m.parent_id || null,
          studentId: m.student_id || "unknown",
          studentName: m.student_name || "Student",
          messages: [],
          unread: 0,
          lastAt: "",
        });
      }
      const t = map.get(key);
      // Keep the most recent parent_id we've seen for this student
      if (m.parent_id && !t.parentId) t.parentId = m.parent_id;
      t.messages.push(m);
      if (m.direction === "parent_to_teacher" && !m.read) t.unread++;
      if ((m.sent_at || "") > t.lastAt) t.lastAt = m.sent_at || "";
    });
    map.forEach((t) => t.messages.sort((a, b) => (a.sent_at || "").localeCompare(b.sent_at || "")));
    return Array.from(map.values()).sort((a, b) => {
      if (b.unread !== a.unread) return b.unread - a.unread;
      return b.lastAt.localeCompare(a.lastAt);
    });
  }, [apiMessages]);

  return (
    <div className="bg-[#faf9ff] min-h-screen" style={{ fontFamily: "'Lexend', sans-serif" }}>

      {/* Toast */}
      {toast && (
        <div className={`fixed top-4 left-1/2 -translate-x-1/2 z-[100] flex items-center gap-2 px-5 py-3 rounded-xl shadow-lg text-sm font-semibold ${
          toast.type === "error" ? "bg-red-600 text-white" : "bg-green-600 text-white"
        }`}>
          <span className="material-symbols-outlined text-base">{toast.type === "error" ? "error" : "check_circle"}</span>
          {toast.msg}
        </div>
      )}

      {/* New Message Modal */}
      {newMsgModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/50"
          onClick={(e) => { if (e.target === e.currentTarget) { setNewMsgModal(false); setNewMsgStudent(""); setNewMsgBody(""); } }}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
            <div className="flex items-center justify-between px-6 py-5 border-b border-gray-100">
              <div className="flex items-center gap-3">
                <div className="size-9 rounded-xl bg-[#695be6]/10 flex items-center justify-center">
                  <span className="material-symbols-outlined text-[#695be6] text-lg">forum</span>
                </div>
                <div>
                  <h3 className="font-black text-base">New Message</h3>
                  <p className="text-xs text-gray-400">Send a message to a parent</p>
                </div>
              </div>
              <button onClick={() => { setNewMsgModal(false); setNewMsgStudent(""); setNewMsgBody(""); }}
                className="size-8 rounded-lg hover:bg-gray-100 flex items-center justify-center">
                <span className="material-symbols-outlined text-gray-400 text-lg">close</span>
              </button>
            </div>
            <div className="px-6 py-5 space-y-4">
              <div>
                <label className="text-xs font-bold text-gray-500 mb-1.5 block uppercase tracking-wide">Student</label>
                <select value={newMsgStudent} onChange={(e) => setNewMsgStudent(e.target.value)}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-[#695be6] bg-white">
                  <option value="">— Select student —</option>
                  {(classFilter
                    ? students.filter((s) => s.class_name === classFilter)
                    : students
                  ).map((s) => (
                    <option key={s._id || s.id} value={s._id || s.id}>{s.name} ({s.class_name})</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs font-bold text-gray-500 mb-1.5 block uppercase tracking-wide">Message</label>
                <textarea value={newMsgBody} onChange={(e) => setNewMsgBody(e.target.value)}
                  placeholder="Type your message to the parent..."
                  className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-[#695be6] resize-none h-28" />
              </div>
            </div>
            <div className="flex gap-3 px-6 py-4 border-t border-gray-100 bg-gray-50/50">
              <button onClick={() => { setNewMsgModal(false); setNewMsgStudent(""); setNewMsgBody(""); }}
                className="flex-1 border border-gray-200 text-sm font-bold py-2.5 rounded-xl hover:bg-gray-100 bg-white">Cancel</button>
              <button onClick={handleNewMsgSend} disabled={newMsgSending || !newMsgStudent || !newMsgBody.trim()}
                className="flex-1 bg-[#695be6] text-white text-sm font-bold py-2.5 rounded-xl hover:bg-[#5a4dd4] flex items-center justify-center gap-2 disabled:opacity-70">
                {newMsgSending
                  ? <><span className="size-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />Sending...</>
                  : <><span className="material-symbols-outlined text-base">send</span>Send</>}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* New Meeting Modal */}
      {newMeetingModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/50"
          onClick={(e) => { if (e.target === e.currentTarget) { setNewMeetingModal(false); setNmParentChildren(null); } }}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md flex flex-col" style={{ maxHeight: "calc(100vh - 48px)" }}>
            <div className="flex items-center justify-between px-6 py-5 border-b border-gray-100">
              <div className="flex items-center gap-3">
                <div className="size-9 rounded-xl bg-[#695be6]/10 flex items-center justify-center">
                  <span className="material-symbols-outlined text-[#695be6] text-lg">calendar_month</span>
                </div>
                <div>
                  <h3 className="font-black text-base">Request Parent Meeting</h3>
                  <p className="text-xs text-gray-400">Send proposed time slots to a parent</p>
                </div>
              </div>
              <button onClick={() => { setNewMeetingModal(false); setNmParentChildren(null); }} className="size-8 rounded-lg hover:bg-gray-100 flex items-center justify-center">
                <span className="material-symbols-outlined text-gray-400 text-lg">close</span>
              </button>
            </div>
            <div className="overflow-y-auto px-6 py-5 space-y-4">
              <div>
                <label className="text-xs font-bold text-gray-500 mb-1.5 block uppercase tracking-wide">Student</label>
                <select value={nmStudent} onChange={(e) => setNmStudent(e.target.value)}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-[#695be6] bg-white">
                  <option value="">— Select student —</option>
                  {(nmParentChildren
                    ? students.filter((s) => nmParentChildren.includes(s._id || s.id))
                    : students
                  ).map((s) => (
                    <option key={s._id || s.id} value={s._id || s.id}>{s.name} ({s.class_name})</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs font-bold text-gray-500 mb-1.5 block uppercase tracking-wide">Reason</label>
                <textarea value={nmReason} onChange={(e) => setNmReason(e.target.value)}
                  placeholder="e.g. Academic performance drop, attendance concern..."
                  className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-[#695be6] resize-none h-20" />
              </div>
              <div>
                <label className="text-xs font-bold text-gray-500 mb-1.5 block uppercase tracking-wide">Urgency</label>
                <div className="flex gap-2">
                  {[{ val: "normal", label: "Normal", icon: "schedule" }, { val: "urgent", label: "Urgent", icon: "priority_high" }].map(({ val, label, icon }) => (
                    <button key={val} onClick={() => setNmUrgency(val)}
                      className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-bold border-2 transition-all ${
                        nmUrgency === val
                          ? val === "urgent" ? "border-red-400 bg-red-50 text-red-600" : "border-[#695be6] bg-[#695be6]/5 text-[#695be6]"
                          : "border-gray-200 text-gray-400 hover:border-gray-300"
                      }`}>
                      <span className="material-symbols-outlined text-base">{icon}</span>{label}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="text-xs font-bold text-gray-500 mb-1.5 block uppercase tracking-wide">Proposed Time Slots</label>
                <div className="space-y-2">
                  {nmTimes.map((t, i) => (
                    <div key={i} className="flex items-center gap-2 bg-gray-50 rounded-xl px-3 py-2.5">
                      <span className="material-symbols-outlined text-gray-400 text-base flex-shrink-0">event</span>
                      <input type="date" value={t.date} onChange={(e) => handleTimeChange(i, "date", e.target.value)}
                        className="flex-1 bg-transparent text-sm outline-none text-gray-700 min-w-0" />
                      <span className="text-gray-300">|</span>
                      <input type="time" value={t.time} onChange={(e) => handleTimeChange(i, "time", e.target.value)}
                        className="bg-transparent text-sm outline-none text-gray-700 w-24" />
                    </div>
                  ))}
                </div>
                <button onClick={handleAddTimeSlot} className="mt-2 text-xs text-[#695be6] font-bold flex items-center gap-1 hover:underline">
                  <span className="material-symbols-outlined text-sm">add_circle</span> Add another time slot
                </button>
              </div>
            </div>
            <div className="flex gap-3 px-6 py-4 border-t border-gray-100 bg-gray-50/50">
              <button onClick={() => { setNewMeetingModal(false); setNmParentChildren(null); }}
                className="flex-1 border border-gray-200 text-sm font-bold py-2.5 rounded-xl hover:bg-gray-100 bg-white">Cancel</button>
              <button onClick={handleSubmitNewMeeting} disabled={nmSubmitting}
                className="flex-1 bg-[#695be6] text-white text-sm font-bold py-2.5 rounded-xl hover:bg-[#5a4dd4] flex items-center justify-center gap-2 disabled:opacity-70">
                {nmSubmitting
                  ? <><span className="size-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />Sending...</>
                  : <><span className="material-symbols-outlined text-base">send</span>Send Request</>}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Quick Message Modal */}
      {quickMsgModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/50"
          onClick={(e) => { if (e.target === e.currentTarget) { setQuickMsgModal(null); setQuickMsgBody(""); } }}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
            <div className="flex items-center justify-between px-6 py-5 border-b border-gray-100">
              <div className="flex items-center gap-3">
                <div className="size-9 rounded-xl bg-[#695be6]/10 flex items-center justify-center">
                  <span className="material-symbols-outlined text-[#695be6] text-lg">chat</span>
                </div>
                <div>
                  <h3 className="font-black text-base">Message Parent</h3>
                  <p className="text-xs text-gray-400">{quickMsgModal.parent.name}</p>
                </div>
              </div>
              <button onClick={() => { setQuickMsgModal(null); setQuickMsgBody(""); }}
                className="size-8 rounded-lg hover:bg-gray-100 flex items-center justify-center">
                <span className="material-symbols-outlined text-gray-400 text-lg">close</span>
              </button>
            </div>
            <div className="px-6 py-5 space-y-4">
              <div>
                <label className="text-xs font-bold text-gray-500 mb-1.5 block uppercase tracking-wide">Regarding Child</label>
                <select value={quickMsgModal.childId}
                  onChange={(e) => setQuickMsgModal((prev) => ({ ...prev, childId: e.target.value }))}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-[#695be6] bg-white">
                  {quickMsgModal.parent.children.map((c) => (
                    <option key={c.id} value={c.id}>{c.name} · {c.class}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs font-bold text-gray-500 mb-1.5 block uppercase tracking-wide">Message</label>
                <textarea value={quickMsgBody} onChange={(e) => setQuickMsgBody(e.target.value)}
                  placeholder="Type your message to the parent..."
                  className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-[#695be6] resize-none h-28" />
              </div>
            </div>
            <div className="flex gap-3 px-6 py-4 border-t border-gray-100 bg-gray-50/50">
              <button onClick={() => { setQuickMsgModal(null); setQuickMsgBody(""); }}
                className="flex-1 border border-gray-200 text-sm font-bold py-2.5 rounded-xl hover:bg-gray-100 bg-white">Cancel</button>
              <button onClick={handleQuickMsgSend} disabled={quickMsgSending || !quickMsgBody.trim()}
                className="flex-1 bg-[#695be6] text-white text-sm font-bold py-2.5 rounded-xl hover:bg-[#5a4dd4] flex items-center justify-center gap-2 disabled:opacity-70">
                {quickMsgSending
                  ? <><span className="size-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />Sending...</>
                  : <><span className="material-symbols-outlined text-base">send</span>Send</>}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-white border-b border-gray-200">
        <div className="max-w-[1200px] mx-auto px-6 h-14 flex items-center gap-3">
          <button onClick={() => navigate("/teacher")} className="p-2 hover:bg-gray-100 rounded-lg">
            <span className="material-symbols-outlined text-gray-500">arrow_back</span>
          </button>
          <div className="size-7 bg-[#695be6] rounded-lg flex items-center justify-center text-white">
            <span className="material-symbols-outlined text-sm">groups</span>
          </div>
          <h1 className="font-black text-base">Parent Communication</h1>

          {/* Section filter */}
          <select value={classFilter} onChange={(e) => { setClassFilter(e.target.value); setSearchQuery(""); }}
            className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm bg-white outline-none ml-2">
            <option value="">All Sections</option>
            {mySections.map((sec) => (
              <option key={sec._id || sec.class_name} value={sec.class_name}>{sec.class_name}</option>
            ))}
          </select>

          <SearchBar value={searchQuery} onChange={setSearchQuery}
            placeholder="Search parents or students" width="max-w-sm ml-1" />

          <div className="ml-auto flex items-center gap-3">
            {unreadCount > 0 && (
              <span className="bg-red-500 text-white text-xs font-bold px-3 py-1 rounded-full">{unreadCount} UNREAD</span>
            )}
            {pendingCount > 0 && (
              <span className="bg-orange-100 text-orange-600 text-xs font-bold px-3 py-1 rounded-full">{pendingCount} PENDING</span>
            )}
            <div className="size-9 rounded-full bg-[#695be6] flex items-center justify-center text-white font-bold text-sm">
              {getInitial(user?.name) || "T"}
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-[1200px] mx-auto pt-20 px-6 pb-12">
        {/* Tabs */}
        <div className="flex gap-1 border-b border-gray-200 mb-6">
          {TABS.map((tab, i) => (
            <button key={tab} onClick={() => { setActiveTab(i); setSearchQuery(""); }}
              className={`flex items-center gap-1.5 px-4 py-3 text-sm font-semibold border-b-2 transition-colors ${
                activeTab === i ? "border-[#695be6] text-[#695be6]" : "border-transparent text-gray-500 hover:text-gray-700"
              }`}>
              <span className="material-symbols-outlined text-base">
                {i === 0 ? "family_restroom" : i === 1 ? "calendar_month" : "forum"}
              </span>
              {tab}
              {i === 1 && pendingCount > 0 && (
                <span className="ml-1 bg-orange-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">{pendingCount}</span>
              )}
              {i === 2 && unreadCount > 0 && (
                <span className="ml-1 bg-[#695be6] text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">{unreadCount}</span>
              )}
            </button>
          ))}
        </div>

        {/* ── Tab 0: Parents List ── */}
        {activeTab === 0 && (
          <div className="flex gap-6">
            {/* Parents list */}
            <div className="flex-1">
              <div className="flex items-center justify-between mb-4">
                <p className="text-sm text-gray-500">{filteredParents.length} parent{filteredParents.length !== 1 ? "s" : ""} found</p>
              </div>
              {filteredParents.length === 0 ? (
                <div className="bg-white rounded-xl border border-gray-100 p-12 text-center text-gray-400">
                  <span className="material-symbols-outlined text-4xl mb-2 block">family_restroom</span>
                  <p className="text-sm">No parents found</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {filteredParents.map((parent) => (
                    <div key={parent.id}
                      onClick={() => setSelectedParent(parent)}
                      className={`bg-white rounded-xl border shadow-sm p-4 cursor-pointer transition-all ${
                        selectedParent?.id === parent.id ? "border-[#695be6]" : "border-gray-100 hover:border-gray-200"
                      }`}>
                      <div className="flex items-center gap-4">
                        <Avatar name={parent.name} size="size-12" />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-0.5">
                            <p className="font-black text-sm">{parent.name}</p>
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-purple-50 text-purple-600">
                              {parent.children.length} child{parent.children.length !== 1 ? "ren" : ""}
                            </span>
                          </div>
                          <div className="flex items-center gap-3 text-xs text-gray-400">
                            {parent.email && <span className="flex items-center gap-1"><span className="material-symbols-outlined text-xs">mail</span>{parent.email}</span>}
                            {parent.phone && <span className="flex items-center gap-1"><span className="material-symbols-outlined text-xs">phone</span>{parent.phone}</span>}
                          </div>
                          <div className="flex flex-wrap gap-1.5 mt-2">
                            {parent.children.map((c) => (
                              <span key={c.id} className="text-[10px] font-semibold bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">
                                {c.name} · {c.class}
                              </span>
                            ))}
                          </div>
                        </div>
                        <div className="flex gap-2 flex-shrink-0">
                          <button onClick={(e) => { e.stopPropagation(); handleCallParent(parent.phone); }}
                            disabled={!parent.phone}
                            className="size-9 rounded-xl bg-gray-100 hover:bg-gray-200 flex items-center justify-center disabled:opacity-40 transition-colors">
                            <span className="material-symbols-outlined text-gray-600 text-base">phone</span>
                          </button>
                          <button onClick={(e) => {
                            e.stopPropagation();
                            const child = parent.children[0];
                            if (child) {
                              setQuickMsgModal({ parent, childId: child.id });
                              setQuickMsgBody("");
                            }
                          }}
                            className="size-9 rounded-xl bg-[#695be6]/10 hover:bg-[#695be6]/20 flex items-center justify-center transition-colors">
                            <span className="material-symbols-outlined text-[#695be6] text-base">chat</span>
                          </button>
                          <button onClick={(e) => {
                            e.stopPropagation();
                            const child = parent.children[0];
                            if (child) {
                              setNmParentChildren(parent.children.map((c) => c.id));
                              setNmStudent(child.id);
                              setNewMeetingModal(true);
                            }
                          }}
                            className="size-9 rounded-xl bg-green-50 hover:bg-green-100 flex items-center justify-center transition-colors">
                            <span className="material-symbols-outlined text-green-600 text-base">calendar_month</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Parent detail sidebar */}
            {selectedParent && (
              <div className="w-64 flex-shrink-0">
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 sticky top-20">
                  <div className="flex items-center gap-3 mb-4">
                    <Avatar name={selectedParent.name} size="size-12" />
                    <div>
                      <p className="font-black text-sm">{selectedParent.name}</p>
                      <p className="text-xs text-gray-400">Parent</p>
                    </div>
                  </div>
                  <div className="space-y-2 mb-4 pb-4 border-b border-gray-100">
                    {selectedParent.phone && (
                      <div className="flex items-center gap-2">
                        <span className="material-symbols-outlined text-gray-400 text-sm">phone</span>
                        <p className="text-sm">{selectedParent.phone}</p>
                      </div>
                    )}
                    {selectedParent.email && (
                      <div className="flex items-center gap-2">
                        <span className="material-symbols-outlined text-gray-400 text-sm">mail</span>
                        <p className="text-xs text-gray-600 break-all">{selectedParent.email}</p>
                      </div>
                    )}
                  </div>
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wide mb-3">Children</p>
                  <div className="space-y-2 mb-4">
                    {selectedParent.children.map((child) => (
                      <div key={child.id} className="flex items-center gap-2 p-2 bg-gray-50 rounded-lg">
                        <Avatar name={child.name} size="size-8" bg="bg-[#695be6]/10" text="text-[#695be6] text-xs" />
                        <div>
                          <p className="text-sm font-bold">{child.name}</p>
                          <p className="text-xs text-gray-400">{child.class}{child.roll_no ? ` · Roll #${child.roll_no}` : ""}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                  <button onClick={() => handleCallParent(selectedParent.phone)} disabled={!selectedParent.phone}
                    className="w-full flex items-center justify-center gap-2 bg-gray-900 text-white font-bold py-2.5 rounded-xl hover:bg-gray-800 transition-colors mb-2 disabled:opacity-50 text-sm">
                    <span className="material-symbols-outlined text-base">phone</span>
                    Call {selectedParent.name?.split(" ")[0]}
                  </button>
                  <button onClick={() => {
                    const child = selectedParent.children[0];
                    if (child) {
                      setQuickMsgModal({ parent: selectedParent, childId: child.id });
                      setQuickMsgBody("");
                    }
                  }}
                    className="w-full flex items-center justify-center gap-2 bg-[#695be6]/10 text-[#695be6] font-bold py-2.5 rounded-xl hover:bg-[#695be6]/20 transition-colors text-sm">
                    <span className="material-symbols-outlined text-base">chat</span>
                    Send Message
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── Tab 1: Meeting Requests ── */}
        {activeTab === 1 && (
          <div className="flex gap-6">
            <div className="flex-1">
              {(() => {
                const confirmed = meetingRequests.filter((r) => r.status === "confirmed");
                const past = meetingRequests.filter((r) => r.status === "completed");
                return (
                  <div className="grid grid-cols-3 gap-4 mb-6">
                    <div className="bg-white rounded-xl border border-gray-100 p-4">
                      <p className="text-xs text-gray-400 mb-1">Pending Response</p>
                      <p className="font-black text-2xl text-orange-500">{pendingCount}</p>
                    </div>
                    <div className="bg-white rounded-xl border border-gray-100 p-4">
                      <p className="text-xs text-gray-400 mb-1">Scheduled Meetings</p>
                      <p className="font-black text-2xl text-green-600">{confirmed.length}</p>
                    </div>
                    <div className="bg-white rounded-xl border border-gray-100 p-4">
                      <p className="text-xs text-gray-400 mb-1">Past Meetings</p>
                      <p className="font-black text-2xl text-blue-600">{past.length}</p>
                    </div>
                  </div>
                );
              })()}

              <button onClick={() => setNewMeetingModal(true)}
                className="w-full border-2 border-dashed border-[#695be6]/40 rounded-xl py-6 flex items-center justify-center gap-2 hover:bg-[#695be6]/5 transition-colors mb-6">
                <div className="size-8 rounded-full bg-[#695be6]/10 flex items-center justify-center">
                  <span className="material-symbols-outlined text-[#695be6] text-base">add</span>
                </div>
                <p className="text-[#695be6] font-bold text-sm">Request New Parent Meeting</p>
              </button>

              {filteredMeetings.length === 0 ? (
                <div className="bg-white rounded-xl border border-gray-100 p-12 text-center text-gray-400">
                  <span className="material-symbols-outlined text-4xl mb-2 block">calendar_month</span>
                  <p className="text-sm">No meeting requests yet</p>
                </div>
              ) : (
                filteredMeetings.map((req) => (
                  <div key={req.id} onClick={() => setSelectedMeeting(req)}
                    className={`bg-white rounded-xl border shadow-sm p-5 mb-4 cursor-pointer transition-all ${
                      selectedMeeting?.id === req.id ? "border-[#695be6]" : "border-gray-100 hover:border-gray-200"
                    }`}>
                    <div className="flex items-start gap-4">
                      <Avatar name={req.studentName} size="size-12" bg="bg-gray-100" text="text-gray-500 font-bold" />
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                          <p className="font-black text-sm">{req.studentName} {req.studentClass && `(${req.studentClass})`}</p>
                          <StatusBadge status={req.status} />
                          {req.urgency === "urgent" && (
                            <span className="flex items-center gap-1 text-[10px] font-bold text-red-500 bg-red-50 px-2 py-0.5 rounded-full">
                              <span className="size-1.5 rounded-full bg-red-500 inline-block" /> URGENT
                            </span>
                          )}
                          {req.initiatedBy === "parent" && (
                            <span className="text-[10px] font-bold text-blue-500 bg-blue-50 px-2 py-0.5 rounded-full">Parent-initiated</span>
                          )}
                        </div>
                        <p className="text-xs text-gray-500 mb-1">
                          <span className="font-semibold text-gray-700">{req.parentContact.name}</span>
                          {req.parentContact.phone && <span className="ml-2 text-gray-400">{req.parentContact.phone}</span>}
                        </p>
                        <p className="text-sm text-gray-500 mb-3">{req.reason}</p>

                        {req.status === "confirmed" && req.confirmedTime ? (
                          <div className="flex items-center gap-2 bg-green-50 border border-green-200 text-green-700 text-sm font-bold px-4 py-2 rounded-xl w-fit">
                            <span className="material-symbols-outlined text-base">check_circle</span>
                            Confirmed — {req.confirmedTime.date} at {req.confirmedTime.time}
                          </div>
                        ) : req.status === "completed" ? (
                          <div className="flex items-center gap-2 bg-blue-50 border border-blue-200 text-blue-700 text-sm font-bold px-4 py-2 rounded-xl w-fit">
                            <span className="material-symbols-outlined text-base">task_alt</span>
                            Meeting Completed
                          </div>
                        ) : (
                          <>
                            <p className="text-[10px] font-bold text-gray-400 uppercase mb-2">Proposed Times</p>
                            <div className="flex gap-2 flex-wrap mb-3">
                              {req.proposedTimes.map((t) => (
                                <button key={t.id}
                                  onClick={(e) => { e.stopPropagation(); selectTime(req.id, t.id); }}
                                  className={`flex items-center gap-2 px-3 py-2 rounded-xl border-2 text-sm transition-all ${
                                    t.selected ? "border-[#695be6] bg-[#695be6]/5 text-[#695be6]" : "border-gray-200 hover:border-gray-300"
                                  }`}>
                                  <div className={`size-4 rounded-full border-2 flex items-center justify-center ${t.selected ? "border-[#695be6]" : "border-gray-300"}`}>
                                    {t.selected && <div className="size-2 rounded-full bg-[#695be6]" />}
                                  </div>
                                  <div className="text-left">
                                    <p className="font-bold text-xs">{t.date}</p>
                                    <p className="text-[10px] text-gray-400">{t.time}</p>
                                  </div>
                                </button>
                              ))}
                            </div>
                            <div className="flex gap-2">
                              <button onClick={(e) => { e.stopPropagation(); handleCallParent(req.parentContact.phone); }}
                                disabled={!req.parentContact.phone}
                                className="border border-gray-200 text-sm font-bold px-4 py-2 rounded-xl hover:bg-gray-50 flex items-center gap-1.5 disabled:opacity-40">
                                <span className="material-symbols-outlined text-base">phone</span> Call
                              </button>
                              <button onClick={(e) => { e.stopPropagation(); handleConfirmMeeting(req); }}
                                disabled={confirmingId === req.id}
                                className="flex items-center gap-2 bg-[#695be6] text-white text-sm font-bold px-4 py-2 rounded-xl hover:bg-[#5a4dd4] disabled:opacity-70">
                                {confirmingId === req.id
                                  ? <><span className="size-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />Confirming...</>
                                  : <><span className="material-symbols-outlined text-base">check_circle</span>Confirm</>}
                              </button>
                            </div>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Meeting detail sidebar */}
            {selectedMeeting && (
              <div className="w-64 flex-shrink-0">
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 sticky top-20">
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wide mb-3">Parent Contact</p>
                  <div className="flex items-center gap-3 mb-4">
                    <Avatar name={selectedMeeting.parentContact.name} size="size-12" />
                    <div>
                      <p className="font-black text-sm">{selectedMeeting.parentContact.name}</p>
                      <p className="text-xs text-gray-400">Parent of {selectedMeeting.studentName}</p>
                    </div>
                  </div>
                  <div className="space-y-2 mb-4 pb-4 border-b border-gray-100">
                    {selectedMeeting.parentContact.phone && (
                      <div className="flex items-center gap-2">
                        <span className="material-symbols-outlined text-gray-400 text-sm">phone</span>
                        <p className="text-sm">{selectedMeeting.parentContact.phone}</p>
                      </div>
                    )}
                    {selectedMeeting.parentContact.email && (
                      <div className="flex items-center gap-2">
                        <span className="material-symbols-outlined text-gray-400 text-sm">mail</span>
                        <p className="text-xs text-gray-600 break-all">{selectedMeeting.parentContact.email}</p>
                      </div>
                    )}
                  </div>
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wide mb-2">Meeting Status</p>
                  <div className="mb-4"><StatusBadge status={selectedMeeting.status} /></div>
                  {selectedMeeting.confirmedTime && (
                    <div className="bg-green-50 rounded-xl p-3 mb-4 text-sm text-green-700 font-semibold">
                      <span className="material-symbols-outlined text-base align-middle mr-1">event_available</span>
                      {selectedMeeting.confirmedTime.date} at {selectedMeeting.confirmedTime.time}
                    </div>
                  )}
                  <button onClick={() => handleCallParent(selectedMeeting.parentContact.phone)}
                    disabled={!selectedMeeting.parentContact.phone}
                    className="w-full flex items-center justify-center gap-2 bg-gray-900 text-white font-bold py-2.5 rounded-xl hover:bg-gray-800 transition-colors mb-2 disabled:opacity-50 text-sm">
                    <span className="material-symbols-outlined text-base">phone</span>
                    Call {selectedMeeting.parentContact.name?.split(" ")[0]}
                  </button>
                  <button onClick={() => {
                    const match = students.find((s) => s.name === selectedMeeting.studentName);
                    if (match) {
                      setActiveTab(2);
                      setNewMsgStudent(match._id || match.id);
                      setNewMsgModal(true);
                    }
                  }}
                    className="w-full flex items-center justify-center gap-2 bg-[#695be6]/10 text-[#695be6] font-bold py-2.5 rounded-xl hover:bg-[#695be6]/20 transition-colors text-sm">
                    <span className="material-symbols-outlined text-base">chat</span>
                    Send Message
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── Tab 2: Messages (Chat) ── */}
        {activeTab === 2 && (
          <div className="flex gap-0 bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden" style={{ height: "calc(100vh - 200px)", minHeight: "500px" }}>

            {/* Thread list */}
            <div className={`${selectedThread ? "hidden md:flex" : "flex"} flex-col w-full md:w-72 md:flex-shrink-0 border-r border-gray-100`}>
              <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
                <p className="text-xs font-bold text-gray-400 uppercase tracking-wide">Conversations</p>
                <button
                  onClick={() => { setNewMsgStudent(""); setNewMsgBody(""); setNewMsgModal(true); }}
                  className="flex items-center gap-1 text-xs font-bold text-[#695be6] hover:underline">
                  <span className="material-symbols-outlined text-sm">add</span> New Message
                </button>
              </div>

              {threads.length === 0 ? (
                <div className="flex-1 flex flex-col items-center justify-center text-gray-400 p-8 text-center">
                  <span className="material-symbols-outlined text-4xl mb-2">chat_bubble_outline</span>
                  <p className="text-sm">No messages yet</p>
                  <p className="text-xs mt-1">Messages from parents will appear here</p>
                  <button
                    onClick={() => { setNewMsgStudent(""); setNewMsgBody(""); setNewMsgModal(true); }}
                    className="mt-4 bg-[#695be6] text-white text-sm font-bold px-4 py-2 rounded-xl hover:bg-[#5a4dd4]">
                    New Message
                  </button>
                </div>
              ) : (
                <div className="overflow-y-auto flex-1 divide-y divide-gray-50">
                  {threads.map((t) => (
                    <button key={t.key}
                      onClick={() => {
                        setSelectedThread(t.key);
                        t.messages.forEach((m) => {
                          if (m.direction === "parent_to_teacher" && !m.read) {
                            dispatch(markParentMessageRead(m._id || m.id));
                          }
                        });
                      }}
                      className={`w-full flex items-center gap-3 px-4 py-3.5 text-left hover:bg-gray-50 transition-colors ${
                        selectedThread === t.key ? "bg-[#695be6]/5 border-r-2 border-[#695be6]" : ""
                      }`}>
                      <div className="relative">
                        <Avatar name={t.studentName} size="size-11" />
                        {t.unread > 0 && (
                          <span className="absolute -top-1 -right-1 size-4 bg-[#695be6] rounded-full text-[9px] font-bold text-white flex items-center justify-center">
                            {t.unread}
                          </span>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-0.5">
                          <p className={`text-sm truncate ${t.unread > 0 ? "font-black" : "font-semibold"}`}>{t.studentName}</p>
                          <p className="text-[10px] text-gray-400 shrink-0 ml-2">
                            {t.lastAt ? new Date(t.lastAt).toLocaleDateString([], { month: "short", day: "numeric" }) : ""}
                          </p>
                        </div>
                        <p className={`text-xs truncate ${t.unread > 0 ? "text-gray-700 font-medium" : "text-gray-400"}`}>
                          {t.messages[t.messages.length - 1]?.message || ""}
                        </p>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Chat pane */}
            <div className={`${selectedThread ? "flex" : "hidden md:flex"} flex-1 flex-col overflow-hidden`}>
              {!selectedThread ? (
                <div className="flex-1 flex flex-col items-center justify-center text-gray-400 p-8 text-center">
                  <span className="material-symbols-outlined text-5xl mb-3 text-gray-200">forum</span>
                  <p className="text-sm font-medium text-gray-500">Select a conversation</p>
                  <p className="text-xs text-gray-400 mt-1">or start a new one</p>
                  <button
                    onClick={() => { setNewMsgStudent(""); setNewMsgBody(""); setNewMsgModal(true); }}
                    className="mt-4 bg-[#695be6] text-white text-sm font-bold px-5 py-2.5 rounded-xl hover:bg-[#5a4dd4] flex items-center gap-2">
                    <span className="material-symbols-outlined text-base">edit</span> New Message
                  </button>
                </div>
              ) : (() => {
                const thread = threads.find((t) => t.key === selectedThread);
                if (!thread) return null;
                return (
                  <>
                    {/* Chat header */}
                    <div className="flex items-center gap-3 px-5 py-3.5 border-b border-gray-100 bg-white flex-shrink-0">
                      <button onClick={() => setSelectedThread(null)} className="size-8 rounded-lg hover:bg-gray-100 flex items-center justify-center md:hidden">
                        <span className="material-symbols-outlined text-gray-500 text-lg">arrow_back</span>
                      </button>
                      <Avatar name={thread.studentName} size="size-9" />
                      <div className="flex-1">
                        <p className="font-black text-sm">{thread.studentName}</p>
                        <p className="text-xs text-gray-400">Parent conversation · {thread.messages.length} message{thread.messages.length !== 1 ? "s" : ""}</p>
                      </div>
                    </div>

                    {/* Messages */}
                    <div className="flex-1 overflow-y-auto px-5 py-4 space-y-2 bg-[#faf9ff]">
                      {thread.messages.map((m, i) => {
                        const fromParent = m.direction === "parent_to_teacher";
                        const prev = thread.messages[i - 1];
                        const showDate = !prev || new Date(m.sent_at).toDateString() !== new Date(prev.sent_at).toDateString();
                        return (
                          <div key={m._id || m.id}>
                            {showDate && m.sent_at && (
                              <div className="flex items-center gap-3 my-3">
                                <div className="flex-1 h-px bg-gray-200" />
                                <span className="text-[10px] font-bold text-gray-400 uppercase">
                                  {new Date(m.sent_at).toLocaleDateString([], { weekday: "short", month: "short", day: "numeric" })}
                                </span>
                                <div className="flex-1 h-px bg-gray-200" />
                              </div>
                            )}
                            <div className={`flex items-end gap-2 ${fromParent ? "justify-start" : "justify-end"}`}>
                              {fromParent && (
                                <Avatar name={thread.studentName} size="size-7" bg="bg-gray-200" text="text-gray-600 text-xs" />
                              )}
                              <div className={`max-w-[75%] flex flex-col ${fromParent ? "" : "items-end"}`}>
                                <div className={`px-4 py-2.5 rounded-2xl text-sm leading-relaxed ${
                                  fromParent
                                    ? "bg-white text-gray-800 rounded-bl-sm shadow-sm border border-gray-100"
                                    : "bg-[#695be6] text-white rounded-br-sm"
                                }`}>
                                  {m.message}
                                </div>
                                <p className="text-[10px] text-gray-400 mt-1">
                                  {m.sent_at ? new Date(m.sent_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : ""}
                                </p>
                              </div>
                              {!fromParent && (
                                <Avatar name={user?.name || "T"} size="size-7" bg="bg-[#695be6]/20" text="text-[#695be6] text-xs" />
                              )}
                            </div>
                          </div>
                        );
                      })}
                      <div ref={chatBottomRef} />
                    </div>

                    {/* Reply input */}
                    <div className="bg-white border-t border-gray-100 px-4 pt-2 pb-3 flex-shrink-0">
                      {/* Template chips */}
                      <div className="flex gap-1.5 flex-wrap mb-2">
                        {messageComposerTemplates.map((t) => (
                          <button key={t.id}
                            onClick={() => setReplyBody(t.body.replace(/\[Student Name\]/g, thread.studentName))}
                            className="text-[10px] font-bold px-2.5 py-1 rounded-full border border-[#695be6]/30 text-[#695be6] bg-[#695be6]/5 hover:bg-[#695be6]/15 transition-colors whitespace-nowrap">
                            {t.label}
                          </button>
                        ))}
                      </div>
                      <div className="flex items-end gap-3">
                        <textarea
                          value={replyBody}
                          onChange={(e) => setReplyBody(e.target.value)}
                          onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleReply(thread.studentId); } }}
                          placeholder="Reply to parent… (Enter to send)"
                          rows={1}
                          className="flex-1 border border-gray-200 rounded-2xl px-4 py-2.5 text-sm outline-none focus:border-[#695be6] resize-none leading-relaxed"
                          style={{ maxHeight: "120px", overflowY: "auto" }}
                          onInput={(e) => { e.target.style.height = "auto"; e.target.style.height = e.target.scrollHeight + "px"; }}
                        />
                        <button
                          onClick={() => handleReply(thread.studentId)}
                          disabled={replying || !replyBody.trim()}
                          className="size-10 bg-[#695be6] text-white rounded-2xl hover:bg-[#5a4dd4] flex items-center justify-center disabled:opacity-40 transition-colors flex-shrink-0">
                          {replying
                            ? <span className="size-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                            : <span className="material-symbols-outlined text-lg">send</span>}
                        </button>
                      </div>
                    </div>
                  </>
                );
              })()}
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
