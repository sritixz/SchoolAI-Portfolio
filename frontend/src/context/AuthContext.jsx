import { createContext, useContext, useEffect, useRef } from "react";
import { useDispatch, useSelector } from "react-redux";
import {
  loginSuccess, logoutUser,
  selectUser, selectToken, selectMustChangePassword,
} from "../store/slices/authSlice";
import api from "../api";

const AuthContext = createContext(null);

/** Decode JWT expiry (in ms) without a library */
function getTokenExpiry(token) {
  try {
    const payload = JSON.parse(atob(token.split(".")[1]));
    console.log("[Auth] JWT payload:", payload);
    console.log("[Auth] exp field:", payload.exp, "→ ms:", payload.exp * 1000);
    console.log("[Auth] Now ms:", Date.now());
    return payload.exp ? payload.exp * 1000 : null;
  } catch (e) {
    console.error("[Auth] Failed to decode token:", e);
    return null;
  }
}

export function AuthProvider({ children }) {
  const dispatch = useDispatch();
  const user               = useSelector(selectUser);
  const token              = useSelector(selectToken);
  const mustChangePassword = useSelector(selectMustChangePassword);
  const logoutTimerRef     = useRef(null);

  // Proactively schedule logout when token changes
  useEffect(() => {
    if (logoutTimerRef.current) {
      clearTimeout(logoutTimerRef.current);
      logoutTimerRef.current = null;
    }

    if (!token) return;

    const expiry = getTokenExpiry(token);
    if (!expiry) return;

    const msUntilExpiry = expiry - Date.now();

    if (msUntilExpiry <= 0) {
      // Already expired — logout immediately
      dispatch(logoutUser());
      return;
    }

    console.log(`[Auth] Token expires in ${Math.round(msUntilExpiry / 1000)}s`);
    logoutTimerRef.current = setTimeout(() => {
      console.log("[Auth] Token expired — logging out");
      dispatch(logoutUser());
    }, msUntilExpiry);

    return () => {
      if (logoutTimerRef.current) {
        clearTimeout(logoutTimerRef.current);
        logoutTimerRef.current = null;
      }
    };
  }, [token, dispatch]);

  const login = (authData) => {
    dispatch(loginSuccess(authData));
  };

  const logout = () => {
    dispatch(logoutUser());
  };

  /**
   * Authenticated axios call — token auto-attached via api.js interceptor.
   * On 401 → logs out automatically.
   */
  const apiCall = async (config) => {
    try {
      return await api(config);
    } catch (err) {
      if (err.response?.status === 401) {
        logout();
        throw new Error("Session expired. Please log in again.");
      }
      throw err;
    }
  };

  return (
    <AuthContext.Provider value={{ user, token, login, logout, apiCall, mustChangePassword }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
