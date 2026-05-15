import { useEffect, useState } from "react";
import { useAuth } from "../../context/AuthContext";
import { getFirstName, getInitial } from "../../utils/nameUtils";
import { useNavigate } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import {
  fetchAdminDashboard, selectAdminDashboard,
  fetchPerformanceTrends, selectPerformanceTrends,
  fetchLearningGapsSummary, selectGapsSummary,
} from "../../store/slices/schoolAdminSlice";

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
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const handleNav = (path) => {
    navigate(path);
    setSidebarOpen(false);
  };

  return (
    <div className="flex min-h-screen bg-[#f6f6f8]" style={{ fontFamily: "'Lexend', sans-serif" }}>
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 bg-black/40 z-30 lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      {/* Sidebar */}
      <aside className={`w-56 bg-[#ede9fb] flex flex-col fixed top-0 left-0 h-full z-40 transition-transform duration-300 ${sidebarOpen ? "translate-x-0" : "-translate-x-full"} lg:translate-x-0`}>
        <div className="p-4 border-b border-[#d5cef7]">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="size-8 bg-[#695be6] rounded-lg flex items-center justify-center text-white text-xs font-black">
                {user?.school?.[0] || "D"}
              </div>
              <div>
                <p className="text-xs font-black text-[#100e1a] leading-tight">{user?.school || user?.school_name || "School"}</p>
                <p className="text-[10px] text-gray-500">{new Date().getFullYear() - 1}-{new Date().getFullYear()}</p>
              </div>
            </div>
            <button onClick={() => setSidebarOpen(false)} className="lg:hidden p-1 hover:bg-[#d5cef7] rounded-lg">
              <span className="material-symbols-outlined text-gray-500 text-xl">close</span>
            </button>
          </div>
        </div>

        <nav className="flex-1 overflow-y-auto p-3 flex flex-col gap-4">
          {NAV.map((group) => (
            <div key={group.section}>
              <p className="text-[9px] font-black text-gray-400 tracking-widest mb-1 px-2">{group.section}</p>
              {group.items.map((item) => (
                <button
                  key={item.path}
                  onClick={() => handleNav(item.path)}
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
              {getInitial(user?.name) || "D"}
            </div>
            <div>
              <p className="text-xs font-bold text-[#100e1a]">{user?.name || "Admin"}</p>
              <p className="text-[10px] text-gray-500">{user?.designation || "School Admin"}</p>
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
      <main className="lg:ml-56 flex-1 min-h-screen w-full">
        {/* Mobile top bar */}
        <div className="lg:hidden fixed top-0 left-0 right-0 z-20 bg-white border-b border-gray-200 h-14 flex items-center px-4 gap-3">
          <button onClick={() => setSidebarOpen(true)} className="p-2 hover:bg-gray-100 rounded-lg">
            <span className="material-symbols-outlined text-gray-600">menu</span>
          </button>
          <div className="size-7 bg-[#695be6] rounded-lg flex items-center justify-center text-white text-xs font-black">
            {user?.school?.[0] || "D"}
          </div>
          <p className="text-sm font-bold text-[#100e1a] truncate flex-1">{user?.school || "School Admin"}</p>
        </div>
        <div className="lg:pt-0 pt-14">
          {children}
        </div>
      </main>
    </div>
  );
}

export default function SchoolAdminHome() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const dashboard = useSelector(selectAdminDashboard);
  const trends = useSelector(selectPerformanceTrends);
  const gapsSummary = useSelector(selectGapsSummary);

  useEffect(() => {
    dispatch(fetchAdminDashboard());
    dispatch(fetchPerformanceTrends());
    dispatch(fetchLearningGapsSummary());
  }, [dispatch]);

  const counts = dashboard?.counts || {};
  const stats = dashboard?.stats || user?.stats || {};

  // Use real trend data or fallback to static
  const trendData = trends.length >= 2
    ? trends.map((t) => ({ value: t.avg_score, label: t.month?.slice(5) || "" }))
    : [55, 60, 58, 65, 70, 68].map((v, i) => ({ value: v, label: ["Oct","Nov","Dec","Jan","Feb","Mar"][i] }));

  // Priority items — built from real gap summary data
  const criticalGapCount = gapsSummary?.critical ?? 0;
  const priorityItems = [
    ...(criticalGapCount > 0 ? [{ title: `${criticalGapCount} Critical Learning Gap${criticalGapCount > 1 ? "s" : ""} Detected`, desc: `${gapsSummary?.top_gap_topics?.[0]?.topic ? `Top gap: ${gapsSummary.top_gap_topics[0].topic}` : "Students need immediate remediation support."}`, badge: "High Severity", badgeColor: "bg-red-500 text-white", action: "Take Action", borderColor: "border-l-red-500", route: "/schooladmin/gaps" }] : []),
    { title: "Curriculum Coverage Review", desc: "Check which sections are behind on curriculum timeline.", badge: "Planning", badgeColor: "bg-amber-400 text-white", action: "View Details", borderColor: "border-l-amber-400", route: "/schooladmin/curriculum" },
    { title: "Teacher Support & Engagement", desc: "Review teacher workload and pending grading queues.", badge: "Support", badgeColor: "bg-[#695be6] text-white", action: "Review", borderColor: "border-l-[#695be6]", route: "/schooladmin/teacher-support" },
  ];

  // Top sections — from real data if available, otherwise show placeholder
  const topSections = [];

  const recentActions = [
    { label: "Onboarding", sub: "Manage students, teachers & sections", route: "/schooladmin/onboarding" },
    { label: "Performance Matrix", sub: "View class-wise subject scores", route: "/schooladmin/matrix" },
    { label: "Gap Heatmap", sub: "Identify learning gap patterns", route: "/schooladmin/gaps" },
  ];

  return (
    <AdminLayout active="/schooladmin">
      <div className="p-4 sm:p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-gray-400">home</span>
            <span className="text-sm text-gray-500 font-medium">Dashboard</span>
          </div>
          <div className="flex items-center gap-3">
            <button onClick={() => navigate("/schooladmin/onboarding")}
              className="flex items-center gap-1.5 text-xs font-bold bg-[#695be6] text-white px-3 py-1.5 rounded-lg hover:bg-[#5a4dd4] transition-colors">
              <span className="material-symbols-outlined text-sm">group_add</span> Onboarding
            </button>
            <button className="relative p-2 hover:bg-gray-100 rounded-lg">
              <span className="material-symbols-outlined text-gray-500">notifications</span>
              <span className="absolute top-1.5 right-1.5 size-2 bg-red-500 rounded-full" />
            </button>
          </div>
        </div>

        {/* Welcome Banner */}
        <div className="bg-[#695be6] rounded-2xl p-6 text-white mb-6">
          <h1 className="text-2xl font-black">Good Morning, {getFirstName(user?.name) || "Admin"}!</h1>
          <p className="text-white/80 text-sm mt-1">
            {criticalGapCount > 0
              ? <>You have <span className="font-bold text-white">{criticalGapCount} critical learning gap{criticalGapCount > 1 ? "s" : ""}</span> that require your immediate attention today.</>
              : "Welcome to your school dashboard. All systems are running smoothly."
            }
            {counts.students ? ` Managing ${counts.students} students across ${counts.sections || "—"} sections.` : ""}
          </p>
        </div>

        {/* Stats Row */}
        <div className="grid grid-cols-2 gap-4 mb-6">
          <div className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm">
            <p className="text-xs text-gray-500 mb-1">Learning Gaps</p>
            <p className="text-3xl font-black text-[#100e1a]">{gapsSummary?.total ?? 127}</p>
            <span className="inline-block mt-2 bg-red-100 text-red-600 text-xs font-bold px-2 py-0.5 rounded-full">
              {gapsSummary?.critical ?? 12} Critical Priority
            </span>
          </div>
          <div className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm">
            <p className="text-xs text-gray-500 mb-1">School Overview</p>
            <div className="grid grid-cols-2 gap-2 mt-1">
              <div>
                <p className="text-2xl font-black">{counts.students ?? "—"}</p>
                <p className="text-[10px] text-gray-400">Students</p>
              </div>
              <div>
                <p className="text-2xl font-black">{counts.teachers ?? "—"}</p>
                <p className="text-[10px] text-gray-400">Teachers</p>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Priority Attention */}
          <div className="md:col-span-2 bg-white rounded-xl border border-gray-100 shadow-sm p-4">
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
              <p className="font-bold text-sm mb-3">Quick Navigation</p>
              <div className="flex flex-col gap-2">
                {[
                  { label: "Performance Matrix", icon: "grid_view", route: "/schooladmin/matrix", color: "text-[#695be6]" },
                  { label: "Gap Heatmap", icon: "warning", route: "/schooladmin/gaps", color: "text-red-500" },
                  { label: "Cross-Class Compare", icon: "compare_arrows", route: "/schooladmin/cross-class", color: "text-blue-500" },
                ].map((s) => (
                  <button key={s.label} onClick={() => navigate(s.route)} className="flex items-center gap-2 hover:bg-gray-50 rounded-lg p-1.5 transition-colors text-left">
                    <span className={`material-symbols-outlined text-base ${s.color}`}>{s.icon}</span>
                    <p className="text-xs font-bold">{s.label}</p>
                  </button>
                ))}
              </div>
            </div>

            {/* Recent Actions */}
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
              <p className="font-bold text-sm mb-3">Quick Actions</p>
              <div className="flex flex-col gap-2">
                {recentActions.map((a) => (
                  <button key={a.label} onClick={() => navigate(a.route || "/schooladmin")} className="flex items-start gap-2 hover:bg-gray-50 rounded-lg p-1.5 transition-colors text-left">
                    <div className="size-2 bg-[#695be6] rounded-full mt-1.5 shrink-0" />
                    <div>
                      <p className="text-xs font-bold">{a.label}</p>
                      <p className="text-[10px] text-gray-400">{a.sub}</p>
                    </div>
                  </button>
                ))}
              </div>
              <button onClick={() => navigate("/schooladmin/matrix")} className="text-xs text-[#695be6] font-medium mt-3">View Analytics</button>
            </div>
          </div>
        </div>

        {/* 6-Month Trend */}
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
            {trendData.map((item, i) => (
              <div key={i} className="flex-1 flex flex-col items-center gap-1">
                <div className="w-full rounded-t overflow-hidden" style={{ height: "80px" }}>
                  <div className="w-full bg-[#695be6] rounded-t transition-all"
                    style={{ height: `${item.value}%`, marginTop: `${100 - item.value}%` }} />
                </div>
                <span className="text-[9px] text-gray-400">{item.label}</span>
              </div>
            ))}
          </div>
          {trends.length > 0 && (
            <p className="text-xs text-gray-400 mt-2 text-right">
              Latest avg: <strong className="text-[#695be6]">{trendData[trendData.length - 1]?.value?.toFixed(1)}%</strong>
            </p>
          )}
        </div>
      </div>
    </AdminLayout>
  );
}
