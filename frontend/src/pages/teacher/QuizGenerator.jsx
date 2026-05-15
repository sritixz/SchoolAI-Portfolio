import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { useAuth } from "../../context/AuthContext";
import { getInitial } from "../../utils/nameUtils";
import { selectGeneratedQuestions, selectGenerateStatus, clearGeneratedQuestions, saveQuizDraft, fetchQuizDrafts, deleteQuizDraft, updateQuizDraft, selectQuizDrafts } from "../../store/slices/teacherSlice";
import {
  quizGeneratorDefaults,
  subjectOptions,
  classOptions,
  questionTypeOptions,
  boardOptions,
  learningObjectiveOptions,
} from "../../data/teacher/quizGeneratorData";
import { useAiToolWithHistory } from "../../hooks/useAiToolWithHistory";
import { downloadQuizPdf } from "../../utils/aiPdfExport";
import MathText from "../../components/MathText";

export default function QuizGenerator() {
  const navigate  = useNavigate();
  const dispatch  = useDispatch();
  const { user }  = useAuth();
  const questions = useSelector(selectGeneratedQuestions);
  const genStatus = useSelector(selectGenerateStatus);
  const quizDrafts = useSelector(selectQuizDrafts);
  const [form, setForm] = useState(quizGeneratorDefaults);
  const generating = genStatus === "loading";
  const [savingDraft, setSavingDraft] = useState(false);
  const [savedDraftId, setSavedDraftId] = useState(null);
  const [showDrafts, setShowDrafts] = useState(false);

  useEffect(() => () => { dispatch(clearGeneratedQuestions()); }, [dispatch]);
  useEffect(() => { dispatch(fetchQuizDrafts()); }, [dispatch]);

  const toggleQType = (id) =>
    setForm((p) => ({ ...p, questionTypes: { ...p.questionTypes, [id]: !p.questionTypes[id] } }));

  const [editedQuestions, setEditedQuestions] = useState(null);
  const displayQuestions = editedQuestions ?? questions;

  const { runQuiz } = useAiToolWithHistory();
  const handleGenerate = () => {
    setEditedQuestions(null);
    setSavedDraftId(null);
    const types = Object.entries(form.questionTypes).filter(([,v]) => v).map(([k]) =>
      k === "shortAnswer" ? "typed" : k === "numerical" ? "typed" : k === "caseBased" ? "typed" : k
    );
    const diffObj = form.difficulty;
    // top-level difficulty must be a string for the backend model
    const diffStr = diffObj.hard > 50 ? "hard" : diffObj.easy > 50 ? "easy" : "mixed";
    runQuiz({
      subject: form.subject,
      topic: form.topic,
      grade: form.classLevel,
      count: form.questionCount || 5,
      difficulty: diffStr,
      question_types: types.length ? types : ["mcq"],
      board: form.board,
      chapter: form.chapter,
      learning_objective: form.learningObjective,
      special_instructions: form.specialInstructions,
      extra: {
        count: form.questionCount || 5,
        difficulty: diffObj,
        board: form.board,
        chapter: form.chapter,
        learning_objective: form.learningObjective,
        special_instructions: form.specialInstructions,
        question_types: types.length ? types : ["mcq"],
      },
    }, { title: `Quiz — ${form.topic}` });
  };

  const updateQuestion = (idx, field, value) => {
    const qs = editedQuestions ?? [...questions];
    const updated = qs.map((q, i) => i === idx ? { ...q, [field]: value } : q);
    setEditedQuestions(updated);
  };

  const updateOption = (qIdx, oIdx, field, value) => {
    const qs = editedQuestions ?? [...questions];
    const updated = qs.map((q, i) => {
      if (i !== qIdx) return q;
      const opts = (q.options || []).map((o, j) =>
        j === oIdx ? { ...o, [field]: value } : (field === "is_correct" && value ? { ...o, is_correct: false } : o)
      );
      return { ...q, options: opts };
    });
    setEditedQuestions(updated);
  };

  const handleSaveDraft = async () => {
    if (!displayQuestions.length) return;
    setSavingDraft(true);
    try {
      const payload = {
        title: `${form.topic} Quiz`,
        subject: form.subject,
        topic: form.topic,
        grade: form.classLevel,
        board: form.board,
        chapter: form.chapter || null,
        questions: displayQuestions,
        meta: {
          difficulty: form.difficulty,
          questionTypes: form.questionTypes,
          questionCount: form.questionCount,
          learningObjective: form.learningObjective,
          specialInstructions: form.specialInstructions,
        },
      };
      const action = savedDraftId
        ? await dispatch(updateQuizDraft({ id: savedDraftId, ...payload }))
        : await dispatch(saveQuizDraft(payload));
      if (saveQuizDraft.fulfilled.match(action) || updateQuizDraft.fulfilled.match(action)) {
        setSavedDraftId(action.payload._id);
      }
    } finally {
      setSavingDraft(false);
    }
  };

  return (
    <div className="bg-[#faf9ff] min-h-screen" style={{ fontFamily: "'Lexend', sans-serif" }}>

      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-white border-b border-gray-200">
        <div className="max-w-[1200px] mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="size-8 bg-[#695be6]/10 rounded-lg flex items-center justify-center">
              <span className="material-symbols-outlined text-[#695be6] text-lg">quiz</span>
            </div>
            <h1 className="font-black text-base">Questions & Quiz Generator</h1>
          </div>
          <div className="flex items-center gap-4 text-sm font-semibold text-gray-500">
            <button onClick={() => navigate("/teacher/ai-assistant")} className="hover:text-gray-700">AI Assistant</button>
            <button className="text-[#695be6] border-b-2 border-[#695be6] pb-0.5">Generator Workspace</button>
            <div className="relative p-2 hover:bg-gray-100 rounded-lg cursor-pointer">
              <span className="material-symbols-outlined text-gray-600">notifications</span>
            </div>
            <button className="p-2 hover:bg-gray-100 rounded-lg">
              <span className="material-symbols-outlined text-gray-600">settings</span>
            </button>
            <div className="size-9 rounded-full bg-[#695be6] flex items-center justify-center text-white font-bold text-sm">{getInitial(user?.name) || "T"}</div>
          </div>
        </div>
      </header>

      <div className="max-w-[1200px] mx-auto pt-20 px-4 sm:px-6 pb-12">
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-xs text-gray-400 mb-4">
          <button onClick={() => navigate("/teacher/ai-assistant")} className="hover:underline">AI Assistant</button>
          <span>›</span>
          <span className="text-gray-700 font-semibold">Questions & Quiz Generator</span>
        </div>

        <div className="flex items-center justify-between mb-6">
          <h1 className="text-3xl font-black">Workspace</h1>
          <button
            onClick={() => navigate("/teacher/ai-assistant")}
            className="flex items-center gap-1.5 border border-gray-200 text-sm font-semibold px-4 py-2 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <span className="material-symbols-outlined text-base">arrow_back</span> Back
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

          {/* Left: Generator Settings */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-[#695be6] text-lg">tune</span>
                <h3 className="font-black text-sm">Generator Settings</h3>
              </div>
              <span className="text-xs font-bold text-[#695be6] bg-[#695be6]/10 px-2 py-0.5 rounded">CONFIGURE</span>
            </div>

            <div className="p-5 space-y-5">
              {/* 1. Content Selection */}
              <div>
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-wide mb-3">1. Content Selection</p>
                <div className="mb-3">
                  <label className="text-xs font-bold text-gray-600 mb-1 block">Topic</label>
                  <input
                    value={form.topic}
                    onChange={(e) => setForm({ ...form, topic: e.target.value })}
                    className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-[#695be6]"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-bold text-gray-600 mb-1 block">Subject</label>
                    <select
                      value={form.subject}
                      onChange={(e) => setForm({ ...form, subject: e.target.value })}
                      className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-[#695be6] bg-white"
                    >
                      {subjectOptions.map((s) => <option key={s}>{s}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="text-xs font-bold text-gray-600 mb-1 block">Class/Level</label>
                    <select
                      value={form.classLevel}
                      onChange={(e) => setForm({ ...form, classLevel: e.target.value })}
                      className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-[#695be6] bg-white"
                    >
                      {classOptions.map((c) => <option key={c}>{c}</option>)}
                    </select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3 mt-3">
                  <div>
                    <label className="text-xs font-bold text-gray-600 mb-1 block">Board</label>
                    <select value={form.board} onChange={(e) => setForm({ ...form, board: e.target.value })}
                      className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-[#695be6] bg-white">
                      {boardOptions.map((b) => <option key={b}>{b}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="text-xs font-bold text-gray-600 mb-1 block">Chapter (optional)</label>
                    <input value={form.chapter} onChange={(e) => setForm({ ...form, chapter: e.target.value })}
                      placeholder="e.g. Chapter 2"
                      className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-[#695be6]" />
                  </div>
                </div>
              </div>

              {/* 1b. Learning Objective */}
              <div>
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-wide mb-3">Learning Objective</p>
                <div className="grid grid-cols-2 gap-2">
                  {learningObjectiveOptions.map((lo) => (
                    <button key={lo.id} onClick={() => setForm({ ...form, learningObjective: lo.id })}
                      className={`text-left px-3 py-2 rounded-xl border-2 transition-all ${
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

              {/* 2. Question Types */}
              <div>
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-wide mb-3">2. Question Types</p>
                <div className="grid grid-cols-2 gap-2">
                  {questionTypeOptions.map((qt) => (
                    <label key={qt.id} className="flex items-center gap-2 text-sm cursor-pointer">
                      <div
                        onClick={() => toggleQType(qt.id)}
                        className={`size-5 rounded border-2 flex items-center justify-center cursor-pointer transition-colors ${
                          form.questionTypes[qt.id] ? "bg-[#695be6] border-[#695be6]" : "border-gray-300"
                        }`}
                      >
                        {form.questionTypes[qt.id] && (
                          <span className="material-symbols-outlined text-white text-xs">check</span>
                        )}
                      </div>
                      {qt.label}
                    </label>
                  ))}
                </div>
              </div>

              {/* 3. Difficulty Distribution */}
              <div>
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-wide mb-3">3. Difficulty Distribution</p>
                <div className="space-y-3">
                  {[
                    { key: "easy",   label: "EASY",   color: "text-green-600",  dot: "bg-green-500",  track: "accent-green-500" },
                    { key: "medium", label: "MEDIUM", color: "text-orange-500", dot: "bg-orange-400", track: "accent-orange-400" },
                    { key: "hard",   label: "HARD",   color: "text-red-500",    dot: "bg-red-500",    track: "accent-red-500" },
                  ].map((d) => (
                    <div key={d.key} className="flex items-center gap-3">
                      <div className="flex items-center gap-1.5 w-20">
                        <span className={`size-3 rounded-full ${d.dot} inline-block`}></span>
                        <span className={`text-[10px] font-black ${d.color}`}>{d.label}</span>
                      </div>
                      <input
                        type="range" min={0} max={100} value={form.difficulty[d.key]}
                        onChange={(e) => setForm({ ...form, difficulty: { ...form.difficulty, [d.key]: +e.target.value } })}
                        className={`flex-1 ${d.track}`}
                      />
                      <span className="text-xs font-bold text-gray-500 w-10 text-right">{form.difficulty[d.key]}%</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Special Instructions */}
              <div>
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-wide mb-2">Special Instructions (optional)</p>
                <textarea value={form.specialInstructions} onChange={(e) => setForm({ ...form, specialInstructions: e.target.value })}
                  rows={2} placeholder="e.g. Focus on word problems, include diagrams, align to board syllabus..."
                  className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-[#695be6] resize-none" />
              </div>

              {/* Number of Questions */}
              <div>
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-wide mb-2">Number of Questions</p>
                <input type="number" min={1} max={20} value={form.questionCount || 5}
                  onChange={(e) => setForm({ ...form, questionCount: Math.max(1, Math.min(20, +e.target.value)) })}
                  className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-[#695be6]" />
              </div>

              <button
                onClick={handleGenerate}
                disabled={generating}
                className="w-full bg-[#695be6] text-white font-black py-3.5 rounded-xl hover:bg-[#5a4dd4] transition-colors flex items-center justify-center gap-2 disabled:opacity-70"
              >
                <span className="material-symbols-outlined text-base">auto_awesome</span>
                {generating ? "Generating..." : "Generate Questions ✨"}
              </button>
            </div>
          </div>

            {/* Right: Preview Area */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                        {/* Replace the current Preview Area header content with this */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between px-5 py-4 border-b border-gray-100 gap-4">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-[#695be6] text-lg">visibility</span>
                <h3 className="font-black text-sm">Preview Area</h3>
              </div>
              
              {/* Actions Container: Now using flex-wrap and gap to prevent "messed up" look */}
              <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
                {displayQuestions.length > 0 && (
                  <>
                    <button
                      onClick={handleSaveDraft}
                      disabled={savingDraft}
                      className={`flex items-center gap-1 text-[10px] font-bold px-2.5 py-1.5 rounded-lg transition-colors border ${
                        savedDraftId 
                          ? "bg-green-50 text-green-700 border-green-200" 
                          : "bg-amber-500 text-white border-transparent hover:bg-amber-600"
                      }`}
                    >
                      <span className="material-symbols-outlined text-sm">
                        {savingDraft ? "hourglass_empty" : savedDraftId ? "check_circle" : "save"}
                      </span>
                      {savingDraft ? "Saving..." : savedDraftId ? "Saved" : "Save Draft"}
                    </button>

                    <button 
                      onClick={() => navigator.clipboard?.writeText(JSON.stringify(displayQuestions, null, 2))}
                      className="flex items-center gap-1 border border-gray-200 text-[10px] font-bold px-2.5 py-1.5 rounded-lg hover:bg-gray-50 text-gray-600"
                    >
                      <span className="material-symbols-outlined text-sm">content_copy</span> Copy
                    </button>

                    <button 
                      onClick={() => downloadQuizPdf(displayQuestions, { subject: form.subject, topic: form.topic, grade: form.classLevel })}
                      className="flex items-center gap-1 bg-[#695be6] text-white text-[10px] font-bold px-2.5 py-1.5 rounded-lg hover:bg-[#5a4dd4]"
                    >
                      <span className="material-symbols-outlined text-sm">download</span> PDF
                    </button>

                    <button
                      onClick={() => {
                        const mapped = displayQuestions.map((q, i) => ({
                          id: q.id || `q${i+1}`,
                          question_number: i + 1,
                          total_questions: displayQuestions.length,
                          question_text: q.question_text || q.text || "",
                          answer_type: (q.answer_type || q.type || "mcq").toLowerCase(),
                          options: (q.options || []).map((o, j) => ({ id: o.id || `o${j+1}`, text: o.text || "", is_correct: !!o.is_correct })),
                          max_points: q.max_points || q.marks || 1,
                          hint: q.hint || "",
                          sample_answer: q.sample_answer || "",
                          vin_nudge: q.vin_nudge || "",
                        }));
                        navigate("/teacher/homework/create", {
                          state: { preloadedQuestions: mapped, subject: form.subject, title: `${form.topic} Quiz` },
                        });
                      }}
                      className="flex items-center gap-1 bg-green-600 text-white text-[10px] font-bold px-2.5 py-1.5 rounded-lg hover:bg-green-700"
                    >
                      <span className="material-symbols-outlined text-sm">assignment_add</span> Create HW
                    </button>
                  </>
                )}

                {/* History Button - Now has explicit visibility and distinct styling */}
                <button
                  onClick={() => setShowDrafts((v) => !v)}
                  className={`flex items-center gap-1 border text-[10px] font-bold px-2.5 py-1.5 rounded-lg transition-all ${
                    showDrafts 
                      ? "bg-[#695be6] text-white border-[#695be6]" 
                      : "bg-white border-gray-200 text-gray-600 hover:bg-gray-50"
                  }`}
                >
                  <span className="material-symbols-outlined text-sm">history</span>
                  <span>History</span>
                  {quizDrafts.length > 0 && (
                    <span className={`ml-1 rounded-full px-1.5 text-[9px] ${showDrafts ? "bg-white text-[#695be6]" : "bg-[#695be6] text-white"}`}>
                      {quizDrafts.length}
                    </span>
                  )}
                </button>
              </div>
            </div>

            {/* History / Drafts panel */}
            {showDrafts && (
              <div className="border-b border-gray-100 bg-[#faf9ff] p-4">
                <div className="flex items-center justify-between mb-3">
                  <p className="text-xs font-black text-[#695be6] uppercase tracking-widest">Quiz History & Drafts</p>
                  <span className="text-[10px] text-gray-400">{quizDrafts.length} saved</span>
                </div>
                {quizDrafts.length === 0 ? (
                  <p className="text-xs text-gray-400 text-center py-6">No drafts yet. Generate questions and click "Save Draft".</p>
                ) : (
                  <div className="space-y-2 max-h-72 overflow-y-auto pr-1" style={{ scrollbarWidth: "thin" }}>
                    {quizDrafts.map((d) => (
                      <div key={d._id} className="bg-white rounded-xl border border-[#e8e3f5] overflow-hidden">
                        {/* Header row */}
                        <div className="flex items-center gap-3 px-3 py-2.5 border-b border-gray-50">
                          <div className="size-7 rounded-lg bg-[#695be6]/10 flex items-center justify-center shrink-0">
                            <span className="material-symbols-outlined text-[#695be6] text-sm">quiz</span>
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-bold text-gray-800 truncate">{d.title}</p>
                            <p className="text-[10px] text-gray-400">
                              {d.subject}{d.grade ? ` · ${d.grade}` : ""}{d.chapter ? ` · ${d.chapter}` : ""}
                            </p>
                          </div>
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200 shrink-0">DRAFT</span>
                        </div>
                        {/* Meta row */}
                        <div className="px-3 py-2 grid grid-cols-3 gap-2 text-[10px]">
                          <div>
                            <p className="text-gray-400">Topic</p>
                            <p className="font-semibold text-gray-700 truncate">{d.topic || "—"}</p>
                          </div>
                          <div>
                            <p className="text-gray-400">Questions</p>
                            <p className="font-semibold text-gray-700">{d.questions?.length || 0}</p>
                          </div>
                          <div>
                            <p className="text-gray-400">Saved on</p>
                            <p className="font-semibold text-gray-700">
                              {d.created_at ? new Date(d.created_at).toLocaleDateString("en-IN", { day: "numeric", month: "short" }) : "—"}
                            </p>
                          </div>
                        </div>
                        {/* Actions */}
                        <div className="flex items-center gap-1 px-3 pb-2.5">
                          <button
                            onClick={() => {
                              setEditedQuestions(d.questions);
                              setSavedDraftId(d._id);
                              setShowDrafts(false);
                            }}
                            className="flex items-center gap-1 text-[10px] font-bold text-[#695be6] hover:bg-[#695be6]/5 px-2 py-1 rounded-lg transition-colors"
                          >
                            <span className="material-symbols-outlined text-xs">edit</span> Edit & Load
                          </button>
                          <button
                            onClick={() => {
                              const mapped = (d.questions || []).map((q, i) => ({
                                id: q.id || `q${i+1}`,
                                question_number: i + 1,
                                total_questions: d.questions.length,
                                question_text: q.question_text || q.text || "",
                                answer_type: (q.answer_type || q.type || "mcq").toLowerCase(),
                                options: (q.options || []).map((o, j) => ({ id: o.id || `o${j+1}`, text: o.text || "", is_correct: !!o.is_correct })),
                                max_points: q.max_points || q.marks || 1,
                                hint: q.hint || "",
                                sample_answer: q.sample_answer || "",
                                vin_nudge: q.vin_nudge || "",
                              }));
                              navigate("/teacher/homework/create", {
                                state: { preloadedQuestions: mapped, subject: d.subject, title: d.title },
                              });
                            }}
                            className="flex items-center gap-1 text-[10px] font-bold text-green-600 hover:bg-green-50 px-2 py-1 rounded-lg transition-colors"
                          >
                            <span className="material-symbols-outlined text-xs">assignment_add</span> Assign as HW
                          </button>
                          <div className="flex-1" />
                          <button
                            onClick={() => dispatch(deleteQuizDraft(d._id))}
                            className="text-gray-300 hover:text-red-500 transition-colors p-1"
                          >
                            <span className="material-symbols-outlined text-sm">delete</span>
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {generating && (
              <div className="flex flex-col items-center justify-center p-12 min-h-[400px] gap-3">
                <span className="size-10 border-2 border-[#695be6]/30 border-t-[#695be6] rounded-full animate-spin" />
                <p className="text-sm text-gray-400">Generating questions...</p>
              </div>
            )}

            {!generating && displayQuestions.length === 0 && (
              <div className="flex flex-col items-center justify-center p-12 text-center min-h-[400px]">
                <div className="size-20 bg-[#695be6]/10 rounded-2xl flex items-center justify-center mb-4">
                  <span className="material-symbols-outlined text-[#695be6] text-5xl">quiz</span>
                </div>
                <h3 className="font-black text-xl mb-2">Your questions will appear here</h3>
                <p className="text-sm text-gray-400">Configure the settings and click Generate to create high-quality quiz questions with answer keys.</p>
              </div>
            )}

            {!generating && displayQuestions.length > 0 && (
              <div className="p-5 space-y-4 overflow-y-auto max-h-[700px]">
                {/* Summary bar */}
                <div className="flex items-center gap-3 bg-[#695be6]/5 rounded-xl p-3 text-xs">
                  <span className="font-bold text-[#695be6]">{displayQuestions.length} Questions</span>
                  <span className="text-gray-400">·</span>
                  <span className="text-gray-600">{displayQuestions.reduce((s,q)=>s+(q.max_points||q.marks||1),0)} Total Marks</span>
                  <span className="text-gray-400">·</span>
                  <span className="text-gray-600">{[...new Set(displayQuestions.map(q=>q.answer_type||q.type))].join(", ")}</span>
                  {editedQuestions && (
                    <span className="ml-auto text-amber-600 font-bold flex items-center gap-1">
                      <span className="material-symbols-outlined text-sm">edit</span> Edited
                    </span>
                  )}
                </div>

                {displayQuestions.map((q, i) => {
                  const qType = (q.answer_type || q.type || "mcq").toLowerCase();
                  return (
                    <div key={q.id || i} className="border border-gray-200 rounded-xl overflow-hidden">
                      <div className="flex items-center gap-3 bg-gray-50 px-4 py-2.5 border-b border-gray-200">
                        <span className="size-6 rounded-full bg-[#695be6] text-white text-xs font-bold flex items-center justify-center flex-shrink-0">{i+1}</span>
                        <span className="text-[10px] font-bold bg-[#695be6]/10 text-[#695be6] px-2 py-0.5 rounded-full">{qType.toUpperCase()}</span>
                        {q.blooms_level && <span className="text-[10px] text-gray-400">Bloom's: {q.blooms_level}</span>}
                        {q.difficulty && <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ml-auto ${q.difficulty==="Easy"?"bg-green-100 text-green-700":q.difficulty==="Hard"?"bg-red-100 text-red-700":"bg-amber-100 text-amber-700"}`}>{q.difficulty}</span>}
                        <input
                          type="number" min={1} max={20}
                          value={q.max_points || q.marks || 1}
                          onChange={(e) => updateQuestion(i, q.max_points !== undefined ? "max_points" : "marks", +e.target.value)}
                          className="w-14 text-xs font-bold text-[#695be6] border border-[#695be6]/30 rounded px-1.5 py-0.5 text-center ml-auto outline-none focus:border-[#695be6]"
                          title="Edit marks"
                        />
                        <span className="text-[10px] text-gray-400">pt</span>
                      </div>
                      <div className="p-4">
                        {/* Editable question text */}
                        <textarea
                          value={q.question_text || q.text || ""}
                          onChange={(e) => updateQuestion(i, q.question_text !== undefined ? "question_text" : "text", e.target.value)}
                          rows={2}
                          className="w-full text-sm font-semibold text-gray-800 mb-3 border border-transparent hover:border-gray-200 focus:border-[#695be6] rounded-lg px-2 py-1 outline-none resize-none transition-colors"
                        />
                        {/* MCQ options */}
                        {(q.options||[]).length > 0 && (
                          <div className="grid grid-cols-1 gap-1.5 mb-3">
                            {q.options.map((opt, j) => (
                              <div key={j} className={`text-xs px-3 py-2 rounded-lg border flex items-center gap-2 ${opt.is_correct?"border-green-300 bg-green-50":"border-gray-100"}`}>
                                <button
                                  onClick={() => updateOption(i, j, "is_correct", true)}
                                  className={`size-4 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-colors ${opt.is_correct?"border-green-500 bg-green-500":"border-gray-300 hover:border-green-400"}`}
                                  title="Mark as correct"
                                >
                                  {opt.is_correct && <span className="material-symbols-outlined text-white text-[10px]">check</span>}
                                </button>
                                <input
                                  value={opt.text || ""}
                                  onChange={(e) => updateOption(i, j, "text", e.target.value)}
                                  className={`flex-1 bg-transparent outline-none border-b border-transparent hover:border-gray-300 focus:border-[#695be6] transition-colors ${opt.is_correct?"text-green-800 font-bold":"text-gray-600"}`}
                                />
                              </div>
                            ))}
                          </div>
                        )}
                        {/* Short/Long answer rubric */}
                        {Array.isArray(q.marking_rubric) && q.marking_rubric.length > 0 && (
                          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-2">
                            <p className="text-xs font-bold text-blue-800 mb-2">Marking Rubric</p>
                            {q.marking_rubric.map((r, ri) => (
                              <div key={ri} className="flex items-start gap-2 text-xs mb-1">
                                <span className="text-blue-600 font-bold flex-shrink-0">{r.marks}m</span>
                                <span className="text-gray-700">{r.criterion}: {r.descriptor}</span>
                              </div>
                            ))}
                          </div>
                        )}
                        {q.sample_answer && (
                          <div className="bg-green-50 border border-green-200 rounded-lg p-3 mb-2">
                            <p className="text-xs font-bold text-green-800 mb-1">Model Answer</p>
                            <textarea
                              value={q.sample_answer}
                              onChange={(e) => updateQuestion(i, "sample_answer", e.target.value)}
                              rows={2}
                              className="w-full text-xs text-gray-700 bg-transparent outline-none border-b border-transparent hover:border-gray-300 focus:border-[#695be6] resize-none transition-colors"
                            />
                          </div>
                        )}
                        {q.explanation && (
                          <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 mb-2">
                            <p className="text-xs font-bold text-amber-800 mb-1">Explanation</p>
                            <textarea
                              value={q.explanation}
                              onChange={(e) => updateQuestion(i, "explanation", e.target.value)}
                              rows={2}
                              className="w-full text-xs text-gray-700 bg-transparent outline-none border-b border-transparent hover:border-gray-300 focus:border-[#695be6] resize-none transition-colors"
                            />
                          </div>
                        )}
                        {q.hint && <p className="text-xs text-amber-600 flex items-center gap-1 mt-1"><span className="material-symbols-outlined text-sm">lightbulb</span><MathText text={q.hint} /></p>}
                        {q.common_errors?.length > 0 && (
                          <div className="mt-2">
                            <p className="text-[10px] font-bold text-gray-400 uppercase">Common Errors</p>
                            {q.common_errors.map((e,ei)=><p key={ei} className="text-xs text-red-600 flex items-start gap-1 mt-0.5"><span className="text-red-400 flex-shrink-0">⚠</span><MathText text={e} /></p>)}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
