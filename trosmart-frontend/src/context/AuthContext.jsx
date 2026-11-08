import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import axiosClient from "../api/axiosClient";

const AuthContext = createContext();

/* Chấp nhận "ADMIN", "ROLE_ADMIN" hoặc { name: "ADMIN" } */
export const normalizeRole = (role) =>
  String(role?.name ?? role ?? "")
    .replace(/^ROLE_/, "")
    .toUpperCase();

const KEYS = {
  user: "user_info",
  access: "access_token",
  refresh: "refresh_token",
};

const clearStorage = () => {
  Object.values(KEYS).forEach((key) => localStorage.removeItem(key));
};

/* Đọc phiên đăng nhập đã lưu, trả về null nếu không có hoặc hỏng */
const readSession = () => {
  try {
    const storedUser = localStorage.getItem(KEYS.user);
    const token = localStorage.getItem(KEYS.access);

    if (storedUser && token) return JSON.parse(storedUser);
  } catch (error) {
    console.error("Không thể khôi phục phiên đăng nhập:", error);
    clearStorage();
  }
  return null;
};

/* Thu hồi token trên server. Cố gắng hết sức, lỗi thì bỏ qua. */
const revokeTokens = async (accessToken, refreshToken) => {
  if (!accessToken) return;

  const config = {
    headers: { Authorization: `Bearer ${accessToken}` },
    skipAuthRefresh: true,
  };

  try {
    // Thu hồi refresh token trước, vì sau khi access token bị thu hồi sẽ không gọi tiếp được
    if (refreshToken) {
      await axiosClient.post("/auth/logout", { token: refreshToken }, config);
    }
    await axiosClient.post("/auth/logout", { token: accessToken }, config);
  } catch {
    // Token hết hạn hoặc mạng lỗi: phiên phía trình duyệt vẫn đã được xóa
  }
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setUser(readSession());
    setLoading(false);
  }, []);

  /* axiosClient báo phiên hết hạn (refresh thất bại) và đồng bộ giữa các tab */
  useEffect(() => {
    const onExpired = () => setUser(null);

    const onStorage = (event) => {
      if (
        event.key === null ||
        event.key === KEYS.access ||
        event.key === KEYS.user
      ) {
        setUser(readSession());
      }
    };

    window.addEventListener("auth:logout", onExpired);
    window.addEventListener("storage", onStorage);
    return () => {
      window.removeEventListener("auth:logout", onExpired);
      window.removeEventListener("storage", onStorage);
    };
  }, []);

  const login = useCallback((userInfo, accessToken, refreshToken) => {
    localStorage.setItem(KEYS.user, JSON.stringify(userInfo));
    localStorage.setItem(KEYS.access, accessToken);

    if (refreshToken) {
      localStorage.setItem(KEYS.refresh, refreshToken);
    } else {
      localStorage.removeItem(KEYS.refresh);
    }

    setUser(userInfo);
  }, []);

  const logout = useCallback(() => {
    const accessToken = localStorage.getItem(KEYS.access);
    const refreshToken = localStorage.getItem(KEYS.refresh);

    clearStorage();
    setUser(null);

    revokeTokens(accessToken, refreshToken);
  }, []);

  const role = normalizeRole(user?.role);

  const value = useMemo(
    () => ({
      user,
      role,
      isAuthenticated: Boolean(user),
      login,
      logout,
      loading,
    }),
    [user, role, login, logout, loading],
  );

  if (loading) return null;

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => useContext(AuthContext);
