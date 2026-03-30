import { useState, useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import {
  fetchSections, fetchTeachers, fetchAssignments, upsertAssignment, removeAssignment,
  selectSections, selectTeachers, selectAssignments,
  selectMutationStatus, clearMutationStatus,
} from "../../../store/slices/schoolAdminSlice";
import { ErrorBox, SuccessBox, Select, PrimaryBtn, DangerBtn, Badge } from "./shared";

export default function AssignmentsTab() {
  const dispatch = useDispatch();
  const sections    = useSelector(selectSections);
  const teachers    = useSelector(selectTeachers);
  const assignments = useSelector(selectAssignments);
  const mutationStatus = useSelector(selectMutationStatus);

  const [selectedSec, setSelectedSec] = useState("");
  const [form,        setForm]        = useState({ subject: "", teacher_id: "" });
  const [error,       setError]       = useState("");
  const [success,     setSuccess]     = useState("");

  const saving = mutationStatus === "loading";

  useEffect(() => {
    dispatch(fetchSections());
    dispatch(fetchTeachers());
  }, [dispatch]);

  useEffect(() => {
    if (selectedSec) dispatch(fetchAssignments(selectedSec));
  }, [dispatch, selectedSec]);

  const handleAssign = async () => {
    if (!selectedSec || !form.subject || !form.teacher_id) {
      setError("Select section, subject and teacher"); return;
    }
    setError(""); setSuccess("");
    try {
      await dispatch(upsertAssignment({ sectionId: selectedSec, ...form })).unwrap();
      setSuccess(`${form.subject} assigned successfully`);
      setForm({ subject: "", teacher_id: "" });
      dispatch(fetchAssignments(selectedSec));
    } catch (e) { setError(e?.detail || "Failed"); }
    finally { dispatch(clearMutationStatus()); }
  };

  const handleRemove = async (subject) => {
    if (!confirm(`Remove ${subject} assignment from this section?`)) return;
    try {
      await dispatch(removeAssignment({ sectionId: selectedSec, subject })).unwrap();
      dispatch(fetchAssignments(selectedSec));
    } catch (e) { setError(e?.detail || "Delete failed"); }
    finally { dispatch(clearMutationStatus()); }
  };

  const section = sections.find((s) => s._id === selectedSec);
  const assignedSubjects = new Set(assignments.map((a) => a.subject));
  const qualifiedTeachers = form.subject
    ? teachers.filter((t) => (t.qualified_subjects || []).includes(form.subject) && t.status !== "inactive")
    : [];

  const ALL_SUBJECTS = [
    "Mathematics","Physics","Chemistry","Biology","History","English",
    "Computer Science","Geography","Economics","Physical Education","Art","Music",
  ];

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Assignment form */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
        <h3 className="font-black text-sm mb-4">Assign Teacher to Subject</h3>
        <ErrorBox msg={error} onClose={() => setError("")} />
        <SuccessBox msg={success} />
        <div className="space-y-3">
          <Select
            label="Section *" value={selectedSec}
            onChange={(v) => { setSelectedSec(v); setForm({ subject: "", teacher_id: "" }); }}
            options={sections.map((s) => ({ value: s._id, label: s.class_name }))}
            placeholder="Select section…"
          />

          {selectedSec && (
            <>
              <div>
                <label className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-1 block">Subject *</label>
                <select
                  value={form.subject}
                  onChange={(e) => setForm((p) => ({ ...p, subject: e.target.value, teacher_id: "" }))}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none focus:border-[#695be6] bg-white"
                >
                  <option value="">Select subject…</option>
                  {ALL_SUBJECTS.map((s) => (
                    <option key={s} value={s}>
                      {s}{assignedSubjects.has(s) ? " ✓" : ""}
                    </option>
                  ))}
                </select>
              </div>

              {form.subject && (
                <div>
                  <label className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-1 block">
                    Qualified Teachers *
                  </label>
                  {qualifiedTeachers.length === 0 ? (
                    <div className="bg-amber-50 border border-amber-200 rounded-xl px-3 py-2">
                      <p className="text-xs text-amber-700">No teachers qualified for {form.subject}.</p>
                      <p className="text-xs text-amber-600 mt-0.5">Add qualified subjects to teachers in the Teachers tab.</p>
                    </div>
                  ) : (
                    <select
                      value={form.teacher_id}
                      onChange={(e) => setForm((p) => ({ ...p, teacher_id: e.target.value }))}
                      className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none focus:border-[#695be6] bg-white"
                    >
                      <option value="">Select teacher…</option>
                      {qualifiedTeachers.map((t) => (
                        <option key={t._id} value={t._id}>
                          {t.name}{t.employee_id ? ` (${t.employee_id})` : ""}
                        </option>
                      ))}
                    </select>
                  )}
                </div>
              )}

              <PrimaryBtn
                onClick={handleAssign} loading={saving}
                disabled={!form.subject || !form.teacher_id}
                icon="assignment" className="w-full"
              >
                {assignedSubjects.has(form.subject) ? "Reassign Teacher" : "Assign Teacher"}
              </PrimaryBtn>
            </>
          )}
        </div>

        {!selectedSec && (
          <div className="mt-4 pt-4 border-t border-gray-100">
            <p className="text-xs text-gray-400">
              Select a section to view and manage subject-teacher assignments. Subjects marked ✓ are already assigned.
            </p>
          </div>
        )}
      </div>

      {/* Assignments list */}
      <div className="lg:col-span-2 space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="font-black text-base">
            {selectedSec
              ? `${section?.class_name || "Section"} — Assignments (${assignments.length})`
              : "Select a section to view assignments"}
          </h3>
          {selectedSec && (
            <span className="text-xs text-gray-400">
              {assignments.length} of {ALL_SUBJECTS.length} subjects assigned
            </span>
          )}
        </div>

        {!selectedSec ? (
          <div className="text-center py-12 text-gray-400 bg-white rounded-xl border border-gray-100">
            <span className="material-symbols-outlined text-4xl mb-2 block">assignment</span>
            <p>Select a section from the left panel</p>
          </div>
        ) : assignments.length === 0 ? (
          <div className="text-center py-12 text-gray-400 bg-white rounded-xl border border-gray-100">
            <span className="material-symbols-outlined text-4xl mb-2 block">assignment_late</span>
            <p>No assignments yet for {section?.class_name}</p>
            <p className="text-xs mt-1">Use the form to assign teachers to subjects.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {assignments.map((a) => (
              <div key={a.subject} className="bg-white border border-gray-100 rounded-xl p-4 shadow-sm">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <p className="font-black text-sm">{a.subject}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <div className="size-6 rounded-full bg-[#695be6]/10 flex items-center justify-center text-[#695be6] text-xs font-bold shrink-0">
                        {a.teacher_name?.[0]}
                      </div>
                      <div>
                        <p className="text-xs font-bold text-gray-700">{a.teacher_name}</p>
                        {a.teacher_email && <p className="text-[10px] text-gray-400">{a.teacher_email}</p>}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <Badge label="Assigned" color="green" />
                    <DangerBtn onClick={() => handleRemove(a.subject)} />
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
