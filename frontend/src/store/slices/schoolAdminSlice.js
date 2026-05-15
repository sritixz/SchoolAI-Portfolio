import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import api from "../../api";

// ── Dashboard ─────────────────────────────────────────────────
export const fetchAdminDashboard = createAsyncThunk("schoolAdmin/fetchDashboard", async (_, { rejectWithValue }) => {
  try { return (await api.get("/schooladmin/dashboard")).data; }
  catch (err) { return rejectWithValue(err.response?.data ?? err.message); }
});

// ── Grades ────────────────────────────────────────────────────
export const fetchGrades = createAsyncThunk("schoolAdmin/fetchGrades", async (_, { rejectWithValue }) => {
  try { return (await api.get("/schooladmin/grades")).data; }
  catch (err) { return rejectWithValue(err.response?.data ?? err.message); }
});
export const createGrade = createAsyncThunk("schoolAdmin/createGrade", async (payload, { rejectWithValue }) => {
  try { return (await api.post("/schooladmin/grades", payload)).data; }
  catch (err) { return rejectWithValue(err.response?.data ?? err.message); }
});
export const updateGrade = createAsyncThunk("schoolAdmin/updateGrade", async ({ id, ...body }, { rejectWithValue }) => {
  try { return (await api.patch(`/schooladmin/grades/${id}`, body)).data; }
  catch (err) { return rejectWithValue(err.response?.data ?? err.message); }
});
export const deleteGrade = createAsyncThunk("schoolAdmin/deleteGrade", async (id, { rejectWithValue }) => {
  try { await api.delete(`/schooladmin/grades/${id}`); return id; }
  catch (err) { return rejectWithValue(err.response?.data ?? err.message); }
});

// ── Sections ──────────────────────────────────────────────────
export const fetchSections = createAsyncThunk("schoolAdmin/fetchSections", async (gradeId, { rejectWithValue }) => {
  try { return (await api.get("/schooladmin/sections", { params: gradeId ? { grade_id: gradeId } : {} })).data; }
  catch (err) { return rejectWithValue(err.response?.data ?? err.message); }
});
export const createSection = createAsyncThunk("schoolAdmin/createSection", async (payload, { rejectWithValue }) => {
  try { return (await api.post("/schooladmin/sections", payload)).data; }
  catch (err) { return rejectWithValue(err.response?.data ?? err.message); }
});
export const updateSection = createAsyncThunk("schoolAdmin/updateSection", async ({ id, ...body }, { rejectWithValue }) => {
  try { return (await api.patch(`/schooladmin/sections/${id}`, body)).data; }
  catch (err) { return rejectWithValue(err.response?.data ?? err.message); }
});
export const deleteSection = createAsyncThunk("schoolAdmin/deleteSection", async (id, { rejectWithValue }) => {
  try { await api.delete(`/schooladmin/sections/${id}`); return id; }
  catch (err) { return rejectWithValue(err.response?.data ?? err.message); }
});

// ── Subject Assignments ───────────────────────────────────────
export const fetchAssignments = createAsyncThunk("schoolAdmin/fetchAssignments", async (sectionId, { rejectWithValue }) => {
  try { return (await api.get(`/schooladmin/sections/${sectionId}/assignments`)).data; }
  catch (err) { return rejectWithValue(err.response?.data ?? err.message); }
});
export const upsertAssignment = createAsyncThunk("schoolAdmin/upsertAssignment", async ({ sectionId, ...body }, { rejectWithValue }) => {
  try { return (await api.put(`/schooladmin/sections/${sectionId}/assignments`, body)).data; }
  catch (err) { return rejectWithValue(err.response?.data ?? err.message); }
});
export const removeAssignment = createAsyncThunk("schoolAdmin/removeAssignment", async ({ sectionId, subject }, { rejectWithValue }) => {
  try { await api.delete(`/schooladmin/sections/${sectionId}/assignments/${subject}`); return { sectionId, subject }; }
  catch (err) { return rejectWithValue(err.response?.data ?? err.message); }
});

