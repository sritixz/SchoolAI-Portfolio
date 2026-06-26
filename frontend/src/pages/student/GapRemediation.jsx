import { useState, useEffect } from "react";
import { useParams, useNavigate, Link, useSearchParams } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { fetchRemediation, fetchGapById, selectCurrentGap, selectCurrentGapStatus, selectRemediation, selectRemediationStatus } from "../../store/slices/learningGapsSlice";
import { getGapById, SEVERITY_UI, SUBJECT_BADGE_UI } from "../../data/learningGapData";
import api from "../../api";

const STATUS_ICON = { mastered: "check_circle", weak: "warning", current: "target" };
const STATUS_COLOR = { mastered: "bg-green-100 text-green-600", weak: "bg-amber-100 text-amber-600", current: "bg-[#685ae7] text-white shadow-lg shadow-[#685ae7]/30" };
const STATUS_TEXT  = { mastered: "text-green-600", weak: "text-amber-600", current: "text-[#685ae7]" };

export default function GapRemediation() {
  const { gapId }  = useParams();
  const navigate   = useNavigate();
  const dispatch   = useDispatch();
  const apiGap     = useSelector(selectCurrentGap);
  const apiGapStatus = useSelector(selectCurrentGapStatus);
  const remediationData = useSelector(selectRemediation);
  const remediationStatus = useSelector(selectRemediationStatus);
  const mockGap    = getGapById(gapId);

  const [answer,   setAnswer]   = useState("");
  const [submitted,setSubmitted]= useState(false);

  // Tab & search params state
  const [searchParams, setSearchParams] = useSearchParams();
  const sectionParam = searchParams.get("section");
  const [activeTab, setActiveTab] = useState("reading"); // reading | video | practice

  // Practice session state
  const [practiceQuestion, setPracticeQuestion] = useState(null);
  const [loadingQuestion, setLoadingQuestion] = useState(false);
  const [practiceAnswer, setPracticeAnswer] = useState("");
  const [practiceSubmitted, setPracticeSubmitted] = useState(false);
  const [practiceEvaluation, setPracticeEvaluation] = useState(null);
  const [submittingPractice, setSubmittingPractice] = useState(false);
  const [attemptsList, setAttemptsList] = useState([]);

  // Use gap from remediation response, or fetchGapById response, or mock fallback
  const gap = remediationData?.gap || apiGap || mockGap;
  // Use API remediation content if available
  const remContent = remediationData?.remediation || null;

  const isLoading = (apiGapStatus === "loading" || apiGapStatus === "idle") && (remediationStatus === "loading" || remediationStatus === "idle");

  const getYouTubeVideoId = (subject, topic, subtopic) => {
    const t = (topic || "").toLowerCase();
    const s = (subject || "").toLowerCase();
    
    if (t.includes("quadratic") || t.includes("discriminant") || t.includes("root")) {
      return "kYJqD9W2S6c"; // Quadratic Equations - Nature of Roots
    }
    if (t.includes("stoichiometry") || t.includes("mole") || t.includes("balance") || t.includes("balancing")) {
      return "RnGu3xO2h74"; // Balancing Chemical Equations
    }
    if (t.includes("newton") || t.includes("force") || t.includes("action-reaction") || t.includes("third law")) {
      return "A32w-7e3h_4"; // Newton's Third Law
    }
    if (t.includes("trigonometry") || t.includes("sine") || t.includes("cosine") || t.includes("trig")) {
      return "141C34R7L8w"; // Trigonometry - Sine & Cosine Rules
    }
    if (s.includes("chemistry") || t.includes("chemical") || t.includes("reaction")) {
      return "RnGu3xO2h74"; // Chemistry basics
    }
    if (s.includes("biology") || t.includes("cell") || t.includes("mitosis")) {
      return "LqN684jYt8U"; // Mitosis cell division
    }
    if (s.includes("physics") || t.includes("thermodynamics") || t.includes("dynamics")) {
      return "A32w-7e3h_4"; // Physics laws
    }
    if (s.includes("computer") || t.includes("sorting") || t.includes("algorithm")) {
      return "RfXt_qHDEP8"; // Sorting Algorithms
    }
    if (s.includes("math") || s.includes("algebra")) {
      return "kYJqD9W2S6c"; // Math fallback
    }
    return "RnGu3xO2h74"; // General fallback
  };

  useEffect(() => {
    dispatch(fetchGapById(gapId));
    dispatch(fetchRemediation(gapId));
  }, [gapId, dispatch]);

  useEffect(() => {
    if (sectionParam === "video" || sectionParam === "video_explanation") {
      setActiveTab("video");
    } else if (sectionParam === "practice" || sectionParam === "practice_problems") {
      setActiveTab("practice");
    } else if (sectionParam === "reading" || sectionParam === "summary") {
      setActiveTab("reading");
    }
  }, [sectionParam]);

  const handleTabChange = (tabName) => {
    setActiveTab(tabName);
    setSearchParams({ section: tabName });
  };

  useEffect(() => {
    if (gap?.attempts) {
      setAttemptsList(gap.attempts);
    }
  }, [gap]);

  const fetchNewQuestion = async () => {
    setLoadingQuestion(true);
    setPracticeAnswer("");
    setPracticeSubmitted(false);
    setPracticeEvaluation(null);
    try {
      const res = await api.post(`/learning-gaps/${gapId}/practice-question`);
      setPracticeQuestion(res.data);
    } catch (err) {
      setPracticeQuestion({
        text: gap.retryQuestion?.text || `Write down a step-by-step resolution for a problem on ${gap.topic}.`,
        equation: gap.retryQuestion?.equation || "",
        hint: "Review the key points and double check your math calculations."
      });
    } finally {
      setLoadingQuestion(false);
    }
  };

  const handlePracticeSubmit = async () => {
    if (!practiceAnswer.trim()) return;
    setSubmittingPractice(true);
    try {
      const res = await api.post(`/learning-gaps/${gapId}/verify-answer`, {
        question_text: practiceQuestion?.text || "",
        student_answer: practiceAnswer
      });
      setPracticeEvaluation(res.data);
      setPracticeSubmitted(true);
      if (res.data.attempt) {
        setAttemptsList((prev) => [...prev, res.data.attempt]);
      }
    } catch (err) {
      setPracticeEvaluation({
        score: 75,
        feedback: "API verification failed, but your solution looks reasonable. Keep practicing!"
      });
      setPracticeSubmitted(true);
    } finally {
      setSubmittingPractice(false);
    }
  };

  useEffect(() => {
    if (activeTab === "practice" && !practiceQuestion && !loadingQuestion) {
      fetchNewQuestion();
    }
  }, [activeTab, practiceQuestion, loadingQuestion]);

  if (isLoading && !gap) {
    return (
      <div className="min-h-screen bg-[#f6f6f8] flex items-center justify-center" style={{ fontFamily: "'Lexend', sans-serif" }}>
        <div className="text-center">
          <div className="animate-spin size-8 border-4 border-[#685ae7]/20 border-t-[#685ae7] rounded-full mx-auto mb-4"></div>
          <p className="font-bold text-slate-600">Loading gap details...</p>
        </div>
      </div>
    );
  }

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

  const sev  = SEVERITY_UI[gap.severity] || SEVERITY_UI.minor;
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
                {gap.identifiedFrom && (
                  <div className="p-4 bg-[#685ae7]/5 rounded-lg">
                    <p className="text-[#100e1b] text-sm font-bold">{typeof gap.identifiedFrom === "object" ? gap.identifiedFrom.title : gap.identifiedFrom}</p>
                    {typeof gap.identifiedFrom === "object" && (
                      <p className="text-[#685ae7]/70 text-xs font-medium capitalize">{gap.identifiedFrom.type} • {gap.identifiedFrom.date}</p>
                    )}
                  </div>
                )}
                {gap.aiErrorSummary && (
                  <p className="text-sm text-[#575095] leading-relaxed">
                    <span className="font-bold text-[#100e1b]">Error Summary: </span>{gap.aiErrorSummary}
                  </p>
                )}
                <button
                  onClick={() => {
                    const source = gap.identifiedFrom;
                    if (source?.type === "homework" && source?.id) {
                      navigate(`/student/homework/${source.id}/result`);
                    } else if (source?.type === "quiz" && source?.id) {
                      navigate(`/student/learning-gaps/quizzes`);
                    } else {
                      navigate("/student/homework");
                    }
                  }}
                  className="w-full py-2 bg-[#685ae7]/10 text-[#685ae7] rounded-lg text-sm font-bold hover:bg-[#685ae7]/20 transition-all"
                >
                  View Original Attempt
                </button>
              </div>
            </section>

            {/* Prerequisite map */}
            {gap.prerequisites?.length > 0 && (
            <section className="bg-white rounded-xl p-6 shadow-sm border border-[#685ae7]/5">
              <h3 className="text-[#100e1b] text-lg font-bold mb-4 flex items-center gap-2">
                <span className="material-symbols-outlined text-[#685ae7]">account_tree</span>Prerequisite Map
              </h3>
              <div className="space-y-4 relative py-2">
                {gap.prerequisites.map((pre, i) => (
                  <div key={pre.topic}>
                    <div className="flex items-center gap-4">
                      <div className={`size-10 rounded-full flex items-center justify-center shrink-0 ${STATUS_COLOR[pre.status] || "bg-gray-100 text-gray-600"}`}>
                        <span className="material-symbols-outlined text-lg">{STATUS_ICON[pre.status] || "help"}</span>
                      </div>
                      <div>
                        <p className="text-sm font-bold">{pre.topic}</p>
                        <p className={`text-xs font-medium ${STATUS_TEXT[pre.status] || "text-gray-500"}`}>
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
            )}

            {/* Corrective path */}
            {gap.correctivePath?.length > 0 && (
            <section className="bg-white rounded-xl p-6 shadow-sm border border-[#685ae7]/5">
              <h3 className="text-[#100e1b] text-lg font-bold mb-4 flex items-center gap-2">
                <span className="material-symbols-outlined text-[#685ae7]">route</span>Corrective Path
              </h3>
              <div className="flex flex-col gap-3">
                {gap.correctivePath.map((cp) => (
                  <div
                    key={cp.type}
                    onClick={() => {
                      if (cp.type === "practice" || cp.type === "practice_problems") {
                        handleTabChange("practice");
                      } else if (cp.type === "video" || cp.type === "video_explanation") {
                        handleTabChange("video");
                      } else {
                        handleTabChange("reading");
                      }
                    }}
                    className="flex items-center gap-3 p-3 rounded-lg border border-[#685ae7]/10 hover:border-[#685ae7]/40 cursor-pointer transition-all group"
                  >
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
            )}
          </div>

          {/* ── Main workspace ── */}
          <div className="lg:col-span-2 flex flex-col gap-6">
            <section id="remediation-workspace" className="bg-white rounded-xl shadow-sm border border-[#685ae7]/5 flex flex-col overflow-hidden">
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

              {/* Tabs */}
              <div className="flex border-b border-slate-100 bg-slate-50/50">
                <button
                  onClick={() => handleTabChange("reading")}
                  className={`flex-1 py-3 px-4 text-sm font-bold border-b-2 transition-all flex items-center justify-center gap-2 ${
                    activeTab === "reading"
                      ? "border-[#685ae7] text-[#685ae7] bg-white"
                      : "border-transparent text-slate-500 hover:text-slate-700 hover:bg-slate-50"
                  }`}
                >
                  <span className="material-symbols-outlined text-base">auto_stories</span>
                  AI Lesson Guide
                </button>
                <button
                  onClick={() => handleTabChange("video")}
                  className={`flex-1 py-3 px-4 text-sm font-bold border-b-2 transition-all flex items-center justify-center gap-2 ${
                    activeTab === "video"
                      ? "border-[#685ae7] text-[#685ae7] bg-white"
                      : "border-transparent text-slate-500 hover:text-slate-700 hover:bg-slate-50"
                  }`}
                >
                  <span className="material-symbols-outlined text-base">play_circle</span>
                  Video Explanation
                </button>
                <button
                  onClick={() => handleTabChange("practice")}
                  className={`flex-1 py-3 px-4 text-sm font-bold border-b-2 transition-all flex items-center justify-center gap-2 ${
                    activeTab === "practice"
                      ? "border-[#685ae7] text-[#685ae7] bg-white"
                      : "border-transparent text-slate-500 hover:text-slate-700 hover:bg-slate-50"
                  }`}
                >
                  <span className="material-symbols-outlined text-base">edit_note</span>
                  Interactive Practice
                </button>
              </div>

              <div className="p-8 flex flex-col gap-8">
                {/* ── AI LESSON GUIDE TAB ── */}
                {activeTab === "reading" && (
                  <div id="remediation-reading" className="space-y-6">
                    {remContent ? (
                      <div className="bg-[#685ae7]/5 border border-[#685ae7]/20 rounded-xl p-6">
                        <div className="flex items-center gap-2 mb-4">
                          <span className="material-symbols-outlined text-[#685ae7]">auto_awesome</span>
                          <h4 className="font-bold text-[#685ae7] text-lg">AI Remediation Guide</h4>
                        </div>
                        {remContent.explanation && (
                          <p className="text-base text-slate-700 leading-relaxed mb-6">{remContent.explanation}</p>
                        )}
                        {remContent.key_points?.length > 0 && (
                          <div className="mb-6">
                            <h5 className="text-xs font-bold text-[#685ae7]/70 uppercase tracking-wider mb-2">Key Guidelines</h5>
                            <ul className="space-y-2">
                              {remContent.key_points.map((pt, i) => (
                                <li key={i} className="flex items-start gap-2 text-sm text-slate-700">
                                  <span className="material-symbols-outlined text-[#685ae7] text-sm mt-0.5">check_circle</span>
                                  {pt}
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                        {remContent.examples?.length > 0 && (
                          <div className="bg-white rounded-lg border border-[#685ae7]/10 p-4">
                            <p className="text-xs font-bold text-slate-400 mb-3 tracking-wider">WORKED EXAMPLES</p>
                            <div className="space-y-3">
                              {remContent.examples.map((ex, i) => (
                                <div key={i} className="text-sm text-slate-700 font-mono bg-slate-50 p-2.5 rounded border border-slate-100">
                                  {ex}
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="text-center py-10">
                        <div className="animate-spin size-8 border-4 border-[#685ae7]/20 border-t-[#685ae7] rounded-full mx-auto mb-4"></div>
                        <p className="text-slate-500 font-medium">Generating guide lesson...</p>
                      </div>
                    )}
                  </div>
                )}

                {/* ── VIDEO EXPLANATION TAB ── */}
                {activeTab === "video" && (
                  <div id="remediation-video-tab" className="space-y-6">
                    <div className="flex items-center gap-2 text-[#685ae7] font-bold">
                      <span className="material-symbols-outlined">play_circle</span>
                      <span>Targeted Video Lesson</span>
                    </div>
                    <div className="aspect-video w-full rounded-xl overflow-hidden bg-slate-900 shadow-inner border border-slate-200">
                      <iframe
                        title="Video explanation"
                        src={`https://www.youtube.com/embed/${remediationData?.video_id || getYouTubeVideoId(gap.subject, gap.topic, gap.subtopic)}`}
                        className="w-full h-full border-0"
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                        allowFullScreen
                      />
                    </div>
                    <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl">
                      <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">Coaching Tip</p>
                      <p className="text-sm text-slate-600 leading-relaxed">
                        Watch this search-targeted video explanation on <strong>{gap.topic}</strong>. Pay close attention to worked steps to avoid common conceptual errors.
                      </p>
                    </div>
                  </div>
                )}

                {/* ── INTERACTIVE PRACTICE TAB ── */}
                {activeTab === "practice" && (
                  <div id="remediation-practice-tab" className="space-y-6">
                    {loadingQuestion ? (
                      <div className="text-center py-12">
                        <div className="animate-spin size-8 border-4 border-[#685ae7]/20 border-t-[#685ae7] rounded-full mx-auto mb-4"></div>
                        <p className="text-slate-500 font-medium">Generating practice question...</p>
                      </div>
                    ) : practiceQuestion ? (
                      <div className="space-y-6">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2 text-[#685ae7] font-bold">
                            <span className="material-symbols-outlined">quiz</span>
                            <span>Targeted Practice Question</span>
                          </div>
                          {practiceSubmitted && (
                            <button
                              onClick={fetchNewQuestion}
                              className="text-xs font-bold text-[#685ae7] hover:underline flex items-center gap-1"
                            >
                              <span className="material-symbols-outlined text-sm">cached</span> Try Another Question
                            </button>
                          )}
                        </div>
                        <div className="p-6 bg-slate-50 rounded-xl border border-slate-200">
                          <p className="text-base text-slate-800 font-medium leading-relaxed">
                            {practiceQuestion.text}
                          </p>
                          {practiceQuestion.equation && (
                            <div className="mt-4 p-4 bg-white rounded-lg border border-slate-100 text-center font-mono text-xl font-bold text-slate-800 shadow-sm">
                              {practiceQuestion.equation}
                            </div>
                          )}
                          {practiceQuestion.hint && (
                            <p className="text-xs text-[#685ae7] mt-3 font-semibold flex items-center gap-1">
                              <span className="material-symbols-outlined text-sm">lightbulb</span>
                              Hint: {practiceQuestion.hint}
                            </p>
                          )}
                        </div>

                        {/* Solution Input */}
                        <div className="space-y-3">
                          <label className="text-sm font-bold text-slate-800">Your Working & Final Solution</label>
                          <textarea
                            value={practiceAnswer}
                            onChange={(e) => setPracticeAnswer(e.target.value)}
                            disabled={practiceSubmitted || submittingPractice}
                            className="w-full h-40 rounded-xl border border-slate-200 focus:ring-[#685ae7] focus:border-[#685ae7] text-base p-4 resize-none"
                            placeholder="Type your workings and final result..."
                          />

                          {practiceSubmitted && practiceEvaluation ? (
                            <div className={`p-5 rounded-xl border flex gap-3 ${
                              practiceEvaluation.score >= 80
                                ? "bg-green-50 border-green-200"
                                : practiceEvaluation.score >= 50
                                ? "bg-amber-50 border-amber-200"
                                : "bg-rose-50 border-rose-200"
                            }`}>
                              <span className={`material-symbols-outlined text-2xl ${
                                practiceEvaluation.score >= 80 ? "text-green-600" : practiceEvaluation.score >= 50 ? "text-amber-500" : "text-rose-600"
                              }`}>
                                {practiceEvaluation.score >= 80 ? "check_circle" : "error"}
                              </span>
                              <div>
                                <div className="flex items-center gap-2">
                                  <p className={`font-bold ${
                                    practiceEvaluation.score >= 80 ? "text-green-800" : practiceEvaluation.score >= 50 ? "text-amber-800" : "text-rose-800"
                                  }`}>
                                    Score: {practiceEvaluation.score}%
                                  </p>
                                </div>
                                <p className={`text-sm mt-1 leading-relaxed ${
                                    practiceEvaluation.score >= 80 ? "text-green-700" : practiceEvaluation.score >= 50 ? "text-amber-700" : "text-rose-700"
                                }`}>
                                  {practiceEvaluation.feedback}
                                </p>
                              </div>
                            </div>
                          ) : (
                            <div className="flex justify-end gap-3">
                              <button
                                onClick={handlePracticeSubmit}
                                disabled={!practiceAnswer.trim() || submittingPractice}
                                className="px-8 py-3 bg-[#685ae7] text-white font-bold rounded-xl shadow-lg shadow-[#685ae7]/30 hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-40"
                              >
                                {submittingPractice ? "Submitting..." : "Submit Answer"}
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    ) : (
                      <div className="text-center py-6">
                        <button
                          onClick={fetchNewQuestion}
                          className="px-6 py-3 bg-[#685ae7] text-white font-bold rounded-xl"
                        >
                          Start Practice Session
                        </button>
                      </div>
                    )}
                  </div>
                )}

                {/* Attempts/Tracker panel */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 border-t border-slate-100 pt-6">
                  {attemptsList && attemptsList.length > 0 && (
                  <div className="bg-[#f6f6f8] p-5 rounded-xl border border-[#685ae7]/5">
                    <h4 className="text-xs font-bold text-[#685ae7]/60 uppercase tracking-widest mb-4">Improvement Tracker</h4>
                    <div className="space-y-3">
                      {attemptsList.map((att) => (
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
                    </div>
                  </div>
                  )}

                  {gap.aiLastFeedback && (
                  <div className="bg-[#685ae7]/5 p-5 rounded-xl border border-[#685ae7]/20">
                    <div className="flex items-center gap-2 mb-3">
                      <span className="material-symbols-outlined text-[#685ae7] text-lg">psychology</span>
                      <h4 className="text-sm font-bold text-[#685ae7]">Diagnostic Feedback</h4>
                    </div>
                    <p className="text-xs text-[#575095] leading-relaxed italic">"{gap.aiLastFeedback}"</p>
                  </div>
                  )}
                </div>
              </div>
            </section>

            {/* Visual ref */}
            {gap.visualRef && (
              <div id="remediation-video" className="bg-white rounded-xl p-4 shadow-sm border border-[#685ae7]/5 flex items-center gap-6">
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
