import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { AdminLayout } from "./Home";
import { fetchCurriculumTracker, selectCurriculumTracker } from "../../store/slices/schoolAdminSlice";

function statusStyle(status) {
  if (status === "ON TRACK") return "bg-green-100 text-green-700";
  if (status === "AT RISK") return "bg-yellow-100 text-yellow-700";
  return "bg-red-100 text-red-600";
}

export default function CurriculumTracker() {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const curriculumData = useSelector(selectCurriculumTracker);

  useEffect(() => {
    dispatch(fetchCurriculumTracker());
  }, [dispatch]);

  // API returns array of section objects with homework_count, coverage_pct, subjects
  const sections = Array.isArray(curriculumData) ? curriculumData : [];
  const totalHw = sections.reduce((sum, s) => sum + (s.homework_count || 0), 0);
  const avgCoverage = sections.length
    ? Math.round(sections.reduce((sum, s) => sum + (s.coverage_pct || 0), 0) / sections.length)
    : 0;
  const onTrack = sections.filter((s) => (s.coverage_pct || 0) >= 70).length;
  const atRisk = sections.filter((s) => (s.coverage_pct || 0) >= 40 && (s.coverage_pct || 0) < 70).length;
  const behind = sections.filter((s) => (s.coverage_pct || 0) < 40).length;

  return (
    <AdminLayout active="/schooladmin/curriculum">
      <div className="p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="size-8 bg-[#695be6] rounded-lg flex items-center justify-center text-white">
              <span className="material-symbols-outlined text-base">bar_chart</span>
            </div>
            <h1 className="text-xl font-black text-[#100e1a]">Curriculum Coverage Tracker</h1>
          </div>
        </div>

        {sections.length === 0 ? (
          <div className="bg-white rounded-xl border border-gray-100 p-8 text-center text-gray-400">
            <span className="material-symbols-outlined text-4xl mb-2">menu_book</span>
            <p className="font-medium">No curriculum data yet</p>
            <p className="text-sm mt-1">Create sections and assign homework to track coverage.</p>
          </div>
        ) : (
          <div className="flex gap-4">
            <div className="flex-1">
              <div className="grid grid-cols-3 gap-4 mb-4">
                <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 flex flex-col items-center justify-center">
                  <p className="text-xs font-bold text-[#695be6] mb-2">Overall Coverage</p>
                  <div className="relative size-24">
                    <svg viewBox="0 0 36 36" className="size-24 -rotate-90">
                      <circle cx="18" cy="18" r="15.9" fill="none" stroke="#e5e7eb" strokeWidth="3" />
                      <circle cx="18" cy="18" r="15.9" fill="none" stroke="#695be6" strokeWidth="3"
                        strokeDasharray={`${avgCoverage} ${100 - avgCoverage}`} strokeLinecap="round" />
                    </svg>
                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                      <span className="text-xl font-black text-[#100e1a]">{avgCoverage}%</span>
                      <span className="text-[9px] text-gray-400">AVG</span>
                    </div>
                  </div>
                </div>

                <div className="col-span-2 bg-white rounded-xl border border-gray-100 shadow-sm p-4">
                  <div className="flex items-start gap-3 mb-4">
                    <div className="size-10 bg-[#695be6] rounded-xl flex items-center justify-center text-white">
                      <span className="material-symbols-outlined text-base">calendar_month</span>
                    </div>
                    <div>
                      <p className="font-black text-base">Coverage Summary</p>
                      <p className="text-sm text-gray-600">{totalHw} total homework assignments created</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-3">
                    {[
                      { label: "ON TRACK", value: onTrack, color: "border-l-green-500 text-green-600" },
                      { label: "AT RISK", value: atRisk, color: "border-l-yellow-400 text-yellow-600" },
                      { label: "BEHIND", value: behind, color: "border-l-red-400 text-red-500" },
                    ].map((s) => (
                      <div key={s.label} className={`border-l-4 ${s.color} pl-3`}>
                        <p className="text-[10px] font-black text-gray-400">{s.label}</p>
                        <p className={`text-2xl font-black ${s.color.split(" ")[1]}`}>{s.value}</p>
                        <p className="text-xs text-gray-400">Sections</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
                <p className="text-xs font-black text-gray-500 tracking-widest mb-3">SECTION-WISE COVERAGE</p>
                <div className="flex flex-col gap-4">
                  {sections.map((sec) => {
                    const pct = sec.coverage_pct || 0;
                    const status = pct >= 70 ? "ON TRACK" : pct >= 40 ? "AT RISK" : "BEHIND";
                    const statusColor = pct >= 70 ? "bg-green-100 text-green-700" : pct >= 40 ? "bg-yellow-100 text-yellow-700" : "bg-red-100 text-red-600";
                    return (
                      <div key={sec._id}>
                        <div className="flex items-start justify-between mb-1">
                          <div>
                            <p className="font-bold text-sm">{sec.class_name}</p>
                            <p className="text-xs text-gray-400">{(sec.subjects || []).join(", ")} • {sec.homework_count} assignments</p>
                          </div>
                          <span className={`text-[10px] font-black px-2 py-0.5 rounded-full ${statusColor}`}>{status}</span>
                        </div>
                        <div className="relative h-2 bg-gray-100 rounded-full">
                          <div className="absolute h-2 bg-[#695be6] rounded-full" style={{ width: `${pct}%` }} />
                        </div>
                        <p className="text-[10px] text-gray-400 text-right mt-0.5">{pct}% coverage</p>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            <div className="w-56 shrink-0">
              <div className="bg-[#ede9fb] rounded-xl p-4">
                <p className="font-black text-sm flex items-center gap-1 text-[#695be6] mb-3">
                  <span className="material-symbols-outlined text-base">auto_awesome</span> Coverage Insights
                </p>
                {[
                  { type: "success", title: "Good Progress", desc: `${onTrack} sections are on track with curriculum coverage.` },
                  atRisk > 0 && { type: "warning", title: "At Risk Sections", desc: `${atRisk} sections need attention to stay on schedule.` },
                  behind > 0 && { type: "critical", title: "Behind Schedule", desc: `${behind} sections are significantly behind. Immediate action needed.` },
                ].filter(Boolean).map((ins) => (
                  <div key={ins.title} className={`rounded-xl p-3 mb-3 ${ins.type === "critical" ? "bg-red-50 border border-red-200" : ins.type === "warning" ? "bg-yellow-50 border border-yellow-200" : "bg-green-50 border border-green-200"}`}>
                    <div className="flex items-start gap-2">
                      <span className={`material-symbols-outlined text-base mt-0.5 ${ins.type === "critical" ? "text-red-500" : ins.type === "warning" ? "text-yellow-500" : "text-green-500"}`}>
                        {ins.type === "critical" ? "error" : ins.type === "warning" ? "trending_down" : "check_circle"}
                      </span>
                      <div>
                        <p className="text-xs font-black mb-1">{ins.title}</p>
                        <p className="text-[10px] text-gray-600">{ins.desc}</p>
                      </div>
                    </div>
                  </div>
                ))}
                <button onClick={() => navigate("/schooladmin/weak-topics")} className="w-full border border-gray-300 bg-white text-xs font-bold py-2 rounded-xl mt-1">VIEW WEAK TOPICS</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
