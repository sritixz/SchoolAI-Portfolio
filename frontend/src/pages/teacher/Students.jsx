import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { useDispatch, useSelector } from "react-redux";
import { fetchStudentsByClass, selectStudentsByClass } from "../../store/slices/teacherSlice";
import SearchBar from "../../components/SearchBar";

const CLASSES = ["Grade 6-A", "Grade 6-B", "Grade 7-A"];

export default function Students() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const dispatch = useDispatch();
  const students = useSelector(selectStudentsByClass);
  
  const [selectedClass, setSelectedClass] = useState("Grade 6-A");
  const [search, setSearch] = useState("");
  const [viewMode, setViewMode] = useState("grid"); // grid or list
  const [openDropdown, setOpenDropdown] = useState(null); // Track which dropdown is open

  useEffect(() => {
    if (selectedClass) {
      dispatch(fetchStudentsByClass(selectedClass));
    }
  }, [selectedClass, dispatch]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = () => setOpenDropdown(null);
    if (openDropdown) {
      document.addEventListener("click", handleClickOutside);
      return () => document.removeEventListener("click", handleClickOutside);
    }
  }, [openDropdown]);

  const filtered = students.filter((s) =>
    s.name.toLowerCase().includes(search.toLowerCase()) ||
    (s.roll_no && s.roll_no.toString().includes(search))
  );

  return (
    <div className="bg-[#faf9ff] min-h-screen" style={{ fontFamily: "'Lexend', sans-serif" }}>
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-white border-b border-gray-200">
        <div className="max-w-[1400px] mx-auto px-6 h-16 flex items-center gap-4">
          <button onClick={() => navigate("/teacher")} className="p-2 hover:bg-gray-100 rounded-lg">
            <span className="material-symbols-outlined text-gray-500">arrow_back</span>
          </button>
          <div className="size-8 bg-[#695be6] rounded-lg flex items-center justify-center text-white">
            <span className="material-symbols-outlined text-lg">group</span>
          </div>
          <h1 className="font-black text-lg">My Students</h1>
          
          {/* Search */}
          <SearchBar
            value={search}
            onChange={setSearch}
            placeholder="Search by name or roll number..."
            resultCount={filtered.length}
            width="max-w-md"
          />

          <div className="ml-auto flex items-center gap-3">
            <div className="relative p-2 hover:bg-gray-100 rounded-lg cursor-pointer">
              <span className="material-symbols-outlined text-gray-600">notifications</span>
            </div>
            <div className="size-9 rounded-full bg-[#695be6] flex items-center justify-center text-white font-bold text-sm">
              {user?.name?.[0] || "T"}
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-[1400px] mx-auto pt-24 px-6 pb-12">
        {/* Controls */}
        <div className="flex items-center justify-between mb-6">
          {/* Class Selector */}
          <div className="flex items-center gap-3">
            <label className="text-sm font-bold text-gray-600">Class:</label>
            <div className="flex gap-2">
              {CLASSES.map((cls) => (
                <button
                  key={cls}
                  onClick={() => setSelectedClass(cls)}
                  className={`px-4 py-2 rounded-xl text-sm font-bold transition-all ${
                    selectedClass === cls
                      ? "bg-[#695be6] text-white"
                      : "bg-white border border-gray-200 text-gray-600 hover:border-[#695be6]"
                  }`}
                >
                  {cls}
                </button>
              ))}
            </div>
          </div>

          {/* View Toggle */}
          <div className="flex items-center gap-3">
            <p className="text-sm text-gray-500">{filtered.length} students</p>
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
          </div>
        </div>

        {/* Students Grid/List */}
        {filtered.length === 0 ? (
          <div className="text-center py-20">
            <div className="size-20 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-4">
              <span className="material-symbols-outlined text-gray-400 text-4xl">group_off</span>
            </div>
            <p className="text-gray-500 font-medium">No students found</p>
            <p className="text-sm text-gray-400 mt-1">Try a different search or class</p>
          </div>
        ) : (
          <div className={`grid gap-4 ${viewMode === "grid" ? "grid-cols-1 md:grid-cols-2 lg:grid-cols-3" : "grid-cols-1"}`}>
            {filtered.map((student) => (
              <div
                key={student.id}
                className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 hover:shadow-md transition-shadow"
              >
                {/* Student Header */}
                <div className="flex items-start gap-4 mb-4">
                  <div className="size-14 rounded-full bg-gradient-to-br from-[#695be6] to-[#8e82f3] flex items-center justify-center text-white font-black text-xl shrink-0">
                    {student.name?.[0] || "?"}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-black text-base leading-tight truncate">{student.name}</h3>
                    {student.roll_no && (
                      <p className="text-xs text-gray-400 mt-0.5">Roll #{student.roll_no}</p>
                    )}
                    <div className="flex items-center gap-2 mt-2">
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-blue-100 text-blue-700">
                        {selectedClass}
                      </span>
                      {student.section_id && (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-gray-100 text-gray-600">
                          Section {student.section_id.slice(-2)}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Quick Stats */}
                <div className="grid grid-cols-3 gap-2 mb-4 pb-4 border-b border-gray-50">
                  <div className="text-center">
                    <p className="text-xs text-gray-400">Homework</p>
                    <p className="text-lg font-black text-[#695be6]">
                      {student.homework_completed || 0}/{student.homework_total || 0}
                    </p>
                  </div>
                  <div className="text-center">
                    <p className="text-xs text-gray-400">Avg Score</p>
                    <p className="text-lg font-black text-green-600">
                      {student.avg_score || 0}%
                    </p>
                  </div>
                  <div className="text-center">
                    <p className="text-xs text-gray-400">Attendance</p>
                    <p className="text-lg font-black text-amber-600">
                      {student.attendance || 95}%
                    </p>
                  </div>
                </div>

                {/* Actions */}
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => navigate(`/teacher/students/${student.id}`)}
                    className="flex items-center justify-center gap-1.5 px-3 py-2 bg-[#695be6] text-white text-xs font-bold rounded-lg hover:bg-[#5a4dd4] transition-colors"
                  >
                    <span className="material-symbols-outlined text-sm">assignment</span>
                    Homework
                  </button>
                  <button
                    onClick={() => {
                      if (student.parent_id) {
                        navigate(`/teacher/communication?parent=${student.parent_id}`);
                      } else {
                        alert("No parent linked to this student");
                      }
                    }}
                    disabled={!student.parent_id}
                    className={`flex items-center justify-center gap-1.5 px-3 py-2 border border-gray-200 text-xs font-bold rounded-lg transition-colors ${
                      student.parent_id
                        ? "text-gray-700 hover:bg-gray-50"
                        : "text-gray-400 cursor-not-allowed"
                    }`}
                  >
                    <span className="material-symbols-outlined text-sm">family_restroom</span>
                    {student.parent_name ? student.parent_name.split(" ")[0] : "Parent"}
                  </button>
                </div>

                {/* More Actions Dropdown */}
                <div className="relative">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setOpenDropdown(openDropdown === student.id ? null : student.id);
                    }}
                    className="w-full mt-2 flex items-center justify-center gap-1 px-3 py-2 text-xs font-semibold text-gray-500 hover:bg-gray-50 rounded-lg transition-colors"
                  >
                    <span className="material-symbols-outlined text-sm">more_horiz</span>
                    More Actions
                  </button>

                  {/* Dropdown Menu */}
                  {openDropdown === student.id && (
                    <div className="absolute left-0 right-0 top-full mt-1 bg-white rounded-lg shadow-lg border border-gray-200 py-2 z-10">
                      <button
                        onClick={() => {
                          navigate(`/teacher/students/${student.id}?tab=profile`);
                          setOpenDropdown(null);
                        }}
                        className="w-full px-4 py-2 text-left text-sm hover:bg-gray-50 flex items-center gap-2"
                      >
                        <span className="material-symbols-outlined text-sm text-gray-500">person</span>
                        View Profile
                      </button>
                      <button
                        onClick={() => {
                          navigate(`/teacher/students/${student.id}?tab=submissions`);
                          setOpenDropdown(null);
                        }}
                        className="w-full px-4 py-2 text-left text-sm hover:bg-gray-50 flex items-center gap-2"
                      >
                        <span className="material-symbols-outlined text-sm text-gray-500">assignment_turned_in</span>
                        View Submissions
                      </button>
                      {student.parent_id && (
                        <button
                          onClick={() => {
                            navigate(`/teacher/communication?parent=${student.parent_id}`);
                            setOpenDropdown(null);
                          }}
                          className="w-full px-4 py-2 text-left text-sm hover:bg-gray-50 flex items-center gap-2"
                        >
                          <span className="material-symbols-outlined text-sm text-gray-500">mail</span>
                          Message Parent
                        </button>
                      )}
                      <button
                        onClick={() => {
                          // TODO: Implement learning gaps view
                          alert("Learning gaps view coming soon");
                          setOpenDropdown(null);
                        }}
                        className="w-full px-4 py-2 text-left text-sm hover:bg-gray-50 flex items-center gap-2"
                      >
                        <span className="material-symbols-outlined text-sm text-gray-500">analytics</span>
                        View Learning Gaps
                      </button>
                      <div className="border-t border-gray-100 my-1"></div>
                      <button
                        onClick={() => {
                          // TODO: Implement export report
                          alert("Export report feature coming soon");
                          setOpenDropdown(null);
                        }}
                        className="w-full px-4 py-2 text-left text-sm hover:bg-gray-50 flex items-center gap-2"
                      >
                        <span className="material-symbols-outlined text-sm text-gray-500">download</span>
                        Export Report
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
