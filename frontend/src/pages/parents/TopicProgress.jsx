import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { topicProgressData } from "../../data/parentData";

const { overall, topics } = topicProgressData;

const TABS = ["All Subjects", "Mathematics", "Physics", "Chemistry", "Biology", "English"];

const STATUS_COLORS = {
  "Critical Gap": { bar: "bg-red-500", text: "text-red-600", badge: "bg-red-100 text-red-600" },
  "Proficient": { bar: "bg-green-500", text: "text-green-600", badge: "bg-green-100 text-green-600" },
  "Developing": { bar: "bg-yellow-400", text: "text-yellow-600", badge: "bg-yellow-100 text-yellow-600" },
  "Needs Practice": { bar: "bg-orange-400", text: "text-orange-600", badge: "bg-orange-100 text-orange-600" },
};

const LEGEND = [
  { label: "Proficient", color: "bg-green-500", count: overall.proficient },
  { label: "Developing", color: "bg-yellow-400", count: overall.developing },
  { label: "Needs Practice", color: "bg-orange-400", count: overall.needsPractice },
  { label: "Critical Gap", color: "bg-red-500", count: overall.criticalGap },
];

export default function ParentTopicProgress() {
  const navigate = useNavigate();
  const [tab, setTab] = useState("All Subjects");

  // Donut segments (simplified)
  const total = overall.total;
  const segments = [
    { pct: (overall.proficient / total) * 100, color: "#22c55e" },
    { pct: (overall.developing / total) * 100, color: "#facc15" },
    { pct: (overall.needsPractice / total) * 100, color: "#fb923c" },
    { pct: (overall.criticalGap / total) * 100, color: "#ef4444" },
  ];

  const filteredTopics = tab === "All Subjects" ? topics :
    topics.filter((t) => t.subject === tab);
  let cum = 0;
  const conicParts = segments.map((s) => {
    const start = cum;
    cum += s.pct;
    return `${s.color} ${start.toFixed(1)}% ${cum.toFixed(1)}%`;
  });
  const conicGradient = `conic-gradient(${conicParts.join(", ")})`;

  return (
    <div className="bg-[#f6f6f8] min-h-screen pb-10" style={{ fontFamily: "'Lexend', sans-serif" }}>
      {/* Header */}
      <div className="bg-white border-b border-gray-100 px-4 py-4">
        <div className="flex items-center gap-3 mb-1">
          <button onClick={() => navigate("/parent")} className="size-9 flex items-center justify-center rounded-xl hover:bg-gray-100">
            <span className="material-symbols-outlined text-xl">arrow_back</span>
          </button>
          <div>
            <p className="text-xs text-gray-400">Dashboard › Topic Progress</p>
            <h1 className="text-lg font-bold">Topic Progress</h1>
            <p className="text-xs text-gray-400">Detailed breakdown of topic mastery and learning gaps</p>
          </div>
        </div>
        {/* Tabs */}
        <div className="flex gap-1 overflow-x-auto mt-3 pb-1">
          {TABS.map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`shrink-0 px-3 py-1.5 text-sm font-semibold rounded-full transition-colors ${tab === t ? "text-[#695be6] border-b-2 border-[#695be6]" : "text-gray-500"}`}
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 pt-4 space-y-4">
        {/* Info Banner */}
        <div className="bg-amber-50 border border-amber-100 rounded-xl p-3 flex items-start gap-3">
          <span className="material-symbols-outlined text-amber-500 text-xl mt-0.5">info</span>
          <div className="flex-1">
            <p className="text-sm font-bold text-gray-800">Focus is on concept understanding, not just scores</p>
            <p className="text-xs text-gray-500">Our AI analyzes the depth of understanding to identify core conceptual gaps versus simple mistakes.</p>
          </div>
          <button onClick={() => navigate("/parent/support")} className="text-xs text-[#695be6] font-semibold shrink-0">Learn more →</button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Overall Progress Donut */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
            <div className="flex items-center justify-between mb-3">
              <p className="font-bold">Overall Progress</p>
              <span className="text-xs text-gray-400">{overall.total} Topics Total</span>
            </div>
            <div className="flex justify-center mb-4">
              <div className="relative size-32">
                <div className="size-32 rounded-full" style={{ background: conicGradient }}></div>
                <div className="absolute inset-4 bg-white rounded-full flex flex-col items-center justify-center">
                  <p className="text-2xl font-black">{overall.pct}%</p>
                  <p className="text-[10px] text-gray-400 font-bold">PROFICIENT</p>
                </div>
              </div>
            </div>
            <div className="space-y-2">
              {LEGEND.map((l) => (
                <div key={l.label} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className={`size-2.5 rounded-full ${l.color}`}></span>
                    <span className="text-sm text-gray-600">{l.label}</span>
                  </div>
                  <span className="font-bold text-sm">{l.count}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Topic Breakdown */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <p className="font-bold">Topic Breakdown</p>
              <button onClick={() => setTab("All Subjects")} className="text-sm text-[#695be6] font-semibold">View All</button>
            </div>
            {filteredTopics.map((t) => {
              const sc = STATUS_COLORS[t.status] || STATUS_COLORS["Developing"];
              return (
                <div key={t.name} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-3">
                  <div className="flex items-start justify-between mb-1">
                    <div>
                      <p className="font-bold text-sm">{t.name}</p>
                      <p className="text-xs text-gray-400">{t.concepts}</p>
                    </div>
                    <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${sc.badge}`}>{t.score}% SCORE</span>
                  </div>
                  <div className="w-full bg-gray-100 rounded-full h-1.5 mb-1">
                    <div className={`h-1.5 rounded-full ${sc.bar}`} style={{ width: `${t.score}%` }}></div>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-gray-400">Progress</span>
                    <span className={`text-xs font-bold ${sc.text}`}>{t.status}</span>
                  </div>
                  {t.recommendation && (
                    <div className="mt-2 bg-red-50 rounded-lg p-2 flex gap-1.5">
                      <span className="material-symbols-outlined text-red-500 text-sm mt-0.5">warning</span>
                      <div>
                        <p className="text-[10px] font-bold text-red-600">RECOMMENDATION</p>
                        <p className="text-xs text-gray-600">{t.recommendation}</p>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
