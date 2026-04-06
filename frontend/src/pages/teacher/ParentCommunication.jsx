import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { useAuth } from "../../context/AuthContext";
import {
  fetchParentMessages, sendParentMessage,
  selectParentMessages, fetchMyStudents, selectMyStudents,
  createMeetingRequest, fetchMeetingRequests, selectMeetingRequests,
} from "../../store/slices/teacherSlice";
import {
  parentMeetingRequests,
  messageComposerTemplates,
  communicationHistory,
} from "../../data/teacher/parentCommunicationData";
import api from "../../api";
import SearchBar from "../../components/SearchBar";

const TABS = ["Parent Meeting Requests", "Message Composer", "Communication History"];

export default function ParentCommunication() {
  const navigate  = useNavigate();
  const dispatch  = useDispatch();
  const { user }  = useAuth();
  const [searchParams] = useSearchParams();
  const parentIdParam = searchParams.get("parent");

  const apiMessages = useSelector(selectParentMessages);
  const students    = useSelector(selectMyStudents);
  const apiMeetings = useSelector(selectMeetingRequests);
  const [activeTab, setActiveTab] = useState(0);
  const [classFilter, setClassFilter] = useState("Grade 8 - Section A");
  const [parentSearch, setParentSearch] = useState("");
  const [requests, setRequests] = useState(parentMeetingRequests);
  const [selectedRequest, setSelectedRequest] = useState(requests[0]);
  const [composerTemplate, setComposerTemplate] = useState(messageComposerTemplates[0].id);
  const [composerBody, setComposerBody] = useState(messageComposerTemplates[0].body);
  const [selectedStudent, setSelectedStudent] = useState("");
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);

  // Real parent data loaded from ?parent= query param
  const [parentInfo, setParentInfo] = useState(null);
  const [parentChildren, setParentChildren] = useState([]);

  useEffect(() => {
    if (!parentIdParam) return;
    // Fetch parent info from backend
    api.get(`/teacher/parent/${parentIdParam}`)
      .then((res) => {
        setParentInfo(res.data.parent);
        setParentChildren(res.data.children || []);
        // Pre-select first child in composer
        if (res.data.children?.length) {
          setSelectedStudent(res.data.children[0].id);
        }
      })
      .catch(() => {
        // Fallback: try to find parent in students list
      });
  }, [parentIdParam]);

  useEffect(() => {
    dispatch(fetchParentMessages());
    dispatch(fetchMyStudents());
    dispatch(fetchMeetingRequests());
  }, [dispatch]);

  // Merge API history with mock for display
  const historyRows = apiMessages.length
    ? apiMessages.map((m) => ({
        id: m._id || m.id,
        studentName: m.student_id,
        date: m.sent_at ? new Date(m.sent_at).toLocaleDateString() : "—",
        subject: "Message",
        channel: "In-App",
        status: "sent",
      }))
    : communicationHistory;

  const handleSend = async () => {
    if (!selectedStudent || !composerBody.trim()) return;
    setSending(true);
    try {
      await dispatch(sendParentMessage({ studentId: selectedStudent, message: composerBody })).unwrap();
      setSent(true);
      showToast("Message sent to parent successfully");
      setTimeout(() => setSent(false), 3000);
      dispatch(fetchParentMessages());
    } catch { showToast("Failed to send message", "error"); }
    finally { setSending(false); }
  };

  const selectTime = (reqId, timeId) => {
    setRequests((prev) =>
      prev.map((r) =>
        r.id === reqId
          ? { ...r, proposedTimes: r.proposedTimes.map((t) => ({ ...t, selected: t.id === timeId })) }
          : r
      )
    );
    if (selectedRequest?.id === reqId) {
      setSelectedRequest((prev) => ({
        ...prev,
        proposedTimes: prev.proposedTimes.map((t) => ({ ...t, selected: t.id === timeId })),
      }));
    }
  };

  const unreadCount = 5;
  const pendingCount = requests.filter((r) => r.status === "pending_response").length;

  // ── new state ──────────────────────────────────────────────
  const [confirmingId, setConfirmingId] = useState(null);
  const [alternativeModal, setAlternativeModal] = useState(null);
  const [altDate, setAltDate] = useState("");
  const [altTime, setAltTime] = useState("");
  const [altNote, setAltNote] = useState("");
  const [toast, setToast] = useState(null);

  function showToast(msg, type = "success") {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  }

  const handleConfirmMeeting = (req) => {
    const chosen = req.proposedTimes.find((t) => t.selected);
    if (!chosen) { showToast("Please select a time slot first", "error"); return; }
    setConfirmingId(req.id);
    setTimeout(() => {
      setRequests((prev) =>
        prev.map((r) => r.id === req.id ? { ...r, status: "confirmed", confirmedTime: chosen } : r)
      );
      setSelectedRequest((prev) =>
        prev?.id === req.id ? { ...prev, status: "confirmed", confirmedTime: chosen } : prev
      );
      setConfirmingId(null);
      showToast(`Meeting confirmed with ${req.parentContact.name} on ${chosen.date} at ${chosen.time}`);
    }, 900);
  };

  const handleSuggestAlternative = (req) => {
    setAlternativeModal({ reqId: req.id, studentName: req.studentName, parentName: req.parentContact.name });
    setAltDate(""); setAltTime(""); setAltNote("");
  };

  const handleSendAlternative = () => {
    if (!altDate || !altTime) { showToast("Please fill in date and time", "error"); return; }
    setRequests((prev) =>
      prev.map((r) =>
        r.id === alternativeModal.reqId
          ? {
              ...r,
              proposedTimes: [
                ...r.proposedTimes.map((t) => ({ ...t, selected: false })),
                { id: `alt-${Date.now()}`, date: altDate, time: altTime, selected: true, isAlternative: true },
              ],
            }
          : r
      )
    );
    showToast(`Alternative time sent to ${alternativeModal.parentName}`);
    setAlternativeModal(null);
  };

  const handleCallParent = (req) => {
    const phone = req?.parentContact?.phone?.replace(/\s/g, "");
    if (phone) window.open(`tel:${phone}`, "_self");
  };

  // ── New Meeting Request Modal ──────────────────────────────
  const [newMeetingModal, setNewMeetingModal] = useState(false);
  const [nmStudent, setNmStudent] = useState("");
  const [nmReason, setNmReason] = useState("");
  const [nmUrgency, setNmUrgency] = useState("normal");
  const [nmTimes, setNmTimes] = useState([{ date: "", time: "" }]);
  const [nmSubmitting, setNmSubmitting] = useState(false);

  const handleAddTimeSlot = () => setNmTimes((prev) => [...prev, { date: "", time: "" }]);
  const handleTimeChange = (i, field, val) =>
    setNmTimes((prev) => prev.map((t, idx) => idx === i ? { ...t, [field]: val } : t));

  const handleSubmitNewMeeting = async () => {
    if (!nmStudent || !nmReason.trim() || nmTimes.some((t) => !t.date || !t.time)) {
      showToast("Please fill in all fields and time slots", "error"); return;
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
      setNmStudent(""); setNmReason(""); setNmUrgency("normal"); setNmTimes([{ date: "", time: "" }]);
      dispatch(fetchMeetingRequests());
    } catch {
      showToast("Failed to send meeting request", "error");
    } finally {
      setNmSubmitting(false);
    }
  };

  const handleQuickMessage = (req) => {
    setActiveTab(1);
    const match = students.find((s) => s.name === req?.studentName);
    if (match) setSelectedStudent(match._id || match.id || "");
    const template = messageComposerTemplates.find((t) => t.id === "mt2") || messageComposerTemplates[0];
    setComposerTemplate(template.id);
    setComposerBody(template.body.replace("[Student Name]", req?.studentName || ""));
  };

  return (
    <div className="bg-[#faf9ff] min-h-screen" style={{ fontFamily: "'Lexend', sans-serif" }}>

      {/* Toast */}
      {toast && (
        <div className={`fixed top-4 left-1/2 -translate-x-1/2 z-[100] flex items-center gap-2 px-5 py-3 rounded-xl shadow-lg text-sm font-semibold transition-all ${
          toast.type === "error" ? "bg-red-600 text-white" : "bg-green-600 text-white"
        }`}>
          <span className="material-symbols-outlined text-base">
            {toast.type === "error" ? "error" : "check_circle"}
          </span>
          {toast.msg}
        </div>
      )}

      {/* Suggest Alternative Modal */}
      {alternativeModal && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6">
            <h3 className="font-black text-lg mb-1">Suggest Alternative Time</h3>
            <p className="text-sm text-gray-500 mb-5">
              Proposing a new time to <strong>{alternativeModal.parentName}</strong> for {alternativeModal.studentName}'s meeting.
            </p>
            <div className="grid grid-cols-2 gap-3 mb-3">
              <div>
                <label className="text-xs font-bold text-gray-500 mb-1 block">Date</label>
                <input type="date" value={altDate} onChange={(e) => setAltDate(e.target.value)}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-[#695be6]" />
              </div>
              <div>
                <label className="text-xs font-bold text-gray-500 mb-1 block">Time</label>
                <input type="time" value={altTime} onChange={(e) => setAltTime(e.target.value)}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-[#695be6]" />
              </div>
            </div>
            <div className="mb-5">
              <label className="text-xs font-bold text-gray-500 mb-1 block">Note to Parent (optional)</label>
              <textarea value={altNote} onChange={(e) => setAltNote(e.target.value)}
                placeholder="e.g. I'm available after 3 PM on weekdays..."
                className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none focus:border-[#695be6] resize-none h-20" />
            </div>
            <div className="flex gap-3">
              <button onClick={() => setAlternativeModal(null)}
                className="flex-1 border border-gray-200 text-sm font-bold py-2.5 rounded-xl hover:bg-gray-50">
                Cancel
              </button>
              <button onClick={handleSendAlternative}
                className="flex-1 bg-[#695be6] text-white text-sm font-bold py-2.5 rounded-xl hover:bg-[#5a4dd4] flex items-center justify-center gap-2">
                <span className="material-symbols-outlined text-base">send</span> Send to Parent
              </button>
            </div>
          </div>
        </div>
      )}

      {/* New Meeting Request Modal */}
      {newMeetingModal && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center p-4"
          style={{ backgroundColor: "rgba(0,0,0,0.55)" }}
          onClick={(e) => { if (e.target === e.currentTarget) setNewMeetingModal(false); }}
        >
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden flex flex-col" style={{ maxHeight: "calc(100vh - 48px)" }}>
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-5 border-b border-gray-100">
              <div className="flex items-center gap-3">
                <div className="size-9 rounded-xl bg-[#695be6]/10 flex items-center justify-center">
                  <span className="material-symbols-outlined text-[#695be6] text-lg">calendar_month</span>
                </div>
                <div>
                  <h3 className="font-black text-base leading-tight">Request Parent Meeting</h3>
                  <p className="text-xs text-gray-400 mt-0.5">Send proposed time slots to a parent</p>
                </div>
              </div>
              <button onClick={() => setNewMeetingModal(false)}
                className="size-8 rounded-lg hover:bg-gray-100 flex items-center justify-center transition-colors">
                <span className="material-symbols-outlined text-gray-400 text-lg">close</span>
              </button>
            </div>

            {/* Modal Body */}
            <div className="overflow-y-auto px-6 py-5 space-y-4">
              <div>
                <label className="text-xs font-bold text-gray-500 mb-1.5 block uppercase tracking-wide">Student</label>
                <select value={nmStudent} onChange={(e) => setNmStudent(e.target.value)}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-[#695be6] bg-white transition-colors">
                  <option value="">— Select student —</option>
                  {students.map((s) => (
                    <option key={s._id || s.id} value={s._id || s.id}>{s.name} ({s.class_name})</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-bold text-gray-500 mb-1.5 block uppercase tracking-wide">Reason for Meeting</label>
                <textarea value={nmReason} onChange={(e) => setNmReason(e.target.value)}
                  placeholder="e.g. Academic performance drop, attendance concern..."
                  className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-[#695be6] resize-none h-[80px] transition-colors" />
              </div>

              <div>
                <label className="text-xs font-bold text-gray-500 mb-1.5 block uppercase tracking-wide">Urgency</label>
                <div className="flex gap-2">
                  {[
                    { val: "normal", label: "Normal", icon: "schedule" },
                    { val: "urgent", label: "Urgent", icon: "priority_high" },
                  ].map(({ val, label, icon }) => (
                    <button key={val} onClick={() => setNmUrgency(val)}
                      className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-bold border-2 transition-all ${
                        nmUrgency === val
                          ? val === "urgent"
                            ? "border-red-400 bg-red-50 text-red-600"
                            : "border-[#695be6] bg-[#695be6]/5 text-[#695be6]"
                          : "border-gray-200 text-gray-400 hover:border-gray-300"
                      }`}>
                      <span className="material-symbols-outlined text-base">{icon}</span>
                      {label}
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
                      <span className="text-gray-300 text-sm">|</span>
                      <input type="time" value={t.time} onChange={(e) => handleTimeChange(i, "time", e.target.value)}
                        className="bg-transparent text-sm outline-none text-gray-700 w-24" />
                    </div>
                  ))}
                </div>
                <button onClick={handleAddTimeSlot}
                  className="mt-2 text-xs text-[#695be6] font-bold flex items-center gap-1 hover:underline">
                  <span className="material-symbols-outlined text-sm">add_circle</span> Add another time slot
                </button>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="flex gap-3 px-6 py-4 border-t border-gray-100 bg-gray-50/50">
              <button onClick={() => setNewMeetingModal(false)}
                className="flex-1 border border-gray-200 text-sm font-bold py-2.5 rounded-xl hover:bg-gray-100 transition-colors bg-white">
                Cancel
              </button>
              <button onClick={handleSubmitNewMeeting} disabled={nmSubmitting}
                className="flex-1 bg-[#695be6] text-white text-sm font-bold py-2.5 rounded-xl hover:bg-[#5a4dd4] flex items-center justify-center gap-2 disabled:opacity-70 transition-colors">
                {nmSubmitting
                  ? <><span className="size-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />Sending...</>
                  : <><span className="material-symbols-outlined text-base">send</span>Send Request</>
                }
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-white border-b border-gray-200">
        <div className="max-w-[1200px] mx-auto px-6 h-14 flex items-center gap-4">
          <button onClick={() => navigate("/teacher")} className="p-2 hover:bg-gray-100 rounded-lg">
            <span className="material-symbols-outlined text-gray-500">arrow_back</span>
          </button>
          <div className="size-7 bg-[#695be6] rounded-lg flex items-center justify-center text-white">
            <span className="material-symbols-outlined text-sm">groups</span>
          </div>
          <h1 className="font-black text-base">Parent Communication</h1>

          <select
            value={classFilter}
            onChange={(e) => setClassFilter(e.target.value)}
            className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm bg-white outline-none ml-2"
          >
            <option>Grade 8 - Section A</option>
            <option>Grade 8 - Section B</option>
            <option>Grade 9 - Section A</option>
          </select>

          <SearchBar
            value={parentSearch}
            onChange={setParentSearch}
            placeholder="Search parents or students"
            width="max-w-sm ml-2"
          />

          <div className="ml-auto flex items-center gap-3">
            <span className="bg-red-500 text-white text-xs font-bold px-3 py-1 rounded-full">{unreadCount} UNREAD</span>
            <span className="bg-orange-100 text-orange-600 text-xs font-bold px-3 py-1 rounded-full">{pendingCount} PENDING</span>
            <div className="size-9 rounded-full bg-[#695be6] flex items-center justify-center text-white font-bold text-sm">{user?.name?.[0] || "T"}</div>
          </div>
        </div>
      </header>

      <div className="max-w-[1200px] mx-auto pt-20 px-6 pb-12 flex gap-6">

        {/* Main Panel */}
        <div className="flex-1">
          {/* Tabs */}
          <div className="flex gap-1 border-b border-gray-200 mb-6">
            {TABS.map((tab, i) => (
              <button
                key={tab}
                onClick={() => setActiveTab(i)}
                className={`flex items-center gap-1.5 px-4 py-3 text-sm font-semibold border-b-2 transition-colors ${
                  activeTab === i ? "border-[#695be6] text-[#695be6]" : "border-transparent text-gray-500 hover:text-gray-700"
                }`}
              >
                <span className="material-symbols-outlined text-base">
                  {i === 0 ? "calendar_month" : i === 1 ? "edit_note" : "history"}
                </span>
                {tab}
              </button>
            ))}
          </div>

          {/* Tab 0: Meeting Requests */}
          {activeTab === 0 && (
            <>
              {/* Request New Meeting */}
              <button
                onClick={() => setNewMeetingModal(true)}
                className="w-full border-2 border-dashed border-[#695be6]/40 rounded-xl py-8 flex flex-col items-center gap-2 hover:bg-[#695be6]/5 transition-colors mb-6">
                <div className="size-10 rounded-full bg-[#695be6]/10 flex items-center justify-center">
                  <span className="material-symbols-outlined text-[#695be6]">add</span>
                </div>
                <p className="text-[#695be6] font-bold">+ Request New Parent Meeting</p>
              </button>

              <div className="flex items-center justify-between mb-4">
                <h3 className="font-black text-lg">Pending Requests</h3>
                <p className="text-sm text-gray-400">Showing 1 of {requests.length} requests</p>
              </div>

              {requests.map((req) => (
                <div
                  key={req.id}
                  onClick={() => setSelectedRequest(req)}
                  className={`bg-white rounded-xl border shadow-sm p-5 mb-4 cursor-pointer transition-all ${
                    selectedRequest?.id === req.id ? "border-[#695be6]" : "border-gray-100 hover:border-gray-200"
                  }`}
                >
                  <div className="flex items-start gap-4">
                    <div className="size-14 rounded-xl bg-gray-100 flex items-center justify-center flex-shrink-0 overflow-hidden">
                      <span className="material-symbols-outlined text-gray-400 text-3xl">person</span>
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-1">
                        <p className="font-black">{req.studentName} ({req.studentClass})</p>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          req.status === "pending_response" ? "bg-orange-100 text-orange-600" : "bg-green-100 text-green-600"
                        }`}>
                          {req.status === "pending_response" ? "PENDING RESPONSE" : "CONFIRMED"}
                        </span>
                        {req.urgency === "urgent" && (
                          <span className="ml-auto flex items-center gap-1 text-[10px] font-bold text-red-500 bg-red-50 px-2 py-0.5 rounded-full">
                            <span className="size-1.5 rounded-full bg-red-500 inline-block"></span> URGENT
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-gray-500 mb-3">{req.reason}</p>

                      <p className="text-[10px] font-bold text-gray-400 uppercase mb-2">Proposed Times</p>
                      <div className="flex gap-2 flex-wrap">
                        {req.proposedTimes.map((t) => (
                          <button
                            key={t.id}
                            onClick={(e) => { e.stopPropagation(); selectTime(req.id, t.id); }}
                            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border-2 text-sm transition-all ${
                              t.selected
                                ? "border-[#695be6] bg-[#695be6]/5 text-[#695be6]"
                                : "border-gray-200 hover:border-gray-300"
                            }`}
                          >
                            <div className={`size-4 rounded-full border-2 flex items-center justify-center ${
                              t.selected ? "border-[#695be6]" : "border-gray-300"
                            }`}>
                              {t.selected && <div className="size-2 rounded-full bg-[#695be6]" />}
                            </div>
                            <div className="text-left">
                              <p className="font-bold text-xs">{t.date}</p>
                              <p className="text-[10px] text-gray-400">{t.time}</p>
                            </div>
                          </button>
                        ))}
                      </div>

                      <div className="flex gap-3 mt-4">
                        <button
                          onClick={(e) => { e.stopPropagation(); handleSuggestAlternative(req); }}
                          className="border border-gray-200 text-sm font-bold px-5 py-2 rounded-xl hover:bg-gray-50 transition-colors flex items-center gap-2"
                        >
                          <span className="material-symbols-outlined text-base">schedule</span>
                          Suggest Alternative
                        </button>
                        {req.status === "confirmed" ? (
                          <div className="flex items-center gap-2 bg-green-50 border border-green-200 text-green-700 text-sm font-bold px-5 py-2 rounded-xl">
                            <span className="material-symbols-outlined text-base">check_circle</span>
                            Meeting Confirmed — {req.confirmedTime?.date} {req.confirmedTime?.time}
                          </div>
                        ) : (
                          <button
                            onClick={(e) => { e.stopPropagation(); handleConfirmMeeting(req); }}
                            disabled={confirmingId === req.id}
                            className="flex items-center gap-2 bg-[#695be6] text-white text-sm font-bold px-5 py-2 rounded-xl hover:bg-[#5a4dd4] transition-colors disabled:opacity-70"
                          >
                            {confirmingId === req.id
                              ? <><span className="size-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />Confirming...</>
                              : <><span className="material-symbols-outlined text-base">check_circle</span>Confirm Meeting</>
                            }
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </>
          )}

          {/* Tab 1: Message Composer */}
          {activeTab === 1 && (
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
              <h3 className="font-black text-lg mb-4">Compose Message</h3>
              <div className="mb-4">
                <label className="text-xs font-bold text-gray-500 mb-2 block">Send To (Student)</label>
                <select value={selectedStudent} onChange={(e) => setSelectedStudent(e.target.value)}
                  className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-[#695be6] bg-white mb-3">
                  <option value="">— Select student —</option>
                  {students.map((s) => (
                    <option key={s._id} value={s._id}>{s.name} ({s.class_name})</option>
                  ))}
                </select>
              </div>
              <div className="mb-4">
                <label className="text-xs font-bold text-gray-500 mb-2 block">Template</label>
                <div className="flex flex-wrap gap-2">
                  {messageComposerTemplates.map((t) => (
                    <button key={t.id}
                      onClick={() => { setComposerTemplate(t.id); setComposerBody(t.body); }}
                      className={`text-xs font-bold px-3 py-1.5 rounded-full border transition-colors ${
                        composerTemplate === t.id ? "bg-[#695be6] text-white border-[#695be6]" : "border-gray-200 hover:border-[#695be6]"
                      }`}>
                      {t.label}
                    </button>
                  ))}
                </div>
              </div>
              <div className="mb-4">
                <label className="text-xs font-bold text-gray-500 mb-2 block">Message</label>
                <textarea value={composerBody} onChange={(e) => setComposerBody(e.target.value)}
                  className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm outline-none focus:border-[#695be6] resize-none h-32" />
              </div>
              {sent && (
                <div className="mb-3 flex items-center gap-2 bg-green-50 border border-green-200 rounded-xl px-4 py-2">
                  <span className="material-symbols-outlined text-green-600 text-base">check_circle</span>
                  <p className="text-green-700 text-sm font-medium">Message sent successfully</p>
                </div>
              )}
              <button onClick={handleSend} disabled={sending || !selectedStudent || !composerBody.trim()}
                className="bg-[#695be6] text-white font-bold px-6 py-2.5 rounded-xl hover:bg-[#5a4dd4] transition-colors disabled:opacity-50 flex items-center gap-2">
                {sending
                  ? <><span className="size-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />Sending...</>
                  : <><span className="material-symbols-outlined text-base">send</span>Send Message</>
                }
              </button>
            </div>
          )}

          {/* Tab 2: Communication History */}
          {activeTab === 2 && (
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50">
                    <th className="text-left px-5 py-3 text-xs font-bold text-gray-400 uppercase">Student</th>
                    <th className="text-left px-5 py-3 text-xs font-bold text-gray-400 uppercase">Date</th>
                    <th className="text-left px-5 py-3 text-xs font-bold text-gray-400 uppercase">Subject</th>
                    <th className="text-left px-5 py-3 text-xs font-bold text-gray-400 uppercase">Channel</th>
                    <th className="text-left px-5 py-3 text-xs font-bold text-gray-400 uppercase">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {historyRows.map((h) => (
                    <tr key={h.id} className="border-b border-gray-50 hover:bg-gray-50">
                      <td className="px-5 py-4 font-semibold">{h.studentName}</td>
                      <td className="px-5 py-4 text-gray-500">{h.date}</td>
                      <td className="px-5 py-4">{h.subject}</td>
                      <td className="px-5 py-4 text-gray-500">{h.channel}</td>
                      <td className="px-5 py-4">
                        <span className={`text-xs font-bold px-2 py-1 rounded-full ${
                          h.status === "completed" || h.status === "sent" ? "bg-green-100 text-green-700" :
                          h.status === "read" ? "bg-blue-100 text-blue-700" :
                          "bg-orange-100 text-orange-700"
                        }`}>{h.status}</span>
                      </td>
                    </tr>
                  ))}
                  {historyRows.length === 0 && (
                    <tr><td colSpan={5} className="px-5 py-8 text-center text-gray-400 text-sm">No messages sent yet</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Right Sidebar — Parent Contact Info */}
        {(selectedRequest || parentInfo) && activeTab === 0 && (
          <div className="w-64 flex-shrink-0">
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 sticky top-20">
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wide mb-3">Parent Contact Information</p>

              {/* Real parent data from ?parent= param */}
              {parentInfo ? (
                <>
                  <div className="flex items-center gap-3 mb-4">
                    <div className="size-12 rounded-full bg-[#695be6]/10 flex items-center justify-center">
                      <span className="material-symbols-outlined text-[#695be6] text-2xl">family_restroom</span>
                    </div>
                    <div>
                      <p className="font-black text-sm">{parentInfo.name}</p>
                      <p className="text-xs text-gray-400">Parent</p>
                    </div>
                  </div>

                  <div className="space-y-2 mb-4 pb-4 border-b border-gray-100">
                    {parentInfo.phone && (
                      <div className="flex items-center gap-2">
                        <span className="material-symbols-outlined text-gray-400 text-sm">phone</span>
                        <p className="text-sm">{parentInfo.phone}</p>
                      </div>
                    )}
                    {parentInfo.email && (
                      <div className="flex items-center gap-2">
                        <span className="material-symbols-outlined text-gray-400 text-sm">mail</span>
                        <p className="text-xs text-gray-600 break-all">{parentInfo.email}</p>
                      </div>
                    )}
                  </div>

                  {parentChildren.length > 0 && (
                    <>
                      <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wide mb-3">Children</p>
                      <div className="space-y-2 mb-4">
                        {parentChildren.map((child) => (
                          <div key={child.id} className="flex items-center gap-2 p-2 bg-gray-50 rounded-lg">
                            <div className="size-8 rounded-full bg-[#695be6]/10 flex items-center justify-center text-[#695be6] font-bold text-xs">
                              {child.name?.[0]}
                            </div>
                            <div>
                              <p className="text-sm font-bold">{child.name}</p>
                              <p className="text-xs text-gray-400">{child.class} {child.roll_no ? `· Roll #${child.roll_no}` : ""}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </>
                  )}

                  <button
                    onClick={() => parentInfo.phone && window.open(`tel:${parentInfo.phone.replace(/\s/g, "")}`, "_self")}
                    disabled={!parentInfo.phone}
                    className="w-full flex items-center justify-center gap-2 bg-gray-900 text-white font-bold py-3 rounded-xl hover:bg-gray-800 transition-colors mb-2 disabled:opacity-50"
                  >
                    <span className="material-symbols-outlined text-base">phone</span>
                    Call {parentInfo.name?.split(" ")[0]}
                  </button>
                </>
              ) : (
                /* Fallback: mock data from selected meeting request */
                <>
                  <div className="flex items-center gap-3 mb-4">
                    <div className="size-12 rounded-full bg-gray-200 flex items-center justify-center overflow-hidden">
                      <span className="material-symbols-outlined text-gray-400 text-2xl">person</span>
                    </div>
                    <div>
                      <p className="font-black text-sm">{selectedRequest.studentName}</p>
                      <p className="text-xs text-[#695be6] font-semibold">
                        Grade {selectedRequest.studentClass}, Roll #{selectedRequest.rollNo}
                      </p>
                    </div>
                  </div>

                  <div className="space-y-2 mb-4 pb-4 border-b border-gray-100">
                    <div className="flex items-start gap-2">
                      <span className="material-symbols-outlined text-gray-400 text-sm mt-0.5">person</span>
                      <div>
                        <p className="text-sm font-bold">{selectedRequest.parentContact.name}</p>
                        <p className="text-[10px] text-gray-400">{selectedRequest.parentContact.type}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="material-symbols-outlined text-gray-400 text-sm">phone</span>
                      <p className="text-sm">{selectedRequest.parentContact.phone}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="material-symbols-outlined text-gray-400 text-sm">mail</span>
                      <p className="text-xs text-gray-600 break-all">{selectedRequest.parentContact.email}</p>
                    </div>
                  </div>

                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wide mb-3">Student Context</p>
                  <div className="grid grid-cols-2 gap-2 mb-3">
                    <div className="bg-gray-50 rounded-xl p-2 text-center">
                      <p className="text-[10px] text-gray-400">Current Avg</p>
                      <p className="font-black text-lg">{selectedRequest.studentContext.currentAvg}%</p>
                    </div>
                    <div className="bg-gray-50 rounded-xl p-2 text-center">
                      <p className="text-[10px] text-gray-400">Trend</p>
                      <p className="text-xs font-bold text-red-500 flex items-center justify-center gap-0.5 mt-1">
                        <span className="material-symbols-outlined text-sm">trending_down</span>
                        {selectedRequest.studentContext.trend}
                      </p>
                    </div>
                  </div>

                  <div className="bg-red-50 rounded-xl p-3 mb-4">
                    <p className="text-[10px] font-bold text-red-500 mb-2 flex items-center gap-1">
                      <span className="material-symbols-outlined text-sm">warning</span>
                      {selectedRequest.studentContext.criticalGaps.length} CRITICAL GAPS
                    </p>
                    <ul className="space-y-1">
                      {selectedRequest.studentContext.criticalGaps.map((gap) => (
                        <li key={gap} className="flex items-start gap-1.5 text-xs text-gray-600">
                          <span className="size-1.5 rounded-full bg-red-500 mt-1.5 flex-shrink-0"></span>
                          {gap}
                        </li>
                      ))}
                    </ul>
                  </div>

                  <button
                    onClick={() => handleCallParent(selectedRequest)}
                    className="w-full flex items-center justify-center gap-2 bg-gray-900 text-white font-bold py-3 rounded-xl hover:bg-gray-800 transition-colors mb-2"
                  >
                    <span className="material-symbols-outlined text-base">phone</span>
                    Call {selectedRequest.parentContact.name}
                  </button>
                </>
              )}

              {/* Quick message button always shown */}
              {!parentInfo && selectedRequest && (
                <button
                  onClick={() => handleQuickMessage(selectedRequest)}
                  className="w-full flex items-center justify-center gap-2 bg-[#695be6]/10 text-[#695be6] font-bold py-3 rounded-xl hover:bg-[#695be6]/20 transition-colors"
                >
                  <span className="material-symbols-outlined text-base">chat</span> Send Quick Message
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
