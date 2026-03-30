import { useState, useEffect, useRef } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import {
  fetchStudentsByClass, generateAiQuestions,
  selectStudentsByClass, selectStudentsByClassStatus,
  selectGeneratedQuestions, selectGenerateStatus, selectGenerateError,
  clearGeneratedQuestions,
} from "../../store/slices/teacherSlice";
import {
  createHomework, patchHomeworkQuestions, assignHomework,
} from "../../store/slices/homeworkSlice";

const SUBJECTS = ["Mathematics","Physics","Chemistry","Biology","History","English","Computer Science"];
const CLASSES  = ["Class 6","Class 7","Class 8","Class 9","Class 10","Class 11","Class 12"];

const SUBMISSION_TYPES = [
  { id:"online_quiz", icon:"quiz",        label:"Online Quiz",      desc:"MCQ + typed answers in-app, auto-scored" },
  { id:"file_upload", icon:"upload_file", label:"File Upload",      desc:"Students upload PDF or image" },
  { id:"handwritten", icon:"draw",        label:"Handwritten Scan", desc:"Students photograph handwritten work" },
];

// ── Small reusable components ────────────────────────────────
function Pill({ active, onClick, children }) {
  return (
    <button onClick={onClick}
      className={`px-3 py-1.5 rounded-full text-xs font-bold border-2 transition-all ${
        active ? "border-[#695be6] bg-[#695be6] text-white" : "border-gray-200 text-gray-500 hover:border-gray-300"
      }`}>
      {children}
    </button>
  );
}

function ErrorBanner({ msg, onClose }) {
  if (!msg) return null;
  return (
    <div className="mb-4 flex items-center gap-2 bg-red-50 border border-red-200 rounded-xl px-4 py-3">
      <span className="material-symbols-outlined text-red-500 text-base">error</span>
      <p className="text-red-600 text-sm flex-1">{msg}</p>
      <button onClick={onClose}><span className="material-symbols-outlined text-red-400 text-base">close</span></button>
    </div>
  );
}

