import { createContext, useContext, useState } from "react";

const AuthContext = createContext(null);
const STORAGE_KEY = "vin_auth";
const API_BASE    = "http://localhost:8000";

export function AuthProvider({ children }) {
  const [auth, setAuth] = useState(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  });

  // auth shape: { token, id, role, name, avatar, mustChangePassword }
  const login = (authData) => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(authData));
    setAuth(authData);
  };

  const logout = () => {
    localStorage.removeItem(STORAGE_KEY);
    setAuth(null);
  };

  // Backward-compatible user object
  const user  = auth ? { id: auth.id, role: auth.role, name: auth.name, avatar: auth.avatar } : null;
  const token = auth?.token ?? null;
  const mustChangePassword = auth?.mustChangePassword ?? false;

  /**
   * Authenticated fetch — auto-attaches Bearer token.
   * Returns the raw Response so callers can check res.ok and call res.json().
   * On 401 → logs out automatically.
   */
  const apiFetch = async (path, options = {}) => {
    const headers = {
      ...(options.body && !(options.body instanceof FormData)
        ? { "Content-Type": "application/json" }
        : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers || {}),
    };

    const res = await fetch(`${API_BASE}${path}`, { ...options, headers });

    if (res.status === 401) {
      logout();
      throw new Error("Session expired. Please log in again.");
    }
    return res;
  };

  return (
    <AuthContext.Provider value={{ user, token, login, logout, apiFetch, mustChangePassword }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
