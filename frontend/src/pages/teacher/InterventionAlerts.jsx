import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { useAuth } from "../../context/AuthContext";
import {
  fetchInterventions,
  selectInterventions,
  fetchMySections,
  selectMySections,
} from "../../store/slices/teacherSlice";
import api from "../../api";

function ScoreBar({ history = [] }) {
  if (!history.length) return <div className="text-xs text-gray-400">No score history</div>;
  const max = Math.max(...history, 1);
  return (
    <div className="flex items-end gap-0.5 h-8">
      {history.map((v, i) => (
        <div
          key={i}
          className={`w-4 rounded-sm ${v < 50 ? "bg-red-400" : v < 70 ? "bg-orange-400" : "bg-green-400"}`}
          style={{ height: `${(v / max) * 100}%` }}
          title={`${v}%`}
        />
      ))}
    </div>
  );
}

function PriorityBadge({ priority }) {
  const map = {
    urgent:    "bg-red-100 text-red-600",
    important: "bg-yellow-100 text-yellow-700",
    routine:   "bg-blue-100 text-blue-600",
  };
  return (
    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase ${map[priority] || map.routine}`}>
      {priority}
    </span>
  );
}

export default function InterventionAlerts() {
  const navigate   = useNavigate();
  const dispatch   = useDispatch();
  const { user }   = useAuth();
  const alerts     = useSelector(selectInterventions);
  const sections   = useSelector(selectMySections);

  const [stats,        setStats]        = useState(null);
  const [activeTab,    setActiveTab]    = useState("urgent");
  const [classFilter,  setClassFilter]  = useState("all");
  const [notes,        setNotes]        = useState({});
  const [statuses,     setStatuses]     = useState({});
  const [snoozed,      setSnoozed]      = useState({});
  const [reviewed,     setReviewed]     = useState({});
  const [savingNote,   setSavingNote]   = useState({});
  const [loading,      setLoading]      = useState(true);
  const [toast,        setToast]        = useState(null);

  useEffect(() => {
    setLoading(true);
    Promise.all([
      dispatch(fetchInterventions()),
      dispatch(fetchMySections()),
      api.get("/teacher/interventions/stats").then(r => setStats(r.data)).catch(() => {}),
    ]).finally(() => setLoading(false));
  }, [dispatch]);

  // Seed local state from API data
  useEffect(() => {
    if (!alerts.length) return;
    const initStatuses = {};
    const initNotes    = {};
    const initSnoozed  = {};
    const initReviewed = {};
    alerts.forEach(a => {
      initStatuses[a._id] = a.status || "New";
      initNotes[a._id]    = a.private_note || "";
      initSnoozed[a._id]  = a.snoozed || false;
      initReviewed[a._id] = a.status === "reviewed";
    });
    setStatuses(initStatuses);
    setNotes(initNotes);
    setSnoozed(initSnoozed);
    setReviewed(initReviewed);
  }, [alerts]);

  function showToast(msg, type = "success") {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  }

  const handleSnooze = async (id) => {
    const next = !snoozed[id];
    setSnoozed(p => ({ ...p, [id]: next }));
    try { await api.patch(`/teacher/interventions/${id}/snooze`); } catch {}
    showToast(next ? "Alert snoozed for 24 hours" : "Alert un-snoozed");
  };

  const handleReview = async (id) => {
    const next = !reviewed[id];
    setReviewed(p => ({ ...p, [id]: next }));
    setStatuses(p => ({ ...p, [id]: next ? "reviewed" : "New" }));
    try { await api.patch(`/teacher/interventions/${id}/review`); } catch {}
    showToast(next ? "Marked as reviewed" : "Marked as new");
  };

  const handleSaveNote = async (id) => {
    setSavingNote(p => ({ ...p, [id]: true }));
    try {
      await api.patch(`/teacher/interventions/${id}/notes`, { note: notes[id] || "" });
      showToast("Note saved");
    } catch { showToast("Failed to save note", "error"); }
    finally { setSavingNote(p => ({ ...p, [id]: false })); }
  };

  const handleStatusChange = async (id, status) => {
    setStatuses(p => ({ ...p, [id]: status }));
    try { await api.patch(`/teacher/interventions/${id}/status`, null, { params: { status } }); } catch {}
  };

  const handleMarkAllReviewed = async () => {
    const newR = {};
    const newS = {};
    filtered.forEach(a => { newR[a._id] = true; newS[a._id] = "reviewed"; });
    setReviewed(p => ({ ...p, ...newR }));
    setStatuses(p => ({ ...p, ...newS }));
    await Promise.allSettled(
      filtered.map(a => api.patch(`/teacher/interventions/${a._id}/review`))
    );
    showToast("All visible alerts marked as reviewed");
  };

  // Filter by class
  const filtered = alerts.filter(a => {
    if (classFilter === "all") return true;
    return a.student_class === classFilter || a.section_id === classFilter;
  });

  const byPriority = {
    urgent:    filtered.filter(a => a.priority === "urgent"),
    important: filtered.filter(a => a.priority === "important"),
    routine:   filtered.filter(a => !["urgent", "important"].includes(a.priority)),
  };

  const tabs = [
    { id: "urgent",    label: "URGENT",    color: "text-red-600 border-red-500" },
    { id: "important", label: "IMPORTANT", color: "text-yellow-600 border-yellow-500" },
    { id: "routine",   label: "ROUTINE",   color: "text-blue-600 border-blue-500" },
  ];

  const activeAlerts = byPriority[activeTab] || [];

  return (
    <div className="bg-[#fff5f5] min-h-screen" style={{ fontFamily: "'Lexend', sans-serif" }}>

      {/* Toast */}
      {toast && (
        <div className={`fixed top-4 left-1/2 -translate-x-1/2 z-[100] flex items-center gap-2 px-5 py-3 rounded-xl shadow-lg text-sm font-semibold ${
          toast.type === "error" ? "bg-red-600 text-white" : "bg-green-600 text-white"
        }`}>
          <span className="material-symbols-outlined text-base">
            {toast.type === "error" ? "error" : "check_circle"}
          </span>
          {toast.msg}
        </div>
      )}

      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-white border-b border-gray-200">
        <div className="max-w-[1100px] mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button onClick={() => navigate("/teacher")} className="p-2 hover:bg-gray-100 rounded-lg">
              <span className="material-symbols-outlined text-gray-500">arrow_back</span>
            </button>
            <h1 className="text-xl font-black">Intervention Alerts</h1>
            {stats && (
              <span className="bg-red-500 text-white text-xs font-bold px-2 py-0.5 rounded-full">
                {stats.actions_pending}
              </span>
            )}
          </div>
          <div className="flex items-center gap-3">
            <select
              value={classFilter}
              onChange={e => setClassFilter(e.target.value)}
              className="border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white outline-none"
            >
              <option value="all">All My Classes</option>
              {sections.map(s => (
                <option key={s._id} value={s.class_name}>{s.class_name}</option>
              ))}
            </select>
            <button
              onClick={handleMarkAllReviewed}
              className="text-sm font-bold px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition-colors"
            >
              Mark All as Reviewed
            </button>
            <div className="size-9 rounded-full bg-[#695be6] flex items-center justify-center text-white font-bold text-sm">
              {user?.name?.[0] || "T"}
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-[1100px] mx-auto pt-24 px-6 pb-12">

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          {[
            { label: "STUDENTS AT RISK",     value: stats?.students_at_risk     ?? filtered.length },
            { label: "REPEAT OFFENDERS",      value: stats?.repeat_offenders     ?? byPriority.urgent.length },
            { label: "PARENT CONTACT NEEDED", value: stats?.parent_contact_needed ?? (byPriority.urgent.length + byPriority.important.length) },
            { label: "ACTIONS PENDING",       value: stats?.actions_pending      ?? filtered.filter(a => statuses[a._id] === "New").length },
          ].map(s => (
            <div key={s.label} className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wide mb-1">{s.label}</p>
              <p className="text-3xl font-black">{loading ? "—" : (s.value ?? 0)}</p>
            </div>
          ))}
        </div>

        {/* Priority Tabs */}
        <div className="flex gap-6 border-b border-gray-200 mb-6">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`pb-3 text-sm font-bold border-b-2 transition-colors ${
                activeTab === tab.id ? tab.color : "border-transparent text-gray-400"
              }`}
            >
              {tab.label} ({byPriority[tab.id].length})
            </button>
          ))}
        </div>

        {/* Loading */}
        {loading && (
          <div className="flex items-center justify-center py-20">
            <span className="material-symbols-outlined animate-spin text-4xl text-[#695be6]">progress_activity</span>
          </div>
        )}

        {/* Empty state */}
        {!loading && activeAlerts.length === 0 && (
          <div className="text-center py-16 text-gray-400">
            <span className="material-symbols-outlined text-5xl mb-3 block">check_circle</span>
            <p className="font-semibold">No {activeTab} alerts right now</p>
            <p className="text-sm mt-1">
              {classFilter !== "all" ? "Try switching to 'All My Classes'" : "All students are on track"}
            </p>
          </div>
        )}

        {/* Alert Cards */}
        {!loading && activeAlerts.map((alert, idx) => (
          <AlertCard
            key={alert._id}
            alert={alert}
            isFirst={idx === 0 && activeTab === "urgent"}
            status={statuses[alert._id] || "New"}
            note={notes[alert._id] || ""}
            isSnoozed={snoozed[alert._id] || false}
            isReviewed={reviewed[alert._id] || false}
            isSavingNote={savingNote[alert._id] || false}
            onStatusChange={v => handleStatusChange(alert._id, v)}
            onNoteChange={v => setNotes(p => ({ ...p, [alert._id]: v }))}
            onSnooze={() => handleSnooze(alert._id)}
            onReview={() => handleReview(alert._id)}
            onSaveNote={() => handleSaveNote(alert._id)}
            onNavigate={navigate}
          />
        ))}
      </main>

      <footer className="text-center text-xs text-gray-400 py-6 border-t border-gray-100">
        © {new Date().getFullYear()} TrueSchoolAI Platform &nbsp;·&nbsp;
        <a href="#" className="hover:underline">Documentation</a> &nbsp;·&nbsp;
        <a href="#" className="hover:underline">Support</a>
      </footer>
    </div>
  );
}

function AlertCard({
  alert, isFirst,
  status, note, isSnoozed, isReviewed, isSavingNote,
  onStatusChange, onNoteChange, onSnooze, onReview, onSaveNote, onNavigate,
}) {
  const borderColor = {
    urgent:    "border-red-500",
    important: "border-yellow-400",
    routine:   "border-green-400",
  }[alert.priority] || "border-gray-300";

  const initials = (alert.student_name || "??")
    .split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase();

  if (isFirst) {
    // Full expanded card for the top urgent alert
    return (
      <div className={`bg-white rounded-2xl border-l-4 ${borderColor} shadow-sm p-5 mb-4`}>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

          {/* Student Info */}
          <div className="flex gap-4">
            <div className="size-16 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0 text-red-700 font-black text-xl">
              {initials}
            </div>
            <div>
              <p className="font-black text-lg">{alert.student_name}</p>
              <p className="text-xs text-gray-400">
                {alert.student_class || "—"} · ID: {alert.student_id?.slice(-6) || "—"}
              </p>
              <div className="flex gap-1 mt-2 flex-wrap">
                {(alert.tags || []).map(tag => (
                  <span key={tag} className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                    tag === "NEW" ? "bg-blue-100 text-blue-600" : "bg-red-100 text-red-600"
                  }`}>{tag}</span>
                ))}
                <PriorityBadge priority={alert.priority} />
              </div>
            </div>
          </div>

          {/* Performance */}
          <div>
            {alert.performance_drop > 0 && (
              <div className="flex items-center gap-2 mb-2">
                <span className="material-symbols-outlined text-red-500 text-sm">trending_down</span>
                <p className="text-sm font-bold text-red-600">
                  Performance dropped by {alert.performance_drop}%
                </p>
              </div>
            )}
            {(alert.previous_score != null && alert.current_score != null) && (
              <p className="text-xs text-gray-400 mb-2">
                Previous: {alert.previous_score}% → Current: {alert.current_score}%
              </p>
            )}
            <ScoreBar history={alert.score_history || []} />
            <ul className="mt-3 space-y-1">
              {(alert.issues || [alert.message]).map((issue, i) => (
                <li key={i} className="flex items-start gap-1.5 text-xs text-gray-600">
                  <span className="size-1.5 rounded-full bg-red-500 mt-1.5 flex-shrink-0" />
                  {issue}
                </li>
              ))}
            </ul>
            <div className="mt-3">
              <p className="text-[10px] font-bold text-[#695be6] mb-2 flex items-center gap-1">
                <span className="material-symbols-outlined text-xs">auto_awesome</span> SUGGESTED ACTIONS
              </p>
              <div className="flex flex-col gap-2">
                <button
                  onClick={() => onNavigate("/teacher/communication")}
                  className="flex items-center gap-2 bg-blue-600 text-white text-xs font-bold px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
                >
                  <span className="material-symbols-outlined text-sm">calendar_month</span>
                  Schedule Parent Meeting
                </button>
                <button
                  onClick={() => onNavigate("/teacher/homework/differentiated")}
                  className="flex items-center gap-2 border border-gray-200 text-xs font-bold px-4 py-2 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <span className="material-symbols-outlined text-sm">assignment</span>
                  Assign Catch-Up Package
                </button>
              </div>
            </div>
          </div>

          {/* Status & Notes */}
          <div>
            <p className="text-[10px] font-bold text-gray-400 uppercase mb-2">Status</p>
            <select
              value={status}
              onChange={e => onStatusChange(e.target.value)}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white outline-none mb-4"
            >
              <option value="New">New</option>
              <option value="In Progress">In Progress</option>
              <option value="reviewed">Reviewed</option>
              <option value="Resolved">Resolved</option>
            </select>
            <button
              onClick={() => onNavigate("/teacher/communication")}
              className="w-full flex items-center gap-2 border border-gray-200 text-sm font-semibold px-4 py-2 rounded-lg hover:bg-gray-50 transition-colors mb-2"
            >
              <span className="material-symbols-outlined text-base">mail</span> Contact Parent
            </button>
            <button
              onClick={() => onNavigate(`/teacher/students/${alert.student_id}`)}
              className="w-full flex items-center gap-2 border border-gray-200 text-sm font-semibold px-4 py-2 rounded-lg hover:bg-gray-50 transition-colors mb-4"
            >
              <span className="material-symbols-outlined text-base">person</span> View Student Profile
            </button>
            <p className="text-[10px] font-bold text-gray-400 uppercase mb-1">Private Notes</p>
            <textarea
              value={note}
              onChange={e => onNoteChange(e.target.value)}
              placeholder="Add internal documentation..."
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-[#695be6] resize-none h-20"
            />
          </div>
        </div>

        <div className="flex justify-end gap-4 mt-4 pt-4 border-t border-gray-100">
          <button
            onClick={onSnooze}
            className={`flex items-center gap-1.5 text-xs font-medium transition-colors ${
              isSnoozed ? "text-amber-600 font-bold" : "text-gray-500 hover:text-gray-700"
            }`}
          >
            <span className="material-symbols-outlined text-sm">snooze</span>
            {isSnoozed ? "Snoozed ✓" : "Snooze Alert"}
          </button>
          <button
            onClick={onSaveNote}
            disabled={isSavingNote}
            className="flex items-center gap-1.5 text-xs font-bold text-blue-600 hover:underline disabled:opacity-50"
          >
            <span className="material-symbols-outlined text-sm">save</span>
            {isSavingNote ? "Saving..." : "Save Note"}
          </button>
          <button
            onClick={onReview}
            className={`flex items-center gap-1.5 text-xs font-bold transition-colors ${
              isReviewed ? "text-green-600" : "text-[#695be6] hover:underline"
            }`}
          >
            <span className="material-symbols-outlined text-sm">check_circle</span>
            {isReviewed ? "Reviewed ✓" : "Mark as Reviewed"}
          </button>
        </div>
      </div>
    );
  }

  // Compact card for non-first alerts
  return (
    <div className={`bg-white rounded-xl border-l-4 ${borderColor} shadow-sm p-4 mb-3`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="size-10 rounded-full bg-gray-100 flex items-center justify-center font-bold text-sm text-gray-600">
            {initials}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <p className="font-bold text-sm">{alert.student_name}</p>
              <PriorityBadge priority={alert.priority} />
            </div>
            <p className="text-xs text-gray-500">
              {alert.issues?.[0] || alert.message || "Needs attention"}
            </p>
            {alert.student_class && (
              <p className="text-[10px] text-gray-400">{alert.student_class}</p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <select
            value={status}
            onChange={e => onStatusChange(e.target.value)}
            className="border border-gray-200 rounded-lg px-2 py-1 text-xs bg-white outline-none"
          >
            <option value="New">New</option>
            <option value="In Progress">In Progress</option>
            <option value="reviewed">Reviewed</option>
            <option value="Resolved">Resolved</option>
          </select>
          <button
            onClick={onReview}
            className={`text-xs font-bold ${isReviewed ? "text-green-600" : "text-[#695be6]"}`}
          >
            {isReviewed ? "✓" : "Review"}
          </button>
          <button
            onClick={() => onNavigate(`/teacher/students/${alert.student_id}`)}
            className="p-1 hover:bg-gray-100 rounded-lg"
          >
            <span className="material-symbols-outlined text-gray-400 text-lg">open_in_new</span>
          </button>
        </div>
      </div>
    </div>
  );
}
