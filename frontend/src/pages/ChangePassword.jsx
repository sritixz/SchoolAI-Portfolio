import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useDispatch } from "react-redux";
import { useAuth } from "../context/AuthContext";
import { changePassword } from "../store/slices/authSlice";

export default function ChangePassword() {
  const { user } = useAuth();
  const dispatch = useDispatch();
  const navigate = useNavigate();

  const [form,    setForm]    = useState({ current: "", next: "", confirm: "" });
  const [error,   setError]   = useState("");
  const [loading, setLoading] = useState(false);

  const f = (k) => (e) => setForm((p) => ({ ...p, [k]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    if (form.next.length < 6)          { setError("New password must be at least 6 characters"); return; }
    if (form.next !== form.confirm)    { setError("Passwords do not match"); return; }
    if (form.next === form.current)    { setError("New password must be different from current"); return; }

    setLoading(true);
    try {
      await dispatch(changePassword({ current_password: form.current, new_password: form.next })).unwrap();
      navigate(`/${user?.role || "teacher"}`);
    } catch (err) {
      setError(err?.detail || err?.message || "Failed to change password");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#f6f6f8] flex items-center justify-center px-4" style={{ fontFamily: "'Lexend', sans-serif" }}>
      <div className="w-full max-w-md">

        {/* Logo */}
        <div className="flex flex-col items-center mb-8">
          <div className="size-14 bg-[#695be6] rounded-2xl flex items-center justify-center text-white mb-3 shadow-lg shadow-[#695be6]/30">
            <span className="material-symbols-outlined text-3xl">lock_reset</span>
          </div>
          <h1 className="text-2xl font-black text-[#100e1a] tracking-tight">Change Password</h1>
          <p className="text-gray-500 text-sm mt-1 text-center">
            Your account was created by an admin. Please set a new password to continue.
          </p>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
          <div className="flex items-center gap-3 mb-6 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3">
            <span className="material-symbols-outlined text-amber-500">info</span>
            <p className="text-sm text-amber-700">
              Welcome, <span className="font-bold">{user?.name}</span>! You must change your temporary password before continuing.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div>
              <label className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-1 block">Current (Temporary) Password</label>
              <input type="password" value={form.current} onChange={f("current")} required autoFocus
                placeholder="Enter the password from your welcome email"
                className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 text-sm outline-none focus:border-[#695be6] transition-colors" />
            </div>
            <div>
              <label className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-1 block">New Password</label>
              <input type="password" value={form.next} onChange={f("next")} required
                placeholder="Min. 6 characters"
                className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 text-sm outline-none focus:border-[#695be6] transition-colors" />
            </div>
            <div>
              <label className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-1 block">Confirm New Password</label>
              <input type="password" value={form.confirm} onChange={f("confirm")} required
                placeholder="Repeat new password"
                className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 text-sm outline-none focus:border-[#695be6] transition-colors" />
            </div>

            {error && (
              <div className="flex items-center gap-2 bg-red-50 border border-red-200 rounded-xl px-4 py-3">
                <span className="material-symbols-outlined text-red-500 text-base">error</span>
                <p className="text-red-600 text-xs font-medium">{error}</p>
              </div>
            )}

            <button type="submit" disabled={loading}
              className="w-full py-3 bg-[#695be6] text-white font-bold rounded-xl hover:bg-[#5a4dd4] disabled:opacity-60 transition-colors flex items-center justify-center gap-2 mt-1">
              {loading
                ? <><span className="size-4 border-2 border-white/40 border-t-white rounded-full animate-spin" /> Saving...</>
                : <><span className="material-symbols-outlined text-base">lock</span> Set New Password</>
              }
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
