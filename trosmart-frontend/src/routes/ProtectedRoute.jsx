import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { path_name } from "../constants/path_name";
import { ROLES, usePermission } from "../context/PermissionContext";

/* Chưa đăng nhập -> trang đăng nhập. Đăng nhập rồi nhưng không đủ quyền -> trang chủ của vai trò đó. */
const ProtectedRoute = ({ children }) => {
  const { isAuthenticated, role } = useAuth();
  const { canAccess, homePath } = usePermission();
  const location = useLocation();

  if (!isAuthenticated || !Object.values(ROLES).includes(role)) {
    return <Navigate to={path_name.login} replace state={{ from: location }} />;
  }

  if (!canAccess(location.pathname)) {
    return <Navigate to={homePath} replace />;
  }

  return children;
};

export default ProtectedRoute;
