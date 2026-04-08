import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { useAuth } from "../../context/AuthContext";
import { selectGeneratedQuestions, selectGenerateStatus, clearGeneratedQuestions } from "../../store/slices/teacherSlice";
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

export default function QuizGenerator() {
  const navigate  = useNavigate();
  const dispatch  = useDispatch();
  const { user }  = useAuth();
  const questions = useSelector(selectGeneratedQuestions);
  const genStatus = useSelector(selectGenerateStatus);
  const [form, setForm] = useState(quizGeneratorDefaults);
  const generating = genStatus === "loading";

  useEffect(() => () => { dispatch(clearGeneratedQuestions()); }, [dispatch]);

  const toggleQType = (id) =>
    setForm((p) => ({ ...p, questionTypes: { ...p.questionTypes, [id]: !p.questionTypes[id] } }));

  const { runQuiz } = useAiToolWithHistory();
  const handleGenerate = () => {
    const types = Object.entries(form.questionTypes).filter(([,v]) => v).map(([k]) =>
      k === "shortAnswer" ? "typed" : k === "numerical" ? "typed" : k === "caseBased" ? "typed" : k
    );
    runQuiz({
      subject: form.subject,
      topic: form.topic,
      grade: form.classLevel,
      count: 5,
      difficulty: "mixed",
      question_types: types.length ? types : ["mcq"],
      board: form.board,
      chapter: form.chapter,
      learning_objective: form.learningObjective,
      special_instructions: form.specialInstructions,
    }, { title: `Quiz — ${form.topic}` });
  };

  return (
    <div className="bg-[#faf9ff] min-h-screen" style={{ fontFamily: "'Lexend', sans-serif" }}>

      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-white border-b border-gray-200">
        <div className="max-w-[1200px] mx-auto px-6 h-14 flex items-center justify-between">
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
            <div className="size-9 rounded-full bg-[#695be6] flex items-center justify-center text-white font-bold text-sm">{user?.name?.[0] || "T"}</div>
          </div>
        </div>
      </header>

      <div className="max-w-[1200px] mx-auto pt-20 px-6 pb-12">
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
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-[#695be6] text-lg">visibility</span>
                <h3 className="font-black text-sm">Preview Area</h3>
              </div>
              <div className="flex gap-2">
                {questions.length > 0 && (
                  <>
                    <button onClick={() => navigator.clipboard?.writeText(JSON.stringify(questions, null, 2))}
                      className="flex items-center gap-1 border border-gray-200 text-xs font-bold px-3 py-1.5 rounded-lg hover:bg-gray-50">
                      <span className="material-symbols-outlined text-sm">content_copy</span> Copy
                    </button>
                    <button onClick={() => downloadQuizPdf(questions, { subject: form.subject, topic: form.topic, grade: form.classLevel })}
                      className="flex items-center gap-1 bg-[#695be6] text-white text-xs font-bold px-3 py-1.5 rounded-lg hover:bg-[#5a4dd4]">
                      <span className="material-symbols-outlined text-sm">download</span> Download PDF
                    </button>
                  </>
                )}
              </div>
            </div>

            {generating && (
              <div className="flex flex-col items-center justify-center p-12 min-h-[400px] gap-3">
                <span className="size-10 border-2 border-[#695be6]/30 border-t-[#695be6] rounded-full animate-spin" />
                <p className="text-sm text-gray-400">Generating questions...</p>
              </div>
            )}

            {!generating && questions.length === 0 && (
              <div className="flex flex-col items-center justify-center p-12 text-center min-h-[400px]">
                <div className="size-20 bg-[#695be6]/10 rounded-2xl flex items-center justify-center mb-4">
                  <span className="material-symbols-outlined text-[#695be6] text-5xl">quiz</span>
                </div>
                <h3 className="font-black text-xl mb-2">Your questions will appear here</h3>
                <p className="text-sm text-gray-400">Configure the settings and click Generate to create high-quality quiz questions with answer keys.</p>
              </div>
            )}

            {!generating && questions.length > 0 && (
              <div className="p-5 space-y-4 overflow-y-auto max-h-[700px]">
                {/* Summary bar */}
                <div className="flex items-center gap-3 bg-[#695be6]/5 rounded-xl p-3 text-xs">
                  <span className="font-bold text-[#695be6]">{questions.length} Questions</span>
                  <span className="text-gray-400">·</span>
                  <span className="text-gray-600">{questions.reduce((s,q)=>s+(q.max_points||q.marks||1),0)} Total Marks</span>
                  <span className="text-gray-400">·</span>
                  <span className="text-gray-600">{[...new Set(questions.map(q=>q.answer_type||q.type))].join(", ")}</span>
                </div>

                {questions.map((q, i) => {
                  const qType = (q.answer_type || q.type || "mcq").toLowerCase();
                  const isCorrect = (opt) => opt.is_correct;
                  return (
                    <div key={q.id || i} className="border border-gray-200 rounded-xl overflow-hidden">
                      <div className="flex items-center gap-3 bg-gray-50 px-4 py-2.5 border-b border-gray-200">
                        <span className="size-6 rounded-full bg-[#695be6] text-white text-xs font-bold flex items-center justify-center flex-shrink-0">{i+1}</span>
                        <span className="text-[10px] font-bold bg-[#695be6]/10 text-[#695be6] px-2 py-0.5 rounded-full">{qType.toUpperCase()}</span>
                        {q.blooms_level && <span className="text-[10px] text-gray-400">Bloom's: {q.blooms_level}</span>}
                        {q.difficulty && <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ml-auto ${q.difficulty==="Easy"?"bg-green-100 text-green-700":q.difficulty==="Hard"?"bg-red-100 text-red-700":"bg-amber-100 text-amber-700"}`}>{q.difficulty}</span>}
                        <span className="text-[10px] font-bold text-[#695be6] ml-auto">{q.max_points||q.marks||1} pt</span>
                      </div>
                      <div className="p-4">
                        <p className="text-sm font-semibold text-gray-800 mb-3">{q.question_text||q.text}</p>
                        {/* MCQ options */}
                        {(q.options||[]).length > 0 && (
                          <div className="grid grid-cols-1 gap-1.5 mb-3">
                            {q.options.map((opt, j) => (
                              <div key={j} className={`text-xs px-3 py-2 rounded-lg border flex items-center gap-2 ${isCorrect(opt)?"border-green-300 bg-green-50 text-green-800 font-bold":"border-gray-100 text-gray-600"}`}>
                                <span className={`size-4 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${isCorrect(opt)?"border-green-500 bg-green-500":"border-gray-300"}`}>
                                  {isCorrect(opt) && <span className="material-symbols-outlined text-white text-[10px]">check</span>}
                                </span>
                                <span>{opt.label && `${opt.label}. `}{opt.text}</span>
                              </div>
                            ))}
                          </div>
                        )}
                        {/* Short/Long answer rubric */}
                        {q.marking_rubric?.length > 0 && (
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
                            <p className="text-xs text-gray-700">{q.sample_answer}</p>
                          </div>
                        )}
                        {q.explanation && (
                          <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 mb-2">
                            <p className="text-xs font-bold text-amber-800 mb-1">Explanation</p>
                            <p className="text-xs text-gray-700">{q.explanation}</p>
                          </div>
                        )}
                        {q.hint && <p className="text-xs text-amber-600 flex items-center gap-1 mt-1"><span className="material-symbols-outlined text-sm">lightbulb</span>{q.hint}</p>}
                        {q.common_errors?.length > 0 && (
                          <div className="mt-2">
                            <p className="text-[10px] font-bold text-gray-400 uppercase">Common Errors</p>
                            {q.common_errors.map((e,ei)=><p key={ei} className="text-xs text-red-600 flex items-start gap-1 mt-0.5"><span className="text-red-400 flex-shrink-0">⚠</span>{e}</p>)}
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
