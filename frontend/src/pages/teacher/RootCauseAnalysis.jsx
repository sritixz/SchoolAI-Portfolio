import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { runAiTool, selectAiToolResult, selectAiToolStatus, clearAiToolResult } from "../../store/slices/teacherSlice";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import {
  rootCauseStats,
  rootCauseTabs,
  prerequisiteGaps,
  proceduralIssues,
  errorCauseMap,
  aiInsight,
} from "../../data/teacher/rootCauseData";

export default function RootCauseAnalysis() {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const aiResult = useSelector(selectAiToolResult);
  const aiStatus = useSelector(selectAiToolStatus);
  const [activeTab, setActiveTab] = useState("mapping");
  const [expandedGaps, setExpandedGaps] = useState({ pg1: true });

  useEffect(() => () => { dispatch(clearAiToolResult()); }, [dispatch]);

  const handleGenerateAiInsights = () => {
    dispatch(runAiTool({
      tool: "classreport",
      subject: "Math",
      topic: "Root Cause Analysis",
      grade: "Grade 9",
      extra: {
        grade: "Grade 9",
        subject: "Math",
        topics: rootCauseStats.errorDistribution.map((d) => d.type),
        students: [],
        class_avg_per_topic: rootCauseStats.errorDistribution.map((d) => 100 - d.percent),
        overall_avg: rootCauseStats.avgScore,
        critical_topics: prerequisiteGaps.filter((g) => g.severity === "critical").map((g) => g.title),
        struggling_topics: prerequisiteGaps.filter((g) => g.severity !== "critical").map((g) => g.title),
      },
    }));
  };

  const handleExport = () => {
    const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
    const W = doc.internal.pageSize.getWidth();
    const PRIMARY = [105, 91, 230];

    // Header
    doc.setFillColor(...PRIMARY);
    doc.rect(0, 0, W, 24, "F");
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(14); doc.setFont("helvetica", "bold");
    doc.text("Root Cause Analysis Report", 14, 14);
    doc.setFontSize(8); doc.setFont("helvetica", "normal");
    doc.text(`Math › Chapter 5: Linear Equations  ·  Generated ${new Date().toLocaleDateString()}`, 14, 21);
    doc.setTextColor(17, 17, 17);

    let y = 32;

    // Stats
    autoTable(doc, {
      startY: y,
      head: [["Metric", "Value"]],
      body: [
        ["Students Analysed", rootCauseStats.studentsAnalysed],
        ["Questions Reviewed", rootCauseStats.questionsReviewed],
        ["Error Patterns Found", rootCauseStats.errorPatternsFound],
        ["Avg Score", `${rootCauseStats.avgScore}%`],
      ],
      theme: "grid",
      headStyles: { fillColor: PRIMARY, textColor: [255,255,255], fontSize: 8 },
      bodyStyles: { fontSize: 8 },
      margin: { left: 14, right: 14 },
    });
    y = doc.lastAutoTable.finalY + 8;

    // Prerequisite Gaps
    doc.setFontSize(10); doc.setFont("helvetica", "bold");
    doc.text("Prerequisite Knowledge Gaps", 14, y); y += 5;
    autoTable(doc, {
      startY: y,
      head: [["Gap", "Affected Students", "Severity", "Description"]],
      body: prerequisiteGaps.map((g) => [g.title, `${g.affectedStudents} students`, g.severity, g.description]),
      theme: "striped",
      headStyles: { fillColor: PRIMARY, textColor: [255,255,255], fontSize: 8 },
      bodyStyles: { fontSize: 8 },
      margin: { left: 14, right: 14 },
    });
    y = doc.lastAutoTable.finalY + 8;

    // AI Insight
    if (aiInsight) {
      doc.setFontSize(10); doc.setFont("helvetica", "bold");
      doc.text("AI Insight", 14, y); y += 5;
      doc.setFontSize(8.5); doc.setFont("helvetica", "normal");
      const lines = doc.splitTextToSize(aiInsight.text || "", W - 28);
      doc.text(lines, 14, y);
    }

    doc.save("root-cause-analysis.pdf");
  };
  const [expandedIssues, setExpandedIssues] = useState({});

  const toggleGap = (id) => setExpandedGaps((p) => ({ ...p, [id]: !p[id] }));
  const toggleIssue = (id) => setExpandedIssues((p) => ({ ...p, [id]: !p[id] }));

  // Donut chart values
  const total = rootCauseStats.errorDistribution.reduce((s, d) => s + d.percent, 0);
  let offset = 0;
  const radius = 15.9;
  const circumference = 2 * Math.PI * radius;

  return (
    <div className="bg-[#fff5f8] min-h-screen" style={{ fontFamily: "'Lexend', sans-serif" }}>

      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-white border-b border-gray-200">
        <div className="max-w-[1200px] mx-auto px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button onClick={() => navigate("/teacher/analytics")} className="p-2 hover:bg-gray-100 rounded-lg">
              <span className="material-symbols-outlined text-gray-500">arrow_back</span>
            </button>
            <div className="size-8 bg-[#695be6] rounded-lg flex items-center justify-center text-white">
              <span className="material-symbols-outlined text-lg">bar_chart</span>
            </div>
            <div>
              <p className="font-black text-base leading-tight">Root Cause Mapping Analysis</p>
              <p className="text-xs text-gray-400">
                Math › Chapter 5: Linear Equations ›{" "}
                <span className="text-[#695be6] font-semibold">32 students</span>
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button onClick={handleExport} className="flex items-center gap-2 bg-[#695be6] text-white text-sm font-bold px-4 py-2 rounded-xl hover:bg-[#5a4dd4] transition-colors">
              <span className="material-symbols-outlined text-base">download</span> Export Analysis Report
            </button>
            <button onClick={handleGenerateAiInsights} disabled={aiStatus === "loading"}
              className="flex items-center gap-2 bg-white border border-[#695be6] text-[#695be6] text-sm font-bold px-4 py-2 rounded-xl hover:bg-[#695be6]/5 transition-colors disabled:opacity-50">
              <span className="material-symbols-outlined text-base">auto_awesome</span>
              {aiStatus === "loading" ? "Generating..." : "AI Insights"}
            </button>
            <div className="size-9 rounded-full bg-gray-200 flex items-center justify-center overflow-hidden">
              <span className="material-symbols-outlined text-gray-400">person</span>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-[1200px] mx-auto pt-20 px-6 pb-12">

        {/* Stats Row */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          {/* Total Errors */}
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
            <p className="text-xs text-gray-400 mb-1">Total Errors Detected</p>
            <p className="text-4xl font-black">{rootCauseStats.totalErrors} <span className="text-lg font-semibold text-gray-400">Errors</span></p>
            <p className="text-xs text-green-600 font-semibold mt-1 flex items-center gap-1">
              <span className="material-symbols-outlined text-sm">trending_down</span>
              {Math.abs(rootCauseStats.changeFromLastWeek)}% from last week
            </p>
          </div>

          {/* Error Distribution Donut */}
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
            <p className="text-xs text-gray-400 mb-3">Error Distribution</p>
            <div className="flex items-center gap-4">
              <svg viewBox="0 0 36 36" className="size-20 -rotate-90 flex-shrink-0">
                <circle cx="18" cy="18" r={radius} fill="none" stroke="#f3f4f6" strokeWidth="4" />
                {rootCauseStats.errorDistribution.map((d, i) => {
                  const dash = (d.percent / 100) * circumference;
                  const gap  = circumference - dash;
                  const seg = (
                    <circle
                      key={i}
                      cx="18" cy="18" r={radius}
                      fill="none"
                      stroke={d.color}
                      strokeWidth="4"
                      strokeDasharray={`${dash} ${gap}`}
                      strokeDashoffset={-offset * circumference / 100}
                    />
                  );
                  offset += d.percent;
                  return seg;
                })}
              </svg>
              <div className="space-y-1">
                {rootCauseStats.errorDistribution.map((d) => (
                  <div key={d.type} className="flex items-center gap-2 text-xs">
                    <span className="size-2.5 rounded-full inline-block" style={{ background: d.color }} />
                    <span className="text-gray-600">{d.type}</span>
                    <span className="font-bold ml-auto">{d.percent}%</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Students Affected */}
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
            <p className="text-xs text-gray-400 mb-1">Students Affected</p>
            <p className="text-4xl font-black mb-3">{rootCauseStats.studentsAffected} <span className="text-lg font-semibold text-gray-400">Students</span></p>
            <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden flex">
              {rootCauseStats.studentBreakdown.map((b, i) => (
                <div
                  key={i}
                  className={`h-full ${i === 0 ? "bg-[#695be6]" : i === 1 ? "bg-purple-300" : "bg-purple-200"}`}
                  style={{ width: `${b.width}%` }}
                />
              ))}
            </div>
            <div className="flex justify-between mt-1">
              {rootCauseStats.studentBreakdown.map((b) => (
                <span key={b.label} className="text-[10px] text-gray-400">{b.count} ({b.label})</span>
              ))}
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 border-b border-gray-200 mb-6">
          {rootCauseTabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-1.5 px-4 py-3 text-sm font-semibold border-b-2 transition-colors ${
                activeTab === tab.id
                  ? "border-[#695be6] text-[#695be6]"
                  : "border-transparent text-gray-500 hover:text-gray-700"
              }`}
            >
              <span className="material-symbols-outlined text-base">{tab.icon}</span>
              {tab.label}
            </button>
          ))}
        </div>

        {activeTab === "mapping" && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

            {/* Left: Gap Categories */}
            <div className="space-y-3">
              {/* Prerequisite Knowledge Gaps */}
              <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
                <div className="flex items-center justify-between px-5 py-4 border-b border-gray-50">
                  <div className="flex items-center gap-2">
                    <span className="size-2.5 rounded-full bg-red-500 inline-block"></span>
                    <h3 className="font-black text-sm">Prerequisite Knowledge Gaps</h3>
                  </div>
                  <span className="material-symbols-outlined text-gray-400">expand_less</span>
                </div>

                {prerequisiteGaps.map((gap) => (
                  <div key={gap.id} className="border-b border-gray-50 last:border-0">
                    <div
                      className="px-5 py-4 cursor-pointer hover:bg-gray-50"
                      onClick={() => toggleGap(gap.id)}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <div>
                          <p className="font-bold text-sm">{gap.title}</p>
                          <p className="text-xs text-red-500 font-semibold">Affects {gap.affectedStudents} students</p>
                        </div>
                        <div className="text-right">
                          <p className="text-[10px] text-gray-400 uppercase">Mastery</p>
                          <p className="font-black text-sm">{gap.mastery}%</p>
                        </div>
                      </div>

                      {expandedGaps[gap.id] && (
                        <div className="mt-2">
                          <div className="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden mb-3">
                            <div
                              className={`h-full rounded-full ${gap.severity === "critical" ? "bg-red-500" : "bg-yellow-400"}`}
                              style={{ width: `${gap.mastery}%` }}
                            />
                          </div>
                          {gap.evidence && (
                            <div className="border-l-2 border-red-300 pl-3 bg-red-50 rounded-r-lg py-2">
                              <p className="text-[10px] font-bold text-gray-400 uppercase mb-1">Evidence</p>
                              <p className="text-xs font-mono text-gray-700">{gap.evidence}</p>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              {/* Procedural Issues */}
              {proceduralIssues.map((issue) => (
                <div
                  key={issue.id}
                  className="bg-white rounded-xl border border-gray-100 shadow-sm px-5 py-4 cursor-pointer hover:bg-gray-50"
                  onClick={() => toggleIssue(issue.id)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className={`size-2.5 rounded-full inline-block ${
                        issue.severity === "warning" ? "bg-orange-400" : "bg-green-400"
                      }`}></span>
                      <div>
                        <p className="font-bold text-sm">{issue.title}</p>
                        <p className="text-xs text-gray-400">{issue.detail}</p>
                      </div>
                    </div>
                    <span className="material-symbols-outlined text-gray-400">
                      {expandedIssues[issue.id] ? "expand_less" : "expand_more"}
                    </span>
                  </div>
                </div>
              ))}
            </div>

            {/* Right: Error-to-Cause Map */}
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-[#695be6] text-lg">account_tree</span>
                  <h3 className="font-black text-sm">Error-to-Cause Map</h3>
                </div>
                <button className="text-xs text-[#695be6] font-semibold hover:underline">Reset View</button>
              </div>

              <div className="relative flex items-center justify-between py-4 px-2">
                {/* Left: Error Categories */}
                <div className="flex flex-col gap-8">
                  {errorCauseMap.filter((e) => e.category).map((e) => (
                    <div key={e.category} className="flex flex-col items-center gap-1">
                      <div className={`size-12 rounded-full ${e.color} flex items-center justify-center text-white`}>
                        <span className="material-symbols-outlined text-sm">
                          {e.category === "CONCEPTUAL" ? "psychology" : e.category === "PROCEDURAL" ? "list_alt" : "calculate"}
                        </span>
                      </div>
                      <p className="text-[9px] font-bold text-gray-500">{e.category}</p>
                    </div>
                  ))}
                </div>

                {/* Connecting lines (decorative) */}
                <div className="flex-1 mx-4 relative h-48">
                  <svg className="w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
                    <path d="M0,15 Q50,15 100,20" stroke="#f97316" strokeWidth="1.5" fill="none" opacity="0.6" />
                    <path d="M0,50 Q50,50 100,50" stroke="#fb923c" strokeWidth="1.5" fill="none" opacity="0.6" />
                    <path d="M0,85 Q50,85 100,80" stroke="#fbbf24" strokeWidth="1.5" fill="none" opacity="0.6" />
                    <path d="M0,50 Q50,50 100,95" stroke="#86efac" strokeWidth="1.5" fill="none" opacity="0.4" />
                  </svg>
                </div>

                {/* Right: Root Causes */}
                <div className="flex flex-col gap-4">
                  {errorCauseMap.map((e, i) => (
                    <div
                      key={i}
                      className={`border rounded-xl px-3 py-2 text-xs font-bold text-center ${
                        i === 0 ? "border-red-400 bg-red-50 text-red-700" : "border-gray-200 text-gray-600"
                      }`}
                    >
                      {i === 0 && <p className="text-[9px] text-red-400 font-bold mb-0.5">ROOT CAUSE</p>}
                      {i !== 0 && <p className="text-[9px] text-gray-400 font-bold mb-0.5">ROOT CAUSE</p>}
                      {e.rootCause}
                    </div>
                  ))}
                </div>
              </div>

              {/* AI Insight */}
              <div className="mt-4 bg-yellow-50 border border-yellow-200 rounded-xl p-3">
                <p className="text-xs text-gray-700">
                  <span className="font-bold text-[#695be6]">AI Insight: </span>
                  {aiResult?.summary || aiResult?.overall_assessment || (typeof aiInsight === "string" ? aiInsight : aiInsight?.text || "")}
                </p>
                {aiResult?.recommendations?.length > 0 && (
                  <ul className="mt-2 space-y-1">
                    {aiResult.recommendations.slice(0, 3).map((rec, i) => (
                      <li key={i} className="flex items-start gap-1.5 text-xs text-gray-600">
                        <span className="material-symbols-outlined text-[#695be6] text-sm mt-0.5">tips_and_updates</span>
                        {rec}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          </div>
        )}

        {activeTab !== "mapping" && (
          <div className="text-center py-16 text-gray-400">
            <span className="material-symbols-outlined text-5xl mb-3 block">construction</span>
            <p className="font-semibold">This section is coming soon</p>
          </div>
        )}
      </main>
    </div>
  );
}
