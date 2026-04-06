import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { AdminLayout } from "./Home";
import { fetchTeacherSupport, selectTeacherSupport } from "../../store/slices/schoolAdminSlice";

const statusConfig = {
  excellent:   { label: "Excellent Engagement!", color: "text-green-600", bg: "bg-green-50 border-green-200", dot: "bg-green-400" },
  opportunity: { label: "Professional Development Opportunity", color: "text-red-500", bg: "bg-red-50 border-red-200", dot: "bg-red-400" },
  steady:      { label: "Steady Progress", color: "text-blue-500", bg: "bg-blue-50 border-blue-200", dot: "bg-blue-400" },
};

export default function TeacherSupport() {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const [subject, setSubject] = useState("All");
  const [grade, setGrade] = useState("All");

  const teacherSupportData = useSelector(selectTeacherSupport);

  useEffect(() => {
    dispatch(fetchTeacherSupport());
  }, [dispatch]);

  // API now returns array of teacher objects directly
  const teachers = Array.isArray(teacherSupportData) ? teacherSupportData : (teacherSupportData[0]?.teachers || []);
  const suggestedPD = [
    { type: "Workshop", duration: "2 hours", title: "AI Tools for Teachers", desc: "Learn to use AI tools for lesson planning and grading.", rating: "4.8" },
    { type: "Course", duration: "4 weeks", title: "Differentiated Instruction", desc: "Strategies for teaching mixed-ability classrooms.", rating: "4.6" },
    { type: "Resource", duration: "Self-paced", title: "Data-Driven Teaching", desc: "Using student performance data to improve outcomes.", fileInfo: "PDF + Video" },
  ];

  const avgEngagement = teachers.length
    ? Math.round(teachers.reduce((sum, t) => sum + (t.homework_created || 0), 0) / teachers.length * 10)
    : 0;

  if (!teachers.length) {
    return (
      <AdminLayout active="/schooladmin/teacher-support">
        <div className="p-6 flex items-center justify-center h-64">
          <div className="text-center text-gray-400">
            <span className="material-symbols-outlined text-4xl mb-2">person</span>
            <p>No teacher data available yet</p>
          </div>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout active="/schooladmin/teacher-support">
      <div className="p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="size-8 bg-[#695be6] rounded-lg flex items-center justify-center text-white">
            <span className="material-symbols-outlined text-base">bar_chart</span>
          </div>
          <h1 className="text-xl font-black text-[#100e1a]">Teacher Engagement & Support</h1>
        </div>

        <div className="bg-[#ede9fb] border border-[#d5cef7] rounded-xl p-3 flex items-center gap-2 mb-4 text-sm">
          <span className="material-symbols-outlined text-[#695be6] text-base">info</span>
          <p>This data is for <span className="font-black">professional development support only</span>, not performance review.</p>
        </div>

        <div className="flex items-center gap-3 mb-4 flex-wrap">
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-500">Subject:</span>
            <select value={subject} onChange={(e) => setSubject(e.target.value)} className="text-xs border border-gray-200 rounded-lg px-2 py-1.5">
              <option>All</option>
              <option>Mathematics</option>
              <option>English</option>
              <option>SST</option>
            </select>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-500">Grade:</span>
            <select value={grade} onChange={(e) => setGrade(e.target.value)} className="text-xs border border-gray-200 rounded-lg px-2 py-1.5">
              <option>All</option>
              <option>Grade 6</option>
              <option>Grade 7</option>
            </select>
          </div>
        </div>

        <div className="flex gap-4">
          <div className="flex-1">
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 mb-4">
              <div className="grid grid-cols-3 gap-4 items-center">
                <div>
                  <p className="text-xs text-gray-500">Avg HW Created</p>
                  <p className="text-2xl font-black text-[#100e1a]">{avgEngagement}<span className="text-sm font-normal text-gray-400"> avg</span></p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Active Teachers</p>
                  <p className="text-2xl font-black text-[#100e1a]">{teachers.length}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Pending Grading</p>
                  <p className="text-2xl font-black text-[#695be6]">{teachers.reduce((sum, t) => sum + (t.pending_grading || 0), 0)}</p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              {teachers
                .filter((t) => subject === "All" || (t.subjects || []).some((s) => s.toLowerCase().includes(subject.toLowerCase())))
                .map((t) => {
                  const hwScore = Math.min(100, (t.homework_created || 0) * 10);
                  const status = hwScore >= 70 ? "excellent" : hwScore >= 40 ? "steady" : "opportunity";
                  const cfg = statusConfig[status];
                  return (
                    <div key={t._id} className={`bg-white rounded-xl border ${cfg.bg} shadow-sm p-4`}>
                      <div className="flex items-center gap-2 mb-3">
                        <div className="size-10 bg-gray-200 rounded-full flex items-center justify-center">
                          <span className="material-symbols-outlined text-gray-400">person</span>
                        </div>
                        <div className="flex-1">
                          <p className="font-bold text-sm">{t.name}</p>
                          <p className="text-[10px] text-gray-500">{(t.subjects || []).join(", ")} • {t.section_count} sections</p>
                        </div>
                        <div className="size-8 border-2 border-[#695be6] rounded-full flex items-center justify-center">
                          <span className="text-xs font-black text-[#695be6]">{hwScore}</span>
                        </div>
                      </div>
                      <div className="grid grid-cols-3 gap-2 text-center mb-3">
                        <div><p className="text-[9px] text-gray-400">HW</p><p className="text-sm font-black">{t.homework_created || 0}</p></div>
                        <div><p className="text-[9px] text-gray-400">SECTIONS</p><p className="text-sm font-black">{t.section_count || 0}</p></div>
                        <div><p className="text-[9px] text-gray-400">PENDING</p><p className="text-sm font-black">{t.pending_grading || 0}</p></div>
                      </div>
                      <div className={`flex items-center gap-1 text-xs font-bold ${cfg.color}`}>
                        <div className={`size-2 rounded-full ${cfg.dot}`} />
                        {cfg.label}
                      </div>
                    </div>
                  );
                })}
            </div>
          </div>

          <div className="w-60 shrink-0">
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
              <p className="font-black text-sm flex items-center gap-1 mb-3">
                <span className="material-symbols-outlined text-[#695be6] text-base">location_on</span>
                AI Suggested PD
              </p>
              {suggestedPD.map((pd, i) => (
                <div key={i} className="border border-gray-100 rounded-xl p-3 mb-3">
                  <div className="flex items-center justify-between mb-1">
                    <span className={`text-[9px] font-black px-2 py-0.5 rounded-full ${i === 0 ? "bg-blue-100 text-blue-700" : i === 1 ? "bg-purple-100 text-purple-700" : "bg-gray-100 text-gray-600"}`}>
                      {pd.type}
                    </span>
                    <span className="text-[10px] text-gray-400">{pd.duration}</span>
                  </div>
                  <p className="font-bold text-sm mb-1">{pd.title}</p>
                  <p className="text-[10px] text-gray-500 mb-2">{pd.desc}</p>
                  {pd.rating && <p className="text-[10px] text-yellow-500 font-bold">★ {pd.rating}</p>}
                  {pd.fileInfo && <p className="text-[10px] text-gray-400">{pd.fileInfo}</p>}
                </div>
              ))}
              <button onClick={() => navigate("/schooladmin/teacher-support")} className="w-full bg-[#695be6] text-white text-xs font-bold py-2.5 rounded-xl">View Full PD Library</button>
            </div>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}
