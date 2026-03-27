import { useState, useRef, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import {
  VIN_AVATAR, QUICK_ACTIONS, DOUBT_HISTORY,
  SUBJECT_BADGE, SIDEBAR_SUBJECTS, matchResponse,
} from "../../data/vinAiData";

// ─────────────────────────────────────────────────────────────
// STREAMING HOOK
// Simulates token-by-token streaming for text blocks.
// Returns { displayedText, isDone }
// ─────────────────────────────────────────────────────────────
function useStreaming(fullText, enabled, onDone) {
  const [displayed, setDisplayed] = useState("");
  const [done, setDone]           = useState(false);
  const idx = useRef(0);
  const timer = useRef(null);

  useEffect(() => {
    if (!enabled || !fullText) { setDisplayed(fullText || ""); setDone(true); return; }
    idx.current = 0;
    setDisplayed("");
    setDone(false);

    // Stream word by word (feels more natural than char by char)
    const words = fullText.split(" ");
    timer.current = setInterval(() => {
      idx.current += 1;
      setDisplayed(words.slice(0, idx.current).join(" "));
      if (idx.current >= words.length) {
        clearInterval(timer.current);
        setDone(true);
        onDone?.();
      }
    }, 38); // ~26 words/sec

    return () => clearInterval(timer.current);
  }, [fullText, enabled]);

  return { displayed, done };
}

// ─────────────────────────────────────────────────────────────
// STREAMING AI MESSAGE
// Streams text blocks one after another, then reveals
// structured blocks (formula, hint, steps, etc.) sequentially.
// ─────────────────────────────────────────────────────────────
function StreamingMessage({ blocks, followUps, onPractice, onAllDone }) {
  // Split blocks into text (streamed) and rich (revealed after)
  const [revealedCount, setRevealedCount] = useState(0);
  const [streamIdx, setStreamIdx]         = useState(0); // which text block is streaming

  // Flatten: each block gets streamed or revealed in order
  const advance = useCallback(() => {
    setRevealedCount((c) => {
      const next = c + 1;
      if (next >= blocks.length) onAllDone?.();
      return next;
    });
  }, [blocks.length, onAllDone]);

  return (
    <div className="space-y-4">
      {blocks.map((block, i) => {
        if (i > revealedCount) return null; // not yet revealed

        if (block.type === "text") {
          return (
            <StreamingTextBlock
              key={i}
              html={block.html}
              active={i === revealedCount}
              onDone={advance}
            />
          );
        }
        // Rich blocks appear instantly once their turn comes
        return (
          <div
            key={i}
            className="animate-fade-in"
            style={{ animation: "fadeIn 0.3s ease" }}
          >
            <RenderRichBlock block={block} onPractice={onPractice} />
          </div>
        );
      })}

      {/* Follow-ups appear after all blocks done */}
      {revealedCount >= blocks.length && followUps?.length > 0 && (
        <div className="flex gap-2 overflow-x-auto pb-2 whitespace-nowrap pt-2" style={{ scrollbarWidth: "none" }}>
          {followUps.map((s, i) => (
            <button
              key={i}
              onClick={() => onPractice?.__sendMessage?.(s)}
              className="bg-white text-[#695be6] border border-slate-200 px-4 py-2 rounded-full text-sm font-medium hover:bg-[#695be6]/5 transition-colors shrink-0"
            >
              {s}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// Streams a single text block word by word, then calls onDone
function StreamingTextBlock({ html, active, onDone }) {
  // Strip HTML tags for streaming, re-inject after done
  const plainText = html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
  const { displayed, done } = useStreaming(plainText, active, onDone);

  return (
    <p className="text-sm md:text-base text-slate-800 leading-relaxed">
      {done
        ? <span dangerouslySetInnerHTML={{ __html: html }} />
        : <>{displayed}<span className="inline-block w-0.5 h-4 bg-[#695be6] ml-0.5 animate-pulse align-middle" /></>
      }
    </p>
  );
}

// ─────────────────────────────────────────────────────────────
// RICH BLOCK RENDERERS (non-text)
// ─────────────────────────────────────────────────────────────
function RenderRichBlock({ block, onPractice }) {
  if (block.type === "formula") {
    return (
      <div className="bg-slate-50 p-4 rounded-lg flex justify-center items-center font-serif text-lg md:text-xl text-[#695be6] border border-slate-100">
        <span>{block.formula}</span>
      </div>
    );
  }
  if (block.type === "hint") {
    return (
      <details className="group bg-[#FFE5E5] rounded-lg overflow-hidden" open>
        <summary className="flex items-center justify-between px-4 py-3 cursor-pointer list-none">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-red-500">lightbulb</span>
            <span className="text-red-700 text-sm font-bold uppercase tracking-wider">{block.label}</span>
          </div>
          <span className="material-symbols-outlined text-red-500 group-open:rotate-180 transition-transform">keyboard_arrow_down</span>
        </summary>
        <div className="px-4 pb-4 border-t border-red-100 pt-3">
          <p className="text-red-800 text-sm leading-relaxed">{block.text}</p>
        </div>
      </details>
    );
  }
  if (block.type === "steps") {
    return (
      <div className="bg-[#C8E6C9] p-4 rounded-lg space-y-3">
        <h4 className="text-green-800 font-bold text-sm flex items-center gap-2 uppercase tracking-wider">
          <span className="material-symbols-outlined text-green-600">checklist</span>
          Step-by-Step Breakdown
        </h4>
        <ul className="space-y-3 pt-1">
          {block.steps.map((s) => (
            <li key={s.number} className="flex gap-3">
              <div className="size-6 shrink-0 rounded-full bg-white flex items-center justify-center text-xs font-bold text-green-700 shadow-sm">{s.number}</div>
              <p className="text-sm text-green-900" dangerouslySetInnerHTML={{ __html: s.html }} />
            </li>
          ))}
        </ul>
      </div>
    );
  }
  if (block.type === "example") {
    return (
      <div className="bg-[#695be6]/5 border border-[#695be6]/20 p-4 rounded-lg space-y-2">
        <p className="text-sm font-bold text-[#695be6] uppercase tracking-wide">{block.title}</p>
        <div className="text-sm text-slate-700 space-y-1">
          {block.lines.map((l, i) => <p key={i} dangerouslySetInnerHTML={{ __html: l }} />)}
        </div>
      </div>
    );
  }
  if (block.type === "search_actions") {
    return (
      <div className="flex flex-col sm:flex-row gap-3 pt-1">
        <button className="flex-1 flex items-center justify-center gap-2 bg-white border border-slate-200 hover:border-blue-400/50 py-3 rounded-xl transition-all shadow-sm">
          <svg className="size-4" viewBox="0 0 24 24"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.66l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/></svg>
          <span className="text-sm font-semibold text-slate-700">Search Google</span>
        </button>
        <button className="flex-1 flex items-center justify-center gap-2 bg-white border border-slate-200 hover:border-red-400/50 py-3 rounded-xl transition-all shadow-sm">
          <span className="material-symbols-outlined text-red-600 text-xl">play_circle</span>
          <span className="text-sm font-semibold text-slate-700">Watch YouTube</span>
        </button>
      </div>
    );
  }
  if (block.type === "practice") {
    return (
      <button
        onClick={() => onPractice?.(block.problem)}
        className="w-full flex items-center justify-center gap-2 py-3 bg-[#695be6] text-white font-bold rounded-xl hover:bg-[#5a4dd4] transition-colors shadow-lg shadow-[#695be6]/20"
      >
        <span className="material-symbols-outlined">quiz</span>
        Open Practice Problem
      </button>
    );
  }
  return null;
}

// ─────────────────────────────────────────────────────────────
// DOUBT DETAIL VIEW
// Full conversation detail for a history item
// ─────────────────────────────────────────────────────────────
const RELATED_DOUBTS = [
  { id: "rd1", subject: "Algebra",   title: "Factoring Trinomials",    preview: "How do I factor when the leading coefficient is greater than 1?" },
  { id: "rd2", subject: "Algebra",   title: "Completing the Square",   preview: "When is it better to complete the square vs using the formula?" },
  { id: "rd3", subject: "Functions", title: "Vertex Form",             preview: "Finding the vertex from the standard form equation." },
];

// Vin detail response — static for history items
const DETAIL_RESPONSE = {
  intro: "That's a great question! Quadratic equations with negative coefficients can be tricky. Let's break it down together.",
  hint: { label: "Hint 1", text: "Think about the quadratic formula: x = [-b ± sqrt(b² - 4ac)] / 2a. Identify your a, b, and c values first. Be careful with the signs!" },
  steps: [
    { number: 1, title: "Identify coefficients (a, b, c)", body: "Make sure the equation is in the form ax² + bx + c = 0. Here, a=1, b=-5, and c=6." },
    { number: 2, title: "Calculate the discriminant",      body: "Find b² - 4ac. This tells you if the solutions are real or imaginary." },
    { number: 3, title: "Apply the quadratic formula",     body: "Plug the values back into the formula to find the two possible values for x." },
  ],
};

function DoubtDetail({ item, onBack, onContinue }) {
  const [streaming, setStreaming] = useState(true);
  const words = DETAIL_RESPONSE.intro.split(" ");
  const [displayed, setDisplayed] = useState("");
  const [showRich, setShowRich]   = useState(false);
  const timerRef = useRef(null);
  const idx = useRef(0);

  useEffect(() => {
    idx.current = 0;
    setDisplayed("");
    setShowRich(false);
    setStreaming(true);
    timerRef.current = setInterval(() => {
      idx.current += 1;
      setDisplayed(words.slice(0, idx.current).join(" "));
      if (idx.current >= words.length) {
        clearInterval(timerRef.current);
        setStreaming(false);
        setTimeout(() => setShowRich(true), 200);
      }
    }, 38);
    return () => clearInterval(timerRef.current);
  }, [item.id]);

  return (
    <div className="min-h-screen bg-[#f6f6f8] flex flex-col" style={{ fontFamily: "'Lexend', sans-serif" }}>
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-white/80 backdrop-blur-md border-b border-[#e9e8f3]">
        <div className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button onClick={onBack} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
              <span className="material-symbols-outlined">arrow_back</span>
            </button>
            <h2 className="text-lg font-bold tracking-tight">Doubt Details</h2>
          </div>
          <div className="flex items-center gap-6">
            <span className="text-sm text-gray-500 font-medium">{item.relativeTime}</span>
            <button className="p-2 hover:bg-gray-100 rounded-full transition-colors">
              <span className="material-symbols-outlined">more_vert</span>
            </button>
          </div>
        </div>
      </header>

      <main className="flex-1 mt-20 mb-32 max-w-4xl mx-auto w-full px-6 py-6">
        {/* Student message — LEFT */}
        <div className="flex items-start gap-4 mb-8">
          <div className="size-10 rounded-full bg-[#685ae7]/10 flex items-center justify-center shrink-0">
            <span className="material-symbols-outlined text-[#685ae7]">person</span>
          </div>
          <div className="flex flex-col gap-2 max-w-[80%]">
            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Student</span>
            <div className="bg-blue-50 border border-blue-100 p-4 rounded-xl rounded-tl-none shadow-sm">
              <p className="text-base leading-relaxed mb-4">{item.question}</p>
              {/* Placeholder image for doubts that had an image */}
              {item.id === "dh1" && (
                <div className="rounded-lg overflow-hidden border border-gray-200 bg-slate-100 flex items-center justify-center h-32">
                  <span className="material-symbols-outlined text-4xl text-slate-300">image</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Vin response — RIGHT */}
        <div className="flex items-start justify-end gap-4 mb-12">
          <div className="flex flex-col gap-2 max-w-[85%] items-end">
            <span className="text-xs font-semibold text-[#685ae7] uppercase tracking-wider">Vin • Academic Assistant</span>
            <div className="bg-white border-2 border-[#685ae7]/30 p-6 rounded-xl rounded-tr-none shadow-sm w-full space-y-5">
              {/* Streaming intro text */}
              <p className="text-base leading-relaxed text-slate-800">
                {!streaming
                  ? DETAIL_RESPONSE.intro
                  : <>{displayed}<span className="inline-block w-0.5 h-4 bg-[#685ae7] ml-0.5 animate-pulse align-middle" /></>
                }
              </p>

              {/* Rich blocks revealed after streaming */}
              {showRich && (
                <>
                  {/* Collapsible hint */}
                  <details className="group border border-[#685ae7]/20 bg-[#685ae7]/5 rounded-lg overflow-hidden" open>
                    <summary className="flex items-center justify-between p-4 cursor-pointer list-none">
                      <div className="flex items-center gap-2">
                        <span className="material-symbols-outlined text-[#685ae7]">lightbulb</span>
                        <span className="font-bold text-sm text-[#685ae7]">{DETAIL_RESPONSE.hint.label}</span>
                      </div>
                      <span className="material-symbols-outlined group-open:rotate-180 transition-transform">expand_more</span>
                    </summary>
                    <div className="px-4 pb-4 text-sm text-gray-600 leading-relaxed border-t border-[#685ae7]/10 pt-3">
                      {DETAIL_RESPONSE.hint.text}
                    </div>
                  </details>

                  {/* Step-by-step */}
                  <div className="space-y-5">
                    {DETAIL_RESPONSE.steps.map((s) => (
                      <div key={s.number} className="flex gap-4">
                        <div className="size-8 rounded-full bg-[#685ae7] text-white flex items-center justify-center shrink-0 font-bold text-sm">
                          {s.number}
                        </div>
                        <div>
                          <h4 className="font-bold mb-1">{s.title}</h4>
                          <p className="text-sm text-gray-600">{s.body}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>
          </div>
          {/* Vin avatar */}
          <div className="size-10 rounded-full bg-[#685ae7] flex items-center justify-center shrink-0">
            <span className="material-symbols-outlined text-white">smart_toy</span>
          </div>
        </div>

        {/* Related doubts */}
        <section className="mb-8">
          <details className="group bg-white border border-[#e9e8f3] rounded-xl overflow-hidden shadow-sm" open>
            <summary className="flex items-center justify-between p-5 cursor-pointer list-none">
              <span className="font-bold text-gray-700">Related Doubts You Asked</span>
              <span className="material-symbols-outlined group-open:rotate-180 transition-transform">expand_more</span>
            </summary>
            <div className="p-5 pt-0 grid grid-cols-1 md:grid-cols-3 gap-4 border-t border-[#e9e8f3]">
              {RELATED_DOUBTS.map((rd) => (
                <div key={rd.id} className="p-4 bg-[#f6f6f8] rounded-lg border border-[#e9e8f3] hover:border-[#685ae7] transition-colors cursor-pointer group/card">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[10px] font-bold uppercase text-[#685ae7]/70 tracking-widest">{rd.subject}</span>
                    <span className="material-symbols-outlined text-xs text-gray-400 group-hover/card:text-[#685ae7]">open_in_new</span>
                  </div>
                  <h5 className="text-sm font-semibold mb-1 truncate">{rd.title}</h5>
                  <p className="text-xs text-gray-500 line-clamp-2">{rd.preview}</p>
                </div>
              ))}
            </div>
          </details>
        </section>
      </main>

      {/* Sticky footer */}
      <footer className="fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-md border-t border-[#e9e8f3] px-6 py-5 z-50">
        <div className="max-w-5xl mx-auto flex items-center gap-4">
          <button
            onClick={onContinue}
            className="flex-1 bg-[#685ae7] text-white py-3 px-6 rounded-xl font-bold flex items-center justify-center gap-2 hover:opacity-90 active:scale-[0.98] transition-all"
          >
            <span className="material-symbols-outlined">chat_bubble</span>
            Continue Conversation
          </button>
          <div className="flex items-center gap-2">
            <button className="p-3 bg-[#685ae7]/10 text-[#685ae7] rounded-xl hover:bg-[#685ae7]/20 transition-colors" title="Practice Similar">
              <span className="material-symbols-outlined">quiz</span>
            </button>
            <button className="p-3 bg-gray-100 text-gray-600 rounded-xl hover:bg-gray-200 transition-colors" title="Share with Teacher">
              <span className="material-symbols-outlined">share</span>
            </button>
            <button className="p-3 bg-gray-100 text-gray-600 rounded-xl hover:bg-gray-200 transition-colors" title="Bookmark">
              <span className="material-symbols-outlined">bookmark</span>
            </button>
          </div>
        </div>
      </footer>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// PRACTICE MCQ OVERLAY
// ─────────────────────────────────────────────────────────────
function PracticeMode({ problem, onClose }) {
  const [selected, setSelected] = useState(null);
  const [checked,  setChecked]  = useState(false);
  const correct = problem.options.find((o) => o.isCorrect);

  return (
    <div className="fixed inset-0 z-50 bg-[#f6f6f8] flex flex-col overflow-y-auto" style={{ fontFamily: "'Lexend', sans-serif" }}>
      <header className="flex items-center justify-between border-b border-[#685ae7]/10 bg-white/80 backdrop-blur-md px-6 py-4 lg:px-20 sticky top-0 z-10">
        <div className="flex items-center gap-3">
          <div className="flex size-10 items-center justify-center rounded-lg bg-[#685ae7] text-white">
            <span className="material-symbols-outlined">auto_awesome</span>
          </div>
          <div>
            <h2 className="text-base font-bold">Vin AI</h2>
            <p className="text-xs font-medium text-[#685ae7]/70">{problem.level}</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={onClose} className="flex items-center gap-2 rounded-lg bg-[#685ae7]/10 px-4 py-2 text-sm font-semibold text-[#685ae7] hover:bg-[#685ae7]/20 transition-colors">
            <span className="material-symbols-outlined text-sm">chat_bubble</span>Back to Chat
          </button>
          <button onClick={onClose} className="flex size-10 items-center justify-center rounded-lg bg-gray-100 text-gray-500 hover:bg-gray-200">
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>
      </header>

      <main className="flex flex-1 flex-col items-center py-12 px-6">
        <div className="w-full max-w-[800px]">
          <div className="mb-10 flex flex-col gap-3">
            <div className="flex items-center justify-between text-sm font-semibold text-gray-600">
              <span className="flex items-center gap-2">
                <span className="flex size-6 items-center justify-center rounded-full bg-[#685ae7]/20 text-[10px] text-[#685ae7]">01</span>
                Practice Problem 1
              </span>
              <span>25% Complete</span>
            </div>
            <div className="h-2.5 w-full rounded-full bg-[#685ae7]/10 overflow-hidden">
              <div className="h-full w-1/4 rounded-full bg-[#685ae7]" />
            </div>
          </div>

          <div className="rounded-xl bg-white p-8 shadow-sm border border-[#685ae7]/5 mb-8">
            <div className="mb-4 inline-flex items-center rounded-full bg-[#685ae7]/5 px-3 py-1 text-xs font-bold uppercase tracking-wider text-[#685ae7]">{problem.level}</div>
            <h1 className="text-3xl font-bold leading-tight text-[#100e1b] lg:text-4xl" dangerouslySetInnerHTML={{ __html: `Solve for x: ${problem.questionDisplay || problem.question}` }} />
            <p className="mt-4 text-lg text-gray-500">{problem.description}</p>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {problem.options.map((opt) => {
              const isSel  = selected === opt.id;
              const isGood = checked && opt.isCorrect;
              const isBad  = checked && isSel && !opt.isCorrect;
              return (
                <label key={opt.id} className={`group relative flex cursor-pointer flex-col gap-2 rounded-xl border-2 p-6 transition-all
                  ${isGood ? "border-green-500 bg-green-50" : isBad ? "border-red-400 bg-red-50" : isSel ? "border-[#685ae7] bg-[#685ae7]/5 shadow-lg" : "border-transparent bg-white hover:border-[#685ae7]/30 hover:shadow-md"}`}>
                  <input type="radio" name="popt" className="hidden" onChange={() => !checked && setSelected(opt.id)} />
                  <div className="flex items-center justify-between">
                    <span className={`flex size-8 items-center justify-center rounded-lg font-bold text-sm ${isSel ? "bg-[#685ae7] text-white" : "bg-gray-100 text-gray-500"}`}>{opt.id}</span>
                    <div className={`size-5 rounded-full border-2 ${isSel ? "border-[#685ae7] bg-[#685ae7] ring-2 ring-white ring-offset-2" : "border-gray-300"}`} />
                  </div>
                  <div className="mt-2 text-2xl font-bold text-[#100e1b]">{opt.text}</div>
                  <div className={`text-sm font-medium ${isSel ? "text-[#685ae7]/80" : "text-gray-500"}`}>Option {opt.id}</div>
                </label>
              );
            })}
          </div>

          {checked && (
            <div className={`mt-6 p-4 rounded-xl flex items-start gap-3 ${selected === correct.id ? "bg-green-50 border border-green-200" : "bg-red-50 border border-red-200"}`}>
              <span className={`material-symbols-outlined text-2xl ${selected === correct.id ? "text-green-600" : "text-red-500"}`}>{selected === correct.id ? "check_circle" : "cancel"}</span>
              <div>
                <p className={`font-bold ${selected === correct.id ? "text-green-800" : "text-red-700"}`}>
                  {selected === correct.id ? "Correct! Well done." : `Not quite. The correct answer is ${correct.text}.`}
                </p>
                <p className="text-sm text-gray-600 mt-1">
                  {selected === correct.id ? "x² + 5x + 6 = (x+2)(x+3) = 0, so x = -2 or x = -3." : "Try factoring: find two numbers that multiply to 6 and add to 5."}
                </p>
              </div>
            </div>
          )}

          <div className="mt-10 flex flex-col items-center gap-4">
            {!checked
              ? <button onClick={() => selected && setChecked(true)} disabled={!selected} className="flex min-w-[240px] items-center justify-center gap-2 rounded-xl bg-[#685ae7] py-4 px-8 text-lg font-bold text-white shadow-xl shadow-[#685ae7]/20 hover:scale-[1.02] transition-all disabled:opacity-40">Check Answer<span className="material-symbols-outlined">chevron_right</span></button>
              : <button onClick={onClose} className="flex min-w-[240px] items-center justify-center gap-2 rounded-xl bg-[#685ae7] py-4 px-8 text-lg font-bold text-white shadow-xl shadow-[#685ae7]/20 hover:scale-[1.02] transition-all">Back to Chat<span className="material-symbols-outlined">chat_bubble</span></button>
            }
            <p className="flex items-center gap-2 text-sm font-medium text-gray-500"><span className="material-symbols-outlined text-[18px]">lightbulb</span>Need a hint? Just ask Vin AI</p>
          </div>
        </div>
      </main>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// TYPING DOTS
// ─────────────────────────────────────────────────────────────
function TypingDots() {
  return (
    <div className="flex gap-4 items-start">
      <div className="size-8 rounded-full bg-white border border-slate-200 shrink-0 overflow-hidden flex items-center justify-center">
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
// SIDEBAR HISTORY CARD
// ─────────────────────────────────────────────────────────────
function HistoryCard({ item, onSelect, onDetail, onStar }) {
  const badge = SUBJECT_BADGE[item.subject] || { bg: "bg-gray-100", text: "text-gray-600" };
  return (
    <div
      onClick={() => onDetail(item)}
      className="group p-4 bg-white border border-slate-100 rounded-xl hover:border-[#6B5CE7]/30 hover:shadow-md transition-all cursor-pointer"
    >
      <div className="flex justify-between items-start mb-2">
        <span className={`px-2 py-0.5 text-[10px] font-bold rounded uppercase ${badge.bg} ${badge.text}`}>{item.subject}</span>
        <span className="text-[10px] text-slate-400 font-medium">{item.relativeTime}</span>
      </div>
      <p className="text-sm text-slate-700 font-medium line-clamp-2 mb-3">{item.question}</p>
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-1.5">
          <span className="material-symbols-outlined text-green-500 text-lg">check_circle</span>
          <span className="text-xs text-green-600 font-medium">Resolved</span>
        </div>
        <button
          onClick={(e) => { e.stopPropagation(); onStar(item.id); }}
          className={`transition-colors ${item.starred ? "text-amber-400" : "text-slate-300 hover:text-amber-400"}`}
        >
          <span className="material-symbols-outlined text-lg" style={{ fontVariationSettings: item.starred ? "'FILL' 1" : "'FILL' 0" }}>star</span>
        </button>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// MAIN VIN AI PAGE
// ─────────────────────────────────────────────────────────────
export default function VinAI() {
  const { user }  = useAuth();
  const navigate  = useNavigate();
  const bottomRef = useRef(null);
  const textareaRef = useRef(null);

  const [messages,   setMessages]   = useState([]);
  const [input,      setInput]      = useState("");
  const [status,     setStatus]     = useState("idle");
  const [practice,   setPractice]   = useState(null);
  const [detailItem, setDetailItem] = useState(null);
  const [history,    setHistory]    = useState(DOUBT_HISTORY);
  const [subjFilter, setSubjFilter] = useState("All");
  const [search,     setSearch]     = useState("");

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages, status]);

  const sendMessage = useCallback((text) => {
    const trimmed = text.trim();
    if (!trimmed) return;
    setDetailItem(null); // close detail if open
    setMessages((p) => [...p, { id: Date.now(), role: "user", text: trimmed, streaming: false, blocks: [], followUps: [] }]);
    setInput("");
    setStatus("thinking");
    setTimeout(() => setStatus("typing"), 600);
    setTimeout(() => {
      const resp = matchResponse(trimmed);
      setMessages((p) => [...p, {
        id: Date.now() + 1,
        role: "assistant",
        text: null,
        streaming: true,   // triggers StreamingMessage
        blocks: resp.blocks,
        followUps: resp.followUps,
      }]);
      setStatus("idle");
    }, 1400);
  }, []);

  const toggleStar = (id) => setHistory((p) => p.map((h) => h.id === id ? { ...h, starred: !h.starred } : h));

  const filteredHistory = history.filter((h) => {
    const matchSubj   = subjFilter === "All" || h.subject === subjFilter;
    const matchSearch = !search || h.question.toLowerCase().includes(search.toLowerCase());
    return matchSubj && matchSearch;
  });

  const statusLabel = status === "thinking" ? "Vin is thinking..." : status === "typing" ? "Vin is typing..." : "Vin is here to help";

  // Show detail view
  if (detailItem) {
    return (
      <DoubtDetail
        item={detailItem}
        onBack={() => setDetailItem(null)}
        onContinue={() => { setDetailItem(null); sendMessage(detailItem.question); }}
      />
    );
  }

  return (
    <>
      {practice && <PracticeMode problem={practice} onClose={() => setPractice(null)} />}

      <div className="h-screen flex overflow-hidden bg-[#f6f6f8]" style={{ fontFamily: "'Lexend', sans-serif" }}>

        {/* ── Chat column ── */}
        <div className="flex-1 flex flex-col h-full overflow-hidden">

          {/* Header */}
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
            <div className="flex items-center gap-2">
              <button className="text-white hover:bg-white/10 p-2 rounded-lg transition-colors flex items-center gap-2">
                <span className="material-symbols-outlined">schedule</span>
                <span className="hidden md:block text-sm font-medium">History</span>
              </button>
              <button className="text-white hover:bg-white/10 p-2 rounded-lg transition-colors">
                <span className="material-symbols-outlined">settings</span>
              </button>
            </div>
          </header>

          {/* Messages */}
          <main className="flex-1 overflow-y-auto px-4 py-8" style={{ scrollbarWidth: "thin" }}>
            <div className="max-w-4xl mx-auto flex flex-col gap-8">

              {messages.length === 0 && (
                <div className="flex flex-col items-center text-center py-10 gap-4">
                  <div className="size-20 rounded-full bg-white border-2 border-[#695be6]/20 overflow-hidden shadow-lg">
                    <img src={VIN_AVATAR} alt="Vin" className="w-full h-full object-cover" />
                  </div>
                  <div>
                    <h2 className="text-2xl font-black text-slate-800">Hi {user?.name?.split(" ")[0]}, I'm Vin!</h2>
                    <p className="text-slate-500 mt-1 text-sm">Your AI tutor — ask me anything about your subjects.</p>
                  </div>
                  <div className="flex flex-wrap justify-center gap-2 mt-2">
                    {["How do I solve quadratic equations using the formula?", "Balance this equation: H2 + O2 → H2O", "Explain Newton's Third Law"].map((s) => (
                      <button key={s} onClick={() => sendMessage(s)} className="px-4 py-2 bg-white border border-slate-200 rounded-full text-sm text-slate-600 hover:border-[#695be6]/40 hover:text-[#695be6] transition-colors shadow-sm">{s}</button>
                    ))}
                  </div>
                </div>
              )}

              {messages.map((msg) => (
                <div key={msg.id}>
                  {msg.role === "user" ? (
                    <div className="flex justify-end items-end gap-3">
                      <div className="flex flex-col gap-1 items-end max-w-[80%]">
                        <p className="text-slate-500 text-xs font-medium mr-2">Student</p>
                        <div className="bg-[#695be6] text-white px-5 py-3 rounded-2xl rounded-tr-none shadow-sm">
                          <p className="text-sm md:text-base">{msg.text}</p>
                        </div>
                      </div>
                      <div className="size-8 rounded-full bg-slate-200 overflow-hidden mb-1 shrink-0">
                        {user?.avatar
                          ? <img src={user.avatar} alt="you" className="w-full h-full object-cover" />
                          : <div className="w-full h-full bg-[#695be6] flex items-center justify-center text-white text-xs font-bold">{user?.name?.[0]}</div>
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
                          {msg.streaming ? (
                            <StreamingMessage
                              blocks={msg.blocks}
                              followUps={msg.followUps}
                              onPractice={Object.assign(setPractice, { __sendMessage: sendMessage })}
                              onAllDone={() => {}}
                            />
                          ) : (
                            <div className="space-y-4">
                              {msg.blocks.map((b, i) => <RenderRichBlock key={i} block={b} onPractice={setPractice} />)}
                            </div>
                          )}
                        </div>
                        {!msg.streaming && msg.followUps?.length > 0 && (
                          <div className="flex gap-2 overflow-x-auto pb-2 whitespace-nowrap px-1" style={{ scrollbarWidth: "none" }}>
                            {msg.followUps.map((s, i) => (
                              <button key={i} onClick={() => sendMessage(s)} className="bg-white text-[#695be6] border border-slate-200 px-4 py-2 rounded-full text-sm font-medium hover:bg-[#695be6]/5 transition-colors shrink-0">{s}</button>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              ))}

              {(status === "thinking" || status === "typing") && <TypingDots />}
              <div ref={bottomRef} />
            </div>
          </main>

          {/* Footer */}
          <footer className="bg-white border-t border-slate-200 shadow-[0_-4px_10px_rgba(0,0,0,0.03)] p-4 shrink-0">
            <div className="max-w-4xl mx-auto space-y-3">
              <div className="flex gap-2 flex-wrap">
                {QUICK_ACTIONS.map((qa) => (
                  <button key={qa.id} className="bg-[#695be6]/10 text-[#695be6] px-3 py-1 rounded-md text-xs font-semibold flex items-center gap-1 hover:bg-[#695be6]/20 transition-colors">
                    <span className="material-symbols-outlined text-sm">{qa.icon}</span>{qa.label}
                  </button>
                ))}
              </div>
              <div className="flex items-end gap-3 bg-slate-50 border border-slate-200 rounded-xl p-2 pr-3">
                <div className="flex items-center gap-1 shrink-0 pb-1">
                  <button className="p-2 text-slate-400 hover:text-[#695be6] transition-colors"><span className="material-symbols-outlined">photo_camera</span></button>
                  <button className="p-2 text-slate-400 hover:text-[#695be6] transition-colors"><span className="material-symbols-outlined">image</span></button>
                  <button className="p-2 text-slate-400 hover:text-[#695be6] transition-colors"><span className="material-symbols-outlined">mic</span></button>
                </div>
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
                <button onClick={() => sendMessage(input)} disabled={!input.trim()}
                  className="bg-[#695be6] text-white size-10 flex items-center justify-center rounded-lg hover:bg-[#695be6]/90 transition-transform active:scale-95 shrink-0 shadow-sm disabled:opacity-40">
                  <span className="material-symbols-outlined">send</span>
                </button>
              </div>
              <p className="text-[10px] text-center text-slate-400">Vin AI can make mistakes. Verify important information.</p>
            </div>
          </footer>
        </div>

        {/* ── Sidebar ── */}
        <aside className="w-[360px] h-full bg-white shrink-0 z-20 flex-col border-l border-slate-200 hidden lg:flex"
          style={{ boxShadow: "-4px 0 15px rgba(0,0,0,0.05)" }}>
          <div className="h-16 flex items-center justify-between px-6 border-b border-slate-100 shrink-0">
            <h2 className="text-[#2D2D2D] font-semibold text-lg">Doubt History</h2>
            <button className="text-slate-400 hover:text-slate-600 transition-colors"><span className="material-symbols-outlined">close</span></button>
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
                  className={`px-4 py-1.5 rounded-full text-xs font-semibold transition-colors shrink-0 ${subjFilter === s ? "bg-[#6B5CE7] text-white shadow-sm" : "bg-slate-100 text-slate-600 hover:bg-slate-200"}`}>
                  {s}
                </button>
              ))}
            </div>
          </div>
          <div className="flex-1 overflow-y-auto px-5 py-2 space-y-3" style={{ scrollbarWidth: "thin" }}>
            {filteredHistory.length === 0
              ? <p className="text-center text-slate-400 text-sm py-8">No doubts found</p>
              : filteredHistory.map((item) => (
                  <HistoryCard key={item.id} item={item}
                    onSelect={sendMessage}
                    onDetail={setDetailItem}
                    onStar={toggleStar}
                  />
                ))
            }
          </div>
        </aside>
      </div>
    </>
  );
}
