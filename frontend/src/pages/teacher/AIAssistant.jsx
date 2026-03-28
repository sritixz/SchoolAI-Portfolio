import { useNavigate } from "react-router-dom";
import { aiAssistantHistory } from "../../data/teacherData";

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

  const toolRoutes = {
    "Worksheet Generator": "/teacher/ai-assistant/worksheet",
    "Lesson Plan Creator": "/teacher/ai-assistant/lesson-plan",
    "Concept Explainer": "/teacher/ai-assistant/concept",
    "Presentation Generator": "/teacher/ai-assistant/presentation",
    "Quiz Generator": "/teacher/ai-assistant/quiz",
    "Grading Assistant": "/teacher/ai-assistant/grading",
  };

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
            <div className="size-9 rounded-full bg-[#695be6] flex items-center justify-center text-white font-bold text-sm">P</div>
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
        <div className="flex items-center gap-2 mb-4">
          <span className="material-symbols-outlined text-gray-500 text-lg">history</span>
          <h3 className="font-black text-base">Recent Activity</h3>
        </div>
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden mb-6">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50">
                <th className="text-left px-6 py-3 text-xs font-bold text-gray-400 uppercase">Tool</th>
                <th className="text-left px-6 py-3 text-xs font-bold text-gray-400 uppercase">Date</th>
                <th className="text-left px-6 py-3 text-xs font-bold text-gray-400 uppercase">Status</th>
                <th className="text-right px-6 py-3 text-xs font-bold text-[#695be6] uppercase">Action</th>
              </tr>
            </thead>
            <tbody>
              {aiAssistantHistory.map((h) => (
                <tr key={h.id} className="border-b border-gray-50 hover:bg-gray-50">
                  <td className="px-6 py-4 font-semibold">{h.tool}</td>
                  <td className="px-6 py-4 text-gray-500">{h.date}</td>
                  <td className="px-6 py-4">
                    <span className={`text-xs font-bold px-2 py-1 rounded-full ${
                      h.status === "completed" ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"
                    }`}>
                      {h.status === "completed" ? "Completed" : "Draft"}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <button
                      onClick={() => navigate(toolRoutes[h.tool] || "/teacher/ai-assistant")}
                      className="text-[#695be6] font-bold text-xs hover:underline"
                    >
                      {h.status === "completed" ? "View" : "Edit"}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <p className="text-center text-xs text-gray-400">Empowering educators with AI tools © 2024</p>
      </main>
    </div>
  );
}
