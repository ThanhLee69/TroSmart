import axios from "axios";
import API_CONFIG from "../config/apiConfig";

const axiosClient = axios.create({
  baseURL: API_CONFIG.BASE_URL,
  timeout: 30000,
  headers: {
    "Content-Type": "application/json",
  },
});

const STORAGE_KEYS = ["user_info", "access_token", "refresh_token"];
const REFRESH_URL = "/auth/refresh-token"; // khớp AuthController

/* ---------- Gắn token ---------- */
axiosClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("access_token");
    const isLoginRequest = config.url?.includes("/auth/login");

    if (isLoginRequest) {
      // Không gắn token cũ vào request đăng nhập
      delete config.headers.Authorization;
      delete config.headers.authorization;
    } else if (token && !config.headers.Authorization) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    // FormData: để Axios tự thiết lập multipart/form-data
    if (config.data instanceof FormData) {
      config.headers.delete?.("Content-Type");

      if (config.headers.set) {
        config.headers.set("Content-Type", undefined);
      } else {
        delete config.headers["Content-Type"];
        delete config.headers["content-type"];
      }
    }

    return config;
  },
  (error) => Promise.reject(error),
);

/* ---------- Làm mới token khi hết hạn ---------- */
let isRefreshing = false;
let waiting = []; // các request đang chờ token mới

const flushWaiting = (error, token) => {
  waiting.forEach((p) => (error ? p.reject(error) : p.resolve(token)));
  waiting = [];
};

/* Phiên hết hạn hẳn: xóa dữ liệu và báo cho AuthContext, ProtectedRoute sẽ chuyển về trang đăng nhập */
const endSession = () => {
  STORAGE_KEYS.forEach((key) => localStorage.removeItem(key));
  window.dispatchEvent(new Event("auth:logout"));
};

axiosClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const original = error.config;
    const status = error.response?.status;
    const url = original?.url || "";

    const isAuthCall =
      url.includes("/auth/login") || url.includes("/auth/refresh");

    if (
      status !== 401 ||
      !original ||
      original._retry ||
      original.skipAuthRefresh ||
      isAuthCall
    ) {
      return Promise.reject(error);
    }

    const refreshToken = localStorage.getItem("refresh_token");

    // Chưa đăng nhập thì không có gì để làm mới
    if (!localStorage.getItem("access_token")) {
      return Promise.reject(error);
    }

    if (!refreshToken) {
      endSession();
      return Promise.reject(error);
    }

    // Đang có một lần làm mới: xếp hàng chờ rồi gọi lại với token mới
    if (isRefreshing) {
      return new Promise((resolve, reject) => {
        waiting.push({ resolve, reject });
      }).then((token) => {
        original.headers.Authorization = `Bearer ${token}`;
        return axiosClient(original);
      });
    }

    original._retry = true;
    isRefreshing = true;

    try {
      // Dùng axios gốc để không đi qua interceptor này
      const res = await axios.post(`${API_CONFIG.BASE_URL}${REFRESH_URL}`, {
        refreshToken,
      });

      const data = res.data?.result ?? res.data;
      const newAccessToken = data?.accessToken;
      const newRefreshToken = data?.refreshToken;

      if (!newAccessToken) {
        throw new Error("Không nhận được access token mới.");
      }

      localStorage.setItem("access_token", newAccessToken);

      // Server xoay vòng refresh token: token cũ bị thu hồi nên bắt buộc lưu token mới
      if (newRefreshToken) {
        localStorage.setItem("refresh_token", newRefreshToken);
      }

      flushWaiting(null, newAccessToken);

      original.headers.Authorization = `Bearer ${newAccessToken}`;
      return axiosClient(original);
    } catch (refreshError) {
      flushWaiting(refreshError, null);
      endSession();
      return Promise.reject(refreshError);
    } finally {
      isRefreshing = false;
    }
  },
);

export default axiosClient;