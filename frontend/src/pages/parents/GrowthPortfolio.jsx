import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import {
  fetchParentDashboard,
  fetchGrowthPortfolio,
  addPortfolioEntry,
  selectChildren,
  selectPortfolio,
} from "../../store/slices/parentSlice";

const TYPE_CONFIG = {
  parent_reflection: { icon: "favorite",      color: "text-pink-500",    bg: "bg-pink-50",         label: "Parent Reflection" },
  milestone:         { icon: "emoji_events",  color: "text-amber-500",   bg: "bg-amber-50",        label: "Milestone" },
  teacher_note:      { icon: "school",        color: "text-[#695be6]",   bg: "bg-[#695be6]/10",    label: "Teacher Note" },
};

export default function GrowthPortfolio() {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const [showForm, setShowForm] = useState(false);
  const [title, setTitle] = useState("");
  const [reflection, setReflection] = useState("");
  const [saving, setSaving] = useState(false);

  const children = useSelector(selectChildren);
  const entries = useSelector(selectPortfolio);

  useEffect(() => {
    dispatch(fetchParentDashboard()).then((res) => {
      const kids = res.payload?.children || [];
      if (kids.length > 0) dispatch(fetchGrowthPortfolio(kids[0]._id));
    });
  }, [dispatch]);

  const child = children[0];

  const handleSave = async () => {
    if (!child || !title.trim() || !reflection.trim()) return;
    setSaving(true);
    await dispatch(addPortfolioEntry({ childId: child._id, title, text: reflection }));
    dispatch(fetchGrowthPortfolio(child._id));
    setShowForm(false);
    setTitle("");
    setReflection("");
    setSaving(false);
  };

  const milestones = entries.filter((e) => e.type === "milestone").length;
  const hwDone = entries.filter((e) => e.type === "teacher_note").length;

  return (
    <div className="bg-[#f6f6f8] min-h-screen pb-10" style={{ fontFamily: "'Lexend', sans-serif" }}>
      <div className="bg-white border-b border-gray-100 px-4 py-3 flex items-center gap-3">
        <button onClick={() => navigate("/parent")} className="size-9 flex items-center justify-center rounded-xl hover:bg-gray-100">
          <span className="material-symbols-outlined text-xl">arrow_back</span>
        </button>
        <span className="text-[#695be6] font-semibold text-sm border-b-2 border-[#695be6] pb-1">Growth Portfolio</span>
      </div>

      <div className="max-w-lg mx-auto px-4 pt-4">
        <h1 className="text-2xl font-black mb-0.5">{child?.name || "Child"}'s Growth Portfolio</h1>
        <p className="text-xs text-gray-400 mb-4">Academic Year 2025-2026</p>

        <div className="grid grid-cols-3 gap-3 mb-4">
          {[
            { icon: "emoji_events", color: "text-amber-500", bg: "bg-amber-50", value: milestones, label: "Milestones" },
            { icon: "assignment_turned_in", color: "text-[#695be6]", bg: "bg-[#695be6]/10", value: hwDone, label: "Teacher Notes" },
            { icon: "trending_up", color: "text-emerald-500", bg: "bg-emerald-50", value: entries.length, label: "Total Entries" },
          ].map((s) => (
            <div key={s.label} className={`${s.bg} rounded-2xl p-3 text-center`}>
              <span className={`material-symbols-outlined ${s.color} text-2xl`}>{s.icon}</span>
              <p className="font-black text-lg mt-0.5">{s.value}</p>
              <p className="text-xs text-gray-500">{s.label}</p>
            </div>
          ))}
        </div>

        <div className="bg-[#695be6]/5 border border-[#695be6]/20 rounded-2xl p-4 mb-4">
          {!showForm ? (
            <button onClick={() => setShowForm(true)} className="w-full flex items-center gap-3 text-left">
              <div className="size-10 bg-[#695be6] rounded-xl flex items-center justify-center shrink-0">
                <span className="material-symbols-outlined text-white text-xl">add</span>
              </div>
              <div>
                <p className="font-bold text-sm text-[#695be6]">Add a Parent Reflection</p>
                <p className="text-xs text-gray-500">Share a proud moment or observation about {child?.name || "your child"}</p>
              </div>
            </button>
          ) : (
            <div>
              <p className="font-bold text-sm mb-2">Share a Reflection</p>
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Title (e.g. 'Proud moment this week')"
                className="w-full border border-gray-200 rounded-xl p-3 text-sm outline-none focus:border-[#695be6] mb-2 bg-white"
              />
              <textarea
                value={reflection}
                onChange={(e) => setReflection(e.target.value)}
                placeholder="Describe a proud moment, growth you've noticed..."
                className="w-full border border-gray-200 rounded-xl p-3 text-sm outline-none focus:border-[#695be6] resize-none h-24 bg-white"
              />
              <div className="flex gap-2 mt-2">
                <button onClick={() => { setShowForm(false); setTitle(""); setReflection(""); }} className="flex-1 border border-gray-200 bg-white rounded-xl py-2 text-sm font-bold text-gray-600">Cancel</button>
                <button onClick={handleSave} disabled={saving} className="flex-1 bg-[#695be6] text-white rounded-xl py-2 text-sm font-bold disabled:opacity-60">
                  {saving ? "Saving..." : "Save Reflection"}
                </button>
              </div>
            </div>
          )}
        </div>

        <h2 className="font-bold mb-3">Portfolio Timeline</h2>
        {entries.length === 0 ? (
          <div className="bg-white rounded-2xl border border-gray-100 p-8 text-center text-gray-400">
            <span className="material-symbols-outlined text-4xl mb-2">workspace_premium</span>
            <p className="font-medium">No portfolio entries yet</p>
          </div>
        ) : (
          <div className="space-y-3">
            {entries.map((entry) => {
              const cfg = TYPE_CONFIG[entry.type] || TYPE_CONFIG.milestone;
              return (
                <div key={entry._id} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
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
                      {entry.teacher && <p className="text-xs text-gray-400 mb-1">{entry.teacher} · <span className="font-semibold">{entry.role}</span></p>}
                      <p className="text-xs text-gray-600 leading-relaxed">{entry.text}</p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
