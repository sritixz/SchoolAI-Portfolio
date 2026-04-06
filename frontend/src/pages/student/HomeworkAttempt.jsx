import { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { useAuth } from "../../context/AuthContext";
import VinSidePanel from "../../components/VinSidePanel";
import {
  fetchHomeworkById, fetchHomeworkQuestions,
  uploadSubmissionFile, submitHomework,
  selectCurrentHomework, selectUploadUrl, selectUploadStatus, selectSubmitResult, selectSubmitStatus,
  clearUpload, clearSubmitResult,
} from "../../store/slices/homeworkSlice";

const ANSWER_TYPES = [
  { key: "mcq",    label: "Multiple Choice" },
  { key: "typed",  label: "Typed" },
  { key: "upload", label: "Upload" },
];

const OPTION_LABELS = ["A", "B", "C", "D", "E"];

// ── MCQ — 2-column lettered pill grid ───────────────────────
function MCQInput({ options, selected, onChange }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
      {options.map((opt, i) => {
        const isSelected = selected === opt.id;
        return (
          <button
            key={opt.id}
            onClick={() => onChange(opt.id)}
            className={`flex items-center gap-4 px-5 py-4 rounded-xl border-2 font-medium text-left transition-all
              ${isSelected
                ? "border-[#5b69e6] bg-[#5b69e6]/10 text-[#5b69e6]"
                : "border-slate-200 bg-white hover:border-[#5b69e6]/40 hover:bg-[#5b69e6]/5 text-slate-700"
              }`}
          >
            <span className={`size-8 rounded-full flex items-center justify-center text-sm font-bold shrink-0
              ${isSelected ? "bg-[#5b69e6] text-white" : "bg-slate-100 text-slate-500"}`}>
              {OPTION_LABELS[i]}
            </span>
            <span className="text-sm leading-snug">{opt.text}</span>
          </button>
        );
      })}
    </div>
  );
}

// ── Typed — toolbar + textarea ───────────────────────────────
function TypedInput({ value, onChange }) {
  const textareaRef = useRef(null);
  const [history, setHistory] = useState([value]);
  const [historyIndex, setHistoryIndex] = useState(0);

  const applyFormat = (format) => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selectedText = value.substring(start, end);
    
    if (!selectedText) return;

    let formattedText = "";
    if (format === "bold") {
      formattedText = `**${selectedText}**`;
    } else if (format === "italic") {
      formattedText = `*${selectedText}*`;
    }

    const newValue = value.substring(0, start) + formattedText + value.substring(end);
    onChange(newValue);
    
    // Update history
    setHistory([...history.slice(0, historyIndex + 1), newValue]);
    setHistoryIndex(historyIndex + 1);

    // Restore cursor position
    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start + formattedText.length, start + formattedText.length);
    }, 0);
  };

  const undo = () => {
    if (historyIndex > 0) {
      setHistoryIndex(historyIndex - 1);
      onChange(history[historyIndex - 1]);
    }
  };

  const redo = () => {
    if (historyIndex < history.length - 1) {
      setHistoryIndex(historyIndex + 1);
      onChange(history[historyIndex + 1]);
    }
  };

  return (
    <div className="rounded-xl border-2 border-slate-100 overflow-hidden focus-within:border-[#5b69e6] transition-all bg-white">
      <div className="flex items-center gap-1 p-2 bg-slate-50 border-b border-slate-100">
        <button 
          onClick={() => applyFormat("bold")}
          className="p-2 hover:bg-white rounded-full transition-colors text-slate-600"
          title="Bold (select text first)"
          type="button"
        >
          <span className="material-symbols-outlined text-[20px]">format_bold</span>
        </button>
        <button 
          onClick={() => applyFormat("italic")}
          className="p-2 hover:bg-white rounded-full transition-colors text-slate-600"
          title="Italic (select text first)"
          type="button"
        >
          <span className="material-symbols-outlined text-[20px]">format_italic</span>
        </button>
        <div className="h-6 w-px bg-slate-200 mx-1" />
        <button 
          onClick={() => {
            const equation = prompt("Enter your equation (e.g., x^2 + 2x + 1):");
            if (equation) {
              onChange(value + ` ${equation} `);
            }
          }}
          className="p-2 hover:bg-white rounded-full transition-colors flex items-center gap-1.5 px-3 text-slate-600"
          title="Insert equation"
          type="button"
        >
          <span className="material-symbols-outlined text-[20px] text-[#5b69e6]">functions</span>
          <span className="text-xs font-bold uppercase tracking-tight">Equation Editor</span>
        </button>
        <div className="ml-auto flex gap-1">
          <button 
            onClick={undo}
            disabled={historyIndex === 0}
            className="p-2 hover:bg-white rounded-full transition-colors text-slate-400 disabled:opacity-30"
            title="Undo"
            type="button"
          >
            <span className="material-symbols-outlined text-[20px]">undo</span>
          </button>
          <button 
            onClick={redo}
            disabled={historyIndex === history.length - 1}
            className="p-2 hover:bg-white rounded-full transition-colors text-slate-400 disabled:opacity-30"
            title="Redo"
            type="button"
          >
            <span className="material-symbols-outlined text-[20px]">redo</span>
          </button>
        </div>
      </div>
      <textarea
        ref={textareaRef}
        value={value}
        onChange={(e) => {
          const newValue = e.target.value;
          onChange(newValue);
          setHistory([...history.slice(0, historyIndex + 1), newValue]);
          setHistoryIndex(historyIndex + 1);
        }}
        className="w-full min-h-[260px] p-6 text-base border-none focus:ring-0 bg-transparent placeholder:text-slate-300 resize-none"
        placeholder="Let's work through this... Start typing your thoughts and Vin will help refine them."
      />
    </div>
  );
}

