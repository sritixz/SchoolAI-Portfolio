import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import api from "../../api";

export const fetchStudentDashboard = createAsyncThunk("student/fetchDashboard", async (_, { rejectWithValue }) => {
  try { return (await api.get("/student/dashboard")).data; }
  catch (err) { return rejectWithValue(err.response?.data ?? err.message); }
});

export const fetchStudentProfile = createAsyncThunk("student/fetchProfile", async (_, { rejectWithValue }) => {
  try { return (await api.get("/student/profile")).data; }
  catch (err) { return rejectWithValue(err.response?.data ?? err.message); }
});

export const fetchStudentGrades = createAsyncThunk("student/fetchGrades", async (_, { rejectWithValue }) => {
  try { return (await api.get("/student/grades")).data; }
  catch (err) { return rejectWithValue(err.response?.data ?? err.message); }
});

export const fetchStudentAttendance = createAsyncThunk("student/fetchAttendance", async (_, { rejectWithValue }) => {
  try { return (await api.get("/student/attendance")).data; }
  catch (err) { return rejectWithValue(err.response?.data ?? err.message); }
});

export const fetchStudentMastery = createAsyncThunk("student/fetchMastery", async (_, { rejectWithValue }) => {
  try { return (await api.get("/student/mastery")).data; }
  catch (err) { return rejectWithValue(err.response?.data ?? err.message); }
});

export const fetchTasks = createAsyncThunk("student/fetchTasks", async (_, { rejectWithValue }) => {
  try { return (await api.get("/student/tasks")).data; }
  catch (err) { return rejectWithValue(err.response?.data ?? err.message); }
});

export const toggleTask = createAsyncThunk("student/toggleTask", async (taskId, { rejectWithValue }) => {
  try { return (await api.patch(`/student/tasks/${taskId}/toggle`)).data; }
  catch (err) { return rejectWithValue(err.response?.data ?? err.message); }
});

export const addTask = createAsyncThunk("student/addTask", async ({ title, subject = "Custom" }, { rejectWithValue }) => {
  try { return (await api.post("/student/tasks", null, { params: { title, subject } })).data; }
  catch (err) { return rejectWithValue(err.response?.data ?? err.message); }
});

const studentSlice = createSlice({
  name: "student",
  initialState: {
    dashboard:        null, dashboardStatus:  "idle",
    profile:          null, profileStatus:    "idle",
    grades:           [],   gradesStatus:     "idle",
    attendance:       null, attendanceStatus: "idle",
    mastery:          null, masteryStatus:    "idle",
    tasks:            [],   tasksStatus:      "idle",
  },
  reducers: {
    // Optimistic toggle
    optimisticToggleTask(state, { payload: taskId }) {
      const t = state.tasks.find((t) => t.id === taskId || t._id === taskId);
      if (t) t.done = !t.done;
    },
    // Optimistic add
    optimisticAddTask(state, { payload }) {
      state.tasks.push(payload);
    },
  },
  extraReducers: (b) => {
    b.addCase(fetchStudentDashboard.pending,   (s) => { s.dashboardStatus = "loading"; })
     .addCase(fetchStudentDashboard.fulfilled, (s, a) => { s.dashboardStatus = "succeeded"; s.dashboard = a.payload; if (a.payload.today_tasks) s.tasks = a.payload.today_tasks; })
     .addCase(fetchStudentDashboard.rejected,  (s) => { s.dashboardStatus = "failed"; });

    b.addCase(fetchStudentProfile.fulfilled, (s, a) => { s.profile = a.payload; s.profileStatus = "succeeded"; });
    b.addCase(fetchStudentGrades.fulfilled,  (s, a) => { s.grades = a.payload; s.gradesStatus = "succeeded"; });
    b.addCase(fetchStudentAttendance.fulfilled, (s, a) => { s.attendance = a.payload; s.attendanceStatus = "succeeded"; });
    b.addCase(fetchStudentMastery.fulfilled, (s, a) => { s.mastery = a.payload; s.masteryStatus = "succeeded"; });

    b.addCase(fetchTasks.pending,   (s) => { s.tasksStatus = "loading"; })
     .addCase(fetchTasks.fulfilled, (s, a) => { s.tasksStatus = "succeeded"; s.tasks = a.payload; })
     .addCase(fetchTasks.rejected,  (s) => { s.tasksStatus = "failed"; });

    b.addCase(addTask.fulfilled, (s, a) => {
      // Replace optimistic entry with real one from server
      s.tasks = s.tasks.filter((t) => !t._optimistic);
      s.tasks.push(a.payload);
    });
  },
});

export const { optimisticToggleTask, optimisticAddTask } = studentSlice.actions;

export const selectDashboard       = (s) => s.student.dashboard;
export const selectStudentProfile  = (s) => s.student.profile;
export const selectGrades          = (s) => s.student.grades;
export const selectAttendance      = (s) => s.student.attendance;
export const selectMastery         = (s) => s.student.mastery;
export const selectTasks           = (s) => s.student.tasks;
export const selectTasksStatus     = (s) => s.student.tasksStatus;

export default studentSlice.reducer;
