import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import {
  runAiTool, selectAiToolResult, selectAiToolStatus, clearAiToolResult,
  fetchMyStudents, selectMyStudents,
  setDiffContext, addDiffAssignment, selectDiffContext, selectDiffAssignments,
  fetchGroups, bulkSaveGroups, createGroup, updateGroup, deleteGroup,
  selectGroups, selectGroupsStatus,
} from "../../store/slices/teacherSlice";
import { fetchHomeworkLibrary, selectHomeworkLibrary, selectLibraryStatus } from "../../store/slices/homeworkSlice";
import { diffHomeworkSubjects, diffHomeworkChapters } from "../../data/teacher/differentiatedHomeworkData";
import api from "../../api";

const STEPS = ["Setup", "Assign Groups", "Homework per Group", "Review & Assign"];
const DIFFICULTY_LEVELS = ["Foundation", "Intermediate", "Advanced"];
const DIFFICULTY_COLORS = {
  Foundation:   "bg-blue-100 text-blue-700 border-blue-200",
  Intermediate: "bg-green-100 text-green-700 border-green-200",
  Advanced:     "bg-purple-100 text-purple-700 border-purple-200",
};

// homeworkId: existing library hw id, or null if AI-generated
function normaliseGroup(g) {
  const stableId = g._id || g.id || `local-${Math.random().toString(36).slice(2)}`;
  return {
    id: stableId,
    _id: g._id,
    label: g.label,
    difficulty: g.difficulty || "Foundation",
    studentIds: g.student_ids || g.studentIds || [],
    performance: g.performance || "",
    reasoning: g.reasoning || "",
    subject: g.subject || "",
    chapter: g.chapter || "",
    homeworkId: g.homework_id || g.homeworkId || null,
    homeworkTitle: g.homework_title || g.homeworkTitle || "",
    dueDate: g.due_date || g.dueDate || "",
    aiQuestions: g.ai_questions || g.aiQuestions || [],
    aiMode: g.ai_mode || g.aiMode || "library",
  };
}

