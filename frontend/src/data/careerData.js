// ============================================================
// CAREER EXPLORER DATA — backend-ready schema
// ============================================================

// ── Career domains (top-level grid) ─────────────────────────
export const CAREER_DOMAINS = [
  { id: "tech",       label: "Technology & Engineering", icon: "developer_board",   description: "Shaping the future through code, robotics, and complex systems.",    color: "from-[#695be6] to-[#8e82f3]" },
  { id: "medical",    label: "Medical & Health",         icon: "medical_services",  description: "Dedicated to healing, wellness, and medical breakthroughs.",          color: "from-emerald-400 to-teal-500" },
  { id: "government", label: "Government & Defence",     icon: "account_balance",   description: "Serving the nation and ensuring global security and stability.",       color: "from-blue-500 to-indigo-600" },
  { id: "business",   label: "Business & Finance",       icon: "payments",          description: "Driving the global economy and strategic corporate growth.",           color: "from-amber-400 to-orange-500" },
  { id: "law",        label: "Law & Policy",             icon: "gavel",             description: "Upholding justice and shaping the regulations of society.",            color: "from-slate-500 to-slate-700" },
  { id: "education",  label: "Education & Research",     icon: "school",            description: "Cultivating knowledge and leading scientific innovation.",             color: "from-pink-400 to-rose-500" },
  { id: "arts",       label: "Arts, Media & Design",     icon: "palette",           description: "Expressing creativity through visual and digital stories.",            color: "from-purple-400 to-fuchsia-500" },
  { id: "social",     label: "Social & Environment",     icon: "eco",               description: "Protecting the planet and empowering global communities.",             color: "from-green-400 to-emerald-600" },
  { id: "infra",      label: "Infrastructure & Travel",  icon: "flight",            description: "Connecting the world through logistics and movement.",                 color: "from-sky-400 to-blue-500" },
  { id: "sports",     label: "Sports & Events",          icon: "sports_soccer",     description: "Managing high-level competition and global entertainment.",            color: "from-red-400 to-rose-600" },
];

