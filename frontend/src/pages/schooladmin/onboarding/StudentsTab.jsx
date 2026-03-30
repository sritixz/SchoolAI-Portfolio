import { useState, useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import {
  fetchStudents, fetchSections, createStudent, updateStudent, deleteStudent, resetCredentials,
  selectStudents, selectStudentsStatus, selectSections,
  selectMutationStatus, clearMutationStatus,
} from "../../../store/slices/schoolAdminSlice";
import api from "../../../api";
import {
  ErrorBox, SuccessBox, Input, Select, PrimaryBtn, DangerBtn,
  Badge, CsvUploadBox,
} from "./shared";

export default function StudentsTab() {
  const dispatch = useDispatch();
  const students       = useSelector(selectStudents);
  const studentsStatus = useSelector(selectStudentsStatus);
  const sections       = useSelector(selectSections);
  const mutationStatus = useSelector(selectMutationStatus);

  const [mode,      setMode]      = useState("list");
  const [form,      setForm]      = useState({
    name: "", phone: "", roll_no: "", section_id: "",
    parent_name: "", parent_email: "", parent_phone: "",
  });
  const [editId,    setEditId]    = useState(null);
  const [editForm,  setEditForm]  = useState({});
  const [error,     setError]     = useState("");
  const [success,   setSuccess]   = useState("");
  const [csvResult, setCsvResult] = useState(null);
  const [filterSec, setFilterSec] = useState("");
  const [search,    setSearch]    = useState("");
  const [resetPw,   setResetPw]   = useState({});

  const saving = mutationStatus === "loading";

  useEffect(() => { dispatch(fetchSections()); }, [dispatch]);
  useEffect(() => {
    dispatch(fetchStudents(filterSec ? { section_id: filterSec } : {}));
  }, [dispatch, filterSec]);

  const handleAdd = async () => {
    if (!form.name || !form.phone || !form.section_id) { setError("Name, phone and section required"); return; }
    setError(""); setSuccess("");
    try {
      const d = await dispatch(createStudent(form)).unwrap();
      setSuccess(`${form.name} added${d.parent_id ? " with parent account" : ""}`);
      setForm({ name: "", phone: "", roll_no: "", section_id: "", parent_name: "", parent_email: "", parent_phone: "" });
      setMode("list");
      dispatch(fetchStudents(filterSec ? { section_id: filterSec } : {}));
    } catch (e) { setError(e?.detail || "Failed"); }
    finally { dispatch(clearMutationStatus()); }
  };

  const handleUpdate = async () => {
    setError("");
    try {
      await dispatch(updateStudent({ id: editId, ...editForm })).unwrap();
      setEditId(null); setSuccess("Student updated");
      dispatch(fetchStudents(filterSec ? { section_id: filterSec } : {}));
    } catch (e) { setError(e?.detail || "Update failed"); }
    finally { dispatch(clearMutationStatus()); }
  };

  const handleDeactivate = async (id, name) => {
    if (!confirm(`Deactivate ${name}?`)) return;
    try {
      await dispatch(deleteStudent(id)).unwrap();
      setSuccess(`${name} deactivated`);
      dispatch(fetchStudents(filterSec ? { section_id: filterSec } : {}));
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
      const res = await api.post("/schooladmin/students/bulk-csv", fd, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      setCsvResult(res.data);
      dispatch(fetchStudents(filterSec ? { section_id: filterSec } : {}));
    } catch { setError("CSV upload failed"); }
  };

  const filtered = students.filter(
    (s) => !search || s.name.toLowerCase().includes(search.toLowerCase()) || s.phone.includes(search)
  );

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-2 bg-gray-100 rounded-xl px-3 py-2 flex-1 max-w-xs">
          <span className="material-symbols-outlined text-gray-400 text-lg">search</span>
          <input
            value={search} onChange={(e) => setSearch(e.target.value)}
            placeholder="Search students…"
            className="bg-transparent text-sm outline-none w-full"
          />
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <div className="w-44">
            <Select
              label="" value={filterSec} onChange={setFilterSec}
              options={sections.map((s) => ({ value: s._id, label: s.class_name }))}
              placeholder="All Sections"
            />
          </div>
          <button
            onClick={() => setMode(mode === "add" ? "list" : "add")}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all ${
              mode === "add" ? "bg-gray-200 text-gray-700" : "bg-[#695be6] text-white hover:bg-[#5a4dd4]"
            }`}
          >
            <span className="material-symbols-outlined text-base">{mode === "add" ? "close" : "person_add"}</span>
            {mode === "add" ? "Cancel" : "Add Student"}
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
          <h3 className="font-black text-sm mb-4">New Student — login via phone number</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4">
            <Input label="Full Name" value={form.name} onChange={(v) => setForm((p) => ({ ...p, name: v }))} required />
            <Input label="Phone (login)" value={form.phone} onChange={(v) => setForm((p) => ({ ...p, phone: v }))} required />
            <Input label="Roll No" value={form.roll_no} onChange={(v) => setForm((p) => ({ ...p, roll_no: v }))} />
            <Select
              label="Section" value={form.section_id}
              onChange={(v) => setForm((p) => ({ ...p, section_id: v }))}
              options={sections.map((s) => ({ value: s._id, label: s.class_name }))}
              placeholder="Select section…"
            />
          </div>
          <div className="border-t border-gray-100 pt-4 mb-4">
            <p className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-3">Parent / Guardian (optional)</p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <Input label="Parent Name" value={form.parent_name} onChange={(v) => setForm((p) => ({ ...p, parent_name: v }))} />
              <Input label="Parent Email" type="email" value={form.parent_email} onChange={(v) => setForm((p) => ({ ...p, parent_email: v }))} />
              <Input label="Parent Phone" value={form.parent_phone} onChange={(v) => setForm((p) => ({ ...p, parent_phone: v }))} />
            </div>
            <p className="text-xs text-gray-400 mt-2">If parent email is provided, a parent account is auto-created and linked.</p>
          </div>
          <PrimaryBtn onClick={handleAdd} loading={saving} icon="person_add">Add Student</PrimaryBtn>
        </div>
      )}

      {/* CSV upload */}
      {mode === "csv" && (
        <div className="bg-white border border-gray-100 rounded-xl p-5 shadow-sm">
          <h3 className="font-black text-sm mb-2">Bulk Upload Students</h3>
          <p className="text-xs text-gray-400 mb-4">
            CSV columns: <code className="bg-gray-100 px-1 rounded">name, phone, roll_no, grade_number, section_name, parent_name, parent_email, parent_phone</code>
          </p>
          <CsvUploadBox onFile={handleCsv} loading={saving} result={csvResult} rowKey="phone" />
        </div>
      )}

      {/* Students list */}
      <div className="space-y-2">
        {filtered.length === 0 ? (
          <div className="text-center py-12 text-gray-400 bg-white rounded-xl border border-gray-100">
            <span className="material-symbols-outlined text-4xl mb-2 block">groups</span>
            <p>{search ? "No students match your search" : "No students yet"}</p>
          </div>
        ) : filtered.map((s) => (
          <div key={s._id} className="bg-white border border-gray-100 rounded-xl p-4 shadow-sm">
            {editId === s._id ? (
              <div className="space-y-3">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <Input label="Name" value={editForm.name || ""} onChange={(v) => setEditForm((p) => ({ ...p, name: v }))} />
                  <Input label="Phone" value={editForm.phone || ""} onChange={(v) => setEditForm((p) => ({ ...p, phone: v }))} />
                  <Input label="Roll No" value={editForm.roll_no || ""} onChange={(v) => setEditForm((p) => ({ ...p, roll_no: v }))} />
                </div>
                <div className="w-56">
                  <Select
                    label="Transfer Section" value={editForm.section_id || ""}
                    onChange={(v) => setEditForm((p) => ({ ...p, section_id: v }))}
                    options={sections.map((sec) => ({ value: sec._id, label: sec.class_name }))}
                    placeholder="Keep current section"
                  />
                </div>
                <div className="flex gap-2">
                  <PrimaryBtn onClick={handleUpdate} loading={saving}>Save</PrimaryBtn>
                  <button onClick={() => setEditId(null)} className="px-4 py-2 border border-gray-200 rounded-xl text-sm font-bold text-gray-500">Cancel</button>
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-4">
                <div className="size-10 rounded-full bg-purple-100 flex items-center justify-center text-purple-600 font-bold shrink-0">
                  {s.name?.[0]}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-bold text-sm">{s.name}</p>
                    {s.must_change_password && <Badge label="Awaiting login" color="amber" />}
                    <Badge label={s.status || "active"} color={s.status === "active" ? "green" : "gray"} />
                  </div>
                  <p className="text-xs text-gray-400">
                    {s.phone} · {s.class_name || "No section"}{s.roll_no ? ` · Roll ${s.roll_no}` : ""}
                  </p>
                  {s.parent_name && (
                    <p className="text-xs text-gray-400 mt-0.5">
                      Parent: {s.parent_name}{s.parent_phone ? ` · ${s.parent_phone}` : ""}
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {resetPw[s._id] && (
                    <span className="text-xs bg-amber-50 border border-amber-200 text-amber-700 px-2 py-1 rounded-lg font-mono">
                      {resetPw[s._id]}
                    </span>
                  )}
                  <button onClick={() => handleReset(s._id)} className="text-xs text-gray-400 hover:text-[#695be6] font-bold flex items-center gap-1">
                    <span className="material-symbols-outlined text-sm">lock_reset</span>Reset
                  </button>
                  <button
                    onClick={() => { setEditId(s._id); setEditForm({ name: s.name, phone: s.phone, roll_no: s.roll_no }); }}
                    className="text-xs text-[#695be6] font-bold flex items-center gap-1"
                  >
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
