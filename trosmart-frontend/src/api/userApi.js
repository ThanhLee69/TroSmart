import axiosClient from "./axiosClient";
import API_CONFIG from "../config/apiConfig";

// Lấy danh sách tài khoản: tìm kiếm, lọc, phân trang
export const getUsers = async ({
  keyword,
  role,
  status,
  page = 1,
  size = 10,
} = {}) => {
  const response = await axiosClient.get(API_CONFIG.USER, {
    params: {
      keyword: keyword || undefined,
      role: role || undefined,
      status: status || undefined,
      page,
      size,
    },
  });

  return response.data.result;
};

// Lấy chi tiết tài khoản theo ID
export const getUserById = async (id) => {
  const response = await axiosClient.get(`${API_CONFIG.USER}/${id}`);
  return response.data.result;
};

// Tạo tài khoản cho người thuê đã có hồ sơ
export const createTenantAccount = async (tenantId) => {
  const response = await axiosClient.post(
    `${API_CONFIG.USER}/tenants/${tenantId}`
  );

  return response.data;
};

// Cập nhật trạng thái tài khoản: ACTIVE / INACTIVE
export const updateUserStatus = async (id, status) => {
  const response = await axiosClient.patch(
    `${API_CONFIG.USER}/${id}/status`,
    null,
    {
      params: { status },
    }
  );

  return response.data;
};

// Đặt lại mật khẩu tài khoản
export const resetUserPassword = async (id) => {
  const response = await axiosClient.post(
    `${API_CONFIG.USER}/${id}/reset-password`
  );

  return response.data;
};






