import { useNavigate } from "react-router-dom";
import { AdminLayout } from "./Home";
import { curriculumData } from "../../data/schoolAdminData";

function statusStyle(s) {
  if (s === "ON TRACK") return "bg-green-100 text-green-700";
  if (s === "AT RISK") return "bg-yellow-100 text-yellow-700";
  return "bg-red-100 text-red-600";
}

export default function CurriculumTracker() {
  const navigate = useNavigate();
  const d = curriculumData;

  return (
    <AdminLayout active="/schooladmin/curriculum">
      <div className="p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="size-8 bg-[#695be6] rounded-lg flex items-center justify-center text-white">
              <span className="material-symbols-outlined text-base">bar_chart</span>
            </div>
            <h1 className="text-xl font-black text-[#100e1a]">Curriculum Coverage Tracker</h1>
          </div>
          <button className="flex items-center gap-2 bg-[#695be6] text-white px-4 py-2 rounded-xl text-sm font-bold">
            <span className="material-symbols-outlined text-base">sync</span> Sync Calendar
          </button>
        </div>

        {/* Filters */}
        <div className="flex items-center gap-3 mb-5">
          <span className="text-xs font-bold text-gray-500">FILTERS:</span>
          {["Year: 2023-24", "Grade: All Grades"].map((f) => (
            <span key={f} className="bg-white border border-gray-200 text-xs font-medium px-3 py-1.5 rounded-lg">{f} ×</span>
          ))}
          <button className="text-xs text-[#695be6] font-bold ml-auto">Clear All</button>
        </div>

        <div className="flex gap-4">
          {/* Main */}
          <div className="flex-1">
            {/* Top Row */}
            <div className="grid grid-cols-3 gap-4 mb-4">
              {/* Donut */}
              <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 flex flex-col items-center justify-center">
                <p className="text-xs font-bold text-[#695be6] mb-2">Overall Completion</p>
                <div className="relative size-24">
                  <svg viewBox="0 0 36 36" className="size-24 -rotate-90">
                    <circle cx="18" cy="18" r="15.9" fill="none" stroke="#e5e7eb" strokeWidth="3" />
                    <circle cx="18" cy="18" r="15.9" fill="none" stroke="#695be6" strokeWidth="3"
                      strokeDasharray={`${d.overallCompletion} ${100 - d.overallCompletion}`} strokeLinecap="round" />
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className="text-xl font-black text-[#100e1a]">{d.overallCompletion}%</span>
                    <span className="text-[9px] text-gray-400">COMPLETED</span>
                  </div>
                </div>
              </div>

              {/* Forecast */}
              <div className="col-span-2 bg-white rounded-xl border border-gray-100 shadow-sm p-4">
                <div className="flex items-start gap-3 mb-4">
                  <div className="size-10 bg-[#695be6] rounded-xl flex items-center justify-center text-white">
                    <span className="material-symbols-outlined text-base">calendar_month</span>
                  </div>
                  <div>
                    <p className="font-black text-base">Forecast Banner</p>
                    <p className="text-sm text-gray-600">
                      Based on current instructional velocity, syllabus completion is expected by <span className="font-black text-[#100e1a]">{d.forecastDate}</span>.
                    </p>
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-3">
                  {[
                    { label: "ON TRACK", value: d.onTrack, color: "border-l-green-500 text-green-600" },
                    { label: "AT RISK", value: d.atRisk, color: "border-l-yellow-400 text-yellow-600" },
                    { label: "BEHIND", value: d.behind, color: "border-l-red-400 text-red-500" },
                  ].map((s) => (
                    <div key={s.label} className={`border-l-4 ${s.color} pl-3`}>
                      <p className="text-[10px] font-black text-gray-400">{s.label}</p>
                      <p className={`text-2xl font-black ${s.color.split(" ")[1]}`}>{s.value}</p>
                      <p className="text-xs text-gray-400">Subjects</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Subject Detail */}
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
              <div className="flex items-center justify-between mb-3">
                <p className="text-xs font-black text-gray-500 tracking-widest">SUBJECT-WISE COVERAGE DETAIL</p>
                <div className="flex items-center gap-3 text-xs text-gray-400">
                  <span className="flex items-center gap-1"><span className="size-2 bg-purple-200 rounded-full inline-block" /> Planned</span>
                  <span className="flex items-center gap-1"><span className="size-2 bg-green-300 rounded-full inline-block" /> Taught</span>
                </div>
              </div>
              <div className="flex flex-col gap-5">
                {d.subjects.map((sub) => (
                  <div key={sub.code}>
                    <div className="flex items-start justify-between mb-1">
                      <div>
                        <p className="text-xs font-black text-gray-400">{sub.code}</p>
                        <p className="font-bold text-sm">{sub.name}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-xs text-gray-400 font-bold">{sub.unit}</p>
                        <p className="text-xs text-gray-400">{sub.planned}% vs {sub.taught}%</p>
                      </div>
                      <span className={`text-[10px] font-black px-2 py-0.5 rounded-full ${statusStyle(sub.status)}`}>{sub.status}</span>
                    </div>
                    <div className="relative h-2 bg-gray-100 rounded-full mb-1">
                      <div className="absolute h-2 bg-purple-200 rounded-full" style={{ width: `${sub.planned}%` }} />
                      <div className="absolute h-2 bg-green-400 rounded-full" style={{ width: `${sub.taught}%` }} />
                    </div>
                    <p className="text-[10px] text-gray-400 text-right">{sub.topicsLeft} topics left | {sub.daysAvailable} days available</p>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Insights Sidebar */}
          <div className="w-56 shrink-0">
            <div className="bg-[#ede9fb] rounded-xl p-4">
              <p className="font-black text-sm flex items-center gap-1 text-[#695be6] mb-3">
                <span className="material-symbols-outlined text-base">auto_awesome</span> Coverage Insights
              </p>
              {d.insights.map((ins) => (
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
              <button onClick={() => navigate("/schooladmin/weak-topics")} className="w-full border border-gray-300 bg-white text-xs font-bold py-2 rounded-xl mt-1">VIEW DETAILED AUDIT</button>
            </div>
          </div>
        </div>

        <div className="mt-4 flex justify-between text-[10px] text-gray-400">
          <span>Last Sync: 12 minutes ago · Database Status: <span className="font-bold text-gray-600">Healthy</span></span>
          <span>Compliance ID: ACAD-9932-X</span>
        </div>
      </div>
    </AdminLayout>
  );
}
