import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { runAiTool, selectAiToolResult, selectAiToolStatus, clearAiToolResult } from "../../store/slices/teacherSlice";
import { worksheetDefaults, difficultyOptions, worksheetQuestionTypes } from "../../data/teacher/worksheetGeneratorData";
import { subjectOptions as subjectOpts, classOptions as classOpts } from "../../data/teacher/quizGeneratorData";

export default function WorksheetGenerator() {
  const navigate  = useNavigate();
  const dispatch  = useDispatch();
  const aiResult  = useSelector(selectAiToolResult);
  const aiStatus  = useSelector(selectAiToolStatus);
  const [form, setForm] = useState(worksheetDefaults);
  const generating = aiStatus === "loading";

  useEffect(() => () => { dispatch(clearAiToolResult()); }, [dispatch]);

  const toggleQType = (id) =>
    setForm((p) => ({ ...p, questionTypes: { ...p.questionTypes, [id]: !p.questionTypes[id] } }));

  const handleGenerate = () => {
    dispatch(clearAiToolResult());
    dispatch(runAiTool({
      tool: "worksheet",
      subject: form.subject,
      topic: form.topic,
      grade: form.classLevel,
      extra: {
        difficulty: form.difficulty,
        total_questions: form.totalQuestions,
        question_types: Object.entries(form.questionTypes).filter(([, v]) => v).map(([k]) => k),
        title: form.title,
      },
    }));
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
            <div className="size-9 rounded-full bg-[#695be6] flex items-center justify-center text-white font-bold text-sm">P</div>
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
            <div>
              <label className="text-xs font-bold text-gray-500 mb-1 block">Topic</label>
              <input value={form.topic} onChange={(e) => setForm({ ...form, topic: e.target.value })}
                className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-[#695be6]" />
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
            <div>
              <label className="text-xs font-bold text-gray-500 mb-1 block">Worksheet Title</label>
              <input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })}
                className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-[#695be6]" />
            </div>
          </div>

          <button onClick={handleGenerate} disabled={generating}
            className="w-full bg-[#695be6] text-white font-black py-4 rounded-xl hover:bg-[#5a4dd4] transition-colors flex items-center justify-center gap-2 disabled:opacity-70">
            <span className="material-symbols-outlined text-base">auto_awesome</span>
            {generating ? "Generating..." : "Generate Worksheet ✨"}
          </button>
        </div>

        {/* Right: Preview */}
        <div className="flex-1 bg-[#faf9ff] flex items-center justify-center p-12">
          {generating && (
            <div className="flex flex-col items-center gap-3">
              <span className="size-10 border-2 border-[#695be6]/30 border-t-[#695be6] rounded-full animate-spin" />
              <p className="text-sm text-gray-400">Generating worksheet...</p>
            </div>
          )}
          {!generating && !aiResult && (
            <div className="bg-white rounded-2xl shadow-lg border border-gray-100 w-full max-w-md p-10 flex flex-col items-center text-center">
              <div className="size-20 bg-[#695be6]/10 rounded-2xl flex items-center justify-center mb-6">
                <span className="material-symbols-outlined text-[#695be6] text-5xl">smart_toy</span>
              </div>
              <h2 className="font-black text-xl mb-2">Ready to Create?</h2>
              <p className="text-sm text-gray-400 mb-6">
                Fill in the details on the left and click{" "}
                <span className="text-[#695be6] font-bold">Generate</span> to start.
              </p>
              <div className="w-full space-y-2">
                <div className="h-2 bg-gray-100 rounded w-3/4 mx-auto" />
                <div className="h-2 bg-gray-100 rounded w-1/2 mx-auto" />
                <div className="h-16 bg-gray-50 border border-gray-100 rounded-xl mt-3" />
                <div className="h-16 bg-gray-50 border border-gray-100 rounded-xl" />
              </div>
            </div>
          )}
          {!generating && aiResult && (
            <div className="bg-white rounded-2xl shadow-lg border border-gray-100 w-full max-w-2xl p-8 overflow-y-auto max-h-[80vh]">
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-black text-lg">{aiResult.title || form.title}</h2>
                <button onClick={() => navigator.clipboard?.writeText(JSON.stringify(aiResult, null, 2))}
                  className="text-xs text-[#695be6] font-bold hover:underline flex items-center gap-1">
                  <span className="material-symbols-outlined text-sm">content_copy</span> Copy
                </button>
              </div>
              <div className="space-y-4">
                {(aiResult.questions || []).map((q, i) => (
                  <div key={i} className="border border-gray-100 rounded-xl p-4">
                    <div className="flex items-start gap-3">
                      <span className="size-6 rounded-full bg-[#695be6]/10 text-[#695be6] text-xs font-bold flex items-center justify-center shrink-0">{q.number || i + 1}</span>
                      <div className="flex-1">
                        <p className="text-sm font-medium text-gray-800">{q.text}</p>
                        <div className="flex items-center gap-3 mt-1">
                          <span className="text-[10px] font-bold text-gray-400">{q.type}</span>
                          <span className="text-[10px] font-bold text-[#695be6]">{q.marks} marks</span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
                {!aiResult.questions && aiResult.content && (
                  <p className="text-sm text-gray-700 whitespace-pre-wrap">{aiResult.content}</p>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
