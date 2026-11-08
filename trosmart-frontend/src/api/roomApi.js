import axiosClient from "./axiosClient";
import API_CONFIG from "../config/apiConfig";

// ==================== ROOM ====================

// Lấy danh sách phòng, tìm kiếm, lọc và phân trang
export const getRooms = async ({
  keyword,
  roomType,
  status,
  buildingId,
  page = 1,
  size = 10,
} = {}) => {
  const response = await axiosClient.get(API_CONFIG.ROOM, {
    params: {
      keyword: keyword || undefined,
      roomType: roomType || undefined,
      status: status || undefined,
      buildingId: buildingId || undefined,
      page,
      size,
    },
  });

  return response.data.result;
};

// Lấy danh sách phòng để lựa chọn (tìm theo mã phòng)
// Trả về: [{ id, roomNumber, buildingName, ... }]
export const getRoomOptions = async (keyword) => {
  const response = await axiosClient.get(`${API_CONFIG.ROOM}/options`, {
    params: {
      keyword: keyword || undefined,
    },
  });

  return response.data.result;
};

// Lấy chi tiết phòng theo ID
export const getRoomById = async (id) => {
  const response = await axiosClient.get(`${API_CONFIG.ROOM}/${id}`);
  return response.data.result;
};

// Tạo phòng mới
export const createRoom = async (room) => {
  const response = await axiosClient.post(API_CONFIG.ROOM, room);
  return response.data;
};

// Cập nhật thông tin phòng
export const updateRoom = async (id, room) => {
  const response = await axiosClient.put(`${API_CONFIG.ROOM}/${id}`, room);
  return response.data;
};

// Tạm khóa / mở lại phòng
// enabled = true : phòng trống -> bảo trì
// enabled = false: phòng đang bảo trì -> trống
// Khóa phòng sang bảo trì (enabled = true) hoặc mở lại phòng (enabled = false)
export const updateRoomMaintenance = async (id, enabled) => {
  const response = await axiosClient.patch(
    `${API_CONFIG.ROOM}/${id}/maintenance`,
    null,
    {
      params: { enabled },
    }
  );
 
  return response.data;
};

// Xóa mềm phòng
export const deleteRoom = async (id) => {
  const response = await axiosClient.delete(`${API_CONFIG.ROOM}/${id}`);
  return response.data;
};

// Lấy thống kê phòng, có thể lọc theo tòa nhà
export const getRoomDashboard = async (buildingId) => {
  const response = await axiosClient.get(`${API_CONFIG.ROOM}/dashboard`, {
    params: buildingId ? { buildingId } : {},
  });

  return response.data.result;
};