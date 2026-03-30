import { useAuth } from "../../context/AuthContext";
import { useNavigate } from "react-router-dom";

const NAV = [
  { section: "OVERVIEW", items: [
    { label: "Dashboard",   icon: "dashboard",    path: "/schooladmin" },
    { label: "Onboarding",  icon: "group_add",    path: "/schooladmin/onboarding" },
  ]},
  {
    section: "PERFORMANCE ANALYTICS",
    items: [
      { label: "Matrix View",    icon: "grid_view", path: "/schooladmin/matrix" },
      { label: "Learning Gaps",  icon: "warning",   path: "/schooladmin/gaps" },
    ],
  },
  {
    section: "COMPARISONS & COVERAGE",
    items: [
      { label: "Cross-Class",  icon: "compare_arrows", path: "/schooladmin/cross-class" },
      { label: "Curriculum",   icon: "menu_book",      path: "/schooladmin/curriculum" },
      { label: "Weak Topics",  icon: "trending_down",  path: "/schooladmin/weak-topics" },
    ],
  },
  {
    section: "SUPPORT & PLANNING",
    items: [{ label: "Teacher Support", icon: "support_agent", path: "/schooladmin/teacher-support" }],
  },
];

export function AdminLayout({ children, active }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  return (
    <div className="flex min-h-screen bg-[#f6f6f8]" style={{ fontFamily: "'Lexend', sans-serif" }}>
      {/* Sidebar */}
      <aside className="w-56 bg-[#ede9fb] flex flex-col fixed top-0 left-0 h-full z-40">
        <div className="p-4 border-b border-[#d5cef7]">
          <div className="flex items-center gap-2 mb-1">
            <div className="size-8 bg-[#695be6] rounded-lg flex items-center justify-center text-white text-xs font-black">
              {user?.school?.[0] || "D"}
            </div>
            <div>
              <p className="text-xs font-black text-[#100e1a] leading-tight">{user?.school || "DPS Patna"}</p>
              <p className="text-[10px] text-gray-500">2023-2024</p>
            </div>
          </div>
        </div>

        <nav className="flex-1 overflow-y-auto p-3 flex flex-col gap-4">
          {NAV.map((group) => (
            <div key={group.section}>
              <p className="text-[9px] font-black text-gray-400 tracking-widest mb-1 px-2">{group.section}</p>
              {group.items.map((item) => (
                <button
                  key={item.path}
                  onClick={() => navigate(item.path)}
                  className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors mb-0.5 ${
                    active === item.path
                      ? "bg-[#695be6] text-white"
                      : "text-gray-600 hover:bg-[#d5cef7]"
                  }`}
                >
                  <span className="material-symbols-outlined text-base">{item.icon}</span>
                  {item.label}
                </button>
              ))}
            </div>
          ))}
        </nav>

        <div className="p-3 border-t border-[#d5cef7]">
          <div className="flex items-center gap-2 mb-2">
            <div className="size-8 bg-[#695be6] rounded-full flex items-center justify-center text-white text-xs font-black">
              {user?.name?.[0] || "D"}
            </div>
            <div>
              <p className="text-xs font-bold text-[#100e1a]">{user?.name || "Dr. Kumar"}</p>
              <p className="text-[10px] text-gray-500">{user?.designation || "Principal"}</p>
            </div>
          </div>
          <button
            onClick={() => { logout(); navigate("/login"); }}
            className="w-full text-xs text-red-500 flex items-center gap-1 px-2 py-1 hover:bg-red-50 rounded-lg"
          >
            <span className="material-symbols-outlined text-sm">logout</span> Logout
          </button>
        </div>
      </aside>

      {/* Main */}
      <main className="ml-56 flex-1 min-h-screen">
        {children}
      </main>
    </div>
  );
}

export default function SchoolAdminHome() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const stats = user?.stats || {};

  const priorityItems = [
    { title: "Grade 8 Physics - Thermodynamics Gap", desc: "Class 8B & 8C showing 45% below average comprehension.", badge: "High Severity", badgeColor: "bg-red-500 text-white", action: "Take Action", borderColor: "border-l-red-500", route: "/schooladmin/gaps" },
    { title: "Grade 9 Math - Algebra Delay", desc: "Curriculum schedule is 2 weeks behind planned timeline.", badge: "Warning", badgeColor: "bg-amber-400 text-white", action: "View Details", borderColor: "border-l-amber-400", route: "/schooladmin/curriculum" },
    { title: "Teacher Support Request - Biology", desc: "Mrs. Sharma requested resources for lab equipment.", badge: "Resource", badgeColor: "bg-[#695be6] text-white", action: "Review", borderColor: "border-l-[#695be6]", route: "/schooladmin/teacher-support" },
  ];

  const topSections = [
    { code: "9A", label: "Grade 9 - Sec A", sub: "Science Leader", score: 92, color: "bg-green-100 text-green-700" },
    { code: "10C", label: "Grade 10 - Sec C", sub: "Math Leader", score: 89, color: "bg-blue-100 text-blue-700" },
    { code: "6B", label: "Grade 6 - Sec B", sub: "English Leader", score: 88, color: "bg-purple-100 text-purple-700" },
  ];

  const recentActions = [
    { label: "Intervention Assigned", sub: "Grade 5 Math - 2 hours ago" },
    { label: "Report Generated", sub: "Q2 Analysis - 5 hours ago" },
    { label: "Meeting Scheduled", sub: "With Dept. Heads - Yesterday" },
  ];

  return (
    <AdminLayout active="/schooladmin">
      <div className="p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <span className="material-symbols-outlined text-gray-400">home</span>
          <span className="material-symbols-outlined text-gray-400">notifications</span>
        </div>

        {/* Welcome Banner */}
        <div className="bg-[#695be6] rounded-2xl p-6 text-white mb-6">
          <h1 className="text-2xl font-black">Good Morning, {user?.name?.split(" ").pop() || "Dr. Kumar"}!</h1>
          <p className="text-white/80 text-sm mt-1">
            You have <span className="font-bold text-white">3 critical learning gaps</span> that require your immediate attention today. Overall attendance is steady at {stats.attendanceToday || 94}%.
          </p>
        </div>

        {/* Stats Row */}
        <div className="grid grid-cols-2 gap-4 mb-6">
          <div className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm">
            <p className="text-xs text-gray-500 mb-1">Learning Gaps</p>
            <p className="text-3xl font-black text-[#100e1a]">127</p>
            <span className="inline-block mt-2 bg-red-100 text-red-600 text-xs font-bold px-2 py-0.5 rounded-full">12 Critical Priority</span>
          </div>
          <div className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm">
            <p className="text-xs text-gray-500 mb-1">Curriculum Progress</p>
            <div className="flex items-center gap-3">
              <p className="text-3xl font-black text-[#100e1a]">68%</p>
              <svg viewBox="0 0 36 36" className="size-12">
                <circle cx="18" cy="18" r="15.9" fill="none" stroke="#e5e7eb" strokeWidth="3" />
                <circle cx="18" cy="18" r="15.9" fill="none" stroke="#695be6" strokeWidth="3"
                  strokeDasharray="68 32" strokeDashoffset="25" strokeLinecap="round" />
              </svg>
            </div>
            <p className="text-xs text-gray-400">On track for Term 2</p>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-4">
          {/* Priority Attention */}
          <div className="col-span-2 bg-white rounded-xl border border-gray-100 shadow-sm p-4">
            <div className="flex justify-between items-center mb-3">
              <p className="font-bold text-sm">Priority Attention Needed</p>
              <button onClick={() => navigate("/schooladmin/gaps")} className="text-xs text-[#695be6] font-medium">View All</button>
            </div>
            <div className="flex flex-col gap-3">
              {priorityItems.map((item) => (
                <div key={item.title} className={`border-l-4 ${item.borderColor} pl-3 flex items-start justify-between gap-2`}>
                  <div>
                    <p className="text-sm font-bold">{item.title}</p>
                    <p className="text-xs text-gray-500 mt-0.5">{item.desc}</p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${item.badgeColor}`}>{item.badge}</span>
                    <button
                      onClick={() => navigate(item.route)}
                      className="text-xs border border-gray-200 px-2 py-1 rounded-lg hover:bg-gray-50"
                    >{item.action}</button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Right Column */}
          <div className="flex flex-col gap-4">
            {/* Top Sections */}
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
              <p className="font-bold text-sm mb-3">Top Performing Sections</p>
              <div className="flex flex-col gap-2">
                {topSections.map((s) => (
                  <div key={s.code} className="flex items-center gap-2">
                    <span className={`text-[10px] font-black px-1.5 py-0.5 rounded ${s.color}`}>{s.code}</span>
                    <div className="flex-1">
                      <p className="text-xs font-bold">{s.label}</p>
                      <p className="text-[10px] text-gray-400">{s.sub}</p>
                    </div>
                    <span className="text-sm font-black text-[#695be6]">{s.score}%</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Recent Actions */}
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
              <p className="font-bold text-sm mb-3">Recent Actions</p>
              <div className="flex flex-col gap-2">
                {recentActions.map((a) => (
                  <div key={a.label} className="flex items-start gap-2">
                    <div className="size-2 bg-[#695be6] rounded-full mt-1.5 shrink-0" />
                    <div>
                      <p className="text-xs font-bold">{a.label}</p>
                      <p className="text-[10px] text-gray-400">{a.sub}</p>
                    </div>
                  </div>
                ))}
              </div>
              <button onClick={() => navigate("/schooladmin/matrix")} className="text-xs text-[#695be6] font-medium mt-3">View Full Timeline</button>
            </div>
          </div>
        </div>

        {/* 6-Month Trend placeholder */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 mt-4">
          <div className="flex justify-between items-center mb-3">
            <p className="font-bold text-sm">6-Month Performance Trend</p>
            <select className="text-xs border border-gray-200 rounded-lg px-2 py-1">
              <option>All Subjects</option>
              <option>Mathematics</option>
              <option>Science</option>
            </select>
          </div>
          <div className="h-24 flex items-end gap-2">
            {[55, 60, 58, 65, 70, 68].map((v, i) => (
              <div key={i} className="flex-1 flex flex-col items-center gap-1">
                <div className="w-full bg-[#695be6]/20 rounded-t" style={{ height: `${v}%` }}>
                  <div className="w-full bg-[#695be6] rounded-t" style={{ height: `${v}%` }} />
                </div>
                <span className="text-[9px] text-gray-400">{["Oct","Nov","Dec","Jan","Feb","Mar"][i]}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}
