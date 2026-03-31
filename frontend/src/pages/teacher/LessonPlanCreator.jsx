import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { runAiTool, selectAiToolResult, selectAiToolStatus, clearAiToolResult } from "../../store/slices/teacherSlice";
import {
  lessonPlanDefaults,
  aiTips,
  methodOptions,
  resourceOptions,
} from "../../data/teacher/lessonPlanData";
import { subjectOptions, classOptions } from "../../data/teacher/quizGeneratorData";

export default function LessonPlanCreator() {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const aiResult  = useSelector(selectAiToolResult);
  const aiStatus  = useSelector(selectAiToolStatus);
  const [form, setForm] = useState(lessonPlanDefaults);
  const [newMethod, setNewMethod] = useState("");
  const [newResource, setNewResource] = useState("");
  const generating = aiStatus === "loading";

  useEffect(() => () => { dispatch(clearAiToolResult()); }, [dispatch]);

  const toggleObjective = (id) =>
    setForm((p) => ({
      ...p,
      objectives: p.objectives.map((o) => o.id === id ? { ...o, selected: !o.selected } : o),
    }));

  const toggleSection = (id) =>
    setForm((p) => ({
      ...p,
      lessonSections: p.lessonSections.map((s) => s.id === id ? { ...s, selected: !s.selected } : s),
    }));

  const removeMethod = (m) =>
    setForm((p) => ({ ...p, instructionalMethods: p.instructionalMethods.filter((x) => x !== m) }));

  const addMethod = (m) => {
    if (m && !form.instructionalMethods.includes(m)) {
      setForm((p) => ({ ...p, instructionalMethods: [...p.instructionalMethods, m] }));
    }
    setNewMethod("");
  };

  const removeResource = (r) =>
    setForm((p) => ({ ...p, resources: p.resources.filter((x) => x !== r) }));

  const addResource = (r) => {
    if (r && !form.resources.includes(r)) {
      setForm((p) => ({ ...p, resources: [...p.resources, r] }));
    }
    setNewResource("");
  };

  const handleGenerate = () => {
    dispatch(clearAiToolResult());
    dispatch(runAiTool({
      tool: "lessonplan",
      subject: form.subject,
      topic: form.topic,
      grade: form.classLevel,
      extra: {
        duration: form.durationMinutes,
        objectives: form.objectives.filter(o => o.selected).map(o => o.text),
        methods: form.instructionalMethods,
        resources: form.resources,
        sections: form.lessonSections.filter(s => s.selected).map(s => s.label),
        specific_needs: form.specificNeeds,
      },
    }));
  };

  return (
    <div className="bg-[#fdf8ff] min-h-screen" style={{ fontFamily: "'Lexend', sans-serif" }}>

      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-white border-b border-gray-200">
        <div className="max-w-[1200px] mx-auto px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button onClick={() => navigate("/teacher/ai-assistant")} className="p-2 hover:bg-gray-100 rounded-lg">
              <span className="material-symbols-outlined text-gray-500">arrow_back</span>
            </button>
            <div className="text-xs text-gray-400">
              <span className="hover:underline cursor-pointer" onClick={() => navigate("/teacher/ai-assistant")}>AI Assistant</span>
              <span className="mx-1">›</span>
              <span className="font-semibold text-gray-700">Lesson Plan Creator</span>
            </div>
          </div>
          <h1 className="font-black text-base absolute left-1/2 -translate-x-1/2">Lesson Plan Creator</h1>
          <div className="flex items-center gap-3">
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

      <div className="max-w-[1200px] mx-auto pt-20 px-6 pb-12 flex gap-6">

        {/* Main Form */}
        <div className="flex-1 space-y-5">

          {/* Lesson Basics */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
            <h2 className="flex items-center gap-2 font-black text-base mb-4">
              <span className="size-6 bg-blue-100 rounded-full flex items-center justify-center">
                <span className="material-symbols-outlined text-blue-600 text-sm">edit_note</span>
              </span>
              Lesson Basics
            </h2>
            <div className="grid grid-cols-2 gap-4 mb-3">
              <div>
                <label className="text-xs font-bold text-gray-500 mb-1 block">Subject</label>
                <input
                  value={form.subject}
                  onChange={(e) => setForm({ ...form, subject: e.target.value })}
                  className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-[#695be6]"
                />
              </div>
              <div>
                <label className="text-xs font-bold text-gray-500 mb-1 block">Topic</label>
                <input
                  value={form.topic}
                  onChange={(e) => setForm({ ...form, topic: e.target.value })}
                  className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-[#695be6]"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-bold text-gray-500 mb-1 block">Class</label>
                <input
                  value={form.classLevel}
                  onChange={(e) => setForm({ ...form, classLevel: e.target.value })}
                  className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-[#695be6]"
                />
              </div>
              <div>
                <label className="text-xs font-bold text-gray-500 mb-1 block">Duration</label>
                <div className="relative">
                  <input
                    value={`${form.durationMinutes} minutes`}
                    onChange={(e) => setForm({ ...form, durationMinutes: parseInt(e.target.value) || form.durationMinutes })}
                    className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-[#695be6] pr-10"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 material-symbols-outlined text-gray-400 text-base">schedule</span>
                </div>
              </div>
            </div>
          </div>

          {/* Learning Objectives */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="flex items-center gap-2 font-black text-base">
                <span className="size-6 bg-orange-100 rounded-full flex items-center justify-center">
                  <span className="material-symbols-outlined text-orange-600 text-sm">target</span>
                </span>
                Learning Objectives
              </h2>
              <button className="text-xs text-[#695be6] font-semibold hover:underline">+ Add Custom Objective</button>
            </div>
            <div className="space-y-2">
              {form.objectives.map((obj) => (
                <div
                  key={obj.id}
                  onClick={() => toggleObjective(obj.id)}
                  className={`flex items-center gap-3 p-3 rounded-xl border-2 cursor-pointer transition-all ${
                    obj.selected ? "border-[#695be6] bg-[#695be6]/5" : "border-gray-100 hover:border-gray-200"
                  }`}
                >
                  <div className={`size-5 rounded border-2 flex items-center justify-center flex-shrink-0 ${
                    obj.selected ? "bg-[#695be6] border-[#695be6]" : "border-gray-300"
                  }`}>
                    {obj.selected && <span className="material-symbols-outlined text-white text-xs">check</span>}
                  </div>
                  <p className="text-sm">{obj.text}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Teaching Approach */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
            <h2 className="flex items-center gap-2 font-black text-base mb-4">
              <span className="size-6 bg-green-100 rounded-full flex items-center justify-center">
                <span className="material-symbols-outlined text-green-600 text-sm">school</span>
              </span>
              Teaching Approach
            </h2>

            <div className="mb-4">
              <label className="text-xs font-bold text-gray-500 mb-2 block">Instructional Methods</label>
              <div className="flex flex-wrap gap-2">
                {form.instructionalMethods.map((m) => (
                  <span key={m} className="flex items-center gap-1 bg-[#695be6] text-white text-xs font-bold px-3 py-1.5 rounded-full">
                    {m}
                    <button onClick={() => removeMethod(m)}>
                      <span className="material-symbols-outlined text-xs">close</span>
                    </button>
                  </span>
                ))}
                <button
                  onClick={() => addMethod(newMethod || methodOptions.find((m) => !form.instructionalMethods.includes(m)))}
                  className="flex items-center gap-1 border border-dashed border-gray-300 text-gray-400 text-xs font-bold px-3 py-1.5 rounded-full hover:border-[#695be6] hover:text-[#695be6] transition-colors"
                >
                  <span className="material-symbols-outlined text-xs">add</span> Add method
                </button>
              </div>
            </div>

            <div>
              <label className="text-xs font-bold text-gray-500 mb-2 block">Resource List</label>
              <div className="flex flex-wrap gap-2">
                {form.resources.map((r) => (
                  <span key={r} className="flex items-center gap-1 bg-gray-100 text-gray-700 text-xs font-bold px-3 py-1.5 rounded-full">
                    {r}
                    <button onClick={() => removeResource(r)}>
                      <span className="material-symbols-outlined text-xs">close</span>
                    </button>
                  </span>
                ))}
                <button
                  onClick={() => addResource(resourceOptions.find((r) => !form.resources.includes(r)))}
                  className="flex items-center gap-1 border border-dashed border-gray-300 text-gray-400 text-xs font-bold px-3 py-1.5 rounded-full hover:border-[#695be6] hover:text-[#695be6] transition-colors"
                >
                  <span className="material-symbols-outlined text-xs">add</span> Add resource
                </button>
              </div>
            </div>
          </div>

          {/* Specific Class Needs */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
            <h2 className="font-black text-sm mb-3">Specific Class Needs</h2>
            <textarea
              value={form.specificNeeds}
              onChange={(e) => setForm({ ...form, specificNeeds: e.target.value })}
              className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm outline-none focus:border-[#695be6] resize-none h-20"
            />
          </div>

          {/* Lesson Sections */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
            <h2 className="flex items-center gap-2 font-black text-base mb-4">
              <span className="size-6 bg-purple-100 rounded-full flex items-center justify-center">
                <span className="material-symbols-outlined text-purple-600 text-sm">view_list</span>
              </span>
              Lesson Sections
            </h2>
            <div className="grid grid-cols-3 gap-3">
              {form.lessonSections.map((s) => (
                <label key={s.id} className="flex items-center gap-2 cursor-pointer">
                  <div
                    onClick={() => toggleSection(s.id)}
                    className={`size-5 rounded border-2 flex items-center justify-center cursor-pointer ${
                      s.selected ? "bg-[#695be6] border-[#695be6]" : "border-gray-300"
                    }`}
                  >
                    {s.selected && <span className="material-symbols-outlined text-white text-xs">check</span>}
                  </div>
                  <span className="text-sm font-semibold">{s.label}</span>
                </label>
              ))}
            </div>
          </div>
        </div>

        {/* Right Sidebar */}
        <div className="w-64 flex-shrink-0 space-y-4">

          {/* AI Tips */}
          <div className="bg-[#695be6]/5 border border-[#695be6]/20 rounded-2xl p-4">
            <div className="flex items-center gap-2 mb-3">
              <span className="material-symbols-outlined text-[#695be6] text-lg">lightbulb</span>
              <p className="font-black text-sm text-[#695be6]">AI Assistant Tips</p>
            </div>
            {aiTips.map((tip, i) => (
              <div key={i}>
                <p className="text-xs font-bold text-gray-700 mb-2">{tip.title}</p>
                <ul className="space-y-2">
                  {tip.tips.map((t, j) => (
                    <li key={j} className="flex items-start gap-1.5 text-xs text-gray-600">
                      <span className="size-1.5 rounded-full bg-[#695be6] mt-1.5 flex-shrink-0"></span>
                      {t}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
            <button className="w-full mt-3 flex items-center justify-center gap-1.5 bg-[#695be6] text-white text-xs font-bold py-2 rounded-xl hover:bg-[#5a4dd4] transition-colors">
              <span className="material-symbols-outlined text-sm">auto_awesome</span> Refresh Tips
            </button>
          </div>

          {/* Next Step */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
            <p className="text-xs font-black text-gray-400 uppercase tracking-wide mb-2">Next Step</p>
            <p className="text-xs text-gray-600">Once you generate, you can still edit specific timings for each section.</p>
          </div>

          {/* Generate */}
          <div>
            <div className="flex items-center justify-end mb-2">
              <p className="text-xs text-gray-400">AI is ready to draft based on your inputs.</p>
            </div>
            <button
              onClick={handleGenerate}
              disabled={generating}
              className="w-full flex items-center justify-center gap-2 bg-[#695be6] text-white font-black py-3.5 rounded-xl hover:bg-[#5a4dd4] transition-colors shadow-lg shadow-[#695be6]/30 disabled:opacity-70"
            >
              <span className="material-symbols-outlined text-base">auto_awesome</span>
              {generating ? "Generating..." : "Generate Lesson Plan ✨"}
            </button>
          </div>
        </div>
      </div>

      {/* ── AI Result Panel ── */}
      {(generating || aiResult) && (
        <div className="max-w-[1200px] mx-auto px-6 pb-12">
          {generating && (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-8 flex flex-col items-center gap-3">
              <span className="size-8 border-2 border-[#695be6]/30 border-t-[#695be6] rounded-full animate-spin" />
              <p className="text-sm text-gray-400">AI is drafting your lesson plan...</p>
            </div>
          )}
          {aiResult && !generating && (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-black text-base flex items-center gap-2">
                  <span className="material-symbols-outlined text-[#695be6]">auto_awesome</span>
                  Generated Lesson Plan
                </h3>
                <button onClick={() => navigator.clipboard?.writeText(JSON.stringify(aiResult, null, 2))}
                  className="text-xs text-[#695be6] font-bold hover:underline flex items-center gap-1">
                  <span className="material-symbols-outlined text-sm">content_copy</span> Copy
                </button>
              </div>
              {aiResult.objectives?.length > 0 && (
                <div>
                  <p className="text-xs font-black text-gray-400 uppercase tracking-wide mb-2">Objectives</p>
                  <ul className="space-y-1">
                    {aiResult.objectives.map((o, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm text-gray-700">
                        <span className="material-symbols-outlined text-[#695be6] text-sm mt-0.5">check_circle</span>{o}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {aiResult.activities?.length > 0 && (
                <div>
                  <p className="text-xs font-black text-gray-400 uppercase tracking-wide mb-2">Activities</p>
                  <ol className="space-y-2">
                    {aiResult.activities.map((a, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm text-gray-700">
                        <span className="size-5 rounded-full bg-[#695be6]/10 text-[#695be6] text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">{i+1}</span>
                        {typeof a === "string" ? a : JSON.stringify(a)}
                      </li>
                    ))}
                  </ol>
                </div>
              )}
              {aiResult.assessment && (
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-3">
                  <p className="text-xs font-black text-amber-700 mb-1">Assessment</p>
                  <p className="text-sm text-gray-700">{aiResult.assessment}</p>
                </div>
              )}
              {aiResult.duration_minutes && (
                <p className="text-xs text-gray-400">Duration: {aiResult.duration_minutes} minutes</p>
              )}
              {!aiResult.objectives && !aiResult.activities && aiResult.content && (
                <p className="text-sm text-gray-700 whitespace-pre-wrap">{aiResult.content}</p>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
