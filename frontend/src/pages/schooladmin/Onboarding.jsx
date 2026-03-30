/**
 * School Admin Onboarding — complete school structure management
 * Tabs: Grades → Sections → Teachers → Students → Assignments
 */
import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";

// ── Shared primitives ────────────────────────────────────────
const API = "http://localhost:8000";

function Spinner() {
  return <span className="size-4 border-2 border-white/40 border-t-white rounded-full animate-spin inline-block" />;
}

function Badge({ label, color = "gray" }) {
  const map = {
    gray:   "bg-gray-100 text-gray-600",
    green:  "bg-green-100 text-green-700",
    blue:   "bg-blue-100 text-blue-700",
    amber:  "bg-amber-100 text-amber-700",
    red:    "bg-red-100 text-red-600",
    purple: "bg-purple-100 text-purple-700",
  };
  return <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${map[color] || map.gray}`}>{label}</span>;
}

function ErrorBox({ msg, onClose }) {
  if (!msg) return null;
  return (
    <div className="flex items-center gap-2 bg-red-50 border border-red-200 rounded-xl px-4 py-3 mb-4">
      <span className="material-symbols-outlined text-red-500 text-base">error</span>
      <p className="text-red-600 text-sm flex-1">{msg}</p>
      <button onClick={onClose}><span className="material-symbols-outlined text-red-400 text-base">close</span></button>
    </div>
  );
}

function SuccessBox({ msg }) {
  if (!msg) return null;
  return (
    <div className="flex items-center gap-2 bg-green-50 border border-green-200 rounded-xl px-4 py-3 mb-4">
      <span className="material-symbols-outlined text-green-500 text-base">check_circle</span>
      <p className="text-green-700 text-sm">{msg}</p>
    </div>
  );
}

function Input({ label, value, onChange, type = "text", placeholder = "", required = false, className = "" }) {
  return (
    <div className={className}>
      <label className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-1 block">{label}{required && " *"}</label>
      <input type={type} value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} required={required}
        className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none focus:border-[#695be6] transition-colors" />
    </div>
  );
}

function Select({ label, value, onChange, options, placeholder = "Select...", disabled = false }) {
  return (
    <div>
      <label className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-1 block">{label}</label>
      <select value={value} onChange={(e) => onChange(e.target.value)} disabled={disabled}
        className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none focus:border-[#695be6] bg-white disabled:opacity-50">
        <option value="">{placeholder}</option>
        {options.map((o) => (
          <option key={o.value ?? o} value={o.value ?? o}>{o.label ?? o}</option>
        ))}
      </select>
    </div>
  );
}

function PrimaryBtn({ onClick, disabled, loading, icon, children, className = "" }) {
  return (
    <button onClick={onClick} disabled={disabled || loading}
      className={`flex items-center justify-center gap-2 bg-[#695be6] text-white font-bold py-2.5 px-4 rounded-xl hover:bg-[#5a4dd4] disabled:opacity-50 transition-colors ${className}`}>
      {loading ? <Spinner /> : icon ? <span className="material-symbols-outlined text-base">{icon}</span> : null}
      {children}
    </button>
  );
}

function DangerBtn({ onClick, children }) {
  return (
    <button onClick={onClick}
      className="flex items-center gap-1 text-red-400 hover:text-red-600 text-xs font-bold transition-colors">
      <span className="material-symbols-outlined text-base">delete</span>{children}
    </button>
  );
}

const SUBJECT_OPTIONS = ["Mathematics","Physics","Chemistry","Biology","History","English","Computer Science","Geography","Economics","Physical Education","Art","Music"];
const GRADE_OPTIONS   = ["6","7","8","9","10","11","12"];
const SECTION_OPTIONS = ["A","B","C","D","E","F"];

