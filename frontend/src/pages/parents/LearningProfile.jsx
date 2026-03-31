import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import {
  fetchParentDashboard,
  fetchLearningProfile,
  updateLearningProfile,
  selectChildren,
  selectLearningProfile,
} from "../../store/slices/parentSlice";

const TIMES = ["Morning", "Afternoon", "Evening", "Night"];
const ENVIRONMENTS = ["Quiet space", "Music", "Family nearby", "Alone"];
const STYLES = [
  { id: "visual",    label: "Visual Learner",         desc: "Prefers diagrams, images, and spatial understanding.",          icon: "visibility" },
  { id: "auditory",  label: "Auditory Learner",        desc: "Learns best through listening, speaking, and rhythmic patterns.", icon: "hearing" },
  { id: "kinesthetic", label: "Kinesthetic Learner",   desc: "Learns with physical activities and focus on experiences.",      icon: "directions_run" },
  { id: "reading",   label: "Reading/Writing Learner", desc: "Prefers taking notes, reading texts, and list-making.",          icon: "menu_book" },
];
const SUBJECTS = ["Mathematics", "Science", "Languages", "Fine Arts", "History"];

const DEFAULT_PROFILE = {
  preferredTime: "Evening",
  environment: [],
  learningStyle: "visual",
  observations: "",
  focusDuration: 30,
  strengths: "",
  challenges: "",
  strategies: "",
  emotional: "",
  subjects: [],
  hobbies: "",
};

