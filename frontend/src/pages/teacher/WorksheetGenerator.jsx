import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { useAuth } from "../../context/AuthContext";
import { selectAiToolResult, selectAiToolStatus, clearAiToolResult } from "../../store/slices/teacherSlice";
import { worksheetDefaults, difficultyOptions, worksheetQuestionTypes, boardOptions, learningObjectiveOptions, difficultyStructureOptions } from "../../data/teacher/worksheetGeneratorData";
import { subjectOptions as subjectOpts, classOptions as classOpts } from "../../data/teacher/quizGeneratorData";
import { useAiToolWithHistory } from "../../hooks/useAiToolWithHistory";
import { downloadWorksheetPdf } from "../../utils/aiPdfExport";

export default function WorksheetGenerator() {
  const navigate  = useNavigate();
  const dispatch  = useDispatch();
  const { user }  = useAuth();
  const aiResult  = useSelector(selectAiToolResult);
  const aiStatus  = useSelector(selectAiToolStatus);
  const [form, setForm] = useState(worksheetDefaults);
  const generating = aiStatus === "loading";

  useEffect(() => () => { dispatch(clearAiToolResult()); }, [dispatch]);

  const toggleQType = (id) =>
    setForm((p) => ({ ...p, questionTypes: { ...p.questionTypes, [id]: !p.questionTypes[id] } }));

  const { runTool } = useAiToolWithHistory();
  const handleGenerate = () => {
    runTool({
      tool: "worksheet",
      subject: form.subject,
      topic: form.topic,
      grade: form.classLevel,
      extra: {
        difficulty: form.difficulty,
        total_questions: form.totalQuestions,
        question_types: Object.entries(form.questionTypes).filter(([, v]) => v).map(([k]) => k),
        title: form.title,
        board: form.board,
        chapter: form.chapter,
        learning_objective: form.learningObjective,
        difficulty_structure: form.difficultyStructure,
        special_instructions: form.specialInstructions,
      },
    }, { tool: "worksheet", title: form.title || `${form.topic} Worksheet`, subject: form.subject, topic: form.topic, grade: form.classLevel });
  };

  return (
    <div className="bg-[#faf9ff] min-h-screen" style={{ fontFamily: "'Lexend', sans-serif" }}>
      <header className="fixed top-0 left-0 right-0 z-50 bg-white border-b border-gray-200">
        <div className="max-w-[1200px] mx-auto px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button onClick={() => navigate("/teacher/ai-assistant")}
              className="flex items-center gap-1.5 border border-gray-200 text-sm font-semibold px-3 py-1.5 rounded-lg hover:bg-gray-50 transition-colors">
              <span className="material-symbols-outlined text-base">arrow_back</span> Choose Different Tool
            </button>
            <div className="text-xs text-gray-400">
              <span className="hover:underline cursor-pointer" onClick={() => navigate("/teacher/ai-assistant")}>AI Assistant</span>
              <span className="mx-1">›</span>
              <span className="font-semibold text-gray-700">Worksheet Generator</span>
            </div>
          </div>
          <h1 className="font-black text-base absolute left-1/2 -translate-x-1/2">Worksheet Generator</h1>
          <div className="flex items-center gap-2">
            <p className="text-sm font-bold">{form.classLevel} Teacher</p>
            <div className="size-9 rounded-full bg-[#695be6] flex items-center justify-center text-white font-bold text-sm">{user?.name?.[0] || "T"}</div>
          </div>
        </div>
      </header>

      <div className="max-w-[1200px] mx-auto pt-20 flex min-h-screen">
        {/* Left: Config */}
        <div className="w-[480px] flex-shrink-0 border-r border-gray-200 bg-white p-6 overflow-y-auto">
          <div className="mb-6">
            <h2 className="flex items-center gap-2 font-black text-base mb-4">
              <span className="size-6 bg-blue-100 rounded-full flex items-center justify-center">
                <span className="material-symbols-outlined text-blue-600 text-sm">info</span>
              </span>
              Basic Information
            </h2>
            <div className="grid grid-cols-2 gap-3 mb-3">
              <div>
                <label className="text-xs font-bold text-gray-500 mb-1 block">Subject</label>
                <select value={form.subject} onChange={(e) => setForm({ ...form, subject: e.target.value })}
                  className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-[#695be6] bg-white">
                  {subjectOpts.map((s) => <option key={s}>{s}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs font-bold text-gray-500 mb-1 block">Class</label>
                <select value={form.classLevel} onChange={(e) => setForm({ ...form, classLevel: e.target.value })}
                  className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-[#695be6] bg-white">
                  {classOpts.map((c) => <option key={c}>{c}</option>)}
                </select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3 mb-3">
              <div>
                <label className="text-xs font-bold text-gray-500 mb-1 block">Board</label>
                <select value={form.board} onChange={(e) => setForm({ ...form, board: e.target.value })}
                  className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-[#695be6] bg-white">
                  {boardOptions.map((b) => <option key={b}>{b}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs font-bold text-gray-500 mb-1 block">Chapter (optional)</label>
                <input value={form.chapter} onChange={(e) => setForm({ ...form, chapter: e.target.value })}
                  placeholder="e.g. Chapter 2"
                  className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-[#695be6]" />
              </div>
            </div>
            <div>
              <label className="text-xs font-bold text-gray-500 mb-1 block">Topic</label>
              <input value={form.topic} onChange={(e) => setForm({ ...form, topic: e.target.value })}
                className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-[#695be6]" />
            </div>
          </div>

          {/* Learning Objective */}
          <div className="mb-6">
            <h2 className="flex items-center gap-2 font-black text-base mb-4">
              <span className="size-6 bg-green-100 rounded-full flex items-center justify-center">
                <span className="material-symbols-outlined text-green-600 text-sm">target</span>
              </span>
              Learning Objective
            </h2>
            <div className="grid grid-cols-2 gap-2">
              {learningObjectiveOptions.map((lo) => (
                <button key={lo.id} onClick={() => setForm({ ...form, learningObjective: lo.id })}
                  className={`text-left px-3 py-2.5 rounded-xl border-2 transition-all ${
                    form.learningObjective === lo.id
                      ? "border-[#695be6] bg-[#695be6]/5"
                      : "border-gray-200 hover:border-gray-300"
                  }`}>
                  <p className={`text-xs font-bold ${form.learningObjective === lo.id ? "text-[#695be6]" : "text-gray-700"}`}>{lo.label}</p>
                  <p className="text-[10px] text-gray-400 mt-0.5">{lo.desc}</p>
                </button>
              ))}
            </div>
          </div>

          {/* Difficulty Structure */}
          <div className="mb-6">
            <h2 className="flex items-center gap-2 font-black text-base mb-4">
              <span className="size-6 bg-orange-100 rounded-full flex items-center justify-center">
                <span className="material-symbols-outlined text-orange-600 text-sm">bar_chart</span>
              </span>
              Difficulty Structure
            </h2>
            <div className="grid grid-cols-2 gap-2">
              {difficultyStructureOptions.map((ds) => (
                <button key={ds.id} onClick={() => setForm({ ...form, difficultyStructure: ds.id })}
                  className={`text-left px-3 py-2.5 rounded-xl border-2 transition-all ${
                    form.difficultyStructure === ds.id
                      ? "border-[#695be6] bg-[#695be6]/5"
                      : "border-gray-200 hover:border-gray-300"
                  }`}>
                  <p className={`text-xs font-bold ${form.difficultyStructure === ds.id ? "text-[#695be6]" : "text-gray-700"}`}>{ds.label}</p>
                  <p className="text-[10px] text-gray-400 mt-0.5">{ds.desc}</p>
                </button>
              ))}
            </div>
          </div>

          <div className="mb-6">
            <h2 className="flex items-center gap-2 font-black text-base mb-4">
              <span className="size-6 bg-purple-100 rounded-full flex items-center justify-center">
                <span className="material-symbols-outlined text-purple-600 text-sm">settings</span>
              </span>
              Worksheet Configuration
            </h2>
            <div className="mb-4">
              <label className="text-xs font-bold text-gray-500 mb-2 block">Question Types</label>
              <div className="flex flex-wrap gap-2">
                {worksheetQuestionTypes.map((qt) => (
                  <button key={qt.id} onClick={() => toggleQType(qt.id)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full border-2 text-xs font-bold transition-all ${
                      form.questionTypes[qt.id] ? "border-[#695be6] bg-[#695be6] text-white" : "border-gray-200 text-gray-600 hover:border-gray-300"
                    }`}>
                    {form.questionTypes[qt.id] && <span className="material-symbols-outlined text-xs">check</span>}
                    {qt.label}
                  </button>
                ))}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-bold text-gray-500 mb-1 block">Difficulty</label>
                <select value={form.difficulty} onChange={(e) => setForm({ ...form, difficulty: e.target.value })}
                  className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-[#695be6] bg-white">
                  {difficultyOptions.map((d) => <option key={d}>{d}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs font-bold text-gray-500 mb-1 block">Total Questions</label>
                <input type="number" min={1} max={50} value={form.totalQuestions}
                  onChange={(e) => setForm({ ...form, totalQuestions: +e.target.value })}
                  className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-[#695be6]" />
              </div>
            </div>
          </div>

          <div className="mb-8">
            <h2 className="flex items-center gap-2 font-black text-base mb-4">
              <span className="size-6 bg-pink-100 rounded-full flex items-center justify-center">
                <span className="material-symbols-outlined text-pink-600 text-sm">palette</span>
              </span>
              Customization
            </h2>
            <div className="mb-3">
              <label className="text-xs font-bold text-gray-500 mb-1 block">Worksheet Title</label>
              <input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })}
                className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-[#695be6]" />
            </div>
            <div>
              <label className="text-xs font-bold text-gray-500 mb-1 block">Special Instructions (optional)</label>
              <textarea value={form.specialInstructions} onChange={(e) => setForm({ ...form, specialInstructions: e.target.value })}
                rows={3} placeholder="e.g. Include diagrams, focus on word problems, align to Chapter 2 outcomes..."
                className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-[#695be6] resize-none" />
            </div>
          </div>

          <button onClick={handleGenerate} disabled={generating}
            className="w-full bg-[#695be6] text-white font-black py-4 rounded-xl hover:bg-[#5a4dd4] transition-colors flex items-center justify-center gap-2 disabled:opacity-70">
            <span className="material-symbols-outlined text-base">auto_awesome</span>
            {generating ? "Generating..." : "Generate Worksheet ✨"}
          </button>
        </div>

        {/* Right: Preview */}
        <div className="flex-1 bg-[#faf9ff] flex items-center justify-center p-8 overflow-y-auto">
          {generating && (
            <div className="flex flex-col items-center gap-3">
              <span className="size-10 border-2 border-[#695be6]/30 border-t-[#695be6] rounded-full animate-spin" />
              <p className="text-sm text-gray-400">Generating worksheet...</p>
            </div>
          )}
          {!generating && !aiResult && (
            <div className="bg-white rounded-2xl shadow-lg border border-gray-100 w-full max-w-md p-10 flex flex-col items-center text-center">
              <div className="size-20 bg-[#695be6]/10 rounded-2xl flex items-center justify-center mb-6">
                <span className="material-symbols-outlined text-[#695be6] text-5xl">description</span>
              </div>
              <h2 className="font-black text-xl mb-2">Ready to Create?</h2>
              <p className="text-sm text-gray-400">Fill in the details and click Generate to create a professional worksheet with answer key.</p>
            </div>
          )}
          {!generating && aiResult && (() => {
            return (
            <div className="w-full max-w-3xl space-y-4">
              {/* Action bar */}
              <div className="flex items-center justify-between bg-white rounded-xl border border-gray-200 px-4 py-3">
                <div>
                  <p className="font-black text-base">{aiResult.title}</p>
                  <p className="text-xs text-gray-500">{aiResult.total_marks} marks · {aiResult.estimated_time_minutes} min · {aiResult.difficulty}</p>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => navigator.clipboard?.writeText(JSON.stringify(aiResult, null, 2))}
                    className="flex items-center gap-1 border border-gray-200 text-xs font-bold px-3 py-1.5 rounded-lg hover:bg-gray-50">
                    <span className="material-symbols-outlined text-sm">content_copy</span> Copy
                  </button>
                  <button onClick={() => downloadWorksheetPdf(aiResult)}
                    className="flex items-center gap-1 bg-[#695be6] text-white text-xs font-bold px-3 py-1.5 rounded-lg hover:bg-[#5a4dd4]">
                    <span className="material-symbols-outlined text-sm">download</span> Download PDF
                  </button>
                </div>
              </div>

              {/* Printable content */}
              <div id="worksheet-printable" className="bg-white rounded-xl border border-gray-200 p-6 space-y-5">
                {/* Header */}
                <div className="border-b-2 border-[#695be6] pb-3">
                  <h1 className="font-black text-xl">{aiResult.title}</h1>
                  <div className="flex flex-wrap gap-4 text-xs text-gray-500 mt-1">
                    <span>Subject: <strong>{aiResult.subject}</strong></span>
                    <span>Grade: <strong>{aiResult.grade}</strong></span>
                    <span>Total Marks: <strong>{aiResult.total_marks}</strong></span>
                    <span>Time: <strong>{aiResult.estimated_time_minutes} min</strong></span>
                    <span>Name: ___________________</span>
                    <span>Date: ___________________</span>
                  </div>
                  {aiResult.instructions && <p className="text-xs text-gray-600 mt-2 italic">{aiResult.instructions}</p>}
                </div>

                {/* Sections */}
                {(aiResult.sections || []).map((sec, si) => (
                  <div key={si}>
                    <h2 className="font-black text-sm text-[#695be6] uppercase tracking-wide mb-3 border-b border-[#695be6]/20 pb-1">
                      {sec.title || sec.type}
                    </h2>
                    {sec.instructions && <p className="text-xs text-gray-500 italic mb-3">{sec.instructions}</p>}
                    <div className="space-y-3">
                      {(sec.questions || []).map((q, qi) => (
                        <div key={qi} className="border border-gray-100 rounded-lg p-3">
                          <div className="flex items-start gap-2">
                            <span className="size-6 rounded-full bg-[#695be6] text-white text-xs font-bold flex items-center justify-center flex-shrink-0 mt-0.5">{q.number}</span>
                            <div className="flex-1">
                              <div className="flex items-start justify-between gap-2">
                                <p className="text-sm font-medium">{q.text}</p>
                                <span className="text-[10px] font-bold text-[#695be6] whitespace-nowrap">[{q.marks} mark{q.marks > 1 ? "s" : ""}]</span>
                              </div>
                              {q.options && (
                                <div className="mt-2 space-y-1">
                                  {q.options.map((opt, oi) => (
                                    <p key={oi} className="text-xs text-gray-700 ml-2">{opt}</p>
                                  ))}
                                </div>
                              )}
                              {q.bloom_level && <span className="text-[9px] text-gray-400 mt-1 block">Bloom's: {q.bloom_level}</span>}
                              {(sec.type === "Short Answer" || sec.type === "Long Answer") && (
                                <div className="mt-2 border-t border-dashed border-gray-200 pt-2">
                                  <div className="h-12 border border-gray-100 rounded bg-gray-50/50" />
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}

                {/* Answer Key */}
                {aiResult.answer_key?.length > 0 && (
                  <div className="bg-green-50 border border-green-200 rounded-lg p-4 mt-4">
                    <h3 className="font-black text-sm text-green-800 mb-3 flex items-center gap-2">
                      <span className="material-symbols-outlined text-base">key</span> Answer Key (Teacher Copy)
                    </h3>
                    <div className="grid grid-cols-2 gap-2">
                      {aiResult.answer_key.map((a, i) => (
                        <div key={i} className="flex items-start gap-2 text-xs">
                          <span className="font-bold text-green-700 w-6">Q{a.number}.</span>
                          <span className="text-gray-700">{a.answer}</span>
                          {a.notes && <span className="text-gray-400 italic">({a.notes})</span>}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Teacher Notes */}
                {aiResult.teacher_notes && (
                  <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
                    <p className="text-xs font-bold text-amber-800 mb-1">Teacher Notes</p>
                    <p className="text-xs text-gray-700">{aiResult.teacher_notes}</p>
                  </div>
                )}
              </div>
            </div>
            );
          })()}
        </div>
      </div>
    </div>
  );
}
