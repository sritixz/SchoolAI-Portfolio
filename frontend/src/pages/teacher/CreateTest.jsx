import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  testCreationSteps,
  testChapters,
  testDefaults,
  qualityChecks,
} from "../../data/teacher/createTestData";
import { subjectOptions, classOptions } from "../../data/teacher/quizGeneratorData";

export default function CreateTest() {
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState(1);
  const [form, setForm] = useState(testDefaults);
  const [chapters, setChapters] = useState(testChapters);

  const toggleChapter = (chId) =>
    setChapters((prev) =>
      prev.map((ch) =>
        ch.id === chId ? { ...ch, selected: !ch.selected, partial: false } : ch
      )
    );

  const toggleSubtopic = (chId, stId) =>
    setChapters((prev) =>
      prev.map((ch) => {
        if (ch.id !== chId) return ch;
        const updated = ch.subtopics.map((st) =>
          st.id === stId ? { ...st, selected: !st.selected } : st
        );
        const allSelected  = updated.every((st) => st.selected);
        const someSelected = updated.some((st) => st.selected);
        return { ...ch, subtopics: updated, selected: allSelected, partial: someSelected && !allSelected };
      })
    );

  // Donut chart for test stats
  const { easy, medium, hard } = form.difficulty;
  const easyQs   = Math.round(form.totalQuestions * easy / 100);
  const mediumQs = Math.round(form.totalQuestions * medium / 100);
  const hardQs   = form.totalQuestions - easyQs - mediumQs;

  return (
    <div className="bg-[#faf9ff] min-h-screen" style={{ fontFamily: "'Lexend', sans-serif" }}>

      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-white border-b border-gray-200">
        <div className="max-w-[1200px] mx-auto px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button onClick={() => navigate("/teacher/homework")} className="p-2 hover:bg-gray-100 rounded-lg">
              <span className="material-symbols-outlined text-gray-500">arrow_back</span>
            </button>
            <h1 className="font-black text-base">Create New Test</h1>
          </div>

          {/* Step Breadcrumb */}
          <div className="hidden md:flex items-center gap-2">
            {testCreationSteps.map((step, i) => (
              <div key={step} className="flex items-center gap-2">
                <button
                  onClick={() => setCurrentStep(i)}
                  className={`text-xs font-bold px-3 py-1 rounded-full transition-colors ${
                    currentStep === i
                      ? "bg-[#695be6] text-white"
                      : i < currentStep
                      ? "text-[#695be6] font-bold"
                      : "text-gray-400"
                  }`}
                >
                  {step}
                </button>
                {i < testCreationSteps.length - 1 && (
                  <span className="material-symbols-outlined text-gray-300 text-sm">chevron_right</span>
                )}
              </div>
            ))}
          </div>

          <button className="bg-[#695be6] text-white text-sm font-bold px-4 py-2 rounded-xl hover:bg-[#5a4dd4] transition-colors">
            Save as Draft
          </button>
        </div>
      </header>

      <div className="max-w-[1200px] mx-auto pt-20 px-6 pb-12 flex gap-6">

        {/* Main Form */}
        <div className="flex-1">

          {/* Mode Selection */}
          <div className="grid grid-cols-2 gap-4 mb-6">
            {[
              { id: "ai",     icon: "smart_toy",  label: "AI-Generated Test",  desc: "Automated selection & smart feedback", recommended: true },
              { id: "manual", icon: "edit",        label: "Manual Creation",    desc: "Full control over every question",     recommended: false },
            ].map((mode) => (
              <button
                key={mode.id}
                onClick={() => setForm({ ...form, mode: mode.id })}
                className={`relative flex items-center gap-4 p-4 rounded-xl border-2 text-left transition-all ${
                  form.mode === mode.id ? "border-[#695be6] bg-[#695be6]/5" : "border-gray-200 bg-white hover:border-gray-300"
                }`}
              >
                {mode.recommended && (
                  <span className="absolute top-2 right-2 text-[10px] font-black bg-green-100 text-green-700 px-2 py-0.5 rounded-full">
                    RECOMMENDED
                  </span>
                )}
                <div className={`size-10 rounded-xl flex items-center justify-center ${
                  form.mode === mode.id ? "bg-[#695be6] text-white" : "bg-gray-100 text-gray-500"
                }`}>
                  <span className="material-symbols-outlined">{mode.icon}</span>
                </div>
                <div>
                  <p className="font-black text-sm">{mode.label}</p>
                  <p className="text-xs text-gray-400">{mode.desc}</p>
                </div>
              </button>
            ))}
          </div>

          {/* Basic Details */}
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 mb-4">
            <h3 className="font-black text-sm mb-4">Basic Details</h3>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="text-xs font-bold text-gray-500 mb-1 block">Test Name</label>
                <input
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-[#695be6]"
                />
              </div>
              <div>
                <label className="text-xs font-bold text-gray-500 mb-1 block">Subject</label>
                <select
                  value={form.subject}
                  onChange={(e) => setForm({ ...form, subject: e.target.value })}
                  className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-[#695be6] bg-white"
                >
                  {subjectOptions.map((s) => <option key={s}>{s}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs font-bold text-gray-500 mb-1 block">Class</label>
                <select
                  value={form.classLevel}
                  onChange={(e) => setForm({ ...form, classLevel: e.target.value })}
                  className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-[#695be6] bg-white"
                >
                  {classOptions.map((c) => <option key={c}>{c}</option>)}
                </select>
              </div>
            </div>
          </div>

          {/* Topic Selection */}
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 mb-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-black text-sm">Topic Selection</h3>
              <button className="text-xs text-[#695be6] font-semibold hover:underline">Clear All</button>
            </div>
            <div className="space-y-2">
              {chapters.map((ch) => (
                <div key={ch.id} className="border border-gray-100 rounded-xl overflow-hidden">
                  <div
                    className={`flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-gray-50 ${
                      ch.selected ? "bg-[#695be6]/5" : ""
                    }`}
                    onClick={() => toggleChapter(ch.id)}
                  >
                    <div className={`size-5 rounded border-2 flex items-center justify-center flex-shrink-0 ${
                      ch.selected ? "bg-[#695be6] border-[#695be6]" :
                      ch.partial  ? "border-[#695be6]" : "border-gray-300"
                    }`}>
                      {ch.selected && <span className="material-symbols-outlined text-white text-xs">check</span>}
                      {ch.partial && !ch.selected && <div className="size-2 bg-[#695be6] rounded-sm" />}
                    </div>
                    <span className="font-semibold text-sm flex-1">{ch.title}</span>
                    {ch.partial && !ch.selected && (
                      <span className="text-[10px] font-bold bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded-full">PARTIAL</span>
                    )}
                    <span className="material-symbols-outlined text-gray-400 text-base">
                      {ch.selected ? "expand_less" : "chevron_right"}
                    </span>
                  </div>
                  {ch.selected && (
                    <div className="border-t border-gray-100 bg-gray-50 px-8 py-2 space-y-2">
                      {ch.subtopics.map((st) => (
                        <label key={st.id} className="flex items-center gap-2 text-sm cursor-pointer py-1">
                          <div
                            onClick={() => toggleSubtopic(ch.id, st.id)}
                            className={`size-4 rounded border-2 flex items-center justify-center cursor-pointer ${
                              st.selected ? "bg-[#695be6] border-[#695be6]" : "border-gray-300"
                            }`}
                          >
                            {st.selected && <span className="material-symbols-outlined text-white text-xs">check</span>}
                          </div>
                          <span className="text-[#695be6] font-semibold">{st.title}</span>
                        </label>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Difficulty Configuration */}
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
            <h3 className="font-black text-sm mb-4">Difficulty Configuration</h3>

            <div className="mb-4">
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-bold text-gray-500">Total Questions</label>
                <span className="text-sm font-black text-[#695be6]">{form.totalQuestions}</span>
              </div>
              <input
                type="range" min={5} max={50} value={form.totalQuestions}
                onChange={(e) => setForm({ ...form, totalQuestions: +e.target.value })}
                className="w-full accent-[#695be6]"
              />
            </div>

            <div className="space-y-3 mb-4">
              {[
                { key: "easy",   label: "Easy",   color: "text-green-600",  track: "accent-green-500",  qs: easyQs },
                { key: "medium", label: "Medium", color: "text-orange-500", track: "accent-orange-400", qs: mediumQs },
                { key: "hard",   label: "Hard",   color: "text-red-500",    track: "accent-red-500",    qs: hardQs },
              ].map((d) => (
                <div key={d.key} className="flex items-center gap-3">
                  <span className={`text-xs font-bold w-20 ${d.color}`}>{d.label} ({form.difficulty[d.key]}%)</span>
                  <input
                    type="range" min={0} max={100} value={form.difficulty[d.key]}
                    onChange={(e) => setForm({ ...form, difficulty: { ...form.difficulty, [d.key]: +e.target.value } })}
                    className={`flex-1 ${d.track}`}
                  />
                  <span className="text-xs text-gray-400 w-12 text-right">-{d.qs} Qs</span>
                </div>
              ))}
            </div>

            <div className="mb-2">
              <label className="text-xs font-bold text-gray-500 mb-2 block">Question Types</label>
              <div className="flex flex-wrap gap-2">
                {[
                  { key: "mcq",         label: `MCQ (${form.questionTypes.mcq})` },
                  { key: "shortAnswer", label: `Short Answer (${form.questionTypes.shortAnswer})` },
                  { key: "numerical",   label: "Numerical" },
                ].map((qt) => (
                  <button
                    key={qt.key}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full border-2 text-xs font-bold transition-all ${
                      form.questionTypes[qt.key]
                        ? "border-[#695be6] bg-[#695be6] text-white"
                        : "border-gray-200 text-gray-600"
                    }`}
                  >
                    {form.questionTypes[qt.key] && (
                      <span className="material-symbols-outlined text-xs">check</span>
                    )}
                    {qt.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Right Sidebar */}
        <div className="w-64 flex-shrink-0 space-y-4">

          {/* Test Statistics */}
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
            <h3 className="font-black text-sm mb-4">Test Statistics</h3>
            <div className="flex justify-center mb-4">
              <div className="relative size-24">
                <svg viewBox="0 0 36 36" className="size-24 -rotate-90">
                  <circle cx="18" cy="18" r="15.9" fill="none" stroke="#f3f4f6" strokeWidth="3" />
                  <circle cx="18" cy="18" r="15.9" fill="none" stroke="#22c55e" strokeWidth="3"
                    strokeDasharray={`${easy} ${100 - easy}`} strokeDashoffset="0" />
                  <circle cx="18" cy="18" r="15.9" fill="none" stroke="#f59e0b" strokeWidth="3"
                    strokeDasharray={`${medium} ${100 - medium}`} strokeDashoffset={`-${easy}`} />
                  <circle cx="18" cy="18" r="15.9" fill="none" stroke="#ef4444" strokeWidth="3"
                    strokeDasharray={`${hard} ${100 - hard}`} strokeDashoffset={`-${easy + medium}`} />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-xl font-black">{form.totalQuestions}</span>
                  <span className="text-[9px] text-gray-400 font-bold">TOTAL QS</span>
                </div>
              </div>
            </div>
            <div className="space-y-1">
              <div className="flex items-center gap-2 text-xs">
                <span className="size-2.5 rounded-full bg-green-500 inline-block"></span>
                <span className="text-gray-600">{easy}% Easy</span>
              </div>
              <div className="flex items-center gap-2 text-xs">
                <span className="size-2.5 rounded-full bg-yellow-400 inline-block"></span>
                <span className="text-gray-600">{medium}% Med</span>
              </div>
              <div className="flex items-center gap-2 text-xs">
                <span className="size-2.5 rounded-full bg-red-500 inline-block"></span>
                <span className="text-gray-600">{hard}% Hard</span>
              </div>
            </div>
          </div>

          {/* Quality Check */}
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
            <div className="flex items-center gap-2 mb-3">
              <h3 className="font-black text-sm">Quality Check</h3>
              <span className="material-symbols-outlined text-green-500 text-base">check_circle</span>
            </div>
            <div className="space-y-2">
              {qualityChecks.map((qc) => (
                <div key={qc.label} className="flex items-center gap-2 text-xs">
                  <span className={`material-symbols-outlined text-sm ${qc.pass ? "text-green-500" : "text-red-500"}`}>
                    {qc.pass ? "check_circle" : "cancel"}
                  </span>
                  <span className="text-gray-600">{qc.label}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Generate Button */}
          <button
            onClick={() => navigate("/teacher/homework")}
            className="w-full flex items-center justify-center gap-2 bg-[#695be6] text-white font-black py-3.5 rounded-xl hover:bg-[#5a4dd4] transition-colors shadow-lg shadow-[#695be6]/30"
          >
            <span className="material-symbols-outlined text-base">auto_awesome</span> Generate Test with AI
          </button>
          <p className="text-center text-xs text-gray-400">
            AI will draft unique questions based on your specific parameters. You can edit them later.
          </p>
        </div>
      </div>
    </div>
  );
}
