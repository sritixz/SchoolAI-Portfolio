import { useState, useEffect } from "react";
import { useAuth } from "../../context/AuthContext";
import { useNavigate, useParams } from "react-router-dom";
import api from "../../api";
import ExamSetupWizard from "./examprep/ExamSetupWizard";
import ExamDashboard from "./examprep/ExamDashboard";
import { loadPrepList, savePrepList } from "./ExamPrepList";

export default function ExamPrep() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { prepId } = useParams(); // undefined on /new, an id on /:prepId

  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  // "new" route — show wizard immediately
  const isNew = prepId === "new" || prepId === undefined;

  useEffect(() => {
    if (!user?.id) { setLoading(false); return; }

    if (isNew) {
      setProfile(null);
      setLoading(false);
      return;
    }

    // Load from list
    const list = loadPrepList(user.id);
    const found = list.find((p) => p.id === prepId);
    if (found) {
      setProfile(found);
      setLoading(false);
      return;
    }

    // Fallback: try backend
    api.get("/student/exam-prep/profile")
      .then((r) => {
        if (r.data?.subjects?.length) {
          setProfile(r.data);
        } else {
          setProfile(null);
        }
      })
      .catch(() => setProfile(null))
      .finally(() => setLoading(false));
  }, [user?.id, prepId, isNew]);

  const handleSetupComplete = (newProfile) => {
    const list = loadPrepList(user.id);
    const id = newProfile.id || `prep_${Date.now()}`;
    const entry = { ...newProfile, id };

    // Replace if same id exists, otherwise prepend
    const idx = list.findIndex((p) => p.id === id);
    const updated = idx >= 0
      ? list.map((p) => (p.id === id ? entry : p))
      : [entry, ...list];

    savePrepList(user.id, updated);
    setProfile(entry);
    // Navigate to the specific prep route
    navigate(`/student/exam-prep/${id}`, { replace: true });
  };

  const handleReset = () => {
    // Remove from list and go back to list page
    if (prepId && prepId !== "new") {
      const list = loadPrepList(user.id);
      savePrepList(user.id, list.filter((p) => p.id !== prepId));
    }
    navigate("/student/exam-prep", { replace: true });
  };

  const handleProfileUpdate = (updatedProfile) => {
    const list = loadPrepList(user.id);
    const updated = list.map((p) => (p.id === updatedProfile.id ? updatedProfile : p));
    savePrepList(user.id, updated);
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
