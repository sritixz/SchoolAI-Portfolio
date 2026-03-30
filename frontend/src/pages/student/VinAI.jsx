import { useState, useRef, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { useAuth } from "../../context/AuthContext";
import { VIN_AVATAR, SUBJECT_BADGE, SIDEBAR_SUBJECTS } from "../../data/vinAiData";
import {
  fetchDoubtHistory, toggleDoubtStar, optimisticToggleStar,
  selectDoubtHistory, selectHistoryStatus,
} from "../../store/slices/vinAiSlice";

// ─── XML incremental parser ───────────────────────────────────
// Parses a growing XML buffer and extracts completed/partial blocks.
function parseXmlBuffer(buf) {
  const get = (tag) => {
    const m = buf.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, "i"));
    return m ? m[1].trim() : null;
  };
  const getPartial = (tag) => {
    const open = buf.indexOf(`<${tag}`);
    if (open === -1) return null;
    const contentStart = buf.indexOf(">", open) + 1;
    const close = buf.indexOf(`</${tag}>`);
    if (close === -1) return buf.slice(contentStart).replace(/<[^>]*$/, ""); // strip incomplete tag
    return buf.slice(contentStart, close).trim();
  };

  // <content> — stream live while open
  const contentDone = buf.includes("</content>");
  const content = contentDone ? get("content") : getPartial("content");

  // <hint> — reveal when closed
  const hint = get("hint");

  // <steps> — reveal each <step> as it closes
  const stepsBlock = get("steps");
  const steps = [];
  if (stepsBlock) {
    const stepRe = /<step[^>]*number="(\d+)"[^>]*>([\s\S]*?)<\/step>/gi;
    let m;
    while ((m = stepRe.exec(stepsBlock)) !== null) {
      steps.push({ number: parseInt(m[1]), text: m[2].trim() });
    }
  }

  // <question> — reveal when closed
  const questionBlock = get("question");
  let question = null;
  if (questionBlock) {
    const qText = questionBlock.replace(/<option[^>]*>[\s\S]*?<\/option>/gi, "").trim();
    const optRe = /<option[^>]*correct="(true|false)"[^>]*>([\s\S]*?)<\/option>/gi;
    const options = [];
    let om;
    while ((om = optRe.exec(questionBlock)) !== null) {
      options.push({ correct: om[1] === "true", text: om[2].trim() });
    }
    if (options.length >= 2) question = { text: qText, options };
  }

  // <followups> — reveal when closed
  const followupsBlock = get("followups");
  const followups = [];
  if (followupsBlock) {
    const fuRe = /<followup>([\s\S]*?)<\/followup>/gi;
    let fm;
    while ((fm = fuRe.exec(followupsBlock)) !== null) followups.push(fm[1].trim());
  }

  const subject = get("subject") || "General";
  const done = buf.includes("</response>");

  return { content, contentDone, hint, steps, question, followups, subject, done };
}

// ─── Rich block renderers ─────────────────────────────────────
function HintBlock({ text }) {
  return (
    <details className="group bg-amber-50 border border-amber-200 rounded-xl overflow-hidden" open>
      <summary className="flex items-center justify-between px-4 py-3 cursor-pointer list-none">
        <div className="flex items-center gap-2">
          <span className="material-symbols-outlined text-amber-500">lightbulb</span>
          <span className="text-amber-700 text-sm font-bold uppercase tracking-wider">Hint</span>
        </div>
        <span className="material-symbols-outlined text-amber-500 group-open:rotate-180 transition-transform">expand_more</span>
      </summary>
      <div className="px-4 pb-4 pt-2 border-t border-amber-100">
        <p className="text-amber-800 text-sm leading-relaxed">{text}</p>
      </div>
    </details>
  );
}

function StepsBlock({ steps }) {
  return (
    <div className="bg-green-50 border border-green-200 p-4 rounded-xl space-y-3">
      <h4 className="text-green-800 font-bold text-xs flex items-center gap-2 uppercase tracking-wider">
        <span className="material-symbols-outlined text-green-600 text-base">checklist</span>
        Step-by-Step
      </h4>
      <ul className="space-y-2">
        {steps.map((s) => (
          <li key={s.number} className="flex gap-3 items-start">
            <div className="size-6 shrink-0 rounded-full bg-green-600 flex items-center justify-center text-xs font-bold text-white">{s.number}</div>
            <p className="text-sm text-green-900 leading-relaxed" dangerouslySetInnerHTML={{ __html: s.text }} />
          </li>
        ))}
      </ul>
    </div>
  );
}

