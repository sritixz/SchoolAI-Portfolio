import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { AdminLayout } from "./Home";
import { weakTopicsData } from "../../data/schoolAdminData";

export default function WeakTopics() {
  const navigate = useNavigate();
  const [activeYears, setActiveYears] = useState(weakTopicsData.activeYears);
  const d = weakTopicsData;

  const toggleYear = (y) =>
    setActiveYears((prev) => prev.includes(y) ? prev.filter((x) => x !== y) : [...prev, y]);

  return (
    <AdminLayout active="/schooladmin/weak-topics">
      <div className="p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-3">
            <div className="size-8 bg-[#695be6] rounded-lg flex items-center justify-center text-white">
              <span className="material-symbols-outlined text-base">bar_chart</span>
            </div>
            <div>
              <h1 className="text-xl font-black text-[#100e1a]">Multi-Year Weak Topics Analysis</h1>
              <p className="text-[10px] font-black text-gray-400 tracking-widest">SYSTEMIC PERFORMANCE TRACKER</p>
            </div>
          </div>
          <button className="flex items-center gap-2 bg-[#695be6] text-white px-4 py-2 rounded-xl text-sm font-bold">
            <span className="material-symbols-outlined text-base">assignment</span> Strategic Plan
          </button>
        </div>

        {/* Filters */}
        <div className="flex items-center gap-3 mb-4 flex-wrap">
          <span className="text-[10px] font-black text-gray-400 tracking-widest">ANALYSIS PERIOD (2020-2025)</span>
          {d.years.map((y) => (
            <button key={y} onClick={() => toggleYear(y)}
              className={`px-3 py-1 rounded-full text-xs font-bold transition-colors ${activeYears.includes(y) ? "bg-[#695be6] text-white" : "bg-gray-100 text-gray-500"}`}>
              {y}
            </button>
          ))}
          <div className="ml-4 flex items-center gap-3">
            <select className="text-xs border border-gray-200 rounded-lg px-2 py-1.5">
              <option>All Subjects</option>
              <option>Mathematics</option>
              <option>Language Arts</option>
            </select>
            <select className="text-xs border border-gray-200 rounded-lg px-2 py-1.5">
              <option>2+ Years</option>
              <option>3+ Years</option>
              <option>4+ Years</option>
            </select>
            <div className="flex items-center gap-2">
              <span className="text-[10px] text-gray-500">SEVERITY THRESHOLD</span>
              <input type="range" min={0} max={100} defaultValue={65} className="w-20 accent-[#695be6]" />
              <span className="text-xs font-bold text-[#695be6]">65%</span>
            </div>
          </div>
        </div>

        <div className="flex gap-4">
          {/* Left */}
          <div className="flex-1">
            {/* Stats Banner */}
            <div className="bg-[#695be6] rounded-xl p-5 text-white mb-4">
              <div className="grid grid-cols-4 gap-4">
                <div>
                  <p className="text-[10px] font-black opacity-70 tracking-widest">PERSISTENT TOPICS</p>
                  <p className="text-3xl font-black">{d.persistentTopics}</p>
                </div>
                <div>
                  <p className="text-[10px] font-black opacity-70 tracking-widest">STUDENTS IMPACTED</p>
                  <p className="text-3xl font-black">{d.studentsImpacted.toLocaleString()}</p>
                </div>
                <div>
                  <p className="text-[10px] font-black opacity-70 tracking-widest">CRITICAL (4+ YRS)</p>
                  <p className="text-3xl font-black">{d.critical4Plus}</p>
                </div>
                <div>
                  <p className="text-[10px] font-black opacity-70 tracking-widest">TREND: PERSISTENCE GROWTH</p>
                  <div className="flex items-end gap-1 mt-2">
                    {[30, 40, 50, 60, 70, 80].map((h, i) => (
                      <div key={i} className="w-4 bg-white/30 rounded-sm" style={{ height: `${h * 0.4}px` }}>
                        <div className="w-full bg-white/70 rounded-sm" style={{ height: `${h * 0.4}px` }} />
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Topics */}
            <div className="flex items-center justify-between mb-3">
              <p className="font-black text-sm">Systemic Critical Topics</p>
              <div className="flex gap-2">
                <span className="material-symbols-outlined text-gray-400 text-base cursor-pointer">sort</span>
                <span className="material-symbols-outlined text-gray-400 text-base cursor-pointer">filter_list</span>
              </div>
            </div>
            <div className="flex flex-col gap-3">
              {d.topics.map((t) => (
                <div key={t.name} className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 flex items-center gap-4">
                  <div className="size-14 border-2 border-[#695be6] rounded-full flex flex-col items-center justify-center shrink-0">
                    <span className="text-lg font-black text-[#695be6]">{t.years}</span>
                    <span className="text-[9px] text-gray-400">YEARS</span>
                  </div>
                  <div className="flex-1">
                    <p className="font-black text-sm mb-1">{t.name}</p>
                    <div className="flex gap-2 mb-2">
                      <span className="bg-blue-100 text-blue-700 text-[10px] font-bold px-2 py-0.5 rounded-full">{t.subject.toUpperCase()}</span>
                      <span className="bg-gray-100 text-gray-600 text-[10px] font-bold px-2 py-0.5 rounded-full">GRADE {t.grade}</span>
                    </div>
                    <div className="flex items-center gap-2 text-[10px] text-gray-400">
                      <span>2020 STRUGGLE: {t.struggle2020}%</span>
                      <span>2024 STRUGGLE: {t.struggle2024}%</span>
                    </div>
                    <div className="relative h-1.5 bg-gray-100 rounded-full mt-1">
                      <div className="absolute h-1.5 bg-red-300 rounded-full" style={{ width: `${t.struggle2020}%` }} />
                      <div className="absolute h-1.5 bg-[#695be6] rounded-full opacity-60" style={{ width: `${t.struggle2024}%` }} />
                    </div>
                  </div>
                  <div className="text-center">
                    <p className="text-xl font-black text-[#100e1a]">{t.studentsAffected}</p>
                    <p className="text-[10px] text-gray-400">Students Affected</p>
                  </div>
                  <div className="text-center">
                    <p className="text-xl font-black text-red-500">{t.struggleScore}</p>
                    <p className="text-[10px] text-gray-400">Struggle Score</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Right Sidebar */}
          <div className="w-64 shrink-0 flex flex-col gap-4">
            {/* Root Cause */}
            <div className="bg-[#1a1a2e] rounded-xl p-4 text-white">
              <p className="font-black text-sm flex items-center gap-2 mb-3">
                <span className="material-symbols-outlined text-[#695be6] text-base">location_on</span>
                Root Cause Analysis
              </p>
              {d.rootCauses.map((rc) => (
                <div key={rc.title} className="bg-[#695be6]/20 border border-[#695be6]/30 rounded-xl p-3 mb-2">
                  <p className="font-bold text-sm mb-1">{rc.title}</p>
                  <p className="text-[10px] text-white/70">{rc.desc}</p>
                </div>
              ))}
              <div className="mt-3">
                <p className="text-[10px] font-black text-gray-400 tracking-widest mb-2">STRATEGIC INTERVENTIONS</p>
                {d.strategicInterventions.map((si, i) => (
                  <div key={i} className="flex items-start gap-2 mb-1.5">
                    <span className="material-symbols-outlined text-green-400 text-sm mt-0.5">check_circle</span>
                    <p className="text-[10px] text-white/80">{si}</p>
                  </div>
                ))}
              </div>
              <button onClick={() => navigate("/schooladmin/matrix")} className="w-full bg-white text-[#1a1a2e] text-xs font-black py-2 rounded-xl mt-3">View Full Diagnostic Report</button>
            </div>

            {/* Severity Heatmap */}
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
              <p className="font-bold text-sm flex items-center gap-2 mb-3">
                <span className="material-symbols-outlined text-[#695be6] text-base">grid_view</span>
                Severity Heatmap
              </p>
              <div className="grid grid-cols-5 gap-1">
                {[
                  ["#fca5a5","#f87171","#ef4444","#dc2626","#b91c1c"],
                  ["#c4b5fd","#a78bfa","#8b5cf6","#7c3aed","#6d28d9"],
                  ["#86efac","#4ade80","#22c55e","#16a34a","#15803d"],
                ].flat().map((c, i) => (
                  <div key={i} className="h-8 rounded" style={{ backgroundColor: c }} />
                ))}
              </div>
              <div className="flex justify-between mt-2">
                <span className="text-[9px] text-gray-400">LOW RISK</span>
                <span className="text-[9px] text-gray-400">HIGH RISK</span>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-6 flex justify-between text-[10px] text-gray-400 border-t border-gray-200 pt-4">
          <span>© 2024 EDUCATIONAL INSIGHTS - SYSTEMIC PERFORMANCE SUITE</span>
          <div className="flex gap-4">
            <span>DATA INTEGRITY POLICY</span>
            <span>METHODOLOGY</span>
            <span>SUPPORT</span>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}
