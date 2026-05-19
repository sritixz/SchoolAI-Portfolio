import { useState, useRef, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { useAuth } from "../../context/AuthContext";
import { getFirstName, getInitial } from "../../utils/nameUtils";
import api from "../../api";
import {
  VIN_AVATAR, QUICK_ACTIONS,
  SUBJECT_BADGE, SIDEBAR_SUBJECTS,
} from "../../data/vinAiData";
import {
  fetchSessions,
  loadSession,
  toggleSessionStar,
  optimisticToggleStar,
  optimisticTogglePin,
  optimisticRename,
  deleteSession,
  pinSession,
  renameSession,
  clearLoadedSession,
  selectSessions,
  selectSessionsStatus,
  selectLoadedSessionId,
  selectLoadedTurns,
  selectLoadSessionStatus,
} from "../../store/slices/vinAiSlice";
import { fetchMe, selectUserProfile } from "../../store/slices/authSlice";
import { parseVinXML } from "../../utils/xmlParser";
import { renderMath, renderMarkdown } from "../../utils/mathRenderer";
import MediaPanel from "../../components/MediaPanel";
import { fetchImages, fetchVideos } from "../../api/mediaApi";

/**
 * Converts plain-text step/content formatting into HTML.
 * Handles: newline-separated bullet lines starting with "- ", numbered sub-lists,
 * and bare newlines → <br> so steps don't render as a wall of text.
 */
function formatStepText(text) {
  if (!text) return text;

  // Split into lines, group consecutive "- " bullet lines into <ul>
  const lines = text.split(/\n/);
  const out = [];
  let inList = false;

  for (const raw of lines) {
    const line = raw.trimEnd();
    const isBullet = /^\s*-\s+/.test(line);

    if (isBullet) {
      if (!inList) { out.push("<ul class=\"list-disc pl-5 space-y-1 mt-1\">"); inList = true; }
      out.push(`<li>${line.replace(/^\s*-\s+/, "")}</li>`);
    } else {
      if (inList) { out.push("</ul>"); inList = false; }
      if (line.trim() === "") {
        out.push("<br>");
      } else {
        out.push(line);
      }
    }
  }
  if (inList) out.push("</ul>");

  return out.join("\n");
}

// ── generate a UUID for each new chat session ──
function newSessionId() {
  return crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).slice(2) + Date.now().toString(36);
}

