import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useSelector, useDispatch } from "react-redux";
import { useAuth } from "../../context/AuthContext";
import { getInitial } from "../../utils/nameUtils";
import { selectAiHistory, removeHistoryItem, clearHistory, fetchHistory } from "../../store/slices/aiHistorySlice";
import { downloadWorksheetPdf, downloadQuizPdf, downloadConceptPdf, downloadPresentationPdf, downloadGradingPdf, downloadLessonPlanPdf } from "../../utils/aiPdfExport";

const TOOLS = [
  {
    id: "worksheet",
    icon: "edit_document",
    label: "Worksheet Generator",
    desc: "Create practice worksheets with questions, answer keys, and solutions.",
    btnLabel: "Create Worksheet",
    route: "/teacher/ai-assistant/worksheet",
    isNew: false,
  },
  {
    id: "lessonplan",
    icon: "menu_book",
    label: "Lesson Plan Creator",
    desc: "Generate detailed lesson plans with objectives, activities, and timing.",
    btnLabel: "Create Lesson Plan",
    route: "/teacher/ai-assistant/lesson-plan",
    isNew: false,
  },
  {
    id: "explainer",
    icon: "lightbulb",
    label: "Concept Explainer",
    desc: "Get clear explanations with examples, analogies, and teaching tips.",
    btnLabel: "Get Explanation",
    route: "/teacher/ai-assistant/concept",
    isNew: false,
  },
  {
    id: "presentation",
    icon: "present_to_all",
    label: "Presentation Generator",
    desc: "Generate PowerPoint/slide decks with content, visuals, and speaker notes.",
    btnLabel: "Create Presentation",
    route: "/teacher/ai-assistant/presentation",
    isNew: true,
  },
  {
    id: "quiz",
    icon: "quiz",
    label: "Questions & Quiz Generator",
    desc: "Create MCQs, short answer, and long answer questions with solutions.",
    btnLabel: "Generate Questions",
    route: "/teacher/ai-assistant/quiz",
    isNew: false,
  },
  {
    id: "grading",
    icon: "grading",
    label: "Grading & Feedback Assistant",
    desc: "Get suggestions for feedback, rubrics, and evaluation comments.",
    btnLabel: "Get Help",
    route: "/teacher/ai-assistant/grading",
    isNew: false,
  },
];

