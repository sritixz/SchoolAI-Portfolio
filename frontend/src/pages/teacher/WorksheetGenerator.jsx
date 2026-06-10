import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { useAuth } from "../../context/AuthContext";
import { getInitial } from "../../utils/nameUtils";
import { selectAiToolResult, selectAiToolStatus, clearAiToolResult } from "../../store/slices/teacherSlice";
import { saveWorksheetDraft, fetchWorksheetDrafts, updateWorksheetDraft, deleteWorksheetDraft, selectWorksheetDrafts } from "../../store/slices/teacherSlice";
import { worksheetDefaults, difficultyOptions, worksheetQuestionTypes, boardOptions, learningObjectiveOptions, difficultyStructureOptions, gradePresets } from "../../data/teacher/worksheetGeneratorData";
import { subjectOptions as subjectOpts, classOptions as classOpts } from "../../data/teacher/quizGeneratorData";
import { useAiToolWithHistory } from "../../hooks/useAiToolWithHistory";
import { downloadWorksheetPdf } from "../../utils/aiPdfExport";
import MathText from "../../components/MathText";

export default function WorksheetGenerator() {
  const navigate  = useNavigate();
  const dispatch  = useDispatch();
  const { user }  = useAuth();
  const aiResult  = useSelector(selectAiToolResult);
  const aiStatus  = useSelector(selectAiToolStatus);
  const worksheetDrafts = useSelector(selectWorksheetDrafts);
  const [form, setForm] = useState(worksheetDefaults);
  const [editedResult, setEditedResult] = useState(null);
  const [savingDraft, setSavingDraft] = useState(false);
  const [savedDraftId, setSavedDraftId] = useState(null);
  const [showHistory, setShowHistory] = useState(false);
  const [historyLoaded, setHistoryLoaded] = useState(false);
  const generating = aiStatus === "loading";
  const displayResult = historyLoaded ? editedResult : (editedResult ?? aiResult);
  const showOutput = generating || !!displayResult || historyLoaded;

  useEffect(() => () => { dispatch(clearAiToolResult()); }, [dispatch]);
  useEffect(() => { dispatch(fetchWorksheetDrafts()); }, [dispatch]);
  useEffect(() => { if (aiResult) { setEditedResult(null); setHistoryLoaded(false); setSavedDraftId(null); } }, [aiResult]);

  const toggleQType = (id) =>
    setForm((p) => ({ ...p, questionTypes: { ...p.questionTypes, [id]: !p.questionTypes[id] } }));

  const handleGradeChange = (newGrade) => {
    const preset = gradePresets[newGrade];
    if (preset) {
      setForm((p) => ({
        ...p,
        classLevel: newGrade,
        totalQuestions: preset.totalQuestions,
        difficulty: preset.difficulty,
        difficultyStructure: preset.difficultyStructure,
        learningObjective: preset.learningObjective,
        questionTypes: { ...preset.questionTypes },
      }));
    } else {
      setForm((p) => ({ ...p, classLevel: newGrade }));
    }
  };

  const updateResultField = (field, value) => {
    setEditedResult((prev) => ({ ...(prev ?? aiResult), [field]: value }));
  };

  const updateSectionQuestion = (secIdx, qIdx, field, value) => {
    setEditedResult((prev) => {
      const base = prev ?? aiResult;
      const sections = base.sections.map((sec, si) => {
        if (si !== secIdx) return sec;
        return {
          ...sec,
          questions: sec.questions.map((q, qi) =>
            qi === qIdx ? { ...q, [field]: value } : q
          ),
        };
      });
      return { ...base, sections };
    });
  };

  const { runTool } = useAiToolWithHistory();

  const loadFromHistory = (item) => {
    // Merge worksheet data with metadata to ensure all fields are present
    const mergedResult = {
      ...(item.worksheet ?? {}),
      subject: item.subject || item.worksheet?.subject,
      grade: item.grade || item.worksheet?.grade,
      topic: item.topic || item.worksheet?.topic,
    };
    setEditedResult(mergedResult);
    setHistoryLoaded(true);
    setSavedDraftId(item._id);
    setShowHistory(false);
    if (item.subject) setForm((p) => ({ ...p, subject: item.subject }));
    if (item.topic)   setForm((p) => ({ ...p, topic: item.topic }));
    if (item.grade)   setForm((p) => ({ ...p, classLevel: item.grade }));
  };

  const handleSaveDraft = async () => {
    if (!displayResult) return;
    setSavingDraft(true);
    try {
      const payload = {
        title:     displayResult.title || form.title || `${form.topic} Worksheet`,
        subject:   displayResult.subject || form.subject,
        topic:     form.topic,
        grade:     form.classLevel,
        board:     form.board,
        chapter:   form.chapter || null,
        worksheet: displayResult,
        meta: {
          difficulty: form.difficulty,
          questionTypes: form.questionTypes,
          totalQuestions: form.totalQuestions,
          learningObjective: form.learningObjective,
          difficultyStructure: form.difficultyStructure,
          specialInstructions: form.specialInstructions,
        },
      };
      const action = savedDraftId
        ? await dispatch(updateWorksheetDraft({ id: savedDraftId, ...payload }))
        : await dispatch(saveWorksheetDraft(payload));
      if (saveWorksheetDraft.fulfilled.match(action) || updateWorksheetDraft.fulfilled.match(action)) {
        setSavedDraftId(action.payload._id);
      }
    } finally {
      setSavingDraft(false);
    }
  };

  const handleGenerate = () => {
    setEditedResult(null);
    setHistoryLoaded(false);
    setSavedDraftId(null);
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
        <div className="max-w-[1200px] mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
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
            <div className="size-9 rounded-full bg-[#695be6] flex items-center justify-center text-white font-bold text-sm">{getInitial(user?.name) || "T"}</div>
          </div>
        </div>
      </header>

      <div className="max-w-[1200px] mx-auto pt-20 flex flex-col lg:flex-row min-h-screen">
        {/* Left: Config */}
        <div className="w-full lg:w-[480px] flex-shrink-0 border-b lg:border-b-0 lg:border-r border-gray-200 bg-white p-4 sm:p-6 overflow-y-auto">
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
                <select value={form.classLevel} onChange={(e) => handleGradeChange(e.target.value)}
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
              <input value={form.topic} onChange={(e) => setForm({ ...form, topic: e.target.value, title: e.target.value ? `${e.target.value} Practice Sheet` : "" })}
                className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-[#695be6]" />
            </div>
            {gradePresets[form.classLevel] && (
              <div className="mt-3 bg-[#695be6]/5 border border-[#695be6]/20 rounded-xl px-3 py-2.5 flex items-start gap-2">
                <span className="material-symbols-outlined text-[#695be6] text-sm mt-0.5">school</span>
                <div>
                  <p className="text-[11px] font-bold text-[#695be6]">{form.classLevel} Personalization Active</p>
                  <p className="text-[10px] text-gray-500 mt-0.5">{gradePresets[form.classLevel].hint}</p>
                </div>
              </div>
            )}
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

          {/* Saved Worksheets Section */}
          {worksheetDrafts.length > 0 && (
            <div className="mt-8 pt-6 border-t border-gray-200">
              <h2 className="flex items-center gap-2 font-black text-base mb-3">
                <span className="size-6 bg-green-100 rounded-full flex items-center justify-center">
                  <span className="material-symbols-outlined text-green-600 text-sm">check_circle</span>
                </span>
                Saved Worksheets
              </h2>
              <div className="space-y-2 max-h-64 overflow-y-auto pr-1" style={{ scrollbarWidth: "thin" }}>
                {worksheetDrafts.map((draft) => (
                  <div key={draft._id} className="bg-gray-50 border border-gray-100 rounded-xl p-3 hover:border-[#695be6]/30 transition-colors">
                    <p className="text-xs font-bold text-gray-800 truncate">{draft.title}</p>
                    <p className="text-[10px] text-gray-400 mt-0.5">
                      {draft.subject}{draft.grade ? ` · ${draft.grade}` : ""}
                    </p>
                    <div className="flex items-center gap-1 mt-2">
                      <button onClick={() => loadFromHistory(draft)}
                        className="flex items-center gap-1 text-[10px] font-bold text-[#695be6] hover:bg-[#695be6]/10 px-2 py-1 rounded-lg transition-colors flex-1">
                        <span className="material-symbols-outlined text-xs">open_in_new</span> Load
                      </button>
                      <button onClick={() => dispatch(deleteWorksheetDraft(draft._id))}
                        className="text-gray-300 hover:text-red-500 transition-colors p-1">
                        <span className="material-symbols-outlined text-sm">delete</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Right: Preview */}
        <div className="flex-1 bg-[#faf9ff] flex items-center justify-center p-8 overflow-y-auto">
          {generating && (
            <div className="flex flex-col items-center gap-3">
              <span className="size-10 border-2 border-[#695be6]/30 border-t-[#695be6] rounded-full animate-spin" />
              <p className="text-sm text-gray-400">Generating worksheet...</p>
            </div>
          )}
          {!generating && !showOutput && (
            <div className="bg-white rounded-2xl shadow-lg border border-gray-100 w-full max-w-md p-10 flex flex-col items-center text-center">
              <div className="size-20 bg-[#695be6]/10 rounded-2xl flex items-center justify-center mb-6">
                <span className="material-symbols-outlined text-[#695be6] text-5xl">description</span>
              </div>
              <h2 className="font-black text-xl mb-2">Ready to Create?</h2>
              <p className="text-sm text-gray-400 mb-4">Fill in the details and click Generate to create a professional worksheet with answer key.</p>
              {worksheetDrafts.length > 0 && (
                <button onClick={() => setShowHistory((v) => !v)}
                  className="flex items-center gap-1.5 border border-[#695be6] text-[#695be6] text-sm font-bold px-4 py-2 rounded-xl hover:bg-[#695be6]/5 transition-colors">
                  <span className="material-symbols-outlined text-base">history</span>
                  Saved Worksheets ({worksheetDrafts.length})
                </button>
              )}
              {showHistory && (
                <div className="w-full mt-4 text-left space-y-2 max-h-60 overflow-y-auto" style={{ scrollbarWidth: "thin" }}>
                  {worksheetDrafts.map((item) => (
                    <div key={item._id} className="bg-gray-50 border border-gray-100 rounded-xl overflow-hidden">
                      <div className="px-3 py-2">
                        <p className="text-xs font-bold text-gray-800 truncate">{item.title}</p>
                        <p className="text-[10px] text-gray-400">{item.subject}{item.grade ? ` · ${item.grade}` : ""}</p>
                      </div>
                      <div className="flex items-center gap-1 px-3 pb-2">
                        <button onClick={() => loadFromHistory(item)}
                          className="flex items-center gap-1 text-[10px] font-bold text-[#695be6] hover:bg-[#695be6]/5 px-2 py-1 rounded-lg">
                          <span className="material-symbols-outlined text-xs">open_in_new</span> Load
                        </button>
                        <div className="flex-1" />
                        <button onClick={() => dispatch(deleteWorksheetDraft(item._id))} className="text-gray-300 hover:text-red-500 p-1">
                          <span className="material-symbols-outlined text-sm">delete</span>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
          {!generating && showOutput && displayResult && (() => {
            return (
            <div className="w-full max-w-3xl space-y-4">
              {/* Action bar */}
              <div className="flex items-center justify-between bg-white rounded-xl border border-gray-200 px-4 py-3 flex-wrap gap-2">
                <div>
                  <p className="font-black text-base">{displayResult.title}</p>
                  <p className="text-xs text-gray-500">{displayResult.total_marks} marks · {displayResult.estimated_time_minutes} min · {displayResult.difficulty}</p>
                </div>
                <div className="flex gap-2 flex-wrap">
                  {editedResult && (
                    <span className="flex items-center gap-1 text-xs font-bold text-amber-600 border border-amber-200 bg-amber-50 px-2.5 py-1.5 rounded-lg">
                      <span className="material-symbols-outlined text-sm">edit</span> Edited
                    </span>
                  )}
                  <button
                    onClick={handleSaveDraft}
                    disabled={savingDraft}
                    className={`flex items-center gap-1 text-xs font-bold px-2.5 py-1.5 rounded-lg border transition-colors ${
                      savedDraftId ? "bg-green-50 text-green-700 border-green-200" : "bg-amber-500 text-white border-transparent hover:bg-amber-600"
                    }`}
                  >
                    <span className="material-symbols-outlined text-sm">
                      {savingDraft ? "hourglass_empty" : savedDraftId ? "check_circle" : "save"}
                    </span>
                    {savingDraft ? "Saving..." : savedDraftId ? "Saved" : "Save Draft"}
                  </button>
                  <button
                    onClick={() => setShowHistory((v) => !v)}
                    className={`flex items-center gap-1 border text-xs font-bold px-2.5 py-1.5 rounded-lg transition-colors ${
                      showHistory ? "bg-[#695be6] text-white border-[#695be6]" : "border-gray-200 text-gray-600 hover:bg-gray-50"
                    }`}
                  >
                    <span className="material-symbols-outlined text-sm">history</span>
                    Saved
                    {worksheetDrafts.length > 0 && (
                      <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${showHistory ? "bg-white text-[#695be6]" : "bg-[#695be6] text-white"}`}>
                        {worksheetDrafts.length}
                      </span>
                    )}
                  </button>
                  <button onClick={() => navigator.clipboard?.writeText(JSON.stringify(displayResult, null, 2))}
                    className="flex items-center gap-1 border border-gray-200 text-xs font-bold px-3 py-1.5 rounded-lg hover:bg-gray-50">
                    <span className="material-symbols-outlined text-sm">content_copy</span> Copy
                  </button>
                  <button onClick={() => downloadWorksheetPdf(displayResult)}
                    className="flex items-center gap-1 bg-[#695be6] text-white text-xs font-bold px-3 py-1.5 rounded-lg hover:bg-[#5a4dd4]">
                    <span className="material-symbols-outlined text-sm">download</span> Download PDF
                  </button>
                  <button
                    onClick={() => {
                      const allQs = (displayResult.sections || []).flatMap((sec) =>
                        (sec.questions || []).map((q, i) => ({
                          id: `ws_${sec.type}_${i}`,
                          question_text: q.text || "",
                          answer_type: sec.type === "MCQ" ? "mcq" : "typed",
                          options: sec.type === "MCQ" && q.options
                            ? q.options.map((opt, j) => ({
                                id: `o${j+1}`,
                                text: typeof opt === "string" ? opt.replace(/^[A-D]\.\s*/,"") : opt,
                                is_correct: q.correct_answer ? opt.startsWith(q.correct_answer) : j === 0,
                              }))
                            : [],
                          max_points: q.marks || 1,
                          hint: "",
                          sample_answer: q.sample_answer || q.marking_points?.join("; ") || "",
                        }))
                      );
                      navigate("/teacher/homework/create", {
                        state: {
                          preloadedQuestions: allQs,
                          subject: displayResult.subject || form.subject,
                          title: displayResult.title || `${form.topic} Worksheet`,
                        },
                      });
                    }}
                    className="flex items-center gap-1 bg-green-600 text-white text-xs font-bold px-3 py-1.5 rounded-lg hover:bg-green-700">
                    <span className="material-symbols-outlined text-sm">assignment_add</span> Create Homework
                  </button>
                </div>
              </div>

              {/* History panel */}
              {showHistory && (
                <div className="bg-white rounded-xl border border-gray-200 p-4">
                  <div className="flex items-center justify-between mb-3">
                    <p className="text-xs font-black text-[#695be6] uppercase tracking-widest">Saved Worksheets</p>
                    <span className="text-[10px] text-gray-400">{worksheetDrafts.length} saved</span>
                  </div>
                  {worksheetDrafts.length === 0 ? (
                    <p className="text-xs text-gray-400 text-center py-4">No saved worksheets yet. Generate one and click Save Draft.</p>
                  ) : (
                    <div className="space-y-2 max-h-60 overflow-y-auto pr-1" style={{ scrollbarWidth: "thin" }}>
                      {worksheetDrafts.map((item) => (
                        <div key={item._id} className="bg-gray-50 border border-gray-100 rounded-xl overflow-hidden">
                          <div className="px-3 py-2">
                            <p className="text-xs font-bold text-gray-800 truncate">{item.title}</p>
                            <p className="text-[10px] text-gray-400">
                              {item.subject}{item.grade ? ` · ${item.grade}` : ""}
                              {item.created_at ? ` · ${new Date(item.created_at).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}` : ""}
                            </p>
                          </div>
                          <div className="flex items-center gap-1 px-3 pb-2">
                            <button onClick={() => loadFromHistory(item)}
                              className="flex items-center gap-1 text-[10px] font-bold text-[#695be6] hover:bg-[#695be6]/5 px-2 py-1 rounded-lg transition-colors">
                              <span className="material-symbols-outlined text-xs">open_in_new</span> Load
                            </button>
                            <div className="flex-1" />
                            <button onClick={() => dispatch(deleteWorksheetDraft(item._id))}
                              className="text-gray-300 hover:text-red-500 transition-colors p-1">
                              <span className="material-symbols-outlined text-sm">delete</span>
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Printable content */}
              <div id="worksheet-printable" className="bg-white rounded-xl border border-gray-200 p-6 space-y-5">
                {/* Header */}
                <div className="border-b-2 border-[#695be6] pb-3">
                  <input
                    value={displayResult.title || ""}
                    onChange={(e) => updateResultField("title", e.target.value)}
                    className="font-black text-xl w-full outline-none border-b border-transparent hover:border-gray-300 focus:border-[#695be6] transition-colors"
                  />
                  <div className="flex flex-wrap gap-4 text-xs text-gray-500 mt-1">
                    <span>Subject: <strong>{displayResult.subject}</strong></span>
                    <span>Grade: <strong>{displayResult.grade}</strong></span>
                    <span>Total Marks: <strong>{displayResult.total_marks}</strong></span>
                    <span>Time: <strong>{displayResult.estimated_time_minutes} min</strong></span>
                    <span>Name: ___________________</span>
                    <span>Date: ___________________</span>
                  </div>
                  {displayResult.instructions && (
                    <input
                      value={displayResult.instructions}
                      onChange={(e) => updateResultField("instructions", e.target.value)}
                      className="text-xs text-gray-600 mt-2 italic w-full outline-none border-b border-transparent hover:border-gray-300 focus:border-[#695be6] transition-colors"
                    />
                  )}
                </div>

                {/* Sections */}
                {(displayResult.sections || []).map((sec, si) => (
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
                                <div className="flex-1">
                                  <textarea
                                    value={q.text || ""}
                                    onChange={(e) => updateSectionQuestion(si, qi, "text", e.target.value)}
                                    rows={2}
                                    className="w-full text-sm font-medium resize-none outline-none border-b border-transparent hover:border-gray-300 focus:border-[#695be6] transition-colors"
                                  />
                                  {/* Math preview — shown when question contains math symbols */}
                                  {q.text && /[$\\^_{}×÷²³√≤≥≠π∞]/.test(q.text) && (
                                    <MathText text={q.text} className="text-xs text-[#695be6]/70 mt-1 italic" tag="p" />
                                  )}
                                </div>
                                <div className="flex items-center gap-1 flex-shrink-0">
                                  <input
                                    type="number" min={1} max={20}
                                    value={q.marks || 1}
                                    onChange={(e) => updateSectionQuestion(si, qi, "marks", +e.target.value)}
                                    className="w-12 text-[10px] font-bold text-[#695be6] border border-[#695be6]/30 rounded px-1 py-0.5 text-center outline-none focus:border-[#695be6]"
                                  />
                                  <span className="text-[10px] text-gray-400">mk</span>
                                </div>
                              </div>
                              {q.options && (
                                <div className="mt-2 space-y-1">
                                  {q.options.map((opt, oi) => (
                                    <MathText key={oi} text={opt} className="text-xs text-gray-700 ml-2" tag="p" />
                                  ))}
                                </div>
                              )}

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
                {displayResult.answer_key?.length > 0 && (
                  <div className="bg-green-50 border border-green-200 rounded-lg p-4 mt-4">
                    <h3 className="font-black text-sm text-green-800 mb-3 flex items-center gap-2">
                      <span className="material-symbols-outlined text-base">key</span> Answer Key (Teacher Copy)
                    </h3>
                    <div className="grid grid-cols-2 gap-2">
                      {displayResult.answer_key.map((a, i) => (
                        <div key={i} className="flex items-start gap-2 text-xs">
                          <span className="font-bold text-green-700 w-6">Q{a.number}.</span>
                          <input
                            value={a.answer || ""}
                            onChange={(e) => {
                              const ak = displayResult.answer_key.map((k, ki) => ki === i ? { ...k, answer: e.target.value } : k);
                              updateResultField("answer_key", ak);
                            }}
                            className="flex-1 text-gray-700 bg-transparent outline-none border-b border-transparent hover:border-gray-300 focus:border-[#695be6] transition-colors"
                          />
                          {a.notes && <span className="text-gray-400 italic">({a.notes})</span>}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Teacher Notes */}
                {displayResult.teacher_notes && (
                  <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
                    <p className="text-xs font-bold text-amber-800 mb-1">Teacher Notes</p>
                    <textarea
                      value={displayResult.teacher_notes}
                      onChange={(e) => updateResultField("teacher_notes", e.target.value)}
                      rows={3}
                      className="w-full text-xs text-gray-700 bg-transparent outline-none resize-none border-b border-transparent hover:border-gray-300 focus:border-[#695be6] transition-colors"
                    />
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
