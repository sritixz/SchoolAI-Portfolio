import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { curiosityPromptsData } from "../../data/parentData";

const { conversations, realWorld, activity } = curiosityPromptsData;

const TABS = ["All Prompts", "Conversations", "Activities", "Real-World"];
const DURATIONS = ["All durations", "5 min quick-chat", "15 min focused", "30 min+ deep dive"];
const DURATION_COUNTS = [23, 12, 8, 3];

export default function ParentCuriosityPrompts() {
  const navigate = useNavigate();
  const [tab, setTab] = useState("All Prompts");
  const [duration, setDuration] = useState("All durations");
  const [expanded, setExpanded] = useState(null);
  const [showMaterials, setShowMaterials] = useState(false);

  return (
    <div className="bg-[#f6f6f8] min-h-screen pb-10" style={{ fontFamily: "'Lexend', sans-serif" }}>
      {/* Header */}
      <div className="bg-white border-b border-gray-100 px-4 py-4 flex items-center gap-3">
        <div className="size-8 bg-[#695be6] rounded-xl flex items-center justify-center">
          <span className="material-symbols-outlined text-white text-base">auto_awesome</span>
        </div>
        <h1 className="text-lg font-bold flex-1">Curiosity Prompts</h1>
        <button><span className="material-symbols-outlined text-xl text-gray-500">search</span></button>
        <div className="size-8 rounded-full bg-gray-200 flex items-center justify-center">
          <span className="material-symbols-outlined text-gray-500 text-base">person</span>
        </div>
      </div>

      {/* Hero Banner */}
      <div className="bg-[#ede9ff] px-6 py-8 flex items-center justify-between">
        <div className="max-w-xs">
          <h2 className="text-2xl font-black text-gray-800">Connect with your child's curiosity at home</h2>
          <p className="text-sm text-gray-500 mt-2">Personalized prompts to bridge the gap between classroom and kitchen table.</p>
        </div>
        <span className="material-symbols-outlined text-[#695be6]/30 text-8xl">school</span>
      </div>

      {/* Tabs */}
      <div className="bg-white border-b border-gray-100 px-4">
        <div className="flex gap-1 overflow-x-auto">
          {TABS.map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`shrink-0 px-4 py-3 text-sm font-semibold transition-colors ${tab === t ? "text-[#695be6] border-b-2 border-[#695be6]" : "text-gray-500"}`}
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 pt-4 flex gap-4">
        {/* Sidebar */}
        <div className="w-44 shrink-0 hidden md:block space-y-2">
          <p className="text-[10px] font-bold text-gray-400 uppercase mb-2">Time Available</p>
          {DURATIONS.map((d, i) => (
            <button
              key={d}
              onClick={() => setDuration(d)}
              className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-sm transition-colors ${duration === d ? "bg-[#695be6] text-white font-bold" : "bg-white border border-gray-100 text-gray-600"}`}
            >
              <span>{d}</span>
              {i > 0 && <span className={`text-xs font-bold ${duration === d ? "text-white/70" : "text-gray-400"}`}>{DURATION_COUNTS[i]}</span>}
            </button>
          ))}
          <div className="bg-[#695be6]/10 rounded-xl p-3 mt-4">
            <p className="text-xs font-bold text-[#695be6] mb-1">Parent Pro Tip</p>
            <p className="text-xs text-gray-600">Ask "Why" three times to help your 8th grader explore deeper biological concepts.</p>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 space-y-5">
          {/* Conversation Starters */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-green-600 text-xl">chat</span>
                <p className="font-bold">Conversation Starters</p>
              </div>
              <button className="text-sm text-[#695be6] font-semibold">View all</button>            </div>
            <div className="space-y-3">
              {conversations.map((c) => (
                <div key={c.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
                  <div className="flex items-start justify-between">
                    <p className="font-semibold text-sm flex-1">{c.text}</p>
                    <button className="ml-2 shrink-0">
                      <span className="material-symbols-outlined text-gray-300 text-xl">bookmark</span>
                    </button>
                  </div>
                  <div className="flex items-center gap-3 mt-2">
                    <span className="text-xs text-gray-400 flex items-center gap-1">
                      <span className="material-symbols-outlined text-xs">schedule</span> {c.time}
                    </span>
                    <span className="text-xs text-gray-400 flex items-center gap-1">
                      <span className="material-symbols-outlined text-xs">location_on</span> {c.tag}
                    </span>
                  </div>
                  <button
                    onClick={() => setExpanded(expanded === c.id ? null : c.id)}
                    className="mt-2 text-xs text-[#695be6] font-semibold flex items-center gap-1"
                  >
                    Follow-up questions
                    <span className="material-symbols-outlined text-base">{expanded === c.id ? "expand_less" : "expand_more"}</span>
                  </button>                  {expanded === c.id && (
                    <div className="mt-2 bg-[#695be6]/5 rounded-xl p-3 text-xs text-gray-600 space-y-1">
                      <p>• Why do you think that happens?</p>
                      <p>• Can you think of another example?</p>
                      <p>• What would change if...?</p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Real-World Connections */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <span className="material-symbols-outlined text-yellow-500 text-xl">explore</span>
              <p className="font-bold">Real-World Connections</p>
            </div>
            <div className="grid grid-cols-2 gap-3">
              {realWorld.map((r) => (
                <div key={r.id} className="bg-white rounded-2xl border border-yellow-100 shadow-sm p-3">
                  <div className="flex items-start justify-between mb-1">
                    <span className="text-[10px] font-bold text-yellow-700 bg-yellow-50 px-2 py-0.5 rounded-full">{r.type}</span>
                    <button><span className="material-symbols-outlined text-gray-300 text-base">bookmark</span></button>
                  </div>
                  <p className="font-bold text-sm mt-1">{r.title}</p>
                  <p className="text-xs text-gray-500 mt-1">{r.desc}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Simple Home Activities */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <span className="material-symbols-outlined text-[#695be6] text-xl">science</span>
              <p className="font-bold">Simple Home Activities</p>
            </div>
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
              <div className="flex gap-4 p-4">
                <img src={activity.image} alt={activity.title} className="w-28 h-24 object-cover rounded-xl shrink-0" />
                <div className="flex-1">
                  <div className="flex items-start justify-between">
                    <p className="font-bold">{activity.title}</p>
                    <button><span className="material-symbols-outlined text-gray-300 text-xl">bookmark</span></button>
                  </div>
                  <div className="flex gap-2 mt-2 flex-wrap">
                    <span className="text-xs text-gray-500 flex items-center gap-1"><span className="material-symbols-outlined text-xs">schedule</span> {activity.time}</span>
                    <span className="text-xs text-emerald-600 flex items-center gap-1"><span className="material-symbols-outlined text-xs">trending_up</span> {activity.difficulty}</span>
                    <span className="text-xs text-[#695be6] flex items-center gap-1"><span className="material-symbols-outlined text-xs">list</span> {activity.items} items</span>
                  </div>
                  <button
                    onClick={() => setShowMaterials(!showMaterials)}
                    className="mt-2 text-xs text-[#695be6] font-semibold flex items-center gap-1"
                  >
                    Show Materials & Learning Goals
                    <span className="material-symbols-outlined text-base">{showMaterials ? "expand_less" : "expand_more"}</span>
                  </button>
                  {showMaterials && (
                    <div className="mt-2 bg-[#695be6]/5 rounded-xl p-3 text-xs text-gray-600 space-y-1">
                      <p>• Bean seeds, small pot, soil</p>
                      <p>• Learning goal: Plant life cycles & photosynthesis</p>
                      <p>• Connects to: Chapter 4 — Living Organisms</p>
                    </div>
                  )}
                  <button className="mt-2 bg-[#695be6] text-white text-sm font-bold px-4 py-2 rounded-xl">
                    Start Activity Guide
                  </button>
                </div>
              </div>
            </div>
          </div>

          <div className="flex justify-center">
            <button onClick={() => navigate("/parent")} className="border border-gray-200 bg-white rounded-full px-6 py-2.5 text-sm font-semibold flex items-center gap-2 text-gray-600">
              <span className="material-symbols-outlined text-base">history</span> View History
            </button>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="mt-8 border-t border-gray-200 py-4 px-4 text-center text-xs text-gray-400">
        <div className="flex items-center justify-center gap-2 mb-2">
          <div className="size-5 bg-[#695be6] rounded-md flex items-center justify-center">
            <span className="material-symbols-outlined text-white text-xs">auto_awesome</span>
          </div>
          <span className="font-bold text-gray-600">Curiosity Prompts</span>
        </div>
        <div className="flex justify-center gap-4">
          {[
            { label: "Help Center", path: "/parent" },
            { label: "Teacher Dashboard", path: "/parent" },
            { label: "Privacy", path: "/parent" },
            { label: "Terms", path: "/parent" },
          ].map((l) => (
            <button key={l.label} onClick={() => navigate(l.path)} className="hover:text-gray-600">{l.label}</button>
          ))}
        </div>
        <p className="mt-2">© 2024 Curiosity Prompts. All rights reserved.</p>
      </div>
    </div>
  );
}
