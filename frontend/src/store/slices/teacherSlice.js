import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import api from "../../api";

export const fetchTeacherDashboard = createAsyncThunk("teacher/fetchDashboard", async (_, { rejectWithValue }) => {
  try { return (await api.get("/teacher/dashboard")).data; }
  catch (err) { return rejectWithValue(err.response?.data ?? err.message); }
});

export const fetchMyStudents = createAsyncThunk("teacher/fetchMyStudents", async (_, { rejectWithValue }) => {
  try { return (await api.get("/teacher/my-students")).data; }
  catch (err) { return rejectWithValue(err.response?.data ?? err.message); }
});

export const fetchMySections = createAsyncThunk("teacher/fetchMySections", async (_, { rejectWithValue }) => {
  try { return (await api.get("/teacher/my-sections")).data; }
  catch (err) { return rejectWithValue(err.response?.data ?? err.message); }
});

export const fetchStudentsByClass = createAsyncThunk("teacher/fetchStudentsByClass", async (className, { rejectWithValue }) => {
  try { return (await api.get("/teacher/students/by-class", { params: { class_name: className } })).data; }
  catch (err) { return rejectWithValue(err.response?.data ?? err.message); }
});

export const fetchSchedule = createAsyncThunk("teacher/fetchSchedule", async (_, { rejectWithValue }) => {
  try { return (await api.get("/teacher/schedule")).data; }
  catch (err) { return rejectWithValue(err.response?.data ?? err.message); }
});

export const fetchInterventions = createAsyncThunk("teacher/fetchInterventions", async (_, { rejectWithValue }) => {
  try { return (await api.get("/teacher/interventions")).data; }
  catch (err) { return rejectWithValue(err.response?.data ?? err.message); }
});

export const fetchInterventionStats = createAsyncThunk("teacher/fetchInterventionStats", async (_, { rejectWithValue }) => {
  try { return (await api.get("/teacher/interventions/stats")).data; }
  catch (err) { return rejectWithValue(err.response?.data ?? err.message); }
});

export const fetchTopicMastery = createAsyncThunk("teacher/fetchTopicMastery", async (classId, { rejectWithValue }) => {
  try { return (await api.get("/teacher/topic-mastery", { params: { class_id: classId } })).data; }
  catch (err) { return rejectWithValue(err.response?.data ?? err.message); }
});

export const fetchParentMessages = createAsyncThunk("teacher/fetchParentMessages", async (_, { rejectWithValue }) => {
  try { return (await api.get("/teacher/parent-communication")).data; }
  catch (err) { return rejectWithValue(err.response?.data ?? err.message); }
});

export const sendParentMessage = createAsyncThunk("teacher/sendParentMessage", async ({ studentId, message }, { rejectWithValue }) => {
  try { return (await api.post("/teacher/parent-communication/send", null, { params: { student_id: studentId, message } })).data; }
  catch (err) { return rejectWithValue(err.response?.data ?? err.message); }
});

export const generateAiQuestions = createAsyncThunk("teacher/generateAiQuestions", async (payload, { rejectWithValue }) => {
  try { return (await api.post("/teacher/ai-generate-questions", payload)).data; }
  catch (err) { return rejectWithValue(err.response?.data ?? err.message); }
});

export const runAiTool = createAsyncThunk("teacher/runAiTool", async (payload, { rejectWithValue }) => {
  try { return (await api.post("/teacher/ai-tool", payload)).data; }
  catch (err) { return rejectWithValue(err.response?.data ?? err.message); }
});

export const fetchMeetingRequests = createAsyncThunk("teacher/fetchMeetingRequests", async (_, { rejectWithValue }) => {
  try { return (await api.get("/teacher/meeting-requests")).data; }
  catch (err) { return rejectWithValue(err.response?.data ?? err.message); }
});

export const createMeetingRequest = createAsyncThunk("teacher/createMeetingRequest", async (payload, { rejectWithValue }) => {
  try { return (await api.post("/teacher/meeting-requests", payload)).data; }
  catch (err) { return rejectWithValue(err.response?.data ?? err.message); }
});

export const confirmMeetingRequest = createAsyncThunk("teacher/confirmMeetingRequest", async ({ reqId, timeIndex }, { rejectWithValue }) => {
  try { return (await api.patch(`/teacher/meeting-requests/${reqId}/confirm`, null, { params: { time_index: timeIndex } })).data; }
  catch (err) { return rejectWithValue(err.response?.data ?? err.message); }
});

