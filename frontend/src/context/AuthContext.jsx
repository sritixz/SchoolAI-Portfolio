import { createContext, useContext } from "react";
import { useDispatch, useSelector } from "react-redux";
import {
  loginSuccess, logoutUser,
  selectUser, selectToken, selectMustChangePassword,
} from "../store/slices/authSlice";
import api from "../api";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const dispatch = useDispatch();
  const user               = useSelector(selectUser);
  const token              = useSelector(selectToken);
  const mustChangePassword = useSelector(selectMustChangePassword);

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
