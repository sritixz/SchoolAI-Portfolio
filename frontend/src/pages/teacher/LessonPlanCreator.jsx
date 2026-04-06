import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { useAuth } from "../../context/AuthContext";
import { selectAiToolResult, selectAiToolStatus, clearAiToolResult } from "../../store/slices/teacherSlice";
import {
  lessonPlanDefaults,
  aiTips,
  methodOptions,
  resourceOptions,
} from "../../data/teacher/lessonPlanData";
import { useAiToolWithHistory } from "../../hooks/useAiToolWithHistory";
import { downloadLessonPlanPdf } from "../../utils/aiPdfExport";

export default function LessonPlanCreator() {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { user } = useAuth();
  const aiResult  = useSelector(selectAiToolResult);
  const aiStatus  = useSelector(selectAiToolStatus);
  const [form, setForm] = useState(lessonPlanDefaults);
  const [newMethod, setNewMethod] = useState("");
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
  };

  const { runTool } = useAiToolWithHistory();
  const handleGenerate = () => {
    dispatch(clearAiToolResult());
    const selectedSections = form.lessonSections.filter(s => s.selected);
    runTool({
      tool: "lessonplan",
      subject: form.subject,
      topic: form.topic,
      grade: form.classLevel,
      extra: {
        durationMinutes: form.durationMinutes,
        standards: form.standards || "",
        objectives: form.objectives.filter(o => o.selected).map(o => o.text),
        instructionalMethods: form.instructionalMethods,
        resources: form.resources,
        lessonSections: selectedSections.map(s => ({ label: s.label, duration: s.duration })),
        specificNeeds: form.specificNeeds,
        differentiation: form.differentiation,
      },
    }, { tool: "lessonplan", title: `Lesson Plan: ${form.topic}`, subject: form.subject, topic: form.topic, grade: form.classLevel });
  };

  const handlePrint = () => {
    downloadLessonPlanPdf(aiResult, form);
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
            <div className="size-9 rounded-full bg-[#695be6] flex items-center justify-center text-white font-bold text-sm">{user?.name?.[0] || "T"}</div>
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
                  placeholder="e.g., Mathematics, Science, English"
                />
              </div>
              <div>
                <label className="text-xs font-bold text-gray-500 mb-1 block">Topic</label>
                <input
                  value={form.topic}
                  onChange={(e) => setForm({ ...form, topic: e.target.value })}
                  className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-[#695be6]"
                  placeholder="e.g., Quadratic Equations"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4 mb-3">
              <div>
                <label className="text-xs font-bold text-gray-500 mb-1 block">Grade/Class</label>
                <input
                  value={form.classLevel}
                  onChange={(e) => setForm({ ...form, classLevel: e.target.value })}
                  className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-[#695be6]"
                  placeholder="e.g., Grade 8A, Year 10"
                />
              </div>
              <div>
                <label className="text-xs font-bold text-gray-500 mb-1 block">Duration (minutes)</label>
                <div className="relative">
                  <input
                    type="number"
                    value={form.durationMinutes}
                    onChange={(e) => setForm({ ...form, durationMinutes: parseInt(e.target.value) || 45 })}
                    className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-[#695be6] pr-10"
                    placeholder="45"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 material-symbols-outlined text-gray-400 text-base">schedule</span>
                </div>
              </div>
            </div>
            <div>
              <label className="text-xs font-bold text-gray-500 mb-1 block">Standards/Curriculum Alignment (Optional)</label>
              <input
                value={form.standards || ""}
                onChange={(e) => setForm({ ...form, standards: e.target.value })}
                className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-[#695be6]"
                placeholder="e.g., CCSS.MATH.CONTENT.HSA.REI.B.4"
              />
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
              Lesson Structure & Timing
            </h2>
            <p className="text-xs text-gray-500 mb-3">Select sections to include and adjust timing (total: {form.lessonSections.filter(s => s.selected).reduce((sum, s) => sum + (s.duration || 0), 0)} min)</p>
            <div className="space-y-2">
              {form.lessonSections.map((s) => (
                <div key={s.id} className={`flex items-center justify-between p-3 rounded-xl border-2 transition-all ${
                  s.selected ? "border-[#695be6] bg-[#695be6]/5" : "border-gray-100"
                }`}>
                  <label className="flex items-center gap-2 cursor-pointer flex-1">
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
                  {s.selected && (
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        value={s.duration}
                        onChange={(e) => {
                          const newDuration = parseInt(e.target.value) || 5;
                          setForm((p) => ({
                            ...p,
                            lessonSections: p.lessonSections.map((sec) => 
                              sec.id === s.id ? { ...sec, duration: newDuration } : sec
                            ),
                          }));
                        }}
                        className="w-16 border border-gray-200 rounded-lg px-2 py-1 text-xs text-center outline-none focus:border-[#695be6]"
                        min="1"
                      />
                      <span className="text-xs text-gray-400">min</span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Differentiation */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
            <h2 className="flex items-center gap-2 font-black text-base mb-4">
              <span className="size-6 bg-teal-100 rounded-full flex items-center justify-center">
                <span className="material-symbols-outlined text-teal-600 text-sm">diversity_3</span>
              </span>
              Differentiation Strategies
            </h2>
            <div className="space-y-3">
              <div>
                <label className="text-xs font-bold text-gray-500 mb-1 block">Support (for struggling learners)</label>
                <textarea
                  value={form.differentiation?.support || ""}
                  onChange={(e) => setForm({ ...form, differentiation: { ...form.differentiation, support: e.target.value } })}
                  className="w-full border border-gray-200 rounded-xl px-4 py-2 text-sm outline-none focus:border-[#695be6] resize-none h-16"
                  placeholder="e.g., Provide graphic organizers, use manipulatives, pair with peer tutors"
                />
              </div>
              <div>
                <label className="text-xs font-bold text-gray-500 mb-1 block">Enrichment (for advanced learners)</label>
                <textarea
                  value={form.differentiation?.enrichment || ""}
                  onChange={(e) => setForm({ ...form, differentiation: { ...form.differentiation, enrichment: e.target.value } })}
                  className="w-full border border-gray-200 rounded-xl px-4 py-2 text-sm outline-none focus:border-[#695be6] resize-none h-16"
                  placeholder="e.g., Challenge problems, real-world applications, independent research"
                />
              </div>
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
              <p className="text-sm text-gray-400">AI is drafting your professional lesson plan...</p>
            </div>
          )}
          {aiResult && !generating && (
            <div id="lesson-plan-printable" className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
              {/* Header */}
              <div className="bg-gradient-to-r from-[#695be6] to-[#8b5cf6] p-6 text-white">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-black text-2xl flex items-center gap-2">
                    <span className="material-symbols-outlined">auto_awesome</span>
                    Lesson Plan
                  </h3>
                  <div className="flex gap-2">
                    <button 
                      onClick={handlePrint}
                      className="flex items-center gap-1 bg-white/20 hover:bg-white/30 px-3 py-1.5 rounded-lg text-sm font-bold transition-colors">
                      <span className="material-symbols-outlined text-sm">download</span> Download PDF
                    </button>
                    <button 
                      onClick={() => {
                        const planText = `LESSON PLAN\n\nSubject: ${form.subject}\nTopic: ${form.topic}\nGrade: ${form.classLevel}\nDuration: ${form.durationMinutes} minutes\n\n${JSON.stringify(aiResult, null, 2)}`;
                        navigator.clipboard?.writeText(planText);
                      }}
                      className="flex items-center gap-1 bg-white/20 hover:bg-white/30 px-3 py-1.5 rounded-lg text-sm font-bold transition-colors">
                      <span className="material-symbols-outlined text-sm">content_copy</span> Copy
                    </button>
                  </div>
                </div>
                <div className="grid grid-cols-4 gap-4 text-sm">
                  <div>
                    <p className="text-white/70 text-xs mb-1">Subject</p>
                    <p className="font-bold">{form.subject}</p>
                  </div>
                  <div>
                    <p className="text-white/70 text-xs mb-1">Topic</p>
                    <p className="font-bold">{form.topic}</p>
                  </div>
                  <div>
                    <p className="text-white/70 text-xs mb-1">Grade/Class</p>
                    <p className="font-bold">{form.classLevel}</p>
                  </div>
                  <div>
                    <p className="text-white/70 text-xs mb-1">Duration</p>
                    <p className="font-bold">{form.durationMinutes} minutes</p>
                  </div>
                </div>
                {form.standards && (
                  <div className="mt-3 pt-3 border-t border-white/20">
                    <p className="text-white/70 text-xs mb-1">Standards</p>
                    <p className="text-sm">{form.standards}</p>
                  </div>
                )}
              </div>

              {/* Content */}
              <div className="p-6 space-y-6">
                {/* Learning Objectives */}
                {aiResult.learning_objectives?.length > 0 && (
                  <section>
                    <div className="flex items-center gap-2 mb-3">
                      <span className="material-symbols-outlined text-[#695be6]">flag</span>
                      <h4 className="font-black text-lg">Learning Objectives</h4>
                    </div>
                    <div className="bg-blue-50 border-l-4 border-blue-500 p-4 rounded-r-lg">
                      <ul className="space-y-2">
                        {aiResult.learning_objectives.map((o, i) => (
                          <li key={i} className="flex items-start gap-2 text-sm text-gray-700">
                            <span className="material-symbols-outlined text-blue-600 text-base mt-0.5">check_circle</span>
                            <span>{typeof o === "string" ? o : o.text || JSON.stringify(o)}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </section>
                )}

                {/* Prerequisite Knowledge */}
                {aiResult.prerequisite_knowledge?.length > 0 && (
                  <section>
                    <div className="flex items-center gap-2 mb-3">
                      <span className="material-symbols-outlined text-[#695be6]">history_edu</span>
                      <h4 className="font-black text-lg">Prerequisite Knowledge</h4>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {aiResult.prerequisite_knowledge.map((p, i) => (
                        <span key={i} className="bg-indigo-50 text-indigo-700 border border-indigo-200 text-sm px-3 py-1.5 rounded-full">{p}</span>
                      ))}
                    </div>
                  </section>
                )}

                {/* Key Vocabulary */}
                {aiResult.key_vocabulary?.length > 0 && (
                  <section>
                    <div className="flex items-center gap-2 mb-3">
                      <span className="material-symbols-outlined text-[#695be6]">spellcheck</span>
                      <h4 className="font-black text-lg">Key Vocabulary</h4>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                      {aiResult.key_vocabulary.map((v, i) => (
                        <div key={i} className="bg-gray-50 border border-gray-200 rounded-lg p-3">
                          <span className="font-bold text-sm text-[#695be6]">{v.term}</span>
                          <span className="text-gray-500 text-sm"> — </span>
                          <span className="text-sm text-gray-700">{v.definition}</span>
                        </div>
                      ))}
                    </div>
                  </section>
                )}

                {/* Materials */}
                {(aiResult.materials?.length > 0 || form.resources?.length > 0) && (
                  <section>
                    <div className="flex items-center gap-2 mb-3">
                      <span className="material-symbols-outlined text-[#695be6]">inventory_2</span>
                      <h4 className="font-black text-lg">Materials & Resources</h4>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {(aiResult.materials || form.resources || []).map((r, i) => (
                        <span key={i} className="bg-gray-100 text-gray-700 text-sm px-3 py-1.5 rounded-full font-medium">
                          {typeof r === "string" ? r : r.name || JSON.stringify(r)}
                        </span>
                      ))}
                    </div>
                  </section>
                )}

                {/* Lesson Procedures — primary key */}
                {(aiResult.lesson_procedures || aiResult.sections || aiResult.procedures || aiResult.activities) && (
                  <section>
                    <div className="flex items-center gap-2 mb-4">
                      <span className="material-symbols-outlined text-[#695be6]">list_alt</span>
                      <h4 className="font-black text-lg">Lesson Procedures</h4>
                    </div>
                    <div className="space-y-4">
                      {(aiResult.lesson_procedures || aiResult.sections || aiResult.procedures || aiResult.activities || []).map((proc, i) => {
                        const phase = proc.phase || proc.name || proc.title || proc.section || `Step ${i + 1}`;
                        const duration = proc.duration_minutes || proc.duration;
                        const purpose = proc.purpose;
                        const teacherActions = proc.teacher_actions || proc.teacher_activity;
                        const studentActions = proc.student_actions || proc.student_activity;
                        const keyQuestions = proc.key_questions;
                        const notes = proc.notes;
                        return (
                          <div key={i} className="border border-gray-200 rounded-xl overflow-hidden">
                            <div className="flex items-center gap-3 bg-[#695be6]/5 px-4 py-3 border-b border-gray-200">
                              <span className="size-7 rounded-full bg-[#695be6] text-white text-sm font-bold flex items-center justify-center flex-shrink-0">{i + 1}</span>
                              <h5 className="font-bold text-base flex-1">{phase}</h5>
                              {duration && (
                                <span className="text-xs bg-[#695be6] text-white px-2.5 py-1 rounded-full font-bold">{duration} min</span>
                              )}
                            </div>
                            <div className="p-4 space-y-3">
                              {purpose && (
                                <p className="text-xs text-gray-500 italic">{purpose}</p>
                              )}
                              {teacherActions && (
                                <div>
                                  <p className="text-xs font-black text-gray-400 uppercase tracking-wide mb-1">Teacher Actions</p>
                                  <p className="text-sm text-gray-700 leading-relaxed">{teacherActions}</p>
                                </div>
                              )}
                              {studentActions && (
                                <div>
                                  <p className="text-xs font-black text-gray-400 uppercase tracking-wide mb-1">Student Actions</p>
                                  <p className="text-sm text-gray-700 leading-relaxed">{studentActions}</p>
                                </div>
                              )}
                              {keyQuestions?.length > 0 && (
                                <div>
                                  <p className="text-xs font-black text-gray-400 uppercase tracking-wide mb-1">Key Questions to Ask</p>
                                  <ul className="space-y-1">
                                    {keyQuestions.map((q, j) => (
                                      <li key={j} className="flex items-start gap-2 text-sm text-gray-700">
                                        <span className="text-[#695be6] font-bold flex-shrink-0">Q:</span> {q}
                                      </li>
                                    ))}
                                  </ul>
                                </div>
                              )}
                              {notes && (
                                <div className="bg-yellow-50 border border-yellow-200 rounded-lg px-3 py-2">
                                  <p className="text-xs font-black text-yellow-700 uppercase tracking-wide mb-1">Notes / Tips</p>
                                  <p className="text-xs text-gray-700">{notes}</p>
                                </div>
                              )}
                              {/* fallback for string-type items */}
                              {typeof proc === "string" && <p className="text-sm text-gray-700">{proc}</p>}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </section>
                )}

                {/* Assessment */}
                {(aiResult.formative_assessment || aiResult.summative_assessment || aiResult.assessment) && (
                  <section>
                    <div className="flex items-center gap-2 mb-3">
                      <span className="material-symbols-outlined text-[#695be6]">assignment_turned_in</span>
                      <h4 className="font-black text-lg">Assessment</h4>
                    </div>
                    <div className="space-y-3">
                      {aiResult.formative_assessment && (
                        <div className="bg-amber-50 border-l-4 border-amber-500 p-4 rounded-r-lg">
                          <p className="font-bold text-sm text-amber-800 mb-2">Formative Assessment (During Lesson)</p>
                          {typeof aiResult.formative_assessment === "object" ? (
                            <>
                              {aiResult.formative_assessment.during_lesson?.length > 0 && (
                                <ul className="space-y-1 mb-2">
                                  {aiResult.formative_assessment.during_lesson.map((s, i) => (
                                    <li key={i} className="text-sm text-gray-700 flex items-start gap-2">
                                      <span className="text-amber-600 mt-0.5">•</span>{s}
                                    </li>
                                  ))}
                                </ul>
                              )}
                              {aiResult.formative_assessment.exit_ticket && (
                                <div className="mt-2 bg-white border border-amber-200 rounded-lg p-3">
                                  <p className="text-xs font-bold text-amber-700 mb-1">Exit Ticket:</p>
                                  <p className="text-sm text-gray-700">{aiResult.formative_assessment.exit_ticket}</p>
                                </div>
                              )}
                            </>
                          ) : (
                            <p className="text-sm text-gray-700">{aiResult.formative_assessment}</p>
                          )}
                        </div>
                      )}
                      {aiResult.summative_assessment && (
                        <div className="bg-orange-50 border-l-4 border-orange-500 p-4 rounded-r-lg">
                          <p className="font-bold text-sm text-orange-800 mb-1">Summative Assessment</p>
                          <p className="text-sm text-gray-700">{aiResult.summative_assessment}</p>
                        </div>
                      )}
                      {aiResult.assessment && !aiResult.formative_assessment && !aiResult.summative_assessment && (
                        <div className="bg-amber-50 border-l-4 border-amber-500 p-4 rounded-r-lg">
                          <p className="text-sm text-gray-700">{typeof aiResult.assessment === "string" ? aiResult.assessment : JSON.stringify(aiResult.assessment)}</p>
                        </div>
                      )}
                    </div>
                  </section>
                )}

                {/* Differentiation */}
                {aiResult.differentiation && (
                  <section>
                    <div className="flex items-center gap-2 mb-3">
                      <span className="material-symbols-outlined text-[#695be6]">diversity_3</span>
                      <h4 className="font-black text-lg">Differentiation & Accommodations</h4>
                    </div>
                    <div className="grid md:grid-cols-2 gap-3">
                      {aiResult.differentiation.support && (
                        <div className="bg-green-50 border border-green-200 p-4 rounded-lg">
                          <p className="font-bold text-sm text-green-800 mb-2">Support (Struggling Learners)</p>
                          <p className="text-sm text-gray-700">{aiResult.differentiation.support}</p>
                        </div>
                      )}
                      {aiResult.differentiation.enrichment && (
                        <div className="bg-purple-50 border border-purple-200 p-4 rounded-lg">
                          <p className="font-bold text-sm text-purple-800 mb-2">Enrichment (Advanced Learners)</p>
                          <p className="text-sm text-gray-700">{aiResult.differentiation.enrichment}</p>
                        </div>
                      )}
                      {aiResult.differentiation.ell_accommodations && (
                        <div className="bg-blue-50 border border-blue-200 p-4 rounded-lg">
                          <p className="font-bold text-sm text-blue-800 mb-2">ELL Accommodations</p>
                          <p className="text-sm text-gray-700">{aiResult.differentiation.ell_accommodations}</p>
                        </div>
                      )}
                      {aiResult.differentiation.iep_accommodations && (
                        <div className="bg-rose-50 border border-rose-200 p-4 rounded-lg">
                          <p className="font-bold text-sm text-rose-800 mb-2">IEP Accommodations</p>
                          <p className="text-sm text-gray-700">{aiResult.differentiation.iep_accommodations}</p>
                        </div>
                      )}
                    </div>
                  </section>
                )}

                {/* Cross-Curricular Connections */}
                {aiResult.cross_curricular_connections?.length > 0 && (
                  <section>
                    <div className="flex items-center gap-2 mb-3">
                      <span className="material-symbols-outlined text-[#695be6]">hub</span>
                      <h4 className="font-black text-lg">Cross-Curricular Connections</h4>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {aiResult.cross_curricular_connections.map((c, i) => (
                        <span key={i} className="bg-teal-50 text-teal-700 border border-teal-200 text-sm px-3 py-1.5 rounded-full">{c}</span>
                      ))}
                    </div>
                  </section>
                )}

                {/* Homework */}
                {aiResult.homework_assignment && (
                  <section>
                    <div className="flex items-center gap-2 mb-3">
                      <span className="material-symbols-outlined text-[#695be6]">home_work</span>
                      <h4 className="font-black text-lg">Homework Assignment</h4>
                    </div>
                    <div className="bg-gray-50 border border-gray-200 p-4 rounded-lg">
                      <p className="text-sm text-gray-700">{aiResult.homework_assignment}</p>
                    </div>
                  </section>
                )}

                {/* Teacher Reflection Prompts */}
                {aiResult.teacher_reflection_prompts?.length > 0 && (
                  <section>
                    <div className="flex items-center gap-2 mb-3">
                      <span className="material-symbols-outlined text-[#695be6]">self_improvement</span>
                      <h4 className="font-black text-lg">Teacher Reflection Prompts</h4>
                    </div>
                    <div className="bg-slate-50 border border-slate-200 p-4 rounded-lg space-y-2">
                      {aiResult.teacher_reflection_prompts.map((r, i) => (
                        <p key={i} className="text-sm text-gray-600 flex items-start gap-2">
                          <span className="text-slate-400 font-bold flex-shrink-0">{i + 1}.</span> {r}
                        </p>
                      ))}
                    </div>
                  </section>
                )}

                {/* Fallback for unstructured content */}
                {!aiResult.learning_objectives && !aiResult.lesson_procedures && !aiResult.sections && aiResult.content && (
                  <section>
                    <pre className="text-sm text-gray-700 whitespace-pre-wrap font-sans">{aiResult.content}</pre>
                  </section>
                )}
              </div>

              {/* Footer */}
              <div className="bg-gray-50 border-t border-gray-200 p-4 flex items-center justify-between">
                <p className="text-xs text-gray-500">Generated by VinSchool AI • {new Date().toLocaleDateString()}</p>
                <button 
                  onClick={() => dispatch(clearAiToolResult())}
                  className="text-xs text-[#695be6] font-bold hover:underline">
                  Generate New Plan
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