// ── Student Groups ────────────────────────────────────────────
export const fetchGroups = createAsyncThunk("teacher/fetchGroups", async (_, { rejectWithValue }) => {
  try { return (await api.get("/teacher/groups")).data; }
  catch (err) { return rejectWithValue(err.response?.data ?? err.message); }
});

export const createGroup = createAsyncThunk("teacher/createGroup", async (payload, { rejectWithValue }) => {
  try { return (await api.post("/teacher/groups", payload)).data; }
  catch (err) { return rejectWithValue(err.response?.data ?? err.message); }
});

export const bulkSaveGroups = createAsyncThunk("teacher/bulkSaveGroups", async (payload, { rejectWithValue }) => {
  try { return (await api.put("/teacher/groups/bulk", payload)).data; }
  catch (err) { return rejectWithValue(err.response?.data ?? err.message); }
});

export const updateGroup = createAsyncThunk("teacher/updateGroup", async ({ id, ...body }, { rejectWithValue }) => {
  try { return (await api.patch(`/teacher/groups/${id}`, body)).data; }
  catch (err) { return rejectWithValue(err.response?.data ?? err.message); }
});

export const deleteGroup = createAsyncThunk("teacher/deleteGroup", async (id, { rejectWithValue }) => {
  try { await api.delete(`/teacher/groups/${id}`); return id; }
  catch (err) { return rejectWithValue(err.response?.data ?? err.message); }
});

const teacherSlice = createSlice({
  name: "teacher",
  initialState: {
    dashboard:          null, dashboardStatus:    "idle",
    myStudents:         [], myStudentsStatus:   "idle",
    mySections:         [], mySectionsStatus:   "idle",
    studentsByClass:    [], studentsByClassStatus:"idle",
    schedule:           [], scheduleStatus:     "idle",
    interventions:      [], interventionsStatus:"idle",
    interventionStats:  null,
    topicMastery:       [], topicMasteryStatus: "idle",
    parentMessages:     [], parentMessagesStatus:"idle",
    generatedQuestions: [], generateStatus:     "idle", generateError: null,
    aiToolResult:       null, aiToolStatus:      "idle", aiToolError:   null,
    meetingRequests:    [], meetingRequestsStatus: "idle",
    // Backend-persisted student groups (single source of truth)
    groups:             [], groupsStatus: "idle",
    // Differentiated homework session state (persists across navigation)
    diffGroups:         [],
    diffContext:        null,
    diffAssignments:    [],
  },  reducers: {
    clearGeneratedQuestions(s) { s.generatedQuestions = []; s.generateStatus = "idle"; s.generateError = null; },
    clearAiToolResult(s)       { s.aiToolResult = null; s.aiToolStatus = "idle"; s.aiToolError = null; },
    appendGeneratedQuestions(s, { payload }) { s.generatedQuestions = [...s.generatedQuestions, ...payload]; },
    setDiffGroups(s, { payload }) { s.diffGroups = payload; },
    setDiffContext(s, { payload }) { s.diffContext = payload; },
    clearDiffSession(s) { s.diffGroups = []; s.diffContext = null; },
    addDiffAssignment(s, { payload }) { s.diffAssignments = [payload, ...s.diffAssignments.slice(0, 9)]; },
  },
  extraReducers: (b) => {
    b.addCase(fetchTeacherDashboard.pending,   (s) => { s.dashboardStatus = "loading"; })
     .addCase(fetchTeacherDashboard.fulfilled, (s, a) => { s.dashboardStatus = "succeeded"; s.dashboard = a.payload; })
     .addCase(fetchTeacherDashboard.rejected,  (s) => { s.dashboardStatus = "failed"; });

    b.addCase(fetchMyStudents.pending,   (s) => { s.myStudentsStatus = "loading"; })
     .addCase(fetchMyStudents.fulfilled, (s, a) => { s.myStudentsStatus = "succeeded"; s.myStudents = a.payload; })
     .addCase(fetchMyStudents.rejected,  (s) => { s.myStudentsStatus = "failed"; });

    b.addCase(fetchMySections.fulfilled, (s, a) => { s.mySectionsStatus = "succeeded"; s.mySections = a.payload; });

    b.addCase(fetchStudentsByClass.pending,   (s) => { s.studentsByClassStatus = "loading"; })
     .addCase(fetchStudentsByClass.fulfilled, (s, a) => { s.studentsByClassStatus = "succeeded"; s.studentsByClass = a.payload; })
     .addCase(fetchStudentsByClass.rejected,  (s) => { s.studentsByClassStatus = "failed"; });

    b.addCase(fetchSchedule.fulfilled,     (s, a) => { s.schedule = a.payload; });
    b.addCase(fetchInterventions.fulfilled,(s, a) => { s.interventions = a.payload; });
    b.addCase(fetchInterventionStats.fulfilled,(s, a) => { s.interventionStats = a.payload; });
    b.addCase(fetchTopicMastery.fulfilled, (s, a) => { s.topicMastery = a.payload; });

    b.addCase(fetchParentMessages.fulfilled, (s, a) => { s.parentMessages = a.payload; s.parentMessagesStatus = "succeeded"; });

    b.addCase(generateAiQuestions.pending,   (s) => { s.generateStatus = "loading"; s.generateError = null; })
     .addCase(generateAiQuestions.fulfilled, (s, a) => { s.generateStatus = "succeeded"; s.generatedQuestions = [...s.generatedQuestions, ...a.payload]; })
     .addCase(generateAiQuestions.rejected,  (s, a) => { s.generateStatus = "failed"; s.generateError = a.payload; });

    b.addCase(runAiTool.pending,   (s) => { s.aiToolStatus = "loading"; s.aiToolError = null; })
     .addCase(runAiTool.fulfilled, (s, a) => { s.aiToolStatus = "succeeded"; s.aiToolResult = a.payload; })
     .addCase(runAiTool.rejected,  (s, a) => { s.aiToolStatus = "failed"; s.aiToolError = a.payload; });

    b.addCase(fetchMeetingRequests.fulfilled, (s, a) => { s.meetingRequests = a.payload; s.meetingRequestsStatus = "succeeded"; });
    b.addCase(createMeetingRequest.fulfilled, (s, a) => { s.meetingRequests = [a.payload, ...s.meetingRequests]; });

    // Groups
    b.addCase(fetchGroups.pending,   (s) => { s.groupsStatus = "loading"; })
     .addCase(fetchGroups.fulfilled, (s, a) => { s.groupsStatus = "succeeded"; s.groups = a.payload; s.diffGroups = a.payload; })
     .addCase(fetchGroups.rejected,  (s) => { s.groupsStatus = "failed"; });

    b.addCase(createGroup.fulfilled, (s, a) => { s.groups = [...s.groups, a.payload]; s.diffGroups = s.groups; });

    b.addCase(bulkSaveGroups.fulfilled, (s, a) => { s.groups = a.payload; s.diffGroups = a.payload; s.groupsStatus = "succeeded"; });

    b.addCase(updateGroup.fulfilled, (s, a) => {
      s.groups = s.groups.map((g) => (g._id === a.payload._id ? a.payload : g));
      s.diffGroups = s.groups;
    });

    b.addCase(deleteGroup.fulfilled, (s, a) => {
      s.groups = s.groups.filter((g) => g._id !== a.payload);
      s.diffGroups = s.groups;
    });
  },
});

