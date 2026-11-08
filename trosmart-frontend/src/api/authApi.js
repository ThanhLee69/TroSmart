import axiosClient from "./axiosClient";
import API_CONFIG from "../config/apiConfig";

// Đăng nhập
export const loginAPI = async ({ username, password }) => {
  const response = await axiosClient.post(`${API_CONFIG.AUTH}/login`, {
    username,
    password,
  });

  return response.data.result;
};

// Đăng xuất
export const logoutAPI = async (token) => {
  const response = await axiosClient.post(`${API_CONFIG.AUTH}/logout`, {
    token,
  });

  return response.data;
};

// Làm mới access token
export const refreshTokenAPI = async (refreshToken) => {
  const response = await axiosClient.post(
    `${API_CONFIG.AUTH}/refresh-token`,
    { refreshToken }
  );

  return response.data.result;
};

// Kiểm tra tính hợp lệ của token
export const introspectTokenAPI = async (token) => {
  const response = await axiosClient.post(
    `${API_CONFIG.AUTH}/introspect`,
    { token }
  );

  return response.data.result;
};
