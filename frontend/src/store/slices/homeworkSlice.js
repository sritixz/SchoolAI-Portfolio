import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import api from "../../api";

// ── Thunks ────────────────────────────────────────────────────

// Student
export const fetchStudentHomework = createAsyncThunk("homework/fetchStudent", async (_, { rejectWithValue }) => {
  try { return (await api.get("/homework/student")).data; }
  catch (err) { return rejectWithValue(err.response?.data ?? err.message); }
});

export const fetchHomeworkById = createAsyncThunk("homework/fetchById", async (id, { rejectWithValue }) => {
  try { return (await api.get(`/homework/${id}`)).data; }
  catch (err) { return rejectWithValue(err.response?.data ?? err.message); }
});

export const fetchHomeworkQuestions = createAsyncThunk("homework/fetchQuestions", async (id, { rejectWithValue }) => {
  try { return (await api.get(`/homework/${id}/questions`)).data; }
  catch (err) { return rejectWithValue(err.response?.data ?? err.message); }
});

export const submitHomework = createAsyncThunk("homework/submit", async (payload, { rejectWithValue }) => {
  try { return (await api.post("/homework/submit", payload)).data; }
  catch (err) { return rejectWithValue(err.response?.data ?? err.message); }
});

export const fetchHomeworkResult = createAsyncThunk("homework/fetchResult", async (id, { rejectWithValue }) => {
  try { return (await api.get(`/homework/${id}/result`)).data; }
  catch (err) { return rejectWithValue(err.response?.data ?? err.message); }
});

export const uploadSubmissionFile = createAsyncThunk("homework/uploadFile", async (file, { rejectWithValue }) => {
  try {
    const fd = new FormData();
    fd.append("file", file);
    return (await api.post("/homework/upload-file", fd, { headers: { "Content-Type": "multipart/form-data" } })).data;
  } catch (err) { return rejectWithValue(err.response?.data ?? err.message); }
});

// Teacher
export const fetchHomeworkLibrary = createAsyncThunk("homework/fetchLibrary", async (_, { rejectWithValue }) => {
  try { return (await api.get("/homework/library")).data; }
  catch (err) { return rejectWithValue(err.response?.data ?? err.message); }
});

export const createHomework = createAsyncThunk("homework/create", async (payload, { rejectWithValue }) => {
  try { return (await api.post("/homework/create", payload)).data; }
  catch (err) { return rejectWithValue(err.response?.data ?? err.message); }
});

export const patchHomeworkQuestions = createAsyncThunk("homework/patchQuestions", async ({ id, questions }, { rejectWithValue }) => {
  try { return (await api.patch(`/homework/${id}/questions`, { questions })).data; }
  catch (err) { return rejectWithValue(err.response?.data ?? err.message); }
});

export const updateHomework = createAsyncThunk("homework/update", async ({ id, ...payload }, { rejectWithValue }) => {
  try { return (await api.put(`/homework/${id}`, payload)).data; }
  catch (err) { return rejectWithValue(err.response?.data ?? err.message); }
});

export const assignHomework = createAsyncThunk("homework/assign", async (payload, { rejectWithValue }) => {
  try { return (await api.post("/homework/assign", payload)).data; }
  catch (err) { return rejectWithValue(err.response?.data ?? err.message); }
});

export const deleteHomework = createAsyncThunk("homework/delete", async (id, { rejectWithValue }) => {
  try { await api.delete(`/homework/${id}`); return id; }
  catch (err) { return rejectWithValue(err.response?.data ?? err.message); }
});

export const fetchSubmissions = createAsyncThunk("homework/fetchSubmissions", async (homeworkId, { rejectWithValue }) => {
  try { return (await api.get(`/homework/${homeworkId}/submissions`)).data; }
  catch (err) { return rejectWithValue(err.response?.data ?? err.message); }
});

export const gradeHomework = createAsyncThunk("homework/grade", async (payload, { rejectWithValue }) => {
  try { return (await api.post("/homework/grade", payload)).data; }
  catch (err) { return rejectWithValue(err.response?.data ?? err.message); }
});

export const triggerAiAnalysis = createAsyncThunk("homework/aiAnalyse", async (submissionId, { rejectWithValue }) => {
  try { return (await api.post("/homework/ai-analyse", { submission_id: submissionId })).data; }
  catch (err) { return rejectWithValue(err.response?.data ?? err.message); }
});

export const fetchEvaluateList = createAsyncThunk("homework/fetchEvaluate", async (homeworkId, { rejectWithValue }) => {
  try { return (await api.get(`/teacher/evaluate/${homeworkId}`)).data; }
  catch (err) { return rejectWithValue(err.response?.data ?? err.message); }
});

