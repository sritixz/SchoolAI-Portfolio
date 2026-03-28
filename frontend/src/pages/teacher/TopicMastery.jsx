import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { masteryTopics, masteryStudents } from "../../data/teacherData";

const SCORE_COLOR = (score) => {
  if (score >= 80) return "bg-green-700 text-white";
  if (score >= 65) return "bg-green-500 text-white";
  if (score >= 50) return "bg-yellow-400 text-white";
  if (score >= 35) return "bg-orange-400 text-white";
  return "bg-red-500 text-white";
};

const AVG_COLOR = (avg) => {
  if (avg >= 80) return "bg-green-100 text-green-700";
  if (avg >= 60) return "bg-yellow-100 text-yellow-700";
  return "bg-red-100 text-red-600";
};

export default function TopicMastery() {
  const navigate = useNavigate();
  const [selectedStudent, setSelectedStudent] = useState(masteryStudents[0]);
  const [selectedTopic, setSelectedTopic] = useState(0);
  const [gradeFilter, setGradeFilter] = useState("Grade 9 - Section B");
  const [subjectFilter, setSubjectFilter] = useState("Math");
  const [search, setSearch] = useState("");

  const filtered = masteryStudents.filter((s) =>
    s.name.toLowerCase().includes(search.toLowerCase())
  );

  const selectedScore = selectedStudent?.scores[selectedTopic];

  return (
    <div className="bg-white min-h-screen" style={{ fontFamily: "'Lexend', sans-serif" }}>

      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-white border-b border-gray-200">
        <div className="max-w-[1400px] mx-auto px-6 h-14 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <button onClick={() => navigate("/teacher")} className="p-2 hover:bg-gray-100 rounded-lg">
              <span className="material-symbols-outlined text-gray-500">arrow_back</span>
            </button>
            <h1 className="font-black text-lg">Topic Mastery Heatmap</h1>
          </div>
          <div className="flex items-center gap-3">
            <select
              value={gradeFilter}
              onChange={(e) => setGradeFilter(e.target.value)}
              className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm bg-white outline-none"
            >
              <option>Grade 9 - Section B</option>
              <option>Grade 8 - Section A</option>
              <option>Grade 10 - Section A</option>
            </select>
            <select
              value={subjectFilter}
              onChange={(e) => setSubjectFilter(e.target.value)}
              className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm bg-white outline-none"
            >
              <option>Math</option>
              <option>Science</option>
              <option>English</option>
            </select>
          </div>
          <div className="flex items-center gap-3 ml-auto">
            {/* Legend */}
            <div className="hidden md:flex items-center gap-3 text-xs font-semibold">
              <span className="flex items-center gap-1"><span className="size-3 rounded-sm bg-green-700 inline-block"></span> MASTERY</span>
              <span className="flex items-center gap-1"><span className="size-3 rounded-sm bg-green-500 inline-block"></span> GOOD</span>
              <span className="flex items-center gap-1"><span className="size-3 rounded-sm bg-yellow-400 inline-block"></span> DEV.</span>
              <span className="flex items-center gap-1"><span className="size-3 rounded-sm bg-orange-400 inline-block"></span> STRUGGLE</span>
              <span className="flex items-center gap-1"><span className="size-3 rounded-sm bg-red-500 inline-block"></span> CRITICAL</span>
            </div>
            <button className="p-2 hover:bg-gray-100 rounded-lg">
              <span className="material-symbols-outlined text-gray-500">help_outline</span>
            </button>
            <div className="size-9 rounded-full bg-[#695be6] flex items-center justify-center text-white font-bold text-sm">P</div>
          </div>
        </div>

        {/* Sub-header filters */}
        <div className="max-w-[1400px] mx-auto px-6 py-2 flex items-center gap-3 border-t border-gray-100">
          <div className="flex items-center gap-2 bg-gray-100 rounded-lg px-3 py-1.5 flex-1 max-w-xs">
            <span className="material-symbols-outlined text-gray-400 text-sm">search</span>
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="bg-transparent text-sm outline-none w-full placeholder-gray-400"
              placeholder="Search student..."
            />
          </div>
          <button className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm font-semibold bg-white">
            Chapter 1: Algebra Fundamentals
          </button>
          <button className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm font-semibold bg-white">
            Sort: Performance (Desc)
          </button>
          <button
            onClick={() => {
              const data = JSON.stringify({ grade: gradeFilter, subject: subjectFilter, students: masteryStudents }, null, 2);
              const blob = new Blob([data], { type: "application/json" });
              const url = URL.createObjectURL(blob);
              const a = document.createElement("a"); a.href = url; a.download = "mastery-data.json"; a.click();
            }}
            className="ml-auto flex items-center gap-1.5 border border-gray-200 rounded-lg px-4 py-1.5 text-sm font-semibold bg-white hover:bg-gray-50"
          >
            <span className="material-symbols-outlined text-sm">download</span> Export Data
          </button>
        </div>
      </header>

      <div className="max-w-[1400px] mx-auto pt-28 px-6 pb-24 flex gap-4">

        {/* Heatmap */}
        <div className="flex-1 overflow-x-auto">
          <table className="border-collapse">
            <thead>
              <tr>
                <th className="w-28 p-2"></th>
                <th className="w-16 p-2"></th>
                {masteryTopics.map((topic, i) => (
                  <th
                    key={i}
                    className="p-1 cursor-pointer"
                    onClick={() => setSelectedTopic(i)}
                  >
                    <div className="flex items-end justify-center h-24">
                      <span
                        className={`text-[10px] font-bold text-gray-600 whitespace-nowrap`}
                        style={{ writingMode: "vertical-rl", transform: "rotate(180deg)" }}
                      >
                        {topic}
                      </span>
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((student) => (
                <tr
                  key={student.id}
                  onClick={() => setSelectedStudent(student)}
                  className={`cursor-pointer ${selectedStudent?.id === student.id ? "bg-gray-50" : "hover:bg-gray-50"}`}
                >
                  <td className="p-2 pr-3">
                    <div className="flex items-center gap-2">
                      <div className="size-8 rounded-full bg-gray-200 flex items-center justify-center flex-shrink-0">
                        <span className="material-symbols-outlined text-gray-400 text-sm">person</span>
                      </div>
                      <div>
                        <p className="text-xs font-bold leading-tight">{student.name.split(" ")[0]}</p>
                        <p className="text-[10px] text-gray-400">{student.name.split(" ")[1]}</p>
                      </div>
                    </div>
                  </td>
                  <td className="p-2">
                    <span className={`text-xs font-black px-2 py-0.5 rounded-full ${AVG_COLOR(student.avg)}`}>
                      {student.avg}%
                    </span>
                    <p className="text-[9px] text-gray-400 text-center">Avg</p>
                  </td>
                  {student.scores.map((score, i) => (
                    <td key={i} className="p-0.5">
                      <div
                        className={`size-12 rounded flex items-center justify-center text-xs font-bold cursor-pointer hover:opacity-80 transition-opacity ${SCORE_COLOR(score)} ${
                          selectedTopic === i ? "ring-2 ring-[#695be6] ring-offset-1" : ""
                        }`}
                        onClick={(e) => { e.stopPropagation(); setSelectedTopic(i); setSelectedStudent(student); }}
                      >
                        {score}%
                      </div>
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Detail Panel */}
        <div className="w-64 flex-shrink-0">
          <div className="bg-white border border-gray-100 rounded-2xl shadow-sm p-4 sticky top-28">
            <p className="text-xs font-bold text-gray-400 mb-3">{masteryTopics[selectedTopic]}</p>

            {/* Donut */}
            <div className="flex flex-col items-center mb-4">
              <div className="relative size-24">
                <svg viewBox="0 0 36 36" className="size-24 -rotate-90">
                  <circle cx="18" cy="18" r="15.9" fill="none" stroke="#fee2e2" strokeWidth="3" />
                  <circle
                    cx="18" cy="18" r="15.9" fill="none"
                    stroke="#ef4444" strokeWidth="3"
                    strokeDasharray={`${selectedScore} ${100 - selectedScore}`}
                    strokeLinecap="round"
                  />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-xl font-black">{selectedScore}%</span>
                </div>
              </div>
              <p className={`text-xs font-bold mt-1 ${selectedScore < 50 ? "text-red-500" : selectedScore < 70 ? "text-yellow-600" : "text-green-600"}`}>
                {selectedScore < 50 ? "CRITICAL PERFORMANCE" : selectedScore < 70 ? "NEEDS IMPROVEMENT" : "GOOD PERFORMANCE"}
              </p>
            </div>

            {/* Trend */}
            <div className="mb-4">
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs font-bold">Performance Trend</p>
                <span className="text-xs text-red-500 font-semibold">↘ -8%</span>
              </div>
              <div className="flex items-end gap-1 h-12">
                {(selectedStudent?.scores.slice(0, 6) || []).map((v, i) => (
                  <div
                    key={i}
                    className="flex-1 rounded-sm bg-red-200"
                    style={{ height: `${(v / 100) * 100}%` }}
                  />
                ))}
              </div>
            </div>

            {/* Identified Gaps */}
            <div className="mb-4">
              <p className="text-xs font-bold mb-2">Identified Gaps</p>
              <div className="space-y-2">
                <div className="border border-gray-100 rounded-xl p-3">
                  <div className="flex items-center justify-between mb-1">
                    <p className="text-xs font-bold">Distributive Property</p>
                    <span className="text-[10px] font-bold bg-red-100 text-red-600 px-1.5 py-0.5 rounded">Critical</span>
                  </div>
                  <p className="text-[10px] text-gray-400">Struggles to correctly apply the distributive law when coefficients are negative.</p>
                </div>
                <div className="border border-gray-100 rounded-xl p-3">
                  <div className="flex items-center justify-between mb-1">
                    <p className="text-xs font-bold">Variable Isolation</p>
                    <span className="text-[10px] font-bold bg-yellow-100 text-yellow-700 px-1.5 py-0.5 rounded">Needs Review</span>
                  </div>
                </div>
              </div>
            </div>

            <button
              onClick={() => navigate("/teacher/homework/differentiated")}
              className="w-full bg-[#695be6] text-white text-xs font-bold py-2.5 rounded-xl hover:bg-[#5a4dd4] transition-colors mb-2"
            >
              Assign Targeted Practice
            </button>
            <button
              onClick={() => navigate("/teacher/interventions")}
              className="w-full border border-[#695be6] text-[#695be6] text-xs font-bold py-2.5 rounded-xl hover:bg-[#695be6]/5 transition-colors"
            >
              Add to Intervention Group
            </button>
          </div>
        </div>
      </div>

      {/* Footer Stats */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 px-6 py-3">
        <div className="max-w-[1400px] mx-auto flex items-center justify-between">
          <div className="flex items-center gap-6 text-xs text-gray-500">
            <span><strong className="text-gray-700">CLASS SIZE</strong><br />{masteryStudents.length * 8} Students</span>
            <span><strong className="text-gray-700">SCOPE</strong><br />{masteryTopics.length} Topics</span>
            <span><strong className="text-gray-700">AVG MASTERY</strong><br />64%</span>
          </div>
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1 text-xs font-bold text-red-500 bg-red-50 px-3 py-1.5 rounded-full">
              <span className="material-symbols-outlined text-sm">warning</span> 12 Critical Gaps
            </span>
            <span className="flex items-center gap-1 text-xs font-bold text-orange-500 bg-orange-50 px-3 py-1.5 rounded-full">
              <span className="material-symbols-outlined text-sm">info</span> 5 Topics Need Attention
            </span>
          </div>
          <button
            onClick={() => navigate("/teacher/analytics/root-cause")}
            className="flex items-center gap-2 bg-gray-900 text-white text-sm font-bold px-5 py-2.5 rounded-xl hover:bg-gray-800 transition-colors"
          >
            <span className="material-symbols-outlined text-base">auto_awesome</span> Generate Class Report
          </button>
        </div>
      </div>
    </div>
  );
}
