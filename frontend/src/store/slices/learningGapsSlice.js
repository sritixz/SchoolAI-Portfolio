import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import api from "../../api";

export const fetchLearningGaps = createAsyncThunk("learningGaps/fetchAll", async (_, { rejectWithValue }) => {
  try { return (await api.get("/learning-gaps/")).data; }
  catch (err) { return rejectWithValue(err.response?.data ?? err.message); }
});

export const fetchGapHealth = createAsyncThunk("learningGaps/fetchHealth", async (_, { rejectWithValue }) => {
  try { return (await api.get("/learning-gaps/health")).data; }
  catch (err) { return rejectWithValue(err.response?.data ?? err.message); }
});

export const fetchGapById = createAsyncThunk("learningGaps/fetchById", async (gapId, { rejectWithValue }) => {
  try { return (await api.get(`/learning-gaps/${gapId}`)).data; }
  catch (err) { return rejectWithValue(err.response?.data ?? err.message); }
});

export const fetchRemediation = createAsyncThunk("learningGaps/fetchRemediation", async (gapId, { rejectWithValue }) => {
  try { return (await api.get(`/learning-gaps/${gapId}/remediation`)).data; }
  catch (err) { return rejectWithValue(err.response?.data ?? err.message); }
});

export const fetchQuizList = createAsyncThunk("learningGaps/fetchQuizList", async (_, { rejectWithValue }) => {
  try { return (await api.get("/learning-gaps/quizzes")).data; }
  catch (err) { return rejectWithValue(err.response?.data ?? err.message); }
});

export const fetchQuiz = createAsyncThunk("learningGaps/fetchQuiz", async (quizId, { rejectWithValue }) => {
  try { return (await api.get(`/learning-gaps/quiz/${quizId}`)).data; }
  catch (err) { return rejectWithValue(err.response?.data ?? err.message); }
});

export const submitQuiz = createAsyncThunk("learningGaps/submitQuiz", async (payload, { rejectWithValue }) => {
  try { return (await api.post("/learning-gaps/quiz/submit", payload)).data; }
  catch (err) { return rejectWithValue(err.response?.data ?? err.message); }
});

export const analyzeGaps = createAsyncThunk("learningGaps/analyze", async (_, { rejectWithValue }) => {
  try { return (await api.post("/learning-gaps/analyze")).data; }
  catch (err) { return rejectWithValue(err.response?.data ?? err.message); }
});

const learningGapsSlice = createSlice({
  name: "learningGaps",
  initialState: {
    gaps:             [], gapsStatus:        "idle", gapsError:    null,
    health:           null, healthStatus:    "idle",
    currentGap:       null, currentGapStatus:"idle",
    remediation:      null, remediationStatus:"idle",
    quizList:         [], quizListStatus:   "idle",
    currentQuiz:      null, quizStatus:      "idle",
    quizResult:       null, quizSubmitStatus:"idle",
    analyzeStatus:    "idle", analyzeResult: null,
  },
  reducers: {
    clearQuizResult(s) { s.quizResult = null; s.quizSubmitStatus = "idle"; },
    clearAnalyzeResult(s) { s.analyzeResult = null; s.analyzeStatus = "idle"; },
  },
  extraReducers: (b) => {
    b.addCase(fetchLearningGaps.pending,   (s) => { s.gapsStatus = "loading"; })
     .addCase(fetchLearningGaps.fulfilled, (s, a) => { s.gapsStatus = "succeeded"; s.gaps = a.payload; })
     .addCase(fetchLearningGaps.rejected,  (s, a) => { s.gapsStatus = "failed"; s.gapsError = a.payload; });

    b.addCase(fetchGapHealth.fulfilled, (s, a) => { s.healthStatus = "succeeded"; s.health = a.payload; });

    b.addCase(fetchGapById.pending,   (s) => { s.currentGapStatus = "loading"; })
     .addCase(fetchGapById.fulfilled, (s, a) => { s.currentGapStatus = "succeeded"; s.currentGap = a.payload; })
     .addCase(fetchGapById.rejected,  (s) => { s.currentGapStatus = "failed"; });

    b.addCase(fetchRemediation.pending,   (s) => { s.remediationStatus = "loading"; })
     .addCase(fetchRemediation.fulfilled, (s, a) => { s.remediationStatus = "succeeded"; s.remediation = a.payload; })
     .addCase(fetchRemediation.rejected,  (s) => { s.remediationStatus = "failed"; });

    b.addCase(fetchQuiz.pending,   (s) => { s.quizStatus = "loading"; })
     .addCase(fetchQuiz.fulfilled, (s, a) => { s.quizStatus = "succeeded"; s.currentQuiz = a.payload; })
     .addCase(fetchQuiz.rejected,  (s) => { s.quizStatus = "failed"; });

    b.addCase(fetchQuizList.pending,   (s) => { s.quizListStatus = "loading"; })
     .addCase(fetchQuizList.fulfilled, (s, a) => { s.quizListStatus = "succeeded"; s.quizList = a.payload; })
     .addCase(fetchQuizList.rejected,  (s) => { s.quizListStatus = "failed"; });

    b.addCase(submitQuiz.pending,   (s) => { s.quizSubmitStatus = "loading"; })
     .addCase(submitQuiz.fulfilled, (s, a) => { s.quizSubmitStatus = "succeeded"; s.quizResult = a.payload; })
     .addCase(submitQuiz.rejected,  (s) => { s.quizSubmitStatus = "failed"; });

    b.addCase(analyzeGaps.pending,   (s) => { s.analyzeStatus = "loading"; })
     .addCase(analyzeGaps.fulfilled, (s, a) => { s.analyzeStatus = "succeeded"; s.analyzeResult = a.payload; })
     .addCase(analyzeGaps.rejected,  (s) => { s.analyzeStatus = "failed"; });
  },
});

export const { clearQuizResult, clearAnalyzeResult } = learningGapsSlice.actions;

export const selectGaps              = (s) => s.learningGaps.gaps;
export const selectGapsStatus        = (s) => s.learningGaps.gapsStatus;
export const selectGapHealth         = (s) => s.learningGaps.health;
export const selectCurrentGap        = (s) => s.learningGaps.currentGap;
export const selectCurrentGapStatus  = (s) => s.learningGaps.currentGapStatus;
export const selectRemediation       = (s) => s.learningGaps.remediation;
export const selectRemediationStatus = (s) => s.learningGaps.remediationStatus;
export const selectQuizList          = (s) => s.learningGaps.quizList;
export const selectQuizListStatus    = (s) => s.learningGaps.quizListStatus;
export const selectCurrentQuiz       = (s) => s.learningGaps.currentQuiz;
export const selectQuizResult        = (s) => s.learningGaps.quizResult;
export const selectQuizSubmitStatus  = (s) => s.learningGaps.quizSubmitStatus;
export const selectAnalyzeStatus     = (s) => s.learningGaps.analyzeStatus;
export const selectAnalyzeResult     = (s) => s.learningGaps.analyzeResult;

export default learningGapsSlice.reducer;
