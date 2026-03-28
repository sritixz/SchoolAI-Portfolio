import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  diffHomeworkSubjects,
  diffHomeworkChapters,
  aiSuggestedGroups,
  groupQuestions,
  allStudents,
  manualGroups,
} from "../../data/teacher/differentiatedHomeworkData";

const STEPS = ["Setup", "Assign Groups", "Review"];

export default function DifferentiatedHomework() {
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState(0);
  const [subject, setSubject] = useState("Math");
  const [chapter, setChapter] = useState("Linear Equations");
  const [groupingMethod, setGroupingMethod] = useState("ai");
  const [activeGroup, setActiveGroup] = useState("groupA");
  const [assignFormat, setAssignFormat] = useState("Online");
  const [questions, setQuestions] = useState(groupQuestions);
  const [students, setStudents] = useState(allStudents);
  const [groups, setGroups] = useState(manualGroups);
  const [studentSearch, setStudentSearch] = useState("");
  const [selectedStudents, setSelectedStudents] = useState([]);

  const toggleQuestion = (id) =>
    setQuestions((prev) => prev.map((q) => q.id === id ? { ...q, selected: !q.selected } : q));

  const toggleStudent = (id) =>
    setSelectedStudents((prev) =>
      prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id]
    );

  const selectedQCount = questions.filter((q) => q.selected).length;
  const selectedMarks  = questions.filter((q) => q.selected).reduce((s, q) => s + q.marks, 0);

  const filteredStudents = students.filter((s) =>
    s.name.toLowerCase().includes(studentSearch.toLowerCase())
  );

  return (
    <div className="bg-[#fdf8ff] min-h-screen" style={{ fontFamily: "'Lexend', sans-serif" }}>

      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-white border-b border-gray-200">
        <div className="max-w-[1100px] mx-auto px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="size-7 bg-[#695be6] rounded-lg flex items-center justify-center text-white">
              <span className="material-symbols-outlined text-sm">auto_awesome</span>
            </div>
            <h1 className="font-black text-base">Differentiated Homework</h1>
            <button className="p-1 hover:bg-gray-100 rounded-lg">
              <span className="material-symbols-outlined text-gray-400 text-base">info</span>
            </button>
          </div>

          {/* Step Breadcrumb */}
          <div className="flex items-center gap-3">
            {STEPS.map((step, i) => (
              <div key={step} className="flex items-center gap-2">
                <button
                  onClick={() => setCurrentStep(i)}
                  className={`flex items-center gap-1.5 text-xs font-bold transition-colors ${
                    currentStep === i ? "text-[#695be6]" : i < currentStep ? "text-gray-600" : "text-gray-300"
                  }`}
                >
                  {i === 0 && <span className="material-symbols-outlined text-sm">settings</span>}
                  {i === 1 && <span className="material-symbols-outlined text-sm">group</span>}
                  {i === 2 && <span className="material-symbols-outlined text-sm">rate_review</span>}
                  {step}
                </button>
                {i < STEPS.length - 1 && (
                  <div className={`w-8 h-0.5 ${i < currentStep ? "bg-[#695be6]" : "bg-gray-200"}`} />
                )}
              </div>
            ))}
          </div>

          <div className="flex items-center gap-3">
            <button className="border border-gray-200 text-sm font-bold px-4 py-2 rounded-xl hover:bg-gray-50 transition-colors">
              Save as Draft
            </button>
            <button
              onClick={() => navigate("/teacher/homework")}
              className="border border-gray-200 text-sm font-bold px-4 py-2 rounded-xl hover:bg-gray-50 transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-[1100px] mx-auto pt-20 px-6 pb-28">

        {/* Step 0: Setup */}
        {currentStep === 0 && (
          <>
            {/* Course Details */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 mb-5">
              <h2 className="font-black text-base mb-4">Course Details</h2>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold text-gray-500 mb-1 block">Subject</label>
                  <div className="relative">
                    <select
                      value={subject}
                      onChange={(e) => setSubject(e.target.value)}
                      className="w-full border border-gray-200 rounded-xl pl-10 pr-4 py-2.5 text-sm outline-none focus:border-[#695be6] bg-white appearance-none"
                    >
                      {diffHomeworkSubjects.map((s) => <option key={s}>{s}</option>)}
                    </select>
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 material-symbols-outlined text-gray-400 text-base">functions</span>
                  </div>
                </div>
                <div>
                  <label className="text-xs font-bold text-gray-500 mb-1 block">Chapter</label>
                  <div className="relative">
                    <select
                      value={chapter}
                      onChange={(e) => setChapter(e.target.value)}
                      className="w-full border border-gray-200 rounded-xl pl-10 pr-4 py-2.5 text-sm outline-none focus:border-[#695be6] bg-white appearance-none"
                    >
                      {(diffHomeworkChapters[subject] || []).map((c) => <option key={c}>{c}</option>)}
                    </select>
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 material-symbols-outlined text-gray-400 text-base">menu_book</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Grouping Method */}
            <div className="mb-5">
              <h2 className="font-black text-base mb-4">Grouping Method</h2>
              <div className="grid grid-cols-2 gap-4">
                {[
                  { id: "ai",     icon: "smart_toy",  label: "AI-Suggested Grouping",  desc: "Personalized groups based on recent quiz scores and interaction data.", recommended: true },
                  { id: "manual", icon: "person_add",  label: "Manual Grouping",         desc: "Customize your own student groups for this assignment.",              recommended: false },
                ].map((m) => (
                  <button
                    key={m.id}
                    onClick={() => setGroupingMethod(m.id)}
                    className={`relative flex items-start gap-4 p-5 rounded-2xl border-2 text-left transition-all ${
                      groupingMethod === m.id ? "border-[#695be6] bg-[#695be6]/5" : "border-gray-200 bg-white hover:border-gray-300"
                    }`}
                  >
                    {m.recommended && (
                      <span className="absolute top-3 right-3 text-[10px] font-black bg-green-100 text-green-700 px-2 py-0.5 rounded-full">RECOMMENDED</span>
                    )}
                    {groupingMethod === m.id && !m.recommended && (
                      <span className="absolute top-3 right-3 size-5 bg-[#695be6] rounded-full flex items-center justify-center">
                        <span className="material-symbols-outlined text-white text-xs">check</span>
                      </span>
                    )}
                    <div className={`size-10 rounded-xl flex items-center justify-center flex-shrink-0 ${
                      groupingMethod === m.id ? "bg-[#695be6] text-white" : "bg-gray-100 text-gray-500"
                    }`}>
                      <span className="material-symbols-outlined">{m.icon}</span>
                    </div>
                    <div>
                      <p className="font-black text-sm">{m.label}</p>
                      <p className="text-xs text-gray-400 mt-0.5">{m.desc}</p>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* AI Grouping View */}
            {groupingMethod === "ai" && (
              <>
                <div className="flex items-center justify-between mb-3">
                  <h2 className="font-black text-base">Suggested Group Breakdown</h2>
                  <button className="flex items-center gap-1.5 text-xs text-[#695be6] font-semibold hover:underline">
                    <span className="material-symbols-outlined text-sm">auto_awesome</span> Regenerate
                  </button>
                </div>

                <div className="grid grid-cols-3 gap-4 mb-4">
                  {aiSuggestedGroups.map((g) => (
                    <div
                      key={g.id}
                      onClick={() => setActiveGroup(g.id)}
                      className={`bg-white rounded-xl border-2 p-4 cursor-pointer transition-all ${
                        activeGroup === g.id ? "border-[#695be6]" : "border-gray-100 hover:border-gray-200"
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <div className="flex items-center gap-1.5">
                          <span className={`size-2.5 rounded-full ${g.dotColor} inline-block`}></span>
                          <p className="font-black text-sm">{g.label}</p>
                        </div>
                        <span className="text-xs text-gray-400">{g.studentCount} Students</span>
                      </div>
                      <p className="text-xs text-gray-400 mb-3">Performance: {g.performance}</p>
                      <div className="flex items-center gap-1 mb-3">
                        {Array.from({ length: g.avatarCount }).map((_, i) => (
                          <div key={i} className="size-7 rounded-full bg-gray-200 border-2 border-white -ml-1 first:ml-0 flex items-center justify-center">
                            <span className="material-symbols-outlined text-gray-400 text-xs">person</span>
                          </div>
                        ))}
                        {g.extra > 0 && (
                          <div className="size-7 rounded-full bg-[#695be6]/10 border-2 border-white -ml-1 flex items-center justify-center">
                            <span className="text-[10px] font-bold text-[#695be6]">+{g.extra}</span>
                          </div>
                        )}
                      </div>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${g.levelColor}`}>{g.level}</span>
                    </div>
                  ))}
                </div>

                <button className="flex items-center gap-1.5 text-xs text-[#695be6] font-semibold mb-5 hover:underline">
                  <span className="material-symbols-outlined text-sm">expand_more</span> See AI Reasoning for grouping
                </button>

                {/* Group Tabs + Questions */}
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                  <div className="flex border-b border-gray-100">
                    {aiSuggestedGroups.map((g) => (
                      <button
                        key={g.id}
                        onClick={() => setActiveGroup(g.id)}
                        className={`px-5 py-3 text-sm font-bold border-b-2 transition-colors ${
                          activeGroup === g.id ? "border-[#695be6] text-[#695be6]" : "border-transparent text-gray-400 hover:text-gray-600"
                        }`}
                      >
                        {g.label}
                      </button>
                    ))}
                  </div>

                  <div className="p-5">
                    <div className="flex gap-2 mb-4">
                      {["Online", "Printable PDF"].map((f) => (
                        <button
                          key={f}
                          onClick={() => setAssignFormat(f)}
                          className={`text-xs font-bold px-4 py-1.5 rounded-full border-2 transition-colors ${
                            assignFormat === f ? "border-[#695be6] bg-[#695be6] text-white" : "border-gray-200 text-gray-600 hover:border-gray-300"
                          }`}
                        >
                          {f}
                        </button>
                      ))}
                    </div>

                    <div className="space-y-3">
                      {questions.map((q) => (
                        <div
                          key={q.id}
                          onClick={() => toggleQuestion(q.id)}
                          className={`flex items-start gap-3 p-4 rounded-xl border-2 cursor-pointer transition-all ${
                            q.selected ? "border-[#695be6] bg-[#695be6]/5" : "border-gray-100 hover:border-gray-200"
                          }`}
                        >
                          <div className={`size-5 rounded border-2 flex items-center justify-center flex-shrink-0 mt-0.5 ${
                            q.selected ? "bg-[#695be6] border-[#695be6]" : "border-gray-300"
                          }`}>
                            {q.selected && <span className="material-symbols-outlined text-white text-xs">check</span>}
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <span className={`text-[10px] font-black px-2 py-0.5 rounded ${q.diffColor}`}>{q.difficulty}</span>
                              <span className="text-[10px] text-gray-400">{q.id_code}</span>
                              <span className="ml-auto text-xs font-bold text-gray-500">{q.marks} Marks</span>
                            </div>
                            <p className="text-sm font-semibold">{q.text}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </>
            )}

            {/* Manual Grouping View */}
            {groupingMethod === "manual" && (
              <div className="grid grid-cols-2 gap-6">
                {/* Student List */}
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="font-black text-sm">All Students</h3>
                    <span className="text-xs text-gray-400">{students.length * 5} Students Total</span>
                  </div>
                  <div className="flex items-center gap-2 bg-gray-100 rounded-xl px-3 py-2 mb-3">
                    <span className="material-symbols-outlined text-gray-400 text-sm">search</span>
                    <input
                      value={studentSearch}
                      onChange={(e) => setStudentSearch(e.target.value)}
                      className="bg-transparent text-sm outline-none w-full placeholder-gray-400"
                      placeholder="Search students by name"
                    />
                  </div>
                  <label className="flex items-center gap-2 text-sm mb-3 cursor-pointer">
                    <input type="checkbox" className="accent-[#695be6] size-4" />
                    <span className="font-semibold">Select All</span>
                  </label>
                  <div className="space-y-2">
                    {filteredStudents.map((s) => (
                      <div
                        key={s.id}
                        onClick={() => toggleStudent(s.id)}
                        className={`flex items-center gap-3 p-2.5 rounded-xl cursor-pointer transition-colors ${
                          selectedStudents.includes(s.id) ? "bg-[#695be6]/5" : "hover:bg-gray-50"
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={selectedStudents.includes(s.id)}
                          onChange={() => toggleStudent(s.id)}
                          className="accent-[#695be6] size-4"
                          onClick={(e) => e.stopPropagation()}
                        />
                        <div className="size-9 rounded-full bg-gray-200 flex items-center justify-center flex-shrink-0">
                          <span className="material-symbols-outlined text-gray-400 text-sm">person</span>
                        </div>
                        <div>
                          <p className="font-semibold text-sm">{s.name}</p>
                          <p className={`text-[10px] font-bold ${s.statusColor}`}>{s.status}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Created Groups */}
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="font-black text-sm">Created Groups</h3>
                    <button className="flex items-center gap-1.5 bg-[#695be6] text-white text-xs font-bold px-3 py-2 rounded-xl hover:bg-[#5a4dd4] transition-colors">
                      <span className="material-symbols-outlined text-sm">add</span> Create New Group
                    </button>
                  </div>
                  <div className="space-y-4">
                    {groups.map((g) => (
                      <div key={g.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center gap-2">
                            <h4 className="font-black text-sm">{g.label}</h4>
                            <span className="text-[10px] font-bold bg-[#695be6]/10 text-[#695be6] px-2 py-0.5 rounded-full">
                              {g.studentCount} STUDENTS
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-gray-400">DIFFICULTY:</span>
                            <select className="border border-gray-200 rounded-lg px-2 py-1 text-xs bg-white outline-none">
                              <option>Foundation</option>
                              <option>Intermediate</option>
                              <option>Advanced</option>
                            </select>
                            <button className="p-1 hover:bg-gray-100 rounded-lg">
                              <span className="material-symbols-outlined text-gray-400 text-base">delete</span>
                            </button>
                          </div>
                        </div>
                        {g.members.length > 0 ? (
                          <div className="flex flex-wrap gap-2">
                            {g.members.map((m) => (
                              <span key={m.id} className="flex items-center gap-1 bg-gray-100 text-xs font-semibold px-2 py-1 rounded-full">
                                {m.name}
                                <button className="hover:text-red-500">
                                  <span className="material-symbols-outlined text-xs">close</span>
                                </button>
                              </span>
                            ))}
                            {g.extra > 0 && (
                              <span className="bg-[#695be6]/10 text-[#695be6] text-xs font-bold px-2 py-1 rounded-full">
                                + {g.extra} more
                              </span>
                            )}
                          </div>
                        ) : (
                          <div className="border-2 border-dashed border-gray-200 rounded-xl py-4 text-center text-xs text-gray-400">
                            Drag students here or click to add
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </>
        )}

        {currentStep !== 0 && (
          <div className="text-center py-20 text-gray-400">
            <span className="material-symbols-outlined text-5xl mb-3 block">construction</span>
            <p className="font-semibold">Step {currentStep + 1}: {STEPS[currentStep]} — coming soon</p>
          </div>
        )}
      </main>

      {/* Footer */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 px-6 py-3">
        <div className="max-w-[1100px] mx-auto flex items-center justify-between">
          <button
            onClick={() => currentStep > 0 ? setCurrentStep(currentStep - 1) : navigate("/teacher/homework")}
            className="flex items-center gap-1.5 text-sm font-bold text-gray-600 hover:text-gray-800"
          >
            <span className="material-symbols-outlined text-base">arrow_back</span> Back
          </button>
          {groupingMethod === "ai" && (
            <div className="flex items-center gap-3 bg-gray-900 text-white px-5 py-2.5 rounded-xl text-sm font-bold">
              <span>{selectedQCount} questions selected</span>
              <span className="text-[#695be6] font-black">|</span>
              <span>{selectedMarks} marks total</span>
            </div>
          )}
          <div className="flex gap-3">
            <button className="border border-gray-200 text-sm font-bold px-5 py-2.5 rounded-xl hover:bg-gray-50 transition-colors">
              Save as Draft
            </button>
            <button
              onClick={() => {
                if (currentStep < STEPS.length - 1) {
                  setCurrentStep(currentStep + 1);
                } else {
                  navigate("/teacher/homework");
                }
              }}
              className="bg-[#695be6] text-white text-sm font-bold px-6 py-2.5 rounded-xl hover:bg-[#5a4dd4] transition-colors"
            >
              {currentStep < STEPS.length - 1 ? "Assign to All Groups" : "Finish & Assign"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
