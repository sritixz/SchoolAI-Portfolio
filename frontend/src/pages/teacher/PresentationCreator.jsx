import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { useAuth } from "../../context/AuthContext";
import { runAiTool, selectAiToolResult, selectAiToolStatus, clearAiToolResult } from "../../store/slices/teacherSlice";
import {
  presentationVisualStyles,
  presentationPurposes,
  presentationDefaults,
} from "../../data/teacher/presentationCreatorData";
import { useAiToolWithHistory } from "../../hooks/useAiToolWithHistory";
import { downloadPresentationPdf } from "../../utils/aiPdfExport";

export default function PresentationCreator() {
  const navigate  = useNavigate();
  const dispatch  = useDispatch();
  const { user }  = useAuth();
  const aiResult  = useSelector(selectAiToolResult);
  const aiStatus  = useSelector(selectAiToolStatus);
  const [form, setForm] = useState(presentationDefaults);
  const generating = aiStatus === "loading";

  useEffect(() => () => { dispatch(clearAiToolResult()); }, [dispatch]);

  const { runTool } = useAiToolWithHistory();
  const handleGenerate = () => {
    dispatch(clearAiToolResult());
    runTool({
      tool: "presentation",
      subject: form.subject,
      topic: form.topic,
      grade: form.classLevel,
      extra: {
        num_slides: form.numSlides,
        duration_minutes: form.durationMinutes,
        purpose: form.purpose,
        visual_style: form.visualStyle,
      },
    }, { tool: "presentation", title: `Presentation: ${form.topic}`, subject: form.subject, topic: form.topic, grade: form.classLevel });
  };

  return (
    <div className="bg-[#fdf8ff] min-h-screen" style={{ fontFamily: "'Lexend', sans-serif" }}>

      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-white border-b border-gray-200">
        <div className="max-w-[1200px] mx-auto px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate("/teacher/ai-assistant")}
              className="flex items-center gap-1.5 border border-gray-200 text-sm font-semibold px-3 py-1.5 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <span className="material-symbols-outlined text-base">arrow_back</span> Choose Different Tool
            </button>
            <div className="text-xs text-gray-400">
              <span className="hover:underline cursor-pointer" onClick={() => navigate("/teacher/ai-assistant")}>AI Assistant</span>
              <span className="mx-1">›</span>
              <span className="font-semibold text-gray-700">Presentation Creator</span>
            </div>
          </div>
          <h1 className="font-black text-base absolute left-1/2 -translate-x-1/2">Presentation Creator</h1>
          <div className="flex items-center gap-3">
            <button className="flex items-center gap-1.5 border border-[#695be6] text-[#695be6] text-xs font-bold px-3 py-1.5 rounded-lg hover:bg-[#695be6]/5">
              <span className="material-symbols-outlined text-sm">bolt</span> Pro Plan
            </button>
            <div className="size-9 rounded-full bg-[#695be6] flex items-center justify-center text-white font-bold text-sm">{user?.name?.[0] || "T"}</div>
          </div>
        </div>
      </header>

      <div className="max-w-[1200px] mx-auto pt-20 flex min-h-screen">

        {/* Left: Config Panel */}
        <div className="w-[440px] flex-shrink-0 border-r border-gray-200 bg-white p-6 overflow-y-auto">

          {/* Presentation Basics */}
          <div className="mb-6">
            <h2 className="flex items-center gap-2 font-black text-base mb-4">
              <span className="size-6 bg-blue-100 rounded-full flex items-center justify-center">
                <span className="material-symbols-outlined text-blue-600 text-sm">info</span>
              </span>
              Presentation Basics
            </h2>
            <div className="mb-3">
              <label className="text-xs font-bold text-gray-500 mb-1 block">Topic</label>
              <input
                value={form.topic}
                onChange={(e) => setForm({ ...form, topic: e.target.value })}
                className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-[#695be6]"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-bold text-gray-500 mb-1 block">Subject</label>
                <input
                  value={form.subject}
                  onChange={(e) => setForm({ ...form, subject: e.target.value })}
                  className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-[#695be6]"
                />
              </div>
              <div>
                <label className="text-xs font-bold text-gray-500 mb-1 block">Class</label>
                <input
                  value={form.classLevel}
                  onChange={(e) => setForm({ ...form, classLevel: e.target.value })}
                  className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-[#695be6]"
                />
              </div>
            </div>
          </div>

          {/* Structure & Scope */}
          <div className="mb-6">
            <h2 className="flex items-center gap-2 font-black text-base mb-4">
              <span className="size-6 bg-purple-100 rounded-full flex items-center justify-center">
                <span className="material-symbols-outlined text-purple-600 text-sm">layers</span>
              </span>
              Structure & Scope
            </h2>
            <div className="mb-4">
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-bold text-gray-500">Number of Slides</label>
                <span className="text-xs font-bold text-[#695be6]">{form.numSlides} slides</span>
              </div>
              <input
                type="range" min={5} max={30} value={form.numSlides}
                onChange={(e) => setForm({ ...form, numSlides: +e.target.value })}
                className="w-full accent-[#695be6]"
              />
            </div>
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-bold text-gray-500">Presentation Duration</label>
                <span className="text-xs font-bold text-[#695be6]">{form.durationMinutes} min</span>
              </div>
              <input
                type="range" min={10} max={90} step={5} value={form.durationMinutes}
                onChange={(e) => setForm({ ...form, durationMinutes: +e.target.value })}
                className="w-full accent-[#695be6]"
              />
            </div>
          </div>

          {/* Presentation Purpose */}
          <div className="mb-6">
            <h2 className="flex items-center gap-2 font-black text-base mb-4">
              <span className="size-6 bg-orange-100 rounded-full flex items-center justify-center">
                <span className="material-symbols-outlined text-orange-600 text-sm">target</span>
              </span>
              Presentation Purpose
            </h2>
            <div className="flex flex-wrap gap-2">
              {presentationPurposes.map((p) => (
                <button
                  key={p.id}
                  onClick={() => setForm({ ...form, purpose: p.id })}
                  className={`flex items-center gap-2 px-4 py-2 rounded-xl border-2 text-sm font-semibold transition-all ${
                    form.purpose === p.id
                      ? "border-[#695be6] bg-[#695be6]/5 text-[#695be6]"
                      : "border-gray-200 hover:border-gray-300"
                  }`}
                >
                  <div className={`size-4 rounded-full border-2 flex items-center justify-center ${
                    form.purpose === p.id ? "border-[#695be6]" : "border-gray-300"
                  }`}>
                    {form.purpose === p.id && <div className="size-2 rounded-full bg-[#695be6]" />}
                  </div>
                  {p.label}
                </button>
              ))}
            </div>
          </div>

          {/* Visual Style */}
          <div className="mb-8">
            <h2 className="flex items-center gap-2 font-black text-base mb-4">
              <span className="size-6 bg-pink-100 rounded-full flex items-center justify-center">
                <span className="material-symbols-outlined text-pink-600 text-sm">palette</span>
              </span>
              Visual Style
            </h2>
            <div className="grid grid-cols-3 gap-3">
              {presentationVisualStyles.map((style) => (
                <button
                  key={style.id}
                  onClick={() => setForm({ ...form, visualStyle: style.id })}
                  className={`rounded-xl border-2 overflow-hidden transition-all ${
                    form.visualStyle === style.id ? "border-[#695be6]" : "border-gray-200 hover:border-gray-300"
                  }`}
                >
                  <div className={`h-16 ${style.preview.bg} flex items-center justify-center p-2`}>
                    {style.preview.dots ? (
                      <div className="flex gap-1">
                        {style.preview.dots.map((c, i) => (
                          <div key={i} className={`size-3 rounded-full ${c}`} />
                        ))}
                      </div>
                    ) : (
                      <div className="w-full space-y-1">
                        <div className={`h-1.5 rounded ${style.preview.accent} w-3/4`} />
                        {style.preview.lines?.map((c, i) => (
                          <div key={i} className={`h-1 rounded ${c} w-full`} />
                        ))}
                      </div>
                    )}
                  </div>
                  <p className="text-[10px] font-bold text-center py-1.5 text-gray-600">{style.label}</p>
                </button>
              ))}
            </div>
          </div>

          {/* Generate Button */}
          <button
            onClick={handleGenerate}
            disabled={generating}
            className="w-full bg-[#695be6] text-white font-black py-4 rounded-xl hover:bg-[#5a4dd4] transition-colors flex items-center justify-center gap-2 disabled:opacity-70"
          >
            {generating ? (
              <><span className="material-symbols-outlined animate-spin text-base">refresh</span> Generating...</>
            ) : (
              <><span className="material-symbols-outlined text-base">auto_awesome</span> Generate Presentation</>
            )}
          </button>
          <p className="text-center text-xs text-gray-400 mt-2">Estimated time: ~45 seconds</p>
        </div>

        {/* Right: Preview Panel */}
        <div className="flex-1 bg-[#fdf8ff] flex items-center justify-center p-12">
          {generating && (
            <div className="flex flex-col items-center gap-3">
              <span className="size-10 border-2 border-[#695be6]/30 border-t-[#695be6] rounded-full animate-spin" />
              <p className="text-sm text-gray-400">Building your presentation...</p>
            </div>
          )}
          {!generating && !aiResult && (
            <div className="bg-white rounded-2xl shadow-lg border border-gray-100 w-full max-w-lg p-10 flex flex-col items-center text-center">
              <div className="size-16 bg-[#695be6] rounded-2xl flex items-center justify-center mb-4">
                <span className="material-symbols-outlined text-white text-3xl">upload</span>
              </div>
              <h2 className="font-black text-xl mb-2">Ready to build your lesson?</h2>
              <p className="text-sm text-gray-400 mb-6">
                Your presentation structure and slide previews will appear here after generation. Choose your settings and click generate to start.
              </p>
              <div className="flex gap-2 w-full justify-center">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="flex-1 h-16 bg-gray-100 rounded-lg" />
                ))}
              </div>
              <p className="text-xs text-gray-400 mt-3">SLIDE 0 OF 0</p>
            </div>
          )}
          {!generating && aiResult && (
            <div className="bg-white rounded-2xl shadow-lg border border-gray-100 w-full max-w-2xl overflow-y-auto max-h-[85vh]">
              <div className="p-4 border-b border-gray-100 flex items-center justify-between bg-gradient-to-r from-[#695be6] to-[#8b5cf6] rounded-t-2xl">
                <div>
                  <h2 className="font-black text-base text-white">{aiResult.title || form.topic}</h2>
                  <p className="text-xs text-white/70">{aiResult.total_slides || (aiResult.slides||[]).length} slides · {aiResult.duration_minutes} min · {aiResult.grade}</p>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => navigator.clipboard?.writeText(JSON.stringify(aiResult, null, 2))}
                    className="flex items-center gap-1 bg-white/20 hover:bg-white/30 text-white text-xs font-bold px-3 py-1.5 rounded-lg">
                    <span className="material-symbols-outlined text-sm">content_copy</span> Copy
                  </button>
                  <button onClick={() => downloadPresentationPdf(aiResult)}
                    className="flex items-center gap-1 bg-white/20 hover:bg-white/30 text-white text-xs font-bold px-3 py-1.5 rounded-lg">
                    <span className="material-symbols-outlined text-sm">download</span> Download PDF
                  </button>
                </div>
              </div>

              {/* Learning Objectives */}
              {aiResult.learning_objectives?.length > 0 && (
                <div className="px-5 pt-4 pb-2">
                  <p className="text-xs font-black text-gray-400 uppercase tracking-wide mb-2">Learning Objectives</p>
                  <div className="space-y-1">
                    {aiResult.learning_objectives.map((o,i)=>(
                      <p key={i} className="text-xs text-gray-700 flex items-start gap-2">
                        <span className="material-symbols-outlined text-[#695be6] text-sm mt-0.5">check_circle</span>{o}
                      </p>
                    ))}
                  </div>
                </div>
              )}

              <div className="p-5 space-y-3">
                {(aiResult.slides || []).map((slide, i) => (
                  <div key={i} className="border border-gray-200 rounded-xl overflow-hidden">
                    <div className="flex items-center gap-2 bg-gray-50 px-3 py-2 border-b border-gray-200">
                      <span className="size-6 rounded-full bg-[#695be6] text-white text-xs font-bold flex items-center justify-center flex-shrink-0">{slide.number || i+1}</span>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        slide.type==="title"?"bg-purple-100 text-purple-700":
                        slide.type==="hook"?"bg-orange-100 text-orange-700":
                        slide.type==="activity"?"bg-green-100 text-green-700":
                        slide.type==="assessment"?"bg-red-100 text-red-700":
                        "bg-blue-100 text-blue-700"
                      }`}>{(slide.type||"content").toUpperCase()}</span>
                      <p className="font-bold text-sm flex-1">{slide.title}</p>
                      {slide.duration_minutes && <span className="text-[10px] text-gray-400">{slide.duration_minutes}m</span>}
                    </div>
                    <div className="p-3 space-y-2">
                      {slide.subtitle && <p className="text-xs text-gray-500 italic">{slide.subtitle}</p>}
                      {slide.content && <p className="text-xs text-gray-700">{slide.content}</p>}
                      {slide.bullets?.length > 0 && (
                        <ul className="space-y-1">
                          {slide.bullets.map((b, j) => (
                            <li key={j} className="text-xs text-gray-700 flex items-start gap-1.5">
                              <span className="size-1.5 rounded-full bg-[#695be6]/50 mt-1.5 shrink-0" />{b}
                            </li>
                          ))}
                        </ul>
                      )}
                      {slide.steps?.length > 0 && (
                        <ol className="space-y-1">
                          {slide.steps.map((s,j)=>(
                            <li key={j} className="text-xs text-gray-700 flex items-start gap-2">
                              <span className="font-bold text-[#695be6] flex-shrink-0">{j+1}.</span>{s}
                            </li>
                          ))}
                        </ol>
                      )}
                      {slide.speaker_notes && (
                        <div className="bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                          <p className="text-[10px] font-bold text-amber-700 mb-1">Speaker Notes</p>
                          <p className="text-xs text-gray-700">{slide.speaker_notes}</p>
                        </div>
                      )}
                      {slide.engagement_prompt && (
                        <div className="bg-green-50 border border-green-200 rounded-lg px-3 py-2">
                          <p className="text-[10px] font-bold text-green-700 mb-1">Engagement Prompt</p>
                          <p className="text-xs text-gray-700">{slide.engagement_prompt}</p>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
                {!aiResult.slides && aiResult.content && (
                  <p className="text-sm text-gray-700 whitespace-pre-wrap p-2">{aiResult.content}</p>
                )}
                {aiResult.teacher_preparation_notes && (
                  <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
                    <p className="text-xs font-bold text-blue-800 mb-1">Teacher Preparation Notes</p>
                    <p className="text-xs text-gray-700">{aiResult.teacher_preparation_notes}</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
