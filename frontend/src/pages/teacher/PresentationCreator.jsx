import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useDispatch } from "react-redux";
import { useAuth } from "../../context/AuthContext";
import { getInitial } from "../../utils/nameUtils";
import { clearAiToolResult } from "../../store/slices/teacherSlice";
import { addHistoryItem, persistHistoryItem } from "../../store/slices/aiHistorySlice";
import { nanoid } from "nanoid";
import {
  presentationVisualStyles,
  presentationPurposes,
  presentationDefaults,
  presentationTargetAudiences,
  presentationTones,
  presentationContentDepths,
} from "../../data/teacher/presentationCreatorData";
import { boardOptions, learningObjectiveOptions } from "../../data/teacher/worksheetGeneratorData";
import { downloadPresentationPdf, downloadPresentationPptx } from "../../utils/aiPdfExport";
import api from "../../api";
import mermaid from "mermaid";

// Initialize mermaid once
mermaid.initialize({ startOnLoad: false, theme: "neutral", securityLevel: "loose" });

/** Renders a Mermaid diagram from a definition string */
function MermaidDiagram({ definition }) {
  const ref = useRef(null);
  useEffect(() => {
    if (!ref.current || !definition) return;
    const id = `mermaid-${Math.random().toString(36).slice(2)}`;
    mermaid.render(id, definition).then(({ svg }) => {
      if (ref.current) ref.current.innerHTML = svg;
    }).catch(() => {
      if (ref.current) ref.current.innerHTML = "";
    });
  }, [definition]);
  if (!definition) return null;
  return <div ref={ref} className="w-full overflow-auto" />;
}

