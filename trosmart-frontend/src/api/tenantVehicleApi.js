import axiosClient from "./axiosClient";
import API_CONFIG from "../config/apiConfig";

// Lấy danh sách phương tiện (phân trang, tìm kiếm, lọc)
export const getTenantVehicles = async ({
  tenantId,
  keyword,
  vehicleType,
  page,
  size,
} = {}) => {
  const response = await axiosClient.get(API_CONFIG.TENANT_VEHICLE, {
    params: { tenantId, keyword, vehicleType, page, size },
  });

  return response.data.result;
};

// Lấy toàn bộ phương tiện theo ID khách thuê
export const getTenantVehiclesByTenantId = async (tenantId) => {
  const response = await axiosClient.get(
    `${API_CONFIG.TENANT_VEHICLE}/tenant/${tenantId}`
  );

  return response.data.result;
};

// Lấy danh sách khách thuê để đăng ký phương tiện
export const getAvailableTenants = async (keyword) => {
  const response = await axiosClient.get(
    `${API_CONFIG.TENANT_VEHICLE}/available-tenants`,
    {
      params: { keyword },
    }
  );

  return response.data.result;
};

// Thêm phương tiện
export const createTenantVehicle = async (vehicle) => {
  const response = await axiosClient.post(
    API_CONFIG.TENANT_VEHICLE,
    vehicle
  );

  return response.data;
};

// Cập nhật phương tiện
export const updateTenantVehicle = async (vehicleId, vehicle) => {
  const response = await axiosClient.put(
    `${API_CONFIG.TENANT_VEHICLE}/${vehicleId}`,
    vehicle
  );

  return response.data;
};

// Xóa phương tiện
export const deleteTenantVehicle = async (vehicleId) => {
  const response = await axiosClient.delete(
    `${API_CONFIG.TENANT_VEHICLE}/${vehicleId}`
  );

  return response.data;
};

// Lấy chi tiết phương tiện
export const getTenantVehicleById = async (vehicleId) => {
  const response = await axiosClient.get(
    `${API_CONFIG.TENANT_VEHICLE}/${vehicleId}`
  );

  return response.data.result;
};