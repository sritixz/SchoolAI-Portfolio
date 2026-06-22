import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import api from "../../api";

// ── Thunks ────────────────────────────────────────────────────

export const fetchSessions = createAsyncThunk("teacherChat/fetchSessions", async (_, { rejectWithValue }) => {
  try { return (await api.get("/teacher-chat/sessions")).data; }
  catch (err) { return rejectWithValue(err.response?.data ?? err.message); }
});

export const loadSession = createAsyncThunk("teacherChat/loadSession", async (sessionId, { rejectWithValue }) => {
  try {
    const turns = (await api.get(`/teacher-chat/sessions/${sessionId}`)).data;
    return { sessionId, turns };
  }
  catch (err) { return rejectWithValue(err.response?.data ?? err.message); }
});

export const toggleSessionStar = createAsyncThunk("teacherChat/toggleSessionStar", async (sessionId, { rejectWithValue }) => {
  try { return { sessionId, ...(await api.post(`/teacher-chat/sessions/${sessionId}/star`)).data }; }
  catch (err) { return rejectWithValue(err.response?.data ?? err.message); }
});

export const deleteSession = createAsyncThunk("teacherChat/deleteSession", async (sessionId, { rejectWithValue }) => {
  try { await api.delete(`/teacher-chat/sessions/${sessionId}`); return sessionId; }
  catch (err) { return rejectWithValue(err.response?.data ?? err.message); }
});

export const pinSession = createAsyncThunk("teacherChat/pinSession", async (sessionId, { rejectWithValue }) => {
  try { return { sessionId, ...(await api.post(`/teacher-chat/sessions/${sessionId}/pin`)).data }; }
  catch (err) { return rejectWithValue(err.response?.data ?? err.message); }
});

export const renameSession = createAsyncThunk("teacherChat/renameSession", async ({ sessionId, title }, { rejectWithValue }) => {
  try { return { sessionId, ...(await api.patch(`/teacher-chat/sessions/${sessionId}/rename`, { title })).data }; }
  catch (err) { return rejectWithValue(err.response?.data ?? err.message); }
});

// ── Slice ─────────────────────────────────────────────────────
const teacherChatSlice = createSlice({
  name: "teacherChat",
  initialState: {
    sessions:        [],
    sessionsStatus:  "idle",
    loadedSessionId: null,
    loadedTurns:     [],      // [{_id, question, full_xml, subject, ...}]
    loadSessionStatus: "idle",
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
  },
  extraReducers: (b) => {
    b.addCase(fetchSessions.pending,   (s) => { s.sessionsStatus = "loading"; })
     .addCase(fetchSessions.fulfilled, (s, a) => {
       s.sessionsStatus = "succeeded";
       s.sessions = a.payload;
     })
     .addCase(fetchSessions.rejected, (s) => { s.sessionsStatus = "failed"; });

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
  },
});

export const { optimisticToggleStar, optimisticTogglePin, optimisticRename, clearLoadedSession } = teacherChatSlice.actions;

export const selectSessions         = (s) => s.teacherChat.sessions;
export const selectSessionsStatus   = (s) => s.teacherChat.sessionsStatus;
export const selectLoadedSessionId  = (s) => s.teacherChat.loadedSessionId;
export const selectLoadedTurns      = (s) => s.teacherChat.loadedTurns;
export const selectLoadSessionStatus = (s) => s.teacherChat.loadSessionStatus;

export default teacherChatSlice.reducer;
