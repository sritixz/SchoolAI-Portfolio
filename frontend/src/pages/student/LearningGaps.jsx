import { useState, useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import {
  GAP_SUBJECTS, SEVERITY_UI, SUBJECT_BADGE_UI,
  getGapsBySubject,
} from "../../data/learningGapData";
import {
  fetchLearningGaps, fetchGapHealth, analyzeGaps,
  selectGaps, selectGapsStatus, selectGapHealth,
  selectAnalyzeStatus, selectAnalyzeResult,
} from "../../store/slices/learningGapsSlice";

// ── Health score ring ────────────────────────────────────────
function HealthRing({ score }) {
  const r = 58;
  const circ = 2 * Math.PI * r;
  const offset = circ - (score / 100) * circ;
  return (
    <svg className="size-32 -rotate-90" viewBox="0 0 128 128">
      <circle cx="64" cy="64" r={r} fill="transparent" stroke="#f1f5f9" strokeWidth="8" />
      <circle cx="64" cy="64" r={r} fill="transparent" stroke="#ec5b13" strokeWidth="8"
        strokeDasharray={circ} strokeDashoffset={offset} strokeLinecap="round" />
    </svg>
  );
}

// ── Gap card ─────────────────────────────────────────────────
function GapCard({ gap }) {
  const sev  = SEVERITY_UI[gap.severity] || SEVERITY_UI.minor;
  const subj = SUBJECT_BADGE_UI[gap.subject] || "bg-gray-100 text-gray-600";
  const gapId = gap._id || gap.id;

  // Safe split helper — handles missing impactSubject/prerequisiteSubject
  const splitText = (text, keyword) => {
    if (!text || !keyword) return [text || "", ""];
    const parts = text.split(keyword);
    return parts.length > 1 ? [parts[0], parts.slice(1).join(keyword)] : [text, ""];
  };

  const [impactBefore, impactAfter] = splitText(gap.impactAnalysis, gap.impactSubject);
  const [prereqBefore, prereqAfter] = splitText(gap.prerequisiteDependency, gap.prerequisiteSubject);

  return (
    <div className={`bg-white rounded-xl border-l-4 ${sev.borderColor} border-y border-r border-slate-200 p-6 shadow-sm hover:shadow-md transition-all`}>
      {/* Top row */}
      <div className="flex flex-col md:flex-row md:items-start justify-between gap-4 mb-6">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${subj}`}>{gap.subject}</span>
            <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${sev.badge}`}>{sev.label}</span>
          </div>
          <h3 className="text-xl font-bold text-slate-900">{gap.topic}</h3>
          <p className="text-sm text-slate-400 mt-0.5">{gap.subtopic}</p>
        </div>
        <button className="p-2 rounded-full hover:bg-slate-100 self-start">
          <span className="material-symbols-outlined">more_vert</span>
        </button>
      </div>

      {/* AI error summary — shown when available */}
      {gap.aiErrorSummary && (
        <div className="mb-6 p-4 rounded-lg bg-rose-50 border border-rose-100">
          <div className="flex items-center gap-2 text-rose-600 mb-1">
            <span className="material-symbols-outlined text-sm">error</span>
            <p className="text-xs font-semibold uppercase tracking-wide">What went wrong</p>
          </div>
          <p className="text-sm text-rose-700">{gap.aiErrorSummary}</p>
        </div>
      )}

      {/* AI last feedback — shown when available */}
      {gap.aiLastFeedback && (
        <div className="mb-6 p-4 rounded-lg bg-[#685ae7]/5 border border-[#685ae7]/10">
          <div className="flex items-center gap-2 text-[#685ae7] mb-1">
            <span className="material-symbols-outlined text-sm">smart_toy</span>
            <p className="text-xs font-semibold uppercase tracking-wide">Vin's Coaching Note</p>
          </div>
          <p className="text-sm text-slate-700">{gap.aiLastFeedback}</p>
        </div>
      )}

      {/* Meta grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
        <div className="space-y-1.5">
          <div className="flex items-center gap-2 text-slate-400">
            <span className="material-symbols-outlined text-sm">description</span>
            <p className="text-xs font-semibold uppercase tracking-wide">Identified from</p>
          </div>
          <p className="text-sm font-medium text-[#ec5b13] flex items-center gap-1 cursor-pointer hover:underline">
            {typeof gap.identifiedFrom === "object" ? gap.identifiedFrom?.title : gap.identifiedFrom}
            <span className="material-symbols-outlined text-xs">open_in_new</span>
          </p>
        </div>
        {gap.impactAnalysis && (
          <div className="space-y-1.5">
            <div className="flex items-center gap-2 text-slate-400">
              <span className="material-symbols-outlined text-sm">trending_up</span>
              <p className="text-xs font-semibold uppercase tracking-wide">Impact Analysis</p>
            </div>
            <p className="text-sm text-slate-600">
              {impactBefore}
              {gap.impactSubject && <span className="font-bold text-slate-800">{gap.impactSubject}</span>}
              {impactAfter}
            </p>
          </div>
        )}
        {gap.prerequisiteDependency && (
          <div className="space-y-1.5">
            <div className="flex items-center gap-2 text-slate-400">
              <span className="material-symbols-outlined text-sm">link</span>
              <p className="text-xs font-semibold uppercase tracking-wide">Prerequisite</p>
            </div>
            <p className="text-sm text-slate-600">
              {prereqBefore}
              {gap.prerequisiteSubject && <span className="font-bold text-slate-800">{gap.prerequisiteSubject}</span>}
              {prereqAfter}
            </p>
          </div>
        )}
      </div>

      {/* Mastery bar */}
      <div className="mb-6">
        <div className="flex justify-between text-xs mb-1.5">
          <span className="text-slate-400 font-semibold uppercase tracking-wide">Mastery</span>
          <span className="font-bold text-slate-700">{gap.masteryPercent ?? gap.score ?? 0}%</span>
        </div>
        <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full ${gap.severity === "critical" ? "bg-[#ec5b13]" : gap.severity === "moderate" ? "bg-orange-400" : "bg-slate-400"}`}
            style={{ width: `${gap.masteryPercent ?? gap.score ?? 0}%` }}
          />
        </div>
      </div>

      {/* Actions */}
      <div className="pt-5 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex flex-wrap gap-2 w-full sm:w-auto">
          {(gap.correctivePath || []).map((cp) => (
            <button key={cp.type} className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 transition-colors text-xs font-bold">
              <span className="material-symbols-outlined text-base">{cp.icon}</span>{cp.label}
            </button>
          ))}
          <Link
            to="/student/vin-ai"
            className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-[#685ae7]/10 text-[#685ae7] hover:bg-[#685ae7]/20 transition-colors text-xs font-bold border border-[#685ae7]/20"
          >
            <span className="material-symbols-outlined text-base">smart_toy</span>Ask LumiTutor
          </Link>
        </div>
        <Link
          to={`/student/learning-gaps/gaps/${gapId}`}
          className="w-full sm:w-auto px-8 py-3 rounded-xl bg-[#ec5b13] text-white font-bold hover:bg-[#ec5b13]/90 transition-all shadow-lg shadow-[#ec5b13]/20 hover:scale-[1.02] active:scale-[0.98] text-center"
        >
          {sev.actionLabel}
        </Link>
      </div>
    </div>
  );
}

// ── Main dashboard ───────────────────────────────────────────
export default function LearningGaps() {
  const navigate = useNavigate();
  const { } = useAuth();
  const dispatch = useDispatch();
  const [activeSubject, setActiveSubject] = useState("All");
  const reduxGaps     = useSelector(selectGaps);
  const gapsStatus    = useSelector(selectGapsStatus);
  const reduxHealth   = useSelector(selectGapHealth);
  const analyzeStatus = useSelector(selectAnalyzeStatus);
  const analyzeResult = useSelector(selectAnalyzeResult);
  const [gaps,   setGaps]   = useState([]);  // Start empty, not with fake data
  const [health, setHealth] = useState({ score: 100, maxScore: 100, totalGaps: 0, resolvedGaps: 0, severity: { critical: 0, moderate: 0, minor: 0 } });
  const [analyzeMsg, setAnalyzeMsg] = useState(null);
  const [initialLoadDone, setInitialLoadDone] = useState(false);

  useEffect(() => {
    dispatch(fetchLearningGaps());
    dispatch(fetchGapHealth());
  }, [dispatch]);

  // Update gaps when Redux data arrives
  useEffect(() => {
    if (gapsStatus === "succeeded") {
      setGaps(reduxGaps);
      setInitialLoadDone(true);
    }
  }, [reduxGaps, gapsStatus]);

  useEffect(() => { if (reduxHealth?.score !== undefined) setHealth((p) => ({ ...p, ...reduxHealth })); }, [reduxHealth]);

  // After analysis completes, refresh gaps and show message
  useEffect(() => {
    if (analyzeStatus === "succeeded" && analyzeResult) {
      setAnalyzeMsg(analyzeResult.message);
      dispatch(fetchLearningGaps());
      dispatch(fetchGapHealth());
      setTimeout(() => setAnalyzeMsg(null), 6000);
    }
  }, [analyzeStatus, analyzeResult, dispatch]);

  const handleAnalyze = () => {
    setAnalyzeMsg(null);
    dispatch(analyzeGaps());
  };

  const isAnalyzing = analyzeStatus === "loading";
  const isLoading = gapsStatus === "loading" && !initialLoadDone;

  const filtered = activeSubject === "All" ? gaps : gaps.filter((g) => g.subject === activeSubject);
  const h = health;
  const sevCounts = h.severity || { critical: 0, moderate: 0, minor: 0 };
  const totalForPct = (sevCounts.critical + sevCounts.moderate + sevCounts.minor) || 1;
  const sevPcts = {
    critical: (sevCounts.critical / totalForPct) * 100,
    moderate: (sevCounts.moderate / totalForPct) * 100,
    minor:    (sevCounts.minor    / totalForPct) * 100,
  };

  return (
    <div className="min-h-screen bg-[#f8f6f6]" style={{ fontFamily: "'Lexend', sans-serif" }}>
      {/* Header */}
      <header className="sticky top-0 z-50 w-full bg-white backdrop-blur-md border-b border-slate-200 px-4 md:px-10 py-3">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button onClick={() => navigate("/student/learning-gaps")} className="flex items-center gap-2 text-slate-600 hover:text-[#ec5b13] transition-colors">
              <span className="material-symbols-outlined">arrow_back</span>
              <span className="text-sm font-medium hidden sm:inline">Back</span>
            </button>
            <div className="h-6 w-px bg-slate-200 mx-2" />
            <h1 className="text-lg md:text-xl font-bold tracking-tight">Learning Gap Management</h1>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleAnalyze}
              disabled={isAnalyzing}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-[#685ae7] text-white text-sm font-bold hover:bg-[#685ae7]/90 transition-all disabled:opacity-60 disabled:cursor-not-allowed shadow-sm"
            >
              {isAnalyzing
                ? <><span className="material-symbols-outlined text-base animate-spin">progress_activity</span><span className="hidden sm:inline">Analyzing...</span></>
                : <><span className="material-symbols-outlined text-base">psychology</span><span className="hidden sm:inline">Re-analyze</span></>
              }
            </button>
            <button className="p-2 rounded-xl hover:bg-slate-100 text-slate-500 transition-colors">
              <span className="material-symbols-outlined">info</span>
            </button>
          </div>
        </div>
      </header>

      {/* Analyze result toast */}
      {analyzeMsg && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-50 px-5 py-3 rounded-xl bg-[#685ae7] text-white text-sm font-semibold shadow-xl flex items-center gap-2 animate-bounce-once">
          <span className="material-symbols-outlined text-base">check_circle</span>
          {analyzeMsg}
        </div>
      )}

      <main className="max-w-7xl mx-auto px-4 md:px-10 py-8 space-y-8">

        {/* Overview */}
        <section className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Health score */}
          <div className="lg:col-span-4 bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex flex-col items-center justify-center text-center">
            <h3 className="text-slate-500 text-sm font-medium mb-4">Gap Health Score</h3>
            <div className="relative flex items-center justify-center">
              <HealthRing score={h.score} />
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-3xl font-bold">{h.score}<span className="text-lg text-slate-400">/{h.maxScore}</span></span>
                <span className="text-xs font-semibold text-emerald-500 flex items-center gap-0.5">
                  <span className="material-symbols-outlined text-sm">trending_up</span>{h.trend}
                </span>
              </div>
            </div>
            <p className="mt-4 text-xs text-slate-400 max-w-[200px]">{h.improvementMessage}</p>
          </div>

          {/* Stats */}
          <div className="lg:col-span-8 grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm hover:border-[#ec5b13]/30 transition-colors">
              <div className="flex items-center justify-between mb-4">
                <div className="p-2 rounded-lg bg-[#ec5b13]/10 text-[#ec5b13]">
                  <span className="material-symbols-outlined">warning</span>
                </div>
                <span className="text-xs font-medium text-rose-500">{h.totalGapsTrend}</span>
              </div>
              <p className="text-sm text-slate-500 font-medium">Total Gaps</p>
              <p className="text-3xl font-bold mt-1">{h.totalGaps}</p>
            </div>

            <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm hover:border-green-300 transition-colors">
              <div className="flex items-center justify-between mb-4">
                <div className="p-2 rounded-lg bg-green-100 text-emerald-700">
                  <span className="material-symbols-outlined">check_circle</span>
                </div>
                <span className="text-xs font-medium text-emerald-500">{h.resolvedGapsTrend}</span>
              </div>
              <p className="text-sm text-slate-500 font-medium">Resolved</p>
              <p className="text-3xl font-bold mt-1">{h.resolvedGaps}</p>
            </div>

            <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
              <p className="text-sm text-slate-500 font-medium mb-4">Severity Breakdown</p>
              <div className="space-y-3">
                <div className="h-2 flex-1 bg-slate-100 rounded-full overflow-hidden flex">
                  <div className="bg-[#ec5b13] h-full" style={{ width: `${sevPcts.critical}%` }} />
                  <div className="bg-orange-300 h-full" style={{ width: `${sevPcts.moderate}%` }} />
                  <div className="bg-slate-300 h-full" style={{ width: `${sevPcts.minor}%` }} />
                </div>
                  <div className="flex flex-wrap gap-x-4 gap-y-1 text-[11px] font-bold uppercase tracking-wider">
                  <span className="flex items-center gap-1.5 text-[#ec5b13]"><span className="size-2 rounded-full bg-[#ec5b13]" />{sevCounts.critical} Critical</span>
                  <span className="flex items-center gap-1.5 text-orange-400"><span className="size-2 rounded-full bg-orange-400" />{sevCounts.moderate} Moderate</span>
                  <span className="flex items-center gap-1.5 text-slate-500"><span className="size-2 rounded-full bg-slate-400" />{sevCounts.minor} Minor</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Filters */}
        <section className="flex flex-col gap-4">
          <h2 className="text-xl font-bold">Identified Learning Gaps</h2>
          <div className="flex items-center gap-3 overflow-x-auto pb-2" style={{ scrollbarWidth: "none" }}>
            {GAP_SUBJECTS.map((s) => (
              <button
                key={s}
                onClick={() => setActiveSubject(s)}
                className={`px-5 py-2 rounded-full font-semibold text-sm whitespace-nowrap transition-all ${
                  activeSubject === s
                    ? "bg-[#ec5b13] text-white shadow-md shadow-[#ec5b13]/20"
                    : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-50"
                }`}
              >
                {s}
              </button>
            ))}
          </div>
        </section>

        {/* Gap cards */}
        <section className="grid grid-cols-1 gap-6">
          {isLoading || isAnalyzing
            ? (
              <div className="flex flex-col items-center justify-center py-16 gap-4 text-slate-400">
                <span className="material-symbols-outlined text-5xl animate-spin text-[#685ae7]">progress_activity</span>
                <p className="text-sm font-semibold">
                  {isAnalyzing ? "Analyzing your homework and assessment performance..." : "Loading your learning gaps..."}
                </p>
                {isAnalyzing && <p className="text-xs">This may take a few seconds</p>}
              </div>
            )
            : gaps.length === 0
              ? (
                <div className="flex flex-col items-center justify-center py-16 gap-4 text-slate-400">
                  <div className="size-20 rounded-full bg-emerald-50 flex items-center justify-center text-emerald-500">
                    <span className="material-symbols-outlined text-4xl">check_circle</span>
                  </div>
                  <div className="text-center max-w-md">
                    <h3 className="text-lg font-bold text-slate-700 mb-2">No Learning Gaps Identified Yet</h3>
                    <p className="text-sm text-slate-500 mb-4">
                      Complete some homework assignments and we'll analyze your performance to identify areas where you can improve.
                    </p>
                    <button
                      onClick={handleAnalyze}
                      className="px-6 py-2 rounded-lg bg-[#685ae7] text-white text-sm font-bold hover:bg-[#685ae7]/90 transition-all"
                    >
                      Analyze My Performance
                    </button>
                  </div>
                </div>
              )
              : filtered.length === 0
                ? <p className="text-center text-slate-400 py-12">No gaps found for this subject.</p>
                : filtered.map((gap) => <GapCard key={gap.id || gap._id} gap={gap} />)
          }
        </section>

        {/* Vin CTA */}
        <section className="mt-4 p-8 rounded-2xl bg-[#ec5b13]/5 border border-[#ec5b13]/20 flex flex-col items-center text-center gap-4">
          <div className="size-16 rounded-full bg-white flex items-center justify-center text-[#ec5b13] border border-[#ec5b13]/20">
            <span className="material-symbols-outlined text-3xl">psychology</span>
          </div>
          <div className="max-w-md">
            <h4 className="text-lg font-bold">Need a customized learning plan?</h4>
            <p className="text-sm text-slate-500 mt-2">Vin can analyze all your current gaps and create a 7-day schedule to get you back on track.</p>
          </div>
          <Link to="/student/vin-ai" className="mt-2 px-6 py-2 rounded-lg bg-white border border-[#ec5b13] text-[#ec5b13] font-bold hover:bg-[#ec5b13] hover:text-white transition-all">
            Talk to LumiTutor
          </Link>
        </section>
      </main>

      {/* FAB */}
      <div className="fixed bottom-6 right-6">
        <Link to="/student/vin-ai" className="size-12 rounded-full bg-[#ec5b13] text-white shadow-xl shadow-[#ec5b13]/30 flex items-center justify-center hover:scale-110 active:scale-95 transition-all">
          <span className="material-symbols-outlined">chat</span>
        </Link>
      </div>
    </div>
  );
}
