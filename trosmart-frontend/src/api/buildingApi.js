
import axiosClient from "./axiosClient";
import API_CONFIG from "../config/apiConfig";

// Lấy danh sách tòa nhà có phân trang và tìm kiếm
export const getBuildings = async ({
  keyword,
  page = 1,
  size = 10,
} = {}) => {
  const response = await axiosClient.get(API_CONFIG.BUILDING, {
    params: {
      keyword: keyword || undefined,
      page,
      size,
    },
  });

  return response.data.result;
};

// Lấy danh sách tòa nhà để lựa chọn trong Select
export const getBuildingOptions = async () => {
  const response = await axiosClient.get(
    `${API_CONFIG.BUILDING}/options`
  );

  return response.data.result;
};

// Lấy chi tiết tòa nhà
export const getBuildingById = async (id) => {
  const response = await axiosClient.get(
    `${API_CONFIG.BUILDING}/${id}`
  );

  return response.data.result;
};

// Tạo mới tòa nhà
export const createBuilding = async (building) => {
  const response = await axiosClient.post(
    API_CONFIG.BUILDING,
    building
  );

  return response.data;
};

// Cập nhật tòa nhà
export const updateBuilding = async (id, building) => {
  const response = await axiosClient.put(
    `${API_CONFIG.BUILDING}/${id}`,
    building
  );

  return response.data;
};

// Xóa mềm tòa nhà
export const deleteBuilding = async (id) => {
  const response = await axiosClient.delete(
    `${API_CONFIG.BUILDING}/${id}`
  );

  return response.data;
};
