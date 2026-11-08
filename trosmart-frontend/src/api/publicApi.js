import axiosClient from "./axiosClient";
import API_CONFIG from "../config/apiConfig";

// Lấy danh sách phòng còn trống (có phân trang)

export const getPublicRooms = async ({ page = 1, size = 12 } = {}) => {
  const res = await axiosClient.get(`${API_CONFIG.PUBLIC}/rooms`, {
    params: {
      page,
      size,
    },
  });

  return res.data.result;
};

// Lấy chi tiết một phòng còn trống
export const getPublicRoomDetail = async (id) => {
  const res = await axiosClient.get(`${API_CONFIG.PUBLIC}/rooms/${id}`);

  return res.data.result;
};

// Lấy danh sách tòa nhà công khai
export const getPublicBuildings = async () => {
  const res = await axiosClient.get(`${API_CONFIG.PUBLIC}/buildings`);

  return res.data.result;
};

// Gửi liên hệ (khách không cần đăng nhập)
// payload: { fullName, phone, email, topic, message, roomId, website, elapsedMs, captchaToken }
export const createContact = async (payload) => {
  const res = await axiosClient.post(`${API_CONFIG.PUBLIC}/contacts`, payload);

  return res.data;
};

// Lấy phòng tương tự (giá, vị trí, diện tích, tiện nghi, loại phòng gần giống).
// Trả về mảng PublicRoomResponse, có thể rỗng.
export const getSimilarRooms = async (id, limit = 4) => {
  const res = await axiosClient.get(`${API_CONFIG.PUBLIC}/rooms/${id}/similar`, {
    params: { limit },
  });
 
  return res.data.result;
};
// Tìm phòng trống theo bộ lọc.
// indexes: null để mảng gửi dạng types=A&types=B (Spring bind được),
// mặc định axios gửi types[]=A làm BE không nhận.
export const searchPublicRooms = async (params = {}) => {
  const res = await axiosClient.get(`${API_CONFIG.PUBLIC}/rooms/search`, {
    params,
    paramsSerializer: { indexes: null },
  });
 
  return res.data.result;
};
 
// Danh sách tên tiện nghi để làm bộ lọc
export const getPublicAmenities = async () => {
  const res = await axiosClient.get(`${API_CONFIG.PUBLIC}/amenities`);
 
  return res.data.result;
};