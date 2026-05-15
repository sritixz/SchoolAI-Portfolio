import { useState, useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import {
  fetchParents, fetchStudents, createParent, updateParent, resetCredentials,
  linkChildToParent, unlinkChildFromParent, fetchParentCredentials,
  selectParents, selectParentsStatus, selectStudents,
  selectMutationStatus, clearMutationStatus,
} from "../../../store/slices/schoolAdminSlice";
import { ErrorBox, SuccessBox, Input, PrimaryBtn, DangerBtn, Badge } from "./shared";
import SearchBar from "../../../components/SearchBar";

export default function ParentsTab() {
  const dispatch = useDispatch();
  const parents       = useSelector(selectParents);
  const parentsStatus = useSelector(selectParentsStatus);
  const students      = useSelector(selectStudents);
  const mutationStatus = useSelector(selectMutationStatus);

  const [mode,      setMode]      = useState("list");
  const [form,      setForm]      = useState({ name: "", email: "", phone: "", children_ids: [] });
  const [editId,    setEditId]    = useState(null);
  const [editForm,  setEditForm]  = useState({});
  const [editCreds, setEditCreds] = useState(null);
  const [error,     setError]     = useState("");
  const [success,   setSuccess]   = useState("");
  const [search,    setSearch]    = useState("");
  const [linkStudentId, setLinkStudentId] = useState("");

  const saving = mutationStatus === "loading";

  useEffect(() => {
    dispatch(fetchParents());
    dispatch(fetchStudents({}));
  }, [dispatch]);

  // Students that don't already have a parent linked
  const unlinkedStudents = students.filter((s) => !s.parent_id);

  const handleAdd = async () => {
    if (!form.name || !form.email) { setError("Name and email required"); return; }
    if (form.children_ids.length === 0) { setError("Select at least one student to link"); return; }
    setError(""); setSuccess("");
    try {
      const d = await dispatch(createParent(form)).unwrap();
      setSuccess(`${form.name} added. Temp password: ${d.temp_password}`);
      setForm({ name: "", email: "", phone: "", children_ids: [] });
      setMode("list");
      dispatch(fetchParents());
      dispatch(fetchStudents({}));
    } catch (e) { setError(e?.detail || e?.message || "Failed"); }
    finally { dispatch(clearMutationStatus()); }
  };

  const handleUpdate = async () => {
    setError("");
    try {
      await dispatch(updateParent({ id: editId, ...editForm })).unwrap();
      setEditId(null); setEditCreds(null);
      setSuccess("Parent updated");
      dispatch(fetchParents());
    } catch (e) { setError(e?.detail || "Update failed"); }
    finally { dispatch(clearMutationStatus()); }
  };

  const handleReset = async (id) => {
    try {
      const d = await dispatch(resetCredentials({ user_id: id })).unwrap();
      setSuccess(`New password: ${d.new_password}`);
      dispatch(fetchParents());
    } catch { setError("Reset failed"); }
    finally { dispatch(clearMutationStatus()); }
  };

  const handleLink = async (parentId) => {
    if (!linkStudentId) return;
    try {
      await dispatch(linkChildToParent({ parentId, studentId: linkStudentId })).unwrap();
      setLinkStudentId("");
      setSuccess("Student linked");
      dispatch(fetchParents());
      dispatch(fetchStudents({}));
    } catch { setError("Link failed"); }
    finally { dispatch(clearMutationStatus()); }
  };

  const handleUnlink = async (parentId, studentId) => {
    if (!confirm("Unlink this student from parent?")) return;
    try {
      await dispatch(unlinkChildFromParent({ parentId, studentId })).unwrap();
      setSuccess("Student unlinked");
      dispatch(fetchParents());
      dispatch(fetchStudents({}));
    } catch { setError("Unlink failed"); }
    finally { dispatch(clearMutationStatus()); }
  };

  const filtered = parents.filter(
    (p) => !search || p.name?.toLowerCase().includes(search.toLowerCase()) || p.email?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <SearchBar value={search} onChange={setSearch} placeholder="Search parents…" resultCount={filtered.length} width="max-w-xs flex-1" />
        <button
          onClick={() => setMode(mode === "add" ? "list" : "add")}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all ${
            mode === "add" ? "bg-gray-200 text-gray-700" : "bg-[#695be6] text-white hover:bg-[#5a4dd4]"
          }`}
        >
          <span className="material-symbols-outlined text-base">{mode === "add" ? "close" : "person_add"}</span>
          {mode === "add" ? "Cancel" : "Add Parent"}
        </button>
      </div>

      <ErrorBox msg={error} onClose={() => setError("")} />
      <SuccessBox msg={success} />

      {/* Add form */}
      {mode === "add" && (
        <div className="bg-white border border-gray-100 rounded-xl p-5 shadow-sm space-y-4">
          <h3 className="font-black text-sm">New Parent — must be linked to an existing student</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <Input label="Full Name" value={form.name} onChange={(v) => setForm((p) => ({ ...p, name: v }))} required />
            <Input label="Email" type="email" value={form.email} onChange={(v) => setForm((p) => ({ ...p, email: v }))} required />
            <Input label="Phone" value={form.phone} onChange={(v) => setForm((p) => ({ ...p, phone: v }))} />
          </div>
          <div>
            <label className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-2 block">
              Link to Students <span className="text-red-500">*</span>
            </label>
            {unlinkedStudents.length === 0 ? (
              <p className="text-xs text-gray-400 italic">All students already have a parent linked, or no students exist yet.</p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {unlinkedStudents.map((s) => {
                  const selected = form.children_ids.includes(s._id);
                  return (
                    <button
                      key={s._id}
                      onClick={() => setForm((p) => ({
                        ...p,
                        children_ids: selected
                          ? p.children_ids.filter((id) => id !== s._id)
                          : [...p.children_ids, s._id],
                      }))}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold border-2 transition-all ${
                        selected ? "bg-[#695be6] text-white border-[#695be6]" : "border-gray-200 text-gray-600 hover:border-[#695be6]"
                      }`}
                    >
                      {s.name} <span className="opacity-60">({s.class_name || s.phone})</span>
                    </button>
                  );
                })}
              </div>
            )}
            {form.children_ids.length > 0 && (
              <p className="text-xs text-[#695be6] mt-2 font-bold">{form.children_ids.length} student(s) selected</p>
            )}
          </div>
          <PrimaryBtn onClick={handleAdd} loading={saving} icon="person_add">Add Parent</PrimaryBtn>
        </div>
      )}

      {/* Parents list */}
      <div className="space-y-2">
        {parentsStatus === "loading" && filtered.length === 0 ? (
          <div className="text-center py-12 text-gray-400">Loading…</div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-12 text-gray-400 bg-white rounded-xl border border-gray-100">
            <span className="material-symbols-outlined text-4xl mb-2 block">family_restroom</span>
            <p>{search ? "No parents match your search" : "No parents yet — they are auto-created when a student is added with a parent email"}</p>
          </div>
        ) : filtered.map((p) => (
          <div key={p._id} className="bg-white border border-gray-100 rounded-xl p-4 shadow-sm">
            {editId === p._id ? (
              <div className="space-y-3">
                {/* Credentials */}
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 flex flex-wrap gap-4 items-center">
                  <span className="material-symbols-outlined text-amber-500 text-base">key</span>
                  <div className="text-xs">
                    <p className="font-bold text-amber-700 mb-0.5">Login Credentials</p>
                    <p className="text-gray-600">Email: <span className="font-mono font-bold">{p.email}</span></p>
                    <p className="text-gray-600">
                      Password:{" "}
                      {editCreds === null
                        ? <span className="text-gray-400 italic">Loading…</span>
                        : editCreds?.plain_password
                          ? <span className="font-mono font-bold text-amber-800">{editCreds.plain_password}</span>
                          : <span className="text-gray-400 italic">Password changed by parent — use Reset to generate a new one</span>
                      }
                    </p>
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <Input label="Name" value={editForm.name || ""} onChange={(v) => setEditForm((f) => ({ ...f, name: v }))} />
                  <Input label="Phone" value={editForm.phone || ""} onChange={(v) => setEditForm((f) => ({ ...f, phone: v }))} />
                  <Input label="Email" type="email" value={editForm.email || ""} onChange={(v) => setEditForm((f) => ({ ...f, email: v }))} />
                </div>
                {/* Link additional student */}
                <div>
                  <p className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-2">Link another student</p>
                  <div className="flex gap-2">
                    <select
                      value={linkStudentId}
                      onChange={(e) => setLinkStudentId(e.target.value)}
                      className="flex-1 border border-gray-200 rounded-xl px-3 py-2 text-sm"
                    >
                      <option value="">Select student…</option>
                      {unlinkedStudents.map((s) => (
                        <option key={s._id} value={s._id}>{s.name} ({s.class_name || s.phone})</option>
                      ))}
                    </select>
                    <button
                      onClick={() => handleLink(p._id)}
                      disabled={!linkStudentId}
                      className="px-4 py-2 bg-[#695be6] text-white rounded-xl text-sm font-bold disabled:opacity-40"
                    >Link</button>
                  </div>
                </div>
                {/* Linked children */}
                {(p.children_details || []).length > 0 && (
                  <div>
                    <p className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-2">Linked Students</p>
                    <div className="flex flex-wrap gap-2">
                      {p.children_details.map((c) => (
                        <span key={c.id} className="flex items-center gap-1 bg-purple-50 text-purple-700 border border-purple-100 px-2 py-1 rounded-lg text-xs font-bold">
                          {c.name} <span className="opacity-60">({c.class})</span>
                          <button onClick={() => handleUnlink(p._id, c.id)} className="ml-1 text-red-400 hover:text-red-600">
                            <span className="material-symbols-outlined text-xs">close</span>
                          </button>
                        </span>
                      ))}
                    </div>
                  </div>
                )}
                <div className="flex gap-2">
                  <PrimaryBtn onClick={handleUpdate} loading={saving}>Save</PrimaryBtn>
                  <button onClick={() => { setEditId(null); setEditCreds(null); }} className="px-4 py-2 border border-gray-200 rounded-xl text-sm font-bold text-gray-500">Cancel</button>
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-4">
                <div className="size-10 rounded-full bg-green-100 flex items-center justify-center text-green-600 font-bold shrink-0">
                  {p.name?.[0]}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-bold text-sm">{p.name}</p>
                    {p.must_change_password && <Badge label="Awaiting login" color="amber" />}
                    <Badge label={p.status || "active"} color={p.status === "active" ? "green" : "gray"} />
                  </div>
                  <p className="text-xs text-gray-400">{p.email}{p.phone ? ` · ${p.phone}` : ""}</p>
                  {(p.children_details || []).length > 0 && (
                    <p className="text-xs text-gray-400 mt-0.5">
                      Children: {p.children_details.map((c) => c.name).join(", ")}
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <button onClick={() => handleReset(p._id)} className="text-xs text-gray-400 hover:text-[#695be6] font-bold flex items-center gap-1">
                    <span className="material-symbols-outlined text-sm">lock_reset</span>Reset
                  </button>
                  <button
                    onClick={async () => {
                      setEditId(p._id);
                      setEditForm({ name: p.name, phone: p.phone, email: p.email });
                      setEditCreds(null);
                      try {
                        const creds = await dispatch(fetchParentCredentials(p._id)).unwrap();
                        setEditCreds(creds);
                      } catch {
                        // 404 or no plain_password — show "not available" state
                        setEditCreds({ plain_password: null, email: p.email, must_change_password: p.must_change_password });
                      }
                    }}
                    className="text-xs text-[#695be6] font-bold flex items-center gap-1"
                  >
                    <span className="material-symbols-outlined text-sm">edit</span>Edit
                  </button>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
