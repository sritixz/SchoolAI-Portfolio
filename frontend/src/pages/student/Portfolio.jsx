import { useEffect, useState } from "react";
import { useAuth } from "../../context/AuthContext";
import { useNavigate, Link } from "react-router-dom";
import api from "../../api";

// ── Portfolio data model (backend-ready) ─────────────────────
const PORTFOLIO_DATA = {
  bio: "Class 10-A student passionate about Mathematics and Computer Science. Aspiring software engineer.",
  stats: {
    attendance: "98%",          // attendance percentage
    points: 2450,               // gamification points
    conceptsMastered: 142,      // total concepts mastered
    improvement: "+12%",        // semester-over-semester improvement
    classRank: "Top 15%",       // relative class rank
  },

  // IB Learner Profile attributes
  ibProfile: [
    { id: "ib1", trait: "Principled",  icon: "balance",          color: "emerald", evidenceCount: 12, percent: 85 },
    { id: "ib2", trait: "Balanced",    icon: "self_improvement",  color: "orange",  evidenceCount: 8,  percent: 70 },
    { id: "ib3", trait: "Thinker",     icon: "lightbulb",         color: "blue",    evidenceCount: 15, percent: 95 },
    { id: "ib4", trait: "Caring",      icon: "favorite",          color: "rose",    evidenceCount: 10, percent: 90 },
  ],

  // Academic progress per subject
  academicProgress: [
    { subject: "Mathematics",        percent: 85, semester: "Semester 2 • 2026" },
    { subject: "Science",            percent: 92, semester: "Semester 2 • 2026" },
    { subject: "English Literature", percent: 78, semester: "Semester 2 • 2026" },
    { subject: "Computer Science",   percent: 92, semester: "Semester 2 • 2026" },
    { subject: "History",            percent: 74, semester: "Semester 2 • 2026" },
  ],

  // Badges / awards
  badges: [
    { id: "b1", label: "Streak Master",  icon: "local_fire_department", color: "orange", date: "Mar 12" },
    { id: "b2", label: "Excellence",     icon: "grade",                 color: "yellow", date: "Feb 28" },
    { id: "b3", label: "Sportsmanship",  icon: "sports_soccer",         color: "blue",   date: "Jan 15" },
    { id: "b4", label: "Creative",       icon: "brush",                 color: "purple", date: "Dec 20" },
    { id: "b5", label: "Top Scorer",     icon: "emoji_events",          color: "amber",  date: "Nov 10" },
  ],

  // Appreciations from teachers / parents
  appreciations: [
    {
      id: "ap1",
      from: "Mrs. Priya Nair",
      role: "Teacher",
      relativeTime: "2 days ago",
      message: "Aarav showed incredible leadership during the science project. His ability to explain complex concepts to his peers was outstanding.",
      stars: 3,
    },
    {
      id: "ap2",
      from: "Sunita Sharma",
      role: "Parent",
      relativeTime: "1 week ago",
      message: "So proud of your progress this term, Aarav! Keep up the hard work in math.",
      stars: 0,
    },
    {
      id: "ap3",
      from: "Mr. Suresh Kumar",
      role: "Teacher",
      relativeTime: "2 weeks ago",
      message: "Excellent essay on the Industrial Revolution. Your analysis showed real depth of understanding.",
      stars: 3,
    },
  ],

  // Projects
  projects: [
    { id: "pr1", title: "Weather App",         subject: "Computer Science", description: "Built a real-time weather app using Python and OpenWeather API.", grade: "A+", date: "2026-02-15", tags: ["Python", "API", "UI"] },
    { id: "pr2", title: "Photosynthesis Model", subject: "Biology",          description: "3D model demonstrating the light and dark reactions of photosynthesis.", grade: "A",  date: "2026-01-20", tags: ["Biology", "3D Model", "Science Fair"] },
    { id: "pr3", title: "History Timeline",     subject: "History",          description: "Interactive digital timeline of the Industrial Revolution.", grade: "B+", date: "2025-11-10", tags: ["History", "Digital", "Research"] },
  ],

  // Extracurricular
  extracurricular: [
    { id: "ec1", name: "Coding Club",   role: "President",   icon: "code" },
    { id: "ec2", name: "Math Society",  role: "Member",      icon: "functions" },
    { id: "ec3", name: "School Cricket",role: "Player",      icon: "sports_cricket" },
    { id: "ec4", name: "Debate Team",   role: "Participant", icon: "record_voice_over" },
  ],
};

