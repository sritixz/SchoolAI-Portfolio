import { createSlice } from "@reduxjs/toolkit";

const loadingSlice = createSlice({
  name: "loading",
  initialState: { activeRequests: 0 },
  reducers: {
    requestStarted(state) { state.activeRequests += 1; },
    requestFinished(state) { state.activeRequests = Math.max(0, state.activeRequests - 1); },
  },
});

export const { requestStarted, requestFinished } = loadingSlice.actions;
export const selectIsLoading = (s) => s.loading.activeRequests > 0;
export default loadingSlice.reducer;