function QuestionBlock({ question, onAnswer }) {
  const [selected, setSelected] = useState(null);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = () => {
    if (!selected) return;
    setSubmitted(true);
    onAnswer({ question: question.text, chosen: selected.text, correct: selected.correct });
  };

  return (
    <div className="bg-[#695be6]/5 border-2 border-[#695be6]/20 rounded-xl p-4 space-y-3">
      <p className="text-sm font-bold text-[#695be6] flex items-center gap-2">
        <span className="material-symbols-outlined text-base">quiz</span>
        Practice Question
      </p>
      <p className="text-sm text-slate-800 font-medium leading-relaxed">{question.text}</p>
      <div className="space-y-2">
        {question.options.map((opt, i) => {
          const letter = ["A", "B", "C", "D"][i];
          const isSel = selected?.text === opt.text;
          const isCorrect = submitted && opt.correct;
          const isWrong = submitted && isSel && !opt.correct;
          return (
            <button
              key={i}
              disabled={submitted}
              onClick={() => !submitted && setSelected(opt)}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg border-2 text-left text-sm transition-all
                ${isCorrect ? "border-green-500 bg-green-50 text-green-800"
                  : isWrong ? "border-red-400 bg-red-50 text-red-800"
                  : isSel ? "border-[#695be6] bg-[#695be6]/10 text-[#695be6]"
                  : "border-slate-200 bg-white hover:border-[#695be6]/40"}`}
            >
              <span className={`size-6 shrink-0 rounded-full flex items-center justify-center text-xs font-bold
                ${isSel ? "bg-[#695be6] text-white" : "bg-slate-100 text-slate-500"}`}>{letter}</span>
              <span>{opt.text}</span>
              {isCorrect && <span className="material-symbols-outlined text-green-600 ml-auto text-base">check_circle</span>}
              {isWrong && <span className="material-symbols-outlined text-red-500 ml-auto text-base">cancel</span>}
            </button>
          );
        })}
      </div>
      {!submitted && (
        <button
          onClick={handleSubmit}
          disabled={!selected}
          className="w-full py-2.5 bg-[#695be6] text-white font-bold rounded-lg text-sm disabled:opacity-40 hover:bg-[#5a4dd4] transition-colors"
        >
          Check Answer
        </button>
      )}
    </div>
  );
}

function FollowupChips({ followups, onSend }) {
  return (
    <div className="flex gap-2 flex-wrap pt-1">
      {followups.map((f, i) => (
        <button
          key={i}
          onClick={() => onSend(f)}
          className="bg-white text-[#695be6] border border-[#695be6]/30 px-3 py-1.5 rounded-full text-xs font-medium hover:bg-[#695be6]/5 transition-colors"
        >
          {f}
        </button>
      ))}
    </div>
  );
}

// ─── Single assistant message renderer ───────────────────────
function AssistantMessage({ msg, onAnswer, onSend }) {
  const { content, contentDone, hint, steps, question, followups, done } = msg.parsed;
  const isStreaming = !done;

  return (
    <div className="flex justify-start items-start gap-3">
      <div className="size-8 rounded-full bg-white overflow-hidden mt-1 shrink-0 border border-slate-200">
        <img src={VIN_AVATAR} alt="Vin" className="w-full h-full object-cover" />
      </div>
      <div className="flex flex-col gap-2 max-w-[85%]">
        <p className="text-slate-500 text-xs font-medium ml-1">Vin AI</p>
        <div className="bg-white border-l-4 border-[#D4C5F9] p-5 rounded-2xl rounded-tl-none shadow-sm space-y-4">

          {/* Content — streams live */}
          {content && (
            <p className="text-sm md:text-base text-slate-800 leading-relaxed">
              <span dangerouslySetInnerHTML={{ __html: content }} />
              {isStreaming && !contentDone && (
                <span className="inline-block w-0.5 h-4 bg-[#695be6] ml-0.5 animate-pulse align-middle" />
              )}
            </p>
          )}

          {/* Hint — appears when </hint> received */}
          {hint && <HintBlock text={hint} />}

          {/* Steps — appear when </steps> received */}
          {steps.length > 0 && <StepsBlock steps={steps} />}

          {/* Question — appears when </question> received */}
          {question && !msg.answerSent && (
            <QuestionBlock question={question} onAnswer={(ans) => onAnswer(msg.id, ans)} />
          )}

          {/* Follow-ups — appear when stream is done */}
          {done && followups.length > 0 && <FollowupChips followups={followups} onSend={onSend} />}

          {/* Typing indicator while nothing has arrived yet */}
          {!content && isStreaming && (
            <div className="flex items-center gap-1.5">
              {[0, 1, 2].map((i) => (
                <span key={i} className="size-2 bg-[#695be6]/40 rounded-full animate-bounce" style={{ animationDelay: `${i * 0.15}s` }} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── History sidebar card ─────────────────────────────────────
function HistoryCard({ item, onStar }) {
  const badge = SUBJECT_BADGE[item.subject] || { bg: "bg-gray-100", text: "text-gray-600" };
  return (
    <div className="group p-4 bg-white border border-slate-100 rounded-xl hover:border-[#6B5CE7]/30 hover:shadow-md transition-all">
      <div className="flex justify-between items-start mb-2">
        <span className={`px-2 py-0.5 text-[10px] font-bold rounded uppercase ${badge.bg} ${badge.text}`}>{item.subject}</span>
        <span className="text-[10px] text-slate-400 font-medium">{item.relativeTime}</span>
      </div>
      <p className="text-sm text-slate-700 font-medium line-clamp-2 mb-1">{item.question}</p>
      {item.preview && <p className="text-xs text-slate-400 line-clamp-2 mb-3">{item.preview}</p>}
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
