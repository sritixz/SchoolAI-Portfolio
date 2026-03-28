import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  quizGeneratorDefaults,
  subjectOptions,
  classOptions,
  questionTypeOptions,
} from "../../data/teacher/quizGeneratorData";

export default function QuizGenerator() {
  const navigate = useNavigate();
  const [form, setForm] = useState(quizGeneratorDefaults);
  const [generating, setGenerating] = useState(false);

  const toggleQType = (id) =>
    setForm((p) => ({ ...p, questionTypes: { ...p.questionTypes, [id]: !p.questionTypes[id] } }));

  const handleGenerate = () => {
    setGenerating(true);
    setTimeout(() => setGenerating(false), 2000);
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
            <div className="size-9 rounded-full bg-[#695be6] flex items-center justify-center text-white font-bold text-sm">P</div>
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
              <div className="flex gap-3">
                <button className="text-xs font-semibold text-gray-500 hover:text-gray-700">Export PDF</button>
                <button className="text-xs font-semibold text-gray-500 hover:text-gray-700">Share Link</button>
              </div>
            </div>

            <div className="flex flex-col items-center justify-center p-12 text-center min-h-[400px]">
              {/* Illustration */}
              <div className="relative mb-6">
                <div className="w-40 h-48 bg-[#695be6]/10 rounded-2xl flex flex-col items-center justify-center gap-3 p-4">
                  <div className="w-full h-2 bg-[#695be6]/20 rounded" />
                  <div className="w-3/4 h-2 bg-[#695be6]/20 rounded" />
                  <div className="flex items-center gap-2 w-full">
                    <div className="size-3 rounded-full border-2 border-[#695be6]/30" />
                    <div className="flex-1 h-1.5 bg-[#695be6]/20 rounded" />
                  </div>
                  <div className="flex items-center gap-2 w-full">
                    <div className="size-3 rounded-full border-2 border-[#695be6]/30" />
                    <div className="flex-1 h-1.5 bg-[#695be6]/20 rounded" />
                  </div>
                  <div className="w-full h-8 bg-[#695be6]/20 rounded-lg" />
                </div>
                <div className="absolute -bottom-3 -right-3 size-10 bg-[#695be6] rounded-xl flex items-center justify-center shadow-lg">
                  <span className="material-symbols-outlined text-white text-lg">chat</span>
                </div>
              </div>

              <h3 className="font-black text-xl mb-2">Your generated questions will appear here</h3>
              <p className="text-sm text-gray-400 mb-6">
                Customize the parameters on the left to start generating high-quality assessments and solutions.
              </p>

              <div className="flex gap-6">
                {[
                  { icon: "check_circle", label: "ACCURATE" },
                  { icon: "bolt",         label: "FAST" },
                  { icon: "auto_awesome", label: "SMART" },
                ].map((f) => (
                  <div key={f.label} className="flex flex-col items-center gap-1">
                    <span className="material-symbols-outlined text-gray-300 text-2xl">{f.icon}</span>
                    <span className="text-[10px] font-bold text-gray-400">{f.label}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
