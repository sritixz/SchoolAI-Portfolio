import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { getInitial } from "../../utils/nameUtils";
import api from "../../api";

const SEVERITY_CONFIG = {
  critical: { label: "Critical", bg: "bg-red-100", text: "text-red-700", border: "border-l-red-500", dot: "bg-red-500" },
  high: { label: "High", bg: "bg-orange-100", text: "text-orange-700", border: "border-l-orange-400", dot: "bg-orange-400" },
  medium: { label: "Medium", bg: "bg-amber-100", text: "text-amber-700", border: "border-l-amber-400", dot: "bg-amber-400" },
  moderate: { label: "Moderate", bg: "bg-amber-100", text: "text-amber-700", border: "border-l-amber-400", dot: "bg-amber-400" },
  low: { label: "Low", bg: "bg-green-100", text: "text-green-700", border: "border-l-green-400", dot: "bg-green-400" },
  minor: { label: "Minor", bg: "bg-slate-100", text: "text-slate-600", border: "border-l-slate-300", dot: "bg-slate-400" },
};

const SUBJECT_COLORS = {
  Math: "bg-purple-100 text-purple-700",
  Physics: "bg-blue-100 text-blue-700",
  Chemistry: "bg-emerald-100 text-emerald-700",
  Biology: "bg-teal-100 text-teal-700",
  History: "bg-amber-100 text-amber-700",
  English: "bg-pink-100 text-pink-700",
  Science: "bg-cyan-100 text-cyan-700",
};

