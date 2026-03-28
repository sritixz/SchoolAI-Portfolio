import { useNavigate, useParams } from "react-router-dom";
import { getHomeworkTemplate } from "../../data/teacher/homeworkPreviewData";

const DIFFICULTY_STYLES = {
  EASY:   "bg-green-100 text-green-700",
  MEDIUM: "bg-yellow-100 text-yellow-700",
  HARD:   "bg-red-100 text-red-600",
};

export default function HomeworkPreview() {
  const navigate = useNavigate();
  const { id } = useParams();
  const hw = getHomeworkTemplate(id);

  if (!hw) return <div className="p-8 text-center text-gray-400">Homework not found.</div>;

  return (
    <div className="bg-white min-h-screen" style={{ fontFamily: "'Lexend', sans-serif" }}>

      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-white border-b border-gray-200">
        <div className="max-w-[1100px] mx-auto px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="size-8 bg-[#695be6]/10 rounded-lg flex items-center justify-center">
              <span className="material-symbols-outlined text-[#695be6] text-lg">menu_book</span>
            </div>
            <div>
              <p className="font-black text-sm leading-tight">{hw.title}</p>
              <p className="text-xs text-[#695be6]">{hw.subject} | {hw.chapter}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate("/teacher/homework")}
              className="border border-gray-200 text-sm font-bold px-4 py-2 rounded-xl hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button className="bg-[#695be6] text-white text-sm font-bold px-5 py-2 rounded-xl hover:bg-[#5a4dd4] transition-colors">
              Use This Template
            </button>
            <button
              onClick={() => navigate("/teacher/homework")}
              className="p-2 hover:bg-gray-100 rounded-lg"
            >
              <span className="material-symbols-outlined text-gray-400">close</span>
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-[1100px] mx-auto pt-20 flex gap-0">

        {/* Left Sidebar */}
        <div className="w-56 flex-shrink-0 border-r border-gray-100 p-6">
          <h3 className="font-black text-sm mb-4">Overview</h3>
          <div className="space-y-2 text-sm text-gray-600 mb-6">
            {[
              { icon: "calendar_today", label: `Created: ${hw.overview.createdDate}` },
              { icon: "bar_chart",      label: `Used: ${hw.overview.usedCount} times` },
              { icon: "percent",        label: `Avg. Score: ${hw.overview.avgScore}%` },
              { icon: "devices",        label: `Type: ${hw.overview.type}` },
              { icon: "format_list_numbered", label: `Total Questions: ${hw.overview.totalQuestions}` },
              { icon: "star",           label: `Total Marks: ${hw.overview.totalMarks}` },
              { icon: "schedule",       label: `Est. Time: ${hw.overview.estTimeMinutes} min` },
            ].map((item) => (
              <div key={item.label} className="flex items-center gap-2">
                <span className="material-symbols-outlined text-gray-400 text-base">{item.icon}</span>
                <span className="text-xs">{item.label}</span>
              </div>
            ))}
          </div>

          <h3 className="font-black text-sm mb-3">Tags</h3>
          <div className="flex flex-wrap gap-2">
            {hw.tags.map((tag) => (
              <span key={tag} className="text-xs bg-[#695be6]/10 text-[#695be6] font-semibold px-2 py-0.5 rounded-full">
                {tag}
              </span>
            ))}
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="font-black text-2xl">Questions</h2>
            <span className="text-sm text-gray-400">{hw.overview.totalQuestions} Items</span>
          </div>

          <div className="space-y-6">
            {hw.questions.map((q) => (
              <div key={q.id} className="border border-gray-100 rounded-2xl p-5">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <span className={`text-[10px] font-black px-2 py-0.5 rounded ${DIFFICULTY_STYLES[q.difficulty]}`}>
                      {q.difficulty}
                    </span>
                    <span className="text-xs text-gray-400">{q.marks} Marks</span>
                    <span className="text-gray-300">•</span>
                    <span className="flex items-center gap-1 text-xs text-gray-400">
                      <span className="material-symbols-outlined text-sm">schedule</span> {q.timeMinutes} min
                    </span>
                  </div>
                  <span className="text-xs font-bold text-[#695be6]">Q{q.number}</span>
                </div>

                <p className="font-black text-base mb-4">{q.text}</p>

                {q.type === "mcq" && q.options && (
                  <div className="grid grid-cols-2 gap-2">
                    {q.options.map((opt) => (
                      <div key={opt} className="border border-gray-200 rounded-xl px-4 py-3 text-sm text-gray-600">
                        {opt}
                      </div>
                    ))}
                  </div>
                )}

                {q.type === "short_answer" && (
                  <div>
                    {q.description && <p className="text-sm text-gray-500 mb-2">{q.description}</p>}
                    {q.note && <p className="text-sm text-gray-400 italic">{q.note}</p>}
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Assignment History */}
          <div className="mt-8">
            <h2 className="font-black text-xl mb-4">Assignment History</h2>
            <div className="border border-gray-100 rounded-2xl overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50">
                    <th className="text-left px-5 py-3 text-xs font-bold text-gray-400 uppercase">Date Assigned</th>
                    <th className="text-left px-5 py-3 text-xs font-bold text-gray-400 uppercase">Class</th>
                    <th className="text-left px-5 py-3 text-xs font-bold text-gray-400 uppercase">Students</th>
                    <th className="text-left px-5 py-3 text-xs font-bold text-gray-400 uppercase">Completion Rate</th>
                  </tr>
                </thead>
                <tbody>
                  {hw.assignmentHistory.map((h, i) => (
                    <tr key={i} className="border-b border-gray-50 hover:bg-gray-50">
                      <td className="px-5 py-4">{h.dateAssigned}</td>
                      <td className="px-5 py-4">{h.class}</td>
                      <td className="px-5 py-4">{h.students}</td>
                      <td className="px-5 py-4 font-bold text-green-600">{h.completionRate}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 px-6 py-3">
        <div className="max-w-[1100px] mx-auto flex items-center justify-between">
          <button
            onClick={() => navigate("/teacher/homework/new")}
            className="flex items-center gap-2 border border-gray-200 text-sm font-bold px-5 py-2.5 rounded-xl hover:bg-gray-50 transition-colors"
          >
            <span className="material-symbols-outlined text-base">edit</span> Edit This Homework
          </button>
          <div className="flex gap-3">
            <button
              onClick={() => navigate("/teacher/homework")}
              className="border border-gray-200 text-sm font-bold px-5 py-2.5 rounded-xl hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={() => navigate("/teacher/homework/new")}
              className="bg-[#695be6] text-white text-sm font-bold px-6 py-2.5 rounded-xl hover:bg-[#5a4dd4] transition-colors"
            >
              Use This Template
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
