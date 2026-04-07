import { useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { useDispatch, useSelector } from "react-redux";
import { fetchLearningGaps, fetchGapHealth, selectGaps, selectGapHealth } from "../../store/slices/learningGapsSlice";
import { LEARNING_GAPS } from "../../data/learningGapData";

export default function LearningGapHub() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const apiGaps = useSelector(selectGaps);
  const health = useSelector(selectGapHealth);

  useEffect(() => {
    dispatch(fetchLearningGaps());
    dispatch(fetchGapHealth());
  }, [dispatch]);

  const gaps = apiGaps.length ? apiGaps : LEARNING_GAPS;
  const criticalCount = gaps.filter((g) => g.severity === "critical").length;
  const healthScore = health?.score ?? 100;

  // "Take a Quiz" always goes to the quiz selector so students can pick any quiz
  const quizLink = "/student/learning-gaps/quizzes";

  return (
    <div className="min-h-screen bg-[#f6f6f8] flex flex-col" style={{ fontFamily: "'Lexend', sans-serif" }}>
      {/* Header */}
      <header className="flex items-center justify-between border-b border-[#685ae7]/10 bg-white px-6 md:px-10 py-4 sticky top-0 z-50">
        <div className="flex items-center gap-4">
          <button onClick={() => navigate("/student")} className="flex items-center gap-2 text-[#685ae7] hover:text-[#685ae7]/80 transition-colors group">
            <span className="material-symbols-outlined text-2xl group-hover:-translate-x-1 transition-transform">arrow_back</span>
            <span className="text-sm font-semibold hidden sm:inline">Back to Dashboard</span>
          </button>
        </div>
        <div className="flex items-center gap-3">
          <button className="flex items-center justify-center rounded-xl size-10 bg-[#685ae7]/10 text-[#685ae7] hover:bg-[#685ae7]/20 transition-colors">
            <span className="material-symbols-outlined">notifications</span>
          </button>
          <div className="size-10 rounded-full ring-2 ring-[#685ae7]/20 overflow-hidden bg-[#685ae7]/10 flex items-center justify-center">
            {user?.avatar
              ? <img src={user.avatar} alt="avatar" className="w-full h-full object-cover" />
              : <span className="text-[#685ae7] font-bold">{user?.name?.[0]}</span>
            }
          </div>
        </div>
      </header>

      <main className="flex flex-1 flex-col items-center justify-center px-6 py-12 md:py-20">
        <div className="max-w-[1024px] w-full flex flex-col items-center">

          {/* Hero */}
          <div className="text-center mb-12 md:mb-16">
            <span className="inline-block py-1 px-3 rounded-full bg-[#685ae7]/10 text-[#685ae7] text-xs font-bold uppercase tracking-wider mb-4">
              Remediation Hub
            </span>
            <h1 className="text-[#100e1b] text-4xl md:text-5xl font-black leading-tight tracking-tight mb-4">
              Close Your Learning Gaps
            </h1>
            <p className="text-[#575095] text-lg md:text-xl font-normal max-w-2xl mx-auto">
              Identify your weak spots and master new concepts with targeted practice and instant feedback.
            </p>
          </div>

          {/* Action cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 w-full">
            {/* My Learning Gaps */}
            <div className="group relative flex flex-col justify-between p-8 rounded-xl bg-white border border-[#685ae7]/10 hover:border-[#685ae7]/40 shadow-sm hover:shadow-xl hover:shadow-[#685ae7]/5 transition-all duration-300">
              <div className="mb-8">
                <div className="flex items-center justify-center size-14 rounded-lg bg-[#685ae7]/10 text-[#685ae7] mb-6 group-hover:scale-110 transition-transform duration-300">
                  <span className="material-symbols-outlined text-3xl">insights</span>
                </div>
                <h3 className="text-2xl font-bold text-[#100e1b] mb-3">My Learning Gaps</h3>
                <p className="text-[#575095] text-base leading-relaxed">
                  View detailed analysis of your academic weak spots and fix them. Based on your recent quiz performance and homework.
                </p>
                <div className="mt-6 flex items-center gap-2 px-3 py-1.5 rounded-lg bg-red-100 text-red-600 text-sm font-medium w-fit">
                  <span className="material-symbols-outlined text-sm">priority_high</span>
                  {criticalCount} Critical gaps identified
                </div>
                <div className="mt-2 flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[#685ae7]/10 text-[#685ae7] text-sm font-medium w-fit">
                  <span className="material-symbols-outlined text-sm">health_and_safety</span>
                  Health Score: {healthScore}%
                </div>
              </div>
              <Link
                to="/student/learning-gaps/gaps"
                className="w-full flex items-center justify-center gap-2 rounded-xl h-12 px-6 bg-[#685ae7] text-white font-bold hover:bg-[#685ae7]/90 transition-all shadow-lg shadow-[#685ae7]/20"
              >
                <span>View My Gaps</span>
                <span className="material-symbols-outlined text-sm">arrow_forward</span>
              </Link>
            </div>

            {/* Self-Assessment Quizzes */}
            <div className="group relative flex flex-col justify-between p-8 rounded-xl bg-white border border-[#685ae7]/10 hover:border-[#685ae7]/40 shadow-sm hover:shadow-xl hover:shadow-[#685ae7]/5 transition-all duration-300">
              <div className="mb-8">
                <div className="flex items-center justify-center size-14 rounded-lg bg-[#685ae7]/10 text-[#685ae7] mb-6 group-hover:scale-110 transition-transform duration-300">
                  <span className="material-symbols-outlined text-3xl">quiz</span>
                </div>
                <h3 className="text-2xl font-bold text-[#100e1b] mb-3">Self-Assessment Quizzes</h3>
                <p className="text-[#575095] text-base leading-relaxed">
                  Take unlimited practice tests to strengthen your concepts. Choose by subject, topic, or difficulty level.
                </p>
                <div className="mt-6 flex items-center gap-2 px-3 py-1.5 rounded-lg bg-green-100 text-green-600 text-sm font-medium w-fit">
                  <span className="material-symbols-outlined text-sm">bolt</span>
                  New quizzes available
                </div>
              </div>
              <Link
                to={quizLink}
                className="w-full flex items-center justify-center gap-2 rounded-xl h-12 px-6 bg-[#685ae7] text-white font-bold hover:bg-[#685ae7]/90 transition-all shadow-lg shadow-[#685ae7]/20"
              >
                <span>Take a Quiz</span>
                <span className="material-symbols-outlined text-sm">arrow_forward</span>
              </Link>
            </div>
          </div>

          {/* Social proof */}
          <div className="mt-16 text-center text-[#575095] flex flex-col items-center">
            <div className="flex -space-x-2 mb-4">
              {["bg-purple-300", "bg-blue-300", "bg-green-300"].map((c, i) => (
                <div key={i} className={`size-8 rounded-full ring-2 ring-white ${c} flex items-center justify-center text-white text-xs font-bold`}>
                  {["A", "B", "C"][i]}
                </div>
              ))}
              <div className="flex items-center justify-center size-8 rounded-full ring-2 ring-white bg-[#685ae7]/20 text-[10px] font-bold text-[#685ae7]">+12k</div>
            </div>
            <p className="text-sm font-medium">Join 12,000+ students mastering their courses today.</p>
          </div>
        </div>
      </main>

      <footer className="py-8 border-t border-[#685ae7]/5 text-center">
        <div className="flex items-center justify-center gap-2 text-[#685ae7]/40 mb-1">
          <span className="material-symbols-outlined text-lg">auto_awesome</span>
          <span className="text-xs font-semibold tracking-widest uppercase">Powered by Vin AI</span>
        </div>
      </footer>
    </div>
  );
}
