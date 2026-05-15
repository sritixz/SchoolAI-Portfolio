import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";

const listKey = (userId) => `exam_prep_list_${userId}`;

const SUBJECT_COLORS = {
  Maths:   "from-[#695be6] to-[#8e82f3]",
  Science: "from-orange-400 to-amber-500",
  English: "from-blue-400 to-indigo-500",
  Social:  "from-green-400 to-teal-500",
  Hindi:   "from-pink-400 to-rose-500",
};

const STATUS_META = {
  upcoming: { label: "Upcoming",  color: "bg-blue-100 text-blue-700" },
  active:   { label: "Active",    color: "bg-green-100 text-green-700" },
  past:     { label: "Completed", color: "bg-gray-100 text-gray-500" },
};

function getPrepStatus(prep) {
  const subjects = prep.subjects || [];
  const now = new Date();
  const allPast = subjects.every((s) => {
    if (!s.examDate) return false;
    const [y, m, d] = s.examDate.split("-");
    return new Date(Number(y), Number(m) - 1, Number(d)) < now;
  });
  const anyActive = subjects.some((s) => {
    if (!s.examDate) return false;
    const [y, m, d] = s.examDate.split("-");
    const examDay = new Date(Number(y), Number(m) - 1, Number(d));
    const diff = Math.ceil((examDay - now) / 86400000);
    return diff >= 0 && diff <= 30;
  });
  if (allPast) return "past";
  if (anyActive) return "active";
  return "upcoming";
}

export function loadPrepList(userId) {
  try {
    return JSON.parse(localStorage.getItem(listKey(userId)) || "[]");
  } catch {
    return [];
  }
}

export function savePrepList(userId, list) {
  localStorage.setItem(listKey(userId), JSON.stringify(list));
}

export default function ExamPrepList() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [preps, setPreps] = useState([]);

  useEffect(() => {
    if (!user?.id) return;
    setPreps(loadPrepList(user.id));
  }, [user?.id]);

  const handleDelete = (prepId) => {
    const updated = preps.filter((p) => p.id !== prepId);
    setPreps(updated);
    savePrepList(user.id, updated);
  };

  return (
    <div className="min-h-screen bg-[#f6f6f8] pb-24" style={{ fontFamily: "'Lexend', sans-serif" }}>
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-white/90 backdrop-blur-md border-b border-gray-200">
        <div className="max-w-2xl mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button onClick={() => navigate("/student")} className="p-2 hover:bg-gray-100 rounded-lg">
              <span className="material-symbols-outlined text-gray-600 text-xl">arrow_back</span>
            </button>
            <div>
              <h1 className="font-black text-sm">Exam Preparation</h1>
              <p className="text-[10px] text-gray-400">Your study plans</p>
            </div>
          </div>
          <button
            onClick={() => navigate("/student/exam-prep/new")}
            className="flex items-center gap-1.5 bg-[#695be6] text-white text-xs font-bold px-3 py-2 rounded-xl hover:bg-[#5a4dd4] transition-colors"
          >
            <span className="material-symbols-outlined text-sm">add</span>
            New Prep
          </button>
        </div>
      </header>

      <main className="max-w-2xl mx-auto pt-20 px-4 space-y-4">
        {preps.length === 0 ? (
          <EmptyState onNew={() => navigate("/student/exam-prep/new")} />
        ) : (
          <>
            <p className="text-xs text-gray-400 font-semibold pt-2">{preps.length} exam prep{preps.length !== 1 ? "s" : ""}</p>
            {preps.map((prep) => (
              <PrepCard
                key={prep.id}
                prep={prep}
                onOpen={() => navigate(`/student/exam-prep/${prep.id}`)}
                onDelete={() => handleDelete(prep.id)}
              />
            ))}
          </>
        )}
      </main>

      {/* Bottom Nav */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 px-6 py-2 z-50">
        <div className="max-w-2xl mx-auto flex items-end justify-around h-14">
          {[
            { icon: "home",         label: "Home",     to: "/student" },
            { icon: "description",  label: "Homework", to: "/student/homework" },
            { icon: "auto_awesome", label: "LumiTutor",   to: "/student/vin-ai", fab: true },
            { icon: "bar_chart",    label: "Progress", to: "/student/learning-gaps" },
            { icon: "person",       label: "Profile",  to: "/student/portfolio" },
          ].map((item) =>
            item.fab ? (
              <Link key={item.label} to={item.to} className="flex flex-col items-center -mt-5 bg-[#695be6] text-white size-12 rounded-full shadow-lg shadow-[#695be6]/40 justify-center">
                <span className="material-symbols-outlined text-xl">{item.icon}</span>
              </Link>
            ) : (
              <Link key={item.label} to={item.to} className="flex flex-col items-center gap-0.5 text-gray-400 flex-1">
                <span className="material-symbols-outlined text-lg">{item.icon}</span>
                <span className="text-[9px] font-bold">{item.label}</span>
              </Link>
            )
          )}
        </div>
      </nav>
    </div>
  );
}