export default function StudentLearningGaps() {
  const navigate = useNavigate();
  const { studentId } = useParams();
  const { user } = useAuth();

  const [gaps, setGaps] = useState([]);
  const [studentName, setStudentName] = useState("");
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all"); // all, active, resolved

  useEffect(() => {
    loadData();
  }, [studentId]);

  const loadData = async () => {
    try {
      setLoading(true);
      const [gapsResp, profileResp] = await Promise.all([
        api.get(`/teacher/students/${studentId}/learning-gaps`),
        api.get(`/teacher/students/${studentId}/profile`),
      ]);
      setGaps(gapsResp.data);
      setStudentName(profileResp.data.name || "Student");
    } catch (err) {
      console.error("Failed to load learning gaps:", err);
    } finally {
      setLoading(false);
    }
  };

  const filtered = gaps.filter((g) => {
    if (filter === "active") return !g.resolved;
    if (filter === "resolved") return g.resolved;
    return true;
  });

  const activeCount = gaps.filter((g) => !g.resolved).length;
  const resolvedCount = gaps.filter((g) => g.resolved).length;

  const subjects = [...new Set(gaps.map((g) => g.subject).filter(Boolean))];
  const severityCounts = gaps.reduce((acc, g) => {
    if (!g.resolved) {
      const sev = g.severity || "medium";
      acc[sev] = (acc[sev] || 0) + 1;
    }
    return acc;
  }, {});

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="size-12 border-4 border-[#695be6] border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-500">Loading learning gaps...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-[#faf9ff] min-h-screen" style={{ fontFamily: "'Lexend', sans-serif" }}>
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-white border-b border-gray-200">
        <div className="max-w-[1400px] mx-auto px-4 sm:px-6 h-16 flex items-center gap-3">
          <button onClick={() => navigate(-1)} className="p-2 hover:bg-gray-100 rounded-lg flex-shrink-0">
            <span className="material-symbols-outlined text-gray-500">arrow_back</span>
          </button>
          <div className="size-8 bg-[#695be6] rounded-lg flex items-center justify-center text-white flex-shrink-0">
            <span className="material-symbols-outlined text-lg">analytics</span>
          </div>
          <div className="min-w-0">
            <h1 className="font-black text-base sm:text-lg truncate">Learning Gaps</h1>
            <p className="text-xs text-gray-400 truncate">{studentName}</p>
          </div>
          <div className="ml-auto flex items-center gap-3">
            <div className="size-9 rounded-full bg-[#695be6] flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
              {getInitial(user?.name) || "T"}
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-[1400px] mx-auto pt-20 sm:pt-24 px-4 sm:px-6 pb-12">
        {/* Summary Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
          <div className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm text-center">
            <p className="text-2xl font-black text-[#695be6]">{gaps.length}</p>
            <p className="text-xs text-gray-500 mt-1">Total Gaps</p>
          </div>
          <div className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm text-center">
            <p className="text-2xl font-black text-red-600">{activeCount}</p>
            <p className="text-xs text-gray-500 mt-1">Active</p>
          </div>
          <div className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm text-center">
            <p className="text-2xl font-black text-green-600">{resolvedCount}</p>
            <p className="text-xs text-gray-500 mt-1">Resolved</p>
          </div>
          <div className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm text-center">
            <p className="text-2xl font-black text-amber-600">{subjects.length}</p>
            <p className="text-xs text-gray-500 mt-1">Subjects</p>
          </div>
        </div>

        {/* Severity Breakdown */}
        {Object.keys(severityCounts).length > 0 && (
          <div className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm mb-6">
            <p className="text-sm font-bold text-gray-600 mb-3">Active Gaps by Severity</p>
            <div className="flex flex-wrap gap-3">
              {Object.entries(severityCounts).map(([sev, count]) => {
                const cfg = SEVERITY_CONFIG[sev] || SEVERITY_CONFIG.medium;
                return (
                  <div key={sev} className="flex items-center gap-2">
                    <div className={`size-3 rounded-full ${cfg.dot}`}></div>
                    <span className="text-sm font-medium text-gray-700 capitalize">{cfg.label}</span>
                    <span className={`text-xs font-bold px-2 py-0.5 rounded ${cfg.bg} ${cfg.text}`}>{count}</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Filter Tabs */}
        <div className="flex gap-2 mb-6">
          {[
            { key: "all", label: `All (${gaps.length})` },
            { key: "active", label: `Active (${activeCount})` },
            { key: "resolved", label: `Resolved (${resolvedCount})` },
          ].map((tab) => (
            <button
              key={tab.key}
              onClick={() => setFilter(tab.key)}
              className={`px-4 py-2 rounded-xl text-sm font-bold transition-all ${
                filter === tab.key
                  ? "bg-[#695be6] text-white"
                  : "bg-white border border-gray-200 text-gray-600 hover:border-[#695be6]"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Gaps List */}
        {filtered.length === 0 ? (
          <div className="text-center py-20">
            <div className="size-20 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-4">
              <span className="material-symbols-outlined text-gray-400 text-4xl">check_circle</span>
            </div>
            <p className="text-gray-500 font-medium">
              {filter === "resolved" ? "No resolved gaps yet" : "No learning gaps found"}
            </p>
            <p className="text-sm text-gray-400 mt-1">
              {filter === "active" ? "All gaps have been resolved!" : "Learning gaps will appear here when identified."}
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {filtered.map((gap) => {
              const sev = SEVERITY_CONFIG[gap.severity] || SEVERITY_CONFIG.medium;
              const subjColor = SUBJECT_COLORS[gap.subject] || "bg-gray-100 text-gray-600";
              return (
                <div
                  key={gap.id}
                  className={`bg-white rounded-xl border-l-4 ${sev.border} border-y border-r border-gray-100 shadow-sm p-5 hover:shadow-md transition-shadow ${gap.resolved ? "opacity-70" : ""}`}
                >
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2 mb-1.5">
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase ${subjColor}`}>
                          {gap.subject}
                        </span>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase ${sev.bg} ${sev.text}`}>
                          {sev.label}
                        </span>
                        {gap.resolved && (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-green-100 text-green-700 uppercase">
                            Resolved
                          </span>
                        )}
                      </div>
                      <h3 className="font-black text-base text-gray-900">{gap.topic}</h3>
                      {gap.subtopic && <p className="text-sm text-gray-400">{gap.subtopic}</p>}
                    </div>
                    {gap.mastery_percent > 0 && (
                      <div className="text-right shrink-0">
                        <p className="text-xs text-gray-400">Mastery</p>
                        <p className="text-lg font-black text-[#695be6]">{gap.mastery_percent}%</p>
                      </div>
                    )}
                  </div>

                  {/* Meta info */}
                  <div className="flex flex-wrap gap-4 text-xs text-gray-500">
                    {gap.identified_from && (
                      <span className="flex items-center gap-1">
                        <span className="material-symbols-outlined text-sm">description</span>
                        {typeof gap.identified_from === "object" ? gap.identified_from.title : gap.identified_from}
                      </span>
                    )}
                    {gap.recommended_time && (
                      <span className="flex items-center gap-1">
                        <span className="material-symbols-outlined text-sm">schedule</span>
                        {gap.recommended_time} min recommended
                      </span>
                    )}
                  </div>

                  {gap.impact_analysis && (
                    <p className="mt-3 text-sm text-gray-600 bg-gray-50 rounded-lg p-3">
                      <span className="font-semibold">Impact:</span> {gap.impact_analysis}
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
