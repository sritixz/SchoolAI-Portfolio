import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { growthPortfolioData } from "../../data/parentData";

const TYPE_CONFIG = {
  parent_reflection: { icon: "favorite", color: "text-pink-500", bg: "bg-pink-50", label: "Parent Reflection" },
  milestone:         { icon: "emoji_events", color: "text-amber-500", bg: "bg-amber-50", label: "Milestone" },
  teacher_note:      { icon: "school", color: "text-[#695be6]", bg: "bg-[#695be6]/10", label: "Teacher Note" },
};

export default function GrowthPortfolio() {
  const navigate = useNavigate();
  const { child, stats, entries, summary } = growthPortfolioData;
  const [showForm, setShowForm] = useState(false);
  const [reflection, setReflection] = useState("");

  return (
    <div className="bg-[#f6f6f8] min-h-screen pb-10" style={{ fontFamily: "'Lexend', sans-serif" }}>

      {/* Header */}
      <div className="bg-white border-b border-gray-100 px-4 py-3 flex items-center gap-3">
        <button onClick={() => navigate("/parent")} className="size-9 flex items-center justify-center rounded-xl hover:bg-gray-100">
          <span className="material-symbols-outlined text-xl">arrow_back</span>
        </button>
        <div className="flex gap-4 text-sm font-semibold">
          <button onClick={() => navigate("/parent")} className="text-gray-400 hover:text-[#695be6]">Dashboard</button>
          <span className="text-[#695be6] border-b-2 border-[#695be6] pb-1">Growth Portfolio</span>
        </div>
        <div className="ml-auto size-8 rounded-full bg-gray-200 flex items-center justify-center">
          <span className="material-symbols-outlined text-gray-500 text-base">person</span>
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4 pt-4">
        <p className="text-xs text-gray-400 mb-1">Dashboard › Growth Portfolio</p>
        <h1 className="text-2xl font-black mb-0.5">{child.name}'s Growth Portfolio</h1>
        <p className="text-xs text-gray-400 mb-4">{child.year}</p>

        {/* Stats Row */}
        <div className="grid grid-cols-3 gap-3 mb-4">
          {[
            { icon: "emoji_events", color: "text-amber-500", bg: "bg-amber-50", value: stats.achievements, label: "Achievements" },
            { icon: "assignment_turned_in", color: "text-[#695be6]", bg: "bg-[#695be6]/10", value: stats.homework, label: "Homework Done" },
            { icon: "trending_up", color: "text-emerald-500", bg: "bg-emerald-50", value: stats.growth, label: "Growth" },
          ].map((s) => (
            <div key={s.label} className={`${s.bg} rounded-2xl p-3 text-center`}>
              <span className={`material-symbols-outlined ${s.color} text-2xl`}>{s.icon}</span>
              <p className="font-black text-lg mt-0.5">{s.value}</p>
              <p className="text-xs text-gray-500">{s.label}</p>
            </div>
          ))}
        </div>

        {/* Progress Summary */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 mb-4">
          <h2 className="font-bold mb-3">Year Summary</h2>
          <div className="mb-3">
            <div className="flex justify-between text-xs font-semibold mb-1">
              <span>Assignment Completion</span>
              <span className="text-[#695be6]">{summary.assignmentCompletion}%</span>
            </div>
            <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
              <div className="h-full bg-[#695be6] rounded-full" style={{ width: `${summary.assignmentCompletion}%` }} />
            </div>
          </div>
          <div>
            <div className="flex justify-between text-xs font-semibold mb-1">
              <span>Character Development Points</span>
              <span className="text-amber-500">{summary.charDevPoints}/{summary.charDevTotal}</span>
            </div>
            <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
              <div className="h-full bg-amber-400 rounded-full" style={{ width: `${(summary.charDevPoints / summary.charDevTotal) * 100}%` }} />
            </div>
          </div>
        </div>

        {/* Add Reflection */}
        <div className="bg-[#695be6]/5 border border-[#695be6]/20 rounded-2xl p-4 mb-4">
          {!showForm ? (
            <button
              onClick={() => setShowForm(true)}
              className="w-full flex items-center gap-3 text-left"
            >
              <div className="size-10 bg-[#695be6] rounded-xl flex items-center justify-center shrink-0">
                <span className="material-symbols-outlined text-white text-xl">add</span>
              </div>
              <div>
                <p className="font-bold text-sm text-[#695be6]">Add a Parent Reflection</p>
                <p className="text-xs text-gray-500">Share a proud moment or observation about Aarav</p>
              </div>
            </button>
          ) : (
            <div>
              <p className="font-bold text-sm mb-2">Share a Reflection</p>
              <textarea
                value={reflection}
                onChange={(e) => setReflection(e.target.value)}
                placeholder="Describe a proud moment, growth you've noticed, or something special Aarav did..."
                className="w-full border border-gray-200 rounded-xl p-3 text-sm outline-none focus:border-[#695be6] resize-none h-24 bg-white"
              />
              <div className="flex gap-2 mt-2">
                <button
                  onClick={() => { setShowForm(false); setReflection(""); }}
                  className="flex-1 border border-gray-200 bg-white rounded-xl py-2 text-sm font-bold text-gray-600 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={() => { setShowForm(false); setReflection(""); }}
                  className="flex-1 bg-[#695be6] text-white rounded-xl py-2 text-sm font-bold"
                >
                  Save Reflection
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Timeline Entries */}
        <h2 className="font-bold mb-3">Portfolio Timeline</h2>
        <div className="space-y-3">
          {entries.map((entry) => {
            const cfg = TYPE_CONFIG[entry.type] || TYPE_CONFIG.milestone;
            return (
              <div key={entry.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
                <div className="flex items-start gap-3">
                  <div className={`size-9 ${cfg.bg} rounded-xl flex items-center justify-center shrink-0 mt-0.5`}>
                    <span className={`material-symbols-outlined ${cfg.color} text-xl`}>{cfg.icon}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <span className={`text-[10px] font-bold uppercase tracking-wide ${cfg.color}`}>{cfg.label}</span>
                      <span className="text-xs text-gray-400 shrink-0">{entry.date}</span>
                    </div>
                    {entry.tags && (
                      <div className="flex gap-1 mb-1">
                        {entry.tags.map((t) => (
                          <span key={t} className="text-[10px] font-bold bg-[#695be6]/10 text-[#695be6] px-2 py-0.5 rounded-full">{t}</span>
                        ))}
                      </div>
                    )}
                    <p className="font-bold text-sm mb-1">{entry.title}</p>
                    {entry.teacher && (
                      <p className="text-xs text-gray-400 mb-1">{entry.teacher} · <span className="font-semibold">{entry.role}</span></p>
                    )}
                    <p className="text-xs text-gray-600 leading-relaxed">{entry.text}</p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div className="mt-8 text-center text-xs text-gray-400 py-4 border-t border-gray-200">
          © 2024 Parent Portal. All rights reserved.
          <div className="flex justify-center gap-4 mt-1">
            {["Privacy Policy", "Terms of Service", "Help Center"].map((l) => (
              <button key={l} onClick={() => navigate("/parent")} className="hover:text-gray-600">{l}</button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
