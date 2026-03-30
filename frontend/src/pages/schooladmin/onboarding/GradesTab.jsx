import { useState, useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import {
  fetchGrades, createGrade, updateGrade, deleteGrade,
  selectGrades, selectGradesStatus, selectMutationStatus, clearMutationStatus,
} from "../../../store/slices/schoolAdminSlice";
import {
  ErrorBox, SuccessBox, Select, PrimaryBtn, DangerBtn, SubjectPills,
  GRADE_OPTIONS,
} from "./shared";

export default function GradesTab() {
  const dispatch = useDispatch();
  const grades         = useSelector(selectGrades);
  const gradesStatus   = useSelector(selectGradesStatus);
  const mutationStatus = useSelector(selectMutationStatus);

  const [form,     setForm]     = useState({ grade_number: "", subjects: [] });
  const [editId,   setEditId]   = useState(null);
  const [editSubs, setEditSubs] = useState([]);
  const [error,    setError]    = useState("");
  const [success,  setSuccess]  = useState("");

  const saving = mutationStatus === "loading";

  useEffect(() => { dispatch(fetchGrades()); }, [dispatch]);

  const handleAdd = async () => {
    if (!form.grade_number) { setError("Select a grade number"); return; }
    setError(""); setSuccess("");
    try {
      await dispatch(createGrade(form)).unwrap();
      setSuccess(`Grade ${form.grade_number} created`);
      setForm({ grade_number: "", subjects: [] });
      dispatch(fetchGrades());
    } catch (e) { setError(e?.detail || "Failed"); }
    finally { dispatch(clearMutationStatus()); }
  };

  const handleUpdate = async (id) => {
    setError("");
    try {
      await dispatch(updateGrade({ id, subjects: editSubs })).unwrap();
      setEditId(null); setSuccess("Grade updated");
      dispatch(fetchGrades());
    } catch (e) { setError(e?.detail || "Update failed"); }
    finally { dispatch(clearMutationStatus()); }
  };

  const handleDelete = async (id, gn) => {
    if (!confirm(`Delete Grade ${gn}? This will fail if sections exist.`)) return;
    try {
      await dispatch(deleteGrade(id)).unwrap();
      dispatch(fetchGrades());
    } catch (e) { setError(e?.detail || "Cannot delete — remove sections first"); }
    finally { dispatch(clearMutationStatus()); }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Add form */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
        <h3 className="font-black text-sm mb-4">Add Grade</h3>
        <ErrorBox msg={error} onClose={() => setError("")} />
        <SuccessBox msg={success} />
        <div className="space-y-4">
          <Select
            label="Grade Number *" value={form.grade_number}
            onChange={(v) => setForm((p) => ({ ...p, grade_number: v }))}
            options={GRADE_OPTIONS} placeholder="Select grade…"
          />
          <div>
            <label className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-2 block">Subjects</label>
            <SubjectPills
              selected={form.subjects}
              onChange={(subjects) => setForm((p) => ({ ...p, subjects }))}
            />
          </div>
          <PrimaryBtn onClick={handleAdd} loading={saving} icon="add" className="w-full">
            Add Grade {form.grade_number}
          </PrimaryBtn>
        </div>
      </div>

      {/* Grades list */}
      <div className="lg:col-span-2 space-y-3">
        <h3 className="font-black text-base">Configured Grades ({grades.length})</h3>
        {gradesStatus === "loading" ? (
          <div className="text-center py-12 text-gray-400">Loading...</div>
        ) : grades.length === 0 ? (
          <div className="text-center py-12 text-gray-400 bg-white rounded-xl border border-gray-100">
            <span className="material-symbols-outlined text-4xl mb-2 block">school</span>
            <p>No grades yet. Add your first grade.</p>
          </div>
        ) : grades.map((g) => (
          <div key={g._id} className="bg-white border border-gray-100 rounded-xl p-4 shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-3">
                <div className="size-10 rounded-xl bg-[#695be6]/10 flex items-center justify-center text-[#695be6] font-black text-lg">
                  {g.grade_number}
                </div>
                <div>
                  <p className="font-black">Grade {g.grade_number}</p>
                  <p className="text-xs text-gray-400">{(g.subjects || []).length} subjects</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => { setEditId(g._id); setEditSubs(g.subjects || []); }}
                  className="text-xs text-[#695be6] font-bold hover:underline flex items-center gap-1"
                >
                  <span className="material-symbols-outlined text-sm">edit</span>Edit
                </button>
                <DangerBtn onClick={() => handleDelete(g._id, g.grade_number)}>Delete</DangerBtn>
              </div>
            </div>

            {editId === g._id ? (
              <div className="space-y-3 pt-3 border-t border-gray-100">
                <SubjectPills selected={editSubs} onChange={setEditSubs} />
                <div className="flex gap-2">
                  <PrimaryBtn onClick={() => handleUpdate(g._id)} loading={saving}>Save</PrimaryBtn>
                  <button
                    onClick={() => setEditId(null)}
                    className="px-4 py-2 border border-gray-200 rounded-xl text-sm font-bold text-gray-500 hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex flex-wrap gap-1.5">
                {(g.subjects || []).map((s) => (
                  <span key={s} className="text-[10px] bg-[#695be6]/10 text-[#695be6] font-bold px-2 py-0.5 rounded-full">
                    {s}
                  </span>
                ))}
                {(g.subjects || []).length === 0 && (
                  <span className="text-xs text-gray-400 italic">No subjects configured</span>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
