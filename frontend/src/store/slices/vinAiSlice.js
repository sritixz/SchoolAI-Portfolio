import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import api from "../../api";

export const fetchDoubtHistory = createAsyncThunk("vinAi/fetchHistory", async (_, { rejectWithValue }) => {
  try { return (await api.get("/vin-ai/history")).data; }
  catch (err) { return rejectWithValue(err.response?.data ?? err.message); }
});

export const toggleDoubtStar = createAsyncThunk("vinAi/toggleStar", async (id, { rejectWithValue }) => {
  try { return { id, ...(await api.post(`/vin-ai/history/${id}/star`)).data }; }
  catch (err) { return rejectWithValue(err.response?.data ?? err.message); }
});

const vinAiSlice = createSlice({
  name: "vinAi",
  initialState: {
    history:         [], historyStatus: "idle",
  },
  reducers: {
    optimisticToggleStar(s, { payload: id }) {
      const item = s.history.find((h) => h._id === id);
      if (item) item.starred = !item.starred;
    },
  },
  extraReducers: (b) => {
    b.addCase(fetchDoubtHistory.pending,   (s) => { s.historyStatus = "loading"; })
     .addCase(fetchDoubtHistory.fulfilled, (s, a) => {
       s.historyStatus = "succeeded";
       s.history = a.payload;
     })
     .addCase(fetchDoubtHistory.rejected, (s) => { s.historyStatus = "failed"; });

    b.addCase(toggleDoubtStar.fulfilled, (s, a) => {
      const item = s.history.find((h) => h._id === a.payload.id);
      if (item) item.starred = a.payload.starred;
    });
  },
});

export const { optimisticToggleStar } = vinAiSlice.actions;

export const selectDoubtHistory   = (s) => s.vinAi.history;
export const selectHistoryStatus  = (s) => s.vinAi.historyStatus;

export default vinAiSlice.reducer;