// ── Grades tab ───────────────────────────────────────────────
function GradesTab({ token, apiFetch }) {
  const [grades,   setGrades]   = useState([]);
  const [form,     setForm]     = useState({ grade_number: "", subjects: [] });
  const [editId,   setEditId]   = useState(null);
  const [editSubs, setEditSubs] = useState([]);
  const [saving,   setSaving]   = useState(false);
  const [error,    setError]    = useState("");
  const [success,  setSuccess]  = useState("");

  const load = useCallback(() =>
    apiFetch("/schooladmin/grades").then(r => r.json()).then(d => { if (Array.isArray(d)) setGrades(d); }).catch(() => {}),
  [apiFetch]);

  useEffect(() => { load(); }, [load]);

  const toggleSub = (s) => setForm(p => ({ ...p, subjects: p.subjects.includes(s) ? p.subjects.filter(x => x !== s) : [...p.subjects, s] }));
  const toggleEditSub = (s) => setEditSubs(p => p.includes(s) ? p.filter(x => x !== s) : [...p, s]);

  const handleAdd = async () => {
    if (!form.grade_number) { setError("Select a grade number"); return; }
    setSaving(true); setError(""); setSuccess("");
    try {
      const res = await apiFetch("/schooladmin/grades", { method: "POST", body: JSON.stringify(form) });
      const d = await res.json();
      if (!res.ok) { setError(d.detail || "Failed"); return; }
      setSuccess(`Grade ${form.grade_number} created`);
      setForm({ grade_number: "", subjects: [] });
      load();
    } catch { setError("Network error"); }
    finally { setSaving(false); }
  };

  const handleUpdate = async (id) => {
    setSaving(true); setError("");
    try {
      await apiFetch(`/schooladmin/grades/${id}`, { method: "PATCH", body: JSON.stringify({ subjects: editSubs }) });
      setEditId(null);
      setSuccess("Grade updated");
      load();
    } catch { setError("Update failed"); }
    finally { setSaving(false); }
  };

  const handleDelete = async (id, gn) => {
    if (!confirm(`Delete Grade ${gn}? This will fail if sections exist.`)) return;
    try {
      const res = await apiFetch(`/schooladmin/grades/${id}`, { method: "DELETE" });
      const d = await res.json();
      if (!res.ok) { setError(d.detail || "Cannot delete"); return; }
      load();
    } catch { setError("Delete failed"); }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Add form */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
        <h3 className="font-black text-sm mb-4">Add Grade</h3>
        <ErrorBox msg={error} onClose={() => setError("")} />
        <SuccessBox msg={success} />
        <div className="space-y-4">
          <Select label="Grade Number *" value={form.grade_number} onChange={v => setForm(p => ({...p, grade_number: v}))}
            options={GRADE_OPTIONS} placeholder="Select grade..." />
          <div>
            <label className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-2 block">Subjects</label>
            <div className="flex flex-wrap gap-1.5">
              {SUBJECT_OPTIONS.map(s => (
                <button key={s} onClick={() => toggleSub(s)}
                  className={`px-2.5 py-1 rounded-full text-[10px] font-bold border-2 transition-all ${form.subjects.includes(s) ? "border-[#695be6] bg-[#695be6] text-white" : "border-gray-200 text-gray-500 hover:border-gray-300"}`}>
                  {s}
                </button>
              ))}
            </div>
          </div>
          <PrimaryBtn onClick={handleAdd} loading={saving} icon="add" className="w-full">
            Add Grade {form.grade_number}
          </PrimaryBtn>
        </div>
      </div>

      {/* Grades list */}
      <div className="lg:col-span-2 space-y-3">
        <h3 className="font-black text-base">Configured Grades ({grades.length})</h3>
        {grades.length === 0 ? (
          <div className="text-center py-12 text-gray-400 bg-white rounded-xl border border-gray-100">
            <span className="material-symbols-outlined text-4xl mb-2 block">school</span>
            <p>No grades yet. Add your first grade.</p>
          </div>
        ) : grades.map(g => (
          <div key={g._id} className="bg-white border border-gray-100 rounded-xl p-4 shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-3">
                <div className="size-10 rounded-xl bg-[#695be6]/10 flex items-center justify-center text-[#695be6] font-black text-lg">{g.grade_number}</div>
                <div>
                  <p className="font-black">Grade {g.grade_number}</p>
                  <p className="text-xs text-gray-400">{(g.subjects || []).length} subjects</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <button onClick={() => { setEditId(g._id); setEditSubs(g.subjects || []); }}
                  className="text-xs text-[#695be6] font-bold hover:underline flex items-center gap-1">
                  <span className="material-symbols-outlined text-sm">edit</span>Edit
                </button>
                <DangerBtn onClick={() => handleDelete(g._id, g.grade_number)}>Delete</DangerBtn>
              </div>
            </div>
            {editId === g._id ? (
              <div className="space-y-3 pt-3 border-t border-gray-100">
                <div className="flex flex-wrap gap-1.5">
                  {SUBJECT_OPTIONS.map(s => (
                    <button key={s} onClick={() => toggleEditSub(s)}
                      className={`px-2.5 py-1 rounded-full text-[10px] font-bold border-2 transition-all ${editSubs.includes(s) ? "border-[#695be6] bg-[#695be6] text-white" : "border-gray-200 text-gray-500"}`}>
                      {s}
                    </button>
                  ))}
                </div>
                <div className="flex gap-2">
                  <PrimaryBtn onClick={() => handleUpdate(g._id)} loading={saving}>Save</PrimaryBtn>
                  <button onClick={() => setEditId(null)} className="px-4 py-2 border border-gray-200 rounded-xl text-sm font-bold text-gray-500 hover:bg-gray-50">Cancel</button>
                </div>
              </div>
            ) : (
              <div className="flex flex-wrap gap-1.5">
                {(g.subjects || []).map(s => (
                  <span key={s} className="text-[10px] bg-[#695be6]/10 text-[#695be6] font-bold px-2 py-0.5 rounded-full">{s}</span>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Sections tab ─────────────────────────────────────────────
function SectionsTab({ apiFetch }) {
  const [grades,    setGrades]    = useState([]);
  const [sections,  setSections]  = useState([]);
  const [form,      setForm]      = useState({ grade_number: "", section_name: "" });
  const [saving,    setSaving]    = useState(false);
  const [error,     setError]     = useState("");
  const [success,   setSuccess]   = useState("");
  const [filterGrade, setFilterGrade] = useState("");

  const loadGrades   = useCallback(() => apiFetch("/schooladmin/grades").then(r=>r.json()).then(d=>{if(Array.isArray(d))setGrades(d);}).catch(()=>{}), [apiFetch]);
  const loadSections = useCallback(() => {
    const q = filterGrade ? `?grade_id=${filterGrade}` : "";
    apiFetch(`/schooladmin/sections${q}`).then(r=>r.json()).then(d=>{if(Array.isArray(d))setSections(d);}).catch(()=>{});
  }, [apiFetch, filterGrade]);

  useEffect(() => { loadGrades(); }, [loadGrades]);
  useEffect(() => { loadSections(); }, [loadSections]);

  const handleAdd = async () => {
    if (!form.grade_number || !form.section_name) { setError("Select grade and section"); return; }
    setSaving(true); setError(""); setSuccess("");
    try {
      const res = await apiFetch("/schooladmin/sections", { method: "POST", body: JSON.stringify(form) });
      const d = await res.json();
      if (!res.ok) { setError(d.detail || "Failed"); return; }
      setSuccess(`${d.class_name} created`);
      setForm(p => ({ ...p, section_name: "" }));
      loadSections();
    } catch { setError("Network error"); }
    finally { setSaving(false); }
  };

  const handleDelete = async (id, name) => {
    if (!confirm(`Delete ${name}? Students must be transferred first.`)) return;
    try {
      const res = await apiFetch(`/schooladmin/sections/${id}`, { method: "DELETE" });
      const d = await res.json();
      if (!res.ok) { setError(d.detail || "Cannot delete"); return; }
      loadSections();
    } catch { setError("Delete failed"); }
  };

  // Group by grade
  const byGrade = sections.reduce((acc, s) => { (acc[s.grade_number] = acc[s.grade_number] || []).push(s); return acc; }, {});

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
        <h3 className="font-black text-sm mb-4">Add Section</h3>
        <ErrorBox msg={error} onClose={() => setError("")} />
        <SuccessBox msg={success} />
        <div className="space-y-3">
          <Select label="Grade *" value={form.grade_number} onChange={v => setForm(p => ({...p, grade_number: v}))}
            options={grades.map(g => ({ value: g.grade_number, label: `Grade ${g.grade_number}` }))} placeholder="Select grade..." />
          <Select label="Section *" value={form.section_name} onChange={v => setForm(p => ({...p, section_name: v}))}
            options={SECTION_OPTIONS} placeholder="Select section..." />
          <PrimaryBtn onClick={handleAdd} loading={saving} icon="add" className="w-full">
            Add {form.grade_number ? `Grade ${form.grade_number}-${form.section_name || "?"}` : "Section"}
          </PrimaryBtn>
        </div>
        <div className="mt-6 pt-4 border-t border-gray-100">
          <p className="text-xs text-gray-400">Sections inherit subjects from their grade. Assign teachers per subject in the Assignments tab.</p>
        </div>
      </div>

      <div className="lg:col-span-2 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-black text-base">Sections ({sections.length})</h3>
          <Select label="" value={filterGrade} onChange={setFilterGrade}
            options={grades.map(g => ({ value: g._id, label: `Grade ${g.grade_number}` }))} placeholder="All Grades" />
        </div>
        {Object.keys(byGrade).sort((a,b) => +a - +b).map(gn => (
          <div key={gn}>
            <p className="text-xs font-black text-gray-400 uppercase tracking-wider mb-2">Grade {gn}</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
              {byGrade[gn].map(sec => (
                <div key={sec._id} className="bg-white border border-gray-100 rounded-xl p-4 shadow-sm">
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <p className="font-black text-lg">{sec.class_name}</p>
                      <p className="text-xs text-gray-400">{sec.student_count || 0} students · {sec.assignment_count || 0} subjects assigned</p>
                    </div>
                    <DangerBtn onClick={() => handleDelete(sec._id, sec.class_name)} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
        {sections.length === 0 && (
          <div className="text-center py-12 text-gray-400 bg-white rounded-xl border border-gray-100">
            <span className="material-symbols-outlined text-4xl mb-2 block">grid_view</span>
            <p>No sections yet. Create grades first, then add sections.</p>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Teachers tab ─────────────────────────────────────────────
function TeachersTab({ apiFetch, token }) {
  const [teachers, setTeachers] = useState([]);
  const [mode,     setMode]     = useState("list"); // list | add | csv
  const [form,     setForm]     = useState({ name:"", email:"", phone:"", employee_id:"", qualified_subjects:[] });
  const [editId,   setEditId]   = useState(null);
  const [editForm, setEditForm] = useState({});
  const [saving,   setSaving]   = useState(false);
  const [error,    setError]    = useState("");
  const [success,  setSuccess]  = useState("");
  const [csvResult,setCsvResult]= useState(null);
  const [resetPw,  setResetPw]  = useState({}); // { [id]: newPw }
  const [search,   setSearch]   = useState("");

  const load = useCallback(() =>
    apiFetch("/schooladmin/teachers").then(r=>r.json()).then(d=>{if(Array.isArray(d))setTeachers(d);}).catch(()=>{}),
  [apiFetch]);

  useEffect(() => { load(); }, [load]);

  const toggleSub = (s) => setForm(p => ({ ...p, qualified_subjects: p.qualified_subjects.includes(s) ? p.qualified_subjects.filter(x=>x!==s) : [...p.qualified_subjects, s] }));

  const handleAdd = async () => {
    if (!form.name || !form.email) { setError("Name and email required"); return; }
    setSaving(true); setError(""); setSuccess("");
    try {
      const res = await apiFetch("/schooladmin/teachers", { method: "POST", body: JSON.stringify(form) });
      const d = await res.json();
      if (!res.ok) { setError(d.detail || "Failed"); return; }
      setSuccess(`${form.name} added. Temp password: ${d.temp_password}`);
      setForm({ name:"", email:"", phone:"", employee_id:"", qualified_subjects:[] });
      setMode("list");
      load();
    } catch { setError("Network error"); }
    finally { setSaving(false); }
  };

  const handleUpdate = async () => {
    setSaving(true); setError("");
    try {
      await apiFetch(`/schooladmin/teachers/${editId}`, { method: "PATCH", body: JSON.stringify(editForm) });
      setEditId(null); setSuccess("Teacher updated"); load();
    } catch { setError("Update failed"); }
    finally { setSaving(false); }
  };

  const handleDeactivate = async (id, name) => {
    if (!confirm(`Deactivate ${name}?`)) return;
    try {
      await apiFetch(`/schooladmin/teachers/${id}`, { method: "DELETE" });
      setSuccess(`${name} deactivated`); load();
    } catch { setError("Failed"); }
  };

  const handleReset = async (id) => {
    try {
      const res = await apiFetch("/schooladmin/reset-credentials", { method: "POST", body: JSON.stringify({ user_id: id }) });
      const d = await res.json();
      setResetPw(p => ({ ...p, [id]: d.new_password }));
    } catch { setError("Reset failed"); }
  };

  const handleCsv = async (file) => {
    setSaving(true); setError("");
    const fd = new FormData();
    fd.append("file", file);
    try {
      const res = await fetch(`${API}/schooladmin/teachers/bulk-csv`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: fd,
      });
      const d = await res.json();
      setCsvResult(d);
      load();
    } catch { setError("CSV upload failed"); }
    finally { setSaving(false); }
  };

  const filtered = teachers.filter(t => !search || t.name.toLowerCase().includes(search.toLowerCase()) || t.email.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-2 bg-gray-100 rounded-xl px-3 py-2 flex-1 max-w-xs">
          <span className="material-symbols-outlined text-gray-400 text-lg">search</span>
          <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search teachers..."
            className="bg-transparent text-sm outline-none w-full" />
        </div>
        <div className="flex gap-2">
          <button onClick={() => setMode(mode === "add" ? "list" : "add")}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all ${mode==="add" ? "bg-gray-200 text-gray-700" : "bg-[#695be6] text-white hover:bg-[#5a4dd4]"}`}>
            <span className="material-symbols-outlined text-base">{mode==="add" ? "close" : "person_add"}</span>
            {mode==="add" ? "Cancel" : "Add Teacher"}
          </button>
          <button onClick={() => setMode(mode === "csv" ? "list" : "csv")}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold border-2 transition-all ${mode==="csv" ? "border-gray-300 text-gray-500" : "border-[#695be6] text-[#695be6] hover:bg-[#695be6]/5"}`}>
            <span className="material-symbols-outlined text-base">upload_file</span>
            Bulk CSV
          </button>
        </div>
      </div>

      <ErrorBox msg={error} onClose={() => setError("")} />
      <SuccessBox msg={success} />

      {/* Add form */}
      {mode === "add" && (
        <div className="bg-white border border-gray-100 rounded-xl p-5 shadow-sm">
          <h3 className="font-black text-sm mb-4">New Teacher — auto-password sent via email</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4">
            <Input label="Full Name *" value={form.name} onChange={v=>setForm(p=>({...p,name:v}))} required />
            <Input label="Email *" type="email" value={form.email} onChange={v=>setForm(p=>({...p,email:v}))} required />
            <Input label="Phone" value={form.phone} onChange={v=>setForm(p=>({...p,phone:v}))} />
            <Input label="Employee ID" value={form.employee_id} onChange={v=>setForm(p=>({...p,employee_id:v}))} />
          </div>
          <div className="mb-4">
            <label className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-2 block">Qualified Subjects</label>
            <div className="flex flex-wrap gap-1.5">
              {SUBJECT_OPTIONS.map(s => (
                <button key={s} onClick={() => toggleSub(s)}
                  className={`px-2.5 py-1 rounded-full text-[10px] font-bold border-2 transition-all ${form.qualified_subjects.includes(s) ? "border-[#695be6] bg-[#695be6] text-white" : "border-gray-200 text-gray-500"}`}>
                  {s}
                </button>
              ))}
            </div>
          </div>
          <PrimaryBtn onClick={handleAdd} loading={saving} icon="person_add">Add Teacher</PrimaryBtn>
        </div>
      )}

      {/* CSV upload */}
      {mode === "csv" && (
        <div className="bg-white border border-gray-100 rounded-xl p-5 shadow-sm">
          <h3 className="font-black text-sm mb-2">Bulk Upload Teachers</h3>
          <p className="text-xs text-gray-400 mb-4">CSV columns: <code className="bg-gray-100 px-1 rounded">name, email, phone, employee_id, qualified_subjects</code> (subjects semicolon-separated)</p>
          <div className="border-2 border-dashed border-gray-200 rounded-xl p-8 text-center mb-4">
            <span className="material-symbols-outlined text-4xl text-gray-300 mb-2 block">upload_file</span>
            <label className="cursor-pointer bg-[#695be6] text-white text-sm font-bold px-5 py-2.5 rounded-xl hover:bg-[#5a4dd4] transition-colors">
              Choose CSV File
              <input type="file" accept=".csv" className="hidden" onChange={e => e.target.files[0] && handleCsv(e.target.files[0])} />
            </label>
            <p className="text-xs text-gray-400 mt-3">Default password: <code className="bg-gray-100 px-1 rounded">School@123</code> — users must change on first login</p>
          </div>
          {csvResult && (
            <div className="space-y-1 max-h-48 overflow-y-auto">
              <p className="text-xs font-bold text-gray-500 mb-2">{csvResult.created} created · {csvResult.results?.length} total rows</p>
              {csvResult.results?.map((r, i) => (
                <div key={i} className="flex items-center justify-between text-xs py-1 border-b border-gray-50">
                  <span className="text-gray-700 truncate flex-1">{r.email}</span>
                  <Badge label={r.status} color={r.status==="created"?"green":r.status==="already_exists"?"gray":"red"} />
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Teachers list */}
      <div className="space-y-2">
        {filtered.length === 0 ? (
          <div className="text-center py-12 text-gray-400 bg-white rounded-xl border border-gray-100">
            <span className="material-symbols-outlined text-4xl mb-2 block">person_book</span>
            <p>{search ? "No teachers match your search" : "No teachers yet"}</p>
          </div>
        ) : filtered.map(t => (
          <div key={t._id} className="bg-white border border-gray-100 rounded-xl p-4 shadow-sm">
            {editId === t._id ? (
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <Input label="Name" value={editForm.name || ""} onChange={v=>setEditForm(p=>({...p,name:v}))} />
                  <Input label="Phone" value={editForm.phone || ""} onChange={v=>setEditForm(p=>({...p,phone:v}))} />
                  <Input label="Employee ID" value={editForm.employee_id || ""} onChange={v=>setEditForm(p=>({...p,employee_id:v}))} />
                </div>
                <div className="flex gap-2">
                  <PrimaryBtn onClick={handleUpdate} loading={saving}>Save</PrimaryBtn>
                  <button onClick={() => setEditId(null)} className="px-4 py-2 border border-gray-200 rounded-xl text-sm font-bold text-gray-500">Cancel</button>
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-4">
                <div className="size-10 rounded-full bg-[#695be6]/10 flex items-center justify-center text-[#695be6] font-bold shrink-0">{t.name?.[0]}</div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-bold text-sm">{t.name}</p>
                    {t.must_change_password && <Badge label="Awaiting login" color="amber" />}
                    <Badge label={t.status || "active"} color={t.status==="active"?"green":"gray"} />
                  </div>
                  <p className="text-xs text-gray-400">{t.email} {t.phone ? `· ${t.phone}` : ""}</p>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {(t.qualified_subjects || []).map(s => <span key={s} className="text-[10px] bg-blue-50 text-blue-600 font-bold px-2 py-0.5 rounded-full">{s}</span>)}
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {resetPw[t._id] && <span className="text-xs bg-amber-50 border border-amber-200 text-amber-700 px-2 py-1 rounded-lg font-mono">{resetPw[t._id]}</span>}
                  <button onClick={() => handleReset(t._id)} className="text-xs text-gray-400 hover:text-[#695be6] font-bold flex items-center gap-1">
                    <span className="material-symbols-outlined text-sm">lock_reset</span>Reset
                  </button>
                  <button onClick={() => { setEditId(t._id); setEditForm({ name: t.name, phone: t.phone, employee_id: t.employee_id }); }}
                    className="text-xs text-[#695be6] font-bold flex items-center gap-1">
                    <span className="material-symbols-outlined text-sm">edit</span>Edit
                  </button>
                  <DangerBtn onClick={() => handleDeactivate(t._id, t.name)} />
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Students tab ─────────────────────────────────────────────
function StudentsTab({ apiFetch, token }) {
  const [students,  setStudents]  = useState([]);
  const [sections,  setSections]  = useState([]);
  const [mode,      setMode]      = useState("list");
  const [form,      setForm]      = useState({ name:"", phone:"", roll_no:"", section_id:"", parent_name:"", parent_email:"", parent_phone:"" });
  const [editId,    setEditId]    = useState(null);
  const [editForm,  setEditForm]  = useState({});
  const [saving,    setSaving]    = useState(false);
  const [error,     setError]     = useState("");
  const [success,   setSuccess]   = useState("");
  const [csvResult, setCsvResult] = useState(null);
  const [filterSec, setFilterSec] = useState("");
  const [search,    setSearch]    = useState("");
  const [resetPw,   setResetPw]   = useState({});

  const loadSections = useCallback(() =>
    apiFetch("/schooladmin/sections").then(r=>r.json()).then(d=>{if(Array.isArray(d))setSections(d);}).catch(()=>{}),
  [apiFetch]);

  const loadStudents = useCallback(() => {
    const q = filterSec ? `?section_id=${filterSec}` : "";
    apiFetch(`/schooladmin/students${q}`).then(r=>r.json()).then(d=>{if(Array.isArray(d))setStudents(d);}).catch(()=>{});
  }, [apiFetch, filterSec]);

  useEffect(() => { loadSections(); }, [loadSections]);
  useEffect(() => { loadStudents(); }, [loadStudents]);

  const handleAdd = async () => {
    if (!form.name || !form.phone || !form.section_id) { setError("Name, phone and section required"); return; }
    setSaving(true); setError(""); setSuccess("");
    try {
      const res = await apiFetch("/schooladmin/students", { method: "POST", body: JSON.stringify(form) });
      const d = await res.json();
      if (!res.ok) { setError(d.detail || "Failed"); return; }
      setSuccess(`${form.name} added`);
      setForm({ name:"", phone:"", roll_no:"", section_id: form.section_id, parent_name:"", parent_email:"", parent_phone:"" });
      setMode("list"); loadStudents();
    } catch { setError("Network error"); }
    finally { setSaving(false); }
  };

  const handleUpdate = async () => {
    setSaving(true); setError("");
    try {
      await apiFetch(`/schooladmin/students/${editId}`, { method: "PATCH", body: JSON.stringify(editForm) });
      setEditId(null); setSuccess("Student updated"); loadStudents();
    } catch { setError("Update failed"); }
    finally { setSaving(false); }
  };

  const handleDeactivate = async (id, name) => {
    if (!confirm(`Deactivate ${name}?`)) return;
    try {
      await apiFetch(`/schooladmin/students/${id}`, { method: "DELETE" });
      setSuccess(`${name} deactivated`); loadStudents();
    } catch { setError("Failed"); }
  };

  const handleReset = async (id) => {
    try {
      const res = await apiFetch("/schooladmin/reset-credentials", { method: "POST", body: JSON.stringify({ user_id: id }) });
      const d = await res.json();
      setResetPw(p => ({ ...p, [id]: d.new_password }));
    } catch { setError("Reset failed"); }
  };

  const handleCsv = async (file) => {
    setSaving(true); setError("");
    const fd = new FormData();
    fd.append("file", file);
    try {
      const res = await fetch(`${API}/schooladmin/students/bulk-csv`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: fd,
      });
      const d = await res.json();
      setCsvResult(d); loadStudents();
    } catch { setError("CSV upload failed"); }
    finally { setSaving(false); }
  };

  const filtered = students.filter(s => !search || s.name.toLowerCase().includes(search.toLowerCase()) || (s.phone || "").includes(search));

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-2 bg-gray-100 rounded-xl px-3 py-2 flex-1 max-w-xs">
          <span className="material-symbols-outlined text-gray-400 text-lg">search</span>
          <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search by name or phone..."
            className="bg-transparent text-sm outline-none w-full" />
        </div>
        <div className="flex items-center gap-2">
          <select value={filterSec} onChange={e=>setFilterSec(e.target.value)}
            className="border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none focus:border-[#695be6] bg-white">
            <option value="">All Sections</option>
            {sections.map(s => <option key={s._id} value={s._id}>{s.class_name}</option>)}
          </select>
          <button onClick={() => setMode(mode==="add"?"list":"add")}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all ${mode==="add" ? "bg-gray-200 text-gray-700" : "bg-[#695be6] text-white hover:bg-[#5a4dd4]"}`}>
            <span className="material-symbols-outlined text-base">{mode==="add"?"close":"person_add"}</span>
            {mode==="add" ? "Cancel" : "Add Student"}
          </button>
          <button onClick={() => setMode(mode==="csv"?"list":"csv")}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold border-2 border-[#695be6] text-[#695be6] hover:bg-[#695be6]/5 transition-all">
            <span className="material-symbols-outlined text-base">upload_file</span>Bulk CSV
          </button>
        </div>
      </div>

      <ErrorBox msg={error} onClose={() => setError("")} />
      <SuccessBox msg={success} />

      {/* Add form */}
      {mode === "add" && (
        <div className="bg-white border border-gray-100 rounded-xl p-5 shadow-sm">
          <h3 className="font-black text-sm mb-4">Add Student</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4">
            <Input label="Full Name *" value={form.name} onChange={v=>setForm(p=>({...p,name:v}))} required />
            <Input label="Phone * (login)" type="tel" value={form.phone} onChange={v=>setForm(p=>({...p,phone:v}))} required />
            <Input label="Roll No." value={form.roll_no} onChange={v=>setForm(p=>({...p,roll_no:v}))} />
            <div className="md:col-span-3">
              <Select label="Section *" value={form.section_id} onChange={v=>setForm(p=>({...p,section_id:v}))}
                options={sections.map(s=>({value:s._id,label:s.class_name}))} placeholder="Select section..." />
            </div>
          </div>
          <div className="border-t border-gray-100 pt-4 mb-4">
            <p className="text-xs font-bold text-gray-400 mb-3">Parent (optional — creates parent account with email login)</p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <Input label="Parent Name" value={form.parent_name} onChange={v=>setForm(p=>({...p,parent_name:v}))} />
              <Input label="Parent Email" type="email" value={form.parent_email} onChange={v=>setForm(p=>({...p,parent_email:v}))} />
              <Input label="Parent Phone" value={form.parent_phone} onChange={v=>setForm(p=>({...p,parent_phone:v}))} />
            </div>
          </div>
          <PrimaryBtn onClick={handleAdd} loading={saving} icon="person_add">Add Student</PrimaryBtn>
        </div>
      )}

      {/* CSV */}
      {mode === "csv" && (
        <div className="bg-white border border-gray-100 rounded-xl p-5 shadow-sm">
          <h3 className="font-black text-sm mb-2">Bulk Upload Students</h3>
          <p className="text-xs text-gray-400 mb-4">CSV: <code className="bg-gray-100 px-1 rounded">name, phone, roll_no, grade_number, section_name, parent_name, parent_email, parent_phone</code></p>
          <div className="border-2 border-dashed border-gray-200 rounded-xl p-8 text-center mb-4">
            <span className="material-symbols-outlined text-4xl text-gray-300 mb-2 block">upload_file</span>
            <label className="cursor-pointer bg-[#695be6] text-white text-sm font-bold px-5 py-2.5 rounded-xl hover:bg-[#5a4dd4] transition-colors">
              Choose CSV File
              <input type="file" accept=".csv" className="hidden" onChange={e => e.target.files[0] && handleCsv(e.target.files[0])} />
            </label>
            <p className="text-xs text-gray-400 mt-3">Students login with phone + OTP. Parents login with email + default password <code className="bg-gray-100 px-1 rounded">School@123</code></p>
          </div>
          {csvResult && (
            <div className="space-y-1 max-h-48 overflow-y-auto">
              <p className="text-xs font-bold text-gray-500 mb-2">{csvResult.created} created · {csvResult.results?.length} rows</p>
              {csvResult.results?.map((r,i) => (
                <div key={i} className="flex items-center justify-between text-xs py-1 border-b border-gray-50">
                  <span className="text-gray-700 truncate flex-1">{r.name} · {r.phone}</span>
                  <Badge label={r.status} color={r.status==="created"?"green":r.status==="already_exists"?"gray":"red"} />
                  {r.reason && <span className="text-red-400 text-[10px] ml-2">{r.reason}</span>}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Students list */}
      <div className="space-y-2">
        <p className="text-xs text-gray-400">{filtered.length} student{filtered.length!==1?"s":""}</p>
        {filtered.length === 0 ? (
          <div className="text-center py-12 text-gray-400 bg-white rounded-xl border border-gray-100">
            <span className="material-symbols-outlined text-4xl mb-2 block">school</span>
            <p>{search ? "No students match" : "No students yet"}</p>
          </div>
        ) : filtered.map(s => (
          <div key={s._id} className="bg-white border border-gray-100 rounded-xl p-4 shadow-sm">
            {editId === s._id ? (
              <div className="space-y-3">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <Input label="Name" value={editForm.name||""} onChange={v=>setEditForm(p=>({...p,name:v}))} />
                  <Input label="Phone" value={editForm.phone||""} onChange={v=>setEditForm(p=>({...p,phone:v}))} />
                  <Input label="Roll No." value={editForm.roll_no||""} onChange={v=>setEditForm(p=>({...p,roll_no:v}))} />
                  <div>
                    <Select label="Transfer Section" value={editForm.section_id||""} onChange={v=>setEditForm(p=>({...p,section_id:v}))}
                      options={sections.map(sec=>({value:sec._id,label:sec.class_name}))} placeholder="Keep current" />
                  </div>
                </div>
                <div className="flex gap-2">
                  <PrimaryBtn onClick={handleUpdate} loading={saving}>Save</PrimaryBtn>
                  <button onClick={() => setEditId(null)} className="px-4 py-2 border border-gray-200 rounded-xl text-sm font-bold text-gray-500">Cancel</button>
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-4">
                <div className="size-10 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-700 font-bold shrink-0">{s.name?.[0]}</div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-bold text-sm">{s.name}</p>
                    {s.roll_no && <span className="text-[10px] text-gray-400">#{s.roll_no}</span>}
                    <Badge label={s.class_name || s.section_id} color="blue" />
                    <Badge label={s.status||"active"} color={s.status==="active"?"green":"gray"} />
                  </div>
                  <p className="text-xs text-gray-400">{s.phone}</p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {resetPw[s._id] && <span className="text-xs bg-amber-50 border border-amber-200 text-amber-700 px-2 py-1 rounded-lg font-mono">{resetPw[s._id]}</span>}
                  <button onClick={() => handleReset(s._id)} className="text-xs text-gray-400 hover:text-[#695be6] font-bold flex items-center gap-1">
                    <span className="material-symbols-outlined text-sm">lock_reset</span>Reset
                  </button>
                  <button onClick={() => { setEditId(s._id); setEditForm({ name:s.name, phone:s.phone, roll_no:s.roll_no }); }}
                    className="text-xs text-[#695be6] font-bold flex items-center gap-1">
                    <span className="material-symbols-outlined text-sm">edit</span>Edit
                  </button>
                  <DangerBtn onClick={() => handleDeactivate(s._id, s.name)} />
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