export default function AIAssistant() {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { user } = useAuth();
  const history = useSelector(selectAiHistory);

  useEffect(() => {
    dispatch(fetchHistory());
  }, [dispatch]);

  const TOOL_ICONS = {
    worksheet: "edit_document", lessonplan: "menu_book", concept: "lightbulb",
    presentation: "present_to_all", quiz: "quiz", grading: "grading",
  };
  const TOOL_LABELS = {
    worksheet: "Worksheet", lessonplan: "Lesson Plan", concept: "Concept Explainer",
    presentation: "Presentation", quiz: "Quiz", grading: "Grading Report",
  };
  const TOOL_ROUTES = {
    worksheet: "/teacher/ai-assistant/worksheet", lessonplan: "/teacher/ai-assistant/lesson-plan",
    concept: "/teacher/ai-assistant/concept", presentation: "/teacher/ai-assistant/presentation",
    quiz: "/teacher/ai-assistant/quiz", grading: "/teacher/ai-assistant/grading",
  };

  function handleRedownload(item) {
    if (!item.result) return;
    const r = item.result;
    switch (item.tool) {
      case "worksheet":    downloadWorksheetPdf(r); break;
      case "lessonplan":   downloadLessonPlanPdf(r); break;
      case "concept":      downloadConceptPdf(r); break;
      case "presentation": downloadPresentationPdf(r); break;
      case "grading":      downloadGradingPdf(r, r.feedback); break;
      case "quiz":         downloadQuizPdf(r.questions || r, { subject: item.subject, topic: item.topic, grade: item.grade }); break;
      default: break;
    }
  }

  return (
    <div className="bg-[#faf9ff] min-h-screen" style={{ fontFamily: "'Lexend', sans-serif" }}>

      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-white border-b border-gray-200">
        <div className="max-w-[1100px] mx-auto px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button onClick={() => navigate("/teacher")} className="p-2 hover:bg-gray-100 rounded-lg">
              <span className="material-symbols-outlined text-gray-500">arrow_back</span>
            </button>
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-[#695be6] text-xl">auto_awesome</span>
              <h1 className="font-black text-base">AI Teaching Assistant</h1>
            </div>
            <p className="text-xs text-gray-400 hidden md:block">Generate teaching materials, get help with planning, and enhance your lessons</p>
          </div>
          <div className="flex items-center gap-3">
            <button onClick={() => navigate("/teacher")} className="flex items-center gap-1.5 border border-gray-200 text-sm font-semibold px-4 py-2 rounded-lg hover:bg-gray-50 transition-colors">
              <span className="material-symbols-outlined text-base">history</span> History
            </button>
            <button onClick={() => navigate("/teacher/quick-actions")} className="flex items-center gap-1.5 border border-gray-200 text-sm font-semibold px-4 py-2 rounded-lg hover:bg-gray-50 transition-colors">
              <span className="material-symbols-outlined text-base">settings</span> Settings
            </button>
            <div className="size-9 rounded-full bg-[#695be6] flex items-center justify-center text-white font-bold text-sm">{getInitial(user?.name) || "T"}</div>
          </div>
        </div>
      </header>

      <main className="max-w-[1100px] mx-auto pt-20 px-6 pb-12">

        {/* Section Header */}
        <div className="flex items-center gap-2 mb-6 mt-4">
          <div className="size-6 bg-[#695be6] rounded flex items-center justify-center">
            <span className="material-symbols-outlined text-white text-sm">grid_view</span>
          </div>
          <h2 className="font-black text-xl">Select a Tool to Get Started</h2>
        </div>

        {/* Tool Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-10">
          {TOOLS.map((tool) => (
            <div
              key={tool.id}
              className="relative bg-white rounded-2xl border border-gray-100 shadow-sm p-6 flex flex-col gap-4 hover:shadow-md transition-shadow"
            >
              {tool.isNew && (
                <span className="absolute top-3 right-3 text-[10px] font-black bg-green-100 text-green-700 px-2 py-0.5 rounded-full">NEW</span>
              )}
              <div className="size-12 bg-[#695be6]/10 rounded-xl flex items-center justify-center">
                <span className="material-symbols-outlined text-[#695be6] text-2xl">{tool.icon}</span>
              </div>
              <div className="flex-1">
                <h3 className="font-black text-base mb-1">{tool.label}</h3>
                <p className="text-xs text-gray-400 leading-relaxed">{tool.desc}</p>
              </div>
              <button
                onClick={() => navigate(tool.route)}
                className="flex items-center justify-center gap-1.5 bg-[#695be6] text-white text-sm font-bold py-2.5 rounded-xl hover:bg-[#5a4dd4] transition-colors"
              >
                {tool.btnLabel}
                <span className="material-symbols-outlined text-base">arrow_forward</span>
              </button>
            </div>
          ))}
        </div>

        {/* Recent Activity */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-gray-500 text-lg">history</span>
            <h3 className="font-black text-base">Recent Activity</h3>
            {history.length > 0 && (
              <span className="text-xs bg-[#695be6]/10 text-[#695be6] font-bold px-2 py-0.5 rounded-full">{history.length}</span>
            )}
          </div>
          {history.length > 0 && (
            <button onClick={() => dispatch(clearHistory())}
              className="text-xs text-red-500 font-semibold hover:underline">
              Clear All
            </button>
          )}
        </div>

        {history.length === 0 ? (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-10 text-center text-gray-400 mb-6">
            <span className="material-symbols-outlined text-4xl mb-2 block">history</span>
            <p className="font-semibold text-sm">No history yet</p>
            <p className="text-xs mt-1">Generated content will appear here for re-download</p>
          </div>
        ) : (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden mb-6">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50">
                  <th className="text-left px-5 py-3 text-xs font-bold text-gray-400 uppercase">Tool</th>
                  <th className="text-left px-5 py-3 text-xs font-bold text-gray-400 uppercase hidden md:table-cell">Title</th>
                  <th className="text-left px-5 py-3 text-xs font-bold text-gray-400 uppercase hidden lg:table-cell">Subject / Grade</th>
                  <th className="text-left px-5 py-3 text-xs font-bold text-gray-400 uppercase">Date</th>
                  <th className="text-right px-5 py-3 text-xs font-bold text-gray-400 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody>
                {history.map((item) => (
                  <tr key={item.id} className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-2">
                        <div className="size-7 bg-[#695be6]/10 rounded-lg flex items-center justify-center flex-shrink-0">
                          <span className="material-symbols-outlined text-[#695be6] text-sm">{TOOL_ICONS[item.tool] || "auto_awesome"}</span>
                        </div>
                        <span className="font-semibold text-xs">{TOOL_LABELS[item.tool] || item.tool}</span>
                      </div>
                    </td>
                    <td className="px-5 py-3 text-xs text-gray-600 hidden md:table-cell max-w-[180px] truncate">{item.title}</td>
                    <td className="px-5 py-3 text-xs text-gray-500 hidden lg:table-cell">
                      {[item.subject, item.grade].filter(Boolean).join(" · ")}
                    </td>
                    <td className="px-5 py-3 text-xs text-gray-400">
                      {item.createdAt ? new Date(item.createdAt).toLocaleDateString() : "—"}
                    </td>
                    <td className="px-5 py-3 text-right">
                      <div className="flex items-center justify-end gap-2">
                        {item.result && (
                          <button onClick={() => handleRedownload(item)}
                            className="flex items-center gap-1 text-xs font-bold text-[#695be6] border border-[#695be6]/20 px-2.5 py-1 rounded-lg hover:bg-[#695be6]/5 transition-colors">
                            <span className="material-symbols-outlined text-sm">download</span> PDF
                          </button>
                        )}
                        <button onClick={() => navigate(TOOL_ROUTES[item.tool] || "/teacher/ai-assistant")}
                          className="text-xs font-bold text-gray-500 border border-gray-200 px-2.5 py-1 rounded-lg hover:bg-gray-50 transition-colors">
                          Reopen
                        </button>
                        <button onClick={() => dispatch(removeHistoryItem(item.id))}
                          className="text-gray-300 hover:text-red-500 transition-colors p-1">
                          <span className="material-symbols-outlined text-sm">delete</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <p className="text-center text-xs text-gray-400">Empowering educators with AI tools © 2024</p>
      </main>
    </div>
  );
}
