import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import {
  GAP_HEALTH, GAP_SUBJECTS, SEVERITY_UI, SUBJECT_BADGE_UI,
  LEARNING_GAPS, getGapsBySubject,
} from "../../data/learningGapData";

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
  const sev  = SEVERITY_UI[gap.severity];
  const subj = SUBJECT_BADGE_UI[gap.subject] || "bg-gray-100 text-gray-600";

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

      {/* Meta grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
        <div className="space-y-1.5">
          <div className="flex items-center gap-2 text-slate-400">
            <span className="material-symbols-outlined text-sm">description</span>
            <p className="text-xs font-semibold uppercase tracking-wide">Identified from</p>
          </div>
          <p className="text-sm font-medium text-[#ec5b13] flex items-center gap-1 cursor-pointer hover:underline">
            {gap.identifiedFrom.title}
            <span className="material-symbols-outlined text-xs">open_in_new</span>
          </p>
        </div>
        <div className="space-y-1.5">
          <div className="flex items-center gap-2 text-slate-400">
            <span className="material-symbols-outlined text-sm">trending_up</span>
            <p className="text-xs font-semibold uppercase tracking-wide">Impact Analysis</p>
          </div>
          <p className="text-sm text-slate-600">
            {gap.impactAnalysis.split(gap.impactSubject)[0]}
            <span className="font-bold text-slate-800">{gap.impactSubject}</span>
            {gap.impactAnalysis.split(gap.impactSubject)[1]}
          </p>
        </div>
        <div className="space-y-1.5">
          <div className="flex items-center gap-2 text-slate-400">
            <span className="material-symbols-outlined text-sm">link</span>
            <p className="text-xs font-semibold uppercase tracking-wide">Prerequisite</p>
          </div>
          <p className="text-sm text-slate-600">
            {gap.prerequisiteDependency.split(gap.prerequisiteSubject)[0]}
            <span className="font-bold text-slate-800">{gap.prerequisiteSubject}</span>
            {gap.prerequisiteDependency.split(gap.prerequisiteSubject)[1]}
          </p>
        </div>
      </div>

      {/* Mastery bar */}
      <div className="mb-6">
        <div className="flex justify-between text-xs mb-1.5">
          <span className="text-slate-400 font-semibold uppercase tracking-wide">Mastery</span>
          <span className="font-bold text-slate-700">{gap.masteryPercent}%</span>
        </div>
        <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full ${gap.severity === "critical" ? "bg-[#ec5b13]" : gap.severity === "moderate" ? "bg-orange-400" : "bg-slate-400"}`}
            style={{ width: `${gap.masteryPercent}%` }}
          />
        </div>
      </div>

      {/* Actions */}
      <div className="pt-5 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex flex-wrap gap-2 w-full sm:w-auto">
          {gap.correctivePath.map((cp) => (
            <button key={cp.type} className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 transition-colors text-xs font-bold">
              <span className="material-symbols-outlined text-base">{cp.icon}</span>{cp.label}
            </button>
          ))}
          <Link
            to="/student/vin-ai"
            className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-[#685ae7]/10 text-[#685ae7] hover:bg-[#685ae7]/20 transition-colors text-xs font-bold border border-[#685ae7]/20"
          >
            <span className="material-symbols-outlined text-base">smart_toy</span>Ask Vin
          </Link>
        </div>
        <Link
          to={`/student/learning-gaps/gaps/${gap.id}`}
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
  const [activeSubject, setActiveSubject] = useState("All");

  const filtered = getGapsBySubject(activeSubject);
  const h = GAP_HEALTH;
  const sevPcts = {
    critical: (h.severity.critical / h.totalGaps) * 100,
    moderate: (h.severity.moderate / h.totalGaps) * 100,
    minor:    (h.severity.minor    / h.totalGaps) * 100,
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
          <button className="p-2 rounded-xl hover:bg-slate-100 text-slate-500 transition-colors">
            <span className="material-symbols-outlined">info</span>
          </button>
        </div>
      </header>

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
                  <span className="flex items-center gap-1.5 text-[#ec5b13]"><span className="size-2 rounded-full bg-[#ec5b13]" />{h.severity.critical} Critical</span>
                  <span className="flex items-center gap-1.5 text-orange-400"><span className="size-2 rounded-full bg-orange-400" />{h.severity.moderate} Moderate</span>
                  <span className="flex items-center gap-1.5 text-slate-500"><span className="size-2 rounded-full bg-slate-400" />{h.severity.minor} Minor</span>
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
          {filtered.length === 0
            ? <p className="text-center text-slate-400 py-12">No gaps found for this subject.</p>
            : filtered.map((gap) => <GapCard key={gap.id} gap={gap} />)
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
            Talk to Vin Assistant
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
