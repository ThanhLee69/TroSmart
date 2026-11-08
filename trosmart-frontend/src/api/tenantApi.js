
import axiosClient from "./axiosClient";
import API_CONFIG from "../config/apiConfig";

// Lấy danh sách khách thuê phân trang, tìm kiếm
export const getTenants = async ({ keyword , rentalStatus, page, size } = {}) => {
  const response = await axiosClient.get(API_CONFIG.TENANT, {
    params: { keyword, rentalStatus, page, size },
  });

  return response.data.result;
};

// Lấy danh sách khách thuê để lựa chọn khi lập hợp đồng
export const getTenantOptions = async (keyword) => {
  const response = await axiosClient.get(
    `${API_CONFIG.TENANT}/options`,
    {
      params: { keyword },
    }
  );

  return response.data.result;
};

// Tạo mới khách thuê
export const createTenant = async (tenant) => {
  const response = await axiosClient.post(
    API_CONFIG.TENANT,
    tenant
  );

  return response.data;
};

// Cập nhật thông tin khách thuê
// TenantRequest sử dụng @ModelAttribute nên gửi multipart/form-data
export const updateTenant = async (id, tenant) => {
  const response = await axiosClient.put(
    `${API_CONFIG.TENANT}/${id}`,
    tenant
  );

  return response.data;
};

// Cập nhật ảnh CCCD
export const updateTenantIdentityImages = async (
  id,
  frontImage,
  backImage
) => {
  const formData = new FormData();

  if (frontImage) {
    formData.append("frontImage", frontImage);
  }

  if (backImage) {
    formData.append("backImage", backImage);
  }

  const response = await axiosClient.patch(
    `${API_CONFIG.TENANT}/${id}/identity-images`,
    formData
  );

  return response.data;
};

// Xóa khách thuê
export const deleteTenant = async (id) => {
  const response = await axiosClient.delete(
    `${API_CONFIG.TENANT}/${id}`
  );

  return response.data;
};

// Lấy thống kê khách thuê
export const getTenantDashboard = async () => {
  const response = await axiosClient.get(
    `${API_CONFIG.TENANT}/dashboard`
  );

  return response.data.result;
};

// Lấy chi tiết khách thuê
export const getTenantById = async (id) => {
  const response = await axiosClient.get(
    `${API_CONFIG.TENANT}/${id}`
  );

  return response.data.result;
};
// Lấy lịch sử thuê (các hợp đồng có khách tham gia)
export const getTenantContracts = async (id) => {
  const response = await axiosClient.get(
    `${API_CONFIG.TENANT}/${id}/contracts`
  );

  return response.data.result;
};