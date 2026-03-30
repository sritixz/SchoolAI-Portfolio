import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { AdminLayout } from "./Home";
import GradesTab      from "./onboarding/GradesTab";
import SectionsTab    from "./onboarding/SectionsTab";
import TeachersTab    from "./onboarding/TeachersTab";
import StudentsTab    from "./onboarding/StudentsTab";
import AssignmentsTab from "./onboarding/AssignmentsTab";

const TABS = [
  { id: "grades",      label: "Grades",      icon: "school",      desc: "Configure grade levels and their subjects" },
  { id: "sections",    label: "Sections",    icon: "grid_view",   desc: "Create class sections per grade" },
  { id: "teachers",    label: "Teachers",    icon: "person",      desc: "Add teachers and their qualified subjects" },
  { id: "students",    label: "Students",    icon: "groups",      desc: "Enroll students and link parents" },
  { id: "assignments", label: "Assignments", icon: "assignment",  desc: "Assign teachers to subjects per section" },
];

export default function Onboarding() {
  const navigate  = useNavigate();
  const [activeTab, setActiveTab] = useState("grades");

  const activeTabMeta = TABS.find((t) => t.id === activeTab);

  return (
    <AdminLayout active="/schooladmin/onboarding">
      <div className="p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-black text-gray-800">School Onboarding</h1>
            <p className="text-sm text-gray-500 mt-0.5">{activeTabMeta?.desc}</p>
          </div>
          <button
            onClick={() => navigate("/schooladmin")}
            className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-xl text-sm font-bold text-gray-600 hover:bg-gray-50 transition-colors"
          >
            <span className="material-symbols-outlined text-base">arrow_back</span>
            Dashboard
          </button>
        </div>

        {/* Step indicator */}
        <div className="flex gap-1 mb-6 overflow-x-auto pb-1">
          {TABS.map((tab, i) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-sm whitespace-nowrap transition-all ${
                activeTab === tab.id
                  ? "bg-[#695be6] text-white shadow-sm"
                  : "bg-white text-gray-500 hover:bg-gray-50 border border-gray-100"
              }`}
            >
              <span className="material-symbols-outlined text-base">{tab.icon}</span>
              <span className="hidden sm:inline">{tab.label}</span>
              <span className={`size-5 rounded-full text-[10px] font-black flex items-center justify-center ${
                activeTab === tab.id ? "bg-white/20 text-white" : "bg-gray-100 text-gray-500"
              }`}>
                {i + 1}
              </span>
            </button>
          ))}
        </div>

        {/* Tab content */}
        <div>
          {activeTab === "grades"      && <GradesTab />}
          {activeTab === "sections"    && <SectionsTab />}
          {activeTab === "teachers"    && <TeachersTab />}
          {activeTab === "students"    && <StudentsTab />}
          {activeTab === "assignments" && <AssignmentsTab />}
        </div>
      </div>
    </AdminLayout>
  );
}