// ── Question card (expandable) ───────────────────────────────
function QuestionCard({ q, idx, onRemove }) {
  const [open, setOpen] = useState(false);
  const typeColor = { mcq:"text-blue-600 bg-blue-50", typed:"text-purple-600 bg-purple-50", upload:"text-orange-600 bg-orange-50" };
  return (
    <div className="bg-white border border-gray-100 rounded-xl shadow-sm overflow-hidden">
      <div className="flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-gray-50" onClick={() => setOpen(!open)}>
        <span className="size-7 rounded-full bg-[#695be6]/10 text-[#695be6] text-xs font-black flex items-center justify-center shrink-0">{idx+1}</span>
        <p className="flex-1 text-sm font-medium truncate">{q.question_text || "Untitled question"}</p>
        <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${typeColor[q.answer_type] || "bg-gray-100 text-gray-500"}`}>{q.answer_type}</span>
        <span className="text-xs text-gray-400 shrink-0">{q.max_points}pt</span>
        <button onClick={(e)=>{e.stopPropagation();onRemove(idx);}} className="p-1 hover:bg-red-50 rounded text-gray-300 hover:text-red-400">
          <span className="material-symbols-outlined text-base">delete</span>
        </button>
        <span className={`material-symbols-outlined text-gray-400 text-base transition-transform ${open?"rotate-180":""}`}>expand_more</span>
      </div>
      {open && (
        <div className="border-t border-gray-100 px-4 py-3 bg-gray-50 space-y-2">
          <p className="text-sm text-gray-700">{q.question_text}</p>
          {q.answer_type === "mcq" && q.options?.length > 0 && (
            <div className="grid grid-cols-2 gap-2 mt-2">
              {q.options.map((o) => (
                <div key={o.id} className={`text-xs px-3 py-2 rounded-lg border ${o.is_correct?"border-green-400 bg-green-50 text-green-700 font-bold":"border-gray-200 text-gray-600"}`}>
                  {o.is_correct && <span className="material-symbols-outlined text-xs mr-1">check</span>}{o.text}
                </div>
              ))}
            </div>
          )}
          {q.hint && <p className="text-xs text-amber-600 flex items-center gap-1"><span className="material-symbols-outlined text-sm">lightbulb</span>{q.hint}</p>}
          {q.sample_answer && <p className="text-xs text-slate-500"><span className="font-bold">Sample: </span>{q.sample_answer}</p>}
        </div>
      )}
    </div>
  );
}

// ── Student picker (Step 2) ──────────────────────────────────
function StudentPicker({ classLevel, selected, onToggle }) {
  const dispatch = useDispatch();
  const students = useSelector(selectStudentsByClass);
  const loading  = useSelector(selectStudentsByClassStatus) === "loading";

  useEffect(() => {
    if (classLevel) dispatch(fetchStudentsByClass(classLevel));
  }, [classLevel, dispatch]);

  if (loading) return <p className="text-xs text-gray-400 py-4 text-center">Loading students...</p>;
  if (!students.length) return (
    <p className="text-xs text-gray-400 py-4 text-center">
      No students found for {classLevel}.<br/>
      <span className="text-[10px]">Make sure students are registered with this class.</span>
    </p>
  );

  const allSelected = students.every((s) => selected.includes(s.id));
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between mb-1">
        <span className="text-xs text-gray-500">{selected.length}/{students.length} selected</span>
        <button onClick={() => students.forEach((s) => !selected.includes(s.id) && onToggle(s.id))}
          className="text-xs text-[#695be6] font-bold hover:underline">
          {allSelected ? "Deselect All" : "Select All"}
        </button>
      </div>
      <div className="max-h-56 overflow-y-auto space-y-1 pr-1" style={{scrollbarWidth:"thin"}}>
        {students.map((s) => {
          const isSel = selected.includes(s.id);
          return (
            <label key={s.id} className={`flex items-center gap-3 p-2.5 rounded-xl cursor-pointer border-2 transition-all ${isSel?"border-[#695be6] bg-[#695be6]/5":"border-gray-100 hover:border-gray-200"}`}>
              <div className={`size-5 rounded border-2 flex items-center justify-center shrink-0 ${isSel?"bg-[#695be6] border-[#695be6]":"border-gray-300"}`}>
                {isSel && <span className="material-symbols-outlined text-white text-xs">check</span>}
              </div>
              <div className="size-7 rounded-full bg-[#695be6]/10 flex items-center justify-center text-[#695be6] text-xs font-bold shrink-0">
                {s.name?.[0] || "?"}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{s.name}</p>
                {s.roll_no && <p className="text-[10px] text-gray-400">Roll #{s.roll_no}</p>}
              </div>
              <input type="checkbox" className="hidden" checked={isSel} onChange={() => onToggle(s.id)} />
            </label>
          );
        })}
      </div>
    </div>
  );
}

// ── Main page ────────────────────────────────────────────────
export default function CreateTest() {
  const navigate = useNavigate();
  const { } = useAuth();
  const dispatch = useDispatch();

  // ── State ──
  const [step,      setStep]      = useState(0);   // 0=setup  1=questions  2=assign
  const [hwId,      setHwId]      = useState(null); // DB id — created at end of step 0
  const [form,      setForm]      = useState({
    title: "", subject: "Mathematics", class_level: "Class 10",
    submission_type: "online_quiz", difficulty_level: "medium",
    estimated_duration_minutes: 45, instructions: "",
  });
  const [questions,    setQuestions]    = useState([]);
  const [aiConfig,     setAiConfig]     = useState({ topic:"", count:5, difficulty:"mixed", types:["mcq"] });
  const [selectedStu,  setSelectedStu]  = useState([]);  // student IDs for assignment
  const [dueDate,      setDueDate]      = useState("");
  const [generating,   setGenerating]   = useState(false);
  const [savingShell,  setSavingShell]  = useState(false); // step 0 → 1
  const [patchingQs,   setPatchingQs]   = useState(false); // auto-patch after generate
  const [assigning,    setAssigning]    = useState(false);
  const [error,        setError]        = useState("");
  const patchTimer = useRef(null);

  const f = (key) => (e) => setForm((p) => ({ ...p, [key]: e.target.value }));

  // ── Auto-patch questions to DB 800ms after any change ──────
  useEffect(() => {
    if (!hwId || questions.length === 0) return;
    clearTimeout(patchTimer.current);
    patchTimer.current = setTimeout(async () => {
      setPatchingQs(true);
      try {
        await dispatch(patchHomeworkQuestions({ id: hwId, questions })).unwrap();
      } catch { /* silent */ }
      finally { setPatchingQs(false); }
    }, 800);
    return () => clearTimeout(patchTimer.current);
  }, [questions, hwId]);

  // ── Step 0 → 1: create homework shell in DB ────────────────
  const handleSetupNext = async () => {
    if (!form.title.trim()) { setError("Add a title before continuing"); return; }
    setSavingShell(true);
    setError("");
    try {
      const data = await dispatch(createHomework({
        title:                       form.title,
        subject:                     form.subject,
        assigned_to_class:           form.class_level,
        description:                 form.instructions || "",
        submission_type:             form.submission_type,
        difficulty_level:            form.difficulty_level,
        estimated_duration_minutes:  +form.estimated_duration_minutes,
        instructions:                form.instructions,
        due_date:                    "TBD",
        questions:                   [],
        tags:                        [],
        assigned_students:           [],
        total_marks:                 0,
      })).unwrap();
      if (!data.id) throw new Error(data.detail || "No ID returned");
      setHwId(data.id);
      setStep(1);
    } catch (e) {
      setError(e.message || "Could not create homework. Is the backend running?");
    } finally {
      setSavingShell(false);
    }
  };

  // ── AI generate questions ──────────────────────────────────
  const handleGenerate = async () => {
    if (!aiConfig.topic.trim()) { setError("Enter a topic first"); return; }
    setGenerating(true);
    setError("");
    try {
      const data = await dispatch(generateAiQuestions({
        subject:        form.subject,
        topic:          aiConfig.topic,
        grade:          form.class_level.replace("Class", "Grade"),
        count:          aiConfig.count,
        difficulty:     aiConfig.difficulty,
        question_types: aiConfig.types,
      })).unwrap();
      if (Array.isArray(data) && data.length) {
        setQuestions((p) => [...p, ...data]);
      } else {
        setError("AI returned no questions. Try a different topic or check your API key.");
      }
    } catch {
      setError("Could not reach AI service.");
    } finally {
      setGenerating(false);
    }
  };

  // ── Step 1 → 2: ensure questions are patched, move on ─────
  const handleQuestionsNext = async () => {
    if (questions.length === 0) { setError("Add at least one question"); return; }
    // Force-patch now (don't wait for debounce)
    clearTimeout(patchTimer.current);
    setPatchingQs(true);
    try {
      await dispatch(patchHomeworkQuestions({ id: hwId, questions })).unwrap();
    } catch { /* continue anyway */ }
    finally { setPatchingQs(false); }
    setStep(2);
  };

  // ── Step 2: assign ─────────────────────────────────────────
  const handleAssign = async () => {
    if (!dueDate) { setError("Set a due date"); return; }
    if (selectedStu.length === 0) { setError("Select at least one student"); return; }
    setAssigning(true);
    setError("");
    try {
      await dispatch(assignHomework({ homework_id: hwId, student_ids: selectedStu, due_date: dueDate })).unwrap();
      navigate("/teacher/homework");
    } catch {
      setError("Assignment failed. Check backend.");
    } finally {
      setAssigning(false);
    }
  };

  const toggleStudent = (id) =>
    setSelectedStu((p) => p.includes(id) ? p.filter((x) => x !== id) : [...p, id]);

  const STEPS = ["Setup", "Questions", "Assign"];

  return (
    <div className="bg-[#faf9ff] min-h-screen" style={{ fontFamily:"'Lexend', sans-serif" }}>

      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-white border-b border-gray-200">
        <div className="max-w-5xl mx-auto px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button onClick={() => navigate("/teacher/homework")} className="p-2 hover:bg-gray-100 rounded-lg">
              <span className="material-symbols-outlined text-gray-500">arrow_back</span>
            </button>
            <div>
              <h1 className="font-black text-sm leading-tight">Create Homework / Test</h1>
              {hwId && <p className="text-[10px] text-gray-400">Draft ID: {hwId}</p>}
            </div>
          </div>

          {/* Step breadcrumb */}
          <div className="flex items-center gap-1">
            {STEPS.map((s, i) => (
              <div key={s} className="flex items-center gap-1">
                <div className={`flex items-center gap-1.5 text-xs font-bold px-3 py-1 rounded-full transition-colors ${
                  step === i ? "bg-[#695be6] text-white" : i < step ? "text-[#695be6]" : "text-gray-400"
                }`}>
                  {i < step && <span className="material-symbols-outlined text-xs">check</span>}
                  {s}
                </div>
                {i < STEPS.length-1 && <span className="material-symbols-outlined text-gray-300 text-sm">chevron_right</span>}
              </div>
            ))}
          </div>

          {/* Context action */}
          {step === 0 && (
            <button onClick={handleSetupNext} disabled={savingShell}
              className="bg-[#695be6] text-white text-sm font-bold px-4 py-2 rounded-xl hover:bg-[#5a4dd4] disabled:opacity-50 transition-colors flex items-center gap-2">
              {savingShell ? <><span className="size-4 border-2 border-white/40 border-t-white rounded-full animate-spin"/>Saving...</> : "Next →"}
            </button>
          )}
          {step === 1 && (
            <button onClick={handleQuestionsNext} disabled={patchingQs || questions.length === 0}
              className="bg-[#695be6] text-white text-sm font-bold px-4 py-2 rounded-xl hover:bg-[#5a4dd4] disabled:opacity-50 transition-colors flex items-center gap-2">
              {patchingQs ? <><span className="size-4 border-2 border-white/40 border-t-white rounded-full animate-spin"/>Saving...</> : "Next →"}
            </button>
          )}
          {step === 2 && (
            <button onClick={handleAssign} disabled={assigning}
              className="bg-[#695be6] text-white text-sm font-bold px-4 py-2 rounded-xl hover:bg-[#5a4dd4] disabled:opacity-50 transition-colors flex items-center gap-2">
              {assigning ? <><span className="size-4 border-2 border-white/40 border-t-white rounded-full animate-spin"/>Assigning...</> : <><span className="material-symbols-outlined text-sm">send</span>Assign</>}
            </button>
          )}
        </div>
      </header>

      <div className="max-w-5xl mx-auto pt-20 px-6 pb-16">
        <ErrorBanner msg={error} onClose={() => setError("")} />

        {/* ── STEP 0: Setup ── */}
        {step === 0 && (
          <div className="space-y-5">
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
              <h3 className="font-black text-sm mb-4">Basic Details</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                  <label className="text-xs font-bold text-gray-500 mb-1 block">Title *</label>
                  <input value={form.title} onChange={f("title")} placeholder="e.g. Quadratic Equations — Unit Test"
                    className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-[#695be6]" />
                </div>
                <div>
                  <label className="text-xs font-bold text-gray-500 mb-1 block">Subject</label>
                  <select value={form.subject} onChange={f("subject")}
                    className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-[#695be6] bg-white">
                    {SUBJECTS.map((s) => <option key={s}>{s}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-bold text-gray-500 mb-1 block">Class</label>
                  <select value={form.class_level} onChange={f("class_level")}
                    className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-[#695be6] bg-white">
                    {CLASSES.map((c) => <option key={c}>{c}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-bold text-gray-500 mb-1 block">Difficulty</label>
                  <select value={form.difficulty_level} onChange={f("difficulty_level")}
                    className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-[#695be6] bg-white">
                    {["low","medium","high"].map((d) => <option key={d} value={d}>{d.charAt(0).toUpperCase()+d.slice(1)}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-bold text-gray-500 mb-1 block">Est. Duration (min)</label>
                  <input type="number" min={5} max={180} value={form.estimated_duration_minutes} onChange={f("estimated_duration_minutes")}
                    className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-[#695be6]" />
                </div>
                <div className="md:col-span-2">
                  <label className="text-xs font-bold text-gray-500 mb-1 block">Instructions (optional)</label>
                  <textarea value={form.instructions} onChange={f("instructions")} rows={2}
                    placeholder="Any special instructions for students..."
                    className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-[#695be6] resize-none" />
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
              <h3 className="font-black text-sm mb-4">Submission Type</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {SUBMISSION_TYPES.map((t) => (
                  <button key={t.id} onClick={() => setForm((p) => ({ ...p, submission_type: t.id }))}
                    className={`flex flex-col items-start gap-2 p-4 rounded-xl border-2 text-left transition-all ${
                      form.submission_type === t.id ? "border-[#695be6] bg-[#695be6]/5" : "border-gray-200 hover:border-gray-300"
                    }`}>
                    <div className={`size-10 rounded-xl flex items-center justify-center ${form.submission_type === t.id ? "bg-[#695be6] text-white" : "bg-gray-100 text-gray-500"}`}>
                      <span className="material-symbols-outlined">{t.icon}</span>
                    </div>
                    <p className="font-black text-sm">{t.label}</p>
                    <p className="text-xs text-gray-400">{t.desc}</p>
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ── STEP 1: Questions ── */}
        {step === 1 && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

            {/* AI generator panel — sticky sidebar */}
            <div className="lg:col-span-1">
              <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 sticky top-20 space-y-4">
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-[#695be6]">auto_awesome</span>
                  <h3 className="font-black text-sm">AI Question Generator</h3>
                </div>

                <div>
                  <label className="text-xs font-bold text-gray-500 mb-1 block">Topic / Chapter *</label>
                  <input value={aiConfig.topic} onChange={(e) => setAiConfig((p) => ({ ...p, topic: e.target.value }))}
                    placeholder="e.g. Quadratic Equations"
                    className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none focus:border-[#695be6]" />
                </div>

                <div>
                  <label className="text-xs font-bold text-gray-500 mb-1 block">Number of Questions</label>
                  <input type="number" min={1} max={20} value={aiConfig.count}
                    onChange={(e) => setAiConfig((p) => ({ ...p, count: +e.target.value }))}
                    className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none focus:border-[#695be6]" />
                </div>

                <div>
                  <label className="text-xs font-bold text-gray-500 mb-1 block">Difficulty</label>
                  <div className="flex gap-2 flex-wrap">
                    {["easy","medium","hard","mixed"].map((d) => (
                      <Pill key={d} active={aiConfig.difficulty===d} onClick={() => setAiConfig((p) => ({ ...p, difficulty:d }))}>{d}</Pill>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="text-xs font-bold text-gray-500 mb-1 block">Question Types</label>
                  <div className="flex gap-2 flex-wrap">
                    {["mcq","typed","upload"].map((t) => (
                      <Pill key={t} active={aiConfig.types.includes(t)}
                        onClick={() => setAiConfig((p) => ({
                          ...p, types: p.types.includes(t) ? p.types.filter((x) => x!==t) : [...p.types, t]
                        }))}>
                        {t}
                      </Pill>
                    ))}
                  </div>
                </div>

                <button onClick={handleGenerate} disabled={generating}
                  className="w-full flex items-center justify-center gap-2 bg-[#695be6] text-white font-bold py-3 rounded-xl hover:bg-[#5a4dd4] disabled:opacity-50 transition-colors">
                  {generating
                    ? <><span className="size-4 border-2 border-white/40 border-t-white rounded-full animate-spin"/>Generating...</>
                    : <><span className="material-symbols-outlined text-base">auto_awesome</span>Generate</>
                  }
                </button>

                <div className="pt-3 border-t border-gray-100 flex items-center justify-between">
                  <p className="text-xs text-gray-400">{questions.length} question{questions.length!==1?"s":""} · {questions.reduce((s,q)=>s+(q.max_points||1),0)} marks</p>
                  {patchingQs && <span className="text-[10px] text-[#695be6] flex items-center gap-1"><span className="size-3 border border-[#695be6]/40 border-t-[#695be6] rounded-full animate-spin"/>saving...</span>}
                  {!patchingQs && hwId && questions.length > 0 && <span className="text-[10px] text-green-600 flex items-center gap-1"><span className="material-symbols-outlined text-xs">cloud_done</span>saved</span>}
                </div>
                {questions.length > 0 && (
                  <button onClick={() => setQuestions([])} className="w-full text-xs text-red-400 hover:underline">Clear all questions</button>
                )}
              </div>
            </div>

            {/* Questions list */}
            <div className="lg:col-span-2 space-y-3">
              <h3 className="font-black text-base">Questions ({questions.length})</h3>
              {questions.length === 0 ? (
                <div className="bg-white rounded-xl border-2 border-dashed border-gray-200 p-12 text-center">
                  <span className="material-symbols-outlined text-4xl text-gray-300 mb-3 block">quiz</span>
                  <p className="text-gray-400 font-medium">No questions yet</p>
                  <p className="text-xs text-gray-300 mt-1">Use the AI generator on the left to create questions</p>
                </div>
              ) : (
                questions.map((q, i) => (
                  <QuestionCard key={q.id||i} q={q} idx={i}
                    onRemove={(idx) => setQuestions((p) => p.filter((_,j) => j!==idx))} />
                ))
              )}
            </div>
          </div>
        )}

        {/* ── STEP 2: Assign ── */}
        {step === 2 && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 max-w-3xl mx-auto">

            {/* Left: summary */}
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6 space-y-4">
              <div className="flex items-center gap-3">
                <div className="size-12 rounded-xl bg-green-100 flex items-center justify-center">
                  <span className="material-symbols-outlined text-green-600">check_circle</span>
                </div>
                <div>
                  <h3 className="font-black">Homework Ready</h3>
                  <p className="text-xs text-gray-400">{questions.length} questions · {questions.reduce((s,q)=>s+(q.max_points||1),0)} marks</p>
                </div>
              </div>

              <div className="bg-[#695be6]/5 rounded-xl p-4 text-sm space-y-2">
                <p><span className="font-bold">Title:</span> {form.title}</p>
                <p><span className="font-bold">Subject:</span> {form.subject} · {form.class_level}</p>
                <p><span className="font-bold">Submission:</span> {SUBMISSION_TYPES.find((t)=>t.id===form.submission_type)?.label}</p>
                <p><span className="font-bold">Difficulty:</span> {form.difficulty_level}</p>
                <p><span className="font-bold">Duration:</span> {form.estimated_duration_minutes} min</p>
              </div>

              <div>
                <label className="text-xs font-bold text-gray-500 mb-1 block">Due Date *</label>
                <input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)}
                  className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-[#695be6]" />
              </div>

              <div className="pt-2 border-t border-gray-100">
                <p className="text-xs text-gray-500 mb-2">
                  <span className="font-bold text-[#695be6]">{selectedStu.length}</span> student{selectedStu.length!==1?"s":""} selected
                </p>
                <button onClick={handleAssign} disabled={assigning || !dueDate || selectedStu.length===0}
                  className="w-full flex items-center justify-center gap-2 bg-[#695be6] text-white font-bold py-3.5 rounded-xl hover:bg-[#5a4dd4] disabled:opacity-50 transition-colors shadow-lg shadow-[#695be6]/20">
                  {assigning
                    ? <><span className="size-4 border-2 border-white/40 border-t-white rounded-full animate-spin"/>Assigning...</>
                    : <><span className="material-symbols-outlined">send</span>Assign to {selectedStu.length} Student{selectedStu.length!==1?"s":""}</>
                  }
                </button>
              </div>
            </div>

            {/* Right: student picker */}
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
              <h3 className="font-black text-sm mb-4">Select Students — {form.class_level}</h3>
              <StudentPicker
                classLevel={form.class_level}
                selected={selectedStu}
                onToggle={toggleStudent}
              />
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