export default function ParentLearningProfile() {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const [saved, setSaved] = useState(false);
  const [childId, setChildId] = useState(null);

  const children = useSelector(selectChildren);
  const remoteProfile = useSelector(selectLearningProfile);
  const [profile, setProfile] = useState(DEFAULT_PROFILE);

  useEffect(() => {
    dispatch(fetchParentDashboard()).then((res) => {
      const kids = res.payload?.children || [];
      if (kids.length > 0) {
        setChildId(kids[0]._id);
        dispatch(fetchLearningProfile(kids[0]._id));
      }
    });
  }, [dispatch]);

  useEffect(() => {
    if (remoteProfile && Object.keys(remoteProfile).length > 0) {
      setProfile({ ...DEFAULT_PROFILE, ...remoteProfile });
    }
  }, [remoteProfile]);

  const child = children[0];

  const toggle = (field, val) => {
    setProfile((p) => {
      const arr = p[field] || [];
      return { ...p, [field]: arr.includes(val) ? arr.filter((x) => x !== val) : [...arr, val] };
    });
  };

  const save = async () => {
    if (!childId) return;
    await dispatch(updateLearningProfile({ childId, profile }));
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const discard = () => {
    if (remoteProfile) setProfile({ ...DEFAULT_PROFILE, ...remoteProfile });
    setSaved(false);
  };

  return (
    <div className="bg-[#f6f6f8] min-h-screen pb-10" style={{ fontFamily: "'Lexend', sans-serif" }}>
      <div className="bg-white border-b border-gray-100 px-4 py-3 flex items-center gap-3">
        <button onClick={() => navigate("/parent")} className="size-9 flex items-center justify-center rounded-xl hover:bg-gray-100">
          <span className="material-symbols-outlined text-xl">arrow_back</span>
        </button>
        <span className="text-[#695be6] font-semibold text-sm border-b-2 border-[#695be6] pb-1">Learning Profile</span>
      </div>

      <div className="max-w-lg mx-auto px-4 pt-4">
        <h1 className="text-2xl font-black mb-1">{child?.name || "Child"}'s Learning Profile</h1>
        <p className="text-xs text-gray-400 mb-4 flex items-center gap-1">
          <span className="material-symbols-outlined text-xs">lock</span> Private – Shared only with teachers
        </p>

        <div className="bg-[#695be6]/10 rounded-2xl p-4 mb-5 flex items-start gap-3">
          <span className="text-2xl">💜</span>
          <p className="text-xs text-gray-600">Sharing these observations helps us tailor our teaching approach to your child's unique needs. Everything you share remains strictly confidential.</p>
        </div>

        <section className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 mb-4">
          <h2 className="font-bold mb-4">Learning Style Observations</h2>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm font-semibold mb-2">Preferred Learning Time</p>
              <div className="flex flex-wrap gap-2">
                {TIMES.map((t) => (
                  <button key={t} onClick={() => setProfile((p) => ({ ...p, preferredTime: t }))}
                    className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-colors ${profile.preferredTime === t ? "bg-[#695be6] text-white" : "bg-gray-100 text-gray-600"}`}>
                    {t}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <p className="text-sm font-semibold mb-2">Learning Environment</p>
              <div className="flex flex-wrap gap-2">
                {ENVIRONMENTS.map((e) => (
                  <button key={e} onClick={() => toggle("environment", e)}
                    className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-colors ${(profile.environment || []).includes(e) ? "bg-[#695be6] text-white" : "bg-gray-100 text-gray-600"}`}>
                    {e}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 mb-4">
          <h2 className="font-bold mb-3">Learning Style Type</h2>
          <div className="grid grid-cols-2 gap-3">
            {STYLES.map((s) => (
              <button key={s.id} onClick={() => setProfile((p) => ({ ...p, learningStyle: s.id }))}
                className={`p-3 rounded-xl border-2 text-left transition-colors ${profile.learningStyle === s.id ? "border-[#695be6] bg-[#695be6]/5" : "border-gray-100"}`}>
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

        <section className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 mb-4">
          <h2 className="font-bold mb-1">Your Observations</h2>
          <textarea
            value={profile.observations || ""}
            onChange={(e) => setProfile((p) => ({ ...p, observations: e.target.value }))}
            placeholder="Describe your child's general learning behaviors..."
            className="w-full border border-gray-200 rounded-xl p-3 text-sm outline-none focus:border-[#695be6] resize-none h-20 mb-3"
          />
          <div>
            <div className="flex items-center justify-between mb-1">
              <p className="text-sm font-semibold">Average Focus Duration</p>
              <span className="text-xs font-bold text-[#695be6]">{profile.focusDuration} min</span>
            </div>
            <input type="range" min={5} max={120} step={5} value={profile.focusDuration}
              onChange={(e) => setProfile((p) => ({ ...p, focusDuration: Number(e.target.value) }))}
              className="w-full accent-[#695be6]" />
          </div>
        </section>

        <section className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 mb-4">
          <h2 className="font-bold mb-3">Additional Insights</h2>
          <div className="grid grid-cols-2 gap-3">
            {[
              { label: "Work Strengths", placeholder: "What comes easily to them?", field: "strengths" },
              { label: "Key Challenges", placeholder: "Where do they typically struggle?", field: "challenges" },
              { label: "Effective Strategies", placeholder: "What techniques have you seen work?", field: "strategies" },
              { label: "Emotional Responses", placeholder: "How do they handle frustration?", field: "emotional" },
            ].map((f) => (
              <div key={f.field}>
                <p className="text-xs font-semibold mb-1">{f.label}</p>
                <textarea value={profile[f.field] || ""} onChange={(e) => setProfile((p) => ({ ...p, [f.field]: e.target.value }))}
                  placeholder={f.placeholder}
                  className="w-full border border-gray-200 rounded-xl p-2 text-xs outline-none focus:border-[#695be6] resize-none h-16" />
              </div>
            ))}
          </div>
        </section>

        <section className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 mb-4">
          <h2 className="font-bold mb-3">Interests & Motivation</h2>
          <p className="text-xs font-semibold mb-2">Subjects They Enjoy</p>
          <div className="flex flex-wrap gap-2 mb-3">
            {SUBJECTS.map((s) => (
              <button key={s} onClick={() => toggle("subjects", s)}
                className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-colors flex items-center gap-1 ${(profile.subjects || []).includes(s) ? "bg-[#695be6] text-white" : "bg-gray-100 text-gray-600"}`}>
                {(profile.subjects || []).includes(s) && <span className="material-symbols-outlined text-xs">check</span>}
                {s}
              </button>
            ))}
          </div>
          <p className="text-xs font-semibold mb-2">Hobbies Outside School</p>
          <input type="text" value={profile.hobbies || ""} onChange={(e) => setProfile((p) => ({ ...p, hobbies: e.target.value }))}
            placeholder="e.g., Piano, Swimming, Building with blocks..."
            className="w-full border border-gray-200 rounded-xl p-3 text-sm outline-none focus:border-[#695be6]" />
        </section>

        <div className="flex gap-3">
          <button onClick={discard} className="flex-1 border border-gray-200 bg-white rounded-2xl py-3 text-sm font-bold text-gray-600 hover:bg-gray-50">Discard Changes</button>
          <button onClick={save} className="flex-1 bg-[#695be6] text-white rounded-2xl py-3 text-sm font-bold flex items-center justify-center gap-2">
            <span className="material-symbols-outlined text-base">{saved ? "check_circle" : "save"}</span>
            {saved ? "Saved!" : "Save Profile"}
          </button>
        </div>
      </div>
    </div>
  );
}