// ─────────────────────────────────────────────────────────────
// INLINE VIDEO CARD
// ─────────────────────────────────────────────────────────────
function InlineVideoCard({ vid }) {
  const [thumbErr, setThumbErr] = useState(false);
  const fallback = `https://img.youtube.com/vi/${vid.video_id}/mqdefault.jpg`;
  return (
    <a href={vid.url} target="_blank" rel="noreferrer"
      className="group rounded-lg overflow-hidden border border-slate-100 hover:border-[#695be6]/30 hover:shadow-sm transition-all block">
      <div className="relative h-20 overflow-hidden bg-slate-100">
        <img src={thumbErr ? fallback : (vid.thumbnail || fallback)} alt={vid.title}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          loading="lazy" onError={() => setThumbErr(true)} />
        <div className="absolute inset-0 flex items-center justify-center bg-black/20">
          <div className="size-7 rounded-full bg-red-600 flex items-center justify-center">
            <span className="material-symbols-outlined text-white text-sm" style={{ fontVariationSettings: "'FILL' 1" }}>play_arrow</span>
          </div>
        </div>
      </div>
      <div className="p-1">
        <p className="text-[10px] text-slate-700 font-medium line-clamp-1">{vid.title?.replace(/&#(\d+);/g, (_, c) => String.fromCharCode(c))}</p>
        {vid.channel && <p className="text-[9px] text-slate-400 truncate">{vid.channel}</p>}
      </div>
    </a>
  );
}

// ─────────────────────────────────────────────────────────────
// INLINE MEDIA RECOMMENDATIONS
// ─────────────────────────────────────────────────────────────
// ─────────────────────────────────────────────────────────────
// INLINE MEDIA RECOMMENDATIONS
// ─────────────────────────────────────────────────────────────
function InlineMediaRecommendations({ mediaQuery, grade, board, onExpand }) {
  const [images, setImages] = useState([]);
  const [videos, setVideos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState("images");

  useEffect(() => {
    if (!mediaQuery) return;
    setLoading(true);
    Promise.all([fetchImages(mediaQuery, grade, board), fetchVideos(mediaQuery, grade, board)])
      .then(([imgs, vids]) => { setImages(imgs || []); setVideos(vids || []); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [mediaQuery, grade, board]);

  if (loading) return (
    <div className="mt-3 rounded-xl border border-slate-200 overflow-hidden">
      <div className="px-3 py-2 bg-slate-50 flex items-center gap-2">
        <span className="material-symbols-outlined text-slate-400 text-sm animate-spin">progress_activity</span>
        <span className="text-xs text-slate-400">Loading media for "{mediaQuery}"...</span>
      </div>
    </div>
  );
  if (images.length === 0 && videos.length === 0) return null;

  return (
    <div className="mt-3 rounded-xl border border-slate-200 overflow-hidden">
      <div className="px-3 py-2 bg-gradient-to-r from-[#695be6]/5 to-emerald-50 flex items-center justify-between border-b border-slate-100">
        <div className="flex items-center gap-2">
          <span className="material-symbols-outlined text-[#695be6] text-sm">auto_awesome</span>
          <span className="text-xs font-bold text-slate-700">Related Media</span>
          <span className="text-[10px] text-slate-400">"{mediaQuery}"</span>
        </div>
        <button onClick={() => onExpand(mediaQuery, tab)} className="text-[10px] font-bold text-[#695be6] hover:underline flex items-center gap-0.5">
          See all<span className="material-symbols-outlined text-xs">open_in_full</span>
        </button>
      </div>
      <div className="flex border-b border-slate-100 bg-white">
        {[{ id: "images", label: `Images (${images.length})`, icon: "image" }, { id: "videos", label: `Videos (${videos.length})`, icon: "play_circle" }].map((t) => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={`flex items-center gap-1 px-3 py-1.5 text-[11px] font-bold border-b-2 transition-colors ${tab === t.id ? "border-[#695be6] text-[#695be6]" : "border-transparent text-slate-400 hover:text-slate-600"}`}>
            <span className="material-symbols-outlined text-xs">{t.icon}</span>{t.label}
          </button>
        ))}
      </div>
      <div className="p-2 bg-white">
        {tab === "images" ? (
          <div className="grid grid-cols-3 gap-2">
            {images.slice(0, 3).map((img, i) => (
              <a key={i} href={img.source || img.url} target="_blank" rel="noreferrer"
                className="group rounded-lg overflow-hidden border border-slate-100 hover:border-[#695be6]/30 hover:shadow-sm transition-all block bg-white">
                <div className="h-24 bg-white flex items-center justify-center overflow-hidden p-1">
                  <img src={img.thumbnail || img.url} alt={img.title}
                    className="max-w-full max-h-full object-contain group-hover:scale-105 transition-transform duration-300" loading="lazy"
                    onError={(e) => { e.target.parentElement.innerHTML = '<div class="h-full flex items-center justify-center"><span class="material-symbols-outlined text-slate-300">broken_image</span></div>'; }} />
                </div>
                <p className="text-[10px] text-slate-500 p-1 line-clamp-1 border-t border-slate-100">{img.title}</p>
              </a>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-2">
            {videos.slice(0, 2).map((vid, i) => <InlineVideoCard key={i} vid={vid} />)}
          </div>
        )}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// MEDIA BUTTON — lazy trigger for turn 3+ messages
// ─────────────────────────────────────────────────────────────
function MediaButton({ mediaQuery, grade, board, onExpand }) {
  const [open, setOpen] = useState(false);
  return open
    ? <InlineMediaRecommendations mediaQuery={mediaQuery} grade={grade} board={board} onExpand={onExpand} />
    : (
      <div className="flex gap-2 mt-1">
        <button onClick={() => { setOpen(true); }}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-bold bg-emerald-50 text-emerald-700 hover:bg-emerald-100 transition-colors border border-emerald-100">
          <span className="material-symbols-outlined text-sm">image_search</span>Images &amp; Videos
        </button>
        <button onClick={() => onExpand(mediaQuery, "images")}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-bold bg-slate-50 text-slate-500 hover:bg-slate-100 transition-colors border border-slate-100">
          <span className="material-symbols-outlined text-sm">open_in_full</span>See all
        </button>
      </div>
    );
}

// ─────────────────────────────────────────────────────────────
// STREAMING MESSAGE RENDERER
// ─────────────────────────────────────────────────────────────
function StreamingMessage({ xmlBuffer, done, onFollowup, onAnswerQuestion, onRequestExamReady, interactionCount, grade, board, onExpandMedia, isHistoric, isLoadingExamReady, msgIndex, allMessages }) {
  const parsed = parseVinXML(xmlBuffer);

  // Build context-aware media query — always reflects the current conversation context
  const contextualMediaQuery = (() => {
    if (!parsed.mediaQuery) return null;
    const assistantMsgs = allMessages.filter(m => m.role === "assistant");
    const thisTurnIdx = assistantMsgs.findIndex(m => m.xmlBuffer === xmlBuffer);

    // Turn 1: use the AI's own media_query as-is
    if (thisTurnIdx === 0) return parsed.mediaQuery;

    // Turn 2+: build a context-aware query from conversation so far
    // Current message's <subject> (most specific to this turn)
    const thisSubjectMatch = xmlBuffer.match(/<subject>([^<]+)<\/subject>/);
    const thisTopic = thisSubjectMatch ? thisSubjectMatch[1].trim() : "";

    // Main topic from first assistant <subject>
    const firstSubjectMatch = assistantMsgs[0]?.xmlBuffer?.match(/<subject>([^<]+)<\/subject>/);
    const mainTopic = firstSubjectMatch ? firstSubjectMatch[1].trim() : "";

    // Last real user message — strip internal prefixes and filler words
    const INTERNAL = /^\[(EXAM_READY_REQUEST|IMAGE_UPLOAD)\]/;
    const FILLER = /^(how to|what is|what are|what's|explain|define|tell me|show me|give me|can you|is|are|does|do|i want|please|help me with)\b\s*/i;
    const lastUserText = allMessages
      .filter(m => m.role === "user" && !INTERNAL.test(m.text || ""))
      .at(-1)?.text || "";
    const cleanUserText = lastUserText.replace(FILLER, "").replace(/\?.*$/s, "").trim();

    // If current subject differs from main topic, it's a sub-topic — use it directly
    if (thisTopic && mainTopic && thisTopic.toLowerCase() !== mainTopic.toLowerCase()) {
      return thisTopic.slice(0, 60);
    }

    // Combine main topic + cleaned user context for richer query
    if (mainTopic && cleanUserText && cleanUserText.length > 3 &&
        !cleanUserText.toLowerCase().includes(mainTopic.toLowerCase())) {
      return `${mainTopic} ${cleanUserText}`.slice(0, 60);
    }

    return thisTopic || mainTopic || parsed.mediaQuery;
  })();

  // Determine if this message should show inline media or just a button
  const assistantMsgs = allMessages.filter(m => m.role === "assistant");
  const thisTurnIdx = assistantMsgs.findIndex(m => m.xmlBuffer === xmlBuffer);
  const showInlineMedia = thisTurnIdx === 0; // turn 1 auto-shows inline, turn 2+ shows button
  
  return (
    <div className="space-y-4">
      {parsed.content && (
        <div className="text-sm md:text-base text-slate-800 leading-relaxed">
          <span dangerouslySetInnerHTML={{ __html: renderMath(formatStepText(parsed.content)) }} />
          {!done && <span className="inline-block w-0.5 h-4 bg-[#695be6] ml-0.5 animate-pulse align-middle" />}
        </div>
      )}
      {parsed.hint && (
        <details className="group bg-[#FFE5E5] rounded-lg overflow-hidden" open>
          <summary className="flex items-center justify-between px-4 py-3 cursor-pointer list-none">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-red-500">lightbulb</span>
              <span className="text-red-700 text-sm font-bold uppercase tracking-wider">Hint</span>
            </div>
            <span className="material-symbols-outlined text-red-500 group-open:rotate-180 transition-transform">keyboard_arrow_down</span>
          </summary>
          <div className="px-4 pb-4 border-t border-red-100 pt-3">
            <p className="text-red-800 text-sm leading-relaxed" dangerouslySetInnerHTML={{ __html: renderMath(formatStepText(parsed.hint)) }} />
          </div>
        </details>
      )}
      {parsed.steps.length > 0 && (
        <div className="bg-[#C8E6C9] p-4 rounded-lg space-y-4">
          <h4 className="text-green-800 font-bold text-sm flex items-center gap-2 uppercase tracking-wider">
            <span className="material-symbols-outlined text-green-600">checklist</span>Step-by-Step
          </h4>
          <ul className="space-y-4 pt-1">
            {parsed.steps.map((s) => (
              <li key={s.number} className="flex gap-3">
                <div className="size-6 shrink-0 rounded-full bg-white flex items-center justify-center text-xs font-bold text-green-700 shadow-sm mt-0.5">{s.number}</div>
                <div className="text-sm text-green-900 leading-relaxed flex-1" dangerouslySetInnerHTML={{ __html: renderMath(formatStepText(s.text)) }} />
              </li>
            ))}
          </ul>
        </div>
      )}
      {parsed.question && !isHistoric && <PracticeQuestion question={parsed.question} onAnswer={onAnswerQuestion} />}
      {parsed.examReady && <ExamReadyAnswer examReady={parsed.examReady} />}
      {done && !parsed.examReady && interactionCount >= 1 && (
        <button onClick={onRequestExamReady} disabled={isLoadingExamReady}
          className="w-full py-2.5 border-2 border-[#695be6] text-[#695be6] font-bold rounded-xl text-sm hover:bg-[#695be6] hover:text-white transition-all flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-wait">
          {isLoadingExamReady
            ? <><span className="material-symbols-outlined text-base animate-spin">progress_activity</span>Loading exam answer...</>
            : <><span className="material-symbols-outlined text-base">workspace_premium</span>Show Exam-Ready Answer</>
          }
        </button>
      )}
      {done && !isHistoric && parsed.followups.length > 0 && (
        <div className="flex gap-2 overflow-x-auto pb-2 whitespace-nowrap pt-2" style={{ scrollbarWidth: "none" }}>
          {parsed.followups.map((f, i) => (
            <button key={i} onClick={() => onFollowup(f)}
              className="bg-white text-[#695be6] border border-slate-200 px-4 py-2 rounded-full text-sm font-medium hover:bg-[#695be6]/5 transition-colors shrink-0">{f}</button>
          ))}
        </div>
      )}
      {done && parsed.mediaQuery && contextualMediaQuery && (
        showInlineMedia
          ? <InlineMediaRecommendations mediaQuery={contextualMediaQuery} grade={grade} board={board} onExpand={onExpandMedia} />
          : <MediaButton mediaQuery={contextualMediaQuery} grade={grade} board={board} onExpand={onExpandMedia} />
      )}
      {!parsed.content && !done && (
        <div className="flex items-center gap-1.5">
          {[0, 1, 2].map((i) => (
            <span key={i} className="size-2 bg-[#695be6]/40 rounded-full animate-bounce" style={{ animationDelay: `${i * 0.15}s` }} />
          ))}
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// PRACTICE QUESTION
// ─────────────────────────────────────────────────────────────
function PracticeQuestion({ question, onAnswer }) {
  const [selected, setSelected] = useState(null);
  const [checked, setChecked] = useState(false);
  const correct = question.options.find((o) => o.correct);
  const handleCheck = () => {
    if (!selected || checked) return;
    setChecked(true);
    const chosen = question.options.find((o) => o.id === selected);
    onAnswer(question.text, chosen.text, chosen.correct);
  };
  return (
    <div className="bg-[#695be6]/5 border border-[#695be6]/20 p-4 rounded-lg space-y-4">
      <p className="text-sm font-bold text-[#695be6] uppercase tracking-wide">Practice Question</p>
      <p className="text-sm text-slate-700">{question.text}</p>
      <div className="grid grid-cols-1 gap-2">
        {question.options.map((opt) => {
          const isSel = selected === opt.id;
          const isGood = checked && opt.correct;
          const isBad = checked && isSel && !opt.correct;
          return (
            <label key={opt.id} className={`flex items-center gap-3 p-3 rounded-lg border-2 cursor-pointer transition-all ${isGood ? "border-green-500 bg-green-50" : isBad ? "border-red-400 bg-red-50" : isSel ? "border-[#695be6] bg-[#695be6]/5" : "border-slate-200 bg-white hover:border-[#695be6]/30"}`}>
              <input type="radio" name={`pq-${question.text.slice(0, 10)}`} className="hidden" disabled={checked} onChange={() => !checked && setSelected(opt.id)} />
              <div className={`size-5 rounded-full border-2 shrink-0 ${isSel ? "border-[#695be6] bg-[#695be6]" : "border-gray-300"}`} />
              <span className="text-sm font-medium">{opt.id}. {opt.text}</span>
              {checked && opt.correct && <span className="material-symbols-outlined text-green-600 ml-auto">check_circle</span>}
              {checked && isBad && <span className="material-symbols-outlined text-red-500 ml-auto">cancel</span>}
            </label>
          );
        })}
      </div>
      {!checked && <button onClick={handleCheck} disabled={!selected} className="w-full py-2 bg-[#695be6] text-white font-bold rounded-lg hover:bg-[#5a4dd4] transition-colors disabled:opacity-40">Check Answer</button>}
      {checked && correct && (
        <div className={`p-3 rounded-lg flex items-start gap-2 ${selected === correct.id ? "bg-green-50 border border-green-200" : "bg-red-50 border border-red-200"}`}>
          <span className={`material-symbols-outlined text-xl ${selected === correct.id ? "text-green-600" : "text-red-500"}`}>{selected === correct.id ? "check_circle" : "cancel"}</span>
          <p className={`text-sm font-medium ${selected === correct.id ? "text-green-800" : "text-red-700"}`}>
            {selected === correct.id ? "Correct! Well done." : `Not quite. The correct answer is ${correct.id}.`}
          </p>
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// EXAM-READY ANSWER BLOCK
// ─────────────────────────────────────────────────────────────
function ExamReadyAnswer({ examReady }) {
  return (
    <div className="mt-4 border-2 border-[#695be6]/30 rounded-xl overflow-hidden">
      <div className="bg-[#695be6] px-4 py-2.5 flex items-center gap-2">
        <span className="material-symbols-outlined text-white text-lg">workspace_premium</span>
        <span className="text-white font-bold text-sm uppercase tracking-wider">Exam-Ready Answer</span>
      </div>
      <div className="bg-white divide-y divide-slate-100">
        {examReady.directAnswer && (
          <div className="px-4 py-3">
            <p className="text-[10px] font-bold text-[#695be6] uppercase tracking-wider mb-1">Direct Answer</p>
            <p className="text-sm text-slate-800 font-medium" dangerouslySetInnerHTML={{ __html: renderMath(renderMarkdown(examReady.directAnswer)) }} />
          </div>
        )}
        {examReady.keyPoints?.length > 0 && (
          <div className="px-4 py-3">
            <p className="text-[10px] font-bold text-[#695be6] uppercase tracking-wider mb-2">Key Points</p>
            <ul className="space-y-1.5">
              {examReady.keyPoints.map((pt, i) => (
                <li key={i} className="flex items-start gap-2 text-sm text-slate-700">
                  <span className="material-symbols-outlined text-[#695be6] text-base mt-0.5 shrink-0">check_circle</span>
                  <span dangerouslySetInnerHTML={{ __html: renderMath(renderMarkdown(pt)) }} />
                </li>
              ))}
            </ul>
          </div>
        )}
        {examReady.examFormat && (
          <div className="px-4 py-3">
            <p className="text-[10px] font-bold text-[#695be6] uppercase tracking-wider mb-1">Exam Format</p>
            <p className="text-sm text-slate-700 leading-relaxed" dangerouslySetInnerHTML={{ __html: renderMath(renderMarkdown(examReady.examFormat)) }} />
          </div>
        )}
        {examReady.keywords?.length > 0 && (
          <div className="px-4 py-3">
            <p className="text-[10px] font-bold text-[#695be6] uppercase tracking-wider mb-2">Keywords to Use</p>
            <div className="flex flex-wrap gap-1.5">
              {examReady.keywords.map((kw, i) => (
                <span key={i} className="px-2.5 py-1 bg-[#695be6]/10 text-[#695be6] text-xs font-semibold rounded-full">{kw}</span>
              ))}
            </div>
          </div>
        )}
        {examReady.realLifeExample && (
          <div className="px-4 py-3 bg-amber-50">
            <p className="text-[10px] font-bold text-amber-600 uppercase tracking-wider mb-1 flex items-center gap-1">
              <span className="material-symbols-outlined text-sm">emoji_objects</span>Real-Life Example
            </p>
            <p className="text-sm text-amber-800 leading-relaxed" dangerouslySetInnerHTML={{ __html: renderMath(renderMarkdown(examReady.realLifeExample)) }} />
          </div>
        )}
      </div>
    </div>
  );
}

function TypingDots() {
  return (
    <div className="flex gap-4 items-start">
      <div className="size-8 rounded-full bg-white border border-slate-200 shrink-0 overflow-hidden">
        <img src={VIN_AVATAR} alt="LumiTutor" className="w-full h-full object-cover" />
      </div>
      <div className="bg-white border-l-4 border-[#D4C5F9] px-5 py-4 rounded-2xl rounded-tl-none shadow-sm flex items-center gap-1.5">
        {[0, 1, 2].map((i) => (
          <span key={i} className="size-2 bg-[#695be6]/40 rounded-full animate-bounce" style={{ animationDelay: `${i * 0.15}s` }} />
        ))}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// SESSION CARD — one card per full conversation thread
// ─────────────────────────────────────────────────────────────
function SessionCard({ item, active, onStar, onPin, onDelete, onRename, onClick }) {
  const badge = SUBJECT_BADGE[item.subject] || { bg: "bg-gray-100", text: "text-gray-600" };
  const date = item.updated_at || item.created_at;
  const [menuPos, setMenuPos] = useState(null); // {top, right} for fixed positioning
  const [renaming, setRenaming] = useState(false);
  const [renameVal, setRenameVal] = useState(item.title || item.question || "");
  const menuRef = useRef(null);
  const btnRef = useRef(null);

  // Close menu on outside click
  useEffect(() => {
    if (!menuPos) return;
    const handler = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target) &&
          btnRef.current && !btnRef.current.contains(e.target)) {
        setMenuPos(null);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [menuPos]);

  const openMenu = (e) => {
    e.stopPropagation();
    if (menuPos) { setMenuPos(null); return; }
    const rect = btnRef.current.getBoundingClientRect();
    setMenuPos({ top: rect.bottom + 4, right: window.innerWidth - rect.right });
  };

  const handleRenameSubmit = (e) => {
    e.preventDefault();
    if (renameVal.trim()) onRename(item.session_id, renameVal.trim());
    setRenaming(false);
  };

  return (
    <div onClick={!renaming ? onClick : undefined}
      className={`group p-4 border rounded-xl transition-all cursor-pointer ${active ? "bg-[#695be6]/5 border-[#695be6]/40 shadow-sm" : "bg-white border-slate-100 hover:border-[#6B5CE7]/30 hover:shadow-md"}`}>
      <div className="flex justify-between items-start mb-2">
        <div className="flex items-center gap-1.5">
          {item.pinned && <span className="material-symbols-outlined text-[#695be6] text-sm" style={{ fontVariationSettings: "'FILL' 1" }}>keep</span>}
          <span className={`px-2 py-0.5 text-[10px] font-bold rounded uppercase ${badge.bg} ${badge.text}`}>{item.subject}</span>
        </div>
        <span className="text-[10px] text-slate-400 font-medium">{date ? new Date(date).toLocaleDateString() : ""}</span>
      </div>

      {renaming ? (
        <form onSubmit={handleRenameSubmit} onClick={(e) => e.stopPropagation()} className="mb-2">
          <input
            autoFocus
            value={renameVal}
            onChange={(e) => setRenameVal(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Escape") setRenaming(false); }}
            className="w-full text-sm border border-[#695be6]/40 rounded-lg px-2 py-1 focus:outline-none focus:ring-2 focus:ring-[#695be6]/30"
          />
          <div className="flex gap-1 mt-1">
            <button type="submit" className="text-[10px] font-bold text-white bg-[#695be6] px-2 py-0.5 rounded">Save</button>
            <button type="button" onClick={() => setRenaming(false)} className="text-[10px] font-bold text-slate-500 px-2 py-0.5 rounded hover:bg-slate-100">Cancel</button>
          </div>
        </form>
      ) : (
        <p className="text-sm text-slate-700 font-medium line-clamp-2 mb-2">{item.title || item.question}</p>
      )}

      <div className="flex justify-between items-center">
        <span className="text-[11px] text-slate-400 flex items-center gap-1">
          <span className="material-symbols-outlined text-xs">chat_bubble</span>
          {item.turn_count || 1} message{(item.turn_count || 1) !== 1 ? "s" : ""}
        </span>
        <div className="flex items-center gap-0.5">
          <button onClick={(e) => { e.stopPropagation(); onStar(item.session_id); }}
            className={`transition-colors p-1 rounded ${item.starred ? "text-amber-400" : "text-slate-300 hover:text-amber-400"}`}>
            <span className="material-symbols-outlined text-lg" style={{ fontVariationSettings: item.starred ? "'FILL' 1" : "'FILL' 0" }}>star</span>
          </button>
          <button ref={btnRef} onClick={openMenu}
            className="p-1 rounded text-slate-300 hover:text-slate-600 hover:bg-slate-100 transition-colors">
            <span className="material-symbols-outlined text-lg">more_vert</span>
          </button>
        </div>
      </div>

      {/* Fixed-position dropdown — escapes overflow:hidden/auto parents */}
      {menuPos && (
        <div ref={menuRef} onClick={(e) => e.stopPropagation()}
          style={{ position: "fixed", top: menuPos.top, right: menuPos.right, zIndex: 9999 }}
          className="w-44 bg-white border border-slate-200 rounded-xl shadow-xl overflow-hidden">
          <button onClick={() => { onPin(item.session_id); setMenuPos(null); }}
            className="w-full flex items-center gap-2 px-3 py-2.5 text-xs text-slate-700 hover:bg-slate-50 transition-colors">
            <span className="material-symbols-outlined text-sm">keep</span>
            {item.pinned ? "Unpin" : "Pin to top"}
          </button>
          <button onClick={() => { setRenameVal(item.title || item.question || ""); setRenaming(true); setMenuPos(null); }}
            className="w-full flex items-center gap-2 px-3 py-2.5 text-xs text-slate-700 hover:bg-slate-50 transition-colors">
            <span className="material-symbols-outlined text-sm">edit</span>
            Rename
          </button>
          <div className="border-t border-slate-100" />
          <button onClick={() => { onDelete(item.session_id); setMenuPos(null); }}
            className="w-full flex items-center gap-2 px-3 py-2.5 text-xs text-red-500 hover:bg-red-50 transition-colors">
            <span className="material-symbols-outlined text-sm">delete</span>
            Delete
          </button>
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// MAIN LUMITUTOR PAGE
// ─────────────────────────────────────────────────────────────
export default function VinAI() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const bottomRef = useRef(null);
  const textareaRef = useRef(null);
  const sidebarRef = useRef(null);
  const fileInputRef = useRef(null);
  const chatHistoryRef = useRef([]);
  const recognitionRef = useRef(null);

  const sessions = useSelector(selectSessions);
  const sessionsStatus = useSelector(selectSessionsStatus);
  const loadedSessionId = useSelector(selectLoadedSessionId);
  const loadedTurns = useSelector(selectLoadedTurns);
  const loadSessionStatus = useSelector(selectLoadSessionStatus);
  const userProfile = useSelector(selectUserProfile);

  // ── local state ──
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [status, setStatus] = useState("idle"); // idle | thinking | streaming
  const [sessionId, setSessionId] = useState(() => newSessionId());
  const [subjFilter, setSubjFilter] = useState("All");
  const [search, setSearch] = useState("");
  const [uploadStatus, setUploadStatus] = useState("idle");
  const [uploadedImages, setUploadedImages] = useState([]);
  const [showSidebar, setShowSidebar] = useState(true);
  const [showMobileHistory, setShowMobileHistory] = useState(false);
  const [interactionCount, setInteractionCount] = useState(0);
  const [showMediaPanel, setShowMediaPanel] = useState(false);
  const [mediaQuery, setMediaQuery] = useState("");
  const [mediaMode, setMediaMode] = useState("images");
  const [isListening, setIsListening] = useState(false);

  const grade = userProfile?.grade || userProfile?.class_name || user?.grade || user?.class_name || "";
  const board = userProfile?.board || user?.board || "CBSE";

  useEffect(() => { dispatch(fetchSessions()); dispatch(fetchMe()); }, [dispatch]);
  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages, status]);

  // ── When a session is loaded from sidebar, rebuild messages from all turns ──
  useEffect(() => {
    if (loadSessionStatus !== "succeeded") return;

    // Session exists but has no turns saved (e.g. old draft-only sessions)
    if (!loadedTurns.length) {
      setMessages([]);
      chatHistoryRef.current = [];
      setInteractionCount(0);
      setSessionId(loadedSessionId);
      setStatus("idle");
      setShowMobileHistory(false);
      return;
    }

    const rebuilt = [];
    for (const turn of loadedTurns) {
      rebuilt.push({ id: `${turn._id}-u`, role: "user", text: turn.question });
      rebuilt.push({ id: `${turn._id}-a`, role: "assistant", xmlBuffer: turn.full_xml, done: true });
    }
    setMessages(rebuilt);

    chatHistoryRef.current = loadedTurns.flatMap((t) => [
      { role: "user", content: t.question },
      { role: "assistant", content: t.full_xml },
    ]);

    setInteractionCount(loadedTurns.length);
    setSessionId(loadedTurns[0].session_id || loadedSessionId);
    setStatus("idle");
    setShowMobileHistory(false);
  }, [loadSessionStatus, loadedTurns, loadedSessionId]);

  // ── Start a brand-new chat ──
  const startNewChat = useCallback(() => {
    if (status !== "idle") return;
    setMessages([]);
    setInput("");
    setInteractionCount(0);
    chatHistoryRef.current = [];
    setSessionId(newSessionId());
    dispatch(clearLoadedSession());
    setShowMobileHistory(false);
    textareaRef.current?.focus();
  }, [status, dispatch]);

  // ── SSE streaming helper ──
  const streamSSE = useCallback(async (url, body, assistantId) => {
    const authToken = JSON.parse(localStorage.getItem("vin_auth") || "{}")?.token;
    const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}${url}`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "Authorization": `Bearer ${authToken}` },
      body: JSON.stringify(body),
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let xmlBuf = "";
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      const lines = decoder.decode(value, { stream: true }).split("\n");
      for (const line of lines) {
        if (!line.startsWith("data: ")) continue;
        const data = line.slice(6);
        if (data === "[DONE]") {
          setMessages((p) => p.map((m) => m.id === assistantId ? { ...m, done: true } : m));
          setInteractionCount((c) => c + 1);
          dispatch(fetchSessions());
          setStatus("idle");
          return xmlBuf;
        }
        xmlBuf += data.replace(/\\n/g, "\n");
        setMessages((p) => p.map((m) => m.id === assistantId ? { ...m, xmlBuffer: xmlBuf } : m));
      }
    }
    return xmlBuf;
  }, [dispatch]);

  // ── Send message ──
  const sendMessage = useCallback(async (text) => {
    const trimmed = text.trim();
    if (!trimmed || status !== "idle") return;
    setMessages((p) => [...p, { id: Date.now(), role: "user", text: trimmed }]);
    setInput("");
    setStatus("thinking");
    chatHistoryRef.current = [...chatHistoryRef.current.slice(-20), { role: "user", content: trimmed }];
    const assistantId = Date.now() + 1;
    setMessages((p) => [...p, { id: assistantId, role: "assistant", xmlBuffer: "", done: false }]);
    setTimeout(() => setStatus("streaming"), 300);
    try {
      const xmlBuf = await streamSSE("/vin-ai/chat", {
        message: trimmed,
        history: chatHistoryRef.current,
        session_id: sessionId,
      }, assistantId);
      chatHistoryRef.current = [...chatHistoryRef.current, { role: "assistant", content: xmlBuf }];
    } catch (err) {
      console.error("Stream error:", err);
      const errXml = `<response><subject>General</subject><content>Sorry, something went wrong. Please try again.</content><followups><followup>Try again</followup></followups></response>`;
      setMessages((p) => p.map((m) => m.id === assistantId ? { ...m, xmlBuffer: errXml, done: true } : m));
      setStatus("idle");
    }
  }, [status, streamSSE, sessionId]);

  const handleRequestExamReady = useCallback(async () => {
    if (status !== "idle") return;

    // Find the last assistant message to inject exam_ready into
    const lastAssistantMsg = [...messages].reverse().find((m) => m.role === "assistant" && m.done);
    if (!lastAssistantMsg) return;

    // Build context from the last user message
    const lastUserMsg = [...messages].reverse().find((m) => m.role === "user");
    const topic = lastUserMsg?.text || "the topic we just discussed";

    setStatus("streaming");

    const authToken = JSON.parse(localStorage.getItem("vin_auth") || "{}")?.token;
    try {
      const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/vin-ai/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${authToken}` },
        body: JSON.stringify({
          message: `[EXAM_READY_REQUEST] Give ONLY the <exam_ready> block for: ${topic}. No <content>, no <hint>, no <question>. Just the <exam_ready> tag with direct_answer, key_points, exam_format, keywords, and real_life_example. Wrap in <response><subject>...</subject><content></content><exam_ready>...</exam_ready><media_query>...</media_query><followups></followups></response>`,
          history: chatHistoryRef.current,
          session_id: sessionId,
        }),
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let newXml = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const lines = decoder.decode(value, { stream: true }).split("\n");
        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          const data = line.slice(6);
          if (data === "[DONE]") {
            // Merge exam_ready from newXml into the existing last assistant message
            const examReadyMatch = newXml.match(/<exam_ready>([\s\S]*?)<\/exam_ready>/);
            if (examReadyMatch) {
              const injected = lastAssistantMsg.xmlBuffer.includes("</response>")
                ? lastAssistantMsg.xmlBuffer.replace("</response>", `<exam_ready>${examReadyMatch[1]}</exam_ready></response>`)
                : lastAssistantMsg.xmlBuffer + `<exam_ready>${examReadyMatch[1]}</exam_ready>`;
              setMessages((p) => p.map((m) => m.id === lastAssistantMsg.id ? { ...m, xmlBuffer: injected } : m));
            }
            setStatus("idle");
            return;
          }
          newXml += data.replace(/\\n/g, "\n");
          // Live-stream the exam_ready block into the existing message as it arrives
          const partialExamReady = newXml.match(/<exam_ready>([\s\S]*)/);
          if (partialExamReady) {
            const partial = lastAssistantMsg.xmlBuffer.includes("<exam_ready>")
              ? lastAssistantMsg.xmlBuffer.replace(/<exam_ready>[\s\S]*/, `<exam_ready>${partialExamReady[1]}`)
              : lastAssistantMsg.xmlBuffer.replace("</response>", `<exam_ready>${partialExamReady[1]}</response>`);
            setMessages((p) => p.map((m) => m.id === lastAssistantMsg.id ? { ...m, xmlBuffer: partial } : m));
          }
        }
      }
    } catch (err) {
      console.error("Exam ready error:", err);
      setStatus("idle");
    }
  }, [status, messages, sessionId]);

  const handleAnswerQuestion = useCallback(async (questionText, chosenText, isCorrect) => {
    const assistantId = Date.now();
    setMessages((p) => [...p, { id: assistantId, role: "assistant", xmlBuffer: "", done: false }]);
    setStatus("streaming");
    try {
      const xmlBuf = await streamSSE("/vin-ai/answer", {
        question: questionText, chosen: chosenText, correct: isCorrect,
        history: chatHistoryRef.current, session_id: sessionId,
      }, assistantId);
      chatHistoryRef.current = [...chatHistoryRef.current, { role: "assistant", content: xmlBuf }];
    } catch (err) {
      console.error("Answer stream error:", err);
      setStatus("idle");
    }
  }, [streamSSE, sessionId]);

  const toggleStar = (sid) => {
    dispatch(optimisticToggleStar(sid));
    dispatch(toggleSessionStar(sid));
  };

  const togglePin = (sid) => {
    dispatch(optimisticTogglePin(sid));
    dispatch(pinSession(sid));
  };

  const handleDelete = useCallback((sid) => {
    if (!window.confirm("Delete this chat? This cannot be undone.")) return;
    dispatch(deleteSession(sid));
  }, [dispatch]);

  const handleRename = useCallback((sid, title) => {
    dispatch(optimisticRename({ sessionId: sid, title }));
    dispatch(renameSession({ sessionId: sid, title }));
  }, [dispatch]);

  const handleLoadSession = useCallback(async (sid) => {
    if (status !== "idle") return;
    
    if (messages.length > 0 && !loadedSessionId) {
      try {
        const authToken = JSON.parse(localStorage.getItem("vin_auth") || "{}")?.token;
        if (authToken) {
          let subject = "General";
          for (const msg of messages) {
            if (msg.role === "assistant" && msg.xmlBuffer) {
              const subjectMatch = msg.xmlBuffer.match(/<subject>([^<]+)<\/subject>/);
              if (subjectMatch) { subject = subjectMatch[1]; break; }
            }
          }
          await fetch(`${import.meta.env.VITE_API_BASE_URL}/vin-ai/save-draft`, {
            method: "POST",
            headers: { "Content-Type": "application/json", "Authorization": `Bearer ${authToken}` },
            body: JSON.stringify({
              session_id: sessionId,
              messages: messages.map(m => ({ role: m.role, text: m.text, xmlBuffer: m.xmlBuffer })),
              subject,
            }),
          });
          dispatch(fetchSessions());
        }
      } catch (err) {
        console.error("Error saving draft:", err);
      }
    }
    dispatch(loadSession(sid));
  }, [status, messages, loadedSessionId, sessionId, dispatch]);

  const [voiceError, setVoiceError] = useState("");

  // ── Voice input via Web Speech API ──
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const audioContextRef = useRef(null);
  const processorRef = useRef(null);
  const recordingStateRef = useRef(false);

  const toggleVoice = useCallback(async () => {
    if (isListening) {
      recordingStateRef.current = false;
      if (mediaRecorderRef.current?.mediaRecorder) {
        const mr = mediaRecorderRef.current.mediaRecorder;
        // Request any buffered data before stopping so onstop gets a full blob
        if (mr.state === "recording") mr.requestData();
        mr.stop();
      }
      return;
    }

    setVoiceError("");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true }
      });
      
      // Pick best supported mimeType
      const mimeType = [
        "audio/webm;codecs=opus",
        "audio/webm",
        "audio/ogg;codecs=opus",
        "",
      ].find((m) => !m || MediaRecorder.isTypeSupported(m));
      
      const mediaRecorder = new MediaRecorder(stream, mimeType ? { mimeType } : {});
      audioChunksRef.current = [];
      recordingStateRef.current = true;
      
      // Collect data every 250ms so we always have chunks even for short recordings
      mediaRecorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) audioChunksRef.current.push(event.data);
      };
      
      mediaRecorder.onstop = () => {
        processRecording(stream, mediaRecorder, mimeType || "audio/webm");
      };
      
      mediaRecorder.start(250); // timeslice = collect data every 250ms
      mediaRecorderRef.current = { stream, mediaRecorder };
      setIsListening(true);
    } catch (err) {
      console.error("[VOICE] Microphone error:", err);
      setVoiceError("Microphone access failed: " + err.message);
      setIsListening(false);
    }
  }, [isListening]);

  const processRecording = useCallback((stream, mediaRecorder, mimeType) => {
    recordingStateRef.current = false;
    stream.getTracks().forEach(t => { try { t.stop(); } catch (e) {} });
    
    const webmBlob = new Blob(audioChunksRef.current, { type: mimeType || "audio/webm" });
    
    if (webmBlob.size < 500) {
      setVoiceError("Recording too short. Please speak for at least 1-2 seconds.");
      setIsListening(false);
      return;
    }
    
    const formData = new FormData();
    formData.append("file", webmBlob, "voice.webm");
    
    (async () => {
      try {
        const authToken = JSON.parse(localStorage.getItem("vin_auth") || "{}")?.token;
        if (!authToken) { setVoiceError("Auth token not found"); return; }
        
        const res = await fetch(`${import.meta.env.VITE_API_BASE_URL}/vin-ai/transcribe`, {
          method: "POST",
          headers: { Authorization: `Bearer ${authToken}` },
          body: formData,
        });
        
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        
        const { text, error } = await res.json();
        if (error) {
          setVoiceError(`Transcription error: ${error}`);
        } else if (text?.trim()) {
          setInput((prev) => prev ? prev + " " + text.trim() : text.trim());
        } else {
          setVoiceError("No speech detected. Please check your microphone and speak clearly.");
        }
      } catch (err) {
        setVoiceError("Transcription failed: " + err.message);
      }
      setIsListening(false);
    })();
  }, []);

  // ── Image upload ──
  const handleUploadProblem = () => fileInputRef.current?.click();

  const uploadFiles = useCallback(async (files) => {
    if (!files.length) return;
    const toUpload = files.slice(0, 10 - uploadedImages.length);
    if (!toUpload.length) return;
    setUploadStatus("uploading");
    try {
      const formData = new FormData();
      toUpload.forEach((f) => formData.append("files", f));
      formData.append("folder", "vin-problems");
      const { data } = await api.post("/storage/upload-multiple", formData, { headers: { "Content-Type": "multipart/form-data" } });
      const newImages = data.files.map((f, i) => ({ url: f.url, filename: f.filename, preview: URL.createObjectURL(toUpload[i]) }));
      setUploadedImages((prev) => [...prev, ...newImages]);
      setUploadStatus("idle");
      setTimeout(() => textareaRef.current?.focus(), 100);
    } catch {
      setUploadStatus("error");
      setTimeout(() => setUploadStatus("idle"), 3000);
    }
  }, [uploadedImages]);

  const handleFileChange = useCallback(async (e) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;
    e.target.value = "";
    await uploadFiles(files);
  }, [uploadFiles]);

  // ── Clipboard paste (Ctrl+V image) ──
  const handlePaste = useCallback((e) => {
    const items = Array.from(e.clipboardData?.items || []);
    const imageFiles = items
      .filter((item) => item.kind === "file" && item.type.startsWith("image/"))
      .map((item) => item.getAsFile())
      .filter(Boolean);
    if (!imageFiles.length) return;
    e.preventDefault();
    uploadFiles(imageFiles);
  }, [uploadFiles]);

  const handleSendImages = useCallback((customText) => {
    if (!uploadedImages.length || status !== "idle") return;
    const urls = uploadedImages.map((img) => img.url).join(", ");
    const count = uploadedImages.length;
    const imageRef = count === 1 ? "a problem image" : `${count} problem images`;
    const text = customText?.trim()
      ? `${customText.trim()} [IMAGE_UPLOAD] Image URL${count > 1 ? "s" : ""}: ${urls}`
      : `I've uploaded ${imageRef}. Please help me solve it. [IMAGE_UPLOAD] Image URL${count > 1 ? "s" : ""}: ${urls}`;
    sendMessage(text);
    uploadedImages.forEach((img) => URL.revokeObjectURL(img.preview));
    setUploadedImages([]);
    setInput("");
  }, [uploadedImages, status, sendMessage]);

  const removeUploadedImage = (idx) => {
    setUploadedImages((prev) => { URL.revokeObjectURL(prev[idx].preview); return prev.filter((_, i) => i !== idx); });
  };

  const handleFormulaHelp = () => {
    setInput("Can you show me the key formulas I need to know for this topic and explain how to use them?");
    textareaRef.current?.focus();
  };

  const handlePastLessons = () => {
    if (sidebarRef.current) sidebarRef.current.scrollTo({ top: 0, behavior: "smooth" });
    else setShowMobileHistory(true);
  };

  const openMediaPanel = (mode = "images", overrideQuery = null) => {
    let topic = overrideQuery || "";
    if (!topic) {
      // Build context-aware query from the full conversation
      const INTERNAL = /^\[(EXAM_READY_REQUEST|IMAGE_UPLOAD)\]/;
      const FILLER = /^(how to|what is|what are|what's|explain|define|tell me|show me|give me|can you|is|are|does|do|i want|please|help me with)\b\s*/i;

      // Get last assistant's subject (most specific to current turn)
      let lastSubject = "";
      let firstSubject = "";
      const assistantMsgs = messages.filter(m => m.role === "assistant" && m.xmlBuffer);
      for (let i = assistantMsgs.length - 1; i >= 0; i--) {
        const sm = assistantMsgs[i].xmlBuffer.match(/<subject>([^<]+)<\/subject>/);
        if (sm && sm[1].trim()) { lastSubject = sm[1].trim(); break; }
      }
      if (assistantMsgs[0]?.xmlBuffer) {
        const fm = assistantMsgs[0].xmlBuffer.match(/<subject>([^<]+)<\/subject>/);
        if (fm) firstSubject = fm[1].trim();
      }

      // Last assistant's media_query as base
      let lastMediaQuery = "";
      for (let i = messages.length - 1; i >= 0; i--) {
        const msg = messages[i];
        if (msg.role === "assistant" && msg.xmlBuffer) {
          const mq = msg.xmlBuffer.match(/<media_query>([^<]+)<\/media_query>/);
          if (mq && mq[1].trim()) { lastMediaQuery = mq[1].trim(); break; }
        }
      }

      // Last real user message cleaned up
      const lastUserText = messages
        .filter(m => m.role === "user" && !INTERNAL.test(m.text || ""))
        .at(-1)?.text || "";
      const cleanUserText = lastUserText.replace(FILLER, "").replace(/\?.*$/s, "").trim();

      // Prefer last subject if it differs from first (sub-topic drift)
      if (lastSubject && firstSubject && lastSubject.toLowerCase() !== firstSubject.toLowerCase()) {
        topic = lastSubject;
      } else if (firstSubject && cleanUserText && cleanUserText.length > 3 &&
          !cleanUserText.toLowerCase().includes(firstSubject.toLowerCase())) {
        topic = `${firstSubject} ${cleanUserText}`.slice(0, 60);
      } else {
        topic = lastSubject || firstSubject || lastMediaQuery || cleanUserText;
      }
    }
    setMediaQuery(topic.trim());
    setShowMediaPanel(true);
    setMediaMode(mode);
  };

  const filteredSessions = sessions
    .filter((s) => {
      const matchSubj = subjFilter === "All" || s.subject === subjFilter;
      const matchSearch = !search || s.title?.toLowerCase().includes(search.toLowerCase()) || s.subject?.toLowerCase().includes(search.toLowerCase());
      return matchSubj && matchSearch;
    })
    .sort((a, b) => (b.pinned ? 1 : 0) - (a.pinned ? 1 : 0));

  const statusLabel =
    status === "thinking" ? "LumiTutor is thinking..." :
    status === "streaming" ? "LumiTutor is typing..." :
    loadSessionStatus === "loading" ? "Loading conversation..." :
    "LumiTutor is here to help";

  const isViewingHistory = !!loadedSessionId && loadedTurns.length > 0 && messages.length > 0;

  return (
    <div className="h-screen flex overflow-hidden bg-[#f6f6f8]" style={{ fontFamily: "'Lexend', sans-serif" }}>
      {/* ── Chat column ── */}
      <div className="flex-1 flex flex-col h-full overflow-hidden relative">
        <header className="h-16 shrink-0 flex items-center justify-between px-6 shadow-md z-10"
          style={{ background: "linear-gradient(90deg, #6B5CE7 0%, #D4C5F9 100%)" }}>
          <div className="flex items-center gap-4">
            <button onClick={() => navigate("/student")} className="text-white hover:bg-white/10 p-1 rounded-full transition-colors">
              <span className="material-symbols-outlined">arrow_back</span>
            </button>
            <div className="flex items-center gap-3">
              <div className="relative">
                <div className="size-10 rounded-full border-2 border-white/50 bg-white overflow-hidden">
                  <img src={VIN_AVATAR} alt="LumiTutor" className="w-full h-full object-cover" />
                </div>
                <div className="absolute bottom-0 right-0 size-3 bg-green-400 border-2 border-white rounded-full" />
              </div>
              <div>
                <h1 className="text-white font-bold text-base leading-tight">LumiTutor</h1>
                <p className={`text-white/80 text-xs font-medium ${status !== "idle" ? "animate-pulse" : ""}`}>{statusLabel}</p>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={startNewChat} disabled={status !== "idle"}
              className="hidden sm:flex items-center gap-1.5 bg-white/20 hover:bg-white/30 text-white text-xs font-bold px-3 py-1.5 rounded-full transition-colors disabled:opacity-40">
              <span className="material-symbols-outlined text-sm">add</span>New Chat
            </button>
            <button onClick={() => setShowMobileHistory(true)} className="lg:hidden text-white hover:bg-white/10 p-2 rounded-full transition-colors" title="Chat History">
              <span className="material-symbols-outlined">history_edu</span>
            </button>
          </div>
        </header>

        {isViewingHistory && (
          <div className="bg-amber-50 border-b border-amber-200 px-4 py-2 flex items-center justify-between shrink-0">
            <p className="text-xs text-amber-700 font-medium flex items-center gap-1.5">
              <span className="material-symbols-outlined text-sm">history</span>
              Viewing a past conversation
            </p>
            <button onClick={startNewChat} className="text-xs font-bold text-[#695be6] hover:underline flex items-center gap-1">
              <span className="material-symbols-outlined text-sm">add_circle</span>Start New Chat
            </button>
          </div>
        )}

        <main className="flex-1 overflow-y-auto px-4 py-8" style={{ scrollbarWidth: "thin" }}>
          <div className="max-w-4xl mx-auto flex flex-col gap-8">
            {messages.length === 0 && (
              <div className="flex flex-col items-center text-center py-10 gap-4">
                <div className="size-20 rounded-full bg-white border-2 border-[#695be6]/20 overflow-hidden shadow-lg">
                  <img src={VIN_AVATAR} alt="LumiTutor" className="w-full h-full object-cover" />
                </div>
                <div>
                  <h2 className="text-2xl font-black text-slate-800">Hi {getFirstName(user?.name) || "there"}, I'm LumiTutor!</h2>
                  <p className="text-slate-500 mt-1 text-sm">Your AI tutor — ask me anything about your subjects.</p>
                </div>
                <div className="flex flex-wrap justify-center gap-2 mt-2">
                  {["How do I solve quadratic equations?", "Explain Newton's Third Law", "What is photosynthesis?"].map((s) => (
                    <button key={s} onClick={() => sendMessage(s)}
                      className="px-4 py-2 bg-white border border-slate-200 rounded-full text-sm text-slate-600 hover:border-[#695be6]/40 hover:text-[#695be6] transition-colors shadow-sm">{s}</button>
                  ))}
                </div>
              </div>
            )}

            {messages.map((msg, idx) => (
              <div key={msg.id}>
                {msg.role === "user" ? (
                  <div className="flex justify-end items-end gap-3">
                    <div className="flex flex-col gap-1 items-end max-w-[80%]">
                      <p className="text-slate-500 text-xs font-medium mr-2">You</p>
                      <div className="bg-[#695be6] text-white px-5 py-3 rounded-2xl rounded-tr-none shadow-sm">
                        <p className="text-sm md:text-base">{msg.text}</p>
                      </div>
                    </div>
                    <div className="size-8 rounded-full bg-slate-200 overflow-hidden mb-1 shrink-0">
                      {user?.avatar
                        ? <img src={user.avatar} alt="you" className="w-full h-full object-cover" />
                        : <div className="w-full h-full bg-[#695be6] flex items-center justify-center text-white text-xs font-bold">{getInitial(user?.name) ?? "S"}</div>
                      }
                    </div>
                  </div>
                ) : (
                  <div className="flex justify-start items-start gap-3">
                    <div className="size-8 rounded-full bg-white overflow-hidden mt-1 shrink-0 border border-slate-200">
                      <img src={VIN_AVATAR} alt="LumiTutor" className="w-full h-full object-cover" />
                    </div>
                    <div className="flex flex-col gap-2 max-w-[85%]">
                      <p className="text-slate-500 text-xs font-medium ml-1">LumiTutor</p>
                      <div className="bg-white border-l-4 border-[#D4C5F9] p-5 rounded-2xl rounded-tl-none shadow-sm">
                        <StreamingMessage
                          xmlBuffer={msg.xmlBuffer}
                          done={msg.done}
                          onFollowup={sendMessage}
                          onAnswerQuestion={handleAnswerQuestion}
                          onRequestExamReady={handleRequestExamReady}
                          interactionCount={interactionCount}
                          grade={grade}
                          board={board}
                          onExpandMedia={(q, mode) => openMediaPanel(mode, q)}
                          isHistoric={isViewingHistory}
                          isLoadingExamReady={status === "streaming" && msg.id === messages.filter(m => m.role === "assistant").at(-1)?.id}
                          msgIndex={idx}
                          allMessages={messages}
                        />
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ))}

            {status === "thinking" && <TypingDots />}
            <div ref={bottomRef} />
          </div>
        </main>

        <footer className="bg-white border-t border-slate-200 p-4 shrink-0">
          <div className="max-w-4xl mx-auto space-y-3">
            {uploadedImages.length > 0 && (
              <div className="bg-gradient-to-r from-[#695be6]/5 to-emerald-50 border border-[#695be6]/20 rounded-xl p-3">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-xs font-bold text-[#695be6] uppercase tracking-wider flex items-center gap-1.5">
                    <span className="material-symbols-outlined text-sm">attach_file</span>
                    {uploadedImages.length} image{uploadedImages.length > 1 ? "s" : ""} attached
                  </p>
                  <button onClick={() => { uploadedImages.forEach((img) => URL.revokeObjectURL(img.preview)); setUploadedImages([]); }} className="text-xs text-red-500 hover:underline font-medium">Clear all</button>
                </div>
                <div className="grid grid-cols-5 gap-2 mb-3">
                  {uploadedImages.map((img, idx) => (
                    <div key={idx} className="relative group">
                      <img src={img.preview} alt={img.filename} className="w-full aspect-square object-cover rounded-lg border border-slate-200" />
                      <button onClick={() => removeUploadedImage(idx)} className="absolute -top-1 -right-1 size-5 bg-red-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow-lg">
                        <span className="material-symbols-outlined text-xs">close</span>
                      </button>
                    </div>
                  ))}
                  {uploadedImages.length < 10 && (
                    <button onClick={handleUploadProblem} className="aspect-square rounded-lg border-2 border-dashed border-[#695be6]/30 bg-[#695be6]/5 hover:bg-[#695be6]/10 transition-colors flex items-center justify-center">
                      <span className="material-symbols-outlined text-[#695be6] text-2xl">add_photo_alternate</span>
                    </button>
                  )}
                </div>
                <p className="text-[11px] text-slate-400 mb-2 flex items-center gap-1">
                  <span className="material-symbols-outlined text-xs">info</span>
                  Type your question below, or use the shortcut:
                </p>
                <button onClick={() => handleSendImages()} disabled={status !== "idle"}
                  className="w-full py-2 border border-[#695be6]/40 text-[#695be6] text-xs font-bold rounded-lg hover:bg-[#695be6]/5 disabled:opacity-40 transition-colors flex items-center justify-center gap-1.5">
                  <span className="material-symbols-outlined text-sm">auto_fix_high</span>
                  Solve this problem for me
                </button>
              </div>
            )}
            <input ref={fileInputRef} type="file" accept="image/*,.heic,.heif,application/pdf" multiple className="hidden" onChange={handleFileChange} />
            <div className="flex gap-2 flex-wrap">
              {QUICK_ACTIONS.map((qa) => {
                const isUploading = qa.id === "qa1" && uploadStatus === "uploading";
                const isError = qa.id === "qa1" && uploadStatus === "error";
                const hasImages = qa.id === "qa1" && uploadedImages.length > 0;
                const handler = qa.id === "qa1" ? handleUploadProblem : qa.id === "qa2" ? handleFormulaHelp : handlePastLessons;
                return (
                  <button key={qa.id} onClick={handler} disabled={isUploading}
                    className={`px-3 py-1 rounded-md text-xs font-semibold flex items-center gap-1 transition-colors ${isError ? "bg-red-100 text-red-600" : hasImages ? "bg-[#695be6] text-white" : "bg-[#695be6]/10 text-[#695be6] hover:bg-[#695be6]/20"} disabled:opacity-50`}>
                    <span className="material-symbols-outlined text-sm">{isUploading ? "progress_activity" : isError ? "error" : qa.icon}</span>
                    {isUploading ? "Uploading..." : isError ? "Upload failed" : hasImages ? `Add more (${uploadedImages.length}/10)` : qa.label}
                  </button>
                );
              })}
              {interactionCount >= 1 && (
                <>
                  <button onClick={() => openMediaPanel("images")} className="px-3 py-1 rounded-md text-xs font-semibold flex items-center gap-1 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 transition-colors">
                    <span className="material-symbols-outlined text-sm">image_search</span>Get Images
                  </button>
                  <button onClick={() => openMediaPanel("videos")} className="px-3 py-1 rounded-md text-xs font-semibold flex items-center gap-1 bg-red-50 text-red-600 hover:bg-red-100 transition-colors">
                    <span className="material-symbols-outlined text-sm">play_circle</span>Get Videos
                  </button>
                </>
              )}
            </div>
            <div className="flex items-end gap-3 bg-slate-50 border border-slate-200 rounded-xl p-2 pr-3">
              <textarea ref={textareaRef} rows={1} value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    if (uploadedImages.length > 0) handleSendImages(input);
                    else sendMessage(input);
                  }
                }}
                onPaste={handlePaste}
                placeholder={uploadedImages.length > 0 ? "Ask about this image, or leave blank to solve it..." : isViewingHistory ? "Continue this conversation..." : "Ask your doubt or paste an image..."}
                className="w-full bg-transparent border-none focus:ring-0 text-slate-800 text-sm md:text-base py-2 resize-none max-h-32"
                style={{ scrollbarWidth: "thin" }} />
              <button onClick={toggleVoice} title={isListening ? "Click to stop" : "Click to speak"}
                className={`size-10 flex items-center justify-center rounded-lg transition-all shrink-0 ${isListening ? "bg-red-500 text-white animate-pulse shadow-lg shadow-red-200" : "bg-slate-100 text-slate-500 hover:bg-slate-200"}`}>
                <span className="material-symbols-outlined text-[20px]">{isListening ? "mic" : "mic_none"}</span>
              </button>
              <button
                onClick={() => uploadedImages.length > 0 ? handleSendImages(input) : sendMessage(input)}
                disabled={(!input.trim() && uploadedImages.length === 0) || status !== "idle"}
                className="bg-[#695be6] text-white size-10 flex items-center justify-center rounded-lg hover:bg-[#695be6]/90 transition-transform active:scale-95 shrink-0 shadow-sm disabled:opacity-40">
                <span className="material-symbols-outlined">send</span>
              </button>
            </div>
            <p className="text-[10px] text-center text-slate-400">LumiTutor can make mistakes. Verify important information.</p>
            {voiceError && (
              <p className="text-[11px] text-center text-red-500 font-medium">{voiceError}</p>
            )}
          </div>
        </footer>

        {showMediaPanel && (
          <div className="absolute inset-x-0 bottom-0 z-40 flex flex-col" style={{ height: "60%", maxHeight: "480px" }}>
            <div className="absolute inset-0 bg-black/20" onClick={() => setShowMediaPanel(false)} />
            <div className="relative mt-auto bg-white rounded-t-2xl shadow-2xl border-t border-slate-200 flex flex-col overflow-hidden" style={{ height: "100%" }}>
              <MediaPanel query={mediaQuery} grade={grade} board={board} defaultTab={mediaMode} onClose={() => setShowMediaPanel(false)} />
            </div>
          </div>
        )}
      </div>

      {/* ── Sidebar toggle tab (when closed) ── */}
      {!showSidebar && (
        <button onClick={() => setShowSidebar(true)}
          className="hidden lg:flex fixed right-0 top-1/2 -translate-y-1/2 z-30 flex-col items-center gap-1 bg-white border border-slate-200 border-r-0 shadow-lg rounded-l-2xl px-2 py-4 hover:bg-[#695be6] hover:border-[#695be6] group transition-all duration-200">
          <span className="material-symbols-outlined text-[#695be6] group-hover:text-white transition-colors text-xl" style={{ fontVariationSettings: "'FILL' 1" }}>history_edu</span>
          {filteredSessions.length > 0 && (
            <span className="bg-[#695be6] group-hover:bg-white text-white group-hover:text-[#695be6] text-[9px] font-black rounded-full w-5 h-5 flex items-center justify-center transition-colors">
              {filteredSessions.length > 99 ? "99+" : filteredSessions.length}
            </span>
          )}
          <span className="text-[#695be6] group-hover:text-white transition-colors font-bold" style={{ writingMode: "vertical-rl", fontSize: "9px", letterSpacing: "0.12em", textTransform: "uppercase" }}>History</span>
          <span className="material-symbols-outlined text-[#695be6] group-hover:text-white transition-colors text-base">chevron_left</span>
        </button>
      )}

      {/* ── Desktop Sidebar ── */}
      <aside ref={sidebarRef} className={`relative w-[360px] h-full bg-white shrink-0 z-20 flex-col border-l border-slate-200 transition-all duration-300 ${showSidebar ? "hidden lg:flex" : "hidden"}`}
        style={{ boxShadow: "-4px 0 15px rgba(0,0,0,0.05)" }}>
        <button onClick={() => setShowSidebar(false)}
          className="absolute -left-[38px] top-1/2 -translate-y-1/2 z-10 flex flex-col items-center gap-1 bg-white border border-slate-200 border-r-0 shadow-lg rounded-l-2xl px-2 py-4 hover:bg-[#695be6] hover:border-[#695be6] group transition-all duration-200">
          <span className="material-symbols-outlined text-[#695be6] group-hover:text-white transition-colors text-xl" style={{ fontVariationSettings: "'FILL' 1" }}>history_edu</span>
          {filteredSessions.length > 0 && (
            <span className="bg-[#695be6] group-hover:bg-white text-white group-hover:text-[#695be6] text-[9px] font-black rounded-full w-5 h-5 flex items-center justify-center transition-colors">
              {filteredSessions.length > 99 ? "99+" : filteredSessions.length}
            </span>
          )}
          <span className="text-[#695be6] group-hover:text-white transition-colors font-bold" style={{ writingMode: "vertical-rl", fontSize: "9px", letterSpacing: "0.12em", textTransform: "uppercase" }}>Close</span>
          <span className="material-symbols-outlined text-[#695be6] group-hover:text-white transition-colors text-base">chevron_right</span>
        </button>

        <div className="h-16 flex items-center justify-between px-5 border-b border-slate-100 shrink-0">
          <h2 className="text-[#2D2D2D] font-semibold text-lg">Chats</h2>
          <button onClick={startNewChat} disabled={status !== "idle"}
            className="flex items-center gap-1.5 bg-[#695be6] hover:bg-[#5a4dd4] text-white text-xs font-bold px-3 py-1.5 rounded-full transition-colors disabled:opacity-40">
            <span className="material-symbols-outlined text-sm">add</span>New Chat
          </button>
        </div>

        <div className="p-4 space-y-3 shrink-0">
          <div className="relative">
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-xl">search</span>
            <input value={search} onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border-none rounded-full text-sm focus:ring-2 focus:ring-[#6B5CE7]/20 transition-shadow"
              placeholder="Search chats..." />
          </div>
          <div className="flex gap-2 overflow-x-auto pb-1 whitespace-nowrap" style={{ scrollbarWidth: "none" }}>
            {SIDEBAR_SUBJECTS.map((s) => (
              <button key={s} onClick={() => setSubjFilter(s)}
                className={`px-4 py-1.5 rounded-full text-xs font-semibold transition-colors shrink-0 ${subjFilter === s ? "bg-[#6B5CE7] text-white shadow-sm" : "bg-slate-100 text-slate-600 hover:bg-slate-200"}`}>{s}</button>
            ))}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-4 py-2 space-y-3" style={{ scrollbarWidth: "thin" }}>
          {sessionsStatus === "loading" ? (
            <p className="text-center text-slate-400 text-sm py-8">Loading...</p>
          ) : filteredSessions.length === 0 ? (
            <div className="text-center py-10">
              <span className="material-symbols-outlined text-slate-300 text-4xl">chat_bubble_outline</span>
              <p className="text-slate-400 text-sm mt-2">No chats yet</p>
              <p className="text-slate-300 text-xs mt-1">Start a conversation above</p>
            </div>
          ) : (
            filteredSessions.map((item) => (
              <SessionCard key={item.session_id} item={item} active={item.session_id === loadedSessionId}
                onStar={toggleStar} onPin={togglePin} onDelete={handleDelete} onRename={handleRename}
                onClick={() => handleLoadSession(item.session_id)} />
            ))
          )}
        </div>
      </aside>

      {/* ── Mobile History Drawer ── */}
      {showMobileHistory && (
        <div className="fixed inset-0 z-50 lg:hidden flex">
          <div className="absolute inset-0 bg-black/40" onClick={() => setShowMobileHistory(false)} />
          <div className="relative ml-auto w-[320px] h-full bg-white flex flex-col shadow-2xl">
            <div className="h-16 flex items-center justify-between px-5 border-b border-slate-100 shrink-0">
              <h2 className="text-[#2D2D2D] font-semibold text-lg">Chats</h2>
              <div className="flex items-center gap-2">
                <button onClick={() => { startNewChat(); setShowMobileHistory(false); }} disabled={status !== "idle"}
                  className="flex items-center gap-1 bg-[#695be6] text-white text-xs font-bold px-3 py-1.5 rounded-full disabled:opacity-40">
                  <span className="material-symbols-outlined text-sm">add</span>New
                </button>
                <button onClick={() => setShowMobileHistory(false)} className="p-2 hover:bg-slate-100 rounded-lg">
                  <span className="material-symbols-outlined text-slate-500">close</span>
                </button>
              </div>
            </div>
            <div className="p-4 space-y-3 shrink-0">
              <div className="relative">
                <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-xl">search</span>
                <input value={search} onChange={(e) => setSearch(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border-none rounded-full text-sm focus:ring-2 focus:ring-[#6B5CE7]/20"
                  placeholder="Search chats..." />
              </div>
              <div className="flex gap-2 overflow-x-auto pb-1 whitespace-nowrap" style={{ scrollbarWidth: "none" }}>
                {SIDEBAR_SUBJECTS.map((s) => (
                  <button key={s} onClick={() => setSubjFilter(s)}
                    className={`px-4 py-1.5 rounded-full text-xs font-semibold transition-colors shrink-0 ${subjFilter === s ? "bg-[#6B5CE7] text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"}`}>{s}</button>
                ))}
              </div>
            </div>
            <div className="flex-1 overflow-y-auto px-4 py-2 space-y-3" style={{ scrollbarWidth: "thin" }}>
              {filteredSessions.length === 0
                ? <p className="text-center text-slate-400 text-sm py-8">No chats yet</p>
                : filteredSessions.map((item) => (
                    <SessionCard key={item.session_id} item={item} active={item.session_id === loadedSessionId}
                      onStar={toggleStar} onPin={togglePin} onDelete={handleDelete} onRename={handleRename}
                      onClick={() => handleLoadSession(item.session_id)} />
                  ))
              }
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
