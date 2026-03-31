import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { runAiTool, selectAiToolResult, selectAiToolStatus, clearAiToolResult } from "../../store/slices/teacherSlice";
import {
  assistanceTypes,
  feedbackTones,
  gradingDefaults,
  sampleEvaluationResult,
} from "../../data/teacher/gradingAssistantData";

export default function GradingAssistant() {
  const navigate  = useNavigate();
  const dispatch  = useDispatch();
  const aiResult  = useSelector(selectAiToolResult);
  const aiStatus  = useSelector(selectAiToolStatus);
  const [form, setForm] = useState(gradingDefaults);
  const [feedbackText, setFeedbackText] = useState("");
  const generating = aiStatus === "loading";
  const evaluated  = !!aiResult && !generating;

  useEffect(() => () => { dispatch(clearAiToolResult()); }, [dispatch]);

  // Map API result to display shape
  const result = aiResult || sampleEvaluationResult;
  const scorePercent = evaluated ? ((result.score / result.maxScore) * 100) : 0;

  const handleGenerate = () => {
    dispatch(clearAiToolResult());
    setFeedbackText("");
    dispatch(runAiTool({
      tool: "grading",
      subject: "General",
      topic: form.question,
      grade: "General",
      extra: {
        question: form.question,
        student_response: form.studentResponse,
        total_marks: form.totalMarks,
        feedback_tone: form.feedbackTone,
        assistance_type: form.assistanceType,
      },
    }));
  };

  // Sync feedback text when result arrives
  if (aiResult && !feedbackText && aiResult.feedback) {
    setFeedbackText(aiResult.feedback);
  }

  return (
    <div className="bg-[#fff5f8] min-h-screen" style={{ fontFamily: "'Lexend', sans-serif" }}>

      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-white border-b border-gray-200">
        <div className="max-w-[1200px] mx-auto px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="size-8 bg-[#695be6]/10 rounded-lg flex items-center justify-center">
              <span className="material-symbols-outlined text-[#695be6] text-lg">grading</span>
            </div>
            <h1 className="font-black text-base">Grading & Feedback Assistant</h1>
          </div>
          <div className="flex items-center gap-4 text-sm font-semibold text-gray-500">
            <button onClick={() => navigate("/teacher/ai-assistant")} className="hover:text-gray-700">AI Assistant</button>
            <span className="text-gray-300">›</span>
            <span className="text-[#695be6] font-bold">Grading & Feedback</span>
            <div className="relative p-2 hover:bg-gray-100 rounded-lg cursor-pointer">
              <span className="material-symbols-outlined text-gray-600">notifications</span>
            </div>
            <button className="p-2 hover:bg-gray-100 rounded-lg">
              <span className="material-symbols-outlined text-gray-600">settings</span>
            </button>
            <div className="size-9 rounded-full bg-[#695be6] flex items-center justify-center text-white font-bold text-sm">P</div>
          </div>
        </div>
      </header>

      <div className="max-w-[1200px] mx-auto pt-20 px-6 pb-12">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate("/teacher/ai-assistant")}
              className="flex items-center gap-1.5 border border-gray-200 text-sm font-semibold px-3 py-1.5 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <span className="material-symbols-outlined text-base">arrow_back</span> Back
            </button>
            <h2 className="font-black text-xl">Grading Workspace</h2>
          </div>
          <button className="flex items-center gap-1.5 border border-gray-200 text-sm font-semibold px-4 py-2 rounded-xl hover:bg-gray-50 transition-colors">
            <span className="material-symbols-outlined text-base">history</span> View History
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

          {/* Left: Input Panel */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-4">

            {/* Assistance Type */}
            <div>
              <p className="text-[10px] font-black text-gray-400 uppercase tracking-wide mb-2">Assistance Type</p>
              <div className="space-y-2">
                {assistanceTypes.map((t) => (
                  <button
                    key={t.id}
                    onClick={() => setForm({ ...form, assistanceType: t.id })}
                    className={`w-full flex items-start gap-3 p-3 rounded-xl border-2 text-left transition-all ${
                      form.assistanceType === t.id ? "border-[#695be6] bg-[#695be6]/5" : "border-gray-100 hover:border-gray-200"
                    }`}
                  >
                    <div className={`size-4 rounded-full border-2 flex items-center justify-center flex-shrink-0 mt-0.5 ${
                      form.assistanceType === t.id ? "border-[#695be6]" : "border-gray-300"
                    }`}>
                      {form.assistanceType === t.id && <div className="size-2 rounded-full bg-[#695be6]" />}
                    </div>
                    <div>
                      <p className="font-bold text-sm">{t.label}</p>
                      <p className="text-xs text-gray-400">{t.desc}</p>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Task / Question */}
            <div>
              <p className="text-[10px] font-black text-gray-400 uppercase tracking-wide mb-2">Task / Question</p>
              <textarea
                value={form.question}
                onChange={(e) => setForm({ ...form, question: e.target.value })}
                className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm outline-none focus:border-[#695be6] resize-none h-20"
              />
            </div>

            {/* Student Response */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-wide">Student Response</p>
                <button className="flex items-center gap-1 text-xs text-[#695be6] font-semibold hover:underline">
                  <span className="material-symbols-outlined text-sm">upload</span> Upload Handwriting
                </button>
              </div>
              <textarea
                value={form.studentResponse}
                onChange={(e) => setForm({ ...form, studentResponse: e.target.value })}
                className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm outline-none focus:border-[#695be6] resize-none h-24"
              />
            </div>

            {/* Marks & Tone */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-wide mb-2">Total Marks</p>
                <input
                  type="number" min={1} max={100}
                  value={form.totalMarks}
                  onChange={(e) => setForm({ ...form, totalMarks: +e.target.value })}
                  className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-[#695be6]"
                />
              </div>
              <div>
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-wide mb-2">Feedback Tone</p>
                <select
                  value={form.feedbackTone}
                  onChange={(e) => setForm({ ...form, feedbackTone: e.target.value })}
                  className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-[#695be6] bg-white"
                >
                  {feedbackTones.map((t) => <option key={t.id} value={t.id}>{t.label}</option>)}
                </select>
              </div>
            </div>

            <button
              onClick={handleGenerate}
              disabled={generating}
              className="w-full bg-[#695be6] text-white font-black py-3.5 rounded-xl hover:bg-[#5a4dd4] transition-colors flex items-center justify-center gap-2 disabled:opacity-70"
            >
              <span className="material-symbols-outlined text-base">auto_awesome</span>
              {generating ? "Evaluating..." : "Generate Evaluation ✨"}
            </button>
          </div>

          {/* Right: Results Panel */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
            {generating && (
              <div className="flex flex-col items-center justify-center h-full py-16 gap-3">
                <span className="size-8 border-2 border-[#695be6]/30 border-t-[#695be6] rounded-full animate-spin" />
                <p className="text-sm text-gray-400">Evaluating response...</p>
              </div>
            )}
            {!generating && evaluated ? (
              <>
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h3 className="font-black text-lg">Evaluation Results</h3>
                    <p className="text-xs text-gray-400">Based on student's response accuracy and clarity.</p>
                  </div>
                  {/* Score Donut */}
                  <div className="flex flex-col items-center">
                    <div className="relative size-16">
                      <svg viewBox="0 0 36 36" className="size-16 -rotate-90">
                        <circle cx="18" cy="18" r="15.9" fill="none" stroke="#f3f4f6" strokeWidth="3" />
                        <circle
                          cx="18" cy="18" r="15.9" fill="none"
                          stroke="#695be6" strokeWidth="3"
                          strokeDasharray={`${scorePercent} ${100 - scorePercent}`}
                          strokeLinecap="round"
                        />
                      </svg>
                      <div className="absolute inset-0 flex flex-col items-center justify-center">
                        <span className="text-sm font-black leading-none">{result.score}</span>
                        <span className="text-[9px] text-gray-400">/ {result.maxScore}</span>
                      </div>
                    </div>
                    <p className="text-[10px] font-bold text-[#695be6] mt-1">AI SUGGESTED SCORE</p>
                  </div>
                </div>

                {/* Evaluation Summary */}
                {result.summary?.length > 0 && (
                  <div className="mb-4">
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-wide mb-2">Evaluation Summary</p>
                    <div className="border-l-4 border-[#695be6] pl-3 space-y-2">
                      {result.summary.map((item, i) => (
                        <div key={i} className="flex items-start gap-2">
                          <span className={`material-symbols-outlined text-sm flex-shrink-0 mt-0.5 ${
                            item.type === "pass" ? "text-green-500" : "text-orange-400"
                          }`}>
                            {item.type === "pass" ? "check_circle" : "info"}
                          </span>
                          <p className="text-xs text-gray-600">{item.text}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                {/* Suggestions from API */}
                {result.suggestions?.length > 0 && (
                  <div className="mb-4">
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-wide mb-2">Suggestions</p>
                    <ul className="space-y-1">
                      {result.suggestions.map((s, i) => (
                        <li key={i} className="flex items-start gap-2 text-xs text-gray-600">
                          <span className="material-symbols-outlined text-amber-500 text-sm mt-0.5">lightbulb</span>{s}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Feedback Draft */}
                <div className="mb-4">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-wide">Feedback Draft</p>
                    <span className="text-[10px] font-bold bg-blue-100 text-blue-600 px-2 py-0.5 rounded">EDITABLE</span>
                  </div>
                  <textarea
                    value={feedbackText || result.feedbackDraft || result.feedback || ""}
                    onChange={(e) => setFeedbackText(e.target.value)}
                    className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm outline-none focus:border-[#695be6] resize-none h-28"
                  />
                </div>

                <div className="space-y-2">
                  <div className="grid grid-cols-2 gap-2">
                    <button className="flex items-center justify-center gap-2 bg-[#695be6] text-white font-bold py-2.5 rounded-xl hover:bg-[#5a4dd4] transition-colors text-sm">
                      <span className="material-symbols-outlined text-base">send</span> Accept & Send Feedback
                    </button>
                    <button className="flex items-center justify-center gap-2 border border-gray-200 font-bold py-2.5 rounded-xl hover:bg-gray-50 transition-colors text-sm">
                      <span className="material-symbols-outlined text-base">edit</span> Edit Manually
                    </button>
                  </div>
                  <button
                    onClick={handleGenerate}
                    className="w-full flex items-center justify-center gap-2 border border-gray-200 font-bold py-2.5 rounded-xl hover:bg-gray-50 transition-colors text-sm"
                  >
                    <span className="material-symbols-outlined text-base">refresh</span> Regenerate
                  </button>
                </div>
              </>
            ) : !generating && (
              <div className="flex flex-col items-center justify-center h-full py-16 text-center text-gray-400">
                <span className="material-symbols-outlined text-5xl mb-3">grading</span>
                <p className="font-semibold">Fill in the details and click Generate Evaluation</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
