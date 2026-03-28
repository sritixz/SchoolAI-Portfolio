import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { consistencyData } from "../../data/parentData";

const { score, trend, percentile, target, peakActivity, engagement, streaks, calendar, aiInsight } = consistencyData;

const STATUS_DOT = { completed: "bg-green-500", partial: "bg-yellow-400", missed: "bg-red-500" };

const DAYS = ["MON", "TUE", "WED", "THU", "FRI", "SAT", "SUN"];

// Build a simple Dec 2024 calendar grid (starts on Sunday=6 offset)
const CAL_ROWS = [
  [null, null, null, null, null, null, 1],
  [2, 3, 4, 5, 6, 7, 8],
  [9, 10, 11, 12, 13, 14, 15],
  [16, 17, 18, 19, 20, 21, 22],
  [23, 24, 25, 26, 27, 28, 29],
  [30, 31, null, null, null, null, null],
];

const getStatus = (date) => {
  const entry = calendar.days.find((d) => d.date === date);
  return entry?.status || null;
};

export default function ParentConsistency() {
  const navigate = useNavigate();
  const [month] = useState("December 2024");

  return (
    <div className="bg-[#f6f6f8] min-h-screen pb-10" style={{ fontFamily: "'Lexend', sans-serif" }}>
      {/* Header */}
      <div className="bg-white border-b border-gray-100 px-4 py-4 flex items-center gap-3">
        <button onClick={() => navigate("/parent")} className="size-9 flex items-center justify-center rounded-xl hover:bg-gray-100">
          <span className="material-symbols-outlined text-xl">arrow_back</span>
        </button>
        <div className="flex-1">
          <p className="text-xs text-gray-400">Aarav Sharma • Grade 8-A</p>
          <h1 className="text-lg font-bold">Learning Consistency</h1>
        </div>
        <button className="border border-gray-200 rounded-xl px-3 py-1.5 text-sm flex items-center gap-1 text-gray-600">
          <span className="material-symbols-outlined text-base">calendar_month</span> Last 30 Days
          <span className="material-symbols-outlined text-base">expand_more</span>
        </button>
      </div>

      <div className="max-w-2xl mx-auto px-4 pt-4 space-y-4">
        {/* Score + Peak */}
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
            <p className="text-xs text-gray-500 font-medium">Overall Consistency Score</p>
            <div className="flex items-end gap-2 mt-1">
              <p className="text-4xl font-black">{score}%</p>
              <p className="text-emerald-500 text-sm font-bold mb-1">↑ {trend}</p>
            </div>
            <p className="text-xs text-gray-400">vs. last 30 day period</p>
            <div className="flex gap-3 mt-3">
              <div className="bg-[#695be6]/10 rounded-lg px-2 py-1">
                <p className="text-[10px] text-[#695be6] font-bold">TOP PERCENTILE</p>
                <p className="text-sm font-black text-[#695be6]">{percentile}</p>
              </div>
              <div>
                <p className="text-[10px] text-gray-400 font-bold">TARGET</p>
                <p className="text-sm font-black">{target}</p>
              </div>
            </div>
          </div>
          <div className="bg-[#695be6] rounded-2xl p-4 text-white">
            <span className="material-symbols-outlined text-2xl mb-2">lightbulb</span>
            <p className="font-bold text-sm">Peak Activity Pattern</p>
            <p className="text-xs text-white/80 mt-1">{peakActivity}</p>
            <button className="mt-3 text-xs font-bold underline">VIEW DETAILS</button>
          </div>
        </div>

        {/* Engagement Metrics */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
          <div className="flex items-center gap-2 mb-3">
            <span className="material-symbols-outlined text-[#695be6] text-xl">bolt</span>
            <p className="font-bold">Engagement Metrics</p>
          </div>
          <div className="space-y-3">
            {[
              { icon: "schedule", label: "Time Spent", value: engagement.timeSpent },
              { icon: "help", label: "Doubts Asked", value: engagement.doubtsAsked },
              { icon: "quiz", label: "Tests Taken", value: engagement.testsTaken },
            ].map((e) => (
              <div key={e.label} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-gray-400 text-base">{e.icon}</span>
                  <span className="text-sm text-gray-600">{e.label}</span>
                </div>
                <span className="font-bold text-sm">{e.value}</span>
              </div>
            ))}
          </div>
          {/* Engagement trend bars */}
          <p className="text-xs text-gray-400 font-bold mt-4 mb-2">ENGAGEMENT TREND</p>
          <div className="flex items-end gap-1 h-12">
            {[40, 55, 45, 60, 80, 50, 35].map((h, i) => (
              <div key={i} className="flex-1 rounded-t-sm" style={{ height: `${h}%`, backgroundColor: i === 4 ? "#695be6" : "#e0dcff" }}></div>
            ))}
          </div>
          <div className="flex justify-between mt-1">
            <span className="text-[10px] text-gray-400">MON</span>
            <span className="text-[10px] text-gray-400">SUN</span>
          </div>
          {/* AI Insight */}
          <div className="mt-3 bg-green-50 rounded-xl p-3 flex gap-2">
            <span className="text-xl">😊</span>
            <p className="text-xs text-gray-700">{aiInsight}</p>
          </div>
        </div>

        {/* Homework Regularity Calendar */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
          <div className="flex items-center gap-2 mb-3">
            <span className="material-symbols-outlined text-[#695be6] text-xl">calendar_month</span>
            <p className="font-bold">Homework Regularity</p>
            <div className="ml-auto flex items-center gap-3 text-xs text-gray-500">
              <span className="flex items-center gap-1"><span className="size-2 rounded-full bg-green-500 inline-block"></span>Completed</span>
              <span className="flex items-center gap-1"><span className="size-2 rounded-full bg-yellow-400 inline-block"></span>Partial</span>
              <span className="flex items-center gap-1"><span className="size-2 rounded-full bg-red-500 inline-block"></span>Missed</span>
            </div>
          </div>
          <div className="flex items-center justify-between mb-3">
            <button className="size-7 flex items-center justify-center rounded-full hover:bg-gray-100">
              <span className="material-symbols-outlined text-base">chevron_left</span>
            </button>
            <p className="font-bold text-sm">{month}</p>
            <button className="size-7 flex items-center justify-center rounded-full hover:bg-gray-100">
              <span className="material-symbols-outlined text-base">chevron_right</span>
            </button>
          </div>
          <div className="grid grid-cols-7 gap-1 mb-1">
            {DAYS.map((d) => <p key={d} className="text-center text-[10px] text-gray-400 font-bold">{d}</p>)}
          </div>
          {CAL_ROWS.map((row, ri) => (
            <div key={ri} className="grid grid-cols-7 gap-1 mb-1">
              {row.map((date, ci) => {
                const status = date ? getStatus(date) : null;
                return (
                  <div key={ci} className="aspect-square flex flex-col items-center justify-center rounded-lg text-xs text-gray-500">
                    {date && (
                      <>
                        <span>{date}</span>
                        {status && <span className={`size-1.5 rounded-full mt-0.5 ${STATUS_DOT[status]}`}></span>}
                      </>
                    )}
                  </div>
                );
              })}
            </div>
          ))}
        </div>

        {/* Streaks */}
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: "CURRENT STREAK", value: `${streaks.current} Days`, icon: "local_fire_department", bg: "bg-orange-50", iconColor: "text-orange-500" },
            { label: "BEST STREAK", value: `${streaks.best} Days`, icon: "military_tech", bg: "bg-[#695be6]/10", iconColor: "text-[#695be6]" },
            { label: "THIS WEEK", value: `${streaks.thisWeek} Days`, icon: "check_circle", bg: "bg-blue-50", iconColor: "text-blue-500" },
          ].map((s) => (
            <div key={s.label} className={`${s.bg} rounded-2xl p-3 flex items-center gap-2`}>
              <span className={`material-symbols-outlined text-2xl ${s.iconColor}`}>{s.icon}</span>
              <div>
                <p className="text-[10px] text-gray-500 font-bold">{s.label}</p>
                <p className="font-black text-sm">{s.value}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
