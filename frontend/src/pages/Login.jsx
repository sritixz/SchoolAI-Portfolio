import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

const ROLES = [
  { id:"student",     label:"Student",      icon:"school",               color:"from-pink-400 to-rose-500" },
  { id:"parent",      label:"Parent",       icon:"family_restroom",      color:"from-emerald-400 to-teal-500" },
  { id:"teacher",     label:"Teacher",      icon:"person_book",          color:"from-blue-400 to-indigo-500" },
  { id:"schooladmin", label:"School Admin", icon:"admin_panel_settings", color:"from-amber-400 to-orange-500" },
];

// Students use phone+OTP; everyone else uses email+password
const PHONE_ROLES = ["student"];

export default function Login() {
  const navigate = useNavigate();
  const { login } = useAuth();

  const [step,         setStep]         = useState("role");   // role | form | otp
  const [tab,          setTab]          = useState("login");  // login | register
  const [selectedRole, setSelectedRole] = useState(null);
  const [form,         setForm]         = useState({ name:"", email:"", phone:"", password:"", confirmPassword:"", otp:"" });
  const [devOtp,       setDevOtp]       = useState("");       // shown in dev mode
  const [error,        setError]        = useState("");
  const [loading,      setLoading]      = useState(false);
  const [showPass,     setShowPass]     = useState(false);

  const isPhoneRole = selectedRole && PHONE_ROLES.includes(selectedRole.id);
  const f = (k) => (e) => setForm((p) => ({ ...p, [k]: e.target.value }));

  const handleRoleSelect = (role) => { setSelectedRole(role); setStep("form"); setError(""); };

  // ── Phone OTP: request ──
  const handleRequestOtp = async (e) => {
    e.preventDefault();
    if (!form.phone || form.phone.length < 10) { setError("Enter a valid 10-digit phone number"); return; }
    setLoading(true); setError("");
    try {
      const res = await fetch("http://localhost:8000/auth/otp/request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: form.phone, role: selectedRole.id }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.detail || "Phone not registered. Contact your school admin."); return; }
      if (data.dev_otp) setDevOtp(data.dev_otp);
      setStep("otp");
    } catch { setError("Cannot connect to server. Is the backend running?"); }
    finally { setLoading(false); }
  };

  // ── Phone OTP: verify ──
  const handleVerifyOtp = async (e) => {
    e.preventDefault();
    if (!form.otp || form.otp.length < 4) { setError("Enter the OTP"); return; }
    setLoading(true); setError("");
    try {
      const res = await fetch("http://localhost:8000/auth/otp/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: form.phone, otp: form.otp, role: selectedRole.id }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.detail || "Invalid OTP"); return; }
      login({ token: data.access_token, id: data.user_id, role: data.role, name: data.name, avatar: data.avatar });
      navigate(`/${data.role}`);
    } catch { setError("Cannot connect to server."); }
    finally { setLoading(false); }
  };

  // ── Email + password ──
  const handleEmailSubmit = async (e) => {
    e.preventDefault();
    setError("");
    if (tab === "register" && form.password !== form.confirmPassword) { setError("Passwords do not match"); return; }
    if (form.password.length < 6) { setError("Password must be at least 6 characters"); return; }
    setLoading(true);
    try {
      const endpoint = tab === "login" ? "/auth/login" : "/auth/register";
      const body = tab === "login"
        ? { email: form.email, password: form.password, role: selectedRole.id }
        : { name: form.name, email: form.email, password: form.password, role: selectedRole.id };
      const res = await fetch(`http://localhost:8000${endpoint}`, {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.detail || "Something went wrong"); return; }
      login({ token: data.access_token, id: data.user_id, role: data.role, name: data.name, avatar: data.avatar });
      navigate(`/${data.role}`);
    } catch { setError("Cannot connect to server. Is the backend running?"); }
    finally { setLoading(false); }
  };

  return (
    <div className="min-h-screen bg-[#f6f6f8] flex items-center justify-center px-4" style={{ fontFamily:"'Lexend', sans-serif" }}>
      <div className="w-full max-w-md">

        {/* Logo */}
        <div className="flex flex-col items-center mb-8">
          <div className="size-14 bg-[#695be6] rounded-2xl flex items-center justify-center text-white mb-3 shadow-lg shadow-[#695be6]/30">
            <span className="material-symbols-outlined text-3xl">school</span>
          </div>
          <h1 className="text-2xl font-black text-[#100e1a] tracking-tight">VinSchool</h1>
          <p className="text-gray-500 text-sm mt-1">Smart School Management</p>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">

          {/* ── Role selection ── */}
          {step === "role" && (
            <>
              <div className="flex bg-gray-100 rounded-xl p-1 mb-6">
                {["login","register"].map((t) => (
                  <button key={t} onClick={() => { setTab(t); setError(""); }}
                    className={`flex-1 py-2 rounded-lg text-sm font-bold transition-all capitalize ${tab===t ? "bg-white text-[#695be6] shadow-sm" : "text-gray-500 hover:text-gray-700"}`}>
                    {t === "login" ? "Sign In" : "Register"}
                  </button>
                ))}
              </div>
              <h2 className="text-xl font-bold text-[#100e1a] mb-1">{tab==="login" ? "Welcome back" : "Create account"}</h2>
              <p className="text-gray-500 text-sm mb-6">Select your role to continue</p>
              <div className="grid grid-cols-2 gap-3">
                {ROLES.map((role) => (
                  <button key={role.id} onClick={() => handleRoleSelect(role)}
                    className={`bg-gradient-to-br ${role.color} text-white rounded-xl p-4 flex flex-col items-center gap-2 hover:scale-[1.03] active:scale-[0.98] transition-transform shadow-sm`}>
                    <span className="material-symbols-outlined text-3xl">{role.icon}</span>
                    <span className="font-bold text-sm">{role.label}</span>
                  </button>
                ))}
              </div>
            </>
          )}

          {/* ── Phone form (students) ── */}
          {step === "form" && isPhoneRole && (
            <>
              <button onClick={() => { setStep("role"); setError(""); }} className="flex items-center gap-1 text-gray-400 text-sm mb-4 hover:text-gray-600">
                <span className="material-symbols-outlined text-base">arrow_back</span> Back
              </button>
              <div className={`inline-flex items-center gap-2 bg-gradient-to-r ${selectedRole.color} text-white px-3 py-1.5 rounded-full text-xs font-bold mb-4`}>
                <span className="material-symbols-outlined text-sm">{selectedRole.icon}</span>{selectedRole.label}
              </div>
              <h2 className="text-xl font-bold text-[#100e1a] mb-1">Enter your phone</h2>
              <p className="text-gray-500 text-sm mb-5">We'll send you a one-time password</p>
              <form onSubmit={handleRequestOtp} className="flex flex-col gap-4">
                <div className="flex items-center border-2 border-gray-200 rounded-xl overflow-hidden focus-within:border-[#695be6] transition-colors">
                  <span className="px-3 text-gray-400 font-medium text-sm border-r border-gray-200 py-3">+91</span>
                  <input type="tel" maxLength={10} value={form.phone} onChange={f("phone")}
                    placeholder="10-digit mobile number" autoFocus
                    className="flex-1 px-3 py-3 text-sm outline-none bg-transparent" />
                </div>
                {error && <p className="text-red-500 text-xs">{error}</p>}
                <button type="submit" disabled={loading}
                  className="w-full py-3 bg-[#695be6] text-white font-bold rounded-xl hover:bg-[#5a4dd4] disabled:opacity-60 transition-colors flex items-center justify-center gap-2">
                  {loading ? <span className="size-4 border-2 border-white/40 border-t-white rounded-full animate-spin"/> : null}
                  {loading ? "Sending..." : "Send OTP"}
                </button>
              </form>
            </>
          )}

          {/* ── OTP verify (students) ── */}
          {step === "otp" && isPhoneRole && (
            <>
              <button onClick={() => { setStep("form"); setError(""); setForm((p) => ({...p, otp:""})); }} className="flex items-center gap-1 text-gray-400 text-sm mb-4 hover:text-gray-600">
                <span className="material-symbols-outlined text-base">arrow_back</span> Back
              </button>
              <h2 className="text-xl font-bold text-[#100e1a] mb-1">Verify OTP</h2>
              <p className="text-gray-500 text-sm mb-5">Sent to <span className="font-semibold text-[#100e1a]">+91 {form.phone}</span></p>
              {devOtp && (
                <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-2 mb-4 flex items-center gap-2">
                  <span className="material-symbols-outlined text-amber-500 text-sm">developer_mode</span>
                  <p className="text-xs text-amber-700">Dev OTP: <span className="font-mono font-black text-base">{devOtp}</span></p>
                </div>
              )}
              <form onSubmit={handleVerifyOtp} className="flex flex-col gap-4">
                <input type="text" inputMode="numeric" maxLength={6} value={form.otp} onChange={f("otp")} autoFocus
                  placeholder="Enter OTP"
                  className="w-full text-center text-2xl font-black tracking-[0.5em] border-2 border-gray-200 rounded-xl py-4 outline-none focus:border-[#695be6] transition-colors" />
                {error && <p className="text-red-500 text-xs text-center">{error}</p>}
                <button type="submit" disabled={loading || form.otp.length < 4}
                  className="w-full py-3 bg-[#695be6] text-white font-bold rounded-xl hover:bg-[#5a4dd4] disabled:opacity-60 transition-colors flex items-center justify-center gap-2">
                  {loading ? <span className="size-4 border-2 border-white/40 border-t-white rounded-full animate-spin"/> : null}
                  {loading ? "Verifying..." : "Verify & Login"}
                </button>
              </form>
            </>
          )}

          {/* ── Email + password form (teacher / parent / admin) ── */}
          {step === "form" && !isPhoneRole && (
            <>
              <button onClick={() => { setStep("role"); setError(""); }} className="flex items-center gap-1 text-gray-400 text-sm mb-4 hover:text-gray-600">
                <span className="material-symbols-outlined text-base">arrow_back</span> Back
              </button>
              <div className={`inline-flex items-center gap-2 bg-gradient-to-r ${selectedRole.color} text-white px-3 py-1.5 rounded-full text-xs font-bold mb-4`}>
                <span className="material-symbols-outlined text-sm">{selectedRole.icon}</span>{selectedRole.label}
              </div>
              <h2 className="text-xl font-bold text-[#100e1a] mb-1">{tab==="login" ? "Sign in" : "Create account"}</h2>
              <p className="text-gray-500 text-sm mb-5">{tab==="login" ? "Enter your credentials" : "Fill in your details"}</p>
              <form onSubmit={handleEmailSubmit} className="flex flex-col gap-3">
                {tab === "register" && (
                  <div className="flex flex-col gap-1">
                    <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Full Name</label>
                    <input type="text" value={form.name} onChange={f("name")} placeholder="Your full name" required
                      className="border-2 border-gray-200 rounded-xl px-4 py-3 text-sm outline-none focus:border-[#695be6] transition-colors" />
                  </div>
                )}
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Email</label>
                  <input type="email" value={form.email} onChange={f("email")} placeholder="you@example.com" required autoFocus
                    className="border-2 border-gray-200 rounded-xl px-4 py-3 text-sm outline-none focus:border-[#695be6] transition-colors" />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Password</label>
                  <div className="relative">
                    <input type={showPass ? "text" : "password"} value={form.password} onChange={f("password")} placeholder="Min. 6 characters" required
                      className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 pr-11 text-sm outline-none focus:border-[#695be6] transition-colors" />
                    <button type="button" onClick={() => setShowPass((p) => !p)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                      <span className="material-symbols-outlined text-xl">{showPass ? "visibility_off" : "visibility"}</span>
                    </button>
                  </div>
                </div>
                {tab === "register" && (
                  <div className="flex flex-col gap-1">
                    <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Confirm Password</label>
                    <input type={showPass ? "text" : "password"} value={form.confirmPassword} onChange={f("confirmPassword")} placeholder="Repeat password" required
                      className="border-2 border-gray-200 rounded-xl px-4 py-3 text-sm outline-none focus:border-[#695be6] transition-colors" />
                  </div>
                )}
                {error && (
                  <div className="flex items-center gap-2 bg-red-50 border border-red-200 rounded-xl px-4 py-3">
                    <span className="material-symbols-outlined text-red-500 text-base">error</span>
                    <p className="text-red-600 text-xs font-medium">{error}</p>
                  </div>
                )}
                <button type="submit" disabled={loading}
                  className="w-full py-3 bg-[#695be6] text-white font-bold rounded-xl hover:bg-[#5a4dd4] disabled:opacity-60 mt-1 flex items-center justify-center gap-2 transition-colors">
                  {loading ? <span className="size-4 border-2 border-white/40 border-t-white rounded-full animate-spin"/> : null}
                  {loading ? (tab==="login" ? "Signing in..." : "Creating...") : (tab==="login" ? "Sign In" : "Create Account")}
                </button>
                <p className="text-center text-xs text-gray-400 mt-1">
                  {tab==="login" ? "No account? " : "Already have one? "}
                  <button type="button" onClick={() => { setTab(tab==="login"?"register":"login"); setError(""); }}
                    className="text-[#695be6] font-semibold hover:underline">
                    {tab==="login" ? "Register" : "Sign In"}
                  </button>
                </p>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