// ── Upload — centered drag-drop zone ────────────────────────
function UploadInput({ file, onFile, uploading }) {
  const fileInputRef = useRef(null);
  const cameraInputRef = useRef(null);

  const handleDrop = (e) => {
    e.preventDefault();
    const f = e.dataTransfer.files[0];
    if (f) onFile(f);
  };

  const handleFileSelect = (e) => {
    const f = e.target.files[0];
    if (f) onFile(f);
  };

  if (file) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[320px] border-4 border-dashed border-green-300 rounded-xl bg-green-50 p-8 gap-4">
        <div className="size-20 rounded-full bg-green-100 flex items-center justify-center">
          {uploading ? (
            <span className="size-8 border-4 border-green-400/40 border-t-green-500 rounded-full animate-spin" />
          ) : (
            <span className="material-symbols-outlined text-4xl text-green-600">check_circle</span>
          )}
        </div>
        <div className="text-center">
          <p className="font-bold text-slate-800">{file.name}</p>
          <p className="text-sm text-slate-500 mt-1">
            {(file.size / 1024).toFixed(1)} KB · {uploading ? "Uploading..." : "Ready to submit"}
          </p>
        </div>
        {!uploading && (
          <button onClick={() => onFile(null)} className="text-sm text-red-500 hover:underline">
            Remove & re-upload
          </button>
        )}
      </div>
    );
  }

  return (
    <div
      onDrop={handleDrop}
      onDragOver={(e) => e.preventDefault()}
      className="group flex flex-col items-center justify-center min-h-[320px] border-4 border-dashed border-[#5b69e6]/20 rounded-xl bg-white p-8 transition-all hover:border-[#5b69e6]/50 hover:bg-[#5b69e6]/[0.02]"
    >
      <div className="flex gap-4 mb-6">
        <div className="size-20 rounded-full bg-[#5b69e6]/10 flex items-center justify-center text-[#5b69e6] group-hover:scale-110 transition-transform">
          <span className="material-symbols-outlined text-4xl">add_a_photo</span>
        </div>
        <div className="size-20 rounded-full bg-[#5b69e6]/10 flex items-center justify-center text-[#5b69e6] group-hover:scale-110 transition-transform">
          <span className="material-symbols-outlined text-4xl">collections</span>
        </div>
      </div>
      <h3 className="text-xl font-bold text-slate-800 mb-2 text-center">
        Click to take a photo or upload a scan
      </h3>
      <p className="text-slate-500 text-sm mb-6 text-center">
        Drag & drop your files here or browse from your device gallery
      </p>
      <div className="flex flex-wrap justify-center gap-3">
        <button
          onClick={() => cameraInputRef.current?.click()}
          className="flex items-center gap-2 px-6 h-12 rounded-full bg-[#5b69e6] text-white font-bold hover:brightness-110 shadow-lg shadow-[#5b69e6]/20 transition-all"
          type="button"
        >
          <span className="material-symbols-outlined">photo_camera</span>
          Take Photo
        </button>
        <input 
          ref={cameraInputRef}
          type="file" 
          accept="image/*" 
          capture="environment" 
          className="hidden" 
          onChange={handleFileSelect} 
        />
        <button
          onClick={() => fileInputRef.current?.click()}
          className="flex items-center gap-2 px-6 h-12 rounded-full bg-white border border-[#5b69e6]/30 text-[#5b69e6] font-bold hover:bg-[#5b69e6]/5 transition-all"
          type="button"
        >
          <span className="material-symbols-outlined">file_upload</span>
          Browse Files
        </button>
        <input 
          ref={fileInputRef}
          type="file" 
          accept=".jpg,.jpeg,.png,.pdf" 
          className="hidden" 
          onChange={handleFileSelect} 
        />
      </div>
      <p className="text-xs text-slate-400 uppercase tracking-tight mt-4">
        Accepted: JPG, PNG, PDF · Max 20MB
      </p>
    </div>
  );
}

