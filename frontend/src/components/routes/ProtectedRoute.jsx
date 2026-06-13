import { Navigate, Outlet } from "react-router-dom";

import useAuth from "../../hooks/useAuth";

const ProtectedRoute = ({ allowedRoles, children }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center">
        Đang tải...
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles && allowedRoles.length > 0) {
    const hasRole = user.roles?.some((role) => allowedRoles.includes(role));

    if (!hasRole) {
      return <Navigate to="/" replace />;
    }
  }

  return children ? children : <Outlet />;
};

export default ProtectedRoute;
