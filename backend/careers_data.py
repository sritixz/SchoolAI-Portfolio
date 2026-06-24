# -*- coding: utf-8 -*-

CAREERS_DATA = [
    # Tech domain
    {
        "domain_id": "tech",
        "id": "c_swe",
        "title": "Software Engineer",
        "subtitle": "Build & maintain systems",
        "badge": "High Demand",
        "badgeColor": "bg-[#695be6] text-white",
        "matchPercent": 85,
        "avgSalary": "₹12–40 LPA",
        "jobOpenings": "2.5L+",
        "growthOutlook": "Excellent",
        "yearsToQualify": "4 years",
        "whatTheyDo": "Software engineers design, develop, and maintain software systems. They write code, debug programs, and collaborate with teams to build applications used by millions.",
        "dayInLife": [
            "Review code pull requests and provide feedback",
            "Attend daily standup meeting with the team",
            "Work on new feature development",
            "Debug and fix reported issues",
            "Write unit tests for new code"
        ],
        "educationPath": [
            {"step": 1, "title": "Class 11-12 (PCM)", "description": "Focus on Physics, Chemistry, Mathematics. Score 75%+ for top colleges.", "status": "current"},
            {"step": 2, "title": "B.Tech / B.E. in CS or IT", "description": "4-year engineering degree from IIT, NIT, or reputed private college.", "status": "upcoming"},
            {"step": 3, "title": "Internships & Projects", "description": "Build portfolio with real projects. Intern at startups or tech companies.", "status": "upcoming"},
            {"step": 4, "title": "Campus Placement / Job", "description": "Get placed through campus or apply directly. Starting salary ₹6–15 LPA.", "status": "upcoming"}
        ],
        "topColleges": [
            {"name": "IIT Bombay", "type": "Government", "exam": "JEE Advanced"},
            {"name": "IIT Delhi", "type": "Government", "exam": "JEE Advanced"},
            {"name": "BITS Pilani", "type": "Private", "exam": "BITSAT"},
            {"name": "NIT Trichy", "type": "Government", "exam": "JEE Main"}
        ],
        "keySkills": [
            {"skill": "Programming (Python/Java)", "level": 90, "category": "Technical"},
            {"skill": "Data Structures & Algorithms", "level": 85, "category": "Technical"},
            {"skill": "Problem Solving", "level": 88, "category": "Analytical"},
            {"skill": "Team Collaboration", "level": 75, "category": "Soft Skill"}
        ],
        "similarCareers": [
            {"id": "c_ds", "title": "Data Scientist", "matchPercent": 78},
            {"id": "c_ml", "title": "ML Engineer", "matchPercent": 72}
        ],
        "domain": "Technology & Engineering",
        "subcategory": "Software & AI"
    },
    {
        "domain_id": "tech",
        "id": "c_ds",
        "title": "Data Scientist",
        "subtitle": "Insights from data",
        "badge": "Top Paying",
        "badgeColor": "bg-amber-500 text-white",
        "matchPercent": 78,
        "avgSalary": "₹15–50 LPA",
        "jobOpenings": "80K+",
        "growthOutlook": "Excellent",
        "yearsToQualify": "4-5 years",
        "whatTheyDo": "Data scientists analyze large datasets to extract insights, build predictive models, and help organizations make data-driven decisions.",
        "dayInLife": [
            "Explore and clean datasets",
            "Build machine learning models",
            "Create data visualizations",
            "Present findings to stakeholders",
            "Collaborate with engineering teams"
        ],
        "educationPath": [
            {"step": 1, "title": "Class 11-12 (PCM)", "description": "Strong foundation in Mathematics and Statistics.", "status": "current"},
            {"step": 2, "title": "B.Tech CS / B.Sc Statistics / B.Sc Mathematics", "description": "4-year degree with focus on statistics and programming.", "status": "upcoming"},
            {"step": 3, "title": "M.Tech / M.Sc Data Science (Optional)", "description": "Specialization adds significant career advantage.", "status": "upcoming"},
            {"step": 4, "title": "Industry Experience", "description": "Work on real datasets. Kaggle competitions help build portfolio.", "status": "upcoming"}
        ],
        "topColleges": [
            {"name": "IIT Madras", "type": "Government", "exam": "JEE Advanced"},
            {"name": "IISc Bangalore", "type": "Government", "exam": "GATE / KVPY"},
            {"name": "ISI Kolkata", "type": "Government", "exam": "ISI Entrance"},
            {"name": "BITS Pilani", "type": "Private", "exam": "BITSAT"}
        ],
        "keySkills": [
            {"skill": "Python / R Programming", "level": 88, "category": "Technical"},
            {"skill": "Statistics & Probability", "level": 92, "category": "Analytical"},
            {"skill": "Machine Learning", "level": 85, "category": "Technical"},
            {"skill": "Data Visualization", "level": 80, "category": "Technical"}
        ],
        "similarCareers": [
            {"id": "c_swe", "title": "Software Engineer", "matchPercent": 70},
            {"id": "c_ml", "title": "ML Engineer", "matchPercent": 88}
        ],
        "domain": "Technology & Engineering",
        "subcategory": "Software & AI"
    },
    {
        "domain_id": "tech",
        "id": "c_ml",
        "title": "ML Engineer",
        "subtitle": "AI model development",
        "badge": "Emerging",
        "badgeColor": "bg-emerald-500 text-white",
        "matchPercent": 82,
        "avgSalary": "₹18–60 LPA",
        "jobOpenings": "45K+",
        "growthOutlook": "Excellent",
        "yearsToQualify": "4 years",
        "whatTheyDo": "Machine learning engineers design, build, and deploy machine learning models and AI systems to solve complex problems and automate decision-making.",
        "dayInLife": [
            "Train deep learning models on GPU clusters",
            "Optimize model inference latency",
            "Design dataset preprocessing pipelines",
            "Research state-of-the-art AI architectures",
            "Deploy models via API endpoints"
        ],
        "educationPath": [
            {"step": 1, "title": "Class 11-12 (PCM)", "description": "Strong foundation in calculus, linear algebra, and mechanics.", "status": "current"},
            {"step": 2, "title": "B.Tech Computer Science / AI", "description": "Focus on programming, data structures, and statistics.", "status": "upcoming"},
            {"step": 3, "title": "Specialized Certifications / Internships", "description": "Hands-on experience in Deep Learning and PyTorch/TensorFlow.", "status": "upcoming"},
            {"step": 4, "title": "ML System Deployment Job", "description": "Work as junior ML engineer, build MLOps pipelines.", "status": "upcoming"}
        ],
        "topColleges": [
            {"name": "IIT Bombay", "type": "Government", "exam": "JEE Advanced"},
            {"name": "BITS Pilani", "type": "Private", "exam": "BITSAT"},
            {"name": "IIIT Hyderabad", "type": "Government", "exam": "JEE Main / UGEE"}
        ],
        "keySkills": [
            {"skill": "Deep Learning (PyTorch)", "level": 90, "category": "Technical"},
            {"skill": "Mathematical Modeling", "level": 88, "category": "Analytical"},
            {"skill": "Software Engineering", "level": 80, "category": "Technical"},
            {"skill": "MLOps & Cloud", "level": 75, "category": "Technical"}
        ],
        "similarCareers": [
            {"id": "c_ds", "title": "Data Scientist", "matchPercent": 90},
            {"id": "c_swe", "title": "Software Engineer", "matchPercent": 85}
        ],
        "domain": "Technology & Engineering",
        "subcategory": "Software & AI"
    },
    {
        "domain_id": "tech",
        "id": "c_aero",
        "title": "Aerospace Engineer",
        "subtitle": "Aircraft & spacecraft design",
        "badge": "Prestigious",
        "badgeColor": "bg-blue-500 text-white",
        "matchPercent": 75,
        "avgSalary": "₹10–35 LPA",
        "jobOpenings": "12K+",
        "growthOutlook": "Good",
        "yearsToQualify": "4 years",
        "whatTheyDo": "Aerospace engineers design, develop, and test aircraft, spacecraft, satellites, and missiles. They work on structural integrity, propulsion systems, and flight dynamics.",
        "dayInLife": [
            "Run structural simulations using ANSYS",
            "Design wing profiles in CAD software",
            "Analyze wind tunnel testing reports",
            "Collaborate with avionics teams on safety systems",
            "Present design proposals to senior leadership"
        ],
        "educationPath": [
            {"step": 1, "title": "Class 11-12 (PCM)", "description": "Excel in Physics and Mathematics.", "status": "current"},
            {"step": 2, "title": "B.Tech Aerospace / Mechanical", "description": "4-year degree focusing on thermodynamics, fluid dynamics, and aerodynamics.", "status": "upcoming"},
            {"step": 3, "title": "Design Projects & Software Skills", "description": "Master MATLAB, SolidWorks, and CFD analysis tools.", "status": "upcoming"},
            {"step": 4, "title": "Research / Industry Placement", "description": "Secure job with space research centers (ISRO) or defense industries.", "status": "upcoming"}
        ],
        "topColleges": [
            {"name": "IIT Madras", "type": "Government", "exam": "JEE Advanced"},
            {"name": "IIST Thiruvananthapuram", "type": "Government", "exam": "JEE Advanced"},
            {"name": "IIT Kanpur", "type": "Government", "exam": "JEE Advanced"}
        ],
        "keySkills": [
            {"skill": "Aerodynamics & CFD", "level": 85, "category": "Technical"},
            {"skill": "Structural Mechanics", "level": 82, "category": "Analytical"},
            {"skill": "CAD Modeling", "level": 80, "category": "Technical"},
            {"skill": "Critical Thinking", "level": 90, "category": "Analytical"}
        ],
        "similarCareers": [
            {"id": "c_mech", "title": "Mechanical Engineer", "matchPercent": 80},
            {"id": "c_swe", "title": "Software Engineer", "matchPercent": 60}
        ],
        "domain": "Technology & Engineering",
        "subcategory": "Engineering"
    },
    {
        "domain_id": "tech",
        "id": "c_mech",
        "title": "Mechanical Engineer",
        "subtitle": "Machines & systems",
        "badge": "Versatile",
        "badgeColor": "bg-orange-500 text-white",
        "matchPercent": 70,
        "avgSalary": "₹6–20 LPA",
        "jobOpenings": "60K+",
        "growthOutlook": "Moderate",
        "yearsToQualify": "4 years",
        "whatTheyDo": "Mechanical engineers design, construct, and test mechanical devices, engines, tools, and thermal sensors. They work in automotive, energy, and manufacturing sectors.",
        "dayInLife": [
            "Review machine blueprints and CAD drawings",
            "Oversee production lines and assembly testing",
            "Analyze mechanical failure reports",
            "Design updates to mechanical prototypes",
            "Coordinate with materials supply vendors"
        ],
        "educationPath": [
            {"step": 1, "title": "Class 11-12 (PCM)", "description": "Excel in Physics, mechanics, and geometry.", "status": "current"},
            {"step": 2, "title": "B.Tech Mechanical Engineering", "description": "Core engineering degree focusing on dynamics, thermodynamics, and manufacturing.", "status": "upcoming"},
            {"step": 3, "title": "Workshops & CAD Projects", "description": "Gain hands-on training with lathes, CNC machines, and Autodesk Inventor.", "status": "upcoming"},
            {"step": 4, "title": "Core Placement", "description": "Join automotive, automation, or plant operations companies.", "status": "upcoming"}
        ],
        "topColleges": [
            {"name": "IIT Bombay", "type": "Government", "exam": "JEE Advanced"},
            {"name": "IIT Delhi", "type": "Government", "exam": "JEE Advanced"},
            {"name": "BITS Pilani", "type": "Private", "exam": "BITSAT"}
        ],
        "keySkills": [
            {"skill": "Thermodynamics", "level": 80, "category": "Technical"},
            {"skill": "Materials Engineering", "level": 78, "category": "Technical"},
            {"skill": "Analytical Problem Solving", "level": 85, "category": "Analytical"},
            {"skill": "CAD & Drafting", "level": 82, "category": "Technical"}
        ],
        "similarCareers": [
            {"id": "c_aero", "title": "Aerospace Engineer", "matchPercent": 85},
            {"id": "c_civil", "title": "Civil Engineer", "matchPercent": 70}
        ],
        "domain": "Technology & Engineering",
        "subcategory": "Engineering"
    },

    # Medical domain
    {
        "domain_id": "medical",
        "id": "c_doctor",
        "title": "Medical Doctor (MBBS)",
        "subtitle": "Heal and save lives",
        "badge": "Prestigious",
        "badgeColor": "bg-emerald-500 text-white",
        "matchPercent": 72,
        "avgSalary": "₹8–60 LPA",
        "jobOpenings": "1L+",
        "growthOutlook": "Excellent",
        "yearsToQualify": "5.5 years",
        "whatTheyDo": "Doctors diagnose and treat illnesses, perform medical procedures, and provide healthcare to patients across all age groups.",
        "dayInLife": [
            "Morning ward rounds with patients",
            "Outpatient consultations",
            "Review test reports and diagnose",
            "Perform minor procedures",
            "Update patient records"
        ],
        "educationPath": [
            {"step": 1, "title": "Class 11-12 (PCB)", "description": "Physics, Chemistry, Biology. Score 85%+ for NEET preparation.", "status": "current"},
            {"step": 2, "title": "MBBS (5.5 years)", "description": "Medical degree from government or private medical college.", "status": "upcoming"},
            {"step": 3, "title": "Internship (1 year)", "description": "Mandatory rotating internship across departments.", "status": "upcoming"},
            {"step": 4, "title": "MD/MS Specialization (Optional)", "description": "3-year postgraduate specialization for higher expertise.", "status": "upcoming"}
        ],
        "topColleges": [
            {"name": "AIIMS Delhi", "type": "Government", "exam": "NEET"},
            {"name": "JIPMER Puducherry", "type": "Government", "exam": "NEET"},
            {"name": "CMC Vellore", "type": "Private", "exam": "NEET"},
            {"name": "Maulana Azad Medical College", "type": "Government", "exam": "NEET"}
        ],
        "keySkills": [
            {"skill": "Biology & Anatomy", "level": 95, "category": "Technical"},
            {"skill": "Clinical Diagnosis", "level": 88, "category": "Analytical"},
            {"skill": "Patient Communication", "level": 85, "category": "Soft Skill"},
            {"skill": "Medical Ethics", "level": 90, "category": "Soft Skill"}
        ],
        "similarCareers": [
            {"id": "c_cardio", "title": "Cardiologist", "matchPercent": 80},
            {"id": "c_biomed", "title": "Biomedical Engineer", "matchPercent": 65}
        ],
        "domain": "Medical & Health",
        "subcategory": "Doctors & Surgeons"
    },
    {
        "domain_id": "medical",
        "id": "c_cardio",
        "title": "Cardiologist",
        "subtitle": "Heart specialist",
        "badge": "Premier Grade",
        "badgeColor": "bg-red-500 text-white",
        "matchPercent": 68,
        "avgSalary": "₹25–80 LPA",
        "jobOpenings": "15K+",
        "growthOutlook": "Excellent",
        "yearsToQualify": "10-12 years",
        "whatTheyDo": "Cardiologists are medical doctors specializing in the diagnosis, treatment, and prevention of diseases of the cardiovascular system, including the heart and blood vessels.",
        "dayInLife": [
            "Perform electrocardiograms (ECGs) and echograms",
            "Consult patients experiencing chest pain or heart murmurs",
            "Manage cardiovascular disease treatment plans",
            "Collaborate on surgical bypass or stent operations",
            "Review patient cardiac health charts"
        ],
        "educationPath": [
            {"step": 1, "title": "Class 11-12 (PCB)", "description": "Excel in Biology and organic chemistry.", "status": "current"},
            {"step": 2, "title": "MBBS Degree", "description": "5.5-year core medical education and residency.", "status": "upcoming"},
            {"step": 3, "title": "MD in General Medicine", "description": "3-year postgraduate specialization.", "status": "upcoming"},
            {"step": 4, "title": "DM in Cardiology", "description": "3-year super-specialty cardiovascular training.", "status": "upcoming"}
        ],
        "topColleges": [
            {"name": "AIIMS Delhi", "type": "Government", "exam": "NEET PG"},
            {"name": "PGIMER Chandigarh", "type": "Government", "exam": "INI CET"},
            {"name": "KMC Manipal", "type": "Private", "exam": "NEET PG"}
        ],
        "keySkills": [
            {"skill": "Cardiovascular Pathology", "level": 98, "category": "Technical"},
            {"skill": "ECG Interpretation", "level": 95, "category": "Technical"},
            {"skill": "Analytical Diagnosis", "level": 92, "category": "Analytical"},
            {"skill": "Empathy & Care", "level": 88, "category": "Soft Skill"}
        ],
        "similarCareers": [
            {"id": "c_doctor", "title": "Medical Doctor (MBBS)", "matchPercent": 90},
            {"id": "c_biomed", "title": "Biomedical Engineer", "matchPercent": 70}
        ],
        "domain": "Medical & Health",
        "subcategory": "Doctors & Surgeons"
    },
    {
        "domain_id": "medical",
        "id": "c_gene",
        "title": "Geneticist",
        "subtitle": "DNA & heredity analysis",
        "badge": "Future Tech",
        "badgeColor": "bg-purple-500 text-white",
        "matchPercent": 74,
        "avgSalary": "₹8–25 LPA",
        "jobOpenings": "20K+",
        "growthOutlook": "Good",
        "yearsToQualify": "5-8 years",
        "whatTheyDo": "Geneticists study how traits are inherited and how genetic code dictates health, disease, and development. They analyze patient genomes and design genetic therapies.",
        "dayInLife": [
            "Analyze DNA sequence maps in the laboratory",
            "Conduct genome editing (CRISPR) experiments",
            "Prepare patient genetic counseling reports",
            "Publish research discoveries in biotech journals",
            "Consult clinical doctors on rare genetic diseases"
        ],
        "educationPath": [
            {"step": 1, "title": "Class 11-12 (PCB)", "description": "Strong focus on genetics and bio-molecular concepts.", "status": "current"},
            {"step": 2, "title": "B.Sc / B.Tech in Biotechnology / Genetics", "description": "Undergraduate degree focusing on cell biology and genetics.", "status": "upcoming"},
            {"step": 3, "title": "M.Sc / M.Tech in Genetics / Genomics", "description": "Specialized master's in genetic engineering, bioinformatics, or genomics.", "status": "upcoming"},
            {"step": 4, "title": "Ph.D. / Clinical Training", "description": "Doctoral research for academic or clinical research roles.", "status": "upcoming"}
        ],
        "topColleges": [
            {"name": "IISc Bangalore", "type": "Government", "exam": "GATE"},
            {"name": "JNU New Delhi", "type": "Government", "exam": "GAT-B"},
            {"name": "University of Delhi", "type": "Government", "exam": "CUET PG"}
        ],
        "keySkills": [
            {"skill": "Genome Sequencing", "level": 94, "category": "Technical"},
            {"skill": "Molecular Biology Techniques", "level": 90, "category": "Technical"},
            {"skill": "Bioinformatics & R", "level": 82, "category": "Technical"},
            {"skill": "Data Science", "level": 80, "category": "Analytical"}
        ],
        "similarCareers": [
            {"id": "c_biomed", "title": "Biomedical Engineer", "matchPercent": 80},
            {"id": "c_doctor", "title": "Medical Doctor (MBBS)", "matchPercent": 75}
        ],
        "domain": "Medical & Health",
        "subcategory": "Research & Biotech"
    },
    {
        "domain_id": "medical",
        "id": "c_biomed",
        "title": "Biomedical Engineer",
        "subtitle": "Healthcare technology",
        "badge": "Innovative",
        "badgeColor": "bg-blue-500 text-white",
        "matchPercent": 70,
        "avgSalary": "₹7–22 LPA",
        "jobOpenings": "25K+",
        "growthOutlook": "Good",
        "yearsToQualify": "4 years",
        "whatTheyDo": "Biomedical engineers design and create equipment, devices, computer systems, and software used in healthcare. They combine biology and engineering to build pacemakers, prosthetics, and imaging machines.",
        "dayInLife": [
            "Design robotic prosthetic models using software",
            "Test electrical safety of hospital MRI machines",
            "Collaborate with doctors on surgical tool designs",
            "Analyze clinical trial performance data of medical chips",
            "Write firmware for blood monitoring sensors"
        ],
        "educationPath": [
            {"step": 1, "title": "Class 11-12 (PCMB)", "description": "Study Physics, Chemistry, Mathematics, and Biology.", "status": "current"},
            {"step": 2, "title": "B.Tech in Biomedical Engineering", "description": "4-year engineering program specializing in instrumentation, biomechanics, and tissue engineering.", "status": "upcoming"},
            {"step": 3, "title": "Internship with Medical Devices Firm", "description": "Hands-on experience in hospital setups or manufacturing units.", "status": "upcoming"},
            {"step": 4, "title": "System Quality Assurance Job", "description": "Begin working as clinical engineer or product designer.", "status": "upcoming"}
        ],
        "topColleges": [
            {"name": "IIT Bombay", "type": "Government", "exam": "JEE Advanced"},
            {"name": "IIT Hyderabad", "type": "Government", "exam": "JEE Advanced"},
            {"name": "MIT Manipal", "type": "Private", "exam": "MET"}
        ],
        "keySkills": [
            {"skill": "Medical Instrumentation", "level": 88, "category": "Technical"},
            {"skill": "Signal Processing", "level": 85, "category": "Technical"},
            {"skill": "Biomechanics", "level": 80, "category": "Analytical"},
            {"skill": "Robotic Design", "level": 78, "category": "Technical"}
        ],
        "similarCareers": [
            {"id": "c_gene", "title": "Geneticist", "matchPercent": 80},
            {"id": "c_mech", "title": "Mechanical Engineer", "matchPercent": 72}
        ],
        "domain": "Medical & Health",
        "subcategory": "Research & Biotech"
    },

    # Government & Defence domain
    {
        "domain_id": "government",
        "id": "c_ias",
        "title": "IAS Officer",
        "subtitle": "Public administration",
        "badge": "Premier Grade",
        "badgeColor": "bg-[#695be6] text-white",
        "matchPercent": 80,
        "avgSalary": "₹7–15 LPA (with perks)",
        "jobOpenings": "180 per year",
        "growthOutlook": "Stable",
        "yearsToQualify": "3-5 years (after graduation)",
        "whatTheyDo": "IAS (Indian Administrative Service) officers manage government policies, implement development schemes, maintain law and order, and supervise administration at district, state, and national levels.",
        "dayInLife": [
            "Review development program reports in district office",
            "Chair public dispute grievance meetings",
            "Coordinate disaster relief preparation steps",
            "Discuss budgetary needs with state secretaries",
            "Inspect village infrastructure projects"
        ],
        "educationPath": [
            {"step": 1, "title": "Class 11-12 (Any stream)", "description": "Develop strong interest in history, civics, and general affairs.", "status": "current"},
            {"step": 2, "title": "Graduation (Any discipline)", "description": "Obtain Bachelor's degree while reading newspapers daily.", "status": "upcoming"},
            {"step": 3, "title": "UPSC CSE Preparation", "description": "Intense preparation for Preliminary, Mains, and Interview stages.", "status": "upcoming"},
            {"step": 4, "title": "LBSNAA Training", "description": "Complete foundation and professional administration training at Mussoorie.", "status": "upcoming"}
        ],
        "topColleges": [
            {"name": "Delhi University (for BA/BSc)", "type": "Government", "exam": "CUET"},
            {"name": "JNU New Delhi (for PG)", "type": "Government", "exam": "CUET PG"},
            {"name": "IITs (Engineering background)", "type": "Government", "exam": "JEE Advanced"}
        ],
        "keySkills": [
            {"skill": "Public Administration", "level": 95, "category": "Analytical"},
            {"skill": "Policy Implementation", "level": 92, "category": "Analytical"},
            {"skill": "Leadership & Decisions", "level": 96, "category": "Soft Skill"},
            {"skill": "Crisis Management", "level": 90, "category": "Soft Skill"}
        ],
        "similarCareers": [
            {"id": "c_ips", "title": "IPS Officer", "matchPercent": 88},
            {"id": "c_policy", "title": "Policy Analyst", "matchPercent": 75}
        ],
        "domain": "Government & Defence",
        "subcategory": "Civil Services"
    },
    {
        "domain_id": "government",
        "id": "c_ips",
        "title": "Police Service (IPS)",
        "subtitle": "Law & order leadership",
        "badge": "Security Focus",
        "badgeColor": "bg-blue-500 text-white",
        "matchPercent": 75,
        "avgSalary": "₹7–14 LPA (with perks)",
        "jobOpenings": "150 per year",
        "growthOutlook": "Stable",
        "yearsToQualify": "3-5 years (after graduation)",
        "whatTheyDo": "IPS (Indian Police Service) officers safeguard internal security, combat criminal activity, supervise local policing systems, and head federal intelligence and defense organizations.",
        "dayInLife": [
            "Review daily city crime logs and intelligence reports",
            "Brief command inspectors on crowd management for upcoming events",
            "Coordinate active forensic investigations",
            "Conduct inspections of district police stations",
            "Present police reform drafts to state departments"
        ],
        "educationPath": [
            {"step": 1, "title": "Class 11-12 (Any stream)", "description": "Maintain physical fitness and study humanities/social studies.", "status": "current"},
            {"step": 2, "title": "Graduation", "description": "Complete Bachelor's degree and maintain active sports involvement.", "status": "upcoming"},
            {"step": 3, "title": "UPSC CSE Examination", "description": "Clear all three phases (Prelims, Mains, Interview) with police preferences.", "status": "upcoming"},
            {"step": 4, "title": "Sardar Patel NPA Training", "description": "Complete intensive physical and tactical law enforcement training in Hyderabad.", "status": "upcoming"}
        ],
        "topColleges": [
            {"name": "St. Stephen's College", "type": "Government", "exam": "CUET"},
            {"name": "Presidency University", "type": "Government", "exam": "CUET"},
            {"name": "IIT Madras", "type": "Government", "exam": "JEE Advanced"}
        ],
        "keySkills": [
            {"skill": "Law Enforcement Command", "level": 92, "category": "Technical"},
            {"skill": "Tactical Operations", "level": 88, "category": "Technical"},
            {"skill": "Public Safety Policy", "level": 85, "category": "Analytical"},
            {"skill": "Strategic Courage", "level": 95, "category": "Soft Skill"}
        ],
        "similarCareers": [
            {"id": "c_ias", "title": "IAS Officer", "matchPercent": 88},
            {"id": "c_af", "title": "Air Force Pilot", "matchPercent": 78}
        ],
        "domain": "Government & Defence",
        "subcategory": "Civil Services"
    },
    {
        "domain_id": "government",
        "id": "c_af",
        "title": "Air Force Pilot",
        "subtitle": "Aerial combat & defense",
        "badge": "Prestigious",
        "badgeColor": "bg-sky-500 text-white",
        "matchPercent": 82,
        "avgSalary": "₹12–25 LPA",
        "jobOpenings": "Limited",
        "growthOutlook": "Stable",
        "yearsToQualify": "4 years (via NDA/CDSE)",
        "whatTheyDo": "Air Force pilots fly combat fighter jets, transport carriers, or helicopters to protect national skies, support military actions, and assist in rescue operations.",
        "dayInLife": [
            "Conduct pre-flight check on engine and avionics systems",
            "Perform strategic flight maneuvers during exercises",
            "Analyze meteorological reports for flight planning",
            "Maintain intense physical conditioning regime",
            "Update flight records and operation debrief logs"
        ],
        "educationPath": [
            {"step": 1, "title": "Class 11-12 (PCM)", "description": "Mandatory to study Physics and Mathematics at the 10+2 level.", "status": "current"},
            {"step": 2, "title": "NDA Exam / CDSE entry", "description": "Clear UPSC written exam followed by SSB Interview and medical tests.", "status": "upcoming"},
            {"step": 3, "title": "Air Force Academy Training", "description": "Complete rigorous aviation and cadet training at Dundigal.", "status": "upcoming"},
            {"step": 4, "title": "Commissioning & Flying", "description": "Join active squadron, fly operational missions.", "status": "upcoming"}
        ],
        "topColleges": [
            {"name": "National Defence Academy", "type": "Government", "exam": "NDA Entrance"},
            {"name": "Air Force Academy (Dundigal)", "type": "Government", "exam": "AFCAT / CDSE"}
        ],
        "keySkills": [
            {"skill": "Aviation Instrumentation", "level": 96, "category": "Technical"},
            {"skill": "Spatial Awareness", "level": 95, "category": "Analytical"},
            {"skill": "Quick Decision Making", "level": 98, "category": "Analytical"},
            {"skill": "Stress Resilience", "level": 97, "category": "Soft Skill"}
        ],
        "similarCareers": [
            {"id": "c_ips", "title": "IPS Officer", "matchPercent": 78},
            {"id": "c_civil", "title": "Civil Engineer", "matchPercent": 50}
        ],
        "domain": "Government & Defence",
        "subcategory": "Armed Forces"
    },

    # Business & Finance domain
    {
        "domain_id": "business",
        "id": "c_ib",
        "title": "Investment Banker",
        "subtitle": "Corporate finance advisor",
        "badge": "High Paying",
        "badgeColor": "bg-amber-500 text-white",
        "matchPercent": 83,
        "avgSalary": "₹15–60 LPA",
        "jobOpenings": "30K+",
        "growthOutlook": "Good",
        "yearsToQualify": "5-7 years",
        "whatTheyDo": "Investment bankers help corporations, startups, and government entities raise capital, facilitate mergers and acquisitions, and structures financial deals.",
        "dayInLife": [
            "Build complex Excel valuation models",
            "Create investment pitchbooks for corporate clients",
            "Perform market research and valuation comparisons",
            "Discuss M&A contracts with legal counsel",
            "Deliver fundraising updates to clients"
        ],
        "educationPath": [
            {"step": 1, "title": "Class 11-12 (Commerce/PCM)", "description": "Build high proficiency in accounting, mathematics, and business.", "status": "current"},
            {"step": 2, "title": "Graduation in Commerce/Economics", "description": "B.Com / BA Economics from premier university.", "status": "upcoming"},
            {"step": 3, "title": "MBA / CFA Certification", "description": "Pursue MBA in Finance (IIMs) or clear CFA levels.", "status": "upcoming"},
            {"step": 4, "title": "Analyst role at Investment Bank", "description": "Start as finance analyst, working on real transaction desks.", "status": "upcoming"}
        ],
        "topColleges": [
            {"name": "IIM Ahmedabad", "type": "Government", "exam": "CAT"},
            {"name": "IIM Calcutta", "type": "Government", "exam": "CAT"},
            {"name": "SRCC Delhi", "type": "Government", "exam": "CUET"}
        ],
        "keySkills": [
            {"skill": "Financial Modeling", "level": 92, "category": "Technical"},
            {"skill": "Corporate Valuation", "level": 90, "category": "Analytical"},
            {"skill": "M&A Strategy", "level": 85, "category": "Analytical"},
            {"skill": "Deal Pitching", "level": 88, "category": "Soft Skill"}
        ],
        "similarCareers": [
            {"id": "c_ca", "title": "Chartered Accountant", "matchPercent": 80},
            {"id": "c_consultant", "title": "Management Consultant", "matchPercent": 85}
        ],
        "domain": "Business & Finance",
        "subcategory": "Finance & Accounting"
    },
    {
        "domain_id": "business",
        "id": "c_ca",
        "title": "Chartered Accountant",
        "subtitle": "Audit & tax expert",
        "badge": "Stable",
        "badgeColor": "bg-slate-500 text-white",
        "matchPercent": 79,
        "avgSalary": "₹8–30 LPA",
        "jobOpenings": "75K+",
        "growthOutlook": "Stable",
        "yearsToQualify": "5 years",
        "whatTheyDo": "Chartered Accountants audit financial statements, advise on taxation schemes, execute forensic reviews, and manage corporate accounts and compliance processes.",
        "dayInLife": [
            "Review client ledger accounts and bank details",
            "Draft quarterly corporate audit reports",
            "Discuss tax saving strategy options with client team",
            "Inspect internal control loops to stop fraud",
            "Calculate income tax liabilities"
        ],
        "educationPath": [
            {"step": 1, "title": "Class 11-12 Commerce", "description": "Maintain absolute mastery of bookkeeping and math.", "status": "current"},
            {"step": 2, "title": "CA Foundation Course", "description": "Register with ICAI, clear the entry level test.", "status": "upcoming"},
            {"step": 3, "title": "CA Intermediate & Articleship", "description": "Complete 2 years of practical training under a CA firm while studying.", "status": "upcoming"},
            {"step": 4, "title": "CA Final Exam", "description": "Clear Final exam papers to obtain license and membership.", "status": "upcoming"}
        ],
        "topColleges": [
            {"name": "ICAI Institute", "type": "Government Board", "exam": "CA Entrance Exams"}
        ],
        "keySkills": [
            {"skill": "Financial Auditing", "level": 95, "category": "Technical"},
            {"skill": "Tax Laws & GST", "level": 92, "category": "Technical"},
            {"skill": "Accountancy Standards", "level": 94, "category": "Technical"},
            {"skill": "Attention to Detail", "level": 90, "category": "Analytical"}
        ],
        "similarCareers": [
            {"id": "c_ib", "title": "Investment Banker", "matchPercent": 80},
            {"id": "c_consultant", "title": "Management Consultant", "matchPercent": 70}
        ],
        "domain": "Business & Finance",
        "subcategory": "Finance & Accounting"
    },
    {
        "domain_id": "business",
        "id": "c_consultant",
        "title": "Management Consultant",
        "subtitle": "Corporate strategy advisor",
        "badge": "Excellent Growth",
        "badgeColor": "bg-[#695be6] text-white",
        "matchPercent": 81,
        "avgSalary": "₹12–45 LPA",
        "jobOpenings": "40K+",
        "growthOutlook": "Excellent",
        "yearsToQualify": "4-6 years",
        "whatTheyDo": "Management consultants help companies improve performance, solve operational blockages, and draft structural strategy plans to grow business revenue.",
        "dayInLife": [
            "Interview division heads on current processes",
            "Perform cost-benefit analysis of supply channels",
            "Develop transformation slides on laptop",
            "Present strategy proposals to client board",
            "Travel to onsite company offices"
        ],
        "educationPath": [
            {"step": 1, "title": "Class 11-12 (Any stream)", "description": "Develop excellent reading and logical reasoning skills.", "status": "current"},
            {"step": 2, "title": "Graduation", "description": "Complete bachelor's degree in engineering, commerce, or liberal arts.", "status": "upcoming"},
            {"step": 3, "title": "MBA from Premier School", "description": "MBA from top schools (IIM, ISB) is highly preferred for Tier-1 firms.", "status": "upcoming"},
            {"step": 4, "title": "Associate role at Consultant Firm", "description": "Solve client cases, compile analytical insights.", "status": "upcoming"}
        ],
        "topColleges": [
            {"name": "IIM Ahmedabad", "type": "Government", "exam": "CAT"},
            {"name": "ISB Hyderabad", "type": "Private", "exam": "GMAT / GRE"},
            {"name": "FMS Delhi", "type": "Government", "exam": "CAT"}
        ],
        "keySkills": [
            {"skill": "Business Analysis", "level": 90, "category": "Analytical"},
            {"skill": "Problem Structured Solving", "level": 94, "category": "Analytical"},
            {"skill": "Client Presentation", "level": 92, "category": "Soft Skill"},
            {"skill": "Teamwork under pressure", "level": 88, "category": "Soft Skill"}
        ],
        "similarCareers": [
            {"id": "c_ib", "title": "Investment Banker", "matchPercent": 85},
            {"id": "c_policy", "title": "Policy Analyst", "matchPercent": 70}
        ],
        "domain": "Business & Finance",
        "subcategory": "Corporate Strategy"
    },

    # Law & Policy domain
    {
        "domain_id": "law",
        "id": "c_lawyer",
        "title": "Corporate Lawyer",
        "subtitle": "Business law specialist",
        "badge": "High Demand",
        "badgeColor": "bg-slate-600 text-white",
        "matchPercent": 78,
        "avgSalary": "₹10–50 LPA",
        "jobOpenings": "35K+",
        "growthOutlook": "Good",
        "yearsToQualify": "5 years",
        "whatTheyDo": "Corporate lawyers handle corporate compliance, transactions, mergers, stock listings, intellectual property rights, and contract negotiations for business entities.",
        "dayInLife": [
            "Review contract clauses for potential liability risks",
            "Draft term sheets for upcoming joint venture deals",
            "Advise corporate board on compliance regulations",
            "Represent company interests in arbitrations",
            "Research legal precedents on case files"
        ],
        "educationPath": [
            {"step": 1, "title": "Class 11-12 (Any stream)", "description": "Develop excellent public speaking and reading abilities.", "status": "current"},
            {"step": 2, "title": "CLAT / Law entrance exam", "description": "Prepare for national law university admission tests.", "status": "upcoming"},
            {"step": 3, "title": "Integrated B.A. LL.B. (5 years)", "description": "Complete law program with internships under corporate firms.", "status": "upcoming"},
            {"step": 4, "title": "Join Law firm / In-House", "description": "Pass AIBE exam, join corporate legal advisory cell.", "status": "upcoming"}
        ],
        "topColleges": [
            {"name": "NLSIU Bangalore", "type": "Government", "exam": "CLAT"},
            {"name": "NALSAR Hyderabad", "type": "Government", "exam": "CLAT"},
            {"name": "NLU Delhi", "type": "Government", "exam": "AILET"}
        ],
        "keySkills": [
            {"skill": "Legal Drafting", "level": 94, "category": "Technical"},
            {"skill": "Contract Negotiation", "level": 90, "category": "Technical"},
            {"skill": "Corporate Governance", "level": 88, "category": "Analytical"},
            {"skill": "Critical Argumentation", "level": 92, "category": "Analytical"}
        ],
        "similarCareers": [
            {"id": "c_policy", "title": "Policy Analyst", "matchPercent": 75},
            {"id": "c_ias", "title": "IAS Officer", "matchPercent": 70}
        ],
        "domain": "Law & Policy",
        "subcategory": "Legal Practice"
    },
    {
        "domain_id": "law",
        "id": "c_policy",
        "title": "Policy Analyst",
        "subtitle": "Public guidelines research",
        "badge": "Influential",
        "badgeColor": "bg-[#695be6] text-white",
        "matchPercent": 72,
        "avgSalary": "₹6–18 LPA",
        "jobOpenings": "15K+",
        "growthOutlook": "Good",
        "yearsToQualify": "4-6 years",
        "whatTheyDo": "Policy analysts examine government regulations, propose amendments to social guidelines, evaluate legislative impacts, and advise think tanks or political figures.",
        "dayInLife": [
            "Review legislative papers and bills",
            "Run statistical tests on social survey data",
            "Write policy briefs summarizing research findings",
            "Participate in panel debates on public education schemes",
            "Draft recommendations for sustainable energy use"
        ],
        "educationPath": [
            {"step": 1, "title": "Class 11-12 Humanities", "description": "Focus on political science, sociology, and economics.", "status": "current"},
            {"step": 2, "title": "Bachelor in Political Science / Economics", "description": "Build high proficiency in statistics and political systems.", "status": "upcoming"},
            {"step": 3, "title": "Masters in Public Policy (MPP)", "description": "2-year program focusing on economics, governance, and analysis.", "status": "upcoming"},
            {"step": 4, "title": "Join Think Tank / Government NGO", "description": "Prepare advisories, research papers, and policy campaigns.", "status": "upcoming"}
        ],
        "topColleges": [
            {"name": "NLSIU Bangalore (MPP)", "type": "Government", "exam": "PAT / Interview"},
            {"name": "TISS Mumbai", "type": "Government", "exam": "TISSNET"},
            {"name": "JSU Sonipat", "type": "Private", "exam": "JSAT"}
        ],
        "keySkills": [
            {"skill": "Policy Analysis", "level": 92, "category": "Analytical"},
            {"skill": "Statistical Modeling", "level": 82, "category": "Technical"},
            {"skill": "Report Writing", "level": 95, "category": "Technical"},
            {"skill": "Advocacy & Debate", "level": 88, "category": "Soft Skill"}
        ],
        "similarCareers": [
            {"id": "c_lawyer", "title": "Corporate Lawyer", "matchPercent": 75},
            {"id": "c_ias", "title": "IAS Officer", "matchPercent": 80}
        ],
        "domain": "Law & Policy",
        "subcategory": "Public Policy"
    },

    # Education & Research domain
    {
        "domain_id": "education",
        "id": "c_professor",
        "title": "University Professor",
        "subtitle": "Higher education teacher",
        "badge": "Scholarly",
        "badgeColor": "bg-pink-500 text-white",
        "matchPercent": 76,
        "avgSalary": "₹8–24 LPA",
        "jobOpenings": "25K+",
        "growthOutlook": "Moderate",
        "yearsToQualify": "7-9 years",
        "whatTheyDo": "Professors teach undergraduate and graduate courses, design syllabus guides, perform original scientific/literary research, and mentor university students.",
        "dayInLife": [
            "Deliver a 90-minute lecture on advanced statistics",
            "Grade student term project reports",
            "Review research paper revisions from editors",
            "Guide Ph.D. students on thesis directions",
            "Participate in academic board planning sessions"
        ],
        "educationPath": [
            {"step": 1, "title": "Class 11-12 (Any stream)", "description": "Build high passion for reading and teaching concepts.", "status": "current"},
            {"step": 2, "title": "Bachelor's & Master's Degree", "description": "Complete specialization in chosen field (CS, Math, Literature, etc.).", "status": "upcoming"},
            {"step": 3, "title": "UGC NET / CSIR NET Exam", "description": "Clear national Eligibility tests for lectureship qualification.", "status": "upcoming"},
            {"step": 4, "title": "Ph.D. degree", "description": "Complete doctoral thesis and publish research papers.", "status": "upcoming"}
        ],
        "topColleges": [
            {"name": "IISc Bangalore", "type": "Government", "exam": "GATE"},
            {"name": "JNU New Delhi", "type": "Government", "exam": "CUET PG"},
            {"name": "Delhi University", "type": "Government", "exam": "CUET PG"}
        ],
        "keySkills": [
            {"skill": "Academic Pedagogy", "level": 92, "category": "Technical"},
            {"skill": "Scholarly Research", "level": 95, "category": "Analytical"},
            {"skill": "Public Speaking", "level": 90, "category": "Soft Skill"},
            {"skill": "Academic Mentoring", "level": 88, "category": "Soft Skill"}
        ],
        "similarCareers": [
            {"id": "c_researcher", "title": "Research Scientist", "matchPercent": 90},
            {"id": "c_policy", "title": "Policy Analyst", "matchPercent": 72}
        ],
        "domain": "Education & Research",
        "subcategory": "Academic Careers"
    },
    {
        "domain_id": "education",
        "id": "c_researcher",
        "title": "Research Scientist",
        "subtitle": "Scientific breakthroughs",
        "badge": "Innovative",
        "badgeColor": "bg-indigo-500 text-white",
        "matchPercent": 74,
        "avgSalary": "₹6–20 LPA",
        "jobOpenings": "18K+",
        "growthOutlook": "Good",
        "yearsToQualify": "6-8 years",
        "whatTheyDo": "Research scientists plan, execute, and evaluate laboratory experiments, testing hypotheses to achieve breakthroughs in medicine, hardware, or chemistry.",
        "dayInLife": [
            "Calibrate chromatography tools in lab",
            "Mix precise chemical compounds for bio-assays",
            "Record sensor readings into computer sheets",
            "Write applications for government research grants",
            "Review molecular structures on graphic maps"
        ],
        "educationPath": [
            {"step": 1, "title": "Class 11-12 (PCM/PCB)", "description": "Maintain high grades in physics, chemistry, and bio/math.", "status": "current"},
            {"step": 2, "title": "B.Sc / B.Tech degree", "description": "Focus heavily on laboratory processes and research projects.", "status": "upcoming"},
            {"step": 3, "title": "M.Sc / M.Tech / Ph.D.", "description": "Specialized postgrad studies. Spend time publishing academic articles.", "status": "upcoming"},
            {"step": 4, "title": "Post-Doctoral Fellowship", "description": "Join advanced lab, work on core innovation projects.", "status": "upcoming"}
        ],
        "topColleges": [
            {"name": "IISc Bangalore", "type": "Government", "exam": "GATE"},
            {"name": "TIFR Mumbai", "type": "Government", "exam": "TIFR GS Exam"},
            {"name": "IISER Pune", "type": "Government", "exam": "IISER Aptitude Test"}
        ],
        "keySkills": [
            {"skill": "Lab Techniques", "level": 96, "category": "Technical"},
            {"skill": "Hypothesis Testing", "level": 94, "category": "Analytical"},
            {"skill": "Scientific Writing", "level": 88, "category": "Technical"},
            {"skill": "Data Analysis Tools", "level": 82, "category": "Technical"}
        ],
        "similarCareers": [
            {"id": "c_professor", "title": "University Professor", "matchPercent": 90},
            {"id": "c_gene", "title": "Geneticist", "matchPercent": 85}
        ],
        "domain": "Education & Research",
        "subcategory": "Scientific Research"
    },

    # Arts, Media & Design domain
    {
        "domain_id": "arts",
        "id": "c_ux",
        "title": "UX/UI Designer",
        "subtitle": "Design digital experiences",
        "badge": "High Demand",
        "badgeColor": "bg-purple-500 text-white",
        "matchPercent": 80,
        "avgSalary": "₹8–30 LPA",
        "jobOpenings": "50K+",
        "growthOutlook": "Excellent",
        "yearsToQualify": "4 years",
        "whatTheyDo": "UX/UI designers design intuitive and visually attractive interfaces for software systems, mobile apps, and web platforms, improving customer flow and satisfaction.",
        "dayInLife": [
            "Sketch wireframes of new user flows",
            "Design layout screens using Figma tools",
            "Conduct user testing interviews on app prototype",
            "Coordinate style grids with frontend developers",
            "Analyze hotjar heatmap maps of website clicks"
        ],
        "educationPath": [
            {"step": 1, "title": "Class 11-12 (Any stream)", "description": "Improve design sense and draw sketch blueprints.", "status": "current"},
            {"step": 2, "title": "B.Des / B.Sc in Interaction Design", "description": "4-year program focusing on user behavior, color theory, and prototyping.", "status": "upcoming"},
            {"step": 3, "title": "Design Portfolio Development", "description": "Build real-world case studies demonstrating UX wireframing skills.", "status": "upcoming"},
            {"step": 4, "title": "Join Design Studio / Tech Firm", "description": "Work on product UX boards, collaborate with tech teams.", "status": "upcoming"}
        ],
        "topColleges": [
            {"name": "NID Ahmedabad", "type": "Government", "exam": "DAT"},
            {"name": "IIT Bombay (IDC)", "type": "Government", "exam": "UCEED"},
            {"name": "Srishti Institute Bengaluru", "type": "Private", "exam": "SEAT"}
        ],
        "keySkills": [
            {"skill": "Figma & Prototyping", "level": 94, "category": "Technical"},
            {"skill": "User Research", "level": 88, "category": "Analytical"},
            {"skill": "Information Architecture", "level": 85, "category": "Analytical"},
            {"skill": "Visual Design Theory", "level": 90, "category": "Technical"}
        ],
        "similarCareers": [
            {"id": "c_swe", "title": "Software Engineer", "matchPercent": 70},
            {"id": "c_animator", "title": "Digital Animator", "matchPercent": 78}
        ],
        "domain": "Arts, Media & Design",
        "subcategory": "Digital Arts & Design"
    },
    {
        "domain_id": "arts",
        "id": "c_animator",
        "title": "Digital Animator",
        "subtitle": "Bring stories to life",
        "badge": "Creative Focus",
        "badgeColor": "bg-rose-500 text-white",
        "matchPercent": 73,
        "avgSalary": "₹5–18 LPA",
        "jobOpenings": "20K+",
        "growthOutlook": "Good",
        "yearsToQualify": "3-4 years",
        "whatTheyDo": "Digital animators construct 2D/3D moving animations and visual effects for cinemas, television shows, commercial ads, and computer games.",
        "dayInLife": [
            "Review character storyboard cells with director",
            "Refine keyframe movement curves in Maya software",
            "Render 3D lighting scenes",
            "Color grade digital scene outputs",
            "Collaborate on sound effect timing marks"
        ],
        "educationPath": [
            {"step": 1, "title": "Class 11-12 (Any stream)", "description": "Learn sketching, character modeling, and graphic basics.", "status": "current"},
            {"step": 2, "title": "BFA / B.Sc in Animation & VFX", "description": "3-4 year degree learning tools like Maya, Blender, After Effects.", "status": "upcoming"},
            {"step": 3, "title": "Demo Reel Preparation", "description": "Create a 2-minute video reel showcasing key animation works.", "status": "upcoming"},
            {"step": 4, "title": "Join Gaming Studio / Production House", "description": "Begin work as junior animator or keyframe developer.", "status": "upcoming"}
        ],
        "topColleges": [
            {"name": "NID Ahmedabad", "type": "Government", "exam": "DAT"},
            {"name": "Arena Animation", "type": "Private", "exam": "Direct Entry"},
            {"name": "MAAC Mumbai", "type": "Private", "exam": "Direct Entry"}
        ],
        "keySkills": [
            {"skill": "3D Modeling & Maya", "level": 92, "category": "Technical"},
            {"skill": "Character Rigging", "level": 85, "category": "Technical"},
            {"skill": "Visual Storytelling", "level": 90, "category": "Soft Skill"},
            {"skill": "Lighting & VFX Rendering", "level": 80, "category": "Technical"}
        ],
        "similarCareers": [
            {"id": "c_ux", "title": "UX/UI Designer", "matchPercent": 78},
            {"id": "c_swe", "title": "Software Engineer", "matchPercent": 50}
        ],
        "domain": "Arts, Media & Design",
        "subcategory": "Digital Arts & Design"
    },

    # Social & Environment domain
    {
        "domain_id": "social",
        "id": "c_enviro",
        "title": "Environmentalist",
        "subtitle": "Protect nature & climate",
        "badge": "Impact Focus",
        "badgeColor": "bg-green-600 text-white",
        "matchPercent": 70,
        "avgSalary": "₹5–15 LPA",
        "jobOpenings": "12K+",
        "growthOutlook": "Good",
        "yearsToQualify": "4-6 years",
        "whatTheyDo": "Environmentalists study ecosystem behaviors, draft conservation campaigns, lobby for eco-friendly policies, and analyze industrial environmental compliance reports.",
        "dayInLife": [
            "Collect soil and water samples from river basins",
            "Run pollution level assays in local lab",
            "Review environmental impact assessments for road projects",
            "Write conservation advisories for forestry teams",
            "Lead local community cleanup drives"
        ],
        "educationPath": [
            {"step": 1, "title": "Class 11-12 (PCB/PCM)", "description": "Develop high grades in biology, ecology, and chemistry.", "status": "current"},
            {"step": 2, "title": "B.Sc in Environmental Science / Forestry", "description": "Study biodiversity, climate dynamics, and environmental laws.", "status": "upcoming"},
            {"step": 3, "title": "Masters in Ecology / Climate Studies", "description": "Highly recommended for consulting or scientific profiles.", "status": "upcoming"},
            {"step": 4, "title": "Join Environmental Advisory / NGO", "description": "Publish research, lead green initiatives.", "status": "upcoming"}
        ],
        "topColleges": [
            {"name": "FRI Dehradun", "type": "Government", "exam": "FRI Entrance"},
            {"name": "JNU New Delhi", "type": "Government", "exam": "CUET PG"},
            {"name": "BHU Varanasi", "type": "Government", "exam": "CUET PG"}
        ],
        "keySkills": [
            {"skill": "Ecological Sampling", "level": 90, "category": "Technical"},
            {"skill": "Environmental Laws", "level": 85, "category": "Analytical"},
            {"skill": "Climate Impact Analysis", "level": 88, "category": "Analytical"},
            {"skill": "Community Organization", "level": 92, "category": "Soft Skill"}
        ],
        "similarCareers": [
            {"id": "c_researcher", "title": "Research Scientist", "matchPercent": 78},
            {"id": "c_policy", "title": "Policy Analyst", "matchPercent": 74}
        ],
        "domain": "Social & Environment",
        "subcategory": "Ecology & Climate"
    },

    # Infrastructure & Travel domain
    {
        "domain_id": "infra",
        "id": "c_civil",
        "title": "Civil Engineer",
        "subtitle": "Design & build structures",
        "badge": "Essential",
        "badgeColor": "bg-sky-500 text-white",
        "matchPercent": 71,
        "avgSalary": "₹5–18 LPA",
        "jobOpenings": "45K+",
        "growthOutlook": "Stable",
        "yearsToQualify": "4 years",
        "whatTheyDo": "Civil engineers plan, design, and manage structural building projects like highways, bridges, dams, water reservoirs, and building blocks.",
        "dayInLife": [
            "Review structural safety calculations on CAD sheets",
            "Inspect building foundations at construction sites",
            "Analyze concrete strength test results",
            "Discuss utility routing plans with contractors",
            "Draft material cost estimates"
        ],
        "educationPath": [
            {"step": 1, "title": "Class 11-12 (PCM)", "description": "Build high mastery in Physics and mathematics.", "status": "current"},
            {"step": 2, "title": "B.Tech in Civil Engineering", "description": "4-year core engineering course covering hydraulics, structural design, and geotech.", "status": "upcoming"},
            {"step": 3, "title": "Site Internships & Software Skills", "description": "Learn AutoCAD, Revit, and structural analysis program tools.", "status": "upcoming"},
            {"step": 4, "title": "Join Construction / Infrastructure Firm", "description": "Join projects as site engineer or design analyst.", "status": "upcoming"}
        ],
        "topColleges": [
            {"name": "IIT Bombay", "type": "Government", "exam": "JEE Advanced"},
            {"name": "IIT Madras", "type": "Government", "exam": "JEE Advanced"},
            {"name": "BITS Pilani", "type": "Private", "exam": "BITSAT"}
        ],
        "keySkills": [
            {"skill": "Structural Design", "level": 90, "category": "Technical"},
            {"skill": "CAD Modeling", "level": 85, "category": "Technical"},
            {"skill": "Soil Mechanics", "level": 82, "category": "Analytical"},
            {"skill": "Project Coordination", "level": 80, "category": "Soft Skill"}
        ],
        "similarCareers": [
            {"id": "c_mech", "title": "Mechanical Engineer", "matchPercent": 70},
            {"id": "c_aero", "title": "Aerospace Engineer", "matchPercent": 60}
        ],
        "domain": "Infrastructure & Travel",
        "subcategory": "Construction & Development"
    },

    # Sports & Events domain
    {
        "domain_id": "sports",
        "id": "c_sports_mgr",
        "title": "Sports Manager",
        "subtitle": "Athletic business & events",
        "badge": "Dynamic",
        "badgeColor": "bg-red-500 text-white",
        "matchPercent": 75,
        "avgSalary": "₹6–22 LPA",
        "jobOpenings": "15K+",
        "growthOutlook": "Good",
        "yearsToQualify": "3-5 years",
        "whatTheyDo": "Sports managers oversee business aspects of sports teams, athletic clubs, mega tournaments, and sports stadiums, managing logistics, marketing, and talent recruitment.",
        "dayInLife": [
            "Discuss team sponsor contract clauses",
            "Draft ticketing and security plans for next game",
            "Coordinate team travel and lodging logistics",
            "Consult with athletic trainer on fitness logs",
            "Manage social media brand promos"
        ],
        "educationPath": [
            {"step": 1, "title": "Class 11-12 (Any stream)", "description": "Engage actively in sports events and manage school teams.", "status": "current"},
            {"step": 2, "title": "Bachelor of Sports Management (BSM)", "description": "3-year undergraduate degree focusing on sports law, sports finance, and event management.", "status": "upcoming"},
            {"step": 3, "title": "Club Internships", "description": "Acquire hands-on training coordinating inter-college leagues or sports clubs.", "status": "upcoming"},
            {"step": 4, "title": "Join Sports agency / Club Franchise", "description": "Work on operations, brand management, or scheduling.", "status": "upcoming"}
        ],
        "topColleges": [
            {"name": "IISWBM Kolkata", "type": "Government", "exam": "MAT / GMAT"},
            {"name": "National Academy of Sports Management", "type": "Private", "exam": "NASM Entrance"},
            {"name": "Symbiosis Pune", "type": "Private", "exam": "SNAP"}
        ],
        "keySkills": [
            {"skill": "Sports Event Planning", "level": 92, "category": "Technical"},
            {"skill": "Sports Marketing", "level": 88, "category": "Technical"},
            {"skill": "Contract Administration", "level": 82, "category": "Analytical"},
            {"skill": "Client Relationship", "level": 90, "category": "Soft Skill"}
        ],
        "similarCareers": [
            {"id": "c_consultant", "title": "Management Consultant", "matchPercent": 70},
            {"id": "c_policy", "title": "Policy Analyst", "matchPercent": 60}
        ],
        "domain": "Sports & Events",
        "subcategory": "Sports Management"
    }
]
