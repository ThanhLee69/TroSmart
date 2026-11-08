import axiosClient from "./axiosClient";
import API_CONFIG from "../config/apiConfig";

// Tìm kiếm, lọc và phân trang dịch vụ
export const getServices = async ({
  keyword,
  billingType,
  page = 1,
  size = 10,
}) => {
  const response = await axiosClient.get(API_CONFIG.SERVICE, {
    params: {
      keyword: keyword || undefined,
      billingType: billingType || undefined,
      page,
      size,
    },
  });

  return response.data.result;
};

// Lấy danh sách dịch vụ cho Select
export const getServiceOptions = async (keyword) => {
  const response = await axiosClient.get(
    `${API_CONFIG.SERVICE}/options`,
    {
      params: {
        keyword: keyword || undefined,
      },
    }
  );

  return response.data.result;
};

// Lấy chi tiết dịch vụ
export const getServiceById = async (id) => {
  const response = await axiosClient.get(
    `${API_CONFIG.SERVICE}/${id}`
  );

  return response.data.result;
};

// Tạo mới dịch vụ
export const createService = async (service) => {
  const response = await axiosClient.post(
    API_CONFIG.SERVICE,
    service
  );

  return response.data;
};

// Cập nhật dịch vụ
export const updateService = async (id, service) => {
  const response = await axiosClient.put(
    `${API_CONFIG.SERVICE}/${id}`,
    service
  );

  return response.data;
};

// Xóa dịch vụ
export const deleteService = async (id) => {
  const response = await axiosClient.delete(
    `${API_CONFIG.SERVICE}/${id}`
  );

  return response.data;
};