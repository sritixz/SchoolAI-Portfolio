import axios from "axios";

const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || "http://localhost:8001",
  headers: { "Content-Type": "application/json" },
});

// Attach Bearer token from localStorage before every request
api.interceptors.request.use((config) => {
  try {
    const stored = localStorage.getItem("vin_auth");
    const token = stored ? JSON.parse(stored)?.token : null;
    if (token) config.headers.Authorization = `Bearer ${token}`;
  } catch {
    // ignore parse errors
  }
  return config;
});

export default api;