// ── Color maps ───────────────────────────────────────────────
const IB_COLORS = {
  emerald: { bg: "bg-emerald-100", text: "text-emerald-600", bar: "bg-emerald-500", badge: "bg-emerald-50 text-emerald-600" },
  orange:  { bg: "bg-orange-100",  text: "text-orange-600",  bar: "bg-orange-500",  badge: "bg-orange-50 text-orange-600" },
  blue:    { bg: "bg-blue-100",    text: "text-blue-600",    bar: "bg-blue-500",    badge: "bg-blue-50 text-blue-600" },
  rose:    { bg: "bg-rose-100",    text: "text-rose-600",    bar: "bg-rose-500",    badge: "bg-rose-50 text-rose-600" },
};

const BADGE_COLORS = {
  orange: "bg-orange-100 text-orange-600",
  yellow: "bg-yellow-100 text-yellow-600",
  blue:   "bg-blue-100 text-blue-600",
  purple: "bg-purple-100 text-purple-600",
  amber:  "bg-amber-100 text-amber-600",
};

// ── Bottom nav shared ────────────────────────────────────────
const NAV_ITEMS = [
  { icon: "home",         label: "Home",     to: "/student" },
  { icon: "description",  label: "Homework", to: "/student/homework" },
  { icon: "auto_awesome", label: "Vin AI",   to: "/student/vin-ai", fab: true },
  { icon: "bar_chart",    label: "Progress", to: "#" },
  { icon: "person",       label: "Profile",  to: "#", active: true },
];

