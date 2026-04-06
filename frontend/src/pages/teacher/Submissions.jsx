import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import api from "../../api";
import SearchBar from "../../components/SearchBar";

export default function Submissions() {
  const navigate = useNavigate();
  const { user } = useAuth();
  
  const [submissions, setSubmissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all"); // all, pending, graded
  const [search, setSearch] = useState("");

  useEffect(() => {
    loadSubmissions();
  }, []);

  const loadSubmissions = async () => {
    try {
      setLoading(true);
      const response = await api.get("/teacher/submissions");
      setSubmissions(response.data);
    } catch (err) {
      console.error("Failed to load submissions:", err);
    } finally {
      setLoading(false);
    }
  };

  const filtered = submissions.filter((sub) => {
    const matchFilter = 
      filter === "all" ||
      (filter === "pending" && sub.status === "submitted") ||
      (filter === "graded" && sub.status === "graded");
    
    const matchSearch = 
      sub.student_name.toLowerCase().includes(search.toLowerCase()) ||
      sub.homework_title.toLowerCase().includes(search.toLowerCase());
    
    return matchFilter && matchSearch;
  });

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="size-12 border-4 border-[#695be6] border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-500">Loading submissions...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-[#faf9ff] min-h-screen" style={{ fontFamily: "'Lexend', sans-serif" }}>
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-white border-b border-gray-200">
        <div className="max-w-[1400px] mx-auto px-6 h-16 flex items-center gap-4">
          <button onClick={() => navigate("/teacher")} className="p-2 hover:bg-gray-100 rounded-lg">
            <span className="material-symbols-outlined text-gray-500">arrow_back</span>
          </button>
          <div className="size-8 bg-[#695be6] rounded-lg flex items-center justify-center text-white">
            <span className="material-symbols-outlined text-lg">assignment_turned_in</span>
          </div>
          <h1 className="font-black text-lg">All Submissions</h1>
          
          {/* Search */}
          <SearchBar
            value={search}
            onChange={setSearch}
            placeholder="Search by student or homework..."
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
        {/* Filters */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex gap-2">
            <button
              onClick={() => setFilter("all")}
              className={`px-4 py-2 rounded-xl text-sm font-bold transition-all ${
                filter === "all"
                  ? "bg-[#695be6] text-white"
                  : "bg-white border border-gray-200 text-gray-600 hover:border-[#695be6]"
              }`}
            >
              All ({submissions.length})
            </button>
            <button
              onClick={() => setFilter("pending")}
              className={`px-4 py-2 rounded-xl text-sm font-bold transition-all ${
                filter === "pending"
                  ? "bg-[#695be6] text-white"
                  : "bg-white border border-gray-200 text-gray-600 hover:border-[#695be6]"
              }`}
            >
              Pending Review ({submissions.filter(s => s.status === "submitted").length})
            </button>
            <button
              onClick={() => setFilter("graded")}
              className={`px-4 py-2 rounded-xl text-sm font-bold transition-all ${
                filter === "graded"
                  ? "bg-[#695be6] text-white"
                  : "bg-white border border-gray-200 text-gray-600 hover:border-[#695be6]"
              }`}
            >
              Graded ({submissions.filter(s => s.status === "graded").length})
            </button>
          </div>
          
          <p className="text-sm text-gray-500">{filtered.length} submissions</p>
        </div>

        {/* Submissions List */}
        {filtered.length === 0 ? (
          <div className="text-center py-20">
            <div className="size-20 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-4">
              <span className="material-symbols-outlined text-gray-400 text-4xl">assignment_turned_in</span>
            </div>
            <p className="text-gray-500 font-medium">No submissions found</p>
            <p className="text-sm text-gray-400 mt-1">Try adjusting your filters or search</p>
          </div>
        ) : (
          <div className="grid gap-4">
            {filtered.map((sub) => (
              <div
                key={sub.submission_id}
                className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 hover:shadow-md transition-shadow"
              >
                <div className="flex items-start gap-4">
                  {/* Student Avatar */}
                  <div className="size-12 rounded-full bg-gradient-to-br from-[#695be6] to-[#8e82f3] flex items-center justify-center text-white font-black text-lg shrink-0">
                    {sub.student_name?.[0] || "?"}
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <h3 className="font-black text-base">{sub.student_name}</h3>
                        <p className="text-sm text-gray-500">{sub.homework_title}</p>
                      </div>
                      <span className={`text-xs font-bold px-3 py-1 rounded-full ${
                        sub.status === "graded"
                          ? "bg-green-100 text-green-700"
                          : "bg-blue-100 text-blue-700"
                      }`}>
                        {sub.status === "graded" ? "Graded" : "Pending Review"}
                      </span>
                    </div>

                    <div className="flex items-center gap-4 text-xs text-gray-500 mb-3">
                      <span className="flex items-center gap-1">
                        <span className="material-symbols-outlined text-sm">book</span>
                        {sub.subject}
                      </span>
                      <span className="flex items-center gap-1">
                        <span className="material-symbols-outlined text-sm">schedule</span>
                        {new Date(sub.submitted_at).toLocaleDateString()} at {new Date(sub.submitted_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                      {sub.status === "graded" && sub.final_score_pct && (
                        <span className="flex items-center gap-1 text-green-600 font-bold">
                          <span className="material-symbols-outlined text-sm">grade</span>
                          {sub.final_score_pct}%
                        </span>
                      )}
                      {sub.can_download && (
                        <span className="flex items-center gap-1 text-blue-600">
                          <span className="material-symbols-outlined text-sm">attach_file</span>
                          {sub.file_urls?.length || 0} file(s)
                        </span>
                      )}
                    </div>

                    {/* Actions */}
                    <div className="flex gap-2">
                      <button
                        onClick={() => navigate(`/teacher/homework/evaluate/${sub.homework_id}`)}
                        className={`flex-1 text-white text-sm font-bold py-2 rounded-lg transition-colors ${
                          sub.status === "graded"
                            ? "bg-green-600 hover:bg-green-700"
                            : "bg-blue-600 hover:bg-blue-700"
                        }`}
                      >
                        {sub.status === "graded" ? "View Grade" : "Review Submission"}
                      </button>
                      <button
                        onClick={() => navigate(`/teacher/students/${sub.student_id}`)}
                        className="px-4 py-2 border border-gray-200 text-sm font-bold rounded-lg hover:bg-gray-50 transition-colors"
                      >
                        <span className="material-symbols-outlined text-base">person</span>
                      </button>
                      {sub.can_download && (
                        <button
                          onClick={() => {
                            sub.file_urls?.forEach(url => window.open(url, '_blank'));
                          }}
                          className="px-4 py-2 border border-gray-200 text-sm font-bold rounded-lg hover:bg-gray-50 transition-colors"
                        >
                          <span className="material-symbols-outlined text-base">download</span>
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
