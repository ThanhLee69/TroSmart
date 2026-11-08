import React, { createContext, useCallback, useContext, useMemo } from "react";
import { matchPath } from "react-router-dom";
import { useAuth } from "./AuthContext";
import { path_name, tenant_path_name } from "../constants/path_name";

// Các file khác vẫn import tenant_path_name từ đây được
export { tenant_path_name };

/* Vai trò khớp enum Role ở backend: ADMIN, TENANT */
export const ROLES = {
  ADMIN: "ADMIN",
  TENANT: "TENANT",
};

export const ROLE_LABELS = {
  ADMIN: "Quản trị viên",
  TENANT: "Khách thuê",
};

export const getHomePath = (role) =>
  role === ROLES.TENANT ? tenant_path_name.home : path_name.dashboard;

/* Vai trò này có được vào đường dẫn này không */
export const canAccess = (role, pathname) => {
  if (role === ROLES.ADMIN) return !pathname.startsWith(tenant_path_name.home);

  if (role === ROLES.TENANT) {
    return Object.values(tenant_path_name).some((path) =>
      matchPath({ path, end: true }, pathname),
    );
  }

  return false;
};

/* ---------- Context ---------- */

const PermissionContext = createContext(null);

export const PermissionProvider = ({ children }) => {
  const { role } = useAuth();

  const hasRole = useCallback(
    (...roles) => roles.flat().includes(role),
    [role],
  );

  const checkAccess = useCallback(
    (pathname) => canAccess(role, pathname),
    [role],
  );

  const value = useMemo(
    () => ({
      role,
      isAdmin: role === ROLES.ADMIN,
      isTenant: role === ROLES.TENANT,
      homePath: getHomePath(role),
      hasRole,
      canAccess: checkAccess,
    }),
    [role, hasRole, checkAccess],
  );

  return (
    <PermissionContext.Provider value={value}>
      {children}
    </PermissionContext.Provider>
  );
};

export const usePermission = () => {
  const context = useContext(PermissionContext);
  if (!context) {
    throw new Error("usePermission phải dùng bên trong PermissionProvider");
  }
  return context;
};
