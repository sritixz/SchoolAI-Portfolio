import { useState, useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { homeworkLibrary as mockLibrary } from "../../data/teacherData";
import { 
  fetchHomeworkLibrary, selectHomeworkLibrary, selectLibraryStatus,
  assignHomework,
} from "../../store/slices/homeworkSlice";
import { fetchStudentsByClass, selectStudentsByClass } from "../../store/slices/teacherSlice";
import SearchBar from "../../components/SearchBar";

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
  const [viewMode, setViewMode] = useState("grid");
  const [page, setPage] = useState(1);
  const [library, setLibrary] = useState(mockLibrary);
  
  // Assignment modal state
  const [assignModal, setAssignModal] = useState(null); // { homeworkId, title, classLevel }
  const [selectedStudents, setSelectedStudents] = useState([]);
  const [dueDate, setDueDate] = useState("");
  const [assigning, setAssigning] = useState(false);
  const [assignError, setAssignError] = useState("");

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

  const filtered = library.filter((hw) => {
    const matchSubject = selectedSubjects.length === 0 || selectedSubjects.includes(hw.subject);
    const matchClass   = selectedClasses.length === 0  || selectedClasses.includes(hw.class);
    const matchSearch  = hw.title.toLowerCase().includes(search.toLowerCase());
    return matchSubject && matchClass && matchSearch;
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
            <div className="size-9 rounded-full bg-[#695be6] flex items-center justify-center text-white font-semibold text-sm">{user?.name?.[0] || "T"}</div>
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
              onClick={() => { setSelectedSubjects([]); setSelectedClasses([]); }}
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
                  onChange={() => toggleFilter(selectedSubjects, setSelectedSubjects, s)}
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
                  onClick={() => toggleFilter(selectedClasses, setSelectedClasses, c)}
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
            {["Online Quiz", "Offline Worksheet"].map((t) => (
              <label key={t} className="flex items-center gap-2.5 text-sm py-1.5 cursor-pointer">
                <input type="radio" name="type" className="accent-[#695be6] size-4" />
                <span className="text-gray-600">{t}</span>
              </label>
            ))}
          </div>

          {/* Status */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <p className="text-sm font-semibold text-gray-700">Status</p>
              <span className="material-symbols-outlined text-gray-400 text-base">expand_less</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {["TEMPLATE", "DRAFT", "ASSIGNED"].map((s) => (
                <span key={s} className={`text-[10px] font-semibold px-2.5 py-1 rounded-md cursor-pointer transition-all hover:bg-[#695be6] hover:text-white ${STATUS_STYLES[s.toLowerCase()]}`}>
                  {s}
                </span>
              ))}
            </div>
          </div>
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
              <div className="flex gap-2">
                {selectedSubjects.map((s) => (
                  <span key={s} className="flex items-center gap-1 bg-gray-100 text-sm px-3 py-1 rounded-full">
                    {s}
                    <button onClick={() => toggleFilter(selectedSubjects, setSelectedSubjects, s)}>
                      <span className="material-symbols-outlined text-gray-400 text-sm">close</span>
                    </button>
                  </span>
                ))}
                {selectedClasses.map((c) => (
                  <span key={c} className="flex items-center gap-1 bg-gray-100 text-sm px-3 py-1 rounded-full">
                    {c}
                    <button onClick={() => toggleFilter(selectedClasses, setSelectedClasses, c)}>
                      <span className="material-symbols-outlined text-gray-400 text-sm">close</span>
                    </button>
                  </span>
                ))}
                {(selectedSubjects.length > 0 || selectedClasses.length > 0) && (
                  <button
                    onClick={() => { setSelectedSubjects([]); setSelectedClasses([]); }}
                    className="text-sm text-[#695be6] font-semibold hover:underline"
                  >
                    Clear all active filters
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
              <div key={hw.id} className="group bg-white rounded-2xl border border-[#e8e3f5] p-5 flex flex-col gap-4 shadow-sm hover:shadow-lg hover:border-[#695be6]/30 transition-all duration-300">
                <div className="flex items-start justify-between">
                  <div className="flex gap-1.5 flex-wrap">
                    {hw.tags.map((tag) => (
                      <span key={tag} className={`text-[10px] font-semibold px-2 py-0.5 rounded-md ${
                        SUBJECT_TAG_STYLES[tag?.toUpperCase()] || STATUS_STYLES[tag?.toLowerCase()] || "bg-gray-100 text-gray-500"
                      }`}>{tag}</span>
                    ))}
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
                <div className="flex items-center gap-2 pt-3 border-t border-[#f0ecfa]">
                  <button
                    onClick={() => navigate(`/teacher/homework/preview/${hw.id}`)}
                    className="flex items-center gap-1 text-xs font-medium text-gray-400 hover:text-[#695be6] transition-colors"
                  >
                    <span className="material-symbols-outlined text-sm">visibility</span> Preview
                  </button>
                  <div className="flex-1" />
                  {hw.status === "assigned" ? (
                    <button
                      onClick={() => navigate(`/teacher/homework/evaluate/${hw.id}`)}
                      className="bg-[#695be6] text-white text-xs font-semibold py-2 px-4 rounded-lg hover:bg-[#5a4dd4] transition-colors"
                    >
                      Evaluate
                    </button>
                  ) : (
                    <button
                      onClick={() => openAssignModal(hw)}
                      className="bg-[#695be6] text-white text-xs font-semibold py-2 px-4 rounded-lg hover:bg-[#5a4dd4] transition-colors"
                    >
                      Assign
                    </button>
                  )}
                  <button className="p-1.5 hover:bg-[#f0ecfa] rounded-lg transition-colors">
                    <span className="material-symbols-outlined text-gray-400 text-base">more_vert</span>
                  </button>
                </div>
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
    </div>
  );
}
