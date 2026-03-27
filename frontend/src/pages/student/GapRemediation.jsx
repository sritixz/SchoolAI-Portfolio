import { useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { getGapById, SEVERITY_UI, SUBJECT_BADGE_UI } from "../../data/learningGapData";

const STATUS_ICON = { mastered: "check_circle", weak: "warning", current: "target" };
const STATUS_COLOR = { mastered: "bg-green-100 text-green-600", weak: "bg-amber-100 text-amber-600", current: "bg-[#685ae7] text-white shadow-lg shadow-[#685ae7]/30" };
const STATUS_TEXT  = { mastered: "text-green-600", weak: "text-amber-600", current: "text-[#685ae7]" };

export default function GapRemediation() {
  const { gapId }  = useParams();
  const navigate   = useNavigate();
  const gap        = getGapById(gapId);

  const [answer,   setAnswer]   = useState("");
  const [submitted,setSubmitted]= useState(false);

  if (!gap) {
    return (
      <div className="min-h-screen bg-[#f6f6f8] flex items-center justify-center" style={{ fontFamily: "'Lexend', sans-serif" }}>
        <div className="text-center">
          <p className="font-bold text-slate-600">Gap not found.</p>
          <button onClick={() => navigate("/student/learning-gaps/gaps")} className="mt-4 px-6 py-2 bg-[#685ae7] text-white rounded-full font-bold">Back</button>
        </div>
      </div>
    );
  }

  const sev  = SEVERITY_UI[gap.severity];
  const subj = SUBJECT_BADGE_UI[gap.subject] || "bg-gray-100 text-gray-600";

  return (
    <div className="min-h-screen bg-[#f6f6f8]" style={{ fontFamily: "'Lexend', sans-serif" }}>
      {/* Header */}
      <header className="flex items-center justify-between border-b border-[#685ae7]/10 bg-white px-10 py-3 sticky top-0 z-50">
        <div className="flex items-center gap-4 text-[#685ae7]">
          <div className="size-8 bg-[#685ae7] rounded-lg flex items-center justify-center text-white">
            <span className="material-symbols-outlined text-sm">auto_stories</span>
          </div>
          <h2 className="text-[#100e1b] text-lg font-bold">Learning Gap Remediation</h2>
        </div>
        <button onClick={() => navigate("/student/learning-gaps/gaps")} className="flex items-center justify-center rounded-xl h-10 px-4 bg-white border border-[#685ae7]/20 text-[#100e1b] text-sm font-bold hover:bg-[#685ae7]/5 transition-all">
          <span className="material-symbols-outlined mr-2">arrow_back</span>Back to Dashboard
        </button>
      </header>

      <main className="max-w-[1200px] mx-auto w-full px-6 py-8">
        {/* Page title */}
        <div className="flex flex-wrap justify-between items-end gap-4 mb-8">
          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-3">
              <span className={`px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1 ${sev.badge}`}>
                <span className="material-symbols-outlined text-sm">error</span>{sev.label} Severity
              </span>
              <span className="text-[#685ae7]/60 text-sm font-medium uppercase tracking-wider">{gap.subject} • {gap.subtopic}</span>
            </div>
            <h1 className="text-[#100e1b] text-4xl font-black leading-tight">{gap.topic}</h1>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* ── Left sidebar ── */}
          <div className="lg:col-span-1 flex flex-col gap-6">

            {/* Gap detection context */}
            <section className="bg-white rounded-xl p-6 shadow-sm border border-[#685ae7]/5">
              <h3 className="text-[#100e1b] text-lg font-bold mb-4 flex items-center gap-2">
                <span className="material-symbols-outlined text-[#685ae7]">analytics</span>Gap Detection Context
              </h3>
              <div className="space-y-4">
                <div className="p-4 bg-[#685ae7]/5 rounded-lg">
                  <p className="text-[#100e1b] text-sm font-bold">{gap.identifiedFrom.title}</p>
                  <p className="text-[#685ae7]/70 text-xs font-medium capitalize">{gap.identifiedFrom.type} • {gap.identifiedFrom.date}</p>
                </div>
                <p className="text-sm text-[#575095] leading-relaxed">
                  <span className="font-bold text-[#100e1b]">Error Summary: </span>{gap.aiErrorSummary}
                </p>
                <button className="w-full py-2 bg-[#685ae7]/10 text-[#685ae7] rounded-lg text-sm font-bold hover:bg-[#685ae7]/20 transition-all">
                  View Original Attempt
                </button>
              </div>
            </section>

            {/* Prerequisite map */}
            <section className="bg-white rounded-xl p-6 shadow-sm border border-[#685ae7]/5">
              <h3 className="text-[#100e1b] text-lg font-bold mb-4 flex items-center gap-2">
                <span className="material-symbols-outlined text-[#685ae7]">account_tree</span>Prerequisite Map
              </h3>
              <div className="space-y-4 relative py-2">
                {gap.prerequisites.map((pre, i) => (
                  <div key={pre.topic}>
                    <div className="flex items-center gap-4">
                      <div className={`size-10 rounded-full flex items-center justify-center shrink-0 ${STATUS_COLOR[pre.status]}`}>
                        <span className="material-symbols-outlined text-lg">{STATUS_ICON[pre.status]}</span>
                      </div>
                      <div>
                        <p className="text-sm font-bold">{pre.topic}</p>
                        <p className={`text-xs font-medium ${STATUS_TEXT[pre.status]}`}>
                          {pre.status === "current" ? "Current Goal" : pre.status === "mastered" ? `Mastered (${pre.masteryPercent}%)` : `Weak (${pre.masteryPercent}%)`}
                        </p>
                      </div>
                    </div>
                    {i < gap.prerequisites.length - 1 && (
                      <div className="ml-5 border-l-2 border-dashed border-[#685ae7]/20 h-5 mt-1" />
                    )}
                  </div>
                ))}
              </div>
            </section>

            {/* Corrective path */}
            <section className="bg-white rounded-xl p-6 shadow-sm border border-[#685ae7]/5">
              <h3 className="text-[#100e1b] text-lg font-bold mb-4 flex items-center gap-2">
                <span className="material-symbols-outlined text-[#685ae7]">route</span>Corrective Path
              </h3>
              <div className="flex flex-col gap-3">
                {gap.correctivePath.map((cp) => (
                  <div key={cp.type} className="flex items-center gap-3 p-3 rounded-lg border border-[#685ae7]/10 hover:border-[#685ae7]/40 cursor-pointer transition-all group">
                    <div className="size-10 rounded bg-[#685ae7]/10 text-[#685ae7] flex items-center justify-center group-hover:bg-[#685ae7] group-hover:text-white transition-colors">
                      <span className="material-symbols-outlined">{cp.icon}</span>
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-bold">{cp.label}</p>
                      <p className="text-xs text-[#685ae7]/60">{cp.detail}</p>
                    </div>
                    <span className="material-symbols-outlined text-[#685ae7]/30">chevron_right</span>
                  </div>
                ))}
              </div>
            </section>
          </div>

          {/* ── Main workspace ── */}
          <div className="lg:col-span-2 flex flex-col gap-6">
            <section className="bg-white rounded-xl shadow-sm border border-[#685ae7]/5 flex flex-col overflow-hidden">
              {/* Workspace header */}
              <div className="p-6 border-b border-[#685ae7]/10 flex justify-between items-center bg-[#685ae7]/5">
                <div>
                  <h3 className="text-[#100e1b] text-xl font-bold">Remediation Workspace</h3>
                  <p className="text-[#685ae7]/70 text-sm font-medium">Practice until mastery</p>
                </div>
                <span className="px-3 py-1 bg-[#685ae7] text-white rounded-full text-xs font-bold uppercase tracking-widest flex items-center gap-1">
                  <span className="material-symbols-outlined text-sm">all_inclusive</span>Unlimited Retries
                </span>
              </div>

              <div className="p-8 flex flex-col gap-8">
                {/* Question */}
                <div className="space-y-4">
                  <div className="flex items-center gap-2 text-[#685ae7] font-bold">
                    <span className="material-symbols-outlined">quiz</span>
                    <span>New but Similar Question</span>
                  </div>
                  <div className="p-6 bg-[#f6f6f8] rounded-xl border border-[#685ae7]/10">
                    <p className="text-lg text-[#100e1b] font-medium leading-relaxed">
                      {gap.retryQuestion.text}
                      {gap.retryQuestion.equation && (
                        <span className="block mt-3 text-2xl font-bold text-center py-4 bg-white/70 rounded-lg">
                          {gap.retryQuestion.equation}
                        </span>
                      )}
                    </p>
                  </div>
                </div>

                {/* Answer input */}
                <div className="space-y-4">
                  <label className="text-sm font-bold text-[#100e1b]">Your Solution</label>
                  <textarea
                    value={answer}
                    onChange={(e) => setAnswer(e.target.value)}
                    disabled={submitted}
                    className="w-full h-40 rounded-xl border border-[#685ae7]/10 focus:ring-[#685ae7] focus:border-[#685ae7] text-base p-4 resize-none"
                    placeholder="Show your working here... (e.g., D = b² - 4ac...)"
                  />
                  {submitted ? (
                    <div className="p-4 bg-green-50 border border-green-200 rounded-xl flex items-start gap-3">
                      <span className="material-symbols-outlined text-green-600 text-2xl">check_circle</span>
                      <div>
                        <p className="font-bold text-green-800">Submitted! Vin is reviewing your answer.</p>
                        <p className="text-sm text-green-700 mt-1">{gap.aiLastFeedback}</p>
                      </div>
                    </div>
                  ) : (
                    <div className="flex justify-end gap-3">
                      <button className="px-6 py-3 bg-[#685ae7]/10 text-[#685ae7] font-bold rounded-xl hover:bg-[#685ae7]/20 transition-all">
                        Save Draft
                      </button>
                      <button
                        onClick={() => answer.trim() && setSubmitted(true)}
                        disabled={!answer.trim()}
                        className="px-8 py-3 bg-[#685ae7] text-white font-bold rounded-xl shadow-lg shadow-[#685ae7]/30 hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-40"
                      >
                        Submit Answer
                      </button>
                    </div>
                  )}
                </div>

                {/* Improvement tracker + AI feedback */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="bg-[#f6f6f8] p-5 rounded-xl border border-[#685ae7]/5">
                    <h4 className="text-xs font-bold text-[#685ae7]/60 uppercase tracking-widest mb-4">Improvement Tracker</h4>
                    <div className="space-y-3">
                      {gap.attempts.map((att) => (
                        <div key={att.attemptNumber} className="flex items-center gap-3">
                          <span className="text-xs font-bold w-16">Attempt {att.attemptNumber}</span>
                          <div className="flex-1 h-2 bg-[#685ae7]/10 rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full ${att.score < 50 ? "bg-red-400" : att.score < 75 ? "bg-amber-400" : "bg-[#685ae7]"}`}
                              style={{ width: `${att.score}%` }}
                            />
                          </div>
                          <span className={`text-xs font-bold ${att.score < 50 ? "text-red-500" : att.score < 75 ? "text-amber-500" : "text-[#685ae7]"}`}>
                            {att.score}%
                          </span>
                        </div>
                      ))}
                      <div className="flex items-center gap-3 opacity-50">
                        <span className="text-xs font-bold w-16">Current</span>
                        <div className="flex-1 h-2 bg-[#685ae7]/20 rounded-full overflow-hidden">
                          <div className="h-full bg-[#685ae7]" style={{ width: submitted ? "80%" : "0%" }} />
                        </div>
                        <span className="text-xs font-bold">{submitted ? "80%" : "--%"}</span>
                      </div>
                    </div>
                  </div>

                  <div className="bg-[#685ae7]/5 p-5 rounded-xl border border-[#685ae7]/20">
                    <div className="flex items-center gap-2 mb-3">
                      <span className="material-symbols-outlined text-[#685ae7] text-lg">psychology</span>
                      <h4 className="text-sm font-bold text-[#685ae7]">Instant AI Explanation</h4>
                    </div>
                    <p className="text-xs text-[#575095] leading-relaxed italic">"{gap.aiLastFeedback}"</p>
                  </div>
                </div>
              </div>
            </section>

            {/* Visual ref */}
            {gap.visualRef && (
              <div className="bg-white rounded-xl p-4 shadow-sm border border-[#685ae7]/5 flex items-center gap-6">
                <div className="size-20 rounded-lg bg-[#685ae7]/10 flex items-center justify-center shrink-0">
                  <span className="material-symbols-outlined text-3xl text-[#685ae7]">functions</span>
                </div>
                <div className="flex-1">
                  <h4 className="text-sm font-bold">{gap.visualRef.label}</h4>
                  <p className="text-xs text-[#685ae7]/70 mt-0.5">{gap.visualRef.detail}</p>
                </div>
                <button className="flex items-center gap-1 text-[#685ae7] text-xs font-bold hover:underline">
                  Expand <span className="material-symbols-outlined text-sm">open_in_full</span>
                </button>
              </div>
            )}

            {/* Quiz CTA */}
            <Link
              to="/student/learning-gaps/quiz/quiz001"
              className="bg-gradient-to-r from-[#685ae7] to-[#8e82f3] rounded-xl p-5 text-white flex items-center justify-between gap-4 hover:opacity-95 transition-opacity"
            >
              <div>
                <h4 className="font-bold">Ready to test yourself?</h4>
                <p className="text-white/80 text-sm mt-0.5">Take a targeted quiz on {gap.topic}</p>
              </div>
              <span className="material-symbols-outlined text-3xl">quiz</span>
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}
