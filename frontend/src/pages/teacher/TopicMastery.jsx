import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { useAuth } from "../../context/AuthContext";
import { getInitial } from "../../utils/nameUtils";
import { runAiTool, selectAiToolResult, selectAiToolStatus, clearAiToolResult, fetchTopicMastery, selectTopicMastery, fetchMySections, selectMySections, setDiffContext, createIntervention } from "../../store/slices/teacherSlice";
import SearchBar from "../../components/SearchBar";
import { masteryTopics, masteryStudents } from "../../data/teacherData";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

// ── colour helpers ────────────────────────────────────────────
const CELL_COLOR = (s) => {
  if (s >= 80) return "bg-green-700 text-white";
  if (s >= 65) return "bg-green-500 text-white";
  if (s >= 50) return "bg-yellow-400 text-gray-900";
  if (s >= 35) return "bg-orange-400 text-white";
  return "bg-red-500 text-white";
};
const AVG_COLOR = (a) => {
  if (a >= 80) return "text-green-700 bg-green-50";
  if (a >= 60) return "text-yellow-700 bg-yellow-50";
  return "text-red-600 bg-red-50";
};
const LEVEL_LABEL = (s) => {
  if (s >= 80) return { label: "Mastery",   color: "text-green-700 bg-green-100" };
  if (s >= 65) return { label: "Good",      color: "text-green-600 bg-green-50" };
  if (s >= 50) return { label: "Developing",color: "text-yellow-700 bg-yellow-100" };
  if (s >= 35) return { label: "Struggling",color: "text-orange-600 bg-orange-100" };
  return              { label: "Critical",  color: "text-red-600 bg-red-100" };
};

// ── class-level stats are now computed inside the component ──

