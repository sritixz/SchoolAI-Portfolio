import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import {
  fetchParentDashboard,
  fetchConsistency,
  selectChildren,
  selectConsistency,
} from "../../store/slices/parentSlice";

const STATUS_DOT = { completed: "bg-green-500", partial: "bg-yellow-400", missed: "bg-red-500" };
const DAYS = ["MON", "TUE", "WED", "THU", "FRI", "SAT", "SUN"];
const CAL_ROWS = [
  [null, null, null, null, null, null, 1],
  [2, 3, 4, 5, 6, 7, 8],
  [9, 10, 11, 12, 13, 14, 15],
  [16, 17, 18, 19, 20, 21, 22],
  [23, 24, 25, 26, 27, 28, 29],
  [30, 31, null, null, null, null, null],
];

export default function ParentConsistency() {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const [month] = useState("March 2026");

  const children = useSelector(selectChildren);
  const data = useSelector(selectConsistency);

  useEffect(() => {
    dispatch(fetchParentDashboard()).then((res) => {
      const kids = res.payload?.children || [];
      if (kids.length > 0) dispatch(fetchConsistency(kids[0]._id));
    });
  }, [dispatch]);

  const getStatus = (date) => {
    const days = data?.calendar?.days || [];
    const entry = days.find((d) => d.date === date);
    return entry?.status || null;
  };

  const child = children[0];
  const score = data?.score ?? "--";
  const trend = data?.trend ?? "0%";
  const percentile = data?.percentile ?? "--";
  const target = data?.target ?? "--";
  const peakActivity = data?.peakActivity ?? "Loading...";
  const engagement = data?.engagement ?? {};
  const streaks = data?.streaks ?? { current: 0, best: 0, thisWeek: 0 };
  const aiInsight = data?.aiInsight ?? "";

  return (
    <div className="bg-[#f6f6f8] min-h-screen pb-10" style={{ fontFamily: "'Lexend', sans-serif" }}>
      <div className="bg-white border-b border-gray-100 px-4 py-4 flex items-center gap-3">
        <button onClick={() => navigate("/parent")} className="size-9 flex items-center justify-center rounded-xl hover:bg-gray-100">
          <span className="material-symbols-outlined text-xl">arrow_back</span>
        </button>
        <div className="flex-1">
          <p className="text-xs text-gray-400">{child?.name} • Grade {child?.grade_number}-{child?.section_name}</p>
          <h1 className="text-lg font-bold">Learning Consistency</h1>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 pt-4 space-y-4">
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
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
          <div className="flex items-center gap-2 mb-3">
            <span className="material-symbols-outlined text-[#695be6] text-xl">bolt</span>
            <p className="font-bold">Engagement Metrics</p>
          </div>
          <div className="space-y-3">
            {[
              { icon: "schedule", label: "Time Spent", value: engagement.timeSpent || "--" },
              { icon: "help", label: "Doubts Asked", value: engagement.doubtsAsked || "--" },
              { icon: "quiz", label: "Tests Taken", value: engagement.testsTaken || "--" },
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
          {aiInsight && (
            <div className="mt-3 bg-green-50 rounded-xl p-3 flex gap-2">
              <span className="text-xl">😊</span>
              <p className="text-xs text-gray-700">{aiInsight}</p>
            </div>
          )}
        </div>

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
          <p className="font-bold text-sm text-center mb-3">{month}</p>
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