// ── Career rows per domain ───────────────────────────────────
// Each domain has rows; each row has cards
export const DOMAIN_ROWS = {
  tech: [
    {
      id: "row_tech_1",
      rowTitle: "Software & AI",
      careers: [
        { id: "c_swe",   title: "Software Engineer",    subtitle: "Build & maintain systems",    badge: "High Demand",    badgeColor: "bg-[#695be6] text-white" },
        { id: "c_ds",    title: "Data Scientist",       subtitle: "Insights from data",          badge: "Top Paying",     badgeColor: "bg-amber-500 text-white" },
        { id: "c_ml",    title: "ML Engineer",          subtitle: "AI model development",        badge: "Emerging",       badgeColor: "bg-emerald-500 text-white" },
        { id: "c_cyber", title: "Cybersecurity Analyst",subtitle: "Protect digital assets",      badge: "Critical",       badgeColor: "bg-red-500 text-white" },
      ],
    },
    {
      id: "row_tech_2",
      rowTitle: "Engineering",
      careers: [
        { id: "c_aero",  title: "Aerospace Engineer",   subtitle: "Aircraft & spacecraft",       badge: "Prestigious",    badgeColor: "bg-blue-500 text-white" },
        { id: "c_civil", title: "Civil Engineer",       subtitle: "Infrastructure design",       badge: "Stable",         badgeColor: "bg-slate-500 text-white" },
        { id: "c_mech",  title: "Mechanical Engineer",  subtitle: "Machines & systems",          badge: "Versatile",      badgeColor: "bg-orange-500 text-white" },
      ],
    },
  ],
  medical: [
    {
      id: "row_med_1",
      rowTitle: "Doctors & Surgeons",
      careers: [
        { id: "c_cardio",  title: "Cardiologist",         subtitle: "Heart specialist",            badge: "Premier Grade",  badgeColor: "bg-red-500 text-white" },
        { id: "c_neuro",   title: "Neurosurgeon",         subtitle: "Brain & nervous system",      badge: "Elite",          badgeColor: "bg-[#695be6] text-white" },
        { id: "c_gp",      title: "General Practitioner", subtitle: "Primary care physician",      badge: "Essential",      badgeColor: "bg-emerald-500 text-white" },
      ],
    },
    {
      id: "row_med_2",
      rowTitle: "Research & Biotech",
      careers: [
        { id: "c_gene",    title: "Geneticist",           subtitle: "DNA & heredity analysis",     badge: "Future Tech",    badgeColor: "bg-purple-500 text-white" },
        { id: "c_biomed",  title: "Biomedical Engineer",  subtitle: "Healthcare technology",       badge: "Innovative",     badgeColor: "bg-blue-500 text-white" },
        { id: "c_pharma",  title: "Pharmacist",           subtitle: "Medication management",       badge: "Stable",         badgeColor: "bg-slate-500 text-white" },
      ],
    },
  ],
  government: [
    {
      id: "row_gov_1",
      rowTitle: "Civil Services",
      careers: [
        { id: "c_ias",  title: "Administrative Service (IAS)", subtitle: "Public administration",  badge: "Premier Grade",  badgeColor: "bg-[#695be6] text-white" },
        { id: "c_ips",  title: "Police Service (IPS)",         subtitle: "Law & order",            badge: "Security Focus", badgeColor: "bg-blue-500 text-white" },
        { id: "c_ifs",  title: "Foreign Service (IFS)",        subtitle: "International relations", badge: "Global Reach",  badgeColor: "bg-emerald-500 text-white" },
      ],
    },
    {
      id: "row_gov_2",
      rowTitle: "Armed Forces",
      careers: [
        { id: "c_army", title: "Army Officer",    subtitle: "Ground combat & defense",  badge: "NDA/CDS",  badgeColor: "bg-slate-600 text-white" },
        { id: "c_navy", title: "Navy Officer",    subtitle: "Maritime security",         badge: "NDA/INET", badgeColor: "bg-blue-600 text-white" },
        { id: "c_af",   title: "Air Force Pilot", subtitle: "Aerial combat & transport", badge: "AFCAT/NDA",badgeColor: "bg-sky-500 text-white" },
      ],
    },
  ],
};

