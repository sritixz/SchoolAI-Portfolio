import { useState, useRef, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { useAuth } from "../../context/AuthContext";
import {
  VIN_AVATAR, QUICK_ACTIONS, DOUBT_HISTORY,
  SUBJECT_BADGE, SIDEBAR_SUBJECTS,
} from "../../data/vinAiData";
import {
  fetchDoubtHistory,
  toggleDoubtStar,
  optimisticToggleStar,
  selectDoubtHistory,
  selectHistoryStatus,
} from "../../store/slices/vinAiSlice";
import { parseVinXML } from "../../utils/xmlParser";

// ─────────────────────────────────────────────────────────────
// STREAMING MESSAGE RENDERER
// ─────────────────────────────────────────────────────────────
function StreamingMessage({ xmlBuffer, done, onFollowup, onAnswerQuestion }) {
  const parsed = parseVinXML(xmlBuffer);

  return (
    <div className="space-y-4">
      {parsed.content && (
        <div className="text-sm md:text-base text-slate-800 leading-relaxed">
          <span dangerouslySetInnerHTML={{ __html: parsed.content }} />
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
            <p className="text-red-800 text-sm leading-relaxed" dangerouslySetInnerHTML={{ __html: parsed.hint }} />
          </div>
        </details>
      )}

      {parsed.steps.length > 0 && (
        <div className="bg-[#C8E6C9] p-4 rounded-lg space-y-3">
          <h4 className="text-green-800 font-bold text-sm flex items-center gap-2 uppercase tracking-wider">
            <span className="material-symbols-outlined text-green-600">checklist</span>
            Step-by-Step
          </h4>
          <ul className="space-y-3 pt-1">
            {parsed.steps.map((s) => (
              <li key={s.number} className="flex gap-3">
                <div className="size-6 shrink-0 rounded-full bg-white flex items-center justify-center text-xs font-bold text-green-700 shadow-sm">{s.number}</div>
                <p className="text-sm text-green-900" dangerouslySetInnerHTML={{ __html: s.text }} />
              </li>
            ))}
          </ul>
        </div>
      )}

      {parsed.question && (
        <PracticeQuestion question={parsed.question} onAnswer={onAnswerQuestion} />
      )}

      {done && parsed.followups.length > 0 && (
        <div className="flex gap-2 overflow-x-auto pb-2 whitespace-nowrap pt-2" style={{ scrollbarWidth: "none" }}>
          {parsed.followups.map((f, i) => (
            <button key={i} onClick={() => onFollowup(f)}
              className="bg-white text-[#695be6] border border-slate-200 px-4 py-2 rounded-full text-sm font-medium hover:bg-[#695be6]/5 transition-colors shrink-0">
              {f}
            </button>
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
            <label key={opt.id}
              className={`flex items-center gap-3 p-3 rounded-lg border-2 cursor-pointer transition-all ${
                isGood ? "border-green-500 bg-green-50" :
                isBad  ? "border-red-400 bg-red-50" :
                isSel  ? "border-[#695be6] bg-[#695be6]/5" :
                         "border-slate-200 bg-white hover:border-[#695be6]/30"
              }`}>
              <input type="radio" name={`pq-${question.text.slice(0,10)}`} className="hidden"
                disabled={checked} onChange={() => !checked && setSelected(opt.id)} />
              <div className={`size-5 rounded-full border-2 shrink-0 ${
                isSel ? "border-[#695be6] bg-[#695be6]" : "border-gray-300"
              }`} />
              <span className="text-sm font-medium">{opt.id}. {opt.text}</span>
              {checked && opt.correct && <span className="material-symbols-outlined text-green-600 ml-auto">check_circle</span>}
              {checked && isBad && <span className="material-symbols-outlined text-red-500 ml-auto">cancel</span>}
            </label>
          );
        })}
      </div>
      {!checked && (
        <button onClick={handleCheck} disabled={!selected}
          className="w-full py-2 bg-[#695be6] text-white font-bold rounded-lg hover:bg-[#5a4dd4] transition-colors disabled:opacity-40">
          Check Answer
        </button>
      )}
      {checked && correct && (
        <div className={`p-3 rounded-lg flex items-start gap-2 ${
          selected === correct.id ? "bg-green-50 border border-green-200" : "bg-red-50 border border-red-200"
        }`}>
          <span className={`material-symbols-outlined text-xl ${selected === correct.id ? "text-green-600" : "text-red-500"}`}>
            {selected === correct.id ? "check_circle" : "cancel"}
          </span>
          <p className={`text-sm font-medium ${selected === correct.id ? "text-green-800" : "text-red-700"}`}>
            {selected === correct.id ? "Correct! Well done." : `Not quite. The correct answer is ${correct.id}.`}
          </p>
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// TYPING DOTS
// ─────────────────────────────────────────────────────────────
function TypingDots() {
  return (
    <div className="flex gap-4 items-start">
      <div className="size-8 rounded-full bg-white border border-slate-200 shrink-0 overflow-hidden">
        <img src={VIN_AVATAR} alt="Vin" className="w-full h-full object-cover" />
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
// HISTORY CARD
// ─────────────────────────────────────────────────────────────
function HistoryCard({ item, onStar }) {
  const badge = SUBJECT_BADGE[item.subject] || { bg: "bg-gray-100", text: "text-gray-600" };
  return (
    <div className="group p-4 bg-white border border-slate-100 rounded-xl hover:border-[#6B5CE7]/30 hover:shadow-md transition-all">
      <div className="flex justify-between items-start mb-2">
        <span className={`px-2 py-0.5 text-[10px] font-bold rounded uppercase ${badge.bg} ${badge.text}`}>{item.subject}</span>
        <span className="text-[10px] text-slate-400 font-medium">
          {item.created_at ? new Date(item.created_at).toLocaleDateString() : item.relativeTime}
        </span>
      </div>
      <p className="text-sm text-slate-700 font-medium line-clamp-2 mb-3">{item.question}</p>
      <div className="flex justify-between items-center">
        <span className="text-xs text-slate-500 line-clamp-1">{item.preview}</span>
        <button onClick={(e) => { e.stopPropagation(); onStar(item._id || item.id); }}
          className={`transition-colors ${item.starred ? "text-amber-400" : "text-slate-300 hover:text-amber-400"}`}>
          <span className="material-symbols-outlined text-lg"
            style={{ fontVariationSettings: item.starred ? "'FILL' 1" : "'FILL' 0" }}>star</span>
        </button>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// MAIN VIN AI PAGE
// ─────────────────────────────────────────────────────────────
export default function VinAI() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const bottomRef = useRef(null);
  const textareaRef = useRef(null);

  const reduxHistory = useSelector(selectDoubtHistory);
  const historyStatus = useSelector(selectHistoryStatus);

  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [status, setStatus] = useState("idle"); // idle | thinking | streaming
  const [subjFilter, setSubjFilter] = useState("All");
  const [search, setSearch] = useState("");

  const chatHistoryRef = useRef([]);

  const history = historyStatus === "succeeded" && reduxHistory.length ? reduxHistory : DOUBT_HISTORY;

  useEffect(() => { dispatch(fetchDoubtHistory()); }, [dispatch]);
  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages, status]);

  // ─── SSE streaming helper ───────────────────────────────────
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
          dispatch(fetchDoubtHistory());
          setStatus("idle");
          return xmlBuf;
        }
        xmlBuf += data.replace(/\\n/g, "\n");
        setMessages((p) => p.map((m) => m.id === assistantId ? { ...m, xmlBuffer: xmlBuf } : m));
      }
    }
    return xmlBuf;
  }, [dispatch]);

  // ─── SEND MESSAGE ───────────────────────────────────────────
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
      const xmlBuf = await streamSSE("/vin-ai/chat", { message: trimmed, history: chatHistoryRef.current }, assistantId);
      chatHistoryRef.current = [...chatHistoryRef.current, { role: "assistant", content: xmlBuf }];
    } catch (err) {
      console.error("Stream error:", err);
      const errXml = `<response><subject>General</subject><content>Sorry, something went wrong. Please try again.</content><followups><followup>Try again</followup></followups></response>`;
      setMessages((p) => p.map((m) => m.id === assistantId ? { ...m, xmlBuffer: errXml, done: true } : m));
      setStatus("idle");
    }
  }, [status, streamSSE]);

  // ─── HANDLE PRACTICE ANSWER ─────────────────────────────────
  const handleAnswerQuestion = useCallback(async (questionText, chosenText, isCorrect) => {
    const assistantId = Date.now();
    setMessages((p) => [...p, { id: assistantId, role: "assistant", xmlBuffer: "", done: false }]);
    setStatus("streaming");

    try {
      const xmlBuf = await streamSSE("/vin-ai/answer", {
        question: questionText, chosen: chosenText, correct: isCorrect,
        history: chatHistoryRef.current,
      }, assistantId);
      chatHistoryRef.current = [...chatHistoryRef.current, { role: "assistant", content: xmlBuf }];
    } catch (err) {
      console.error("Answer stream error:", err);
      setStatus("idle");
    }
  }, [streamSSE]);

  const toggleStar = (id) => {
    dispatch(optimisticToggleStar(id));
    dispatch(toggleDoubtStar(id));
  };

  const filteredHistory = history.filter((h) => {
    const matchSubj = subjFilter === "All" || h.subject === subjFilter;
    const matchSearch = !search || h.question?.toLowerCase().includes(search.toLowerCase());
    return matchSubj && matchSearch;
  });

  const statusLabel =
    status === "thinking" ? "Vin is thinking..." :
    status === "streaming" ? "Vin is typing..." : "Vin is here to help";

  return (
    <div className="h-screen flex overflow-hidden bg-[#f6f6f8]" style={{ fontFamily: "'Lexend', sans-serif" }}>
      {/* ── Chat column ── */}
      <div className="flex-1 flex flex-col h-full overflow-hidden">
        <header className="h-16 shrink-0 flex items-center justify-between px-6 shadow-md z-10"
          style={{ background: "linear-gradient(90deg, #6B5CE7 0%, #D4C5F9 100%)" }}>
          <div className="flex items-center gap-4">
            <button onClick={() => navigate("/student")} className="text-white hover:bg-white/10 p-1 rounded-full transition-colors">
              <span className="material-symbols-outlined">arrow_back</span>
            </button>
            <div className="flex items-center gap-3">
              <div className="relative">
                <div className="size-10 rounded-full border-2 border-white/50 bg-white overflow-hidden">
                  <img src={VIN_AVATAR} alt="Vin AI" className="w-full h-full object-cover" />
                </div>
                <div className="absolute bottom-0 right-0 size-3 bg-green-400 border-2 border-white rounded-full" />
              </div>
              <div>
                <h1 className="text-white font-bold text-base leading-tight">Vin AI</h1>
                <p className={`text-white/80 text-xs font-medium ${status !== "idle" ? "animate-pulse" : ""}`}>{statusLabel}</p>
              </div>
            </div>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto px-4 py-8" style={{ scrollbarWidth: "thin" }}>
          <div className="max-w-4xl mx-auto flex flex-col gap-8">
            {messages.length === 0 && (
              <div className="flex flex-col items-center text-center py-10 gap-4">
                <div className="size-20 rounded-full bg-white border-2 border-[#695be6]/20 overflow-hidden shadow-lg">
                  <img src={VIN_AVATAR} alt="Vin" className="w-full h-full object-cover" />
                </div>
                <div>
                  <h2 className="text-2xl font-black text-slate-800">Hi {user?.name?.split(" ")[0] || "there"}, I'm Vin!</h2>
                  <p className="text-slate-500 mt-1 text-sm">Your AI tutor — ask me anything about your subjects.</p>
                </div>
                <div className="flex flex-wrap justify-center gap-2 mt-2">
                  {["How do I solve quadratic equations?", "Explain Newton's Third Law", "What is photosynthesis?"].map((s) => (
                    <button key={s} onClick={() => sendMessage(s)}
                      className="px-4 py-2 bg-white border border-slate-200 rounded-full text-sm text-slate-600 hover:border-[#695be6]/40 hover:text-[#695be6] transition-colors shadow-sm">
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {messages.map((msg) => (
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
                        : <div className="w-full h-full bg-[#695be6] flex items-center justify-center text-white text-xs font-bold">{user?.name?.[0] ?? "S"}</div>
                      }
                    </div>
                  </div>
                ) : (
                  <div className="flex justify-start items-start gap-3">
                    <div className="size-8 rounded-full bg-white overflow-hidden mt-1 shrink-0 border border-slate-200">
                      <img src={VIN_AVATAR} alt="Vin" className="w-full h-full object-cover" />
                    </div>
                    <div className="flex flex-col gap-2 max-w-[85%]">
                      <p className="text-slate-500 text-xs font-medium ml-1">Vin AI</p>
                      <div className="bg-white border-l-4 border-[#D4C5F9] p-5 rounded-2xl rounded-tl-none shadow-sm">
                        <StreamingMessage
                          xmlBuffer={msg.xmlBuffer}
                          done={msg.done}
                          onFollowup={sendMessage}
                          onAnswerQuestion={handleAnswerQuestion}
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
            <div className="flex gap-2 flex-wrap">
              {QUICK_ACTIONS.map((qa) => (
                <button key={qa.id}
                  className="bg-[#695be6]/10 text-[#695be6] px-3 py-1 rounded-md text-xs font-semibold flex items-center gap-1 hover:bg-[#695be6]/20 transition-colors">
                  <span className="material-symbols-outlined text-sm">{qa.icon}</span>{qa.label}
                </button>
              ))}
            </div>
            <div className="flex items-end gap-3 bg-slate-50 border border-slate-200 rounded-xl p-2 pr-3">
              <textarea
                ref={textareaRef}
                rows={1}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(input); } }}
                placeholder="Ask your doubt..."
                className="w-full bg-transparent border-none focus:ring-0 text-slate-800 text-sm md:text-base py-2 resize-none max-h-32"
                style={{ scrollbarWidth: "thin" }}
              />
              <button onClick={() => sendMessage(input)} disabled={!input.trim() || status !== "idle"}
                className="bg-[#695be6] text-white size-10 flex items-center justify-center rounded-lg hover:bg-[#695be6]/90 transition-transform active:scale-95 shrink-0 shadow-sm disabled:opacity-40">
                <span className="material-symbols-outlined">send</span>
              </button>
            </div>
            <p className="text-[10px] text-center text-slate-400">Vin AI can make mistakes. Verify important information.</p>
          </div>
        </footer>
      </div>

      {/* ── History Sidebar ── */}
      <aside className="w-[360px] h-full bg-white shrink-0 z-20 flex-col border-l border-slate-200 hidden lg:flex"
        style={{ boxShadow: "-4px 0 15px rgba(0,0,0,0.05)" }}>
        <div className="h-16 flex items-center px-6 border-b border-slate-100 shrink-0">
          <h2 className="text-[#2D2D2D] font-semibold text-lg">Doubt History</h2>
        </div>
        <div className="p-5 space-y-3 shrink-0">
          <div className="relative">
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-xl">search</span>
            <input value={search} onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border-none rounded-full text-sm focus:ring-2 focus:ring-[#6B5CE7]/20 transition-shadow"
              placeholder="Search your doubts..." />
          </div>
          <div className="flex gap-2 overflow-x-auto pb-1 whitespace-nowrap" style={{ scrollbarWidth: "none" }}>
            {SIDEBAR_SUBJECTS.map((s) => (
              <button key={s} onClick={() => setSubjFilter(s)}
                className={`px-4 py-1.5 rounded-full text-xs font-semibold transition-colors shrink-0 ${
                  subjFilter === s ? "bg-[#6B5CE7] text-white shadow-sm" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                }`}>
                {s}
              </button>
            ))}
          </div>
        </div>
        <div className="flex-1 overflow-y-auto px-5 py-2 space-y-3" style={{ scrollbarWidth: "thin" }}>
          {historyStatus === "loading" ? (
            <p className="text-center text-slate-400 text-sm py-8">Loading...</p>
          ) : filteredHistory.length === 0 ? (
            <p className="text-center text-slate-400 text-sm py-8">No doubts found</p>
          ) : (
            filteredHistory.map((item) => (
              <HistoryCard key={item._id || item.id} item={item} onStar={toggleStar} />
            ))
          )}
        </div>
      </aside>
    </div>
  );
}
