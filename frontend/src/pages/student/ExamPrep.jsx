import { useState, useEffect } from "react";
import { useAuth } from "../../context/AuthContext";
import { useNavigate, useParams } from "react-router-dom";
import api from "../../api";
import ExamSetupWizard from "./examprep/ExamSetupWizard";
import ExamDashboard from "./examprep/ExamDashboard";

export default function ExamPrep() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { prepId } = useParams();

  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  const isNew = prepId === "new" || prepId === undefined;

  useEffect(() => {
    if (!user?.id) { setLoading(false); return; }
    if (isNew) { setProfile(null); setLoading(false); return; }

    api.get("/student/exam-prep/list")
      .then((r) => {
        const found = (r.data || []).find((p) => p.id === prepId);
        setProfile(found || null);
      })
      .catch(() => setProfile(null))
      .finally(() => setLoading(false));
  }, [user?.id, prepId, isNew]);

  const handleSetupComplete = (newProfile) => {
    setProfile(newProfile);
    navigate(`/student/exam-prep/${newProfile.id}`, { replace: true });
  };

  const handleReset = async () => {
    if (prepId && prepId !== "new") {
      try { await api.delete(`/student/exam-prep/${prepId}`); } catch { /* ignore */ }
    }
    navigate("/student/exam-prep", { replace: true });
  };

  const handleProfileUpdate = (updatedProfile) => {
    setProfile(updatedProfile);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#f6f6f8] flex items-center justify-center" style={{ fontFamily: "'Lexend', sans-serif" }}>
        <span className="size-8 border-2 border-[#695be6]/30 border-t-[#695be6] rounded-full animate-spin" />
      </div>
    );
  }

  if (!profile) {
    return (
      <ExamSetupWizard
        user={user}
        navigate={navigate}
        onComplete={handleSetupComplete}
      />
    );
  }

  return (
    <ExamDashboard
      user={user}
      navigate={navigate}
      profile={profile}
      onReset={handleReset}
      onProfileUpdate={handleProfileUpdate}
    />
  );
}
