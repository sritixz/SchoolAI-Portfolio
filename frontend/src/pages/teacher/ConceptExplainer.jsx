import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { useAuth } from "../../context/AuthContext";
import { getInitial } from "../../utils/nameUtils";
import { selectAiToolResult, selectAiToolStatus, clearAiToolResult } from "../../store/slices/teacherSlice";
import { selectAiHistory, removeHistoryItem, fetchHistory } from "../../store/slices/aiHistorySlice";
import {
  conceptExplainerDefaults,
  gradeOptions,
  boardOptions,
  explanationStyles,
  levelOptions,
  includeElementOptions,
} from "../../data/teacher/conceptExplainerData";
import { useAiToolWithHistory } from "../../hooks/useAiToolWithHistory";
import { downloadConceptPdf } from "../../utils/aiPdfExport";
import MediaPanel from "../../components/MediaPanel";
import MathText from "../../components/MathText";

export default function ConceptExplainer() {
  const navigate   = useNavigate();
  const dispatch   = useDispatch();
  const { user }   = useAuth();
  const aiResult   = useSelector(selectAiToolResult);
  const aiStatus   = useSelector(selectAiToolStatus);
  const allHistory = useSelector(selectAiHistory);
  const conceptHistory = allHistory.filter((h) => h.tool === "concept");

  const [form, setForm] = useState(conceptExplainerDefaults);
  const [editedResult, setEditedResult] = useState(null);
  const [historyLoaded, setHistoryLoaded] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [showMediaPanel, setShowMediaPanel] = useState(false);

  const generating = aiStatus === "loading";
  const displayResult = historyLoaded ? editedResult : (editedResult ?? aiResult);
  const showOutput = generating || !!displayResult || historyLoaded;

  useEffect(() => () => { dispatch(clearAiToolResult()); }, [dispatch]);
  useEffect(() => { dispatch(fetchHistory()); }, [dispatch]);

  const toggleElement = (id) =>
    setForm((p) => ({
      ...p,
      includeElements: { ...p.includeElements, [id]: !p.includeElements[id] },
    }));

  const { runTool } = useAiToolWithHistory();

  const handleGenerate = () => {
    if (!form.concept.trim()) return;
    dispatch(clearAiToolResult());
    setEditedResult(null);
    setHistoryLoaded(false);
    setIsEditing(false);
    runTool(
      {
        tool: "concept",
        subject: "General",
        topic: form.concept,
        grade: form.grade,
        extra: {
          board: form.board,
          style: form.explanationStyle,
          level: form.level,
          include: Object.entries(form.includeElements).filter(([, v]) => v).map(([k]) => k),
        },
      },
      { tool: "concept", title: `Concept: ${form.concept}`, topic: form.concept, grade: form.grade }
    );
  };

  const loadFromHistory = (item) => {
    setEditedResult(item.result ?? null);
    setHistoryLoaded(true);
    setIsEditing(false);
    setShowHistory(false);
    if (item.topic) setForm((p) => ({ ...p, concept: item.topic }));
    if (item.grade) setForm((p) => ({ ...p, grade: item.grade }));
  };

  // Update a top-level string field in the edited result
  const updateField = (key, value) => {
    const base = editedResult ?? (aiResult ? JSON.parse(JSON.stringify(aiResult)) : {});
    setEditedResult({ ...base, [key]: value });
  };

  // Update an array item field: updateArrayField("key_vocabulary", 0, "definition", "new val")
  const updateArrayField = (key, idx, field, value) => {
    const base = editedResult ?? (aiResult ? JSON.parse(JSON.stringify(aiResult)) : {});
    const arr = [...(base[key] || [])];
    arr[idx] = field ? { ...arr[idx], [field]: value } : value;
    setEditedResult({ ...base, [key]: arr });
  };

  return (
    <div className="bg-[#fdf8ff] min-h-screen" style={{ fontFamily: "'Lexend', sans-serif" }}>

      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-white border-b border-gray-200">
        <div className="max-w-[1200px] mx-auto px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="size-8 bg-[#695be6] rounded-lg flex items-center justify-center text-white">
              <span className="material-symbols-outlined text-lg">lightbulb</span>
            </div>
            <h1 className="font-black text-base">Concept Explainer</h1>
          </div>
          <div className="flex items-center gap-4 text-sm font-semibold text-gray-500">
            <button onClick={() => navigate("/teacher/ai-assistant")} className="hover:text-gray-700">AI Assistant</button>
            <span className="text-[#695be6] border-b-2 border-[#695be6] pb-0.5">Concept Explainer</span>
            <button className="hover:text-gray-700" onClick={() => navigate("/teacher/homework")}>Library</button>
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
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-xs text-gray-400 mb-2">
          <button onClick={() => navigate("/teacher/ai-assistant")} className="hover:underline">AI Assistant</button>
          <span>/</span>
          <span className="text-gray-700 font-semibold">Concept Explainer</span>
        </div>
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-black">Concept Explainer Workspace</h1>
            <p className="text-sm text-[#695be6]">Create clear, age-appropriate lessons in seconds</p>
          </div>
          <button
            onClick={() => navigate("/teacher/ai-assistant")}
            className="flex items-center gap-1.5 border border-gray-200 text-sm font-semibold px-4 py-2 rounded-xl hover:bg-gray-50 transition-colors"
          >
            <span className="material-symbols-outlined text-base">arrow_back</span> Back to Dashboard
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

          {/* ── Left: Config ── */}
          <div className="space-y-4">

            {/* 1. Concept */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
              <label className="text-sm font-bold text-gray-700 mb-2 block">
                Concept <span className="text-red-400">*</span>
              </label>
              <input
                value={form.concept}
                onChange={(e) => setForm({ ...form, concept: e.target.value })}
                className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm outline-none focus:border-[#695be6]"
                placeholder="Enter concept (e.g., Photosynthesis, Newton's Laws)"
              />
            </div>

            {/* 2. Class / Grade */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
              <label className="text-sm font-bold text-gray-700 mb-2 block">
                Class / Grade <span className="text-red-400">*</span>
              </label>
              <select
                value={form.grade}
                onChange={(e) => setForm({ ...form, grade: e.target.value })}
                className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-[#695be6] bg-white"
              >
                {gradeOptions.map((g) => <option key={g}>{g}</option>)}
              </select>
            </div>

            {/* 3. Board */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
              <label className="text-sm font-bold text-gray-700 mb-2 block">Board / Curriculum</label>
              <div className="flex gap-2">
                {boardOptions.map((b) => (
                  <button
                    key={b}
                    onClick={() => setForm({ ...form, board: b })}
                    className={`flex-1 py-2 rounded-xl border-2 text-sm font-semibold transition-all ${
                      form.board === b
                        ? "border-[#695be6] bg-[#695be6]/5 text-[#695be6]"
                        : "border-gray-200 text-gray-600 hover:border-gray-300"
                    }`}
                  >
                    {b}
                  </button>
                ))}
              </div>
            </div>

            {/* 4. Explanation Style */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
              <label className="text-sm font-bold text-gray-700 mb-3 block">Explanation Style</label>
              <div className="grid grid-cols-2 gap-2">
                {explanationStyles.map((s) => (
                  <button
                    key={s.id}
                    onClick={() => setForm({ ...form, explanationStyle: s.label })}
                    className={`py-2.5 rounded-xl border-2 text-sm font-semibold transition-all ${
                      form.explanationStyle === s.label
                        ? "border-[#695be6] bg-[#695be6]/5 text-[#695be6]"
                        : "border-gray-200 text-gray-600 hover:border-gray-300"
                    }`}
                  >
                    {s.label}
                  </button>
                ))}
              </div>
            </div>

            {/* 5. Level */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
              <label className="text-sm font-bold text-gray-700 mb-3 block">Level</label>
              <div className="grid grid-cols-3 gap-2">
                {levelOptions.map((l) => (
                  <button
                    key={l.id}
                    onClick={() => setForm({ ...form, level: l.id })}
                    className={`py-2.5 px-2 rounded-xl border-2 transition-all text-left ${
                      form.level === l.id
                        ? "border-[#695be6] bg-[#695be6]/5"
                        : "border-gray-200 hover:border-gray-300"
                    }`}
                  >
                    <p className={`text-xs font-bold ${form.level === l.id ? "text-[#695be6]" : "text-gray-700"}`}>{l.label}</p>
                    <p className="text-[10px] text-gray-400 mt-0.5">{l.desc}</p>
                  </button>
                ))}
              </div>
            </div>

            {/* 6. Include Options */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
              <label className="text-sm font-bold text-gray-700 mb-3 block">Include Options</label>
              <div className="grid grid-cols-2 gap-2">
                {includeElementOptions.map((el) => (
                  <label key={el.id} className="flex items-center gap-2 cursor-pointer">
                    <div
                      onClick={() => toggleElement(el.id)}
                      className={`size-5 rounded border-2 flex items-center justify-center cursor-pointer flex-shrink-0 ${
                        form.includeElements[el.id] ? "bg-[#695be6] border-[#695be6]" : "border-gray-300"
                      }`}
                    >
                      {form.includeElements[el.id] && (
                        <span className="material-symbols-outlined text-white text-xs">check</span>
                      )}
                    </div>
                    <span className="text-sm text-gray-700">{el.label}</span>
                  </label>
                ))}
              </div>
            </div>

            <button
              onClick={handleGenerate}
              disabled={generating || !form.concept.trim()}
              className="w-full bg-[#695be6] text-white font-black py-4 rounded-xl hover:bg-[#5a4dd4] transition-colors flex items-center justify-center gap-2 disabled:opacity-60"
            >
              <span className="material-symbols-outlined text-base">auto_awesome</span>
              {generating ? "Generating..." : "✨ Generate Explanation"}
            </button>
          </div>

          {/* ── Right: Output ── */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden flex flex-col">
            {/* Output toolbar */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 bg-gray-50 flex-wrap gap-2">
              <div className="flex items-center gap-1.5">
                <div className="size-3 rounded-full bg-red-400" />
                <div className="size-3 rounded-full bg-yellow-400" />
                <div className="size-3 rounded-full bg-green-400" />
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                {showOutput && displayResult && !generating && (
                  <>
                    <button
                      onClick={() => {
                        setIsEditing((v) => !v);
                        if (!editedResult && aiResult) setEditedResult(JSON.parse(JSON.stringify(aiResult)));
                      }}
                      className={`flex items-center gap-1 text-xs font-bold px-2.5 py-1.5 rounded-lg border transition-colors ${
                        isEditing ? "bg-[#695be6] text-white border-[#695be6]" : "border-gray-200 text-gray-600 hover:bg-gray-100"
                      }`}
                    >
                      <span className="material-symbols-outlined text-sm">{isEditing ? "check" : "edit"}</span>
                      {isEditing ? "Done" : "Edit"}
                    </button>
                    <button
                      onClick={() => navigator.clipboard?.writeText(JSON.stringify(displayResult, null, 2))}
                      className="flex items-center gap-1 text-xs text-gray-500 hover:text-gray-700 border border-gray-200 px-2.5 py-1.5 rounded-lg"
                    >
                      <span className="material-symbols-outlined text-sm">content_copy</span> Copy
                    </button>
                    <button
                      onClick={() => downloadConceptPdf(displayResult)}
                      className="flex items-center gap-1 text-xs text-gray-500 hover:text-gray-700 border border-gray-200 px-2.5 py-1.5 rounded-lg"
                    >
                      <span className="material-symbols-outlined text-sm">download</span> PDF
                    </button>
                  </>
                )}
                {/* History button — always visible */}
                <button
                  onClick={() => setShowHistory((v) => !v)}
                  className={`flex items-center gap-1 text-xs font-bold px-2.5 py-1.5 rounded-lg border transition-colors ${
                    showHistory ? "bg-[#695be6] text-white border-[#695be6]" : "border-gray-200 text-gray-600 hover:bg-gray-50"
                  }`}
                >
                  <span className="material-symbols-outlined text-sm">history</span>
                  History
                  {conceptHistory.length > 0 && (
                    <span className={`ml-0.5 text-[10px] font-bold px-1.5 py-0.5 rounded-full ${showHistory ? "bg-white text-[#695be6]" : "bg-[#695be6] text-white"}`}>
                      {conceptHistory.length}
                    </span>
                  )}
                </button>
                {/* Find Media — visible when result is available */}
                {showOutput && displayResult && !generating && (
                  <button
                    onClick={() => setShowMediaPanel(true)}
                    className="flex items-center gap-1 text-xs font-bold px-2.5 py-1.5 rounded-lg border border-emerald-200 text-emerald-700 hover:bg-emerald-50 transition-colors"
                  >
                    <span className="material-symbols-outlined text-sm">perm_media</span>
                    Find Media
                  </button>
                )}
              </div>
            </div>

            {/* History panel */}
            {showHistory && (
              <div className="border-b border-gray-100 bg-[#faf9ff] p-4">
                <div className="flex items-center justify-between mb-3">
                  <p className="text-xs font-black text-[#695be6] uppercase tracking-widest">History</p>
                  <span className="text-[10px] text-gray-400">{conceptHistory.length} saved</span>
                </div>
                {conceptHistory.length === 0 ? (
                  <p className="text-xs text-gray-400 text-center py-4">No history yet.</p>
                ) : (
                  <div className="space-y-2 max-h-60 overflow-y-auto pr-1" style={{ scrollbarWidth: "thin" }}>
                    {conceptHistory.map((item) => (
                      <div key={item.id} className="bg-white rounded-xl border border-[#e8e3f5] overflow-hidden">
                        <div className="px-3 py-2 border-b border-gray-50">
                          <p className="text-xs font-bold text-gray-800 truncate">{item.title}</p>
                          <p className="text-[10px] text-gray-400">
                            {item.grade ? `${item.grade} · ` : ""}
                            {item.createdAt ? new Date(item.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }) : ""}
                          </p>
                        </div>
                        <div className="flex items-center gap-1 px-3 py-2">
                          <button
                            onClick={() => loadFromHistory(item)}
                            className="flex items-center gap-1 text-[10px] font-bold text-[#695be6] hover:bg-[#695be6]/5 px-2 py-1 rounded-lg transition-colors"
                          >
                            <span className="material-symbols-outlined text-xs">open_in_new</span> Load
                          </button>
                          <div className="flex-1" />
                          <button
                            onClick={() => dispatch(removeHistoryItem(item.id))}
                            className="text-gray-300 hover:text-red-500 transition-colors p-1"
                          >
                            <span className="material-symbols-outlined text-sm">delete</span>
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            <div className="flex-1 overflow-y-auto">
              {/* Empty state */}
              {!generating && !showOutput && (
                <div className="flex flex-col items-center justify-center h-full p-10 text-center">
                  <div className="size-20 bg-[#695be6]/10 rounded-2xl flex items-center justify-center mb-5">
                    <span className="material-symbols-outlined text-[#695be6] text-4xl">lightbulb</span>
                  </div>
                  <h3 className="font-black text-xl mb-2">Ready to explain?</h3>
                  <p className="text-sm text-gray-400 max-w-xs">
                    Fill in the concept and settings on the left, then hit Generate.
                  </p>
                </div>
              )}

              {/* Loading */}
              {generating && (
                <div className="flex flex-col items-center justify-center h-full p-10 gap-3">
                  <span className="size-10 border-2 border-[#695be6]/30 border-t-[#695be6] rounded-full animate-spin" />
                  <p className="text-sm text-gray-400">Generating explanation...</p>
                </div>
              )}

              {/* Result */}
              {!generating && displayResult && (
                <ConceptOutput
                  result={displayResult}
                  isEditing={isEditing}
                  updateField={updateField}
                  updateArrayField={updateArrayField}
                />
              )}
            </div>

            <div className="px-4 py-2 border-t border-gray-100 bg-gray-50 flex items-center justify-between">
              <span className="text-[10px] font-bold text-gray-400 uppercase">Preview Mode</span>
              <div className="flex items-center gap-2">
                {editedResult && <span className="text-[10px] font-bold text-amber-500">Edited</span>}
                {showOutput && displayResult && (
                  <button
                    onClick={() => { dispatch(clearAiToolResult()); setEditedResult(null); setHistoryLoaded(false); setIsEditing(false); }}
                    className="text-[10px] text-[#695be6] font-bold hover:underline"
                  >
                    Clear
                  </button>
                )}
                <span className="text-[10px] font-bold text-green-500">AI Ready</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Media Panel modal ── */}
      {showMediaPanel && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl flex flex-col overflow-hidden"
            style={{ height: "80vh" }}>
            <MediaPanel
              query={form.concept}
              grade={form.grade}
              board={form.board}
              onClose={() => setShowMediaPanel(false)}
            />
          </div>
        </div>
      )}
    </div>
  );
}

// ── Output renderer ──────────────────────────────────────────────────────────
function Section({ title, children }) {
  return (
    <div>
      <p className="text-xs font-black text-gray-400 uppercase tracking-wide mb-2">{title}</p>
      {children}
    </div>
  );
}

function EditableText({ value, onChange, rows = 2, className = "" }) {
  return (
    <textarea
      value={value || ""}
      onChange={(e) => onChange(e.target.value)}
      rows={rows}
      className={`w-full bg-transparent outline-none border-b border-[#695be6]/30 focus:border-[#695be6] resize-none text-sm text-gray-700 ${className}`}
    />
  );
}

function ConceptOutput({ result, isEditing, updateField, updateArrayField }) {
  return (
    <div className="p-5 space-y-5 text-sm">

      {/* Title */}
      <div>
        <h3 className="font-black text-lg text-[#695be6]">
          🌿 {result.concept || "Concept"}{result.grade ? ` (${result.grade})` : ""}
        </h3>
        {result.one_line_summary && (
          <p className="text-xs text-gray-500 italic mt-1">{result.one_line_summary}</p>
        )}
      </div>

      {/* 1. Simple Definition */}
      {result.one_line_summary && (
        <Section title="🔷 1. Simple Definition">
          {isEditing ? (
            <EditableText value={result.one_line_summary} onChange={(v) => updateField("one_line_summary", v)} rows={2} />
          ) : (
            <MathText text={result.one_line_summary} className="text-gray-700 leading-relaxed" tag="p" />
          )}
        </Section>
      )}

      {/* 2. Easy Explanation */}
      {result.plain_english_explanation && (
        <Section title="🔷 2. Easy Explanation">
          {isEditing ? (
            <EditableText value={result.plain_english_explanation} onChange={(v) => updateField("plain_english_explanation", v)} rows={4} />
          ) : (
            <MathText text={result.plain_english_explanation} className="text-gray-700 leading-relaxed whitespace-pre-line" tag="p" />
          )}
        </Section>
      )}

      {/* 3. Step-by-Step */}
      {result.step_by_step_process?.length > 0 && (
        <Section title="🔷 3. Step-by-Step Process 🌱">
          <ol className="space-y-1.5">
            {result.step_by_step_process.map((s, i) => (
              <li key={i} className="flex items-start gap-2 text-gray-700">
                <span className="size-5 rounded-full bg-[#695be6]/10 text-[#695be6] text-xs font-black flex items-center justify-center flex-shrink-0 mt-0.5">
                  {s.step || i + 1}
                </span>
                {isEditing ? (
                  <div className="flex-1 space-y-1">
                    <input value={s.action || ""} onChange={(e) => updateArrayField("step_by_step_process", i, "action", e.target.value)}
                      className="w-full font-bold bg-transparent border-b border-[#695be6]/30 outline-none text-sm focus:border-[#695be6]" placeholder="Action" />
                    <input value={s.explanation || ""} onChange={(e) => updateArrayField("step_by_step_process", i, "explanation", e.target.value)}
                      className="w-full bg-transparent border-b border-gray-200 outline-none text-xs text-gray-500 focus:border-[#695be6]" placeholder="Explanation" />
                  </div>
                ) : (
                  <span><MathText text={`${s.action}${s.explanation ? ` — ${s.explanation}` : ""}`} /></span>
                )}
              </li>
            ))}
          </ol>
        </Section>
      )}

      {/* 4. Visual / Diagram */}
      {result.diagram_description && (
        <Section title="🔷 4. Visual Representation 📊">
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-3">
            {isEditing ? (
              <EditableText value={result.diagram_description} onChange={(v) => updateField("diagram_description", v)} rows={3}
                className="text-xs text-blue-800" />
            ) : (
              <MathText text={result.diagram_description} className="text-xs text-blue-800 leading-relaxed whitespace-pre-line" tag="p" />
            )}
          </div>
        </Section>
      )}

      {/* 5. Analogy */}
      {result.primary_analogy && (
        <Section title="🔷 5. Analogy 🍳">
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 space-y-1">
            {isEditing ? (
              <>
                <EditableText value={result.primary_analogy.analogy} onChange={(v) => updateField("primary_analogy", { ...result.primary_analogy, analogy: v })} rows={2} className="font-semibold" />
                <EditableText value={result.primary_analogy.explanation} onChange={(v) => updateField("primary_analogy", { ...result.primary_analogy, explanation: v })} rows={2} className="text-xs text-gray-600" />
              </>
            ) : (
              <>
                <MathText text={result.primary_analogy.analogy} className="font-semibold text-gray-800" tag="p" />
                <MathText text={result.primary_analogy.explanation} className="text-xs text-gray-600" tag="p" />
                {result.primary_analogy.limitations && (
                  <MathText text={`⚠ Limitation: ${result.primary_analogy.limitations}`} className="text-xs text-amber-700 italic" tag="p" />
                )}
              </>
            )}
          </div>
        </Section>
      )}

      {/* 6. Technical Explanation */}
      {result.technical_explanation && (
        <Section title="🔷 6. Technical Explanation 🧪">
          <div className="bg-gray-50 border border-gray-200 rounded-xl p-3">
            {isEditing ? (
              <EditableText value={result.technical_explanation} onChange={(v) => updateField("technical_explanation", v)} rows={3} className="text-xs" />
            ) : (
              <MathText text={result.technical_explanation} className="text-xs text-gray-700 leading-relaxed" tag="p" />
            )}
          </div>
        </Section>
      )}

      {/* 7. Real-Life Examples */}
      {result.real_world_examples?.length > 0 && (
        <Section title="🔷 7. Real-Life Example 🌍">
          <div className="space-y-2">
            {result.real_world_examples.map((ex, i) => (
              <div key={i} className="bg-green-50 border border-green-200 rounded-lg p-3">
                {isEditing ? (
                  <>
                    <input value={ex.example || ""} onChange={(e) => updateArrayField("real_world_examples", i, "example", e.target.value)}
                      className="w-full text-xs font-bold text-green-800 bg-transparent border-b border-green-300 outline-none focus:border-[#695be6] mb-1" />
                    <input value={ex.connection || ""} onChange={(e) => updateArrayField("real_world_examples", i, "connection", e.target.value)}
                      className="w-full text-xs text-gray-600 bg-transparent border-b border-gray-200 outline-none focus:border-[#695be6]" />
                  </>
                ) : (
                  <>
                    <MathText text={ex.example} className="text-xs font-bold text-green-800" tag="p" />
                    <MathText text={ex.connection} className="text-xs text-gray-600 mt-1" tag="p" />
                  </>
                )}
              </div>
            ))}
          </div>
        </Section>
      )}

      {/* 8. Common Mistakes */}
      {result.common_misconceptions?.length > 0 && (
        <Section title="🔷 8. Common Mistakes ⚠️">
          <div className="space-y-2">
            {result.common_misconceptions.map((m, i) => (
              <div key={i} className="bg-red-50 border border-red-200 rounded-lg p-3">
                {isEditing ? (
                  <>
                    <input value={m.misconception || ""} onChange={(e) => updateArrayField("common_misconceptions", i, "misconception", e.target.value)}
                      className="w-full text-xs font-bold text-red-700 bg-transparent border-b border-red-200 outline-none focus:border-[#695be6] mb-1" />
                    <input value={m.correction || ""} onChange={(e) => updateArrayField("common_misconceptions", i, "correction", e.target.value)}
                      className="w-full text-xs text-green-700 font-semibold bg-transparent border-b border-gray-200 outline-none focus:border-[#695be6]" />
                  </>
                ) : (
                  <>
                    <MathText text={`❌ ${m.misconception}`} className="text-xs font-bold text-red-700 mb-1" tag="p" />
                    <MathText text={`✅ ${m.correction}`} className="text-xs text-green-700 font-semibold" tag="p" />
                    {m.how_to_address && <MathText text={m.how_to_address} className="text-xs text-gray-500 italic mt-1" tag="p" />}
                  </>
                )}
              </div>
            ))}
          </div>
        </Section>
      )}

      {/* 9. Quick Revision */}
      {result.key_vocabulary?.length > 0 && (
        <Section title="🔷 9. Quick Revision 📘">
          <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-3 space-y-1">
            {result.key_vocabulary.map((v, i) => (
              <p key={i} className="text-xs text-gray-700">
                {isEditing ? (
                  <span className="flex gap-2">
                    <input value={v.term || ""} onChange={(e) => updateArrayField("key_vocabulary", i, "term", e.target.value)}
                      className="font-bold text-[#695be6] bg-transparent border-b border-[#695be6]/30 outline-none w-24 focus:border-[#695be6]" />
                    <span className="text-gray-400">:</span>
                    <input value={v.definition || ""} onChange={(e) => updateArrayField("key_vocabulary", i, "definition", e.target.value)}
                      className="flex-1 bg-transparent border-b border-gray-200 outline-none focus:border-[#695be6]" />
                  </span>
                ) : (
                  <><strong className="text-[#695be6]">{v.term}</strong>: <MathText text={v.definition} /></>
                )}
              </p>
            ))}
          </div>
        </Section>
      )}

      {/* 10. Quick Check Questions */}
      {result.quick_check_questions?.length > 0 && (
        <Section title="🔷 10. Quick Check 🧪">
          <div className="space-y-2">
            {result.quick_check_questions.map((q, i) => (
              <div key={i} className="border border-gray-200 rounded-lg p-3">
                {isEditing ? (
                  <input value={q.question || ""} onChange={(e) => updateArrayField("quick_check_questions", i, "question", e.target.value)}
                    className="w-full text-xs font-bold text-gray-700 bg-transparent border-b border-gray-200 outline-none focus:border-[#695be6]" />
                ) : (
                  <MathText text={`Q${i + 1}. ${q.question}`} className="text-xs font-bold text-gray-700" tag="p" />
                )}
                {q.options?.length > 0 && (
                  <ul className="mt-1 space-y-0.5">
                    {q.options.map((opt, j) => (
                      <li key={j} className={`text-xs ${opt.is_correct ? "text-green-700 font-semibold" : "text-gray-600"}`}>
                        <MathText text={`${String.fromCharCode(65 + j)}. ${opt.text || opt}${opt.is_correct ? " ✅" : ""}`} />
                      </li>
                    ))}
                  </ul>
                )}
                {q.expected_answer && !q.options?.length && (
                  <p className="text-xs text-green-700 mt-1">→ {q.expected_answer}</p>
                )}
              </div>
            ))}
          </div>
        </Section>
      )}

      {/* 11. Exam Answer Format */}
      {result.exam_answer_format && (
        <Section title="🔷 11. Exam Answer Format 📝">
          <div className="bg-purple-50 border border-purple-200 rounded-xl p-3">
            {isEditing ? (
              <EditableText value={result.exam_answer_format} onChange={(v) => updateField("exam_answer_format", v)} rows={3} className="text-xs" />
            ) : (
              <MathText text={result.exam_answer_format} className="text-xs text-gray-700 leading-relaxed" tag="p" />
            )}
          </div>
        </Section>
      )}

      {/* 12. Key Vocabulary (extended) */}
      {result.key_vocabulary?.length > 0 && (
        <Section title="🔷 12. Key Vocabulary 📖">
          <div className="space-y-1">
            {result.key_vocabulary.map((v, i) => (
              <p key={i} className="text-xs text-gray-700">
                <strong className="text-[#695be6]">{v.term}</strong>: <MathText text={v.definition} />
                {v.example_in_sentence && <span className="text-gray-400 italic"> — "{v.example_in_sentence}"</span>}
              </p>
            ))}
          </div>
        </Section>
      )}

      {/* 13. Teaching Tips */}
      {result.teaching_tips?.length > 0 && (
        <Section title="🔷 13. Teaching Tips 👨‍🏫">
          <div className="bg-purple-50 border border-purple-200 rounded-xl p-3">
            <ul className="space-y-1">
              {result.teaching_tips.map((t, i) => (
                <li key={i} className="text-xs text-gray-700 flex items-start gap-1.5">
                  <span className="material-symbols-outlined text-purple-500 text-sm flex-shrink-0">tips_and_updates</span>
                  {isEditing ? (
                    <input value={t} onChange={(e) => updateArrayField("teaching_tips", i, null, e.target.value)}
                      className="flex-1 bg-transparent border-b border-purple-200 outline-none focus:border-[#695be6]" />
                  ) : <MathText text={t} />}
                </li>
              ))}
            </ul>
          </div>
        </Section>
      )}

      {/* Simplified version */}
      {result.simplified_version && (
        <Section title="📗 Simplified Version">
          <div className="bg-teal-50 border border-teal-200 rounded-xl p-3">
            {isEditing ? (
              <EditableText value={result.simplified_version} onChange={(v) => updateField("simplified_version", v)} rows={3} className="text-xs" />
            ) : (
              <MathText text={result.simplified_version} className="text-xs text-gray-700 leading-relaxed" tag="p" />
            )}
          </div>
        </Section>
      )}

      {/* Extension for Advanced */}
      {result.extension_for_advanced && (
        <Section title="🚀 Extension for Advanced Learners">
          <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-3">
            {isEditing ? (
              <EditableText value={result.extension_for_advanced} onChange={(v) => updateField("extension_for_advanced", v)} rows={3} className="text-xs" />
            ) : (
              <MathText text={result.extension_for_advanced} className="text-xs text-gray-700 leading-relaxed" tag="p" />
            )}
          </div>
        </Section>
      )}

      {/* Discussion Questions */}
      {result.discussion_questions?.length > 0 && (
        <Section title="💬 Discussion Questions">
          <div className="space-y-1">
            {result.discussion_questions.map((q, i) => (
              <p key={i} className="text-xs text-gray-700 flex items-start gap-2">
                <span className="text-[#695be6] font-bold flex-shrink-0">Q{i + 1}.</span>
                {isEditing ? (
                  <input value={q} onChange={(e) => updateArrayField("discussion_questions", i, null, e.target.value)}
                    className="flex-1 bg-transparent border-b border-gray-200 outline-none focus:border-[#695be6]" />
                ) : <MathText text={q} />}
              </p>
            ))}
          </div>
        </Section>
      )}
    </div>
  );
}
