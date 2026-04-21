import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { AdminLayout } from "./Home";
import { fetchCrossClass, selectCrossClass } from "../../store/slices/schoolAdminSlice";

export default function CrossClass() {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const [grade, setGrade] = useState("All");

  const crossClassData = useSelector(selectCrossClass);

  useEffect(() => {
    dispatch(fetchCrossClass());
  }, [dispatch]);

  // API returns array of section objects with avg_score, student_count, etc.
  const sections = Array.isArray(crossClassData) ? crossClassData : [];
  const filtered = sections.filter((s) => {
    const gradeMatch = grade === "All" || s.class_name?.includes(grade.replace("Grade ", "Grade "));
    return gradeMatch;
  });

  const sorted = [...filtered].sort((a, b) => (b.avg_score || 0) - (a.avg_score || 0));
  const best = sorted[0];
  const worst = sorted[sorted.length - 1];
  const grades = [...new Set(sections.map((s) => `Grade ${s.grade_number}`))];

  return (
    <AdminLayout active="/schooladmin/cross-class">
      <div className="p-6">
        <div className="flex items-center gap-3 mb-4">
          <button onClick={() => navigate("/schooladmin")} className="text-gray-400 hover:text-gray-600">
            <span className="material-symbols-outlined">arrow_back</span>
          </button>
          <h1 className="text-xl font-black text-[#100e1a]">Class Comparison</h1>
        </div>

        {sections.length === 0 ? (
          <div className="bg-white rounded-xl border border-gray-100 p-8 text-center text-gray-400">
            <span className="material-symbols-outlined text-4xl mb-2">school</span>
            <p className="font-medium">No class data available yet</p>
            <p className="text-sm mt-1">Add sections and students to see comparisons.</p>
          </div>
        ) : (
          <>
            <div className="flex items-center gap-3 mb-5 flex-wrap">
              <span className="text-xs font-bold text-gray-500">FILTER BY GRADE:</span>
              {["All", ...grades].map((g) => (
                <button key={g} onClick={() => setGrade(g)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-colors ${grade === g ? "bg-[#695be6] text-white border-[#695be6]" : "bg-white border-gray-200 text-gray-600"}`}>
                  {g}
                </button>
              ))}
            </div>

            <div className="flex gap-4">
              <div className="flex-1">
                {best && worst && (
                  <div className="grid grid-cols-2 gap-4 mb-5">
                    <div className="bg-[#fdf6ff] border border-purple-100 rounded-xl p-4">
                      <p className="text-[10px] font-black text-gray-400 tracking-widest mb-2">BEST PERFORMANCE</p>
                      <div className="flex items-start justify-between">
                        <div>
                          <p className="text-2xl font-black text-[#100e1a]">{best.class_name}</p>
                          <p className="text-xs text-gray-500">{best.student_count} Students</p>
                        </div>
                        <div className="flex flex-col items-end gap-1">
                          <div className="size-10 bg-purple-100 rounded-xl flex items-center justify-center">
                            <span className="material-symbols-outlined text-purple-500">emoji_events</span>
                          </div>
                          <span className="bg-green-100 text-green-700 font-black text-lg px-2 py-0.5 rounded-lg">{best.avg_score}%</span>
                        </div>
                      </div>
                    </div>
                    <div className="bg-[#fff5f5] border border-red-100 rounded-xl p-4">
                      <p className="text-[10px] font-black text-gray-400 tracking-widest mb-2">NEEDS SUPPORT</p>
                      <div className="flex items-start justify-between">
                        <div>
                          <p className="text-2xl font-black text-[#100e1a]">{worst.class_name}</p>
                          <p className="text-xs text-gray-500">{worst.student_count} Students</p>
                        </div>
                        <div className="flex flex-col items-end gap-1">
                          <div className="size-10 bg-red-100 rounded-xl flex items-center justify-center">
                            <span className="material-symbols-outlined text-red-500">trending_down</span>
                          </div>
                          <span className="bg-red-100 text-red-700 font-black text-lg px-2 py-0.5 rounded-lg">{worst.avg_score}%</span>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
                  <p className="font-bold flex items-center gap-2 mb-3">
                    <span className="material-symbols-outlined text-[#695be6] text-base">format_list_numbered</span>
                    Performance Ranking
                  </p>
                  <div className="flex flex-col gap-3">
                    {sorted.map((s, i) => (
                      <div key={s._id} className="flex items-center gap-3 bg-[#fdf6ff] rounded-xl p-3">
                        <div className="size-8 bg-[#695be6] rounded-full flex items-center justify-center text-white font-black text-sm">{i + 1}</div>
                        <div className="flex-1">
                          <p className="font-bold text-sm">{s.class_name}</p>
                          <p className="text-xs text-gray-500">{s.student_count} Students • {s.submission_count || 0} Submissions</p>
                        </div>
                        <div className="text-right">
                          <p className="text-[10px] text-gray-400">Avg Score</p>
                          <div className="flex items-center gap-2">
                            <div className="w-20 h-2 bg-gray-100 rounded-full">
                              <div className="h-2 bg-[#695be6] rounded-full" style={{ width: `${s.avg_score || 0}%` }} />
                            </div>
                            <span className="font-black text-sm text-[#695be6]">{s.avg_score || 0}%</span>
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
                  {[
                    { title: "Consistent Homework", desc: "Regular assignments with timely feedback", impact: "15% improvement" },
                    { title: "AI-Assisted Learning", desc: "Students using LumiTutor for doubts", impact: "12% improvement" },
                    { title: "Parent Engagement", desc: "Regular teacher-parent communication", impact: "8% improvement" },
                  ].map((bp) => (
                    <div key={bp.title} className="bg-white/10 rounded-xl p-3 mb-3">
                      <p className="font-bold text-sm mb-1">{bp.title}</p>
                      <p className="text-xs text-white/70 mb-2">{bp.desc}</p>
                      <span className="bg-green-400/30 text-green-200 text-[9px] font-black px-2 py-0.5 rounded-full">+ {bp.impact}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </AdminLayout>
  );
}
