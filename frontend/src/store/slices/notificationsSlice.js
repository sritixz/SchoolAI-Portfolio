import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import api from "../../api";

export const fetchNotifications = createAsyncThunk(
  "notifications/fetchAll",
  async (_, { rejectWithValue }) => {
    try {
      const res = await api.get("/notifications/");
      return res.data;
    } catch (err) {
      return rejectWithValue(err.response?.data ?? err.message);
    }
  }
);

export const markNotificationRead = createAsyncThunk(
  "notifications/markRead",
  async (id, { rejectWithValue }) => {
    try {
      await api.patch(`/notifications/${id}/read`);
      return id;
    } catch (err) {
      return rejectWithValue(err.response?.data ?? err.message);
    }
  }
);

const notificationsSlice = createSlice({
  name: "notifications",
  initialState: {
    items:  [],
    status: "idle",
    error:  null,
  },
  reducers: {
    // Optimistic mark-read
    optimisticMarkRead(state, action) {
      const n = state.items.find((i) => i.id === action.payload);
      if (n) n.read = true;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchNotifications.pending,   (s) => { s.status = "loading"; })
      .addCase(fetchNotifications.fulfilled, (s, a) => { s.status = "succeeded"; s.items = a.payload; })
      .addCase(fetchNotifications.rejected,  (s, a) => { s.status = "failed"; s.error = a.payload; });

    builder
      .addCase(markNotificationRead.fulfilled, (s, a) => {
        const n = s.items.find((i) => i.id === a.payload);
        if (n) n.read = true;
      });
  },
});

export const { optimisticMarkRead } = notificationsSlice.actions;

export const selectNotifications    = (s) => s.notifications.items;
export const selectUnreadCount      = (s) => s.notifications.items.filter((n) => !n.read).length;
export const selectNotifStatus      = (s) => s.notifications.status;

export default notificationsSlice.reducer;
