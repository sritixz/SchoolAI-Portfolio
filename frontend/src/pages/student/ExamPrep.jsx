import { useState, useEffect } from "react";
import { useAuth } from "../../context/AuthContext";
import { useNavigate, Link } from "react-router-dom";
import api from "../../api";
import ExamSetupWizard from "./examprep/ExamSetupWizard";
import ExamDashboard from "./examprep/ExamDashboard";

const STORAGE_KEY = "exam_prep_profile";

export default function ExamPrep() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [profile, setProfile] = useState(null);   // null = not set up yet
  const [loading, setLoading] = useState(true);

  // Load saved profile from localStorage (fast) then verify with backend
  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try { setProfile(JSON.parse(saved)); } catch { /* ignore */ }
    }
    // Also try to fetch from backend
    api.get("/student/exam-prep/profile")
      .then((r) => {
        if (r.data?.subjects?.length) {
          setProfile(r.data);
          localStorage.setItem(STORAGE_KEY, JSON.stringify(r.data));
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const handleSetupComplete = (newProfile) => {
    setProfile(newProfile);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(newProfile));
  };

  const handleReset = () => {
    setProfile(null);
    localStorage.removeItem(STORAGE_KEY);
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
