import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { homeworkOverviewData } from "../../data/parentData";

const { child, stats, consistency, subjects } = homeworkOverviewData;

const SUBJECT_FILTERS = ["All", "Math", "Science", "English", "History"];

const dotColor = (c) => c === "green" ? "bg-green-500" : c === "yellow" ? "bg-yellow-400" : "bg-red-500";

export default function ParentHomeworkOverview() {
  const navigate = useNavigate();
  const [filter, setFilter] = useState("All");

  return (
    <div className="bg-[#f6f6f8] min-h-screen pb-10" style={{ fontFamily: "'Lexend', sans-serif" }}>
      {/* Header */}
      <div className="bg-white border-b border-gray-100 px-4 py-4 flex items-center gap-3">
        <button onClick={() => navigate("/parent")} className="size-9 flex items-center justify-center rounded-xl hover:bg-gray-100">
          <span className="material-symbols-outlined text-xl">arrow_back</span>
        </button>
        <h1 className="text-lg font-bold flex-1">Homework Overview</h1>
        <button onClick={() => navigate("/parent/notifications")} className="relative">
          <span className="material-symbols-outlined text-2xl text-gray-600">notifications</span>
          <span className="absolute -top-1 -right-1 size-3 bg-red-500 rounded-full"></span>
        </button>
      </div>

      <div className="max-w-lg mx-auto px-4 pt-4">
        {/* Child info */}
        <div className="flex items-center gap-3 mb-4">
          <div className="size-12 rounded-full bg-[#695be6]/20 flex items-center justify-center overflow-hidden">
            <img src="https://lh3.googleusercontent.com/aida-public/AB6AXuBjn_KzyG9Q4RzZ1WUzq-TuxGVq89imj91LIhE12t3m8IPGjPUxMBCGuKh94IvTt7E5yyjOUiXmMbFFnJgcqYfeLSD_hF8PSxTd0Gmr51A8q6yhv4NTg_WzdPXclnWbZWjSOti-IDCPuGBBDqtfThbEYDdM23NcOYTV4GaUojABLFatQcxWXOvlo-qe5a4HYOFntZ6UzvOiZBimSW61UIgq6nOFfCOrAA-KWIoVSsno6bz4eUutbl6ubKkh1EPLHjRQ3aDR8SuFiQY4" alt="" className="w-full h-full object-cover" />
          </div>
          <div>
            <p className="font-bold">{child.name}</p>
            <p className="text-sm text-gray-500">{child.grade} • <span className="material-symbols-outlined text-xs align-middle">calendar_month</span> {child.dateRange}</p>
          </div>
        </div>

        {/* This Week's Progress */}
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-bold text-base">This Week's Progress</h2>
          <button className="text-sm border border-gray-200 rounded-lg px-3 py-1 flex items-center gap-1 text-gray-600">
            This Week <span className="material-symbols-outlined text-base">expand_more</span>
          </button>
        </div>

        <div className="grid grid-cols-4 gap-2 mb-4">
          {[
            { label: "COMPLETED", count: stats.completed.count, pct: `${stats.completed.pct}%`, bg: "bg-green-50", border: "border-green-100", text: "text-green-700" },
            { label: "IN PROGRESS", count: stats.inProgress.count, pct: `${stats.inProgress.pct}%`, bg: "bg-yellow-50", border: "border-yellow-100", text: "text-yellow-700" },
            { label: "PENDING", count: stats.pending.count, pct: `${stats.pending.pct}%`, bg: "bg-orange-50", border: "border-orange-100", text: "text-orange-700" },
            { label: "OVERDUE", count: stats.overdue.count, pct: `${stats.overdue.pct}%`, bg: "bg-red-50", border: "border-red-100", text: "text-red-700" },
          ].map((s) => (
            <div key={s.label} className={`${s.bg} border ${s.border} rounded-xl p-3`}>
              <p className={`text-[10px] font-bold ${s.text}`}>{s.label}</p>
              <p className={`text-2xl font-black ${s.text}`}>{s.count}</p>
              <p className={`text-xs ${s.text}`}>{s.pct}</p>
            </div>
          ))}
        </div>

        {/* Learning Consistency Banner */}
        <div className="bg-[#695be6]/10 rounded-2xl p-4 mb-4">
          <div className="flex items-center gap-2 mb-1">
            <span className="material-symbols-outlined text-[#695be6] text-base">bar_chart</span>
            <p className="text-sm font-bold text-[#695be6]">Learning Consistency</p>
          </div>
          <p className="text-xl font-black text-[#695be6]">{consistency.submitted}/{consistency.total} submitted on time</p>
          <div className="flex items-center justify-between mt-2">
            <span className="text-xs bg-white/60 text-[#695be6] font-semibold px-2 py-0.5 rounded-full">↑ {consistency.trend}</span>
            <div className="flex items-center gap-2 flex-1 ml-4">
              <span className="text-xs text-gray-600 font-medium">Punctuality</span>
              <div className="flex-1 bg-white/50 rounded-full h-2">
                <div className="bg-[#695be6] h-2 rounded-full" style={{ width: `${consistency.punctuality}%` }}></div>
              </div>
              <span className="text-xs font-bold text-[#695be6]">{consistency.punctuality}%</span>
            </div>
          </div>
        </div>

        {/* Subject-wise Progress */}
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-bold text-base">Subject-wise Progress</h2>
          <button onClick={() => setFilter("All")} className="text-sm text-[#695be6] font-semibold">View All &gt;</button>
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
        <div className="grid grid-cols-2 gap-3 mb-6">
          {subjects
            .filter((s) => filter === "All" || s.name.toLowerCase().includes(filter.toLowerCase()))
            .map((s) => (
            <div key={s.name} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
              <div className="flex items-start justify-between mb-1">
                <p className="font-bold text-sm">{s.name}</p>
                <div className="flex gap-0.5">
                  {s.dots.map((d, i) => (
                    <span key={i} className={`size-2 rounded-full ${dotColor(d)}`}></span>
                  ))}
                </div>
              </div>
              <p className="text-xs text-gray-400 mb-2">{s.count} homework this week</p>
              <p className={`text-xs font-bold mb-1 ${s.pct === 100 ? "text-green-600" : s.pct >= 66 ? "text-[#695be6]" : "text-orange-500"}`}>{s.status}</p>
              <div className="w-full bg-gray-100 rounded-full h-1.5">
                <div className="h-1.5 rounded-full" style={{ width: `${s.pct}%`, backgroundColor: s.color }}></div>
              </div>
            </div>
          ))}
        </div>

        {/* Action Buttons */}
        <div className="flex gap-3">
          <button onClick={() => navigate("/parent/homework")} className="flex-1 bg-[#695be6] text-white font-bold py-3.5 rounded-2xl flex items-center justify-center gap-2">
            <span className="material-symbols-outlined text-xl">assignment</span> View All Homework
          </button>
          <button onClick={() => navigate("/parent/notifications")} className="flex-1 border-2 border-[#695be6] text-[#695be6] font-bold py-3.5 rounded-2xl flex items-center justify-center gap-2">
            <span className="material-symbols-outlined text-xl">chat</span> Contact Teacher
          </button>
        </div>
      </div>
    </div>
  );
}
