import { useNavigate, Link } from "react-router-dom";
import { CAREER_DOMAINS } from "../../data/careerData";

export default function CareerExplorer() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-[#f6f6f8]" style={{ fontFamily: "'Lexend', sans-serif" }}>

      {/* Header */}
      <header className="sticky top-0 z-50 w-full border-b border-[#695be6]/10 bg-white/80 backdrop-blur-md px-6 lg:px-20 py-4">
        <div className="max-w-[1400px] mx-auto flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="bg-[#695be6] p-2 rounded-xl text-white">
              <span className="material-symbols-outlined text-2xl leading-none">explore</span>
            </div>
            <h2 className="text-xl font-extrabold tracking-tight text-[#695be6]">CareerPath AI</h2>
          </div>
          <div className="hidden md:flex flex-1 max-w-md mx-8">
            <div className="relative w-full">
              <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-[#695be6]/60">search</span>
              <input className="w-full bg-[#695be6]/5 border-none rounded-full py-2.5 pl-12 pr-4 focus:ring-2 focus:ring-[#695be6]/20 text-sm placeholder:text-[#695be6]/40" placeholder="Search industries or roles..." />
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button className="p-2.5 rounded-full bg-[#695be6]/5 text-[#695be6] hover:bg-[#695be6]/10 transition-colors">
              <span className="material-symbols-outlined">notifications</span>
            </button>
            <button onClick={() => navigate("/student")} className="flex items-center gap-2 px-4 py-2 bg-[#695be6]/10 text-[#695be6] rounded-full text-sm font-bold hover:bg-[#695be6]/20 transition-colors">
              <span className="material-symbols-outlined text-sm">arrow_back</span>
              Dashboard
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-[1400px] mx-auto px-6 lg:px-20 py-12">
        {/* Hero */}
        <section className="mb-12">
          <h1 className="text-4xl md:text-5xl font-black text-[#695be6] mb-3">Career Explorer</h1>
          <p className="text-lg text-[#695be6]/60 max-w-xl">
            Explore careers by field of interest. Discover your future through our curated industry pathways.
          </p>
        </section>

        {/* Domain grid */}
        <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-6">
          {CAREER_DOMAINS.map((domain) => (
            <Link
              key={domain.id}
              to={`/student/career/${domain.id}`}
              className="group relative bg-white p-8 rounded-xl border border-[#695be6]/5 shadow-sm hover:shadow-xl hover:shadow-[#695be6]/10 hover:scale-[1.03] transition-all duration-300 flex flex-col items-center text-center"
            >
              <div className={`w-16 h-16 rounded-full bg-gradient-to-br ${domain.color} flex items-center justify-center text-white mb-6 group-hover:scale-110 transition-transform duration-300 shadow-lg`}>
                <span className="material-symbols-outlined text-3xl">{domain.icon}</span>
              </div>
              <h3 className="text-base font-bold mb-2 group-hover:text-[#695be6] transition-colors leading-tight">{domain.label}</h3>
              <p className="text-sm text-gray-500 mb-6 line-clamp-2">{domain.description}</p>
              <div className="mt-auto w-full py-2 bg-[#695be6]/10 text-[#695be6] font-bold rounded-full text-sm opacity-0 group-hover:opacity-100 translate-y-2 group-hover:translate-y-0 transition-all duration-300 hover:bg-[#695be6] hover:text-white">
                Explore
              </div>
            </Link>
          ))}
        </section>

        <nav className="mt-12 flex items-center gap-2 text-sm text-[#695be6]/40 font-medium">
          <button onClick={() => navigate("/student")} className="hover:text-[#695be6]">Home</button>
          <span className="material-symbols-outlined text-base">chevron_right</span>
          <span className="text-[#695be6]">Explorer</span>
        </nav>
      </main>

      <footer className="mt-20 border-t border-[#695be6]/10 py-12 px-6 lg:px-20 bg-white">
        <div className="max-w-[1400px] mx-auto flex flex-col md:flex-row justify-between items-center gap-8">
          <div className="flex items-center gap-3">
            <div className="bg-[#695be6]/10 p-2 rounded-xl text-[#695be6]">
              <span className="material-symbols-outlined text-2xl leading-none">explore</span>
            </div>
            <h2 className="text-xl font-extrabold tracking-tight text-[#695be6]">CareerPath AI</h2>
          </div>
          <p className="text-[#695be6]/40 text-sm">© 2026 Career Explorer. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
