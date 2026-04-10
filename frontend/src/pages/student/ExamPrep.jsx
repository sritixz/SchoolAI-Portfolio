import { useState, useEffect } from "react";
import { useAuth } from "../../context/AuthContext";
import { useNavigate } from "react-router-dom";
import api from "../../api";
import ExamSetupWizard from "./examprep/ExamSetupWizard";
import ExamDashboard from "./examprep/ExamDashboard";

const storageKey = (userId) => `exam_prep_profile_${userId}`;

export default function ExamPrep() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  const key = storageKey(user?.id);

  // Bug 5 fix: parse cache eagerly, handle errors explicitly, add key to deps
  useEffect(() => {
    if (!user?.id) { setLoading(false); return; }

    const saved = localStorage.getItem(key);
    const cachedProfile = saved
      ? (() => { try { return JSON.parse(saved); } catch { return null; } })()
      : null;

    if (cachedProfile) setProfile(cachedProfile);

    api.get("/student/exam-prep/profile")
      .then((r) => {
        if (r.data?.subjects?.length) {
          setProfile(r.data);
          localStorage.setItem(key, JSON.stringify(r.data));
        } else if (!cachedProfile) {
          setProfile(null); // no cache + no backend profile → show wizard
        }
      })
      .catch((err) => {
        // Backend failed — keep cache if available, else show wizard
        if (!cachedProfile) setProfile(null);
        console.error("Failed to sync exam prep profile:", err);
      })
      .finally(() => setLoading(false));
  }, [user?.id, key]);

  const handleSetupComplete = (newProfile) => {
    setProfile(newProfile);
    localStorage.setItem(key, JSON.stringify(newProfile));
  };

  const handleReset = () => {
    setProfile(null);
    localStorage.removeItem(key);
  };

  if (loading && !profile) {
    return (
      <div className="min-h-screen bg-[#f6f6f8] flex items-center justify-center" style={{ fontFamily: "'Lexend', sans-serif" }}>
        <span className="size-8 border-2 border-[#695be6]/30 border-t-[#695be6] rounded-full animate-spin" />
      </div>
    );
  }

  if (!profile) {
    return <ExamSetupWizard user={user} navigate={navigate} onComplete={handleSetupComplete} />;
  }

  return <ExamDashboard user={user} navigate={navigate} profile={profile} onReset={handleReset} />;
}