// ── Teachers ──────────────────────────────────────────────────
export const fetchTeachers = createAsyncThunk("schoolAdmin/fetchTeachers", async (_, { rejectWithValue }) => {
  try { return (await api.get("/schooladmin/teachers")).data; }
  catch (err) { return rejectWithValue(err.response?.data ?? err.message); }
});
export const createTeacher = createAsyncThunk("schoolAdmin/createTeacher", async (payload, { rejectWithValue }) => {
  try { return (await api.post("/schooladmin/teachers", payload)).data; }
  catch (err) { return rejectWithValue(err.response?.data ?? err.message); }
});
export const updateTeacher = createAsyncThunk("schoolAdmin/updateTeacher", async ({ id, ...body }, { rejectWithValue }) => {
  try { return (await api.patch(`/schooladmin/teachers/${id}`, body)).data; }
  catch (err) { return rejectWithValue(err.response?.data ?? err.message); }
});
export const deleteTeacher = createAsyncThunk("schoolAdmin/deleteTeacher", async (id, { rejectWithValue }) => {
  try { await api.delete(`/schooladmin/teachers/${id}`); return id; }
  catch (err) { return rejectWithValue(err.response?.data ?? err.message); }
});

// ── Students ──────────────────────────────────────────────────
export const fetchStudents = createAsyncThunk("schoolAdmin/fetchStudents", async (params = {}, { rejectWithValue }) => {
  try { return (await api.get("/schooladmin/students", { params })).data; }
  catch (err) { return rejectWithValue(err.response?.data ?? err.message); }
});
export const createStudent = createAsyncThunk("schoolAdmin/createStudent", async (payload, { rejectWithValue }) => {
  try { return (await api.post("/schooladmin/students", payload)).data; }
  catch (err) { return rejectWithValue(err.response?.data ?? err.message); }
});
export const updateStudent = createAsyncThunk("schoolAdmin/updateStudent", async ({ id, ...body }, { rejectWithValue }) => {
  try { return (await api.patch(`/schooladmin/students/${id}`, body)).data; }
  catch (err) { return rejectWithValue(err.response?.data ?? err.message); }
});
export const deleteStudent = createAsyncThunk("schoolAdmin/deleteStudent", async (id, { rejectWithValue }) => {
  try { await api.delete(`/schooladmin/students/${id}`); return id; }
  catch (err) { return rejectWithValue(err.response?.data ?? err.message); }
});
export const transferStudent = createAsyncThunk("schoolAdmin/transferStudent", async (payload, { rejectWithValue }) => {
  try { return (await api.post("/schooladmin/students/transfer", payload)).data; }
  catch (err) { return rejectWithValue(err.response?.data ?? err.message); }
});

// ── Parents ───────────────────────────────────────────────────
export const fetchParents = createAsyncThunk("schoolAdmin/fetchParents", async (_, { rejectWithValue }) => {
  try { return (await api.get("/schooladmin/parents")).data; }
  catch (err) { return rejectWithValue(err.response?.data ?? err.message); }
});
export const createParent = createAsyncThunk("schoolAdmin/createParent", async (payload, { rejectWithValue }) => {
  try { return (await api.post("/schooladmin/parents", payload)).data; }
  catch (err) { return rejectWithValue(err.response?.data ?? err.message); }
});
export const updateParent = createAsyncThunk("schoolAdmin/updateParent", async ({ id, ...body }, { rejectWithValue }) => {
  try { return (await api.patch(`/schooladmin/parents/${id}`, body)).data; }
  catch (err) { return rejectWithValue(err.response?.data ?? err.message); }
});
export const fetchTeacherCredentials = createAsyncThunk("schoolAdmin/fetchTeacherCredentials", async (id, { rejectWithValue }) => {
  try { return (await api.get(`/schooladmin/teachers/${id}/credentials`)).data; }
  catch (err) { return rejectWithValue(err.response?.data ?? err.message); }
});
export const fetchParentCredentials = createAsyncThunk("schoolAdmin/fetchParentCredentials", async (id, { rejectWithValue }) => {
  try { return (await api.get(`/schooladmin/parents/${id}/credentials`)).data; }
  catch (err) { return rejectWithValue(err.response?.data ?? err.message); }
});
export const linkChildToParent = createAsyncThunk("schoolAdmin/linkChildToParent", async ({ parentId, studentId }, { rejectWithValue }) => {
  try { return (await api.post(`/schooladmin/parents/${parentId}/link-child/${studentId}`)).data; }
  catch (err) { return rejectWithValue(err.response?.data ?? err.message); }
});
export const unlinkChildFromParent = createAsyncThunk("schoolAdmin/unlinkChildFromParent", async ({ parentId, studentId }, { rejectWithValue }) => {
  try { return (await api.delete(`/schooladmin/parents/${parentId}/unlink-child/${studentId}`)).data; }
  catch (err) { return rejectWithValue(err.response?.data ?? err.message); }
});

