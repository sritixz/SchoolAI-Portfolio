import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { getInitial } from "../../utils/nameUtils";
import { useDispatch, useSelector } from "react-redux";
import {
  createHomework, updateHomework, assignHomework, fetchHomeworkById,
  selectCurrentHomework,
} from "../../store/slices/homeworkSlice";
import {
  fetchMySections,
} from "../../store/slices/teacherSlice";
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
  const { user } = useAuth();
  const dispatch = useDispatch();
  const [searchParams] = useSearchParams();
  const editId = searchParams.get("edit");
  const fromId = searchParams.get("from");
  const templateId = editId || fromId;

  const apiHw = useSelector(selectCurrentHomework);

  const [subject, setSubject] = useState("");
  const [chapter, setChapter] = useState("");
  const [hwType, setHwType] = useState("online_quiz");
  const [activeTopic, setActiveTopic] = useState("stoich");
  const [questions, setQuestions] = useState(questionBank);
  const [qSearch, setQSearch] = useState("");
  const [assignTarget, setAssignTarget] = useState("Entire Class");
  const [selectedClass, setSelectedClass] = useState("");
  const [sections, setSections] = useState([]);
  const [dueDate, setDueDate] = useState("");
  const [dueTime, setDueTime] = useState("");
  const [allowRetries, setAllowRetries] = useState(false);
  const [aiAssistantEnabled, setAiAssistantEnabled] = useState(true);
  const [instructions, setInstructions] = useState("");
  const [summaryOpen, setSummaryOpen] = useState(true);
  const [saving, setSaving] = useState(false);
  const [dateError, setDateError] = useState("");

  // Load teacher's sections for the class dropdown
  useEffect(() => {
    dispatch(fetchMySections()).then((res) => {
      if (res.payload?.length) {
        setSections(res.payload);
        setSelectedClass(res.payload[0].class_name || "");
      }
    });
  }, [dispatch]);

  // Pre-fill form when editing or using as template
  useEffect(() => {
    if (templateId) dispatch(fetchHomeworkById(templateId));
  }, [templateId, dispatch]);

  useEffect(() => {
    if (!apiHw || apiHw._id !== templateId) return;
    setSubject(apiHw.subject || "");
    setHwType(apiHw.submission_type || "online_quiz");
    setAllowRetries(apiHw.allow_retries || false);
    setAiAssistantEnabled(apiHw.ai_assistant_enabled !== false);
    setInstructions(apiHw.instructions || "");
    setDueDate(apiHw.due_date ? apiHw.due_date.split("T")[0] : "");
    if (apiHw.assigned_to_class) setSelectedClass(apiHw.assigned_to_class);
  }, [apiHw, templateId]);

  // Map UI type keys to backend SubmissionType enum
  const HW_TYPE_MAP = {
    online_quiz: "online_quiz",
    file_upload: "file_upload",
    handwritten: "handwritten",
    // legacy UI keys
    online:  "online_quiz",
    offline: "file_upload",
    guided:  "online_quiz",
    mixed:   "online_quiz",
  };

  const toggleQuestion = (id) =>
    setQuestions((prev) => prev.map((q) => q.id === id ? { ...q, selected: !q.selected } : q));

  const selectedQs    = questions.filter((q) => q.selected);
  const totalMarks    = selectedQs.reduce((s, q) => s + q.marks, 0);
  const totalMinutes  = selectedQs.reduce((s, q) => s + q.timeMinutes, 0);

  const validateDueDate = (val) => {
    if (!val) { setDateError(""); return true; }
    const selected = new Date(val);
    const today = new Date(); today.setHours(0, 0, 0, 0);
    if (selected < today) {
      setDateError("Due date cannot be in the past");
      return false;
    }
    setDateError("");
    return true;
  };

  const handleAssign = async () => {
    if (!subject) return alert("Please select a subject");
    if (!selectedClass) return alert("Please select a class");
    if (!dueDate) return alert("Please set a due date");
    if (!validateDueDate(dueDate)) return;

    setSaving(true);
    try {
      const submissionType = HW_TYPE_MAP[hwType] || "online_quiz";
      const payload = {
        subject,
        title: `${subject} — ${chapter || "Homework"}`,
        description: instructions || "",
        assigned_to_class: selectedClass,
        assigned_students: [],
        due_date: dueTime ? `${dueDate}T${dueTime}:00` : `${dueDate}T23:59:00`,
        submission_type: submissionType,
        difficulty_level: "medium",
        estimated_duration_minutes: totalMinutes || 30,
        questions: selectedQs.map((q, i) => ({
          id: q.id,
          question_number: i + 1,
          total_questions: selectedQs.length,
          question_text: q.text,
          answer_type: submissionType === "online_quiz" ? "mcq" : "upload",
          options: [],
          max_points: q.marks,
        })),
        tags: [chapter].filter(Boolean),
        total_marks: totalMarks,
        instructions,
        ai_assistant_enabled: aiAssistantEnabled,
        allow_retries: allowRetries,
      };

      let hwId;
      if (editId) {
        await dispatch(updateHomework({ id: editId, ...payload })).unwrap();
        hwId = editId;
      } else {
        const res = await dispatch(createHomework(payload)).unwrap();
        hwId = res.id;
        // Assign to class
        await dispatch(assignHomework({ homework_id: hwId, student_ids: [], due_date: payload.due_date })).unwrap();
      }
      navigate("/teacher/homework");
    } catch (err) {
      alert("Failed to save homework. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="bg-[#fdf4ff] min-h-screen" style={{ fontFamily: "'Lexend', sans-serif" }}>

      {/* Header */}
      <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-[#eee8f3] shadow-sm">
        <div className="max-w-[1920px] mx-auto px-4 sm:px-6 lg:px-10 xl:px-16 h-14 sm:h-16 flex items-center justify-between">
          <div className="flex items-center gap-2 sm:gap-4">
            <div className="size-6 sm:size-8 text-[#932ce2]">
              <svg fill="none" viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg">
                <path clipRule="evenodd" d="M24 18.4228L42 11.475V34.3663C42 34.7796 41.7457 35.1504 41.3601 35.2992L24 42V18.4228Z" fill="currentColor" fillRule="evenodd"></path>
                <path clipRule="evenodd" d="M24 8.18819L33.4123 11.574L24 15.2071L14.5877 11.574L24 8.18819ZM9 15.8487L21 20.4805V37.6263L9 32.9945V15.8487ZM27 37.6263V20.4805L39 15.8487V32.9945L27 37.6263ZM25.354 2.29885C24.4788 1.98402 23.5212 1.98402 22.646 2.29885L4.98454 8.65208C3.7939 9.08038 3 10.2097 3 11.475V34.3663C3 36.0196 4.01719 37.5026 5.55962 38.098L22.9197 44.7987C23.6149 45.0671 24.3851 45.0671 25.0803 44.7987L42.4404 38.098C43.9828 37.5026 45 36.0196 45 34.3663V11.475C45 10.2097 44.2061 9.08038 43.0155 8.65208L25.354 2.29885Z" fill="currentColor" fillRule="evenodd"></path>
              </svg>
            </div>
            <h2 className="text-base sm:text-lg font-bold leading-tight tracking-[-0.015em] hidden sm:block">TrueSchoolAI</h2>
            <h2 className="text-sm font-bold leading-tight tracking-[-0.015em] sm:hidden">TrueSchoolAI</h2>
          </div>
          <nav className="hidden lg:flex items-center gap-4 xl:gap-8">
            <button onClick={() => navigate("/teacher")} className="text-sm font-medium text-gray-600 hover:text-[#932ce2] transition-colors">Dashboard</button>
            <button onClick={() => navigate("/teacher/homework")} className="text-sm font-medium text-gray-600 hover:text-[#932ce2] transition-colors">Classes</button>
            <button className="text-sm font-bold text-[#932ce2]">Homework</button>
            <button onClick={() => navigate("/teacher/analytics")} className="text-sm font-medium text-gray-600 hover:text-[#932ce2] transition-colors">Reports</button>
          </nav>
          <div className="flex items-center gap-1 sm:gap-2">
            <button className="hidden sm:flex items-center justify-center rounded-lg h-8 w-8 sm:h-10 sm:w-10 bg-[#eee8f3] hover:bg-[#ddd1e6] transition-colors">
              <span className="material-symbols-outlined text-[20px] sm:text-[24px]">notifications</span>
            </button>
            <button className="hidden sm:flex items-center justify-center rounded-lg h-8 w-8 sm:h-10 sm:w-10 bg-[#eee8f3] hover:bg-[#ddd1e6] transition-colors">
              <span className="material-symbols-outlined text-[20px] sm:text-[24px]">settings</span>
            </button>
            <div className="size-8 sm:size-10 rounded-full bg-[#932ce2] flex items-center justify-center text-white font-bold text-xs sm:text-sm border-2 border-[#932ce2]">{getInitial(user?.name) || "T"}</div>
          </div>
        </div>
      </header>

      <main className="flex-1 w-full px-4 sm:px-6 lg:px-10 xl:px-16 py-6 sm:py-8 lg:py-10 pb-32 sm:pb-36 lg:pb-40">
        <div className="max-w-[1920px] mx-auto">
          <div className="mb-6 sm:mb-8 lg:mb-10">
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black leading-tight tracking-tight mb-2">{editId ? "Edit Homework" : "Create New Homework"}</h1>
            <p className="text-sm sm:text-base lg:text-lg text-[#775095] font-normal">{editId ? "Update the homework details and save changes." : "Select topics, questions, and assign settings for your students."}</p>
          </div>

          {/* Section 1: Basic Information */}
          <section className="mb-6 sm:mb-8 bg-white rounded-xl shadow-sm border border-[#eee8f3] overflow-hidden">
            <div className="p-4 sm:p-6 border-b border-[#eee8f3] bg-gray-50">
              <h2 className="text-lg sm:text-xl font-bold flex items-center gap-2">
                <span className="material-symbols-outlined text-[#932ce2] text-[20px] sm:text-[24px]">info</span>
                Section 1: Basic Information
              </h2>
            </div>
            <div className="p-4 sm:p-6 lg:p-8 grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6 lg:gap-8">
              <div className="flex flex-col gap-2">
                <label className="text-xs sm:text-sm font-semibold flex items-center gap-2">
                  <span className="material-symbols-outlined text-sm">science</span>
                  Subject Selection
                </label>
                <select
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  className="form-select w-full rounded-lg border-[#ddd1e6] bg-transparent h-12 sm:h-14 px-3 sm:px-4 focus:ring-[#932ce2] focus:border-[#932ce2] text-sm sm:text-base"
                >
                  <option value="">Select Subject (e.g. Math, Chemistry)</option>
                  {homeworkSubjects.map((s) => <option key={s}>{s}</option>)}
                </select>
              </div>
              <div className="flex flex-col gap-2">
                <label className="text-xs sm:text-sm font-semibold flex items-center gap-2">
                  <span className="material-symbols-outlined text-sm">auto_stories</span>
                  Chapter Selection
                </label>
                <select
                  value={chapter}
                  onChange={(e) => setChapter(e.target.value)}
                  className="form-select w-full rounded-lg border-[#ddd1e6] bg-transparent h-12 sm:h-14 px-3 sm:px-4 focus:ring-[#932ce2] focus:border-[#932ce2] text-sm sm:text-base"
                >
                  <option value="">Select Chapter</option>
                  {homeworkChapters.map((c) => <option key={c}>{c}</option>)}
                </select>
              </div>
            </div>
          </section>

          {/* Section 2: Homework Type & Questions */}
          <section className="mb-6 sm:mb-8 bg-white rounded-xl shadow-sm border border-[#eee8f3] overflow-hidden">
            <div className="p-4 sm:p-6 border-b border-[#eee8f3] bg-gray-50">
              <h2 className="text-lg sm:text-xl font-bold flex items-center gap-2">
                <span className="material-symbols-outlined text-[#932ce2] text-[20px] sm:text-[24px]">quiz</span>
                Section 2: Homework Type & Questions
              </h2>
            </div>
            <div className="p-4 sm:p-6 lg:p-8">
              {/* Type Selector */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-6 sm:mb-8 lg:mb-10">
                {homeworkTypes.map((t) => (
                  <div
                    key={t.id}
                    onClick={() => setHwType(t.id)}
                    className={`cursor-pointer border-2 rounded-xl p-3 sm:p-4 lg:p-5 flex flex-col items-center text-center gap-2 sm:gap-3 transition-all ${
                      hwType === t.id ? "border-[#932ce2] bg-[#932ce2]/5" : "border-[#eee8f3] hover:border-[#932ce2]/50 bg-white"
                    }`}
                  >
                    <span className={`material-symbols-outlined text-3xl sm:text-4xl ${hwType === t.id ? "text-[#932ce2]" : "text-[#775095]"}`}>
                      {t.icon}
                    </span>
                    <div>
                      <h3 className={`font-bold text-xs sm:text-sm ${hwType === t.id ? "text-[#932ce2]" : ""}`}>{t.label}</h3>
                      <p className="text-[10px] sm:text-xs text-[#775095] mt-0.5">{t.desc}</p>
                    </div>
                  </div>
                ))}
              </div>

              {/* Question Interface */}
              <div className="flex flex-col lg:flex-row border border-[#eee8f3] rounded-xl h-[400px] sm:h-[500px] lg:h-[600px] overflow-hidden">
                {/* Left Panel: Topics */}
                <div className="w-full lg:w-1/3 bg-gray-50 border-b lg:border-b-0 lg:border-r border-[#eee8f3] overflow-y-auto max-h-[200px] lg:max-h-full">
                  <div className="p-3 sm:p-4 bg-white border-b border-[#eee8f3]">
                    <h4 className="font-bold text-xs sm:text-sm uppercase tracking-wider text-[#775095]">Topic Filters</h4>
                  </div>
                  <ul className="flex flex-col">
                    {topicFilters.map((t, idx) => (
                      <li
                        key={t.id}
                        onClick={() => setActiveTopic(t.id)}
                        className={`p-3 sm:p-4 cursor-pointer flex justify-between items-center transition-colors text-sm ${
                          activeTopic === t.id 
                            ? "bg-[#932ce2]/10 border-l-4 border-[#932ce2] font-semibold" 
                            : "border-b border-[#eee8f3] hover:bg-gray-100"
                        }`}
                      >
                        <span className="text-xs sm:text-sm">{t.label}</span>
                        <span className={`text-[10px] sm:text-xs px-2 py-0.5 rounded-full ${
                          activeTopic === t.id ? "bg-[#932ce2] text-white" : "bg-gray-200 text-gray-700"
                        }`}>{t.count}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Right Panel: Search & List */}
                <div className="w-full lg:w-2/3 flex flex-col bg-white">
                  <div className="p-3 sm:p-4 border-b border-[#eee8f3] flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-3">
                    <div className="relative flex-1">
                      <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-[18px] sm:text-[20px]">search</span>
                      <input
                        value={qSearch}
                        onChange={(e) => setQSearch(e.target.value)}
                        className="w-full pl-9 sm:pl-10 pr-3 rounded-lg border-[#eee8f3] bg-gray-50 focus:ring-[#932ce2] h-9 sm:h-10 text-xs sm:text-sm"
                        placeholder="Search questions..."
                        type="text"
                      />
                    </div>
                    <button className="flex items-center justify-center gap-2 text-xs sm:text-sm font-semibold text-[#932ce2] px-3 h-9 sm:h-10 border border-[#932ce2]/20 rounded-lg hover:bg-[#932ce2]/5 whitespace-nowrap">
                      <span className="material-symbols-outlined text-sm">filter_list</span>
                      <span className="hidden sm:inline">Filter</span>
                    </button>
                  </div>
                  <div className="flex-1 overflow-y-auto">
                    {questions
                      .filter((q) => q.text.toLowerCase().includes(qSearch.toLowerCase()))
                      .map((q) => (
                        <div
                          key={q.id}
                          onClick={() => toggleQuestion(q.id)}
                          className={`p-3 sm:p-4 border-b border-[#eee8f3] hover:bg-[#932ce2]/5 transition-colors flex gap-3 sm:gap-4 cursor-pointer ${
                            q.selected ? "bg-[#932ce2]/5" : ""
                          }`}
                        >
                          <input
                            checked={q.selected}
                            onChange={() => toggleQuestion(q.id)}
                            className="mt-1 rounded border-gray-300 text-[#932ce2] focus:ring-[#932ce2] w-4 h-4"
                            type="checkbox"
                          />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1 flex-wrap">
                              <span className={`text-[9px] sm:text-[10px] uppercase font-bold px-2 py-0.5 rounded-full ${q.diffColor}`}>{q.difficulty}</span>
                              <span className="text-[9px] sm:text-[10px] text-gray-400">{q.id_code}</span>
                            </div>
                            <p className="text-xs sm:text-sm font-medium mb-2 sm:mb-3">{q.text}</p>
                            <div className="flex items-center gap-3 sm:gap-4 text-[10px] sm:text-xs text-gray-500">
                              <span className="flex items-center gap-1">
                                <span className="material-symbols-outlined text-xs">stars</span> {q.marks} Marks
                              </span>
                              <span className="flex items-center gap-1">
                                <span className="material-symbols-outlined text-xs">timer</span> {q.timeMinutes} mins
                              </span>
                            </div>
                          </div>
                        </div>
                      ))}
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* Section 3: Assignment Settings */}
          <section className="mb-6 sm:mb-8 bg-white rounded-xl shadow-sm border border-[#eee8f3] overflow-hidden">
            <div className="p-4 sm:p-6 border-b border-[#eee8f3] bg-gray-50">
              <h2 className="text-lg sm:text-xl font-bold flex items-center gap-2">
                <span className="material-symbols-outlined text-[#932ce2] text-[20px] sm:text-[24px]">event_available</span>
                Section 3: Assignment Settings
              </h2>
            </div>
            <div className="p-4 sm:p-6 lg:p-8">
              {/* Class selector */}
              <div className="mb-6">
                <label className="text-xs sm:text-sm font-semibold block mb-2">Assign To Class</label>
                <select
                  value={selectedClass}
                  onChange={(e) => setSelectedClass(e.target.value)}
                  className="form-select w-full sm:w-72 rounded-lg border-[#ddd1e6] bg-transparent h-10 sm:h-12 px-3 focus:ring-[#932ce2] focus:border-[#932ce2] text-sm"
                >
                  {sections.length === 0 && <option value="">Loading classes...</option>}
                  {sections.map((s) => (
                    <option key={s._id || s.class_name} value={s.class_name}>{s.class_name}</option>
                  ))}
                </select>
              </div>

              {/* Tabbed Interface */}
              <div className="flex gap-1 p-1 bg-gray-100 rounded-xl w-full sm:w-fit mb-6 sm:mb-8 overflow-x-auto">
                {assignmentTargets.map((t) => (
                  <button
                    key={t}
                    onClick={() => setAssignTarget(t)}
                    className={`px-4 sm:px-6 py-2 rounded-lg font-bold text-xs sm:text-sm transition-colors whitespace-nowrap ${
                      assignTarget === t ? "bg-white text-[#932ce2] shadow-sm" : "text-gray-500 hover:text-[#932ce2]"
                    }`}
                  >
                    {t}
                  </button>
                ))}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 sm:gap-8 lg:gap-10">
                <div className="flex flex-col gap-4 sm:gap-6">
                  <div className="flex flex-col gap-2">
                    <label className="text-xs sm:text-sm font-semibold">Due Date & Time</label>
                    <div className="flex gap-3 sm:gap-4">
                      <input
                        type="date"
                        value={dueDate}
                        min={new Date().toISOString().split("T")[0]}
                        onChange={(e) => { setDueDate(e.target.value); validateDueDate(e.target.value); }}
                        className="flex-1 rounded-lg border-[#ddd1e6] bg-transparent focus:ring-[#932ce2] h-10 sm:h-12 text-sm"
                      />
                      <input
                        type="time"
                        value={dueTime}
                        onChange={(e) => setDueTime(e.target.value)}
                        className="w-24 sm:w-32 rounded-lg border-[#ddd1e6] bg-transparent focus:ring-[#932ce2] h-10 sm:h-12 text-sm"
                      />
                    </div>
                    {dateError && <p className="text-xs text-red-500 font-medium">{dateError}</p>}
                  </div>
                  <div className="flex items-center justify-between p-3 sm:p-4 border border-[#eee8f3] rounded-xl">
                    <div className="flex flex-col">
                      <span className="font-bold text-sm">Allow Retries</span>
                      <span className="text-xs text-gray-500">Let students attempt more than once</span>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer flex-shrink-0 ml-2">
                      <input
                        checked={allowRetries}
                        onChange={() => setAllowRetries(!allowRetries)}
                        className="sr-only peer"
                        type="checkbox"
                      />
                      <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#932ce2]"></div>
                    </label>
                  </div>
                  <div className="flex items-center justify-between p-3 sm:p-4 border border-[#eee8f3] rounded-xl">
                    <div className="flex flex-col">
                      <span className="font-bold text-sm">LumiTutor</span>
                      <span className="text-xs text-gray-500">Allow students to use LumiTutor for help</span>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer flex-shrink-0 ml-2">
                      <input
                        checked={aiAssistantEnabled}
                        onChange={() => setAiAssistantEnabled(!aiAssistantEnabled)}
                        className="sr-only peer"
                        type="checkbox"
                      />
                      <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#932ce2]"></div>
                    </label>
                  </div>
                </div>
                <div className="flex flex-col gap-4 sm:gap-6">
                  <div className="flex flex-col gap-2">
                    <div className="flex items-center justify-between">
                      <label className="text-xs sm:text-sm font-semibold">Resources & Instructions</label>
                      <span className="material-symbols-outlined text-gray-400 cursor-pointer text-[20px]">expand_less</span>
                    </div>
                    <textarea
                      value={instructions}
                      onChange={(e) => setInstructions(e.target.value)}
                      className="w-full rounded-lg border-[#ddd1e6] bg-transparent focus:ring-[#932ce2] text-xs sm:text-sm p-3 sm:p-4"
                      placeholder="Add any special instructions or resource links for the students..."
                      rows="4"
                    />
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* Section 4: Preview & Submit */}
          <section className="bg-[#932ce2]/5 rounded-xl border-2 border-dashed border-[#932ce2]/30 p-4 sm:p-6 lg:p-8 mb-4">
            <div className="flex items-center justify-between cursor-pointer" onClick={() => setSummaryOpen(!summaryOpen)}>
              <div className="flex items-center gap-3 sm:gap-4">
                <div className="p-2 sm:p-3 bg-[#932ce2] rounded-lg text-white flex-shrink-0">
                  <span className="material-symbols-outlined text-[20px] sm:text-[24px]">summarize</span>
                </div>
                <div className="min-w-0">
                  <h2 className="text-base sm:text-lg font-bold">Homework Summary</h2>
                  <p className="text-xs sm:text-sm text-[#775095]">You have selected {selectedQs.length} questions across {topicFilters.length} topics.</p>
                </div>
              </div>
              <span className="material-symbols-outlined text-[#932ce2] font-bold flex-shrink-0 ml-2">
                {summaryOpen ? "keyboard_arrow_up" : "keyboard_arrow_down"}
              </span>
            </div>
          </section>
        </div>
      </main>

      {/* Sticky Footer */}
      <footer className="fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-md border-t border-[#eee8f3] px-4 sm:px-6 lg:px-10 py-3 sm:py-4 shadow-[0_-4px_10px_rgba(0,0,0,0.05)] z-[60]">
        <div className="max-w-[1920px] mx-auto flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 sm:gap-4">
          <div className="hidden lg:flex gap-6 xl:gap-10">
            <div className="flex flex-col">
              <span className="text-[10px] uppercase text-gray-500 font-bold">Total Questions</span>
              <span className="text-base lg:text-lg font-bold">{selectedQs.length}</span>
            </div>
            <div className="flex flex-col border-l border-gray-200 pl-6 xl:pl-10">
              <span className="text-[10px] uppercase text-gray-500 font-bold">Total Marks</span>
              <span className="text-base lg:text-lg font-bold">{totalMarks} pts</span>
            </div>
            <div className="flex flex-col border-l border-gray-200 pl-6 xl:pl-10">
              <span className="text-[10px] uppercase text-gray-500 font-bold">Target</span>
              <span className="text-base lg:text-lg font-bold">Class 10A</span>
            </div>
          </div>
          <div className="flex gap-2 sm:gap-3 lg:gap-4 w-full sm:w-auto">
            <button
              onClick={() => navigate(`/teacher/homework/preview/${editId || "new"}`)}
              className="flex-1 sm:flex-none px-6 sm:px-8 lg:px-10 py-2.5 sm:py-3 rounded-xl border-2 border-[#932ce2] text-[#932ce2] font-bold text-sm hover:bg-[#932ce2]/5 transition-colors">
              Preview
            </button>
            <button
              onClick={handleAssign}
              disabled={saving}
              className="flex-1 sm:flex-none px-8 sm:px-10 lg:px-12 py-2.5 sm:py-3 rounded-xl bg-[#932ce2] text-white font-bold text-sm shadow-lg shadow-[#932ce2]/20 hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-50 flex items-center gap-2"
            >
              {saving && <span className="size-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />}
              {editId ? "Save Changes" : "Assign Homework"}
            </button>
          </div>
        </div>
      </footer>
    </div>
  );
}
