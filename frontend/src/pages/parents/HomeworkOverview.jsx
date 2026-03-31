import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import {
  fetchParentDashboard,
  fetchHomeworkOverview,
  selectChildren,
  selectHomeworkOverview,
} from "../../store/slices/parentSlice";

const SUBJECT_FILTERS = ["All", "Mathematics", "Science", "English", "SST"];

export default function ParentHomeworkOverview() {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const [filter, setFilter] = useState("All");

  const children = useSelector(selectChildren);
  const homeworkList = useSelector(selectHomeworkOverview);

  useEffect(() => {
    dispatch(fetchParentDashboard()).then((res) => {
      const kids = res.payload?.children || [];
      if (kids.length > 0) dispatch(fetchHomeworkOverview(kids[0]._id));
    });
  }, [dispatch]);

  const child = children[0];

  const filtered = filter === "All"
    ? homeworkList
    : homeworkList.filter((h) => h.subject === filter);

  const completed = homeworkList.filter((h) => h.status === "graded").length;
  const active = homeworkList.filter((h) => h.status === "active").length;
  const overdue = homeworkList.filter((h) => {
    if (!h.due_date) return false;
    return new Date(h.due_date) < new Date() && h.status === "active";
  }).length;

  return (
    <div className="bg-[#f6f6f8] min-h-screen pb-10" style={{ fontFamily: "'Lexend', sans-serif" }}>
      <div className="bg-white border-b border-gray-100 px-4 py-4 flex items-center gap-3">
        <button onClick={() => navigate("/parent")} className="size-9 flex items-center justify-center rounded-xl hover:bg-gray-100">
          <span className="material-symbols-outlined text-xl">arrow_back</span>
        </button>
        <h1 className="text-lg font-bold flex-1">Homework Overview</h1>
        <button onClick={() => navigate("/parent/notifications")} className="relative">
          <span className="material-symbols-outlined text-2xl text-gray-600">notifications</span>
        </button>
      </div>

      <div className="max-w-lg mx-auto px-4 pt-4">
        {child && (
          <div className="flex items-center gap-3 mb-4">
            <div className="size-12 rounded-full bg-[#695be6]/20 flex items-center justify-center">
              <span className="material-symbols-outlined text-[#695be6] text-2xl">person</span>
            </div>
            <div>
              <p className="font-bold">{child.name}</p>
              <p className="text-sm text-gray-500">Grade {child.grade_number}-{child.section_name} • {child.class_name}</p>
            </div>
          </div>
        )}

        <div className="flex items-center justify-between mb-3">
          <h2 className="font-bold text-base">Homework Summary</h2>
        </div>

        <div className="grid grid-cols-4 gap-2 mb-4">
          {[
            { label: "TOTAL", count: homeworkList.length, bg: "bg-blue-50", border: "border-blue-100", text: "text-blue-700" },
            { label: "ACTIVE", count: active, bg: "bg-yellow-50", border: "border-yellow-100", text: "text-yellow-700" },
            { label: "COMPLETED", count: completed, bg: "bg-green-50", border: "border-green-100", text: "text-green-700" },
            { label: "OVERDUE", count: overdue, bg: "bg-red-50", border: "border-red-100", text: "text-red-700" },
          ].map((s) => (
            <div key={s.label} className={`${s.bg} border ${s.border} rounded-xl p-3`}>
              <p className={`text-[10px] font-bold ${s.text}`}>{s.label}</p>
              <p className={`text-2xl font-black ${s.text}`}>{s.count}</p>
            </div>
          ))}
        </div>

        <div className="bg-[#695be6]/10 rounded-2xl p-4 mb-4">
          <div className="flex items-center gap-2 mb-1">
            <span className="material-symbols-outlined text-[#695be6] text-base">bar_chart</span>
            <p className="text-sm font-bold text-[#695be6]">Learning Consistency</p>
          </div>
          <p className="text-xl font-black text-[#695be6]">
            {completed}/{homeworkList.length} submitted
          </p>
          <div className="flex items-center justify-between mt-2">
            <div className="flex items-center gap-2 flex-1">
              <span className="text-xs text-gray-600 font-medium">Completion</span>
              <div className="flex-1 bg-white/50 rounded-full h-2">
                <div className="bg-[#695be6] h-2 rounded-full" style={{ width: `${homeworkList.length ? Math.round((completed / homeworkList.length) * 100) : 0}%` }}></div>
              </div>
              <span className="text-xs font-bold text-[#695be6]">
                {homeworkList.length ? Math.round((completed / homeworkList.length) * 100) : 0}%
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between mb-3">
          <h2 className="font-bold text-base">Subject-wise Homework</h2>
        </div>
        <div className="flex gap-2 mb-3 overflow-x-auto pb-1">
          {SUBJECT_FILTERS.map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`shrink-0 px-3 py-1.5 rounded-full text-sm font-semibold transition-colors ${filter === f ? "bg-[#695be6] text-white" : "bg-white border border-gray-200 text-gray-600"}`}
            >
              {f}
            </button>
          ))}
        </div>

        {filtered.length === 0 ? (
          <div className="bg-white rounded-2xl border border-gray-100 p-8 text-center text-gray-400">
            <span className="material-symbols-outlined text-4xl mb-2">assignment</span>
            <p className="font-medium">No homework found</p>
          </div>
        ) : (
          <div className="flex flex-col gap-3 mb-6">
            {filtered.map((hw) => {
              const isOverdue = hw.due_date && new Date(hw.due_date) < new Date() && hw.status === "active";
              return (
                <div key={hw._id} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
                  <div className="flex items-start justify-between mb-1">
                    <p className="font-bold text-sm">{hw.title}</p>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                      hw.status === "graded" ? "bg-green-100 text-green-700" :
                      isOverdue ? "bg-red-100 text-red-700" : "bg-yellow-100 text-yellow-700"
                    }`}>
                      {hw.status === "graded" ? "DONE" : isOverdue ? "OVERDUE" : "PENDING"}
                    </span>
                  </div>
                  <p className="text-xs text-gray-400 mb-2">{hw.subject} • Due: {hw.due_date || "N/A"}</p>
                  <p className="text-xs text-gray-500">{hw.questions?.length || 0} questions</p>
                </div>
              );
            })}
          </div>
        )}

        <div className="flex gap-3">
          <button onClick={() => navigate("/parent/notifications")} className="flex-1 border-2 border-[#695be6] text-[#695be6] font-bold py-3.5 rounded-2xl flex items-center justify-center gap-2">
            <span className="material-symbols-outlined text-xl">chat</span> Contact Teacher
          </button>
        </div>
      </div>
    </div>
  );
}
