import { useState, useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { getInitial } from "../../utils/nameUtils";
import { homeworkLibrary as mockLibrary } from "../../data/teacherData";
import { 
  fetchHomeworkLibrary, selectHomeworkLibrary, selectLibraryStatus,
  assignHomework, fetchHomeworkById, selectCurrentHomework, patchHomeworkQuestions, deleteHomework,
  updateHomework,
} from "../../store/slices/homeworkSlice";
import { fetchStudentsByClass, selectStudentsByClass } from "../../store/slices/teacherSlice";
import SearchBar from "../../components/SearchBar";
import api from "../../api";

const STATUS_STYLES = {
  template: "bg-gray-100 text-gray-500",
  assigned: "bg-emerald-50 text-emerald-700 border border-emerald-200",
  draft:    "bg-amber-50 text-amber-700 border border-amber-200",
};

const SUBJECT_TAG_STYLES = {
  MATH:        "bg-blue-50 text-blue-600 border border-blue-100",
  PHYSICS:     "bg-violet-50 text-violet-600 border border-violet-100",
  CHEMISTRY:   "bg-orange-50 text-orange-600 border border-orange-100",
  BIOLOGY:     "bg-emerald-50 text-emerald-600 border border-emerald-100",
  ENGLISH:     "bg-pink-50 text-pink-600 border border-pink-100",
  MATHEMATICS: "bg-blue-50 text-blue-600 border border-blue-100",
};

const SUBJECTS = ["Math", "Physics", "Chemistry", "Biology"];
const CLASSES  = ["Class 6", "Class 7", "Class 8", "Class 9"];

export default function HomeworkLibrary() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const dispatch = useDispatch();
  const reduxLibrary = useSelector(selectHomeworkLibrary);
  const libStatus    = useSelector(selectLibraryStatus);
  const students     = useSelector(selectStudentsByClass);
  
  const [search, setSearch] = useState("");
  const [selectedSubjects, setSelectedSubjects] = useState([]);
  const [selectedClasses, setSelectedClasses] = useState([]);
  const [selectedStatuses, setSelectedStatuses] = useState([]);
  const [selectedType, setSelectedType] = useState(""); // "Online Quiz" | "File Upload" | ""
  const [viewMode, setViewMode] = useState("grid");
  const [page, setPage] = useState(1);
  const [library, setLibrary] = useState(mockLibrary);
  
  // Assignment modal state
  const [assignModal, setAssignModal] = useState(null); // { homeworkId, title, classLevel }
  const [selectedStudents, setSelectedStudents] = useState([]);
  const [dueDate, setDueDate] = useState("");
  const [assigning, setAssigning] = useState(false);
  const [assignError, setAssignError] = useState("");

  // Edit questions modal state
  const [editModal, setEditModal] = useState(null); // { homeworkId, title }
  const [editQuestions, setEditQuestions] = useState([]);
  const [editAllowRetries, setEditAllowRetries] = useState(false);
  const [editLoading, setEditLoading] = useState(false);
  const [editSaving, setEditSaving] = useState(false);
  // History panel open per card
  const [historyOpen, setHistoryOpen] = useState({});
  // Delete confirmation per card: { [id]: true }
  const [deleteConfirm, setDeleteConfirm] = useState({});

  useEffect(() => { dispatch(fetchHomeworkLibrary()); }, [dispatch]);
  useEffect(() => {
    if (reduxLibrary.length) {
      const normalised = reduxLibrary.map((hw) => ({
        id:               hw._id || hw.id,
        subject:          hw.subject,
        subjectColor:     "blue",
        tags:             hw.tags || [hw.subject?.toUpperCase()],
        title:            hw.title,
        chapter:          hw.assigned_to_class || "",
        questions:        hw.questions?.length || 0,
        marks:            hw.total_marks || null,
        estimatedMinutes: hw.estimated_duration_minutes || null,
        type:             hw.submission_type === "online_quiz" ? "Online Quiz" : "File Upload",
        status:           hw.status || "draft",
        starred:          false,
        usedCount:        null,
        class:            hw.assigned_to_class || "",
        // history fields
        createdAt:        hw.created_at || null,
        assignedAt:       hw.assigned_at || null,
        dueDate:          hw.due_date || null,
        assignedStudentNames: hw.assigned_student_names || [],
        assignedStudentCount: (hw.assigned_students || []).length,
        submissionsCount:     hw.submissions_count ?? 0,
        pendingReviewCount:   hw.pending_review_count ?? 0,
        allow_retries:        hw.allow_retries || false,
      }));
      setLibrary(normalised);
    }
  }, [reduxLibrary]);

  // Load students when modal opens
  useEffect(() => {
    if (assignModal?.classLevel) {
      dispatch(fetchStudentsByClass(assignModal.classLevel));
    }
  }, [assignModal, dispatch]);

  const toggleFilter = (arr, setArr, val) =>
    setArr(arr.includes(val) ? arr.filter((v) => v !== val) : [...arr, val]);

  const openAssignModal = (hw) => {
    setAssignModal({ homeworkId: hw.id, title: hw.title, classLevel: hw.class });
    setSelectedStudents([]);
    setDueDate("");
    setAssignError("");
  };

  const closeAssignModal = () => {
    setAssignModal(null);
    setSelectedStudents([]);
    setDueDate("");
    setAssignError("");
  };

  const toggleStudent = (id) => {
    setSelectedStudents((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const handleAssign = async () => {
    if (!dueDate) {
      setAssignError("Please set a due date");
      return;
    }
    if (selectedStudents.length === 0) {
      setAssignError("Please select at least one student");
      return;
    }
    setAssigning(true);
    setAssignError("");
    try {
      await dispatch(
        assignHomework({
          homework_id: assignModal.homeworkId,
          student_ids: selectedStudents,
          due_date: dueDate,
        })
      ).unwrap();
      closeAssignModal();
      dispatch(fetchHomeworkLibrary()); // Refresh library
    } catch (err) {
      setAssignError(err.message || "Assignment failed. Please try again.");
    } finally {
      setAssigning(false);
    }
  };

  // ── Edit questions handlers ──────────────────────────────
  const openEditModal = async (hw) => {
    setEditModal({ homeworkId: hw.id, title: hw.title });
    setEditAllowRetries(hw.allow_retries || false);
    setEditLoading(true);
    try {
      const res = await api.get(`/homework/${hw.id}/questions`);
      // Normalize to a consistent editable format
      const qs = (res.data || []).map((q, i) => ({
        id:          q.id || `q${i+1}`,
        questionText: q.questionText || q.question_text || "",
        answerType:  q.answerType || q.answer_type || "typed",
        maxPoints:   q.maxPoints || q.max_points || 1,
        hint:        q.hint || "",
        options:     (q.options || []).map((o) => ({
          id:        o.id || `o${i}`,
          text:      o.text || "",
          isCorrect: o.is_correct || o.isCorrect || false,
        })),
      }));
      setEditQuestions(qs);
    } catch {
      setEditQuestions([]);
    } finally {
      setEditLoading(false);
    }
  };

  const closeEditModal = () => { setEditModal(null); setEditQuestions([]); setEditAllowRetries(false); };

  const updateEditQuestion = (idx, field, value) => {
    setEditQuestions((prev) => prev.map((q, i) => i === idx ? { ...q, [field]: value } : q));
  };

  const updateEditOption = (qIdx, oIdx, field, value) => {
    setEditQuestions((prev) => prev.map((q, i) => {
      if (i !== qIdx) return q;
      const opts = q.options.map((o, j) => {
        if (j !== oIdx) return field === "isCorrect" && value ? { ...o, isCorrect: false } : o;
        return { ...o, [field]: value };
      });
      return { ...q, options: opts };
    }));
  };

  const addEditOption = (qIdx) => {
    setEditQuestions((prev) => prev.map((q, i) => i === qIdx
      ? { ...q, options: [...q.options, { id: `o-${Date.now()}`, text: "", isCorrect: false }] }
      : q
    ));
  };

  const removeEditOption = (qIdx, oIdx) => {
    setEditQuestions((prev) => prev.map((q, i) => i === qIdx
      ? { ...q, options: q.options.filter((_, j) => j !== oIdx) }
      : q
    ));
  };

  const saveEditQuestions = async () => {
    setEditSaving(true);
    try {
      // Convert back to snake_case for backend
      const payload = editQuestions.map((q) => ({
        id:            q.id,
        question_text: q.questionText,
        answer_type:   q.answerType,
        max_points:    q.maxPoints,
        hint:          q.hint,
        options:       q.options.map((o) => ({ id: o.id, text: o.text, is_correct: o.isCorrect })),
      }));
      await dispatch(patchHomeworkQuestions({ id: editModal.homeworkId, questions: payload })).unwrap();
      // Also save allow_retries setting
      await dispatch(updateHomework({ id: editModal.homeworkId, allow_retries: editAllowRetries })).unwrap();
      closeEditModal();
      dispatch(fetchHomeworkLibrary());
    } catch {
      // keep modal open on error
    } finally {
      setEditSaving(false);
    }
  };

  const filtered = library.filter((hw) => {
    const matchSubject = selectedSubjects.length === 0 || selectedSubjects.some(
      (s) => hw.subject?.toLowerCase().includes(s.toLowerCase())
    );
    // Class filter: "Class 6" should match "Grade 6-A", "Grade 6-B", etc.
    const matchClass = selectedClasses.length === 0 || selectedClasses.some((c) => {
      const grade = c.replace("Class ", "").replace("Grade ", "").trim();
      return hw.class?.includes(grade);
    });
    const matchStatus = selectedStatuses.length === 0 || selectedStatuses.includes(hw.status);
    const matchType   = !selectedType || hw.type === selectedType;
    const matchSearch = hw.title.toLowerCase().includes(search.toLowerCase());
    return matchSubject && matchClass && matchStatus && matchType && matchSearch;
  });

  const PAGE_SIZE = 24;
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const pageNumbers = () => {
    if (totalPages <= 5) return Array.from({ length: totalPages }, (_, i) => i + 1);
    if (page <= 3) return [1, 2, 3, "...", totalPages];
    if (page >= totalPages - 2) return [1, "...", totalPages - 2, totalPages - 1, totalPages];
    return [1, "...", page - 1, page, page + 1, "...", totalPages];
  };

  return (
    <div className="bg-[#faf9ff] min-h-screen" style={{ fontFamily: "'Lexend', sans-serif" }}>

      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-white/90 backdrop-blur-md border-b border-[#e8e3f5]">
        <div className="max-w-[1200px] mx-auto px-6 h-16 flex items-center gap-4">
          <button onClick={() => navigate("/teacher")} className="p-2 hover:bg-[#f0ecfa] rounded-lg transition-colors">
            <span className="material-symbols-outlined text-gray-400">arrow_back</span>
          </button>
          <div className="size-8 bg-[#695be6] rounded-lg flex items-center justify-center text-white">
            <span className="material-symbols-outlined text-lg">menu_book</span>
          </div>
          <h1 className="font-semibold text-lg text-gray-800">Homework Library</h1>
          <SearchBar
            value={search}
            onChange={setSearch}
            placeholder="Search by topic, chapter, or keyword..."
            resultCount={filtered.length}
            width="max-w-md"
          />
          <div className="ml-auto flex items-center gap-3">
            <div className="relative p-2 hover:bg-[#f0ecfa] rounded-lg cursor-pointer transition-colors">
              <span className="material-symbols-outlined text-gray-500">notifications</span>
            </div>
            <div className="size-9 rounded-full bg-[#695be6] flex items-center justify-center text-white font-semibold text-sm">{getInitial(user?.name) || "T"}</div>
            <button
              onClick={() => navigate("/teacher/homework/create")}
              className="flex items-center gap-2 bg-[#695be6] text-white font-semibold px-4 py-2 rounded-xl hover:bg-[#5a4dd4] transition-colors shadow-sm"
            >
              <span className="material-symbols-outlined text-base">add</span> Create New Homework
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-[1200px] mx-auto pt-24 px-6 pb-12 flex gap-6">

        {/* Sidebar Filters */}
        <aside className="w-52 flex-shrink-0">
          <div className="flex items-center justify-between mb-5">
            <p className="text-xs font-semibold uppercase tracking-widest text-gray-400">Filters</p>
            <button
              onClick={() => { setSelectedSubjects([]); setSelectedClasses([]); setSelectedStatuses([]); setSelectedType(""); setPage(1); }}
              className="text-xs text-[#695be6] font-medium hover:underline"
            >
              Clear All
            </button>
          </div>

          {/* Subject */}
          <div className="mb-6">
            <div className="flex items-center justify-between mb-3">
              <p className="text-sm font-semibold text-gray-700">Subject</p>
              <span className="material-symbols-outlined text-gray-400 text-base">expand_less</span>
            </div>
            {SUBJECTS.map((s) => (
              <label key={s} className="flex items-center gap-2.5 text-sm py-1.5 cursor-pointer group">
                <input
                  type="checkbox"
                  checked={selectedSubjects.includes(s)}
                  onChange={() => { toggleFilter(selectedSubjects, setSelectedSubjects, s); setPage(1); }}
                  className="accent-[#695be6] size-4 rounded"
                />
                <span className="text-gray-600 group-hover:text-[#695be6] transition-colors">{s}</span>
              </label>
            ))}
          </div>

          {/* Class */}
          <div className="mb-6">
            <div className="flex items-center justify-between mb-3">
              <p className="text-sm font-semibold text-gray-700">Class</p>
              <span className="material-symbols-outlined text-gray-400 text-base">expand_less</span>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {CLASSES.map((c) => (
                <button
                  key={c}
                  onClick={() => { toggleFilter(selectedClasses, setSelectedClasses, c); setPage(1); }}
                  className={`text-xs font-medium px-3 py-1.5 rounded-lg border transition-all ${
                    selectedClasses.includes(c)
                      ? "bg-[#695be6]/10 text-[#695be6] border-[#695be6]/30"
                      : "border-[#e8e3f5] text-gray-500 hover:border-[#695be6]/30 hover:bg-[#695be6]/5"
                  }`}
                >
                  {c}
                </button>
              ))}
            </div>
          </div>

          {/* Type */}
          <div className="mb-6">
            <div className="flex items-center justify-between mb-3">
              <p className="text-sm font-semibold text-gray-700">Type</p>
              <span className="material-symbols-outlined text-gray-400 text-base">expand_less</span>
            </div>
            {["Online Quiz", "File Upload"].map((t) => (
              <label key={t} className="flex items-center gap-2.5 text-sm py-1.5 cursor-pointer group">
                <input
                  type="radio"
                  name="type"
                  checked={selectedType === t}
                  onChange={() => { setSelectedType(selectedType === t ? "" : t); setPage(1); }}
                  className="accent-[#695be6] size-4"
                />
                <span className="text-gray-600 group-hover:text-[#695be6] transition-colors">{t}</span>
              </label>
            ))}
            {selectedType && (
              <button onClick={() => { setSelectedType(""); setPage(1); }} className="text-[10px] text-[#695be6] hover:underline mt-1">
                Clear
              </button>
            )}
          </div>

          {/* Status */}
          <div className="mb-6">
            <div className="flex items-center justify-between mb-3">
              <p className="text-sm font-semibold text-gray-700">Status</p>
              <span className="material-symbols-outlined text-gray-400 text-base">expand_less</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {[
                { key: "draft",    label: "DRAFT",    cls: "bg-amber-50 text-amber-700 border border-amber-200" },
                { key: "assigned", label: "ASSIGNED", cls: "bg-emerald-50 text-emerald-700 border border-emerald-200" },
              ].map(({ key, label, cls }) => (
                <button
                  key={key}
                  onClick={() => { toggleFilter(selectedStatuses, setSelectedStatuses, key); setPage(1); }}
                  className={`text-[10px] font-semibold px-2.5 py-1 rounded-md transition-all border ${
                    selectedStatuses.includes(key)
                      ? "bg-[#695be6] text-white border-[#695be6]"
                      : cls
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* Pending Submissions quick-links */}
          {(() => {
            const pending = library.filter((hw) => hw.pendingReviewCount > 0);
            if (pending.length === 0) return null;
            return (
              <div>
                <div className="flex items-center justify-between mb-3">
                  <p className="text-sm font-semibold text-gray-700">Needs Review</p>
                  <span className="size-5 rounded-full bg-amber-100 text-amber-700 text-[10px] font-black flex items-center justify-center">
                    {pending.length}
                  </span>
                </div>
                <div className="space-y-1.5">
                  {pending.slice(0, 6).map((hw) => (
                    <button
                      key={hw.id}
                      onClick={() => navigate(`/teacher/homework/evaluate/${hw.id}`)}
                      className="w-full flex items-center gap-2 p-2 rounded-lg hover:bg-[#695be6]/5 border border-transparent hover:border-[#695be6]/15 transition-all text-left group"
                    >
                      <span className="material-symbols-outlined text-amber-500 text-sm shrink-0">pending_actions</span>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium text-gray-700 truncate leading-tight">{hw.title}</p>
                        <p className="text-[10px] text-gray-400">{hw.pendingReviewCount} pending</p>
                      </div>
                      <span className="material-symbols-outlined text-[#695be6] text-xs opacity-0 group-hover:opacity-100 transition-opacity shrink-0">arrow_forward</span>
                    </button>
                  ))}
                  {pending.length > 6 && (
                    <p className="text-[10px] text-gray-400 text-center pt-1">+{pending.length - 6} more</p>
                  )}
                </div>
              </div>
            );
          })()}
        </aside>

        {/* Main Content */}
        <div className="flex-1">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h2 className="font-semibold text-xl text-gray-800">Homework Catalog</h2>
              <p className="text-sm text-gray-400 mt-0.5">Showing {filtered.length} homework assignments</p>
            </div>
            <div className="flex items-center gap-3">
              {/* Active filters */}
              <div className="flex flex-wrap gap-2">
                {selectedSubjects.map((s) => (
                  <span key={s} className="flex items-center gap-1 bg-gray-100 text-sm px-3 py-1 rounded-full">
                    {s}
                    <button onClick={() => { toggleFilter(selectedSubjects, setSelectedSubjects, s); setPage(1); }}>
                      <span className="material-symbols-outlined text-gray-400 text-sm">close</span>
                    </button>
                  </span>
                ))}
                {selectedClasses.map((c) => (
                  <span key={c} className="flex items-center gap-1 bg-gray-100 text-sm px-3 py-1 rounded-full">
                    {c}
                    <button onClick={() => { toggleFilter(selectedClasses, setSelectedClasses, c); setPage(1); }}>
                      <span className="material-symbols-outlined text-gray-400 text-sm">close</span>
                    </button>
                  </span>
                ))}
                {selectedStatuses.map((s) => (
                  <span key={s} className="flex items-center gap-1 bg-gray-100 text-sm px-3 py-1 rounded-full capitalize">
                    {s}
                    <button onClick={() => { toggleFilter(selectedStatuses, setSelectedStatuses, s); setPage(1); }}>
                      <span className="material-symbols-outlined text-gray-400 text-sm">close</span>
                    </button>
                  </span>
                ))}
                {selectedType && (
                  <span className="flex items-center gap-1 bg-gray-100 text-sm px-3 py-1 rounded-full">
                    {selectedType}
                    <button onClick={() => { setSelectedType(""); setPage(1); }}>
                      <span className="material-symbols-outlined text-gray-400 text-sm">close</span>
                    </button>
                  </span>
                )}
                {(selectedSubjects.length > 0 || selectedClasses.length > 0 || selectedStatuses.length > 0 || selectedType) && (
                  <button
                    onClick={() => { setSelectedSubjects([]); setSelectedClasses([]); setSelectedStatuses([]); setSelectedType(""); setPage(1); }}
                    className="text-sm text-[#695be6] font-semibold hover:underline"
                  >
                    Clear all
                  </button>
                )}
              </div>
              {/* View toggle */}
              <div className="flex border border-gray-200 rounded-lg overflow-hidden">
                <button
                  onClick={() => setViewMode("grid")}
                  className={`p-2 ${viewMode === "grid" ? "bg-[#695be6] text-white" : "text-gray-400 hover:bg-gray-50"}`}
                >
                  <span className="material-symbols-outlined text-base">grid_view</span>
                </button>
                <button
                  onClick={() => setViewMode("list")}
                  className={`p-2 ${viewMode === "list" ? "bg-[#695be6] text-white" : "text-gray-400 hover:bg-gray-50"}`}
                >
                  <span className="material-symbols-outlined text-base">list</span>
                </button>
              </div>
              <select className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm bg-white outline-none">
                <option>Show: 24</option>
                <option>Show: 12</option>
                <option>Show: 48</option>
              </select>
            </div>
          </div>

          {/* Grid */}
          <div className={`grid gap-5 ${viewMode === "grid" ? "grid-cols-1 md:grid-cols-2 lg:grid-cols-3" : "grid-cols-1"}`}>
            {paginated.map((hw) => (
              <div key={hw.id} className={`group bg-white rounded-2xl border p-5 flex flex-col gap-4 shadow-sm hover:shadow-lg transition-all duration-300 ${hw.status === "draft" ? "border-amber-200 hover:border-amber-400" : "border-[#e8e3f5] hover:border-[#695be6]/30"}`}>
                <div className="flex items-start justify-between">
                  <div className="flex gap-1.5 flex-wrap items-center">
                    {hw.tags.map((tag) => (
                      <span key={tag} className={`text-[10px] font-semibold px-2 py-0.5 rounded-md ${
                        SUBJECT_TAG_STYLES[tag?.toUpperCase()] || STATUS_STYLES[tag?.toLowerCase()] || "bg-gray-100 text-gray-500"
                      }`}>{tag}</span>
                    ))}
                    {hw.status === "draft" && (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-amber-50 text-amber-700 border border-amber-200">DRAFT</span>
                    )}
                    {hw.status === "assigned" && (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200">ASSIGNED</span>
                    )}
                  </div>
                  <button className="text-gray-300 hover:text-amber-400 transition-colors">
                    <span className="material-symbols-outlined text-xl">{hw.starred ? "star" : "star"}</span>
                  </button>
                </div>
                <div>
                  <h3 className="font-semibold text-base leading-snug group-hover:text-[#695be6] transition-colors line-clamp-2">{hw.title}</h3>
                  <p className="text-xs text-gray-400 mt-1">{hw.chapter}</p>
                </div>
                <div className="flex items-center gap-4 text-xs text-gray-400">
                  {hw.questions > 0 && (
                    <span className="flex items-center gap-1">
                      <span className="material-symbols-outlined text-sm">quiz</span> {hw.questions} questions
                    </span>
                  )}
                  {hw.marks && (
                    <span className="flex items-center gap-1">
                      <span className="material-symbols-outlined text-sm">grade</span> {hw.marks} marks
                    </span>
                  )}
                  {hw.estimatedMinutes && (
                    <span className="flex items-center gap-1">
                      <span className="material-symbols-outlined text-sm">schedule</span> ~{hw.estimatedMinutes} min
                    </span>
                  )}
                </div>

                {/* Submissions bar */}
                {hw.submissionsCount > 0 ? (
                  <button
                    onClick={() => navigate(`/teacher/homework/evaluate/${hw.id}`)}
                    className="flex items-center justify-between w-full bg-[#695be6]/5 border border-[#695be6]/15 rounded-xl px-3 py-2 hover:bg-[#695be6]/10 transition-colors group/sub"
                  >
                    <div className="flex items-center gap-2">
                      <span className="material-symbols-outlined text-[#695be6] text-base">assignment_turned_in</span>
                      <span className="text-xs font-semibold text-[#695be6]">{hw.submissionsCount} submission{hw.submissionsCount !== 1 ? "s" : ""}</span>
                      {hw.pendingReviewCount > 0 ? (
                        <span className="bg-amber-100 text-amber-700 font-bold px-2 py-0.5 rounded-full text-[10px]">
                          {hw.pendingReviewCount} need review
                        </span>
                      ) : (
                        <span className="bg-green-100 text-green-700 font-bold px-2 py-0.5 rounded-full text-[10px]">
                          all reviewed
                        </span>
                      )}
                    </div>
                    <span className="material-symbols-outlined text-[#695be6] text-sm opacity-40 group-hover/sub:opacity-100 transition-opacity">arrow_forward</span>
                  </button>
                ) : hw.status === "assigned" ? (
                  <div className="flex items-center gap-2 bg-gray-50 border border-gray-100 rounded-xl px-3 py-2">
                    <span className="material-symbols-outlined text-gray-300 text-base">hourglass_empty</span>
                    <span className="text-xs text-gray-400">No submissions yet</span>
                  </div>
                ) : null}

        <div className="flex flex-wrap items-center gap-y-3 pt-3 border-t border-[#f0ecfa] mt-auto">
          <div className="flex gap-3">
            <button
              onClick={() => navigate(`/teacher/homework/preview/${hw.id}`)}
              className="flex items-center gap-1 text-xs font-medium text-gray-400 hover:text-[#695be6] transition-colors"
            >
              <span className="material-symbols-outlined text-sm">visibility</span> Preview
            </button>
            <button
              onClick={() => openEditModal(hw)}
              className="flex items-center gap-1 text-xs font-medium text-gray-400 hover:text-[#695be6] transition-colors"
            >
              <span className="material-symbols-outlined text-sm">edit</span> Edit
            </button>
            <button
              onClick={() => setHistoryOpen((p) => ({ ...p, [hw.id]: !p[hw.id] }))}
              className={`flex items-center gap-1 text-xs font-medium transition-colors ${historyOpen[hw.id] ? "text-[#695be6]" : "text-gray-400 hover:text-[#695be6]"}`}
            >
              <span className="material-symbols-outlined text-sm">history</span> History
            </button>
            {/* Delete — two-step confirm */}
            {deleteConfirm[hw.id] ? (
              <span className="flex items-center gap-1">
                <span className="text-[10px] text-red-600 font-bold">
                  {hw.status === "assigned" ? "Removes from students too." : "Delete?"}&nbsp;
                </span>
                <button
                  onClick={async () => {
                    await dispatch(deleteHomework(hw.id));
                    setDeleteConfirm((p) => ({ ...p, [hw.id]: false }));
                    setHistoryOpen((p) => ({ ...p, [hw.id]: false }));
                  }}
                  className="text-[10px] font-black text-red-600 hover:underline"
                >Yes</button>
                <span className="text-gray-300 text-[10px]">/</span>
                <button
                  onClick={() => setDeleteConfirm((p) => ({ ...p, [hw.id]: false }))}
                  className="text-[10px] font-bold text-gray-400 hover:underline"
                >No</button>
              </span>
            ) : (
              <button
                onClick={() => setDeleteConfirm((p) => ({ ...p, [hw.id]: true }))}
                className="flex items-center gap-1 text-xs font-medium text-gray-300 hover:text-red-500 transition-colors"
              >
                <span className="material-symbols-outlined text-sm">delete</span>
              </button>
            )}
          </div>

          <div className="ml-auto flex gap-2">
            {hw.status === "assigned" ? (
              <>
                <button
                  onClick={() => openAssignModal(hw)}
                  className="border border-[#695be6] text-[#695be6] text-[10px] font-bold py-1.5 px-3 rounded-lg hover:bg-[#695be6]/5 transition-colors whitespace-nowrap"
                >
                  Reassign
                </button>
                <button
                  onClick={() => navigate(`/teacher/homework/evaluate/${hw.id}`)}
                  className="bg-[#695be6] text-white text-[10px] font-bold py-1.5 px-3 rounded-lg hover:bg-[#5a4dd4] transition-colors whitespace-nowrap flex items-center gap-1"
                >
                  Evaluate
                  {hw.pendingReviewCount > 0 && (
                    <span className="bg-white/30 text-white font-black px-1.5 py-0.5 rounded-full text-[9px] leading-none">
                      {hw.pendingReviewCount}
                    </span>
                  )}
                </button>
              </>
            ) : (
              <button
                onClick={() => openAssignModal(hw)}
                className="bg-[#695be6] text-white text-[10px] font-bold py-1.5 px-4 rounded-lg hover:bg-[#5a4dd4] transition-colors"
              >
                Assign
              </button>
            )}
          </div>
        </div>

                {/* History panel */}
                {historyOpen[hw.id] && (
                  <div className="bg-[#f8f7ff] rounded-xl border border-[#e8e3f5] p-3 -mt-1 space-y-2">
                    <p className="text-[10px] font-black text-[#695be6] uppercase tracking-widest mb-2">Assignment History</p>
                    <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
                      <div>
                        <span className="text-gray-400">Subject</span>
                        <p className="font-semibold text-gray-700">{hw.subject || "—"}</p>
                      </div>
                      <div>
                        <span className="text-gray-400">Class</span>
                        <p className="font-semibold text-gray-700">{hw.chapter || "—"}</p>
                      </div>
                      <div>
                        <span className="text-gray-400">Created</span>
                        <p className="font-semibold text-gray-700">
                          {hw.createdAt ? new Date(hw.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }) : "—"}
                        </p>
                      </div>
                      <div>
                        <span className="text-gray-400">Assigned on</span>
                        <p className="font-semibold text-gray-700">
                          {hw.assignedAt ? new Date(hw.assignedAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }) : "Not yet"}
                        </p>
                      </div>
                      <div>
                        <span className="text-gray-400">Due date</span>
                        <p className="font-semibold text-gray-700">
                          {hw.dueDate ? new Date(hw.dueDate).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }) : "—"}
                        </p>
                      </div>
                      <div>
                        <span className="text-gray-400">Students</span>
                        <p className="font-semibold text-gray-700">{hw.assignedStudentCount || 0} assigned</p>
                      </div>
                    </div>
                    {hw.assignedStudentNames?.length > 0 && (
                      <div className="pt-1">
                        <span className="text-[10px] text-gray-400">Assigned to: </span>
                        <span className="text-[10px] text-gray-600 font-medium">
                          {hw.assignedStudentNames.slice(0, 5).join(", ")}
                          {hw.assignedStudentNames.length > 5 && ` +${hw.assignedStudentNames.length - 5} more`}
                        </span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}

            {/* Add New Content card */}
            <button
              onClick={() => navigate("/teacher/homework/create")}
              className="bg-white rounded-2xl border-2 border-dashed border-[#e8e3f5] p-5 flex flex-col items-center justify-center gap-3 hover:border-[#695be6]/50 hover:bg-[#695be6]/5 transition-all min-h-[200px] group"
            >
              <div className="size-12 rounded-full bg-[#695be6]/10 flex items-center justify-center group-hover:scale-110 transition-transform">
                <span className="material-symbols-outlined text-[#695be6] text-2xl">add_circle</span>
              </div>
              <div>
                <p className="font-semibold text-sm text-center">Add New Content</p>
                <p className="text-xs text-gray-400 text-center mt-0.5">Start building a new assignment from scratch</p>
              </div>
            </button>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2 mt-8">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="p-2 hover:bg-gray-100 rounded-lg disabled:opacity-40"
              >
                <span className="material-symbols-outlined text-gray-400">chevron_left</span>
              </button>
              {pageNumbers().map((p, i) => (
                <button
                  key={i}
                  onClick={() => typeof p === "number" && setPage(p)}
                  disabled={p === "..."}
                  className={`size-9 rounded-lg text-sm font-bold transition-colors ${
                    page === p ? "bg-[#695be6] text-white" : p === "..." ? "text-gray-400 cursor-default" : "hover:bg-gray-100 text-gray-600"
                  }`}
                >
                  {p}
                </button>
              ))}
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="p-2 hover:bg-gray-100 rounded-lg disabled:opacity-40"
              >
                <span className="material-symbols-outlined text-gray-400">chevron_right</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Assignment Modal */}
      {assignModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50" onClick={closeAssignModal}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl mx-4 max-h-[90vh] overflow-hidden" onClick={(e) => e.stopPropagation()}>
            {/* Modal Header */}
            <div className="bg-gradient-to-r from-[#695be6] to-[#8e82f3] px-6 py-4 flex items-center justify-between">
              <div>
                <h2 className="text-white font-black text-lg">Assign Homework</h2>
                <p className="text-white/80 text-sm">{assignModal.title}</p>
              </div>
              <button onClick={closeAssignModal} className="text-white hover:bg-white/20 p-2 rounded-lg transition-colors">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto max-h-[calc(90vh-180px)]">
              {assignError && (
                <div className="mb-4 flex items-center gap-2 bg-red-50 border border-red-200 rounded-xl px-4 py-3">
                  <span className="material-symbols-outlined text-red-500 text-base">error</span>
                  <p className="text-red-600 text-sm flex-1">{assignError}</p>
                </div>
              )}

              {/* Due Date */}
              <div className="mb-6">
                <label className="block text-sm font-bold mb-2">Due Date</label>
                <input
                  type="date"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  min={new Date().toISOString().split("T")[0]}
                  className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-[#695be6]"
                />
              </div>

              {/* Student Selection */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <label className="text-sm font-bold">Select Students ({selectedStudents.length}/{students.length})</label>
                  <button
                    onClick={() => {
                      if (selectedStudents.length === students.length) {
                        setSelectedStudents([]);
                      } else {
                        setSelectedStudents(students.map((s) => s.id));
                      }
                    }}
                    className="text-xs text-[#695be6] font-bold hover:underline"
                  >
                    {selectedStudents.length === students.length ? "Deselect All" : "Select All"}
                  </button>
                </div>

                {students.length === 0 ? (
                  <p className="text-sm text-gray-400 text-center py-8">No students found for {assignModal.classLevel}</p>
                ) : (
                  <div className="space-y-2 max-h-64 overflow-y-auto pr-2" style={{ scrollbarWidth: "thin" }}>
                    {students.map((s) => {
                      const isSelected = selectedStudents.includes(s.id);
                      return (
                        <label
                          key={s.id}
                          className={`flex items-center gap-3 p-3 rounded-xl cursor-pointer border-2 transition-all ${
                            isSelected ? "border-[#695be6] bg-[#695be6]/5" : "border-gray-100 hover:border-gray-200"
                          }`}
                        >
                          <div
                            className={`size-5 rounded border-2 flex items-center justify-center shrink-0 ${
                              isSelected ? "bg-[#695be6] border-[#695be6]" : "border-gray-300"
                            }`}
                          >
                            {isSelected && <span className="material-symbols-outlined text-white text-xs">check</span>}
                          </div>
                          <div className="size-8 rounded-full bg-[#695be6]/10 flex items-center justify-center text-[#695be6] text-xs font-bold shrink-0">
                            {s.name?.[0] || "?"}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">{s.name}</p>
                            {s.roll_no && <p className="text-[10px] text-gray-400">Roll #{s.roll_no}</p>}
                          </div>
                          <input type="checkbox" className="hidden" checked={isSelected} onChange={() => toggleStudent(s.id)} />
                        </label>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            {/* Modal Footer */}
            <div className="border-t border-gray-100 px-6 py-4 flex items-center justify-end gap-3">
              <button
                onClick={closeAssignModal}
                className="px-5 py-2.5 border border-gray-200 rounded-xl text-sm font-bold hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleAssign}
                disabled={assigning}
                className="px-6 py-2.5 bg-[#695be6] text-white rounded-xl text-sm font-bold hover:bg-[#5a4dd4] transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {assigning && <span className="material-symbols-outlined text-base animate-spin">progress_activity</span>}
                {assigning ? "Assigning..." : "Assign Homework"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Questions Modal */}
      {editModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50" onClick={closeEditModal}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl mx-4 max-h-[90vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
            <div className="bg-gradient-to-r from-[#695be6] to-[#8e82f3] px-6 py-4 flex items-center justify-between rounded-t-2xl">
              <div>
                <h2 className="text-white font-black text-lg">Edit Questions</h2>
                <p className="text-white/80 text-sm">{editModal.title}</p>
              </div>
              <button onClick={closeEditModal} className="text-white hover:bg-white/20 p-2 rounded-lg">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              {editLoading ? (
                <div className="flex items-center justify-center py-16">
                  <span className="size-8 border-4 border-[#695be6]/20 border-t-[#695be6] rounded-full animate-spin" />
                </div>
              ) : editQuestions.length === 0 ? (
                <p className="text-center text-gray-400 py-12">No questions found for this homework.</p>
              ) : (
                editQuestions.map((q, qi) => (
                  <div key={q.id} className="border border-gray-200 rounded-xl p-4 space-y-3">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs font-bold text-[#695be6] bg-[#695be6]/10 px-2 py-0.5 rounded-full">Q{qi + 1}</span>
                      <select
                        value={q.answerType}
                        onChange={(e) => updateEditQuestion(qi, "answerType", e.target.value)}
                        className="text-xs border border-gray-200 rounded-lg px-2 py-1 focus:border-[#695be6] focus:ring-[#695be6]"
                      >
                        <option value="mcq">MCQ</option>
                        <option value="typed">Typed</option>
                        <option value="upload">Upload</option>
                      </select>
                      <input
                        type="number" min={1} max={20}
                        value={q.maxPoints}
                        onChange={(e) => updateEditQuestion(qi, "maxPoints", parseInt(e.target.value) || 1)}
                        className="w-16 text-xs border border-gray-200 rounded-lg px-2 py-1 focus:border-[#695be6] focus:ring-[#695be6]"
                      />
                      <span className="text-xs text-gray-400">pts</span>
                    </div>

                    <textarea
                      value={q.questionText}
                      onChange={(e) => updateEditQuestion(qi, "questionText", e.target.value)}
                      rows={2}
                      placeholder="Question text..."
                      className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:border-[#695be6] focus:ring-[#695be6] resize-none"
                    />

                    <input
                      value={q.hint}
                      onChange={(e) => updateEditQuestion(qi, "hint", e.target.value)}
                      placeholder="Hint (optional)..."
                      className="w-full text-xs border border-gray-200 rounded-lg px-3 py-1.5 focus:border-[#695be6] focus:ring-[#695be6]"
                    />

                    {q.answerType === "mcq" && (
                      <div className="space-y-2">
                        <p className="text-xs font-bold text-gray-500">Options (check the correct one)</p>
                        {q.options.map((opt, oi) => (
                          <div key={opt.id} className="flex items-center gap-2">
                            <input
                              type="radio"
                              name={`correct-${qi}`}
                              checked={opt.isCorrect}
                              onChange={() => updateEditOption(qi, oi, "isCorrect", true)}
                              className="accent-[#695be6]"
                            />
                            <input
                              value={opt.text}
                              onChange={(e) => updateEditOption(qi, oi, "text", e.target.value)}
                              placeholder={`Option ${oi + 1}`}
                              className="flex-1 text-sm border border-gray-200 rounded-lg px-3 py-1.5 focus:border-[#695be6] focus:ring-[#695be6]"
                            />
                            <button onClick={() => removeEditOption(qi, oi)} className="text-red-400 hover:text-red-600">
                              <span className="material-symbols-outlined text-sm">close</span>
                            </button>
                          </div>
                        ))}
                        {q.options.length < 6 && (
                          <button onClick={() => addEditOption(qi)} className="text-xs text-[#695be6] font-bold hover:underline flex items-center gap-1">
                            <span className="material-symbols-outlined text-sm">add</span> Add option
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>

            <div className="border-t border-gray-100 px-6 py-4 flex items-center justify-between gap-3 rounded-b-2xl">
              <div className="flex items-center gap-3">
                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <span className="relative inline-flex items-center">
                    <input
                      checked={editAllowRetries}
                      onChange={() => setEditAllowRetries(!editAllowRetries)}
                      className="sr-only peer"
                      type="checkbox"
                    />
                    <div className="w-10 h-5 bg-gray-200 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-[#695be6]"></div>
                  </span>
                  <span className="text-xs font-bold text-gray-600">Allow Retries</span>
                </label>
              </div>
              <div className="flex items-center gap-3">
              <button onClick={closeEditModal} className="px-5 py-2.5 border border-gray-200 rounded-xl text-sm font-bold hover:bg-gray-50">
                Cancel
              </button>
              <button
                onClick={saveEditQuestions}
                disabled={editSaving || editLoading}
                className="px-6 py-2.5 bg-[#695be6] text-white rounded-xl text-sm font-bold hover:bg-[#5a4dd4] disabled:opacity-50 flex items-center gap-2"
              >
                {editSaving && <span className="size-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />}
                {editSaving ? "Saving..." : "Save Questions"}
              </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}