export const fetchPerformanceTrends = createAsyncThunk("schoolAdmin/fetchPerformanceTrends", async (_, { rejectWithValue }) => {
  try { return (await api.get("/schooladmin/performance-trends")).data; }
  catch (err) { return rejectWithValue(err.response?.data ?? err.message); }
});
export const fetchLearningGapsSummary = createAsyncThunk("schoolAdmin/fetchLearningGapsSummary", async (_, { rejectWithValue }) => {
  try { return (await api.get("/schooladmin/learning-gaps-summary")).data; }
  catch (err) { return rejectWithValue(err.response?.data ?? err.message); }
});

// ── Analytics ─────────────────────────────────────────────────
export const fetchPerformanceMatrix = createAsyncThunk("schoolAdmin/fetchPerformanceMatrix", async (_, { rejectWithValue }) => {
  try { return (await api.get("/schooladmin/performance-matrix")).data; }
  catch (err) { return rejectWithValue(err.response?.data ?? err.message); }
});
export const fetchGapHeatmap = createAsyncThunk("schoolAdmin/fetchGapHeatmap", async (_, { rejectWithValue }) => {
  try { return (await api.get("/schooladmin/gap-heatmap")).data; }
  catch (err) { return rejectWithValue(err.response?.data ?? err.message); }
});
export const fetchCrossClass = createAsyncThunk("schoolAdmin/fetchCrossClass", async (_, { rejectWithValue }) => {
  try { return (await api.get("/schooladmin/cross-class")).data; }
  catch (err) { return rejectWithValue(err.response?.data ?? err.message); }
});
export const fetchCurriculumTracker = createAsyncThunk("schoolAdmin/fetchCurriculumTracker", async (_, { rejectWithValue }) => {
  try { return (await api.get("/schooladmin/curriculum-tracker")).data; }
  catch (err) { return rejectWithValue(err.response?.data ?? err.message); }
});
export const fetchWeakTopics = createAsyncThunk("schoolAdmin/fetchWeakTopics", async (_, { rejectWithValue }) => {
  try { return (await api.get("/schooladmin/weak-topics")).data; }
  catch (err) { return rejectWithValue(err.response?.data ?? err.message); }
});
export const fetchTeacherSupport = createAsyncThunk("schoolAdmin/fetchTeacherSupport", async (_, { rejectWithValue }) => {
  try { return (await api.get("/schooladmin/teacher-support")).data; }
  catch (err) { return rejectWithValue(err.response?.data ?? err.message); }
});
export const fetchAuditLogs = createAsyncThunk("schoolAdmin/fetchAuditLogs", async (params = {}, { rejectWithValue }) => {
  try { return (await api.get("/schooladmin/audit-logs", { params })).data; }
  catch (err) { return rejectWithValue(err.response?.data ?? err.message); }
});
export const resetCredentials = createAsyncThunk("schoolAdmin/resetCredentials", async (payload, { rejectWithValue }) => {
  try { return (await api.post("/schooladmin/reset-credentials", payload)).data; }
  catch (err) { return rejectWithValue(err.response?.data ?? err.message); }
});

// ── Slice ─────────────────────────────────────────────────────
function statusReducers(statusKey, dataKey) {
  return {
    pending:   (s) => { s[statusKey] = "loading"; },
    fulfilled: (s, a) => { s[statusKey] = "succeeded"; s[dataKey] = a.payload; },
    rejected:  (s) => { s[statusKey] = "failed"; },
  };
}

