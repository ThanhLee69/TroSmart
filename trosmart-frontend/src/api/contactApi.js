import axiosClient from "./axiosClient";
import API_CONFIG from "../config/apiConfig";

// ==================== LIÊN HỆ (ADMIN) ====================
// Cần thêm vào apiConfig: CONTACT: "/contacts"

// Danh sách liên hệ: tìm kiếm, lọc theo trạng thái / nhu cầu, phân trang
export const getContacts = async ({
  keyword,
  status,
  topic,
  page = 1,
  size = 10,
} = {}) => {
  const res = await axiosClient.get(API_CONFIG.CONTACT, {
    params: {
      keyword: keyword || undefined,
      status: status || undefined,
      topic: topic || undefined,
      page,
      size,
    },
  });

  return res.data.result;
};

// Thống kê theo trạng thái: { total, newCount, readCount, repliedCount }
export const getContactSummary = async () => {
  const res = await axiosClient.get(`${API_CONFIG.CONTACT}/summary`);
  return res.data.result;
};

// Chi tiết liên hệ (mở lần đầu, backend tự chuyển NEW thành READ)
export const getContactById = async (id) => {
  const res = await axiosClient.get(`${API_CONFIG.CONTACT}/${id}`);
  return res.data.result;
};

// Cập nhật trạng thái và ghi chú: { status, adminNote }
export const updateContact = async (id, data) => {
  const res = await axiosClient.patch(`${API_CONFIG.CONTACT}/${id}`, data);
  return res.data.result;
};

// Xóa liên hệ
export const deleteContact = async (id) => {
  const res = await axiosClient.delete(`${API_CONFIG.CONTACT}/${id}`);
  return res.data;
};