export default function PresentationCreator() {
  const navigate  = useNavigate();
  const dispatch  = useDispatch();
  const { user }  = useAuth();

  const [form, setForm]         = useState(presentationDefaults);
  const [jobId, setJobId]       = useState(null);
  const [progress, setProgress] = useState({ state: "IDLE", current: 0, total: 0, status: "" });
  const [aiResult, setAiResult] = useState(null);
  const [downloading, setDownloading] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [history, setHistory] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const pollRef = useRef(null);
  // Stable image cache: slide index → base64 data URL
  // Keyed by index so it survives React re-renders without mutating slide objects
  const imgCacheRef = useRef({});

  const generating = progress.state === "processing";

  // Load history on mount + resume any in-progress job after page reload
  useEffect(() => {
    const loadHistory = async () => {
      try {
        const res = await api.get("/teacher/ai-tool/presentation/history");
        setHistory(res.data.presentations || []);
      } catch (err) {
        console.error("Failed to load presentation history:", err);
      }
    };
    loadHistory();

    // Resume in-progress job if page was reloaded mid-generation
    const savedJobId = localStorage.getItem("pptx_job_id");
    if (savedJobId) {
      // Check if the job is still running before resuming
      api.get(`/teacher/ai-tool/status/${savedJobId}`)
        .then(res => {
          const data = res.data;
          if (data.status === "processing") {
            setJobId(savedJobId);
            setProgress({
              state:   "processing",
              current: data.current_slide ?? 0,
              total:   data.total_slides  ?? 0,
              pct:     data.progress_pct  ?? 0,
            });
            startPolling(savedJobId);
          } else if (data.status === "completed" && data.result_data) {
            // Job finished while page was reloading — show result immediately
            setJobId(savedJobId);
            setAiResult(data);
            prewarmImages(data.slides || []);
            setProgress({ state: "completed", current: data.total_slides, total: data.total_slides, pct: 100 });
            localStorage.removeItem("pptx_job_id");
          } else {
            localStorage.removeItem("pptx_job_id");
          }
        })
        .catch(() => localStorage.removeItem("pptx_job_id"));
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // clean up on unmount
  useEffect(() => () => {
    dispatch(clearAiToolResult());
    if (pollRef.current) clearInterval(pollRef.current);
  }, [dispatch]);

  const stopPolling = () => {
    if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null; }
  };

  // Pre-warm image cache for all slides as soon as result is available.
  // This runs in the background so by the time the user clicks Download,
  // most images are already cached as base64.
  const prewarmImages = (slides) => {
    if (!slides?.length) return;
    const apiBase =
      import.meta.env?.VITE_API_BASE_URL ||
      import.meta.env?.VITE_API_URL ||
      "http://localhost:8001";

    slides.forEach((slide, idx) => {
      if (imgCacheRef.current[idx]) return; // already cached
      const imgUrl = slide.content?.image_url;
      if (!imgUrl) return;
      const proxyUrl = imgUrl.startsWith("/teacher/image-proxy")
        ? `${apiBase}${imgUrl}`
        : `${apiBase}/teacher/image-proxy?url=${encodeURIComponent(imgUrl)}`;
      fetch(proxyUrl, { headers: { Accept: "image/*" } })
        .then(r => r.ok ? r.blob() : null)
        .then(blob => {
          if (!blob || !blob.size) return;
          const reader = new FileReader();
          reader.onloadend = () => {
            if (reader.result) imgCacheRef.current[idx] = reader.result;
          };
          reader.readAsDataURL(blob);
        })
        .catch(() => {});
    });
  };

  const saveToSharedHistory = (result, formData) => {
    const item = {
      id:        nanoid(),
      tool:      "presentation",
      title:     result.title || formData.topic,
      subject:   formData.subject,
      topic:     formData.topic,
      grade:     formData.classLevel,
      result,
      createdAt: new Date().toISOString(),
    };
    dispatch(addHistoryItem(item));
    dispatch(persistHistoryItem(item));
  };

  const startPolling = (id) => {
    stopPolling();
    let errorCount = 0;
    pollRef.current = setInterval(async () => {
      try {
        const res = await api.get(`/teacher/ai-tool/status/${id}`);
        const data = res.data;
        setProgress({
          state:   data.status,
          current: data.current_slide ?? 0,
          total:   data.total_slides  ?? 0,
          pct:     data.progress_pct  ?? 0,
        });
        if (data.status === "completed") {
          stopPolling();
          setAiResult(data);
          prewarmImages(data.slides || []);
          localStorage.removeItem("pptx_job_id");
          saveToSharedHistory(data, form);
        } else if (data.status === "failed") {
          stopPolling();
          setProgress(p => ({ ...p, state: "failed" }));
          localStorage.removeItem("pptx_job_id");
        }
        errorCount = 0; // reset on success
      } catch (err) {
        errorCount++;
        // 404 = job not found (server restarted), or network error — stop after 2 consecutive failures
        if (errorCount >= 2) {
          stopPolling();
          setProgress({ state: "failed", current: 0, total: 0, pct: 0 });
          localStorage.removeItem("pptx_job_id");
        }
      }
    }, 2000);
  };

  const handleGenerate = async () => {
    if (!form.topic.trim() || !form.subject.trim()) {
      alert("Please enter a Topic and Subject before generating.");
      return;
    }
    setAiResult(null);
    imgCacheRef.current = {}; // clear image cache for new generation
    setProgress({ state: "processing", current: 0, total: form.numSlides, pct: 0 });
    try {
      const res = await api.post("/teacher/ai-tool/presentation/generate", {
        tool: "presentation",
        subject: form.subject,
        topic: form.topic,
        grade: form.classLevel,
        extra: {
          num_slides:           form.numSlides,
          duration_minutes:     form.durationMinutes,
          purpose:              form.purpose,
          visual_style:         form.visualStyle,
          board:                form.board,
          chapter:              form.chapter,
          learning_objective:   form.learningObjective,
          special_instructions: form.specialInstructions,
          target_audience:      form.targetAudience,
          tone:                 form.tone,
          content_depth:        form.contentDepth,
          include_mini_quiz:    form.includeMiniQuiz,
        },
      });
      const newJobId = res.data.job_id;
      setJobId(newJobId);
      // Persist so a page reload can resume polling
      localStorage.setItem("pptx_job_id", newJobId);
      startPolling(newJobId);
    } catch (err) {
      setProgress({ state: "failed", current: 0, total: 0, pct: 0 });
    }
  };

  const handleSaveToHistory = async () => {
    if (!aiResult) return;
    try {
      await api.post("/teacher/ai-tool/presentation/save-history", {
        ...aiResult,
        subject: form.subject,
        topic: form.topic,
        grade: form.classLevel,
        board: form.board,
        chapter: form.chapter,
        purpose: form.purpose,
        visual_style: form.visualStyle,
        tone: form.tone,
        content_depth: form.contentDepth,
        target_audience: form.targetAudience,
        learning_objective: form.learningObjective,
        include_mini_quiz: form.includeMiniQuiz,
        special_instructions: form.specialInstructions,
      });
      // Reload history
      const res = await api.get("/teacher/ai-tool/presentation/history");
      setHistory(res.data.presentations || []);
      alert("Presentation saved to history!");
    } catch (err) {
      console.error("Failed to save presentation:", err);
      alert("Failed to save presentation");
    }
  };

  const handleLoadFromHistory = async (presentationId) => {
    try {
      const res = await api.get(`/teacher/ai-tool/presentation/${presentationId}`);
      setAiResult(res.data);
      setShowHistory(false);
    } catch (err) {
      console.error("Failed to load presentation:", err);
      alert("Failed to load presentation");
    }
  };

  return (
    <div className="bg-[#fdf8ff] min-h-screen" style={{ fontFamily: "'Lexend', sans-serif" }}>

      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-white border-b border-gray-200">
        <div className="max-w-[1200px] mx-auto px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate("/teacher/ai-assistant")}
              className="flex items-center gap-1.5 border border-gray-200 text-sm font-semibold px-3 py-1.5 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <span className="material-symbols-outlined text-base">arrow_back</span> Choose Different Tool
            </button>
            <div className="text-xs text-gray-400">
              <span className="hover:underline cursor-pointer" onClick={() => navigate("/teacher/ai-assistant")}>AI Assistant</span>
              <span className="mx-1">›</span>
              <span className="font-semibold text-gray-700">Presentation Creator</span>
            </div>
          </div>
          <h1 className="font-black text-base absolute left-1/2 -translate-x-1/2">Presentation Creator</h1>
          <div className="flex items-center gap-3">
            <button 
              onClick={() => setShowHistory(!showHistory)}
              className="flex items-center gap-1.5 border border-gray-200 text-gray-700 text-xs font-bold px-3 py-1.5 rounded-lg hover:bg-gray-50">
              <span className="material-symbols-outlined text-sm">history</span> History
            </button>
            <button className="flex items-center gap-1.5 border border-[#695be6] text-[#695be6] text-xs font-bold px-3 py-1.5 rounded-lg hover:bg-[#695be6]/5">
              <span className="material-symbols-outlined text-sm">bolt</span> Pro Plan
            </button>
            <div className="size-9 rounded-full bg-[#695be6] flex items-center justify-center text-white font-bold text-sm">{getInitial(user?.name) || "T"}</div>
          </div>
        </div>
      </header>

      <div className="max-w-[1200px] mx-auto pt-20 flex min-h-screen">

        {/* History Modal */}
        {showHistory && (
          <div className="fixed inset-0 z-40 bg-black/40 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[80vh] overflow-y-auto">
              <div className="sticky top-0 bg-gradient-to-r from-[#695be6] to-[#8b5cf6] p-6 flex items-center justify-between">
                <h2 className="font-black text-lg text-white">Presentation History</h2>
                <button onClick={() => setShowHistory(false)} className="text-white hover:bg-white/20 p-2 rounded-lg">
                  <span className="material-symbols-outlined">close</span>
                </button>
              </div>
              <div className="p-6">
                {history.length === 0 ? (
                  <p className="text-center text-gray-500 py-8">No presentations saved yet</p>
                ) : (
                  <div className="space-y-3">
                    {history.map((pres) => (
                      <div key={pres._id} className="border border-gray-200 rounded-lg p-4 hover:border-[#695be6] transition-colors">
                        <div className="flex items-start justify-between mb-2">
                          <div>
                            <h3 className="font-bold text-gray-800">{pres.title || pres.topic}</h3>
                            <p className="text-xs text-gray-500">{pres.subject} • {pres.grade} • {pres.total_slides} slides</p>
                          </div>
                          <span className="text-xs text-gray-400">{new Date(pres.created_at).toLocaleDateString()}</span>
                        </div>
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleLoadFromHistory(pres._id)}
                            className="flex-1 bg-[#695be6] text-white text-xs font-bold py-2 rounded-lg hover:bg-[#5a4dd4]"
                          >
                            Load
                          </button>
                          <button
                            onClick={async () => {
                              if (confirm("Delete this presentation?")) {
                                try {
                                  await api.delete(`/teacher/ai-tool/presentation/${pres._id}`);
                                  const res = await api.get("/teacher/ai-tool/presentation/history");
                                  setHistory(res.data.presentations || []);
                                } catch (err) {
                                  console.error("Failed to delete:", err);
                                }
                              }
                            }}
                            className="px-4 bg-red-50 text-red-600 text-xs font-bold py-2 rounded-lg hover:bg-red-100"
                          >
                            Delete
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Left: Config Panel */}
        <div className="w-[440px] flex-shrink-0 border-r border-gray-200 bg-white p-6 overflow-y-auto">

          {/* Presentation Basics */}
          <div className="mb-6">
            <h2 className="flex items-center gap-2 font-black text-base mb-4">
              <span className="size-6 bg-blue-100 rounded-full flex items-center justify-center">
                <span className="material-symbols-outlined text-blue-600 text-sm">info</span>
              </span>
              Presentation Basics
            </h2>
            <div className="mb-3">
              <label className="text-xs font-bold text-gray-500 mb-1 block">Topic <span className="text-red-400">*</span></label>
              <input
                value={form.topic}
                onChange={(e) => setForm({ ...form, topic: e.target.value })}
                placeholder="e.g. Photosynthesis, Quadratic Equations, World War II"
                className={`w-full border rounded-xl px-4 py-2.5 text-sm outline-none focus:border-[#695be6] ${!form.topic.trim() ? "border-red-200 bg-red-50/30" : "border-gray-200"}`}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-bold text-gray-500 mb-1 block">Subject <span className="text-red-400">*</span></label>
                <input
                  value={form.subject}
                  onChange={(e) => setForm({ ...form, subject: e.target.value })}
                  placeholder="e.g. Biology, Math"
                  className={`w-full border rounded-xl px-4 py-2.5 text-sm outline-none focus:border-[#695be6] ${!form.subject.trim() ? "border-red-200 bg-red-50/30" : "border-gray-200"}`}
                />
              </div>
              <div>
                <label className="text-xs font-bold text-gray-500 mb-1 block">Class</label>
                <input
                  value={form.classLevel}
                  onChange={(e) => setForm({ ...form, classLevel: e.target.value })}
                  placeholder="e.g. Grade 8"
                  className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-[#695be6]"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3 mt-3">
              <div>
                <label className="text-xs font-bold text-gray-500 mb-1 block">Board</label>
                <select value={form.board} onChange={(e) => setForm({ ...form, board: e.target.value })}
                  className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-[#695be6] bg-white">
                  {boardOptions.map((b) => <option key={b}>{b}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs font-bold text-gray-500 mb-1 block">Chapter (optional)</label>
                <input value={form.chapter} onChange={(e) => setForm({ ...form, chapter: e.target.value })}
                  placeholder="e.g. Chapter 2"
                  className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-[#695be6]" />
              </div>
            </div>
          </div>

          {/* Learning Objective */}
          <div className="mb-6">
            <h2 className="flex items-center gap-2 font-black text-base mb-4">
              <span className="size-6 bg-green-100 rounded-full flex items-center justify-center">
                <span className="material-symbols-outlined text-green-600 text-sm">target</span>
              </span>
              Learning Objective
            </h2>
            <div className="grid grid-cols-2 gap-2">
              {learningObjectiveOptions.map((lo) => (
                <button key={lo.id} onClick={() => setForm({ ...form, learningObjective: lo.id })}
                  className={`text-left px-3 py-2.5 rounded-xl border-2 transition-all ${
                    form.learningObjective === lo.id
                      ? "border-[#695be6] bg-[#695be6]/5"
                      : "border-gray-200 hover:border-gray-300"
                  }`}>
                  <p className={`text-xs font-bold ${form.learningObjective === lo.id ? "text-[#695be6]" : "text-gray-700"}`}>{lo.label}</p>
                  <p className="text-[10px] text-gray-400 mt-0.5">{lo.desc}</p>
                </button>
              ))}
            </div>
          </div>

          {/* Structure & Scope */}
          <div className="mb-6">
            <h2 className="flex items-center gap-2 font-black text-base mb-4">
              <span className="size-6 bg-purple-100 rounded-full flex items-center justify-center">
                <span className="material-symbols-outlined text-purple-600 text-sm">layers</span>
              </span>
              Structure & Scope
            </h2>
            <div className="mb-4">
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-bold text-gray-500">Number of Slides</label>
                <span className="text-xs font-bold text-[#695be6]">{form.numSlides} slides</span>
              </div>
              <input
                type="range" min={5} max={30} value={form.numSlides}
                onChange={(e) => setForm({ ...form, numSlides: +e.target.value })}
                className="w-full accent-[#695be6]"
              />
            </div>
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-bold text-gray-500">Presentation Duration</label>
                <span className="text-xs font-bold text-[#695be6]">{form.durationMinutes} min</span>
              </div>
              <input
                type="range" min={10} max={90} step={5} value={form.durationMinutes}
                onChange={(e) => setForm({ ...form, durationMinutes: +e.target.value })}
                className="w-full accent-[#695be6]"
              />
            </div>
          </div>

          {/* Presentation Purpose */}
          <div className="mb-6">
            <h2 className="flex items-center gap-2 font-black text-base mb-4">
              <span className="size-6 bg-orange-100 rounded-full flex items-center justify-center">
                <span className="material-symbols-outlined text-orange-600 text-sm">target</span>
              </span>
              Presentation Purpose
            </h2>
            <div className="flex flex-wrap gap-2">
              {presentationPurposes.map((p) => (
                <button
                  key={p.id}
                  onClick={() => setForm({ ...form, purpose: p.id })}
                  className={`flex items-center gap-2 px-4 py-2 rounded-xl border-2 text-sm font-semibold transition-all ${
                    form.purpose === p.id
                      ? "border-[#695be6] bg-[#695be6]/5 text-[#695be6]"
                      : "border-gray-200 hover:border-gray-300"
                  }`}
                >
                  <div className={`size-4 rounded-full border-2 flex items-center justify-center ${
                    form.purpose === p.id ? "border-[#695be6]" : "border-gray-300"
                  }`}>
                    {form.purpose === p.id && <div className="size-2 rounded-full bg-[#695be6]" />}
                  </div>
                  {p.label}
                </button>
              ))}
            </div>
          </div>

          {/* Visual Style */}
          <div className="mb-8">
            <h2 className="flex items-center gap-2 font-black text-base mb-4">
              <span className="size-6 bg-pink-100 rounded-full flex items-center justify-center">
                <span className="material-symbols-outlined text-pink-600 text-sm">palette</span>
              </span>
              Visual Style
            </h2>
            <div className="grid grid-cols-3 gap-3">
              {presentationVisualStyles.map((style) => (
                <button
                  key={style.id}
                  onClick={() => setForm({ ...form, visualStyle: style.id })}
                  className={`rounded-xl border-2 overflow-hidden transition-all ${
                    form.visualStyle === style.id ? "border-[#695be6]" : "border-gray-200 hover:border-gray-300"
                  }`}
                >
                  <div className={`h-16 ${style.preview.bg} flex items-center justify-center p-2`}>
                    {style.preview.dots ? (
                      <div className="flex gap-1">
                        {style.preview.dots.map((c, i) => (
                          <div key={i} className={`size-3 rounded-full ${c}`} />
                        ))}
                      </div>
                    ) : (
                      <div className="w-full space-y-1">
                        <div className={`h-1.5 rounded ${style.preview.accent} w-3/4`} />
                        {style.preview.lines?.map((c, i) => (
                          <div key={i} className={`h-1 rounded ${c} w-full`} />
                        ))}
                      </div>
                    )}
                  </div>
                  <p className="text-[10px] font-bold text-center py-1.5 text-gray-600">{style.label}</p>
                </button>
              ))}
            </div>
          </div>

          {/* Target Audience */}
          <div className="mb-6">
            <h2 className="flex items-center gap-2 font-black text-base mb-4">
              <span className="size-6 bg-teal-100 rounded-full flex items-center justify-center">
                <span className="material-symbols-outlined text-teal-600 text-sm">group</span>
              </span>
              Target Audience
            </h2>
            <div className="flex gap-2">
              {presentationTargetAudiences.map((a) => (
                <button key={a.id} onClick={() => setForm({ ...form, targetAudience: a.id })}
                  className={`flex-1 py-2 rounded-xl border-2 text-xs font-bold transition-all ${
                    form.targetAudience === a.id
                      ? "border-[#695be6] bg-[#695be6]/5 text-[#695be6]"
                      : "border-gray-200 hover:border-gray-300 text-gray-600"
                  }`}>
                  {a.label}
                </button>
              ))}
            </div>
          </div>

          {/* Tone */}
          <div className="mb-6">
            <h2 className="flex items-center gap-2 font-black text-base mb-4">
              <span className="size-6 bg-indigo-100 rounded-full flex items-center justify-center">
                <span className="material-symbols-outlined text-indigo-600 text-sm">record_voice_over</span>
              </span>
              Tone
            </h2>
            <div className="grid grid-cols-3 gap-2">
              {presentationTones.map((t) => (
                <button key={t.id} onClick={() => setForm({ ...form, tone: t.id })}
                  className={`text-left px-3 py-2.5 rounded-xl border-2 transition-all ${
                    form.tone === t.id ? "border-[#695be6] bg-[#695be6]/5" : "border-gray-200 hover:border-gray-300"
                  }`}>
                  <p className={`text-xs font-bold ${form.tone === t.id ? "text-[#695be6]" : "text-gray-700"}`}>{t.label}</p>
                  <p className="text-[10px] text-gray-400 mt-0.5 leading-tight">{t.desc}</p>
                </button>
              ))}
            </div>
          </div>

          {/* Content Depth */}
          <div className="mb-6">
            <h2 className="flex items-center gap-2 font-black text-base mb-4">
              <span className="size-6 bg-cyan-100 rounded-full flex items-center justify-center">
                <span className="material-symbols-outlined text-cyan-600 text-sm">tune</span>
              </span>
              Content Depth
            </h2>
            <div className="grid grid-cols-2 gap-2">
              {presentationContentDepths.map((d) => (
                <button key={d.id} onClick={() => setForm({ ...form, contentDepth: d.id })}
                  className={`text-left px-3 py-2.5 rounded-xl border-2 transition-all ${
                    form.contentDepth === d.id ? "border-[#695be6] bg-[#695be6]/5" : "border-gray-200 hover:border-gray-300"
                  }`}>
                  <p className={`text-xs font-bold ${form.contentDepth === d.id ? "text-[#695be6]" : "text-gray-700"}`}>{d.label}</p>
                  <p className="text-[10px] text-gray-400 mt-0.5">{d.desc}</p>
                </button>
              ))}
            </div>
          </div>

          {/* Mini Quiz */}
          <div className="mb-6">
            <button
              onClick={() => setForm({ ...form, includeMiniQuiz: !form.includeMiniQuiz })}
              className={`w-full flex items-center justify-between px-4 py-3 rounded-xl border-2 transition-all ${
                form.includeMiniQuiz ? "border-[#695be6] bg-[#695be6]/5" : "border-gray-200 hover:border-gray-300"
              }`}>
              <div className="flex items-center gap-3">
                <span className="material-symbols-outlined text-[#695be6] text-base">quiz</span>
                <div className="text-left">
                  <p className={`text-xs font-bold ${form.includeMiniQuiz ? "text-[#695be6]" : "text-gray-700"}`}>Include Mini Quiz</p>
                  <p className="text-[10px] text-gray-400">Add MCQ assessment slides at the end</p>
                </div>
              </div>
              <div className={`size-5 rounded border-2 flex items-center justify-center transition-all ${
                form.includeMiniQuiz ? "bg-[#695be6] border-[#695be6]" : "border-gray-300"
              }`}>
                {form.includeMiniQuiz && <span className="material-symbols-outlined text-white text-xs">check</span>}
              </div>
            </button>
          </div>

          {/* Special Instructions */}
          <div className="mb-6">
            <h2 className="flex items-center gap-2 font-black text-base mb-4">
              <span className="size-6 bg-amber-100 rounded-full flex items-center justify-center">
                <span className="material-symbols-outlined text-amber-600 text-sm">edit_note</span>
              </span>
              Special Instructions
            </h2>
            <textarea value={form.specialInstructions} onChange={(e) => setForm({ ...form, specialInstructions: e.target.value })}
              rows={3} placeholder="e.g. Include real-life examples, add activity slides, align to NCERT Chapter 3..."
              className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-[#695be6] resize-none" />
          </div>

          {/* Generate Button */}
          <button
            onClick={handleGenerate}
            disabled={generating || !form.topic.trim() || !form.subject.trim()}
            className="w-full bg-[#695be6] text-white font-black py-4 rounded-xl hover:bg-[#5a4dd4] transition-colors flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
          >
            {generating ? (
              <><span className="material-symbols-outlined animate-spin text-base">refresh</span> Generating...</>
            ) : (
              <><span className="material-symbols-outlined text-base">auto_awesome</span> Generate Presentation</>
            )}
          </button>
          <p className="text-center text-xs text-gray-400 mt-2">Estimated time: ~45 seconds</p>
        </div>

        {/* Right: Preview Panel */}
        <div className="flex-1 bg-[#fdf8ff] flex items-center justify-center p-12">
          {/* ── PROGRESS STATE ── */}
          {generating && (
            <div className="bg-white rounded-2xl shadow-lg border border-gray-100 w-full max-w-lg p-10 flex flex-col items-center text-center">
              <div className="size-14 bg-[#695be6]/10 rounded-2xl flex items-center justify-center mb-5">
                <span className="material-symbols-outlined text-[#695be6] text-3xl animate-spin">refresh</span>
              </div>
              <h2 className="font-black text-lg mb-1">Building your presentation…</h2>
              <p className="text-xs text-gray-400 mb-6">
                {progress.total > 0
                  ? `Generating Slide ${progress.current} of ${progress.total}…`
                  : "Starting up…"}
              </p>
              {/* progress bar */}
              <div className="w-full bg-gray-100 rounded-full h-3 mb-2 overflow-hidden">
                <div
                  className="h-3 rounded-full bg-[#695be6] transition-all duration-500"
                  style={{ width: `${progress.pct || (progress.total > 0 ? Math.round((progress.current / progress.total) * 100) : 3)}%` }}
                />
              </div>
              <p className="text-xs font-bold text-[#695be6]">
                {progress.total > 0
                  ? `Slide ${progress.current} of ${progress.total} completed`
                  : "Initialising…"}
              </p>
            </div>
          )}

          {/* ── IDLE / EMPTY STATE ── */}
          {!generating && !aiResult && progress.state !== "failed" && (
            <div className="bg-white rounded-2xl shadow-lg border border-gray-100 w-full max-w-lg p-10 flex flex-col items-center text-center">
              <div className="size-16 bg-[#695be6] rounded-2xl flex items-center justify-center mb-4">
                <span className="material-symbols-outlined text-white text-3xl">upload</span>
              </div>
              <h2 className="font-black text-xl mb-2">Ready to build your lesson?</h2>
              <p className="text-sm text-gray-400 mb-6">
                Your presentation will be generated slide-by-slide in the background. You'll get a live progress bar and a .pptx download when done.
              </p>
              <div className="flex gap-2 w-full justify-center">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="flex-1 h-16 bg-gray-100 rounded-lg" />
                ))}
              </div>
              <p className="text-xs text-gray-400 mt-3">SLIDE 0 OF 0</p>
            </div>
          )}

          {/* ── ERROR STATE ── */}
          {!generating && progress.state === "failed" && (
            <div className="bg-white rounded-2xl shadow-lg border border-red-100 w-full max-w-lg p-10 flex flex-col items-center text-center">
              <span className="material-symbols-outlined text-red-400 text-4xl mb-3">error</span>
              <h2 className="font-black text-lg mb-2 text-red-600">Generation failed</h2>
              <p className="text-xs text-gray-500">Something went wrong. Please try again.</p>
              <button onClick={() => setProgress({ state: "IDLE", current: 0, total: 0, pct: 0 })}
                className="mt-4 text-xs font-bold text-[#695be6] underline">Try again</button>
            </div>
          )}

          {/* ── RESULT STATE ── */}
          {!generating && aiResult && (
            <div className="bg-white rounded-2xl shadow-lg border border-gray-100 w-full max-w-2xl overflow-y-auto max-h-[85vh]">
              <div className="p-4 border-b border-gray-100 flex items-center justify-between bg-gradient-to-r from-[#695be6] to-[#8b5cf6] rounded-t-2xl">
                <div>
                  <h2 className="font-black text-base text-white">{aiResult.title || form.topic}</h2>
                  <p className="text-xs text-white/70">{aiResult.total_slides || (aiResult.slides||[]).length} slides · {aiResult.duration_minutes} min · {aiResult.grade}</p>
                </div>
                <div className="flex gap-2">
                  <button 
                    onClick={handleSaveToHistory}
                    className="flex items-center gap-1 bg-white/20 hover:bg-white/30 text-white text-xs font-bold px-3 py-1.5 rounded-lg">
                    <span className="material-symbols-outlined text-sm">save</span> Save
                  </button>
                  {aiResult.download_url && (
                    <a href={aiResult.download_url} target="_blank" rel="noreferrer"
                      className="flex items-center gap-1 bg-white/20 hover:bg-white/30 text-white text-xs font-bold px-3 py-1.5 rounded-lg">
                      <span className="material-symbols-outlined text-sm">download</span> .pptx (server)
                    </a>
                  )}
                  <button onClick={async () => {
                    setDownloading(true);
                    try {
                      // Inject cached images into slides before export
                      const resultWithCache = {
                        ...aiResult,
                        slides: (aiResult.slides || []).map((slide, idx) => ({
                          ...slide,
                          content: {
                            ...(slide.content || {}),
                            _fetched_image: imgCacheRef.current[idx] || slide.content?._fetched_image,
                          },
                        })),
                      };
                      await downloadPresentationPptx(resultWithCache);
                    } finally {
                      setDownloading(false);
                    }
                  }}
                    disabled={downloading}
                    className="flex items-center gap-1 bg-white/20 hover:bg-white/30 text-white text-xs font-bold px-3 py-1.5 rounded-lg disabled:opacity-50">
                    {downloading ? (
                      <><span className="material-symbols-outlined text-sm animate-spin">refresh</span> Preparing...</>
                    ) : (
                      <><span className="material-symbols-outlined text-sm">slideshow</span> Download PPTX</>
                    )}
                  </button>
                  <button onClick={async () => { 
                    setDownloading(true);
                    try {
                      const resultWithCache = {
                        ...aiResult,
                        slides: (aiResult.slides || []).map((slide, idx) => ({
                          ...slide,
                          content: {
                            ...(slide.content || {}),
                            _fetched_image: imgCacheRef.current[idx] || slide.content?._fetched_image,
                          },
                        })),
                      };
                      await downloadPresentationPdf(resultWithCache);
                    } finally {
                      setDownloading(false);
                    }
                  }}
                    disabled={downloading}
                    className="flex items-center gap-1 bg-white/20 hover:bg-white/30 text-white text-xs font-bold px-3 py-1.5 rounded-lg disabled:opacity-50">
                    {downloading ? (
                      <><span className="material-symbols-outlined text-sm animate-spin">refresh</span> Preparing...</>
                    ) : (
                      <><span className="material-symbols-outlined text-sm">picture_as_pdf</span> Download PDF</>
                    )}
                  </button>
                </div>
              </div>

              {/* Learning Objectives */}
              {aiResult.learning_objectives?.length > 0 && (
                <div className="px-5 pt-4 pb-2">
                  <p className="text-xs font-black text-gray-400 uppercase tracking-wide mb-2">Learning Objectives</p>
                  <div className="space-y-1">
                    {aiResult.learning_objectives.map((o,i)=>(
                      <p key={i} className="text-xs text-gray-700 flex items-start gap-2">
                        <span className="material-symbols-outlined text-[#695be6] text-sm mt-0.5">check_circle</span>{o}
                      </p>
                    ))}
                  </div>
                </div>
              )}

              <div className="p-5 space-y-3">
                {(aiResult.slides || []).map((slide, i) => (
                  <div key={i} className="border border-gray-200 rounded-xl overflow-hidden shadow-sm">
                    {/* Slide header */}
                    <div className="flex items-center gap-2 px-4 py-3 border-b border-gray-100"
                      style={{ background: `${slide.vibrant_accent_color || "#695be6"}12` }}>
                      <span className="size-7 rounded-full flex items-center justify-center text-white text-xs font-black flex-shrink-0"
                        style={{ background: slide.vibrant_accent_color || "#695be6" }}>
                        {slide.number || i + 1}
                      </span>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        slide.type === "title" ? "bg-purple-100 text-purple-700" :
                        slide.type === "hook" ? "bg-orange-100 text-orange-700" :
                        slide.type === "activity" ? "bg-green-100 text-green-700" :
                        slide.type === "assessment" ? "bg-red-100 text-red-700" :
                        "bg-blue-100 text-blue-700"
                      }`}>{(slide.type || "content").toUpperCase()}</span>
                      <div className="flex-1 min-w-0">
                        <p className="font-black text-sm text-gray-800 leading-tight">{slide.title}</p>
                        {slide.subtitle && <p className="text-xs text-gray-500 italic mt-0.5">{slide.subtitle}</p>}
                      </div>
                      {slide.duration_minutes && (
                        <span className="text-[10px] text-gray-400 flex-shrink-0">{slide.duration_minutes}m</span>
                      )}
                      {slide.vibrant_accent_color && (
                        <span className="size-3 rounded-full flex-shrink-0" style={{ backgroundColor: slide.vibrant_accent_color }} />
                      )}
                    </div>

                    {/* Two-column body: content left, image right */}
                    <div className="flex gap-0">
                      {/* Left: content */}
                      <div className="flex-1 p-4 space-y-3 min-w-0">
                        {/* Bullets */}
                        {(slide.content?.bullets || slide.bullets || []).length > 0 && (
                          <ul className="space-y-2">
                            {(slide.content?.bullets || slide.bullets).map((b, j) => (
                              <li key={j} className="text-sm text-gray-700 flex items-start gap-2 leading-snug">
                                <span className="size-2 rounded-full mt-1.5 shrink-0"
                                  style={{ background: slide.vibrant_accent_color || "#695be6" }} />
                                {b}
                              </li>
                            ))}
                          </ul>
                        )}

                        {/* Steps */}
                        {(slide.content?.steps || slide.steps || []).length > 0 && (
                          <ol className="space-y-1.5">
                            {(slide.content?.steps || slide.steps).map((s, j) => (
                              <li key={j} className="text-sm text-gray-700 flex items-start gap-2">
                                <span className="font-black text-xs flex-shrink-0 size-5 rounded-full flex items-center justify-center text-white mt-0.5"
                                  style={{ background: slide.vibrant_accent_color || "#695be6" }}>{j + 1}</span>
                                {s}
                              </li>
                            ))}
                          </ol>
                        )}

                        {/* Formula */}
                        {slide.content?.formula && (
                          <div className="rounded-lg px-4 py-2.5 border font-mono text-sm font-bold text-center"
                            style={{
                              background: `${slide.vibrant_accent_color || "#695be6"}10`,
                              borderColor: `${slide.vibrant_accent_color || "#695be6"}40`,
                              color: slide.vibrant_accent_color || "#695be6"
                            }}>
                            {slide.content.formula}
                          </div>
                        )}

                        {/* Explanation paragraph */}
                        {slide.content?.explanation && (
                          <div className="rounded-lg px-3 py-2.5 bg-blue-50 border border-blue-100">
                            <p className="text-[10px] font-black text-blue-600 uppercase tracking-wide mb-1">Explanation</p>
                            <p className="text-xs text-gray-700 leading-relaxed">{slide.content.explanation}</p>
                          </div>
                        )}

                        {/* Key terms */}
                        {(slide.content?.key_terms || []).length > 0 && (
                          <div className="space-y-1">
                            <p className="text-[10px] font-black text-gray-400 uppercase tracking-wide">Key Terms</p>
                            {slide.content.key_terms.map((kt, j) => (
                              <div key={j} className="flex gap-1.5 text-xs">
                                <span className="font-bold text-gray-800 shrink-0">{kt.term}:</span>
                                <span className="text-gray-600">{kt.definition}</span>
                              </div>
                            ))}
                          </div>
                        )}

                        {/* MCQ questions */}
                        {(slide.content?.questions || slide.questions || []).length > 0 && (
                          <div className="space-y-3">
                            {(slide.content?.questions || slide.questions).map((q, j) => (
                              <div key={j} className="bg-gray-50 rounded-lg p-3">
                                <p className="text-xs font-semibold text-gray-800 mb-1.5">{j + 1}. {q.question || q}</p>
                                {q.options && (
                                  <ul className="space-y-1">
                                    {q.options.map((opt, k) => (
                                      <li key={k} className={`text-xs px-2 py-1 rounded ${opt.startsWith(q.correct) ? "bg-green-100 text-green-800 font-semibold" : "text-gray-600"}`}>{opt}</li>
                                    ))}
                                  </ul>
                                )}
                              </div>
                            ))}
                          </div>
                        )}

                        {/* Mermaid diagram */}
                        {slide.content?.diagram?.mermaid && slide.content.diagram.type !== "none" && (
                          <div className="bg-gray-50 border border-gray-200 rounded-lg p-2">
                            <p className="text-[10px] font-bold text-gray-500 mb-1 uppercase">{slide.content.diagram.type} Diagram</p>
                            <MermaidDiagram definition={slide.content.diagram.mermaid} />
                          </div>
                        )}

                        {/* Speaker notes */}
                        {slide.speaker_notes && (
                          <div className="bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                            <p className="text-[10px] font-black text-amber-700 mb-1">Speaker Notes</p>
                            <p className="text-xs text-gray-700 leading-relaxed">{slide.speaker_notes}</p>
                          </div>
                        )}

                        {/* Engagement prompt */}
                        {slide.engagement_prompt && (
                          <div className="bg-green-50 border border-green-200 rounded-lg px-3 py-2">
                            <p className="text-[10px] font-black text-green-700 mb-1">Engagement Prompt</p>
                            <p className="text-xs text-gray-700">{slide.engagement_prompt}</p>
                          </div>
                        )}
                      </div>

                      {/* Right: image */}
                      {(slide.content?.image_url || slide.content?.detailed_visual_description || slide.content?.visual_prompt) && (
                        <div className="w-56 flex-shrink-0 border-l border-gray-100 p-3 flex flex-col gap-2">
                          {slide.content?.image_url ? (
                            <div className="rounded-lg overflow-hidden border border-purple-200 bg-purple-50 relative flex items-center justify-center" style={{ minHeight: "160px" }}>
                              <img
                                src={(() => {
                                  const url = slide.content.image_url;
                                  if (url.startsWith("/teacher/image-proxy")) {
                                    const apiBase =
                                      import.meta.env?.VITE_API_BASE_URL ||
                                      import.meta.env?.VITE_API_URL ||
                                      "http://localhost:8001";
                                    return `${apiBase}${url}`;
                                  }
                                  return url;
                                })()}
                                alt={slide.content.image_alt || slide.title}
                                className="w-full h-auto max-h-48 object-contain"
                                loading="lazy"
                                onLoad={(e) => {
                                  if (slide.content && !slide.content._fetched_image) {
                                    const apiBase =
                                      import.meta.env?.VITE_API_BASE_URL ||
                                      import.meta.env?.VITE_API_URL ||
                                      "http://localhost:8001";
                                    const imgUrl = slide.content.image_url || "";
                                    const proxyUrl = imgUrl.startsWith("/teacher/image-proxy")
                                      ? `${apiBase}${imgUrl}`
                                      : `${apiBase}/teacher/image-proxy?url=${encodeURIComponent(imgUrl)}`;
                                    fetch(proxyUrl, { headers: { Accept: "image/*" } })
                                      .then(r => r.ok ? r.blob() : null)
                                      .then(blob => {
                                        if (!blob) return;
                                        const reader = new FileReader();
                                        reader.onloadend = () => {
                                          if (slide.content) slide.content._fetched_image = reader.result;
                                        };
                                        reader.readAsDataURL(blob);
                                      })
                                      .catch(() => {});
                                  }
                                }}
                                onError={(e) => {
                                  if (!e.target.dataset.retried) {
                                    e.target.dataset.retried = "1";
                                    const src = e.target.src;
                                    setTimeout(() => { e.target.src = src + "&t=" + Date.now(); }, 5000);
                                  } else {
                                    e.target.style.display = "none";
                                    const parent = e.target.parentNode;
                                    if (!parent.querySelector(".img-fallback")) {
                                      const placeholder = document.createElement("div");
                                      placeholder.className = "img-fallback h-32 flex items-center justify-center bg-purple-50 w-full";
                                      placeholder.innerHTML = `<span class="text-purple-300 text-xs">Image unavailable</span>`;
                                      parent.appendChild(placeholder);
                                    }
                                  }
                                }}
                              />
                              {slide.content.image_source_url && (
                                <a href={slide.content.image_source_url} target="_blank" rel="noreferrer"
                                  className="absolute bottom-0 right-0 bg-black/50 text-white text-[9px] px-1.5 py-0.5 rounded-tl hover:bg-black/70 transition-colors">
                                  🔍 Source
                                </a>
                              )}
                            </div>
                          ) : (
                            <div className="bg-purple-50 border border-purple-200 rounded-lg px-3 py-2 flex-1">
                              <p className="text-[10px] font-bold text-purple-700 mb-1">Visual Prompt</p>
                              <p className="text-xs text-gray-600 italic leading-relaxed">
                                {slide.content.detailed_visual_description || slide.content.visual_prompt}
                              </p>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
                {aiResult.teacher_preparation_notes && (
                  <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
                    <p className="text-xs font-bold text-blue-800 mb-1">Teacher Preparation Notes</p>
                    <p className="text-xs text-gray-700">{aiResult.teacher_preparation_notes}</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ── DOWNLOADING OVERLAY ── */}
          {downloading && (
            <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center">
              <div className="bg-white rounded-2xl shadow-2xl p-8 flex flex-col items-center gap-4 max-w-sm w-full mx-4">
                <div className="size-14 bg-[#695be6]/10 rounded-2xl flex items-center justify-center">
                  <span className="material-symbols-outlined text-[#695be6] text-3xl animate-spin">refresh</span>
                </div>
                <h3 className="font-black text-base text-gray-800">Preparing your download</h3>
                <p className="text-xs text-gray-500 text-center">
                  Fetching AI-generated images for every slide.<br/>
                  This may take up to 2 minutes — please don't close this tab.
                </p>
                <div className="w-full bg-gray-100 rounded-full h-2 overflow-hidden">
                  <div className="h-2 rounded-full bg-[#695be6] animate-pulse w-3/4" />
                </div>
                <p className="text-[10px] text-gray-400">Images are generated on-demand by Pollinations.ai</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
