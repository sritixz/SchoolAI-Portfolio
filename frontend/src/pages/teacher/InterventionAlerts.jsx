import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { interventionAlerts } from "../../data/teacherData";

const PRIORITY_TABS = [
  { id: "urgent",    label: "URGENT",    count: 5, color: "text-red-600 border-red-500" },
  { id: "important", label: "IMPORTANT", count: 4, color: "text-yellow-600 border-yellow-500" },
  { id: "routine",   label: "ROUTINE",   count: 3, color: "text-blue-600 border-blue-500" },
];

function ScoreBar({ history }) {
  const max = Math.max(...history);
  return (
    <div className="flex items-end gap-0.5 h-8">
      {history.map((v, i) => (
        <div
          key={i}
          className={`w-4 rounded-sm ${v < 50 ? "bg-red-400" : v < 70 ? "bg-orange-400" : "bg-green-400"}`}
          style={{ height: `${(v / max) * 100}%` }}
        />
      ))}
    </div>
  );
}

export default function InterventionAlerts() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("urgent");
  const [classFilter, setClassFilter] = useState("All My Classes");
  const [notes, setNotes] = useState({});
  const [statuses, setStatuses] = useState({});
  const [snoozed, setSnoozed] = useState({});
  const [reviewed, setReviewed] = useState({});
  const [allReviewed, setAllReviewed] = useState(false);

  const urgentAlert = interventionAlerts.urgent[0];

  return (
    <div className="bg-[#fff5f5] min-h-screen" style={{ fontFamily: "'Lexend', sans-serif" }}>

      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-white border-b border-gray-200">
        <div className="max-w-[1100px] mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button onClick={() => navigate("/teacher")} className="p-2 hover:bg-gray-100 rounded-lg">
              <span className="material-symbols-outlined text-gray-500">arrow_back</span>
            </button>
            <h1 className="text-xl font-black">Intervention Alerts</h1>
            <span className="bg-red-500 text-white text-xs font-bold px-2 py-0.5 rounded-full">
              {interventionAlerts.stats.actionsPending}
            </span>
          </div>
          <div className="flex items-center gap-3">
            <select
              value={classFilter}
              onChange={(e) => setClassFilter(e.target.value)}
              className="border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white outline-none"
            >
              <option>All My Classes</option>
              <option>Grade 8A</option>
              <option>Grade 8B</option>
              <option>Grade 9A</option>
            </select>
            <button
              onClick={() => setAllReviewed(true)}
              className={`text-sm font-bold px-4 py-2 rounded-lg transition-colors ${allReviewed ? "bg-green-100 text-green-700" : "bg-blue-600 text-white hover:bg-blue-700"}`}
            >
              {allReviewed ? "✓ All Reviewed" : "Mark All as Reviewed"}
            </button>
            <div className="relative p-2 hover:bg-gray-100 rounded-lg cursor-pointer">
              <span className="material-symbols-outlined text-gray-600">notifications</span>
            </div>
            <div className="size-9 rounded-full bg-[#695be6] flex items-center justify-center text-white font-bold text-sm">P</div>
          </div>
        </div>
      </header>

      <main className="max-w-[1100px] mx-auto pt-24 px-6 pb-12">

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          {[
            { label: "STUDENTS AT RISK",      value: interventionAlerts.stats.studentsAtRisk },
            { label: "REPEAT OFFENDERS",       value: interventionAlerts.stats.repeatOffenders },
            { label: "PARENT CONTACT NEEDED",  value: interventionAlerts.stats.parentContactNeeded },
            { label: "ACTIONS PENDING",        value: interventionAlerts.stats.actionsPending },
          ].map((s) => (
            <div key={s.label} className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wide mb-1">{s.label}</p>
              <p className="text-3xl font-black">{s.value}</p>
            </div>
          ))}
        </div>

        {/* Priority Tabs */}
        <div className="flex gap-6 border-b border-gray-200 mb-6">
          {PRIORITY_TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`pb-3 text-sm font-bold border-b-2 transition-colors ${
                activeTab === tab.id ? tab.color : "border-transparent text-gray-400"
              }`}
            >
              {tab.label} ({tab.count})
            </button>
          ))}
        </div>

        {activeTab === "urgent" && (
          <>
            <h2 className="font-black text-lg mb-4">Priority Intervention Required</h2>

            {/* Urgent Card */}
            <div className="bg-white rounded-2xl border-l-4 border-red-500 shadow-sm p-5 mb-4">
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Student Info */}
                <div className="flex gap-4">
                  <div className="size-16 rounded-full bg-gray-200 flex items-center justify-center flex-shrink-0 overflow-hidden">
                    <span className="material-symbols-outlined text-gray-400 text-3xl">person</span>
                  </div>
                  <div>
                    <p className="font-black text-lg">{urgentAlert.studentName}</p>
                    <p className="text-xs text-gray-400">Student ID: {urgentAlert.studentId}</p>
                    <div className="flex gap-1 mt-2 flex-wrap">
                      {urgentAlert.tags.map((tag) => (
                        <span key={tag} className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          tag === "NEW" ? "bg-blue-100 text-blue-600" : "bg-red-100 text-red-600"
                        }`}>{tag}</span>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Performance */}
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <span className="material-symbols-outlined text-red-500 text-sm">trending_down</span>
                    <p className="text-sm font-bold text-red-600">Performance dropped by {urgentAlert.performanceDrop}%</p>
                  </div>
                  <p className="text-xs text-gray-400 mb-2">
                    Previous: {urgentAlert.previousScore}% → Current: {urgentAlert.currentScore}%
                  </p>
                  <ScoreBar history={urgentAlert.scoreHistory} />
                  <ul className="mt-3 space-y-1">
                    {urgentAlert.issues.map((issue) => (
                      <li key={issue} className="flex items-start gap-1.5 text-xs text-gray-600">
                        <span className="size-1.5 rounded-full bg-red-500 mt-1.5 flex-shrink-0"></span>
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
                        onClick={() => navigate("/teacher/communication")}
                        className="flex items-center gap-2 bg-blue-600 text-white text-xs font-bold px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
                      >
                        <span className="material-symbols-outlined text-sm">calendar_month</span> Schedule Parent Meeting
                      </button>
                      <button
                        onClick={() => navigate("/teacher/homework/differentiated")}
                        className="flex items-center gap-2 border border-gray-200 text-xs font-bold px-4 py-2 rounded-lg hover:bg-gray-50 transition-colors"
                      >
                        <span className="material-symbols-outlined text-sm">assignment</span> Assign Catch-Up Package
                      </button>
                    </div>
                  </div>
                </div>

                {/* Status & Notes */}
                <div>
                  <p className="text-[10px] font-bold text-gray-400 uppercase mb-2">Status</p>
                  <select
                    value={statuses[urgentAlert.id] || "New"}
                    onChange={(e) => setStatuses({ ...statuses, [urgentAlert.id]: e.target.value })}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white outline-none mb-4"
                  >
                    <option>New</option>
                    <option>In Progress</option>
                    <option>Resolved</option>
                  </select>
                  <button
                    onClick={() => navigate("/teacher/communication")}
                    className="w-full flex items-center gap-2 border border-gray-200 text-sm font-semibold px-4 py-2 rounded-lg hover:bg-gray-50 transition-colors mb-2"
                  >
                    <span className="material-symbols-outlined text-base">mail</span> Contact Parent
                  </button>
                  <button
                    onClick={() => navigate("/teacher/analytics")}
                    className="w-full flex items-center gap-2 border border-gray-200 text-sm font-semibold px-4 py-2 rounded-lg hover:bg-gray-50 transition-colors mb-4"
                  >
                    <span className="material-symbols-outlined text-base">person</span> View Student Profile
                  </button>
                  <p className="text-[10px] font-bold text-gray-400 uppercase mb-1">Private Notes</p>
                  <textarea
                    value={notes[urgentAlert.id] || ""}
                    onChange={(e) => setNotes({ ...notes, [urgentAlert.id]: e.target.value })}
                    placeholder="Add internal documentation..."
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-[#695be6] resize-none h-20"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-4 mt-4 pt-4 border-t border-gray-100">
                <button
                  onClick={() => setSnoozed((p) => ({ ...p, [urgentAlert.id]: !p[urgentAlert.id] }))}
                  className={`flex items-center gap-1.5 text-xs font-medium transition-colors ${snoozed[urgentAlert.id] ? "text-amber-600" : "text-gray-500 hover:text-gray-700"}`}
                >
                  <span className="material-symbols-outlined text-sm">snooze</span>
                  {snoozed[urgentAlert.id] ? "Snoozed" : "Snooze Alert"}
                </button>
                <button
                  onClick={() => setReviewed((p) => ({ ...p, [urgentAlert.id]: !p[urgentAlert.id] }))}
                  className={`flex items-center gap-1.5 text-xs font-bold transition-colors ${reviewed[urgentAlert.id] ? "text-green-600" : "text-[#695be6] hover:underline"}`}
                >
                  <span className="material-symbols-outlined text-sm">check_circle</span>
                  {reviewed[urgentAlert.id] ? "Reviewed ✓" : "Mark as Reviewed"}
                </button>
              </div>
            </div>

            {/* Other alerts */}
            {[...interventionAlerts.important, ...interventionAlerts.routine].map((alert) => (
              <div
                key={alert.id}
                className={`bg-white rounded-xl border-l-4 shadow-sm p-4 mb-3 flex items-center justify-between ${
                  alert.priority === "important" ? "border-yellow-400" : "border-green-400"
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className="size-10 rounded-full bg-gray-200 flex items-center justify-center overflow-hidden">
                    <span className="material-symbols-outlined text-gray-400">person</span>
                  </div>
                  <div>
                    <p className="font-bold text-sm">{alert.studentName}</p>
                    <p className="text-xs text-gray-500">{alert.message}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-xs text-gray-400">{alert.timeAgo}</span>
                  <button className="p-1 hover:bg-gray-100 rounded-lg">
                    <span className="material-symbols-outlined text-gray-400 text-lg">more_vert</span>
                  </button>
                </div>
              </div>
            ))}
          </>
        )}

        {activeTab !== "urgent" && (
          <div className="text-center py-16 text-gray-400">
            <span className="material-symbols-outlined text-5xl mb-3 block">check_circle</span>
            <p className="font-semibold">No {activeTab} alerts right now</p>
          </div>
        )}
      </main>

      <footer className="text-center text-xs text-gray-400 py-6 border-t border-gray-100">
        © 2024 ProactiveEdu AI Platform &nbsp;·&nbsp;
        <a href="#" className="hover:underline">Documentation</a> &nbsp;·&nbsp;
        <a href="#" className="hover:underline">Support</a>
      </footer>
    </div>
  );
}
