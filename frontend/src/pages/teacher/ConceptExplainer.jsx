import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { runAiTool, selectAiToolResult, selectAiToolStatus, clearAiToolResult } from "../../store/slices/teacherSlice";
import {
  conceptExplainerDefaults,
  targetAudienceOptions,
  explanationStyles,
  includeElementOptions,
} from "../../data/teacher/conceptExplainerData";

export default function ConceptExplainer() {
  const navigate  = useNavigate();
  const dispatch  = useDispatch();
  const aiResult  = useSelector(selectAiToolResult);
  const aiStatus  = useSelector(selectAiToolStatus);
  const [form, setForm] = useState(conceptExplainerDefaults);
  const generating = aiStatus === "loading";
  const generated  = !!aiResult && !generating;

  useEffect(() => () => { dispatch(clearAiToolResult()); }, [dispatch]);

  const toggleElement = (id) =>
    setForm((p) => ({
      ...p,
      includeElements: { ...p.includeElements, [id]: !p.includeElements[id] },
    }));

  const handleGenerate = () => {
    dispatch(clearAiToolResult());
    dispatch(runAiTool({
      tool: "concept",
      subject: "General",
      topic: form.concept,
      grade: form.targetAudience,
      extra: {
        style: form.explanationStyle,
        simplify: form.simplifyForStruggling,
        include: Object.entries(form.includeElements).filter(([,v]) => v).map(([k]) => k),
      },
    }));
  };

  return (
    <div className="bg-[#fdf8ff] min-h-screen" style={{ fontFamily: "'Lexend', sans-serif" }}>

      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-white border-b border-gray-200">
        <div className="max-w-[1200px] mx-auto px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="size-8 bg-[#695be6] rounded-lg flex items-center justify-center text-white">
              <span className="material-symbols-outlined text-lg">lightbulb</span>
            </div>
            <h1 className="font-black text-base">Concept Explainer</h1>
          </div>
          <div className="flex items-center gap-4 text-sm font-semibold text-gray-500">
            <button onClick={() => navigate("/teacher/ai-assistant")} className="hover:text-gray-700">AI Assistant</button>
            <span className="text-[#695be6] border-b-2 border-[#695be6] pb-0.5">Concept Explainer</span>
            <button className="hover:text-gray-700" onClick={() => navigate("/teacher/homework")}>Library</button>
            <div className="relative p-2 hover:bg-gray-100 rounded-lg cursor-pointer">
              <span className="material-symbols-outlined text-gray-600">notifications</span>
            </div>
            <div className="size-9 rounded-full bg-[#695be6] flex items-center justify-center text-white font-bold text-sm">P</div>
          </div>
        </div>
      </header>

      <div className="max-w-[1200px] mx-auto pt-20 px-6 pb-12">
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-xs text-gray-400 mb-2">
          <button onClick={() => navigate("/teacher/ai-assistant")} className="hover:underline">AI Assistant</button>
          <span>/</span>
          <span className="text-gray-700 font-semibold">Concept Explainer</span>
        </div>
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-black">Concept Explainer Workspace</h1>
            <p className="text-sm text-[#695be6]">Create clear, age-appropriate lessons in seconds</p>
          </div>
          <button
            onClick={() => navigate("/teacher/ai-assistant")}
            className="flex items-center gap-1.5 border border-gray-200 text-sm font-semibold px-4 py-2 rounded-xl hover:bg-gray-50 transition-colors"
          >
            <span className="material-symbols-outlined text-base">arrow_back</span> Back to Dashboard
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

          {/* Left: Config */}
          <div className="space-y-4">

            {/* Concept Input */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
              <label className="text-sm font-bold text-gray-700 mb-2 block">What concept do you need explained?</label>
              <div className="relative">
                <input
                  value={form.concept}
                  onChange={(e) => setForm({ ...form, concept: e.target.value })}
                  className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm outline-none focus:border-[#695be6]"
                  placeholder="e.g. Photosynthesis, Newton's Laws..."
                />
                <span className="absolute bottom-2 right-3 text-[10px] font-bold text-[#695be6] bg-[#695be6]/10 px-2 py-0.5 rounded">
                  AUTOCOMPLETE ACTIVE
                </span>
              </div>
            </div>

            {/* Target Audience */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
              <label className="text-sm font-bold text-gray-700 mb-2 block">Target Audience</label>
              <select
                value={form.targetAudience}
                onChange={(e) => setForm({ ...form, targetAudience: e.target.value })}
                className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-[#695be6] bg-white mb-3"
              >
                {targetAudienceOptions.map((o) => <option key={o}>{o}</option>)}
              </select>

              <label className="flex items-center justify-between cursor-pointer">
                <div>
                  <p className="text-sm font-bold">Simplify for struggling learners</p>
                  <p className="text-xs text-gray-400">Uses basic vocabulary and shorter sentences</p>
                </div>
                <div
                  onClick={() => setForm({ ...form, simplifyForStruggling: !form.simplifyForStruggling })}
                  className={`w-10 h-5 rounded-full relative transition-colors cursor-pointer ${form.simplifyForStruggling ? "bg-[#695be6]" : "bg-gray-200"}`}
                >
                  <div className={`size-4 bg-white rounded-full absolute top-0.5 shadow-sm transition-transform ${form.simplifyForStruggling ? "translate-x-5" : "translate-x-0.5"}`} />
                </div>
              </label>
            </div>

            {/* Explanation Style */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
              <label className="text-sm font-bold text-gray-700 mb-3 block">Explanation Style</label>
              <div className="grid grid-cols-2 gap-2">
                {explanationStyles.map((s) => (
                  <button
                    key={s.id}
                    onClick={() => setForm({ ...form, explanationStyle: s.label })}
                    className={`py-2.5 rounded-xl border-2 text-sm font-semibold transition-all ${
                      form.explanationStyle === s.label
                        ? "border-[#695be6] bg-[#695be6]/5 text-[#695be6]"
                        : "border-gray-200 text-gray-600 hover:border-gray-300"
                    }`}
                  >
                    {s.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Include Elements */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
              <label className="text-sm font-bold text-gray-700 mb-3 block">Include Elements</label>
              <div className="grid grid-cols-2 gap-2">
                {includeElementOptions.map((el) => (
                  <label key={el.id} className="flex items-center gap-2 cursor-pointer">
                    <div
                      onClick={() => toggleElement(el.id)}
                      className={`size-5 rounded border-2 flex items-center justify-center cursor-pointer ${
                        form.includeElements[el.id] ? "bg-[#695be6] border-[#695be6]" : "border-gray-300"
                      }`}
                    >
                      {form.includeElements[el.id] && (
                        <span className="material-symbols-outlined text-white text-xs">check</span>
                      )}
                    </div>
                    <span className="text-sm">{el.label}</span>
                  </label>
                ))}
              </div>
            </div>

            <button
              onClick={handleGenerate}
              disabled={generating}
              className="w-full bg-[#695be6] text-white font-black py-4 rounded-xl hover:bg-[#5a4dd4] transition-colors flex items-center justify-center gap-2 disabled:opacity-70"
            >
              <span className="material-symbols-outlined text-base">auto_awesome</span>
              {generating ? "Generating..." : "Generate Explanation ✨"}
            </button>
          </div>

          {/* Right: Preview */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden flex flex-col">
            {/* Browser chrome */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 bg-gray-50">
              <div className="flex items-center gap-1.5">
                <div className="size-3 rounded-full bg-red-400" />
                <div className="size-3 rounded-full bg-yellow-400" />
                <div className="size-3 rounded-full bg-green-400" />
              </div>
              <div className="flex items-center gap-3">
                <button className="flex items-center gap-1 text-xs text-gray-500 hover:text-gray-700">
                  <span className="material-symbols-outlined text-sm">content_copy</span> Copy
                </button>
                <button className="flex items-center gap-1 text-xs text-gray-500 hover:text-gray-700">
                  <span className="material-symbols-outlined text-sm">download</span> Save PDF
                </button>
              </div>
            </div>

            <div className="flex-1 flex flex-col items-center justify-center p-10 text-center">
              {generating && (
                <div className="flex flex-col items-center gap-3">
                  <span className="size-10 border-2 border-[#695be6]/30 border-t-[#695be6] rounded-full animate-spin" />
                  <p className="text-sm text-gray-400">Generating explanation...</p>
                </div>
              )}
              {!generating && !generated && (
                <>
                  <div className="size-20 bg-[#695be6]/10 rounded-2xl flex items-center justify-center mb-5">
                    <span className="material-symbols-outlined text-[#695be6] text-4xl">lightbulb</span>
                  </div>
                  <h3 className="font-black text-xl mb-2">Ready to explain?</h3>
                  <p className="text-sm text-gray-400 max-w-xs">
                    Your age-appropriate explanation for{" "}
                    <span className="text-[#695be6] font-bold">"{form.concept}"</span>{" "}
                    will appear here. Choose a style and elements on the left to get started.
                  </p>
                  <div className="w-full mt-6 space-y-2">
                    <div className="h-2 bg-gray-100 rounded w-3/4 mx-auto" />
                    <div className="h-2 bg-gray-100 rounded w-1/2 mx-auto" />
                  </div>
                </>
              )}
              {!generating && generated && aiResult && (
                <div className="text-left w-full space-y-3">
                  <h3 className="font-black text-lg text-[#695be6]">{form.concept}</h3>
                  {aiResult.explanation && (
                    <p className="text-sm text-gray-700 leading-relaxed">
                      <strong>For {form.targetAudience}:</strong> {aiResult.explanation}
                    </p>
                  )}
                  {aiResult.analogy && (
                    <div className="bg-blue-50 border border-blue-200 rounded-xl p-3">
                      <p className="text-xs font-bold text-blue-700 mb-1">Analogy</p>
                      <p className="text-xs text-gray-600">{aiResult.analogy}</p>
                    </div>
                  )}
                  {aiResult.key_points?.length > 0 && (
                    <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-3">
                      <p className="text-xs font-bold text-yellow-700 mb-2">Key Points</p>
                      <ul className="space-y-1">
                        {aiResult.key_points.map((pt, i) => (
                          <li key={i} className="text-xs text-gray-700 flex items-start gap-1.5">
                            <span className="size-1.5 rounded-full bg-yellow-500 mt-1.5 shrink-0" />{pt}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {!aiResult.explanation && aiResult.content && (
                    <p className="text-sm text-gray-700 whitespace-pre-wrap">{aiResult.content}</p>
                  )}
                </div>
              )}
            </div>

            <div className="px-4 py-2 border-t border-gray-100 bg-gray-50 flex items-center justify-between">
              <span className="text-[10px] font-bold text-gray-400 uppercase">Preview Mode</span>
              <span className="text-[10px] font-bold text-green-500">AI Ready</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
