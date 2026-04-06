import { useState, useEffect } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import api from "../../api";
import { getDomainById, getDomainRows } from "../../data/careerData";

// Gradient backgrounds per card index (cycling)
const CARD_GRADIENTS = [
  "from-[#695be6]/80 to-[#8e82f3]/80",
  "from-blue-600/80 to-indigo-700/80",
  "from-emerald-600/80 to-teal-700/80",
  "from-amber-600/80 to-orange-700/80",
  "from-rose-600/80 to-pink-700/80",
  "from-slate-600/80 to-slate-800/80",
];

function CareerCard({ career, domainId, index }) {
  return (
    <Link
      to={`/student/career/${domainId}/${career.id}`}
      className="flex-none w-[280px] md:w-[340px] group cursor-pointer transition-transform hover:scale-[1.03] duration-300"
    >
      <div className="relative rounded-xl overflow-hidden bg-[#695be6]/10 shadow-lg">
        {/* Gradient placeholder (replaces image) */}
        <div className={`aspect-video w-full bg-gradient-to-br ${CARD_GRADIENTS[index % CARD_GRADIENTS.length]} flex items-center justify-center`}>
          <span className="material-symbols-outlined text-white/30 text-7xl">work</span>
        </div>
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
        {/* Badge */}
        <span className={`absolute top-4 left-4 text-[10px] uppercase font-black px-3 py-1 rounded-full ${career.badgeColor}`}>
          {career.badge}
        </span>
        {/* Title overlay */}
        <div className="absolute bottom-4 left-4 right-4">
          <h3 className="text-white text-lg font-bold leading-tight">{career.title}</h3>
          <p className="text-white/70 text-sm">{career.subtitle}</p>
        </div>
        {/* Hover border */}
        <div className="absolute inset-0 border-4 border-[#695be6] opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none rounded-xl" />
      </div>
    </Link>
  );
}

export default function CareerCategory() {
  const { domainId } = useParams();
  const navigate     = useNavigate();
  const domain       = getDomainById(domainId);
  const mockRows     = getDomainRows(domainId);
  const [apiCareers, setApiCareers] = useState([]);

  useEffect(() => {
    api.get(`/career/${domainId}`).then((r) => {
      if (r.data?.length) setApiCareers(r.data);
    }).catch(() => {});
  }, [domainId]);

  // Build rows from API data or fall back to mock
  const rows = apiCareers.length > 0
    ? [{ id: "api_row", rowTitle: "Careers in this field", careers: apiCareers }]
    : mockRows;

  if (!domain) {
    return (
      <div className="min-h-screen bg-[#f6f6f8] flex items-center justify-center" style={{ fontFamily: "'Lexend', sans-serif" }}>
        <div className="text-center">
          <p className="font-bold text-slate-600">Domain not found.</p>
          <button onClick={() => navigate("/student/career")} className="mt-4 px-6 py-2 bg-[#695be6] text-white rounded-full font-bold">Back</button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f6f6f8]" style={{ fontFamily: "'Lexend', sans-serif" }}>

      {/* Header */}
      <header className="flex items-center justify-between whitespace-nowrap border-b border-[#695be6]/10 px-6 md:px-10 py-3 bg-white/80 backdrop-blur-md sticky top-0 z-50">
        <div className="flex items-center gap-8">
          <div className="flex items-center gap-4 text-[#695be6]">
            <div className="size-8 flex items-center justify-center bg-[#695be6] rounded-lg text-white">
              <span className="material-symbols-outlined text-sm">{domain.icon}</span>
            </div>
            <h2 className="text-slate-900 text-lg font-bold leading-tight tracking-tight">CareerPath AI</h2>
          </div>
          <nav className="hidden md:flex items-center gap-8">
            <Link to="/student/career" className="text-sm font-semibold hover:text-[#695be6] transition-colors">Explore</Link>
            <span className="text-sm font-semibold text-[#695be6] border-b-2 border-[#695be6]">Categories</span>
          </nav>
        </div>
        <div className="flex items-center gap-3">
          <button className="flex size-10 items-center justify-center rounded-full bg-[#695be6]/10 text-[#695be6] hover:bg-[#695be6] hover:text-white transition-all">
            <span className="material-symbols-outlined text-[20px]">notifications</span>
          </button>
          <button onClick={() => navigate("/student")} className="flex size-10 items-center justify-center rounded-full bg-[#695be6]/10 text-[#695be6] hover:bg-[#695be6] hover:text-white transition-all">
            <span className="material-symbols-outlined text-[20px]">home</span>
          </button>
        </div>
      </header>

      <main className="flex-1">
        {/* Breadcrumb + hero */}
        <div className="max-w-[1440px] mx-auto px-6 md:px-10 pt-8 pb-4">
          <nav className="flex items-center gap-2 mb-6 text-sm">
            <Link to="/student/career" className="text-[#695be6] font-medium hover:underline">All Categories</Link>
            <span className="material-symbols-outlined text-slate-400 text-sm">chevron_right</span>
            <span className="text-slate-500">{domain.label}</span>
          </nav>
          <h1 className="text-slate-900 text-4xl md:text-5xl font-black leading-tight tracking-tight mb-3">
            Career Categories — {domain.label.split(" ")[0]}
          </h1>
          <p className="text-slate-500 text-lg max-w-2xl">{domain.description}</p>
        </div>

        {/* Rows */}
        {rows.length === 0 ? (
          <div className="max-w-[1440px] mx-auto px-6 md:px-10 py-20 text-center">
            <span className="material-symbols-outlined text-6xl text-slate-200 mb-4 block">work_off</span>
            <p className="text-slate-400 font-medium">Career details for this domain are coming soon.</p>
            <Link to="/student/career" className="mt-4 inline-block px-6 py-2 bg-[#695be6] text-white rounded-full font-bold text-sm">
              Back to Explorer
            </Link>
          </div>
        ) : (
          rows.map((row) => (
            <section key={row.id} className="mb-12">
              <div className="max-w-[1440px] mx-auto px-6 md:px-10 flex items-center justify-between mb-4">
                <h2 className="text-xl md:text-2xl font-bold text-slate-900">{row.rowTitle}</h2>
                <button className="text-[#695be6] text-sm font-bold hover:underline">See All</button>
              </div>
              <div className="flex overflow-x-auto gap-6 px-6 md:px-10 pb-4" style={{ scrollbarWidth: "none" }}>
                {row.careers.map((career, i) => (
                  <CareerCard key={career.id} career={career} domainId={domainId} index={i} />
                ))}
              </div>
            </section>
          ))
        )}
      </main>

      <footer className="bg-white border-t border-[#695be6]/10 py-10 px-6 md:px-10 mt-8">
        <div className="max-w-[1440px] mx-auto flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="flex items-center gap-3 text-[#695be6]">
            <span className="material-symbols-outlined">explore</span>
            <span className="text-lg font-bold text-slate-900">CareerPath AI</span>
          </div>
          <p className="text-xs text-slate-400">© 2026 CareerPath AI. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
