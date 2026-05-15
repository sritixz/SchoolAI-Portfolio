import { Navigate, useLocation, useNavigate } from "react-router-dom";
import { useEffect } from "react";
import { useAuth } from "../context/AuthContext";

export default function ProtectedRoute({ children, allowedRole }) {
  const { user, mustChangePassword } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  // Redirect to login whenever user is logged out (e.g. token expiry timer fires)
  useEffect(() => {
    if (!user) {
      navigate("/login", { replace: true });
    }
  }, [user, navigate]);

  if (!user) return <Navigate to="/login" replace />;

  // Force password change on first login (teachers/parents created by admin)
  if (mustChangePassword && location.pathname !== "/change-password") {
    return <Navigate to="/change-password" replace />;
  }

  if (allowedRole && user.role !== allowedRole) {
    return <Navigate to={`/${user.role}`} replace />;
  }

  return children;
}
