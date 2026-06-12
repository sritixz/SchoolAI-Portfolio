import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import api from "../../api";
import { curiosityPromptsData } from "../../data/parentData";

const TABS = ["All Prompts", "Conversations", "Activities", "Real-World"];
const DURATIONS = ["All durations", "5 min quick-chat", "15 min focused", "30 min+ deep dive"];
const DURATION_COUNTS = [23, 12, 8, 3];

export default function ParentCuriosityPrompts() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [tab, setTab] = useState("All Prompts");
  const [duration, setDuration] = useState("All durations");
  const [expanded, setExpanded] = useState(null);
  const [showMaterials, setShowMaterials] = useState(false);
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(curiosityPromptsData);
  const [childId, setChildId] = useState(null);

  // Fetch parent dashboard to get child ID
  useEffect(() => {
    if (!user?.id) return;
    api.get("/parent/dashboard")
      .then((r) => {
        const children = r.data?.children || [];
        if (children.length > 0) setChildId(children[0]._id);
      })
      .catch(() => {});
  }, [user?.id]);

  // Fetch personalized curiosity prompts
  useEffect(() => {
    if (!childId) return;
    setLoading(true);
    api.get(`/parent/curiosity-prompts?child_id=${childId}`)
      .then((r) => {
        if (r.data?.conversations) setData(r.data);
      })
      .catch(() => {
        // Keep static fallback data
      })
      .finally(() => setLoading(false));
  }, [childId]);

  const { conversations = [], realWorld = [], activity } = data;

  // Filter conversations by duration
  const filteredConversations = duration === "All durations"
    ? conversations
    : conversations.filter((c) => {
        const mins = parseInt(c.time);
        if (duration.includes("5 min")) return mins <= 5;
        if (duration.includes("15 min")) return mins > 5 && mins <= 15;
        return mins > 15;
      });

  const filteredRealWorld = duration === "All durations"
    ? realWorld
    : realWorld;

  // Tab filtering
  const showConversations = tab === "All Prompts" || tab === "Conversations";
  const showRealWorld = tab === "All Prompts" || tab === "Real-World";
  const showActivities = tab === "All Prompts" || tab === "Activities";

  return (
    <div className="bg-[#f6f6f8] min-h-screen pb-10" style={{ fontFamily: "'Lexend', sans-serif" }}>
      {/* Header */}
      <div className="bg-white border-b border-gray-100 px-4 py-4 flex items-center gap-3">
        <button onClick={() => navigate("/parent")} className="size-8 flex items-center justify-center">
          <span className="material-symbols-outlined text-gray-500">arrow_back</span>
        </button>
        <div className="size-8 bg-[#695be6] rounded-xl flex items-center justify-center">
          <span className="material-symbols-outlined text-white text-base">auto_awesome</span>
        </div>
        <h1 className="text-lg font-bold flex-1">Curiosity Prompts</h1>
        <button
          onClick={() => { setLoading(true); api.get(`/parent/curiosity-prompts?child_id=${childId}`).then((r) => { if (r.data?.conversations) setData(r.data); }).catch(() => {}).finally(() => setLoading(false)); }}
          className="size-8 flex items-center justify-center rounded-lg hover:bg-gray-100"
          title="Generate new prompts"
        >
          <span className="material-symbols-outlined text-[#695be6] text-xl">refresh</span>
        </button>
      </div>

      {/* Hero Banner */}
      <div className="bg-[#ede9ff] px-6 py-8 flex items-center justify-between">
        <div className="max-w-xs">
          <h2 className="text-2xl font-black text-gray-800">Connect with your child's curiosity at home</h2>
          <p className="text-sm text-gray-500 mt-2">Personalized prompts based on what your child is currently learning in class.</p>
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

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="flex flex-col items-center gap-3">
            <div className="size-10 border-4 border-[#695be6] border-t-transparent rounded-full animate-spin" />
            <p className="text-sm text-gray-500 font-medium">Generating personalized prompts...</p>
          </div>
        </div>
      ) : (
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
            <p className="text-xs text-gray-600">Ask "Why" three times to help your child explore deeper concepts and build critical thinking skills.</p>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 space-y-5">
          {/* Conversation Starters */}
          {showConversations && filteredConversations.length > 0 && (
          <div>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-green-600 text-xl">chat</span>
                <p className="font-bold">Conversation Starters</p>
              </div>
            </div>
            <div className="space-y-3">
              {filteredConversations.map((c) => (
                <div key={c.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
                  <div className="flex items-start justify-between">
                    <p className="font-semibold text-sm flex-1">{c.text}</p>
                  </div>
                  <div className="flex items-center gap-3 mt-2">
                    <span className="text-xs text-gray-400 flex items-center gap-1">
                      <span className="material-symbols-outlined text-xs">schedule</span> {c.time}
                    </span>
                    <span className="text-xs text-[#695be6] bg-[#695be6]/10 px-2 py-0.5 rounded-full font-medium">
                      {c.tag}
                    </span>
                  </div>
                  <button
                    onClick={() => setExpanded(expanded === c.id ? null : c.id)}
                    className="mt-2 text-xs text-[#695be6] font-semibold flex items-center gap-1"
                  >
                    Follow-up questions
                    <span className="material-symbols-outlined text-base">{expanded === c.id ? "expand_less" : "expand_more"}</span>
                  </button>
                  {expanded === c.id && (
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
          )}

          {/* Real-World Connections */}
          {showRealWorld && filteredRealWorld.length > 0 && (
          <div>
            <div className="flex items-center gap-2 mb-3">
              <span className="material-symbols-outlined text-yellow-500 text-xl">explore</span>
              <p className="font-bold">Real-World Connections</p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {filteredRealWorld.map((r) => (
                <div key={r.id} className="bg-white rounded-2xl border border-yellow-100 shadow-sm p-3">
                  <span className="text-[10px] font-bold text-yellow-700 bg-yellow-50 px-2 py-0.5 rounded-full">{r.type}</span>
                  <p className="font-bold text-sm mt-2">{r.title}</p>
                  <p className="text-xs text-gray-500 mt-1">{r.desc}</p>
                </div>
              ))}
            </div>
          </div>
          )}

          {/* Simple Home Activity */}
          {showActivities && activity && (
          <div>
            <div className="flex items-center gap-2 mb-3">
              <span className="material-symbols-outlined text-[#695be6] text-xl">science</span>
              <p className="font-bold">Home Activity</p>
            </div>
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
              <div className="flex items-start justify-between">
                <p className="font-bold text-base">{activity.title}</p>
              </div>
              <div className="flex gap-2 mt-2 flex-wrap">
                <span className="text-xs text-gray-500 flex items-center gap-1"><span className="material-symbols-outlined text-xs">schedule</span> {activity.time}</span>
                <span className="text-xs text-emerald-600 flex items-center gap-1"><span className="material-symbols-outlined text-xs">trending_up</span> {activity.difficulty}</span>
                {activity.items && <span className="text-xs text-[#695be6] flex items-center gap-1"><span className="material-symbols-outlined text-xs">list</span> {activity.items} items needed</span>}
              </div>
              {activity.learning_goal && (
                <p className="text-xs text-gray-600 mt-3 bg-green-50 p-2 rounded-lg">
                  <span className="font-bold text-green-700">Learning goal:</span> {activity.learning_goal}
                </p>
              )}
              {activity.connection && (
                <p className="text-xs text-gray-500 mt-1 italic">{activity.connection}</p>
              )}
              <button
                onClick={() => setShowMaterials(!showMaterials)}
                className="mt-3 text-xs text-[#695be6] font-semibold flex items-center gap-1"
              >
                {activity.materials ? "Show Materials" : "Show Details"}
                <span className="material-symbols-outlined text-base">{showMaterials ? "expand_less" : "expand_more"}</span>
              </button>
              {showMaterials && (
                <div className="mt-2 bg-[#695be6]/5 rounded-xl p-3 text-xs text-gray-600 space-y-1">
                  {activity.materials ? (
                    activity.materials.map((m, i) => <p key={i}>• {m}</p>)
                  ) : (
                    <>
                      <p>• Simple materials from home</p>
                      <p>• No special equipment needed</p>
                    </>
                  )}
                </div>
              )}
            </div>
          </div>
          )}

          {/* Regenerate button */}
          <div className="flex justify-center pt-2">
            <button
              onClick={() => { setLoading(true); api.get(`/parent/curiosity-prompts?child_id=${childId}`).then((r) => { if (r.data?.conversations) setData(r.data); }).catch(() => {}).finally(() => setLoading(false)); }}
              className="border border-[#695be6] bg-white rounded-full px-6 py-2.5 text-sm font-semibold flex items-center gap-2 text-[#695be6] hover:bg-[#695be6]/5 transition-colors"
            >
              <span className="material-symbols-outlined text-base">refresh</span> Generate New Prompts
            </button>
          </div>
        </div>
      </div>
      )}

      {/* Footer */}
      <div className="mt-8 border-t border-gray-200 py-4 px-4 text-center text-xs text-gray-400">
        <div className="flex items-center justify-center gap-2 mb-2">
          <div className="size-5 bg-[#695be6] rounded-md flex items-center justify-center">
            <span className="material-symbols-outlined text-white text-xs">auto_awesome</span>
          </div>
          <span className="font-bold text-gray-600">Curiosity Prompts</span>
        </div>
        <p className="mt-2 text-gray-400">Personalized by AI based on your child's current curriculum</p>
      </div>
    </div>
  );
}
