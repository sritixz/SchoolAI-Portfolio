import { useState, useRef, useEffect, useCallback } from "react";
import { useAuth } from "../context/AuthContext";
import { getFirstName, getInitial } from "../utils/nameUtils";
import { VIN_AVATAR } from "../data/vinAiData";
import { parseVinXML } from "../utils/xmlParser";

// ── Streaming Message Renderer ──
function StreamingMessage({ xmlBuffer, done, onFollowup }) {
  const parsed = parseVinXML(xmlBuffer);

  return (
    <div className="space-y-3">
      {parsed.content && (
        <div className="text-sm text-slate-800 leading-relaxed">
          <span dangerouslySetInnerHTML={{ __html: parsed.content }} />
          {!done && <span className="inline-block w-0.5 h-4 bg-[#695be6] ml-0.5 animate-pulse align-middle" />}
        </div>
      )}

      {parsed.hint && (
        <details className="group bg-[#FFE5E5] rounded-lg overflow-hidden" open>
          <summary className="flex items-center justify-between px-3 py-2 cursor-pointer list-none">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-red-500 text-sm">lightbulb</span>
              <span className="text-red-700 text-xs font-bold uppercase tracking-wider">Hint</span>
            </div>
            <span className="material-symbols-outlined text-red-500 group-open:rotate-180 transition-transform text-sm">keyboard_arrow_down</span>
          </summary>
          <div className="px-3 pb-3 border-t border-red-100 pt-2">
            <p className="text-red-800 text-xs leading-relaxed" dangerouslySetInnerHTML={{ __html: parsed.hint }} />
          </div>
        </details>
      )}

      {parsed.steps.length > 0 && (
        <div className="bg-[#C8E6C9] p-3 rounded-lg space-y-2">
          <h4 className="text-green-800 font-bold text-xs flex items-center gap-2 uppercase tracking-wider">
            <span className="material-symbols-outlined text-green-600 text-sm">checklist</span>
            Step-by-Step
          </h4>
          <ul className="space-y-2 pt-1">
            {parsed.steps.map((s) => (
              <li key={s.number} className="flex gap-2">
                <div className="size-5 shrink-0 rounded-full bg-white flex items-center justify-center text-xs font-bold text-green-700 shadow-sm">{s.number}</div>
                <p className="text-xs text-green-900" dangerouslySetInnerHTML={{ __html: s.text }} />
              </li>
            ))}
          </ul>
        </div>
      )}

      {done && parsed.followups.length > 0 && (
        <div className="flex gap-2 overflow-x-auto pb-2 whitespace-nowrap pt-2" style={{ scrollbarWidth: "none" }}>
          {parsed.followups.map((f, i) => (
            <button key={i} onClick={() => onFollowup(f)}
              className="bg-white text-[#695be6] border border-slate-200 px-3 py-1.5 rounded-full text-xs font-medium hover:bg-[#695be6]/5 transition-colors shrink-0">
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

// ── Typing Dots ──
function TypingDots() {
  return (
    <div className="flex gap-3 items-start">
      <div className="size-7 rounded-full bg-white border border-slate-200 shrink-0 overflow-hidden">
        <img src={VIN_AVATAR} alt="LumiTutor" className="w-full h-full object-cover" />
      </div>
      <div className="bg-white border-l-4 border-[#D4C5F9] px-4 py-3 rounded-2xl rounded-tl-none shadow-sm flex items-center gap-1.5">
        {[0, 1, 2].map((i) => (
          <span key={i} className="size-2 bg-[#695be6]/40 rounded-full animate-bounce" style={{ animationDelay: `${i * 0.15}s` }} />
        ))}
      </div>
    </div>
  );
}

// ── Main Side Panel Component ──
export default function VinSidePanel({ isOpen, onClose, context = null, homeworkContext = null }) {
  const { user } = useAuth();
  const bottomRef = useRef(null);
  const textareaRef = useRef(null);

  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [status, setStatus] = useState("idle"); // idle | thinking | streaming

  const chatHistoryRef = useRef([]);
  const recognitionRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const silenceTimerRef = useRef(null);
  const audioContextRef = useRef(null);
  const [isListening, setIsListening] = useState(false);
  const [voiceError, setVoiceError] = useState("");

  const stopRecording = useCallback(async () => {
    if (silenceTimerRef.current) {
      clearTimeout(silenceTimerRef.current);
      silenceTimerRef.current = null;
    }
    if (audioContextRef.current) {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }
    if (!mediaRecorderRef.current || mediaRecorderRef.current.state === "inactive") return;
    mediaRecorderRef.current.stop();
    setIsListening(false);
  }, []);

  const startSilenceDetection = (stream) => {
    const audioContext = new AudioContext();
    const analyser = audioContext.createAnalyser();
    const source = audioContext.createMediaStreamSource(stream);
    source.connect(analyser);
    analyser.fftSize = 256;
    audioContextRef.current = audioContext;
    const checkSilence = () => {
      if (!isListening || !audioContextRef.current) return;
      const dataArray = new Uint8Array(analyser.frequencyBinCount);
      analyser.getByteFrequencyData(dataArray);
      const avg = dataArray.reduce((a, b) => a + b, 0) / dataArray.length;
      if (avg < 5) {
        if (!silenceTimerRef.current) {
          silenceTimerRef.current = setTimeout(() => stopRecording(), 3000);
        }
      } else {
        if (silenceTimerRef.current) { clearTimeout(silenceTimerRef.current); silenceTimerRef.current = null; }
      }
      if (isListening) requestAnimationFrame(checkSilence);
    };
    checkSilence();
  };

  const toggleVoice = useCallback(async () => {
    if (isListening) { stopRecording(); return; }
    setVoiceError("");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      audioChunksRef.current = [];
      mediaRecorder.ondataavailable = (e) => { if (e.data.size > 0) audioChunksRef.current.push(e.data); };
      mediaRecorder.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop());
        if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
        if (audioContextRef.current) { audioContextRef.current.close(); audioContextRef.current = null; }
        const blob = new Blob(audioChunksRef.current, { type: "audio/webm" });
        if (blob.size < 1000) return;
        const formData = new FormData();
        formData.append("file", blob, "voice.webm");
        try {
          const authToken = JSON.parse(localStorage.getItem("vin_auth") || "{}")?.token;
          const res = await fetch(`${import.meta.env.VITE_API_BASE_URL}/vin-ai/transcribe`, {
            method: "POST", headers: { Authorization: `Bearer ${authToken}` }, body: formData,
          });
          if (!res.ok) throw new Error("Transcription failed");
          const { text } = await res.json();
          if (text?.trim()) setInput((prev) => prev ? prev + " " + text.trim() : text.trim());
        } catch { setVoiceError("Transcription failed. Please try again."); }
      };
      mediaRecorder.start(100);
      mediaRecorderRef.current = mediaRecorder;
      setIsListening(true);
      startSilenceDetection(stream);
    } catch { setVoiceError("Microphone access denied. Please allow mic in browser settings."); }
  }, [isListening, stopRecording]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, status]);

  // Add context message when panel opens
  useEffect(() => {
    if (isOpen && context && messages.length === 0) {
      setInput(context);
    }
  }, [isOpen, context]);

  // ─── SSE streaming helper ───
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
          setStatus("idle");
          return xmlBuf;
        }
        xmlBuf += data.replace(/\\n/g, "\n");
        setMessages((p) => p.map((m) => m.id === assistantId ? { ...m, xmlBuffer: xmlBuf } : m));
      }
    }
    return xmlBuf;
  }, []);

  // ─── SEND MESSAGE ───
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
      const xmlBuf = await streamSSE("/vin-ai/chat", { message: trimmed, history: chatHistoryRef.current, homework_context: homeworkContext || null }, assistantId);
      chatHistoryRef.current = [...chatHistoryRef.current, { role: "assistant", content: xmlBuf }];
    } catch (err) {
      console.error("Stream error:", err);
      const errXml = `<response><subject>General</subject><content>Sorry, something went wrong. Please try again.</content><followups><followup>Try again</followup></followups></response>`;
      setMessages((p) => p.map((m) => m.id === assistantId ? { ...m, xmlBuffer: errXml, done: true } : m));
      setStatus("idle");
    }
  }, [status, streamSSE]);

  const statusLabel =
    status === "thinking" ? "LumiTutor is thinking..." :
    status === "streaming" ? "LumiTutor is typing..." : "LumiTutor is here to help";

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex justify-end bg-black/20 backdrop-blur-sm" onClick={onClose}>
      <div
        className="w-full sm:max-w-md h-full bg-white shadow-2xl flex flex-col animate-slide-in-right"
        onClick={(e) => e.stopPropagation()}
        style={{ fontFamily: "'Lexend', sans-serif" }}
      >
        {/* Header */}
        <header className="h-16 shrink-0 flex items-center justify-between px-5 shadow-md"
          style={{ background: "linear-gradient(90deg, #6B5CE7 0%, #D4C5F9 100%)" }}>
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
          <button onClick={onClose} className="text-white hover:bg-white/10 p-2 rounded-full transition-colors">
            <span className="material-symbols-outlined">close</span>
          </button>
        </header>

        {/* Chat Area */}
        <main className="flex-1 overflow-y-auto px-4 py-6" style={{ scrollbarWidth: "thin" }}>
          <div className="flex flex-col gap-6">
            {messages.length === 0 && (
              <div className="flex flex-col items-center text-center py-8 gap-3">
                <div className="size-16 rounded-full bg-white border-2 border-[#695be6]/20 overflow-hidden shadow-lg">
                  <img src={VIN_AVATAR} alt="LumiTutor" className="w-full h-full object-cover" />
                </div>
                <div>
                  <h2 className="text-xl font-black text-slate-800">Hi {getFirstName(user?.name) || "there"}!</h2>
                  <p className="text-slate-500 mt-1 text-sm">Ask me anything about this homework.</p>
                </div>
              </div>
            )}

            {messages.map((msg) => (
              <div key={msg.id}>
                {msg.role === "user" ? (
                  <div className="flex justify-end items-end gap-2">
                    <div className="flex flex-col gap-1 items-end max-w-[85%]">
                      <p className="text-slate-500 text-xs font-medium mr-2">You</p>
                      <div className="bg-[#695be6] text-white px-4 py-3 rounded-2xl rounded-tr-none shadow-sm">
                        <p className="text-sm">{msg.text}</p>
                      </div>
                    </div>
                    <div className="size-7 rounded-full bg-slate-200 overflow-hidden mb-1 shrink-0">
                      {user?.avatar
                        ? <img src={user.avatar} alt="you" className="w-full h-full object-cover" />
                        : <div className="w-full h-full bg-[#695be6] flex items-center justify-center text-white text-xs font-bold">{getInitial(user?.name) ?? "S"}</div>
                      }
                    </div>
                  </div>
                ) : (
                  <div className="flex justify-start items-start gap-2">
                    <div className="size-7 rounded-full bg-white overflow-hidden mt-1 shrink-0 border border-slate-200">
                      <img src={VIN_AVATAR} alt="LumiTutor" className="w-full h-full object-cover" />
                    </div>
                    <div className="flex flex-col gap-2 max-w-[85%]">
                      <p className="text-slate-500 text-xs font-medium ml-1">LumiTutor</p>
                      <div className="bg-white border-l-4 border-[#D4C5F9] p-4 rounded-2xl rounded-tl-none shadow-sm">
                        <StreamingMessage
                          xmlBuffer={msg.xmlBuffer}
                          done={msg.done}
                          onFollowup={sendMessage}
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

        {/* Input Footer */}
        <footer className="bg-white border-t border-slate-200 p-4 shrink-0">
          <div className="space-y-2">
            <div className="flex items-end gap-2 bg-slate-50 border border-slate-200 rounded-xl p-2">
              <textarea
                ref={textareaRef}
                rows={1}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(input); } }}
                placeholder="Ask your doubt..."
                className="w-full bg-transparent border-none focus:ring-0 text-slate-800 text-sm py-2 resize-none max-h-32"
                style={{ scrollbarWidth: "thin" }}
              />
              <button
                onClick={toggleVoice}
                title={isListening ? "Click to stop" : "Click to speak"}
                className={`size-9 flex items-center justify-center rounded-lg transition-all shrink-0 ${
                  isListening
                    ? "bg-red-500 text-white animate-pulse shadow-lg shadow-red-200"
                    : "bg-slate-100 text-slate-500 hover:bg-slate-200"
                }`}
              >
                <span className="material-symbols-outlined text-[20px]">
                  {isListening ? "mic" : "mic_none"}
                </span>
              </button>
              <button onClick={() => sendMessage(input)} disabled={!input.trim() || status !== "idle"}
                className="bg-[#695be6] text-white size-9 flex items-center justify-center rounded-lg hover:bg-[#695be6]/90 transition-transform active:scale-95 shrink-0 shadow-sm disabled:opacity-40">
                <span className="material-symbols-outlined text-[20px]">send</span>
              </button>
            </div>
            <p className="text-[10px] text-center text-slate-400">LumiTutor can make mistakes. Verify important information.</p>
            {voiceError && (
              <p className="text-[11px] text-center text-red-500 font-medium">{voiceError}</p>
            )}
          </div>
        </footer>
      </div>
    </div>
  );
}
