import { useState, useRef, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { useAuth } from "../../context/AuthContext";
import { getFirstName, getInitial } from "../../utils/nameUtils";
import api from "../../api";
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
} from "../../store/slices/teacherChatSlice";
import { parseVinXML } from "../../utils/xmlParser";
import { renderMath, renderMarkdown } from "../../utils/mathRenderer";

// ── Quick action chips for teachers ───────────────────────────
const QUICK_ACTIONS = [
  { id: "qa1", label: "Create Lesson Plan", icon: "menu_book", prompt: "Can you help me create a detailed lesson plan for " },
  { id: "qa2", label: "Draft Parent Email", icon: "mail", prompt: "Help me draft a professional message to a parent about " },
  { id: "qa3", label: "Brainstorm Activity", icon: "emoji_objects", prompt: "Brainstorm a creative classroom activity to teach " },
  { id: "qa4", label: "Past Chats", icon: "history" }
];

const SUBJECTS = ["All", "General", "Lesson Plan", "Worksheet", "Grading", "Parent Comm"];

const SUBJECT_BADGE = {
  General:       { bg: "bg-blue-50",    text: "text-blue-600" },
  "Lesson Plan": { bg: "bg-purple-50",  text: "text-purple-600" },
  Worksheet:     { bg: "bg-[#FFE5E5]",  text: "text-red-600" },
  Grading:       { bg: "bg-emerald-50", text: "text-emerald-700" },
  "Parent Comm": { bg: "bg-amber-50",   text: "text-amber-700" },
};

function formatStepText(text) {
  if (!text) return text;
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

function newSessionId() {
  return crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).slice(2) + Date.now().toString(36);
}

// ── Teacher Custom Avatar Component ───────────────────────────
function TeacherAvatar({ size = "size-8" }) {
  return (
    <div className={`${size} rounded-full bg-gradient-to-tr from-[#695be6] to-pink-500 flex items-center justify-center text-white shadow-sm shrink-0 border border-white/20 overflow-hidden`}>
      <span className="material-symbols-outlined text-[18px]">school</span>
    </div>
  );
}