// ── Vin nudge — always-visible amber panel ───────────────────
function VinNudge({ hint, vinNudge }) {
  const [nudgeIdx, setNudgeIdx] = useState(0);
  const nudges = [hint, vinNudge].filter(Boolean);
  return (
    <div className="flex items-start gap-3 p-4 bg-amber-50 border border-amber-200 rounded-xl">
      <span className="material-symbols-outlined text-amber-500 shrink-0 mt-0.5">lightbulb</span>
      <div className="flex-1">
        <p className="text-sm font-medium text-amber-800 leading-relaxed">{nudges[nudgeIdx]}</p>
        {nudges.length > 1 && (
          <button
            onClick={() => setNudgeIdx((i) => (i + 1) % nudges.length)}
            className="text-xs font-bold text-amber-600 mt-2 uppercase tracking-tight hover:underline"
          >
            Get another nudge
          </button>
        )}
      </div>
    </div>
  );
}

// ── Main ────────────────────────────────────────────────────
export default function HomeworkAttempt() {
  const { homeworkId } = useParams();
  const { user } = useAuth();
  const dispatch = useDispatch();
  const navigate = useNavigate();

  const currentHw    = useSelector(selectCurrentHomework);
  const uploadUrl    = useSelector(selectUploadUrl);
  const uploadStatus = useSelector(selectUploadStatus);
  const submitResult = useSelector(selectSubmitResult);
  const submitStatus = useSelector(selectSubmitStatus);

  const [questionSet,    setQuestionSet]    = useState(null);
  const [submissionType, setSubmissionType] = useState("online_quiz");
  const [submitting,     setSubmitting]     = useState(false);
  const [uploadFile,     setUploadFile]     = useState(null);
  const [uploading,      setUploading]      = useState(false);

  // Load homework metadata + questions from Redux
  useEffect(() => {
    dispatch(fetchHomeworkById(homeworkId));
    dispatch(fetchHomeworkQuestions(homeworkId));
    return () => { dispatch(clearUpload()); dispatch(clearSubmitResult()); };
  }, [homeworkId, dispatch]);

  useEffect(() => {
    if (!currentHw) return;
    if (currentHw.submission_type) setSubmissionType(currentHw.submission_type);
    // Set AI assistant enabled state from homework settings
    if (currentHw.ai_assistant_enabled !== undefined) {
      setAiAssistantEnabled(currentHw.ai_assistant_enabled);
    }
    if (currentHw.questions?.length) {
      setQuestionSet((prev) => prev
        ? { ...prev, questions: currentHw.questions }
        : { questions: currentHw.questions, tags: [], unitTitle: currentHw.title || "Homework", subjectIcon: "menu_book", learningMode: "Self-Study", mathReferenceCard: null }
      );
    }
  }, [currentHw]);

  // Handle file upload via Redux
  const handleFileUpload = async (file) => {
    setUploadFile(file);
    setUploading(true);
    try {
      await dispatch(uploadSubmissionFile(file));
    } catch (err) {
      console.error("Upload error:", err);
    } finally {
      setUploading(false);
    }
  };

  const openVinPanel = (context = null) => {
    setVinContext(context);
    setVinPanelOpen(true);
  };

  const [currentIdx, setCurrentIdx] = useState(0);
  const [answers, setAnswers]       = useState({});
  const [activeType, setActiveType] = useState({});
  const [vinPanelOpen, setVinPanelOpen] = useState(false);
  const [vinContext, setVinContext] = useState(null);
  const [aiAssistantEnabled, setAiAssistantEnabled] = useState(true); // Default to true

  if (!questionSet) {
    return (
      <div className="min-h-screen bg-[#f6f6f8] flex items-center justify-center" style={{ fontFamily: "'Lexend', sans-serif" }}>
        <div className="text-center">
          <span className="material-symbols-outlined text-6xl text-slate-300 mb-4 block">assignment</span>
          <p className="font-bold text-slate-600">No questions found for this homework.</p>
          <button onClick={() => navigate("/student/homework")} className="mt-4 px-6 py-2 bg-[#5b69e6] text-white rounded-full font-bold">
            Back to Homework
          </button>
        </div>
      </div>
    );
  }

  // ── File / Handwritten submission type ──────────────────────
  if (submissionType === "file_upload" || submissionType === "handwritten") {
    const icon = submissionType === "handwritten" ? "draw" : "upload_file";
    const label = submissionType === "handwritten" ? "Handwritten Answer" : "File Upload";
    return (
      <div className="min-h-screen bg-[#f6f6f8] flex flex-col" style={{ fontFamily: "'Lexend', sans-serif" }}>
        <header className="fixed top-0 left-0 right-0 z-50 bg-white/80 backdrop-blur-md border-b border-[#5b69e6]/10">
          <div className="max-w-3xl mx-auto px-6 h-16 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="bg-[#5b69e6]/10 p-2 rounded-full">
                <span className="material-symbols-outlined text-[#5b69e6]">{icon}</span>
              </div>
              <div>
                <h1 className="font-bold text-base">{questionSet?.unitTitle || "Homework"}</h1>
                <p className="text-xs text-[#5b69e6]">{label} Submission</p>
              </div>
            </div>
            <button onClick={() => navigate("/student/homework")} className="text-sm text-gray-400 hover:text-gray-600">Exit</button>
          </div>
        </header>
        <main className="flex-1 flex items-center justify-center pt-20 pb-10 px-6">
          <div className="w-full max-w-xl space-y-6">
            <div className="text-center">
              <h2 className="text-2xl font-black text-slate-800 mb-2">Submit Your Work</h2>
              <p className="text-slate-500 text-sm">
                {submissionType === "handwritten"
                  ? "Take a clear photo of your handwritten answers and upload it below."
                  : "Upload your completed work as a PDF or image file."}
              </p>
            </div>
            {!uploadFile ? (
              <div className="border-4 border-dashed border-[#5b69e6]/20 rounded-2xl p-10 text-center bg-white">
                <span className="material-symbols-outlined text-5xl text-[#5b69e6]/30 mb-4 block">{icon}</span>
                <div className="flex flex-col gap-3 items-center">
                  {submissionType === "handwritten" && (
                    <label className="flex items-center gap-2 px-6 py-3 bg-[#5b69e6] text-white font-bold rounded-xl cursor-pointer hover:bg-[#5b69e6]/90 transition-colors">
                      <span className="material-symbols-outlined">photo_camera</span> Take Photo
                      <input type="file" accept="image/*" capture="environment" className="hidden" onChange={(e) => e.target.files[0] && handleFileUpload(e.target.files[0])} />
                    </label>
                  )}
                  <label className="flex items-center gap-2 px-6 py-3 border-2 border-[#5b69e6] text-[#5b69e6] font-bold rounded-xl cursor-pointer hover:bg-[#5b69e6]/5 transition-colors">
                    <span className="material-symbols-outlined">file_upload</span> Browse Files
                    <input type="file" accept=".jpg,.jpeg,.png,.pdf,.heic" className="hidden" onChange={(e) => e.target.files[0] && handleFileUpload(e.target.files[0])} />
                  </label>
                  <p className="text-xs text-slate-400">JPG, PNG, PDF, HEIC · Max 20MB</p>
                </div>
              </div>
            ) : (
              <div className="bg-white border-2 border-green-300 rounded-2xl p-6 flex items-center gap-4">
                <div className="size-14 rounded-xl bg-green-100 flex items-center justify-center">
                  {uploading
                    ? <span className="size-6 border-2 border-green-400/40 border-t-green-500 rounded-full animate-spin" />
                    : <span className="material-symbols-outlined text-green-600 text-2xl">check_circle</span>
                  }
                </div>
                <div className="flex-1">
                  <p className="font-bold text-slate-800">{uploadFile.name}</p>
                  <p className="text-xs text-slate-400">{(uploadFile.size / 1024).toFixed(1)} KB · {uploading ? "Uploading..." : uploadUrl ? "Uploaded ✓" : "Ready to submit"}</p>
                </div>
                {!uploading && (
                  <button onClick={() => { setUploadFile(null); dispatch(clearUpload()); }} className="text-red-400 hover:text-red-600">
                    <span className="material-symbols-outlined">delete</span>
                  </button>
                )}
              </div>
            )}
            <button
              disabled={!uploadFile || uploading || submitting}
              onClick={async () => {
                setSubmitting(true);
                try {
                  await dispatch(submitHomework({ homework_id: homeworkId, student_id: user?.id, answers: [], submission_file_url: uploadUrl || null }));
                  navigate(`/student/homework/${homeworkId}/result`, { state: { answers: {}, questionSet, fileSubmission: true } });
                } catch {
                  navigate(`/student/homework/${homeworkId}/result`, { state: { answers: {}, questionSet, fileSubmission: true } });
                } finally {
                  setSubmitting(false);
                }
              }}
              className="w-full py-4 bg-[#5b69e6] text-white font-bold rounded-xl hover:bg-[#5b69e6]/90 disabled:opacity-40 transition-colors flex items-center justify-center gap-2 text-lg shadow-xl shadow-[#5b69e6]/20">
              {submitting
                ? <><span className="size-5 border-2 border-white/40 border-t-white rounded-full animate-spin" /> Submitting...</>
                : <><span className="material-symbols-outlined">send</span> Submit Homework</>
              }
            </button>
          </div>
        </main>
      </div>
    );
  }

  const questions  = questionSet.questions;
  const q          = questions[currentIdx];
  const totalQ     = questions.length;
  const progressPct = Math.round(((currentIdx + 1) / totalQ) * 100);
  const isLast     = currentIdx === totalQ - 1;

  const currentType   = activeType[q.id] || q.answerType;
  const currentAnswer = answers[q.id] ?? (currentType === "mcq" ? null : "");

  const setType   = (qid, t) => setActiveType((p) => ({ ...p, [qid]: t }));
  const setAnswer = (qid, v) => setAnswers((p) => ({ ...p, [qid]: v }));

  const canProceed = () => {
    if (currentType === "mcq")    return !!currentAnswer;
    if (currentType === "typed")  return (currentAnswer || "").trim().length > 5;
    if (currentType === "upload") return !!currentAnswer;
    return false;
  };

  const handleNext = async () => {
    if (!isLast) {
      setCurrentIdx((i) => i + 1);
    } else {
      setSubmitting(true);
      // Build answers array for API
      const answersPayload = questions.map((qq) => ({
        question_id: qq.id,
        answer: answers[qq.id] instanceof File ? null : (answers[qq.id] ?? null),
        answer_type: activeType[qq.id] || qq.answerType,
      }));
      try {
        const result = await dispatch(submitHomework({ homework_id: homeworkId, student_id: user?.id, answers: answersPayload })).unwrap();
        navigate(`/student/homework/${homeworkId}/result`, {
          state: { answers, questionSet, apiResult: result },
        });
      } catch {
        // Fallback: navigate with local data
        navigate(`/student/homework/${homeworkId}/result`, {
          state: { answers, questionSet },
        });
      } finally {
        setSubmitting(false);
      }
    }
  };

  // Typed questions always show the nudge; MCQ/upload show it below
  const isTyped  = currentType === "typed";
  const isUpload = currentType === "upload";
  const isMcq    = currentType === "mcq";

  return (
    <div className="min-h-screen bg-[#f6f6f8] text-slate-900" style={{ fontFamily: "'Lexend', sans-serif" }}>

      {/* ── Header ── */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-white/80 backdrop-blur-md border-b border-[#5b69e6]/10">
        <div className="max-w-5xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-[#5b69e6]/10 p-2 rounded-full">
              <span className="material-symbols-outlined text-[#5b69e6]">{questionSet.subjectIcon}</span>
            </div>
            <h1 className="font-bold text-base leading-tight tracking-tight">{questionSet.unitTitle}</h1>
          </div>
          <div className="flex items-center gap-3">
            {aiAssistantEnabled && (
              <button 
                onClick={() => openVinPanel(q?.questionText ? `Help me with: ${q.questionText}` : null)}
                className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-full text-sm font-semibold transition-colors flex items-center gap-2"
              >
                <span className="material-symbols-outlined text-[18px]">smart_toy</span>
                Ask Vin
              </button>
            )}
            <button
              onClick={() => navigate("/student/homework")}
              className="bg-[#5b69e6]/10 hover:bg-[#5b69e6]/20 text-[#5b69e6] px-4 py-2 rounded-full text-sm font-semibold transition-colors"
            >
              Save & Exit
            </button>
            {user?.avatar
              ? <img src={user.avatar} alt="avatar" className="size-10 rounded-full border-2 border-[#5b69e6]/20 object-cover" />
              : <div className="size-10 rounded-full bg-[#5b69e6]/20 flex items-center justify-center border-2 border-[#5b69e6]/30">
                  <span className="material-symbols-outlined text-[#5b69e6]">person</span>
                </div>
            }
          </div>
        </div>
      </header>

      {/* ── Main ── */}
      <main className="pt-24 pb-32 px-6 max-w-4xl mx-auto">

        {/* Tags */}
        <div className="flex flex-wrap gap-2 mb-4">
          {questionSet.tags.map((tag) => (
            <span key={tag} className="bg-[#5b69e6]/10 text-[#5b69e6] text-[10px] font-bold uppercase tracking-widest px-3 py-1 rounded-full">
              {tag}
            </span>
          ))}
        </div>

        {/* Progress bar */}
        <div className="mb-8 space-y-2">
          <div className="flex justify-between items-end">
            <div>
              <span className="text-xs font-semibold text-[#5b69e6]/60 uppercase tracking-wider">Progress</span>
              <h2 className="text-xl font-bold">Question {q.questionNumber} of {totalQ}</h2>
            </div>
            <span className="text-[#5b69e6] font-bold">{progressPct}% Complete</span>
          </div>
          <div className="h-3 w-full bg-[#5b69e6]/10 rounded-full overflow-hidden">
            <div
              className="h-full bg-[#5b69e6] rounded-full transition-all duration-500"
              style={{ width: `${progressPct}%`, boxShadow: "0 0 12px rgba(91,105,230,0.4)" }}
            />
          </div>
          {/* Dot navigator */}
          <div className="flex gap-1.5 pt-1">
            {questions.map((qq, i) => (
              <button
                key={qq.id}
                onClick={() => setCurrentIdx(i)}
                title={`Q${i + 1}`}
                className={`h-2 rounded-full transition-all duration-300 ${
                  i === currentIdx
                    ? "bg-[#5b69e6] w-6"
                    : answers[qq.id] !== undefined && answers[qq.id] !== null && answers[qq.id] !== ""
                    ? "bg-[#5b69e6]/40 w-2"
                    : "bg-slate-200 w-2"
                }`}
              />
            ))}
          </div>
        </div>

        {/* Question card */}
        <div className="bg-white rounded-xl p-8 shadow-sm border border-slate-200 mb-6">

          {/* Answer type switcher */}
          <div className="flex mb-8">
            <div className="bg-slate-100 p-1.5 rounded-full flex gap-1">
              {ANSWER_TYPES.map((t) => (
                <button
                  key={t.key}
                  onClick={() => setType(q.id, t.key)}
                  className={`px-5 py-2 rounded-full text-sm font-semibold transition-all ${
                    currentType === t.key
                      ? "bg-[#5b69e6] text-white shadow-lg shadow-[#5b69e6]/30"
                      : "text-slate-500 hover:text-slate-700"
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          {/* Question text */}
          <h3
            className="text-2xl font-semibold leading-snug mb-8"
            dangerouslySetInnerHTML={{ __html: q.questionText }}
          />

          {/* MCQ */}
          {isMcq && (
            <>
              <MCQInput
                options={q.options}
                selected={currentAnswer}
                onChange={(v) => setAnswer(q.id, v)}
              />
              {/* Nudge below options for MCQ */}
              {q.hint && (
                <div className="mt-6">
                  <VinNudge hint={q.hint} vinNudge={q.vinNudge} />
                </div>
              )}
            </>
          )}

          {/* Typed — nudge always shown above textarea */}
          {isTyped && (
            <>
              {q.hint && (
                <div className="mb-6">
                  <VinNudge hint={q.hint} vinNudge={q.vinNudge} />
                </div>
              )}
              <TypedInput
                value={currentAnswer}
                onChange={(v) => setAnswer(q.id, v)}
              />
            </>
          )}

          {/* Upload */}
          {isUpload && (
            <UploadInput
              file={currentAnswer || null}
              onFile={(f) => setAnswer(q.id, f)}
              uploading={false}
            />
          )}
        </div>
      </main>

      {/* ── Vin Side Panel ── */}
      {aiAssistantEnabled && (
        <VinSidePanel 
          isOpen={vinPanelOpen} 
          onClose={() => setVinPanelOpen(false)}
          context={vinContext}
        />
      )}

      {/* ── Footer ── */}
      <footer className="fixed bottom-0 left-0 right-0 bg-white/90 backdrop-blur-md border-t border-slate-200 p-4">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <button
            onClick={() => currentIdx > 0 && setCurrentIdx((i) => i - 1)}
            disabled={currentIdx === 0}
            className="flex items-center gap-2 px-6 py-3 rounded-full font-semibold text-slate-600 hover:bg-slate-100 transition-colors disabled:opacity-30"
          >
            <span className="material-symbols-outlined">arrow_back</span>
            Previous
          </button>

          <div className="flex items-center gap-4">
            {/* Learning mode label */}
            <div className="hidden md:flex flex-col items-end">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                {isTyped ? "Ready to move on?" : questionSet.learningMode}
              </span>
              <span className="text-xs text-[#5b69e6] font-medium">
                {isTyped ? "Collaborative Review" : !isLast ? `Next: Q${currentIdx + 2} of ${totalQ}` : "Final Question"}
              </span>
            </div>

            <div className="flex items-center gap-3">
              {isTyped && (
                <button className="bg-slate-100 text-slate-700 px-5 py-3 rounded-full font-bold hover:bg-slate-200 transition-all">
                  Retry Similar
                </button>
              )}
              <button
                onClick={handleNext}
                disabled={!canProceed()}
                className="bg-[#5b69e6] hover:bg-[#5b69e6]/90 text-white px-8 py-3 rounded-full font-bold shadow-xl shadow-[#5b69e6]/20 flex items-center gap-2 transition-all active:scale-95 disabled:opacity-40"
              >
                {isLast
                  ? (submitting ? "Submitting..." : "Submit All")
                  : isTyped
                  ? "Check My Work"
                  : "Submit Answer"}
                <span className="material-symbols-outlined text-[20px]">
                  {isLast ? "auto_awesome" : "arrow_forward"}
                </span>
              </button>
            </div>
          </div>
        </div>
      </footer>

      {/* ── Math reference sidebar (xl) ── */}
      {questionSet.mathReferenceCard && (
        <div className="fixed right-8 top-1/2 -translate-y-1/2 hidden xl:flex flex-col gap-3">
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xl w-48">
            <h4 className="text-[10px] font-bold text-[#5b69e6] uppercase tracking-widest mb-3">Math Reference</h4>
            <ul className="space-y-2 text-xs">
              {questionSet.mathReferenceCard.map((item, i) => (
                <li key={i} className={`flex justify-between ${i < questionSet.mathReferenceCard.length - 1 ? "border-b border-slate-50 pb-1" : ""}`}>
                  <span className="text-slate-400">{item.condition}</span>
                  <span className="font-medium">{item.result}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}

      {/* Per-question formula card (xl) */}
      {q.mathReference && (
        <div className="fixed right-8 bottom-24 hidden xl:block">
          <div className="bg-[#5b69e6]/5 border border-[#5b69e6]/20 p-4 rounded-xl w-52">
            <p className="text-[10px] font-bold text-[#5b69e6] uppercase tracking-widest mb-2">Formula</p>
            <p className="text-sm font-mono text-slate-700">{q.mathReference.formula}</p>
            {q.mathReference.note && (
              <p className="text-xs text-slate-500 mt-1">{q.mathReference.note}</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