export default function TopicMastery() {
  const navigate  = useNavigate();
  const dispatch  = useDispatch();
  const { user }  = useAuth();
  const aiResult  = useSelector(selectAiToolResult);
  const aiStatus  = useSelector(selectAiToolStatus);
  const apiMastery = useSelector(selectTopicMastery);
  const sections   = useSelector(selectMySections);
  const generating = aiStatus === "loading";

  const [selectedStudent, setSelectedStudent] = useState(null);
  const [selectedTopic,   setSelectedTopic]   = useState(0);
  const [selectedSection, setSelectedSection]  = useState(null);
  const [subjectFilter,   setSubjectFilter]    = useState("Math");
  const [search,          setSearch]           = useState("");
  const [reportOpen,      setReportOpen]       = useState(false);
  const [sortBy,          setSortBy]           = useState("name"); // name | avg_asc | avg_desc
  const [interventionToast, setInterventionToast] = useState(null);

  useEffect(() => {
    dispatch(fetchMySections());
  }, [dispatch]);

  // Set initial selected section when sections load
  useEffect(() => {
    if (sections.length > 0 && !selectedSection) {
      setSelectedSection(sections[0]);
    }
  }, [sections]);

  // Re-fetch mastery data when selected section changes
  useEffect(() => {
    if (selectedSection) {
      dispatch(fetchTopicMastery(selectedSection._id || selectedSection.class_name));
      setSelectedStudent(null);
    }
  }, [selectedSection, dispatch]);

  const gradeFilter = selectedSection?.class_name || "Grade 9 - Section B";

  // Use API mastery data if available, otherwise fall back to mock
  const displayStudents = apiMastery.length > 0
    ? apiMastery.map((m) => ({
        id: m._id || m.student_id,
        name: m.student_name || m.name || "Student",
        avg: m.avg_score || m.avg || 0,
        scores: m.topic_scores || m.scores || masteryTopics.map(() => 0),
      }))
    : masteryStudents;
  const displayTopics = apiMastery.length > 0 && apiMastery[0]?.topics
    ? apiMastery[0].topics
    : masteryTopics;

  // ── class-level stats (computed from display data) ──────────
  const classAvgPerTopic = displayTopics.map((_, ti) => {
    const vals = displayStudents.map((s) => s.scores[ti] || 0);
    return Math.round(vals.reduce((a, b) => a + b, 0) / (vals.length || 1));
  });
  const criticalCount = classAvgPerTopic.filter((v) => v < 50).length;
  const needsAttention = classAvgPerTopic.filter((v) => v >= 50 && v < 65).length;
  const overallAvg = Math.round(classAvgPerTopic.reduce((a, b) => a + b, 0) / (classAvgPerTopic.length || 1));

  const filtered = displayStudents
    .filter((s) => s.name.toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) =>
      sortBy === "avg_desc" ? b.avg - a.avg :
      sortBy === "avg_asc"  ? a.avg - b.avg :
      a.name.localeCompare(b.name)
    );

  // Set initial selected student when data loads
  useEffect(() => {
    if (filtered.length > 0 && !selectedStudent) {
      setSelectedStudent(filtered[0]);
    }
  }, [filtered.length]);

  const selectedScore = selectedStudent?.scores[selectedTopic] ?? 0;
  const { label: lvlLabel, color: lvlColor } = LEVEL_LABEL(selectedScore);

  // ── Generate Class Report ─────────────────────────────────
  const handleGenerateReport = () => {
    dispatch(clearAiToolResult());
    setReportOpen(true);
    dispatch(runAiTool({
      tool: "classreport",
      subject: subjectFilter,
      topic: gradeFilter,
      grade: gradeFilter,
      extra: {
        grade: gradeFilter,
        subject: subjectFilter,
        topics: displayTopics,
        students: displayStudents.map((s) => ({ name: s.name, avg: s.avg, scores: s.scores })),
        class_avg_per_topic: classAvgPerTopic,
        overall_avg: overallAvg,
        critical_topics: displayTopics.filter((_, i) => classAvgPerTopic[i] < 50),
        struggling_topics: displayTopics.filter((_, i) => classAvgPerTopic[i] >= 50 && classAvgPerTopic[i] < 65),
      },
    }));
  };

  // ── Download PDF ──────────────────────────────────────────
  const handleDownloadPdf = () => {
    const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
    const W = doc.internal.pageSize.getWidth();
    const PRIMARY = [105, 91, 230];

    // Header
    doc.setFillColor(...PRIMARY);
    doc.rect(0, 0, W, 24, "F");
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(14); doc.setFont("helvetica", "bold");
    doc.text("Class Mastery Report", 14, 14);
    doc.setFontSize(8); doc.setFont("helvetica", "normal");
    doc.text(`${gradeFilter}  ·  ${subjectFilter}  ·  Generated ${new Date().toLocaleDateString()}`, 14, 21);
    doc.setTextColor(17, 17, 17);

    let y = 32;

    // Summary row
    autoTable(doc, {
      startY: y,
      body: [
        ["Overall Avg", `${overallAvg}%`, "Critical Topics", `${criticalCount}`, "Needs Attention", `${needsAttention}`, "Students", `${displayStudents.length}`],
      ],
      theme: "plain",
      bodyStyles: { fontSize: 9, fontStyle: "bold" },
      columnStyles: {
        0: { textColor: PRIMARY, cellWidth: 28 }, 1: { cellWidth: 18 },
        2: { textColor: [239, 68, 68], cellWidth: 30 }, 3: { cellWidth: 12 },
        4: { textColor: [249, 115, 22], cellWidth: 32 }, 5: { cellWidth: 12 },
        6: { textColor: [100, 100, 100], cellWidth: 20 }, 7: { cellWidth: 12 },
      },
      margin: { left: 14, right: 14 },
    });
    y = doc.lastAutoTable.finalY + 6;

    // Heatmap table
    doc.setFontSize(10); doc.setFont("helvetica", "bold");
    doc.text("Student Performance Heatmap", 14, y); y += 5;
    autoTable(doc, {
      startY: y,
      head: [["Student", "Avg", ...displayTopics.map((t) => t.slice(0, 6))]],
      body: displayStudents.map((s) => [
        s.name, `${s.avg}%`,
        ...s.scores.map((sc) => `${sc}%`),
      ]),
      theme: "grid",
      headStyles: { fillColor: PRIMARY, textColor: [255, 255, 255], fontSize: 7 },
      bodyStyles: { fontSize: 7 },
      columnStyles: { 0: { cellWidth: 28 }, 1: { cellWidth: 12 } },
      didDrawCell: (data) => {
        if (data.section === "body" && data.column.index >= 2) {
          const val = parseInt(data.cell.raw);
          if (!isNaN(val)) {
            const [r, g, b] = val >= 80 ? [21, 128, 61] : val >= 65 ? [34, 197, 94] : val >= 50 ? [234, 179, 8] : val >= 35 ? [249, 115, 22] : [239, 68, 68];
            doc.setFillColor(r, g, b);
            doc.rect(data.cell.x, data.cell.y, data.cell.width, data.cell.height, "F");
            doc.setTextColor(255, 255, 255);
            doc.setFontSize(6.5);
            doc.text(data.cell.raw, data.cell.x + data.cell.width / 2, data.cell.y + data.cell.height / 2 + 1, { align: "center" });
          }
        }
      },
      margin: { left: 14, right: 14 },
    });
    y = doc.lastAutoTable.finalY + 8;

    // Topic averages
    doc.setFontSize(10); doc.setFont("helvetica", "bold");
    doc.text("Topic-Level Class Averages", 14, y); y += 5;
    autoTable(doc, {
      startY: y,
      head: [["Topic", "Class Avg", "Status"]],
      body: displayTopics.map((t, i) => [
        t, `${classAvgPerTopic[i]}%`,
        classAvgPerTopic[i] < 50 ? "Critical" : classAvgPerTopic[i] < 65 ? "Needs Attention" : classAvgPerTopic[i] < 80 ? "Good" : "Mastery",
      ]),
      theme: "striped",
      headStyles: { fillColor: PRIMARY, textColor: [255, 255, 255], fontSize: 8 },
      bodyStyles: { fontSize: 8 },
      margin: { left: 14, right: 14 },
    });

    // AI insights if available
    if (aiResult?.insights?.length) {
      doc.addPage(); y = 15;
      doc.setFontSize(10); doc.setFont("helvetica", "bold");
      doc.text("AI-Generated Insights & Recommendations", 14, y); y += 6;
      aiResult.insights.forEach((ins) => {
        const lines = doc.splitTextToSize(`• ${ins}`, W - 28);
        doc.setFontSize(8.5); doc.setFont("helvetica", "normal");
        doc.text(lines, 14, y);
        y += lines.length * 5 + 2;
      });
    }

    // Footer
    const pages = doc.internal.getNumberOfPages();
    for (let i = 1; i <= pages; i++) {
      doc.setPage(i);
      doc.setFontSize(7); doc.setTextColor(160, 160, 160);
      doc.text(`TrueSchoolAI  ·  ${gradeFilter}  ·  Page ${i} of ${pages}`, W / 2, doc.internal.pageSize.getHeight() - 6, { align: "center" });
    }

    doc.save(`class-report-${gradeFilter.replace(/\s/g, "-")}.pdf`);
  };

  // ── Add to Intervention Group ────────────────────────────
  const handleAddToIntervention = async () => {
    if (!selectedStudent) return;
    const topic = displayTopics[selectedTopic] || "";
    const score = selectedStudent.scores[selectedTopic] ?? 0;
    const priority = score < 35 ? "urgent" : score < 50 ? "important" : "monitor";
    const issues = [`Gap in ${topic} (score: ${score}%)`];
    const tags = score < 50 ? ["LEARNING GAPS", "TOPIC MASTERY"] : ["TOPIC MASTERY"];

    const result = await dispatch(createIntervention({
      student_id:    selectedStudent.id,
      student_name:  selectedStudent.name,
      student_class: gradeFilter,
      priority,
      issues,
      message:       `${selectedStudent.name} scored ${score}% in ${topic} — added from Topic Mastery Heatmap`,
      tags,
    }));

    if (result.meta.requestStatus === "fulfilled") {
      const wasUpdated = result.payload?.updated;
      setInterventionToast(wasUpdated
        ? `${selectedStudent.name} already in group — record updated`
        : `${selectedStudent.name} added to intervention group`
      );
      setTimeout(() => setInterventionToast(null), 3500);
    } else {
      setInterventionToast("Failed to add to intervention group");
      setTimeout(() => setInterventionToast(null), 3500);
    }
  };

  return (
    <div className="bg-[#f8f7ff] min-h-screen" style={{ fontFamily: "'Lexend', sans-serif" }}>

      {/* ── Intervention toast ───────────────────────────────── */}
      {interventionToast && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[100] flex items-center gap-2 px-5 py-3 rounded-xl shadow-lg text-sm font-semibold bg-[#695be6] text-white">
          <span className="material-symbols-outlined text-base">group_add</span>
          {interventionToast}
        </div>
      )}

      {/* ── Report Modal ─────────────────────────────────────── */}
      {reportOpen && (
        <div className="fixed inset-0 z-[60] bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden">
            {/* Modal header */}
            <div className="bg-gradient-to-r from-[#695be6] to-[#8b5cf6] px-6 py-5 text-white flex items-center justify-between">
              <div>
                <h2 className="font-black text-xl flex items-center gap-2">
                  <span className="material-symbols-outlined">analytics</span>
                  Class Mastery Report
                </h2>
                <p className="text-white/70 text-sm mt-0.5">{gradeFilter} · {subjectFilter}</p>
              </div>
              <button onClick={() => { setReportOpen(false); dispatch(clearAiToolResult()); }}
                className="size-9 bg-white/20 hover:bg-white/30 rounded-xl flex items-center justify-center transition-colors">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            {/* Summary stats */}
            <div className="grid grid-cols-4 divide-x divide-gray-100 border-b border-gray-100">
              {[
                { label: "Overall Avg", value: `${overallAvg}%`, color: overallAvg >= 70 ? "text-green-600" : "text-orange-500" },
                { label: "Students",    value: displayStudents.length, color: "text-gray-800" },
                { label: "Critical Topics", value: criticalCount, color: "text-red-600" },
                { label: "Need Attention",  value: needsAttention, color: "text-orange-500" },
              ].map((s) => (
                <div key={s.label} className="p-4 text-center">
                  <p className={`text-2xl font-black ${s.color}`}>{s.value}</p>
                  <p className="text-xs text-gray-400 mt-0.5">{s.label}</p>
                </div>
              ))}
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-6 space-y-5">
              {/* Topic averages */}
              <div>
                <h3 className="font-black text-sm mb-3 flex items-center gap-2">
                  <span className="material-symbols-outlined text-[#695be6] text-base">bar_chart</span>
                  Topic Performance Overview
                </h3>
                <div className="space-y-2">
                  {displayTopics.map((topic, i) => {
                    const avg = classAvgPerTopic[i];
                    const { label, color } = LEVEL_LABEL(avg);
                    return (
                      <div key={i} className="flex items-center gap-3">
                        <p className="text-xs font-medium text-gray-700 w-36 truncate">{topic}</p>
                        <div className="flex-1 bg-gray-100 rounded-full h-2.5 overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all ${avg >= 80 ? "bg-green-600" : avg >= 65 ? "bg-green-400" : avg >= 50 ? "bg-yellow-400" : avg >= 35 ? "bg-orange-400" : "bg-red-500"}`}
                            style={{ width: `${avg}%` }}
                          />
                        </div>
                        <span className="text-xs font-bold w-8 text-right">{avg}%</span>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full w-20 text-center ${color}`}>{label}</span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* AI Insights */}
              {generating && (
                <div className="flex flex-col items-center gap-3 py-6">
                  <span className="size-8 border-2 border-[#695be6]/30 border-t-[#695be6] rounded-full animate-spin" />
                  <p className="text-sm text-gray-400">AI is analysing class performance...</p>
                </div>
              )}
              {aiResult && !generating && (
                <div>
                  <h3 className="font-black text-sm mb-3 flex items-center gap-2">
                    <span className="material-symbols-outlined text-[#695be6] text-base">auto_awesome</span>
                    AI Insights & Recommendations
                  </h3>
                  <div className="space-y-3">
                    {(aiResult.insights || []).map((ins, i) => (
                      <div key={i} className="flex items-start gap-3 bg-[#695be6]/5 border border-[#695be6]/20 rounded-xl p-3">
                        <span className="size-5 rounded-full bg-[#695be6] text-white text-[10px] font-bold flex items-center justify-center flex-shrink-0 mt-0.5">{i + 1}</span>
                        <p className="text-sm text-gray-700">{ins}</p>
                      </div>
                    ))}
                    {(aiResult.recommendations || []).map((rec, i) => (
                      <div key={i} className="flex items-start gap-3 bg-green-50 border border-green-200 rounded-xl p-3">
                        <span className="material-symbols-outlined text-green-600 text-base flex-shrink-0">tips_and_updates</span>
                        <p className="text-sm text-gray-700">{rec}</p>
                      </div>
                    ))}
                    {(aiResult.at_risk_students || []).length > 0 && (
                      <div className="bg-red-50 border border-red-200 rounded-xl p-3">
                        <p className="text-xs font-bold text-red-700 mb-2">Students Needing Immediate Attention</p>
                        <div className="flex flex-wrap gap-2">
                          {aiResult.at_risk_students.map((s, i) => (
                            <span key={i} className="text-xs bg-red-100 text-red-700 font-semibold px-2 py-1 rounded-full">{s}</span>
                          ))}
                        </div>
                      </div>
                    )}
                    {!aiResult.insights && !aiResult.recommendations && aiResult.content && (
                      <p className="text-sm text-gray-700 whitespace-pre-wrap">{aiResult.content}</p>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Footer actions */}
            <div className="border-t border-gray-100 px-6 py-4 flex items-center justify-between bg-gray-50">
              <button onClick={() => { setReportOpen(false); dispatch(clearAiToolResult()); }}
                className="text-sm font-bold text-gray-500 hover:text-gray-700">
                Close
              </button>
              <div className="flex gap-3">
                <button onClick={handleGenerateReport} disabled={generating}
                  className="flex items-center gap-2 border border-[#695be6] text-[#695be6] text-sm font-bold px-4 py-2 rounded-xl hover:bg-[#695be6]/5 disabled:opacity-50">
                  <span className="material-symbols-outlined text-base">refresh</span> Regenerate
                </button>
                <button onClick={handleDownloadPdf}
                  className="flex items-center gap-2 bg-[#695be6] text-white text-sm font-bold px-5 py-2 rounded-xl hover:bg-[#5a4dd4] transition-colors shadow-md shadow-[#695be6]/20">
                  <span className="material-symbols-outlined text-base">download</span> Download PDF
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Header ───────────────────────────────────────────── */}
      <header className="sticky top-0 z-50 bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-[1400px] mx-auto px-4 sm:px-6 h-14 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <button onClick={() => navigate("/teacher")} className="p-2 hover:bg-gray-100 rounded-lg">
              <span className="material-symbols-outlined text-gray-500">arrow_back</span>
            </button>
            <h1 className="font-black text-base hidden sm:block">Topic Mastery Heatmap</h1>
          </div>
          <div className="flex items-center gap-2">
            <select value={selectedSection?._id || ""} onChange={(e) => {
              const sec = sections.find(s => (s._id || s.class_name) === e.target.value);
              if (sec) setSelectedSection(sec);
            }}
              className="border border-gray-200 rounded-lg px-2 sm:px-3 py-1.5 text-xs sm:text-sm bg-white outline-none">
              {sections.length > 0 ? sections.map((sec) => (
                <option key={sec._id || sec.class_name} value={sec._id || sec.class_name}>
                  {sec.class_name}
                </option>
              )) : (
                <option>No sections</option>
              )}
            </select>
            <select value={subjectFilter} onChange={(e) => setSubjectFilter(e.target.value)}
              className="border border-gray-200 rounded-lg px-2 sm:px-3 py-1.5 text-xs sm:text-sm bg-white outline-none">
              <option>Math</option>
              <option>Science</option>
              <option>English</option>
            </select>
          </div>
          {/* Legend */}
          <div className="hidden lg:flex items-center gap-3 text-xs font-semibold">
            {[["bg-green-700","MASTERY"],["bg-green-500","GOOD"],["bg-yellow-400","DEV."],["bg-orange-400","STRUGGLE"],["bg-red-500","CRITICAL"]].map(([bg, lbl]) => (
              <span key={lbl} className="flex items-center gap-1">
                <span className={`size-3 rounded-sm ${bg} inline-block`}></span>{lbl}
              </span>
            ))}
          </div>
          <div className="flex items-center gap-2">
            <button className="p-2 hover:bg-gray-100 rounded-lg hidden sm:flex">
              <span className="material-symbols-outlined text-gray-500 text-[20px]">help_outline</span>
            </button>
            <div className="size-8 sm:size-9 rounded-full bg-[#695be6] flex items-center justify-center text-white font-bold text-sm">{getInitial(user?.name) || "T"}</div>
          </div>
        </div>

        {/* Sub-header */}
        <div className="max-w-[1400px] mx-auto px-4 sm:px-6 py-2 flex items-center gap-2 sm:gap-3 border-t border-gray-100 flex-wrap">
          <SearchBar
            value={search}
            onChange={setSearch}
            placeholder="Search student..."
            width="max-w-xs flex-1 min-w-[140px]"
          />
          <select value={sortBy} onChange={(e) => setSortBy(e.target.value)}
            className="border border-gray-200 rounded-lg px-3 py-1.5 text-xs sm:text-sm bg-white outline-none">
            <option value="name">Sort: Name</option>
            <option value="avg_desc">Sort: Avg ↓</option>
            <option value="avg_asc">Sort: Avg ↑</option>
          </select>
          <button onClick={() => {
            const rows = [["Student","Avg",...displayTopics], ...displayStudents.map((s) => [s.name, s.avg + "%", ...s.scores.map((v) => v + "%")])];
            const csv = rows.map((r) => r.join(",")).join("\n");
            const a = document.createElement("a"); a.href = "data:text/csv," + encodeURIComponent(csv); a.download = "mastery.csv"; a.click();
          }} className="flex items-center gap-1.5 border border-gray-200 rounded-lg px-3 py-1.5 text-xs sm:text-sm font-semibold bg-white hover:bg-gray-50">
            <span className="material-symbols-outlined text-sm">download</span>
            <span className="hidden sm:inline">Export CSV</span>
          </button>
        </div>
      </header>

      {/* ── Main content ─────────────────────────────────────── */}
      <div className="max-w-[1400px] mx-auto px-4 sm:px-6 pt-4 pb-24 flex gap-4">

        {/* Heatmap */}
        <div className="flex-1 overflow-x-auto">
          <table className="border-collapse min-w-max">
            <thead>
              <tr>
                <th className="w-32 p-2 sticky left-0 bg-[#f8f7ff] z-10"></th>
                <th className="w-14 p-2"></th>
                {displayTopics.map((topic, i) => (
                  <th key={i} className="p-1 cursor-pointer" onClick={() => setSelectedTopic(i)}>
                    <div className="flex items-end justify-center h-20">
                      <span
                        className={`text-[10px] font-bold whitespace-nowrap transition-colors ${selectedTopic === i ? "text-[#695be6]" : "text-gray-500"}`}
                        style={{ writingMode: "vertical-rl", transform: "rotate(180deg)" }}
                      >
                        {topic}
                      </span>
                    </div>
                    {/* Column avg bar */}
                    <div className="mt-1 flex flex-col items-center gap-0.5">
                      <div className={`w-10 h-1.5 rounded-full ${classAvgPerTopic[i] < 50 ? "bg-red-400" : classAvgPerTopic[i] < 65 ? "bg-orange-400" : "bg-green-500"}`} />
                      <span className="text-[9px] text-gray-400">{classAvgPerTopic[i]}%</span>
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((student) => (
                <tr key={student.id} onClick={() => setSelectedStudent(student)}
                  className={`cursor-pointer transition-colors ${selectedStudent?.id === student.id ? "bg-[#695be6]/5" : "hover:bg-gray-50"}`}>
                  {/* Student name — sticky */}
                  <td className="p-2 pr-3 sticky left-0 bg-inherit z-10">
                    <div className="flex items-center gap-2">
                      <div className={`size-8 rounded-full flex items-center justify-center flex-shrink-0 text-white text-xs font-bold ${
                        student.avg >= 80 ? "bg-green-600" : student.avg >= 60 ? "bg-yellow-500" : "bg-red-500"
                      }`}>
                        {student.name.split(" ").map((n) => n[0]).join("")}
                      </div>
                      <div>
                        <p className="text-xs font-bold leading-tight">{student.name.split(" ")[0]}</p>
                        <p className="text-[10px] text-gray-400">{student.name.split(" ")[1]}</p>
                      </div>
                    </div>
                  </td>
                  {/* Avg badge */}
                  <td className="p-2 text-center">
                    <span className={`text-xs font-black px-2 py-0.5 rounded-full ${AVG_COLOR(student.avg)}`}>
                      {student.avg}%
                    </span>
                  </td>
                  {/* Score cells */}
                  {student.scores.map((score, i) => (
                    <td key={i} className="p-0.5">
                      <div
                        onClick={(e) => { e.stopPropagation(); setSelectedTopic(i); setSelectedStudent(student); }}
                        className={`w-11 h-11 rounded-lg flex items-center justify-center text-xs font-bold cursor-pointer hover:scale-110 transition-transform ${CELL_COLOR(score)} ${
                          selectedTopic === i && selectedStudent?.id === student.id ? "ring-2 ring-[#695be6] ring-offset-1 scale-110" : ""
                        }`}
                      >
                        {score}
                      </div>
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* ── Detail Panel ─────────────────────────────────── */}
        <div className="w-64 flex-shrink-0 hidden lg:block">
          <div className="bg-white border border-gray-100 rounded-2xl shadow-sm overflow-hidden sticky top-28">
            {/* Panel header */}
            <div className="bg-gradient-to-r from-[#695be6]/10 to-[#8b5cf6]/10 px-4 py-3 border-b border-gray-100">
              <p className="text-xs font-black text-[#695be6] uppercase tracking-wide">{displayTopics[selectedTopic]}</p>
              <p className="text-sm font-bold text-gray-800 mt-0.5">{selectedStudent?.name}</p>
            </div>

            <div className="p-4">
              {/* Score donut */}
              <div className="flex items-center gap-4 mb-4">
                <div className="relative size-20 flex-shrink-0">
                  <svg viewBox="0 0 36 36" className="size-20 -rotate-90">
                    <circle cx="18" cy="18" r="15.9" fill="none" stroke="#f3f4f6" strokeWidth="3.5" />
                    <circle cx="18" cy="18" r="15.9" fill="none"
                      stroke={selectedScore >= 80 ? "#16a34a" : selectedScore >= 65 ? "#22c55e" : selectedScore >= 50 ? "#eab308" : selectedScore >= 35 ? "#f97316" : "#ef4444"}
                      strokeWidth="3.5"
                      strokeDasharray={`${selectedScore} ${100 - selectedScore}`}
                      strokeLinecap="round" />
                  </svg>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="text-lg font-black">{selectedScore}%</span>
                  </div>
                </div>
                <div>
                  <span className={`text-xs font-bold px-2 py-1 rounded-full ${lvlColor}`}>{lvlLabel}</span>
                  <p className="text-xs text-gray-500 mt-1">Class avg: {classAvgPerTopic[selectedTopic]}%</p>
                </div>
              </div>

              {/* Mini trend bars */}
              <div className="mb-4">
                <div className="flex items-center justify-between mb-1.5">
                  <p className="text-xs font-bold text-gray-700">Performance Trend</p>
                  <span className={`text-xs font-semibold ${selectedStudent?.avg >= 70 ? "text-green-600" : "text-red-500"}`}>
                    {selectedStudent?.avg >= 70 ? "↗" : "↘"} {selectedStudent?.avg}% avg
                  </span>
                </div>
                <div className="flex items-end gap-1 h-10 bg-gray-50 rounded-lg p-1">
                  {(selectedStudent?.scores.slice(0, 8) || []).map((v, i) => (
                    <div key={i} className="flex-1 rounded-sm transition-all"
                      style={{
                        height: `${(v / 100) * 100}%`,
                        background: v >= 80 ? "#16a34a" : v >= 65 ? "#22c55e" : v >= 50 ? "#eab308" : v >= 35 ? "#f97316" : "#ef4444",
                      }} />
                  ))}
                </div>
              </div>

              {/* Identified gaps */}
              <div className="mb-4">
                <p className="text-xs font-bold text-gray-700 mb-2">Identified Gaps</p>
                <div className="space-y-2">
                  {selectedScore < 50 && (
                    <div className="border border-red-100 bg-red-50 rounded-xl p-2.5">
                      <div className="flex items-center justify-between mb-1">
                        <p className="text-xs font-bold text-red-700">Core Concept Gap</p>
                        <span className="text-[9px] font-bold bg-red-200 text-red-700 px-1.5 py-0.5 rounded">Critical</span>
                      </div>
                      <p className="text-[10px] text-gray-500">Score below 50% — requires immediate remediation.</p>
                    </div>
                  )}
                  {selectedScore >= 50 && selectedScore < 65 && (
                    <div className="border border-yellow-100 bg-yellow-50 rounded-xl p-2.5">
                      <div className="flex items-center justify-between mb-1">
                        <p className="text-xs font-bold text-yellow-700">Needs Practice</p>
                        <span className="text-[9px] font-bold bg-yellow-200 text-yellow-700 px-1.5 py-0.5 rounded">Review</span>
                      </div>
                      <p className="text-[10px] text-gray-500">Partial understanding — targeted practice recommended.</p>
                    </div>
                  )}
                  {selectedScore >= 65 && (
                    <div className="border border-green-100 bg-green-50 rounded-xl p-2.5">
                      <p className="text-xs font-bold text-green-700">On Track</p>
                      <p className="text-[10px] text-gray-500 mt-0.5">Good understanding of this topic.</p>
                    </div>
                  )}
                </div>
              </div>

              <button onClick={() => {
                dispatch(setDiffContext({
                  subject: subjectFilter,
                  chapter: displayTopics[selectedTopic] || "",
                  topic: displayTopics[selectedTopic] || "",
                  studentName: selectedStudent?.name || "",
                  gradeFilter,
                }));
                navigate("/teacher/homework/differentiated");
              }}
                className="w-full bg-[#695be6] text-white text-xs font-bold py-2.5 rounded-xl hover:bg-[#5a4dd4] transition-colors mb-2 flex items-center justify-center gap-1.5">
                <span className="material-symbols-outlined text-sm">assignment</span>
                Assign Targeted Practice
              </button>
              <button onClick={handleAddToIntervention}
                className="w-full border border-[#695be6] text-[#695be6] text-xs font-bold py-2.5 rounded-xl hover:bg-[#695be6]/5 transition-colors flex items-center justify-center gap-1.5">
                <span className="material-symbols-outlined text-sm">group_add</span>
                Add to Intervention Group
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ── Footer ───────────────────────────────────────────── */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 px-4 sm:px-6 py-3 shadow-[0_-2px_8px_rgba(0,0,0,0.06)]">
        <div className="max-w-[1400px] mx-auto flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-4 sm:gap-6 text-xs text-gray-500">
            <span><strong className="text-gray-700 block">CLASS SIZE</strong>{displayStudents.length} Students</span>
            <span><strong className="text-gray-700 block">SCOPE</strong>{displayTopics.length} Topics</span>
            <span><strong className="text-gray-700 block">AVG MASTERY</strong>
              <span className={overallAvg >= 70 ? "text-green-600 font-bold" : "text-orange-500 font-bold"}>{overallAvg}%</span>
            </span>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            {criticalCount > 0 && (
              <span className="flex items-center gap-1 text-xs font-bold text-red-600 bg-red-50 border border-red-200 px-3 py-1.5 rounded-full">
                <span className="material-symbols-outlined text-sm">warning</span>
                {criticalCount} Critical Topics
              </span>
            )}
            {needsAttention > 0 && (
              <span className="flex items-center gap-1 text-xs font-bold text-orange-600 bg-orange-50 border border-orange-200 px-3 py-1.5 rounded-full">
                <span className="material-symbols-outlined text-sm">info</span>
                {needsAttention} Need Attention
              </span>
            )}
          </div>
          <button onClick={handleGenerateReport}
            className="flex items-center gap-2 bg-[#695be6] text-white text-sm font-bold px-5 py-2.5 rounded-xl hover:bg-[#5a4dd4] transition-colors shadow-md shadow-[#695be6]/20 whitespace-nowrap">
            <span className="material-symbols-outlined text-base">auto_awesome</span>
            Generate Class Report
          </button>
        </div>
      </div>
    </div>
  );
}
