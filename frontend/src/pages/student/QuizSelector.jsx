import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { useAuth } from "../../context/AuthContext";
import { getInitial } from "../../utils/nameUtils";
import { fetchLearningGaps, selectGaps, selectGapsStatus } from "../../store/slices/learningGapsSlice";

const SEVERITY_COLORS = {
  minor: "bg-green-100 text-green-700",
  moderate: "bg-amber-100 text-amber-700",
  critical: "bg-red-100 text-red-700",
};

const SUBJECT_COLORS = {
  Math:      "bg-purple-100 text-purple-700",
  Physics:   "bg-blue-100 text-blue-700",
  Chemistry: "bg-emerald-100 text-emerald-700",
  Biology:   "bg-teal-100 text-teal-700",
  History:   "bg-amber-100 text-amber-700",
  Mathematics: "bg-purple-100 text-purple-700",
};

export default function QuizSelector() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const apiGaps = useSelector(selectGaps);
  const status = useSelector(selectGapsStatus);

  const [subjectFilter, setSubjectFilter] = useState("All");

  useEffect(() => { dispatch(fetchLearningGaps()); }, [dispatch]);

  const gaps = apiGaps.length ? apiGaps : [];

  const subjects = ["All", ...new Set(gaps.map((g) => g.subject))];

  const filtered = gaps.filter((g) => {
    const matchSub  = subjectFilter === "All" || g.subject === subjectFilter;
    return matchSub;
  });

  return (
    <div className="min-h-screen bg-[#f6f6f8] flex flex-col" style={{ fontFamily: "'Lexend', sans-serif" }}>
      {/* Header */}
      <header className="flex items-center justify-between border-b border-[#685ae7]/10 bg-white px-6 md:px-10 py-4 sticky top-0 z-50">
        <button
          onClick={() => navigate("/student/learning-gaps")}
          className="flex items-center gap-2 text-[#685ae7] hover:text-[#685ae7]/80 transition-colors group"
        >
          <span className="material-symbols-outlined text-2xl group-hover:-translate-x-1 transition-transform">arrow_back</span>
          <span className="text-sm font-semibold hidden sm:inline">Back</span>
        </button>
        <h1 className="text-lg font-black text-[#100e1b]">Self-Assessment Quizzes</h1>
        <div className="size-10 rounded-full ring-2 ring-[#685ae7]/20 overflow-hidden bg-[#685ae7]/10 flex items-center justify-center">
          {user?.avatar
            ? <img src={user.avatar} alt="avatar" className="w-full h-full object-cover" />
            : <span className="text-[#685ae7] font-bold">{getInitial(user?.name)}</span>
          }
        </div>
      </header>

      <main className="flex-1 px-6 md:px-10 py-8 max-w-5xl mx-auto w-full">
        {/* Filters */}
        <div className="flex flex-wrap gap-3 mb-8">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Subject:</span>
            {subjects.map((s) => (
              <button
                key={s}
                onClick={() => setSubjectFilter(s)}
                className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all ${
                  subjectFilter === s
                    ? "bg-[#685ae7] text-white shadow-md shadow-[#685ae7]/20"
                    : "bg-white text-slate-600 border border-slate-200 hover:border-[#685ae7]/40"
                }`}
              >
                {s}
              </button>
            ))}
          </div>
        </div>

        {/* Quiz grid */}
        {status === "loading" && !gaps.length ? (
          <div className="flex justify-center py-20">
            <span className="material-symbols-outlined animate-spin text-[#685ae7] text-4xl">progress_activity</span>
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-20 text-slate-400">
            <span className="material-symbols-outlined text-5xl mb-3 block">search_off</span>
            <p className="font-semibold mb-1">No topics need fixing right now.</p>
            <p className="text-sm mb-6">Complete more homework to analyze your performance.</p>
            <Link
              to="/student/learning-gaps/gaps"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#685ae7] text-white text-sm font-bold hover:bg-[#685ae7]/90 transition-all"
            >
              <span className="material-symbols-outlined text-sm">insights</span>
              View My Learning Gaps
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {filtered.map((gap) => {
              const gapId = gap._id;
              return (
                <Link
                  key={gapId}
                  to={`/student/learning-gaps/quiz/${gapId}`}
                  className="group flex flex-col justify-between bg-white rounded-xl border border-[#685ae7]/10 hover:border-[#685ae7]/40 shadow-sm hover:shadow-lg hover:shadow-[#685ae7]/5 p-6 transition-all duration-200"
                >
                  <div>
                    <div className="flex items-center justify-between mb-4">
                      <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${SUBJECT_COLORS[gap.subject] ?? "bg-slate-100 text-slate-600"}`}>
                        {gap.subject}
                      </span>
                      <span className={`px-2.5 py-1 rounded-full text-xs font-bold capitalize ${SEVERITY_COLORS[gap.severity] ?? "bg-slate-100 text-slate-600"}`}>
                        {gap.severity} Gap
                      </span>
                    </div>
                    <h3 className="text-base font-bold text-[#100e1b] mb-1 group-hover:text-[#685ae7] transition-colors">
                      {gap.topic} Assessment
                    </h3>
                    {gap.subtopic && (
                      <p className="text-xs text-slate-400 mb-4">{gap.subtopic}</p>
                    )}
                  </div>
                  <div className="flex items-center justify-between mt-4 pt-4 border-t border-slate-100">
                    <div className="flex items-center gap-3 text-xs text-slate-500">
                      <span className="flex items-center gap-1">
                        <span className="material-symbols-outlined text-sm">quiz</span>
                        5 Qs
                      </span>
                      <span className="flex items-center gap-1">
                        <span className="material-symbols-outlined text-sm">schedule</span>
                        5m
                      </span>
                    </div>
                    <span className="material-symbols-outlined text-[#685ae7] group-hover:translate-x-1 transition-transform">
                      arrow_forward
                    </span>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
