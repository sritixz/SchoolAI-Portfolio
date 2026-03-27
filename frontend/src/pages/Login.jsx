import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { getUserByPhone } from "../data/mockData";

const ROLES = [
  { id: "student", label: "Student", icon: "school", color: "from-pink-400 to-rose-500" },
  { id: "parent", label: "Parent", icon: "family_restroom", color: "from-emerald-400 to-teal-500" },
  { id: "teacher", label: "Teacher", icon: "person_book", color: "from-blue-400 to-indigo-500" },
  { id: "schooladmin", label: "School Admin", icon: "admin_panel_settings", color: "from-amber-400 to-orange-500" },
];

export default function Login() {
  const navigate = useNavigate();
  const { login } = useAuth();

  const [step, setStep] = useState("role"); // role | phone | otp
  const [selectedRole, setSelectedRole] = useState(null);
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState(["", "", "", ""]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleRoleSelect = (role) => {
    setSelectedRole(role);
    setStep("phone");
    setError("");
  };

  const handleSendOtp = (e) => {
    e.preventDefault();
    setError("");
    if (phone.length !== 10) {
      setError("Enter a valid 10-digit phone number");
      return;
    }
    const found = getUserByPhone(phone, selectedRole.id);
    if (!found) {
      setError("No account found for this number and role");
      return;
    }
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      setStep("otp");
    }, 800);
  };

  const handleOtpChange = (val, idx) => {
    if (!/^\d?$/.test(val)) return;
    const next = [...otp];
    next[idx] = val;
    setOtp(next);
    if (val && idx < 3) {
      document.getElementById(`otp-${idx + 1}`)?.focus();
    }
  };

  const handleOtpKeyDown = (e, idx) => {
    if (e.key === "Backspace" && !otp[idx] && idx > 0) {
      document.getElementById(`otp-${idx - 1}`)?.focus();
    }
  };

  const handleVerifyOtp = (e) => {
    e.preventDefault();
    setError("");
    const enteredOtp = otp.join("");
    const user = getUserByPhone(phone, selectedRole.id);
    if (!user || user.otp !== enteredOtp) {
      setError("Invalid OTP. Try 1234 for demo.");
      return;
    }
    setLoading(true);
    setTimeout(() => {
      login(user);
      navigate(`/${user.role}`);
    }, 600);
  };

  return (
    <div className="min-h-screen bg-[#f6f6f8] flex items-center justify-center px-4">
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

          {/* STEP: Role Selection */}
          {step === "role" && (
            <>
              <h2 className="text-xl font-bold text-[#100e1a] mb-1">Welcome back</h2>
              <p className="text-gray-500 text-sm mb-6">Select your role to continue</p>
              <div className="grid grid-cols-2 gap-3">
                {ROLES.map((role) => (
                  <button
                    key={role.id}
                    onClick={() => handleRoleSelect(role)}
                    className={`bg-gradient-to-br ${role.color} text-white rounded-xl p-4 flex flex-col items-center gap-2 hover:scale-[1.03] transition-transform shadow-sm`}
                  >
                    <span className="material-symbols-outlined text-3xl">{role.icon}</span>
                    <span className="font-bold text-sm">{role.label}</span>
                  </button>
                ))}
              </div>
            </>
          )}

          {/* STEP: Phone */}
          {step === "phone" && (
            <>
              <button
                onClick={() => { setStep("role"); setPhone(""); setError(""); }}
                className="flex items-center gap-1 text-gray-400 text-sm mb-4 hover:text-gray-600"
              >
                <span className="material-symbols-outlined text-base">arrow_back</span> Back
              </button>
              <div className={`inline-flex items-center gap-2 bg-gradient-to-r ${selectedRole.color} text-white px-3 py-1.5 rounded-full text-xs font-bold mb-4`}>
                <span className="material-symbols-outlined text-sm">{selectedRole.icon}</span>
                {selectedRole.label}
              </div>
              <h2 className="text-xl font-bold text-[#100e1a] mb-1">Enter your phone</h2>
              <p className="text-gray-500 text-sm mb-5">We'll send you a one-time password</p>
              <form onSubmit={handleSendOtp} className="flex flex-col gap-4">
                <div className="flex items-center border-2 border-gray-200 rounded-xl overflow-hidden focus-within:border-[#695be6] transition-colors">
                  <span className="px-3 text-gray-400 font-medium text-sm border-r border-gray-200 py-3">+91</span>
                  <input
                    type="tel"
                    maxLength={10}
                    value={phone}
                    onChange={(e) => setPhone(e.target.value.replace(/\D/g, ""))}
                    placeholder="10-digit mobile number"
                    className="flex-1 px-3 py-3 text-sm outline-none bg-transparent"
                    autoFocus
                  />
                </div>
                {error && <p className="text-red-500 text-xs">{error}</p>}
                <p className="text-xs text-gray-400">Demo: use <span className="font-mono font-bold">9876543210</span> for Student</p>
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3 bg-[#695be6] text-white font-bold rounded-xl hover:bg-[#5a4dd4] transition-colors disabled:opacity-60"
                >
                  {loading ? "Sending..." : "Send OTP"}
                </button>
              </form>
            </>
          )}

          {/* STEP: OTP */}
          {step === "otp" && (
            <>
              <button
                onClick={() => { setStep("phone"); setOtp(["", "", "", ""]); setError(""); }}
                className="flex items-center gap-1 text-gray-400 text-sm mb-4 hover:text-gray-600"
              >
                <span className="material-symbols-outlined text-base">arrow_back</span> Back
              </button>
              <h2 className="text-xl font-bold text-[#100e1a] mb-1">Verify OTP</h2>
              <p className="text-gray-500 text-sm mb-5">
                Sent to <span className="font-semibold text-[#100e1a]">+91 {phone}</span>
              </p>
              <form onSubmit={handleVerifyOtp} className="flex flex-col gap-4">
                <div className="flex gap-3 justify-center">
                  {otp.map((digit, idx) => (
                    <input
                      key={idx}
                      id={`otp-${idx}`}
                      type="text"
                      inputMode="numeric"
                      maxLength={1}
                      value={digit}
                      onChange={(e) => handleOtpChange(e.target.value, idx)}
                      onKeyDown={(e) => handleOtpKeyDown(e, idx)}
                      className="size-14 text-center text-xl font-bold border-2 border-gray-200 rounded-xl focus:border-[#695be6] outline-none transition-colors"
                      autoFocus={idx === 0}
                    />
                  ))}
                </div>
                {error && <p className="text-red-500 text-xs text-center">{error}</p>}
                <p className="text-xs text-gray-400 text-center">Demo OTP: <span className="font-mono font-bold">1234</span></p>
                <button
                  type="submit"
                  disabled={loading || otp.join("").length < 4}
                  className="w-full py-3 bg-[#695be6] text-white font-bold rounded-xl hover:bg-[#5a4dd4] transition-colors disabled:opacity-60"
                >
                  {loading ? "Verifying..." : "Verify & Login"}
                </button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
