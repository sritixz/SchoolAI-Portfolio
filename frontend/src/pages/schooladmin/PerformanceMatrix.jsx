import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { AdminLayout } from "./Home";
import { fetchPerformanceMatrix, selectPerformanceMatrix } from "../../store/slices/schoolAdminSlice";

function scoreColor(s) {
  if (s >= 85) return "bg-green-200 text-green-800";
  if (s >= 70) return "bg-green-100 text-green-700";
  if (s >= 60) return "bg-yellow-100 text-yellow-700";
  if (s >= 50) return "bg-orange-100 text-orange-700";
  if (s >= 40) return "bg-orange-200 text-orange-800";
  return "bg-red-200 text-red-800";
}

const LEGEND = [
  { color: "bg-green-200", label: "85%+" },
  { color: "bg-yellow-100", label: "70-84%" },
  { color: "bg-orange-100", label: "60-69%" },
  { color: "bg-orange-200", label: "50-59%" },
  { color: "bg-red-100", label: "40-49%" },
  { color: "bg-red-200", label: "<40%" },
];

export default function PerformanceMatrix() {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const matrixData = useSelector(selectPerformanceMatrix);

  useEffect(() => {
    dispatch(fetchPerformanceMatrix());
  }, [dispatch]);

  // Use first doc from array (seeded as single doc)
  const d = matrixData[0] || {};
  const subjects = d.subjects || [];
  const grades = d.grades || [];
  const bestCluster = d.bestCluster || {};
  const priorityIntervention = d.priorityIntervention || {};
  const aiInsights = d.aiInsights || { growthTrends: [], priorityActions: [] };

  if (!matrixData.length) {
    return (
      <AdminLayout active="/schooladmin/matrix">
        <div className="p-6 flex items-center justify-center h-64">
          <div className="text-center text-gray-400">
            <span className="material-symbols-outlined text-4xl mb-2">hourglass_empty</span>
            <p>Loading performance data...</p>
          </div>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout active="/schooladmin/matrix">
      <div className="p-6">
        <div className="flex items-center gap-3 mb-6">
          <button onClick={() => navigate("/schooladmin")} className="text-gray-400 hover:text-gray-600">
            <span className="material-symbols-outlined">arrow_back</span>
          </button>
          <h1 className="text-xl font-black text-[#100e1a]">Full View Performance Matrix</h1>
        </div>

        <div className="flex gap-4">
          <div className="flex-1">
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div className="bg-white border-2 border-green-300 rounded-xl p-4 flex items-center gap-3">
                <div className="size-10 bg-green-100 rounded-xl flex items-center justify-center">
                  <span className="material-symbols-outlined text-green-600">emoji_events</span>
                </div>
                <div>
                  <p className="text-[10px] font-black text-gray-400 tracking-widest">BEST PERFORMING CLUSTER</p>
                  <p className="font-black text-[#100e1a]">{bestCluster.label}</p>
                  <p className="text-xs text-green-600 font-bold">{bestCluster.score}% Average Score</p>
                </div>
              </div>
              <div className="bg-white border-2 border-red-200 rounded-xl p-4 flex items-center gap-3">
                <div className="size-10 bg-red-100 rounded-xl flex items-center justify-center">
                  <span className="material-symbols-outlined text-red-500">warning</span>
                </div>
                <div>
                  <p className="text-[10px] font-black text-gray-400 tracking-widest">PRIORITY INTERVENTION</p>
                  <p className="font-black text-[#100e1a]">{priorityIntervention.label}</p>
                  <p className="text-xs text-red-500 font-bold">{priorityIntervention.score}% Average Score</p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50">
                    <th className="text-left p-3 text-xs font-bold text-gray-500 w-28">GRADE \ SUBJECT</th>
                    {subjects.map((s) => (
                      <th key={s} className="p-3 text-center text-xs font-bold text-gray-500">{s.toUpperCase()}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {grades.map((row) => (
                    <tr key={row.grade} className="border-t border-gray-100">
                      <td className="p-3 font-bold text-sm text-[#100e1a]">{row.grade}</td>
                      {(row.scores || []).map((score, i) => (
                        <td key={i} className="p-2 text-center">
                          <div className={`rounded-lg py-2 px-1 font-black text-sm ${scoreColor(score)}`}>
                            {score}%
                            {row.students?.[i] && <div className="text-[9px] font-normal opacity-70">{row.students[i]} Students</div>}
                          </div>
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="mt-3 flex items-center gap-1 flex-wrap">
              <span className="text-[10px] font-bold text-gray-400 mr-1">COLOR LEGEND</span>
              {LEGEND.map((l) => (
                <div key={l.label} className="flex items-center gap-1">
                  <div className={`size-3 rounded ${l.color}`} />
                  <span className="text-[10px] text-gray-500">{l.label}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="w-56 shrink-0">
            <div className="bg-[#ede9fb] rounded-xl p-4">
              <p className="font-black text-sm text-[#695be6] flex items-center gap-1 mb-3">
                <span className="material-symbols-outlined text-base">auto_awesome</span> AI Insights
              </p>
              <p className="text-[10px] font-black text-gray-400 tracking-widest mb-2">GROWTH TRENDS</p>
              {aiInsights.growthTrends.map((t) => (
                <div key={t.subject} className="flex items-center gap-2 mb-2">
                  <span className="material-symbols-outlined text-green-500 text-sm">trending_up</span>
                  <div className="flex-1">
                    <p className="text-xs font-bold">{t.subject}</p>
                    <p className="text-[10px] text-gray-500">{t.grades}</p>
                  </div>
                  <span className="text-xs font-black text-green-600">{t.change}</span>
                </div>
              ))}
              <p className="text-[10px] font-black text-gray-400 tracking-widest mt-3 mb-2">PRIORITY ACTIONS</p>
              {aiInsights.priorityActions.map((a) => (
                <div key={a.title} className="bg-white rounded-lg p-3 mb-2">
                  <p className="text-xs font-bold mb-1">{a.title}</p>
                  <p className="text-[10px] text-gray-500 mb-2">{a.desc}</p>
                  <button
                    onClick={() => navigate(a.action === "Draft Plan" ? "/schooladmin/curriculum" : "/schooladmin/gaps")}
                    className="w-full bg-[#695be6] text-white text-[10px] font-bold py-1.5 rounded-lg"
                  >{a.action}</button>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}
