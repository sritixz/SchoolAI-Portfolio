import axios from "axios";
import { requestStarted, requestFinished } from "./store/slices/loadingSlice";
import { logoutUser } from "./store/slices/authSlice";

const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || "http://localhost:8001",
  headers: { "Content-Type": "application/json" },
});

// Lazy store reference to avoid circular imports at module init time
let _store = null;
export function injectStore(store) { _store = store; }
const dispatch = (action) => _store?.dispatch(action);

// Attach Bearer token + start global loader
api.interceptors.request.use((config) => {
  try {
    const stored = localStorage.getItem("vin_auth");
    const token = stored ? JSON.parse(stored)?.token : null;
    if (token) config.headers.Authorization = `Bearer ${token}`;
  } catch {
    // ignore parse errors
  }
  dispatch(requestStarted());
  return config;
});

// Stop global loader on response or error; auto-logout on 401
api.interceptors.response.use(
  (response) => { dispatch(requestFinished()); return response; },
  (error) => {
    dispatch(requestFinished());
    if (error.response?.status === 401) {
      dispatch(logoutUser());
    }
    return Promise.reject(error);
  }
);

export default api;
