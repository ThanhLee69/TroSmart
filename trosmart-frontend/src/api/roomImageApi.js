
import axiosClient from "./axiosClient";

// Lấy danh sách ảnh của phòng
export const getRoomImages = async (roomId) => {
  const response = await axiosClient.get(
    `/rooms/${roomId}/images`
  );

  return response.data.result;
};

// Upload một hoặc nhiều ảnh cho phòng
export const uploadRoomImages = async (roomId, files) => {
  const formData = new FormData();

  files.forEach((file) => {
    formData.append("files", file);
  });

  const response = await axiosClient.post(
    `/rooms/${roomId}/images`,
    formData,
    {
      timeout: 30000,
    }
  );

  return response.data.result;
};

// Chọn ảnh đại diện cho phòng
export const setRoomThumbnail = async (roomId, imageId) => {
  const response = await axiosClient.patch(
    `/rooms/${roomId}/images/${imageId}/thumbnail`
  );

  return response.data.result;
};

// Xóa một ảnh của phòng
export const deleteRoomImage = async (roomId, imageId) => {
  const response = await axiosClient.delete(
    `/rooms/${roomId}/images/${imageId}`
  );

  return response.data;
};
