import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { AdminLayout } from "./Home";
import { fetchCrossClass, selectCrossClass } from "../../store/slices/schoolAdminSlice";

export default function CrossClass() {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const [grade, setGrade] = useState("Grade 6");
  const [subject, setSubject] = useState("Mathematics");

  const crossClassData = useSelector(selectCrossClass);

  useEffect(() => {
    dispatch(fetchCrossClass());
  }, [dispatch]);

  const d = crossClassData[0] || {};
  const rankings = d.rankings || [];
  const bestPractices = d.bestPractices || [];
  const bestPerformance = d.bestPerformance || {};
  const mostImproved = d.mostImproved || {};

  if (!crossClassData.length) {
    return (
      <AdminLayout active="/schooladmin/cross-class">
        <div className="p-6 flex items-center justify-center h-64">
          <div className="text-center text-gray-400">
            <span className="material-symbols-outlined text-4xl mb-2">hourglass_empty</span>
            <p>Loading comparison data...</p>
          </div>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout active="/schooladmin/cross-class">
      <div className="p-6">
        <div className="flex items-center gap-3 mb-4">
          <button onClick={() => navigate("/schooladmin")} className="text-gray-400 hover:text-gray-600">
            <span className="material-symbols-outlined">arrow_back</span>
          </button>
          <h1 className="text-xl font-black text-[#100e1a]">Class Comparison</h1>
        </div>

        <div className="flex items-center gap-3 mb-5">
          <span className="text-xs font-bold text-gray-500">FILTER BY:</span>
          {["Grade 6", "Grade 7"].map((g) => (
            <button key={g} onClick={() => setGrade(g)}
              className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold border transition-colors ${grade === g ? "bg-[#695be6] text-white border-[#695be6]" : "bg-white border-gray-200 text-gray-600"}`}>
              {g}
            </button>
          ))}
          {["Mathematics", "Science", "English"].map((s) => (
            <button key={s} onClick={() => setSubject(s)}
              className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold border transition-colors ${subject === s ? "bg-[#695be6] text-white border-[#695be6]" : "bg-white border-gray-200 text-gray-600"}`}>
              {s}
            </button>
          ))}
        </div>

        <div className="flex gap-4">
          <div className="flex-1">
            <div className="grid grid-cols-2 gap-4 mb-5">
              <div className="bg-[#fdf6ff] border border-purple-100 rounded-xl p-4">
                <p className="text-[10px] font-black text-gray-400 tracking-widest mb-2">BEST PERFORMANCE</p>
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-2xl font-black text-[#100e1a]">{bestPerformance.section}</p>
                    <p className="text-xs text-gray-500">Class Section</p>
                    <p className="text-xs text-gray-400 mt-1">+{bestPerformance.vsAvg} vs avg</p>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <div className="size-10 bg-purple-100 rounded-xl flex items-center justify-center">
                      <span className="material-symbols-outlined text-purple-500">emoji_events</span>
                    </div>
                    <span className="bg-green-100 text-green-700 font-black text-lg px-2 py-0.5 rounded-lg">{bestPerformance.score}%</span>
                  </div>
                </div>
              </div>
              <div className="bg-[#fdf6ff] border border-purple-100 rounded-xl p-4">
                <p className="text-[10px] font-black text-gray-400 tracking-widest mb-2">MOST IMPROVED</p>
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-2xl font-black text-[#100e1a]">{mostImproved.section}</p>
                    <p className="text-xs text-gray-500">Class Section</p>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <div className="size-10 bg-green-100 rounded-xl flex items-center justify-center">
                      <span className="material-symbols-outlined text-green-500">trending_up</span>
                    </div>
                    <span className="text-green-600 font-black text-lg">{mostImproved.growth}</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
              <p className="font-bold flex items-center gap-2 mb-3">
                <span className="material-symbols-outlined text-[#695be6] text-base">format_list_numbered</span>
                Performance Ranking
              </p>
              <div className="flex flex-col gap-3">
                {rankings.map((r) => (
                  <div key={r.rank} className="flex items-center gap-3 bg-[#fdf6ff] rounded-xl p-3">
                    <div className="size-8 bg-[#695be6] rounded-full flex items-center justify-center text-white font-black text-sm">{r.rank}</div>
                    <div className="size-10 bg-gray-200 rounded-full overflow-hidden flex items-center justify-center">
                      <span className="material-symbols-outlined text-gray-400">person</span>
                    </div>
                    <div className="flex-1">
                      <p className="font-bold text-sm">{r.section}</p>
                      <p className="text-xs text-gray-500">{r.teacher} • {r.students} Students</p>
                    </div>
                    <div className="flex gap-4 text-center">
                      <div><p className="text-[10px] text-gray-400">PERF.</p><p className="font-black text-sm">{r.perf}%</p></div>
                      <div><p className="text-[10px] text-gray-400">COMP.</p><p className="font-black text-sm">{r.comp}%</p></div>
                      <div><p className="text-[10px] text-gray-400">ENGAGE.</p><p className="font-black text-sm">{r.engage}%</p></div>
                    </div>
                    <div className="text-right">
                      <p className="text-[10px] text-gray-400">Overall Score</p>
                      <div className="flex items-center gap-2">
                        <div className="w-20 h-2 bg-gray-100 rounded-full">
                          <div className="h-2 bg-[#695be6] rounded-full" style={{ width: `${r.overall}%` }} />
                        </div>
                        <span className="font-black text-sm text-[#695be6]">{r.overall}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="w-64 shrink-0">
            <div className="bg-[#695be6] rounded-xl p-4 text-white">
              <p className="font-black flex items-center gap-2 mb-1">
                <span className="material-symbols-outlined text-yellow-300 text-base">lightbulb</span>
                Best Practices
              </p>
              <p className="text-xs text-white/70 mb-4">What Top Performers Do Differently</p>
              {bestPractices.map((bp) => (
                <div key={bp.title} className="bg-white/10 rounded-xl p-3 mb-3">
                  <p className="font-bold text-sm mb-1">{bp.title}</p>
                  <p className="text-xs text-white/70 mb-2">{bp.desc}</p>
                  <span className="bg-green-400/30 text-green-200 text-[9px] font-black px-2 py-0.5 rounded-full">+ {bp.impact}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}
