import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { learningProfileData } from "../../data/parentData";

const TIMES = ["Morning", "Afternoon", "Evening", "Night"];
const ENVIRONMENTS = ["Quiet space", "Music", "Family nearby", "Alone"];
const STYLES = [
  { id: "visual", label: "Visual Learner", desc: "Prefers diagrams, images, and spatial understanding.", icon: "visibility" },
  { id: "auditory", label: "Auditory Learner", desc: "Learns best through listening, speaking, and rhythmic patterns.", icon: "hearing" },
  { id: "kinesthetic", label: "Kinesthetic Learner", desc: "Learns with physical activities and focus on experiences.", icon: "directions_run" },
  { id: "reading", label: "Reading/Writing Learner", desc: "Prefers taking notes, reading texts, and list-making.", icon: "menu_book" },
];
const SUBJECTS = ["Mathematics", "Science", "Languages", "Fine Arts", "History"];

export default function ParentLearningProfile() {
  const navigate = useNavigate();
  const [profile, setProfile] = useState(learningProfileData);
  const [saved, setSaved] = useState(false);

  const discard = () => {
    setProfile(learningProfileData);
    setSaved(false);
  };

  const save = () => {
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const toggle = (field, val) => {
    setProfile((p) => {
      const arr = p[field];
      return { ...p, [field]: arr.includes(val) ? arr.filter((x) => x !== val) : [...arr, val] };
    });
  };

  return (
    <div className="bg-[#f6f6f8] min-h-screen pb-10" style={{ fontFamily: "'Lexend', sans-serif" }}>
      {/* Header */}
      <div className="bg-white border-b border-gray-100 px-4 py-3 flex items-center gap-3">
        <button onClick={() => navigate("/parent")} className="size-9 flex items-center justify-center rounded-xl hover:bg-gray-100">
          <span className="material-symbols-outlined text-xl">arrow_back</span>
        </button>
        <div className="flex gap-4 text-sm font-semibold">
          <button onClick={() => navigate("/parent")} className="text-gray-400 hover:text-[#695be6]">Dashboard</button>
          <span className="text-[#695be6] border-b-2 border-[#695be6] pb-1">Classes</span>
          <button onClick={() => navigate("/parent/progress")} className="text-gray-400 hover:text-[#695be6]">Progress</button>
          <button onClick={() => navigate("/parent/curiosity")} className="text-gray-400 hover:text-[#695be6]">Resources</button>
        </div>
        <div className="ml-auto size-8 rounded-full bg-gray-200 flex items-center justify-center">
          <span className="material-symbols-outlined text-gray-500 text-base">person</span>
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4 pt-4">
        <p className="text-xs text-gray-400 mb-1">Dashboard › Child's Learning Profile</p>
        <h1 className="text-2xl font-black mb-1">Your Child's Learning Profile</h1>
        <div className="flex items-center justify-between mb-4">
          <p className="text-xs text-gray-400 flex items-center gap-1">
            <span className="material-symbols-outlined text-xs">lock</span> Private – Shared only with teachers
          </p>
          <button className="text-xs text-[#695be6] font-semibold">☆ View Previous Updates</button>
        </div>

        {/* Welcome Banner */}
        <div className="bg-[#695be6]/10 rounded-2xl p-4 mb-5 flex items-start gap-3">
          <span className="text-2xl">💜</span>
          <div className="flex-1">
            <p className="font-bold text-sm">Welcome!</p>
            <p className="text-xs text-gray-600">Sharing these observations helps us tailor our teaching approach to your child's unique needs. Everything you share remains strictly confidential and is used solely to enhance their learning experience.</p>
          </div>
          <button className="text-xs text-[#695be6] font-semibold shrink-0">Learn more about our approach →</button>
        </div>

        {/* Learning Style Observations */}
        <section className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 mb-4">
          <div className="flex items-center gap-2 mb-4">
            <span className="material-symbols-outlined text-[#695be6] text-xl">visibility</span>
            <h2 className="font-bold">Learning Style Observations</h2>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm font-semibold mb-2">Preferred Learning Time</p>
              <p className="text-xs text-gray-400 mb-2">When is your child most alert and ready to learn?</p>
              <div className="flex flex-wrap gap-2">
                {TIMES.map((t) => (
                  <button
                    key={t}
                    onClick={() => setProfile((p) => ({ ...p, preferredTime: t }))}
                    className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-colors ${profile.preferredTime === t ? "bg-[#695be6] text-white" : "bg-gray-100 text-gray-600"}`}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <p className="text-sm font-semibold mb-2">Learning Environment</p>
              <p className="text-xs text-gray-400 mb-2">What conditions help them concentrate best?</p>
              <div className="flex flex-wrap gap-2">
                {ENVIRONMENTS.map((e) => (
                  <button
                    key={e}
                    onClick={() => toggle("environment", e)}
                    className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-colors ${profile.environment.includes(e) ? "bg-[#695be6] text-white" : "bg-gray-100 text-gray-600"}`}
                  >
                    {e}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* Learning Style Type */}
        <section className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 mb-4">
          <h2 className="font-bold mb-1">Learning Style Type</h2>
          <p className="text-xs text-gray-400 mb-3">Select the profile that best matches how your child absorbs information.</p>
          <div className="grid grid-cols-2 gap-3">
            {STYLES.map((s) => (
              <button
                key={s.id}
                onClick={() => setProfile((p) => ({ ...p, learningStyle: s.id }))}
                className={`p-3 rounded-xl border-2 text-left transition-colors ${profile.learningStyle === s.id ? "border-[#695be6] bg-[#695be6]/5" : "border-gray-100"}`}
              >
                <div className="flex items-center gap-2 mb-1">
                  <span className={`material-symbols-outlined text-base ${profile.learningStyle === s.id ? "text-[#695be6]" : "text-gray-400"}`}>{s.icon}</span>
                  <p className="text-xs font-bold">{s.label}</p>
                  {profile.learningStyle === s.id && <span className="ml-auto material-symbols-outlined text-[#695be6] text-base">check_circle</span>}
                </div>
                <p className="text-xs text-gray-500">{s.desc}</p>
              </button>
            ))}
          </div>
        </section>

        {/* Your Observations */}
        <section className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 mb-4">
          <h2 className="font-bold mb-1">Your Observations</h2>
          <p className="text-xs text-gray-400 mb-3">Any specific nuances we should know about? E.g., "They focus better when your clear breakdown of tasks"</p>
          <textarea
            value={profile.observations || ""}
            onChange={(e) => setProfile((p) => ({ ...p, observations: e.target.value }))}
            placeholder="Describe your child's general learning behaviors or habits..."
            className="w-full border border-gray-200 rounded-xl p-3 text-sm outline-none focus:border-[#695be6] resize-none h-20"
          />
          <div className="mt-3">
            <div className="flex items-center justify-between mb-1">
              <p className="text-sm font-semibold">Average Focus Duration</p>
              <span className="text-xs font-bold text-[#695be6]">{profile.focusDuration} min</span>
            </div>
            <input
              type="range" min={5} max={120} step={5}
              value={profile.focusDuration}
              onChange={(e) => setProfile((p) => ({ ...p, focusDuration: Number(e.target.value) }))}
              className="w-full accent-[#695be6]"
            />
            <div className="flex justify-between text-xs text-gray-400 mt-1">
              <span>5 min</span><span>20 min</span><span>60 min</span><span>120 min</span>
            </div>
          </div>
        </section>

        {/* Additional Insights */}
        <section className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 mb-4">
          <h2 className="font-bold mb-3">Additional Insights</h2>
          <div className="grid grid-cols-2 gap-3">
            {[
              { label: "Work Strengths", placeholder: "What comes easily to them?", field: "strengths" },
              { label: "Key Challenges", placeholder: "Where do they typically struggle?", field: "challenges" },
              { label: "Effective Strategies", placeholder: "What techniques have you seen work?", field: "strategies" },
              { label: "Emotional Responses", placeholder: "How do they handle frustration or success?", field: "emotional" },
            ].map((f) => (
              <div key={f.field}>
                <p className="text-xs font-semibold mb-1">{f.label}</p>
                <textarea
                  value={profile[f.field] || ""}
                  onChange={(e) => setProfile((p) => ({ ...p, [f.field]: e.target.value }))}
                  placeholder={f.placeholder}
                  className="w-full border border-gray-200 rounded-xl p-2 text-xs outline-none focus:border-[#695be6] resize-none h-16"
                />
              </div>
            ))}
          </div>
        </section>

        {/* Interests & Motivation */}
        <section className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 mb-4">
          <h2 className="font-bold mb-3">Interests & Motivation</h2>
          <p className="text-xs font-semibold mb-2">Subjects They Enjoy</p>
          <div className="flex flex-wrap gap-2 mb-3">
            {SUBJECTS.map((s) => (
              <button
                key={s}
                onClick={() => toggle("subjects", s)}
                className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-colors flex items-center gap-1 ${profile.subjects.includes(s) ? "bg-[#695be6] text-white" : "bg-gray-100 text-gray-600"}`}
              >
                {profile.subjects.includes(s) && <span className="material-symbols-outlined text-xs">check</span>}
                {s}
              </button>
            ))}
          </div>
          <p className="text-xs font-semibold mb-2">Hobbies Outside School</p>
          <input
            type="text"
            value={profile.hobbies || ""}
            onChange={(e) => setProfile((p) => ({ ...p, hobbies: e.target.value }))}
            placeholder="e.g., Piano, Swimming, Building with blocks..."
            className="w-full border border-gray-200 rounded-xl p-3 text-sm outline-none focus:border-[#695be6]"
          />
        </section>

        {/* Privacy Note */}
        <div className="bg-green-50 border border-green-100 rounded-2xl p-4 mb-5 flex gap-3">
          <span className="material-symbols-outlined text-green-600 text-xl mt-0.5">shield</span>
          <div>
            <p className="font-bold text-sm text-green-800">Your Privacy is Our Priority</p>
            <p className="text-xs text-gray-600">This profile information is encrypted and stored securely. It is only accessible to your child's assigned teachers and school administrators to provide the best educational support.</p>
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-3">
          <button onClick={discard} className="flex-1 border border-gray-200 bg-white rounded-2xl py-3 text-sm font-bold text-gray-600 hover:bg-gray-50">
            Discard Changes
          </button>
          <button onClick={save} className="flex-1 bg-[#695be6] text-white rounded-2xl py-3 text-sm font-bold flex items-center justify-center gap-2">
            <span className="material-symbols-outlined text-base">{saved ? "check_circle" : "save"}</span>
            {saved ? "Saved!" : "Save Profile"}
          </button>
        </div>
      </div>

      <div className="mt-8 text-center text-xs text-gray-400 py-4 border-t border-gray-200">
        © 2024 Parent Portal. All rights reserved.
        <div className="flex justify-center gap-4 mt-1">
          {["Privacy Policy", "Terms of Service", "Help Center"].map((l) => (
            <button key={l} onClick={() => navigate("/parent")} className="hover:text-gray-600">{l}</button>
          ))}
        </div>
      </div>
    </div>
  );
}
