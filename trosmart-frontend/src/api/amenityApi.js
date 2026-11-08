
import axiosClient from "./axiosClient";
import API_CONFIG from "../config/apiConfig";

// Lấy danh sách tiện nghi có phân trang, tìm kiếm và lọc
export const getAmenities = async ({
  keyword,
  scope,
  page = 1,
  size = 10,
} = {}) => {
  const res = await axiosClient.get(API_CONFIG.AMENITY, {
    params: {
      keyword: keyword || undefined,
      scope: scope || undefined,
      page,
      size,
    },
  });

  return res.data.result;
};

// Lấy tiện nghi áp dụng cho tòa nhà: BUILDING + BOTH
export const getBuildingAmenities = async () => {
  const res = await axiosClient.get(
    `${API_CONFIG.AMENITY}/building`
  );

  return res.data.result;
};

// Lấy tiện nghi áp dụng cho phòng: ROOM + BOTH
export const getRoomAmenities = async () => {
  const res = await axiosClient.get(
    `${API_CONFIG.AMENITY}/room`
  );

  return res.data.result;
};

// Lấy chi tiết tiện nghi theo ID
export const getAmenityById = async (id) => {
  const res = await axiosClient.get(
    `${API_CONFIG.AMENITY}/${id}`
  );

  return res.data.result;
};

// Tạo tiện nghi
export const createAmenity = async (data) => {
  const res = await axiosClient.post(
    API_CONFIG.AMENITY,
    data
  );

  return res.data.result;
};

// Cập nhật tiện nghi
export const updateAmenity = async (id, data) => {
  const res = await axiosClient.put(
    `${API_CONFIG.AMENITY}/${id}`,
    data
  );

  return res.data.result;
};

// Xóa tiện nghi
export const deleteAmenity = async (id) => {
  const res = await axiosClient.delete(
    `${API_CONFIG.AMENITY}/${id}`
  );

  return res.data;
};
