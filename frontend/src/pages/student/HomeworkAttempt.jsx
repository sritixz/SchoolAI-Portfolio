import { useState, useEffect, useRef } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { useAuth } from "../../context/AuthContext";
import VinSidePanel from "../../components/VinSidePanel";
import {
  fetchHomeworkById, fetchHomeworkQuestions,
  uploadSubmissionFile, submitHomework,
  selectCurrentHomework, selectHomeworkQuestions, selectUploadUrl, selectUploadStatus, selectSubmitResult, selectSubmitStatus,
  clearUpload, clearSubmitResult, clearCurrent,
  saveHomeworkProgress, fetchHomeworkProgress,
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
  const [equationPanelOpen, setEquationPanelOpen] = useState(false);
  const [equationDraft, setEquationDraft] = useState("");
  const equationInputRef = useRef(null);

  const applyFormat = (format) => {
    const textarea = textareaRef.current;
    if (!textarea) return;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selectedText = value.substring(start, end);
    if (!selectedText) return;
    const formattedText = format === "bold" ? `**${selectedText}**` : `*${selectedText}*`;
    const newValue = value.substring(0, start) + formattedText + value.substring(end);
    onChange(newValue);
    setHistory([...history.slice(0, historyIndex + 1), newValue]);
    setHistoryIndex(historyIndex + 1);
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

  const openEquationPanel = () => {
    setEquationDraft("");
    setEquationPanelOpen(true);
    setTimeout(() => equationInputRef.current?.focus(), 50);
  };

  const insertEquation = () => {
    if (!equationDraft.trim()) return;
    const textarea = textareaRef.current;
    const cursorPos = textarea ? textarea.selectionStart : value.length;
    const newValue = value.substring(0, cursorPos) + ` ${equationDraft.trim()} ` + value.substring(cursorPos);
    onChange(newValue);
    setHistory([...history.slice(0, historyIndex + 1), newValue]);
    setHistoryIndex(historyIndex + 1);
    setEquationPanelOpen(false);
    setEquationDraft("");
    setTimeout(() => textareaRef.current?.focus(), 50);
  };

  // Quick-insert symbols
  const SYMBOLS = ["²", "³", "√", "π", "∞", "±", "×", "÷", "≠", "≤", "≥", "∑", "∫", "θ", "α", "β"];

  return (
    <div className="rounded-xl border-2 border-slate-100 overflow-hidden focus-within:border-[#5b69e6] transition-all bg-white">
      {/* Toolbar */}
      <div className="flex items-center gap-1 p-2 bg-slate-50 border-b border-slate-100">
        <button onClick={() => applyFormat("bold")} className="p-2 hover:bg-white rounded-full transition-colors text-slate-600" title="Bold" type="button">
          <span className="material-symbols-outlined text-[20px]">format_bold</span>
        </button>
        <button onClick={() => applyFormat("italic")} className="p-2 hover:bg-white rounded-full transition-colors text-slate-600" title="Italic" type="button">
          <span className="material-symbols-outlined text-[20px]">format_italic</span>
        </button>
        <div className="h-6 w-px bg-slate-200 mx-1" />
        <button
          onClick={openEquationPanel}
          className={`p-2 hover:bg-white rounded-full transition-colors flex items-center gap-1.5 px-3 text-slate-600 ${equationPanelOpen ? "bg-[#5b69e6]/10 text-[#5b69e6]" : ""}`}
          title="Equation Editor"
          type="button"
        >
          <span className="material-symbols-outlined text-[20px] text-[#5b69e6]">functions</span>
          <span className="text-xs font-bold uppercase tracking-tight">Equation Editor</span>
        </button>
        <div className="ml-auto flex gap-1">
          <button onClick={undo} disabled={historyIndex === 0} className="p-2 hover:bg-white rounded-full transition-colors text-slate-400 disabled:opacity-30" title="Undo" type="button">
            <span className="material-symbols-outlined text-[20px]">undo</span>
          </button>
          <button onClick={redo} disabled={historyIndex === history.length - 1} className="p-2 hover:bg-white rounded-full transition-colors text-slate-400 disabled:opacity-30" title="Redo" type="button">
            <span className="material-symbols-outlined text-[20px]">redo</span>
          </button>
        </div>
      </div>

      {/* Equation panel — inline, no modal */}
      {equationPanelOpen && (
        <div className="bg-[#5b69e6]/5 border-b border-[#5b69e6]/20 p-4 space-y-3">
          <div className="flex items-center justify-between mb-1">
            <p className="text-xs font-bold text-[#5b69e6] uppercase tracking-wider">Equation Editor</p>
            <button onClick={() => setEquationPanelOpen(false)} className="text-slate-400 hover:text-slate-600" type="button">
              <span className="material-symbols-outlined text-[18px]">close</span>
            </button>
          </div>
          <p className="text-xs text-slate-500">Write in any format — plain text, LaTeX, words, symbols, whatever works for you.</p>

          {/* Quick symbol palette */}
          <div className="flex flex-wrap gap-1.5">
            {SYMBOLS.map((sym) => (
              <button
                key={sym}
                type="button"
                onClick={() => setEquationDraft((d) => d + sym)}
                className="px-2.5 py-1 rounded-lg bg-white border border-slate-200 text-sm font-mono hover:border-[#5b69e6] hover:text-[#5b69e6] transition-colors"
              >
                {sym}
              </button>
            ))}
          </div>

          {/* Free-form input */}
          <input
            ref={equationInputRef}
            type="text"
            value={equationDraft}
            onChange={(e) => setEquationDraft(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") insertEquation(); if (e.key === "Escape") setEquationPanelOpen(false); }}
            placeholder="e.g.  x² + 2x + 1 = 0  or  (a+b)^2  or  the square root of 16"
            className="w-full px-4 py-2.5 rounded-lg border border-slate-200 bg-white text-sm font-mono focus:outline-none focus:border-[#5b69e6] placeholder:text-slate-300"
          />

          {/* Preview */}
          {equationDraft && (
            <div className="px-4 py-2 bg-white rounded-lg border border-slate-100 text-sm font-mono text-slate-700">
              Preview: <span className="text-[#5b69e6]">{equationDraft}</span>
            </div>
          )}

          <div className="flex gap-2 justify-end">
            <button onClick={() => setEquationPanelOpen(false)} className="px-4 py-2 rounded-lg text-sm text-slate-500 hover:bg-slate-100 transition-colors" type="button">Cancel</button>
            <button
              onClick={insertEquation}
              disabled={!equationDraft.trim()}
              className="px-5 py-2 rounded-lg bg-[#5b69e6] text-white text-sm font-bold hover:bg-[#5b69e6]/90 disabled:opacity-40 transition-colors"
              type="button"
            >
              Insert
            </button>
          </div>
        </div>
      )}

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
  const { state: locationState } = useLocation();

  const currentHw    = useSelector(selectCurrentHomework);
  const apiQuestions = useSelector(selectHomeworkQuestions); // normalized camelCase from /questions endpoint
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
    dispatch(clearCurrent()); // clear stale homework before fetching new one
    setQuestionSet(null);     // reset so old title never shows
    dispatch(fetchHomeworkById(homeworkId));
    dispatch(fetchHomeworkQuestions(homeworkId));
    return () => { dispatch(clearUpload()); dispatch(clearSubmitResult()); };
  }, [homeworkId, dispatch]);

  useEffect(() => {
    if (!currentHw) return;
    if (currentHw.submission_type) setSubmissionType(currentHw.submission_type);
    if (currentHw.ai_assistant_enabled !== undefined) {
      setAiAssistantEnabled(currentHw.ai_assistant_enabled);
    }

    // If this is a file/handwritten submission that's already been evaluated,
    // redirect straight to the feedback view — no need to wait for questionSet.
    // But skip redirect if allow_retries is enabled (student is reattempting).
    const isFileType = currentHw.submission_type === "file_upload" || currentHw.submission_type === "handwritten";
    const isDone     = currentHw.status === "completed" || currentHw.status === "evaluated";
    const isReattempt = locationState?.reattempt || currentHw.allow_retries;
    if (isFileType && isDone && !isReattempt) {
      const hwData = locationState?.hwData || {};
      // If we already have grade/feedback from list navigation state, use it directly.
      // Otherwise fetch the submission result from the API.
      const grade    = hwData.grade || hwData.final_grade;
      const feedback = hwData.teacherFeedback || hwData.teacher_feedback || hwData.feedback;
      const minimalQS = { questions: [], unitTitle: currentHw.title || "Homework", tags: [] };

      if (grade || feedback) {
        navigate(`/student/homework/${homeworkId}/result`, {
          replace: true,
          state: {
            answers: {},
            questionSet: minimalQS,
            fileSubmission: true,
            apiResult: { status: "completed", grade, feedback },
          },
        });
      } else {
        // Fetch submission data to get grade + feedback
        import("../../api").then(({ default: api }) =>
          api.get(`/homework/${homeworkId}/result`)
            .then(({ data }) => {
              navigate(`/student/homework/${homeworkId}/result`, {
                replace: true,
                state: {
                  answers: {},
                  questionSet: minimalQS,
                  fileSubmission: true,
                  submissionDoc: data,
                  apiResult: {
                    status: data.status || "completed",
                    grade: data.final_grade,
                    feedback: data.teacher_feedback,
                    auto_score_pct: data.auto_score_pct,
                  },
                },
              });
            })
            .catch(() => {
              // Fallback: show result page without grade data
              navigate(`/student/homework/${homeworkId}/result`, {
                replace: true,
                state: { answers: {}, questionSet: minimalQS, fileSubmission: true, apiResult: { status: "completed" } },
              });
            })
        );
      }
      return;
    }

    // Prefer apiQuestions (normalized camelCase from /questions endpoint)
    // Fall back to currentHw.questions (raw snake_case from /homework/:id)
    const rawQuestions = apiQuestions.length > 0 ? apiQuestions : (currentHw.questions || []);

    if (rawQuestions.length) {
      const normalise = (q, idx) => ({
        id:             q.id || q._id || `q${idx+1}`,
        questionNumber: q.questionNumber || q.question_number || idx + 1,
        questionText:   q.questionText   || q.question_text   || q.text || "",
        answerType:     q.answerType     || q.answer_type     || q.type || "mcq",
        options:        (q.options || []).map((o) => ({
          id:        o.id || o._id || `o${idx}`,
          text:      o.text || o.label || String(o),
          isCorrect: o.is_correct || o.isCorrect || false,
        })),
        hint:           q.hint,
        vinNudge:       q.vinNudge || q.vin_nudge,
        maxPoints:      q.maxPoints || q.max_points || 1,
        sampleAnswer:   q.sampleAnswer || q.sample_answer,
      });
      const normalised = rawQuestions.map((q, i) => normalise(q, i));
      setQuestionSet((prev) => prev
        ? { ...prev, questions: normalised }
        : {
            questions: normalised,
            tags: currentHw.tags || [],
            unitTitle: currentHw.title || "Homework",
            subjectIcon: "menu_book",
            learningMode: "Self-Study",
            mathReferenceCard: null,
          }
      );
    }
  }, [currentHw, apiQuestions]);

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
  const [skipped, setSkipped]       = useState(new Set());
  const [vinPanelOpen, setVinPanelOpen] = useState(false);
  const [vinContext, setVinContext] = useState(null);
  const [aiAssistantEnabled, setAiAssistantEnabled] = useState(true); // Default to true
  const [progressLoaded, setProgressLoaded] = useState(false);

  // Restore saved progress when questions are loaded
  useEffect(() => {
    if (!questionSet || progressLoaded) return;
    dispatch(fetchHomeworkProgress(homeworkId)).then((action) => {
      const prog = action.payload;
      if (prog && prog.answers) {
        setAnswers(prog.answers || {});
        setActiveType(prog.active_types || {});
        setCurrentIdx(prog.current_index || 0);
        setSkipped(new Set(prog.skipped || []));
      }
      setProgressLoaded(true);
    });
  }, [questionSet, homeworkId, dispatch, progressLoaded]);

  // Auto-save progress when answers change (debounced)
  const saveTimerRef = useRef(null);
  useEffect(() => {
    if (!questionSet || !progressLoaded) return;
    // Don't save if no answers yet
    const hasAnswers = Object.values(answers).some(v => v !== null && v !== undefined && v !== "");
    if (!hasAnswers) return;
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => {
      // Filter out File objects from answers (can't serialize)
      const serializableAnswers = {};
      for (const [k, v] of Object.entries(answers)) {
        if (v instanceof File) continue;
        serializableAnswers[k] = v;
      }
      dispatch(saveHomeworkProgress({
        homework_id: homeworkId,
        answers: serializableAnswers,
        active_types: activeType,
        current_index: currentIdx,
        skipped: [...skipped],
      }));
    }, 2000);
    return () => { if (saveTimerRef.current) clearTimeout(saveTimerRef.current); };
  }, [answers, activeType, currentIdx, skipped, questionSet, progressLoaded]);

  if (!questionSet) {
    return (
      <div className="min-h-screen bg-[#f6f6f8] flex items-center justify-center" style={{ fontFamily: "'Lexend', sans-serif" }}>
        <div className="text-center">
          <span className="size-10 border-4 border-[#5b69e6]/20 border-t-[#5b69e6] rounded-full animate-spin block mx-auto mb-4" />
          <p className="font-bold text-slate-600">Loading questions...</p>
          <button onClick={() => navigate("/student/homework")} className="mt-4 px-6 py-2 bg-[#5b69e6] text-white rounded-full font-bold text-sm">
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

    const handleMultiFileUpload = async (files) => {
      if (!files || !files.length) return;
      const toUpload = Array.from(files).slice(0, 10 - (uploadFile?.length || 0));
      if (!toUpload.length) return;
      setUploading(true);
      try {
        const formData = new FormData();
        toUpload.forEach((f) => formData.append("files", f));
        formData.append("folder", "homework-submissions");
        const { default: api } = await import("../../api");
        const { data } = await api.post("/storage/upload-multiple", formData, {
          headers: { "Content-Type": "multipart/form-data" },
        });
        // uploadFile stores array of {url, filename, preview}
        const newFiles = data.files.map((f, i) => ({
          url: f.url,
          filename: f.filename,
          preview: toUpload[i].type.startsWith("image/") ? URL.createObjectURL(toUpload[i]) : null,
          size: toUpload[i].size,
        }));
        setUploadFile((prev) => [...(prev || []), ...newFiles]);
        // Use first file URL for Redux uploadUrl (for backward compat)
        if (data.files[0]) {
          dispatch({ type: "homework/setUploadUrl", payload: data.files[0].url });
        }
      } catch (err) {
        console.error("Upload error:", err);
      } finally {
        setUploading(false);
      }
    };

    const uploadedFiles = Array.isArray(uploadFile) ? uploadFile : (uploadFile ? [{ filename: uploadFile.name, size: uploadFile.size, url: uploadUrl }] : []);
    const allUrls = uploadedFiles.map((f) => f.url).filter(Boolean);

    return (
      <div className="min-h-screen bg-[#f6f6f8] flex flex-col" style={{ fontFamily: "'Lexend', sans-serif" }}>
        <header className="fixed top-0 left-0 right-0 z-50 bg-white/80 backdrop-blur-md border-b border-[#5b69e6]/10">
          <div className="max-w-3xl mx-auto px-6 h-16 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <button
                onClick={() => navigate("/student/homework")}
                className="size-9 flex items-center justify-center rounded-xl hover:bg-gray-100 text-slate-600"
              >
                <span className="material-symbols-outlined text-xl">arrow_back</span>
              </button>
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
                  ? "Take photos of your handwritten answers. You can upload up to 10 pages."
                  : "Upload your completed work. Supports JPG, PNG, PDF, HEIC — up to 10 files."}
              </p>
            </div>

            {/* Uploaded files grid */}
            {uploadedFiles.length > 0 && (
              <div className="bg-white rounded-2xl border border-slate-200 p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-bold text-slate-700 flex items-center gap-1.5">
                    <span className="material-symbols-outlined text-green-600 text-base">check_circle</span>
                    {uploadedFiles.length} file{uploadedFiles.length > 1 ? "s" : ""} uploaded
                  </p>
                  {uploadedFiles.length < 10 && (
                    <span className="text-xs text-slate-400">{10 - uploadedFiles.length} more allowed</span>
                  )}
                </div>
                <div className="grid grid-cols-4 gap-2">
                  {uploadedFiles.map((f, idx) => (
                    <div key={idx} className="relative group">
                      {f.preview ? (
                        <img src={f.preview} alt={f.filename} className="w-full aspect-square object-cover rounded-lg border border-slate-200" />
                      ) : (
                        <div className="w-full aspect-square rounded-lg border border-slate-200 bg-slate-50 flex flex-col items-center justify-center gap-1">
                          <span className="material-symbols-outlined text-slate-400 text-2xl">description</span>
                          <span className="text-[9px] text-slate-400 text-center px-1 truncate w-full text-center">{f.filename}</span>
                        </div>
                      )}
                      <button
                        onClick={() => {
                          if (f.preview) URL.revokeObjectURL(f.preview);
                          setUploadFile((prev) => (Array.isArray(prev) ? prev.filter((_, i) => i !== idx) : null));
                        }}
                        className="absolute -top-1 -right-1 size-5 bg-red-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow"
                      >
                        <span className="material-symbols-outlined text-xs">close</span>
                      </button>
                    </div>
                  ))}
                  {/* Add more slot */}
                  {uploadedFiles.length < 10 && !uploading && (
                    <label className="aspect-square rounded-lg border-2 border-dashed border-[#5b69e6]/30 bg-[#5b69e6]/5 hover:bg-[#5b69e6]/10 transition-colors flex items-center justify-center cursor-pointer">
                      <span className="material-symbols-outlined text-[#5b69e6] text-2xl">add_photo_alternate</span>
                      <input
                        type="file"
                        accept=".jpg,.jpeg,.png,.pdf,.heic,.heif,image/*"
                        multiple
                        className="hidden"
                        onChange={(e) => handleMultiFileUpload(e.target.files)}
                      />
                    </label>
                  )}
                  {uploading && (
                    <div className="aspect-square rounded-lg border-2 border-dashed border-[#5b69e6]/30 bg-[#5b69e6]/5 flex items-center justify-center">
                      <span className="size-6 border-2 border-[#5b69e6]/30 border-t-[#5b69e6] rounded-full animate-spin" />
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Initial upload zone — shown when no files yet */}
            {uploadedFiles.length === 0 && (
              <div className="border-4 border-dashed border-[#5b69e6]/20 rounded-2xl p-10 text-center bg-white">
                <span className="material-symbols-outlined text-5xl text-[#5b69e6]/30 mb-4 block">{icon}</span>
                <div className="flex flex-col gap-3 items-center">
                  {submissionType === "handwritten" && (
                    <label className="flex items-center gap-2 px-6 py-3 bg-[#5b69e6] text-white font-bold rounded-xl cursor-pointer hover:bg-[#5b69e6]/90 transition-colors">
                      <span className="material-symbols-outlined">photo_camera</span> Take Photo
                      <input type="file" accept="image/*" capture="environment" multiple className="hidden" onChange={(e) => handleMultiFileUpload(e.target.files)} />
                    </label>
                  )}
                  <label className="flex items-center gap-2 px-6 py-3 border-2 border-[#5b69e6] text-[#5b69e6] font-bold rounded-xl cursor-pointer hover:bg-[#5b69e6]/5 transition-colors">
                    <span className="material-symbols-outlined">file_upload</span> Browse Files
                    <input type="file" accept=".jpg,.jpeg,.png,.pdf,.heic,.heif,image/*" multiple className="hidden" onChange={(e) => handleMultiFileUpload(e.target.files)} />
                  </label>
                  <p className="text-xs text-slate-400">JPG, PNG, PDF, HEIC · Up to 10 files · Max 20MB each</p>
                </div>
              </div>
            )}

            <button
              disabled={uploadedFiles.length === 0 || uploading || submitting}
              onClick={async () => {
                setSubmitting(true);
                try {
                  // Submit with all file URLs (comma-separated for multi-file OCR)
                  await dispatch(submitHomework({ 
                    homework_id: homeworkId, 
                    student_id: user?.id, 
                    answers: [], 
                    submission_file_url: allUrls.join(", ") 
                  }));
                  navigate(`/student/homework/${homeworkId}/result`, {
                    state: { answers: {}, questionSet, fileSubmission: true, allowRetries: currentHw?.allow_retries || false },
                  });
                } catch {
                  navigate(`/student/homework/${homeworkId}/result`, {
                    state: { answers: {}, questionSet, fileSubmission: true, allowRetries: currentHw?.allow_retries || false },
                  });
                } finally {
                  setSubmitting(false);
                }
              }}
              className="w-full py-4 bg-[#5b69e6] text-white font-bold rounded-xl hover:bg-[#5b69e6]/90 disabled:opacity-40 transition-colors flex items-center justify-center gap-2 text-lg shadow-xl shadow-[#5b69e6]/20">
              {submitting
                ? <><span className="size-5 border-2 border-white/40 border-t-white rounded-full animate-spin" /> Submitting...</>
                : <><span className="material-symbols-outlined">send</span> Submit {uploadedFiles.length} file{uploadedFiles.length > 1 ? "s" : ""}</>
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

  const handleSkip = () => {
    setSkipped((prev) => new Set([...prev, q.id]));
    // Find next unanswered/unskipped question, or just go forward
    const nextIdx = questions.findIndex((qq, i) => i > currentIdx && !skipped.has(qq.id) && !(answers[qq.id] !== undefined && answers[qq.id] !== null && answers[qq.id] !== ""));
    if (nextIdx !== -1) {
      setCurrentIdx(nextIdx);
    } else if (currentIdx < totalQ - 1) {
      setCurrentIdx((i) => i + 1);
    }
  };

  // All non-skipped questions answered, or all questions attempted
  const allAnsweredOrSkipped = questions.every(
    (qq) => skipped.has(qq.id) || (answers[qq.id] !== undefined && answers[qq.id] !== null && answers[qq.id] !== "")
  );
  const isReadyToSubmit = isLast && allAnsweredOrSkipped;

  const handleNext = async () => {
    if (!isLast) {
      setCurrentIdx((i) => i + 1);
    } else {
      setSubmitting(true);
      // Upload any per-question files that haven't been uploaded yet
      const fileUploadPromises = [];
      for (const qq of questions) {
        const ans = answers[qq.id];
        if (ans instanceof File) {
          fileUploadPromises.push(
            dispatch(uploadSubmissionFile(ans)).unwrap()
              .then((res) => ({ questionId: qq.id, url: res.url }))
              .catch(() => ({ questionId: qq.id, url: null }))
          );
        }
      }
      const uploadedFiles = await Promise.all(fileUploadPromises);
      const fileUrlMap = {};
      for (const { questionId, url } of uploadedFiles) {
        if (url) fileUrlMap[questionId] = url;
      }

      // Build answers array for API — skipped questions get null answer
      const answersPayload = questions.map((qq) => ({
        question_id: qq.id,
        answer: answers[qq.id] instanceof File ? null : (answers[qq.id] ?? null),
        file_url: fileUrlMap[qq.id] || null,
        answer_type: activeType[qq.id] || qq.answerType,
        skipped: skipped.has(qq.id),
      }));
      try {
        const result = await dispatch(submitHomework({ homework_id: homeworkId, student_id: user?.id, answers: answersPayload })).unwrap();
        navigate(`/student/homework/${homeworkId}/result`, {
          state: { answers, questionSet, apiResult: result, allowRetries: currentHw?.allow_retries || false },
        });
      } catch {
        navigate(`/student/homework/${homeworkId}/result`, {
          state: { answers, questionSet, allowRetries: currentHw?.allow_retries || false },
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
            <button
              onClick={() => navigate("/student/homework")}
              className="size-9 flex items-center justify-center rounded-xl hover:bg-gray-100 text-slate-600 mr-1"
            >
              <span className="material-symbols-outlined text-xl">arrow_back</span>
            </button>
            <div className="bg-[#5b69e6]/10 p-2 rounded-full">
              <span className="material-symbols-outlined text-[#5b69e6]">{questionSet.subjectIcon}</span>
            </div>
            <h1 className="font-bold text-base leading-tight tracking-tight">{questionSet.unitTitle}</h1>
          </div>
          <div className="flex items-center gap-3">
            {aiAssistantEnabled && (
              <button 
                onClick={() => {
                  const vinCtx = q?.questionText ? `Help me with this question: ${q.questionText}` : null;
                  openVinPanel(vinCtx);
                }}
                className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-full text-sm font-semibold transition-colors flex items-center gap-2"
              >
                <span className="material-symbols-outlined text-[18px]">smart_toy</span>
                Ask Vin
              </button>
            )}
            <button
              onClick={() => {
                // Explicitly save progress before exiting
                const serializableAnswers = {};
                for (const [k, v] of Object.entries(answers)) {
                  if (v instanceof File) continue;
                  serializableAnswers[k] = v;
                }
                dispatch(saveHomeworkProgress({
                  homework_id: homeworkId,
                  answers: serializableAnswers,
                  active_types: activeType,
                  current_index: currentIdx,
                  skipped: [...skipped],
                }));
                navigate("/student/homework");
              }}
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
                title={`Q${i + 1}${skipped.has(qq.id) ? " (skipped)" : ""}`}
                className={`h-2 rounded-full transition-all duration-300 ${
                  i === currentIdx
                    ? "bg-[#5b69e6] w-6"
                    : skipped.has(qq.id)
                    ? "bg-amber-400 w-2"
                    : answers[qq.id] !== undefined && answers[qq.id] !== null && answers[qq.id] !== ""
                    ? "bg-[#5b69e6]/40 w-2"
                    : "bg-slate-200 w-2"
                }`}
              />
            ))}
          </div>
          {/* Skipped questions legend */}
          {skipped.size > 0 && (
            <div className="flex items-center gap-1.5 pt-1">
              <span className="size-2 rounded-full bg-amber-400 inline-block" />
              <span className="text-xs text-amber-600 font-medium">{skipped.size} question{skipped.size > 1 ? "s" : ""} skipped</span>
            </div>
          )}
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
          homeworkContext={{
            subject: questionSet?.unitTitle || currentHw?.subject || "",
            title: questionSet?.unitTitle || currentHw?.title || "Homework",
            question_text: q?.questionText || "",
            answer_type: currentType || q?.answerType || "",
            hint: q?.hint || "",
            vin_nudge: q?.vinNudge || "",
            sample_answer: q?.sampleAnswer || "",
          }}
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
              {/* Skip button — hidden if already answered */}
              {!canProceed() && !skipped.has(q.id) && (
                <button
                  onClick={handleSkip}
                  className="flex items-center gap-1.5 px-5 py-3 rounded-full font-semibold text-amber-600 bg-amber-50 hover:bg-amber-100 border border-amber-200 transition-all text-sm"
                  type="button"
                >
                  <span className="material-symbols-outlined text-[18px]">redo</span>
                  Skip
                </button>
              )}
              {/* Un-skip if currently on a skipped question */}
              {skipped.has(q.id) && (
                <button
                  onClick={() => setSkipped((prev) => { const s = new Set(prev); s.delete(q.id); return s; })}
                  className="flex items-center gap-1.5 px-5 py-3 rounded-full font-semibold text-amber-600 bg-amber-50 hover:bg-amber-100 border border-amber-200 transition-all text-sm"
                  type="button"
                >
                  <span className="material-symbols-outlined text-[18px]">undo</span>
                  Unskip
                </button>
              )}
              {isTyped && (
                <button className="bg-slate-100 text-slate-700 px-5 py-3 rounded-full font-bold hover:bg-slate-200 transition-all">
                  Retry Similar
                </button>
              )}
              <button
                onClick={handleNext}
                disabled={!canProceed() && !skipped.has(q.id)}
                className="bg-[#5b69e6] hover:bg-[#5b69e6]/90 text-white px-8 py-3 rounded-full font-bold shadow-xl shadow-[#5b69e6]/20 flex items-center gap-2 transition-all active:scale-95 disabled:opacity-40"
              >
                {isLast
                  ? (submitting ? "Submitting..." : skipped.size > 0 ? `Submit (${skipped.size} skipped)` : "Submit All")
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