function StreamingMessage({ xmlBuffer, done, onFollowup, onAnswerQuestion, isHistoric, msgIndex, allMessages }) {
  const parsed = parseVinXML(xmlBuffer);

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
              <span className="text-red-700 text-sm font-bold uppercase tracking-wider">Teaching Tip</span>
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
            <span className="material-symbols-outlined text-green-600">checklist</span>Steps & Planning
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
      {parsed.question && !isHistoric && (
        <PracticeQuestion question={parsed.question} onAnswer={onAnswerQuestion} />
      )}
      {done && !isHistoric && parsed.followups.length > 0 && (
        <div className="flex gap-2 overflow-x-auto pb-2 whitespace-nowrap pt-2" style={{ scrollbarWidth: "none" }}>
          {parsed.followups.map((f, i) => (
            <button key={i} onClick={() => onFollowup(f)}
              className="bg-white text-[#695be6] border border-slate-200 px-4 py-2 rounded-full text-sm font-medium hover:bg-[#695be6]/5 transition-colors shrink-0">{f}</button>
          ))}
        </div>
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
      <p className="text-sm font-bold text-[#695be6] uppercase tracking-wide">Sample Assessment Question</p>
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
      {!checked && <button onClick={handleCheck} disabled={!selected} className="w-full py-2 bg-[#695be6] text-white font-bold rounded-lg hover:bg-[#5a4dd4] transition-colors disabled:opacity-40">Submit Response</button>}
      {checked && correct && (
        <div className={`p-3 rounded-lg flex items-start gap-2 ${selected === correct.id ? "bg-green-50 border border-green-200" : "bg-red-50 border border-red-200"}`}>
          <span className={`material-symbols-outlined text-xl ${selected === correct.id ? "text-green-600" : "text-red-500"}`}>{selected === correct.id ? "check_circle" : "cancel"}</span>
          <p className={`text-sm font-medium ${selected === correct.id ? "text-green-800" : "text-red-700"}`}>
            {selected === correct.id ? "Correct option choice." : `The correct option is ${correct.id}.`}
          </p>
        </div>
      )}
    </div>
  );
}

function TypingDots() {
  return (
    <div className="flex gap-4 items-start">
      <TeacherAvatar />
      <div className="bg-white border-l-4 border-[#D4C5F9] px-5 py-4 rounded-2xl rounded-tl-none shadow-sm flex items-center gap-1.5">
        {[0, 1, 2].map((i) => (
          <span key={i} className="size-2 bg-[#695be6]/40 rounded-full animate-bounce" style={{ animationDelay: `${i * 0.15}s` }} />
        ))}
      </div>
    </div>
  );
}

function SessionCard({ item, active, onStar, onPin, onDelete, onRename, onClick }) {
  const badge = SUBJECT_BADGE[item.subject] || { bg: "bg-gray-100", text: "text-gray-600" };
  const date = item.updated_at || item.created_at;
  const [menuPos, setMenuPos] = useState(null);
  const [renaming, setRenaming] = useState(false);
  const [renameVal, setRenameVal] = useState(item.title || item.question || "");
  const menuRef = useRef(null);
  const btnRef = useRef(null);

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
          <span className={`px-2 py-0.5 text-[10px] font-bold rounded uppercase ${badge.bg} ${badge.text}`}>{item.subject || "General"}</span>
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

export default function TeacherChat() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const bottomRef = useRef(null);
  const textareaRef = useRef(null);
  const sidebarRef = useRef(null);
  const fileInputRef = useRef(null);
  const chatHistoryRef = useRef([]);

  const sessions = useSelector(selectSessions);
  const sessionsStatus = useSelector(selectSessionsStatus);
  const loadedSessionId = useSelector(selectLoadedSessionId);
  const loadedTurns = useSelector(selectLoadedTurns);
  const loadSessionStatus = useSelector(selectLoadSessionStatus);

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
  const [isListening, setIsListening] = useState(false);
  const [voiceError, setVoiceError] = useState("");

  // Audio recording refs
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);

  useEffect(() => { dispatch(fetchSessions()); }, [dispatch]);
  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages, status]);

  // Sync loaded turns
  useEffect(() => {
    if (loadSessionStatus !== "succeeded") return;

    if (!loadedTurns.length) {
      setMessages([]);
      chatHistoryRef.current = [];
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

    setSessionId(loadedTurns[0].session_id || loadedSessionId);
    setStatus("idle");
    setShowMobileHistory(false);
  }, [loadSessionStatus, loadedTurns, loadedSessionId]);

  const startNewChat = useCallback(() => {
    if (status !== "idle") return;
    setMessages([]);
    setInput("");
    chatHistoryRef.current = [];
    setSessionId(newSessionId());
    dispatch(clearLoadedSession());
    setShowMobileHistory(false);
    textareaRef.current?.focus();
  }, [status, dispatch]);

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
      const xmlBuf = await streamSSE("/teacher-chat/chat", {
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

  const handleAnswerQuestion = useCallback(async (questionText, chosenText, isCorrect) => {
    const assistantId = Date.now();
    setMessages((p) => [...p, { id: assistantId, role: "assistant", xmlBuffer: "", done: false }]);
    setStatus("streaming");
    try {
      const xmlBuf = await streamSSE("/teacher-chat/answer", {
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
          await fetch(`${import.meta.env.VITE_API_BASE_URL}/teacher-chat/save-draft`, {
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

  const toggleVoice = useCallback(async () => {
    if (isListening) {
      if (mediaRecorderRef.current?.state === "recording") {
        mediaRecorderRef.current.requestData();
        mediaRecorderRef.current.stop();
      }
      return;
    }

    setVoiceError("");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true }
      });
      const mimeType = [
        "audio/webm;codecs=opus",
        "audio/webm",
        "audio/ogg;codecs=opus",
        "",
      ].find((m) => !m || MediaRecorder.isTypeSupported(m));
      
      const mediaRecorder = new MediaRecorder(stream, mimeType ? { mimeType } : {});
      audioChunksRef.current = [];
      
      mediaRecorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) audioChunksRef.current.push(event.data);
      };
      mediaRecorder.onstop = () => {
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
            
            const res = await fetch(`${import.meta.env.VITE_API_BASE_URL}/teacher-chat/transcribe`, {
              method: "POST",
              headers: { Authorization: `Bearer ${authToken}` },
              body: formData,
            });
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            
            const { text, error } = await res.json();
            if (error) {
              setVoiceError(`Transcription error: {error}`);
            } else if (text?.trim()) {
              setInput((prev) => prev ? prev + " " + text.trim() : text.trim());
            } else {
              setVoiceError("No speech detected. Please speak clearly.");
            }
          } catch (err) {
            setVoiceError("Transcription failed: " + err.message);
          }
          setIsListening(false);
        })();
      };
      
      mediaRecorder.start(250);
      mediaRecorderRef.current = mediaRecorder;
      setIsListening(true);
    } catch (err) {
      setVoiceError("Microphone access failed: " + err.message);
      setIsListening(false);
    }
  }, [isListening]);

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
    const imageRef = count === 1 ? "an uploaded document image" : `${count} document images`;
    const text = customText?.trim()
      ? `${customText.trim()} [IMAGE_UPLOAD] Image URL${count > 1 ? "s" : ""}: ${urls}`
      : `I've uploaded ${imageRef}. Please help me review it. [IMAGE_UPLOAD] Image URL${count > 1 ? "s" : ""}: ${urls}`;
    sendMessage(text);
    uploadedImages.forEach((img) => URL.revokeObjectURL(img.preview));
    setUploadedImages([]);
    setInput("");
  }, [uploadedImages, status, sendMessage]);

  const removeUploadedImage = (idx) => {
    setUploadedImages((prev) => { URL.revokeObjectURL(prev[idx].preview); return prev.filter((_, i) => i !== idx); });
  };

  const handleQuickAction = (qa) => {
    if (qa.id === "qa4") {
      if (sidebarRef.current) sidebarRef.current.scrollTo({ top: 0, behavior: "smooth" });
      else setShowMobileHistory(true);
    } else if (qa.prompt) {
      setInput(qa.prompt);
      textareaRef.current?.focus();
    }
  };

  const filteredSessions = sessions
    .filter((s) => {
      const matchSubj = subjFilter === "All" || s.subject === subjFilter;
      const matchSearch = !search || s.title?.toLowerCase().includes(search.toLowerCase()) || s.subject?.toLowerCase().includes(search.toLowerCase());
      return matchSubj && matchSearch;
    })
    .sort((a, b) => (b.pinned ? 1 : 0) - (a.pinned ? 1 : 0));

  const statusLabel =
    status === "thinking" ? "Ask me Anything is thinking..." :
    status === "streaming" ? "Ask me Anything is typing..." :
    loadSessionStatus === "loading" ? "Loading conversation..." :
    "Ask me Anything is here to help";

  const isViewingHistory = !!loadedSessionId && loadedTurns.length > 0 && messages.length > 0;

  return (
    <div className="h-screen flex overflow-hidden bg-[#f6f6f8]" style={{ fontFamily: "'Lexend', sans-serif" }}>
      {/* ── Chat column ── */}
      <div className="flex-1 flex flex-col h-full overflow-hidden relative">
        <header className="h-16 shrink-0 flex items-center justify-between px-6 shadow-md z-10 animate-fade-in"
          style={{ background: "linear-gradient(90deg, #6B5CE7 0%, #a855f7 100%)" }}>
          <div className="flex items-center gap-4">
            <button onClick={() => navigate("/teacher")} className="text-white hover:bg-white/10 p-1 rounded-full transition-colors">
              <span className="material-symbols-outlined">arrow_back</span>
            </button>
            <div className="flex items-center gap-3">
              <div className="relative">
                <TeacherAvatar size="size-10" />
                <div className="absolute bottom-0 right-0 size-3 bg-green-400 border-2 border-white rounded-full animate-pulse" />
              </div>
              <div>
                <h1 className="text-white font-bold text-base leading-tight">Ask me Anything</h1>
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

        <main className="flex-1 overflow-y-auto px-4 py-8 bg-slate-50/50" style={{ scrollbarWidth: "thin" }}>
          <div className="max-w-4xl mx-auto flex flex-col gap-8">
            {messages.length === 0 && (
              <div className="flex flex-col items-center text-center py-10 gap-4">
                <TeacherAvatar size="size-20" />
                <div>
                  <h2 className="text-2xl font-black text-slate-800">Hi {getFirstName(user?.name) || "Teacher"}, I'm Ask me Anything!</h2>
                  <p className="text-slate-500 mt-1 text-sm">Your AI teaching assistant — ask me anything about lesson planning, worksheets, grading, or parent updates.</p>
                </div>
                <div className="flex flex-wrap justify-center gap-2 mt-2">
                  {[
                    "Create a lesson plan for Class 6 Integers",
                    "Draft an email to a parent about student homework improvement",
                    "Brainstorm 3 science classroom activities for chemical reactions"
                  ].map((s) => (
                    <button key={s} onClick={() => sendMessage(s)}
                      className="px-4 py-2 bg-white border border-slate-200 rounded-full text-sm text-slate-600 hover:border-[#695be6]/40 hover:text-[#695be6] transition-all hover:shadow-sm">{s}</button>
                  ))}
                </div>
              </div>
            )}

            {messages.map((msg, idx) => (
              <div key={msg.id} className="transition-all duration-300">
                {msg.role === "user" ? (
                  <div className="flex justify-end items-end gap-3">
                    <div className="flex flex-col gap-1 items-end max-w-[80%]">
                      <p className="text-slate-500 text-xs font-medium mr-2">You</p>
                      <div className="bg-[#695be6] text-white px-5 py-3 rounded-2xl rounded-tr-none shadow-sm transition-all hover:shadow">
                        <p className="text-sm md:text-base leading-relaxed">{msg.text}</p>
                      </div>
                    </div>
                    <div className="size-8 rounded-full bg-slate-200 overflow-hidden mb-1 shrink-0">
                      {user?.avatar
                        ? <img src={user.avatar} alt="you" className="w-full h-full object-cover" />
                        : <div className="w-full h-full bg-[#695be6] flex items-center justify-center text-white text-xs font-bold">{getInitial(user?.name) ?? "T"}</div>
                      }
                    </div>
                  </div>
                ) : (
                  <div className="flex justify-start items-start gap-3">
                    <TeacherAvatar />
                    <div className="flex flex-col gap-2 max-w-[85%]">
                      <p className="text-slate-500 text-xs font-medium ml-1">Ask me Anything</p>
                      <div className="bg-white border-l-4 border-[#a855f7] p-5 rounded-2xl rounded-tl-none shadow-sm">
                        <StreamingMessage
                          xmlBuffer={msg.xmlBuffer}
                          done={msg.done}
                          onFollowup={sendMessage}
                          onAnswerQuestion={handleAnswerQuestion}
                          isHistoric={isViewingHistory}
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

        <footer className="bg-white border-t border-slate-200 p-4 shrink-0 shadow-lg">
          <div className="max-w-4xl mx-auto space-y-3">
            {uploadedImages.length > 0 && (
              <div className="bg-gradient-to-r from-[#695be6]/5 to-purple-50 border border-[#695be6]/20 rounded-xl p-3">
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
                  Type your prompt, or ask AI to analyze the images:
                </p>
                <button onClick={() => handleSendImages()} disabled={status !== "idle"}
                  className="w-full py-2 border border-[#695be6]/40 text-[#695be6] text-xs font-bold rounded-lg hover:bg-[#695be6]/5 disabled:opacity-40 transition-colors flex items-center justify-center gap-1.5">
                  <span className="material-symbols-outlined text-sm">auto_fix_high</span>
                  Analyze this document
                </button>
              </div>
            )}
            <input ref={fileInputRef} type="file" accept="image/*,.heic,.heif,application/pdf" multiple className="hidden" onChange={handleFileChange} />
            
            <div className="flex gap-2 flex-wrap">
              {QUICK_ACTIONS.map((qa) => {
                const handler = () => handleQuickAction(qa);
                return (
                  <button key={qa.id} onClick={handler}
                    className="px-3 py-1 rounded-md text-xs font-semibold flex items-center gap-1 bg-[#695be6]/10 text-[#695be6] hover:bg-[#695be6]/20 transition-colors">
                    <span className="material-symbols-outlined text-sm">{qa.icon}</span>
                    {qa.label}
                  </button>
                );
              })}
              <button onClick={handleUploadProblem} disabled={uploadStatus === "uploading"}
                className="px-3 py-1 rounded-md text-xs font-semibold flex items-center gap-1 bg-[#695be6]/10 text-[#695be6] hover:bg-[#695be6]/20 transition-colors">
                <span className="material-symbols-outlined text-sm">upload_file</span>
                Upload Document/Worksheet
              </button>
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
                placeholder={uploadedImages.length > 0 ? "Ask about this document..." : isViewingHistory ? "Continue this conversation..." : "Ask for a lesson plan, draft an email, balance questions..."}
                className="w-full bg-transparent border-none focus:ring-0 text-slate-800 text-sm md:text-base py-2 resize-none max-h-32 focus:outline-none focus:border-transparent"
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
            <p className="text-[10px] text-center text-slate-400">Ask me Anything is powered by AI. Check critical materials.</p>
            {voiceError && (
              <p className="text-[11px] text-center text-red-500 font-medium">{voiceError}</p>
            )}
          </div>
        </footer>
      </div>

      {/* ── Sidebar toggle tab ── */}
      {!showSidebar && (
        <button onClick={() => setShowSidebar(true)}
          className="hidden lg:flex fixed right-0 top-1/2 -translate-y-1/2 z-30 flex-col items-center gap-1 bg-white border border-slate-200 border-r-0 shadow-lg rounded-l-2xl px-2 py-4 hover:bg-[#695be6] hover:border-[#695be6] group transition-all duration-200">
          <span className="material-symbols-outlined text-[#695be6] group-hover:text-white transition-colors text-xl" style={{ fontVariationSettings: "'FILL' 1" }}>history_edu</span>
          {filteredSessions.length > 0 && (
            <span className="bg-[#695be6] group-hover:bg-white text-white group-hover:text-[#695be6] text-[9px] font-black rounded-full w-5 h-5 flex items-center justify-center transition-colors">
              {filteredSessions.length}
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
              {filteredSessions.length}
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
            {SUBJECTS.map((s) => (
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
        <div className="fixed inset-0 z-50 lg:hidden flex animate-fade-in">
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
                {SUBJECTS.map((s) => (
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