function PrepCard({ prep, onOpen, onDelete }) {
  const [confirmDelete, setConfirmDelete] = useState(false);
  const status = getPrepStatus(prep);
  const meta = STATUS_META[status];
  const subjects = prep.subjects || [];

  // nearest upcoming exam
  const now = new Date();
  const upcoming = subjects
    .filter((s) => s.examDate)
    .map((s) => {
      const [y, m, d] = s.examDate.split("-");
      return { ...s, _date: new Date(Number(y), Number(m) - 1, Number(d)) };
    })
    .filter((s) => s._date >= now)
    .sort((a, b) => a._date - b._date)[0];

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
      <button onClick={onOpen} className="w-full text-left p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1 flex-wrap">
              <span className="font-black text-sm text-gray-800">Class {prep.class} · {prep.board}</span>
              <span className={`text-[10px] font-black px-2 py-0.5 rounded-full ${meta.color}`}>{meta.label}</span>
            </div>
            <p className="text-xs text-gray-400 mb-3">
              {subjects.length} subject{subjects.length !== 1 ? "s" : ""}
              {upcoming ? ` · Next: ${upcoming.name} in ${Math.ceil((upcoming._date - now) / 86400000)}d` : status === "past" ? " · All exams done" : ""}
            </p>
            {/* Subject pills */}
            <div className="flex flex-wrap gap-1.5">
              {subjects.map((s) => (
                <span
                  key={s.name}
                  className={`text-[10px] font-bold px-2 py-0.5 rounded-full text-white bg-gradient-to-r ${SUBJECT_COLORS[s.name] || "from-gray-400 to-gray-500"}`}
                >
                  {s.name}
                </span>
              ))}
            </div>
          </div>
          <span className="material-symbols-outlined text-gray-300 text-xl flex-shrink-0 mt-1">chevron_right</span>
        </div>
      </button>

      {/* Past exam — restart option */}
      {status === "past" && (
        <div className="border-t border-gray-100 px-4 py-2.5 flex items-center justify-between bg-gray-50">
          <p className="text-xs text-gray-400">All exams completed</p>
          <button
            onClick={onOpen}
            className="text-xs font-bold text-[#695be6] hover:underline flex items-center gap-1"
          >
            <span className="material-symbols-outlined text-sm">replay</span>
            Start Over
          </button>
        </div>
      )}

      {/* Delete */}
      <div className="border-t border-gray-100 px-4 py-2 flex justify-end">
        {confirmDelete ? (
          <div className="flex items-center gap-3">
            <span className="text-xs text-gray-500">Delete this prep?</span>
            <button onClick={() => setConfirmDelete(false)} className="text-xs text-gray-400 font-semibold">Cancel</button>
            <button onClick={onDelete} className="text-xs text-red-500 font-bold">Delete</button>
          </div>
        ) : (
          <button onClick={() => setConfirmDelete(true)} className="text-xs text-gray-300 hover:text-red-400 font-semibold flex items-center gap-1">
            <span className="material-symbols-outlined text-sm">delete</span>
            Remove
          </button>
        )}
      </div>
    </div>
  );
}

function EmptyState({ onNew }) {
  return (
    <div className="flex flex-col items-center justify-center pt-20 gap-4 text-center px-6">
      <span className="text-6xl">📚</span>
      <h2 className="font-black text-lg text-gray-800">No exam preps yet</h2>
      <p className="text-sm text-gray-400">Create a study plan tailored to your upcoming exams and let AI guide your preparation.</p>
      <button
        onClick={onNew}
        className="mt-2 flex items-center gap-2 bg-[#695be6] text-white font-bold px-6 py-3 rounded-xl hover:bg-[#5a4dd4] transition-colors"
      >
        <span className="material-symbols-outlined">add</span>
        Create Exam Prep
      </button>
    </div>
  );
}
