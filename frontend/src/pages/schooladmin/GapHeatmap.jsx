import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { AdminLayout } from "./Home";
import { gapHeatmapData } from "../../data/schoolAdminData";

function gapColor(s) {
  if (s > 60) return "bg-red-400 text-white";
  if (s >= 40) return "bg-orange-400 text-white";
  if (s >= 20) return "bg-yellow-300 text-yellow-900";
  return "bg-green-200 text-green-800";
}

export default function GapHeatmap() {
  const navigate = useNavigate();
  const [subject, setSubject] = useState("Mathematics");
  const [topic, setTopic] = useState("All Topics");
  const d = gapHeatmapData;
  return (
    <AdminLayout active="/schooladmin/gaps">
      <div className="p-6">
        <div className="flex items-center gap-3 mb-4">
          <button onClick={() => navigate("/schooladmin")} className="text-gray-400 hover:text-gray-600">
            <span className="material-symbols-outlined">arrow_back</span>
          </button>
          <h1 className="text-xl font-black text-[#100e1a] flex items-center gap-2">
            <span className="material-symbols-outlined text-[#695be6]">grid_view</span>
            Simplified Gap Heatmap
            <span className="material-symbols-outlined text-gray-400 text-base">info</span>
          </h1>
        </div>

        {/* Filters */}
        <div className="bg-[#ede9fb] rounded-xl p-4 mb-4">
          <div className="flex gap-3 mb-3">
            <div>
              <p className="text-[10px] font-black text-gray-500 mb-1">SUBJECT</p>
              <div className="flex gap-2">
                {d.subjects.map((s) => (
                  <button key={s} onClick={() => setSubject(s)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${subject === s ? "bg-[#695be6] text-white" : "bg-white text-gray-600"}`}>
                    {s}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <p className="text-[10px] font-black text-gray-500 mb-1">TOPIC</p>
              <div className="flex gap-2">
                {["All Topics", ...d.topics].map((t) => (
                  <button key={t} onClick={() => setTopic(t)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${topic === t ? "bg-[#695be6] text-white" : "bg-white text-gray-600"}`}>
                    {t}
                  </button>
                ))}
              </div>
            </div>
          </div>
          <div>
            <p className="text-[10px] font-black text-gray-500 mb-1">GAP LEGEND</p>
            <div className="flex gap-3 flex-wrap">
              {[
                { color: "bg-red-400", label: ">60% Gap (Critical struggle)" },
                { color: "bg-orange-400", label: "40-60% Gap (High struggle)" },
                { color: "bg-yellow-300", label: "20-40% Gap (Moderate struggle)" },
                { color: "bg-green-200", label: "<20% Gap (Mastery/Minor struggle)" },
              ].map((l) => (
                <div key={l.label} className="flex items-center gap-1">
                  <div className={`size-3 rounded-full ${l.color}`} />
                  <span className="text-[10px] text-gray-600">{l.label}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="flex gap-4">
          {/* Left */}
          <div className="flex-1">
            {/* Stats */}
            <div className="grid grid-cols-4 gap-3 mb-4">
              <div className="bg-white rounded-xl p-3 border border-gray-100 shadow-sm">
                <p className="text-[10px] text-gray-500">Active Learning Gaps</p>
                <p className="text-2xl font-black text-[#100e1a]">{d.activeGaps}</p>
                <div className="h-1.5 bg-gradient-to-r from-red-400 via-orange-300 via-yellow-300 to-green-300 rounded-full mt-2" />
              </div>
              <div className="bg-white rounded-xl p-3 border border-gray-100 shadow-sm">
                <p className="text-[10px] text-gray-500">Students Affected</p>
                <p className="text-2xl font-black text-[#100e1a]">{d.studentsAffected}</p>
                <p className="text-[10px] text-green-600 font-bold">{d.studentsAffectedChange}</p>
              </div>
              <div className="bg-white rounded-xl p-3 border border-gray-100 shadow-sm">
                <p className="text-[10px] text-gray-500">Critical Topics</p>
                <p className="text-2xl font-black text-red-500">{d.criticalTopics}</p>
                <p className="text-[10px] text-gray-400">Requires immediate attention</p>
              </div>
              <div className="bg-white rounded-xl p-3 border border-gray-100 shadow-sm">
                <p className="text-[10px] text-gray-500">Improvement Rate</p>
                <p className="text-2xl font-black text-green-600">{d.improvementRate}%</p>
                <span className="text-green-500 text-xs">↑</span>
              </div>
            </div>

            {/* Matrix */}
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
              <div className="p-3 border-b border-gray-100 flex items-center gap-2">
                <span className="material-symbols-outlined text-[#695be6] text-base">grid_view</span>
                <p className="font-bold text-sm">Curriculum Performance Matrix</p>
              </div>
              <table className="w-full text-xs">
                <thead>
                  <tr className="bg-gray-50">
                    <th className="text-left p-3 font-bold text-gray-500">TOPICS / CHAPTERS</th>
                    {d.grades.map((g) => (
                      <th key={g} className="p-2 text-center font-bold text-gray-500">{g.replace("Grade ", "GRADE ")}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {d.matrix.map((row) => (
                    <tr key={row.topic} className="border-t border-gray-100">
                      <td className="p-3 font-medium text-[#100e1a]">{row.topic}</td>
                      {row.scores.map((score, i) => (
                        <td key={i} className="p-1.5 text-center">
                          <div className={`rounded-lg py-2 font-black ${gapColor(score)}`}>
                            {score}%
                            <div className="text-[9px] font-normal opacity-80">{row.counts[i]}/250</div>
                          </div>
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Priority Actions */}
          <div className="w-56 shrink-0">
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
              <p className="font-black text-sm flex items-center gap-1 mb-3">
                <span className="material-symbols-outlined text-[#695be6] text-base">location_on</span>
                Priority Actions
              </p>
              {d.priorityActions.map((a, i) => (
                <div key={i} className={`border-l-2 pl-3 mb-4 ${i === 0 ? "border-red-400" : i === 1 ? "border-orange-400" : "border-[#695be6]"}`}>
                  <p className={`text-[9px] font-black tracking-widest mb-0.5 ${i === 0 ? "text-red-500" : i === 1 ? "text-orange-500" : "text-[#695be6]"}`}>
                    {a.priority}
                    <span className="text-gray-400 ml-1">Topic: {a.topic}</span>
                  </p>
                  <p className="text-xs font-bold mb-1">{a.title}</p>
                  <p className="text-[10px] text-gray-500 mb-2">{a.desc}</p>
                  <button
                    onClick={() => navigate(i === 0 ? "/schooladmin/curriculum" : i === 1 ? "/schooladmin/cross-class" : "/schooladmin/teacher-support")}
                    className="w-full bg-[#695be6] text-white text-[10px] font-black py-1.5 rounded-lg tracking-wide"
                  >{a.action}</button>
                </div>
              ))}
              <button onClick={() => navigate("/schooladmin/matrix")} className="text-xs text-[#695be6] font-medium">View all 12 recommendations →</button>
            </div>
          </div>
        </div>

        <div className="mt-4 text-center text-xs text-gray-400">
          Support Center · Documentation · API Status &nbsp;&nbsp; © 2024 EduMetrics AI. All rights reserved.
        </div>
      </div>
    </AdminLayout>
  );
}
