import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import api from "../../api";

// ── Thunks ────────────────────────────────────────────────────

export const fetchSessions = createAsyncThunk("vinAi/fetchSessions", async (_, { rejectWithValue }) => {
  try { return (await api.get("/vin-ai/sessions")).data; }
  catch (err) { return rejectWithValue(err.response?.data ?? err.message); }
});

export const loadSession = createAsyncThunk("vinAi/loadSession", async (sessionId, { rejectWithValue }) => {
  try {
    const turns = (await api.get(`/vin-ai/sessions/${sessionId}`)).data;
    return { sessionId, turns };
  }
  catch (err) { return rejectWithValue(err.response?.data ?? err.message); }
});

export const toggleSessionStar = createAsyncThunk("vinAi/toggleSessionStar", async (sessionId, { rejectWithValue }) => {
  try { return { sessionId, ...(await api.post(`/vin-ai/sessions/${sessionId}/star`)).data }; }
  catch (err) { return rejectWithValue(err.response?.data ?? err.message); }
});

export const deleteSession = createAsyncThunk("vinAi/deleteSession", async (sessionId, { rejectWithValue }) => {
  try { await api.delete(`/vin-ai/sessions/${sessionId}`); return sessionId; }
  catch (err) { return rejectWithValue(err.response?.data ?? err.message); }
});

export const pinSession = createAsyncThunk("vinAi/pinSession", async (sessionId, { rejectWithValue }) => {
  try { return { sessionId, ...(await api.post(`/vin-ai/sessions/${sessionId}/pin`)).data }; }
  catch (err) { return rejectWithValue(err.response?.data ?? err.message); }
});

export const renameSession = createAsyncThunk("vinAi/renameSession", async ({ sessionId, title }, { rejectWithValue }) => {
  try { return { sessionId, ...(await api.patch(`/vin-ai/sessions/${sessionId}/rename`, { title })).data }; }
  catch (err) { return rejectWithValue(err.response?.data ?? err.message); }
});

// Legacy — kept for backward compat with any existing code
export const fetchDoubtHistory = fetchSessions;
export const toggleDoubtStar = toggleSessionStar;
export const loadDoubtConversation = createAsyncThunk("vinAi/loadConversation", async (id, { rejectWithValue }) => {
  try { return (await api.get(`/vin-ai/history/${id}`)).data; }
  catch (err) { return rejectWithValue(err.response?.data ?? err.message); }
});

// ── Slice ─────────────────────────────────────────────────────
const vinAiSlice = createSlice({
  name: "vinAi",
  initialState: {
    sessions:        [],
    sessionsStatus:  "idle",
    // loaded session
    loadedSessionId: null,
    loadedTurns:     [],      // [{_id, question, full_xml, subject, ...}]
    loadSessionStatus: "idle",
    // legacy compat
    history:         [],
    historyStatus:   "idle",
    loadedDoubt:     null,
    loadDoubtStatus: "idle",
  },
  reducers: {
    optimisticToggleStar(s, { payload: sessionId }) {
      const item = s.sessions.find((h) => h.session_id === sessionId);
      if (item) item.starred = !item.starred;
    },
    optimisticTogglePin(s, { payload: sessionId }) {
      const item = s.sessions.find((h) => h.session_id === sessionId);
      if (item) item.pinned = !item.pinned;
    },
    optimisticRename(s, { payload: { sessionId, title } }) {
      const item = s.sessions.find((h) => h.session_id === sessionId);
      if (item) item.title = title;
    },
    clearLoadedSession(s) {
      s.loadedSessionId = null;
      s.loadedTurns = [];
      s.loadSessionStatus = "idle";
    },
    // legacy
    clearLoadedDoubt(s) {
      s.loadedDoubt = null;
      s.loadDoubtStatus = "idle";
      s.loadedSessionId = null;
      s.loadedTurns = [];
      s.loadSessionStatus = "idle";
    },
  },
  extraReducers: (b) => {
    b.addCase(fetchSessions.pending,   (s) => { s.sessionsStatus = "loading"; s.historyStatus = "loading"; })
     .addCase(fetchSessions.fulfilled, (s, a) => {
       s.sessionsStatus = "succeeded";
       s.historyStatus = "succeeded";
       s.sessions = a.payload;
       s.history = a.payload; // legacy compat
     })
     .addCase(fetchSessions.rejected, (s) => { s.sessionsStatus = "failed"; s.historyStatus = "failed"; });

    b.addCase(loadSession.pending,   (s) => { s.loadSessionStatus = "loading"; })
     .addCase(loadSession.fulfilled, (s, a) => {
       s.loadSessionStatus = "succeeded";
       s.loadedSessionId = a.payload.sessionId;
       s.loadedTurns = a.payload.turns;
     })
     .addCase(loadSession.rejected,  (s) => { s.loadSessionStatus = "failed"; });

    b.addCase(toggleSessionStar.fulfilled, (s, a) => {
      const item = s.sessions.find((h) => h.session_id === a.payload.sessionId);
      if (item) item.starred = a.payload.starred;
    });

    b.addCase(deleteSession.fulfilled, (s, a) => {
      s.sessions = s.sessions.filter((h) => h.session_id !== a.payload);
      if (s.loadedSessionId === a.payload) {
        s.loadedSessionId = null;
        s.loadedTurns = [];
        s.loadSessionStatus = "idle";
      }
    });

    b.addCase(pinSession.fulfilled, (s, a) => {
      const item = s.sessions.find((h) => h.session_id === a.payload.sessionId);
      if (item) item.pinned = a.payload.pinned;
    });

    b.addCase(renameSession.fulfilled, (s, a) => {
      const item = s.sessions.find((h) => h.session_id === a.payload.sessionId);
      if (item) item.title = a.payload.title;
    });

    // legacy loadDoubtConversation
    b.addCase(loadDoubtConversation.pending,   (s) => { s.loadDoubtStatus = "loading"; })
     .addCase(loadDoubtConversation.fulfilled, (s, a) => {
       s.loadDoubtStatus = "succeeded";
       s.loadedDoubt = a.payload;
     })
     .addCase(loadDoubtConversation.rejected,  (s) => { s.loadDoubtStatus = "failed"; });
  },
});

export const { optimisticToggleStar, optimisticTogglePin, optimisticRename, clearLoadedSession, clearLoadedDoubt } = vinAiSlice.actions;

export const selectSessions         = (s) => s.vinAi.sessions;
export const selectSessionsStatus   = (s) => s.vinAi.sessionsStatus;
export const selectLoadedSessionId  = (s) => s.vinAi.loadedSessionId;
export const selectLoadedTurns      = (s) => s.vinAi.loadedTurns;
export const selectLoadSessionStatus = (s) => s.vinAi.loadSessionStatus;

// legacy selectors
export const selectDoubtHistory    = (s) => s.vinAi.sessions;
export const selectHistoryStatus   = (s) => s.vinAi.sessionsStatus;
export const selectLoadedDoubt     = (s) => s.vinAi.loadedDoubt;
export const selectLoadDoubtStatus = (s) => s.vinAi.loadDoubtStatus;

export default vinAiSlice.reducer;