// ── Slice ─────────────────────────────────────────────────────
const homeworkSlice = createSlice({
  name: "homework",
  initialState: {
    studentList:    [], studentStatus:  "idle", studentError:   null,
    current:        null, currentStatus:  "idle",
    questions:      [], questionsStatus: "idle",
    submitResult:   null, submitStatus:   "idle", submitError:    null,
    uploadUrl:      null, uploadStatus:   "idle",
    library:        [], libraryStatus:  "idle", libraryError:   null,
    submissions:    [], submissionsStatus: "idle",
    evaluateData:   null, evaluateStatus: "idle",
    gradeStatus:    "idle",
  },
  reducers: {
    clearSubmitResult(s) { s.submitResult = null; s.submitStatus = "idle"; s.submitError = null; },
    clearUpload(s)       { s.uploadUrl = null; s.uploadStatus = "idle"; },
    clearCurrent(s)      { s.current = null; s.questions = []; },
    invalidateStudentList(s) { s.studentStatus = "idle"; },
  },
  extraReducers: (b) => {
    b.addCase(fetchStudentHomework.pending,   (s) => { s.studentStatus = "loading"; })
     .addCase(fetchStudentHomework.fulfilled, (s, a) => {
       s.studentStatus = "succeeded";
       // Deduplicate by id — backend may return duplicate records
       const seen = new Set();
       s.studentList = (a.payload || []).filter((hw) => {
         const key = hw.id ?? hw._id;
         if (seen.has(key)) return false;
         seen.add(key);
         return true;
       });
     })
     .addCase(fetchStudentHomework.rejected,  (s, a) => { s.studentStatus = "failed"; s.studentError = a.payload; });

    b.addCase(fetchHomeworkById.pending,   (s) => { s.currentStatus = "loading"; })
     .addCase(fetchHomeworkById.fulfilled, (s, a) => { s.currentStatus = "succeeded"; s.current = a.payload; })
     .addCase(fetchHomeworkById.rejected,  (s) => { s.currentStatus = "failed"; });

    b.addCase(fetchHomeworkQuestions.pending,   (s) => { s.questionsStatus = "loading"; })
     .addCase(fetchHomeworkQuestions.fulfilled, (s, a) => { s.questionsStatus = "succeeded"; s.questions = a.payload; })
     .addCase(fetchHomeworkQuestions.rejected,  (s) => { s.questionsStatus = "failed"; });

    b.addCase(submitHomework.pending,   (s) => { s.submitStatus = "loading"; s.submitError = null; })
     .addCase(submitHomework.fulfilled, (s, a) => { s.submitStatus = "succeeded"; s.submitResult = a.payload; })
     .addCase(submitHomework.rejected,  (s, a) => { s.submitStatus = "failed"; s.submitError = a.payload; });

    b.addCase(uploadSubmissionFile.pending,   (s) => { s.uploadStatus = "loading"; })
     .addCase(uploadSubmissionFile.fulfilled, (s, a) => { s.uploadStatus = "succeeded"; s.uploadUrl = a.payload.url; })
     .addCase(uploadSubmissionFile.rejected,  (s) => { s.uploadStatus = "failed"; });

    b.addCase(fetchHomeworkLibrary.pending,   (s) => { s.libraryStatus = "loading"; })
     .addCase(fetchHomeworkLibrary.fulfilled, (s, a) => { s.libraryStatus = "succeeded"; s.library = a.payload; })
     .addCase(fetchHomeworkLibrary.rejected,  (s, a) => { s.libraryStatus = "failed"; s.libraryError = a.payload; });

    b.addCase(fetchSubmissions.pending,   (s) => { s.submissionsStatus = "loading"; })
     .addCase(fetchSubmissions.fulfilled, (s, a) => { s.submissionsStatus = "succeeded"; s.submissions = a.payload; })
     .addCase(fetchSubmissions.rejected,  (s) => { s.submissionsStatus = "failed"; });

    b.addCase(fetchEvaluateList.pending,   (s) => { s.evaluateStatus = "loading"; })
     .addCase(fetchEvaluateList.fulfilled, (s, a) => { s.evaluateStatus = "succeeded"; s.evaluateData = a.payload; })
     .addCase(fetchEvaluateList.rejected,  (s) => { s.evaluateStatus = "failed"; });

    b.addCase(gradeHomework.pending,   (s) => { s.gradeStatus = "loading"; })
     .addCase(gradeHomework.fulfilled, (s) => { s.gradeStatus = "succeeded"; })
     .addCase(gradeHomework.rejected,  (s) => { s.gradeStatus = "failed"; });

    b.addCase(deleteHomework.fulfilled, (s, a) => {
      s.library = s.library.filter((hw) => (hw._id || hw.id) !== a.payload);
    });
  },
});

export const { clearSubmitResult, clearUpload, clearCurrent, invalidateStudentList } = homeworkSlice.actions;

export const selectStudentHomework  = (s) => s.homework.studentList;
export const selectStudentHwStatus  = (s) => s.homework.studentStatus;
export const selectCurrentHomework  = (s) => s.homework.current;
export const selectHomeworkQuestions= (s) => s.homework.questions;
export const selectSubmitResult     = (s) => s.homework.submitResult;
export const selectSubmitStatus     = (s) => s.homework.submitStatus;
export const selectUploadUrl        = (s) => s.homework.uploadUrl;
export const selectUploadStatus     = (s) => s.homework.uploadStatus;
export const selectHomeworkLibrary  = (s) => s.homework.library;
export const selectLibraryStatus    = (s) => s.homework.libraryStatus;
export const selectSubmissions      = (s) => s.homework.submissions;
export const selectEvaluateData     = (s) => s.homework.evaluateData;
export const selectEvaluateStatus   = (s) => s.homework.evaluateStatus;

export default homeworkSlice.reducer;
