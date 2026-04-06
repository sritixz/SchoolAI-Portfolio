import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { AdminLayout } from "./Home";
import { fetchWeakTopics, selectWeakTopics } from "../../store/slices/schoolAdminSlice";

export default function WeakTopics() {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const weakTopicsRaw = useSelector(selectWeakTopics);

  useEffect(() => {
    dispatch(fetchWeakTopics());
  }, [dispatch]);

  // API now returns { gap_topics: [...], low_score_topics: [...] }
  const gapTopics = weakTopicsRaw?.gap_topics || (Array.isArray(weakTopicsRaw) ? weakTopicsRaw : []);
  const lowScoreTopics = weakTopicsRaw?.low_score_topics || [];
  const hasData = gapTopics.length > 0 || lowScoreTopics.length > 0;

  return (
    <AdminLayout active="/schooladmin/weak-topics">
      <div className="p-6">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-3">
            <div className="size-8 bg-[#695be6] rounded-lg flex items-center justify-center text-white">
              <span className="material-symbols-outlined text-base">bar_chart</span>
            </div>
            <div>
              <h1 className="text-xl font-black text-[#100e1a]">Weak Topics Analysis</h1>
              <p className="text-[10px] font-black text-gray-400 tracking-widest">SYSTEMIC PERFORMANCE TRACKER</p>
            </div>
          </div>
        </div>

        <div className="flex gap-4 mt-4">
          <div className="flex-1">
            {!hasData ? (
              <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-8 text-center text-gray-400">
                <span className="material-symbols-outlined text-4xl mb-2">bar_chart</span>
                <p className="font-medium">No submission data yet</p>
                <p className="text-sm mt-1">Weak topics will appear here once students submit homework.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {gapTopics.length > 0 && (
                  <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
                    <div className="p-4 border-b border-gray-100">
                      <p className="font-bold text-sm">Learning Gap Topics</p>
                    </div>
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="bg-gray-50">
                          <th className="text-left p-3 text-xs font-bold text-gray-500">TOPIC</th>
                          <th className="p-3 text-center text-xs font-bold text-gray-500">SUBJECT</th>
                          <th className="p-3 text-center text-xs font-bold text-gray-500">STUDENTS AFFECTED</th>
                          <th className="p-3 text-center text-xs font-bold text-gray-500">STATUS</th>
                        </tr>
                      </thead>
                      <tbody>
                        {gapTopics.map((row, i) => (
                          <tr key={i} className="border-t border-gray-100">
                            <td className="p-3 font-medium text-[#100e1a]">{row.topic || "Unknown"}</td>
                            <td className="p-3 text-center text-gray-500">{row.subject || "—"}</td>
                            <td className="p-3 text-center font-bold">{row.affected_students}</td>
                            <td className="p-3 text-center">
                              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${row.affected_students > 5 ? "bg-red-100 text-red-700" : row.affected_students > 2 ? "bg-yellow-100 text-yellow-700" : "bg-green-100 text-green-700"}`}>
                                {row.affected_students > 5 ? "Critical" : row.affected_students > 2 ? "At Risk" : "Monitor"}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
                {lowScoreTopics.length > 0 && (
                  <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
                    <div className="p-4 border-b border-gray-100">
                      <p className="font-bold text-sm">Low Score Topics (from Homework)</p>
                    </div>
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="bg-gray-50">
                          <th className="text-left p-3 text-xs font-bold text-gray-500">TOPIC</th>
                          <th className="p-3 text-center text-xs font-bold text-gray-500">SUBMISSIONS</th>
                          <th className="p-3 text-center text-xs font-bold text-gray-500">AVG SCORE</th>
                          <th className="p-3 text-center text-xs font-bold text-gray-500">STATUS</th>
                        </tr>
                      </thead>
                      <tbody>
                        {lowScoreTopics.map((row, i) => {
                          const score = row.avg_score || 0;
                          const status = score < 50 ? "Critical" : score < 70 ? "At Risk" : "OK";
                          const statusColor = score < 50 ? "bg-red-100 text-red-700" : score < 70 ? "bg-yellow-100 text-yellow-700" : "bg-green-100 text-green-700";
                          return (
                            <tr key={i} className="border-t border-gray-100">
                              <td className="p-3 font-medium text-[#100e1a]">{row.topic || "Unknown"}</td>
                              <td className="p-3 text-center font-bold">{row.count}</td>
                              <td className="p-3 text-center">
                                <div className="flex items-center gap-2 justify-center">
                                  <div className="w-16 h-2 bg-gray-100 rounded-full">
                                    <div className={`h-2 rounded-full ${score < 50 ? "bg-red-400" : score < 70 ? "bg-yellow-400" : "bg-green-400"}`} style={{ width: `${score}%` }} />
                                  </div>
                                  <span className="font-black text-sm">{score}%</span>
                                </div>
                              </td>
                              <td className="p-3 text-center">
                                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${statusColor}`}>{status}</span>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="w-64 shrink-0">
            <div className="bg-[#1a1a2e] rounded-xl p-4 text-white">
              <p className="font-black text-sm flex items-center gap-2 mb-3">
                <span className="material-symbols-outlined text-[#695be6] text-base">location_on</span>
                Root Cause Analysis
              </p>
              {[
                { title: "Prerequisite Gaps", desc: "Foundational gaps from earlier grades impact secondary performance." },
                { title: "Curriculum Pacing", desc: "Rapid topic transitions without adequate consolidation time." },
                { title: "Post-Assessment Drift", desc: "Low retention 4 months post-assessment across persistent topics." },
              ].map((rc) => (
                <div key={rc.title} className="bg-[#695be6]/20 border border-[#695be6]/30 rounded-xl p-3 mb-2">
                  <p className="font-bold text-sm mb-1">{rc.title}</p>
                  <p className="text-[10px] text-white/70">{rc.desc}</p>
                </div>
              ))}
              <div className="mt-3">
                <p className="text-[10px] font-black text-gray-400 tracking-widest mb-2">STRATEGIC INTERVENTIONS</p>
                {[
                  "Implement spiral review sessions for weak topics.",
                  "Cross-department teacher workshops on prerequisite bridging.",
                  "Introduce micro-assessments every 3 weeks.",
                ].map((si, i) => (
                  <div key={i} className="flex items-start gap-2 mb-1.5">
                    <span className="material-symbols-outlined text-green-400 text-sm mt-0.5">check_circle</span>
                    <p className="text-[10px] text-white/80">{si}</p>
                  </div>
                ))}
              </div>
              <button onClick={() => navigate("/schooladmin/matrix")} className="w-full bg-white text-[#1a1a2e] text-xs font-black py-2 rounded-xl mt-3">View Full Diagnostic Report</button>
            </div>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}
