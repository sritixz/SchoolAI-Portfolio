import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  homeworkSubjects,
  homeworkChapters,
  homeworkTypes,
  topicFilters,
  questionBank,
  assignmentTargets,
} from "../../data/teacher/createHomeworkData";

export default function CreateHomework() {
  const navigate = useNavigate();
  const [subject, setSubject] = useState("");
  const [chapter, setChapter] = useState("");
  const [hwType, setHwType] = useState("online");
  const [activeTopic, setActiveTopic] = useState("stoich");
  const [questions, setQuestions] = useState(questionBank);
  const [qSearch, setQSearch] = useState("");
  const [assignTarget, setAssignTarget] = useState("Entire Class");
  const [dueDate, setDueDate] = useState("");
  const [dueTime, setDueTime] = useState("");
  const [allowRetries, setAllowRetries] = useState(true);
  const [instructions, setInstructions] = useState("");
  const [summaryOpen, setSummaryOpen] = useState(true);

  const toggleQuestion = (id) =>
    setQuestions((prev) => prev.map((q) => q.id === id ? { ...q, selected: !q.selected } : q));

  const selectedQs    = questions.filter((q) => q.selected);
  const totalMarks    = selectedQs.reduce((s, q) => s + q.marks, 0);
  const totalMinutes  = selectedQs.reduce((s, q) => s + q.timeMinutes, 0);

  return (
    <div className="bg-[#faf9ff] min-h-screen" style={{ fontFamily: "'Lexend', sans-serif" }}>

      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-white border-b border-gray-200">
        <div className="max-w-[900px] mx-auto px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button onClick={() => navigate("/teacher/homework")} className="p-2 hover:bg-gray-100 rounded-lg">
              <span className="material-symbols-outlined text-gray-500">arrow_back</span>
            </button>
            <div className="size-7 bg-[#695be6] rounded-lg flex items-center justify-center text-white">
              <span className="material-symbols-outlined text-sm">assignment</span>
            </div>
            <span className="font-black text-base">EduAI Platform</span>
          </div>
          <nav className="hidden md:flex items-center gap-6 text-sm font-semibold text-gray-500">
            <button onClick={() => navigate("/teacher")} className="hover:text-gray-700">Dashboard</button>
            <button onClick={() => navigate("/teacher/homework")} className="hover:text-gray-700">Classes</button>
            <button className="text-[#695be6] border-b-2 border-[#695be6] pb-0.5">Homework</button>
            <button onClick={() => navigate("/teacher/analytics")} className="hover:text-gray-700">Reports</button>
          </nav>
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

      <main className="max-w-[900px] mx-auto pt-20 px-6 pb-28">
        <h1 className="text-2xl font-black mb-1">Create New Homework</h1>
        <p className="text-sm text-[#695be6] mb-6">Select topics, questions, and assign settings for your students.</p>

        {/* Section 1: Basic Information */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 mb-5">
          <h2 className="flex items-center gap-2 font-black text-sm mb-4">
            <span className="size-5 bg-blue-100 rounded-full flex items-center justify-center">
              <span className="material-symbols-outlined text-blue-600 text-xs">info</span>
            </span>
            Section 1: Basic Information
          </h2>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-bold text-gray-500 mb-1 block">Subject Selection</label>
              <div className="relative">
                <select
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  className="w-full border border-gray-200 rounded-xl pl-10 pr-4 py-2.5 text-sm outline-none focus:border-[#695be6] bg-white appearance-none"
                >
                  <option value="">Select Subject (e.g. Math, Chemistry)</option>
                  {homeworkSubjects.map((s) => <option key={s}>{s}</option>)}
                </select>
                <span className="absolute left-3 top-1/2 -translate-y-1/2 material-symbols-outlined text-gray-400 text-base">person</span>
              </div>
            </div>
            <div>
              <label className="text-xs font-bold text-gray-500 mb-1 block">Chapter Selection</label>
              <div className="relative">
                <select
                  value={chapter}
                  onChange={(e) => setChapter(e.target.value)}
                  className="w-full border border-gray-200 rounded-xl pl-10 pr-4 py-2.5 text-sm outline-none focus:border-[#695be6] bg-white appearance-none"
                >
                  <option value="">Select Chapter</option>
                  {homeworkChapters.map((c) => <option key={c}>{c}</option>)}
                </select>
                <span className="absolute left-3 top-1/2 -translate-y-1/2 material-symbols-outlined text-gray-400 text-base">menu_book</span>
              </div>
            </div>
          </div>
        </div>

        {/* Section 2: Homework Type & Questions */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 mb-5">
          <h2 className="flex items-center gap-2 font-black text-sm mb-4">
            <span className="size-5 bg-purple-100 rounded-full flex items-center justify-center">
              <span className="material-symbols-outlined text-purple-600 text-xs">quiz</span>
            </span>
            Section 2: Homework Type & Questions
          </h2>

          {/* Type Selector */}
          <div className="grid grid-cols-4 gap-3 mb-5">
            {homeworkTypes.map((t) => (
              <button
                key={t.id}
                onClick={() => setHwType(t.id)}
                className={`flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all ${
                  hwType === t.id ? "border-[#695be6] bg-[#695be6]/5" : "border-gray-100 hover:border-gray-200"
                }`}
              >
                <span className={`material-symbols-outlined text-2xl ${hwType === t.id ? "text-[#695be6]" : "text-gray-400"}`}>
                  {t.icon}
                </span>
                <p className={`text-xs font-black ${hwType === t.id ? "text-[#695be6]" : "text-gray-600"}`}>{t.label}</p>
                <p className="text-[10px] text-gray-400">{t.desc}</p>
              </button>
            ))}
          </div>

          {/* Question Bank */}
          <div className="flex gap-4">
            {/* Topic Filters */}
            <div className="w-44 flex-shrink-0">
              <p className="text-[10px] font-black text-gray-400 uppercase tracking-wide mb-2">Topic Filters</p>
              <div className="space-y-1">
                {topicFilters.map((t) => (
                  <button
                    key={t.id}
                    onClick={() => setActiveTopic(t.id)}
                    className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-sm transition-colors ${
                      activeTopic === t.id ? "bg-[#695be6] text-white" : "hover:bg-gray-50 text-gray-600"
                    }`}
                  >
                    <span className="font-semibold">{t.label}</span>
                    <span className={`text-xs font-bold px-1.5 py-0.5 rounded-full ${
                      activeTopic === t.id ? "bg-white/20 text-white" : "bg-gray-100 text-gray-500"
                    }`}>{t.count}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Questions */}
            <div className="flex-1">
              <div className="flex items-center gap-2 bg-gray-100 rounded-xl px-3 py-2 mb-3">
                <span className="material-symbols-outlined text-gray-400 text-sm">search</span>
                <input
                  value={qSearch}
                  onChange={(e) => setQSearch(e.target.value)}
                  className="bg-transparent text-sm outline-none w-full placeholder-gray-400"
                  placeholder="Search questions..."
                />
                <button className="flex items-center gap-1 text-xs font-semibold text-gray-500 border border-gray-200 px-2 py-1 rounded-lg">
                  <span className="material-symbols-outlined text-sm">filter_list</span> Filter
                </button>
              </div>
              <div className="space-y-2">
                {questions
                  .filter((q) => q.text.toLowerCase().includes(qSearch.toLowerCase()))
                  .map((q) => (
                    <div
                      key={q.id}
                      onClick={() => toggleQuestion(q.id)}
                      className={`flex items-start gap-3 p-3 rounded-xl border-2 cursor-pointer transition-all ${
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
                        </div>
                        <p className="text-sm font-semibold">{q.text}</p>
                        <div className="flex items-center gap-3 mt-1 text-[10px] text-gray-400">
                          <span className="flex items-center gap-1">
                            <span className="material-symbols-outlined text-xs">grade</span> {q.marks} Marks
                          </span>
                          <span className="flex items-center gap-1">
                            <span className="material-symbols-outlined text-xs">schedule</span> {q.timeMinutes} mins
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          </div>
        </div>

        {/* Section 3: Assignment Settings */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 mb-5">
          <h2 className="flex items-center gap-2 font-black text-sm mb-4">
            <span className="size-5 bg-green-100 rounded-full flex items-center justify-center">
              <span className="material-symbols-outlined text-green-600 text-xs">calendar_today</span>
            </span>
            Section 3: Assignment Settings
          </h2>

          {/* Target Tabs */}
          <div className="flex gap-1 mb-4">
            {assignmentTargets.map((t) => (
              <button
                key={t}
                onClick={() => setAssignTarget(t)}
                className={`text-xs font-bold px-4 py-2 rounded-full border-2 transition-colors ${
                  assignTarget === t ? "border-[#695be6] bg-[#695be6] text-white" : "border-gray-200 text-gray-600 hover:border-gray-300"
                }`}
              >
                {t}
              </button>
            ))}
          </div>

          <div className="grid grid-cols-2 gap-4 mb-4">
            <div>
              <label className="text-xs font-bold text-gray-500 mb-1 block">Due Date & Time</label>
              <div className="flex gap-2">
                <input
                  type="date"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  className="flex-1 border border-gray-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-[#695be6]"
                />
                <input
                  type="time"
                  value={dueTime}
                  onChange={(e) => setDueTime(e.target.value)}
                  className="w-28 border border-gray-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-[#695be6]"
                />
              </div>
            </div>
            <div>
              <label className="text-xs font-bold text-gray-500 mb-1 block">Resources & Instructions</label>
              <textarea
                value={instructions}
                onChange={(e) => setInstructions(e.target.value)}
                placeholder="Add any special instructions or resource links for the students..."
                className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none focus:border-[#695be6] resize-none h-20"
              />
            </div>
          </div>

          <label className="flex items-center gap-3 cursor-pointer">
            <div
              onClick={() => setAllowRetries(!allowRetries)}
              className={`w-10 h-5 rounded-full relative transition-colors ${allowRetries ? "bg-[#695be6]" : "bg-gray-200"}`}
            >
              <div className={`size-4 bg-white rounded-full absolute top-0.5 shadow-sm transition-transform ${allowRetries ? "translate-x-5" : "translate-x-0.5"}`} />
            </div>
            <div>
              <p className="text-sm font-bold">Allow Retries</p>
              <p className="text-xs text-gray-400">Let students attempt more than once</p>
            </div>
          </label>
        </div>

        {/* Homework Summary */}
        <div className="bg-[#695be6]/5 border border-[#695be6]/20 rounded-2xl p-4">
          <button
            onClick={() => setSummaryOpen(!summaryOpen)}
            className="w-full flex items-center justify-between"
          >
            <div className="flex items-center gap-3">
              <div className="size-8 bg-[#695be6] rounded-xl flex items-center justify-center text-white">
                <span className="material-symbols-outlined text-sm">assignment</span>
              </div>
              <div className="text-left">
                <p className="font-black text-sm">Homework Summary</p>
                <p className="text-xs text-gray-500">You have selected {selectedQs.length} questions across {topicFilters.length} topics.</p>
              </div>
            </div>
            <span className="material-symbols-outlined text-gray-400">
              {summaryOpen ? "expand_less" : "expand_more"}
            </span>
          </button>
        </div>
      </main>

      {/* Footer */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 px-6 py-3">
        <div className="max-w-[900px] mx-auto flex items-center justify-between">
          <div className="flex items-center gap-6 text-xs text-gray-500">
            <span><strong className="text-gray-700">TOTAL QUESTIONS</strong><br />{selectedQs.length}</span>
            <span><strong className="text-gray-700">TOTAL MARKS</strong><br />{totalMarks} pts</span>
            <span><strong className="text-gray-700">TARGET</strong><br />Class 10A</span>
          </div>
          <div className="flex gap-3">
            <button className="border border-gray-200 text-sm font-bold px-5 py-2.5 rounded-xl hover:bg-gray-50 transition-colors">
              Preview
            </button>
            <button
              onClick={() => navigate("/teacher/homework/differentiated")}
              className="border border-[#695be6] text-[#695be6] text-sm font-bold px-5 py-2.5 rounded-xl hover:bg-[#695be6]/5 transition-colors"
            >
              Differentiated
            </button>
            <button className="bg-[#695be6] text-white text-sm font-bold px-6 py-2.5 rounded-xl hover:bg-[#5a4dd4] transition-colors">
              Assign Homework
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