export default function DifferentiatedHomework() {
  const navigate  = useNavigate();
  const dispatch  = useDispatch();
  const aiResult  = useSelector(selectAiToolResult);
  const aiStatus  = useSelector(selectAiToolStatus);
  const apiStudents = useSelector(selectMyStudents);
  const hwLibrary   = useSelector(selectHomeworkLibrary);
  const libStatus   = useSelector(selectLibraryStatus);
  const savedGroups  = useSelector(selectGroups);       // backend groups = source of truth
  const groupsStatus = useSelector(selectGroupsStatus);
  const savedContext = useSelector(selectDiffContext);
  const assignments  = useSelector(selectDiffAssignments);
  const generating   = aiStatus === "loading";

  const [currentStep,    setCurrentStep]    = useState(0); // will be updated after fetch
  const [subject,        setSubject]        = useState(savedContext?.subject || "Math");
  const [chapter,        setChapter]        = useState(savedContext?.chapter || "Linear Equations");
  const [groupingMethod, setGroupingMethod] = useState("ai");
  const [studentSearch,  setStudentSearch]  = useState("");
  const [hwSearch,       setHwSearch]       = useState("");
  const [toast,          setToast]          = useState(null);
  const [savingDraft,    setSavingDraft]    = useState(false);
  const [assigning,      setAssigning]      = useState(false);
  const [generatingQs,   setGeneratingQs]   = useState(false);
  const [groups,         setGroups]         = useState([]);
  const [activeGroupId,  setActiveGroupId]  = useState(null);
  const [showHistory,    setShowHistory]    = useState(false);

  // Normalise library for display
  const libraryItems = hwLibrary.map((hw) => ({
    id: hw._id || hw.id,
    title: hw.title,
    subject: hw.subject,
    questions: hw.questions?.length || 0,
    marks: hw.total_marks || 0,
    status: hw.status || "draft",
    tags: hw.tags || [],
  }));
  const students = apiStudents.length > 0
    ? apiStudents.map((s) => ({
        id: s._id || s.id,
        name: s.name,
        status: s.performance_level || "ON TRACK",
        statusColor: s.performance_level === "SUPPORT NEEDED" ? "text-red-500" : s.performance_level === "ADVANCED" ? "text-purple-500" : "text-green-500",
        avg: s.avg_score || null,
      }))
    : [
        { id: "st1", name: "Alex Thompson",   status: "ON TRACK",       statusColor: "text-green-500",  avg: 78 },
        { id: "st2", name: "Bella Martinez",  status: "SUPPORT NEEDED", statusColor: "text-red-500",    avg: 42 },
        { id: "st3", name: "Chris Evans",     status: "ADVANCED",       statusColor: "text-purple-500", avg: 91 },
        { id: "st4", name: "Daniel Craig",    status: "ON TRACK",       statusColor: "text-green-500",  avg: 65 },
        { id: "st5", name: "Elena Rodriguez", status: "SUPPORT NEEDED", statusColor: "text-red-500",    avg: 38 },
        { id: "st6", name: "Frank Miller",    status: "ON TRACK",       statusColor: "text-green-500",  avg: 72 },
        { id: "st7", name: "Grace Lee",       status: "ADVANCED",       statusColor: "text-purple-500", avg: 88 },
        { id: "st8", name: "Henry Wilson",    status: "ON TRACK",       statusColor: "text-green-500",  avg: 60 },
      ];

  useEffect(() => {
    dispatch(fetchMyStudents());
    dispatch(fetchHomeworkLibrary());
    dispatch(fetchGroups());
  }, [dispatch]);

  // When backend groups load or change, hydrate local state
  useEffect(() => {
    if (groupsStatus === "succeeded") {
      const normalised = savedGroups.map(normaliseGroup);
      setGroups(normalised);
      if (normalised.length > 0) {
        setActiveGroupId((prev) => prev || normalised[0].id);
        if (normalised[0].subject) setSubject(normalised[0].subject);
        if (normalised[0].chapter) setChapter(normalised[0].chapter);
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [groupsStatus, savedGroups]);

  // Parse AI grouping result and save to backend — run only once per new result
  useEffect(() => {
    if (!aiResult || generating) return;
    const raw = aiResult.groups || aiResult.suggested_groups || [];
    if (!raw.length) return;
    const parsed = raw.map((g, i) => {
      const ids = (g.student_ids || g.students || []).map((s) => {
        if (typeof s === "string") {
          const match = students.find((st) => st.name === s || st.id === s);
          return match?.id || s;
        }
        return s.id || s;
      });
      return {
        label: g.label || g.name || `Group ${String.fromCharCode(65 + i)}`,
        difficulty: g.difficulty || DIFFICULTY_LEVELS[Math.min(i, 2)],
        student_ids: ids,
        performance: g.performance || "",
        reasoning: g.reasoning || g.rationale || "",
        subject,
        chapter,
      };
    });
    // Save to backend as single source of truth, then clear result to prevent re-processing
    dispatch(bulkSaveGroups({ groups: parsed, subject, chapter }));
    dispatch(clearAiToolResult());
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [aiResult, generating]);

  const runAiGrouping = () => {
    dispatch(clearAiToolResult());
    dispatch(runAiTool({
      tool: "diffgroups",
      subject,
      topic: chapter,
      grade: "",
      extra: {
        subject, chapter,
        students: students.map((s) => ({ id: s.id, name: s.name, avg_score: s.avg, performance_level: s.status })),
        num_groups: 3,
        difficulty_levels: DIFFICULTY_LEVELS,
      },
    }));
  };

  const generateQuestionsForGroup = async (groupId) => {
    const g = groups.find((gr) => gr.id === groupId);
    if (!g) return;
    setGeneratingQs(true);
    try {
      const res = await api.post("/teacher/ai-tool", {
        tool: "worksheet",
        subject,
        topic: chapter,
        grade: "",
        extra: { subject, chapter, difficulty: g.difficulty, num_questions: 5, question_types: ["mcq", "short_answer"] },
      });
      const qs = (res.data.questions || []).map((q, i) => ({
        id: `gen-${groupId}-${i}-${Date.now()}`,
        text: q.question || q.text || q.question_text || "",
        difficulty: g.difficulty === "Foundation" ? "EASY" : g.difficulty === "Advanced" ? "HARD" : "MEDIUM",
        marks: q.marks || q.max_points || 5,
        isGenerated: true,
      }));
      setGroups((prev) => prev.map((gr) => gr.id === groupId ? { ...gr, aiQuestions: qs, aiMode: "ai_generate" } : gr));
      // Persist to backend
      if (g._id) dispatch(updateGroup({ id: g._id, ai_questions: qs, ai_mode: "ai_generate" }));
    } catch {
      showToastMsg("Failed to generate questions. Try again.", "error");
    } finally {
      setGeneratingQs(false);
    }
  };

  const addManualGroup = async () => {
    const result = await dispatch(createGroup({
      label: `Group ${groups.length + 1}`,
      difficulty: "Foundation",
      student_ids: [],
      subject,
      chapter,
    }));
    if (result.payload) {
      const newGroup = normaliseGroup(result.payload);
      setGroups((prev) => [...prev, newGroup]);
      setActiveGroupId(newGroup.id);
    }
  };

  const handleDeleteGroup = (id) => {
    const g = groups.find((gr) => gr.id === id);
    if (g?._id) dispatch(deleteGroup(g._id));
    setGroups((prev) => prev.filter((gr) => gr.id !== id));
    if (activeGroupId === id) setActiveGroupId(groups.find((gr) => gr.id !== id)?.id || null);
  };

  const renameGroup = (id, label) => {
    setGroups((prev) => prev.map((g) => g.id === id ? { ...g, label } : g));
    const g = groups.find((gr) => gr.id === id);
    if (g?._id) dispatch(updateGroup({ id: g._id, label }));
  };

  const setGroupDifficulty = (id, difficulty) => {
    setGroups((prev) => prev.map((g) => g.id === id ? { ...g, difficulty } : g));
    const g = groups.find((gr) => gr.id === id);
    if (g?._id) dispatch(updateGroup({ id: g._id, difficulty }));
  };

  // Persist student assignment changes to backend
  const persistGroupStudents = (updatedGroups) => {
    updatedGroups.forEach((g) => {
      if (g._id) dispatch(updateGroup({ id: g._id, student_ids: g.studentIds }));
    });
  };
  const setGroupHomeworkTitle = (id, title) => {
    setGroups((prev) => prev.map((g) => g.id === id ? { ...g, homeworkTitle: title } : g));
    const g = groups.find((gr) => gr.id === id);
    if (g?._id) dispatch(updateGroup({ id: g._id, homework_title: title }));
  };
  const setGroupDueDate = (id, date) => {
    setGroups((prev) => prev.map((g) => g.id === id ? { ...g, dueDate: date } : g));
    const g = groups.find((gr) => gr.id === id);
    if (g?._id) dispatch(updateGroup({ id: g._id, due_date: date }));
  };
  const setGroupHomeworkId = (id, hwId, hwTitle) => {
    setGroups((prev) => prev.map((g) => g.id === id ? { ...g, homeworkId: hwId, homeworkTitle: hwTitle, aiMode: "library" } : g));
    const g = groups.find((gr) => gr.id === id);
    if (g?._id) dispatch(updateGroup({ id: g._id, homework_id: hwId, homework_title: hwTitle, ai_mode: "library" }));
  };
  const setGroupAiMode = (id, mode) => {
    setGroups((prev) => prev.map((g) => g.id === id ? { ...g, aiMode: mode, homeworkId: null } : g));
    const g = groups.find((gr) => gr.id === id);
    if (g?._id) dispatch(updateGroup({ id: g._id, ai_mode: mode, homework_id: null }));
  };
  const toggleAiQuestion = null; // unused — kept for reference
  const updateAiQuestion = (groupId, qId, field, value) => {
    setGroups((prev) => prev.map((g) => {
      if (g.id !== groupId) return g;
      const updated = g.aiQuestions.map((q) => q.id === qId ? { ...q, [field]: value } : q);
      const gr = groups.find((gr) => gr.id === groupId);
      if (gr?._id) dispatch(updateGroup({ id: gr._id, ai_questions: updated }));
      return { ...g, aiQuestions: updated };
    }));
  };
  const addBlankQuestion = (groupId) => {
    setGroups((prev) => prev.map((g) => {
      if (g.id !== groupId) return g;
      const updated = [...g.aiQuestions, { id: `q-${Date.now()}`, text: "", difficulty: "EASY", marks: 5, isNew: true }];
      const gr = groups.find((gr) => gr.id === groupId);
      if (gr?._id) dispatch(updateGroup({ id: gr._id, ai_questions: updated }));
      return { ...g, aiQuestions: updated };
    }));
  };

  const assignStudentToGroup = (studentId, groupId) => {
    const updated = groups.map((g) => {
      if (g.id === groupId) return { ...g, studentIds: [...new Set([...g.studentIds, studentId])] };
      return { ...g, studentIds: g.studentIds.filter((id) => id !== studentId) };
    });
    setGroups(updated);
    persistGroupStudents(updated);
  };

  const removeStudentFromGroup = (studentId, groupId) => {
    const updated = groups.map((g) =>
      g.id === groupId ? { ...g, studentIds: g.studentIds.filter((id) => id !== studentId) } : g
    );
    setGroups(updated);
    persistGroupStudents(updated);
  };

  // Real assignment: use existing homework OR create new one per group, then assign to students
  const handleAssignAll = async () => {
    setAssigning(true);
    try {
      const results = [];
      for (const g of groups) {
        if (g.studentIds.length === 0) continue;
        let hwId;
        if (g.aiMode === "library" && g.homeworkId) {
          // Use existing homework — just assign to these students
          hwId = g.homeworkId;
          await api.post("/homework/assign", {
            homework_id: hwId,
            student_ids: g.studentIds,
            due_date: g.dueDate || null,
          });
        } else {
          // AI-generated questions mode — create new homework
          const totalQs = g.aiQuestions.length;
          const questions = g.aiQuestions.map((q, i) => ({
            id: q.id || `q-${i}-${Date.now()}`,
            question_number: i + 1,
            total_questions: totalQs,
            question_text: q.text || q.question_text || "",
            answer_type: "typed",   // typed avoids MCQ-options validation
            options: [],
            max_points: q.marks || 5,
            hint: q.hint || null,
            sample_answer: q.sample_answer || null,
          }));
          const diffMap = { Foundation: "low", Intermediate: "medium", Advanced: "high" };
          const createRes = await api.post("/homework/create", {
            title: g.homeworkTitle || `${subject} – ${chapter} (${g.label})`,
            subject,
            description: `${g.difficulty} level homework for ${chapter}`,
            assigned_to_class: "",
            assigned_students: g.studentIds,
            due_date: g.dueDate || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
            difficulty_level: diffMap[g.difficulty] || "medium",
            submission_type: "online_quiz",
            estimated_duration_minutes: 30,
            tags: [subject, chapter, g.difficulty],
            total_marks: questions.reduce((s, q) => s + q.max_points, 0),
            questions,
          });
          hwId = createRes.data.id;
          await api.post("/homework/assign", {
            homework_id: hwId,
            student_ids: g.studentIds,
            due_date: g.dueDate || null,
          });
        }
        results.push({ groupLabel: g.label, hwId, studentCount: g.studentIds.length });
        // Update group record with the assigned homework_id
        if (g._id) dispatch(updateGroup({ id: g._id, homework_id: hwId, assigned: true }));
      }
      dispatch(addDiffAssignment({
        id: `da-${Date.now()}`,
        subject, chapter,
        groups: groups.map((g) => ({ label: g.label, difficulty: g.difficulty, studentCount: g.studentIds.length })),
        assignedAt: new Date().toISOString(),
      }));
      dispatch(clearDiffSession());
      showToastMsg(`Homework assigned to ${results.length} group(s) successfully!`);
      setTimeout(() => navigate(-1), 1800);
    } catch (err) {
      const detail = err.response?.data?.detail;
      const msg = typeof detail === "string" ? detail
        : Array.isArray(detail) ? detail.map((d) => d.msg).join(", ")
        : "Failed to assign homework. Please try again.";
      showToastMsg(msg, "error");
    } finally {
      setAssigning(false);
    }
  };

  const handleSaveDraft = async () => {
    setSavingDraft(true);
    // Persist all current group state to backend
    for (const g of groups) {
      if (g._id) {
        await dispatch(updateGroup({
          id: g._id,
          label: g.label,
          difficulty: g.difficulty,
          student_ids: g.studentIds,
          homework_id: g.homeworkId || null,
          homework_title: g.homeworkTitle || "",
          due_date: g.dueDate || "",
          ai_questions: g.aiQuestions || [],
          ai_mode: g.aiMode || "library",
        }));
      }
    }
    dispatch(setDiffContext({ subject, chapter }));
    setSavingDraft(false);
    showToastMsg("Draft saved to server");
  };

  function showToastMsg(msg, type = "success") {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  }

  const unassignedStudents = students.filter((s) => !groups.some((g) => g.studentIds.includes(s.id)));
  const totalAssigned = groups.reduce((sum, g) => sum + g.studentIds.length, 0);
  const activeGroup = groups.find((g) => g.id === activeGroupId);
  const canProceedStep1 = groups.length > 0;
  const canProceedStep2 = groups.length > 0 && groups.every((g) => g.studentIds.length > 0);
  const canProceedStep3 = canProceedStep2;

  return (
    <div className="bg-[#FFF5FA] min-h-screen flex flex-col" style={{ fontFamily: "'Lexend', sans-serif" }}>

      {toast && (
        <div className={`fixed top-4 left-1/2 -translate-x-1/2 z-[100] flex items-center gap-2 px-5 py-3 rounded-xl shadow-lg text-sm font-semibold ${toast.type === "error" ? "bg-red-600 text-white" : "bg-green-600 text-white"}`}>
          <span className="material-symbols-outlined text-base">{toast.type === "error" ? "error" : "check_circle"}</span>
          {toast.msg}
        </div>
      )}

      {/* Header */}
      <header className="sticky top-0 z-50 bg-white border-b border-[#eee8f3] px-4 sm:px-6 py-3 shadow-sm">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="p-2 bg-[#932ce2]/10 rounded-lg text-[#932ce2] flex-shrink-0">
              <span className="material-symbols-outlined text-[20px]">auto_awesome</span>
            </div>
            <div className="min-w-0">
              <h1 className="text-base sm:text-lg font-bold tracking-tight truncate">Differentiated Homework</h1>
              {savedContext && (
                <p className="text-xs text-gray-400 truncate">{savedContext.subject} · {savedContext.chapter}{savedContext.studentName ? ` · from ${savedContext.studentName}` : ""}</p>
              )}
            </div>
          </div>
          {/* Step indicator */}
          <div className="hidden md:flex items-center gap-3">
            {STEPS.map((step, i) => (
              <div key={step} className="flex items-center gap-2">
                <button onClick={() => i <= currentStep && setCurrentStep(i)}
                  className={`flex items-center gap-1.5 text-xs font-semibold transition-colors ${currentStep === i ? "text-[#932ce2]" : i < currentStep ? "text-gray-600 hover:text-[#932ce2]" : "text-gray-400 cursor-default"}`}>
                  <span className={`size-5 rounded-full flex items-center justify-center text-[10px] font-bold ${currentStep === i ? "bg-[#932ce2] text-white" : i < currentStep ? "bg-green-500 text-white" : "bg-gray-200 text-gray-500"}`}>
                    {i < currentStep ? "✓" : i + 1}
                  </span>
                  {step}
                </button>
                {i < STEPS.length - 1 && <div className={`w-6 h-0.5 ${i < currentStep ? "bg-[#932ce2]/40" : "bg-gray-200"}`} />}
              </div>
            ))}
          </div>
          <div className="flex gap-2 flex-shrink-0">
            {assignments.length > 0 && (
              <button onClick={() => setShowHistory(!showHistory)}
                className="hidden sm:flex items-center gap-1.5 px-3 py-2 bg-purple-50 text-purple-700 rounded-lg font-bold text-xs hover:bg-purple-100">
                <span className="material-symbols-outlined text-sm">history</span>
                History ({assignments.length})
              </button>
            )}
            <button onClick={handleSaveDraft} disabled={savingDraft}
              className="hidden sm:flex items-center gap-1.5 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg font-bold text-sm hover:bg-gray-200 disabled:opacity-60">
              {savingDraft ? <span className="size-3.5 border-2 border-gray-400/40 border-t-gray-600 rounded-full animate-spin" /> : null}
              Save Draft
            </button>
            <button onClick={() => navigate(-1)}
              className="px-4 py-2 bg-red-50 text-red-600 rounded-lg font-bold text-sm hover:bg-red-100">
              Close
            </button>
          </div>
        </div>
      </header>

      {/* Assignment History Panel */}
      {showHistory && (
        <div className="max-w-7xl mx-auto w-full px-4 sm:px-6 pt-4">
          <div className="bg-white rounded-xl border border-purple-200 p-4">
            <h3 className="font-bold text-sm mb-3 text-purple-700">Previous Differentiated Assignments</h3>
            <div className="space-y-2">
              {assignments.map((a) => (
                <div key={a.id} className="flex items-center justify-between p-3 bg-purple-50 rounded-lg text-xs">
                  <div>
                    <p className="font-bold">{a.subject} · {a.chapter}</p>
                    <p className="text-gray-500">{a.groups.map((g) => `${g.label} (${g.studentCount})`).join(" · ")}</p>
                  </div>
                  <span className="text-gray-400">{new Date(a.assignedAt).toLocaleDateString()}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      <main className="flex-grow overflow-y-auto pb-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">

          {/* ── STEP 0: SETUP ── */}
          {currentStep === 0 && (
            <>
              <section className="bg-white p-5 rounded-xl shadow-sm border border-[#eee8f3]">
                <h2 className="text-base font-bold mb-4">Course Details</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <label className="flex flex-col gap-1">
                    <span className="text-xs font-semibold text-gray-500">Subject</span>
                    <select value={subject} onChange={(e) => { setSubject(e.target.value); setChapter(diffHomeworkChapters[e.target.value]?.[0] || ""); }}
                      className="form-select w-full px-3 py-2.5 rounded-lg border-[#ddd1e6] focus:ring-[#932ce2] text-sm">
                      {diffHomeworkSubjects.map((s) => <option key={s}>{s}</option>)}
                    </select>
                  </label>
                  <label className="flex flex-col gap-1">
                    <span className="text-xs font-semibold text-gray-500">Chapter / Topic</span>
                    <select value={chapter} onChange={(e) => setChapter(e.target.value)}
                      className="form-select w-full px-3 py-2.5 rounded-lg border-[#ddd1e6] focus:ring-[#932ce2] text-sm">
                      {(diffHomeworkChapters[subject] || []).map((c) => <option key={c}>{c}</option>)}
                    </select>
                  </label>
                </div>
              </section>

              <section>
                <h2 className="text-base font-bold mb-3">Grouping Method</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {[
                    { id: "ai",     icon: "psychology", title: "AI-Suggested Grouping", desc: "AI analyses student performance and creates optimised groups automatically." },
                    { id: "manual", icon: "person_add",  title: "Manual Grouping",       desc: "Define your own groups and assign students manually." },
                  ].map((m) => (
                    <div key={m.id} onClick={() => setGroupingMethod(m.id)}
                      className={`relative p-5 rounded-xl border-2 cursor-pointer transition-all ${groupingMethod === m.id ? "border-[#932ce2] bg-white shadow-md" : "border-[#ddd1e6] bg-white/60 hover:bg-white"}`}>
                      {groupingMethod === m.id && (
                        <div className="absolute top-4 right-4 bg-[#932ce2] text-white size-6 flex items-center justify-center rounded-full">
                          <span className="material-symbols-outlined text-[14px]">check</span>
                        </div>
                      )}
                      <div className="flex items-start gap-4">
                        <div className={`p-3 rounded-full flex-shrink-0 ${groupingMethod === m.id ? "bg-[#932ce2]/10 text-[#932ce2]" : "bg-gray-100 text-gray-400"}`}>
                          <span className="material-symbols-outlined text-2xl">{m.icon}</span>
                        </div>
                        <div>
                          <h3 className={`font-bold text-sm ${groupingMethod === m.id ? "text-gray-900" : "text-gray-600"}`}>{m.title}</h3>
                          <p className="text-xs text-gray-500 mt-1">{m.desc}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </section>

              {groupingMethod === "ai" && (
                <section className="space-y-4">
                  {/* If groups already exist, show resume banner */}
                  {groups.length > 0 && !generating && (
                    <div className="bg-green-50 border border-green-200 rounded-xl p-4 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <span className="material-symbols-outlined text-green-600">check_circle</span>
                        <div>
                          <p className="text-sm font-bold text-green-800">{groups.length} groups already created</p>
                          <p className="text-xs text-green-600">{groups.map((g) => `${g.label} (${g.studentIds.length} students)`).join(" · ")}</p>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <button onClick={() => { dispatch(bulkSaveGroups({ groups: [] })); setGroups([]); setCurrentStep(0); }}
                          className="text-xs font-bold text-red-500 border border-red-200 px-3 py-1.5 rounded-lg hover:bg-red-50">
                          Clear & Restart
                        </button>
                        <button onClick={() => setCurrentStep(1)}
                          className="text-xs font-bold text-white bg-[#932ce2] px-4 py-1.5 rounded-lg hover:bg-[#932ce2]/90">
                          Continue with these groups →
                        </button>
                      </div>
                    </div>
                  )}

                  <div className="flex items-center justify-between">
                    <h2 className="font-bold text-base">{groups.length > 0 ? "Current Groups" : "Generate AI Groups"}</h2>
                    <button onClick={runAiGrouping} disabled={generating}
                      className="flex items-center gap-1.5 text-sm font-bold text-[#932ce2] border border-[#932ce2] px-4 py-2 rounded-lg hover:bg-[#932ce2]/5 disabled:opacity-50">
                      {generating && <span className="size-3.5 border-2 border-[#932ce2]/40 border-t-[#932ce2] rounded-full animate-spin" />}
                      {generating ? "Generating..." : groups.length > 0 ? "Regenerate Groups" : "Generate Groups"}
                    </button>
                  </div>
                  {generating && (
                    <div className="bg-white p-8 rounded-xl border border-[#eee8f3] text-center">
                      <div className="size-12 border-4 border-[#932ce2]/20 border-t-[#932ce2] rounded-full animate-spin mx-auto mb-3" />
                      <p className="text-sm text-gray-600">AI is analysing student data and creating optimal groups...</p>
                    </div>
                  )}
                  {!generating && groups.length > 0 && (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      {groups.map((g) => (
                        <div key={g.id} className={`bg-white p-4 rounded-xl border-2 ${DIFFICULTY_COLORS[g.difficulty]}`}>
                          <div className="flex items-start justify-between mb-2">
                            <h3 className="font-bold text-sm">{g.label}</h3>
                            <span className="text-2xl font-bold text-gray-200">{g.studentIds.length}</span>
                          </div>
                          <span className={`text-xs px-2 py-0.5 rounded-full ${DIFFICULTY_COLORS[g.difficulty]}`}>{g.difficulty}</span>
                          <div className="mt-2 space-y-0.5">
                            {g.studentIds.slice(0, 3).map((sid) => {
                              const st = students.find((s) => s.id === sid);
                              return st ? <p key={sid} className="text-xs text-gray-500">• {st.name}</p> : null;
                            })}
                            {g.studentIds.length > 3 && <p className="text-xs text-gray-400">+{g.studentIds.length - 3} more</p>}
                          </div>
                          {g.reasoning && <p className="text-xs text-gray-500 mt-2 italic">{g.reasoning}</p>}
                        </div>
                      ))}
                    </div>
                  )}
                </section>
              )}

              {groupingMethod === "manual" && (
                <section>
                  <div className="flex items-center justify-between mb-3">
                    <h2 className="font-bold text-base">Create Groups</h2>
                    <button onClick={addManualGroup}
                      className="flex items-center gap-1.5 text-sm font-bold text-[#932ce2] border border-[#932ce2] px-4 py-2 rounded-lg hover:bg-[#932ce2]/5">
                      <span className="material-symbols-outlined text-[18px]">add</span> Add Group
                    </button>
                  </div>
                  {groups.length === 0 ? (
                    <div className="bg-white p-8 rounded-xl border border-[#eee8f3] text-center text-gray-400">
                      <span className="material-symbols-outlined text-4xl mb-2">group_add</span>
                      <p className="font-medium">No groups yet. Click "Add Group" to start.</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      {groups.map((g) => (
                        <div key={g.id} className={`bg-white p-4 rounded-xl border-2 ${DIFFICULTY_COLORS[g.difficulty]}`}>
                          <input type="text" value={g.label} onChange={(e) => renameGroup(g.id, e.target.value)}
                            className="w-full font-bold text-sm mb-2 border-0 border-b border-gray-200 focus:border-[#932ce2] focus:ring-0 px-0" />
                          <select value={g.difficulty} onChange={(e) => setGroupDifficulty(g.id, e.target.value)}
                            className="w-full text-xs mb-3 rounded border-gray-200 focus:border-[#932ce2] focus:ring-[#932ce2]">
                            {DIFFICULTY_LEVELS.map((d) => <option key={d}>{d}</option>)}
                          </select>
                          <button onClick={() => handleDeleteGroup(g.id)}
                            className="w-full text-xs text-red-600 border border-red-200 py-1.5 rounded hover:bg-red-50">Delete</button>
                        </div>
                      ))}
                    </div>
                  )}
                </section>
              )}

              <div className="flex justify-end gap-3">
                <button onClick={() => navigate(-1)}
                  className="px-6 py-2.5 bg-gray-100 text-gray-700 rounded-lg font-bold text-sm hover:bg-gray-200">Cancel</button>
                <button onClick={() => setCurrentStep(1)} disabled={!canProceedStep1}
                  className="px-6 py-2.5 bg-[#932ce2] text-white rounded-lg font-bold text-sm hover:bg-[#932ce2]/90 disabled:opacity-50 disabled:cursor-not-allowed">
                  Continue to Assign Groups →
                </button>
              </div>
            </>
          )}

          {/* ── STEP 1: ASSIGN GROUPS ── */}
          {currentStep === 1 && (
            <>
              <section className="bg-white p-5 rounded-xl shadow-sm border border-[#eee8f3]">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-base font-bold">Assign Students to Groups</h2>
                  <span className="text-sm text-gray-500"><span className="font-bold text-[#932ce2]">{totalAssigned}</span> / {students.length} assigned</span>
                </div>
                {totalAssigned === students.length && students.length > 0 && (
                  <div className="mb-4 bg-green-50 border border-green-200 rounded-xl p-3 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="material-symbols-outlined text-green-600 text-base">check_circle</span>
                      <p className="text-sm font-bold text-green-800">All {students.length} students already assigned to groups</p>
                    </div>
                    <button onClick={() => setCurrentStep(2)}
                      className="text-xs font-bold text-white bg-[#932ce2] px-4 py-1.5 rounded-lg hover:bg-[#932ce2]/90">
                      Continue →
                    </button>
                  </div>
                )}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <div>
                    <h3 className="text-sm font-bold mb-3">Unassigned Students ({unassignedStudents.length})</h3>
                    <input type="text" placeholder="Search students..." value={studentSearch}
                      onChange={(e) => setStudentSearch(e.target.value)}
                      className="w-full mb-3 px-3 py-2 text-sm border border-gray-200 rounded-lg focus:border-[#932ce2] focus:ring-[#932ce2]" />
                    <div className="space-y-2 max-h-96 overflow-y-auto">
                      {students
                        .filter((s) => unassignedStudents.some((u) => u.id === s.id) && s.name.toLowerCase().includes(studentSearch.toLowerCase()))
                        .map((s) => (
                          <div key={s.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                            <div>
                              <p className="text-sm font-medium">{s.name}</p>
                              <p className={`text-xs ${s.statusColor}`}>{s.status}{s.avg ? ` · ${s.avg}%` : ""}</p>
                            </div>
                            <select onChange={(e) => e.target.value && assignStudentToGroup(s.id, e.target.value)} value=""
                              className="text-xs border-gray-200 rounded focus:border-[#932ce2] focus:ring-[#932ce2]">
                              <option value="">Assign to...</option>
                              {groups.map((g) => <option key={g.id} value={g.id}>{g.label}</option>)}
                            </select>
                          </div>
                        ))}
                      {unassignedStudents.length === 0 && (
                        <div className="text-center py-6 text-green-600 font-semibold text-sm">
                          <span className="material-symbols-outlined text-2xl block mb-1">check_circle</span>
                          All students assigned!
                        </div>
                      )}
                    </div>
                  </div>
                  <div>
                    <h3 className="text-sm font-bold mb-3">Groups</h3>
                    <div className="space-y-3">
                      {groups.map((g) => (
                        <div key={g.id} className={`p-4 rounded-xl border-2 ${DIFFICULTY_COLORS[g.difficulty]}`}>
                          <div className="flex items-center justify-between mb-2">
                            <h4 className="font-bold text-sm">{g.label}</h4>
                            <span className="text-xs font-bold">{g.studentIds.length} students</span>
                          </div>
                          <div className="space-y-1">
                            {g.studentIds.map((sid) => {
                              const st = students.find((s) => s.id === sid);
                              return st ? (
                                <div key={sid} className="flex items-center justify-between text-xs bg-white/60 px-2 py-1 rounded">
                                  <span>{st.name}</span>
                                  <button onClick={() => removeStudentFromGroup(sid, g.id)} className="text-red-500 hover:text-red-700">
                                    <span className="material-symbols-outlined text-[14px]">close</span>
                                  </button>
                                </div>
                              ) : null;
                            })}
                            {g.studentIds.length === 0 && <p className="text-xs text-gray-400 italic">No students assigned yet</p>}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </section>
              <div className="flex justify-between gap-3">
                <button onClick={() => setCurrentStep(0)} className="px-6 py-2.5 bg-gray-100 text-gray-700 rounded-lg font-bold text-sm hover:bg-gray-200">Back</button>
                <button onClick={() => setCurrentStep(2)} disabled={!canProceedStep2}
                  className="px-6 py-2.5 bg-[#932ce2] text-white rounded-lg font-bold text-sm hover:bg-[#932ce2]/90 disabled:opacity-50 disabled:cursor-not-allowed">
                  {unassignedStudents.length > 0 ? `${unassignedStudents.length} unassigned — assign all to continue` : "Continue to Homework Setup →"}
                </button>
              </div>
            </>
          )}

          {/* ── STEP 2: HOMEWORK PER GROUP ── */}
          {currentStep === 2 && (
            <>
              <div className="flex gap-3 overflow-x-auto pb-1">
                {groups.map((g) => (
                  <button key={g.id} onClick={() => setActiveGroupId(g.id)}
                    className={`flex-shrink-0 px-4 py-2 rounded-lg font-bold text-sm border-2 transition-all ${activeGroupId === g.id ? "border-[#932ce2] bg-[#932ce2]/5 text-[#932ce2]" : "border-gray-200 bg-white text-gray-600 hover:border-[#932ce2]/40"}`}>
                    {g.label} <span className="text-xs font-normal">({g.studentIds.length})</span>
                    {g.homeworkId || g.aiQuestions.length > 0
                      ? <span className="ml-1.5 text-green-500 text-xs">✓</span>
                      : <span className="ml-1.5 text-orange-400 text-xs">!</span>}
                  </button>
                ))}
              </div>

              {activeGroup && (
                <section className="bg-white p-5 rounded-xl shadow-sm border border-[#eee8f3]">
                  <div className="flex items-center gap-3 mb-5">
                    <span className={`text-xs font-bold px-3 py-1 rounded-full border ${DIFFICULTY_COLORS[activeGroup.difficulty]}`}>{activeGroup.difficulty}</span>
                    <h2 className="text-base font-bold">{activeGroup.label}</h2>
                    <span className="text-xs text-gray-400">{activeGroup.studentIds.length} students</span>
                  </div>

                  {/* Due date — always shown */}
                  <div className="flex flex-col gap-1 mb-5 max-w-xs">
                    <label className="text-xs font-semibold text-gray-500">Due Date (optional)</label>
                    <input type="date" value={activeGroup.dueDate || ""}
                      onChange={(e) => setGroupDueDate(activeGroup.id, e.target.value)}
                      className="px-3 py-2 text-sm border border-gray-200 rounded-lg focus:border-[#932ce2] focus:ring-[#932ce2]" />
                  </div>

                  {/* Mode toggle */}
                  <div className="flex gap-3 mb-5">
                    <button onClick={() => setGroupAiMode(activeGroup.id, "library")}
                      className={`flex-1 flex items-center gap-2 p-3 rounded-xl border-2 text-sm font-bold transition-all ${activeGroup.aiMode === "library" ? "border-[#932ce2] bg-[#932ce2]/5 text-[#932ce2]" : "border-gray-200 text-gray-500 hover:border-gray-300"}`}>
                      <span className="material-symbols-outlined text-base">menu_book</span>
                      Pick from Homework Library
                    </button>
                    <button onClick={() => setGroupAiMode(activeGroup.id, "ai_generate")}
                      className={`flex-1 flex items-center gap-2 p-3 rounded-xl border-2 text-sm font-bold transition-all ${activeGroup.aiMode === "ai_generate" ? "border-[#932ce2] bg-[#932ce2]/5 text-[#932ce2]" : "border-gray-200 text-gray-500 hover:border-gray-300"}`}>
                      <span className="material-symbols-outlined text-base">auto_awesome</span>
                      Generate Questions with AI
                    </button>
                  </div>

                  {/* ── LIBRARY MODE ── */}
                  {activeGroup.aiMode === "library" && (
                    <div>
                      <div className="flex items-center gap-2 mb-3">
                        <div className="flex-1 flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-lg px-3 py-2">
                          <span className="material-symbols-outlined text-gray-400 text-sm">search</span>
                          <input type="text" placeholder="Search homework..." value={hwSearch}
                            onChange={(e) => setHwSearch(e.target.value)}
                            className="bg-transparent text-sm outline-none w-full placeholder-gray-400" />
                        </div>
                        <button onClick={() => navigate("/teacher/homework")}
                          className="text-xs text-[#932ce2] font-bold border border-[#932ce2] px-3 py-2 rounded-lg hover:bg-[#932ce2]/5 whitespace-nowrap">
                          + Create New
                        </button>
                      </div>
                      {libStatus === "loading" && (
                        <div className="text-center py-8 text-gray-400 text-sm">Loading homework library...</div>
                      )}
                      {libStatus !== "loading" && libraryItems.length === 0 && (
                        <div className="text-center py-8 text-gray-400">
                          <span className="material-symbols-outlined text-3xl mb-2 block">menu_book</span>
                          <p className="text-sm font-medium">No homework in library yet.</p>
                          <button onClick={() => navigate("/teacher/homework/create")}
                            className="mt-3 text-xs text-[#932ce2] font-bold border border-[#932ce2] px-4 py-2 rounded-lg hover:bg-[#932ce2]/5">
                            Create your first homework
                          </button>
                        </div>
                      )}
                      <div className="space-y-2 max-h-72 overflow-y-auto">
                        {libraryItems
                          .filter((hw) => hw.title.toLowerCase().includes(hwSearch.toLowerCase()) || hw.subject?.toLowerCase().includes(hwSearch.toLowerCase()))
                          .map((hw) => {
                            const isSelected = activeGroup.homeworkId === hw.id;
                            return (
                              <div key={hw.id} onClick={() => setGroupHomeworkId(activeGroup.id, hw.id, hw.title)}
                                className={`p-3 rounded-xl border-2 cursor-pointer transition-all flex items-center justify-between gap-3 ${isSelected ? "border-[#932ce2] bg-[#932ce2]/5" : "border-gray-100 hover:border-gray-200 bg-gray-50"}`}>
                                <div className="flex-1 min-w-0">
                                  <p className="text-sm font-bold truncate">{hw.title}</p>
                                  <div className="flex items-center gap-2 mt-0.5">
                                    <span className="text-xs text-gray-400">{hw.subject}</span>
                                    {hw.questions > 0 && <span className="text-xs text-gray-400">· {hw.questions} questions</span>}
                                    {hw.marks > 0 && <span className="text-xs text-gray-400">· {hw.marks} marks</span>}
                                    <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${hw.status === "assigned" ? "bg-green-100 text-green-700" : "bg-yellow-100 text-yellow-700"}`}>{hw.status}</span>
                                  </div>
                                </div>
                                {isSelected && <span className="material-symbols-outlined text-[#932ce2] text-xl flex-shrink-0">check_circle</span>}
                              </div>
                            );
                          })}
                      </div>
                    </div>
                  )}

                  {/* ── AI GENERATE MODE ── */}
                  {activeGroup.aiMode === "ai_generate" && (
                    <div>
                      <div className="flex items-center justify-between mb-3">
                        <div>
                          <p className="text-sm font-bold">AI-Generated Questions</p>
                          <p className="text-xs text-gray-400">Questions tailored to {activeGroup.difficulty} level for {chapter}</p>
                        </div>
                        <button onClick={() => generateQuestionsForGroup(activeGroup.id)} disabled={generatingQs}
                          className="flex items-center gap-1.5 text-xs font-bold text-[#932ce2] border border-[#932ce2] px-3 py-2 rounded-lg hover:bg-[#932ce2]/5 disabled:opacity-50">
                          {generatingQs ? <span className="size-3 border-2 border-[#932ce2]/40 border-t-[#932ce2] rounded-full animate-spin" /> : <span className="material-symbols-outlined text-sm">auto_awesome</span>}
                          {generatingQs ? "Generating..." : activeGroup.aiQuestions.length > 0 ? "Regenerate" : "Generate Questions"}
                        </button>
                      </div>

                      {/* Homework title for new hw */}
                      <div className="flex flex-col gap-1 mb-4">
                        <label className="text-xs font-semibold text-gray-500">Homework Title</label>
                        <input type="text"
                          value={activeGroup.homeworkTitle || `${subject} – ${chapter} (${activeGroup.label})`}
                          onChange={(e) => setGroupHomeworkTitle(activeGroup.id, e.target.value)}
                          className="px-3 py-2 text-sm border border-gray-200 rounded-lg focus:border-[#932ce2] focus:ring-[#932ce2]" />
                      </div>

                      {generatingQs && (
                        <div className="text-center py-8">
                          <div className="size-10 border-4 border-[#932ce2]/20 border-t-[#932ce2] rounded-full animate-spin mx-auto mb-2" />
                          <p className="text-sm text-gray-400">Generating {activeGroup.difficulty} questions for {chapter}...</p>
                        </div>
                      )}

                      {!generatingQs && activeGroup.aiQuestions.length === 0 && (
                        <div className="text-center py-8 text-gray-400 border-2 border-dashed border-gray-200 rounded-xl">
                          <span className="material-symbols-outlined text-3xl mb-2 block">quiz</span>
                          <p className="text-sm">Click "Generate Questions" to create AI questions for this group.</p>
                        </div>
                      )}

                      {!generatingQs && activeGroup.aiQuestions.length > 0 && (
                        <div className="space-y-2 max-h-72 overflow-y-auto">
                          {activeGroup.aiQuestions.map((q, qi) => (
                            <div key={q.id} className="p-3 rounded-xl border border-gray-200 bg-gray-50">
                              <div className="flex items-start gap-2">
                                <span className="text-xs font-bold text-gray-400 mt-0.5 w-5 flex-shrink-0">Q{qi + 1}</span>
                                <div className="flex-1">
                                  <textarea value={q.text}
                                    onChange={(e) => updateAiQuestion(activeGroup.id, q.id, "text", e.target.value)}
                                    className="w-full text-sm border border-gray-200 rounded-lg px-2 py-1.5 focus:border-[#932ce2] focus:ring-[#932ce2] resize-none"
                                    rows={2} />
                                  <div className="flex items-center gap-2 mt-1.5">
                                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${q.difficulty === "EASY" ? "bg-green-100 text-green-700" : q.difficulty === "HARD" ? "bg-red-100 text-red-700" : "bg-yellow-100 text-yellow-700"}`}>{q.difficulty}</span>
                                    <input type="number" value={q.marks} min={1} max={20}
                                      onChange={(e) => updateAiQuestion(activeGroup.id, q.id, "marks", parseInt(e.target.value) || 5)}
                                      className="w-16 text-xs border border-gray-200 rounded px-2 py-1 focus:border-[#932ce2] focus:ring-[#932ce2]" />
                                    <span className="text-xs text-gray-400">marks</span>
                                    <button onClick={() => setGroups((prev) => prev.map((g) => g.id === activeGroup.id ? { ...g, aiQuestions: g.aiQuestions.filter((aq) => aq.id !== q.id) } : g))}
                                      className="ml-auto text-red-400 hover:text-red-600">
                                      <span className="material-symbols-outlined text-sm">delete</span>
                                    </button>
                                  </div>
                                </div>
                              </div>
                            </div>
                          ))}
                          <button onClick={() => addBlankQuestion(activeGroup.id)}
                            className="w-full py-2 border-2 border-dashed border-gray-200 rounded-xl text-xs font-bold text-gray-400 hover:border-[#932ce2] hover:text-[#932ce2] transition-colors">
                            + Add Question
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </section>
              )}

              <div className="flex justify-between gap-3">
                <button onClick={() => setCurrentStep(1)} className="px-6 py-2.5 bg-gray-100 text-gray-700 rounded-lg font-bold text-sm hover:bg-gray-200">Back</button>
                <button onClick={() => setCurrentStep(3)} disabled={!canProceedStep3}
                  className="px-6 py-2.5 bg-[#932ce2] text-white rounded-lg font-bold text-sm hover:bg-[#932ce2]/90 disabled:opacity-50 disabled:cursor-not-allowed">
                  Continue to Review →
                </button>
              </div>
            </>
          )}

          {/* ── STEP 3: REVIEW & ASSIGN ── */}
          {currentStep === 3 && (
            <>
              <section className="bg-white p-5 rounded-xl shadow-sm border border-[#eee8f3]">
                <h2 className="text-base font-bold mb-1">Review & Assign</h2>
                <p className="text-xs text-gray-400 mb-5">Each group will receive a separate homework assignment tailored to their level.</p>
                <div className="space-y-4">
                  {groups.map((g) => (
                    <div key={g.id} className={`p-4 rounded-xl border-2 ${DIFFICULTY_COLORS[g.difficulty]}`}>
                      <div className="flex items-start justify-between mb-3">
                        <div>
                          <h3 className="font-bold text-sm">{g.label}</h3>
                          <div className="flex items-center gap-2 mt-1">
                            <span className={`text-xs px-2 py-0.5 rounded-full border ${DIFFICULTY_COLORS[g.difficulty]}`}>{g.difficulty}</span>
                            <span className="text-xs text-gray-500">{g.studentIds.length} students</span>
                            {g.dueDate && <span className="text-xs text-gray-500">Due: {g.dueDate}</span>}
                          </div>
                        </div>
                        <button onClick={() => setCurrentStep(2)}
                          className="text-xs text-[#932ce2] font-bold hover:underline">Edit</button>
                      </div>
                      <p className="text-xs font-semibold text-gray-700 mb-2">
                        📝 {g.homeworkId
                          ? libraryItems.find((h) => h.id === g.homeworkId)?.title || g.homeworkTitle
                          : g.homeworkTitle || `${subject} – ${chapter} (${g.label})`}
                      </p>
                      <p className="text-xs text-gray-500 mb-3">
                        {g.homeworkId
                          ? `Using existing homework (${libraryItems.find((h) => h.id === g.homeworkId)?.questions || 0} questions)`
                          : g.aiQuestions.length > 0
                            ? `${g.aiQuestions.length} AI-generated questions`
                            : <span className="text-orange-500 font-semibold">⚠ No homework selected — go back to set one</span>}
                      </p>
                      <div className="flex flex-wrap gap-1.5">
                        {g.studentIds.map((sid) => {
                          const st = students.find((s) => s.id === sid);
                          return st ? (
                            <span key={sid} className="text-xs bg-white/70 px-2 py-0.5 rounded-full border border-current/20">{st.name}</span>
                          ) : null;
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              </section>

              <div className="flex justify-between gap-3">
                <button onClick={() => setCurrentStep(2)} className="px-6 py-2.5 bg-gray-100 text-gray-700 rounded-lg font-bold text-sm hover:bg-gray-200">Back</button>
                <button onClick={handleAssignAll} disabled={assigning}
                  className="px-8 py-2.5 bg-green-600 text-white rounded-lg font-bold text-sm hover:bg-green-700 disabled:opacity-50 flex items-center gap-2">
                  {assigning && <span className="size-3.5 border-2 border-white/40 border-t-white rounded-full animate-spin" />}
                  {assigning ? "Assigning..." : "Assign Homework to All Groups"}
                </button>
              </div>
            </>
          )}

        </div>
      </main>
    </div>
  );
}
