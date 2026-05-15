import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { useAuth } from "../../context/AuthContext";
import { getInitial } from "../../utils/nameUtils";
import { runAiTool, selectAiToolResult, selectAiToolStatus, clearAiToolResult } from "../../store/slices/teacherSlice";
import { selectAiHistory } from "../../store/slices/aiHistorySlice";
import {
  assistanceTypes,
  feedbackTones,
  gradingDefaults,
} from "../../data/teacher/gradingAssistantData";
import { useAiToolWithHistory } from "../../hooks/useAiToolWithHistory";
import { downloadGradingPdf } from "../../utils/aiPdfExport";
import MathText from "../../components/MathText";
import { uploadSubmissionFile, selectUploadStatus, selectUploadUrl, clearUpload } from "../../store/slices/homeworkSlice";

export default function GradingAssistant() {
  const navigate     = useNavigate();
  const dispatch     = useDispatch();
  const { user }     = useAuth();
  const aiResult     = useSelector(selectAiToolResult);
  const aiStatus     = useSelector(selectAiToolStatus);
  const uploadStatus = useSelector(selectUploadStatus);
  const uploadedUrl  = useSelector(selectUploadUrl);
  const history      = useSelector(selectAiHistory);
  const fileInputRef = useRef(null);

  const [form, setForm]           = useState(gradingDefaults);
  const [feedbackText, setFeedbackText] = useState("");
  const [editMode, setEditMode]   = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [sendSuccess, setSendSuccess] = useState(false);
  const [historyResult, setHistoryResult] = useState(null);
  const [historyLoaded, setHistoryLoaded] = useState(false);

  const generating = aiStatus === "loading";
  const activeResult = historyLoaded ? historyResult : aiResult;
  const evaluated  = !!activeResult && !generating;
  const uploading  = uploadStatus === "loading";

  useEffect(() => () => { dispatch(clearAiToolResult()); dispatch(clearUpload()); }, [dispatch]);

  useEffect(() => {
    if (uploadedUrl) {
      setForm((f) => ({
        ...f,
        studentResponse: f.studentResponse
          ? `${f.studentResponse}\n[Uploaded: ${uploadedUrl}]`
          : `[Uploaded: ${uploadedUrl}]`,
      }));
      dispatch(clearUpload());
    }
  }, [uploadedUrl, dispatch]);

  // Sync feedback text when result arrives
  useEffect(() => {
    if (aiResult?.feedback) { setFeedbackText(aiResult.feedback); setHistoryLoaded(false); }
  }, [aiResult]);

  const { runTool } = useAiToolWithHistory();

  const handleGenerate = () => {
    dispatch(clearAiToolResult());
    setFeedbackText("");
    setEditMode(false);
    setSendSuccess(false);
    setHistoryLoaded(false);
    setHistoryResult(null);
    runTool(
      {
        tool: "grading",
        subject: "General",
        topic: form.question,
        grade: "General",
        extra: {
          question: form.question,
          student_response: form.studentResponse,
          total_marks: form.totalMarks,
          feedback_tone: form.feedbackTone,
          assistance_type: form.assistanceType,
        },
      },
      { tool: "grading", title: `Grading: ${form.question?.slice(0, 40) || "Response"}` }
    );
  };

  const handleUploadHandwriting = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    dispatch(uploadSubmissionFile(file));
    e.target.value = "";
  };

  const handleAcceptAndSend = () => {
    const text = `Score: ${aiResult.score}/${aiResult.max_score}\n\nFeedback:\n${feedbackText || aiResult.feedback}`;
    navigator.clipboard?.writeText(text).catch(() => {});
    setSendSuccess(true);
    setTimeout(() => setSendSuccess(false), 3000);
  };

  const gradingHistory = history.filter((h) => h.tool === "grading").slice(0, 20);
  const scorePercent   = evaluated ? Math.round((activeResult.score / activeResult.max_score) * 100) : 0;

  return (
    <div className="bg-[#fff5f8] min-h-screen" style={{ fontFamily: "'Lexend', sans-serif" }}>

      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-white border-b border-gray-200">
        <div className="max-w-[1200px] mx-auto px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="size-8 bg-[#695be6]/10 rounded-lg flex items-center justify-center">
              <span className="material-symbols-outlined text-[#695be6] text-lg">grading</span>
            </div>
            <h1 className="font-black text-base">Grading & Feedback Assistant</h1>
          </div>
          <div className="flex items-center gap-4 text-sm font-semibold text-gray-500">
            <button onClick={() => navigate("/teacher/ai-assistant")} className="hover:text-gray-700">AI Assistant</button>
            <span className="text-gray-300">›</span>
            <span className="text-[#695be6] font-bold">Grading & Feedback</span>
            <div className="relative p-2 hover:bg-gray-100 rounded-lg cursor-pointer">
              <span className="material-symbols-outlined text-gray-600">notifications</span>
            </div>
            <div className="size-9 rounded-full bg-[#695be6] flex items-center justify-center text-white font-bold text-sm">
              {getInitial(user?.name) || "T"}
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-[1200px] mx-auto pt-20 px-6 pb-12">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate("/teacher/ai-assistant")}
              className="flex items-center gap-1.5 border border-gray-200 text-sm font-semibold px-3 py-1.5 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <span className="material-symbols-outlined text-base">arrow_back</span> Back
            </button>
            <h2 className="font-black text-xl">Grading Workspace</h2>
          </div>
          <button
            onClick={() => setShowHistory(true)}
            className="flex items-center gap-1.5 border border-gray-200 text-sm font-semibold px-4 py-2 rounded-xl hover:bg-gray-50 transition-colors"
          >
            <span className="material-symbols-outlined text-base">history</span> View History
          </button>
        </div>

        <input ref={fileInputRef} type="file" accept="image/*,.pdf" className="hidden" onChange={handleUploadHandwriting} />

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

          {/* ── Left: Input ── */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-4">

            {/* Assistance Type */}
            <div>
              <p className="text-[10px] font-black text-gray-400 uppercase tracking-wide mb-2">Assistance Type</p>
              <div className="space-y-2">
                {assistanceTypes.map((t) => (
                  <button
                    key={t.id}
                    onClick={() => setForm({ ...form, assistanceType: t.id })}
                    className={`w-full flex items-start gap-3 p-3 rounded-xl border-2 text-left transition-all ${
                      form.assistanceType === t.id ? "border-[#695be6] bg-[#695be6]/5" : "border-gray-100 hover:border-gray-200"
                    }`}
                  >
                    <div className={`size-4 rounded-full border-2 flex items-center justify-center flex-shrink-0 mt-0.5 ${
                      form.assistanceType === t.id ? "border-[#695be6]" : "border-gray-300"
                    }`}>
                      {form.assistanceType === t.id && <div className="size-2 rounded-full bg-[#695be6]" />}
                    </div>
                    <div>
                      <p className="font-bold text-sm">{t.label}</p>
                      <p className="text-xs text-gray-400">{t.desc}</p>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Question */}
            <div>
              <p className="text-[10px] font-black text-gray-400 uppercase tracking-wide mb-2">Task / Question</p>
              <textarea
                value={form.question}
                onChange={(e) => setForm({ ...form, question: e.target.value })}
                className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm outline-none focus:border-[#695be6] resize-none h-20"
              />
            </div>

            {/* Student Response */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-wide">Student Response</p>
                <button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploading}
                  className="flex items-center gap-1 text-xs text-[#695be6] font-semibold hover:underline disabled:opacity-50"
                >
                  <span className="material-symbols-outlined text-sm">{uploading ? "hourglass_empty" : "upload"}</span>
                  {uploading ? "Uploading..." : "Upload Handwriting"}
                </button>
              </div>
              <textarea
                value={form.studentResponse}
                onChange={(e) => setForm({ ...form, studentResponse: e.target.value })}
                className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm outline-none focus:border-[#695be6] resize-none h-24"
              />
            </div>

            {/* Marks & Tone */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-wide mb-2">Total Marks</p>
                <input
                  type="number" min={1} max={100}
                  value={form.totalMarks}
                  onChange={(e) => setForm({ ...form, totalMarks: +e.target.value })}
                  className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-[#695be6]"
                />
              </div>
              <div>
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-wide mb-2">Feedback Tone</p>
                <select
                  value={form.feedbackTone}
                  onChange={(e) => setForm({ ...form, feedbackTone: e.target.value })}
                  className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-[#695be6] bg-white"
                >
                  {feedbackTones.map((t) => <option key={t.id} value={t.id}>{t.label}</option>)}
                </select>
              </div>
            </div>

            <button
              onClick={handleGenerate}
              disabled={generating}
              className="w-full bg-[#695be6] text-white font-black py-3.5 rounded-xl hover:bg-[#5a4dd4] transition-colors flex items-center justify-center gap-2 disabled:opacity-70"
            >
              <span className="material-symbols-outlined text-base">auto_awesome</span>
              {generating ? "Evaluating..." : "Generate Evaluation ✨"}
            </button>
          </div>

          {/* ── Right: Output ── */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden flex flex-col">

            {/* Loading */}
            {generating && (
              <div className="flex flex-col items-center justify-center flex-1 py-20 gap-3">
                <span className="size-8 border-2 border-[#695be6]/30 border-t-[#695be6] rounded-full animate-spin" />
                <p className="text-sm text-gray-400">Evaluating response...</p>
              </div>
            )}

            {/* Empty */}
            {!generating && !evaluated && (
              <div className="flex flex-col items-center justify-center flex-1 py-20 text-center text-gray-400 px-8">
                <span className="material-symbols-outlined text-5xl mb-3">grading</span>
                <p className="font-semibold text-sm">Fill in the details and click Generate Evaluation</p>
                <p className="text-xs mt-1">Get instant smart feedback with score, strengths, fixes, and next steps</p>
              </div>
            )}

            {/* Result */}
            {!generating && evaluated && activeResult && (
              <div className="flex-1 overflow-y-auto">
                <SmartFeedback
                  result={activeResult}
                  feedbackText={feedbackText}
                  setFeedbackText={setFeedbackText}
                  editMode={editMode}
                  setEditMode={setEditMode}
                  scorePercent={scorePercent}
                  sendSuccess={sendSuccess}
                  onAccept={handleAcceptAndSend}
                  onRegenerate={handleGenerate}
                />
              </div>
            )}
          </div>
        </div>
      </div>

      {/* History Modal */}
      {showHistory && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50" onClick={() => setShowHistory(false)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg mx-4 max-h-[80vh] overflow-hidden flex flex-col" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
              <h3 className="font-black text-base">Grading History</h3>
              <button onClick={() => setShowHistory(false)} className="p-1.5 hover:bg-gray-100 rounded-lg">
                <span className="material-symbols-outlined text-gray-500">close</span>
              </button>
            </div>
            <div className="overflow-y-auto flex-1 p-4 space-y-3">
              {gradingHistory.length === 0 ? (
                <div className="text-center py-12 text-gray-400">
                  <span className="material-symbols-outlined text-4xl mb-2 block">history</span>
                  <p className="text-sm">No grading history yet</p>
                </div>
              ) : gradingHistory.map((item) => (
                <div key={item.id}
                  className="bg-gray-50 hover:bg-[#695be6]/5 border border-gray-100 hover:border-[#695be6]/30 rounded-xl p-3 transition-all">
                  <p className="text-sm font-bold truncate">{item.title}</p>
                  <div className="flex items-center gap-3 mt-1">
                    <span className="text-xs text-gray-400">{new Date(item.createdAt).toLocaleDateString()}</span>
                    {item.result?.score != null && (
                      <span className="text-xs font-bold text-[#695be6]">{item.result.score}/{item.result.max_score}</span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 mt-2">
                    <button
                      onClick={() => {
                        setHistoryResult(item.result ?? null);
                        setHistoryLoaded(true);
                        setFeedbackText(item.result?.feedback || "");
                        setEditMode(false);
                        setSendSuccess(false);
                        setShowHistory(false);
                        if (item.topic) setForm((p) => ({ ...p, question: item.topic }));
                      }}
                      className="flex items-center gap-1 text-xs font-bold text-[#695be6] hover:bg-[#695be6]/10 px-2 py-1 rounded-lg transition-colors"
                    >
                      <span className="material-symbols-outlined text-sm">open_in_new</span> Load
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Smart Feedback Output ────────────────────────────────────────────────────
function SmartFeedback({ result, feedbackText, setFeedbackText, editMode, setEditMode, scorePercent, sendSuccess, onAccept, onRegenerate }) {
  return (
    <div className="p-5 space-y-4">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs font-black text-[#695be6] uppercase tracking-wide">⚡ Smart AI Feedback</p>
        </div>
        <button
          onClick={() => downloadGradingPdf(result, feedbackText)}
          className="flex items-center gap-1 bg-[#695be6] text-white text-xs font-bold px-3 py-1.5 rounded-lg hover:bg-[#5a4dd4]"
        >
          <span className="material-symbols-outlined text-sm">download</span> PDF
        </button>
      </div>

      {/* Overall + Score */}
      <div className="bg-[#695be6]/5 border border-[#695be6]/20 rounded-2xl p-4 flex items-center gap-4">
        {/* Donut */}
        <div className="relative size-16 flex-shrink-0">
          <svg viewBox="0 0 36 36" className="size-16 -rotate-90">
            <circle cx="18" cy="18" r="15.9" fill="none" stroke="#e5e7eb" strokeWidth="3" />
            <circle cx="18" cy="18" r="15.9" fill="none" stroke="#695be6" strokeWidth="3"
              strokeDasharray={`${scorePercent} ${100 - scorePercent}`} strokeLinecap="round" />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-sm font-black leading-none">{result.score}</span>
            <span className="text-[9px] text-gray-400">/ {result.max_score}</span>
          </div>
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-xs font-black text-gray-500 uppercase mb-1">🔷 Overall</p>
          <MathText text={result.overall_verdict} className="text-sm text-gray-700 leading-snug" tag="p" />
          <p className="text-xs font-bold text-[#695be6] mt-1">📊 Score: {result.score} / {result.max_score}</p>
        </div>
      </div>

      {/* What You Did Well */}
      {result.what_went_well?.length > 0 && (
        <div className="bg-green-50 border border-green-200 rounded-xl p-4">
          <p className="text-xs font-black text-green-700 uppercase tracking-wide mb-2">✅ What You Did Well</p>
          <ul className="space-y-1.5">
            {result.what_went_well.map((s, i) => (
              <li key={i} className="flex items-start gap-2 text-xs text-gray-700">
                <span className="material-symbols-outlined text-green-500 text-sm flex-shrink-0 mt-0.5">check_circle</span>
                <MathText text={s} />
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* What to Improve */}
      {result.what_to_improve?.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
          <p className="text-xs font-black text-amber-700 uppercase tracking-wide mb-2">⚠️ What to Improve</p>
          <ul className="space-y-1.5">
            {result.what_to_improve.map((a, i) => (
              <li key={i} className="flex items-start gap-2 text-xs text-gray-700">
                <span className="material-symbols-outlined text-amber-500 text-sm flex-shrink-0 mt-0.5">warning</span>
                <MathText text={a} />
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Quick Fix */}
      {result.quick_fix?.length > 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
          <p className="text-xs font-black text-blue-700 uppercase tracking-wide mb-2">🧠 Quick Fix</p>
          <ul className="space-y-1.5">
            {result.quick_fix.map((f, i) => (
              <li key={i} className="flex items-start gap-2 text-xs text-gray-700">
                <span className="text-blue-500 font-bold flex-shrink-0">👉</span>
                <MathText text={f} />
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Next Steps */}
      {result.next_steps?.length > 0 && (
        <div>
          <p className="text-xs font-black text-gray-400 uppercase tracking-wide mb-2">🛠️ Next Step</p>
          <ol className="space-y-1.5">
            {result.next_steps.map((s, i) => (
              <li key={i} className="flex items-start gap-2 text-xs text-gray-700">
                <span className="size-4 rounded-full bg-[#695be6] text-white text-[9px] font-bold flex items-center justify-center flex-shrink-0 mt-0.5">
                  {i + 1}
                </span>
                <MathText text={s} />
              </li>
            ))}
          </ol>
        </div>
      )}

      {/* Try Again */}
      {result.try_again_message && (
        <div className="bg-purple-50 border border-purple-200 rounded-xl p-3 flex items-center gap-2">
          <span className="text-lg">🔁</span>
          <div>
            <p className="text-xs font-black text-purple-700 mb-0.5">Try Again</p>
            <p className="text-xs text-gray-700 italic">"{result.try_again_message}"</p>
          </div>
        </div>
      )}

      {/* Feedback Draft (editable) */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <p className="text-xs font-black text-gray-400 uppercase tracking-wide">Feedback Draft</p>
          <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${editMode ? "bg-[#695be6] text-white" : "bg-blue-100 text-blue-600"}`}>
            {editMode ? "EDITING" : "EDITABLE"}
          </span>
        </div>
        <textarea
          value={feedbackText || result.feedback || ""}
          onChange={(e) => setFeedbackText(e.target.value)}
          readOnly={!editMode}
          onClick={() => !editMode && setEditMode(true)}
          rows={4}
          className={`w-full border rounded-xl px-4 py-3 text-sm outline-none resize-none transition-colors ${
            editMode ? "border-[#695be6]" : "border-gray-200 cursor-pointer hover:border-gray-300 bg-gray-50"
          }`}
        />
      </div>

      {/* Actions */}
      <div className="space-y-2">
        {sendSuccess && (
          <div className="flex items-center gap-2 bg-green-50 border border-green-200 rounded-xl px-3 py-2">
            <span className="material-symbols-outlined text-green-600 text-base">check_circle</span>
            <p className="text-xs text-green-700 font-medium">Feedback copied to clipboard</p>
          </div>
        )}
        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={onAccept}
            className="flex items-center justify-center gap-2 bg-[#695be6] text-white font-bold py-2.5 rounded-xl hover:bg-[#5a4dd4] transition-colors text-sm"
          >
            <span className="material-symbols-outlined text-base">send</span> Accept & Send
          </button>
          <button
            onClick={() => setEditMode((v) => !v)}
            className={`flex items-center justify-center gap-2 border font-bold py-2.5 rounded-xl transition-colors text-sm ${
              editMode ? "border-[#695be6] bg-[#695be6]/5 text-[#695be6]" : "border-gray-200 hover:bg-gray-50"
            }`}
          >
            <span className="material-symbols-outlined text-base">{editMode ? "check" : "edit"}</span>
            {editMode ? "Done Editing" : "Edit Manually"}
          </button>
        </div>
        <button
          onClick={onRegenerate}
          className="w-full flex items-center justify-center gap-2 border border-gray-200 font-bold py-2.5 rounded-xl hover:bg-gray-50 transition-colors text-sm"
        >
          <span className="material-symbols-outlined text-base">refresh</span> Regenerate
        </button>
      </div>
    </div>
  );
}
