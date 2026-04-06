import { useState, useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import {
  fetchTeachers, createTeacher, updateTeacher, deleteTeacher, resetCredentials,
  selectTeachers, selectTeachersStatus, selectMutationStatus, clearMutationStatus,
} from "../../../store/slices/schoolAdminSlice";
import api from "../../../api";
import {
  ErrorBox, SuccessBox, Input, Select, PrimaryBtn, DangerBtn,
  Badge, SubjectPills, CsvUploadBox,
} from "./shared";
import SearchBar from "../../../components/SearchBar";

export default function TeachersTab() {
  const dispatch = useDispatch();
  const teachers       = useSelector(selectTeachers);
  const teachersStatus = useSelector(selectTeachersStatus);
  const mutationStatus = useSelector(selectMutationStatus);

  const [mode,      setMode]      = useState("list");
  const [form,      setForm]      = useState({ name: "", email: "", phone: "", employee_id: "", qualified_subjects: [] });
  const [editId,    setEditId]    = useState(null);
  const [editForm,  setEditForm]  = useState({});
  const [error,     setError]     = useState("");
  const [success,   setSuccess]   = useState("");
  const [csvResult, setCsvResult] = useState(null);
  const [resetPw,   setResetPw]   = useState({});
  const [search,    setSearch]    = useState("");

  const saving = mutationStatus === "loading";

  useEffect(() => { dispatch(fetchTeachers()); }, [dispatch]);

  const handleAdd = async () => {
    if (!form.name || !form.email) { setError("Name and email required"); return; }
    setError(""); setSuccess("");
    try {
      const d = await dispatch(createTeacher(form)).unwrap();
      setSuccess(`${form.name} added. Temp password: ${d.temp_password}`);
      setForm({ name: "", email: "", phone: "", employee_id: "", qualified_subjects: [] });
      setMode("list");
      dispatch(fetchTeachers());
    } catch (e) { setError(e?.detail || "Failed"); }
    finally { dispatch(clearMutationStatus()); }
  };

  const handleUpdate = async () => {
    setError("");
    try {
      await dispatch(updateTeacher({ id: editId, ...editForm })).unwrap();
      setEditId(null); setSuccess("Teacher updated");
      dispatch(fetchTeachers());
    } catch (e) { setError(e?.detail || "Update failed"); }
    finally { dispatch(clearMutationStatus()); }
  };

  const handleDeactivate = async (id, name) => {
    if (!confirm(`Deactivate ${name}? They will lose access.`)) return;
    try {
      await dispatch(deleteTeacher(id)).unwrap();
      setSuccess(`${name} deactivated`);
      dispatch(fetchTeachers());
    } catch { setError("Failed"); }
    finally { dispatch(clearMutationStatus()); }
  };

  const handleReset = async (id) => {
    try {
      const d = await dispatch(resetCredentials({ user_id: id })).unwrap();
      setResetPw((p) => ({ ...p, [id]: d.new_password }));
    } catch { setError("Reset failed"); }
    finally { dispatch(clearMutationStatus()); }
  };

  const handleCsv = async (file) => {
    setError("");
    const fd = new FormData();
    fd.append("file", file);
    try {
      const res = await api.post("/schooladmin/teachers/bulk-csv", fd, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      setCsvResult(res.data);
      dispatch(fetchTeachers());
    } catch { setError("CSV upload failed"); }
  };

  const filtered = teachers.filter(
    (t) => !search || t.name.toLowerCase().includes(search.toLowerCase()) || t.email.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <SearchBar
          value={search}
          onChange={setSearch}
          placeholder="Search teachers…"
          resultCount={filtered.length}
          width="max-w-xs flex-1"
        />
        <div className="flex gap-2">
          <button
            onClick={() => setMode(mode === "add" ? "list" : "add")}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all ${
              mode === "add" ? "bg-gray-200 text-gray-700" : "bg-[#695be6] text-white hover:bg-[#5a4dd4]"
            }`}
          >
            <span className="material-symbols-outlined text-base">{mode === "add" ? "close" : "person_add"}</span>
            {mode === "add" ? "Cancel" : "Add Teacher"}
          </button>
          <button
            onClick={() => setMode(mode === "csv" ? "list" : "csv")}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold border-2 transition-all ${
              mode === "csv" ? "border-gray-300 text-gray-500" : "border-[#695be6] text-[#695be6] hover:bg-[#695be6]/5"
            }`}
          >
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
            <Input label="Full Name" value={form.name} onChange={(v) => setForm((p) => ({ ...p, name: v }))} required />
            <Input label="Email" type="email" value={form.email} onChange={(v) => setForm((p) => ({ ...p, email: v }))} required />
            <Input label="Phone" value={form.phone} onChange={(v) => setForm((p) => ({ ...p, phone: v }))} />
            <Input label="Employee ID" value={form.employee_id} onChange={(v) => setForm((p) => ({ ...p, employee_id: v }))} />
          </div>
          <div className="mb-4">
            <label className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-2 block">Qualified Subjects</label>
            <SubjectPills
              selected={form.qualified_subjects}
              onChange={(qualified_subjects) => setForm((p) => ({ ...p, qualified_subjects }))}
            />
          </div>
          <PrimaryBtn onClick={handleAdd} loading={saving} icon="person_add">Add Teacher</PrimaryBtn>
        </div>
      )}

      {/* CSV upload */}
      {mode === "csv" && (
        <div className="bg-white border border-gray-100 rounded-xl p-5 shadow-sm">
          <h3 className="font-black text-sm mb-2">Bulk Upload Teachers</h3>
          <p className="text-xs text-gray-400 mb-4">
            CSV columns: <code className="bg-gray-100 px-1 rounded">name, email, phone, employee_id, qualified_subjects</code> (subjects semicolon-separated)
          </p>
          <CsvUploadBox onFile={handleCsv} loading={saving} result={csvResult} rowKey="email" />
        </div>
      )}

      {/* Teachers list */}
      <div className="space-y-2">
        {filtered.length === 0 ? (
          <div className="text-center py-12 text-gray-400 bg-white rounded-xl border border-gray-100">
            <span className="material-symbols-outlined text-4xl mb-2 block">person_book</span>
            <p>{search ? "No teachers match your search" : "No teachers yet"}</p>
          </div>
        ) : filtered.map((t) => (
          <div key={t._id} className="bg-white border border-gray-100 rounded-xl p-4 shadow-sm">
            {editId === t._id ? (
              <div className="space-y-3">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <Input label="Name" value={editForm.name || ""} onChange={(v) => setEditForm((p) => ({ ...p, name: v }))} />
                  <Input label="Phone" value={editForm.phone || ""} onChange={(v) => setEditForm((p) => ({ ...p, phone: v }))} />
                  <Input label="Employee ID" value={editForm.employee_id || ""} onChange={(v) => setEditForm((p) => ({ ...p, employee_id: v }))} />
                </div>
                <div>
                  <label className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-2 block">Qualified Subjects</label>
                  <SubjectPills
                    selected={editForm.qualified_subjects || []}
                    onChange={(qualified_subjects) => setEditForm((p) => ({ ...p, qualified_subjects }))}
                  />
                </div>
                <div className="flex gap-2">
                  <PrimaryBtn onClick={handleUpdate} loading={saving}>Save</PrimaryBtn>
                  <button onClick={() => setEditId(null)} className="px-4 py-2 border border-gray-200 rounded-xl text-sm font-bold text-gray-500">Cancel</button>
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-4">
                <div className="size-10 rounded-full bg-[#695be6]/10 flex items-center justify-center text-[#695be6] font-bold shrink-0">
                  {t.name?.[0]}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-bold text-sm">{t.name}</p>
                    {t.must_change_password && <Badge label="Awaiting login" color="amber" />}
                    <Badge label={t.status || "active"} color={t.status === "active" ? "green" : "gray"} />
                  </div>
                  <p className="text-xs text-gray-400">{t.email}{t.phone ? ` · ${t.phone}` : ""}{t.employee_id ? ` · ID: ${t.employee_id}` : ""}</p>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {(t.qualified_subjects || []).map((s) => (
                      <span key={s} className="text-[10px] bg-blue-50 text-blue-600 font-bold px-2 py-0.5 rounded-full">{s}</span>
                    ))}
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {resetPw[t._id] && (
                    <span className="text-xs bg-amber-50 border border-amber-200 text-amber-700 px-2 py-1 rounded-lg font-mono">
                      {resetPw[t._id]}
                    </span>
                  )}
                  <button onClick={() => handleReset(t._id)} className="text-xs text-gray-400 hover:text-[#695be6] font-bold flex items-center gap-1">
                    <span className="material-symbols-outlined text-sm">lock_reset</span>Reset
                  </button>
                  <button
                    onClick={() => { setEditId(t._id); setEditForm({ name: t.name, phone: t.phone, employee_id: t.employee_id, qualified_subjects: t.qualified_subjects || [] }); }}
                    className="text-xs text-[#695be6] font-bold flex items-center gap-1"
                  >
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
