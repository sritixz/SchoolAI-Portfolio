import { useState, useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import {
  fetchGrades, fetchSections, createSection, deleteSection,
  selectGrades, selectSections, selectSectionsStatus,
  selectMutationStatus, clearMutationStatus,
} from "../../../store/slices/schoolAdminSlice";
import { ErrorBox, SuccessBox, Select, PrimaryBtn, DangerBtn, SECTION_OPTIONS } from "./shared";

export default function SectionsTab() {
  const dispatch = useDispatch();
  const grades         = useSelector(selectGrades);
  const sections       = useSelector(selectSections);
  const sectionsStatus = useSelector(selectSectionsStatus);
  const mutationStatus = useSelector(selectMutationStatus);

  const [form,        setForm]        = useState({ grade_number: "", section_name: "" });
  const [error,       setError]       = useState("");
  const [success,     setSuccess]     = useState("");
  const [filterGrade, setFilterGrade] = useState("");

  const saving = mutationStatus === "loading";

  useEffect(() => { dispatch(fetchGrades()); }, [dispatch]);
  useEffect(() => { dispatch(fetchSections(filterGrade || undefined)); }, [dispatch, filterGrade]);

  const handleAdd = async () => {
    if (!form.grade_number || !form.section_name) { setError("Select grade and section"); return; }
    setError(""); setSuccess("");
    try {
      const d = await dispatch(createSection(form)).unwrap();
      setSuccess(`${d.class_name} created`);
      setForm((p) => ({ ...p, section_name: "" }));
      dispatch(fetchSections(filterGrade || undefined));
    } catch (e) { setError(e?.detail || "Failed"); }
    finally { dispatch(clearMutationStatus()); }
  };

  const handleDelete = async (id, name) => {
    if (!confirm(`Delete ${name}? Transfer or remove all students first.`)) return;
    try {
      await dispatch(deleteSection(id)).unwrap();
      dispatch(fetchSections(filterGrade || undefined));
    } catch (e) { setError(e?.detail || "Cannot delete"); }
    finally { dispatch(clearMutationStatus()); }
  };

  const byGrade = sections.reduce((acc, s) => {
    (acc[s.grade_number] = acc[s.grade_number] || []).push(s);
    return acc;
  }, {});

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Add form */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
        <h3 className="font-black text-sm mb-4">Add Section</h3>
        <ErrorBox msg={error} onClose={() => setError("")} />
        <SuccessBox msg={success} />
        <div className="space-y-3">
          <Select
            label="Grade *" value={form.grade_number}
            onChange={(v) => setForm((p) => ({ ...p, grade_number: v }))}
            options={grades.map((g) => ({ value: g.grade_number, label: `Grade ${g.grade_number}` }))}
            placeholder="Select grade…"
          />
          <Select
            label="Section *" value={form.section_name}
            onChange={(v) => setForm((p) => ({ ...p, section_name: v }))}
            options={SECTION_OPTIONS} placeholder="Select section…"
          />
          <PrimaryBtn onClick={handleAdd} loading={saving} icon="add" className="w-full">
            Add {form.grade_number ? `Grade ${form.grade_number}-${form.section_name || "?"}` : "Section"}
          </PrimaryBtn>
        </div>
        <div className="mt-6 pt-4 border-t border-gray-100">
          <p className="text-xs text-gray-400">
            Sections inherit subjects from their grade. Assign teachers per subject in the Assignments tab.
          </p>
        </div>
      </div>

      {/* Sections list */}
      <div className="lg:col-span-2 space-y-4">
        <div className="flex items-center justify-between gap-3">
          <h3 className="font-black text-base">Sections ({sections.length})</h3>
          <div className="w-44">
            <Select
              label="" value={filterGrade}
              onChange={setFilterGrade}
              options={grades.map((g) => ({ value: g._id, label: `Grade ${g.grade_number}` }))}
              placeholder="All Grades"
            />
          </div>
        </div>

        {Object.keys(byGrade).sort((a, b) => +a - +b).map((gn) => (
          <div key={gn}>
            <p className="text-xs font-black text-gray-400 uppercase tracking-wider mb-2">Grade {gn}</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
              {byGrade[gn].map((sec) => (
                <div key={sec._id} className="bg-white border border-gray-100 rounded-xl p-4 shadow-sm">
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <p className="font-black text-lg">{sec.class_name}</p>
                      <p className="text-xs text-gray-400">
                        {sec.student_count || 0} students · {sec.assignment_count || 0} subjects assigned
                      </p>
                    </div>
                    <DangerBtn onClick={() => handleDelete(sec._id, sec.class_name)} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}

        {sections.length === 0 && sectionsStatus !== "loading" && (
          <div className="text-center py-12 text-gray-400 bg-white rounded-xl border border-gray-100">
            <span className="material-symbols-outlined text-4xl mb-2 block">grid_view</span>
            <p>No sections yet. Create grades first, then add sections.</p>
          </div>
        )}
      </div>
    </div>
  );
}
