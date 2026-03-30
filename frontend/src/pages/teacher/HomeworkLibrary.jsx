import { useState, useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { homeworkLibrary as mockLibrary } from "../../data/teacherData";
import { fetchHomeworkLibrary, selectHomeworkLibrary, selectLibraryStatus } from "../../store/slices/homeworkSlice";

const STATUS_STYLES = {
  template: "bg-gray-100 text-gray-600",
  assigned: "bg-green-100 text-green-700",
  draft:    "bg-yellow-100 text-yellow-700",
};

const SUBJECT_TAG_STYLES = {
  MATH:      "bg-blue-100 text-blue-700",
  PHYSICS:   "bg-green-100 text-green-700",
  CHEMISTRY: "bg-orange-100 text-orange-700",
  BIOLOGY:   "bg-emerald-100 text-emerald-700",
};

const SUBJECTS = ["Math", "Physics", "Chemistry", "Biology"];
const CLASSES  = ["Class 6", "Class 7", "Class 8", "Class 9"];

export default function HomeworkLibrary() {
  const navigate = useNavigate();
  const { } = useAuth();
  const dispatch = useDispatch();
  const reduxLibrary = useSelector(selectHomeworkLibrary);
  const libStatus    = useSelector(selectLibraryStatus);
  const [search, setSearch] = useState("");
  const [selectedSubjects, setSelectedSubjects] = useState([]);
  const [selectedClasses, setSelectedClasses] = useState([]);
  const [viewMode, setViewMode] = useState("grid");
  const [page, setPage] = useState(1);
  const [library, setLibrary] = useState(mockLibrary);

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

  const toggleFilter = (arr, setArr, val) =>
    setArr(arr.includes(val) ? arr.filter((v) => v !== val) : [...arr, val]);

  const filtered = library.filter((hw) => {
    const matchSubject = selectedSubjects.length === 0 || selectedSubjects.includes(hw.subject);
    const matchClass   = selectedClasses.length === 0  || selectedClasses.includes(hw.class);
    const matchSearch  = hw.title.toLowerCase().includes(search.toLowerCase());
    return matchSubject && matchClass && matchSearch;
  });

  return (
    <div className="bg-[#faf9ff] min-h-screen" style={{ fontFamily: "'Lexend', sans-serif" }}>

      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-white border-b border-gray-200">
        <div className="max-w-[1200px] mx-auto px-6 h-16 flex items-center gap-4">
          <button onClick={() => navigate("/teacher")} className="p-2 hover:bg-gray-100 rounded-lg">
            <span className="material-symbols-outlined text-gray-500">arrow_back</span>
          </button>
          <div className="size-8 bg-[#695be6] rounded-lg flex items-center justify-center text-white">
            <span className="material-symbols-outlined text-lg">menu_book</span>
          </div>
          <h1 className="font-black text-lg">Homework Library</h1>
          <div className="flex-1 flex items-center gap-2 bg-gray-100 rounded-xl px-4 py-2 max-w-md">
            <span className="material-symbols-outlined text-gray-400 text-lg">search</span>
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="bg-transparent text-sm outline-none w-full placeholder-gray-400"
              placeholder="Search by topic, chapter, or keyword..."
            />
          </div>
          <div className="ml-auto flex items-center gap-3">
            <div className="relative p-2 hover:bg-gray-100 rounded-lg cursor-pointer">
              <span className="material-symbols-outlined text-gray-600">notifications</span>
            </div>
            <div className="size-9 rounded-full bg-[#695be6] flex items-center justify-center text-white font-bold text-sm">P</div>
            <button
              onClick={() => navigate("/teacher/homework/create")}
              className="flex items-center gap-2 bg-[#695be6] text-white font-bold px-4 py-2 rounded-xl hover:bg-[#5a4dd4] transition-colors"
            >
              <span className="material-symbols-outlined text-base">add</span> Create New Homework
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-[1200px] mx-auto pt-24 px-6 pb-12 flex gap-6">

        {/* Sidebar Filters */}
        <aside className="w-48 flex-shrink-0">
          <div className="flex items-center justify-between mb-4">
            <p className="text-xs font-black uppercase tracking-wide text-gray-500">Filters</p>
            <button
              onClick={() => { setSelectedSubjects([]); setSelectedClasses([]); }}
              className="text-xs text-[#695be6] font-semibold hover:underline"
            >
              Clear All
            </button>
          </div>

          {/* Subject */}
          <div className="mb-5">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm font-bold">Subject</p>
              <span className="material-symbols-outlined text-gray-400 text-base">expand_less</span>
            </div>
            {SUBJECTS.map((s) => (
              <label key={s} className="flex items-center gap-2 text-sm py-1 cursor-pointer">
                <input
                  type="checkbox"
                  checked={selectedSubjects.includes(s)}
                  onChange={() => toggleFilter(selectedSubjects, setSelectedSubjects, s)}
                  className="accent-[#695be6] size-4"
                />
                {s}
              </label>
            ))}
          </div>

          {/* Class */}
          <div className="mb-5">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm font-bold">Class</p>
              <span className="material-symbols-outlined text-gray-400 text-base">expand_less</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {CLASSES.map((c) => (
                <button
                  key={c}
                  onClick={() => toggleFilter(selectedClasses, setSelectedClasses, c)}
                  className={`text-xs font-semibold px-3 py-1 rounded-full border transition-colors ${
                    selectedClasses.includes(c)
                      ? "bg-[#695be6] text-white border-[#695be6]"
                      : "border-gray-200 text-gray-600 hover:border-[#695be6]"
                  }`}
                >
                  {c}
                </button>
              ))}
            </div>
          </div>

          {/* Type */}
          <div className="mb-5">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm font-bold">Type</p>
              <span className="material-symbols-outlined text-gray-400 text-base">expand_less</span>
            </div>
            {["Online Quiz", "Offline Worksheet"].map((t) => (
              <label key={t} className="flex items-center gap-2 text-sm py-1 cursor-pointer">
                <input type="radio" name="type" className="accent-[#695be6] size-4" />
                {t}
              </label>
            ))}
          </div>

          {/* Status */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm font-bold">Status</p>
              <span className="material-symbols-outlined text-gray-400 text-base">expand_less</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {["TEMPLATE", "DRAFT", "ASSIGNED"].map((s) => (
                <span key={s} className={`text-[10px] font-bold px-2 py-0.5 rounded cursor-pointer ${STATUS_STYLES[s.toLowerCase()]}`}>
                  {s}
                </span>
              ))}
            </div>
          </div>
        </aside>

        {/* Main Content */}
        <div className="flex-1">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="font-black text-xl">Homework Catalog</h2>
              <p className="text-sm text-gray-400">Showing {filtered.length} homework assignments</p>
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
          <div className={`grid gap-4 ${viewMode === "grid" ? "grid-cols-1 md:grid-cols-2 lg:grid-cols-3" : "grid-cols-1"}`}>
            {filtered.map((hw) => (
              <div key={hw.id} className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 flex flex-col gap-3 hover:shadow-md transition-shadow">
                <div className="flex items-start justify-between">
                  <div className="flex gap-1.5 flex-wrap">
                    {hw.tags.map((tag) => (
                      <span key={tag} className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                        SUBJECT_TAG_STYLES[tag] || STATUS_STYLES[tag.toLowerCase()] || "bg-gray-100 text-gray-600"
                      }`}>{tag}</span>
                    ))}
                  </div>
                  <button className={`${hw.starred ? "text-yellow-400" : "text-gray-300"} hover:text-yellow-400 transition-colors`}>
                    <span className="material-symbols-outlined text-xl">{hw.starred ? "star" : "star"}</span>
                  </button>
                </div>
                <div>
                  <h3 className="font-black text-base leading-tight">{hw.title}</h3>
                  <p className="text-xs text-gray-400 mt-0.5">{hw.chapter}</p>
                </div>
                <div className="flex items-center gap-3 text-xs text-gray-500">
                  {hw.questions && (
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
                  {hw.usedCount && (
                    <span className="flex items-center gap-1">
                      <span className="material-symbols-outlined text-sm">refresh</span> Used {hw.usedCount} times
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2 pt-1 border-t border-gray-50">
                  <button
                    onClick={() => navigate(`/teacher/homework/preview/${hw.id}`)}
                    className="flex items-center gap-1 text-xs font-semibold text-gray-500 hover:text-gray-700"
                  >
                    <span className="material-symbols-outlined text-sm">visibility</span> Preview
                  </button>
                  <button
                    onClick={() => navigate(`/teacher/homework/evaluate/${hw.id}`)}
                    className="flex-1 bg-[#695be6] text-white text-xs font-bold py-2 rounded-lg hover:bg-[#5a4dd4] transition-colors"
                  >
                    {hw.status === "assigned" ? "Evaluate" : "Use This"}
                  </button>
                  <button className="p-1.5 hover:bg-gray-100 rounded-lg">
                    <span className="material-symbols-outlined text-gray-400 text-base">more_vert</span>
                  </button>
                </div>
              </div>
            ))}

            {/* Add New Content card */}
            <button
              onClick={() => navigate("/teacher/homework/create")}
              className="bg-white rounded-xl border-2 border-dashed border-gray-200 p-4 flex flex-col items-center justify-center gap-2 hover:border-[#695be6] hover:bg-[#695be6]/5 transition-all min-h-[200px]"
            >
              <div className="size-10 rounded-full bg-[#695be6]/10 flex items-center justify-center">
                <span className="material-symbols-outlined text-[#695be6]">add</span>
              </div>
              <p className="font-bold text-sm">Add New Content</p>
              <p className="text-xs text-gray-400 text-center">Start building a new assignment from scratch</p>
            </button>
          </div>

          {/* Pagination */}
          <div className="flex items-center justify-center gap-2 mt-8">
            <button className="p-2 hover:bg-gray-100 rounded-lg">
              <span className="material-symbols-outlined text-gray-400">chevron_left</span>
            </button>
            {[1, 2, 3, "...", 8].map((p, i) => (
              <button
                key={i}
                onClick={() => typeof p === "number" && setPage(p)}
                className={`size-9 rounded-lg text-sm font-bold transition-colors ${
                  page === p ? "bg-[#695be6] text-white" : "hover:bg-gray-100 text-gray-600"
                }`}
              >
                {p}
              </button>
            ))}
            <button className="p-2 hover:bg-gray-100 rounded-lg">
              <span className="material-symbols-outlined text-gray-400">chevron_right</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
