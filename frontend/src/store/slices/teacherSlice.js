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

const teacherSlice = createSlice({
  name: "teacher",
  initialState: {
    dashboard:          null, dashboardStatus:    "idle",
    myStudents:         [], myStudentsStatus:   "idle",
    mySections:         [], mySectionsStatus:   "idle",
    studentsByClass:    [], studentsByClassStatus:"idle",
    schedule:           [], scheduleStatus:     "idle",
    interventions:      [], interventionsStatus:"idle",
    topicMastery:       [], topicMasteryStatus: "idle",
    parentMessages:     [], parentMessagesStatus:"idle",
    generatedQuestions: [], generateStatus:     "idle", generateError: null,
    aiToolResult:       null, aiToolStatus:      "idle", aiToolError:   null,
  },
  reducers: {
    clearGeneratedQuestions(s) { s.generatedQuestions = []; s.generateStatus = "idle"; s.generateError = null; },
    clearAiToolResult(s)       { s.aiToolResult = null; s.aiToolStatus = "idle"; s.aiToolError = null; },
    appendGeneratedQuestions(s, { payload }) { s.generatedQuestions = [...s.generatedQuestions, ...payload]; },
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
    b.addCase(fetchTopicMastery.fulfilled, (s, a) => { s.topicMastery = a.payload; });

    b.addCase(fetchParentMessages.fulfilled, (s, a) => { s.parentMessages = a.payload; s.parentMessagesStatus = "succeeded"; });

    b.addCase(generateAiQuestions.pending,   (s) => { s.generateStatus = "loading"; s.generateError = null; })
     .addCase(generateAiQuestions.fulfilled, (s, a) => { s.generateStatus = "succeeded"; s.generatedQuestions = [...s.generatedQuestions, ...a.payload]; })
     .addCase(generateAiQuestions.rejected,  (s, a) => { s.generateStatus = "failed"; s.generateError = a.payload; });

    b.addCase(runAiTool.pending,   (s) => { s.aiToolStatus = "loading"; s.aiToolError = null; })
     .addCase(runAiTool.fulfilled, (s, a) => { s.aiToolStatus = "succeeded"; s.aiToolResult = a.payload; })
     .addCase(runAiTool.rejected,  (s, a) => { s.aiToolStatus = "failed"; s.aiToolError = a.payload; });
  },
});

export const { clearGeneratedQuestions, clearAiToolResult, appendGeneratedQuestions } = teacherSlice.actions;

export const selectTeacherDashboard    = (s) => s.teacher.dashboard;
export const selectMyStudents          = (s) => s.teacher.myStudents;
export const selectMySections          = (s) => s.teacher.mySections;
export const selectStudentsByClass     = (s) => s.teacher.studentsByClass;
export const selectStudentsByClassStatus=(s) => s.teacher.studentsByClassStatus;
export const selectSchedule            = (s) => s.teacher.schedule;
export const selectInterventions       = (s) => s.teacher.interventions;
export const selectTopicMastery        = (s) => s.teacher.topicMastery;
export const selectParentMessages      = (s) => s.teacher.parentMessages;
export const selectGeneratedQuestions  = (s) => s.teacher.generatedQuestions;
export const selectGenerateStatus      = (s) => s.teacher.generateStatus;
export const selectGenerateError       = (s) => s.teacher.generateError;
export const selectAiToolResult        = (s) => s.teacher.aiToolResult;
export const selectAiToolStatus        = (s) => s.teacher.aiToolStatus;

export default teacherSlice.reducer;