// ── Individual career detail pages ───────────────────────────
export const CAREER_DETAILS = {
  c_ds: {
    id: "c_ds",
    title: "Data Scientist",
    domain: "Technology & Data",
    domainId: "tech",
    matchPercent: 88,
    avgSalary: "₹10–35 LPA",
    growthOutlook: "Excellent",
    jobOpenings: "45,000+",
    yearsToQualify: "4–6 years",

    whatTheyDo: "Data scientists use technical skills and analytical thinking to extract meaningful insights from complex data sets. They build mathematical models and use machine learning algorithms to solve business problems and predict future trends. By interpreting large volumes of information, they help organizations make data-driven decisions that impact strategy and innovation.",

    educationPath: [
      { step: 1, title: "10th Standard",       description: "Choose PCM (Physics, Chemistry, Maths) stream to build a strong analytical foundation.", status: "done" },
      { step: 2, title: "12th & Graduation",   description: "Pursue B.Tech in CS/IT or B.Sc in Statistics/Mathematics/Economics.", status: "done" },
      { step: 3, title: "Optional Masters",    description: "M.Tech or MS in Data Science/AI for specialized roles. (Highly Recommended)", status: "current" },
      { step: 4, title: "Certifications",      description: "Google Data Analytics, AWS ML Specialty, or Coursera Deep Learning Specialization.", status: "upcoming" },
    ],

    keySkills: [
      { skill: "Python / R",          level: 90, category: "Technical" },
      { skill: "Machine Learning",    level: 85, category: "Technical" },
      { skill: "SQL & Databases",     level: 80, category: "Technical" },
      { skill: "Data Visualization",  level: 75, category: "Technical" },
      { skill: "Statistical Analysis",level: 88, category: "Analytical" },
      { skill: "Communication",       level: 70, category: "Soft Skill" },
    ],

    topColleges: [
      { name: "IIT Madras",       exam: "JEE Advanced", type: "B.Tech CS" },
      { name: "ISI Kolkata",      exam: "ISI Entrance", type: "B.Stat" },
      { name: "IIM Bangalore",    exam: "CAT",          type: "MBA Analytics" },
      { name: "BITS Pilani",      exam: "BITSAT",       type: "B.Tech CS" },
    ],

    similarCareers: [
      { id: "c_ml",   title: "ML Engineer",       matchPercent: 82 },
      { id: "c_swe",  title: "Software Engineer", matchPercent: 75 },
      { id: "c_cyber",title: "Cybersecurity",     matchPercent: 60 },
    ],

    dayInLife: [
      "Analyse datasets and identify patterns using Python",
      "Build and tune predictive models",
      "Present findings to business stakeholders",
      "Collaborate with engineers to deploy models",
    ],
  },

  c_swe: {
    id: "c_swe",
    title: "Software Engineer",
    domain: "Technology",
    domainId: "tech",
    matchPercent: 94,
    avgSalary: "₹12–40 LPA",
    growthOutlook: "Excellent",
    jobOpenings: "1,20,000+",
    yearsToQualify: "4 years",

    whatTheyDo: "Software engineers design, develop, test, and maintain software applications and systems. They work across web, mobile, cloud, and embedded systems. They collaborate with product teams to translate requirements into working code, and ensure software is reliable, scalable, and secure.",

    educationPath: [
      { step: 1, title: "10th Standard",     description: "Strong foundation in Mathematics and Science.", status: "done" },
      { step: 2, title: "12th with PCM",     description: "Physics, Chemistry, Mathematics stream.", status: "done" },
      { step: 3, title: "B.Tech / B.E. CS",  description: "4-year engineering degree in Computer Science or IT.", status: "current" },
      { step: 4, title: "Internships",       description: "Build real-world experience through internships at tech companies.", status: "upcoming" },
    ],

    keySkills: [
      { skill: "Data Structures",    level: 92, category: "Technical" },
      { skill: "System Design",      level: 85, category: "Technical" },
      { skill: "JavaScript / Python",level: 90, category: "Technical" },
      { skill: "Cloud (AWS/GCP)",    level: 75, category: "Technical" },
      { skill: "Problem Solving",    level: 95, category: "Analytical" },
      { skill: "Teamwork",           level: 80, category: "Soft Skill" },
    ],

    topColleges: [
      { name: "IIT Bombay",   exam: "JEE Advanced", type: "B.Tech CS" },
      { name: "IIT Delhi",    exam: "JEE Advanced", type: "B.Tech CS" },
      { name: "BITS Pilani",  exam: "BITSAT",       type: "B.E. CS" },
      { name: "NIT Trichy",   exam: "JEE Mains",    type: "B.Tech CS" },
    ],

    similarCareers: [
      { id: "c_ds",   title: "Data Scientist",  matchPercent: 80 },
      { id: "c_ml",   title: "ML Engineer",     matchPercent: 85 },
      { id: "c_cyber",title: "Cybersecurity",   matchPercent: 65 },
    ],

    dayInLife: [
      "Write and review code in daily standups",
      "Debug and fix production issues",
      "Design APIs and system architecture",
      "Deploy features to production",
    ],
  },
};

export const getDomainById   = (id) => CAREER_DOMAINS.find((d) => d.id === id);
export const getDomainRows   = (id) => DOMAIN_ROWS[id] || [];
export const getCareerDetail = (id) => CAREER_DETAILS[id] || null;