const schoolAdminSlice = createSlice({
  name: "schoolAdmin",
  initialState: {
    dashboard:         null, dashboardStatus:    "idle",
    grades:            [], gradesStatus:        "idle",
    sections:          [], sectionsStatus:      "idle",
    assignments:       [], assignmentsStatus:   "idle",
    teachers:          [], teachersStatus:      "idle",
    students:          [], studentsStatus:      "idle",
    parents:           [], parentsStatus:       "idle",
    performanceMatrix: [], performanceStatus:   "idle",
    gapHeatmap:        [], heatmapStatus:       "idle",
    crossClass:        [], crossClassStatus:    "idle",
    curriculumTracker: [], curriculumStatus:    "idle",
    weakTopics:        [], weakTopicsStatus:    "idle",
    teacherSupport:    [], teacherSupportStatus:"idle",
    auditLogs:         [], auditLogsStatus:     "idle",
    performanceTrends: [], trendsStatus:        "idle",
    gapsSummary:       null, gapsSummaryStatus: "idle",
    mutationStatus:    "idle",
    mutationError:     null,
  },
  reducers: {
    clearMutationStatus(s) { s.mutationStatus = "idle"; s.mutationError = null; },
  },
  extraReducers: (b) => {
    const add = (thunk, statusKey, dataKey) => {
      b.addCase(thunk.pending,   (s) => { s[statusKey] = "loading"; })
       .addCase(thunk.fulfilled, (s, a) => { s[statusKey] = "succeeded"; if (dataKey) s[dataKey] = a.payload; })
       .addCase(thunk.rejected,  (s) => { s[statusKey] = "failed"; });
    };

    add(fetchAdminDashboard,    "dashboardStatus",    "dashboard");
    add(fetchGrades,            "gradesStatus",       "grades");
    add(fetchSections,          "sectionsStatus",     "sections");
    add(fetchAssignments,       "assignmentsStatus",  "assignments");
    add(fetchTeachers,          "teachersStatus",     "teachers");
    add(fetchStudents,          "studentsStatus",     "students");
    add(fetchParents,           "parentsStatus",      "parents");
    add(fetchPerformanceMatrix, "performanceStatus",  "performanceMatrix");
    add(fetchGapHeatmap,        "heatmapStatus",      "gapHeatmap");
    add(fetchCrossClass,        "crossClassStatus",   "crossClass");
    add(fetchCurriculumTracker, "curriculumStatus",   "curriculumTracker");
    add(fetchWeakTopics,        "weakTopicsStatus",   "weakTopics");
    add(fetchTeacherSupport,    "teacherSupportStatus","teacherSupport");
    add(fetchAuditLogs,         "auditLogsStatus",    "auditLogs");
    add(fetchPerformanceTrends, "trendsStatus",       "performanceTrends");
    add(fetchLearningGapsSummary,"gapsSummaryStatus", "gapsSummary");

    // Mutations — update local lists optimistically after success
    [createGrade, updateGrade, deleteGrade,
     createSection, updateSection, deleteSection,
     createTeacher, updateTeacher, deleteTeacher,
     createStudent, updateStudent, deleteStudent, transferStudent,
     createParent, updateParent,
     linkChildToParent, unlinkChildFromParent,
     upsertAssignment, removeAssignment,
     resetCredentials].forEach((thunk) => {
      b.addCase(thunk.pending,   (s) => { s.mutationStatus = "loading"; s.mutationError = null; })
       .addCase(thunk.fulfilled, (s) => { s.mutationStatus = "succeeded"; })
       .addCase(thunk.rejected,  (s, a) => { s.mutationStatus = "failed"; s.mutationError = a.payload; });
    });
  },
});

export const { clearMutationStatus } = schoolAdminSlice.actions;

export const selectAdminDashboard    = (s) => s.schoolAdmin.dashboard;
export const selectGrades            = (s) => s.schoolAdmin.grades;
export const selectGradesStatus      = (s) => s.schoolAdmin.gradesStatus;
export const selectSections          = (s) => s.schoolAdmin.sections;
export const selectSectionsStatus    = (s) => s.schoolAdmin.sectionsStatus;
export const selectAssignments       = (s) => s.schoolAdmin.assignments;
export const selectTeachers          = (s) => s.schoolAdmin.teachers;
export const selectTeachersStatus    = (s) => s.schoolAdmin.teachersStatus;
export const selectStudents          = (s) => s.schoolAdmin.students;
export const selectStudentsStatus    = (s) => s.schoolAdmin.studentsStatus;
export const selectParents           = (s) => s.schoolAdmin.parents;
export const selectParentsStatus     = (s) => s.schoolAdmin.parentsStatus;
export const selectPerformanceMatrix = (s) => s.schoolAdmin.performanceMatrix;
export const selectGapHeatmap        = (s) => s.schoolAdmin.gapHeatmap;
export const selectCrossClass        = (s) => s.schoolAdmin.crossClass;
export const selectCurriculumTracker = (s) => s.schoolAdmin.curriculumTracker;
export const selectWeakTopics        = (s) => s.schoolAdmin.weakTopics;
export const selectTeacherSupport    = (s) => s.schoolAdmin.teacherSupport;
export const selectAuditLogs         = (s) => s.schoolAdmin.auditLogs;
export const selectPerformanceTrends = (s) => s.schoolAdmin.performanceTrends;
export const selectGapsSummary       = (s) => s.schoolAdmin.gapsSummary;
export const selectMutationStatus    = (s) => s.schoolAdmin.mutationStatus;
export const selectMutationError     = (s) => s.schoolAdmin.mutationError;

export default schoolAdminSlice.reducer;
