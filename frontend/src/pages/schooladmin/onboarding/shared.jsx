// Shared UI primitives for the Onboarding tabs
export const API = "http://localhost:8000";

export const SUBJECT_OPTIONS = [
  "Mathematics","Physics","Chemistry","Biology","History","English",
  "Computer Science","Geography","Economics","Physical Education","Art","Music",
];
export const GRADE_OPTIONS   = ["6","7","8","9","10","11","12"];
export const SECTION_OPTIONS = ["A","B","C","D","E","F"];

export function Spinner() {
  return <span className="size-4 border-2 border-white/40 border-t-white rounded-full animate-spin inline-block" />;
}

export function Badge({ label, color = "gray" }) {
  const map = {
    gray:   "bg-gray-100 text-gray-600",
    green:  "bg-green-100 text-green-700",
    blue:   "bg-blue-100 text-blue-700",
    amber:  "bg-amber-100 text-amber-700",
    red:    "bg-red-100 text-red-600",
    purple: "bg-purple-100 text-purple-700",
  };
  return (
    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${map[color] || map.gray}`}>
      {label}
    </span>
  );
}

export function ErrorBox({ msg, onClose }) {
  if (!msg) return null;
  return (
    <div className="flex items-center gap-2 bg-red-50 border border-red-200 rounded-xl px-4 py-3 mb-4">
      <span className="material-symbols-outlined text-red-500 text-base">error</span>
      <p className="text-red-600 text-sm flex-1">{msg}</p>
      <button onClick={onClose}>
        <span className="material-symbols-outlined text-red-400 text-base">close</span>
      </button>
    </div>
  );
}

export function SuccessBox({ msg }) {
  if (!msg) return null;
  return (
    <div className="flex items-center gap-2 bg-green-50 border border-green-200 rounded-xl px-4 py-3 mb-4">
      <span className="material-symbols-outlined text-green-500 text-base">check_circle</span>
      <p className="text-green-700 text-sm">{msg}</p>
    </div>
  );
}

export function Input({ label, value, onChange, type = "text", placeholder = "", required = false, className = "" }) {
  return (
    <div className={className}>
      <label className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-1 block">
        {label}{required && " *"}
      </label>
      <input
        type={type} value={value} onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder} required={required}
        className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none focus:border-[#695be6] transition-colors"
      />
    </div>
  );
}

export function Select({ label, value, onChange, options, placeholder = "Select...", disabled = false }) {
  return (
    <div>
      {label && (
        <label className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-1 block">{label}</label>
      )}
      <select
        value={value} onChange={(e) => onChange(e.target.value)} disabled={disabled}
        className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none focus:border-[#695be6] bg-white disabled:opacity-50"
      >
        <option value="">{placeholder}</option>
        {options.map((o) => (
          <option key={o.value ?? o} value={o.value ?? o}>{o.label ?? o}</option>
        ))}
      </select>
    </div>
  );
}

export function PrimaryBtn({ onClick, disabled, loading, icon, children, className = "" }) {
  return (
    <button
      onClick={onClick} disabled={disabled || loading}
      className={`flex items-center justify-center gap-2 bg-[#695be6] text-white font-bold py-2.5 px-4 rounded-xl hover:bg-[#5a4dd4] disabled:opacity-50 transition-colors ${className}`}
    >
      {loading
        ? <Spinner />
        : icon ? <span className="material-symbols-outlined text-base">{icon}</span> : null}
      {children}
    </button>
  );
}

export function DangerBtn({ onClick, children }) {
  return (
    <button
      onClick={onClick}
      className="flex items-center gap-1 text-red-400 hover:text-red-600 text-xs font-bold transition-colors"
    >
      <span className="material-symbols-outlined text-base">delete</span>
      {children}
    </button>
  );
}

export function SubjectPills({ selected, onChange }) {
  const toggle = (s) =>
    onChange(selected.includes(s) ? selected.filter((x) => x !== s) : [...selected, s]);
  return (
    <div className="flex flex-wrap gap-1.5">
      {SUBJECT_OPTIONS.map((s) => (
        <button
          key={s} type="button" onClick={() => toggle(s)}
          className={`px-2.5 py-1 rounded-full text-[10px] font-bold border-2 transition-all ${
            selected.includes(s)
              ? "border-[#695be6] bg-[#695be6] text-white"
              : "border-gray-200 text-gray-500 hover:border-gray-300"
          }`}
        >
          {s}
        </button>
      ))}
    </div>
  );
}

export function CsvUploadBox({ onFile, loading, result, rowKey = "email" }) {
  return (
    <div>
      <div className="border-2 border-dashed border-gray-200 rounded-xl p-8 text-center mb-4">
        <span className="material-symbols-outlined text-4xl text-gray-300 mb-2 block">upload_file</span>
        <label className="cursor-pointer bg-[#695be6] text-white text-sm font-bold px-5 py-2.5 rounded-xl hover:bg-[#5a4dd4] transition-colors">
          {loading ? "Uploading…" : "Choose CSV File"}
          <input type="file" accept=".csv" className="hidden" onChange={(e) => e.target.files[0] && onFile(e.target.files[0])} />
        </label>
        <p className="text-xs text-gray-400 mt-3">
          Default password: <code className="bg-gray-100 px-1 rounded">School@123</code> — users must change on first login
        </p>
      </div>
      {result && (
        <div className="space-y-1 max-h-48 overflow-y-auto">
          <p className="text-xs font-bold text-gray-500 mb-2">
            {result.created} created · {result.results?.length} total rows
          </p>
          {result.results?.map((r, i) => (
            <div key={i} className="flex items-center justify-between text-xs py-1 border-b border-gray-50">
              <span className="text-gray-700 truncate flex-1">{r[rowKey] || r.name || r.phone}</span>
              <Badge
                label={r.status}
                color={r.status === "created" ? "green" : r.status === "already_exists" ? "gray" : "red"}
              />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
