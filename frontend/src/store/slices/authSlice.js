import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import api from "../../api";

const STORAGE_KEY = "vin_auth";

function loadFromStorage() {
  try {
    const s = localStorage.getItem(STORAGE_KEY);
    return s ? JSON.parse(s) : null;
  } catch { return null; }
}

const stored = loadFromStorage();

// ── Thunks ────────────────────────────────────────────────────
export const fetchMe = createAsyncThunk("auth/fetchMe", async (_, { rejectWithValue }) => {
  try {
    const res = await api.get("/auth/me");
    return res.data;
  } catch (err) { return rejectWithValue(err.response?.data ?? err.message); }
});

export const changePassword = createAsyncThunk("auth/changePassword", async (payload, { rejectWithValue }) => {
  try {
    const res = await api.post("/auth/change-password", payload);
    return res.data;
  } catch (err) { return rejectWithValue(err.response?.data ?? err.message); }
});

// ── Slice ─────────────────────────────────────────────────────
const authSlice = createSlice({
  name: "auth",
  initialState: {
    token:              stored?.token              ?? null,
    id:                 stored?.id                 ?? null,
    role:               stored?.role               ?? null,
    name:               stored?.name               ?? null,
    avatar:             stored?.avatar             ?? null,
    mustChangePassword: stored?.mustChangePassword ?? false,
    profile:            null,   // full /auth/me response
    status:             "idle",
    error:              null,
  },
  reducers: {
    loginSuccess(state, { payload }) {
      const { token, id, role, name, avatar, mustChangePassword = false } = payload;
      Object.assign(state, { token, id, role, name, avatar, mustChangePassword });
      localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
    },
    logoutUser(state) {
      Object.assign(state, { token: null, id: null, role: null, name: null, avatar: null, mustChangePassword: false, profile: null });
      localStorage.removeItem(STORAGE_KEY);
    },
    updateAvatar(state, { payload }) {
      state.avatar = payload;
      const s = loadFromStorage();
      if (s) localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...s, avatar: payload }));
    },
  },
  extraReducers: (b) => {
    b.addCase(fetchMe.fulfilled, (s, a) => { s.profile = a.payload; });
    b.addCase(changePassword.fulfilled, (s) => { s.mustChangePassword = false; });
  },
});

export const { loginSuccess, logoutUser, updateAvatar } = authSlice.actions;

export const selectToken              = (s) => s.auth.token;
export const selectIsLoggedIn         = (s) => !!s.auth.token;
export const selectUser               = (s) => s.auth.id ? { id: s.auth.id, role: s.auth.role, name: s.auth.name, avatar: s.auth.avatar } : null;
export const selectMustChangePassword = (s) => s.auth.mustChangePassword;
export const selectUserProfile        = (s) => s.auth.profile;

export default authSlice.reducer;