export const { clearGeneratedQuestions, clearAiToolResult, appendGeneratedQuestions,
               setDiffGroups, setDiffContext, clearDiffSession, addDiffAssignment } = teacherSlice.actions;

export const selectTeacherDashboard    = (s) => s.teacher.dashboard;
export const selectMyStudents          = (s) => s.teacher.myStudents;
export const selectMySections          = (s) => s.teacher.mySections;
export const selectStudentsByClass     = (s) => s.teacher.studentsByClass;
export const selectStudentsByClassStatus=(s) => s.teacher.studentsByClassStatus;
export const selectSchedule            = (s) => s.teacher.schedule;
export const selectInterventions       = (s) => s.teacher.interventions;
export const selectInterventionStats   = (s) => s.teacher.interventionStats;
export const selectTopicMastery        = (s) => s.teacher.topicMastery;
export const selectParentMessages      = (s) => s.teacher.parentMessages;
export const selectGeneratedQuestions  = (s) => s.teacher.generatedQuestions;
export const selectGenerateStatus      = (s) => s.teacher.generateStatus;
export const selectGenerateError       = (s) => s.teacher.generateError;
export const selectAiToolResult        = (s) => s.teacher.aiToolResult;
export const selectAiToolStatus        = (s) => s.teacher.aiToolStatus;
export const selectMeetingRequests     = (s) => s.teacher.meetingRequests;
export const selectDiffGroups          = (s) => s.teacher.diffGroups;
export const selectDiffContext         = (s) => s.teacher.diffContext;
export const selectDiffAssignments     = (s) => s.teacher.diffAssignments;
export const selectGroups              = (s) => s.teacher.groups;
export const selectGroupsStatus        = (s) => s.teacher.groupsStatus;

export default teacherSlice.reducer;
