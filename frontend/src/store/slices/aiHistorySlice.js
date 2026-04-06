import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import api from "../../api";

const LS_KEY = "ai_tool_history";

// Load from localStorage on startup
function loadFromStorage() {
  try {
    const raw = localStorage.getItem(LS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}

function saveToStorage(items) {
  try { localStorage.setItem(LS_KEY, JSON.stringify(items.slice(0, 100))); } catch {}
}

// Persist to backend (fire-and-forget, non-blocking)
export const persistHistoryItem = createAsyncThunk(
  "aiHistory/persist",
  async (item, { rejectWithValue }) => {
    try {
      await api.post("/teacher/ai-history", item);
      return item;
    } catch (err) {
      return rejectWithValue(err.response?.data ?? err.message);
    }
  }
);

export const fetchHistory = createAsyncThunk(
  "aiHistory/fetch",
  async (_, { rejectWithValue }) => {
    try {
      return (await api.get("/teacher/ai-history")).data;
    } catch (err) {
      return rejectWithValue(err.response?.data ?? err.message);
    }
  }
);

const aiHistorySlice = createSlice({
  name: "aiHistory",
  initialState: {
    items: loadFromStorage(),
    status: "idle",
  },
  reducers: {
    addHistoryItem(state, { payload }) {
      // payload: { id, tool, title, subject, topic, grade, result, createdAt }
      state.items.unshift(payload);
      saveToStorage(state.items);
    },
    removeHistoryItem(state, { payload: id }) {
      state.items = state.items.filter((i) => i.id !== id);
      saveToStorage(state.items);
    },
    clearHistory(state) {
      state.items = [];
      localStorage.removeItem(LS_KEY);
    },
  },
  extraReducers: (b) => {
    b.addCase(fetchHistory.fulfilled, (state, { payload }) => {
      // Merge backend items with local, deduplicate by id
      const ids = new Set(state.items.map((i) => i.id));
      const merged = [...state.items];
      for (const item of payload) {
        if (!ids.has(item.id)) merged.push(item);
      }
      merged.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
      state.items = merged.slice(0, 100);
      saveToStorage(state.items);
      state.status = "succeeded";
    });
  },
});

export const { addHistoryItem, removeHistoryItem, clearHistory } = aiHistorySlice.actions;
export const selectAiHistory = (s) => s.aiHistory.items;
export default aiHistorySlice.reducer;