export default function Portfolio() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [entries, setEntries] = useState([]);
  const [profile, setProfile] = useState(null);
  const d = profile || PORTFOLIO_DATA;

  useEffect(() => {
    api.get("/portfolio/student").then((r) => {
      if (r.data?.length) setEntries(r.data);
    }).catch(() => {});
    // Fetch full portfolio summary (grades, attendance, badges, extracurricular, IB profile)
    api.get("/student/portfolio-summary").then((r) => {
      if (r.data) setProfile(r.data);
    }).catch(() => {});
  }, []);

  // Merge API entries into projects/appreciations
  const apiProjects = entries.filter((e) => e.type === "project" || e.type === "parent_reflection");
  const projects = apiProjects.length ? apiProjects.map((e) => ({
    id: e._id,
    title: e.title,
    subject: e.subject || "General",
    description: e.text || e.description || "",
    grade: e.grade || "",
    date: e.created_at ? new Date(e.created_at).toLocaleDateString() : "",
    tags: e.tags || [],
  })) : d.projects;

  // Appreciations from API (teacher_note entries) or fall back to mock
  const apiAppreciations = entries.filter((e) => e.type === "teacher_note" || e.type === "achievement");
  const appreciations = apiAppreciations.length
    ? apiAppreciations.map((e) => ({
        id: e._id,
        from: e.author || "Teacher",
        role: e.type === "teacher_note" ? "Teacher" : "Achievement",
        relativeTime: e.date || (e.created_at ? new Date(e.created_at).toLocaleDateString() : ""),
        message: e.text || "",
        stars: 0,
      }))
    : d.appreciations;

  return (
    <div className="min-h-screen bg-[#f6f6f8]" style={{ fontFamily: "'Lexend', sans-serif" }}>

      {/* ── Header ── */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-white/80 backdrop-blur-md border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate("/student")}
              className="p-2 hover:bg-gray-100 rounded-lg"
            >
              <span className="material-symbols-outlined text-gray-500">arrow_back</span>
            </button>
            <div className="bg-[#695be6] p-2 rounded-lg flex items-center justify-center text-white">
              <span className="material-symbols-outlined">auto_stories</span>
            </div>
            <h1 className="text-xl font-bold tracking-tight">My Portfolio</h1>
          </div>
          <div className="flex items-center gap-3">
            <button className="flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg font-semibold transition-colors text-sm">
              <span className="material-symbols-outlined text-[20px]">edit</span>
              <span className="hidden sm:inline">Edit Profile</span>
            </button>
            <button className="flex items-center gap-2 px-4 py-2 bg-[#695be6] text-white hover:bg-[#5a4dd4] rounded-lg font-semibold shadow-lg shadow-[#695be6]/20 transition-all text-sm">
              <span className="material-symbols-outlined text-[20px]">share</span>
              <span className="hidden sm:inline">Share Portfolio</span>
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 pt-24 pb-24 space-y-8">

        {/* ── Hero profile card ── */}
        <section className="relative overflow-hidden rounded-xl bg-gradient-to-br from-[#695be6] to-[#D4C5F9] p-8 text-white shadow-xl shadow-[#695be6]/10">
          <div className="relative z-10 flex flex-col md:flex-row items-center gap-8">
            <div className="size-[100px] rounded-full border-4 border-white/30 p-1 bg-white/10 overflow-hidden shadow-inner shrink-0">
              {user?.avatar
                ? <img src={user.avatar} alt="avatar" className="w-full h-full object-cover rounded-full" />
                : <div className="w-full h-full bg-white/20 rounded-full flex items-center justify-center text-4xl font-black">{user?.name?.[0]}</div>
              }
            </div>
            <div className="text-center md:text-left">
              <h2 className="text-4xl font-bold mb-1">{user?.name}</h2>
              <p className="text-white/90 text-lg font-medium">Class {user?.class} · Roll No. {user?.rollNo}</p>
              <div className="flex items-center justify-center md:justify-start gap-2 mt-2 text-white/80">
                <span className="material-symbols-outlined text-sm">school</span>
                <span className="text-sm">{user?.school}</span>
              </div>
              <p className="mt-3 text-white/80 text-sm leading-relaxed max-w-md">{d.bio}</p>
            </div>
            <div className="hidden lg:flex ml-auto gap-4 shrink-0">
              <div className="bg-white/10 backdrop-blur-md rounded-lg p-4 text-center min-w-[110px]">
                <p className="text-xs uppercase tracking-wider opacity-70 mb-1">Attendance</p>
                <p className="text-2xl font-bold">{d.stats.attendance}</p>
              </div>
              <div className="bg-white/10 backdrop-blur-md rounded-lg p-4 text-center min-w-[110px]">
                <p className="text-xs uppercase tracking-wider opacity-70 mb-1">Points</p>
                <p className="text-2xl font-bold">{d.stats.points.toLocaleString()}</p>
              </div>
            </div>
          </div>
          <div className="absolute -right-10 -bottom-10 size-64 bg-white/10 rounded-full blur-3xl" />
          <div className="absolute -left-10 -top-10 size-48 bg-[#695be6]/20 rounded-full blur-3xl" />
        </section>

        {/* ── Two-column layout ── */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

          {/* ── Left: IB Profile + Academic Progress + Projects + Extracurricular ── */}
          <div className="lg:col-span-2 space-y-8">

            {/* IB Learner Profile */}
            <div>
              <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
                <span className="material-symbols-outlined text-[#695be6]">psychology</span>
                IB Learner Profile
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {d.ibProfile.map((ib) => {
                  const c = IB_COLORS[ib.color];
                  return (
                    <div key={ib.id} className="bg-white p-5 rounded-lg border border-gray-100 shadow-sm hover:shadow-md transition-shadow">
                      <div className="flex justify-between items-start mb-4">
                        <div className={`size-12 rounded-lg ${c.bg} ${c.text} flex items-center justify-center`}>
                          <span className="material-symbols-outlined text-2xl">{ib.icon}</span>
                        </div>
                        <span className={`px-2 py-1 rounded text-xs font-bold ${c.badge}`}>{ib.evidenceCount} Evidence</span>
                      </div>
                      <h4 className="font-bold text-lg mb-1">{ib.trait}</h4>
                      <div className="flex items-center gap-3 mt-4">
                        <div className="flex-1 bg-gray-100 h-2 rounded-full overflow-hidden">
                          <div className={`${c.bar} h-full rounded-full`} style={{ width: `${ib.percent}%` }} />
                        </div>
                        <span className={`text-sm font-bold ${c.text}`}>{ib.percent}%</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Academic Progress */}
            <div className="bg-white rounded-lg border border-gray-100 shadow-sm overflow-hidden">
              <div className="p-6 border-b border-gray-100 flex justify-between items-center">
                <h3 className="text-xl font-bold flex items-center gap-2">
                  <span className="material-symbols-outlined text-[#695be6]">monitoring</span>
                  Academic Progress
                </h3>
                <span className="text-sm text-gray-500 font-medium">Semester 2 • 2026</span>
              </div>
              <div className="p-6 space-y-6">
                <div className="space-y-4">
                  {d.academicProgress.map((s) => (
                    <div key={s.subject}>
                      <div className="flex justify-between mb-1.5 px-1">
                        <span className="font-medium text-sm">{s.subject}</span>
                        <span className="font-bold text-sm">{s.percent}%</span>
                      </div>
                      <div className="bg-gray-100 h-4 rounded-full overflow-hidden">
                        <div className="bg-[#695be6] h-full rounded-full" style={{ width: `${s.percent}%` }} />
                      </div>
                    </div>
                  ))}
                </div>
                <div className="grid grid-cols-3 gap-4 pt-4 border-t border-gray-100">
                  <div className="text-center">
                    <p className="text-2xl font-bold text-[#695be6]">{d.stats.conceptsMastered}</p>
                    <p className="text-[10px] uppercase font-bold text-gray-400">Concepts Mastered</p>
                  </div>
                  <div className="text-center border-x border-gray-100 px-4">
                    <p className="text-2xl font-bold text-emerald-500">{d.stats.improvement}</p>
                    <p className="text-[10px] uppercase font-bold text-gray-400">Improvement</p>
                  </div>
                  <div className="text-center">
                    <p className="text-2xl font-bold text-[#695be6]">{d.stats.classRank}</p>
                    <p className="text-[10px] uppercase font-bold text-gray-400">Class Rank</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Projects */}
            <div className="bg-white rounded-lg border border-gray-100 shadow-sm p-6">
              <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
                <span className="material-symbols-outlined text-[#695be6]">folder_special</span>
                Projects
              </h3>
              <div className="space-y-4">
                {projects.map((p) => (
                  <div key={p.id} className="p-4 border border-slate-100 rounded-xl hover:border-[#695be6]/30 transition-colors">
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div>
                        <h4 className="font-bold text-slate-800">{p.title}</h4>
                        <p className="text-xs text-slate-400">{p.subject} · {p.date}</p>
                      </div>
                      <span className="text-lg font-black text-green-600">{p.grade}</span>
                    </div>
                    <p className="text-sm text-slate-600 mb-3">{p.description}</p>
                    <div className="flex flex-wrap gap-1.5">
                      {p.tags.map((t) => (
                        <span key={t} className="px-2 py-0.5 bg-[#695be6]/10 text-[#695be6] text-xs font-medium rounded-full">{t}</span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Extracurricular */}
            <div className="bg-white rounded-lg border border-gray-100 shadow-sm p-6">
              <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
                <span className="material-symbols-outlined text-[#695be6]">diversity_3</span>
                Extracurricular
              </h3>
              <div className="grid grid-cols-2 gap-3">
                {d.extracurricular.map((e) => (
                  <div key={e.id} className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl">
                    <div className="size-9 bg-[#695be6]/10 rounded-lg flex items-center justify-center">
                      <span className="material-symbols-outlined text-[#695be6] text-lg">{e.icon}</span>
                    </div>
                    <div>
                      <p className="text-sm font-bold text-slate-800 leading-tight">{e.name}</p>
                      <p className="text-xs text-slate-400">{e.role}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* ── Right sidebar: Badges + Appreciations ── */}
          <div className="space-y-8">

            {/* Badges */}
            <div className="bg-white rounded-lg border border-gray-100 shadow-sm p-6">
              <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                <span className="material-symbols-outlined text-yellow-500">military_tech</span>
                Badges & Awards
              </h3>
              <div className="flex gap-4 overflow-x-auto pb-4" style={{ scrollbarWidth: "none" }}>
                {d.badges.map((b) => (
                  <div key={b.id} className="flex-shrink-0 text-center space-y-2 group cursor-pointer">
                    <div className={`size-16 rounded-full ${BADGE_COLORS[b.color]} flex items-center justify-center group-hover:scale-110 transition-transform shadow-sm`}>
                      <span className="material-symbols-outlined text-3xl">{b.icon}</span>
                    </div>
                    <p className="text-xs font-bold">{b.label}</p>
                    <p className="text-[10px] text-gray-400">{b.date}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Appreciations timeline */}
            <div className="bg-white rounded-lg border border-gray-100 shadow-sm p-6">
              <h3 className="text-lg font-bold mb-6 flex items-center gap-2">
                <span className="material-symbols-outlined text-rose-500">forum</span>
                Appreciations
              </h3>
              <div className="space-y-8 relative before:absolute before:inset-y-0 before:left-5 before:w-px before:bg-gray-100">
                {appreciations.length === 0 ? (
                  <p className="text-sm text-gray-400 text-center py-4">No appreciations yet</p>
                ) : appreciations.map((ap) => (
                  <div key={ap.id} className="relative pl-12">
                    {/* Avatar circle */}
                    <div className="absolute left-0 top-0 size-10 rounded-full border-4 border-white bg-[#695be6]/10 z-10 flex items-center justify-center shadow-sm">
                      <span className="material-symbols-outlined text-[#695be6] text-lg">
                        {ap.role === "Teacher" ? "person_book" : "family_restroom"}
                      </span>
                    </div>
                    <div className="bg-gray-50 p-4 rounded-lg relative">
                      <div className="flex justify-between items-start mb-1">
                        <p className="font-bold text-sm">
                          {ap.from} <span className="text-gray-400 font-normal ml-1">{ap.role}</span>
                        </p>
                        <span className="text-[10px] text-gray-400">{ap.relativeTime}</span>
                      </div>
                      <p className="text-sm text-gray-600 leading-relaxed italic">"{ap.message}"</p>
                      {ap.stars > 0 && (
                        <div className="mt-2 flex gap-0.5">
                          {Array.from({ length: ap.stars }).map((_, i) => (
                            <span key={i} className="material-symbols-outlined text-xs text-[#695be6]"
                              style={{ fontVariationSettings: "'FILL' 1" }}>star</span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* ── Footer ── */}
      <footer className="max-w-7xl mx-auto px-6 border-t border-gray-200 py-6 flex flex-col md:flex-row justify-between items-center gap-4 text-gray-400">
        <div className="flex items-center gap-2">
          <span className="material-symbols-outlined text-[#695be6]">verified</span>
          <p className="text-xs font-medium">Verified by {user?.school}</p>
        </div>
        <p className="text-xs">Last updated: {new Date().toLocaleDateString()} · Academic Year {new Date().getFullYear() - 1}-{new Date().getFullYear()}</p>
      </footer>

      {/* ── Bottom Nav ── */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 px-6 py-2 z-50">
        <div className="max-w-[600px] mx-auto flex items-end justify-around h-16">
          {NAV_ITEMS.map((item) =>
            item.fab ? (
              <Link key={item.label} to={item.to} className="flex flex-col items-center -mt-6 bg-[#695be6] text-white size-14 rounded-full shadow-lg shadow-[#695be6]/40 justify-center">
                <span className="material-symbols-outlined">{item.icon}</span>
              </Link>
            ) : (
              <Link key={item.label} to={item.to} className={`flex flex-col items-center gap-1 ${item.active ? "text-[#695be6]" : "text-gray-400"}`}>
                <span className="material-symbols-outlined">{item.icon}</span>
                <span className="text-[10px] font-bold">{item.label}</span>
              </Link>
            )
          )}
        </div>
      </nav>
    </div>
  );
}
