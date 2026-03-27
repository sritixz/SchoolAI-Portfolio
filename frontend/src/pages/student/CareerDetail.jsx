import { useParams, useNavigate, Link } from "react-router-dom";
import { getCareerDetail, getDomainById } from "../../data/careerData";

const OUTLOOK_COLORS = {
  Excellent: "text-green-600 bg-green-50",
  Good:      "text-blue-600 bg-blue-50",
  Moderate:  "text-amber-600 bg-amber-50",
};

const STEP_COLORS = {
  done:     { ring: "bg-[#695be6]",     text: "text-white",     label: "text-green-600",  labelBg: "" },
  current:  { ring: "bg-[#695be6]/20",  text: "text-[#695be6]", label: "text-[#695be6]",  labelBg: "" },
  upcoming: { ring: "bg-slate-100",     text: "text-slate-400", label: "text-slate-400",  labelBg: "" },
};

const SKILL_CATEGORY_COLOR = {
  Technical:   "bg-[#695be6]/10 text-[#695be6]",
  Analytical:  "bg-blue-50 text-blue-600",
  "Soft Skill":"bg-emerald-50 text-emerald-600",
};

export default function CareerDetail() {
  const { domainId, careerId } = useParams();
  const navigate = useNavigate();
  const career   = getCareerDetail(careerId);
  const domain   = getDomainById(domainId);

  if (!career) {
    return (
      <div className="min-h-screen bg-[#f6f6f8] flex items-center justify-center" style={{ fontFamily: "'Lexend', sans-serif" }}>
        <div className="text-center">
          <p className="font-bold text-slate-600">Career not found.</p>
          <button onClick={() => navigate(`/student/career/${domainId}`)} className="mt-4 px-6 py-2 bg-[#695be6] text-white rounded-full font-bold">Back</button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-[#f6f6f8] text-[#100e1b] transition-colors duration-300" style={{ fontFamily: "'Lexend', sans-serif" }}>

      {/* Header */}
      <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-[#695be6]/10">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-10">
            <div className="flex items-center gap-3">
              <div className="size-10 bg-[#695be6] rounded-full flex items-center justify-center text-white">
                <span className="material-symbols-outlined">analytics</span>
              </div>
              <h2 className="text-xl font-bold tracking-tight">CareerPath AI</h2>
            </div>
            <nav className="hidden md:flex items-center gap-8">
              <Link to="/student/career" className="text-sm font-medium hover:text-[#695be6] transition-colors">Careers</Link>
              <Link to={`/student/career/${domainId}`} className="text-sm font-medium hover:text-[#695be6] transition-colors">Pathways</Link>
            </nav>
          </div>
          <div className="flex items-center gap-4">
            <div className="relative hidden sm:block">
              <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">search</span>
              <input className="pl-10 pr-4 py-2 bg-[#695be6]/5 border-none rounded-full w-56 focus:ring-2 focus:ring-[#695be6]/20 text-sm" placeholder="Search careers..." />
            </div>
            <button onClick={() => navigate("/student")} className="bg-[#695be6] text-white px-5 py-2.5 rounded-full text-sm font-bold hover:opacity-90 transition-opacity">
              Dashboard
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-12">

        {/* Breadcrumb */}
        <nav className="flex items-center gap-2 text-sm text-[#695be6]/50 mb-8">
          <Link to="/student/career" className="hover:text-[#695be6]">All Categories</Link>
          <span className="material-symbols-outlined text-base">chevron_right</span>
          <Link to={`/student/career/${domainId}`} className="hover:text-[#695be6]">{domain?.label}</Link>
          <span className="material-symbols-outlined text-base">chevron_right</span>
          <span className="text-[#695be6] font-semibold">{career.title}</span>
        </nav>

        {/* Hero banner */}
        <div className="relative rounded-xl overflow-hidden mb-12 h-[360px] flex items-end p-10"
          style={{ background: "linear-gradient(to top, rgba(0,0,0,0.85), rgba(105,91,230,0.4)), linear-gradient(135deg, #695be6, #8e82f3)" }}>
          <div className="relative z-10 text-white max-w-2xl">
            <div className="bg-white/20 backdrop-blur-md px-4 py-1 rounded-full text-xs font-bold uppercase tracking-widest mb-4 inline-block">
              {career.domain}
            </div>
            <h1 className="text-5xl font-bold mb-4">{career.title}</h1>
            <p className="text-lg text-white/80 leading-relaxed">
              Turning complex data into actionable stories for the world's leading organizations.
            </p>
          </div>
          {/* Stats overlay */}
          <div className="absolute top-6 right-6 flex gap-3">
            <div className="bg-white/15 backdrop-blur-md rounded-xl px-4 py-3 text-white text-center">
              <p className="text-2xl font-black">{career.matchPercent}%</p>
              <p className="text-xs opacity-70">Your Match</p>
            </div>
            <div className="bg-white/15 backdrop-blur-md rounded-xl px-4 py-3 text-white text-center">
              <p className="text-lg font-black">{career.avgSalary}</p>
              <p className="text-xs opacity-70">Avg Salary</p>
            </div>
            <div className="bg-white/15 backdrop-blur-md rounded-xl px-4 py-3 text-white text-center">
              <p className="text-lg font-black">{career.jobOpenings}</p>
              <p className="text-xs opacity-70">Job Openings</p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">

          {/* ── Left: main content ── */}
          <div className="lg:col-span-2 space-y-12">

            {/* What they do */}
            <section>
              <h2 className="text-2xl font-bold mb-6 flex items-center gap-3">
                <span className="material-symbols-outlined text-[#695be6]">description</span>
                What They Do
              </h2>
              <p className="text-lg text-gray-600 leading-relaxed">{career.whatTheyDo}</p>
            </section>

            {/* Day in life */}
            <section>
              <h2 className="text-2xl font-bold mb-6 flex items-center gap-3">
                <span className="material-symbols-outlined text-[#695be6]">today</span>
                A Day in the Life
              </h2>
              <div className="space-y-3">
                {career.dayInLife.map((item, i) => (
                  <div key={i} className="flex items-start gap-3 p-4 bg-white rounded-xl border border-[#695be6]/5 shadow-sm">
                    <div className="size-7 rounded-full bg-[#695be6]/10 text-[#695be6] flex items-center justify-center shrink-0 text-xs font-bold">
                      {i + 1}
                    </div>
                    <p className="text-slate-700 text-sm leading-relaxed">{item}</p>
                  </div>
                ))}
              </div>
            </section>

            {/* Education path */}
            <section>
              <h2 className="text-2xl font-bold mb-8 flex items-center gap-3">
                <span className="material-symbols-outlined text-[#695be6]">school</span>
                Education Path
              </h2>
              <div className="relative flex flex-col gap-8">
                <div className="absolute left-[23px] top-0 bottom-0 w-0.5 bg-[#695be6]/10" />
                {career.educationPath.map((step) => {
                  const sc = STEP_COLORS[step.status];
                  return (
                    <div key={step.step} className="relative flex gap-6">
                      <div className={`size-12 ${sc.ring} rounded-full flex items-center justify-center ${sc.text} z-10 shrink-0 font-bold shadow-sm`}>
                        {step.status === "done"
                          ? <span className="material-symbols-outlined text-lg">check</span>
                          : <span className="font-bold">{step.step}</span>
                        }
                      </div>
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-bold text-lg">{step.title}</h3>
                          {step.status === "current" && (
                            <span className="text-xs font-bold px-2 py-0.5 bg-[#695be6]/10 text-[#695be6] rounded-full">Current</span>
                          )}
                        </div>
                        <p className="text-gray-500 text-sm leading-relaxed">{step.description}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>

            {/* Top colleges */}
            <section>
              <h2 className="text-2xl font-bold mb-6 flex items-center gap-3">
                <span className="material-symbols-outlined text-[#695be6]">account_balance</span>
                Top Colleges
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {career.topColleges.map((col, i) => (
                  <div key={i} className="flex items-center gap-4 p-4 bg-white rounded-xl border border-[#695be6]/5 shadow-sm hover:border-[#695be6]/30 transition-colors">
                    <div className="size-10 rounded-full bg-[#695be6]/10 flex items-center justify-center text-[#695be6] font-black text-sm shrink-0">
                      {i + 1}
                    </div>
                    <div>
                      <p className="font-bold text-slate-800">{col.name}</p>
                      <p className="text-xs text-slate-400">{col.type} · {col.exam}</p>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          </div>

          {/* ── Right sidebar ── */}
          <div className="space-y-8">

            {/* Quick stats */}
            <div className="bg-white rounded-xl border border-[#695be6]/5 shadow-sm p-6 space-y-4">
              <h3 className="font-bold text-lg">Quick Stats</h3>
              {[
                { label: "Avg Salary",       value: career.avgSalary,       icon: "payments" },
                { label: "Growth Outlook",   value: career.growthOutlook,   icon: "trending_up" },
                { label: "Job Openings",     value: career.jobOpenings,     icon: "work" },
                { label: "Years to Qualify", value: career.yearsToQualify,  icon: "schedule" },
              ].map((s) => (
                <div key={s.label} className="flex items-center gap-3">
                  <div className="size-9 rounded-lg bg-[#695be6]/10 flex items-center justify-center text-[#695be6] shrink-0">
                    <span className="material-symbols-outlined text-lg">{s.icon}</span>
                  </div>
                  <div>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{s.label}</p>
                    <p className="font-bold text-slate-800 text-sm">{s.value}</p>
                  </div>
                </div>
              ))}
            </div>

            {/* Key skills */}
            <div className="bg-white rounded-xl border border-[#695be6]/5 shadow-sm p-6">
              <h3 className="font-bold text-lg mb-4 flex items-center gap-2">
                <span className="material-symbols-outlined text-[#695be6]">psychology</span>
                Key Skills
              </h3>
              <div className="space-y-3">
                {career.keySkills.map((s) => (
                  <div key={s.skill}>
                    <div className="flex justify-between items-center mb-1">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-slate-700">{s.skill}</span>
                        <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${SKILL_CATEGORY_COLOR[s.category]}`}>{s.category}</span>
                      </div>
                      <span className="text-xs font-bold text-[#695be6]">{s.level}%</span>
                    </div>
                    <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                      <div className="h-full bg-[#695be6] rounded-full" style={{ width: `${s.level}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Similar careers */}
            <div className="bg-white rounded-xl border border-[#695be6]/5 shadow-sm p-6">
              <h3 className="font-bold text-lg mb-4 flex items-center gap-2">
                <span className="material-symbols-outlined text-[#695be6]">compare_arrows</span>
                Similar Careers
              </h3>
              <div className="space-y-3">
                {career.similarCareers.map((sc) => (
                  <Link
                    key={sc.id}
                    to={`/student/career/${domainId}/${sc.id}`}
                    className="flex items-center justify-between p-3 rounded-xl hover:bg-[#695be6]/5 transition-colors group"
                  >
                    <span className="text-sm font-medium text-slate-700 group-hover:text-[#695be6]">{sc.title}</span>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-[#695be6]">{sc.matchPercent}% match</span>
                      <span className="material-symbols-outlined text-sm text-slate-300 group-hover:text-[#695be6]">arrow_forward</span>
                    </div>
                  </Link>
                ))}
              </div>
            </div>

            {/* Vin CTA */}
            <div className="bg-gradient-to-br from-[#695be6] to-[#8e82f3] rounded-xl p-6 text-white">
              <div className="size-10 bg-white/20 rounded-full flex items-center justify-center mb-3">
                <span className="material-symbols-outlined">smart_toy</span>
              </div>
              <h4 className="font-bold mb-1">Ask Vin about this career</h4>
              <p className="text-white/80 text-sm mb-4">Get personalised advice based on your academic profile.</p>
              <Link to="/student/vin-ai" className="block w-full py-2.5 bg-white text-[#695be6] font-bold rounded-full text-sm text-center hover:bg-white/90 transition-colors">
                Chat with Vin
              </Link>
            </div>
          </div>
        </div>
      </main>

      <footer className="bg-white border-t border-gray-100 mt-20">
        <div className="max-w-7xl mx-auto px-6 py-10 flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="flex items-center gap-3">
            <div className="size-8 bg-[#695be6] rounded-full flex items-center justify-center text-white">
              <span className="material-symbols-outlined text-sm">analytics</span>
            </div>
            <h2 className="text-lg font-bold">CareerPath AI</h2>
          </div>
          <p className="text-gray-400 text-sm">© 2026 CareerPath AI. All rights reserved.</p>
          <div className="flex gap-6">
            <a className="text-gray-400 hover:text-[#695be6] transition-colors text-sm" href="#">Privacy</a>
            <a className="text-gray-400 hover:text-[#695be6] transition-colors text-sm" href="#">Terms</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
