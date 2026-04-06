import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import {
  fetchParentMeetingRequests,
  createParentMeetingRequest,
  selectParentMeetingRequests,
} from "../../store/slices/parentSlice";
import { selectChildren } from "../../store/slices/parentSlice";

export default function ParentRequestMeeting() {
  const navigate   = useNavigate();
  const dispatch   = useDispatch();
  const children   = useSelector(selectChildren);
  const meetings   = useSelector(selectParentMeetingRequests);

  const [childId, setChildId]   = useState("");
  const [reason, setReason]     = useState("");
  const [urgency, setUrgency]   = useState("normal");
  const [times, setTimes]       = useState([{ date: "", time: "" }]);
  const [submitting, setSubmitting] = useState(false);
  const [toast, setToast]       = useState(null);

  useEffect(() => {
    dispatch(fetchParentMeetingRequests());
    if (children.length === 1) setChildId(children[0]._id || children[0].id || "");
  }, [dispatch, children]);

  function showToast(msg, type = "success") {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  }

  const handleTimeChange = (i, field, val) =>
    setTimes((prev) => prev.map((t, idx) => idx === i ? { ...t, [field]: val } : t));

  const handleSubmit = async () => {
    if (!childId || !reason.trim() || times.some((t) => !t.date || !t.time)) {
      showToast("Please fill in all fields", "error"); return;
    }
    setSubmitting(true);
    try {
      await dispatch(createParentMeetingRequest({ child_id: childId, reason, proposed_times: times, urgency })).unwrap();
      showToast("Meeting request sent to teacher");
      setReason(""); setUrgency("normal"); setTimes([{ date: "", time: "" }]);
      dispatch(fetchParentMeetingRequests());
    } catch {
      showToast("Failed to send request. Please try again.", "error");
    } finally {
      setSubmitting(false);
    }
  };

  const statusColor = (s) =>
    s === "confirmed" ? "bg-green-100 text-green-700" :
    s === "pending_response" ? "bg-orange-100 text-orange-600" :
    "bg-gray-100 text-gray-500";

  return (
    <div className="bg-[#f6f6f8] min-h-screen pb-10" style={{ fontFamily: "'Lexend', sans-serif" }}>
      {toast && (
        <div className={`fixed top-4 left-1/2 -translate-x-1/2 z-[100] flex items-center gap-2 px-5 py-3 rounded-xl shadow-lg text-sm font-semibold ${
          toast.type === "error" ? "bg-red-600 text-white" : "bg-green-600 text-white"
        }`}>
          <span className="material-symbols-outlined text-base">{toast.type === "error" ? "error" : "check_circle"}</span>
          {toast.msg}
        </div>
      )}

      <header className="bg-white border-b border-gray-200 px-5 py-4 flex items-center gap-3">
        <button onClick={() => navigate("/parent")} className="p-2 hover:bg-gray-100 rounded-lg">
          <span className="material-symbols-outlined text-gray-500">arrow_back</span>
        </button>
        <div className="size-8 bg-[#695be6] rounded-lg flex items-center justify-center text-white">
          <span className="material-symbols-outlined text-sm">calendar_month</span>
        </div>
        <h1 className="font-black text-base">Request Teacher Meeting</h1>
      </header>

      <div className="max-w-lg mx-auto px-4 pt-6 space-y-5">
        {/* Request Form */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <h2 className="font-black text-base mb-4">New Meeting Request</h2>

          {children.length > 1 && (
            <div className="mb-4">
              <label className="text-xs font-bold text-gray-500 mb-1 block">Child</label>
              <select value={childId} onChange={(e) => setChildId(e.target.value)}
                className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-[#695be6] bg-white">
                <option value="">— Select child —</option>
                {children.map((c) => (
                  <option key={c._id || c.id} value={c._id || c.id}>{c.name}</option>
                ))}
              </select>
            </div>
          )}

          <div className="mb-4">
            <label className="text-xs font-bold text-gray-500 mb-1 block">Reason for Meeting</label>
            <textarea value={reason} onChange={(e) => setReason(e.target.value)}
              placeholder="e.g. Discuss academic progress, homework concerns..."
              className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none focus:border-[#695be6] resize-none h-20" />
          </div>

          <div className="mb-4">
            <label className="text-xs font-bold text-gray-500 mb-1 block">Urgency</label>
            <div className="flex gap-2">
              {["normal", "urgent"].map((u) => (
                <button key={u} onClick={() => setUrgency(u)}
                  className={`flex-1 py-2 rounded-xl text-sm font-bold border-2 transition-colors ${
                    urgency === u ? "border-[#695be6] bg-[#695be6]/5 text-[#695be6]" : "border-gray-200 text-gray-500"
                  }`}>
                  {u.charAt(0).toUpperCase() + u.slice(1)}
                </button>
              ))}
            </div>
          </div>

          <div className="mb-5">
            <label className="text-xs font-bold text-gray-500 mb-2 block">Your Available Times</label>
            {times.map((t, i) => (
              <div key={i} className="grid grid-cols-2 gap-2 mb-2">
                <input type="date" value={t.date} onChange={(e) => handleTimeChange(i, "date", e.target.value)}
                  className="border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none focus:border-[#695be6]" />
                <input type="time" value={t.time} onChange={(e) => handleTimeChange(i, "time", e.target.value)}
                  className="border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none focus:border-[#695be6]" />
              </div>
            ))}
            <button onClick={() => setTimes((p) => [...p, { date: "", time: "" }])}
              className="text-xs text-[#695be6] font-bold flex items-center gap-1 mt-1 hover:underline">
              <span className="material-symbols-outlined text-sm">add</span> Add another time slot
            </button>
          </div>

          <button onClick={handleSubmit} disabled={submitting}
            className="w-full bg-[#695be6] text-white font-bold py-3 rounded-xl hover:bg-[#5a4dd4] transition-colors disabled:opacity-70 flex items-center justify-center gap-2">
            {submitting
              ? <><span className="size-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />Sending...</>
              : <><span className="material-symbols-outlined text-base">send</span>Send Meeting Request</>
            }
          </button>
        </div>

        {/* Past Requests */}
        {meetings.length > 0 && (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
            <h2 className="font-black text-base mb-4">Your Meeting Requests</h2>
            <div className="space-y-3">
              {meetings.map((m) => (
                <div key={m._id || m.id} className="border border-gray-100 rounded-xl p-4">
                  <div className="flex items-center justify-between mb-1">
                    <p className="font-bold text-sm">{m.reason}</p>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${statusColor(m.status)}`}>
                      {m.status === "pending_response" ? "PENDING" : m.status?.toUpperCase()}
                    </span>
                  </div>
                  {m.confirmed_time && (
                    <p className="text-xs text-green-600 font-semibold mt-1">
                      Confirmed: {m.confirmed_time.date} at {m.confirmed_time.time}
                    </p>
                  )}
                  <p className="text-xs text-gray-400 mt-1">{m.created_at ? new Date(m.created_at).toLocaleDateString() : ""}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
